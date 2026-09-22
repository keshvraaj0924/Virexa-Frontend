import type {
  CreateDocumentExtractionRequest,
  DocumentExtraction,
  DocumentExtractionListQuery,
  DocumentExtractionListResponse,
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

  create: (
    documentId: string,
    input: CreateDocumentExtractionRequest,
    idempotencyKey: string,
  ) => {
    const normalizedKey = idempotencyKey.trim()
    if (!normalizedKey || normalizedKey.length > 255) {
      throw new RangeError('Idempotency key must contain between 1 and 255 characters')
    }

    return apiRequest<DocumentExtraction>(
      `/documents/${encodeURIComponent(documentId)}/extractions`,
      {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Idempotency-Key': normalizedKey },
        body: JSON.stringify(input),
      },
    )
  },
} as const
