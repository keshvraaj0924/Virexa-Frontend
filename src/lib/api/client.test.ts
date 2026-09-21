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
