import express from "express";
import { requireApiAuth } from "../middleware/auth";
import { db } from "../../src/db";
import { clients, clientLedger } from "../../src/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { LicenseService } from "../services/license.service";
import { logAuditEvent } from "../lib/audit";

const router = express.Router();

router.get("/api/clients", requireApiAuth, async (req, res) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const clientList = await db.select().from(clients)
      .where(eq(clients.companyId, companyId))
      .orderBy(eq(clients.name, '')) // Placeholder for actual sorting if needed
      .limit(limit)
      .offset(offset);

    return res.json({ 
      success: true, 
      clients: clientList,
      pagination: { page, limit }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/api/clients", requireApiAuth, async (req, res) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });
    
    const { name, email, phone, document, notes } = req.body;
    
    if (!name) return res.status(400).json({ error: "Nome é obrigatório" });
    
    // Check quota (Audit Point 15)
    const quotaCheck = await LicenseService.checkResourceQuota(companyId, 'clients', 1);
    if (!quotaCheck.allowed) {
      return res.status(403).json({ error: quotaCheck.reason });
    }

    const id = randomUUID();
    await db.insert(clients).values({
      id,
      companyId,
      name,
      email: email || null,
      phone: phone || null,
      document: document || null,
      notes: notes || null,
      balance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    logAuditEvent(companyId, (req as any).auth?.uid || 'system', 'CLIENT_CREATED', `Cliente ${name} cadastrado com sucesso.`, req);

    return res.json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put("/api/clients/:id", requireApiAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = (req as any).auth?.companyId;
    const { name, email, phone, document, notes } = req.body;
    
    const result = await db.update(clients)
      .set({ 
        name, 
        email: email || null, 
        phone: phone || null, 
        document: document || null, 
        notes: notes || null, 
        updatedAt: new Date().toISOString() 
      })
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId)));
      
    logAuditEvent(companyId, (req as any).auth?.uid || 'system', 'CLIENT_UPDATED', `Cadastro do cliente ${id} atualizado.`, req);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/api/clients/:id/credit", requireApiAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { amount, reason } = req.body;
    const companyId = (req as any).auth?.companyId;
    const uid = (req as any).auth?.uid;

    if (!amount || amount <= 0) return res.status(400).json({ error: "Valor inválido" });

    await db.transaction(async (tx) => {
      const clientList = await tx.select().from(clients).where(and(eq(clients.id, id), eq(clients.companyId, companyId)));
      if (!clientList.length) throw new Error("Cliente não encontrado.");
      
      const newBalance = (clientList[0].balance || 0) + amount;
      
      await tx.update(clients)
        .set({ balance: newBalance })
        .where(and(eq(clients.id, id), eq(clients.companyId, companyId)));
      
      await tx.insert(clientLedger).values({
        id: randomUUID(),
        clientId: id,
        companyId,
        type: 'CREDIT',
        amount,
        balanceAfter: newBalance,
        reason: reason || 'Adição de crédito manual',
        createdBy: uid,
        createdAt: new Date().toISOString()
      });
    });

    logAuditEvent(companyId, uid, 'CLIENT_CREDIT_ADDED', `Adicionado R$ ${amount} ao saldo do cliente ${id}. Motivo: ${reason || 'não informado'}`, req);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/api/clients/:id/debit", requireApiAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { amount, reason } = req.body;
    const companyId = (req as any).auth?.companyId;
    const uid = (req as any).auth?.uid;

    if (!amount || amount <= 0) return res.status(400).json({ error: "Valor inválido" });

    await db.transaction(async (tx) => {
      const clientList = await tx.select().from(clients).where(and(eq(clients.id, id), eq(clients.companyId, companyId)));
      if (!clientList.length) throw new Error("Cliente não encontrado.");
      
      const newBalance = (clientList[0].balance || 0) - amount;
      if (newBalance < 0) throw new Error("Saldo insuficiente");
      
      await tx.update(clients)
        .set({ balance: newBalance })
        .where(and(eq(clients.id, id), eq(clients.companyId, companyId)));
      
      await tx.insert(clientLedger).values({
        id: randomUUID(),
        clientId: id,
        companyId,
        type: 'DEBIT',
        amount,
        balanceAfter: newBalance,
        reason: reason || 'Uso de crédito manual',
        createdBy: uid,
        createdAt: new Date().toISOString()
      });
    });

    logAuditEvent(companyId, uid, 'CLIENT_DEBIT_USED', `Debitado R$ ${amount} do saldo do cliente ${id}. Motivo: ${reason || 'não informado'}`, req);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
