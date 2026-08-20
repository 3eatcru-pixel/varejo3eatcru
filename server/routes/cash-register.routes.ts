import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { requireApiAuth, requirePermission } from "../middleware/auth";
import { db } from "../../src/db/index.ts";
import { cashRegisters, cashRegisterOperations, sales, financialRecords, users } from "../../src/db/schema.ts";
import { eq, and, desc, sql } from "drizzle-orm";
import { logAuditEvent } from "../lib/audit";

const router = express.Router();

// Helper: Calculate totals by payment method and drawer cash for a given register
async function getRegisterSummary(registerId: string, companyId: string) {
  const registerSales = await db.select({
    paymentMethod: sales.paymentMethod,
    total: sales.total,
    status: sales.status
  })
  .from(sales)
  .where(and(
    eq(sales.cashRegisterId, registerId),
    eq(sales.companyId, companyId),
    eq(sales.status, 'COMPLETED')
  ));

  const totalsByPaymentMethod: Record<string, number> = {
    CASH: 0,
    PIX: 0,
    CREDIT: 0,
    DEBIT: 0
  };

  for (const s of registerSales) {
    const method = (s.paymentMethod || 'CASH').toUpperCase();
    const val = Number(s.total) || 0;
    if (totalsByPaymentMethod[method] !== undefined) {
      totalsByPaymentMethod[method] += val;
    } else {
      totalsByPaymentMethod[method] = val;
    }
  }

  const ops = await db.select({
    id: cashRegisterOperations.id,
    type: cashRegisterOperations.type,
    amount: cashRegisterOperations.amount,
    reason: cashRegisterOperations.reason,
    createdAt: cashRegisterOperations.createdAt,
    userId: cashRegisterOperations.userId,
    userName: users.name
  })
  .from(cashRegisterOperations)
  .leftJoin(users, eq(cashRegisterOperations.userId, users.id))
  .where(and(
    eq(cashRegisterOperations.cashRegisterId, registerId),
    eq(cashRegisterOperations.companyId, companyId)
  ))
  .orderBy(desc(cashRegisterOperations.createdAt));

  let suprimentosTotal = 0;
  let sangriasTotal = 0;
  for (const op of ops) {
    if (op.type === 'SUPRIMENTO') suprimentosTotal += Number(op.amount) || 0;
    if (op.type === 'SANGRIA') sangriasTotal += Number(op.amount) || 0;
  }

  return {
    totalsByPaymentMethod,
    operations: ops.map(o => ({
      id: o.id,
      type: o.type,
      amount: Number(o.amount) || 0,
      reason: o.reason,
      createdAt: o.createdAt,
      userId: o.userId,
      userName: o.userName || 'Operador'
    })),
    suprimentosTotal,
    sangriasTotal
  };
}

// 1. Get Current Open Cash Register
router.get("/api/cash-register/current", requireApiAuth, async (req: Request, res: Response) => {
  try {
    const userProfile = (req as any).userProfile;
    if (!userProfile?.companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const companyId = userProfile.companyId;
    const terminalId = (req.query.terminalId as string) || userProfile.terminalId;

    const openRegisters = await db.select({
      id: cashRegisters.id,
      companyId: cashRegisters.companyId,
      branchId: cashRegisters.branchId,
      deviceId: cashRegisters.deviceId,
      openedBy: cashRegisters.openedBy,
      status: cashRegisters.status,
      openingBalance: cashRegisters.openingBalance,
      openedAt: cashRegisters.openedAt,
      openedByName: users.name
    })
    .from(cashRegisters)
    .leftJoin(users, eq(cashRegisters.openedBy, users.id))
    .where(and(
      eq(cashRegisters.companyId, companyId),
      eq(cashRegisters.status, 'OPEN'),
      terminalId ? eq(cashRegisters.deviceId, terminalId) : undefined
    ))
    .orderBy(desc(cashRegisters.openedAt))
    .limit(1);

    if (openRegisters.length > 0) {
      const reg = openRegisters[0];
      const summary = await getRegisterSummary(reg.id, companyId);

      return res.json({
        register: {
          id: reg.id,
          companyId: reg.companyId,
          branchId: reg.branchId,
          terminalId: reg.deviceId,
          status: reg.status,
          openedAt: reg.openedAt,
          openedByUid: reg.openedBy,
          openedByName: reg.openedByName || userProfile.name || 'Operador',
          initialBalance: reg.openingBalance,
          operations: summary.operations,
          totalsByPaymentMethod: summary.totalsByPaymentMethod,
          suprimentosTotal: summary.suprimentosTotal,
          sangriasTotal: summary.sangriasTotal
        }
      });
    }

    return res.json({ register: null });
  } catch (error: any) {
    console.error("Erro ao buscar caixa atual:", error);
    return res.status(500).json({ error: error.message || "Erro ao consultar caixa." });
  }
});

// 2. Open Cash Register
router.post("/api/cash-register/open", requireApiAuth, requirePermission("posAccess"), async (req: Request, res: Response) => {
  try {
    const { initialBalance, branchId, terminalId } = req.body;
    const userProfile = (req as any).userProfile;
    if (!userProfile) return res.status(403).json({ error: "Perfil de usuário não encontrado." });

    const companyId = userProfile.companyId;
    const uid = userProfile.uid || userProfile.id;

    const numInitial = Number(initialBalance) || 0;
    if (!Number.isFinite(numInitial) || numInitial < 0) {
      return res.status(400).json({ error: 'O fundo de troco inicial deve ser um valor numérico válido maior ou igual a zero.' });
    }

    const safeBranch = branchId || userProfile.branchId || null;
    const safeTerminal = terminalId || userProfile.terminalId || null;
    const nowIso = new Date().toISOString();

    const newRegister = await db.transaction(async (tx) => {
      // Pessimistic lock on open register query
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
        companyId,
        branchId: safeBranch,
        terminalId: safeTerminal,
        status: 'OPEN',
        initialBalance: numInitial,
        openedAt: nowIso,
        openedByUid: uid,
        openedByName: userProfile.name || 'Operador',
        operations: [],
        totalsByPaymentMethod: { CASH: 0, PIX: 0, CREDIT: 0, DEBIT: 0 }
      };
    });

    logAuditEvent(companyId, uid, 'CASH_REGISTER_OPENED', `Caixa aberto. Fundo de troco: R$ ${numInitial.toFixed(2)}`, req);

    return res.json({ success: true, register: newRegister });
  } catch (error: any) {
    console.error("Erro ao abrir caixa:", error);
    return res.status(500).json({ error: error.message || "Falha ao abrir o caixa." });
  }
});

// 3. Cash Register Operation (Sangria / Suprimento)
router.post("/api/cash-register/operation", requireApiAuth, requirePermission("posAccess"), async (req: Request, res: Response) => {
  try {
    const { registerId, type, amount, reason } = req.body;
    const userProfile = (req as any).userProfile;
    if (!userProfile) return res.status(403).json({ error: "Perfil de usuário não encontrado." });

    const companyId = userProfile.companyId;
    const uid = userProfile.uid || userProfile.id;

    if (!registerId) return res.status(400).json({ error: "ID da sessão de caixa é obrigatório." });
    if (!type || (type !== 'SANGRIA' && type !== 'SUPRIMENTO')) {
      return res.status(400).json({ error: "Tipo de operação inválido (deve ser SANGRIA ou SUPRIMENTO)." });
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "Informe um valor numérico válido maior que zero." });
    }

    const safeReason = String(reason || '').trim();
    if (!safeReason) {
      return res.status(400).json({ error: "Informe a justificativa da operação de caixa." });
    }

    const nowIso = new Date().toISOString();

    const result = await db.transaction(async (tx) => {
      // Verify cash register is OPEN and belongs to company
      const registers = await tx.select().from(cashRegisters)
        .where(and(eq(cashRegisters.id, registerId), eq(cashRegisters.companyId, companyId)))
        .for('update');

      if (registers.length === 0) {
        throw new Error("Sessão de caixa não encontrada.");
      }

      const reg = registers[0];
      if (reg.status !== 'OPEN') {
        throw new Error("Não é possível realizar operações em um caixa já FECHADO.");
      }

      // If Sangria, verify available cash in drawer to prevent negative physical cash
      if (type === 'SANGRIA') {
        const summary = await getRegisterSummary(registerId, companyId);
        const currentCashInDrawer = (reg.openingBalance || 0) + (summary.totalsByPaymentMethod['CASH'] || 0) + summary.suprimentosTotal - summary.sangriasTotal;

        if (numAmount > currentCashInDrawer) {
          throw new Error(`Saldo em dinheiro insuficiente na gaveta (Disponível: R$ ${currentCashInDrawer.toFixed(2)}, Tentativa: R$ ${numAmount.toFixed(2)}).`);
        }
      }

      const opId = randomUUID();
      await tx.insert(cashRegisterOperations).values({
        id: opId,
        companyId,
        cashRegisterId: registerId,
        userId: uid,
        type,
        amount: numAmount,
        reason: safeReason,
        createdAt: nowIso
      });

      // Mirror into financial records (DRE / Fluxo de Caixa)
      await tx.insert(financialRecords).values({
        id: randomUUID(),
        companyId,
        type: type === 'SANGRIA' ? 'PAYABLE' : 'RECEIVABLE',
        description: `${type === 'SANGRIA' ? 'Sangria de Caixa' : 'Suprimento de Caixa'} #${opId.substring(0, 8).toUpperCase()}`,
        amount: numAmount,
        dueDate: nowIso.substring(0, 10),
        category: 'Operações de Caixa',
        status: 'PAID',
        paymentDate: nowIso,
        notes: `Caixa ID: ${registerId}. Justificativa: ${safeReason}`,
        createdBy: uid,
        createdAt: nowIso,
        updatedAt: nowIso
      });

      return { opId, type, amount: numAmount, reason: safeReason, createdAt: nowIso };
    });

    logAuditEvent(
      companyId, 
      uid, 
      type === 'SANGRIA' ? 'CASH_SANGRIA' : 'CASH_SUPRIMENTO', 
      `${type} de R$ ${numAmount.toFixed(2)} realizada no caixa ${registerId}. Motivo: ${safeReason}`, 
      req
    );

    return res.json({ success: true, operation: result });
  } catch (error: any) {
    console.error("Erro na operação de caixa:", error);
    return res.status(400).json({ error: error.message || "Erro na operação de caixa." });
  }
});

// 4. Close Cash Register
router.post(["/api/cash-register/close/:id", "/api/cash-register/close"], requireApiAuth, requirePermission("posAccess"), async (req: Request, res: Response) => {
  try {
    const registerId = req.params.id || req.body.registerId;
    const userProfile = (req as any).userProfile;
    if (!userProfile) return res.status(403).json({ error: "Perfil de usuário não encontrado." });

    const companyId = userProfile.companyId;
    const uid = userProfile.uid || userProfile.id;
    const nowIso = new Date().toISOString();

    const {
      declaredCash = 0,
      declaredCredit = 0,
      declaredDebit = 0,
      declaredPix = 0,
      notes = ''
    } = req.body;

    const numCash = Math.max(0, Number(declaredCash) || 0);
    const numCredit = Math.max(0, Number(declaredCredit) || 0);
    const numDebit = Math.max(0, Number(declaredDebit) || 0);
    const numPix = Math.max(0, Number(declaredPix) || 0);
    const totalDeclared = numCash + numCredit + numDebit + numPix;

    const closedResult = await db.transaction(async (tx) => {
      const registers = await tx.select().from(cashRegisters)
        .where(and(eq(cashRegisters.id, registerId), eq(cashRegisters.companyId, companyId)))
        .for('update');

      if (!registers.length) throw new Error("Sessão de caixa não encontrada.");
      const reg = registers[0];
      if (reg.status === 'CLOSED') throw new Error("Esta sessão de caixa já se encontra fechada.");

      const summary = await getRegisterSummary(registerId, companyId);
      const expectedCashInDrawer = (reg.openingBalance || 0) + (summary.totalsByPaymentMethod['CASH'] || 0) + summary.suprimentosTotal - summary.sangriasTotal;
      const cashDifference = Number((numCash - expectedCashInDrawer).toFixed(2));

      await tx.update(cashRegisters)
        .set({ 
          status: 'CLOSED', 
          closedBy: uid, 
          closedAt: nowIso, 
          closingBalance: totalDeclared,
          declaredCash: numCash,
          declaredCredit: numCredit,
          declaredDebit: numDebit,
          declaredPix: numPix,
          cashDifference,
          notes: notes ? String(notes).trim() : null
        })
        .where(eq(cashRegisters.id, registerId));

      return {
        id: registerId,
        status: 'CLOSED',
        closedAt: nowIso,
        closedByUid: uid,
        initialBalance: reg.openingBalance,
        totalDeclared,
        declaredCash: numCash,
        declaredCredit: numCredit,
        declaredDebit: numDebit,
        declaredPix: numPix,
        expectedCashInDrawer,
        cashDifference,
        totalsByPaymentMethod: summary.totalsByPaymentMethod,
        operations: summary.operations,
        notes
      };
    });

    logAuditEvent(
      companyId, 
      uid, 
      'CASH_REGISTER_CLOSED', 
      `Caixa fechado: ${registerId}. Total Declarado: R$ ${totalDeclared.toFixed(2)}, Diferença de Caixa: R$ ${closedResult.cashDifference.toFixed(2)}`, 
      req
    );

    return res.json({ success: true, register: closedResult });
  } catch (error: any) {
    console.error("Erro ao fechar caixa:", error);
    return res.status(500).json({ error: error.message || "Erro ao fechar caixa." });
  }
});

// 5. List Cash Register History
router.get("/api/cash-register/history", requireApiAuth, async (req: Request, res: Response) => {
  try {
    const userProfile = (req as any).userProfile;
    if (!userProfile?.companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const companyId = userProfile.companyId;

    const list = await db.select({
      id: cashRegisters.id,
      companyId: cashRegisters.companyId,
      branchId: cashRegisters.branchId,
      deviceId: cashRegisters.deviceId,
      openedBy: cashRegisters.openedBy,
      closedBy: cashRegisters.closedBy,
      status: cashRegisters.status,
      openingBalance: cashRegisters.openingBalance,
      closingBalance: cashRegisters.closingBalance,
      declaredCash: cashRegisters.declaredCash,
      declaredCredit: cashRegisters.declaredCredit,
      declaredDebit: cashRegisters.declaredDebit,
      declaredPix: cashRegisters.declaredPix,
      cashDifference: cashRegisters.cashDifference,
      notes: cashRegisters.notes,
      openedAt: cashRegisters.openedAt,
      closedAt: cashRegisters.closedAt,
      openedByName: users.name
    })
    .from(cashRegisters)
    .leftJoin(users, eq(cashRegisters.openedBy, users.id))
    .where(eq(cashRegisters.companyId, companyId))
    .orderBy(desc(cashRegisters.openedAt))
    .limit(50);

    const enrichedList = await Promise.all(list.map(async (reg) => {
      const summary = await getRegisterSummary(reg.id, companyId);
      return {
        id: reg.id,
        companyId: reg.companyId,
        branchId: reg.branchId,
        terminalId: reg.deviceId,
        status: reg.status,
        initialBalance: reg.openingBalance,
        closingBalance: reg.closingBalance,
        declaredCash: reg.declaredCash,
        declaredCredit: reg.declaredCredit,
        declaredDebit: reg.declaredDebit,
        declaredPix: reg.declaredPix,
        cashDifference: reg.cashDifference,
        notes: reg.notes,
        openedAt: reg.openedAt,
        closedAt: reg.closedAt,
        openedByUid: reg.openedBy,
        openedByName: reg.openedByName || 'Operador',
        operations: summary.operations,
        totalsByPaymentMethod: summary.totalsByPaymentMethod,
        suprimentosTotal: summary.suprimentosTotal,
        sangriasTotal: summary.sangriasTotal
      };
    }));

    return res.json({ success: true, history: enrichedList });
  } catch (error: any) {
    console.error("Erro ao listar histórico de caixas:", error);
    return res.status(500).json({ error: error.message || "Erro ao consultar histórico de caixas." });
  }
});

export default router;
