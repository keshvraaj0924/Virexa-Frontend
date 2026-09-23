'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
const PAGE_SIZE = 24

export default function WorkflowPanel({ role }: WorkflowPanelProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>('all')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [updatingWorkflowId, setUpdatingWorkflowId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canCreate = hasPermission(role, 'workflow:create')
  const canRequestLifecycleChange = canCreate || hasPermission(role, 'workflow:manage')
  const metrics = useMemo(() => ({
    loaded: workflows.length,
    active: workflows.filter((workflow) => workflow.status === 'active').length,
    paused: workflows.filter((workflow) => workflow.status === 'paused').length,
    draft: workflows.filter((workflow) => workflow.status === 'draft').length,
  }), [workflows])

  const loadWorkflows = useCallback(async (cursor?: string) => {
    const response = await workflowsApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: PAGE_SIZE,
      cursor,
    })
    setWorkflows((current) => cursor ? [...current, ...response.data.items] : response.data.items)
    setNextCursor(response.data.nextCursor)
  }, [statusFilter])

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    workflowsApi.list({ status: statusFilter === 'all' ? undefined : statusFilter, limit: PAGE_SIZE })
      .then((response) => {
        if (!cancelled) { setWorkflows(response.data.items); setNextCursor(response.data.nextCursor) }
      })
      .catch((cause: unknown) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load workflows.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [statusFilter])

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true); setError(null)
    try { await loadWorkflows(nextCursor) }
    catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Unable to load more workflows.') }
    finally { setLoadingMore(false) }
  }

  async function createWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError(null)
    try {
      const response = await workflowsApi.create({ name: name.trim(), description: description.trim() || null }, crypto.randomUUID())
      if (statusFilter === 'all' || statusFilter === response.data.status) setWorkflows((current) => [response.data, ...current])
      setName(''); setDescription('')
    } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Unable to create workflow.') }
    finally { setSubmitting(false) }
  }

  async function transitionWorkflow(workflow: Workflow, status: WorkflowStatus) {
    setUpdatingWorkflowId(workflow.id); setError(null)
    try {
      const response = await workflowsApi.update(workflow.id, { status, expectedVersion: workflow.version })
      setWorkflows((current) => statusFilter !== 'all' && response.data.status !== statusFilter
        ? current.filter((item) => item.id !== workflow.id)
        : current.map((item) => item.id === workflow.id ? response.data : item))
    } catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Unable to update workflow. Refresh to load the latest version before retrying.') }
    finally { setUpdatingWorkflowId(null) }
  }

  return <>
    <section className="workflow-summary" aria-label="Loaded workflow overview">
      <article className="workflow-stat"><span>Loaded</span><strong>{metrics.loaded}</strong><small>{nextCursor ? 'More available' : 'Current result set'}</small></article>
      <article className="workflow-stat"><span>Active loaded</span><strong>{metrics.active}</strong><small>Running operations</small></article>
      <article className="workflow-stat"><span>Paused loaded</span><strong>{metrics.paused}</strong><small>Awaiting resume</small></article>
      <article className="workflow-stat"><span>Draft loaded</span><strong>{metrics.draft}</strong><small>Preparing launch</small></article>
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
      <div className="panel-heading workflow-heading"><div><span className="eyebrow">OPERATIONS</span><h2 id="workflow-heading">Workflow portfolio</h2><p>Lifecycle controls are permission-aware and protected by optimistic concurrency.</p></div><div className="workflow-toolbar"><label><span className="sr-only">Filter workflows by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as WorkflowStatus | 'all')}><option value="all">All statuses</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><span className="status-chip">Live API</span></div></div>
      {loading ? <div className="workflow-state"><span className="audit-loader" aria-hidden="true"/><div><strong>Loading operations</strong><p>Retrieving your organization workflows securely.</p></div></div> : workflows.length === 0 ? <div className="workflow-empty"><strong>No workflows found</strong><p>{statusFilter === 'all' ? 'Create the first workflow when your operating process is ready to automate.' : `No ${STATUS_LABELS[statusFilter].toLowerCase()} workflows match this view.`}</p></div> : <>
        <div className="workflow-grid">{workflows.map((workflow) => {
          const nextStatuses = canRequestLifecycleChange ? NEXT_STATUSES[workflow.status] : []
          return <article className="workflow-card" key={workflow.id}>
            <div className="workflow-card-top"><span className={`workflow-status workflow-status-${workflow.status}`}>{STATUS_LABELS[workflow.status]}</span><span className="workflow-version">v{workflow.version}</span></div>
            <h3>{workflow.name}</h3><p>{workflow.description || 'No description provided.'}</p>
            <div className="workflow-card-footer"><span className="workflow-id" title={workflow.id}>{workflow.id.slice(0, 8)}</span><div className="workflow-actions">{nextStatuses.map((status) => <button key={status} type="button" disabled={updatingWorkflowId === workflow.id} onClick={() => void transitionWorkflow(workflow, status)}>{updatingWorkflowId === workflow.id ? 'Updating…' : STATUS_LABELS[status]}</button>)}</div></div>
          </article>
        })}</div>
        {nextCursor && <div className="workflow-pagination"><button type="button" className="workflow-load-more" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? 'Loading…' : 'Load more workflows'}</button><span>Results are loaded securely from the next server cursor.</span></div>}
      </>}
    </section>
  </>
}
