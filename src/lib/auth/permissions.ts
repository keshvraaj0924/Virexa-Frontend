import type { UserRole } from '@/contracts/auth'

export type Role = UserRole

export type Permission =
  | 'platform:read'
  | 'platform:manage'
  | 'organization:manage'
  | 'audit:read'
  | 'workflow:read'
  | 'workflow:create'
  | 'workflow:manage'
  | 'document:read'
  | 'document:create'
  | 'document:manage'
  | 'agent:read'
  | 'agent:create'
  | 'agent:manage'

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  super_admin: new Set(['platform:read', 'platform:manage', 'organization:manage', 'audit:read', 'workflow:read', 'workflow:create', 'workflow:manage', 'document:read', 'document:create', 'document:manage', 'agent:read', 'agent:create', 'agent:manage']),
  admin: new Set(['platform:read', 'organization:manage', 'audit:read', 'workflow:read', 'workflow:create', 'workflow:manage', 'document:read', 'document:create', 'document:manage', 'agent:read', 'agent:create', 'agent:manage']),
  manager: new Set(['platform:read', 'audit:read', 'workflow:read', 'workflow:create', 'workflow:manage', 'document:read', 'document:create', 'document:manage', 'agent:read', 'agent:create', 'agent:manage']),
  operator: new Set(['platform:read', 'workflow:read', 'workflow:create', 'document:read', 'document:create', 'agent:read', 'agent:create']),
  viewer: new Set(['platform:read', 'workflow:read', 'document:read', 'agent:read']),
}

/** UI visibility helper. Backend authorization remains authoritative. */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission)
}
