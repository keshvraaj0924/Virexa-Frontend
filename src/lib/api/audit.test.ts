import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchAuditEvents } from './audit'

const event = {
  id: 'event-1',
  organizationId: 'org-1',
  actorUserId: 'user-1',
  action: 'workflow.created',
  resourceType: 'workflow',
  resourceId: 'workflow-1',
  requestId: 'req-1',
  metadata: {},
  createdAt: '2026-09-19T00:00:00.000Z',
}

const responseBody = {
  data: { events: [event] },
  meta: {
    requestId: 'req-test',
    timestamp: '2026-09-19T00:00:00.000Z',
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchAuditEvents', () => {
  it('consumes the production audit envelope without client-controlled tenant scope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAuditEvents(25)).resolves.toEqual([event])

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:4000/api/v1/audit/events?limit=25')
    expect(url).not.toMatch(/tenant|organizationId/i)
    expect(init.method).toBe('GET')
    expect(init.cache).toBe('no-store')
    expect(init.credentials).toBe('include')
  })

  it.each([0, 101, 1.5, Number.NaN])('rejects an invalid limit before issuing a request: %s', async (limit) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAuditEvents(limit)).rejects.toThrow(RangeError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
