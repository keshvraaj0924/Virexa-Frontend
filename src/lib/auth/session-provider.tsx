'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { AuthenticatedContext } from '@/contracts/auth'
import { authApi, AuthApiError } from '@/lib/api/auth'

type SessionState =
  | { status: 'loading'; context: null }
  | { status: 'authenticated'; context: AuthenticatedContext }
  | { status: 'unauthenticated'; context: null }
  | { status: 'error'; context: null; message: string }

interface SessionContextValue {
  state: SessionState
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter()
  const [state, setState] = useState<SessionState>({ status: 'loading', context: null })

  const refresh = async () => {
    setState({ status: 'loading', context: null })
    try {
      const response = await authApi.me()
      setState({ status: 'authenticated', context: response.data })
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 401) {
        setState({ status: 'unauthenticated', context: null })
        return
      }
      setState({ status: 'error', context: null, message: error instanceof Error ? error.message : 'Unable to load your session.' })
    }
  }

  useEffect(() => { void refresh() }, [])

  const logout = async () => {
    await authApi.logout()
    setState({ status: 'unauthenticated', context: null })
    router.replace('/login')
    router.refresh()
  }

  const value = useMemo(() => ({ state, refresh, logout }), [state])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used inside SessionProvider')
  return context
}
