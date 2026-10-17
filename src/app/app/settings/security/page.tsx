'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActiveSession } from '../../../../contracts/auth'
import { authApi, ApiRequestError } from '../../../../lib/api/auth'

function formatSessionTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export default function SecuritySettingsPage() {
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRevoking, setIsRevoking] = useState(false)
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const busy = useRef(false)
  const generation = useRef(0)
  const mounted = useRef(true)

  const handleError = useCallback((requestError: unknown, fallback: string) => {
    if (!mounted.current) return
    if (requestError instanceof ApiRequestError && requestError.code === 'UNAUTHENTICATED') {
      setSessions([])
      window.location.replace('/login')
      return
    }
    setError(requestError instanceof ApiRequestError ? requestError.message : fallback)
  }, [])

  const loadSessions = useCallback(async (cursor?: string) => {
    const currentGeneration = ++generation.current
    setIsLoading(true)
    try {
      const response = await authApi.activeSessions(cursor)
      if (!mounted.current || generation.current !== currentGeneration) return
      setSessions(previous => cursor
        ? [...previous, ...response.data.filter(item => !previous.some(existing => existing.id === item.id))]
        : response.data)
      setNextCursor(response.meta.pagination?.nextCursor ?? null)
    } finally {
      if (mounted.current && generation.current === currentGeneration) setIsLoading(false)
    }
  }, [])

  const refresh = useCallback(async (cursor?: string) => {
    if (busy.current) return
    busy.current = true
    setError(null)
    setMessage(null)
    try { await loadSessions(cursor) }
    catch (requestError) { handleError(requestError, 'Unable to load active sessions.') }
    finally { busy.current = false }
  }, [loadSessions, handleError])

  useEffect(() => {
    mounted.current = true
    void refresh()
    return () => { mounted.current = false }
  }, [refresh])

  async function revokeSession(session: ActiveSession) {
    if (busy.current) return
    busy.current = true
    setRevokingSessionId(session.id)
    setMessage(null)
    setError(null)
    try {
      await authApi.revokeSession(session.id)
      if (!mounted.current) return
      if (session.current) {
        setSessions([])
        window.location.replace('/login')
        return
      }
      setMessage('Session revoked.')
      await loadSessions()
    } catch (requestError) {
      handleError(requestError, 'Unable to revoke this session.')
    } finally {
      busy.current = false
      if (mounted.current) setRevokingSessionId(null)
    }
  }

  async function revokeOtherSessions() {
    if (busy.current) return
    busy.current = true
    setIsRevoking(true)
    setMessage(null)
    setError(null)
    try {
      const response = await authApi.revokeOtherSessions()
      if (!mounted.current) return
      const count = response.data.revokedCount
      setMessage(count === 1 ? '1 other session was revoked.' : `${count} other sessions were revoked.`)
      await loadSessions()
    } catch (requestError) {
      handleError(requestError, 'Unable to revoke other sessions.')
    } finally {
      busy.current = false
      if (mounted.current) setIsRevoking(false)
    }
  }

  const otherSessionCount = sessions.filter((session) => !session.current).length
  const mutationInProgress = isRevoking || revokingSessionId !== null || isLoading

  return (
    <main className="security-settings" aria-labelledby="security-settings-title">
      <header>
        <p className="eyebrow">Settings / Security</p>
        <h1 id="security-settings-title">Protect your Virexa workspace</h1>
        <p>Review authenticated sessions while tenant and user scope remain server-authoritative.</p>
      </header>

      <section className="security-card" aria-labelledby="active-sessions-title">
        <div>
          <p className="eyebrow">Account access</p>
          <h2 id="active-sessions-title">Active sessions</h2>
          <p>Only session metadata returned for your authenticated account is displayed.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={mutationInProgress}>Refresh sessions</button>
        {isLoading ? <p role="status">Loading active sessions…</p> : null}
        {!isLoading && !error && sessions.length === 0 ? <p>No active sessions were returned.</p> : null}
        {sessions.length > 0 ? (
          <div className="security-session-list">
            {sessions.map((session) => (
              <article className="security-session" key={session.id}>
                <div>
                  <strong>{session.current ? 'Current session' : 'Active session'}</strong>
                  <p>Started {formatSessionTime(session.createdAt)}</p>
                  <p>Expires {formatSessionTime(session.expiresAt)}</p>
                </div>
                <div>
                  <span>{session.current ? 'This device' : 'Signed in'}</span>
                  <button
                    type="button"
                    onClick={() => void revokeSession(session)}
                    disabled={mutationInProgress}
                    aria-label={session.current ? 'Sign out this session' : 'Revoke this session'}
                  >
                    {revokingSessionId === session.id ? 'Revoking…' : session.current ? 'Sign out' : 'Revoke'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
        {nextCursor ? <button type="button" onClick={() => void refresh(nextCursor)} disabled={mutationInProgress}>Load more sessions</button> : null}
        <p>{sessions.length} active {sessions.length === 1 ? 'session' : 'sessions'} shown.{nextCursor ? ' More sessions are available.' : ''}</p>
        {message ? <p role="status" className="security-success">{message}</p> : null}
        {error ? <p role="alert" className="security-error">{error}</p> : null}
      </section>

      <section className="security-card" aria-labelledby="session-security-title">
        <div>
          <p className="eyebrow">Session security</p>
          <h2 id="session-security-title">Sign out other sessions</h2>
          <p>Your current session stays active. This signs out all other sessions, including those not yet loaded. {otherSessionCount} other active {otherSessionCount === 1 ? 'session is' : 'sessions are'} currently visible.</p>
        </div>
        <button type="button" onClick={revokeOtherSessions} disabled={mutationInProgress || (otherSessionCount === 0 && !nextCursor)}>
          {isRevoking ? 'Revoking…' : 'Sign out other sessions'}
        </button>
      </section>
    </main>
  )
}

