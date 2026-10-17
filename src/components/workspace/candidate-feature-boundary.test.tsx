import { afterEach, expect, it, vi } from 'vitest'
const navigation = vi.hoisted(() => ({ redirect: vi.fn(() => { throw new Error('redirect') }) }))
vi.mock('next/navigation', () => navigation)
import { CandidateFeatureBoundary } from './candidate-feature-boundary'
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })
it('uses a relative server redirect so preview gating preserves the public hostname', () => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '1')
  expect(() => CandidateFeatureBoundary({ children: 'Unported feature' })).toThrow('redirect')
  expect(navigation.redirect).toHaveBeenCalledWith('/app')
})
it('preserves existing feature content for the default Node application', () => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '')
  expect(CandidateFeatureBoundary({ children: 'Existing feature' })).toBe('Existing feature')
  expect(navigation.redirect).not.toHaveBeenCalled()
})
