import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from './client'
import { workflowsApi } from './workflows'

vi.mock('./client', () => ({ apiRequest: vi.fn() }))

const mockedApiRequest = vi.mocked(apiRequest)

describe('workflowsApi v1 transport contract', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset()
  })

  it('preserves opaque pagination and status filtering without tenant selection', async () => {
    mockedApiRequest.mockResolvedValue({ items: [], nextCursor: null })

    await workflowsApi.list({ status: 'active', cursor: 'opaque+/= cursor', limit: 25 })

    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/workflows?status=active&cursor=opaque%2B%2F%3D+cursor&limit=25',
    )
  })

  it('uses the server defaults when no list query is supplied', async () => {
    mockedApiRequest.mockResolvedValue({ items: [], nextCursor: null })

    await workflowsApi.list()

    expect(mockedApiRequest).toHaveBeenCalledWith('/workflows')
  })

  it('preserves caller-provided idempotency keys for workflow creation', async () => {
    const input = { name: 'Invoice intake', description: 'AP automation' }
    mockedApiRequest.mockResolvedValue({} as never)

    await workflowsApi.create(input, 'idem-123')

    expect(mockedApiRequest).toHaveBeenCalledWith('/workflows', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'idem-123' },
      body: JSON.stringify(input),
    })
  })

  it('encodes workflow identifiers before fetching a resource', async () => {
    mockedApiRequest.mockResolvedValue({} as never)

    await workflowsApi.get('wf/tenant boundary')

    expect(mockedApiRequest).toHaveBeenCalledWith('/workflows/wf%2Ftenant%20boundary')
  })

  it('uses the typed optimistic-concurrency PATCH contract and encodes identifiers', async () => {
    const input = { expectedVersion: 3, name: 'Invoice intake v2', status: 'active' as const }
    mockedApiRequest.mockResolvedValue({} as never)

    await workflowsApi.update('wf/tenant boundary', input)

    expect(mockedApiRequest).toHaveBeenCalledWith('/workflows/wf%2Ftenant%20boundary', {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  })
})
