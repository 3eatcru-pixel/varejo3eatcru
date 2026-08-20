export interface LockResult {
  acquired: boolean;
  ownerId: string;
  reason?: string;
}

export class TabMutexLock {
  private static lockExpiryMs = 25000;

  static async acquire(key: string, customExpiryMs?: number): Promise<LockResult> {
    const ownerId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    if (typeof localStorage === 'undefined') {
      return { acquired: true, ownerId };
    }

    try {
      const storageKey = `varejopro_mutex_${key}`;
      const now = Date.now();
      const expiry = customExpiryMs || this.lockExpiryMs;
      const currentRaw = localStorage.getItem(storageKey);

      if (currentRaw) {
        const current = JSON.parse(currentRaw);
        if (current.ownerId !== ownerId && current.expiresAt > now) {
          return {
            acquired: false,
            ownerId: current.ownerId,
            reason: `Bloqueio retido pela aba ${current.ownerId} até ${new Date(current.expiresAt).toLocaleTimeString()}`
          };
        }
      }

      localStorage.setItem(storageKey, JSON.stringify({
        ownerId,
        acquiredAt: now,
        expiresAt: now + expiry
      }));

      return { acquired: true, ownerId };
    } catch {
      return { acquired: true, ownerId };
    }
  }

  static async release(key: string, ownerId: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;

    try {
      const storageKey = `varejopro_mutex_${key}`;
      const currentRaw = localStorage.getItem(storageKey);
      if (currentRaw) {
        const current = JSON.parse(currentRaw);
        if (current.ownerId === ownerId || current.expiresAt <= Date.now()) {
          localStorage.removeItem(storageKey);
        }
      }
    } catch {}
  }
}
