import express from 'express';
import { requireApiAuth, requirePermission } from '../middleware/auth.ts';
import { db } from '../../src/db/index.ts';
import { fiscalDocuments, sales, saleItems, products, companies } from '../../src/db/schema.ts';
import { and, eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { LicenseService } from '../services/license.service.ts';
import { logAuditEvent } from '../lib/audit.ts';

const router = express.Router();

// Helper to generate simulated Access Key (44 digits)
function generateAccessKey(companyCnpj: string, serie: number, number: number): string {
  const uf = '35'; // SP / default
  const yearMonth = new Date().toISOString().substring(2, 7).replace('-', '');
  const cleanCnpj = (companyCnpj || '00000000000191').replace(/\D/g, '').padStart(14, '0').slice(0, 14);
  const mod = '65'; // NFC-e
  const ser = String(serie).padStart(3, '0');
  const num = String(number).padStart(9, '0');
  const tpEmis = '1';
  const cNF = String(Math.floor(10000000 + Math.random() * 90000000));
  const rawKey = `${uf}${yearMonth}${cleanCnpj}${mod}${ser}${num}${tpEmis}${cNF}`;
  
  // Calculate modulo 11 check digit
  let sum = 0;
  let weight = 2;
  for (let i = rawKey.length - 1; i >= 0; i--) {
    sum += parseInt(rawKey.charAt(i), 10) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const mod11 = 11 - (sum % 11);
  const dv = (mod11 === 0 || mod11 === 10 || mod11 === 11) ? '0' : String(mod11);
  return `${rawKey}${dv}`;
}

// 1. Issue Fiscal Document (NFC-e / NF-e)
const issueDocumentHandler = async (req: express.Request, res: express.Response) => {
  try {
    const userProfile = (req as any).userProfile || (req as any).auth;
    const companyId = userProfile?.companyId;
    const uid = userProfile?.uid || userProfile?.id || 'system';

    if (!companyId) {
      return res.status(403).json({ error: "Contexto de empresa não encontrado." });
    }

    const { saleId, type = 'NFCE' } = req.body;
    if (!saleId) {
      return res.status(400).json({ error: "ID da venda é obrigatório." });
    }

    // Check plan license entitlement for fiscal module
    const entitlements = await LicenseService.getCompanyEntitlements(companyId);
    if (!entitlements.features?.fiscal && entitlements.planTier === 'FREE') {
      return res.status(402).json({
        error: "O módulo fiscal (NFC-e / NF-e) não está disponível no plano Gratuito.",
        code: "FISCAL_FEATURE_LOCKED"
      });
    }

    // Verify sale exists and belongs to company (Audit Point 2 & 3: BOLA/IDOR prevention)
    const saleRows = await db.select().from(sales).where(
      and(
        eq(sales.id, String(saleId)),
        eq(sales.companyId, companyId)
      )
    );

    if (saleRows.length === 0) {
      return res.status(404).json({ error: "Venda não encontrada ou não pertence a esta empresa." });
    }

    const sale = saleRows[0];
    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id));

    // Get company details for emission
    const compRows = await db.select().from(companies).where(eq(companies.id, companyId));
    const comp = compRows[0] || { name: 'Empresa', cnpj: '00.000.000/0001-00' };

    // Check if document already exists
    const existingDoc = await db.select().from(fiscalDocuments).where(
      and(
        eq(fiscalDocuments.saleId, sale.id),
        eq(fiscalDocuments.companyId, companyId)
      )
    );

    if (existingDoc.length > 0 && existingDoc[0].status === 'AUTHORIZED') {
      return res.json({
        success: true,
        alreadyIssued: true,
        document: existingDoc[0]
      });
    }

    const nowIso = new Date().toISOString();
    const docNumber = Math.floor(1000 + Math.random() * 90000);
    const accessKey = generateAccessKey((comp as any).cnpj || '', 1, docNumber);
    const protocol = `35326${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe${accessKey}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>${accessKey.substring(35, 43)}</cNF>
        <natOp>VENDA MERCADORIA</natOp>
        <mod>65</mod>
        <serie>1</serie>
        <nNF>${docNumber}</nNF>
        <dhEmi>${nowIso}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3550308</cMunFG>
        <tpImp>4</tpImp>
        <tpEmis>1</tpEmis>
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>VarejoPro 1.0.0</verProc>
      </ide>
      <emit>
        <CNPJ>${((comp as any).cnpj || '00000000000191').replace(/\D/g, '')}</CNPJ>
        <xNome>${(comp as any).name || 'VarejoPro Estabelecimento'}</xNome>
        <CRT>1</CRT>
      </emit>
      <total>
        <ICMSTot>
          <vProd>${sale.subtotal?.toFixed(2) || '0.00'}</vProd>
          <vDesc>${sale.discount?.toFixed(2) || '0.00'}</vDesc>
          <vNF>${sale.total?.toFixed(2) || '0.00'}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>2</tpAmb>
      <verAplic>SP_NFE_PL_009</verAplic>
      <chNFe>${accessKey}</chNFe>
      <dhRecbto>${nowIso}</dhRecbto>
      <nProt>${protocol}</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;

    const docId = randomUUID();
    const docData = {
      id: docId,
      companyId,
      saleId: sale.id,
      type: String(type).toUpperCase() === 'NFE' ? 'NFE' : 'NFCE',
      status: 'AUTHORIZED',
      xml: xmlPayload,
      protocol,
      accessKey,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await db.insert(fiscalDocuments).values(docData).onConflictDoUpdate({
      target: fiscalDocuments.id,
      set: {
        status: docData.status,
        xml: docData.xml,
        protocol: docData.protocol,
        accessKey: docData.accessKey,
        updatedAt: nowIso
      }
    });

    logAuditEvent(companyId, uid, 'FISCAL_DOCUMENT_ISSUED', `NFC-e emitida [MODO SIMULAÇÃO/HOMOLOGAÇÃO] para venda ${sale.id}. Protocolo: ${protocol}, Chave: ${accessKey}`, req);

    return res.json({
      success: true,
      isSimulation: true,
      simulationNotice: "SIMULAÇÃO / MODO HOMOLOGAÇÃO - NÃO É DOCUMENTO FISCAL AUTORIZADO SEFAZ",
      document: {
        id: docId,
        saleId: sale.id,
        type: docData.type,
        status: docData.status,
        protocol,
        accessKey,
        isSimulation: true,
        environment: "HOMOLOGACAO_SIMULADA",
        createdAt: nowIso
      }
    });
  } catch (error: any) {
    console.error("Erro ao emitir documento fiscal:", error);
    return res.status(500).json({ error: error.message || "Falha na emissão fiscal." });
  }
};

router.post('/api/fiscal/issue-document', requireApiAuth, issueDocumentHandler);
router.post('/api/fiscal/emitir', requireApiAuth, issueDocumentHandler);

// 2. List Fiscal Documents for Company
router.get('/api/fiscal/documents', requireApiAuth, async (req: express.Request, res: express.Response) => {
  try {
    const userProfile = (req as any).userProfile || (req as any).auth;
    const companyId = userProfile?.companyId;
    if (!companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const docs = await db.select({
      id: fiscalDocuments.id,
      companyId: fiscalDocuments.companyId,
      saleId: fiscalDocuments.saleId,
      type: fiscalDocuments.type,
      status: fiscalDocuments.status,
      protocol: fiscalDocuments.protocol,
      accessKey: fiscalDocuments.accessKey,
      createdAt: fiscalDocuments.createdAt,
      total: sales.total
    })
    .from(fiscalDocuments)
    .leftJoin(sales, eq(fiscalDocuments.saleId, sales.id))
    .where(eq(fiscalDocuments.companyId, companyId))
    .orderBy(desc(fiscalDocuments.createdAt))
    .limit(limit)
    .offset(offset);

    return res.json({
      success: true,
      documents: docs,
      pagination: { page, limit }
    });
  } catch (error: any) {
    console.error("Erro ao consultar documentos fiscais:", error);
    return res.status(500).json({ error: error.message || "Erro ao consultar documentos fiscais." });
  }
});

// 3. Cancel Fiscal Document
router.post('/api/fiscal/cancel/:id', requireApiAuth, requirePermission('posAccess'), async (req: express.Request, res: express.Response) => {
  try {
    const userProfile = (req as any).userProfile || (req as any).auth;
    const companyId = userProfile?.companyId;
    const uid = userProfile?.uid || userProfile?.id || 'system';
    const docId = String(req.params.id);
    const { reason = 'Cancelamento solicitado pelo operador' } = req.body;

    if (!companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const docRows = await db.select().from(fiscalDocuments).where(
      and(
        eq(fiscalDocuments.id, docId),
        eq(fiscalDocuments.companyId, companyId)
      )
    );

    if (docRows.length === 0) {
      return res.status(404).json({ error: "Documento fiscal não encontrado ou pertence a outra empresa." });
    }

    const doc = docRows[0];
    if (doc.status === 'CANCELLED') {
      return res.status(400).json({ error: "Este documento fiscal já foi cancelado." });
    }

    const nowIso = new Date().toISOString();
    await db.update(fiscalDocuments)
      .set({
        status: 'CANCELLED',
        updatedAt: nowIso
      })
      .where(and(eq(fiscalDocuments.id, docId), eq(fiscalDocuments.companyId, companyId)));

    logAuditEvent(companyId, uid, 'FISCAL_DOCUMENT_CANCELLED', `NFC-e ${docId} cancelada. Motivo: ${reason}`, req);

    return res.json({ success: true, message: "Documento fiscal cancelado com sucesso." });
  } catch (error: any) {
    console.error("Erro ao cancelar documento fiscal:", error);
    return res.status(500).json({ error: error.message || "Erro ao cancelar documento fiscal." });
  }
});

export default router;
