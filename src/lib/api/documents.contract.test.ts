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

  it('creates documents without tenant selection or unsupported idempotency semantics', async () => {
    apiRequest.mockResolvedValue({ id: 'document-1' })
    const input = {
      originalFileName: 'invoice.pdf',
      mediaType: 'application/pdf',
      sizeBytes: 1024,
      checksumSha256: 'a'.repeat(64),
    }
    await documentsApi.create(input)
    expect(apiRequest).toHaveBeenCalledWith('/documents', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    expect(JSON.parse(apiRequest.mock.calls[0][1].body)).not.toHaveProperty('organizationId')
    expect(apiRequest.mock.calls[0][1]).not.toHaveProperty('headers')
  })

  it('encodes document identifiers and sends the required idempotency key when initiating upload', async () => {
    apiRequest.mockResolvedValue({})
    await documentsApi.initiateUpload('doc/with spaces', 'upload-1')
    expect(apiRequest).toHaveBeenCalledWith('/documents/doc%2Fwith%20spaces/uploads', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'upload-1' },
      body: JSON.stringify({}),
    })
  })

  it('encodes both resource identifiers without inventing completion idempotency headers', async () => {
    apiRequest.mockResolvedValue({})
    await documentsApi.completeUpload('doc/1', 'attempt/1')
    expect(apiRequest).toHaveBeenCalledWith('/documents/doc%2F1/uploads/attempt%2F1/complete', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    expect(apiRequest.mock.calls[0][1]).not.toHaveProperty('headers')
  })
})
