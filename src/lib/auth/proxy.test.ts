import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { proxyAuth } from './proxy'

beforeEach(() => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '1')
  vi.stubEnv('AUTH_API_ORIGIN', 'http://127.0.0.1:4000')
  vi.stubEnv('NEXT_PUBLIC_API_URL', '/api/v1')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
describe('bounded auth candidate proxy', () => {
  it('is disabled by default and does not replace the Node API', async () => {
    vi.stubEnv('VIREXA_AUTH_CANDIDATE', '')
    expect((await proxyAuth(new Request('http://localhost/api/v1/me'), ['me'])).status).toBe(404)
  })
  it('sanitizes malformed and unsafe server configuration', async () => {
    for (const origin of ['not-a-url', 'http://user:pass@localhost', 'http://localhost/path', 'file:///tmp']) {
      vi.stubEnv('AUTH_API_ORIGIN', origin)
      expect((await proxyAuth(new Request('http://localhost'), ['me'])).status).toBe(503)
    }
  })
  it('blocks unported endpoints and path escapes before contacting any upstream', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    for (const path of [['workflows'], ['auth', 'sessions'], ['..', 'health'], ['organizations', '..']]) {
      expect((await proxyAuth(new Request('http://localhost'), path)).status).toBe(404)
    }
    expect(fetch).not.toHaveBeenCalled()
  })
  it('preserves original origin/cookie without trusting injected forwarding headers', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { headers: { 'Set-Cookie': 'session=opaque; HttpOnly; Path=/; SameSite=Lax' } }))
    vi.stubGlobal('fetch', fetch)
    const response = await proxyAuth(new Request('http://localhost/api/v1/auth/login', { method: 'POST', headers: { Origin: 'https://evil.example', Cookie: 'session=opaque', 'X-Forwarded-For': 'trusted', 'X-Forwarded-Host': 'trusted' }, body: '{}' }), ['auth', 'login'])
    const init = fetch.mock.calls[0][1]
    expect(init.headers.get('origin')).toBe('https://evil.example')
    expect(init.headers.get('cookie')).toBe('session=opaque')
    expect(init.headers.has('x-forwarded-for')).toBe(false)
    expect(init.headers.has('x-forwarded-host')).toBe(false)
    expect(init.redirect).toBe('manual')
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
  it('does not invent an Origin for non-browser writes', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 403 })); vi.stubGlobal('fetch', fetch)
    await proxyAuth(new Request('http://localhost', { method: 'POST' }), ['auth', 'logout'])
    expect(fetch.mock.calls[0][1].headers.has('origin')).toBe(false)
  })
  it('rejects large bodies before upstream transmission', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    expect((await proxyAuth(new Request('http://localhost', { method: 'POST', body: 'x'.repeat(16385) }), ['auth', 'login'])).status).toBe(413)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('fails closed on upstream redirect and network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { Location: 'https://evil.example' } })))
    const response = await proxyAuth(new Request('http://localhost'), ['me'])
    expect(response.status).toBe(502)
    expect(response.headers.has('location')).toBe(false)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private database detail')))
    expect(await (await proxyAuth(new Request('http://localhost'), ['me'])).text()).not.toContain('private database detail')
  })
})
