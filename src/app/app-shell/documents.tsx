'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { DocumentRecord, DocumentStatus } from '@/contracts/documents'
import type { UserRole } from '@/contracts/auth'
import { uploadDocument } from '@/lib/api/document-upload'
import { documentsApi } from '@/lib/api/documents'
import { hasPermission } from '@/lib/auth/permissions'

interface DocumentsPanelProps { role: UserRole }

const STATUS_LABELS: Record<DocumentStatus, string> = {
  received: 'Received', processing: 'Processing', review_required: 'Needs review', completed: 'Completed', failed: 'Failed',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsPanel({ role }: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [status, setStatus] = useState<DocumentStatus | ''>('')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const requestSequenceRef = useRef(0)
  const canRead = hasPermission(role, 'document:read')
  const canCreate = hasPermission(role, 'document:create')

  const metrics = useMemo(() => ({
    visible: documents.length,
    processing: documents.filter((item) => item.status === 'processing').length,
    review: documents.filter((item) => item.status === 'review_required').length,
    failed: documents.filter((item) => item.status === 'failed').length,
  }), [documents])

  async function load(cursor?: string, append = false) {
    const requestSequence = ++requestSequenceRef.current
    append ? setLoadingMore(true) : setLoading(true)
    setError(null)
    try {
      const response = await documentsApi.list({ status: status || undefined, cursor, limit: 24 })
      if (requestSequence !== requestSequenceRef.current) return
      setDocuments((current) => append ? [...current, ...response.data.items] : response.data.items)
      setNextCursor(response.data.nextCursor)
    } catch (cause: unknown) {
      if (requestSequence !== requestSequenceRef.current) return
      setError(cause instanceof Error ? cause.message : 'Unable to load documents.')
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        append ? setLoadingMore(false) : setLoading(false)
      }
    }
  }

  async function handleUpload(file: File) {
    setUploading(true)
    setError(null)
    try {
      await uploadDocument(file)
      await load()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Unable to upload document.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  useEffect(() => { if (canRead) void load() }, [status, canRead])

  if (!canRead) return <section className="workflow-state"><div><strong>Documents unavailable</strong><p>Your role does not include document access.</p></div></section>
  if (loading) return <section className="workflow-state"><span className="audit-loader" aria-hidden="true"/><div><strong>Loading secure inbox</strong><p>Retrieving organization-scoped documents from the live API.</p></div></section>

  return <>
    <section className="workflow-summary" aria-label="Document inbox overview">
      <article className="workflow-stat"><span>Visible documents</span><strong>{metrics.visible}</strong><small>Current loaded result set</small></article>
      <article className="workflow-stat"><span>Processing</span><strong>{metrics.processing}</strong><small>Automation in progress</small></article>
      <article className="workflow-stat"><span>Needs review</span><strong>{metrics.review}</strong><small>Human attention required</small></article>
      <article className="workflow-stat"><span>Failed</span><strong>{metrics.failed}</strong><small>Operational exceptions</small></article>
    </section>

    {error && <section className="workflow-alert" role="alert"><strong>Document operation failed</strong><span>{error}</span><button type="button" onClick={() => void load()}>Retry</button></section>}

    <section className="dashboard-panel workflow-panel" aria-labelledby="documents-heading">
      <div className="panel-heading workflow-heading"><div><span className="eyebrow">INTELLIGENT INBOX</span><h2 id="documents-heading">Documents</h2><p>Live, tenant-scoped intake records with opaque cursor pagination.</p></div><div className="workflow-actions"><select aria-label="Filter by document status" value={status} onChange={(event) => setStatus(event.target.value as DocumentStatus | '')}><option value="">All statuses</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{canCreate && <><input ref={fileInputRef} type="file" hidden disabled={uploading} aria-label="Choose document to upload" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleUpload(file) }}/><button type="button" className="primary-button" disabled={uploading} onClick={() => fileInputRef.current?.click()}>{uploading ? 'Uploading…' : 'Upload document'}</button></>}</div></div>

      {documents.length === 0 ? <div className="workflow-empty"><strong>No documents found</strong><p>{status ? 'No documents match this status.' : 'Documents will appear here after they enter the organization intake pipeline.'}</p></div> : <div className="workflow-grid">
        {documents.map((document) => <article className="workflow-card" key={document.id}>
          <div className="workflow-card-top"><span className={`workflow-status workflow-status-${document.status === 'review_required' ? 'paused' : document.status === 'completed' ? 'active' : 'draft'}`}>{STATUS_LABELS[document.status]}</span><span className="workflow-version">{document.source}</span></div>
          <h3 title={document.originalFileName}>{document.originalFileName}</h3>
          <p>{document.mediaType} · {formatBytes(document.sizeBytes)}</p>
          <div className="workflow-card-footer"><span className="workflow-id" title={document.id}>{document.id.slice(0, 8)}</span><span>{new Date(document.receivedAt).toLocaleDateString()}</span></div>
        </article>)}
      </div>}

      {nextCursor && <div className="workflow-actions"><button type="button" className="primary-button" disabled={loadingMore} onClick={() => void load(nextCursor, true)}>{loadingMore ? 'Loading…' : 'Load more'}</button></div>}
    </section>
  </>
}
