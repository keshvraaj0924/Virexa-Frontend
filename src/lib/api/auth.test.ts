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
