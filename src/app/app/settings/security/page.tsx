'use client'

import { useState } from 'react'
import { authApi, ApiRequestError } from '../../../../lib/api/auth'

export default function SecuritySettingsPage() {
  const [isRevoking, setIsRevoking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function revokeOtherSessions() {
    setIsRevoking(true)
    setMessage(null)
    setError(null)

    try {
      const response = await authApi.revokeOtherSessions()
      const count = response.data.revokedCount
      setMessage(count === 1 ? '1 other session was revoked.' : `${count} other sessions were revoked.`)
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError ? requestError.message : 'Unable to revoke other sessions.')
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <main className="security-settings" aria-labelledby="security-settings-title">
      <header>
        <p className="eyebrow">Settings / Security</p>
        <h1 id="security-settings-title">Protect your Virexa workspace</h1>
        <p>Manage account session security without exposing tenant or user identifiers to the browser.</p>
      </header>

      <section className="security-card" aria-labelledby="session-security-title">
        <div>
          <p className="eyebrow">Session security</p>
          <h2 id="session-security-title">Sign out other sessions</h2>
          <p>Your current session stays active. Every other active session for your account is revoked by the server.</p>
        </div>
        <button type="button" onClick={revokeOtherSessions} disabled={isRevoking}>
          {isRevoking ? 'Revoking…' : 'Sign out other sessions'}
        </button>
        {message ? <p role="status" className="security-success">{message}</p> : null}
        {error ? <p role="alert" className="security-error">{error}</p> : null}
      </section>
    </main>
  )
}
