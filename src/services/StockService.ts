import { Product, UserProfile } from '../types';

async function getHeaders() {
  const token = localStorage.getItem('varejopro_auth_token') || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export async function adjustStock(
  product: Product,
  adjustmentType: 'SET' | 'ADD' | 'REMOVE',
  qtyVal: number,
  reason: string,
  _user?: UserProfile
): Promise<number> {
  const response = await fetch('/api/stock/adjust', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({
      productId: product.id,
      product,
      adjustmentType,
      qtyVal,
      reason
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao ajustar estoque.');
  }
  
  const data = await response.json();
  return data.resultingStock;
}

export async function transferStock(
  product: Product,
  fromLocation: string,
  toLocation: string,
  qty: number,
  notes: string,
  _user?: UserProfile
): Promise<void> {
  const response = await fetch('/api/stock/transfer', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({
      productId: product.id,
      product,
      fromLocation,
      toLocation,
      qty,
      notes
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao transferir estoque.');
  }
}
