import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { proxyAuth } from './proxy'
const id = 'a2345678-1234-1234-1234-123456789abc'
beforeEach(() => { vi.stubEnv('VIREXA_AUTH_CANDIDATE', '1'); vi.stubEnv('AUTH_API_ORIGIN', 'http://127.0.0.1:4000'); vi.stubEnv('NEXT_PUBLIC_API_URL', '/api/v1') })
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
it('is disabled by default and allows no execution or deletion', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  expect((await proxyAuth(new Request('http://localhost'), ['workflows'])).status).toBe(404)
  vi.stubEnv('VIREXA_WORKFLOW_RECORDS', '1')
  for (const [path, method] of [[['workflows', id, 'execute'], 'POST'], [['workflows', id], 'DELETE'], [['workflows', '..'], 'GET']] as const) expect((await proxyAuth(new Request('http://localhost', { method }), [...path])).status).toBe(404)
  expect(fetch).not.toHaveBeenCalled()
})
it('preserves create keys and bounded patch bytes while filtering tenant hints', async () => {
  vi.stubEnv('VIREXA_WORKFLOW_RECORDS', '1')
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ data: {} }))); vi.stubGlobal('fetch', fetch)
  await proxyAuth(new Request('http://localhost/api/v1/workflows?status=draft&limit=24&cursor=abc&organizationId=other'), ['workflows'])
  expect(String(fetch.mock.calls[0][0])).toBe('http://127.0.0.1:4000/api/v1/workflows?limit=24&cursor=abc&status=draft')
  const body = '{"expectedVersion":1,"name":"Review"}'
  await proxyAuth(new Request('http://localhost', { method: 'PATCH', body, headers: { Origin: 'http://localhost', 'Idempotency-Key': 'same-key' } }), ['workflows', id])
  expect(new TextDecoder().decode(fetch.mock.calls[1][1].body)).toBe(body)
  expect(fetch.mock.calls[1][1].headers.get('idempotency-key')).toBe('same-key')
  expect((await proxyAuth(new Request('http://localhost', { method: 'PATCH', body: 'x'.repeat(16385) }), ['workflows', id])).status).toBe(413)
  expect(fetch).toHaveBeenCalledTimes(2)
})
