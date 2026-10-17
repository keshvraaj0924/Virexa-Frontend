import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendIntake, validateIntakeFile, intakeError, type IntakeProgress } from './intake'
import { ApiError, apiRequest } from './client'
vi.mock('./client', async importOriginal => ({ ...await importOriginal<object>(), apiRequest: vi.fn() }))
const api = vi.mocked(apiRequest)
const document = { id: 'doc', scanStatus: 'awaiting_upload' }
const target = { attempt: { id: 'attempt' }, target: { uploadUrl: '/api/v1/documents/doc/uploads/attempt/content', requiredHeaders: { 'Content-Type': 'application/pdf' } } }
function file() { return new File(['%PDF-synthetic'], 'fixture.pdf', { type: 'application/pdf' }) }
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals() })
describe('quarantine upload lifecycle', () => {
  it('validates filename, size and allowed types', () => {
    expect(() => validateIntakeFile(file())).not.toThrow()
    for (const item of [new File([], 'empty.pdf', { type: 'application/pdf' }), new File(['x'], '../bad.pdf', { type: 'application/pdf' }), new File(['x'], 'page.html', { type: 'text/html' }), new File([new Uint8Array(25 * 1024 * 1024 + 1)], 'huge.pdf', { type: 'application/pdf' })]) expect(() => validateIntakeFile(item)).toThrow()
  })
  it('uploads genuine bytes and only returns pending_scan from authoritative GET', async () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost' } })
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 })); vi.stubGlobal('fetch', fetch)
    api.mockResolvedValueOnce({ data: document } as never).mockResolvedValueOnce({ data: target } as never).mockResolvedValueOnce({ data: {} } as never).mockResolvedValueOnce({ data: { ...document, scanStatus: 'pending_scan' } } as never)
    const state: IntakeProgress = { key: 'stable', document: document as never }
    expect((await sendIntake(file(), state, new AbortController().signal, vi.fn())).scanStatus).toBe('pending_scan')
    expect(fetch.mock.calls[0][1].body).toBeInstanceOf(File)
    expect(fetch.mock.calls[0][1].credentials).toBe('same-origin')
    expect(api.mock.calls[1][1]?.headers).toEqual({ 'Idempotency-Key': 'stable' })
  })
  it('refuses foreign, arbitrary-path and header-injection targets before sending bytes', async () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost' } }); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    for (const bad of [{ ...target.target, uploadUrl: 'https://evil.example/upload' }, { ...target.target, uploadUrl: '/api/v1/auth/logout' }, { ...target.target, requiredHeaders: { 'Content-Type': 'application/pdf', Authorization: 'credential' } }]) {
      api.mockResolvedValueOnce({ data: document } as never)
      await expect(sendIntake(file(), { key: 'key', document: document as never, attempt: { ...target, target: bad } as never }, new AbortController().signal, vi.fn())).rejects.toThrow('Invalid upload target')
    }
    expect(fetch).not.toHaveBeenCalled()
  })
  it('recovers uncertain completion without retransmission', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    api.mockResolvedValueOnce({ data: { ...document, scanStatus: 'pending_scan' } } as never)
    expect((await sendIntake(file(), { key: 'key', document: document as never }, new AbortController().signal, vi.fn())).scanStatus).toBe('pending_scan')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('does not silently repeat uncertain metadata creation or aborted work', async () => {
    await expect(sendIntake(file(), { key: 'key', metadataUncertain: true }, new AbortController().signal, vi.fn())).rejects.toThrow()
    const abort = new AbortController(); abort.abort()
    await expect(sendIntake(file(), { key: 'key' }, abort.signal, vi.fn())).rejects.toThrow()
    expect(api).not.toHaveBeenCalled()
  })
})

it('distinguishes duplicate-content rejection from uncertain metadata receipt', async () => {
  const duplicate = new ApiError({ code: 'DOCUMENT_CHECKSUM_CONFLICT', message: 'Metadata exists', status: 409, requestId: 'test' })
  expect(intakeError(duplicate)).toContain('already been registered')
  api.mockRejectedValueOnce(duplicate)
  const state: IntakeProgress = { key: 'stable' }
  await expect(sendIntake(file(), state, new AbortController().signal, vi.fn())).rejects.toBe(duplicate)
  expect(state.metadataUncertain).toBe(false)
  expect(state.document).toBeUndefined()
  api.mockRejectedValueOnce(new Error('connection lost'))
  await expect(sendIntake(file(), state, new AbortController().signal, vi.fn())).rejects.toThrow('connection lost')
  expect(state.metadataUncertain).toBe(true)
})
