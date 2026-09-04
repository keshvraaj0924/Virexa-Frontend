import Link from 'next/link'
import { NAVIGATION } from '@/contracts'
import { getServerSession } from '@/lib/auth/server'
import WorkflowPanel from './workflows'

export default async function AppShellPage() {
  const session = await getServerSession()
  if (!session) return null
  const navigation = NAVIGATION.filter((item) => item.roles.includes(session.user.role))

  return (
    <main className="app-layout">
      <aside className="app-sidebar" aria-label="Application navigation">
        <Link href="/" className="sidebar-brand"><span className="brand-mark">V</span><span>Virexa</span></Link>
        <div className="sidebar-label">Workspace</div>
        <nav>{navigation.map((item, index) => <Link className={index === 0 ? 'nav-item active' : 'nav-item'} key={item.href} href={item.href}>{item.label}</Link>)}</nav>
        <div className="sidebar-footer"><div className="account-avatar">{session.user.displayName.slice(0, 1).toUpperCase()}</div><div><strong>{session.user.displayName}</strong><small>{session.user.organizationName}</small></div></div>
      </aside>
      <section className="app-content">
        <header className="app-header"><div><span className="eyebrow">OVERVIEW</span><h1>Dashboard</h1></div><div className="header-actions"><span className="workspace-pill">{session.user.organizationName}</span><Link href="/" className="header-link">View site</Link></div></header>
        <section className="dashboard-panel">
          <div className="panel-heading"><div><span className="eyebrow">SESSION</span><h2>Workspace ready</h2></div><span className="status-chip">Authenticated</span></div>
          <div className="activity-row"><div><strong>{session.user.displayName}</strong><span>{session.user.email}</span></div><span>{session.user.role}</span></div>
        </section>
        <WorkflowPanel role={session.user.role} />
      </section>
    </main>
  )
}
