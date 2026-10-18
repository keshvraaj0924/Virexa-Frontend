import { afterEach, expect, it, vi } from 'vitest'
const navigation = vi.hoisted(() => ({ redirect: vi.fn(() => { throw new Error('redirect') }) }))
vi.mock('next/navigation', () => navigation)
vi.mock('@/lib/auth/server', () => ({ getServerSession: vi.fn(), getServerEffectivePermissions: vi.fn(), getServerAuthenticatedContext: vi.fn() }))
vi.mock('./workflow-records', () => ({ default: () => null }))
vi.mock('@/app/app-shell/workflows', () => ({ default: () => null }))
import { getServerSession, getServerEffectivePermissions, getServerAuthenticatedContext } from '@/lib/auth/server'
import WorkflowsPage from './page'
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })
it('permits the enabled candidate only after the server grants workflow:read', async () => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '1'); vi.stubEnv('VIREXA_WORKFLOW_RECORDS', '1')
  vi.mocked(getServerSession).mockResolvedValue({ user: { organizationName: 'Synthetic tenant', role: 'viewer' } } as never)
  vi.mocked(getServerEffectivePermissions).mockResolvedValue({ capabilities: ['workflow:read'] })
  expect(await WorkflowsPage()).toBeTruthy()
  expect(getServerAuthenticatedContext).not.toHaveBeenCalled()
  expect(navigation.redirect).not.toHaveBeenCalled()
})
it('does not infer workflow access from an admin session role', async () => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '1'); vi.stubEnv('VIREXA_WORKFLOW_RECORDS', '1')
  vi.mocked(getServerSession).mockResolvedValue({ user: { role: 'admin' } } as never)
  vi.mocked(getServerEffectivePermissions).mockResolvedValue({ capabilities: [] })
  await expect(WorkflowsPage()).rejects.toThrow('redirect')
  expect(navigation.redirect).toHaveBeenCalledWith('/app/access')
})
