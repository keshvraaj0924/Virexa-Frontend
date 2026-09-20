export type DocumentStatus =
  | 'received'
  | 'processing'
  | 'review_required'
  | 'completed'
  | 'failed'

export type DocumentSource = 'upload' | 'email' | 'api' | 'integration'

export interface DocumentRecord {
  id: string
  organizationId: string
  branchId: string | null
  departmentId: string | null
  source: DocumentSource
  externalReference: string | null
  originalFileName: string
  mediaType: string
  sizeBytes: number
  checksumSha256: string
  status: DocumentStatus
  failureCode: string | null
  receivedAt: string
  updatedAt: string
}

/**
 * POST /api/v1/documents
 * Organization scope is intentionally absent: the backend derives it from the
 * authenticated session and never accepts tenant selection from the browser.
 */
export interface CreateDocumentRequest {
  branchId?: string
  departmentId?: string
  source?: DocumentSource
  externalReference?: string
  originalFileName: string
  mediaType: string
  sizeBytes: number
  checksumSha256: string
}

/** GET /api/v1/documents query. Cursor is opaque to the client. */
export interface DocumentListQuery {
  status?: DocumentStatus
  cursor?: string
  limit?: number
}

export interface DocumentListResponse {
  items: DocumentRecord[]
  nextCursor: string | null
}

export type DocumentUploadAttemptStatus = 'initiated' | 'completed' | 'failed'

/**
 * Public upload-attempt projection. Storage object keys, tenant identifiers and
 * idempotency keys are deliberately not part of the browser contract.
 */
export interface DocumentUploadAttempt {
  id: string
  documentId: string
  status: DocumentUploadAttemptStatus
  createdAt: string
  completedAt: string | null
  updatedAt: string
  failureCode: string | null
}

export interface DocumentUploadTarget {
  uploadUrl: string
  expiresAt: string
  requiredHeaders: Record<string, string>
}

export interface InitiateDocumentUploadResponse {
  attempt: DocumentUploadAttempt
  target: DocumentUploadTarget
  replayed: boolean
}

export interface CompleteDocumentUploadResponse {
  attempt: DocumentUploadAttempt
  replayed: boolean
}

export const DOCUMENTS_API_V1 = {
  list: '/api/v1/documents',
  create: '/api/v1/documents',
  upload: (documentId: string) => `/api/v1/documents/${encodeURIComponent(documentId)}/uploads`,
  completeUpload: (documentId: string, attemptId: string) =>
    `/api/v1/documents/${encodeURIComponent(documentId)}/uploads/${encodeURIComponent(attemptId)}/complete`,
} as const
