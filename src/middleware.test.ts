import { afterEach, expect, it, vi } from 'vitest'
import { middleware } from './middleware'
afterEach(() => vi.unstubAllEnvs())
it('preserves the current public hostname with a relative preview redirect', () => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '1')
  const response = middleware()
  expect(response.status).toBe(307)
  expect(response.headers.get('location')).toBe('/app')
  expect(response.headers.get('cache-control')).toBe('no-store')
})
it('leaves normal Node application navigation available', () => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '')
  expect(middleware().headers.get('location')).toBeNull()
})
