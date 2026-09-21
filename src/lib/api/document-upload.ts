import type { DocumentRecord } from '@/contracts/documents'
import { documentsApi } from './documents'

const SHA_256_HEX_LENGTH = 64

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256(file: File): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure file hashing is unavailable in this browser.')
  }

  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  const checksum = bytesToHex(digest)
  if (checksum.length !== SHA_256_HEX_LENGTH) {
    throw new Error('Unable to verify the file checksum.')
  }
  return checksum
}

function newIdempotencyKey(): string {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error('Secure upload identifiers are unavailable in this browser.')
  }
  return globalThis.crypto.randomUUID()
}

export interface UploadDocumentOptions {
  branchId?: string
  departmentId?: string
  signal?: AbortSignal
}

/**
 * Executes the backend-owned document upload lifecycle:
 * create metadata -> obtain a signed target -> upload bytes -> complete attempt.
 * Tenant scope is intentionally never accepted here; the authenticated backend
 * derives organization authority from the session.
 */
export async function uploadDocument(
  file: File,
  options: UploadDocumentOptions = {},
): Promise<DocumentRecord> {
  if (file.size <= 0) throw new Error('Empty files cannot be uploaded.')

  const checksumSha256 = await sha256(file)
  const created = await documentsApi.create({
    branchId: options.branchId,
    departmentId: options.departmentId,
    source: 'upload',
    originalFileName: file.name,
    mediaType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    checksumSha256,
  })

  const document = created.data
  const initiated = await documentsApi.initiateUpload(document.id, newIdempotencyKey())
  const { attempt, target } = initiated.data

  const uploadResponse = await fetch(target.uploadUrl, {
    method: 'PUT',
    headers: target.requiredHeaders,
    body: file,
    signal: options.signal,
  })

  if (!uploadResponse.ok) {
    throw new Error(`Object upload failed with status ${uploadResponse.status}.`)
  }

  await documentsApi.completeUpload(document.id, attempt.id)
  return document
}
