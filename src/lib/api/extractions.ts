import type {
  CreateDocumentExtractionRequest,
  DocumentExtraction,
  DocumentExtractionListQuery,
  DocumentExtractionListResponse,
  ReviewDocumentExtractionRequest,
} from '@/contracts/extractions'
import { apiRequest } from './client'

function extractionListQuery(input: DocumentExtractionListQuery = {}): string {
  if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100)) {
    throw new RangeError('Extraction list limit must be an integer between 1 and 100')
  }
  const query = new URLSearchParams()
  if (input.status) query.set('status', input.status)
  if (input.cursor) query.set('cursor', input.cursor)
  if (input.limit !== undefined) query.set('limit', String(input.limit))
  const encoded = query.toString()
  return encoded ? `?${encoded}` : ''
}

export const extractionsApi = {
  list: (documentId: string, query?: DocumentExtractionListQuery) =>
    apiRequest<DocumentExtractionListResponse>(
      `/documents/${encodeURIComponent(documentId)}/extractions${extractionListQuery(query)}`,
      { cache: 'no-store' },
    ),

  create: (documentId: string, input: CreateDocumentExtractionRequest, idempotencyKey: string) => {
    const normalizedKey = idempotencyKey.trim()
    if (!normalizedKey || normalizedKey.length > 255) throw new RangeError('Idempotency key must contain between 1 and 255 characters')
    return apiRequest<DocumentExtraction>(`/documents/${encodeURIComponent(documentId)}/extractions`, {
      method: 'POST', cache: 'no-store', headers: { 'Idempotency-Key': normalizedKey }, body: JSON.stringify(input),
    })
  },

  review: (documentId: string, extractionId: string, input: ReviewDocumentExtractionRequest) => {
    if (!input.expectedUpdatedAt || Number.isNaN(Date.parse(input.expectedUpdatedAt))) {
      throw new RangeError('expectedUpdatedAt must be a valid ISO timestamp')
    }
    if (input.fields.length < 1 || input.fields.length > 256) {
      throw new RangeError('Review must contain between 1 and 256 fields')
    }
    const keys = new Set<string>()
    for (const field of input.fields) {
      const key = field.key.trim()
      if (!key || key.length > 128) throw new RangeError('Review field keys must contain between 1 and 128 characters')
      if (keys.has(key)) throw new RangeError(`Duplicate review field key: ${key}`)
      keys.add(key)
    }
    return apiRequest<DocumentExtraction>(
      `/documents/${encodeURIComponent(documentId)}/extractions/${encodeURIComponent(extractionId)}/review`,
      { method: 'PATCH', cache: 'no-store', body: JSON.stringify(input) },
    )
  },
} as const
