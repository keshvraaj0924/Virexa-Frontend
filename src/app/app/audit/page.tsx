import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth/server'
import AuditLog from './audit-log'

const AUDIT_ROLES = new Set(['super_admin', 'admin'])

export default async function AuditPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')
  if (!AUDIT_ROLES.has(session.user.role)) redirect('/app')

  return (
    <main className="app-layout">
      <section className="app-content">
        <header className="app-header">
          <div><span className="eyebrow">GOVERNANCE</span><h1>Audit Log</h1></div>
          <span className="workspace-pill">{session.user.organizationName}</span>
        </header>
        <AuditLog />
      </section>
    </main>
  )
}
