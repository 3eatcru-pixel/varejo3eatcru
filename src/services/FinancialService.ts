
import { FinancialRecord, UserProfile } from '../types';

async function getHeaders() {
  const token = localStorage.getItem('varejopro_auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export async function createFinancialRecord(recordData: Partial<FinancialRecord>, _user: UserProfile): Promise<string> {
  const response = await fetch('/api/finance/create', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ recordData })
  });
  if (!response.ok) throw new Error("Erro ao criar lançamento financeiro.");
  const data = await response.json();
  return data.id;
}

export async function updateFinancialRecord(recordId: string, recordData: Partial<FinancialRecord>, _user: UserProfile): Promise<void> {
  const response = await fetch(`/api/finance/update/${recordId}`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ recordData })
  });
  if (!response.ok) throw new Error("Erro ao atualizar lançamento financeiro.");
}

export async function deleteFinancialRecord(recordId: string, _user: UserProfile): Promise<void> {
  const response = await fetch(`/api/finance/delete/${recordId}`, {
    method: 'POST',
    headers: await getHeaders()
  });
  if (!response.ok) throw new Error("Erro ao excluir lançamento financeiro.");
}

export async function processPaymentReceipt(record: FinancialRecord, _user: UserProfile): Promise<void> {
  const response = await fetch(`/api/finance/process-payment/${record.id}`, {
    method: 'POST',
    headers: await getHeaders()
  });
  if (!response.ok) throw new Error("Erro ao processar baixa financeira.");
}
