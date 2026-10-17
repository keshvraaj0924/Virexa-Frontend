import Link from 'next/link'
import { getServerSession } from '@/lib/auth/server'
import WorkflowPanel from './workflows'

export default async function AppShellPage() {
  const session = await getServerSession()
  if (!session) return null

  return (
    <main className="workspace-page">
      <section className="app-content">
        <header className="app-header"><div><span className="eyebrow">OVERVIEW</span><h1>Dashboard</h1></div><div className="header-actions"><span className="workspace-pill">{session.user.organizationName}</span><Link href="/" className="header-link">View site</Link></div></header>
        <section className="dashboard-panel">
          <div className="panel-heading"><div><span className="eyebrow">SESSION</span><h2>Workspace ready</h2></div><span className="status-chip">Authenticated</span></div>
          <div className="activity-row"><div><strong>{session.user.displayName}</strong><span>{session.user.email}</span></div><span>{session.user.role}</span></div>
        </section>
        {process.env.VIREXA_AUTH_CANDIDATE === '1' ? <section className="dashboard-panel" aria-label="Authentication preview"><h2>Authentication preview</h2><p>Your session is connected to the Python authentication candidate. Documents, workflows, user management, audit logs and security settings are unavailable in this preview.</p></section> : <WorkflowPanel role={session.user.role} />}
      </section>
    </main>
  )
}

