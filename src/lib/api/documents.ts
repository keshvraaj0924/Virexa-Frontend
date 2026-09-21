import type {
  CompleteDocumentUploadResponse,
  CreateDocumentRequest,
  DocumentListQuery,
  DocumentListResponse,
  DocumentRecord,
  InitiateDocumentUploadResponse,
} from '@/contracts/documents'
import { apiRequest } from './client'

function documentListQuery(input: DocumentListQuery = {}): string {
  const query = new URLSearchParams()
  if (input.status) query.set('status', input.status)
  if (input.cursor) query.set('cursor', input.cursor)
  if (input.limit !== undefined) query.set('limit', String(input.limit))
  const encoded = query.toString()
  return encoded ? `?${encoded}` : ''
}

export const documentsApi = {
  list: (query?: DocumentListQuery) =>
    apiRequest<DocumentListResponse>(`/documents${documentListQuery(query)}`),

  create: (input: CreateDocumentRequest) =>
    apiRequest<DocumentRecord>('/documents', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  initiateUpload: (documentId: string, idempotencyKey: string) =>
    apiRequest<InitiateDocumentUploadResponse>(
      `/documents/${encodeURIComponent(documentId)}/uploads`,
      {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({}),
      },
    ),

  completeUpload: (documentId: string, attemptId: string) =>
    apiRequest<CompleteDocumentUploadResponse>(
      `/documents/${encodeURIComponent(documentId)}/uploads/${encodeURIComponent(attemptId)}/complete`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    ),
} as const
