import { redirect } from 'next/navigation'
import { getServerAuthenticatedContext } from '@/lib/auth/server'
import OrganizationHierarchy from './organization-hierarchy'

export default async function UsersAccessPage() {
  const context = await getServerAuthenticatedContext()
  if (!context) redirect('/login')
  if (!context.permissions.includes('organization:manage')) redirect('/app')

  return (
    <main className="app-layout">
      <section className="app-content">
        <header className="app-header">
          <div><span className="eyebrow">USERS & ACCESS</span><h1>Organization Administration</h1></div>
          <span className="workspace-pill">{context.user.organizationName}</span>
        </header>
        <OrganizationHierarchy />
      </section>
    </main>
  )
}
