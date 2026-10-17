'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { authApi } from '@/lib/api/auth'
import { AuthSubmit } from '@/components/auth/auth-submit'
import { AuthFrame } from '@/components/auth/auth-frame'
import { PasswordInput } from '@/components/auth/password-input'

export default function RegisterPage() {
  const router = useRouter()
  const busy = useRef(false)
  const mounted = useRef(true)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    if (displayName.trim().length < 2 || organizationName.trim().length < 2) {
      setError('Enter at least two characters for your name and organization.'); return
    }
    busy.current = true
    setSubmitting(true)
    setError(null)
    try {
      await authApi.register({ displayName: displayName.trim(), email: email.trim(), password, organizationName: organizationName.trim() })
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
    <AuthFrame variant="register" heading="Create your workspace." description="Bring your documents, decisions and team together.">
      <form className="vx-auth-form" onSubmit={submit} aria-busy={submitting}>
        <div className="vx-auth-field"><label htmlFor="displayName">Full name</label><input id="displayName" name="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" minLength={2} maxLength={120} required disabled={submitting} placeholder="Alex Morgan" /></div>
        <div className="vx-auth-field"><label htmlFor="organizationName">Organization</label><input id="organizationName" name="organizationName" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} autoComplete="organization" minLength={2} maxLength={160} required disabled={submitting} placeholder="Your company" /></div>
        <div className="vx-auth-field"><label htmlFor="email">Work email</label><input id="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" maxLength={320} required disabled={submitting} placeholder="you@company.com" /></div>
        <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" placeholder="Create a strong password" minLength={12} hint="12–128 characters" disabled={submitting} />
        {error && <p ref={errorRef} tabIndex={-1} role="alert" className="vx-auth-error">{error}</p>}
        <AuthSubmit disabled={submitting}>
          {submitting ? <LoaderCircle size={18} className="vx-auth-spinner" aria-hidden="true" /> : null}
          {submitting ? 'Creating workspace…' : 'Create workspace'}
          {!submitting && <ArrowRight size={17} aria-hidden="true" />}
        </AuthSubmit>
      </form>
      <p className="vx-auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
    </AuthFrame>
  )
}
