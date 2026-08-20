
import { PurchaseItem, UserProfile } from '../types';

async function getHeaders() {
  const token = localStorage.getItem('varejopro_auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export interface PurchasePayload {
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  paymentMethod: string;
  notes: string;
  purchaseItems: PurchaseItem[];
  totalPurchaseCost: number;
  user: UserProfile;
}

export async function processPurchaseTransaction(payload: PurchasePayload): Promise<void> {
  const response = await fetch('/api/purchase/create', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ payload })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao processar compra.');
  }
}
