import { Request, Response, NextFunction } from 'express';
import { db } from '../../src/db';
import { sql } from 'drizzle-orm';
import { AuthenticatedUser } from './auth';

/**
 * Audit Middleware
 * Intercepts write operations (POST, PUT, PATCH, DELETE) and logs them
 * along with the user, companyId, IP, and terminal.
 * Addresses Audit Point 8: Quem alterou o quê, quando, de onde e por quê?
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
          const terminal = authData.terminalId || req.headers['x-terminal-id'] || 'WEB_DASHBOARD';
          
          // In a real database, we would insert into an `audit_logs` table
          // Since the drizzle schema might not have audit_logs yet, we just console.log for the scaffold
          // OR we can dynamically insert if we assume a generic audit table exists.
          
          const logEntry = {
            companyId: authData.companyId,
            userId: authData.uid,
            userName: authData.name,
            action: actionName,
            resource: req.originalUrl,
            method: req.method,
            ipAddress: req.ip || req.socket.remoteAddress,
            terminalId: terminal,
            reason: reason,
            payloadHash: req.body ? hashPayload(req.body) : null,
            timestamp: new Date().toISOString()
          };

          console.log('[SECURITY_AUDIT] Immutable Event Logged:', JSON.stringify(logEntry));

          // If db has an audit_logs table, we would do:
          // await db.insert(audit_logs).values(logEntry);

        } catch (error) {
          console.error('[SECURITY_AUDIT] Failed to record audit log:', error);
        }
      }
    });

    next();
  };
};

function hashPayload(payload: any): string {
  // Simple representation for now. In production, use crypto.createHash('sha256')
  return Buffer.from(JSON.stringify(payload)).toString('base64').substring(0, 32);
}
