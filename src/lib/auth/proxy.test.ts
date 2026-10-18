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

it('proxies effective permissions read-only without forwarding client scope hints', async () => {
  const upstreamFetch = vi.fn().mockResolvedValue(Response.json({ data: { capabilities: ['session:read'] } }))
  vi.stubGlobal('fetch', upstreamFetch)
  const response = await proxyAuth(new Request('http://localhost/api/v1/me/permissions?role=super_admin&organizationId=other'), ['me', 'permissions'])
  expect(response.status).toBe(200)
  expect(String(upstreamFetch.mock.calls[0][0])).toBe('http://127.0.0.1:4000/api/v1/me/permissions')
  expect(response.headers.get('cache-control')).toContain('no-store')
  const write = await proxyAuth(new Request('http://localhost/api/v1/me/permissions', { method: 'POST' }), ['me', 'permissions'])
  expect(write.status).toBe(404)
  expect(upstreamFetch).toHaveBeenCalledTimes(1)
})

it('keeps usage routes opt-in, read-only and scope-safe', async () => {
  const upstreamFetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ data: {} })))
  vi.stubGlobal('fetch', upstreamFetch)
  expect((await proxyAuth(new Request('http://localhost/api/v1/usage/me'), ['usage', 'me'])).status).toBe(404)
  vi.stubEnv('VIREXA_USAGE_ANALYTICS', '1')
  for (const route of ['me', 'organization', 'me/history', 'organization/history']) {
    const response = await proxyAuth(new Request(`http://localhost/api/v1/usage/${route}?start=2026-10-01&limit=25&cursor=opaque&operation=document_intake&state=succeeded&userId=someone&organizationId=other&role=admin`), ['usage', ...route.split('/')])
    expect(response.status).toBe(200)
    const forwarded = new URL(String(upstreamFetch.mock.calls.at(-1)![0]))
    expect(forwarded.searchParams.has('organizationId')).toBe(false)
    expect(forwarded.searchParams.has('role')).toBe(false)
    expect(forwarded.searchParams.has('userId')).toBe(route === 'organization/history')
    expect(response.headers.get('cache-control')).toContain('no-store')
  }
  for (const method of ['POST', 'DELETE', 'PUT', 'PATCH']) expect((await proxyAuth(new Request('http://localhost/api/v1/usage/me', { method }), ['usage', 'me'])).status).toBe(404)
  expect((await proxyAuth(new Request('http://localhost/api/v1/usage/other'), ['usage', 'other'])).status).toBe(404)
  expect(upstreamFetch).toHaveBeenCalledTimes(4)
})

it('forwards only audit read queries with explicit enablement and drops tenant selectors', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{}')); vi.stubGlobal('fetch', fetch)
  const url = 'http://localhost/api/v1/audit/events?limit=50&cursor=opaque&action=auth.login&outcome=succeeded&organizationId=other&actorUserId=other'
  expect((await proxyAuth(new Request(url), ['audit', 'events'])).status).toBe(404)
  vi.stubEnv('VIREXA_AUDIT_EVENTS', '1')
  expect((await proxyAuth(new Request(url, { method: 'POST' }), ['audit', 'events'])).status).toBe(404)
  expect((await proxyAuth(new Request(url), ['audit', 'events'])).status).toBe(200)
  const target = fetch.mock.calls[0][0] as URL
  expect([...target.searchParams.keys()]).toEqual(['limit', 'cursor', 'action', 'outcome'])
  expect(fetch.mock.calls[0][1].cache).toBe('no-store')
})
