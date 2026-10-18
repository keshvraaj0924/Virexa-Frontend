import { afterEach, expect, it, vi } from 'vitest'
const navigation = vi.hoisted(() => ({ redirect: vi.fn(() => { throw new Error('redirect') }) }))
vi.mock('next/navigation', () => navigation)
vi.mock('@/lib/auth/server', () => ({ getServerAuthenticatedContext: vi.fn() }))
vi.mock('./team-administration', () => ({ default: () => null }))
vi.mock('./organization-hierarchy', () => ({ default: () => null }))
import { getServerAuthenticatedContext } from '@/lib/auth/server'
import UsersPage from './page'
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })
it('keeps the Node organization permission gate unchanged', async () => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '0')
  vi.mocked(getServerAuthenticatedContext).mockResolvedValue({ user: { organizationName: 'Synthetic tenant' }, permissions: [] } as never)
  await expect(UsersPage()).rejects.toThrow('redirect')
  vi.mocked(getServerAuthenticatedContext).mockResolvedValue({ user: { organizationName: 'Synthetic tenant' }, permissions: ['organization:manage'] } as never)
  expect(await UsersPage()).toBeTruthy()
})
it('allows the enabled candidate to present personal and capability-restricted states without legacy permissions', async () => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '1'); vi.stubEnv('VIREXA_TEAM_ADMINISTRATION', '1')
  vi.mocked(getServerAuthenticatedContext).mockResolvedValue({ user: { id: 'id', organizationId: 'org', organizationName: 'Synthetic workspace', accountType: 'individual' } } as never)
  expect(await UsersPage()).toBeTruthy(); expect(navigation.redirect).not.toHaveBeenCalled()
  vi.stubEnv('VIREXA_TEAM_ADMINISTRATION', '0'); await expect(UsersPage()).rejects.toThrow('redirect')
})
