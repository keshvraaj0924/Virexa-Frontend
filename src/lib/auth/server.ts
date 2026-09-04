import { headers } from 'next/headers'
import type { ApiSuccess } from '@/contracts/api'
import type { AuthSession } from '@/contracts/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

export async function getServerSession(): Promise<AuthSession | null> {
  const requestHeaders = await headers()
  const cookie = requestHeaders.get('cookie')
  if (!cookie) return null

  const response = await fetch(`${API_BASE_URL}/auth/session`, {
    headers: { Cookie: cookie, 'X-Request-ID': crypto.randomUUID() },
    cache: 'no-store',
  })
  if (!response.ok) return null

  const payload = await response.json() as ApiSuccess<AuthSession>
  return payload.data
}
