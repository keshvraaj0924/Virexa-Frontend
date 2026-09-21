import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth/server'
import DocumentsPanel from '@/app/app-shell/documents'

export default async function DocumentsPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')

  return (
    <main className="app-layout">
      <section className="app-content">
        <header className="app-header">
          <div><span className="eyebrow">OPERATIONS</span><h1>Inbox & Documents</h1></div>
          <span className="workspace-pill">{session.user.organizationName}</span>
        </header>
        <DocumentsPanel role={session.user.role} />
      </section>
    </main>
  )
}
