'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await authApi.register({ displayName: displayName.trim(), email: email.trim(), password, organizationName: organizationName.trim() })
      router.replace('/app')
      router.refresh()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Unable to create the account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-brand"><span className="brand-mark">V</span>Virexa</Link>
        <div className="auth-heading"><span className="eyebrow">GET STARTED</span><h1>Create your workspace.</h1><p>Start with a secure organization account.</p></div>
        <form className="auth-form" onSubmit={submit}>
          <label>Name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" minLength={2} maxLength={120} required /></label>
          <label>Work email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" maxLength={320} required /></label>
          <label>Organization<input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} autoComplete="organization" minLength={2} maxLength={160} required /></label>
          <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
          {error && <p role="alert">{error}</p>}
          <button type="submit" className="primary-button auth-submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create account'}</button>
        </form>
        <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
      </section>
    </main>
  )
}
