import { db } from '../../src/db';
import { platformAuditLogs } from '../../src/db/schema.ts';
import { randomUUID } from 'crypto';

export interface AuditLogPayload {
  companyId: string;
  userId: string;
  userName?: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: any;
}

export async function logAuditEvent(
  payloadOrCompanyId: AuditLogPayload | string,
  userIdOrTransaction?: any,
  action?: string,
  details?: any,
  _req?: any
): Promise<void> {
  try {
    let payload: AuditLogPayload;
    if (typeof payloadOrCompanyId === 'string') {
      payload = {
        companyId: payloadOrCompanyId,
        userId: String(userIdOrTransaction || 'system'),
        action: String(action || 'ACTION'),
        entity: 'SYSTEM',
        entityId: 'none',
        details: details || {}
      };
    } else {
      payload = payloadOrCompanyId;
    }

    console.log(`[AUDIT] [${payload.companyId}] [${payload.userId}] ${payload.action}:`, payload.details || '');

    // Persist real audit logs into the database!
    const detailsStr = typeof payload.details === 'object' 
      ? JSON.stringify(payload.details) 
      : String(payload.details || '');

    await db.insert(platformAuditLogs).values({
      id: randomUUID(),
      companyId: payload.companyId,
      userId: payload.userId,
      action: payload.action,
      details: detailsStr,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Failed to write audit log to database:", err);
  }
}
