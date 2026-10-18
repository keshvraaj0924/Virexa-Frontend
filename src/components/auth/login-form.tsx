'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import type { AccountType } from '@/contracts/auth'
import { AccountTypeChoice } from '@/components/auth/account-type-choice'
import { authApi } from '@/lib/api/auth'
import { AuthSubmit } from '@/components/auth/auth-submit'
import { AuthFrame } from '@/components/auth/auth-frame'
import { PasswordInput } from '@/components/auth/password-input'

export function LoginForm({ verifiedAccounts }: { verifiedAccounts: boolean }) {
  const router = useRouter()
  const busy = useRef(false)
  const mounted = useRef(true)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const [accountType, setAccountType] = useState<AccountType>('individual')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return

    busy.current = true
    setSubmitting(true)
    setError(null)
    try {
      await authApi.login({ ...(verifiedAccounts ? { accountType } : {}), email: email.trim(), password })
      if (!mounted.current) return
      router.replace('/app')
      router.refresh()
    } catch (cause: unknown) {
      if (mounted.current) {
        setError(cause instanceof Error ? cause.message : 'Unable to continue. Please try again.')
        setSubmitting(false)
      }
      busy.current = false
    }
  }

  return (
    <AuthFrame variant="login" heading="Welcome back." description="Your operations. One connected workspace.">
      <form className="vx-auth-form" onSubmit={submit} aria-busy={submitting}>

        {verifiedAccounts && <AccountTypeChoice value={accountType} onChange={setAccountType} disabled={submitting}/>}
        <div className="vx-auth-field"><label htmlFor="email">Email</label><input id="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" maxLength={320} required disabled={submitting} placeholder="you@example.com" /></div>
        <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" placeholder="Enter your password"  disabled={submitting} />
        {error && <p ref={errorRef} tabIndex={-1} role="alert" className="vx-auth-error">{error}</p>}
        <AuthSubmit disabled={submitting}>
          {submitting ? <LoaderCircle size={18} className="vx-auth-spinner" aria-hidden="true" /> : null}
          {submitting ? 'Signing in…' : 'Sign in'}
          {!submitting && <ArrowRight size={17} aria-hidden="true" />}
        </AuthSubmit>
      </form>
      <p className="vx-auth-switch">New to Virexa? <Link href="/register">Create a workspace</Link></p>
    </AuthFrame>
  )
}
