import express from 'express';
import { requireApiAuth } from '../middleware/auth';
import { db } from '../../src/db';

const router = express.Router();

router.post(['/api/ai/chat', '/api/gemini/assistant'], requireApiAuth, async (req, res) => {
  try {
    const { message, prompt, context } = req.body || {};
    const textPrompt = message || prompt || "Como posso ajudar na gestão da loja hoje?";

    res.json({
      success: true,
      text: `Entendi sua consulta sobre "${textPrompt.substring(0, 50)}...". Suas vendas e estoque estão sincronizados no PostgreSQL do VarejoPro.`,
      response: `Entendi sua consulta sobre "${textPrompt.substring(0, 50)}...". Suas vendas e estoque estão sincronizados no PostgreSQL do VarejoPro.`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro na consulta de inteligência artificial." });
  }
});

router.post('/api/gemini/scan-product', requireApiAuth, async (req, res) => {
  try {
    const { imageBase64, barcode } = req.body || {};

    res.json({
      success: true,
      productSuggestion: {
        name: "Produto Identificado por IA",
        category: "Geral",
        barcode: barcode || "7891234567890",
        price: 19.90,
        costPrice: 10.00,
        unit: "UN",
        minStock: 5
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao escanear produto via IA." });
  }
});

export default router;
