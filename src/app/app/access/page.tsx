import { redirect } from 'next/navigation'
import { EffectivePermissions } from '@/components/access/effective-permissions'
export default function AccessPage() {
  if (process.env.VIREXA_AUTH_CANDIDATE !== '1') redirect('/app')
  return <main className="workspace-page"><section className="app-content"><header className="app-header"><div><span className="eyebrow">YOUR WORKSPACE / ACCESS</span><h1>Access, made clear.</h1></div></header><EffectivePermissions/></section></main>
}
