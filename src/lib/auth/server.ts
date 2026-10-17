import { candidateOrigin } from './candidate-config'
import { headers } from 'next/headers'
import type { ApiSuccess } from '@/contracts/api'
import type { AuthenticatedContext, AuthSession } from '@/contracts/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

async function authenticatedServerRequest<T>(path: string): Promise<T | null> {
  const requestHeaders = await headers()
  const cookie = requestHeaders.get('cookie')
  if (!cookie) return null

  const candidate = process.env.VIREXA_AUTH_CANDIDATE === '1'
  const origin = candidate ? candidateOrigin() : null
  if (candidate && !origin) return null
  try {
    const response = await fetch(candidate ? new URL(`/api/v1${path}`, origin!) : `${API_BASE_URL}${path}`, {
      headers: { Cookie: cookie, 'X-Request-ID': crypto.randomUUID() },
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return null

    const payload = await response.json() as ApiSuccess<T>
    return payload.data ?? null
  } catch {
    // Fail closed without exposing upstream infrastructure or cookie details.
    return null
  }
}

export async function getServerSession(): Promise<AuthSession | null> {
  return authenticatedServerRequest<AuthSession>('/auth/session')
}

export async function getServerAuthenticatedContext(): Promise<AuthenticatedContext | null> {
  return authenticatedServerRequest<AuthenticatedContext>('/me')
}

