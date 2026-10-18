import { afterEach, expect, it, vi } from 'vitest'
const navigation = vi.hoisted(() => ({ redirect: vi.fn(() => { throw new Error('redirect') }) }))
vi.mock('next/navigation', () => navigation)
import AuditLayout from './layout'
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })
it('requires the explicit audit feature flag in the candidate', () => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '1')
  vi.stubEnv('VIREXA_AUDIT_EVENTS', '0')
  expect(() => AuditLayout({ children: 'Audit' })).toThrow('redirect')
  expect(navigation.redirect).toHaveBeenCalledWith('/app')
  vi.stubEnv('VIREXA_AUDIT_EVENTS', '1')
  expect(AuditLayout({ children: 'Audit' })).toBe('Audit')
})
it('preserves the default Node route independently of the candidate flag', () => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '0')
  vi.stubEnv('VIREXA_AUDIT_EVENTS', '0')
  expect(AuditLayout({ children: 'Node audit' })).toBe('Node audit')
})
