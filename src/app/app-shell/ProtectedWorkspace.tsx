'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { NAVIGATION } from '@/contracts'
import { hasPermission } from '@/lib/auth/permissions'
import { useSession } from '@/lib/auth/session-provider'

export default function ProtectedWorkspace({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname()
  const router = useRouter()
  const { state, logout } = useSession()

  useEffect(() => {
    if (state.status === 'unauthenticated') router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [pathname, router, state.status])

  if (state.status === 'loading') return <main className="app-content"><p role="status">Loading workspace…</p></main>
  if (state.status === 'error') return <main className="app-content"><p role="alert">{state.message}</p></main>
  if (state.status === 'unauthenticated') return <main className="app-content"><p role="status">Redirecting to sign in…</p></main>

  const { user, permissions } = state.context
  const navigation = NAVIGATION.filter((item) => item.roles.includes(user.role))
  const canCreateWorkflow = permissions.includes('workflow:create')

  return (
    <main className="app-layout">
      <aside className="app-sidebar" aria-label="Application navigation">
        <Link href="/" className="sidebar-brand"><span className="brand-mark">V</span><span>Virexa</span></Link>
        <div className="sidebar-label">{user.organizationName}</div>
        <nav>{navigation.map((item) => <Link className={pathname === item.href ? 'nav-item active' : 'nav-item'} key={item.href} href={item.href}>{item.label}</Link>)}</nav>
        <div className="sidebar-footer">
          <div className="account-avatar" aria-hidden="true">{user.displayName.slice(0, 1).toUpperCase()}</div>
          <div><strong>{user.displayName}</strong><small>{user.role.replace('_', ' ')}</small></div>
          <button type="button" className="header-link" onClick={() => void logout()}>Sign out</button>
        </div>
      </aside>
      <section className="app-content">
        <header className="app-header">
          <div><span className="eyebrow">WORKSPACE</span><h1>{pathname === '/app/workflows' ? 'Workflows' : 'Dashboard'}</h1></div>
          <div className="header-actions">
            {canCreateWorkflow && <Link className="workspace-pill" href="/app/workflows">Create and manage workflows</Link>}
          </div>
        </header>
        {children}
      </section>
    </main>
  )
}
