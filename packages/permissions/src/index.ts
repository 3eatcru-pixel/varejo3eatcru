import { UserProfile, UserRole, CompanyRole } from '@varejopro/types';

export type PermissionKey = 
  | 'posAccess'
  | 'giveDiscount'
  | 'cancelSale'
  | 'viewReports'
  | 'manageStock'
  | 'manageFinancial'
  | 'manageUsers';

export const OWNER_PERMISSIONS: Record<PermissionKey, boolean> = {
  posAccess: true,
  giveDiscount: true,
  cancelSale: true,
  viewReports: true,
  manageStock: true,
  manageFinancial: true,
  manageUsers: true
};

export const ADMIN_PERMISSIONS: Record<PermissionKey, boolean> = {
  posAccess: true,
  giveDiscount: true,
  cancelSale: true,
  viewReports: true,
  manageStock: true,
  manageFinancial: true,
  manageUsers: true
};

export const MANAGER_PERMISSIONS: Record<PermissionKey, boolean> = {
  posAccess: true,
  giveDiscount: true,
  cancelSale: true,
  viewReports: true,
  manageStock: true,
  manageFinancial: true,
  manageUsers: false
};

export const CASHIER_PERMISSIONS: Record<PermissionKey, boolean> = {
  posAccess: true,
  giveDiscount: false,
  cancelSale: false,
  viewReports: false,
  manageStock: false,
  manageFinancial: false,
  manageUsers: false
};

export const STOCK_PERMISSIONS: Record<PermissionKey, boolean> = {
  posAccess: false,
  giveDiscount: false,
  cancelSale: false,
  viewReports: false,
  manageStock: true,
  manageFinancial: false,
  manageUsers: false
};

export const VIEWER_PERMISSIONS: Record<PermissionKey, boolean> = {
  posAccess: false,
  giveDiscount: false,
  cancelSale: false,
  viewReports: true,
  manageStock: false,
  manageFinancial: false,
  manageUsers: false
};

export function getPermissionsForRole(role: CompanyRole | string): Record<PermissionKey, boolean> {
  const norm = String(role).toUpperCase();
  if (norm === CompanyRole.OWNER || norm === 'OWNER') return OWNER_PERMISSIONS;
  if (norm === CompanyRole.ADMIN || norm === 'ADMIN') return ADMIN_PERMISSIONS;
  if (norm === CompanyRole.MANAGER || norm === 'MANAGER' || norm === 'GERENTE') return MANAGER_PERMISSIONS;
  if (norm === CompanyRole.STOCK || norm === 'STOCK' || norm === 'ESTOQUISTA') return STOCK_PERMISSIONS;
  if (norm === CompanyRole.VIEWER || norm === 'VIEWER') return VIEWER_PERMISSIONS;
  return CASHIER_PERMISSIONS;
}

export interface PermissionsConfig {
  admin: Record<PermissionKey, boolean>;
  manager: Record<PermissionKey, boolean>;
  cashier: Record<PermissionKey, boolean>;
  stock: Record<PermissionKey, boolean>;
}

export const DEFAULT_PERMISSIONS: PermissionsConfig = {
  admin: ADMIN_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  cashier: CASHIER_PERMISSIONS,
  stock: STOCK_PERMISSIONS
};

export function normalizeRoleKey(role?: UserRole | string): 'admin' | 'manager' | 'cashier' | 'stock' {
  if (!role) return 'cashier';
  const lower = String(role).toLowerCase();
  if (lower === 'admin' || lower === UserRole.ADMIN || lower === 'owner') return 'admin';
  if (lower === 'gerente' || lower === UserRole.MANAGER || lower === 'manager') return 'manager';
  if (lower === 'estoquista' || lower === UserRole.STOCK || lower === 'stock') return 'stock';
  return 'cashier';
}

/**
 * Checks whether a given user profile or role has permission for an action based on canonical RBAC policy.
 */
export function hasPermission(user: UserProfile | null | undefined, key: PermissionKey): boolean {
  if (!user || !user.role) return false;
  
  const roleKey = normalizeRoleKey(user.role);
  if (roleKey === 'admin') return true;
  if (roleKey === 'manager') {
    return key !== 'manageUsers';
  }
  if (roleKey === 'stock') {
    return key === 'manageStock';
  }
  if (roleKey === 'cashier') {
    return key === 'posAccess';
  }
  return false;
}
