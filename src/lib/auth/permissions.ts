import type { Permission, UserRole } from '@/contracts/auth'

export type Role = UserRole

const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  super_admin: new Set([
    'platform:read', 'platform:manage', 'organization:manage', 'audit:read',
    'workflow:read', 'workflow:create', 'workflow:manage',
  ]),
  admin: new Set([
    'platform:read', 'organization:manage', 'audit:read',
    'workflow:read', 'workflow:create', 'workflow:manage',
  ]),
  manager: new Set(['platform:read', 'audit:read', 'workflow:read', 'workflow:create', 'workflow:manage']),
  operator: new Set(['platform:read', 'workflow:read', 'workflow:create']),
  viewer: new Set(['platform:read', 'workflow:read']),
}

/** UI authorization helper. The backend remains the security boundary. */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission)
}
