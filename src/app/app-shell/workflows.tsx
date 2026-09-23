'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Workflow, WorkflowStatus } from '@/contracts/workflows'
import { workflowsApi } from '@/lib/api/workflows'
import type { UserRole } from '@/contracts/auth'
import { hasPermission } from '@/lib/auth/permissions'

interface WorkflowPanelProps { role: UserRole }

const NEXT_STATUSES: Readonly<Record<WorkflowStatus, readonly WorkflowStatus[]>> = {
  draft: ['active'], active: ['paused', 'archived'], paused: ['active', 'archived'], archived: [],
}

const STATUS_LABELS: Record<WorkflowStatus, string> = { draft: 'Draft', active: 'Active', paused: 'Paused', archived: 'Archived' }

export default function WorkflowPanel({ role }: WorkflowPanelProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [updatingWorkflowId, setUpdatingWorkflowId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canCreate = hasPermission(role, 'workflow:create')
  const canRequestLifecycleChange = canCreate || hasPermission(role, 'workflow:manage')
  const metrics = useMemo(() => ({
    total: workflows.length,
    active: workflows.filter((workflow) => workflow.status === 'active').length,
    paused: workflows.filter((workflow) => workflow.status === 'paused').length,
    draft: workflows.filter((workflow) => workflow.status === 'draft').length,
  }), [workflows])

  useEffect(() => {
    let cancelled = false
    workflowsApi.list().then((response) => { if (!cancelled) setWorkflows(response.data.items) })
      .catch((cause: unknown) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load workflows.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function createWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError(null)
    try {
      const response = await workflowsApi.create({ name: name.trim(), description: description.trim() || null }, crypto.randomUUID())
      setWorkflows((current) => [response.data, ...current]); setName(''); setDescription('')
    } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Unable to create workflow.') }
    finally { setSubmitting(false) }
  }

  async function transitionWorkflow(workflow: Workflow, status: WorkflowStatus) {
    setUpdatingWorkflowId(workflow.id); setError(null)
    try {
      const response = await workflowsApi.update(workflow.id, { status, expectedVersion: workflow.version })
      setWorkflows((current) => current.map((item) => item.id === workflow.id ? response.data : item))
    } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Unable to update workflow. Refresh to load the latest version before retrying.') }
    finally { setUpdatingWorkflowId(null) }
  }

  if (loading) return <section className="workflow-state"><span className="audit-loader" aria-hidden="true"/><div><strong>Loading operations</strong><p>Retrieving your organization workflows securely.</p></div></section>

  return <>
    <section className="workflow-summary" aria-label="Workflow overview">
      <article className="workflow-stat"><span>Total workflows</span><strong>{metrics.total}</strong><small>Organization scoped</small></article>
      <article className="workflow-stat"><span>Active</span><strong>{metrics.active}</strong><small>Running operations</small></article>
      <article className="workflow-stat"><span>Paused</span><strong>{metrics.paused}</strong><small>Awaiting resume</small></article>
      <article className="workflow-stat"><span>Draft</span><strong>{metrics.draft}</strong><small>Preparing launch</small></article>
    </section>

    {error && <section className="workflow-alert" role="alert"><strong>Workflow operation failed</strong><span>{error}</span></section>}

    {canCreate && <section className="dashboard-panel workflow-create" aria-labelledby="workflow-create-heading">
      <div className="panel-heading"><div><span className="eyebrow">BUILD</span><h2 id="workflow-create-heading">Create workflow</h2><p>Start an organization-scoped automation with a clear operational purpose.</p></div><span className="status-chip">Secure API</span></div>
      <form className="workflow-form" onSubmit={createWorkflow}>
        <label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} minLength={1} maxLength={160} placeholder="Invoice intake automation" required /></label>
        <label className="workflow-description"><span>Description</span><input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} placeholder="Describe the business outcome and operating boundary" /></label>
        <button type="submit" className="primary-button" disabled={submitting}>{submitting ? 'Creating…' : 'Create workflow'}</button>
      </form>
    </section>}

    <section className="dashboard-panel workflow-panel" aria-labelledby="workflow-heading">
      <div className="panel-heading workflow-heading"><div><span className="eyebrow">OPERATIONS</span><h2 id="workflow-heading">Workflow portfolio</h2><p>Lifecycle controls are permission-aware and protected by optimistic concurrency.</p></div><span className="status-chip">Live API</span></div>
      {workflows.length === 0 ? <div className="workflow-empty"><strong>No workflows yet</strong><p>Create the first workflow when your operating process is ready to automate.</p></div> : <div className="workflow-grid">
        {workflows.map((workflow) => {
          const nextStatuses = canRequestLifecycleChange ? NEXT_STATUSES[workflow.status] : []
          return <article className="workflow-card" key={workflow.id}>
            <div className="workflow-card-top"><span className={`workflow-status workflow-status-${workflow.status}`}>{STATUS_LABELS[workflow.status]}</span><span className="workflow-version">v{workflow.version}</span></div>
            <h3>{workflow.name}</h3><p>{workflow.description || 'No description provided.'}</p>
            <div className="workflow-card-footer"><span className="workflow-id" title={workflow.id}>{workflow.id.slice(0, 8)}</span><div className="workflow-actions">{nextStatuses.map((status) => <button key={status} type="button" disabled={updatingWorkflowId === workflow.id} onClick={() => void transitionWorkflow(workflow, status)}>{updatingWorkflowId === workflow.id ? 'Updating…' : STATUS_LABELS[status]}</button>)}</div></div>
          </article>
        })}
      </div>}
    </section>
  </>
}
