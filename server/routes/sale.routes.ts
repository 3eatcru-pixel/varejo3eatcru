import express from 'express';
import { randomUUID } from 'crypto';
import { requireApiAuth, requirePermission } from "../middleware/auth";
import { db } from "../../src/db/index.ts";
import { sales, saleItems, products, inventoryMovements, financialRecords, branches, cashRegisters } from "../../src/db/schema.ts";
import { eq, and, desc, sql, gte } from "drizzle-orm";
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
      cashRegisterId,
      activeRegister,
      branchId
    } = body;

    const targetCashRegisterId = cashRegisterId || activeRegister?.id;

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
    const safeBranch = branchId || userProfile.branchId || null;

    // Validate branchId and cashRegisterId context (Audit P0 - Tenant isolation)
    if (safeBranch) {
      const branchRows = await db.select().from(branches).where(and(eq(branches.id, safeBranch), eq(branches.companyId, companyId)));
      if (branchRows.length === 0) {
        return res.status(400).json({ error: "A filial informada não pertence à sua empresa ou é inválida." });
      }
    }

    if (targetCashRegisterId) {
      const registerRows = await db.select().from(cashRegisters).where(and(eq(cashRegisters.id, targetCashRegisterId), eq(cashRegisters.companyId, companyId)));
      if (registerRows.length === 0) {
        return res.status(400).json({ error: "O caixa informado não pertence à sua empresa ou é inválido." });
      }
    }

    let calculatedSubtotal = 0;
    const resolvedItems: Array<{ productId: string; quantity: number; unitPrice: number; totalPrice: number }> = [];

    // Authoritatively resolve product prices from DB and validate quantities strictly
    for (const item of saleProductList) {
      const prodId = item.productId || item.product?.id || item.id;
      if (!prodId) continue;

      const qty = Number(item.quantity);
      if (isNaN(qty) || !Number.isFinite(qty) || qty <= 0 || qty > 10000) {
        return res.status(400).json({ error: `Quantidade inválida (${item.quantity}) para o produto ID: ${prodId}` });
      }

      const prodRows = await db.select().from(products).where(and(eq(products.id, prodId), eq(products.companyId, companyId)));
      if (prodRows.length === 0) {
        return res.status(400).json({ error: `Produto inválido ou inexistente: ${prodId}` });
      }

      const unitPrice = Number(prodRows[0].price) || Number(item.product?.price) || Number(item.unitPrice) || 0;
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

    // Hardening checkout discount permissions
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

    const createdSale = await db.transaction(async (tx) => {
      // 1. Insert Sales Record with authoritative totals
      await tx.insert(sales).values({
        id: saleId,
        companyId,
        branchId: safeBranch,
        cashRegisterId: cashRegisterId || null,
        userId: uid,
        status: 'COMPLETED',
        subtotal: Number(calculatedSubtotal.toFixed(2)),
        discount: Number(safeDiscount.toFixed(2)),
        total: calculatedTotal,
        paymentMethod: String(paymentMethod).toUpperCase(),
        idempotencyKey: idempotencyKey || null,
        createdAt: nowIso
      });

      // 2. Insert Sale Items and adjust stock atomically
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

      // 3. Register Financial Revenue Record (DRE / Fluxo de Caixa)
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
          notes: `Forma de Pagamento: ${paymentMethod} | Caixa: ${cashRegisterId || 'Balcão'}`,
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
        paymentMethod,
        status: 'COMPLETED',
        createdAt: nowIso
      };
    });

    logAuditEvent(companyId, uid, 'SALE_COMPLETED', `Venda ${saleId} finalizada no valor de R$ ${calculatedTotal}`, req);

    return res.json({ success: true, sale: createdSale });
  } catch (error: any) {
    console.error("Erro ao realizar checkout:", error);
    return res.status(500).json({ error: error.message || "Erro no processamento da venda." });
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

// Refund / Estorno Parcial ou Total de Venda
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

    let totalRefundAmount = 0;

    await db.transaction(async (tx) => {
      const existingSales = await tx.select().from(sales)
        .where(and(eq(sales.id, saleId), eq(sales.companyId, companyId)))
        .for('update');

      if (!existingSales.length) throw new Error("Venda não encontrada.");

      const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId));

      for (const item of items) {
        const qtyToReturn = Number(returnQuantities[item.productId] || returnQuantities[item.id] || 0);
        if (qtyToReturn > 0) {
          const itemUnitPrice = Number(item.unitPrice) || 0;
          totalRefundAmount += itemUnitPrice * qtyToReturn;

          await tx.insert(inventoryMovements).values({
            id: randomUUID(),
            companyId,
            productId: item.productId,
            userId: uid,
            type: 'REFUND',
            quantity: qtyToReturn,
            referenceId: saleId,
            createdAt: nowIso
          });

          await tx.update(products)
            .set({ 
              stock: sql`${products.stock} + ${qtyToReturn}`,
              updatedAt: nowIso
            })
            .where(and(eq(products.id, item.productId), eq(products.companyId, companyId)));
        }
      }

      if (totalRefundAmount > 0) {
        await tx.insert(financialRecords).values({
          id: randomUUID(),
          companyId,
          type: 'PAYABLE',
          description: `Devolução/Estorno Venda #${saleId.substring(0, 8).toUpperCase()}`,
          amount: totalRefundAmount,
          dueDate: nowIso.substring(0, 10),
          category: 'Devoluções & Estornos',
          status: 'PAID',
          paymentDate: nowIso,
          notes: `Método de devolução: ${refundMethod}. Motivo: ${reason}`,
          createdBy: uid,
          createdAt: nowIso,
          updatedAt: nowIso
        });
      }
    });

    logAuditEvent(companyId, uid, 'SALE_REFUNDED', `Estorno da venda ${saleId} no valor de R$ ${totalRefundAmount}`, req);

    return res.json({ success: true, message: "Estorno/Devolução processado com sucesso.", refundAmount: totalRefundAmount });
  } catch (error: any) {
    console.error("Erro ao processar estorno:", error);
    return res.status(500).json({ error: error.message || "Erro ao processar estorno." });
  }
});

export default router;
