export type ApiMeta = {
  requestId: string
  timestamp: string
}

export type ApiEnvelope<T> = {
  data: T
  meta: ApiMeta
}

export type ApiFieldErrors = Record<string, string[]>

export type ApiErrorEnvelope = {
  error: {
    code: string
    message: string
    requestId: string
    fieldErrors?: ApiFieldErrors
  }
  meta: ApiMeta
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
    public readonly fieldErrors?: ApiFieldErrors,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

function createRequestId(): string | undefined {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return undefined
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const requestId = createRequestId()
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  headers.set('Content-Type', 'application/json')
  if (requestId) headers.set('X-Request-ID', requestId)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | ApiErrorEnvelope | null
  if (!response.ok) {
    if (payload && 'error' in payload) {
      throw new ApiClientError(response.status, payload.error.code, payload.error.message, payload.error.requestId, payload.error.fieldErrors)
    }
    throw new ApiClientError(response.status, 'REQUEST_FAILED', 'Request failed')
  }
  if (!payload || !('data' in payload) || !('meta' in payload)) {
    throw new ApiClientError(response.status, 'INVALID_RESPONSE', 'Invalid API response')
  }
  return payload
}
