'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SignupChallenge, SignupDetails, SignupProof } from '@/contracts/auth'
import { ApiRequestError, authApi } from '@/lib/api/auth'

export type SignupStep = 'details' | 'verification' | 'password'

/** Codes, proof and passwords live only in this mounted flow, never browser storage or URLs. */
export function useVerifiedSignup() {
  const router = useRouter()
  const [step, setStep] = useState<SignupStep>('details')
  const [details, setDetails] = useState<SignupDetails>({ accountType: 'individual', displayName: '', email: '' })
  const [challenge, setChallenge] = useState<SignupChallenge | null>(null)
  const [proof, setProof] = useState<SignupProof | null>(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [recovery, setRecovery] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [resendAt, setResendAt] = useState(0)
  const [expiresAt, setExpiresAt] = useState(0)
  const [now, setNow] = useState(Date.now)
  const busy = useRef(false)
  const completed = useRef(false)
  const mounted = useRef(true)
  const generation = useRef(0)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => {
    mounted.current = true
    // A browser back-forward cache must not resurrect verification secrets.
    const clear = () => { controller.current?.abort(); generation.current++; busy.current = false; completed.current = false; setPending(false); setStep('details'); setChallenge(null); setProof(null); setCode(''); setPassword('') }
    window.addEventListener('pagehide', clear)
    return () => { mounted.current = false; controller.current?.abort(); window.removeEventListener('pagehide', clear) }
  }, [])
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (busy.current) return
    const current = generation.current
    const request = new AbortController()
    controller.current = request
    busy.current = true; setPending(true); setError('')
    try { await action(AbortSignal.any([request.signal, AbortSignal.timeout(15000)])) } catch (cause) {
      if (mounted.current && current === generation.current) {
        setError(cause instanceof Error ? cause.message : 'Unable to continue. Please try again.')
        if (cause instanceof ApiRequestError && cause.retryAfterSeconds) setResendAt(Date.now() + cause.retryAfterSeconds * 1000)
      }
    } finally { if (current === generation.current) { busy.current = completed.current; if (mounted.current) setPending(completed.current) } }
  }
  function start() {
    if (details.displayName.trim().length < 2 || (details.accountType === 'organization' && (details.organizationName ?? '').trim().length < 2)) {
      setError('Enter at least two characters for your name and, if applicable, organization.'); return
    }
    const current = generation.current
    void run(async signal => {
      const clean: SignupDetails = { accountType: details.accountType, displayName: details.displayName.trim(), email: details.email.trim(), ...(details.accountType === 'organization' ? { organizationName: details.organizationName?.trim() } : {}) }
      const { data } = await authApi.startSignup(clean, signal)
      if (!mounted.current || current !== generation.current) return
      setDetails(clean); setChallenge(data); setProof(null); setCode(''); setPassword('')
      setResendAt(Date.now() + data.resendAfterSeconds * 1000)
      setExpiresAt(Date.now() + data.expiresInSeconds * 1000)
      setStep('verification')
    })
  }
  function verify() {
    if (!challenge) return
    const current = generation.current
    void run(async signal => {
      const { data } = await authApi.verifySignup({ challengeId: challenge.challengeId, code: code.trim() }, signal)
      if (!mounted.current || current !== generation.current) return
      setCode(''); setProof(data); setExpiresAt(Date.now() + data.expiresInSeconds * 1000); setStep('password')
    })
  }
  function complete() {
    if (!challenge || !proof) return
    const current = generation.current
    void run(async signal => {
      try {
        await authApi.completeSignup({ challengeId: challenge.challengeId, setupToken: proof.setupToken, password }, signal)
      } catch (cause) {
        // Validation can be corrected with this proof. A lost completion response may
        // already have consumed it; reconcile the real cookie session before retrying.
        if (signal.aborted && !mounted.current) return
        if (cause instanceof ApiRequestError && cause.code === 'VALIDATION_ERROR') throw cause
        const existing = await authApi.session(signal).catch(() => null)
        if (!mounted.current || current !== generation.current) return
        if (existing?.data.user.email.toLowerCase() !== details.email.toLowerCase() || existing?.data.user.accountType !== details.accountType) {
          setProof(null); setPassword(''); setRecovery(true)
          return
        }
      }
      if (!mounted.current || current !== generation.current) return
      completed.current = true
      setPassword(''); setProof(null); router.replace('/app'); router.refresh()
    })
  }
  function back() {
    if (busy.current) return
    setStep('details'); setChallenge(null); setProof(null); setCode(''); setPassword(''); setError(''); setExpiresAt(0); setRecovery(false)
  }
  return { step, recovery, details, setDetails, code, setCode, password, setPassword, pending, error, start, verify, complete, back,
    resendSeconds: Math.max(0, Math.ceil((resendAt - now) / 1000)), expired: expiresAt > 0 && expiresAt <= now }
}
