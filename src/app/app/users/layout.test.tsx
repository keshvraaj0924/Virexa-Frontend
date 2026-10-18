import { afterEach, expect, it, vi } from 'vitest'
const navigation = vi.hoisted(() => ({ redirect: vi.fn(() => { throw new Error('redirect') }) }))
vi.mock('next/navigation', () => navigation)
import TeamLayout from './layout'
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })
it('requires the explicit team feature flag in the candidate', () => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '1')
  vi.stubEnv('VIREXA_TEAM_ADMINISTRATION', '0')
  expect(() => TeamLayout({ children: 'Team' })).toThrow('redirect')
  expect(navigation.redirect).toHaveBeenCalledWith('/app')
  vi.stubEnv('VIREXA_TEAM_ADMINISTRATION', '1')
  expect(TeamLayout({ children: 'Team' })).toBe('Team')
})
it('preserves the default Node route independently of the candidate flag', () => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '0')
  vi.stubEnv('VIREXA_TEAM_ADMINISTRATION', '0')
  expect(TeamLayout({ children: 'Node team' })).toBe('Node team')
})
