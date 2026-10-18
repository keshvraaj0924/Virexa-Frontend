'use client'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { AuthSubmit } from './auth-submit'
import { PasswordInput } from './password-input'
import { SignupDetails } from './signup-details'
import { useVerifiedSignup } from './use-verified-signup'
const steps = ['details', 'verification', 'password'] as const

export function VerifiedSignupForm() {
  const flow = useVerifiedSignup()
  const errorRef = useRef<HTMLParagraphElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (flow.error) errorRef.current?.focus() }, [flow.error])
  useEffect(() => { if (flow.step !== 'details') titleRef.current?.focus() }, [flow.step])
  const title = flow.step === 'details' ? 'Your details' : flow.step === 'verification' ? 'Check your email' : 'Choose your password'
  if (flow.recovery) return <div className="vx-signup-recovery"><p role="alert" className="vx-signup-explainer">We couldn’t confirm account creation. Your account may already be ready. Try signing in with the email and password you just chose. If it isn’t ready, restart verification.</p><div className="vx-signup-actions"><Link href="/login">Sign in</Link><button type="button" onClick={flow.back}>Restart verification</button></div></div>
  const button = flow.step === 'details' ? 'Send verification code' : flow.step === 'verification' ? 'Verify email' : 'Create workspace'
  return <>
    <ol className="vx-signup-progress" aria-label="Registration progress">{steps.map((step, index) => <li key={step} aria-current={flow.step === step ? 'step' : undefined}><span>{index + 1}</span>{['Details', 'Verify email', 'Password'][index]}</li>)}</ol>
    <form className="vx-auth-form" onSubmit={event => { event.preventDefault(); if (flow.step === 'details') flow.start(); else if (flow.step === 'verification') flow.verify(); else flow.complete() }} aria-busy={flow.pending}>
      <h2 ref={titleRef} tabIndex={-1} className="vx-signup-heading">{title}</h2>
      {flow.step === 'details' ? <SignupDetails value={flow.details} onChange={flow.setDetails} disabled={flow.pending}/> : <>
        <p className="vx-signup-explainer">{flow.step === 'verification' ? 'If this email can register, a verification code will arrive at' : 'Email verified for'} <strong>{flow.details.email}</strong>. {flow.step === 'verification' && 'Check your inbox and spam folder. The code expires in 10 minutes.'}</p>
        {flow.step === 'verification' ? <div className="vx-auth-field"><label htmlFor="verificationCode">Verification code</label><input id="verificationCode" name="verificationCode" value={flow.code} onChange={event => flow.setCode(event.target.value)} autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} maxLength={128} required disabled={flow.pending || flow.expired} placeholder="Paste the code from your email"/></div> : <PasswordInput id="password" value={flow.password} onChange={flow.setPassword} autoComplete="new-password" placeholder="Create a strong password" minLength={12} hint="12–128 characters" disabled={flow.pending || flow.expired}/>}
        {flow.step === 'password' && <p className="vx-signup-explainer">Use a unique passphrase you don’t use elsewhere. Passwords are stored as one-way hashes.</p>}
        {flow.expired && <p role="status" className="vx-auth-error">This verification has expired. {flow.step === 'verification' ? 'Request a new code below.' : 'Go back to your details to verify again.'}</p>}
      </>}
      {flow.error && <p ref={errorRef} tabIndex={-1} role="alert" className="vx-auth-error">{flow.error}</p>}
      <AuthSubmit disabled={flow.pending || (flow.step !== 'details' && flow.expired)}>
        {flow.pending ? <LoaderCircle size={18} className="vx-auth-spinner" aria-hidden="true"/> : null}
        {flow.pending ? 'Please wait…' : button}{!flow.pending && <ArrowRight size={17} aria-hidden="true"/>}
      </AuthSubmit>
      {flow.step !== 'details' && <div className="vx-signup-actions">
        <button type="button" onClick={flow.back} disabled={flow.pending}>Edit details</button>
        {flow.step === 'verification' && <button type="button" onClick={flow.start} disabled={flow.pending || flow.resendSeconds > 0}>{flow.resendSeconds > 0 ? `Resend in ${flow.resendSeconds}s` : 'Resend code'}</button>}
      </div>}
      {flow.step !== 'details' && <p className="vx-signup-explainer">For your security, refreshing or leaving this page restarts verification.</p>}
    </form>
  </>
}
