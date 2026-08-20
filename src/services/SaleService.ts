
import { Sale, UserProfile } from '../types';

async function getHeaders() {
  const token = localStorage.getItem('varejopro_auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export interface CartItem {
  product: { id: string, name: string, price: number };
  quantity: number;
}

export interface CheckoutPayload {
  cart: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  splitPayments?: any[];
  idempotencyKey?: string;
  cashReceived?: number;
  changeGiven?: number; // Added this
  customerName?: string;
  customerCpf?: string;
  selectedClientId?: string;
  activeRegister: { id: string };
  branchId?: string;
  terminalId?: string;
  user: UserProfile;
}

export async function processSaleTransaction(payload: CheckoutPayload): Promise<Sale> {
  const response = await fetch('/api/sale/create', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao processar venda.');
  }
  
  const data = await response.json();
  return data.sale;
}

export async function cancelSaleTransaction(
  sale: Sale,
  reason: string,
  _user: UserProfile
): Promise<void> {
  const response = await fetch('/api/sale/cancel', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ saleId: sale.id, reason })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao cancelar venda.');
  }
}

export async function processRefundTransaction(
  saleId: string,
  returnQuantities: Record<string, number>,
  reason: string,
  refundMethod: 'CREDIT' | 'CASH' | 'PIX',
  _user: UserProfile,
  idempotencyKey: string
): Promise<void> {
  const response = await fetch('/api/sale/refund', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ saleId, returnQuantities, reason, refundMethod, idempotencyKey })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao estornar.');
  }
}
