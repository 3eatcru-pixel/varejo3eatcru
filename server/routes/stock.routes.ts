import express from 'express';
import { randomUUID } from 'crypto';
import { requireApiAuth, requirePermission } from "../middleware/auth";
import { LicenseService } from "../services/license.service";
import { db } from "../../src/db/index.ts";
import { products, inventoryMovements, users, financialRecords } from "../../src/db/schema.ts";
import { eq, and, desc, sql } from "drizzle-orm";
import { logAuditEvent } from "../lib/audit";

const router = express.Router();

// List Products
router.get("/api/stock/products", requireApiAuth, async (req, res) => {
  try {
    const userProfile = (req as any).userProfile;
    if (!userProfile?.companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const companyId = userProfile.companyId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const [prodList, [{ count }]] = await Promise.all([
      db.select().from(products)
        .where(and(eq(products.companyId, companyId), eq(products.isActive, true)))
        .orderBy(products.name)
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(products)
        .where(and(eq(products.companyId, companyId), eq(products.isActive, true)))
    ]);

    const total = Number(count) || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return res.json({ 
      success: true, 
      products: prodList,
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
    console.error("Erro ao listar produtos:", error);
    return res.status(500).json({ error: error.message || "Erro ao consultar produtos." });
  }
});

// List Inventory Audit Trail Movements
router.get("/api/stock/movements", requireApiAuth, async (req, res) => {
  try {
    const userProfile = (req as any).userProfile;
    if (!userProfile?.companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const companyId = userProfile.companyId;
    const productId = req.query.productId as string | undefined;
    const type = req.query.type as string | undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const queryConditions = [eq(inventoryMovements.companyId, companyId)];
    if (productId) queryConditions.push(eq(inventoryMovements.productId, productId));
    if (type) queryConditions.push(eq(inventoryMovements.type, type.toUpperCase()));

    const movements = await db.select({
      id: inventoryMovements.id,
      companyId: inventoryMovements.companyId,
      productId: inventoryMovements.productId,
      productName: products.name,
      userId: inventoryMovements.userId,
      userName: users.name,
      type: inventoryMovements.type,
      quantity: inventoryMovements.quantity,
      referenceId: inventoryMovements.referenceId,
      createdAt: inventoryMovements.createdAt
    })
    .from(inventoryMovements)
    .leftJoin(products, eq(inventoryMovements.productId, products.id))
    .leftJoin(users, eq(inventoryMovements.userId, users.id))
    .where(and(...queryConditions))
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(limit)
    .offset(offset);

    return res.json({
      success: true,
      movements,
      pagination: { page, limit }
    });
  } catch (error: any) {
    console.error("Erro ao listar movimentações de estoque:", error);
    return res.status(500).json({ error: error.message || "Erro ao consultar movimentações." });
  }
});

// Create or Update Product
router.post("/api/stock/products", requireApiAuth, requirePermission("manageStock"), async (req, res) => {
  try {
    const userProfile = (req as any).userProfile;
    if (!userProfile?.companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const companyId = userProfile.companyId;
    const uid = userProfile.uid || userProfile.id;
    const body = req.body || {};
    const nowIso = new Date().toISOString();

    const productId = body.id || randomUUID();
    const existing = await db.select().from(products).where(and(eq(products.id, productId), eq(products.companyId, companyId)));

    if (existing.length > 0) {
      // For updates, we IGNORE the 'stock' field to prevent mass assignment/untracked changes.
      // Stock must be updated via the /api/stock/adjust route for audit trail.
      await db.update(products).set({
        name: body.name || existing[0].name,
        barcode: body.barcode !== undefined ? body.barcode : existing[0].barcode,
        sku: body.sku !== undefined ? body.sku : existing[0].sku,
        price: body.price !== undefined ? Number(body.price) : existing[0].price,
        costPrice: body.costPrice !== undefined ? Number(body.costPrice) : existing[0].costPrice,
        categoryId: body.categoryId || body.category || existing[0].categoryId,
        updatedAt: nowIso
      }).where(and(eq(products.id, productId), eq(products.companyId, companyId)));
    } else {
      // Check resource quota before adding a new product to catalog
      const quotaCheck = await LicenseService.checkResourceQuota(companyId, 'products', 1);
      if (!quotaCheck.allowed) {
        return res.status(402).json({
          error: quotaCheck.reason || 'Limite de produtos no catálogo atingido para este plano.',
          code: 'PRODUCT_LIMIT_REACHED',
          current: quotaCheck.current,
          limit: quotaCheck.limit,
          planTier: quotaCheck.planTier
        });
      }

      const initialStock = Number(body.stock) || 0;
      await db.insert(products).values({
        id: productId,
        companyId,
        name: body.name || 'Novo Produto',
        barcode: body.barcode || null,
        sku: body.sku || null,
        price: Number(body.price) || 0,
        costPrice: Number(body.costPrice) || 0,
        stock: initialStock,
        categoryId: body.categoryId || body.category || 'Geral',
        isActive: true,
        createdAt: nowIso,
        updatedAt: nowIso
      });

      // Log initial stock movement if provided
      if (initialStock !== 0) {
        await db.insert(inventoryMovements).values({
          id: randomUUID(),
          companyId,
          productId,
          userId: uid,
          type: 'IN',
          quantity: initialStock,
          referenceId: 'Estoque inicial no cadastro',
          createdAt: nowIso
        });
      }
    }

    logAuditEvent(companyId, uid, 'PRODUCT_SAVED', `Produto ${body.name || productId} salvo`, req);

    return res.json({ success: true, productId });
  } catch (error: any) {
    console.error("Erro ao salvar produto:", error);
    return res.status(500).json({ error: error.message || "Erro ao salvar produto." });
  }
});

// Adjust Stock / Manual Movement
router.post(["/api/stock/adjust", "/api/stock/movement"], requireApiAuth, requirePermission("manageStock"), async (req, res) => {
  try {
    const userProfile = (req as any).userProfile;
    if (!userProfile?.companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const companyId = userProfile.companyId;
    const uid = userProfile.uid || userProfile.id;
    const body = req.body || {};

    const targetProductId = body.productId || body.product?.id;
    if (!targetProductId) return res.status(400).json({ error: "ID do produto é obrigatório." });

    const adjustmentType = String(body.adjustmentType || body.operation || body.type || 'IN').toUpperCase();
    const qtyVal = Number(body.qtyVal ?? body.quantity ?? body.delta ?? 0);
    const reason = String(body.reason || "Ajuste manual de estoque");

    const nowIso = new Date().toISOString();

    const resultingStock = await db.transaction(async (tx) => {
      const existingProds = await tx.select().from(products)
        .where(and(eq(products.id, targetProductId), eq(products.companyId, companyId)))
        .for('update');

      if (!existingProds.length) throw new Error("Produto não encontrado.");

      const currentStock = Number(existingProds[0].stock) || 0;
      let calculatedDelta = 0;

      if (adjustmentType === 'SET') {
        calculatedDelta = qtyVal - currentStock;
      } else if (adjustmentType === 'REMOVE' || adjustmentType === 'OUT') {
        calculatedDelta = -Math.abs(qtyVal);
      } else if (adjustmentType === 'ADD' || adjustmentType === 'IN') {
        calculatedDelta = Math.abs(qtyVal);
      } else {
        calculatedDelta = Number(body.delta) || qtyVal;
      }

      if (calculatedDelta === 0) {
        return currentStock;
      }

      const newStock = currentStock + calculatedDelta;
      if (newStock < 0) {
        throw new Error(`Saldo de estoque resultante não pode ser negativo (${newStock.toFixed(2)}). Saldo atual: ${currentStock.toFixed(2)}.`);
      }

      await tx.update(products)
        .set({ stock: newStock, updatedAt: nowIso })
        .where(and(eq(products.id, targetProductId), eq(products.companyId, companyId)));

      await tx.insert(inventoryMovements).values({
        id: randomUUID(),
        companyId,
        productId: targetProductId,
        userId: uid,
        type: adjustmentType,
        quantity: calculatedDelta,
        referenceId: reason,
        createdAt: nowIso
      });

      return newStock;
    });

    logAuditEvent(companyId, uid, 'STOCK_ADJUSTED', `Ajuste de estoque (${adjustmentType}) no produto ${targetProductId}`, req);

    return res.json({ success: true, message: "Estoque ajustado com sucesso.", resultingStock });
  } catch (error: any) {
    console.error("Erro ao ajustar estoque:", error);
    return res.status(400).json({ error: error.message || "Erro ao ajustar estoque." });
  }
});

// Delete Product (Logical delete)
router.delete("/api/stock/products/:id", requireApiAuth, requirePermission("manageStock"), async (req, res) => {
  try {
    const productId = String(req.params.id);
    const userProfile = (req as any).userProfile;
    if (!userProfile?.companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const companyId = userProfile.companyId;
    const uid = userProfile.uid || userProfile.id;

    // We do a logical delete (isActive = false) to preserve historical data for reports/sales
    const result = await db.update(products)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(and(eq(products.id, productId), eq(products.companyId, companyId)));

    logAuditEvent(companyId, uid, 'PRODUCT_DELETED', `Produto ${productId} marcado como inativo.`, req);

    return res.json({ success: true, message: "Produto removido com sucesso." });
  } catch (error: any) {
    console.error("Erro ao remover produto:", error);
    return res.status(500).json({ error: error.message || "Erro ao remover produto." });
  }
});

// Transfer Stock Endpoint (/api/stock/transfer)
router.post("/api/stock/transfer", requireApiAuth, requirePermission("manageStock"), async (req, res) => {
  try {
    const userProfile = (req as any).userProfile;
    if (!userProfile?.companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const companyId = userProfile.companyId;
    const uid = userProfile.uid || userProfile.id;
    const { product, productId, fromLocation = "Matriz", toLocation = "Depósito", qty = 0, notes = "Transferência interna" } = req.body || {};

    const targetProductId = productId || product?.id;
    const transferQty = Number(qty);

    if (!targetProductId) {
      return res.status(400).json({ error: "Produto é obrigatório para transferência." });
    }
    if (!Number.isFinite(transferQty) || transferQty <= 0) {
      return res.status(400).json({ error: "Quantidade de transferência inválida." });
    }

    const nowIso = new Date().toISOString();

    await db.transaction(async (tx) => {
      const prodRows = await tx.select().from(products).where(and(eq(products.id, targetProductId), eq(products.companyId, companyId)));
      if (!prodRows.length) {
        throw new Error("Produto não encontrado ou desativado.");
      }

      await tx.insert(inventoryMovements).values({
        id: randomUUID(),
        companyId,
        productId: targetProductId,
        userId: uid,
        type: 'TRANSFER',
        quantity: transferQty,
        referenceId: `De: ${fromLocation} Para: ${toLocation} | ${notes}`,
        createdAt: nowIso
      });
    });

    logAuditEvent(companyId, uid, 'STOCK_TRANSFERRED', `Transferência de ${transferQty} un do produto ${targetProductId} de ${fromLocation} para ${toLocation}`, req);

    return res.json({ success: true, message: "Transferência de estoque registrada com sucesso." });
  } catch (error: any) {
    console.error("Erro na transferência de estoque:", error);
    return res.status(500).json({ error: error.message || "Erro ao transferir estoque." });
  }
});

// Purchase Creation Endpoint (/api/purchase/create & /api/purchases)
router.post(["/api/purchase/create", "/api/purchases"], requireApiAuth, requirePermission("manageStock"), async (req, res) => {
  try {
    const userProfile = (req as any).userProfile;
    if (!userProfile?.companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    const companyId = userProfile.companyId;
    const uid = userProfile.uid || userProfile.id;
    const rawBody = req.body || {};
    const body = rawBody.payload || rawBody;

    const {
      supplierId,
      supplierName = "Fornecedor Direto",
      invoiceNumber = "",
      paymentMethod = "BOLETO",
      notes = "",
      purchaseItems = [],
      totalPurchaseCost = 0
    } = body;

    if (!purchaseItems || !purchaseItems.length) {
      return res.status(400).json({ error: "A compra deve conter ao menos um item de produto." });
    }

    const nowIso = new Date().toISOString();
    const purchaseId = randomUUID();

    await db.transaction(async (tx) => {
      for (const item of purchaseItems) {
        const prodId = item.productId || item.product?.id || item.id;
        const qty = Number(item.quantity || item.qty || 0);
        const costPrice = Number(item.costPrice || item.unitCost || item.price || 0);

        if (!prodId || qty <= 0) continue;

        // Register inventory entry movement
        await tx.insert(inventoryMovements).values({
          id: randomUUID(),
          companyId,
          productId: prodId,
          userId: uid,
          type: 'ENTRY',
          quantity: qty,
          referenceId: `NF: ${invoiceNumber || 'S/N'} | Fornecedor: ${supplierName}`,
          createdAt: nowIso
        });

        // Increase product stock and update cost price if provided
        await tx.update(products)
          .set({
            stock: sql`${products.stock} + ${qty}`,
            costPrice: costPrice > 0 ? costPrice : undefined,
            updatedAt: nowIso
          })
          .where(and(eq(products.id, prodId), eq(products.companyId, companyId)));
      }

      // Register financial payable record
      const safeTotalCost = Number(totalPurchaseCost) || 0;
      if (safeTotalCost > 0) {
        await tx.insert(financialRecords).values({
          id: randomUUID(),
          companyId,
          type: 'PAYABLE',
          description: `Entrada de Mercadoria / Compra NF #${invoiceNumber || 'S/N'}`,
          amount: safeTotalCost,
          dueDate: nowIso.substring(0, 10),
          category: 'Compras de Estoque',
          status: 'PENDING',
          notes: `Fornecedor: ${supplierName} | ID Compra: ${purchaseId}. ${notes}`,
          createdBy: uid,
          createdAt: nowIso,
          updatedAt: nowIso
        });
      }
    });

    logAuditEvent(companyId, uid, 'PURCHASE_CREATED', `Entrada de compra NF ${invoiceNumber} registrada no valor de R$ ${totalPurchaseCost}`, req);

    return res.json({ success: true, message: "Compra e entrada de estoque registradas com sucesso.", purchaseId });
  } catch (error: any) {
    console.error("Erro ao registrar compra:", error);
    return res.status(500).json({ error: error.message || "Erro ao registrar compra." });
  }
});

export default router;
