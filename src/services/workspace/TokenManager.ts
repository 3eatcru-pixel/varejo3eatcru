/**
 * Persistent Google OAuth Token Manager with Automatic Refresh & Lifecycle Coordination
 * Handles access tokens, refresh tokens, persistent storage, proactive renewal, and 401 reconciliation.
 */

export interface GoogleAuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // timestamp in ms
  email: string;
  name?: string;
  scopes: string[];
  connectedAt: string;
}

const STORAGE_KEY = 'varejopro_gworkspace_auth';

export class TokenManager {
  private static cachedSession: GoogleAuthSession | null = null;
  private static refreshPromise: Promise<string | null> | null = null;

  /**
   * Retrieves the current stored Google Auth session from memory or persistent storage.
   */
  static getSession(): GoogleAuthSession | null {
    if (this.cachedSession) {
      return this.cachedSession;
    }

    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const session: GoogleAuthSession = JSON.parse(raw);
        this.cachedSession = session;
        return session;
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Evaluates if session is expired or within 5-minute safety expiration threshold.
   */
  static isExpired(session: GoogleAuthSession): boolean {
    const thresholdMs = 300000; // 5 minutes
    return Date.now() >= (session.expiresAt - thresholdMs);
  }

  /**
   * Persists a newly acquired session.
   */
  static saveSession(session: GoogleAuthSession): void {
    this.cachedSession = session;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      }
    } catch (e) {
      console.warn("Falha ao persistir sessão Google Auth:", e);
    }
  }

  /**
   * Executes proactive token refresh using stored refresh token.
   */
  static async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      const session = this.getSession();
      if (!session) return null;

      // If no refresh token exists and token is already expired beyond recovery, invalidate session
      if (!session.refreshToken) {
        if (Date.now() >= session.expiresAt) {
          console.warn("[TokenManager] Token expirado sem refresh token disponível. Requer nova autenticação.");
          this.cachedSession = null;
          return null;
        }
        return session.accessToken;
      }

      try {
        const res = await fetch('/api/auth/google/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: session.refreshToken })
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 400) {
            console.warn("[TokenManager] Refresh token rejeitado pelo provedor. Sessão invalidada.");
            this.clearSession();
            return null;
          }
          throw new Error(`Falha no refresh HTTP ${res.status}`);
        }

        const data = await res.json();
        const updatedSession: GoogleAuthSession = {
          ...session,
          accessToken: data.accessToken || data.access_token,
          expiresAt: Date.now() + ((data.expiresIn || data.expires_in || 3600) * 1000)
        };

        this.saveSession(updatedSession);
        return updatedSession.accessToken;
      } catch (err) {
        console.warn("[TokenManager] Erro transitório durante renovação de token:", err);
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Asynchronous, proactive valid token provider.
   * Checks expiration and executes refresh before returning.
   */
  static async getValidAccessToken(): Promise<string | null> {
    const session = this.getSession();
    if (!session) return null;

    if (!this.isExpired(session)) {
      return session.accessToken;
    }

    return this.refreshAccessToken();
  }

  /**
   * Synchronous token accessor for immediate non-blocking queries.
   */
  static getValidAccessTokenSync(): string | null {
    const session = this.getSession();
    if (!session || this.isExpired(session)) return null;
    return session.accessToken;
  }

  /**
   * Handles 401 Unauthorized responses from Google APIs.
   * Clears active cached token so that next synchronization cycle attempts renewal or signals connection status.
   * NOTE: Does NOT delete or wipe pending records in workspace queue!
   */
  static handleUnauthorized(): void {
    console.warn("[TokenManager] Resposta 401 recebida da Google API. Invalidando token de acesso ativo.");
    if (this.cachedSession) {
      // Force expired status to trigger refresh on next attempt
      this.cachedSession.expiresAt = Date.now() - 1000;
    }
  }

  /**
   * Clears the current stored session.
   */
  static clearSession(): void {
    this.cachedSession = null;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }

  /**
   * Returns true if a valid or renewable session exists.
   */
  static isConnected(): boolean {
    const session = this.getSession();
    return Boolean(session && (!this.isExpired(session) || session.refreshToken));
  }
}
