import { candidateOrigin } from './candidate-config'
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const MAX_BYTES = 25 * 1024 * 1024
const noStore = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }
function fail(status: number, code: string) {
  const requestId = crypto.randomUUID()
  return Response.json({ error: { code, message: 'Document intake request could not be completed.', requestId }, meta: { requestId, timestamp: new Date().toISOString() } }, { status, headers: noStore })
}
export async function proxyDocuments(request: Request, segments: string[]) {
  if (process.env.VIREXA_AUTH_CANDIDATE !== '1' || process.env.VIREXA_DOCUMENT_INTAKE !== '1') return fail(404, 'FEATURE_UNAVAILABLE')
  const path = segments.join('/')
  const isContent = request.method === 'PUT' && new RegExp(`^documents/${UUID}/uploads/${UUID}/content$`, 'i').test(path)
  const allowed = isContent || (request.method === 'GET' && (path === 'documents' || new RegExp(`^documents/${UUID}$`, 'i').test(path))) || (request.method === 'POST' && (path === 'documents' || new RegExp(`^documents/${UUID}/uploads(?:/${UUID}/complete)?$`, 'i').test(path)))
  if (!allowed) return fail(404, 'FEATURE_UNAVAILABLE')
  const upstream = candidateOrigin()
  if (!upstream) return fail(503, 'CONFIGURATION_ERROR')
  if (request.method !== 'GET') {
    // Trust only explicit server configuration; Host/X-Forwarded-* never grant authority.
    const trusted = process.env.PUBLIC_API_ORIGIN
    if (!trusted || request.headers.get('origin') !== trusted) return fail(403, 'UNTRUSTED_ORIGIN')
  }
  if (!request.headers.get('cookie')) return fail(401, 'UNAUTHENTICATED')
  const target = new URL(`/api/v1/${path}`, upstream)
  const query = new URL(request.url).searchParams
  if (path === 'documents' && request.method === 'GET') {
    for (const [key, value] of query) {
      if (!['cursor', 'status', 'limit'].includes(key) || query.getAll(key).length !== 1 || value.length > 2048) return fail(400, 'INVALID_QUERY')
      target.searchParams.set(key, value)
    }
  } else if (query.size) return fail(400, 'INVALID_QUERY')
  const headers = new Headers({ Accept: 'application/json' })
  for (const name of ['origin', 'cookie', 'content-type', 'idempotency-key']) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  if (isContent && !['application/pdf', 'image/png', 'image/jpeg'].includes(headers.get('content-type') ?? '')) return fail(415, 'UNSUPPORTED_MEDIA_TYPE')
  const limit = isContent ? MAX_BYTES : 16384
  const length = request.headers.get('content-length')
  if (length && (!/^\d+$/.test(length) || Number(length) > limit)) return fail(413, 'PAYLOAD_TOO_LARGE')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), isContent ? 60000 : 10000)
  const abort = () => controller.abort()
  request.signal.addEventListener('abort', abort, { once: true })
  if (request.signal.aborted) controller.abort()
  let exceeded = false
  let size = 0
  const reader = request.body?.getReader()
  const cancel = () => { void reader?.cancel().catch(() => {}) }
  controller.signal.addEventListener('abort', cancel, { once: true })
  const body = reader ? new ReadableStream<Uint8Array>({
    async pull(stream) {
      try {
        const next = await reader.read()
        if (controller.signal.aborted) { stream.error(new Error('Request aborted')); return }
        if (next.done) { stream.close(); return }
        size += next.value.byteLength
        if (size > limit) { exceeded = true; stream.error(new Error('Payload too large')); controller.abort(); return }
        stream.enqueue(next.value)
      } catch { stream.error(new Error('Request interrupted')) }
    },
    cancel() { cancel(); controller.abort() },
  }) : undefined
  try {
    const init: RequestInit & { duplex?: 'half' } = { method: request.method, headers, body, duplex: body ? 'half' : undefined, redirect: 'manual', cache: 'no-store', signal: controller.signal }
    const response = await fetch(target, init)
    if (exceeded) return fail(413, 'PAYLOAD_TOO_LARGE')
    if (response.status >= 300 && response.status < 400) return fail(502, 'UPSTREAM_ERROR')
    // Buffer only the bounded JSON response, never uploaded file bytes; keep timeout active until consumed.
    const responseReader = response.body?.getReader()
    let responseSize = 0
    const chunks: Uint8Array[] = []
    if (responseReader) {
      while (true) {
        const next = await responseReader.read()
        if (next.done) break
        responseSize += next.value.byteLength
        if (responseSize > 1024 * 1024) { await responseReader.cancel(); return fail(502, 'UPSTREAM_ERROR') }
        chunks.push(next.value)
      }
    }
    const bytes = new Uint8Array(responseSize)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    const payload = new TextDecoder().decode(bytes)
    return new Response(response.status === 204 ? null : payload, { status: response.status, headers: { ...noStore, 'Content-Type': 'application/json' } })
  } catch { return fail(exceeded ? 413 : 503, exceeded ? 'PAYLOAD_TOO_LARGE' : 'DEPENDENCY_UNAVAILABLE') }
  finally { clearTimeout(timer); request.signal.removeEventListener('abort', abort); controller.signal.removeEventListener('abort', cancel); cancel() }
}
