'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState, type ReactNode } from 'react'
import { ArrowUpRight, FileText, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users, Workflow, X } from 'lucide-react'
import type { AuthSession } from '@/contracts/auth'
import { NAVIGATION } from '@/contracts/navigation'
import { authApi } from '@/lib/api/auth'
import { VirexaMark } from '@/components/brand/virexa-mark'

const icons = { dashboard: LayoutDashboard, documents: FileText, workflows: Workflow, users: Users, audit: ShieldCheck, settings: Settings }

export function WorkspaceFrame({ session, children, authOnly = false }: { session: AuthSession; children: ReactNode; authOnly?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const navigation = NAVIGATION.filter((item) => item.roles.includes(session.user.role) && (!authOnly || item.href === '/app'))
  async function logout() {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setError('')
    try {
      await authApi.logout()
      router.replace('/login')
      router.refresh()
    } catch {
      setError('Sign out failed. Please try again.')
      busy.current = false
      setPending(false)
    }
  }
  return (
    <div className="vx-workspace">
      <a className="vx-skip" href="#workspace-content">Skip to workspace</a>
      <aside className="vx-workspace-sidebar" aria-label="Workspace navigation">
        <div className="vx-workspace-brand-row">
          <Link href="/app" className="vx-workspace-brand"><VirexaMark /> VIREXA</Link>
          <button className="vx-mobile-menu" aria-expanded={open} aria-controls="workspace-navigation" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(!open)}>{open ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
        <div className="vx-workspace-tenant"><span className="vx-tenant-icon">{session.user.organizationName.slice(0, 1).toUpperCase()}</span><div><strong>{session.user.organizationName}</strong><small>Organization workspace</small></div></div>
        <nav id="workspace-navigation" className={open ? 'vx-workspace-nav is-open' : 'vx-workspace-nav'} aria-label="Main">
          <span className="vx-nav-caption">WORKSPACE</span>
          {navigation.map((item) => {
            const Icon = icons[item.icon as keyof typeof icons] ?? FileText
            const active = item.href === '/app' ? pathname === '/app' || pathname === '/app-shell' : pathname.startsWith(item.href)
            return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)}><Icon size={18} aria-hidden="true" />{item.label}</Link>
          })}
          <Link href="/" className="vx-site-link">Visit website<ArrowUpRight size={15} aria-hidden="true" /></Link>
        </nav>
        <div className="vx-workspace-account"><span className="account-avatar">{session.user.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{session.user.displayName}</strong><small>{session.user.role.replaceAll('_', ' ')}</small></div><button onClick={logout} disabled={pending} aria-label={pending ? 'Signing out' : 'Sign out'} title="Sign out"><LogOut size={18} /></button></div>
        {error && <p className="vx-logout-error" role="alert">{error}</p>}
      </aside>
      <div id="workspace-content" className="vx-workspace-body" tabIndex={-1}>{children}</div>
    </div>
  )
}
