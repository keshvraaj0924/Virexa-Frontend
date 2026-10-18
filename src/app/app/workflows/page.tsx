import { redirect } from 'next/navigation'
import WorkflowRecords from './workflow-records'
import { getServerEffectivePermissions, getServerSession } from '@/lib/auth/server'
import WorkflowPanel from '@/app/app-shell/workflows'

export default async function WorkflowsPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')

  if (process.env.VIREXA_AUTH_CANDIDATE === '1') {
    if (process.env.VIREXA_WORKFLOW_RECORDS !== '1') redirect('/app')
    const permissions = await getServerEffectivePermissions()
    if (!permissions?.capabilities.includes('workflow:read')) redirect('/app/access')
    return <main className="workspace-page"><section className="app-content"><header className="app-header"><div><span className="eyebrow">WORKSPACE / DEFINITIONS</span><h1>Workflow records.</h1></div><span className="workspace-pill">{session.user.organizationName}</span></header><WorkflowRecords key={`${session.user.organizationId}:${session.user.id}`} userId={session.user.id} /></section></main>
  }
  return (
    <main className="workspace-page">
      <section className="app-content">
        <header className="app-header"><div><span className="eyebrow">OPERATIONS</span><h1>Workflows</h1></div><span className="workspace-pill">{session.user.organizationName}</span></header>
        <WorkflowPanel role={session.user.role} />
      </section>
    </main>
  )
}

