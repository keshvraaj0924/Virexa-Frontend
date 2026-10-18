'use client'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { WORKFLOW_STATUSES, parseWorkflow, parseWorkflowList, type Workflow, type WorkflowStatus, type CreateWorkflowRequest } from '@/contracts/workflows'
import { workflowsApi } from '@/lib/api/workflows'
import { ApiError } from '@/lib/api/client'
import { AccessDenied, useAccess } from '@/components/access/access-provider'

const transitions: Record<WorkflowStatus, readonly WorkflowStatus[]> = { draft: ['active'], active: ['paused', 'archived'], paused: ['active', 'archived'], archived: [] }
export default function WorkflowRecords({ userId }: { userId: string }) {
  const access = useAccess()
  const readable = access?.allows('workflow:read') ?? false
  const creatable = access?.allows('workflow:create') ?? false
  const manageable = access?.allows('workflow:manage') ?? false
  const [items, setItems] = useState<Workflow[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editing, setEditing] = useState<Workflow | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStale, setEditStale] = useState(false)
  const [editStatus, setEditStatus] = useState<WorkflowStatus>('draft')
  const [uncertain, setUncertain] = useState(false)
  const pendingCreate = useRef<{ key: string; input: CreateWorkflowRequest } | null>(null)
  const epoch = useRef(0)
  const locked = useRef(false)
  const canEdit = (record: Workflow) => manageable || (creatable && record.createdByUserId === userId)
  useEffect(() => {
    pendingCreate.current = null; setUncertain(false); setName(''); setDescription(''); setNotice('')
  }, [userId])
  useEffect(() => {
    const request = ++epoch.current
    locked.current = false; setBusy(false); setEditing(null); setItems([]); setCursor(null); setError('')
    if (!readable) { setLoading(false); return }
    setLoading(true)
    workflowsApi.list({ limit: 24, status: filter ? filter as WorkflowStatus : undefined }).then(response => {
      if (request === epoch.current) { const data = parseWorkflowList(response.data); setItems(data.items); setCursor(data.nextCursor) }
    }).catch(() => { if (request === epoch.current) setError('Workflow records could not be loaded. Refresh to try again.') }).finally(() => { if (request === epoch.current) setLoading(false) })
    return () => { epoch.current = request + 1 }
  }, [readable, creatable, manageable, filter, revision, userId])
  function message(cause: unknown) {
    if (cause instanceof ApiError && [400, 422].includes(cause.status)) return 'Record details were rejected. Use a name of 1–120 characters and a description of up to 1,000 characters.'
    if (cause instanceof ApiError && cause.status === 409) return 'This record changed or the status transition is no longer valid. Close the editor and reload the latest record before trying again.'
    if (cause instanceof ApiError && [401, 403].includes(cause.status)) return 'Your access changed. The action was not retried. Check your current permissions.'
    return 'The result could not be confirmed. Refresh records to check the saved state before another update.'
  }
  async function action(run: () => Promise<void>) {
    if (locked.current) return
    locked.current = true; setBusy(true); setError(''); setNotice('')
    const request = epoch.current
    try { await run() } catch (cause) { if (request === epoch.current) setError(message(cause)) }
    finally { if (request === epoch.current) { locked.current = false; setBusy(false) } }
  }
  async function create(event: FormEvent) {
    event.preventDefault()
    if (!creatable || !readable) return
    await action(async () => {
      const request = epoch.current
      const pending = pendingCreate.current ?? { key: crypto.randomUUID(), input: { name: name.trim(), description: description.trim() || null } }
      pendingCreate.current = pending; setUncertain(true)
      try {
        const response = await workflowsApi.create(pending.input, pending.key)
        parseWorkflow(response.data)
        if (request !== epoch.current) return
        pendingCreate.current = null; setUncertain(false); setName(''); setDescription('')
        setNotice(`Saved “${response.data.name}” as a ${response.data.status} record. No actions were executed.`)
        setRevision(value => value + 1)
      } catch (cause) {
        if (request !== epoch.current) return
        // Retain both the exact payload and key for every uncertain retry.
        if (cause instanceof ApiError && ([400, 422].includes(cause.status) || cause.code === 'IDEMPOTENCY_KEY_REUSED')) { pendingCreate.current = null; setUncertain(false) }
        else setUncertain(true)
        throw cause
      }
    })
  }
  async function open(record: Workflow) {
    await action(async () => {
      const request = epoch.current
      const response = await workflowsApi.get(record.id)
      parseWorkflow(response.data)
      if (request !== epoch.current) return
      setEditing(response.data); setEditStale(false); setEditName(response.data.name); setEditDescription(response.data.description ?? ''); setEditStatus(response.data.status)
    })
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!editing || editStale || !readable || !canEdit(editing)) return
    await action(async () => {
      const request = epoch.current
      const response = await workflowsApi.update(editing.id, { expectedVersion: editing.version, name: editName.trim(), description: editDescription.trim() || null, status: editStatus }).then(result => { parseWorkflow(result.data); return result }).catch(cause => { if (request === epoch.current && !(cause instanceof ApiError && [400, 422].includes(cause.status))) setEditStale(true); throw cause })
      parseWorkflow(response.data)
      if (request !== epoch.current) return
      setEditing(null); setNotice(`Saved version ${response.data.version}. Status is a record only; no actions were executed.`); setRevision(value => value + 1)
    })
  }
  async function more() {
    if (!cursor || !readable) return
    await action(async () => {
      const request = epoch.current
      const response = await workflowsApi.list({ limit: 24, cursor, status: filter ? filter as WorkflowStatus : undefined })
      if (request !== epoch.current) return
      const data = parseWorkflowList(response.data)
      setItems(current => [...current, ...data.items.filter(item => !current.some(existing => existing.id === item.id))]); setCursor(data.nextCursor)
    })
  }
  if (!readable) return <AccessDenied subject="Workflow records" />
  return <>
    <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">DEFINITIONS, NOT EXECUTION</span><h2>Your processes, recorded.</h2><p>Save a name, description and lifecycle status. Active is a stored status, not a running automation. Steps, integrations and execution are not connected.</p></div><span className="status-chip">Records only</span></div></section>
    {error && <div className="workflow-alert" role="alert">{error}</div>}
    {notice && <p role="status">{notice}</p>}
    {creatable && <section className="dashboard-panel workflow-create"><div className="panel-heading"><h2>Create a workflow record</h2></div><form className="workflow-form" onSubmit={create}>
      <label>Name<input required maxLength={120} value={name} disabled={busy || uncertain} onChange={event => setName(event.target.value)} /></label>
      <label className="workflow-description">Description<input maxLength={1000} value={description} disabled={busy || uncertain} onChange={event => setDescription(event.target.value)} /></label>
      <button className="primary-button" disabled={busy || (!uncertain && !name.trim())}>{busy ? 'Saving…' : uncertain ? 'Retry same creation' : 'Create record'}</button>
      {uncertain && <p role="status">The response was interrupted. Retry uses the same request key and unchanged details to prevent a duplicate. Refreshing the list can show whether it was saved.</p>}
    </form></section>}
    <section className="dashboard-panel workflow-panel"><div className="panel-heading workflow-heading"><div><span className="eyebrow">SAVED IN YOUR WORKSPACE</span><h2>Workflow definitions</h2><p>{items.length} records loaded{cursor ? '; more available' : ''}. Ownership and permissions are checked on every request.</p></div><div className="workflow-toolbar"><label>Status<select aria-label="Filter workflow status" value={filter} disabled={busy} onChange={event => setFilter(event.target.value)}><option value="">All statuses</option>{WORKFLOW_STATUSES.map(status => <option key={status}>{status}</option>)}</select></label><button className="text-button" disabled={busy} onClick={() => setRevision(value => value + 1)}>Refresh records</button></div></div>
      {loading ? <p role="status">Loading workflow records…</p> : error && items.length === 0 ? null : items.length === 0 ? <div className="workflow-empty">No matching workflow records.</div> : <div className="workflow-grid">{items.map(record => <article className="workflow-card" key={record.id}><div className="workflow-card-top"><span className={`workflow-status workflow-status-${record.status}`}>{record.status}</span><span className="workflow-version">v{record.version}</span></div><h3>{record.name}</h3><p>{record.description || 'No description provided.'}</p><div className="workflow-card-footer"><small>Updated {new Date(record.updatedAt).toLocaleDateString()}</small><button className="text-button" disabled={busy} onClick={() => void open(record)}>View record</button></div></article>)}</div>}
      {cursor && <button className="workflow-load-more" disabled={busy} onClick={() => void more()}>Load more records</button>}
    </section>
    {editing && <section className="dashboard-panel workflow-create" aria-label="Workflow record editor"><div className="panel-heading"><div><h2>Record details</h2><p>Version {editing.version}. Changing a status does not execute work. Archive is retained history; deletion is unavailable.</p></div></div><form className="workflow-form" onSubmit={save}>
      <label>Record name<input required maxLength={120} disabled={busy || !canEdit(editing)} value={editName} onChange={event => setEditName(event.target.value)} /></label>
      <label className="workflow-description">Record description<input maxLength={1000} disabled={busy || !canEdit(editing)} value={editDescription} onChange={event => setEditDescription(event.target.value)} /></label>
      <label>Recorded status<select disabled={busy || !canEdit(editing)} value={editStatus} onChange={event => setEditStatus(event.target.value as WorkflowStatus)}>{[editing.status, ...transitions[editing.status]].map(status => <option key={status}>{status}</option>)}</select></label>
      {canEdit(editing) ? <button className="primary-button" disabled={busy || editStale || !editName.trim()}>Save record</button> : <p>Read-only. You cannot update this record.</p>}
      <button className="text-button" type="button" disabled={busy} onClick={() => { setEditing(null); setError('') }}>Close editor</button>
    </form></section>}
  </>
}
