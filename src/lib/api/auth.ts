import type { ApiFailure, ApiMeta, ApiSuccess, AuthSession, LoginRequest, RegisterRequest } from '../../contracts/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiFailure | null
    throw new Error(payload?.error.message ?? 'Request failed')
  }
  return response.json() as Promise<T>
}

export const authApi = {
  session: () => request<ApiSuccess<AuthSession>>('/auth/session'),
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
