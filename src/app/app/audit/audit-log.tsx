'use client'
import { useEffect, useState } from 'react'
import { AccessDenied, useAccess } from '@/components/access/access-provider'
import { AUDIT_ACTIONS, AUDIT_OUTCOMES, fetchTenantAudit, type AuditAction, type AuditOutcome, type TenantAuditPage } from '@/lib/api/tenant-audit'
const short = (id: string | null) => id ? `${id.slice(0, 8)}…${id.slice(-6)}` : 'Not available'
export default function AuditLog() {
  const access = useAccess()
  const allowed = access?.allows('audit:read') ?? false
  const [action, setAction] = useState<AuditAction | ''>('')
  const [outcome, setOutcome] = useState<AuditOutcome | ''>('')
  const [cursors, setCursors] = useState<string[]>([])
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<TenantAuditPage | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const cursor = cursors.at(-1)
  useEffect(() => {
    const controller = new AbortController()
    setData(null); setError(false)
    if (!allowed) { setLoading(false); return () => controller.abort() }
    setLoading(true)
    fetchTenantAudit({ cursor, action: action || undefined, outcome: outcome || undefined }, controller.signal)
      .then(value => { if (!controller.signal.aborted) setData(value) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [allowed, cursor, action, outcome, revision])
  if (!allowed) return <AccessDenied subject="Audit events" />
  return <div className="vx-audit">
    <section className="panel audit-panel">
      <div className="panel-heading audit-heading"><div><span className="eyebrow">TENANT AUDIT TRAIL</span><h2>Recent activity</h2><p>Read-only records for your current workspace. Counts describe this page only.</p></div><button className="text-button" disabled={loading} onClick={() => { setCursors([]); setRevision(v => v + 1) }}>Refresh audit events</button></div>
      <div className="vx-audit-filters">
        <label>Action<select value={action} onChange={e => { setData(null); setAction(e.target.value as AuditAction | ''); setCursors([]) }}><option value="">All actions</option>{AUDIT_ACTIONS.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>Outcome<select value={outcome} onChange={e => { setData(null); setOutcome(e.target.value as AuditOutcome | ''); setCursors([]) }}><option value="">All outcomes</option>{AUDIT_OUTCOMES.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      </div>
      {loading ? <p className="audit-empty" role="status">Loading recorded activity…</p> : error ? <div className="audit-empty" role="alert"><strong>Audit trail unavailable</strong><p>No events are shown because current records could not be verified. Try refreshing.</p></div> : data ? <>
        <aside className="vx-audit-coverage" aria-label="Recording coverage"><strong>Recording coverage</strong><p>{data.coverage.notice}</p><p>These operational records are not a tamper-proof archive or a compliance certification.</p></aside>
        <p className="vx-audit-count" role="status">{data.events.length} events on page {cursors.length + 1}</p>
        {data.events.length === 0 ? <div className="audit-empty"><strong>No matching recorded events</strong><p>No records match this page and these filters. This does not imply that no earlier activity occurred.</p></div> : <div className="audit-table-wrap"><table className="audit-table"><thead><tr><th>Time</th><th>Action</th><th>Outcome</th><th>Resource</th><th>Actor ID</th><th>Request ID</th></tr></thead><tbody>{data.events.map(event => <tr key={event.id}><td><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time></td><td>{event.action}</td><td>{event.outcome}</td><td>{event.resourceType}{event.resourceId && <small className="audit-subvalue" title={event.resourceId}>{short(event.resourceId)}</small>}</td><td title={event.actorUserId ?? undefined}>{short(event.actorUserId)}</td><td title={event.requestId}>{short(event.requestId)}</td></tr>)}</tbody></table></div>}
        <div className="vx-audit-pagination"><button className="text-button" disabled={!cursors.length} onClick={() => { setData(null); setCursors(v => v.slice(0, -1)) }}>Newer events</button><button className="text-button" disabled={!data.nextCursor} onClick={() => { if (data.nextCursor) { setData(null); setCursors(v => [...v, data.nextCursor!]) } }}>Older events</button></div>
      </> : null}
    </section>
  </div>
}
