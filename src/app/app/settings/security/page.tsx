'use client'

import { useCallback, useEffect, useState } from 'react'
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
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authApi.activeSessions()
      setSessions(response.data)
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError ? requestError.message : 'Unable to load active sessions.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  async function revokeOtherSessions() {
    setIsRevoking(true)
    setMessage(null)
    setError(null)
    try {
      const response = await authApi.revokeOtherSessions()
      const count = response.data.revokedCount
      setMessage(count === 1 ? '1 other session was revoked.' : `${count} other sessions were revoked.`)
      await loadSessions()
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError ? requestError.message : 'Unable to revoke other sessions.')
    } finally {
      setIsRevoking(false)
    }
  }

  const otherSessionCount = sessions.filter((session) => !session.current).length

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
        {isLoading ? <p role="status">Loading active sessions…</p> : null}
        {!isLoading && sessions.length === 0 ? <p>No active sessions were returned.</p> : null}
        {!isLoading && sessions.length > 0 ? (
          <div className="security-session-list">
            {sessions.map((session) => (
              <article className="security-session" key={session.id}>
                <div>
                  <strong>{session.current ? 'Current session' : 'Active session'}</strong>
                  <p>Started {formatSessionTime(session.createdAt)}</p>
                  <p>Expires {formatSessionTime(session.expiresAt)}</p>
                </div>
                <span>{session.current ? 'This device' : 'Signed in'}</span>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="security-card" aria-labelledby="session-security-title">
        <div>
          <p className="eyebrow">Session security</p>
          <h2 id="session-security-title">Sign out other sessions</h2>
          <p>Your current session stays active. {otherSessionCount} other active {otherSessionCount === 1 ? 'session is' : 'sessions are'} currently visible.</p>
        </div>
        <button type="button" onClick={revokeOtherSessions} disabled={isRevoking || isLoading || otherSessionCount === 0}>
          {isRevoking ? 'Revoking…' : 'Sign out other sessions'}
        </button>
        {message ? <p role="status" className="security-success">{message}</p> : null}
        {error ? <p role="alert" className="security-error">{error}</p> : null}
      </section>
    </main>
  )
}
