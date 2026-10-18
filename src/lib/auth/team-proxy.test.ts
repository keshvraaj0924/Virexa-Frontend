import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { proxyAuth } from './proxy'
const id = 'a2345678-1234-1234-1234-123456789abc'
beforeEach(() => { vi.stubEnv('VIREXA_AUTH_CANDIDATE', '1'); vi.stubEnv('AUTH_API_ORIGIN', 'http://127.0.0.1:4000'); vi.stubEnv('NEXT_PUBLIC_API_URL', '/api/v1') })
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
it('requires team opt-in and exposes no invitations, creation, reset or deletion', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  expect((await proxyAuth(new Request('http://localhost'), ['organization', 'members'])).status).toBe(404)
  vi.stubEnv('VIREXA_TEAM_ADMINISTRATION', '1')
  for (const [path, method] of [[['organization', 'members'], 'POST'], [['organization', 'invitations'], 'POST'], [['organization', 'members', id], 'DELETE'], [['organization', 'members', id, 'password'], 'PATCH']] as const) expect((await proxyAuth(new Request('http://localhost', { method }), [...path])).status).toBe(404)
  expect(fetch).not.toHaveBeenCalled()
})
it('filters scope hints and forwards origin and expectedVersion without broadening trust', async () => {
  vi.stubEnv('VIREXA_TEAM_ADMINISTRATION', '1')
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ data: {} }))); vi.stubGlobal('fetch', fetch)
  await proxyAuth(new Request('http://localhost/api/v1/organization/members?limit=25&cursor=abc&organizationId=other'), ['organization', 'members'])
  expect(String(fetch.mock.calls[0][0])).toBe('http://127.0.0.1:4000/api/v1/organization/members?limit=25&cursor=abc')
  const body = '{"expectedVersion":1,"role":"viewer"}'
  await proxyAuth(new Request('http://localhost', { method: 'PATCH', body, headers: { Origin: 'http://localhost' } }), ['organization', 'members', id, 'role'])
  expect(new TextDecoder().decode(fetch.mock.calls[1][1].body)).toBe(body)
  expect(fetch.mock.calls[1][1].headers.get('origin')).toBe('http://localhost')
})
