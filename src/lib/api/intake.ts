import type { DocumentRecord, DocumentListResponse, InitiateDocumentUploadResponse } from '@/contracts/documents'
import { ApiError, apiRequest } from './client'

export const MAX_INTAKE_BYTES = 25 * 1024 * 1024
export const INTAKE_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
export function validateIntakeFile(file: File) {
  if (!file.name.trim() || file.name.length > 255 || Array.from(file.name).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 || char === '/' || char === '\\')) throw new Error('Choose a file with a valid name of 255 characters or fewer.')
  if (!INTAKE_TYPES.includes(file.type)) throw new Error('Choose a PDF, PNG or JPEG file.')
  if (!file.size || file.size > MAX_INTAKE_BYTES) throw new Error('Choose a non-empty file up to 25 MiB.')
}
export function intakeError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Your session has expired. Sign in again before uploading.'
    if (error.status === 403 || error.status === 404) return 'This document is unavailable or you do not have access.'
    if (error.status === 413) return 'Choose a non-empty file up to 25 MiB.'
    if (error.status === 409 || error.status === 422) return 'The file could not be verified. Check its type and contents, then try again.'
  }
  return 'The upload could not be confirmed. Retry to check its current state.'
}
export type IntakeProgress = { document?: DocumentRecord; attempt?: InitiateDocumentUploadResponse; key: string; metadataUncertain?: boolean; bytesSent?: boolean }
export const listIntake = (cursor?: string, signal?: AbortSignal) => apiRequest<DocumentListResponse>(`/documents?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, { signal })

/** The same state is retained on retry, including the idempotency key and document identity. */
export async function sendIntake(file: File, state: IntakeProgress, signal: AbortSignal, phase: (text: string) => void): Promise<DocumentRecord> {
  validateIntakeFile(file)
  signal.throwIfAborted()
  if (state.metadataUncertain) throw new Error('Metadata response uncertain')
  if (!state.document) {
    phase('Verifying file…')
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
    signal.throwIfAborted()
    const checksumSha256 = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
    phase('Creating private intake record…')
    // Metadata creation is not idempotent. Do not automatically repeat an uncertain request.
    state.metadataUncertain = true
    state.document = (await apiRequest<DocumentRecord>('/documents', { method: 'POST', signal, body: JSON.stringify({ originalFileName: file.name, mediaType: file.type, sizeBytes: file.size, checksumSha256, source: 'upload' }) })).data
    state.metadataUncertain = false
  }
  const id = state.document.id
  const current = (await apiRequest<DocumentRecord>(`/documents/${encodeURIComponent(id)}`, { signal })).data
  if (current.scanStatus === 'pending_scan') return current
  if (state.attempt && Date.parse(state.attempt.target.expiresAt) <= Date.now()) state.attempt = undefined
  if (!state.attempt) {
    phase('Preparing quarantine upload…')
    state.attempt = (await apiRequest<InitiateDocumentUploadResponse>(`/documents/${encodeURIComponent(id)}/uploads`, { method: 'POST', signal, headers: { 'Idempotency-Key': state.key }, body: '{}' })).data
  }
  const { attempt, target } = state.attempt
  const expected = `/api/v1/documents/${encodeURIComponent(id)}/uploads/${encodeURIComponent(attempt.id)}/content`
  const url = new URL(target.uploadUrl, window.location.origin)
  if (url.origin !== window.location.origin || url.pathname !== expected || url.search || url.hash || url.username || url.password || Object.keys(target.requiredHeaders).some(k => k.toLowerCase() !== 'content-type') || new Headers(target.requiredHeaders).get('content-type') !== file.type) throw new Error('Invalid upload target')
  if (!state.bytesSent) {
    phase('Uploading to private quarantine…')
    const response = await fetch(url, { method: 'PUT', credentials: 'same-origin', redirect: 'error', headers: { 'Content-Type': file.type }, body: file, signal })
    if (!response.ok) throw new ApiError({ code: 'UPLOAD_FAILED', message: 'Upload failed', status: response.status, requestId: 'unknown' })
    state.bytesSent = true
  }
  phase('Confirming receipt…')
  await apiRequest(`/documents/${encodeURIComponent(id)}/uploads/${encodeURIComponent(attempt.id)}/complete`, { method: 'POST', signal, body: '{}' })
  return (await apiRequest<DocumentRecord>(`/documents/${encodeURIComponent(id)}`, { signal })).data
}
