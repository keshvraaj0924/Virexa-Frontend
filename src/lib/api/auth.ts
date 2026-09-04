import type { ApiFailure, ApiMeta, ApiSuccess } from '../../contracts/api'
import type { ApiErrorCode, AuthSession, LoginRequest, RegisterRequest } from '../../contracts/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

export class ApiRequestError extends Error {
  readonly code: ApiErrorCode | 'UNKNOWN_ERROR'
  readonly requestId?: string
  readonly retryAfterSeconds?: number

  constructor(message: string, options: { code: ApiErrorCode | 'UNKNOWN_ERROR'; requestId?: string; retryAfterSeconds?: number }) {
    super(message)
    this.name = 'ApiRequestError'
    this.code = options.code
    this.requestId = options.requestId
    this.retryAfterSeconds = options.retryAfterSeconds
  }
}

function createRequestId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': createRequestId(),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiFailure | null
    const retryAfterHeader = response.headers.get('Retry-After')
    const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : undefined
    throw new ApiRequestError(payload?.error.message ?? 'Request failed', {
      code: payload?.error.code ?? 'UNKNOWN_ERROR',
      requestId: payload?.error.requestId,
      retryAfterSeconds: Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0 ? retryAfterSeconds : undefined,
    })
  }
  return response.json() as Promise<T>
}

export const authApi = {
  session: () => request<ApiSuccess<AuthSession>>('/auth/session'),
  me: () => request<ApiSuccess<AuthSession>>('/me'),
  login: (input: LoginRequest) => request<ApiSuccess<AuthSession>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  register: (input: RegisterRequest) => request<ApiSuccess<AuthSession>>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  logout: () => request<ApiSuccess<{ success: boolean }>>('/auth/logout', { method: 'POST' }),
}

export type AuthApiResponse = ApiSuccess<AuthSession>
export type AuthRequestMeta = ApiMeta
