import express from 'express';
import { requireApiAuth } from '../middleware/auth.ts';
import { db } from '../../src/db/index.ts';
import { fiscalDocuments, sales } from '../../src/db/schema.ts';
import { and, eq } from 'drizzle-orm';

const router = express.Router();

router.post('/api/fiscal/emitir', requireApiAuth, async (req, res) => {
  try {
    const { saleId } = req.body;
    const auth = (req as any).auth;
    const companyId = auth?.companyId;

    if (!companyId) return res.status(403).json({ error: "Contexto de empresa não encontrado." });

    // Verify if sale belongs to the company before emitting fiscal document (Audit Point 3)
    const [sale] = await db.select().from(sales).where(and(eq(sales.id, saleId), eq(sales.companyId, companyId)));
    if (!sale) {
      return res.status(403).json({ error: "Venda não encontrada ou pertence a outra empresa." });
    }

    await db.transaction(async (tx) => {
      await tx.insert(fiscalDocuments).values({
        id: saleId,
        saleId,
        xml: '<mock/>',
        status: 'AUTHORIZED',
        createdAt: new Date().toISOString()
      }).onConflictDoNothing();
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
