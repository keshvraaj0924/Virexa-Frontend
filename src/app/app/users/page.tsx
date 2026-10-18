import { redirect } from 'next/navigation'
import { getServerAuthenticatedContext } from '@/lib/auth/server'
import TeamAdministration from './team-administration'
import OrganizationHierarchy from './organization-hierarchy'

export default async function UsersAccessPage() {
  const context = await getServerAuthenticatedContext()
  if (!context) redirect('/login')
  if (process.env.VIREXA_AUTH_CANDIDATE === '1') {
    if (process.env.VIREXA_TEAM_ADMINISTRATION !== '1') redirect('/app')
    return <main className="workspace-page"><section className="app-content"><header className="app-header"><div><span className="eyebrow">WORKSPACE / PEOPLE</span><h1>{context.user.accountType === 'individual' ? 'Personal workspace.' : 'Team & access.'}</h1></div><span className="workspace-pill">{context.user.organizationName}</span></header><TeamAdministration key={`${context.user.organizationId}:${context.user.id}`} accountType={context.user.accountType} userId={context.user.id} /></section></main>
  }
  if (!context.permissions.includes('organization:manage')) redirect('/app')

  return (
    <main className="workspace-page">
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

