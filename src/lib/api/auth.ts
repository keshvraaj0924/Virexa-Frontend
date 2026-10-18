import type { ApiFailure, ApiMeta, ApiSuccess } from '../../contracts/api'
import type { ActiveSession, ApiErrorCode, AuthSession, LoginRequest, RegisterRequest, RevokeOtherSessionsResult, SignupDetails, SignupChallenge, SignupProof, SignupCompletion } from '../../contracts/auth'

import { notifyAccessDenied } from '@/lib/auth/access-events'

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

function createRequestId(): string | undefined {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : undefined
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const requestId = createRequestId()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(requestId ? { 'X-Request-ID': requestId } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    notifyAccessDenied(response.status)
    const payload = (await response.json().catch(() => null)) as ApiFailure | null
    const retryAfterHeader = response.headers.get('Retry-After')
    const parsedRetryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : undefined
    const retryAfterSeconds = typeof parsedRetryAfterSeconds === 'number'
      && Number.isFinite(parsedRetryAfterSeconds)
      && parsedRetryAfterSeconds >= 0
      ? parsedRetryAfterSeconds
      : undefined
    throw new ApiRequestError(payload?.error?.message ?? 'Request failed', {
      code: payload?.error?.code ?? 'UNKNOWN_ERROR',
      requestId: payload?.error?.requestId,
      retryAfterSeconds,
    })
  }
  return response.json() as Promise<T>
}

export const authApi = {
  session: (signal?: AbortSignal) => request<ApiSuccess<AuthSession>>('/auth/session', { signal }),
  me: () => request<ApiSuccess<AuthSession>>('/me'),
  activeSessions: (cursor?: string) => request<ApiSuccess<ActiveSession[]>>(`/auth/sessions?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, { cache: 'no-store' }),
  login: (input: LoginRequest) => request<ApiSuccess<AuthSession>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  register: (input: RegisterRequest) => request<ApiSuccess<AuthSession>>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  startSignup: (input: SignupDetails, signal?: AbortSignal) => request<ApiSuccess<SignupChallenge>>('/auth/signup/start', { signal, method: 'POST', body: JSON.stringify(input) }),
  verifySignup: (input: { challengeId: string; code: string }, signal?: AbortSignal) => request<ApiSuccess<SignupProof>>('/auth/signup/verify', { signal, method: 'POST', body: JSON.stringify(input) }),
  completeSignup: (input: SignupCompletion, signal?: AbortSignal) => request<ApiSuccess<AuthSession>>('/auth/signup/complete', { signal, method: 'POST', body: JSON.stringify(input) }),
  logout: () => request<ApiSuccess<{ success: boolean }>>('/auth/logout', { method: 'POST' }),
  revokeOtherSessions: () => request<ApiSuccess<RevokeOtherSessionsResult>>('/auth/sessions/revoke-others', { method: 'POST' }),
  revokeSession: (sessionId: string) => request<ApiSuccess<{ success: boolean }>>(`/auth/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    cache: 'no-store',
  }),
}

export type AuthApiResponse = ApiSuccess<AuthSession>
export type AuthRequestMeta = ApiMeta

