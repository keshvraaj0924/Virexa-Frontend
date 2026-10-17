import { candidateOrigin } from './candidate-config'
/** Opt-in, bounded proxy for the isolated Python candidate. Never routes to Node. */
const noStore = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }
function failure(status: number, code: string, message: string) {
  const requestId = crypto.randomUUID()
  return Response.json({ error: { code, message, requestId }, meta: { requestId, timestamp: new Date().toISOString() } }, { status, headers: noStore })
}
export async function proxyAuth(request: Request, segments: string[]) {
  if (process.env.VIREXA_AUTH_CANDIDATE !== '1') return failure(404, 'NOT_FOUND', 'Not found.')
  const upstream = candidateOrigin()
  if (!upstream) return failure(503, 'CONFIGURATION_ERROR', 'Authentication preview is not configured.')
  const path = segments.join('/')
  const allowed = request.method === 'GET'
    ? ['auth/session', 'me'].includes(path) || /^organizations\/[0-9a-f-]{36}$/i.test(path)
    : request.method === 'POST' && ['auth/login', 'auth/register', 'auth/logout'].includes(path)
  if (!allowed) return failure(404, 'FEATURE_UNAVAILABLE', 'This endpoint is unavailable in the authentication preview.')
  const headers = new Headers({ Accept: 'application/json' })
  // Forward the original Origin, never synthesize trust from Host or forwarded headers.
  for (const name of ['origin', 'cookie', 'content-type', 'x-request-id']) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  let body: Uint8Array | undefined
  if (request.method === 'POST' && request.body) {
    const reader = request.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 16384) { await reader.cancel(); return failure(413, 'PAYLOAD_TOO_LARGE', 'Request is too large.') }
      chunks.push(value)
    }
    body = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length }
  }
  try {
    const response = await fetch(new URL(`/api/v1/${path}`, upstream), { method: request.method, headers, body: body as BodyInit | undefined, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(10000) })
    // Never follow redirects with credentials or leak upstream redirect destinations.
    if (response.status >= 300 && response.status < 400) return failure(502, 'UPSTREAM_ERROR', 'Authentication service returned an invalid response.')
    const outgoing = new Headers(noStore)
    for (const name of ['content-type', 'x-request-id', 'retry-after']) {
      const value = response.headers.get(name)
      if (value) outgoing.set(name, value)
    }
    for (const cookie of response.headers.getSetCookie()) outgoing.append('Set-Cookie', cookie)
    return new Response(response.body, { status: response.status, headers: outgoing })
  } catch {
    return failure(503, 'DEPENDENCY_UNAVAILABLE', 'Authentication service is unavailable. Please try again.')
  }
}
