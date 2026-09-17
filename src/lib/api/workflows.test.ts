import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from './client'
import { workflowsApi } from './workflows'

vi.mock('./client', () => ({ apiRequest: vi.fn() }))

const mockedApiRequest = vi.mocked(apiRequest)

describe('workflowsApi', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset()
  })

  it('uses the versioned shared transport for tenant-scoped listing', async () => {
    mockedApiRequest.mockResolvedValue({ data: [], meta: { requestId: 'req-1', timestamp: '2026-09-16T00:00:00.000Z' } })

    await workflowsApi.list(25)

    expect(mockedApiRequest).toHaveBeenCalledWith('/workflows?limit=25')
  })

  it('preserves caller-provided idempotency keys for workflow creation', async () => {
    const input = { name: 'Invoice intake', description: 'AP automation' }
    mockedApiRequest.mockResolvedValue({ data: {} as never, meta: { requestId: 'req-2', timestamp: '2026-09-16T00:00:00.000Z' } })

    await workflowsApi.create(input, 'idem-123')

    expect(mockedApiRequest).toHaveBeenCalledWith('/workflows', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'idem-123' },
      body: JSON.stringify(input),
    })
  })

  it('encodes workflow identifiers before fetching a resource', async () => {
    mockedApiRequest.mockResolvedValue({ data: {} as never, meta: { requestId: 'req-3', timestamp: '2026-09-16T00:00:00.000Z' } })

    await workflowsApi.get('wf/tenant boundary')

    expect(mockedApiRequest).toHaveBeenCalledWith('/workflows/wf%2Ftenant%20boundary')
  })

  it('uses the typed optimistic-concurrency PATCH contract and encodes identifiers', async () => {
    const input = { expectedVersion: 3, name: 'Invoice intake v2', status: 'active' as const }
    mockedApiRequest.mockResolvedValue({ data: {} as never, meta: { requestId: 'req-4', timestamp: '2026-09-17T00:00:00.000Z' } })

    await workflowsApi.update('wf/tenant boundary', input)

    expect(mockedApiRequest).toHaveBeenCalledWith('/workflows/wf%2Ftenant%20boundary', {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  })
})
