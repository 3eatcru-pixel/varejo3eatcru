import { IndexedDBStore, TabMutexLock } from '@varejopro/offline';
import { CartItem, PaymentMethod, SplitPayment, UserProfile, CashRegister } from '@varejopro/types';

export type SyncStatus = 'PENDING' | 'PROCESSING' | 'SYNCED' | 'RETRY' | 'CONFLICT' | 'REQUIRES_REVIEW' | 'REJECTED';

export type SyncErrorType = 
  | 'NETWORK'
  | 'AUTH'
  | 'RATE_LIMIT'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'SERVER'
  | 'FISCAL'
  | 'UNKNOWN';

export interface StructuredSyncError {
  type: SyncErrorType;
  message: string;
  statusCode?: number;
  isTransient: boolean;
  retryAfterMs?: number;
}

export interface SyncCheckoutPayload {
  cart: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  splitPayments?: SplitPayment[];
  cashReceived?: number;
  changeGiven?: number;
  customerName?: string;
  customerCpf?: string;
  customerId?: string;
  user: UserProfile;
  activeRegister?: CashRegister;
  branchId?: string;
  terminalId?: string;
  idempotencyKey?: string;
  notes?: string;
  [key: string]: any;
}

export interface OfflineSaleItem {
  id: string;
  companyId: string;
  branchId?: string;
  terminalId?: string;
  cashRegisterId?: string;
  payload: SyncCheckoutPayload;
  queuedAt: string;
  attempts: number;
  status: SyncStatus;
  lastError?: string;
  errorType?: SyncErrorType;
  conflictReason?: string;
  nextRetryAt?: string;
}

export interface SyncEngineEvent {
  type: 'QUEUE_UPDATED' | 'SYNC_STARTED' | 'SYNC_PROGRESS' | 'SYNC_COMPLETED' | 'ITEM_CONFLICT' | 'ITEM_SYNCED' | 'LOCK_BLOCKED';
  companyId: string;
  data?: any;
  timestamp: string;
}

type SyncEventListener = (event: SyncEngineEvent) => void;
type SaleProcessorFn = (payload: SyncCheckoutPayload) => Promise<any>;

export class SyncEngine {
  private static listeners: Set<SyncEventListener> = new Set();
  private static saleProcessor: SaleProcessorFn | null = null;

  static setSaleProcessor(fn: SaleProcessorFn) {
    this.saleProcessor = fn;
  }

  static addListener(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static emit(event: Omit<SyncEngineEvent, 'timestamp'>) {
    const fullEvent: SyncEngineEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };
    this.listeners.forEach(cb => {
      try { cb(fullEvent); } catch (e) { console.error("Error in sync listener", e); }
    });
  }

  static classifyError(error: any, responseStatus?: number): StructuredSyncError {
    const msg = (error?.message || String(error || '')).toLowerCase();
    const status = responseStatus || error?.status || error?.statusCode;

    if (status === 401 || status === 403 || msg.includes('unauthorized') || msg.includes('token') || msg.includes('auth')) {
      return { type: 'AUTH', message: error.message || 'Erro de autenticação ou permissão.', statusCode: status, isTransient: false };
    }
    if (status === 409 || status === 412 || msg.includes('estoque') || msg.includes('insuficiente') || msg.includes('concurrency') || msg.includes('conflict')) {
      return { type: 'CONFLICT', message: error.message || 'Conflito de concorrência ou estoque.', statusCode: status, isTransient: false };
    }
    if (status === 429 || msg.includes('rate') || msg.includes('too many requests')) {
      return { type: 'RATE_LIMIT', message: 'Limite de requisições atingido.', statusCode: 429, isTransient: true, retryAfterMs: 5000 };
    }
    if (msg.includes('fiscal') || msg.includes('nfe') || msg.includes('nfce') || msg.includes('contingência') || msg.includes('sefaz')) {
      return { type: 'FISCAL', message: error.message || 'Pendência ou contingência fiscal.', statusCode: status, isTransient: false };
    }
    if (status === 400 || msg.includes('inválido') || msg.includes('obrigatorio') || msg.includes('validation')) {
      return { type: 'VALIDATION', message: error.message || 'Dados da venda inválidos.', statusCode: status, isTransient: false };
    }
    if (msg.includes('network') || msg.includes('offline') || msg.includes('failed to fetch') || msg.includes('timeout') || msg.includes('conexão')) {
      return { type: 'NETWORK', message: 'Falha de conexão com o servidor.', statusCode: status, isTransient: true, retryAfterMs: 3000 };
    }
    if (status && status >= 500) {
      return { type: 'SERVER', message: error.message || 'Erro interno no servidor.', statusCode: status, isTransient: true, retryAfterMs: 4000 };
    }

    return { type: 'UNKNOWN', message: error.message || 'Erro desconhecido na sincronização.', statusCode: status, isTransient: true };
  }

  static getBackoffDelayMs(attempts: number): number {
    const base = 1000;
    const factor = Math.min(Math.pow(2, attempts - 1), 16);
    const jitter = Math.floor(Math.random() * 500);
    return (base * factor) + jitter;
  }

  static async getQueue(companyId: string): Promise<OfflineSaleItem[]> {
    const items = await IndexedDBStore.getAllByCompany<OfflineSaleItem>('pending_sales', companyId);
    return items.sort((a, b) => new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime());
  }

  static async getPendingCount(companyId: string): Promise<number> {
    const queue = await this.getQueue(companyId);
    return queue.filter(item => item.status === 'PENDING' || item.status === 'RETRY' || item.status === 'PROCESSING').length;
  }

  static async getConflictCount(companyId: string): Promise<number> {
    const queue = await this.getQueue(companyId);
    return queue.filter(item => item.status === 'CONFLICT' || item.status === 'REQUIRES_REVIEW').length;
  }

  static async enqueueSale(
    payload: SyncCheckoutPayload,
    companyId: string,
    branchId?: string,
    terminalId?: string,
    cashRegisterId?: string
  ): Promise<OfflineSaleItem> {
    const saleId = `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const idempotencyKey = payload.idempotencyKey || `idemp_${companyId}_${terminalId || 'pdv'}_${saleId}`;

    const item: OfflineSaleItem = {
      id: saleId,
      companyId,
      branchId,
      terminalId,
      cashRegisterId: cashRegisterId || payload.activeRegister?.id,
      payload: {
        ...payload,
        idempotencyKey
      },
      queuedAt: new Date().toISOString(),
      attempts: 0,
      status: 'PENDING'
    };

    await IndexedDBStore.put('pending_sales', item);
    await this.updateLocalStockOptimistic(payload, companyId);

    this.emit({
      type: 'QUEUE_UPDATED',
      companyId,
      data: { action: 'ENQUEUED', item }
    });

    return item;
  }

  private static async updateLocalStockOptimistic(payload: SyncCheckoutPayload, companyId: string) {
    try {
      const products = await IndexedDBStore.getAllByCompany<any>('products_cache', companyId);
      if (!products.length) return;

      for (const cartItem of payload.cart) {
        const prod = products.find(p => p.id === cartItem.product.id);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - cartItem.quantity);
          await IndexedDBStore.put('products_cache', { ...prod, companyId });
        }
      }
    } catch (e) {
      console.warn("Optimistic stock deduction warning:", e);
    }
  }

  static async processSync(
    companyId: string,
    onProgress?: (synced: number, total: number) => void
  ): Promise<{ successCount: number; failureCount: number; conflicts: number; errors: string[] }> {
    const lockKey = `sync_${companyId}`;
    
    const lockAcquisition = await TabMutexLock.acquire(lockKey, 30000);
    if (!lockAcquisition.acquired) {
      console.warn(`[SyncEngine] Sincronização bloqueada: ${lockAcquisition.reason}`);
      this.emit({ type: 'LOCK_BLOCKED', companyId, data: { reason: lockAcquisition.reason } });
      return { 
        successCount: 0, 
        failureCount: 0, 
        conflicts: 0, 
        errors: [`Sincronização já em execução em outra aba ativa: ${lockAcquisition.reason}`] 
      };
    }

    this.emit({ type: 'SYNC_STARTED', companyId });

    let successCount = 0;
    let failureCount = 0;
    let conflicts = 0;
    const errors: string[] = [];

    try {
      const queue = await this.getQueue(companyId);
      const now = Date.now();

      const actionable = queue.filter(item => {
        if (item.status === 'PENDING' || item.status === 'PROCESSING') return true;
        if (item.status === 'RETRY') {
          if (!item.nextRetryAt) return true;
          return now >= new Date(item.nextRetryAt).getTime();
        }
        return false;
      });

      if (actionable.length === 0) {
        this.emit({ type: 'SYNC_COMPLETED', companyId, data: { successCount: 0, total: 0 } });
        return { successCount: 0, failureCount: 0, conflicts: 0, errors: [] };
      }

      for (let i = 0; i < actionable.length; i++) {
        const item = actionable[i];
        item.status = 'PROCESSING';
        item.attempts += 1;
        await IndexedDBStore.put('pending_sales', item);

        try {
          if (this.saleProcessor) {
            await this.saleProcessor(item.payload);
          } else {
            // Default POST /api/sales fallback
            const token = typeof localStorage !== 'undefined' ? localStorage.getItem('varejopro_auth_token') : null;
            const res = await fetch('/api/sales', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify(item.payload)
            });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              throw new Error(body.error || `HTTP ${res.status}`);
            }
          }

          item.status = 'SYNCED';
          await IndexedDBStore.delete('pending_sales', item.id);
          successCount++;

          this.emit({
            type: 'ITEM_SYNCED',
            companyId,
            data: { id: item.id }
          });

          if (onProgress) onProgress(successCount, actionable.length);
        } catch (err: any) {
          failureCount++;
          const classified = this.classifyError(err);
          item.lastError = classified.message;
          item.errorType = classified.type;
          errors.push(`Venda ${item.id} [${classified.type}]: ${classified.message}`);

          if (classified.type === 'CONFLICT') {
            item.status = 'CONFLICT';
            item.conflictReason = `Estoque insuficiente ou alteração concorrente: ${classified.message}`;
            conflicts++;
            this.emit({ type: 'ITEM_CONFLICT', companyId, data: { item, reason: item.conflictReason } });
          } else if (classified.type === 'FISCAL') {
            item.status = 'REQUIRES_REVIEW';
            item.conflictReason = `Documento fiscal necessita de contingência ou revisão de tributação.`;
            conflicts++;
          } else if (classified.type === 'AUTH') {
            item.status = 'RETRY';
            item.conflictReason = 'Aguardando renovação de credenciais do operador.';
          } else if (item.attempts >= 5) {
            item.status = 'REQUIRES_REVIEW';
            item.conflictReason = `Excedido limite de tentativas (${item.attempts}). ${classified.message}`;
            conflicts++;
          } else {
            item.status = 'RETRY';
            const backoffMs = this.getBackoffDelayMs(item.attempts);
            item.nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
          }

          await IndexedDBStore.put('pending_sales', item);
        }
      }
    } finally {
      await TabMutexLock.release(lockKey, lockAcquisition.ownerId);
      this.emit({
        type: 'SYNC_COMPLETED',
        companyId,
        data: { successCount, failureCount, conflicts, errors }
      });
    }

    return { successCount, failureCount, conflicts, errors };
  }

  static async resolveConflictForceSync(saleId: string, companyId: string): Promise<boolean> {
    const item = await IndexedDBStore.get<OfflineSaleItem>('pending_sales', saleId);
    if (!item || item.companyId !== companyId) return false;

    item.status = 'PENDING';
    item.attempts = 0;
    item.conflictReason = undefined;
    item.nextRetryAt = undefined;
    await IndexedDBStore.put('pending_sales', item);

    this.emit({ type: 'QUEUE_UPDATED', companyId, data: { action: 'FORCE_RETRY', saleId } });
    return true;
  }

  static async discardOfflineSale(saleId: string, companyId: string): Promise<boolean> {
    const item = await IndexedDBStore.get<OfflineSaleItem>('pending_sales', saleId);
    if (!item || item.companyId !== companyId) return false;

    await IndexedDBStore.delete('pending_sales', saleId);
    this.emit({ type: 'QUEUE_UPDATED', companyId, data: { action: 'DISCARDED', saleId } });
    return true;
  }

  static async clearAllSales(companyId: string): Promise<void> {
    await IndexedDBStore.clearByCompany('pending_sales', companyId);
    this.emit({ type: 'QUEUE_UPDATED', companyId, data: { action: 'CLEARED' } });
  }

  static async processQueue(companyId: string): Promise<{ successCount: number; failureCount: number; conflicts: number; errors: string[] }> {
    return this.processSync(companyId);
  }
}
