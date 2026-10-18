import { afterEach, describe, expect, it, vi } from 'vitest'
import { authApi, ApiRequestError } from './auth'

afterEach(() => vi.unstubAllGlobals())
describe('authentication wire contract', () => {
  it('sends JSON with credentials included and no bearer token', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {}, meta: {} }), { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    await authApi.login({ email: 'person@example.com', password: 'test password' })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/auth\/login$/)
    expect(init.credentials).toBe('include')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBeUndefined()
    expect(JSON.parse(init.body)).toEqual({ email: 'person@example.com', password: 'test password' })
  })
  it('preserves server rate-limit information', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Try again later.', requestId: 'req-1' } }), { status: 429, headers: { 'Retry-After': '30' } })))
    await expect(authApi.login({ email: 'person@example.com', password: 'test' })).rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfterSeconds: 30, requestId: 'req-1' })
  })
  it('handles non-JSON gateway failures without assuming authentication', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 })))
    await expect(authApi.session()).rejects.toBeInstanceOf(ApiRequestError)
  })
})

it('sends verification steps to exact bounded routes without putting secrets in URLs', async () => {
  const fetch = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ data: {}, meta: {} }), { status: 200 }))
  vi.stubGlobal('fetch', fetch)
  await authApi.startSignup({ accountType: 'individual', displayName: 'Synthetic', email: 'synthetic@example.com' })
  await authApi.verifySignup({ challengeId: 'test-challenge', code: 'test-code' })
  await authApi.completeSignup({ challengeId: 'test-challenge', setupToken: 'test-proof', password: 'test-password-long' })
  expect(fetch.mock.calls.map(call => new URL(call[0]).pathname)).toEqual(['/api/v1/auth/signup/start', '/api/v1/auth/signup/verify', '/api/v1/auth/signup/complete'])
  for (const [, init] of fetch.mock.calls) expect(init.credentials).toBe('include')
})
