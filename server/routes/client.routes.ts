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
      .orderBy(clients.name)
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

// Create client via ClientService
router.post("/api/client/create", requireApiAuth, async (req, res) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const clientData = req.body.clientData || req.body;
    const name = clientData.name;
    if (!name || !name.trim()) return res.status(400).json({ error: "Nome do cliente é obrigatório." });

    const id = randomUUID();
    await db.insert(clients).values({
      id,
      companyId,
      name: name.trim().substring(0, 150),
      email: clientData.email ? String(clientData.email).trim().substring(0, 100) : null,
      phone: clientData.phone ? String(clientData.phone).trim().substring(0, 30) : null,
      document: clientData.cpfCnpj ? String(clientData.cpfCnpj).trim().substring(0, 30) : null,
      notes: clientData.notes ? String(clientData.notes).trim().substring(0, 500) : null,
      balance: Number(clientData.creditBalance) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    logAuditEvent(companyId, (req as any).auth?.uid || 'system', 'CLIENT_CREATED', `Cliente ${name} cadastrado.`, req);
    return res.json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update client via ClientService
router.post("/api/client/update/:id", requireApiAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = (req as any).auth?.companyId;
    if (!companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const clientData = req.body.clientData || req.body;

    const existing = await db.select().from(clients).where(and(eq(clients.id, id), eq(clients.companyId, companyId)));
    if (existing.length === 0) {
      return res.status(404).json({ error: "Cliente não encontrado ou pertence a outra empresa." });
    }

    await db.update(clients)
      .set({
        name: clientData.name ? String(clientData.name).trim().substring(0, 150) : existing[0].name,
        email: clientData.email !== undefined ? (clientData.email ? String(clientData.email).trim().substring(0, 100) : null) : existing[0].email,
        phone: clientData.phone !== undefined ? (clientData.phone ? String(clientData.phone).trim().substring(0, 30) : null) : existing[0].phone,
        document: clientData.cpfCnpj !== undefined ? (clientData.cpfCnpj ? String(clientData.cpfCnpj).trim().substring(0, 30) : null) : existing[0].document,
        notes: clientData.notes !== undefined ? (clientData.notes ? String(clientData.notes).trim().substring(0, 500) : null) : existing[0].notes,
        updatedAt: new Date().toISOString()
      })
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId)));

    logAuditEvent(companyId, (req as any).auth?.uid || 'system', 'CLIENT_UPDATED', `Cliente ${id} atualizado.`, req);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete client via ClientService
router.post("/api/client/delete/:id", requireApiAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = (req as any).auth?.companyId;
    if (!companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const existing = await db.select().from(clients).where(and(eq(clients.id, id), eq(clients.companyId, companyId)));
    if (existing.length === 0) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }

    await db.delete(clients).where(and(eq(clients.id, id), eq(clients.companyId, companyId)));
    logAuditEvent(companyId, (req as any).auth?.uid || 'system', 'CLIENT_DELETED', `Cliente ${id} removido.`, req);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Adjust loyalty
router.post("/api/client/adjust-loyalty/:id", requireApiAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = (req as any).auth?.companyId;
    const { pointsDelta } = req.body;
    if (!companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const existing = await db.select().from(clients).where(and(eq(clients.id, id), eq(clients.companyId, companyId)));
    if (existing.length === 0) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }

    const currentBalance = existing[0].balance || 0;
    const newBalance = Math.max(0, currentBalance + (Number(pointsDelta) || 0));

    await db.update(clients)
      .set({ balance: newBalance, updatedAt: new Date().toISOString() })
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId)));

    return res.json({ success: true, newBalance });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
