'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AccountType } from '@/contracts/auth'
import { AccessDenied, useAccess } from '@/components/access/access-provider'
import { MEMBER_ROLES, teamApi, type Member, type MemberRole } from '@/lib/api/team'
import { ApiError } from '@/lib/api/client'
import OrganizationRoot from './organization-root'
import './team.css'
const label = (role: string) => role.replaceAll('_', ' ')
const impact: Record<MemberRole, string> = {
  tenant_admin: 'Can administer organization members and manage tenant resources.',
  organization_admin: 'Can administer organization members and manage tenant resources.',
  manager: 'Can manage tenant workflow records. Cannot administer members.',
  operator: 'Can create documents and workflow records, and manage their own workflow records. Cannot administer members.',
  viewer: 'Read-only resource access. Cannot administer members or create records.',
  auditor: 'Can read the member roster and audit events. Cannot change member roles.',
}
function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'MEMBER_CONFLICT') return 'This member changed. Close this review and reopen the member to load their current role.'
    if (error.code === 'LAST_ORGANIZATION_ADMIN') return 'This change would leave the organization without an administrator. Keep an administrator in place.'
    if (error.code === 'SELF_ROLE_CHANGE_FORBIDDEN') return 'You cannot change your own role. Ask another administrator.'
    if (error.status === 403) return 'Your access no longer permits this change. Current permissions are being checked.'
    if (error.status === 404) return 'This member is no longer available in your organization.'
  }
  return 'The result could not be verified. Close this review and refresh the roster before trying again. A submitted change may have completed.'
}
export default function TeamAdministration({ accountType, userId }: { accountType: AccountType; userId: string }) {
  const access = useAccess()
  const canRead = accountType === 'organization' && (access?.allows('organization:members:read') ?? false)
  const canManage = access?.allows('organization:members:manage') ?? false
  const [members, setMembers] = useState<Member[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<Member | null>(null)
  const [role, setRole] = useState<MemberRole>('viewer')
  const [confirmed, setConfirmed] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [saving, setSaving] = useState(false)
  const generation = useRef(0)
  const busy = useRef(false)
  const editorRequest = useRef(0)
  const load = useCallback(async (next?: string) => {
    const version = ++generation.current
    setLoading(true); setError(''); setSelected(null); editorRequest.current++
    try {
      const page = await teamApi.list(next)
      if (version !== generation.current) return
      setMembers(old => next ? [...old, ...page.items.filter(member => !old.some(item => item.id === member.id))] : page.items)
      setCursor(page.nextCursor)
    } catch { if (version === generation.current) { setMembers([]); setCursor(null); setError('The member roster is unavailable. Try refreshing it.'); } }
    finally { if (version === generation.current) setLoading(false) }
  }, [])
  useEffect(() => {
    if (canRead) void load()
    // These counters invalidate in-flight network responses; they are not DOM refs.
    const invalidate = () => { generation.current++; editorRequest.current++; busy.current = false }
    return invalidate
  }, [canRead, load])
  useEffect(() => { editorRequest.current++; setSelected(null); setSaving(false) }, [canManage])
  async function open(member: Member) {
    const request = ++editorRequest.current
    setError(''); setNotice(''); setSelected(null)
    try { const fresh = await teamApi.get(member.id); if (request !== editorRequest.current) return; setSelected(fresh); setRole(fresh.role === 'platform_admin' ? 'viewer' : fresh.role); setConfirmed(false); setBlocked(false) }
    catch (cause) { if (request === editorRequest.current) setError(errorMessage(cause)) }
  }
  function close() { editorRequest.current++; setSelected(null); setError('') }
  async function save() {
    if (!selected || !canManage || !confirmed || busy.current || blocked || selected.id === userId || selected.role === 'platform_admin' || selected.role === role) return
    busy.current = true; setSaving(true); setError('')
    const request = editorRequest.current
    try {
      const updated = await teamApi.changeRole(selected, role)
      if (request !== editorRequest.current) return
      setMembers(old => old.map(member => member.id === updated.id ? updated : member)); setSelected(null)
      setNotice(`Role updated for ${updated.displayName}. Effective access is enforced by the server.`)
    } catch (cause) { if (request === editorRequest.current) { setError(errorMessage(cause)); setBlocked(true) } }
    finally { busy.current = false; if (request === editorRequest.current) setSaving(false) }
  }
  if (accountType === 'individual') return <section className="panel"><span className="eyebrow">JUST YOUR WORKSPACE</span><h2>Personal workspace</h2><p>Your account has a private individual workspace. Organization member management does not apply to this account.</p></section>
  if (!canRead) return <AccessDenied subject="Organization members" />
  return <>
    <section className="panel team-intro"><div><span className="eyebrow">PEOPLE & PERMISSIONS</span><h2>Organization members</h2><p>Review the existing people in your organization and their current roles.</p></div><span className="workspace-pill">{canManage ? 'Role administration' : 'Read-only roster'}</span></section>
    <section className="panel team-roster" aria-busy={loading}>
      <div className="panel-heading"><div><h2>Member roster</h2><p>Only your current organization. No external workspace selection.</p></div><button className="text-button" disabled={loading || saving} onClick={() => void load()}>Refresh roster</button></div>
      {error && <p className="team-alert" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!canManage && <p className="team-note">Read-only. Your access permits viewing members, not changing their roles.</p>}
      {loading && <p role="status">Loading members…</p>}
      {!loading && !error && members.length === 0 && <p>No members are available.</p>}
      <div className="team-table-wrap"><table className="team-table"><thead><tr><th scope="col">Member</th><th scope="col">Role</th><th scope="col">Access</th></tr></thead><tbody>{members.map(member => <tr key={member.id}><td><strong>{member.displayName}{member.id === userId ? ' (you)' : ''}</strong><span>{member.email}</span></td><td><span className="team-role">{label(member.role)}</span></td><td>{canManage && member.id !== userId && member.role !== 'platform_admin' ? <button className="text-button" disabled={saving || loading} onClick={() => void open(member)}>Review role for {member.displayName}</button> : <span>{member.id === userId ? 'Own role protected' : member.role === 'platform_admin' ? 'Platform role protected' : 'Read-only'}</span>}</td></tr>)}</tbody></table></div>
      {cursor && <button className="text-button" disabled={loading || saving} onClick={() => void load(cursor)}>Load more members</button>}
    </section>
    {selected && canManage && <section className="panel team-review" role="region" aria-label="Review role change"><div className="panel-heading"><h2>Review role change</h2><button className="text-button" disabled={saving} onClick={close}>Close review</button></div><p><strong>{selected.displayName}</strong> · {selected.email}</p><p>Current role: {label(selected.role)}</p><label htmlFor="member-role">New role</label><select id="member-role" disabled={saving || blocked} value={role} onChange={event => { setRole(event.target.value as MemberRole); setConfirmed(false) }}>{MEMBER_ROLES.map(value => <option key={value} value={value}>{label(value)}</option>)}</select><p>{impact[role]} Role changes affect this person’s access on subsequent requests. Resource-specific restrictions still apply.</p><label className="team-confirm"><input type="checkbox" checked={confirmed} disabled={saving || blocked} onChange={event => setConfirmed(event.target.checked)} />I reviewed the access impact for this member.</label><button className="primary-button" disabled={!confirmed || saving || blocked || selected.role === role} onClick={() => void save()}>{saving ? 'Updating role…' : 'Confirm role change'}</button></section>}
    <OrganizationRoot />
  </>
}
