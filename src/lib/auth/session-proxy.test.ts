import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { proxyAuth } from './proxy'
const id = '018c5ac1-a3e3-47e6-a9ad-5c34a68678e2'
beforeEach(() => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '1')
  vi.stubEnv('VIREXA_SESSION_CONTROLS', '1')
  vi.stubEnv('AUTH_API_ORIGIN', 'http://127.0.0.1:4000')
  vi.stubEnv('NEXT_PUBLIC_API_URL', '/api/v1')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
it('requires both candidate and session capabilities', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  for (const flag of ['VIREXA_AUTH_CANDIDATE', 'VIREXA_SESSION_CONTROLS']) {
    vi.stubEnv(flag, '0')
    expect((await proxyAuth(new Request('http://localhost/api/v1/auth/sessions'), ['auth', 'sessions'])).status).toBe(404)
    vi.stubEnv(flag, '1')
  }
  expect(fetch).not.toHaveBeenCalled()
})
it('allows only the exact three vetted session methods and forwards bounded pagination', async () => {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ data: [] })))
  vi.stubGlobal('fetch', fetch)
  const paths = [ ['GET', 'auth/sessions'], ['POST', 'auth/sessions/revoke-others'], ['DELETE', `auth/sessions/${id}`] ]
  for (const [method, path] of paths) {
    expect((await proxyAuth(new Request(`http://localhost/api/v1/${path}?limit=20&cursor=${id}&tenantId=attacker`, { method, headers: { Origin: 'https://evil.example', Cookie: 'session=opaque' } }), path.split('/'))).status).toBe(200)
    const [url, options] = fetch.mock.calls.at(-1)!
    expect(url.pathname).toBe(`/api/v1/${path}`)
    expect(url.searchParams.get('tenantId')).toBeNull()
    expect(url.searchParams.get('cursor')).toBe(method === 'GET' ? id : null)
    expect(options.headers.get('origin')).toBe('https://evil.example')
    expect(options.headers.get('cookie')).toBe('session=opaque')
    expect(options.method).toBe(method)
  }
  fetch.mockClear()
  for (const [method, path] of [['POST', 'auth/sessions'], ['GET', `auth/sessions/${id}`], ['DELETE', 'auth/sessions/revoke-others'], ['DELETE', 'auth/sessions/not-a-uuid'], ['PATCH', `auth/sessions/${id}`], ['POST', 'auth/mfa'], ['DELETE', `auth/sessions/${id}/extra`]]) {
    expect((await proxyAuth(new Request('http://localhost', { method }), path.split('/'))).status).toBe(404)
  }
  expect(fetch).not.toHaveBeenCalled()
})
it('passes the self-revocation cookie clearing response through without caching', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: { success: true } }, { headers: { 'Set-Cookie': 'session=""; Max-Age=0; Path=/; HttpOnly; SameSite=Lax' } })))
  const response = await proxyAuth(new Request(`http://localhost/api/v1/auth/sessions/${id}`, { method: 'DELETE' }), ['auth', 'sessions', id])
  expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
  expect(response.headers.get('cache-control')).toContain('no-store')
})
