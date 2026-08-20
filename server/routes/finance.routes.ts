import express from 'express';
import { randomUUID } from 'crypto';
import { requireApiAuth, requirePermission } from "../middleware/auth";
import { db } from "../../src/db/index.ts";
import { financialRecords } from "../../src/db/schema.ts";
import { eq, and, desc, sql } from "drizzle-orm";
import { logAuditEvent } from "../lib/audit";

const router = express.Router();

// List Financial Records
router.get(["/api/finance/records", "/api/finance/list"], requireApiAuth, async (req, res) => {
  try {
    const auth = (req as any).auth || (req as any).userProfile;
    const companyId = auth?.companyId;
    if (!companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const typeFilter = req.query.type as string | undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    
    const whereClause = typeFilter 
      ? and(eq(financialRecords.companyId, companyId), eq(financialRecords.type, typeFilter))
      : eq(financialRecords.companyId, companyId);

    const [records, [{ count }]] = await Promise.all([
      db.select().from(financialRecords)
        .where(whereClause)
        .orderBy(desc(financialRecords.dueDate))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(financialRecords)
        .where(whereClause)
    ]);

    const total = Number(count) || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return res.json({ 
      success: true, 
      records,
      pagination: { 
        page, 
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      }
    });
  } catch (error: any) {
    console.error("Erro ao listar registros financeiros:", error);
    return res.status(500).json({ error: error.message || "Erro ao consultar financeiro." });
  }
});

// Create Financial Record (Supports /api/finance/records, /api/finance/payable, /api/finance/create)
router.post(["/api/finance/records", "/api/finance/payable", "/api/finance/create"], requireApiAuth, requirePermission("manageFinancial"), async (req, res) => {
  try {
    const auth = (req as any).auth || (req as any).userProfile;
    const companyId = auth?.companyId;
    if (!companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const uid = auth?.uid || auth?.id;
    const body = req.body?.recordData || req.body || {};
    const recordId = body.id || randomUUID();
    const nowIso = new Date().toISOString();

    if (!body.description || !body.amount) {
      return res.status(400).json({ error: "Descrição e valor são obrigatórios." });
    }

    await db.insert(financialRecords).values({
      id: recordId,
      companyId,
      type: body.type || 'PAYABLE',
      description: body.description || 'Lançamento Financeiro',
      amount: Number(body.amount) || 0,
      dueDate: body.dueDate || nowIso.split('T')[0],
      category: body.category || 'Geral',
      entityName: body.entityName || body.supplierName || null,
      status: body.status || 'PENDING',
      paymentDate: body.paymentDate || null,
      notes: body.notes || null,
      createdBy: uid,
      createdAt: nowIso,
      updatedAt: nowIso
    });

    logAuditEvent(companyId, uid, 'FINANCIAL_RECORD_CREATED', `Lançamento ${body.description} no valor de R$ ${body.amount}`, req);

    return res.json({ success: true, id: recordId, recordId });
  } catch (error: any) {
    console.error("Erro ao criar lançamento financeiro:", error);
    return res.status(500).json({ error: error.message || "Erro ao salvar lançamento financeiro." });
  }
});

// Update Financial Record (Supports PUT /api/finance/records/:id, PATCH /api/finance/records/:id, POST /api/finance/update/:id)
const handleUpdateRecord = async (req: express.Request, res: express.Response) => {
  try {
    const recordId = String(req.params.id);
    const auth = (req as any).auth || (req as any).userProfile;
    const companyId = auth?.companyId;
    if (!companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const uid = auth?.uid || auth?.id;
    const body = req.body?.recordData || req.body || {};
    const nowIso = new Date().toISOString();

    const [existing] = await db.select().from(financialRecords).where(and(eq(financialRecords.id, recordId), eq(financialRecords.companyId, companyId)));
    if (!existing) return res.status(404).json({ error: "Registro financeiro não encontrado." });

    const updateFields: any = {
      updatedAt: nowIso
    };

    if (body.type !== undefined) updateFields.type = body.type;
    if (body.description !== undefined) updateFields.description = body.description;
    if (body.amount !== undefined) updateFields.amount = Number(body.amount) || 0;
    if (body.dueDate !== undefined) updateFields.dueDate = body.dueDate;
    if (body.category !== undefined) updateFields.category = body.category;
    if (body.entityName !== undefined) updateFields.entityName = body.entityName;
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.paymentDate !== undefined) updateFields.paymentDate = body.paymentDate;
    if (body.notes !== undefined) updateFields.notes = body.notes;

    await db.update(financialRecords)
      .set(updateFields)
      .where(and(eq(financialRecords.id, recordId), eq(financialRecords.companyId, companyId)));

    logAuditEvent(companyId, uid, 'FINANCIAL_RECORD_UPDATED', `Registro financeiro ${recordId} atualizado com sucesso.`, req);

    return res.json({ success: true, message: "Lançamento atualizado com sucesso." });
  } catch (error: any) {
    console.error("Erro ao atualizar lançamento financeiro:", error);
    return res.status(500).json({ error: error.message || "Erro ao atualizar lançamento." });
  }
};

router.put("/api/finance/records/:id", requireApiAuth, requirePermission("manageFinancial"), handleUpdateRecord);
router.patch("/api/finance/records/:id", requireApiAuth, requirePermission("manageFinancial"), handleUpdateRecord);
router.post("/api/finance/update/:id", requireApiAuth, requirePermission("manageFinancial"), handleUpdateRecord);

// Delete Financial Record (Supports DELETE /api/finance/records/:id, POST /api/finance/delete/:id)
const handleDeleteRecord = async (req: express.Request, res: express.Response) => {
  try {
    const recordId = String(req.params.id);
    const auth = (req as any).auth || (req as any).userProfile;
    const companyId = auth?.companyId;
    if (!companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const uid = auth?.uid || auth?.id;

    const [existing] = await db.select().from(financialRecords).where(and(eq(financialRecords.id, recordId), eq(financialRecords.companyId, companyId)));
    if (!existing) return res.status(404).json({ error: "Registro não encontrado." });

    await db.delete(financialRecords).where(and(eq(financialRecords.id, recordId), eq(financialRecords.companyId, companyId)));

    logAuditEvent(companyId, uid, 'FINANCIAL_RECORD_DELETED', `Registro financeiro ${recordId} (${existing.description}) excluído.`, req);

    return res.json({ success: true, message: "Registro excluído com sucesso." });
  } catch (error: any) {
    console.error("Erro ao deletar lançamento financeiro:", error);
    return res.status(500).json({ error: error.message || "Erro ao deletar lançamento." });
  }
};

router.delete("/api/finance/records/:id", requireApiAuth, requirePermission("manageFinancial"), handleDeleteRecord);
router.post("/api/finance/delete/:id", requireApiAuth, requirePermission("manageFinancial"), handleDeleteRecord);

// Update Status / Process Payment (Supports PATCH /api/finance/records/:id/status, POST /api/finance/process-payment/:id)
const handleProcessPayment = async (req: express.Request, res: express.Response) => {
  try {
    const recordId = String(req.params.id);
    const auth = (req as any).auth || (req as any).userProfile;
    const companyId = auth?.companyId;
    if (!companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const uid = auth?.uid || auth?.id;
    const { status, paymentDate, reason } = req.body || {};
    const nowIso = new Date().toISOString();

    const [existing] = await db.select().from(financialRecords).where(and(eq(financialRecords.id, recordId), eq(financialRecords.companyId, companyId)));
    if (!existing) return res.status(404).json({ error: "Registro não encontrado." });

    const newStatus = status || 'PAID';
    const newPaymentDate = newStatus === 'PAID' ? (paymentDate || nowIso.split('T')[0]) : null;

    await db.update(financialRecords).set({
      status: newStatus,
      paymentDate: newPaymentDate,
      updatedAt: nowIso
    }).where(and(eq(financialRecords.id, recordId), eq(financialRecords.companyId, companyId)));

    logAuditEvent(
      companyId, 
      uid, 
      'FINANCIAL_RECORD_STATUS_CHANGED', 
      `Baixa/Status no registro ${recordId}. ${existing.status} -> ${newStatus}. Motivo: ${reason || 'Operação de rotina'}`, 
      req
    );

    return res.json({ success: true, message: "Status financeiro atualizado com sucesso." });
  } catch (error: any) {
    console.error("Erro ao processar baixa financeira:", error);
    return res.status(500).json({ error: error.message || "Erro ao processar baixa." });
  }
};

router.patch("/api/finance/records/:id/status", requireApiAuth, requirePermission("manageFinancial"), handleProcessPayment);
router.post("/api/finance/process-payment/:id", requireApiAuth, requirePermission("manageFinancial"), handleProcessPayment);

export default router;
