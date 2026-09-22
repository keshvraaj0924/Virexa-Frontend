import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('./client', () => ({ apiRequest }))

import { extractionsApi } from './extractions'

describe('extractionsApi v1 transport contract', () => {
  beforeEach(() => apiRequest.mockReset())

  it('encodes document identifiers and preserves bounded opaque pagination', async () => {
    apiRequest.mockResolvedValue({ data: { items: [], nextCursor: null }, meta: {} })
    await extractionsApi.list('doc/with spaces', {
      status: 'review_required',
      cursor: 'opaque+/= cursor',
      limit: 25,
    })

    expect(apiRequest).toHaveBeenCalledWith(
      '/documents/doc%2Fwith%20spaces/extractions?status=review_required&cursor=opaque%2B%2F%3D+cursor&limit=25',
      { cache: 'no-store' },
    )
  })

  it('rejects an invalid list limit rather than changing caller intent', () => {
    expect(() => extractionsApi.list('document-1', { limit: 101 })).toThrow(RangeError)
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('creates an extraction with required idempotency and no tenant selector', async () => {
    apiRequest.mockResolvedValue({ data: {}, meta: {} })
    const input = { schemaVersion: 'invoice-v1' }
    await extractionsApi.create('document-1', input, ' extraction-request-1 ')

    expect(apiRequest).toHaveBeenCalledWith('/documents/document-1/extractions', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Idempotency-Key': 'extraction-request-1' },
      body: JSON.stringify(input),
    })
    expect(JSON.parse(apiRequest.mock.calls[0][1].body)).not.toHaveProperty('organizationId')
    expect(JSON.parse(apiRequest.mock.calls[0][1].body)).not.toHaveProperty('provider')
    expect(JSON.parse(apiRequest.mock.calls[0][1].body)).not.toHaveProperty('model')
  })

  it('rejects an empty idempotency key before transport', () => {
    expect(() => extractionsApi.create('document-1', { schemaVersion: 'invoice-v1' }, '   ')).toThrow(RangeError)
    expect(apiRequest).not.toHaveBeenCalled()
  })
})
