import { redirect } from 'next/navigation'
import { getServerAuthenticatedContext } from '@/lib/auth/server'
import AuditLog from './audit-log'

export default async function AuditPage() {
  const context = await getServerAuthenticatedContext()
  if (!context) redirect('/login')
  if (!context.permissions.includes('audit:read')) redirect('/app')

  return (
    <main className="app-layout">
      <section className="app-content">
        <header className="app-header">
          <div><span className="eyebrow">GOVERNANCE</span><h1>Audit Log</h1></div>
          <span className="workspace-pill">{context.user.organizationName}</span>
        </header>
        <AuditLog />
      </section>
    </main>
  )
}
