import { Request, Response, NextFunction } from 'express';
import { AuthenticatedUser } from './auth';

/**
 * Tenant Isolation Enforcer Middleware
 * Addresses Audit Point 2: Never trust `companyId` from frontend (body, query, params).
 * It automatically strips `companyId` from user input and forces the one from the verified JWT.
 */
export const enforceTenantIsolation = (req: Request, res: Response, next: NextFunction) => {
  const authData = (req as any).auth as AuthenticatedUser;

  if (!authData || !authData.companyId) {
    return res.status(403).json({ 
      error: 'TENANT_ISOLATION_ERROR', 
      message: 'Request lacks verified tenant context.' 
    });
  }

  // 1. Strip companyId if maliciously sent by frontend
  if (req.body && typeof req.body === 'object') {
    if ('companyId' in req.body && req.body.companyId !== authData.companyId) {
      console.warn(`[SECURITY] Tenant spoofing attempt detected. User ${authData.uid} tried to pass companyId ${req.body.companyId} instead of ${authData.companyId}`);
      // Overwrite with the secure one
      req.body.companyId = authData.companyId;
    } else {
      req.body.companyId = authData.companyId;
    }
  }

  if (req.query && typeof req.query === 'object') {
    if ('companyId' in req.query && req.query.companyId !== authData.companyId) {
      console.warn(`[SECURITY] Tenant spoofing attempt (Query) detected.`);
      req.query.companyId = authData.companyId;
    } else {
      req.query.companyId = authData.companyId;
    }
  }

  next();
};

/**
 * BOLA / IDOR Protection Helper
 * Addresses Audit Point 3: Searching by ID without companyId.
 * Usage in controllers: 
 * const sale = await db.query.sales.findFirst({ 
 *   where: and(eq(sales.id, req.params.id), eq(sales.companyId, getSecureTenantId(req))) 
 * });
 */
export const getSecureTenantId = (req: Request): string => {
  const authData = (req as any).auth as AuthenticatedUser;
  if (!authData?.companyId) {
    throw new Error("SECURE_TENANT_ID_NOT_FOUND");
  }
  return authData.companyId;
};
