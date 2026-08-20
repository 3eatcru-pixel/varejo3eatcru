import express from 'express';
import { randomUUID } from 'crypto';
import { requireApiAuth, requirePermission } from "../middleware/auth";
import { db } from "../../src/db/index.ts";
import { sales, saleItems, salePayments, products, inventoryMovements, financialRecords, branches, cashRegisters } from "../../src/db/schema.ts";
import { eq, and, desc, sql, gte, inArray } from "drizzle-orm";
import { logAuditEvent } from "../lib/audit";
import { hasPermission } from "../../src/lib/permissions";

const router = express.Router();

// List Sales
router.get("/api/sales", requireApiAuth, async (req, res) => {
  try {
    const userProfile = (req as any).userProfile;
    if (!userProfile?.companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const companyId = userProfile.companyId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const [saleList, [{ count }]] = await Promise.all([
      db.select().from(sales)
        .where(eq(sales.companyId, companyId))
        .orderBy(desc(sales.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(sales)
        .where(eq(sales.companyId, companyId))
    ]);

    const total = Number(count) || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return res.json({ 
      success: true, 
      sales: saleList,
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
    console.error("Erro ao listar vendas:", error);
    return res.status(500).json({ error: error.message || "Erro ao consultar vendas." });
  }
});

// Checkout / Create Sale
router.post(["/api/sales", "/api/sale/checkout", "/api/sale/create"], requireApiAuth, requirePermission("posAccess"), async (req, res) => {
  try {
    const userProfile = (req as any).userProfile;
    if (!userProfile?.companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const companyId = userProfile.companyId;
    const uid = userProfile.uid || userProfile.id;
    const rawBody = req.body || {};
    const body = rawBody.payload || rawBody;

    const {
      cart = [],
      items = [],
      discount = 0,
      discountAmount = 0,
      paymentMethod = 'CASH',
      splitPayments = [],
      payments = [],
      cashReceived: rawCashReceived,
      cashRegisterId,
      activeRegister,
      branchId,
      deviceId,
      terminalId
    } = body;

    const targetCashRegisterId = cashRegisterId || activeRegister?.id;

    // Audit P0: Mandatory OPEN Cash Register check for POS Sales
    if (!targetCashRegisterId) {
      return res.status(400).json({ error: "Vendas no PDV exigem um caixa aberto na mesma empresa e filial." });
    }

    const registerRows = await db.select().from(cashRegisters)
      .where(and(eq(cashRegisters.id, targetCashRegisterId), eq(cashRegisters.companyId, companyId)));
    
    if (registerRows.length === 0) {
      return res.status(400).json({ error: "O caixa informado não pertence à sua empresa ou é inválido." });
    }
    if (registerRows[0].status !== 'OPEN') {
      return res.status(400).json({ error: "Não é possível realizar vendas em um caixa fechado. Abra uma nova sessão de caixa." });
    }

    const saleProductList = cart.length ? cart : items;
    if (!saleProductList || !saleProductList.length) {
      return res.status(400).json({ error: "A venda deve conter pelo menos um produto." });
    }

    // Idempotency check
    const idempotencyKey = String(req.headers['x-idempotency-key'] || body.idempotencyKey || '');
    if (idempotencyKey) {
      const existingKeySale = await db.select().from(sales).where(and(eq(sales.companyId, companyId), eq(sales.idempotencyKey, idempotencyKey)));
      if (existingKeySale.length > 0) {
        return res.json({ success: true, sale: existingKeySale[0], idempotentReplay: true });
      }
    }

    const saleId = randomUUID();
    const nowIso = new Date().toISOString();
    const safeBranch = branchId || registerRows[0].branchId || userProfile.branchId || null;
    const safeDevice = deviceId || terminalId || registerRows[0].deviceId || userProfile.terminalId || null;

    if (safeBranch) {
      const branchRows = await db.select().from(branches).where(and(eq(branches.id, safeBranch), eq(branches.companyId, companyId)));
      if (branchRows.length === 0) {
        return res.status(400).json({ error: "A filial informada não pertence à sua empresa ou é inválida." });
      }
    }

    // Batch SELECT for product resolution (Audit P1 - Eliminates N+1 queries)
    const productIds: string[] = Array.from(new Set(
      saleProductList.map((item: any) => item.productId || item.product?.id || item.id).filter((id: any): id is string => Boolean(id))
    ));

    if (productIds.length === 0) {
      return res.status(400).json({ error: "Nenhum ID de produto válido foi encontrado no carrinho." });
    }

    const dbProducts = await db.select().from(products)
      .where(and(eq(products.companyId, companyId), inArray(products.id, productIds)));
    
    const productMap = new Map(dbProducts.map(p => [p.id, p]));

    let calculatedSubtotal = 0;
    const resolvedItems: Array<{ productId: string; quantity: number; unitPrice: number; totalPrice: number }> = [];

    for (const item of saleProductList) {
      const prodId = item.productId || item.product?.id || item.id;
      if (!prodId) continue;

      const qty = Number(item.quantity);
      if (isNaN(qty) || !Number.isFinite(qty) || qty <= 0 || qty > 10000) {
        return res.status(400).json({ error: `Quantidade inválida (${item.quantity}) para o produto ID: ${prodId}` });
      }

      const prod = productMap.get(prodId);
      if (!prod || !prod.isActive) {
        return res.status(400).json({ error: `Produto inativo ou inexistente no catálogo: ${prodId}` });
      }

      const unitPrice = Number(prod.price) || Number(item.product?.price) || Number(item.unitPrice) || 0;
      const totalPrice = Number((qty * unitPrice).toFixed(2));

      calculatedSubtotal += totalPrice;
      resolvedItems.push({
        productId: prodId,
        quantity: qty,
        unitPrice,
        totalPrice
      });
    }

    if (resolvedItems.length === 0) {
      return res.status(400).json({ error: "Nenhum produto válido encontrado para a venda." });
    }

    const safeDiscount = Math.max(0, Number(discount || discountAmount || 0));

    if (safeDiscount > 0) {
      const canDiscount = hasPermission(userProfile, 'giveDiscount');
      if (!canDiscount) {
        return res.status(403).json({
          error: "PERMISSION_DENIED",
          message: "Acesso negado: Você não tem permissão para conceder descontos nesta operação ('giveDiscount')."
        });
      }

      const discountRatio = safeDiscount / calculatedSubtotal;
      const isAdminOrOwner = userProfile.role === 'admin' || userProfile.role === 'OWNER' || userProfile.role === 'ADMIN';
      if (!isAdminOrOwner && discountRatio > 0.30) {
        return res.status(400).json({
          error: "LIMIT_EXCEEDED",
          message: "Limite de desconto excedido: O desconto máximo permitido para operadores de caixa é de 30%."
        });
      }
    }

    const calculatedTotal = Number(Math.max(0, calculatedSubtotal - safeDiscount).toFixed(2));

    // Process and validate payments (Split / Mixed Payments & Cash Change)
    const rawPaymentsList = (splitPayments && splitPayments.length > 0) ? splitPayments : (payments && payments.length > 0 ? payments : []);
    const resolvedPayments: Array<{ method: string; amount: number; cashReceived?: number; changeGiven?: number }> = [];

    if (rawPaymentsList.length > 0) {
      let sumPayments = 0;
      for (const p of rawPaymentsList) {
        const method = String(p.method || p.paymentMethod || 'CASH').toUpperCase();
        const amt = Number((Number(p.amount) || 0).toFixed(2));
        if (amt <= 0) continue;

        let cashReceivedVal: number | undefined = undefined;
        let changeGivenVal: number | undefined = undefined;

        if (method === 'CASH') {
          const received = Number(p.cashReceived || rawCashReceived || amt);
          if (received < amt) {
            return res.status(400).json({ error: `Valor em dinheiro recebido (R$ ${received.toFixed(2)}) é inferior ao valor da parcela (R$ ${amt.toFixed(2)}).` });
          }
          cashReceivedVal = received;
          changeGivenVal = Number((received - amt).toFixed(2));
        }

        sumPayments = Number((sumPayments + amt).toFixed(2));
        resolvedPayments.push({
          method,
          amount: amt,
          cashReceived: cashReceivedVal,
          changeGiven: changeGivenVal
        });
      }

      if (Math.abs(sumPayments - calculatedTotal) > 0.01) {
        return res.status(400).json({ error: `A soma das formas de pagamento (R$ ${sumPayments.toFixed(2)}) não corresponde ao total da venda (R$ ${calculatedTotal.toFixed(2)}).` });
      }
    } else {
      // Single payment method fallback
      const method = String(paymentMethod).toUpperCase();
      let cashReceivedVal: number | undefined = undefined;
      let changeGivenVal: number | undefined = undefined;

      if (method === 'CASH' && rawCashReceived !== undefined) {
        const received = Number(rawCashReceived);
        if (received < calculatedTotal) {
          return res.status(400).json({ error: `Valor em dinheiro recebido (R$ ${received.toFixed(2)}) é inferior ao valor total da venda (R$ ${calculatedTotal.toFixed(2)}).` });
        }
        cashReceivedVal = received;
        changeGivenVal = Number((received - calculatedTotal).toFixed(2));
      }

      resolvedPayments.push({
        method,
        amount: calculatedTotal,
        cashReceived: cashReceivedVal,
        changeGiven: changeGivenVal
      });
    }

    const mainPaymentMethod = resolvedPayments.length > 1 ? 'SPLIT' : (resolvedPayments[0]?.method || String(paymentMethod).toUpperCase());

    const createdSale = await db.transaction(async (tx) => {
      // 1. Insert Sales Record with authoritative totals & deviceId
      await tx.insert(sales).values({
        id: saleId,
        companyId,
        branchId: safeBranch,
        deviceId: safeDevice,
        cashRegisterId: targetCashRegisterId,
        userId: uid,
        status: 'COMPLETED',
        subtotal: Number(calculatedSubtotal.toFixed(2)),
        discount: Number(safeDiscount.toFixed(2)),
        total: calculatedTotal,
        paymentMethod: mainPaymentMethod,
        idempotencyKey: idempotencyKey || null,
        createdAt: nowIso
      });

      // 2. Insert Split Payments
      for (const pay of resolvedPayments) {
        await tx.insert(salePayments).values({
          id: randomUUID(),
          saleId,
          method: pay.method,
          amount: pay.amount,
          cashReceived: pay.cashReceived,
          changeGiven: pay.changeGiven,
          createdAt: nowIso
        });
      }

      // 3. Insert Sale Items and adjust stock atomically
      for (const resItem of resolvedItems) {
        const itemId = randomUUID();
        await tx.insert(saleItems).values({
          id: itemId,
          saleId,
          productId: resItem.productId,
          quantity: resItem.quantity,
          unitPrice: resItem.unitPrice,
          totalPrice: resItem.totalPrice
        });

        // Insert Inventory Movement (OUT/SALE)
        await tx.insert(inventoryMovements).values({
          id: randomUUID(),
          companyId,
          productId: resItem.productId,
          userId: uid,
          type: 'SALE',
          quantity: -resItem.quantity,
          referenceId: saleId,
          createdAt: nowIso
        });

        // Deduct from product stock conditionally and atomically to prevent race conditions (Audit P0)
        const updatedRows = await tx.update(products)
          .set({ 
            stock: sql`${products.stock} - ${resItem.quantity}`, 
            updatedAt: nowIso 
          })
          .where(
            and(
              eq(products.id, resItem.productId),
              eq(products.companyId, companyId),
              gte(products.stock, resItem.quantity)
            )
          )
          .returning({ id: products.id, stock: products.stock });

        if (updatedRows.length === 0) {
          throw new Error(`Estoque insuficiente ou indisponível para o produto ID: ${resItem.productId}`);
        }
      }

      // 4. Register Financial Revenue Record (DRE / Fluxo de Caixa)
      if (calculatedTotal > 0) {
        await tx.insert(financialRecords).values({
          id: randomUUID(),
          companyId,
          type: 'RECEIVABLE',
          description: `Venda PDV #${saleId.substring(0, 8).toUpperCase()}`,
          amount: calculatedTotal,
          dueDate: nowIso.substring(0, 10),
          category: 'Vendas PDV',
          status: 'PAID',
          paymentDate: nowIso,
          notes: `Formas de Pagamento: ${resolvedPayments.map(p => `${p.method}: R$ ${p.amount.toFixed(2)}`).join(', ')} | Caixa: ${targetCashRegisterId}`,
          createdBy: uid,
          createdAt: nowIso,
          updatedAt: nowIso
        });
      }

      return {
        id: saleId,
        code: `VEN-${saleId.substring(0, 8).toUpperCase()}`,
        companyId,
        subtotal: calculatedSubtotal,
        discount: safeDiscount,
        total: calculatedTotal,
        paymentMethod: mainPaymentMethod,
        payments: resolvedPayments,
        status: 'COMPLETED',
        createdAt: nowIso
      };
    });

    logAuditEvent(companyId, uid, 'SALE_COMPLETED', `Venda ${saleId} finalizada no valor de R$ ${calculatedTotal}`, req);

    return res.json({ success: true, sale: createdSale });
  } catch (error: any) {
    console.error("Erro ao realizar checkout:", error);
    return res.status(400).json({ error: error.message || "Erro no processamento da venda." });
  }
});

// Cancel Sale
router.post(["/api/sales/:id/cancel", "/api/sale/cancel/:id", "/api/sale/cancel"], requireApiAuth, requirePermission("cancelSale"), async (req, res) => {
  try {
    const saleId = String(req.params.id || req.body.saleId || req.body.id || '');
    if (!saleId) {
      return res.status(400).json({ error: "Identificador da venda (saleId) não informado." });
    }

    const userProfile = (req as any).userProfile;
    if (!userProfile?.companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const companyId = userProfile.companyId;
    const uid = userProfile.uid || userProfile.id;
    const nowIso = new Date().toISOString();
    const cancelReason = String(req.body.reason || "Cancelamento de venda pelo operador");

    await db.transaction(async (tx) => {
      // Use .for('update') to lock the sale record exclusively, preventing double-cancel race conditions
      const existingSales = await tx.select().from(sales)
        .where(and(eq(sales.id, saleId), eq(sales.companyId, companyId)))
        .for('update');
      
      if (!existingSales.length) throw new Error("Venda não encontrada.");
      if (existingSales[0].status === 'CANCELED') throw new Error("Esta venda já foi cancelada.");

      // 1. Update sale status
      await tx.update(sales)
        .set({ status: 'CANCELED' })
        .where(eq(sales.id, saleId));

      // 2. Reverse inventory items
      const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId));
      for (const item of items) {
        await tx.insert(inventoryMovements).values({
          id: randomUUID(),
          companyId,
          productId: item.productId,
          userId: uid,
          type: 'REFUND',
          quantity: item.quantity,
          referenceId: saleId,
          createdAt: nowIso
        });

        const existingProds = await tx.select().from(products).where(and(eq(products.id, item.productId), eq(products.companyId, companyId)));
        if (existingProds.length > 0) {
          await tx.update(products)
            .set({ 
              stock: sql`${products.stock} + ${item.quantity}`, 
              updatedAt: nowIso 
            })
            .where(and(eq(products.id, item.productId), eq(products.companyId, companyId)));
        }
      }

      // 3. Register Financial Reversal / Estorno
      const saleVal = Number(existingSales[0].total) || 0;
      if (saleVal > 0) {
        await tx.insert(financialRecords).values({
          id: randomUUID(),
          companyId,
          type: 'PAYABLE',
          description: `Estorno/Cancelamento de Venda #${saleId.substring(0, 8).toUpperCase()}`,
          amount: saleVal,
          dueDate: nowIso.substring(0, 10),
          category: 'Estorno de Vendas',
          status: 'PAID',
          paymentDate: nowIso,
          notes: `Cancelamento de venda ID ${saleId}. Motivo: ${cancelReason}`,
          createdBy: uid,
          createdAt: nowIso,
          updatedAt: nowIso
        });
      }
    });

    logAuditEvent(companyId, uid, 'SALE_CANCELED', `Venda ${saleId} cancelada com estorno de estoque. Motivo: ${cancelReason}`, req);

    return res.json({ success: true, message: "Venda cancelada com sucesso." });
  } catch (error: any) {
    console.error("Erro ao cancelar venda:", error);
    return res.status(500).json({ error: error.message || "Erro ao cancelar a venda." });
  }
});

// Refund / Estorno Parcial ou Total de Venda (Audit P0 - Strict quantity & ledger validation)
router.post("/api/sale/refund", requireApiAuth, requirePermission("cancelSale"), async (req, res) => {
  try {
    const { saleId, returnQuantities = {}, reason = "Devolução/Estorno de itens", refundMethod = "CASH" } = req.body || {};
    if (!saleId) {
      return res.status(400).json({ error: "Identificador da venda (saleId) é obrigatório." });
    }

    const userProfile = (req as any).userProfile;
    if (!userProfile?.companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const companyId = userProfile.companyId;
    const uid = userProfile.uid || userProfile.id;
    const nowIso = new Date().toISOString();

    const idempotencyKey = String(req.headers['x-idempotency-key'] || req.body.idempotencyKey || '');

    let totalRefundAmount = 0;

    await db.transaction(async (tx) => {
      // 1. Lock sale record exclusively
      const existingSales = await tx.select().from(sales)
        .where(and(eq(sales.id, saleId), eq(sales.companyId, companyId)))
        .for('update');

      if (!existingSales.length) throw new Error("Venda não encontrada.");
      if (existingSales[0].status === 'CANCELED') throw new Error("Não é possível realizar devolução de uma venda cancelada.");

      // 2. Fetch original sale items and previous refund movements to calculate max returnable quantities
      const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId));
      const previousRefunds = await tx.select().from(inventoryMovements).where(and(
        eq(inventoryMovements.referenceId, saleId),
        eq(inventoryMovements.companyId, companyId),
        eq(inventoryMovements.type, 'REFUND')
      ));

      // Map previously returned quantities by product
      const previouslyReturnedMap: Record<string, number> = {};
      for (const m of previousRefunds) {
        previouslyReturnedMap[m.productId] = (previouslyReturnedMap[m.productId] || 0) + Number(m.quantity || 0);
      }

      // 3. Validate return quantities strictly against original item quantities
      for (const item of items) {
        const requestedReturn = Number(returnQuantities[item.productId] || returnQuantities[item.id] || 0);
        if (requestedReturn > 0) {
          const alreadyReturned = previouslyReturnedMap[item.productId] || 0;
          const maxReturnable = Math.max(0, item.quantity - alreadyReturned);

          if (requestedReturn > maxReturnable) {
            throw new Error(`Quantidade a devolver (${requestedReturn}) excede o limite disponível para devolução (${maxReturnable}) do produto ID: ${item.productId}`);
          }

          const itemUnitPrice = Number(item.unitPrice) || 0;
          totalRefundAmount += itemUnitPrice * requestedReturn;

          // Record inventory refund movement
          await tx.insert(inventoryMovements).values({
            id: randomUUID(),
            companyId,
            productId: item.productId,
            userId: uid,
            type: 'REFUND',
            quantity: requestedReturn,
            referenceId: saleId,
            createdAt: nowIso
          });

          // Restock product
          await tx.update(products)
            .set({ 
              stock: sql`${products.stock} + ${requestedReturn}`,
              updatedAt: nowIso
            })
            .where(and(eq(products.id, item.productId), eq(products.companyId, companyId)));
        }
      }

      if (totalRefundAmount === 0) {
        throw new Error("Nenhum item válido foi selecionado para devolução.");
      }

      // 4. Register Financial Reversal
      await tx.insert(financialRecords).values({
        id: randomUUID(),
        companyId,
        type: 'PAYABLE',
        description: `Devolução/Estorno Venda #${saleId.substring(0, 8).toUpperCase()}`,
        amount: Number(totalRefundAmount.toFixed(2)),
        dueDate: nowIso.substring(0, 10),
        category: 'Devoluções & Estornos',
        status: 'PAID',
        paymentDate: nowIso,
        notes: `Método de devolução: ${refundMethod}. Motivo: ${reason}${idempotencyKey ? ` | IdempotencyKey: ${idempotencyKey}` : ''}`,
        createdBy: uid,
        createdAt: nowIso,
        updatedAt: nowIso
      });
    });

    logAuditEvent(companyId, uid, 'SALE_REFUNDED', `Estorno parcial/total da venda ${saleId} no valor de R$ ${totalRefundAmount.toFixed(2)}`, req);

    return res.json({ 
      success: true, 
      message: "Estorno/Devolução processado com sucesso.", 
      refundAmount: Number(totalRefundAmount.toFixed(2)) 
    });
  } catch (error: any) {
    console.error("Erro ao processar estorno:", error);
    return res.status(400).json({ error: error.message || "Erro ao processar estorno." });
  }
});

export default router;
