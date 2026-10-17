import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const requestHeaders = vi.hoisted(() => ({ cookie: 'virexa_session=opaque-test-only' as string | null }))
vi.mock('next/headers', () => ({ headers: async () => new Headers(requestHeaders.cookie ? { cookie: requestHeaders.cookie } : {}) }))
import { getServerSession } from './server'

beforeEach(() => {
  requestHeaders.cookie = 'virexa_session=opaque-test-only'
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '1')
  vi.stubEnv('NEXT_PUBLIC_API_URL', '/api/v1')
  vi.stubEnv('AUTH_API_ORIGIN', 'http://127.0.0.1:4000/')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
describe('candidate SSR session boundary', () => {
  it('never contacts upstream without a cookie', async () => {
    requestHeaders.cookie = null
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    expect(await getServerSession()).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('rejects invalid or absent configuration before forwarding cookies', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    for (const origin of ['', 'invalid', 'http://user:password@example.test', 'http://example.test/nested']) {
      vi.stubEnv('AUTH_API_ORIGIN', origin)
      expect(await getServerSession()).toBeNull()
    }
    expect(fetch).not.toHaveBeenCalled()
  })
  it('normalizes trailing slashes and refuses redirects with a deadline', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ data: { user: { id: 'actual-backend-user' } } }))
    vi.stubGlobal('fetch', fetch)
    expect(await getServerSession()).toEqual({ user: { id: 'actual-backend-user' } })
    expect(String(fetch.mock.calls[0][0])).toBe('http://127.0.0.1:4000/api/v1/auth/session')
    expect(fetch.mock.calls[0][1]).toMatchObject({ redirect: 'manual', cache: 'no-store', headers: { Cookie: 'virexa_session=opaque-test-only' } })
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })
  it('fails closed for rejected sessions, redirects, malformed JSON and network errors', async () => {
    for (const response of [new Response(null, { status: 401 }), new Response(null, { status: 302 }), new Response('invalid-json'), Response.json({})]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
      expect(await getServerSession()).toBeNull()
    }
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('internal details')))
    expect(await getServerSession()).toBeNull()
  })
})
