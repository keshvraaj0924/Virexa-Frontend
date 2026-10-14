import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from './client'
import { agentsApi } from './agents'

vi.mock('./client', () => ({ apiRequest: vi.fn() }))
vi.mock('./agent-response', () => ({
  requireAgentEnvelope: vi.fn((response: unknown) => response),
  requireAgentListEnvelope: vi.fn((response: unknown) => response),
}))
const request = vi.mocked(apiRequest)

describe('Agent v1 client request contract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('whitelists list filters and encodes opaque cursors', async () => {
    await agentsApi.list({ status: 'active', limit: 24, cursor: 'cursor+/', organizationId: 'other-tenant' } as never)
    expect(request).toHaveBeenCalledWith('/agents?status=active&limit=24&cursor=cursor%2B%2F')
  })

  it('encodes agent IDs without introducing a second path segment', async () => {
    await agentsApi.get('a/b')
    expect(request).toHaveBeenCalledWith('/agents/a%2Fb')
  })

  it('uses a caller-provided idempotency key and rejects extra request fields', async () => {
    await agentsApi.create({
      name: 'Invoice reviewer',
      instructions: 'Review documents',
      organizationId: 'other-tenant',
      createdByUserId: 'other-actor',
    } as never, 'creation-key-0000000001')
    expect(request).toHaveBeenCalledWith('/agents', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'creation-key-0000000001' },
      body: JSON.stringify({ name: 'Invoice reviewer', instructions: 'Review documents' }),
    })
  })

  it('sends expectedVersion and strips unexpected update fields', async () => {
    await agentsApi.update('a/b', { expectedVersion: 4, status: 'paused', organizationId: 'other-tenant' } as never)
    expect(request).toHaveBeenCalledWith('/agents/a%2Fb', {
      method: 'PATCH',
      body: JSON.stringify({ expectedVersion: 4, status: 'paused' }),
    })
  })
})
