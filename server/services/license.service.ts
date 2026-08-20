import { db } from '../../src/db';
import { 
  companies, 
  memberships, 
  devices, 
  branches, 
  products, 
  clients,
  platformSubscriptions,
  platformCompanies,
  pulseQRCodes
} from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { 
  PlanTier, 
  SubscriptionStatus, 
  PlanLimits, 
  PlanFeatures, 
  CompanyEntitlements, 
  PLATFORM_PLANS 
} from '../../src/types/licensing';
import { randomUUID } from 'crypto';

export class LicenseService {
  /**
   * Retrieves the current entitlements, features, limits and real-time usage for a company.
   * platform_subscriptions is the canonical source of truth for plans and status.
   */
  static async getCompanyEntitlements(companyId: string): Promise<CompanyEntitlements> {
    const defaultEntitlements: CompanyEntitlements = {
      companyId,
      planTier: 'FREE',
      status: 'ACTIVE',
      limits: PLATFORM_PLANS.FREE.limits,
      features: PLATFORM_PLANS.FREE.features,
      usage: { users: 1, devices: 1, branches: 1, products: 0, clients: 0, pulseQRCodes: 0 }
    };

    if (!companyId) return defaultEntitlements;

    try {
      // 1. Fetch Subscription from Canonical Source of Truth (platform_subscriptions)
      let [sub] = await db
        .select()
        .from(platformSubscriptions)
        .where(eq(platformSubscriptions.id, companyId))
        .limit(1);

      // If no subscription record exists yet, bootstrap one or look at company snapshot
      if (!sub) {
        const [comp] = await db
          .select()
          .from(companies)
          .where(eq(companies.id, companyId))
          .limit(1);

        const initialPlan = (comp?.planTier as PlanTier) || 'FREE';
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

        await db.insert(platformSubscriptions).values({
          id: companyId,
          planId: initialPlan,
          status: initialPlan === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          updatedAt: now.toISOString()
        }).onConflictDoNothing();

        [sub] = await db
          .select()
          .from(platformSubscriptions)
          .where(eq(platformSubscriptions.id, companyId))
          .limit(1);
      }

      const rawPlanTier = (sub?.planId as PlanTier) || 'FREE';
      const basePlan = PLATFORM_PLANS[rawPlanTier] || PLATFORM_PLANS.FREE;
      
      let status: SubscriptionStatus = (sub?.status as SubscriptionStatus) || 'ACTIVE';

      // Check if trial or subscription is expired
      if (sub?.currentPeriodEnd) {
        const expiresAt = new Date(sub.currentPeriodEnd).getTime();
        if (Date.now() > expiresAt && status !== 'CANCELED' && status !== 'SUSPENDED') {
          if (rawPlanTier === 'TRIAL') {
            status = 'EXPIRED';
          }
        }
      }

      const limits: PlanLimits = { ...basePlan.limits };
      const features: PlanFeatures = { ...basePlan.features };

      // Calculate real-time resource counts via Drizzle queries
      const [mCount, dCount, bCount, pCount, cCount, qCount] = await Promise.all([
        db.select().from(memberships).where(eq(memberships.companyId, companyId)),
        db.select().from(devices).where(eq(devices.companyId, companyId)),
        db.select().from(branches).where(eq(branches.companyId, companyId)),
        db.select().from(products).where(eq(products.companyId, companyId)),
        db.select().from(clients).where(eq(clients.companyId, companyId)),
        db.select().from(pulseQRCodes).where(eq(pulseQRCodes.companyId, companyId))
      ]);

      const usage = {
        users: mCount.length || 1,
        devices: dCount.length || 1,
        branches: bCount.length || 1,
        products: pCount.length || 0,
        clients: cCount.length || 0,
        pulseQRCodes: qCount.length || 0
      };

      return {
        companyId,
        planTier: rawPlanTier,
        status,
        trialEndsAt: rawPlanTier === 'TRIAL' ? sub?.currentPeriodEnd : undefined,
        subscriptionExpiresAt: sub?.currentPeriodEnd,
        limits,
        features,
        usage
      };
    } catch (e) {
      console.error('Error fetching entitlements from canonical source of truth:', e);
      return defaultEntitlements;
    }
  }

  /**
   * Check if adding resources exceeds the plan quota
   */
  static async checkResourceQuota(
    companyId: string, 
    resource: keyof PlanLimits, 
    increment: number = 1
  ): Promise<{ allowed: boolean; current: number; limit: number; planTier: PlanTier; reason?: string }> {
    const entitlements = await this.getCompanyEntitlements(companyId);

    if (entitlements.status === 'SUSPENDED' || entitlements.status === 'EXPIRED') {
      return {
        allowed: false,
        current: entitlements.usage[resource],
        limit: entitlements.limits[resource],
        planTier: entitlements.planTier,
        reason: 'Assinatura suspensa ou expirada. Regularize o plano para continuar utilizando os recursos.'
      };
    }

    const current = entitlements.usage[resource];
    const limit = entitlements.limits[resource];

    if (current + increment > limit) {
      const resourceLabels: Record<keyof PlanLimits, string> = {
        users: 'usuários / funcionários',
        devices: 'dispositivos PDV',
        branches: 'filiais',
        products: 'produtos cadastrados',
        clients: 'clientes cadastrados',
        pulseQRCodes: 'pontos de atendimento Pulse (QR Codes)'
      };

      return {
        allowed: false,
        current,
        limit,
        planTier: entitlements.planTier,
        reason: `Limite de ${resourceLabels[resource]} atingido (${current}/${limit}) no plano ${entitlements.planTier}. Faça upgrade para expandir sua operação.`
      };
    }

    return {
      allowed: true,
      current,
      limit,
      planTier: entitlements.planTier
    };
  }

  /**
   * Check if a specific feature is enabled for the company's plan
   */
  static async checkFeatureEntitlement(
    companyId: string, 
    feature: keyof PlanFeatures
  ): Promise<{ allowed: boolean; planTier: PlanTier; status: SubscriptionStatus; reason?: string }> {
    const entitlements = await this.getCompanyEntitlements(companyId);

    if (entitlements.status === 'SUSPENDED' || entitlements.status === 'EXPIRED') {
      return {
        allowed: false,
        planTier: entitlements.planTier,
        status: entitlements.status,
        reason: 'Acesso bloqueado: assinatura suspensa ou período de teste expirado.'
      };
    }

    if (!entitlements.features[feature]) {
      const featureNames: Record<keyof PlanFeatures, string> = {
        pos: 'Frente de Caixa (PDV)',
        stock: 'Controle de Estoque',
        financial: 'Módulo Financeiro',
        employees: 'Gestão de Funcionários & Convites',
        multiTerminal: 'Multi-Terminais Simultâneos',
        fiscal: 'Emissão de Documentos Fiscais (NFC-e / NF-e)',
        offlineSync: 'Sincronização Offline em Nuvem',
        workspace: 'Backup & Integração Google Workspace',
        aiAssistant: 'Consultor de Gestão IA',
        whiteLabel: 'Personalização Visual da Marca',
        prioritySupport: 'Suporte Prioritário'
      };

      return {
        allowed: false,
        planTier: entitlements.planTier,
        status: entitlements.status,
        reason: `O recurso '${featureNames[feature] || feature}' não está disponível no plano ${entitlements.planTier}. Faça upgrade para desbloquear.`
      };
    }

    return {
      allowed: true,
      planTier: entitlements.planTier,
      status: entitlements.status
    };
  }

  /**
   * Starts or restarts a 14-day trial
   */
  static async startTrial(companyId: string, days: number = 14): Promise<{ success: boolean; trialEndsAt: string }> {
    const nowIso = new Date().toISOString();
    const trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    await db.transaction(async (tx) => {
      await tx.insert(platformSubscriptions).values({
        id: companyId,
        planId: 'TRIAL',
        status: 'TRIAL',
        currentPeriodEnd: trialEndsAt,
        cancelAtPeriodEnd: false,
        updatedAt: nowIso
      }).onConflictDoUpdate({
        target: platformSubscriptions.id,
        set: {
          planId: 'TRIAL',
          status: 'TRIAL',
          currentPeriodEnd: trialEndsAt,
          updatedAt: nowIso
        }
      });

      await tx.update(companies)
        .set({ planTier: 'TRIAL', updatedAt: nowIso })
        .where(eq(companies.id, companyId));

      await tx.update(platformCompanies)
        .set({ plan: 'TRIAL', status: 'ACTIVE' })
        .where(eq(platformCompanies.id, companyId));
    });

    return { success: true, trialEndsAt };
  }

  /**
   * Extends the trial period
   */
  static async extendTrial(companyId: string, daysToAdd: number = 14): Promise<{ success: boolean; trialEndsAt: string }> {
    const entitlements = await this.getCompanyEntitlements(companyId);
    const baseTime = entitlements.trialEndsAt ? new Date(entitlements.trialEndsAt).getTime() : Date.now();
    const newTrialEndsAt = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    await db.transaction(async (tx) => {
      await tx.update(platformSubscriptions)
        .set({
          planId: 'TRIAL',
          status: 'TRIAL',
          currentPeriodEnd: newTrialEndsAt,
          updatedAt: nowIso
        })
        .where(eq(platformSubscriptions.id, companyId));

      await tx.update(companies)
        .set({ planTier: 'TRIAL', updatedAt: nowIso })
        .where(eq(companies.id, companyId));
    });

    return { success: true, trialEndsAt: newTrialEndsAt };
  }

  /**
   * Changes the company plan tier in the canonical source of truth and syncs snapshots
   */
  static async changeCompanyPlan(
    companyId: string, 
    newPlanTier: PlanTier, 
    status: SubscriptionStatus = 'ACTIVE'
  ): Promise<void> {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    await db.transaction(async (tx) => {
      // 1. Update canonical subscription
      await tx.insert(platformSubscriptions).values({
        id: companyId,
        planId: newPlanTier,
        status,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        updatedAt: nowIso
      }).onConflictDoUpdate({
        target: platformSubscriptions.id,
        set: {
          planId: newPlanTier,
          status,
          currentPeriodEnd: periodEnd,
          updatedAt: nowIso
        }
      });

      // 2. Sync company snapshot
      await tx.update(companies)
        .set({ planTier: newPlanTier, updatedAt: nowIso })
        .where(eq(companies.id, companyId));

      // 3. Sync platform company snapshot
      await tx.update(platformCompanies)
        .set({ plan: newPlanTier, status })
        .where(eq(platformCompanies.id, companyId));
    });
  }
}
