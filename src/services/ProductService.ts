import { Product, UserProfile } from '../types';

async function getHeaders() {
  const token = localStorage.getItem('varejopro_auth_token') || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export async function fetchProducts(page = 1, limit = 100): Promise<{ products: Product[]; total: number; totalPages: number }> {
  const res = await fetch(`/api/stock/products?page=${page}&limit=${limit}`, {
    headers: await getHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao carregar produtos.');
  }
  const data = await res.json();
  return {
    products: data.products || [],
    total: data.pagination?.total || 0,
    totalPages: data.pagination?.totalPages || 1
  };
}

export async function createProduct(productData: Partial<Product>, _user?: UserProfile): Promise<string> {
  const res = await fetch('/api/stock/products', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(productData)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao criar produto.');
  }

  const data = await res.json();
  return data.productId || productData.id || '';
}

export async function updateProduct(productId: string, productData: Partial<Product>, _user?: UserProfile): Promise<void> {
  const res = await fetch('/api/stock/products', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ ...productData, id: productId })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao atualizar produto.');
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  const res = await fetch(`/api/stock/products/${productId}`, {
    method: 'DELETE',
    headers: await getHeaders()
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao remover produto.');
  }
}

export async function checkBarcodeExists(barcode: string, _companyId?: string, excludeProductId?: string): Promise<boolean> {
  if (!barcode || !barcode.trim()) return false;
  try {
    const { products } = await fetchProducts(1, 100);
    const existing = products.filter(p => p.barcode === barcode.trim());
    if (excludeProductId) {
      return existing.some(p => p.id !== excludeProductId);
    }
    return existing.length > 0;
  } catch {
    return false;
  }
}
