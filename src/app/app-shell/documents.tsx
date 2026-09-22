'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { DocumentRecord, DocumentStatus } from '@/contracts/documents'
import type { DocumentExtraction, ExtractionFieldValue } from '@/contracts/extractions'
import type { UserRole } from '@/contracts/auth'
import { uploadDocument } from '@/lib/api/document-upload'
import { documentsApi } from '@/lib/api/documents'
import { extractionsApi } from '@/lib/api/extractions'
import { ApiError } from '@/lib/api/client'
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

function editableValue(value: ExtractionFieldValue): string {
  return value === null ? '' : String(value)
}

function preserveValueType(input: string, original: ExtractionFieldValue): ExtractionFieldValue {
  if (original === null) return input || null
  if (typeof original === 'number') {
    const parsed = Number(input)
    return Number.isFinite(parsed) ? parsed : input
  }
  if (typeof original === 'boolean') {
    if (input.toLowerCase() === 'true') return true
    if (input.toLowerCase() === 'false') return false
  }
  return input
}

export default function DocumentsPanel({ role }: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [status, setStatus] = useState<DocumentStatus | ''>('')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null)
  const [extractions, setExtractions] = useState<DocumentExtraction[]>([])
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewDraft, setReviewDraft] = useState<Record<string, string>>({})
  const [reviewing, setReviewing] = useState(false)
  const [reviewMessage, setReviewMessage] = useState<string | null>(null)
  const [reviewConflict, setReviewConflict] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingExtractions, setLoadingExtractions] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const requestSequenceRef = useRef(0)
  const extractionSequenceRef = useRef(0)
  const canRead = hasPermission(role, 'document:read')
  const canCreate = hasPermission(role, 'document:create')
  const canManage = hasPermission(role, 'document:manage')

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
      if (requestSequence === requestSequenceRef.current) append ? setLoadingMore(false) : setLoading(false)
    }
  }

  async function inspect(document: DocumentRecord) {
    const requestSequence = ++extractionSequenceRef.current
    setSelectedDocument(document)
    setExtractions([])
    setReviewingId(null)
    setReviewMessage(null)
    setReviewConflict(false)
    setExtractionError(null)
    setLoadingExtractions(true)
    try {
      const response = await extractionsApi.list(document.id, { limit: 20 })
      if (requestSequence !== extractionSequenceRef.current) return
      setExtractions(response.data.items)
    } catch (cause: unknown) {
      if (requestSequence !== extractionSequenceRef.current) return
      setExtractionError(cause instanceof Error ? cause.message : 'Unable to load extraction history.')
    } finally {
      if (requestSequence === extractionSequenceRef.current) setLoadingExtractions(false)
    }
  }

  function beginReview(extraction: DocumentExtraction) {
    setReviewingId(extraction.id)
    setReviewDraft(Object.fromEntries(extraction.fields.map((field) => [field.key, editableValue(field.value)])))
    setReviewMessage(null)
    setReviewConflict(false)
  }

  async function submitReview(extraction: DocumentExtraction) {
    if (!selectedDocument) return
    setReviewing(true)
    setReviewMessage(null)
    setReviewConflict(false)
    try {
      const response = await extractionsApi.review(selectedDocument.id, extraction.id, {
        expectedUpdatedAt: extraction.updatedAt,
        fields: extraction.fields.map((field) => ({ key: field.key, value: preserveValueType(reviewDraft[field.key] ?? '', field.value) })),
      })
      setExtractions((current) => current.map((item) => item.id === extraction.id ? response.data : item))
      setReviewingId(null)
      setReviewMessage('Review saved from the latest authoritative extraction version.')
    } catch (cause: unknown) {
      if (cause instanceof ApiError && cause.code === 'EXTRACTION_REVIEW_CONFLICT') {
        setReviewConflict(true)
        setReviewMessage('This extraction changed while you were reviewing it. Reload before applying corrections.')
      } else {
        setReviewMessage(cause instanceof Error ? cause.message : 'Unable to save extraction review.')
      }
    } finally {
      setReviewing(false)
    }
  }

  async function handleUpload(file: File) {
    setUploading(true)
    setError(null)
    try { await uploadDocument(file); await load() }
    catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Unable to upload document.') }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = '' }
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
      {documents.length === 0 ? <div className="workflow-empty"><strong>No documents found</strong><p>{status ? 'No documents match this status.' : 'Documents will appear here after they enter the organization intake pipeline.'}</p></div> : <div className="workflow-grid">{documents.map((document) => <article className="workflow-card" key={document.id}><div className="workflow-card-top"><span className={`workflow-status workflow-status-${document.status === 'review_required' ? 'paused' : document.status === 'completed' ? 'active' : 'draft'}`}>{STATUS_LABELS[document.status]}</span><span className="workflow-version">{document.source}</span></div><h3 title={document.originalFileName}>{document.originalFileName}</h3><p>{document.mediaType} · {formatBytes(document.sizeBytes)}</p><div className="workflow-card-footer"><span className="workflow-id" title={document.id}>{document.id.slice(0, 8)}</span><button type="button" className="text-button" onClick={() => void inspect(document)}>Inspect AI extraction</button></div></article>)}</div>}
      {nextCursor && <div className="workflow-actions"><button type="button" className="primary-button" disabled={loadingMore} onClick={() => void load(nextCursor, true)}>{loadingMore ? 'Loading…' : 'Load more'}</button></div>}
    </section>

    {selectedDocument && <section className="dashboard-panel workflow-panel" aria-labelledby="extraction-heading">
      <div className="panel-heading workflow-heading"><div><span className="eyebrow">AI EXTRACTION</span><h2 id="extraction-heading">{selectedDocument.originalFileName}</h2><p>Live extraction history with permission-gated optimistic human review.</p></div><button type="button" className="text-button" onClick={() => { extractionSequenceRef.current += 1; setSelectedDocument(null); setExtractions([]); setReviewingId(null) }}>Close</button></div>
      {reviewMessage && <div className={reviewConflict ? 'workflow-alert' : 'workflow-state'} role={reviewConflict ? 'alert' : 'status'}><div><strong>{reviewConflict ? 'Review conflict' : 'Review updated'}</strong><p>{reviewMessage}</p>{reviewConflict && <button type="button" onClick={() => void inspect(selectedDocument)}>Reload authoritative version</button>}</div></div>}
      {loadingExtractions ? <div className="workflow-state"><span className="audit-loader" aria-hidden="true"/><div><strong>Loading extraction history</strong><p>Retrieving live extraction records.</p></div></div> : extractionError ? <div className="workflow-alert" role="alert"><strong>Extraction history unavailable</strong><span>{extractionError}</span><button type="button" onClick={() => void inspect(selectedDocument)}>Retry</button></div> : extractions.length === 0 ? <div className="workflow-empty"><strong>No extraction runs yet</strong><p>No AI extraction has been requested for this document.</p></div> : <div className="workflow-grid">
        {extractions.map((extraction) => <article className="workflow-card" key={extraction.id}>
          <div className="workflow-card-top"><span className={`workflow-status workflow-status-${extraction.status === 'completed' ? 'active' : extraction.status === 'review_required' ? 'paused' : 'draft'}`}>{extraction.status.replace('_', ' ')}</span><span className="workflow-version">Schema {extraction.schemaVersion}</span></div>
          <h3>{extraction.fields.length} extracted fields</h3>
          {reviewingId === extraction.id ? <div>{extraction.fields.map((field) => <label key={field.key} className="review-field"><span><strong>{field.key}</strong><small>{Math.round(field.confidence * 100)}% confidence{field.requiresReview ? ' · review required' : ''}</small></span><input aria-label={`Review ${field.key}`} value={reviewDraft[field.key] ?? ''} onChange={(event) => setReviewDraft((current) => ({ ...current, [field.key]: event.target.value }))}/></label>)}<div className="workflow-actions"><button type="button" className="primary-button" disabled={reviewing || reviewConflict} onClick={() => void submitReview(extraction)}>{reviewing ? 'Saving…' : 'Approve corrections'}</button><button type="button" className="text-button" disabled={reviewing} onClick={() => setReviewingId(null)}>Cancel</button></div></div> : extraction.fields.length > 0 ? <div>{extraction.fields.slice(0, 5).map((field) => <p key={field.key}><strong>{field.key}</strong>: {String(field.value ?? '—')} · {Math.round(field.confidence * 100)}%{field.requiresReview ? ' · review' : ''}</p>)}</div> : <p>Fields are not available for this lifecycle state.</p>}
          <div className="workflow-card-footer"><span className="workflow-id" title={extraction.id}>{extraction.id.slice(0, 8)}</span>{canManage && extraction.status === 'review_required' && reviewingId !== extraction.id ? <button type="button" className="text-button" onClick={() => beginReview(extraction)}>Review fields</button> : <span>{new Date(extraction.updatedAt).toLocaleString()}</span>}</div>
        </article>)}
      </div>}
    </section>}
  </>
}
