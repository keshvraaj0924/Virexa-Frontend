import { redirect } from 'next/navigation'
import { getServerAuthenticatedContext, getServerSession, getServerEffectivePermissions } from '@/lib/auth/server'
import AuditLog from './audit-log'
import NodeAuditLog from './node-audit-log'

export default async function AuditPage() {
  const candidate = process.env.VIREXA_AUTH_CANDIDATE === '1'
  if (candidate) {
    if (process.env.VIREXA_AUDIT_EVENTS !== '1') redirect('/app')
    const session = await getServerSession()
    if (!session) redirect('/login')
    const permissions = await getServerEffectivePermissions()
    if (!permissions?.capabilities.includes('audit:read')) redirect('/app/access')
    return <main className="workspace-page"><section className="app-content"><header className="app-header"><div><span className="eyebrow">WORKSPACE / AUDIT LOG</span><h1>Recorded activity.</h1></div><span className="workspace-pill">{session.user.organizationName}</span></header><AuditLog /></section></main>
  }
  const context = await getServerAuthenticatedContext()
  if (!context) redirect('/login')
  if (!context.permissions.includes('audit:read')) redirect('/app')

  return (
    <main className="workspace-page">
      <section className="app-content">
        <header className="app-header">
          <div><span className="eyebrow">GOVERNANCE</span><h1>Audit Log</h1></div>
          <span className="workspace-pill">{context.user.organizationName}</span>
        </header>
        <NodeAuditLog />
      </section>
    </main>
  )
}

