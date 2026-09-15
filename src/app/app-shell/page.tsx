import Link from 'next/link'
import { NAVIGATION, type UserRole } from '@/contracts'

const DEMO_ROLE: UserRole = 'admin'

export default function AppShellPage() {
  const navigation = NAVIGATION.filter((item) => item.roles.includes(DEMO_ROLE))

  return (
    <main className="app-layout">
      <aside className="app-sidebar" aria-label="Application navigation">
        <Link href="/" className="sidebar-brand"><span className="brand-mark">V</span><span>Virexa</span></Link>
        <div className="sidebar-label">Workspace</div>
        <nav>{navigation.map((item, index) => <Link className={index === 0 ? 'nav-item active' : 'nav-item'} key={item.href} href={item.href}>{item.label}</Link>)}</nav>
        <div className="sidebar-footer"><div className="account-avatar">A</div><div><strong>Admin</strong><small>Organization workspace</small></div></div>
      </aside>
      <section className="app-content">
        <header className="app-header"><div><span className="eyebrow">OVERVIEW</span><h1>Dashboard</h1></div><div className="header-actions"><span className="workspace-pill">Operations workspace</span><Link href="/" className="header-link">View site</Link></div></header>
        <div className="dashboard-grid">
          <article className="metric-card"><span>Active workflows</span><strong>24</strong><small>Across 7 business processes</small></article>
          <article className="metric-card"><span>Items processed</span><strong>18,420</strong><small>+18.2% from previous period</small></article>
          <article className="metric-card"><span>Exception rate</span><strong>1.8%</strong><small>Within configured threshold</small></article>
          <article className="metric-card"><span>Time recovered</span><strong>1,284h</strong><small>Estimated operational capacity</small></article>
        </div>
        <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">OPERATIONS</span><h2>Workflow activity</h2></div><span className="status-chip">All systems healthy</span></div><div className="activity-row"><div><strong>Invoice processing</strong><span>1,284 items · 96.2% straight-through</span></div><span>Today</span></div><div className="activity-row"><div><strong>Vendor onboarding</strong><span>142 items · 4 exceptions</span></div><span>Today</span></div><div className="activity-row"><div><strong>Document classification</strong><span>8,410 items · 99.1% confidence</span></div><span>Yesterday</span></div></section>
      </section>
    </main>
  )
}
