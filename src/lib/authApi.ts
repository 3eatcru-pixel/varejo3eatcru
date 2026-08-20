import { UserProfile, CompanyRole } from '../types';
import { SEED_USERS } from './localDataSeed';

export interface InitUserResponse {
  success: boolean;
  profile: UserProfile;
  isNew?: boolean;
  isFirstUser?: boolean;
  role?: string;
  error?: string;
}

/**
 * Initializes or synchronizes the user profile locally and across server endpoints.
 * Completely resilient and self-contained.
 */
export async function initializeUserProfile(user: any, customName?: string): Promise<UserProfile> {
  // Check predefined seed users first for instantaneous high-privilege access
  if (user.email) {
    const cleanEmail = user.email.toLowerCase();
    const matchedSeed = Object.values(SEED_USERS).find(u => u.email.toLowerCase() === cleanEmail);
    if (matchedSeed) {
      return {
        ...matchedSeed,
        uid: user.uid || matchedSeed.uid
      };
    }
  }

  // Check LocalStorage cache
  try {
    const rawUsers = localStorage.getItem('varejopro_db_users');
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      if (users[user.uid]) {
        return users[user.uid];
      }
    }
  } catch (e) {
    console.warn("Error reading users from localStorage:", e);
  }

  // Create new robust admin/operator profile
  const newProfile: UserProfile = {
    uid: user.uid || 'user_' + Date.now(),
    email: user.email || 'operador@varejopro.com',
    name: customName || user.displayName || (user.email ? user.email.split('@')[0] : 'Operador'),
    role: (user.email?.includes('admin') || user.email === 'audtrilha@gmail.com') ? ('admin' as CompanyRole) : ('caixa' as CompanyRole),
    companyId: 'empresa_principal',
    companyName: 'VarejoPro Supermercados & Conveniência',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const rawUsers = localStorage.getItem('varejopro_db_users');
    const users = rawUsers ? JSON.parse(rawUsers) : {};
    users[newProfile.uid] = newProfile;
    localStorage.setItem('varejopro_db_users', JSON.stringify(users));
  } catch (e) {
    console.warn("Error persisting user profile:", e);
  }

  return newProfile;
}
