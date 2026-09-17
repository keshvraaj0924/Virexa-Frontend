'use client'

import { FormEvent, useEffect, useState } from 'react'
import type { Workflow, WorkflowStatus } from '@/contracts/workflows'
import { workflowsApi } from '@/lib/api/workflows'
import type { UserRole } from '@/contracts/auth'
import { hasPermission } from '@/lib/auth/permissions'

interface WorkflowPanelProps {
  role: UserRole
  userId: string
}

const NEXT_STATUSES: Readonly<Record<WorkflowStatus, readonly WorkflowStatus[]>> = {
  draft: ['active'],
  active: ['paused', 'archived'],
  paused: ['active', 'archived'],
  archived: [],
}

export default function WorkflowPanel({ role, userId }: WorkflowPanelProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [updatingWorkflowId, setUpdatingWorkflowId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canCreate = hasPermission(role, 'workflow:create')
  const canManageAll = hasPermission(role, 'workflow:manage')

  useEffect(() => {
    let cancelled = false
    workflowsApi.list().then((response) => {
      if (!cancelled) setWorkflows(response.data)
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load workflows.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  async function createWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const response = await workflowsApi.create(
        { name: name.trim(), description: description.trim() || null },
        crypto.randomUUID(),
      )
      setWorkflows((current) => [response.data, ...current])
      setName('')
      setDescription('')
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Unable to create workflow.')
    } finally {
      setSubmitting(false)
    }
  }

  async function transitionWorkflow(workflowId: string, status: WorkflowStatus) {
    setUpdatingWorkflowId(workflowId)
    setError(null)
    try {
      const response = await workflowsApi.update(workflowId, { status })
      setWorkflows((current) => current.map((workflow) => workflow.id === workflowId ? response.data : workflow))
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Unable to update workflow.')
    } finally {
      setUpdatingWorkflowId(null)
    }
  }

  return (
    <section className="dashboard-panel" aria-labelledby="workflow-heading">
      <div className="panel-heading">
        <div><span className="eyebrow">OPERATIONS</span><h2 id="workflow-heading">Workflows</h2></div>
        <span className="status-chip">Live API</span>
      </div>
      {canCreate && (
        <form className="auth-form" onSubmit={createWorkflow}>
          <label>Name<input value={name} onChange={(event) => setName(event.target.value)} minLength={1} maxLength={160} required /></label>
          <label>Description<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} /></label>
          <button type="submit" className="primary-button" disabled={submitting}>{submitting ? 'Creating…' : 'Create workflow'}</button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {loading ? <p>Loading workflows…</p> : workflows.length === 0 ? <p>No workflows are configured for this organization yet.</p> : (
        <div>
          {workflows.map((workflow) => {
            const canManageWorkflow = canManageAll || (canCreate && workflow.createdByUserId === userId)
            const nextStatuses = canManageWorkflow ? NEXT_STATUSES[workflow.status] : []
            return (
              <div className="activity-row" key={workflow.id}>
                <div><strong>{workflow.name}</strong><span>{workflow.description || 'No description'}</span></div>
                <div>
                  <span>{workflow.status}</span>
                  {nextStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className="header-link"
                      disabled={updatingWorkflowId === workflow.id}
                      onClick={() => void transitionWorkflow(workflow.id, status)}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
