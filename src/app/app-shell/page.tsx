import Link from 'next/link'
import { ArrowRight, Building2, Layers3, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import { getServerSession } from '@/lib/auth/server'
import { SilkWave } from '@/components/visual/silk-wave'
import WorkflowPanel from './workflows'

export default async function AppShellPage() {
  const session = await getServerSession()
  if (!session) return null
  const candidate = process.env.VIREXA_AUTH_CANDIDATE === '1'
  const intake = candidate && process.env.VIREXA_DOCUMENT_INTAKE === '1'
  const sessions = candidate && process.env.VIREXA_SESSION_CONTROLS === '1'
  const user = session.user
  return <main className="workspace-page"><section className="app-content">
    <header className="app-header"><div><span className="eyebrow">YOUR WORKSPACE / OVERVIEW</span><h1>Dashboard</h1></div><div className="header-actions"><span className="workspace-pill">{user.organizationName}</span></div></header>
    <section className="vx-dashboard-welcome"><SilkWave/><span className="vx-section-kicker">A LITTLE CLARITY GOES A LONG WAY</span><h2>Welcome back, <span>{user.displayName.split(' ')[0]}.</span></h2><p>Your operations, all in one place.</p></section>
    <section className="vx-overview-grid" aria-label="Workspace overview">
      <article className="vx-overview-card"><span className="vx-overview-icon"><Building2 size={21}/></span><div><p>Organization</p><strong>{user.organizationName}</strong><small>Your connected workspace</small></div></article>
      <article className="vx-overview-card"><span className="vx-overview-icon"><ShieldCheck size={21}/></span><div><p>Session status</p><strong>Authenticated</strong><small>Signed in and ready</small></div></article>
      <article className="vx-overview-card"><span className="vx-overview-icon"><UserRound size={21}/></span><div><p>Your access</p><strong>{user.role.replaceAll('_', ' ')}</strong><small>Organization-scoped permissions</small></div></article>
    </section>
    {candidate ? <>
      <div className="vx-dashboard-grid"><section className="vx-dashboard-panel" aria-label="Operations overview"><header><h3>Operations overview</h3><span className="vx-live-pill"><i/> Workspace ready</span></header><div className="vx-empty-operations"><Layers3/><strong>A clear space for what comes next.</strong><p>{intake ? 'Private document intake is connected. Open Documents to upload a file into quarantine and check receipt.' : 'Your document and workflow activity will appear here when these services are connected.'}</p></div></section>
      <section className="vx-dashboard-panel" aria-label="Your workspace"><header><h3>Your workspace</h3><LockKeyhole size={14} color="#9797b2"/></header><div className="vx-workspace-detail"><UserRound/><div><small>Signed in as</small><strong>{user.displayName}</strong></div></div><div className="vx-workspace-detail"><Building2/><div><small>Work email</small><strong>{user.email}</strong></div></div><div className="vx-workspace-detail"><ShieldCheck/><div><small>Access boundary</small><strong>Your organization</strong></div></div></section></div>
      <section className="vx-workspace-note" aria-label="Authentication preview"><h2 style={{fontSize:11,fontWeight:550,margin:'0 0 3px'}}>Authentication preview</h2>{sessions ? `Authentication${intake ? ', private document intake' : ''} and active-session controls are connected. ${intake ? 'Scanning, extraction' : 'Documents'}, workflows, user management, audit logs and other security settings remain unavailable.` : intake ? 'Authentication and private document intake are connected. Scanning, extraction, workflows, user management, audit logs and security settings remain unavailable.' : 'Your session is connected to the Python authentication candidate. Documents, workflows, user management, audit logs and security settings are unavailable in this preview.'}</section>
    </> : <WorkflowPanel role={user.role}/>}
    <section className="vx-dashboard-banner"><SilkWave/><div><h3>Less document chaos. More possibility.</h3><p>Keep your people at the center of every decision.</p></div><Link href={candidate && !intake ? '/#process' : '/app/documents'}>{candidate && !intake ? 'Explore the platform' : 'Open documents'}<ArrowRight size={14}/></Link></section>
  </section></main>
}
