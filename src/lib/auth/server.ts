import { headers } from 'next/headers'
import type { ApiSuccess } from '@/contracts/api'
import type { AuthenticatedContext, AuthSession } from '@/contracts/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

async function authenticatedServerRequest<T>(path: string): Promise<T | null> {
  const requestHeaders = await headers()
  const cookie = requestHeaders.get('cookie')
  if (!cookie) return null

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Cookie: cookie, 'X-Request-ID': crypto.randomUUID() },
    cache: 'no-store',
  })
  if (!response.ok) return null

  const payload = await response.json() as ApiSuccess<T>
  return payload.data
}

export async function getServerSession(): Promise<AuthSession | null> {
  return authenticatedServerRequest<AuthSession>('/auth/session')
}

export async function getServerAuthenticatedContext(): Promise<AuthenticatedContext | null> {
  return authenticatedServerRequest<AuthenticatedContext>('/me')
}
