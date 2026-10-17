import { afterEach, expect, it, vi } from 'vitest'
const navigation = vi.hoisted(() => ({ redirect: vi.fn(() => { throw new Error('redirect') }) }))
vi.mock('next/navigation', () => navigation)
import SettingsLayout from './layout'
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })
it('requires the explicit session control capability in the candidate', () => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '1')
  vi.stubEnv('VIREXA_SESSION_CONTROLS', '0')
  expect(() => SettingsLayout({ children: 'Sessions' })).toThrow('redirect')
  expect(navigation.redirect).toHaveBeenCalledWith('/app')
  vi.stubEnv('VIREXA_SESSION_CONTROLS', '1')
  expect(SettingsLayout({ children: 'Sessions' })).toBe('Sessions')
})
