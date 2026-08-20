import { PlanTier } from './licensing';
import { PermissionKey } from '../lib/permissions';

export enum CompanyRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  STOCK = 'STOCK',
  VIEWER = 'VIEWER'
}

export enum PlatformRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  DEVELOPER = 'DEVELOPER',
  SUPPORT = 'SUPPORT',
  SALES = 'SALES',
  BILLING = 'BILLING',
  AUDITOR = 'AUDITOR'
}

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  emailVerified: boolean;
  isAnonymous?: boolean;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserProfileDetails {
  uid: string;
  fullName: string;
  preferredName?: string;
  phone?: string;
  avatarUrl?: string;
  language?: string;
  timezone?: string;
  documentNumber?: string; // CPF
  updatedAt: string;
}

export interface CompanyMembership {
  id: string;
  userId: string;
  companyId: string;
  companyName: string;
  role: CompanyRole;
  permissions?: Record<PermissionKey, boolean>;
  branchIds?: string[];
  terminalIds?: string[];
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  invitedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyWorkspace {
  id: string;
  name: string;
  tradeName?: string;
  cnpj?: string;
  planTier: PlanTier;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIAL';
  logoUrl?: string;
  primaryColor?: string;
  roleInCompany?: CompanyRole;
}

export interface PlatformAccount {
  uid: string;
  email: string;
  name: string;
  role: PlatformRole;
  active: boolean;
  permissions?: string[];
  createdAt: string;
}

export interface UserInvitation {
  id: string; // UUID
  companyId: string;
  companyName: string;
  email: string;
  name: string;
  role: CompanyRole;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  invitedByUid: string;
  invitedByName: string;
  expiresAt: string;
  acceptedAt?: string;
  acceptedUid?: string;
  createdAt: string;
}

export interface UserSession {
  id: string;
  uid: string;
  device: string;
  browser: string;
  os: string;
  ip?: string;
  createdAt: string;
  lastSeenAt: string;
  isCurrent?: boolean;
  revoked?: boolean;
}
