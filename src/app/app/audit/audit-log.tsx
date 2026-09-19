'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AuditEvent } from '@/contracts'
import { fetchAuditEvents } from '@/lib/api/audit'

function formatTimestamp(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function shortId(value: string | null) {
  if (!value) return 'System'
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value
}

export default function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchAuditEvents(100)
      .then((items) => { if (active) setEvents(items) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load audit events.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const summary = useMemo(() => ({
    actions: new Set(events.map((event) => event.action)).size,
    resources: new Set(events.map((event) => event.resourceType)).size,
    actors: new Set(events.map((event) => event.actorUserId).filter(Boolean)).size,
  }), [events])

  if (loading) return <section className="panel audit-state" aria-busy="true"><span className="audit-loader" /><div><strong>Loading governance trail</strong><p>Retrieving your organization’s latest auditable activity.</p></div></section>
  if (error) return <section className="panel audit-state audit-error"><div><strong>Audit trail unavailable</strong><p role="alert">{error}</p></div></section>

  return (
    <>
      <section className="audit-summary" aria-label="Audit summary">
        <article className="audit-stat"><span>Captured events</span><strong>{events.length}</strong><small>Latest secured activity</small></article>
        <article className="audit-stat"><span>Action types</span><strong>{summary.actions}</strong><small>Distinct operations</small></article>
        <article className="audit-stat"><span>Resources</span><strong>{summary.resources}</strong><small>Protected resource types</small></article>
        <article className="audit-stat"><span>Human actors</span><strong>{summary.actors}</strong><small>Authenticated identities</small></article>
      </section>
      <section className="panel audit-panel">
        <div className="panel-heading audit-heading"><div><span className="eyebrow">TENANT AUDIT TRAIL</span><h2>Recent activity</h2><p>Immutable operational visibility for authorized organization administrators.</p></div><span className="workspace-pill">Last {events.length} events</span></div>
        {events.length === 0 ? <div className="audit-empty"><strong>No audit events yet</strong><p>Auditable activity for this organization will appear here when recorded.</p></div> : (
          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead><tr><th>Time</th><th>Action</th><th>Resource</th><th>Actor</th><th>Request ID</th></tr></thead>
              <tbody>{events.map((event) => (
                <tr key={event.id}>
                  <td><span className="audit-time">{formatTimestamp(event.createdAt)}</span></td>
                  <td><span className="audit-action">{event.action}</span></td>
                  <td><strong>{event.resourceType}</strong>{event.resourceId ? <small className="audit-subvalue">{shortId(event.resourceId)}</small> : null}</td>
                  <td><span>{shortId(event.actorUserId)}</span></td>
                  <td><code className="audit-request">{shortId(event.requestId)}</code></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
