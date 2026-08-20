/**
 * VarejoPro Enterprise Distributed Tab Mutex Lock
 * Coordinates sync engines and critical background jobs across multiple browser tabs.
 * 
 * Hierarchy:
 * 1. Web Locks API (navigator.locks) when available in modern browser contexts.
 * 2. Persistent Storage Lease + BroadcastChannel fallback for multi-tab environments.
 * 3. Automatic abandoned lock recovery after lease expiration (default 30 seconds).
 */

export interface LockRecord {
  resourceKey: string;
  ownerId: string;
  acquiredAt: number;
  expiresAt: number;
}

export class TabMutexLock {
  private static tabId = `tab_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  private static channel: any = null;
  private static memoryLocks: Map<string, LockRecord> = new Map();

  private static getChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window && !this.channel) {
      try {
        this.channel = new BroadcastChannel('varejopro_tab_mutex_channel');
      } catch {}
    }
    return this.channel;
  }

  /**
   * Returns the unique identifier for the current browser tab.
   */
  static getTabId(): string {
    return this.tabId;
  }

  /**
   * Attempts to acquire exclusive lock for a resource across browser tabs.
   * Returns acquired: true if successful, or acquired: false with reason.
   */
  static async acquire(
    resourceKey: string,
    leaseMs = 30000
  ): Promise<{ acquired: boolean; ownerId: string; reason?: string }> {
    const lockKey = `varejopro_lock_${resourceKey}`;
    const now = Date.now();

    // 1. Check Web Locks API if available
    if (typeof navigator !== 'undefined' && 'locks' in navigator && typeof navigator.locks?.request === 'function') {
      let lockAcquired = false;
      try {
        await new Promise<void>((resolve) => {
          navigator.locks.request(lockKey, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
            if (lock) {
              lockAcquired = true;
              this.recordPersistentLock(resourceKey, this.tabId, leaseMs);
            }
            resolve();
          });
        });

        if (lockAcquired) {
          return { acquired: true, ownerId: this.tabId };
        } else {
          return {
            acquired: false,
            ownerId: '',
            reason: `Recurso bloqueado por outra aba ativa (Web Locks API).`
          };
        }
      } catch {
        // Fallback to storage lease if Web Locks API fails
      }
    }

    // 2. Persistent Storage + Memory Fallback Lock
    const existing = this.readPersistentLock(resourceKey);
    if (existing) {
      const isExpired = now >= existing.expiresAt;
      const isCurrentTab = existing.ownerId === this.tabId;

      if (!isExpired && !isCurrentTab) {
        return {
          acquired: false,
          ownerId: existing.ownerId,
          reason: `Recurso bloqueado pela aba [${existing.ownerId}]. Expira em ${Math.ceil((existing.expiresAt - now) / 1000)}s.`
        };
      }
    }

    // Acquire lock and update persistence
    this.recordPersistentLock(resourceKey, this.tabId, leaseMs);
    const ch = this.getChannel();
    if (ch) {
      try {
        ch.postMessage({ type: 'LOCK_ACQUIRED', resourceKey, ownerId: this.tabId });
      } catch {}
    }

    return { acquired: true, ownerId: this.tabId };
  }

  /**
   * Releases an acquired lock if owned by the current tab.
   */
  static async release(resourceKey: string, ownerId?: string): Promise<void> {
    const lockKey = `varejopro_lock_${resourceKey}`;
    const targetOwner = ownerId || this.tabId;

    const existing = this.readPersistentLock(resourceKey);
    if (existing && existing.ownerId === targetOwner) {
      this.clearPersistentLock(resourceKey);
      const ch = this.getChannel();
      if (ch) {
        try {
          ch.postMessage({ type: 'LOCK_RELEASED', resourceKey, ownerId: targetOwner });
        } catch {}
      }
    }
  }

  /**
   * Executes an async operation with guaranteed lock acquisition and safe release.
   */
  static async withLock<T>(
    resourceKey: string,
    operation: () => Promise<T>,
    leaseMs = 30000
  ): Promise<{ executed: boolean; result?: T; reason?: string }> {
    const acquisition = await this.acquire(resourceKey, leaseMs);
    if (!acquisition.acquired) {
      return { executed: false, reason: acquisition.reason };
    }

    try {
      const result = await operation();
      return { executed: true, result };
    } finally {
      await this.release(resourceKey, acquisition.ownerId);
    }
  }

  /**
   * Checks if a resource is currently locked by any active tab.
   */
  static async isLocked(resourceKey: string): Promise<boolean> {
    const now = Date.now();
    const existing = this.readPersistentLock(resourceKey);
    if (!existing) return false;
    return now < existing.expiresAt;
  }

  // --- Persistent Storage Helpers ---
  private static recordPersistentLock(resourceKey: string, ownerId: string, leaseMs: number) {
    const record: LockRecord = {
      resourceKey,
      ownerId,
      acquiredAt: Date.now(),
      expiresAt: Date.now() + leaseMs
    };
    this.memoryLocks.set(resourceKey, record);

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`varejopro_lock_${resourceKey}`, JSON.stringify(record));
      }
    } catch {}
  }

  private static readPersistentLock(resourceKey: string): LockRecord | null {
    const memory = this.memoryLocks.get(resourceKey);
    if (memory) return memory;

    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(`varejopro_lock_${resourceKey}`);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return null;
  }

  private static clearPersistentLock(resourceKey: string) {
    this.memoryLocks.delete(resourceKey);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`varejopro_lock_${resourceKey}`);
      }
    } catch {}
  }
}
