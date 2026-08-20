import { collection, doc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

import { 
  CashRegister, 
  CashOperationType,
  UserProfile
} from '../types';

async function getHeaders() {
  const token = localStorage.getItem('varejopro_auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export async function getActiveCashRegister(userProfile: UserProfile): Promise<CashRegister | null> {
  const companyId = userProfile?.companyId;
  if (!companyId) return null;

  const branchId = userProfile.branchId || 'default_branch';
  const terminalId = userProfile.terminalId || 'default_terminal';

  try {
    const q = query(
      collection(db, 'cash_registers'),
      where('companyId', '==', companyId),
      where('branchId', '==', branchId),
      where('terminalId', '==', terminalId),
      where('status', '==', 'OPEN'),
      orderBy('openedAt', 'desc'),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as CashRegister;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function openCashRegister(
  userProfile: UserProfile, 
  initialBalance: number,
  notes?: string
): Promise<CashRegister> {
  const branchId = userProfile?.branchId || 'default_branch';
  const terminalId = userProfile?.terminalId || 'default_terminal';

  const response = await fetch('/api/cash-register/open', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ initialBalance, notes, branchId, terminalId })
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Erro ao abrir caixa.");
  }
  const data = await response.json();
  return data.register;
}

export async function addCashOperation(
  registerId: string,
  type: CashOperationType,
  amount: number,
  reason: string,
  _user: UserProfile
): Promise<void> {
  const response = await fetch('/api/cash-register/operation', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ registerId, type, amount, reason })
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Erro na operação de caixa.");
  }
}

export async function closeCashRegister(
  registerId: string,
  _user: UserProfile,
  declaredCash: number,
  declaredCredit: number,
  declaredDebit: number,
  declaredPix: number,
  notes?: string
): Promise<CashRegister> {
  const response = await fetch('/api/cash-register/close', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ registerId, declaredCash, declaredCredit, declaredDebit, declaredPix, notes })
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Falha ao fechar caixa.");
  }
  const data = await response.json();
  return data.register;
}

