import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth/server'
import WorkflowPanel from '@/app/app-shell/workflows'

export default async function WorkflowsPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')

  return (
    <main className="app-layout">
      <section className="app-content">
        <header className="app-header"><div><span className="eyebrow">OPERATIONS</span><h1>Workflows</h1></div><span className="workspace-pill">{session.user.organizationName}</span></header>
        <WorkflowPanel role={session.user.role} />
      </section>
    </main>
  )
}
