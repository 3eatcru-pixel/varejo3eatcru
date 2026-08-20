import express from 'express';
import { randomUUID } from 'crypto';
import { requireApiAuth, requirePermission } from "../middleware/auth";
import { LicenseService } from "../services/license.service";
import { db } from "../../src/db/index.ts";
import { products, inventoryMovements, users } from "../../src/db/schema.ts";
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

    const prodList = await db.select().from(products)
      .where(and(eq(products.companyId, companyId), eq(products.isActive, true)))
      .orderBy(products.name)
      .limit(limit)
      .offset(offset);

    return res.json({ 
      success: true, 
      products: prodList,
      pagination: { page, limit }
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
    const { productId, delta, type = 'IN', reason = 'Ajuste manual de estoque' } = req.body;

    if (!productId) return res.status(400).json({ error: "ID do produto é obrigatório." });
    
    const numDelta = Number(delta);
    if (!Number.isFinite(numDelta) || numDelta === 0) {
      return res.status(400).json({ error: "Informe uma quantidade de ajuste válida (número diferente de zero)." });
    }

    const nowIso = new Date().toISOString();

    await db.transaction(async (tx) => {
      // Atomic adjustment to prevent race conditions
      const updatedRows = await tx.update(products)
        .set({ 
          stock: sql`${products.stock} + ${numDelta}`, 
          updatedAt: nowIso 
        })
        .where(and(eq(products.id, productId), eq(products.companyId, companyId)))
        .returning({ id: products.id, stock: products.stock });

      if (updatedRows.length === 0) {
        throw new Error("Produto não encontrado.");
      }

      await tx.insert(inventoryMovements).values({
        id: randomUUID(),
        companyId,
        productId,
        userId: uid,
        type: String(type).toUpperCase(),
        quantity: numDelta,
        referenceId: reason,
        createdAt: nowIso
      });
    });

    logAuditEvent(companyId, uid, 'STOCK_ADJUSTED', `Ajuste de estoque: ${numDelta} unidades no produto ${productId}`, req);

    return res.json({ success: true, message: "Estoque ajustado com sucesso." });
  } catch (error: any) {
    console.error("Erro ao ajustar estoque:", error);
    return res.status(500).json({ error: error.message || "Erro ao ajustar estoque." });
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

export default router;
