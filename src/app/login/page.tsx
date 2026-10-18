import { LoginForm } from '@/components/auth/login-form'
export default function LoginPage() {
  return <LoginForm verifiedAccounts={process.env.VIREXA_AUTH_CANDIDATE === '1'}/>
}
