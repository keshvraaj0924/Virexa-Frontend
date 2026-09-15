'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await authApi.login({ email: email.trim(), password })
      router.replace('/app')
      router.refresh()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-brand"><span className="brand-mark">V</span>Virexa</Link>
        <div className="auth-heading"><span className="eyebrow">WELCOME BACK</span><h1>Sign in to Virexa.</h1><p>Access your operational workspace securely.</p></div>
        <form className="auth-form" onSubmit={submit}>
          <label>Email<input name="email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder="you@company.com" /></label>
          <label>Password<input name="password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required placeholder="••••••••" /></label>
          {error && <p role="alert">{error}</p>}
          <button type="submit" className="primary-button auth-submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">New to Virexa? <Link href="/register">Create an account</Link></p>
      </section>
    </main>
  )
}
