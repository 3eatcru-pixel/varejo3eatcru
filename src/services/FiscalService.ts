import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, FiscalConfig } from '../types';
import { logAuditEvent } from '../lib/auditLogger';

export async function updateFiscalSettings(
  config: FiscalConfig,
  user: UserProfile
): Promise<void> {
  const companyId = user.companyId;
  if (!companyId) {
    throw new Error('ID da empresa ausente. Configuração fiscal negada.');
  }

  const nowIso = new Date().toISOString();

  const payload = {
    ...config,
    companyId,
    updatedAt: nowIso,
    updatedByUid: user.uid
  };

  // Strictly save to company-isolated settings document
  await setDoc(doc(db, 'settings', `fiscal_${companyId}`), payload, { merge: true });

  await logAuditEvent({
    userId: user.uid,
    userName: user.name,
    action: 'ALTERACAO_CONFIG_FISCAL',
    module: 'ADMINISTRATIVO',
    companyId,
    details: `Parâmetros fiscais e CSC NFC-e atualizados para "${config.companyName}" (${config.cnpj}).`
  });
}
