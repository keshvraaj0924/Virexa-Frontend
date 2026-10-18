import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth/server'
import { UsageDashboard } from '@/components/usage/usage-dashboard'
export default async function UsagePage() {
  if (process.env.VIREXA_AUTH_CANDIDATE !== '1' || process.env.VIREXA_USAGE_ANALYTICS !== '1') redirect('/app')
  const session = await getServerSession()
  if (!session) redirect('/login')
  return <main className="workspace-page"><section className="app-content"><header className="app-header"><div><span className="eyebrow">YOUR WORKSPACE / USAGE & PLAN</span><h1>Every operation, accounted for.</h1></div></header><UsageDashboard accountType={session.user.accountType}/></section></main>
}
