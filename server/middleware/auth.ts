import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../src/db';
import { users, memberships, companies, platformAdmins, platformSupportSessions } from '../../src/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { CompanyRole } from '../../src/types';
import { hasPermission, PermissionKey } from '../../src/lib/permissions';
import { LicenseService } from '../services/license.service';
import { PlanFeatures, PlanLimits } from '../../src/types/licensing';

import { JWT_SECRET } from '../config/env';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  name: string;
  role: CompanyRole;
  companyId: string;
  companyName?: string;
  branchId?: string;
  terminalId?: string;
  isPlatformAdmin?: boolean;
  isSupportSession?: boolean;
  supportSessionId?: string;
}

export const requireApiAuth = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1]?.trim() || null;
  } else if (req.query && req.query.token) {
    token = String(req.query.token);
  } else if (req.body && req.body.token) {
    token = String(req.body.token);
  } else if ((req as any).cookies && (req as any).cookies.varejopro_auth_token) {
    token = String((req as any).cookies.varejopro_auth_token);
  }

  if (!token) {
    return res.status(401).json({ 
      error: 'UNAUTHORIZED', 
      message: 'Token de autenticação ausente ou inválido.' 
    });
  }


  try {
    let verifiedUid: string | null = null;
    let verifiedEmail: string | null = null;
    let verifiedName: string | null = null;
    let tokenPayload: any = null;

    // 1. Verify JWT only
    try {
      tokenPayload = jwt.verify(token, JWT_SECRET);
      if (tokenPayload && tokenPayload.uid) {
        verifiedUid = tokenPayload.uid;
        verifiedEmail = tokenPayload.email || '';
        verifiedName = tokenPayload.name || '';
      }
    } catch (err: any) {
      console.warn('[AUTH] JWT validation failed:', err.message);
      return res.status(401).json({ 
        error: 'UNAUTHORIZED', 
        message: 'Token de autenticação expirado ou inválido.' 
      });
    }

    if (!verifiedUid) {
      return res.status(401).json({ 
        error: 'UNAUTHORIZED', 
        message: 'Falha na identificação do usuário autenticado.' 
      });
    }

    // 2. Check for HQ Support Session Token
    if (tokenPayload?.isSupportSession && tokenPayload?.targetCompanyId && tokenPayload?.supportSessionId) {
      try {
        const [sessionDb] = await db.select()
          .from(platformSupportSessions)
          .where(eq(platformSupportSessions.id, tokenPayload.supportSessionId))
          .limit(1);

        if (!sessionDb) {
          return res.status(401).json({ 
            error: 'UNAUTHORIZED_SUPPORT', 
            message: 'Sessão de suporte não encontrada na base de dados.' 
          });
        }

        if (sessionDb.status !== 'ACTIVE') {
          return res.status(401).json({ 
            error: 'UNAUTHORIZED_SUPPORT', 
            message: `Sessão de suporte inativa ou revogada. Status: ${sessionDb.status}` 
          });
        }

        const now = new Date().toISOString();
        if (sessionDb.expiresAt < now) {
          // Auto-update expired session status
          await db.update(platformSupportSessions)
            .set({ status: 'EXPIRED' })
            .where(eq(platformSupportSessions.id, sessionDb.id));

          return res.status(401).json({ 
            error: 'UNAUTHORIZED_SUPPORT', 
            message: 'Sessão de suporte expirou.' 
          });
        }

        const authData: AuthenticatedUser = {
          uid: verifiedUid,
          email: verifiedEmail || 'support@varejopro.com',
          name: verifiedName || 'Agente de Suporte VarejoPro (HQ)',
          role: CompanyRole.ADMIN,
          companyId: tokenPayload.targetCompanyId,
          companyName: tokenPayload.companyName || 'Empresa em Suporte',
          isPlatformAdmin: true,
          isSupportSession: true,
          supportSessionId: tokenPayload.supportSessionId
        };

        (req as any).auth = authData;
        (req as any).user = { uid: verifiedUid, email: verifiedEmail, name: verifiedName };
        (req as any).userProfile = authData;
        return next();
      } catch (dbErr: any) {
        console.error('[AUTH] Support session check failed:', dbErr.message);
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao validar sessão de suporte.' });
      }
    }

    // 3. Resolve User and Company Membership from PostgreSQL database
    let userDb: any = null;
    let membershipDb: any = null;
    let companyDb: any = null;

    try {
      const userRes = await db.select().from(users).where(eq(users.id, verifiedUid)).limit(1);
      if (userRes.length === 0) {
        return res.status(401).json({ error: 'USER_NOT_FOUND', message: 'Usuário não encontrado no sistema.' });
      }
      
      userDb = userRes[0];

      // Audit Point 9: Session Versioning & Global Status
      if (userDb.status !== 'ACTIVE') {
        return res.status(403).json({ error: 'ACCOUNT_DISABLED', message: 'Sua conta global está desativada. Entre em contato com o suporte.' });
      }

      if (tokenPayload.version && userDb.tokenVersion && tokenPayload.version < userDb.tokenVersion) {
        return res.status(401).json({ error: 'SESSION_REVOKED', message: 'Sessão revogada devido a alteração de segurança ou troca de senha.' });
      }

      if (userDb) {
        const targetCompanyId = tokenPayload?.companyId;
        const membershipQuery = targetCompanyId 
          ? db.select().from(memberships).where(and(eq(memberships.userId, verifiedUid), eq(memberships.companyId, targetCompanyId))).limit(1)
          : db.select().from(memberships).where(eq(memberships.userId, verifiedUid)).limit(1);

        const memRes = await membershipQuery;
        if (memRes.length > 0) {
          membershipDb = memRes[0];
          const compRes = await db.select().from(companies).where(eq(companies.id, membershipDb.companyId)).limit(1);
          if (compRes.length > 0) {
            companyDb = compRes[0];
          }
        }
      }
    } catch (dbErr: any) {
      console.error('[AUTH] DB lookup failed:', dbErr.message);
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao consultar banco de dados.' });
    }

    // 4. Query platform_admins dynamically from PostgreSQL
    let isPlatformAdmin = false;
    try {
      const adminRes = await db.select().from(platformAdmins).where(eq(platformAdmins.id, verifiedUid)).limit(1);
      if (adminRes.length > 0) {
        isPlatformAdmin = true;
      }
    } catch (adminErr) {
      console.warn('[AUTH] platform_admins check fallback:', adminErr);
    }

    const activeCompanyId = membershipDb?.companyId || (isPlatformAdmin ? 'empresa_principal' : null);

    if (!activeCompanyId && !isPlatformAdmin) {
      return res.status(403).json({ 
        error: 'TENANT_NOT_FOUND', 
        message: 'Usuário autenticado sem empresa ou filial vinculada.' 
      });
    }

    const rawRole = (membershipDb?.role || (isPlatformAdmin ? 'ADMIN' : 'CASHIER')).toUpperCase();
    const resolvedRole: CompanyRole = rawRole === 'OWNER' ? CompanyRole.OWNER : rawRole === 'ADMIN' 
      ? CompanyRole.ADMIN 
      : rawRole === 'MANAGER' || rawRole === 'GERENTE' 
      ? CompanyRole.MANAGER 
      : CompanyRole.CASHIER;

    const authData: AuthenticatedUser = {
      uid: verifiedUid,
      email: verifiedEmail || userDb?.email || '',
      name: verifiedName || userDb?.name || '',
      role: resolvedRole,
      companyId: activeCompanyId,
      companyName: companyDb?.name,
      branchId: tokenPayload?.branchId,
      terminalId: tokenPayload?.terminalId,
      isPlatformAdmin: isPlatformAdmin
    };

    (req as any).auth = authData;
    (req as any).user = { uid: verifiedUid, email: authData.email, name: authData.name };
    (req as any).userProfile = authData;
    next();
  } catch (error) {
    console.error('[AUTH] Middleware error:', error);
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token de autenticação inválido.' });
  }
};


export const requirePermission = (permissionKey: PermissionKey) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userProfile = (req as any).userProfile || (req as any).auth;
    if (!userProfile) {
      return res.status(401).json({ error: 'Perfil de usuário não autenticado no request.' });
    }
    if (userProfile.role === CompanyRole.OWNER || userProfile.role === CompanyRole.ADMIN || (req as any).auth?.isPlatformAdmin || hasPermission(userProfile, permissionKey)) {
      return next();
    }
    return res.status(403).json({ 
      error: 'PERMISSION_DENIED',
      message: `Permissão '${permissionKey}' insuficiente para executar esta operação.` 
    });
  };
};

export type FeatureEntitlementKey = keyof PlanFeatures;

/**
 * Middleware: Real Enforcement of SaaS Plan Entitlements
 */
export const requireLicenseEntitlement = (featureKey: FeatureEntitlementKey) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userProfile = (req as any).userProfile || (req as any).auth;
      const companyId = userProfile?.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Contexto de empresa não encontrado no request.' });
      }

      // Platform admins bypass feature entitlement restrictions
      if ((req as any).auth?.isPlatformAdmin) {
        return next();
      }

      const check = await LicenseService.checkFeatureEntitlement(companyId, featureKey);

      if (!check.allowed) {
        return res.status(402).json({
          error: 'PLAN_UPGRADE_REQUIRED',
          code: 'FEATURE_NOT_IN_PLAN',
          feature: featureKey,
          planTier: check.planTier,
          status: check.status,
          message: check.reason || `O recurso '${featureKey}' não está disponível no plano ${check.planTier}.`,
          upgradeRequired: true
        });
      }

      next();
    } catch (err: any) {
      console.error('[ENTITLEMENT] Error verifying feature entitlement:', err);
      return res.status(500).json({ error: 'Erro ao validar licença de funcionalidade.' });
    }
  };
};

/**
 * Middleware: Real Enforcement of Resource Quotas (Users, Terminals, Products, Branches)
 */
export const requireResourceQuota = (resourceKey: keyof PlanLimits, increment: number = 1) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userProfile = (req as any).userProfile || (req as any).auth;
      const companyId = userProfile?.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Contexto de empresa não encontrado no request.' });
      }

      if ((req as any).auth?.isPlatformAdmin) {
        return next();
      }

      const check = await LicenseService.checkResourceQuota(companyId, resourceKey, increment);

      if (!check.allowed) {
        return res.status(402).json({
          error: 'PLAN_LIMIT_REACHED',
          code: 'RESOURCE_QUOTA_EXCEEDED',
          feature: resourceKey,
          current: check.current,
          limit: check.limit,
          planTier: check.planTier,
          message: check.reason || `Limite de ${resourceKey} atingido (${check.current}/${check.limit}) no plano ${check.planTier}.`,
          upgradeRequired: true
        });
      }

      next();
    } catch (err: any) {
      console.error('[ENTITLEMENT] Error verifying resource quota:', err);
      return res.status(500).json({ error: 'Erro ao validar cotas de recursos.' });
    }
  };
};
