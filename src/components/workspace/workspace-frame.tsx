'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState, type ReactNode } from 'react'
import { ArrowUpRight, ChartNoAxesColumn, FileText, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users, Workflow, X } from 'lucide-react'
import type { AuthSession } from '@/contracts/auth'
import { NAVIGATION } from '@/contracts/navigation'
import { authApi } from '@/lib/api/auth'
import { useAccess } from '@/components/access/access-provider'
import { VirexaMark } from '@/components/brand/virexa-mark'

const icons = { dashboard: LayoutDashboard, documents: FileText, workflows: Workflow, users: Users, audit: ShieldCheck, settings: Settings }

export function WorkspaceFrame({ session, children, authOnly = false, documentIntake = false, sessionControls = false, usageAnalytics = false, auditEvents = false, workflowRecords = false }: { session: AuthSession; children: ReactNode; authOnly?: boolean; documentIntake?: boolean; sessionControls?: boolean; usageAnalytics?: boolean; auditEvents?: boolean; workflowRecords?: boolean }) {
  const access = useAccess()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const navigation = NAVIGATION.filter(item => {
    if (!authOnly) return item.roles.includes(session.user.role)
    if (item.href === '/app') return true
    if (item.href === '/app/workflows') return workflowRecords && (access?.allows('workflow:read') ?? false)
    if (item.href === '/app/audit') return auditEvents && (access?.allows('audit:read') ?? false)
    if (item.href === '/app/documents') return documentIntake && (access?.allows('document:read') ?? false)
    if (item.href === '/app/settings/security') return sessionControls && (access?.allows('session:read') ?? false)
    return false
  })
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
        <div className="vx-workspace-tenant"><span className="vx-tenant-icon">{session.user.organizationName.slice(0, 1).toUpperCase()}</span><div><strong>{session.user.organizationName}</strong><small>{session.user.accountType === 'individual' ? 'Individual workspace' : session.user.accountType === 'organization' ? 'Organization workspace' : 'Workspace'}</small></div></div>
        <nav id="workspace-navigation" className={open ? 'vx-workspace-nav is-open' : 'vx-workspace-nav'} aria-label="Main">
          <span className="vx-nav-caption">WORKSPACE</span>
          {navigation.map((item) => {
            const Icon = icons[item.icon as keyof typeof icons] ?? FileText
            const active = item.href === '/app' ? pathname === '/app' || pathname === '/app-shell' : pathname.startsWith(item.href)
            return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)}><Icon size={18} aria-hidden="true" />{item.label}</Link>
          })}
          {authOnly && usageAnalytics && access?.allows('usage:read') && <Link href="/app/usage" aria-current={pathname === '/app/usage' ? 'page' : undefined} onClick={() => setOpen(false)}><ChartNoAxesColumn size={18} aria-hidden="true"/>Usage & plan</Link>}
          {authOnly && <Link href="/app/access" aria-current={pathname === '/app/access' ? 'page' : undefined} onClick={() => setOpen(false)}><ShieldCheck size={18} aria-hidden="true"/>Your access</Link>}
          <Link href="/" className="vx-site-link">Visit website<ArrowUpRight size={15} aria-hidden="true" /></Link>
        </nav>
        <div className="vx-workspace-account"><span className="account-avatar">{session.user.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{session.user.displayName}</strong><small>{authOnly ? 'Signed in' : session.user.role.replaceAll('_', ' ')}</small></div><button onClick={logout} disabled={pending} aria-label={pending ? 'Signing out' : 'Sign out'} title="Sign out"><LogOut size={18} /></button></div>
        {error && <p className="vx-logout-error" role="alert">{error}</p>}
      </aside>
      <div id="workspace-content" className="vx-workspace-body" tabIndex={-1}><div className="vx-workspace-topbar"><span>Workspace <span aria-hidden="true">/</span> {pathname.includes('/documents') ? 'Documents' : pathname.includes('/security') ? 'Security' : pathname.includes('/usage') ? 'Usage & plan' : pathname.includes('/workflows') ? 'Workflow records' : pathname.includes('/audit') ? 'Audit Log' : pathname.includes('/access') ? 'Access' : 'Overview'}</span><span><ShieldCheck size={14} aria-hidden="true"/> Private workspace</span></div>{children}</div>
    </div>
  )
}
