export type ExtractionStatus =
  | 'queued'
  | 'processing'
  | 'review_required'
  | 'completed'
  | 'failed'

export type ExtractionFieldValue = string | number | boolean | null

export interface ExtractionField {
  key: string
  value: ExtractionFieldValue
  confidence: number
  sourcePage: number | null
  requiresReview: boolean
}

/** Public /api/v1 projection; tenant/provider/model internals remain server-authoritative. */
export interface DocumentExtraction {
  id: string
  documentId: string
  status: ExtractionStatus
  schemaVersion: string
  fields: ExtractionField[]
  failureCode: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

/** POST /api/v1/documents/:documentId/extractions. Idempotency-Key is required. */
export interface CreateDocumentExtractionRequest {
  schemaVersion: string
}

export interface ReviewExtractionField {
  key: string
  value: ExtractionFieldValue
}

/** PATCH review uses updatedAt from the last authoritative GET as its optimistic concurrency token. */
export interface ReviewDocumentExtractionRequest {
  expectedUpdatedAt: string
  fields: ReviewExtractionField[]
}

/** PATCH completion uses updatedAt from the last authoritative response as its optimistic concurrency token. */
export interface CompleteDocumentExtractionRequest {
  expectedUpdatedAt: string
}

/** GET /api/v1/documents/:documentId/extractions. Cursor is opaque. */
export interface DocumentExtractionListQuery {
  status?: ExtractionStatus
  cursor?: string
  limit?: number
}

export interface DocumentExtractionListResponse {
  items: DocumentExtraction[]
  nextCursor: string | null
}

export const EXTRACTIONS_API_V1 = {
  list: (documentId: string) =>
    `/api/v1/documents/${encodeURIComponent(documentId)}/extractions`,
  create: (documentId: string) =>
    `/api/v1/documents/${encodeURIComponent(documentId)}/extractions`,
  review: (documentId: string, extractionId: string) =>
    `/api/v1/documents/${encodeURIComponent(documentId)}/extractions/${encodeURIComponent(extractionId)}/review`,
  complete: (documentId: string, extractionId: string) =>
    `/api/v1/documents/${encodeURIComponent(documentId)}/extractions/${encodeURIComponent(extractionId)}/complete`,
} as const
