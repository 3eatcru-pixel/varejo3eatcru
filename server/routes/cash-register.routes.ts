import express from 'express';
import { randomUUID } from 'crypto';
import { requireApiAuth, requirePermission } from "../middleware/auth";
import { db } from "../../src/db/index.ts";
import { cashRegisters, users } from "../../src/db/schema.ts";
import { eq, and, desc } from "drizzle-orm";
import { logAuditEvent } from "../lib/audit";

const router = express.Router();

// Get Current Open Cash Register
router.get("/api/cash-register/current", requireApiAuth, async (req, res) => {
  try {
    const userProfile = (req as any).userProfile;
    if (!userProfile?.companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const companyId = userProfile.companyId;
    const terminalId = (req.query.terminalId as string) || userProfile.terminalId;

    const openRegisters = await db.select().from(cashRegisters)
      .where(and(
        eq(cashRegisters.companyId, companyId),
        eq(cashRegisters.status, 'OPEN'),
        terminalId ? eq(cashRegisters.deviceId, terminalId) : undefined
      ))
      .orderBy(desc(cashRegisters.openedAt))
      .limit(1);

    if (openRegisters.length > 0) {
      const reg = openRegisters[0];
      return res.json({
        register: {
          id: reg.id,
          companyId: reg.companyId,
          branchId: reg.branchId,
          terminalId: reg.deviceId,
          status: reg.status,
          openedAt: reg.openedAt,
          openedByUid: reg.openedBy,
          openedByName: userProfile.name || 'Operador',
          initialBalance: reg.openingBalance,
          operations: [],
          totalsByPaymentMethod: {}
        }
      });
    }

    return res.json({ register: null });
  } catch (error: any) {
    console.error("Erro ao buscar caixa atual:", error);
    return res.status(500).json({ error: error.message || "Erro ao consultar caixa." });
  }
});

// Open Cash Register
router.post("/api/cash-register/open", requireApiAuth, requirePermission("posAccess"), async (req, res) => {
  try {
    const { initialBalance, branchId, terminalId } = req.body;
    const userProfile = (req as any).userProfile;
    if (!userProfile) return res.status(403).json({ error: "Perfil de usuário não encontrado." });

    const companyId = userProfile.companyId;
    const uid = userProfile.uid || userProfile.id;

    const numInitial = Number(initialBalance) || 0;
    if (!Number.isFinite(numInitial) || numInitial < 0) {
      return res.status(400).json({ error: 'O fundo de troco inicial deve ser um valor numérico válido.' });
    }

    const safeBranch = branchId || userProfile.branchId || null;
    const safeTerminal = terminalId || userProfile.terminalId || null;
    const nowIso = new Date().toISOString();

    const newRegister = await db.transaction(async (tx) => {
      // Check for existing open register for this terminal or user (Audit Point 20)
      // We use .for('update') lock to prevent concurrent requests from bypassing this verification
      const openRegisters = await tx.select().from(cashRegisters)
        .where(and(
          eq(cashRegisters.companyId, companyId),
          safeTerminal ? eq(cashRegisters.deviceId, safeTerminal) : eq(cashRegisters.openedBy, uid),
          eq(cashRegisters.status, 'OPEN')
        ))
        .for('update');
      
      if (openRegisters.length > 0) {
        throw new Error(safeTerminal 
          ? `Já existe uma sessão de caixa ABERTA para o terminal (${safeTerminal}).`
          : `Já existe uma sessão de caixa ABERTA para o operador.`
        );
      }

      const registerId = randomUUID();
      await tx.insert(cashRegisters).values({
        id: registerId,
        companyId,
        branchId: safeBranch,
        deviceId: safeTerminal,
        openedBy: uid,
        status: 'OPEN',
        openingBalance: numInitial,
        openedAt: nowIso
      });

      return {
        id: registerId,
        status: 'OPEN',
        initialBalance: numInitial,
        openedAt: nowIso,
        openedByUid: uid,
        openedByName: userProfile.name || 'Operador',
        operations: [],
        totalsByPaymentMethod: {}
      };
    });

    logAuditEvent(companyId, uid, 'CASH_REGISTER_OPENED', `Caixa aberto. Troco: R$ ${numInitial}`, req);

    return res.json({ success: true, register: newRegister });
  } catch (error: any) {
    console.error("Erro ao abrir caixa:", error);
    return res.status(500).json({ error: error.message || "Falha ao abrir o caixa." });
  }
});

// Close Cash Register
router.post(["/api/cash-register/close/:id", "/api/cash-register/close"], requireApiAuth, requirePermission("posAccess"), async (req, res) => {
  try {
    const registerId = req.params.id || req.body.registerId;
    const userProfile = (req as any).userProfile;
    if (!userProfile) return res.status(403).json({ error: "Perfil não encontrado." });

    const companyId = userProfile.companyId;
    const uid = userProfile.uid || userProfile.id;
    const nowIso = new Date().toISOString();

    await db.transaction(async (tx) => {
      const registers = await tx.select().from(cashRegisters).where(and(eq(cashRegisters.id, registerId), eq(cashRegisters.companyId, companyId)));
      if (!registers.length) throw new Error("Caixa não encontrado.");
      if (registers[0].status === 'CLOSED') throw new Error("O caixa já está fechado.");

      await tx.update(cashRegisters)
        .set({ status: 'CLOSED', closedBy: uid, closedAt: nowIso, closingBalance: Number(req.body.closingBalance || req.body.declaredBalances?.cash || 0) })
        .where(eq(cashRegisters.id, registerId));
    });

    logAuditEvent(companyId, uid, 'CASH_REGISTER_CLOSED', `Caixa fechado: ${registerId}`, req);
    return res.json({ success: true, message: "Caixa fechado com sucesso." });
  } catch (error: any) {
    console.error("Erro ao fechar caixa:", error);
    return res.status(500).json({ error: error.message || "Erro ao fechar caixa." });
  }
});

export default router;
