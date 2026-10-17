import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { proxyDocuments } from './document-proxy'
const id = '12345678-1234-1234-1234-123456789abc'
const content = ['documents', id, 'uploads', id, 'content']
function request(path: string[], method = 'GET', body?: BodyInit, extra: Record<string, string> = {}) {
  return new Request(`http://127.0.0.1:3000/api/v1/${path.join('/')}`, { method, body, headers: { Cookie: 'virexa_session=opaque', Origin: 'http://127.0.0.1:3000', 'Content-Type': method === 'PUT' ? 'application/pdf' : 'application/json', ...extra }, ... (body instanceof ReadableStream ? { duplex: 'half' } : {}) })
}
beforeEach(() => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '1'); vi.stubEnv('VIREXA_DOCUMENT_INTAKE', '1')
  vi.stubEnv('AUTH_API_ORIGIN', 'http://127.0.0.1:4000'); vi.stubEnv('PUBLIC_API_ORIGIN', 'http://127.0.0.1:3000'); vi.stubEnv('NEXT_PUBLIC_API_URL', '/api/v1')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
describe('private quarantine proxy boundary', () => {
  it('requires both capabilities and never enables download or extraction', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    for (const path of [['documents', id, 'download'], ['documents', id, 'extractions'], ['documents', '..', 'auth'], ['documents', id, 'uploads', 'bad', 'content']]) expect((await proxyDocuments(request(path), path)).status).toBe(404)
    expect((await proxyDocuments(request(['documents'], 'DELETE'), ['documents'])).status).toBe(404)
    for (const flag of ['VIREXA_AUTH_CANDIDATE', 'VIREXA_DOCUMENT_INTAKE']) {
      vi.stubEnv(flag, ''); expect((await proxyDocuments(request(['documents']), ['documents'])).status).toBe(404); vi.stubEnv(flag, '1')
    }
    expect(fetch).not.toHaveBeenCalled()
  })
  it('rejects missing cookie and untrusted/missing origin without forwarding', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    for (const origin of ['', 'https://evil.example']) expect((await proxyDocuments(request(content, 'PUT', 'abc', { Origin: origin, 'X-Forwarded-Host': '127.0.0.1:3000' }), content)).status).toBe(403)
    expect((await proxyDocuments(request(['documents'], 'GET', undefined, { Cookie: '' }), ['documents'])).status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('streams bytes with tightly scoped headers and no redirects', async () => {
    const fetch = vi.fn(async (_url, init) => {
      expect(init.body).toBeInstanceOf(ReadableStream)
      expect(await new Response(init.body).text()).toBe('%PDF-synthetic')
      expect(init.headers.has('authorization')).toBe(false)
      expect(init.headers.has('x-forwarded-host')).toBe(false)
      expect(init.headers.get('cookie')).toBe('virexa_session=opaque')
      expect(init.redirect).toBe('manual'); expect(init.duplex).toBe('half')
      return new Response(null, { status: 204 })
    }); vi.stubGlobal('fetch', fetch)
    expect((await proxyDocuments(request(content, 'PUT', '%PDF-synthetic', { Authorization: 'discard', 'X-Forwarded-Host': 'evil.example' }), content)).status).toBe(204)
  })
  it('bounds declared lengths and rejects unsupported types', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    expect((await proxyDocuments(request(content, 'PUT', 'abc', { 'Content-Length': String(25 * 1024 * 1024 + 1) }), content)).status).toBe(413)
    expect((await proxyDocuments(request(content, 'PUT', 'abc', { 'Content-Type': 'text/html' }), content)).status).toBe(415)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('bounds streamed bytes even without content length', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => { await new Response(init.body).arrayBuffer(); return new Response(null, { status: 204 }) }))
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(25 * 1024 * 1024)); controller.enqueue(new Uint8Array(1)); controller.close() } })
    expect((await proxyDocuments(request(content, 'PUT', stream), content)).status).toBe(413)
  })
  it('forwards only list query parameters and rejects query smuggling', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"data":{}}')); vi.stubGlobal('fetch', fetch)
    const req = new Request('http://127.0.0.1:3000/api/v1/documents?limit=50&cursor=opaque', { headers: { Cookie: 'virexa_session=opaque' } })
    expect((await proxyDocuments(req, ['documents'])).status).toBe(200)
    expect(String(fetch.mock.calls[0][0])).toBe('http://127.0.0.1:4000/api/v1/documents?limit=50&cursor=opaque')
    for (const query of ['organizationId=other', 'limit=1&limit=2']) expect((await proxyDocuments(new Request(`http://localhost/api/v1/documents?${query}`, { headers: { Cookie: 'x=y' } }), ['documents'])).status).toBe(400)
  })
  it('hides redirects and private errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { Location: 'https://evil.example' } })))
    expect((await proxyDocuments(request(['documents']), ['documents'])).status).toBe(502)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private storage path')))
    expect(await (await proxyDocuments(request(['documents']), ['documents'])).text()).not.toContain('private storage path')
  })
})
it('aborts an unconsumed redirect response and strips upstream cookies', async () => {
  let upstreamSignal: AbortSignal | undefined
  vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
    upstreamSignal = init.signal
    return new Response('unread redirect body', { status: 302, headers: { Location: 'https://evil.example' } })
  }))
  expect((await proxyDocuments(request(['documents']), ['documents'])).status).toBe(502)
  expect(upstreamSignal?.aborted).toBe(true)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { headers: { 'Set-Cookie': 'unexpected=credential; HttpOnly', 'X-Private': 'storage' } })))
  const response = await proxyDocuments(request(['documents']), ['documents'])
  expect(response.headers.has('set-cookie')).toBe(false)
  expect(response.headers.has('x-private')).toBe(false)
})
it('cancels oversized upstream JSON without buffering it all', async () => {
  const cancel = vi.fn()
  let calls = 0
  const stream = new ReadableStream({ pull(controller) { calls++; controller.enqueue(new Uint8Array(600000)) }, cancel })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream)))
  expect((await proxyDocuments(request(['documents']), ['documents'])).status).toBe(502)
  expect(cancel).toHaveBeenCalledOnce()
  expect(calls).toBeLessThanOrEqual(3)
})
it('propagates client abort to the upstream and incoming stream', async () => {
  const abort = new AbortController()
  const cancel = vi.fn()
  let ready!: () => void
  const started = new Promise<void>(resolve => { ready = resolve })
  vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise((_resolve, reject) => { init.signal.addEventListener('abort', () => reject(new Error('aborted'))); ready() })))
  const req = new Request(`http://localhost/api/v1/${content.join('/')}`, { method: 'PUT', headers: { Cookie: 'session=x', Origin: 'http://127.0.0.1:3000', 'Content-Type': 'application/pdf' }, body: new ReadableStream({ cancel }), signal: abort.signal, duplex: 'half' } as RequestInit)
  const response = proxyDocuments(req, content)
  await started; abort.abort()
  expect((await response).status).toBe(503)
  expect(cancel).toHaveBeenCalledOnce()
})
it('enforces an upstream deadline and cleans up pending reads', async () => {
  vi.useFakeTimers()
  try {
    vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise((_resolve, reject) => { init.signal.addEventListener('abort', () => reject(new Error('timed out'))) })))
    const response = proxyDocuments(request(['documents']), ['documents'])
    await vi.advanceTimersByTimeAsync(10000)
    expect((await response).status).toBe(503)
    expect(vi.getTimerCount()).toBe(0)
  } finally { vi.useRealTimers() }
})
