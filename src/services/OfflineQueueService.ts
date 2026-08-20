import { SyncEngine, OfflineSaleItem } from './offline/SyncEngine';
import { IndexedDBStore } from './offline/IndexedDBStore';
import { CheckoutPayload } from './SaleService';
import { Product } from '../types';

export type PendingOfflineSale = OfflineSaleItem;

export class OfflineQueueService {
  // --- Product Caching for Offline PDV ---
  static async cacheProducts(products: Product[], companyId: string, branchId?: string): Promise<void> {
    try {
      const safeComp = companyId || 'empresa_principal';
      for (const prod of products) {
        await IndexedDBStore.put('products_cache', {
          ...prod,
          companyId: safeComp,
          branchId: branchId || 'matriz'
        });
      }
      if (typeof localStorage !== 'undefined') {
        const key = `varejopro_offline_products_${safeComp}_${branchId || 'matriz'}`;
        localStorage.setItem(key, JSON.stringify({
          companyId: safeComp,
          branchId,
          updatedAt: new Date().toISOString(),
          products
        }));
      }
    } catch (e) {
      console.warn("Falha ao salvar cache de produtos:", e);
    }
  }

  static getCachedProducts(companyId: string, branchId?: string): Product[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const safeComp = companyId || 'empresa_principal';
      const key = `varejopro_offline_products_${safeComp}_${branchId || 'matriz'}`;
      const data = localStorage.getItem(key);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return parsed.products || [];
    } catch (e) {
      console.warn("Falha ao ler cache síncrono de produtos:", e);
      return [];
    }
  }

  static async getCachedProductsAsync(companyId: string): Promise<Product[]> {
    return IndexedDBStore.getAllByCompany<Product>('products_cache', companyId);
  }

  // --- Offline Sales Queue Interface ---
  static getPendingQueue(companyId: string, branchId?: string, terminalId?: string): PendingOfflineSale[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const safeComp = companyId || 'empresa_principal';
      const key = `varejopro_offline_queue_${safeComp}`;
      const data = localStorage.getItem(key);
      if (!data) return [];
      const list: PendingOfflineSale[] = JSON.parse(data);
      return list.filter(item => {
        if (branchId && item.branchId && item.branchId !== branchId) return false;
        if (terminalId && item.terminalId && item.terminalId !== terminalId) return false;
        return true;
      });
    } catch (e) {
      return [];
    }
  }

  static async getPendingQueueAsync(companyId: string): Promise<PendingOfflineSale[]> {
    const queue = await SyncEngine.getQueue(companyId);
    if (typeof localStorage !== 'undefined') {
      const key = `varejopro_offline_queue_${companyId}`;
      localStorage.setItem(key, JSON.stringify(queue));
    }
    return queue;
  }

  static async queueOfflineSale(
    payload: CheckoutPayload,
    companyId: string,
    branchId?: string,
    terminalId?: string,
    cashRegisterId?: string
  ): Promise<PendingOfflineSale> {
    const item = await SyncEngine.enqueueSale(payload, companyId, branchId, terminalId, cashRegisterId);

    if (typeof localStorage !== 'undefined') {
      const currentQueue = this.getPendingQueue(companyId);
      const existingIdx = currentQueue.findIndex(i => i.id === item.id);
      if (existingIdx >= 0) currentQueue[existingIdx] = item;
      else currentQueue.push(item);
      localStorage.setItem(`varejopro_offline_queue_${companyId}`, JSON.stringify(currentQueue));
    }

    return item;
  }

  static async enqueueSale(
    payload: CheckoutPayload,
    companyId?: string,
    branchId?: string,
    terminalId?: string,
    cashRegisterId?: string
  ): Promise<PendingOfflineSale> {
    const targetComp = companyId || payload.user?.companyId || 'empresa_principal';
    return this.queueOfflineSale(payload, targetComp, branchId, terminalId, cashRegisterId);
  }

  static async removeOfflineSale(id: string, companyId: string): Promise<void> {
    await SyncEngine.discardOfflineSale(id, companyId);
    if (typeof localStorage !== 'undefined') {
      const updated = this.getPendingQueue(companyId).filter(i => i.id !== id);
      localStorage.setItem(`varejopro_offline_queue_${companyId}`, JSON.stringify(updated));
    }
  }

  static async clearSales(companyId: string): Promise<void> {
    if (!companyId) return;
    await SyncEngine.clearAllSales(companyId);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`varejopro_offline_queue_${companyId}`);
    }
  }

  static async syncOfflineQueue(
    companyId: string,
    _branchId?: string,
    _terminalId?: string,
    onProgress?: (syncedCount: number, total: number) => void
  ): Promise<{ successCount: number; failureCount: number; errors: string[] }> {
    const result = await SyncEngine.processSync(companyId, onProgress);
    const queue = await SyncEngine.getQueue(companyId);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`varejopro_offline_queue_${companyId}`, JSON.stringify(queue));
    }
    return {
      successCount: result.successCount,
      failureCount: result.failureCount,
      errors: result.errors
    };
  }
}
