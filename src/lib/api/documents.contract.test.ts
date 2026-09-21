import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('./client', () => ({ apiRequest }))

import { documentsApi } from './documents'

describe('documentsApi v1 transport contract', () => {
  beforeEach(() => apiRequest.mockReset())

  it('preserves opaque list pagination and filtering', async () => {
    apiRequest.mockResolvedValue({ items: [], nextCursor: null })
    await documentsApi.list({ status: 'review_required', cursor: 'opaque+/= cursor', limit: 25 })
    expect(apiRequest).toHaveBeenCalledWith('/documents?status=review_required&cursor=opaque%2B%2F%3D+cursor&limit=25')
  })

  it('sends idempotency keys for document creation without tenant selection', async () => {
    apiRequest.mockResolvedValue({ id: 'document-1' })
    const input = {
      originalFileName: 'invoice.pdf',
      mediaType: 'application/pdf',
      sizeBytes: 1024,
      checksumSha256: 'a'.repeat(64),
    }
    await documentsApi.create(input, 'create-document-1')
    expect(apiRequest).toHaveBeenCalledWith('/documents', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'create-document-1' },
      body: JSON.stringify(input),
    })
    expect(JSON.parse(apiRequest.mock.calls[0][1].body)).not.toHaveProperty('organizationId')
  })

  it('encodes document identifiers and sends an idempotency key when initiating upload', async () => {
    apiRequest.mockResolvedValue({})
    await documentsApi.initiateUpload('doc/with spaces', 'upload-1')
    expect(apiRequest).toHaveBeenCalledWith('/documents/doc%2Fwith%20spaces/uploads', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'upload-1' },
      body: JSON.stringify({}),
    })
  })

  it('encodes both resource identifiers and sends an idempotency key when completing upload', async () => {
    apiRequest.mockResolvedValue({})
    await documentsApi.completeUpload('doc/1', 'attempt/1', 'complete-1')
    expect(apiRequest).toHaveBeenCalledWith('/documents/doc%2F1/uploads/attempt%2F1/complete', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'complete-1' },
      body: JSON.stringify({}),
    })
  })
})
