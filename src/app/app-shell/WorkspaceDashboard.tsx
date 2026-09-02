'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { listWorkflows } from '@/lib/api/workflows'
import { useSession } from '@/lib/auth/session-provider'
import type { Workflow } from '@/contracts/workflows'

export default function WorkspaceDashboard() {
  const { state } = useSession()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (state.status !== 'authenticated' || !state.context.permissions.includes('workflow:read')) return
    listWorkflows().then(setWorkflows).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load workflows.'))
  }, [state])

  if (state.status !== 'authenticated') return null
  const active = workflows.filter((workflow) => workflow.status === 'active').length
  const draft = workflows.filter((workflow) => workflow.status === 'draft').length
  const paused = workflows.filter((workflow) => workflow.status === 'paused').length

  return (
    <>
      <div className="dashboard-grid">
        <article className="metric-card"><span>Total workflows</span><strong>{workflows.length}</strong><small>Tenant-scoped resources</small></article>
        <article className="metric-card"><span>Active</span><strong>{active}</strong><small>Currently enabled</small></article>
        <article className="metric-card"><span>Draft</span><strong>{draft}</strong><small>Awaiting activation</small></article>
        <article className="metric-card"><span>Paused</span><strong>{paused}</strong><small>Temporarily stopped</small></article>
      </div>
      <section className="dashboard-panel">
        <div className="panel-heading"><div><span className="eyebrow">OPERATIONS</span><h2>Recent workflows</h2></div><Link className="workspace-pill" href="/app/workflows">Open workflows</Link></div>
        {error && <p role="alert">{error}</p>}
        {!error && workflows.length === 0 && <p>No workflows have been created in this workspace yet.</p>}
        {!error && workflows.slice(0, 5).map((workflow) => (
          <div className="activity-row" key={workflow.id}>
            <div><strong>{workflow.name}</strong><span>{workflow.description || 'No description'}</span></div>
            <span>{workflow.status}</span>
          </div>
        ))}
      </section>
    </>
  )
}
