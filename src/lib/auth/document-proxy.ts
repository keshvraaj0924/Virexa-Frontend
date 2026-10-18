import { candidateOrigin } from './candidate-config'

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const DOCUMENT_PATH = new RegExp(`^documents/${UUID_PATTERN}$`, 'i')
const UPLOAD_PATH = new RegExp(`^documents/${UUID_PATTERN}/uploads(?:/${UUID_PATTERN}/complete)?$`, 'i')
const CONTENT_PATH = new RegExp(`^documents/${UUID_PATTERN}/uploads/${UUID_PATTERN}/content$`, 'i')
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const MAX_METADATA_BYTES = 16 * 1024
const MAX_RESPONSE_BYTES = 1024 * 1024
const UPLOAD_TIMEOUT_MS = 60_000
const METADATA_TIMEOUT_MS = 10_000
const ALLOWED_MEDIA_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
const LIST_QUERY_KEYS = ['cursor', 'status', 'limit']
const FORWARDED_HEADERS = ['origin', 'cookie', 'content-type', 'idempotency-key']
const noStore = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
}

function failure(status: number, code: string): Response {
  const requestId = crypto.randomUUID()
  return Response.json({
    error: { code, message: 'Document intake request could not be completed.', requestId },
    meta: { requestId, timestamp: new Date().toISOString() },
  }, { status, headers: noStore })
}

function isAllowedRoute(method: string, path: string): boolean {
  switch (method) {
    case 'GET':
      return path === 'documents' || DOCUMENT_PATH.test(path)
    case 'POST':
      return path === 'documents' || UPLOAD_PATH.test(path)
    case 'PUT':
      return CONTENT_PATH.test(path)
    default:
      return false
  }
}

// Returns null on overflow; uploaded file bytes never enter this response buffer.
async function readBoundedResponse(response: Response): Promise<string | null> {
  const reader = response.body?.getReader()
  let responseSize = 0
  const chunks: Uint8Array[] = []
  if (reader) {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      responseSize += next.value.byteLength
      if (responseSize > MAX_RESPONSE_BYTES) {
        await reader.cancel()
        return null
      }
      chunks.push(next.value)
    }
  }
  const bytes = new Uint8Array(responseSize)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

export async function proxyDocuments(request: Request, segments: string[]): Promise<Response> {
  if (process.env.VIREXA_AUTH_CANDIDATE !== '1' || process.env.VIREXA_DOCUMENT_INTAKE !== '1') {
    return failure(404, 'FEATURE_UNAVAILABLE')
  }
  const path = segments.join('/')
  if (!isAllowedRoute(request.method, path)) return failure(404, 'FEATURE_UNAVAILABLE')
  const isContentUpload = request.method === 'PUT' && CONTENT_PATH.test(path)
  const upstream = candidateOrigin()
  if (!upstream) return failure(503, 'CONFIGURATION_ERROR')
  if (request.method !== 'GET') {
    // Trust only explicit server configuration; Host/X-Forwarded-* never grant authority.
    const trustedOrigin = process.env.PUBLIC_API_ORIGIN
    if (!trustedOrigin || request.headers.get('origin') !== trustedOrigin) {
      return failure(403, 'UNTRUSTED_ORIGIN')
    }
  }
  if (!request.headers.get('cookie')) return failure(401, 'UNAUTHENTICATED')

  const target = new URL(`/api/v1/${path}`, upstream)
  const query = new URL(request.url).searchParams
  if (path === 'documents' && request.method === 'GET') {
    for (const [key, value] of query) {
      if (!LIST_QUERY_KEYS.includes(key) || query.getAll(key).length !== 1 || value.length > 2048) {
        return failure(400, 'INVALID_QUERY')
      }
      target.searchParams.set(key, value)
    }
  } else if (query.size) {
    return failure(400, 'INVALID_QUERY')
  }

  const headers = new Headers({ Accept: 'application/json' })
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  if (isContentUpload && !ALLOWED_MEDIA_TYPES.includes(headers.get('content-type') ?? '')) {
    return failure(415, 'UNSUPPORTED_MEDIA_TYPE')
  }
  const bodyLimit = isContentUpload ? MAX_UPLOAD_BYTES : MAX_METADATA_BYTES
  const declaredLength = request.headers.get('content-length')
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > bodyLimit)) {
    return failure(413, 'PAYLOAD_TOO_LARGE')
  }

  const controller = new AbortController()
  const abortUpstream = () => controller.abort()
  const timeoutMs = isContentUpload ? UPLOAD_TIMEOUT_MS : METADATA_TIMEOUT_MS
  const timer = setTimeout(abortUpstream, timeoutMs)
  request.signal.addEventListener('abort', abortUpstream, { once: true })
  if (request.signal.aborted) controller.abort()
  let exceededBodyLimit = false
  let receivedBytes = 0
  const reader = request.body?.getReader()
  const cancelIncomingBody = () => {
    // Cancellation may race an already failed read; cleanup must not mask its error.
    void reader?.cancel().catch(() => {})
  }
  controller.signal.addEventListener('abort', cancelIncomingBody, { once: true })
  const body = reader ? new ReadableStream<Uint8Array>({
    async pull(stream) {
      try {
        const next = await reader.read()
        if (controller.signal.aborted) {
          stream.error(new Error('Request aborted'))
          return
        }
        if (next.done) {
          stream.close()
          return
        }
        receivedBytes += next.value.byteLength
        if (receivedBytes > bodyLimit) {
          exceededBodyLimit = true
          stream.error(new Error('Payload too large'))
          controller.abort()
          return
        }
        stream.enqueue(next.value)
      } catch {
        stream.error(new Error('Request interrupted'))
      }
    },
    cancel() {
      cancelIncomingBody()
      controller.abort()
    },
  }) : undefined

  try {
    const init: RequestInit & { duplex?: 'half' } = {
      method: request.method,
      headers,
      body,
      duplex: body ? 'half' : undefined,
      redirect: 'manual',
      cache: 'no-store',
      signal: controller.signal,
    }
    const response = await fetch(target, init)
    if (exceededBodyLimit) return failure(413, 'PAYLOAD_TOO_LARGE')
    if (response.status >= 300 && response.status < 400) return failure(502, 'UPSTREAM_ERROR')
    // Keep the deadline active until the bounded upstream response is consumed.
    const payload = await readBoundedResponse(response)
    if (payload === null) return failure(502, 'UPSTREAM_ERROR')
    return new Response(response.status === 204 ? null : payload, {
      status: response.status,
      headers: { ...noStore, 'Content-Type': 'application/json' },
    })
  } catch {
    return exceededBodyLimit
      ? failure(413, 'PAYLOAD_TOO_LARGE')
      : failure(503, 'DEPENDENCY_UNAVAILABLE')
  } finally {
    controller.abort()
    clearTimeout(timer)
    request.signal.removeEventListener('abort', abortUpstream)
    controller.signal.removeEventListener('abort', cancelIncomingBody)
    cancelIncomingBody()
  }
}
