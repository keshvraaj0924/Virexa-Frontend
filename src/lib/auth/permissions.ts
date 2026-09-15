export type Role =
  | 'platform_admin'
  | 'tenant_admin'
  | 'organization_admin'
  | 'manager'
  | 'operator'
  | 'viewer'
  | 'auditor';

export type Permission =
  | 'dashboard:read'
  | 'user:read'
  | 'user:manage'
  | 'role:manage'
  | 'workflow:read'
  | 'workflow:manage'
  | 'document:read'
  | 'document:manage'
  | 'audit:read';

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  platform_admin: new Set([
    'dashboard:read', 'user:read', 'user:manage', 'role:manage',
    'workflow:read', 'workflow:manage', 'document:read', 'document:manage', 'audit:read',
  ]),
  tenant_admin: new Set([
    'dashboard:read', 'user:read', 'user:manage', 'role:manage',
    'workflow:read', 'workflow:manage', 'document:read', 'document:manage', 'audit:read',
  ]),
  organization_admin: new Set([
    'dashboard:read', 'user:read', 'user:manage', 'role:manage',
    'workflow:read', 'workflow:manage', 'document:read', 'document:manage',
  ]),
  manager: new Set([
    'dashboard:read', 'user:read', 'workflow:read', 'workflow:manage', 'document:read', 'document:manage',
  ]),
  operator: new Set([
    'dashboard:read', 'workflow:read', 'workflow:manage', 'document:read', 'document:manage',
  ]),
  viewer: new Set(['dashboard:read', 'workflow:read', 'document:read']),
  auditor: new Set(['dashboard:read', 'audit:read']),
};

/** UI authorization helper. Backend authorization remains authoritative. */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}
