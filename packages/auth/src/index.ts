import { UserProfile, UserRole } from '@varejopro/types';
import { hasPermission, PermissionKey } from '@varejopro/permissions';

export interface AuthSession {
  token: string;
  user: UserProfile;
  expiresAt: number;
}

export function createLocalAuthSession(user: UserProfile, token = 'session_' + Date.now()): AuthSession {
  return {
    token,
    user,
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
}

export function saveSession(session: AuthSession): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem('varejopro_auth_session', JSON.stringify(session));
    localStorage.setItem('varejopro_auth_token', session.token);
  } catch (err) {
    console.warn('Failed to persist auth session:', err);
  }
}

export function getStoredSession(): AuthSession | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem('varejopro_auth_session');
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (session.expiresAt && Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }
    return session;
  } catch (err) {
    return null;
  }
}

export function clearSession(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem('varejopro_auth_session');
    localStorage.removeItem('varejopro_auth_token');
  } catch (err) {
    console.warn('Failed to clear auth session:', err);
  }
}

export { hasPermission, type PermissionKey };
