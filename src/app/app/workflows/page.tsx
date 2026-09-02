'use client'

import { useEffect, useState } from 'react'
import { createWorkflow, listWorkflows, updateWorkflow } from '@/lib/api/workflows'
import type { Workflow } from '@/contracts/workflows'
import { SessionProvider, useSession } from '@/lib/auth/session-provider'
import ProtectedWorkspace from '@/app/app-shell/ProtectedWorkspace'

function WorkflowManager() {
  const { state } = useSession()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (state.status !== 'authenticated') return
    listWorkflows().then(setWorkflows).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load workflows.'))
  }, [state])

  if (state.status !== 'authenticated') return null
  const canCreate = state.context.permissions.includes('workflow:create')
  const canManage = state.context.permissions.includes('workflow:manage')

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const workflow = await createWorkflow({ name, description: description || null })
      setWorkflows((current) => [workflow, ...current])
      setName('')
      setDescription('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create workflow.')
    } finally { setBusy(false) }
  }

  async function handleStatus(workflow: Workflow) {
    setError(null)
    try {
      const status = workflow.status === 'active' ? 'paused' : 'active'
      const updated = await updateWorkflow(workflow.id, { status })
      setWorkflows((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update workflow.')
    }
  }

  return (
    <div className="dashboard-panel">
      {error && <p role="alert">{error}</p>}
      {canCreate && <form onSubmit={handleCreate} className="workflow-form">
        <div><label htmlFor="workflow-name">Name</label><input id="workflow-name" required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div><label htmlFor="workflow-description">Description</label><textarea id="workflow-description" maxLength={4000} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
        <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create workflow'}</button>
      </form>}
      {!canCreate && <p>You have read-only access to workflows in this workspace.</p>}
      <div>{workflows.map((workflow) => {
        const canEdit = canManage || workflow.createdByUserId === state.context.user.id
        return <article className="activity-row" key={workflow.id}>
          <div><strong>{workflow.name}</strong><span>{workflow.description || 'No description'}</span></div>
          <div><span>{workflow.status}</span>{canEdit && <button type="button" onClick={() => void handleStatus(workflow)}>{workflow.status === 'active' ? 'Pause' : 'Activate'}</button>}</div>
        </article>
      })}</div>
    </div>
  )
}

export default function WorkflowsPage() {
  return <SessionProvider><ProtectedWorkspace><WorkflowManager /></ProtectedWorkspace></SessionProvider>
}
