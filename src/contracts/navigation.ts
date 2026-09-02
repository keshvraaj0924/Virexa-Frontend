import type { UserRole } from './auth'

export interface NavigationItem {
  label: string
  href: string
  roles: UserRole[]
  icon: 'dashboard' | 'workflows' | 'documents' | 'analytics' | 'integrations' | 'users' | 'settings' | 'audit'
}

export const NAVIGATION: NavigationItem[] = [
  { label: 'Dashboard', href: '/app', roles: ['super_admin', 'admin', 'manager', 'operator', 'viewer'], icon: 'dashboard' },
  { label: 'Workflows', href: '/app/workflows', roles: ['super_admin', 'admin', 'manager', 'operator'], icon: 'workflows' },
  { label: 'Documents', href: '/app/documents', roles: ['super_admin', 'admin', 'manager', 'operator', 'viewer'], icon: 'documents' },
  { label: 'Analytics', href: '/app/analytics', roles: ['super_admin', 'admin', 'manager', 'viewer'], icon: 'analytics' },
  { label: 'Integrations', href: '/app/integrations', roles: ['super_admin', 'admin'], icon: 'integrations' },
  { label: 'Users & Access', href: '/app/users', roles: ['super_admin', 'admin'], icon: 'users' },
  { label: 'Audit Log', href: '/app/audit', roles: ['super_admin', 'admin'], icon: 'audit' },
  { label: 'Settings', href: '/app/settings', roles: ['super_admin', 'admin', 'manager'], icon: 'settings' },
]
