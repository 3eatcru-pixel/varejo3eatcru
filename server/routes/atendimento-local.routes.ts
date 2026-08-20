import express from "express";
import { requireApiAuth } from "../middleware/auth";
import { db } from "../../src/db";
import { atendimentosLocais, platformAuditLogs, employees } from "../../src/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = express.Router();

// 1. List all local service sessions
router.get("/api/atendimento-local", requireApiAuth, async (req, res) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const sessions = await db
      .select()
      .from(atendimentosLocais)
      .where(and(eq(atendimentosLocais.companyId, companyId), eq(atendimentosLocais.active, true)));

    return res.json({ success: true, sessions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Create a new local service session
router.post("/api/atendimento-local", requireApiAuth, async (req, res) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const uid = (req as any).auth?.uid;
    if (!companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const id = randomUUID();
    const { identifier, type, sector, customerName, responsibleStaffId } = req.body;

    if (!identifier || !type) {
      return res.status(400).json({ error: "Identificador e tipo de atendimento são obrigatórios." });
    }

    // Validate staff if provided
    if (responsibleStaffId) {
      const staffRows = await db.select().from(employees).where(and(eq(employees.id, responsibleStaffId), eq(employees.companyId, companyId)));
      if (staffRows.length === 0) {
        return res.status(400).json({ error: "Funcionário responsável inválido ou de outra empresa." });
      }
    }

    const newSession = {
      id,
      companyId,
      branchId: (req as any).auth?.branchId || "empresa_principal_matriz",
      sector: sector || "Salão Principal",
      identifier,
      type, // 'MESA', 'BALCÃO', 'LOCAL', 'COMANDA', 'PONTO_ATENDIMENTO'
      status: "OCUPADO",
      customerName: customerName || "",
      responsibleStaffId: responsibleStaffId || "",
      totalConsumo: 0.0, // Forced 0 on creation (Audit Point 5)
      active: true,
      createdAt: new Date().toISOString(),
    };

    await db.insert(atendimentosLocais).values(newSession);

    // Audit log
    await db.insert(platformAuditLogs).values({
      id: randomUUID(),
      companyId,
      userId: uid || "system",
      action: "LOCAL_SERVICE_OPEN",
      details: `Aberto atendimento [${type}] - [${identifier}] por ${(req as any).auth?.name || "funcionário"}`,
      timestamp: new Date().toISOString()
    });

    return res.json({ success: true, session: newSession });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Update basic details of local service session
router.put("/api/atendimento-local/:id", requireApiAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = (req as any).auth?.companyId;

    const { identifier, type, sector, status, customerName, responsibleStaffId } = req.body;

    const updateFields: any = {};
    if (identifier !== undefined) updateFields.identifier = identifier;
    if (type !== undefined) updateFields.type = type;
    if (sector !== undefined) updateFields.sector = sector;
    if (status !== undefined) updateFields.status = status;
    if (customerName !== undefined) updateFields.customerName = customerName;
    if (responsibleStaffId !== undefined) {
      // Validate staff
      const staffRows = await db.select().from(employees).where(and(eq(employees.id, responsibleStaffId), eq(employees.companyId, companyId)));
      if (staffRows.length === 0) {
        return res.status(400).json({ error: "Funcionário responsável inválido." });
      }
      updateFields.responsibleStaffId = responsibleStaffId;
    }
    updateFields.updatedAt = new Date().toISOString();

    const result = await db
      .update(atendimentosLocais)
      .set(updateFields)
      .where(and(eq(atendimentosLocais.id, id), eq(atendimentosLocais.companyId, companyId)));

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Add consumption
router.post("/api/atendimento-local/:id/consumo", requireApiAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = (req as any).auth?.companyId;
    const { amount, description } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Valor de consumo inválido." });
    }

    const [session] = await db
      .select()
      .from(atendimentosLocais)
      .where(and(eq(atendimentosLocais.id, id), eq(atendimentosLocais.companyId, companyId)));

    if (!session) return res.status(404).json({ error: "Atendimento local não encontrado." });

    const newTotal = Number((Number(session.totalConsumo || 0) + Number(amount)).toFixed(2));

    await db
      .update(atendimentosLocais)
      .set({ totalConsumo: newTotal, updatedAt: new Date().toISOString() })
      .where(and(eq(atendimentosLocais.id, id), eq(atendimentosLocais.companyId, companyId)));

    // Audit log
    await db.insert(platformAuditLogs).values({
      id: randomUUID(),
      companyId,
      userId: (req as any).auth?.uid || "system",
      action: "LOCAL_SERVICE_ADD_CONSUMPTION",
      details: `Adicionado R$ ${Number(amount).toFixed(2)} de consumo (${description || "sem descrição"}) no [${session.type}] [${session.identifier}]`,
      timestamp: new Date().toISOString()
    });

    return res.json({ success: true, totalConsumo: newTotal });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Trigger staff call
router.post("/api/atendimento-local/:id/chamar", async (req, res) => {
  try {
    const id = String(req.params.id);
    // Secure selection: ensure session is active
    const [session] = await db.select().from(atendimentosLocais).where(and(eq(atendimentosLocais.id, id), eq(atendimentosLocais.active, true)));
    if (!session) return res.status(404).json({ error: "Atendimento não encontrado ou inativo." });

    // Find available staff members (Audit Point: Pulse staff tracking)
    const availableStaff = await db.select({ 
      id: employees.id, 
      name: employees.name 
    }).from(employees).where(
      and(
        eq(employees.companyId, session.companyId),
        eq(employees.pulseStatus, 'AVAILABLE'),
        eq(employees.status, 'ACTIVE')
      )
    );

    const staffSummary = availableStaff.length > 0 
      ? `Staff disponível: ${availableStaff.map(s => s.name).join(', ')}`
      : 'Nenhum staff marcado como DISPONÍVEL no momento.';

    // Insert staff alert log
    await db.insert(platformAuditLogs).values({
      id: randomUUID(),
      companyId: session.companyId,
      userId: "customer_portal",
      action: "PULSE_CALL_STAFF",
      details: `CHAMADO: Cliente do [${session.type}] [${session.identifier}] solicitou presença de um funcionário no local. ${staffSummary}`,
      timestamp: new Date().toISOString()
    });

    return res.json({ success: true, notifiedCount: availableStaff.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Transfer session/consumption to another table/comanda
router.post(["/api/atendimento-local/:id/transfer", "/api/atendimento-local/:id/transferir"], requireApiAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = (req as any).auth?.companyId;
    const { targetIdentifier } = req.body;

    if (!targetIdentifier) return res.status(400).json({ error: "Identificador de destino é obrigatório." });

    const [sourceSession] = await db
      .select()
      .from(atendimentosLocais)
      .where(and(eq(atendimentosLocais.id, id), eq(atendimentosLocais.companyId, companyId)));

    if (!sourceSession) return res.status(404).json({ error: "Atendimento de origem não encontrado." });
    if (!sourceSession.active) return res.status(400).json({ error: "Este atendimento já está inativo." });

    // Check if target session already exists
    const [targetSession] = await db
      .select()
      .from(atendimentosLocais)
      .where(and(
        eq(atendimentosLocais.identifier, targetIdentifier),
        eq(atendimentosLocais.companyId, companyId),
        eq(atendimentosLocais.active, true)
      ));

    if (targetSession) {
      // Merge consumption
      const mergedTotal = Number(((targetSession.totalConsumo || 0) + (sourceSession.totalConsumo || 0)).toFixed(2));
      await db
        .update(atendimentosLocais)
        .set({ totalConsumo: mergedTotal, updatedAt: new Date().toISOString() })
        .where(eq(atendimentosLocais.id, targetSession.id));
    } else {
      // Create new session at destination with source's total
      const newId = randomUUID();
      await db.insert(atendimentosLocais).values({
        id: newId,
        companyId,
        branchId: sourceSession.branchId,
        sector: sourceSession.sector,
        identifier: targetIdentifier,
        type: sourceSession.type,
        status: "OCUPADO",
        customerName: sourceSession.customerName,
        responsibleStaffId: sourceSession.responsibleStaffId,
        totalConsumo: sourceSession.totalConsumo,
        active: true,
        createdAt: new Date().toISOString()
      });
    }

    // Inactivate old/source session
    await db
      .update(atendimentosLocais)
      .set({ active: false, status: "FINALIZADO", updatedAt: new Date().toISOString() })
      .where(eq(atendimentosLocais.id, id));

    // Audit log
    await db.insert(platformAuditLogs).values({
      id: randomUUID(),
      companyId,
      userId: (req as any).auth?.uid || "system",
      action: "LOCAL_SERVICE_TRANSFER",
      details: `TRANSFERÊNCIA: Consumo de R$ ${Number(sourceSession.totalConsumo).toFixed(2)} movido de [${sourceSession.type}] [${sourceSession.identifier}] para [${targetIdentifier}]`,
      timestamp: new Date().toISOString()
    });

    return res.json({ success: true, message: "Transferência realizada com sucesso." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. Close session / Finalize
router.post("/api/atendimento-local/:id/close", requireApiAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { method } = req.body;
    // Secure selection: ensure session is active
    const [session] = await db.select().from(atendimentosLocais).where(and(eq(atendimentosLocais.id, id), eq(atendimentosLocais.active, true)));
    if (!session) return res.status(404).json({ error: "Atendimento não encontrado ou inativo." });

    // Update status to 'AGUARDANDO_PAGAMENTO'
    await db
      .update(atendimentosLocais)
      .set({ status: "AGUARDANDO_PAGAMENTO", updatedAt: new Date().toISOString() })
      .where(and(eq(atendimentosLocais.id, id), eq(atendimentosLocais.companyId, session.companyId)));

    // Insert payment request log
    await db.insert(platformAuditLogs).values({
      id: randomUUID(),
      companyId: session.companyId,
      userId: "customer_portal",
      action: "PULSE_PAY_TABLE",
      details: `SOLICITAÇÃO DE CONTA: Cliente do [${session.type}] [${session.identifier}] solicitou encerramento com pagamento via [${method || 'PIX ou Cartão'}].`,
      timestamp: new Date().toISOString()
    });

    return res.json({ success: true, status: "AGUARDANDO_PAGAMENTO" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. Splitting logic (Dividir pagamento)
router.post("/api/atendimento-local/:id/dividir", requireApiAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = (req as any).auth?.companyId;
    const { parts, paidAmount } = req.body; // e.g. parts = 2, paidAmount = portion paid now

    if (!parts || parts <= 0) return res.status(400).json({ error: "Número de divisões inválido." });

    const [session] = await db
      .select()
      .from(atendimentosLocais)
      .where(and(eq(atendimentosLocais.id, id), eq(atendimentosLocais.companyId, companyId)));

    if (!session) return res.status(404).json({ error: "Atendimento local não encontrado." });

    const total = session.totalConsumo || 0;
    const valuePerPart = total / parts;

    let updatedTotal = total;
    if (paidAmount && Number(paidAmount) > 0) {
      updatedTotal = Math.max(0, total - Number(paidAmount));
      await db
        .update(atendimentosLocais)
        .set({ totalConsumo: updatedTotal, updatedAt: new Date().toISOString() })
        .where(eq(atendimentosLocais.id, id));
    }

    return res.json({
      success: true,
      originalTotal: total,
      parts,
      valuePerPart,
      remainingTotal: updatedTotal
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 9. Close/End local service session
router.post("/api/atendimento-local/:id/encerrar", requireApiAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = (req as any).auth?.companyId;

    const [session] = await db
      .select()
      .from(atendimentosLocais)
      .where(and(eq(atendimentosLocais.id, id), eq(atendimentosLocais.companyId, companyId)));

    if (!session) return res.status(404).json({ error: "Atendimento local não encontrado." });

    await db
      .update(atendimentosLocais)
      .set({ active: false, status: "FINALIZADO", updatedAt: new Date().toISOString() })
      .where(eq(atendimentosLocais.id, id));

    // Audit log
    await db.insert(platformAuditLogs).values({
      id: randomUUID(),
      companyId,
      userId: (req as any).auth?.uid || "system",
      action: "LOCAL_SERVICE_CLOSE",
      details: `Encerrado e arquivado atendimento [${session.type}] [${session.identifier}] com consumo final de R$ ${Number(session.totalConsumo).toFixed(2)}`,
      timestamp: new Date().toISOString()
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
