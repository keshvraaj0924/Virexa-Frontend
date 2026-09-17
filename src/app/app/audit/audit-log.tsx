'use client'

import { useEffect, useState } from 'react'
import type { AuditEvent } from '@/contracts'
import { fetchAuditEvents } from '@/lib/api/audit'

function formatTimestamp(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
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

  if (loading) return <section className="panel"><p>Loading audit events…</p></section>
  if (error) return <section className="panel"><p role="alert">{error}</p></section>

  return (
    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">TENANT AUDIT TRAIL</span><h2>Recent activity</h2></div><span className="workspace-pill">{events.length} events</span></div>
      {events.length === 0 ? <p>No audit events have been recorded for this organization.</p> : (
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead><tr><th>Time</th><th>Action</th><th>Resource</th><th>Actor</th><th>Request</th></tr></thead>
            <tbody>{events.map((event) => (
              <tr key={event.id}>
                <td>{formatTimestamp(event.createdAt)}</td>
                <td><strong>{event.action}</strong></td>
                <td>{event.resourceType}{event.resourceId ? ` · ${event.resourceId}` : ''}</td>
                <td>{event.actorUserId ?? 'System'}</td>
                <td><code>{event.requestId}</code></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}
