'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { parseEffectivePermissions, type Capability, type EffectivePermissions } from '@/contracts/capabilities'
import { ACCESS_INVALIDATED } from '@/lib/auth/access-events'

type AccessState = {
  permissions: EffectivePermissions | null
  loading: boolean
  error: boolean
  allows: (capability: Capability) => boolean
  refresh: () => Promise<void>
}
const AccessContext = createContext<AccessState | null>(null)
export function useAccess() { return useContext(AccessContext) }

export function AccessProvider({ initial, children }: { initial: EffectivePermissions | null; children: ReactNode }) {
  const [permissions, setPermissions] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(!initial)
  const controller = useRef<AbortController | null>(null)
  const pathname = usePathname()
  const refresh = useCallback(async () => {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setLoading(true)
    setError(false)
    try {
      const response = await fetch('/api/v1/me/permissions', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.any([request.signal, AbortSignal.timeout(10000)]) })
      if (!response.ok) throw new Error('Permissions unavailable')
      const payload: unknown = await response.json()
      const parsed = parseEffectivePermissions(payload && typeof payload === 'object' && 'data' in payload ? payload.data : null)
      if (!parsed) throw new Error('Invalid permission response')
      if (!request.signal.aborted) setPermissions(parsed)
    } catch {
      if (!request.signal.aborted) { setPermissions(null); setError(true) }
    } finally {
      if (!request.signal.aborted) setLoading(false)
    }
  }, [])
  useEffect(() => {
    void refresh()
    const invalidate = () => { setPermissions(null); void refresh() }
    const checkCurrent = () => { void refresh() }
    const visible = () => { if (document.visibilityState === 'visible') checkCurrent() }
    window.addEventListener(ACCESS_INVALIDATED, invalidate)
    window.addEventListener('focus', checkCurrent)
    document.addEventListener('visibilitychange', visible)
    return () => {
      controller.current?.abort()
      window.removeEventListener(ACCESS_INVALIDATED, invalidate)
      window.removeEventListener('focus', checkCurrent)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [refresh, pathname])
  return <AccessContext.Provider value={{ permissions, loading, error, allows: capability => permissions?.capabilities.includes(capability) ?? false, refresh }}>{children}</AccessContext.Provider>
}

export function AccessDenied({ subject }: { subject: string }) {
  const access = useAccess()
  return <section className="vx-access-denied" aria-live="polite">
    <span className="eyebrow">WORKSPACE ACCESS</span>
    <h2>{access?.loading ? 'Checking your access…' : access?.error ? 'Access could not be verified' : `${subject} are restricted`}</h2>
    <p>{access?.loading ? 'Verifying your current permissions with the server.' : access?.error ? 'We could not load your current permissions. Protected actions stay unavailable until access can be verified.' : 'Your current permissions do not include this operation. Ask your workspace administrator if you need access.'}</p>
    <button className="text-button" disabled={access?.loading} onClick={() => void access?.refresh()}>Check access again</button>
  </section>
}
