'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { authApi, AuthApiError } from '@/lib/api/auth'
import { safePostAuthPath } from '@/lib/auth/redirect'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await authApi.login({ email, password })
      const next = new URLSearchParams(window.location.search).get('next')
      router.replace(safePostAuthPath(next))
      router.refresh()
    } catch (reason) {
      if (reason instanceof AuthApiError && reason.code === 'INVALID_CREDENTIALS') {
        setError('Email or password is incorrect.')
      } else if (reason instanceof AuthApiError && reason.code === 'UNTRUSTED_ORIGIN') {
        setError('This sign-in request came from an untrusted origin.')
      } else {
        setError(reason instanceof Error ? reason.message : 'Unable to sign in. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-brand"><span className="brand-mark">V</span>Virexa</Link>
        <div className="auth-heading"><span className="eyebrow">WELCOME BACK</span><h1>Sign in to Virexa.</h1><p>Access your operational workspace securely.</p></div>
        {error && <p role="alert">{error}</p>}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="login-email">Email<input id="login-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></label>
          <label htmlFor="login-password">Password<input id="login-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /></label>
          <button type="submit" className="primary-button auth-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">New to Virexa? <Link href="/register">Create an account</Link></p>
      </section>
    </main>
  )
}
