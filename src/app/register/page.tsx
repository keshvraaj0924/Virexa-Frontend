'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { authApi, AuthApiError } from '@/lib/api/auth'
import { safePostAuthPath } from '@/lib/auth/redirect'

export default function RegisterPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await authApi.register({ displayName, email, password, organizationName })
      const next = new URLSearchParams(window.location.search).get('next')
      router.replace(safePostAuthPath(next))
      router.refresh()
    } catch (reason) {
      if (reason instanceof AuthApiError && reason.code === 'EMAIL_ALREADY_REGISTERED') {
        setError('An account already exists for this organization and email.')
      } else if (reason instanceof AuthApiError && reason.code === 'UNTRUSTED_ORIGIN') {
        setError('This registration request came from an untrusted origin.')
      } else {
        setError(reason instanceof Error ? reason.message : 'Unable to create the workspace. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">
        <Link href="/" className="auth-brand"><span className="brand-mark">V</span>Virexa</Link>
        <div className="auth-heading"><span className="eyebrow">GET STARTED</span><h1>Build your operating layer.</h1><p>Create an organization workspace and bring your team into Virexa.</p></div>
        {error && <p role="alert">{error}</p>}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="register-name">Full name<input id="register-name" name="displayName" type="text" autoComplete="name" required minLength={2} maxLength={120} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" /></label>
          <label htmlFor="register-email">Work email<input id="register-email" name="email" type="email" autoComplete="email" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></label>
          <label htmlFor="register-organization">Organization<input id="register-organization" name="organizationName" type="text" autoComplete="organization" required minLength={2} maxLength={160} value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="Company name" /></label>
          <label htmlFor="register-password">Password<input id="register-password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 12 characters" /></label>
          <button type="submit" className="primary-button auth-submit" disabled={busy}>{busy ? 'Creating workspace…' : 'Create workspace'}</button>
        </form>
        <p className="auth-switch">Already have access? <Link href="/login">Sign in</Link></p>
      </section>
    </main>
  )
}
