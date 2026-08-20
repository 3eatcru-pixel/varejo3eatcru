

export interface AuditLogEntry {
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: string;
  module: string;
  details: string;
  companyId: string;
  entityId?: string;
}

export async function logAuditEvent(entry: AuditLogEntry) {
  try {
    const token = localStorage.getItem('varejopro_auth_token');
    if (!token || !entry.companyId) {
      console.warn("Audit log skipped: Unauthenticated or missing companyId.");
      return;
    }

    await fetch('/api/audit/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(entry)
    });
  } catch (error) {
    console.error('Erro ao registrar log de auditoria via servidor:', error);
  }
}
