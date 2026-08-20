import { Router, Request, Response } from 'express';
import { requireApiAuth } from '../middleware/auth';
import { db } from '../../src/db';
import { platformCompanies, platformSubscriptions, platformInvoices, platformWebhooks } from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { PLATFORM_PLANS, PlanTier } from '../../src/types/licensing';
import { LicenseService } from '../services/license.service';
import { randomUUID } from 'crypto';

const router = Router();

// Company Entitlements & License Limits
router.get(['/api/company/entitlements', '/api/billing/entitlements'], requireApiAuth, async (req: Request, res: Response) => {
  try {
    const auth = (req as any).auth || (req as any).userProfile;
    const companyId = auth?.companyId;

    if (!companyId) {
      return res.status(403).json({ error: 'Contexto de empresa não encontrado.' });
    }

    const entitlements = await LicenseService.getCompanyEntitlements(companyId);
    return res.json({ success: true, entitlements });
  } catch (error: any) {
    console.error('Error fetching entitlements:', error);
    return res.status(500).json({ error: error.message || 'Erro ao carregar licenças da empresa.' });
  }
});

// Start 14-day PRO Trial
router.post('/api/company/trial/start', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const auth = (req as any).auth || (req as any).userProfile;
    const companyId = auth?.companyId;

    if (!companyId) {
      return res.status(403).json({ error: 'Contexto de empresa não encontrado.' });
    }

    const result = await LicenseService.startTrial(companyId, 14);
    const entitlements = await LicenseService.getCompanyEntitlements(companyId);

    return res.json({
      success: true,
      message: 'Período de teste PRO de 14 dias ativado com sucesso!',
      trialEndsAt: result.trialEndsAt,
      entitlements
    });
  } catch (error: any) {
    console.error('Error starting trial:', error);
    return res.status(500).json({ error: error.message || 'Erro ao iniciar trial.' });
  }
});

router.post('/api/billing/checkout/session', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const { planId, billingCycle, gateway } = req.body;
    const auth = (req as any).auth;
    const companyId = auth?.companyId;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada no perfil do usuário.' });
    }
    if (!planId) {
      return res.status(400).json({ error: 'Plano não especificado.' });
    }

    // Strict validation of PlanTier to prevent injection or invalid plans
    const validPlans: PlanTier[] = ['FREE', 'STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE', 'TRIAL'];
    if (!validPlans.includes(planId as PlanTier)) {
      return res.status(400).json({ error: 'Plano inválido.' });
    }

    const planData = PLATFORM_PLANS[planId as PlanTier];
    if (!planData) {
      return res.status(404).json({ error: 'Configuração do plano não encontrada.' });
    }

    const amount = billingCycle === 'yearly' ? planData.priceYearly : planData.priceMonthly;

    const invoiceId = randomUUID();
    await db.insert(platformInvoices).values({
      id: invoiceId,
      companyId,
      subscriptionId: companyId,
      amount,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    });

    // Create/Update subscription record in PENDING_PAYMENT status
    await db.insert(platformSubscriptions).values({
      id: companyId,
      planId,
      status: 'PENDING_PAYMENT',
      currentPeriodEnd: new Date(Date.now() + 24 * 3600000).toISOString(),
      updatedAt: new Date().toISOString()
    }).onConflictDoUpdate({
      target: platformSubscriptions.id,
      set: {
        planId,
        status: 'PENDING_PAYMENT',
        updatedAt: new Date().toISOString()
      }
    });

    const checkoutUrl = `/api/billing/checkout-redirect?invoiceId=${invoiceId}&gateway=${gateway || 'mercadopago'}`;

    return res.json({
      success: true,
      invoiceId,
      amount,
      checkoutUrl,
      message: 'Sessão de checkout criada com sucesso.'
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: error.message || 'Erro ao criar sessão de pagamento.' });
  }
});

router.get('/api/billing/checkout-redirect', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const { invoiceId, gateway } = req.query;
    const auth = (req as any).auth;
    const companyId = auth?.companyId;

    if (!invoiceId) {
      return res.status(400).send('Fatura não informada.');
    }

    const invRes = await db.select().from(platformInvoices).where(
      and(
        eq(platformInvoices.id, String(invoiceId)),
        eq(platformInvoices.companyId, companyId)
      )
    ).limit(1);
    
    if (invRes.length === 0) {
      return res.status(404).send('Fatura não encontrada ou você não tem permissão para acessá-la.');
    }
    
    const invoice = invRes[0];

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Checkout VarejoPro SaaS - ${gateway === 'stripe' ? 'Stripe' : 'Mercado Pago'}</title>
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
      </head>
      <body class="bg-slate-900 text-white flex items-center justify-center min-h-screen p-4 font-sans">
        <div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-6 text-center">
          <div class="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black">
            VP
          </div>
          <div>
            <h1 class="text-xl font-black tracking-wide">Checkout Seguro VarejoPro</h1>
            <p class="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">Gateway: ${gateway === 'stripe' ? 'Stripe Inc.' : 'Mercado Pago Payments'}</p>
          </div>
          <div class="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/50 space-y-2 text-left">
            <div class="flex justify-between text-xs text-slate-400">
              <span>Fatura ID:</span>
              <span class="font-mono text-slate-200">${invoice.id}</span>
            </div>
            <div class="flex justify-between text-sm font-black pt-2 border-t border-slate-800">
              <span>Total a Pagar:</span>
              <span class="text-emerald-400">R$ ${Number(invoice.amount).toFixed(2)}</span>
            </div>
          </div>
          <form action="/api/billing/simulate-success" method="POST" class="space-y-3">
            <input type="hidden" name="invoiceId" value="${invoice.id}" />
            <input type="hidden" name="token" value="${req.query.token || (req.headers.authorization?.split('Bearer ')[1] || '')}" />
            <button type="submit" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20">
              Simular Pagamento Aprovado 🚀
            </button>
          </form>
          <a href="/" class="block text-xs font-bold text-slate-400 hover:text-white transition-colors">
            Cancelar e Retornar ao ERP
          </a>
        </div>
      </body>
      </html>
    `;
    return res.send(html);
  } catch (error: any) {
    return res.status(500).send(`Erro no gateway de pagamento: ${error.message}`);
  }
});

router.post('/api/billing/simulate-success', requireApiAuth, async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).send('Rota de simulação de pagamento desativada em ambiente de produção.');
  }

  try {
    const { invoiceId } = req.body;
    const auth = (req as any).auth;
    const companyId = auth?.companyId;

    if (!invoiceId) return res.status(400).send('Fatura não informada.');

    const invRes = await db.select().from(platformInvoices).where(
      and(
        eq(platformInvoices.id, String(invoiceId)),
        eq(platformInvoices.companyId, companyId)
      )
    ).limit(1);
    
    if (invRes.length === 0) return res.status(404).send('Fatura não encontrada ou você não tem permissão para aprová-la.');
    const invoice = invRes[0];

    await db.update(platformInvoices)
      .set({ status: 'PAID' })
      .where(eq(platformInvoices.id, invoice.id));

    if (invoice.companyId) {
      await db.update(platformCompanies)
        .set({ status: 'ACTIVE', updatedAt: new Date().toISOString() } as any)
        .where(eq(platformCompanies.id, invoice.companyId));
      
      await db.update(platformSubscriptions)
        .set({ status: 'ACTIVE', updatedAt: new Date().toISOString() })
        .where(eq(platformSubscriptions.id, invoice.companyId));
    }

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Pagamento Aprovado - VarejoPro</title>
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
      </head>
      <body class="bg-slate-900 text-white flex items-center justify-center min-h-screen p-4 font-sans">
        <div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-6 text-center">
          <div class="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl font-black border border-emerald-500/30">
            ✓
          </div>
          <div>
            <h1 class="text-xl font-black text-white">Pagamento Aprovado com Sucesso!</h1>
            <p class="text-xs text-slate-400 mt-1">Sua assinatura no VarejoPro SaaS foi ativada e liberada.</p>
          </div>
          <a href="/" class="block w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20">
            Acessar Meu Painel ERP
          </a>
        </div>
      </body>
      </html>
    `;
    return res.send(html);
  } catch (error: any) {
    return res.status(500).send(`Erro ao processar aprovação: ${error.message}`);
  }
});

export default router;

import crypto from 'crypto';

// Webhook endpoint with signature validation and idempotency
router.post('/api/billing/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    if (!signature && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Assinatura do webhook ausente.' });
    }

    // Verify signature
    const webhookSecret = process.env.WEBHOOK_SECRET || 'test_webhook_secret';
    if (process.env.NODE_ENV === 'production') {
      const payloadString = JSON.stringify(req.body);
      const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(payloadString).digest('hex');
      
      if (signature !== expectedSignature) {
        return res.status(401).json({ error: 'Assinatura do webhook inválida.' });
      }
    }

    const { eventId, eventType, data } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: 'ID do evento é obrigatório para idempotência.' });
    }

    // Process event idempotently using Drizzle transaction
    await db.transaction(async (tx) => {
      // Create a platform_webhooks_events table or just check idempotency using a new table.
      // Wait, let's use the ID in platform_webhooks table.
      const existing = await tx.select().from(platformWebhooks).where(eq(platformWebhooks.id, eventId)).limit(1);
      
      if (existing.length > 0) {
        console.log(`[WEBHOOK] Evento ${eventId} já processado (idempotência).`);
        return;
      }

      // Mark event as processed
      await tx.insert(platformWebhooks).values({
        id: eventId,
        url: 'incoming_webhook',
        events: eventType,
        active: false // meaning processed
      });

      if (eventType === 'payment.created' || eventType === 'payment.updated') {
        const invoiceId = data?.invoiceId;
        const status = data?.status; // e.g. 'PAID'

        if (invoiceId && status === 'PAID') {
          await tx.update(platformInvoices).set({ status: 'PAID' }).where(eq(platformInvoices.id, String(invoiceId)));
          
          const invRes = await tx.select().from(platformInvoices).where(eq(platformInvoices.id, String(invoiceId))).limit(1);
          if (invRes.length > 0) {
            const invoice = invRes[0];
            if (invoice.companyId) {
              await tx.update(platformCompanies).set({ status: 'ACTIVE' } as any).where(eq(platformCompanies.id, invoice.companyId));
              await tx.update(platformSubscriptions).set({ status: 'ACTIVE' }).where(eq(platformSubscriptions.id, invoice.companyId));
            }
          }
        }
      }
    });

    return res.json({ success: true, message: 'Webhook processado.' });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Erro ao processar webhook.' });
  }
});
