/**
 * VarejoPro IndexedDB Enterprise Store
 * Fully asynchronous, tenant-isolated, transaction-safe storage engine.
 */

const DB_NAME = 'VarejoPro_OfflineStore_v3';
const DB_VERSION = 3;

export interface StoredRecord {
  id: string;
  companyId?: string;
  [key: string]: any;
}

export class IndexedDBStore {
  private static dbPromise: Promise<IDBDatabase> | null = null;
  private static memoryStores: Record<string, Record<string, any>> = {};

  static async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error("IndexedDB não é suportado neste ambiente"));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 1. Pending Sales Queue Store
        if (!db.objectStoreNames.contains('pending_sales')) {
          const salesStore = db.createObjectStore('pending_sales', { keyPath: 'id' });
          salesStore.createIndex('by_company', 'companyId', { unique: false });
          salesStore.createIndex('by_status', 'status', { unique: false });
          salesStore.createIndex('by_queuedAt', 'queuedAt', { unique: false });
        }

        // 2. Offline Products Cache Store
        if (!db.objectStoreNames.contains('products_cache')) {
          const prodStore = db.createObjectStore('products_cache', { keyPath: 'id' });
          prodStore.createIndex('by_company', 'companyId', { unique: false });
          prodStore.createIndex('by_code', 'code', { unique: false });
        }

        // 3. Workspace / Google Docs Sync Queue Store
        if (!db.objectStoreNames.contains('workspace_sync_queue')) {
          const wsStore = db.createObjectStore('workspace_sync_queue', { keyPath: 'id' });
          wsStore.createIndex('by_company', 'companyId', { unique: false });
          wsStore.createIndex('by_status', 'status', { unique: false });
        }

        // 4. Audit & Diagnostics Events Store
        if (!db.objectStoreNames.contains('diagnostics_events')) {
          const diagStore = db.createObjectStore('diagnostics_events', { keyPath: 'id' });
          diagStore.createIndex('by_timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  static async put<T extends StoredRecord>(storeName: string, item: T): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      this.fallbackPut(storeName, item);
    }
  }

  static async get<T extends StoredRecord>(storeName: string, id: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      return new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return (this.fallbackGet(storeName, id) as T | null);
    }
  }

  static async getAllByCompany<T extends StoredRecord>(storeName: string, companyId: string): Promise<T[]> {
    try {
      const db = await this.getDB();
      return new Promise<T[]>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        
        if (store.indexNames.contains('by_company')) {
          const index = store.index('by_company');
          const req = index.getAll(companyId);
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        } else {
          const req = store.getAll();
          req.onsuccess = () => {
            const all = req.result || [];
            resolve(all.filter((item: any) => item.companyId === companyId));
          };
          req.onerror = () => reject(req.error);
        }
      });
    } catch {
      return (this.fallbackGetAll(storeName, companyId) as T[]);
    }
  }

  static async delete(storeName: string, id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      this.fallbackDelete(storeName, id);
    }
  }

  static async clearByCompany(storeName: string, companyId: string): Promise<void> {
    try {
      const items = await this.getAllByCompany(storeName, companyId);
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        for (const item of items) {
          store.delete(item.id);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      this.fallbackClearCompany(storeName, companyId);
    }
  }

  // Fallback memory & localStorage storage engine
  private static fallbackPut<T extends StoredRecord>(storeName: string, item: T) {
    if (!this.memoryStores[storeName]) this.memoryStores[storeName] = {};
    this.memoryStores[storeName][item.id] = { ...item };

    try {
      if (typeof localStorage !== 'undefined') {
        const key = `varejopro_idb_${storeName}_${item.companyId || 'default'}`;
        const raw = localStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex((i: any) => i.id === item.id);
        if (idx >= 0) list[idx] = item;
        else list.push(item);
        localStorage.setItem(key, JSON.stringify(list));
      }
    } catch {}
  }

  private static fallbackGet(storeName: string, id: string): any {
    if (this.memoryStores[storeName] && this.memoryStores[storeName][id]) {
      return this.memoryStores[storeName][id];
    }

    try {
      if (typeof localStorage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`varejopro_idb_${storeName}_`)) {
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            const match = list.find((item: any) => item.id === id);
            if (match) return match;
          }
        }
      }
    } catch {}
    return null;
  }

  private static fallbackGetAll(storeName: string, companyId: string): any[] {
    const memList = this.memoryStores[storeName] 
      ? Object.values(this.memoryStores[storeName]).filter((item: any) => item.companyId === companyId)
      : [];

    if (memList.length > 0) return memList;

    try {
      if (typeof localStorage !== 'undefined') {
        const key = `varejopro_idb_${storeName}_${companyId}`;
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      }
    } catch {}
    return [];
  }

  private static fallbackDelete(storeName: string, id: string) {
    if (this.memoryStores[storeName]) {
      delete this.memoryStores[storeName][id];
    }

    try {
      if (typeof localStorage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`varejopro_idb_${storeName}_`)) {
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            const filtered = list.filter((item: any) => item.id !== id);
            localStorage.setItem(key, JSON.stringify(filtered));
          }
        }
      }
    } catch {}
  }

  private static fallbackClearCompany(storeName: string, companyId: string) {
    if (this.memoryStores[storeName]) {
      for (const [id, item] of Object.entries(this.memoryStores[storeName])) {
        if ((item as any).companyId === companyId) {
          delete this.memoryStores[storeName][id];
        }
      }
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`varejopro_idb_${storeName}_${companyId}`);
      }
    } catch {}
  }
}
