import { Request, Response, NextFunction } from 'express';
import { db } from '../../src/db';
import { platformAuditLogs } from '../../src/db/schema.ts';
import { AuthenticatedUser } from './auth';
import { randomUUID } from 'crypto';

/**
 * Audit Middleware
 * Intercepts write operations (POST, PUT, PATCH, DELETE) and logs them
 * along with the user, companyId, IP, and terminal into PostgreSQL.
 * Addresses Audit Point 8 & 26: Quem alterou o quê, quando, de onde e por quê?
 */
export const auditLog = (actionName: string, getReason?: (req: Request) => string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // We only want to log on successful completion, so we hook into res.on('finish')
    res.on('finish', async () => {
      // Only log successful mutating requests
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const authData = (req as any).auth as AuthenticatedUser;
          if (!authData || !authData.companyId) return; // Skip if no auth context

          const reason = getReason ? getReason(req) : (req.body?.reason || req.query?.reason || 'Standard operation');
          const terminal = authData.terminalId || (req.headers['x-terminal-id'] as string) || 'WEB_DASHBOARD';
          
          const detailsObj = {
            resource: req.originalUrl,
            method: req.method,
            ipAddress: req.ip || req.socket.remoteAddress,
            terminalId: terminal,
            reason: reason,
            payloadHash: req.body ? hashPayload(req.body) : null,
          };

          await db.insert(platformAuditLogs).values({
            id: randomUUID(),
            companyId: authData.companyId,
            userId: authData.uid,
            action: actionName,
            details: JSON.stringify(detailsObj),
            timestamp: new Date().toISOString()
          });

          console.log(`[SECURITY_AUDIT] Event '${actionName}' persisted for company ${authData.companyId}`);
        } catch (error) {
          console.error('[SECURITY_AUDIT] Failed to record audit log:', error);
        }
      }
    });

    next();
  };
};

function hashPayload(payload: any): string {
  try {
    return Buffer.from(JSON.stringify(payload)).toString('base64').substring(0, 32);
  } catch {
    return 'unparseable';
  }
}

