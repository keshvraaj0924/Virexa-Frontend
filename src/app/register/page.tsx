import Link from 'next/link'
import { AuthFrame } from '@/components/auth/auth-frame'
import { VerifiedSignupForm } from '@/components/auth/verified-signup-form'

export default function RegisterPage() {
  return <AuthFrame variant="register" heading="Create your workspace." description="For your own work, or your whole team.">
    {process.env.VIREXA_AUTH_CANDIDATE === '1' ? <VerifiedSignupForm/> : <p className="vx-signup-explainer" role="status">Verified account creation is not available in this configuration. Contact your workspace administrator, or sign in to an existing account.</p>}
    <p className="vx-auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
  </AuthFrame>
}
