import { afterEach, expect, it, vi } from 'vitest'
const navigation = vi.hoisted(() => ({ redirect: vi.fn(() => { throw new Error('redirect') }) }))
vi.mock('next/navigation', () => navigation)
vi.mock('@/lib/auth/server', () => ({ getServerSession: vi.fn(), getServerEffectivePermissions: vi.fn(), getServerAuthenticatedContext: vi.fn() }))
vi.mock('./audit-log', () => ({ default: () => null }))
vi.mock('./node-audit-log', () => ({ default: () => null }))
import { getServerSession, getServerEffectivePermissions, getServerAuthenticatedContext } from '@/lib/auth/server'
import AuditPage from './page'
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })
it('permits the enabled candidate only after the server grants audit:read', async () => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '1'); vi.stubEnv('VIREXA_AUDIT_EVENTS', '1')
  vi.mocked(getServerSession).mockResolvedValue({ user: { organizationName: 'Synthetic tenant', role: 'viewer' } } as never)
  vi.mocked(getServerEffectivePermissions).mockResolvedValue({ capabilities: ['audit:read'] })
  expect(await AuditPage()).toBeTruthy()
  expect(getServerAuthenticatedContext).not.toHaveBeenCalled()
  expect(navigation.redirect).not.toHaveBeenCalled()
})
it('does not infer audit access from an admin session role', async () => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '1'); vi.stubEnv('VIREXA_AUDIT_EVENTS', '1')
  vi.mocked(getServerSession).mockResolvedValue({ user: { role: 'admin' } } as never)
  vi.mocked(getServerEffectivePermissions).mockResolvedValue({ capabilities: [] })
  await expect(AuditPage()).rejects.toThrow('redirect')
  expect(navigation.redirect).toHaveBeenCalledWith('/app/access')
})
