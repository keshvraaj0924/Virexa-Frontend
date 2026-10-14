import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiRequest error contract', () => {
  it('preserves backend error code, request id, status and field errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        requestId: 'req_backend_123',
        fieldErrors: { originalFileName: ['Required'] },
      },
      meta: { requestId: 'req_backend_123', timestamp: '2026-09-21T03:30:00.000Z' },
    }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    })))

    const request = apiRequest('/documents', { method: 'POST', body: '{}' })

    await expect(request).rejects.toMatchObject({
      name: 'ApiError',
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      requestId: 'req_backend_123',
      status: 422,
      fieldErrors: { originalFileName: ['Required'] },
    } satisfies Partial<ApiError>)
  })

  it('fails safely when a non-success response is not a v1 error envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('upstream unavailable', {
      status: 502,
      headers: { 'X-Request-ID': 'req_gateway_456' },
    })))

    await expect(apiRequest('/documents')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'API_REQUEST_FAILED',
      message: 'Request failed',
      requestId: 'req_gateway_456',
      status: 502,
    } satisfies Partial<ApiError>)
  })
})

describe('authenticated API cache isolation', () => {
  it('overrides a force-cache GET and preserves session credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { items: [], nextCursor: null },
      meta: { requestId: 'req_private_get', timestamp: '2026-10-14T00:00:00.000Z' },
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/agents?limit=1', { cache: 'force-cache', credentials: 'omit' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/agents?limit=1'),
      expect.objectContaining({ cache: 'no-store', credentials: 'include' }),
    )
  })

  it('applies no-store to failed Agent mutations and preserves backend error metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'FORBIDDEN', message: 'Access denied', requestId: 'req_private_denied' },
      meta: { requestId: 'req_private_denied', timestamp: '2026-10-14T00:00:00.000Z' },
    }), { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest('/agents', { method: 'POST', cache: 'force-cache', body: '{}' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN', status: 403, requestId: 'req_private_denied' } satisfies Partial<ApiError>)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/agents'),
      expect.objectContaining({ cache: 'no-store', credentials: 'include', method: 'POST' }),
    )
  })
})
