import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { create, initiateUpload, completeUpload } = vi.hoisted(() => ({
  create: vi.fn(),
  initiateUpload: vi.fn(),
  completeUpload: vi.fn(),
}))

vi.mock('./documents', () => ({
  documentsApi: { create, initiateUpload, completeUpload },
}))

import { uploadDocument } from './document-upload'

describe('uploadDocument', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
    create.mockReset()
    initiateUpload.mockReset()
    completeUpload.mockReset()

    create.mockResolvedValue({ data: { id: 'document-1' } })
    initiateUpload.mockResolvedValue({
      data: {
        attempt: { id: 'attempt-1' },
        target: {
          uploadUrl: 'https://storage.example.test/signed-target',
          requiredHeaders: { 'x-upload-token': 'signed-token' },
        },
      },
    })
    completeUpload.mockResolvedValue({ data: { id: 'document-1' } })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('hashes metadata, preserves signed headers, and completes only after object upload succeeds', async () => {
    const calls: string[] = []
    create.mockImplementation(async (input) => {
      calls.push('create')
      expect(input).toMatchObject({
        originalFileName: 'invoice.pdf',
        mediaType: 'application/pdf',
        sizeBytes: 3,
        source: 'upload',
      })
      expect(input.checksumSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(input).not.toHaveProperty('organizationId')
      return { data: { id: 'document-1' } }
    })
    initiateUpload.mockImplementation(async () => {
      calls.push('initiate')
      return {
        data: {
          attempt: { id: 'attempt-1' },
          target: {
            uploadUrl: 'https://storage.example.test/signed-target',
            requiredHeaders: { 'x-upload-token': 'signed-token' },
          },
        },
      }
    })
    globalThis.fetch = vi.fn(async (_url, init) => {
      calls.push('upload')
      expect(init?.method).toBe('PUT')
      expect(init?.headers).toEqual({ 'x-upload-token': 'signed-token' })
      return new Response(null, { status: 200 })
    })
    completeUpload.mockImplementation(async () => {
      calls.push('complete')
      return { data: { id: 'document-1' } }
    })

    const file = new File([new Uint8Array([1, 2, 3])], 'invoice.pdf', { type: 'application/pdf' })
    await uploadDocument(file)

    expect(initiateUpload).toHaveBeenCalledWith('document-1', expect.any(String))
    expect(completeUpload).toHaveBeenCalledWith('document-1', 'attempt-1')
    expect(calls).toEqual(['create', 'initiate', 'upload', 'complete'])
  })

  it('does not complete an attempt when the signed object upload fails', async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 503 }))
    const file = new File(['invoice'], 'invoice.pdf', { type: 'application/pdf' })

    await expect(uploadDocument(file)).rejects.toThrow('Object upload failed with status 503.')
    expect(completeUpload).not.toHaveBeenCalled()
  })

  it('rejects empty files before creating backend metadata', async () => {
    const file = new File([], 'empty.pdf', { type: 'application/pdf' })

    await expect(uploadDocument(file)).rejects.toThrow('Empty files cannot be uploaded.')
    expect(create).not.toHaveBeenCalled()
    expect(initiateUpload).not.toHaveBeenCalled()
    expect(completeUpload).not.toHaveBeenCalled()
  })
})
