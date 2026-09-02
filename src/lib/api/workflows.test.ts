import { describe, expect, it, vi } from 'vitest'
import { createWorkflow, listWorkflows } from './workflows'
import { apiRequest } from './client'

vi.mock('./client', () => ({ apiRequest: vi.fn() }))
const mockedApiRequest = vi.mocked(apiRequest)

describe('workflow API client', () => {
  it('uses the versioned list endpoint', async () => {
    mockedApiRequest.mockResolvedValue({ data: [], meta: { requestId: 'req-1', timestamp: '2026-09-02T00:00:00.000Z' } })
    await listWorkflows(25)
    expect(mockedApiRequest).toHaveBeenCalledWith('/workflows?limit=25')
  })

  it('posts the exact workflow contract without browser-side authorization assumptions', async () => {
    const input = { name: 'Incident response', description: 'Production workflow' }
    mockedApiRequest.mockResolvedValue({ data: { id: 'wf-1' }, meta: { requestId: 'req-2', timestamp: '2026-09-02T00:00:00.000Z' } })
    await createWorkflow(input)
    expect(mockedApiRequest).toHaveBeenCalledWith('/workflows', { method: 'POST', body: JSON.stringify(input) })
  })
})
