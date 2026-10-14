import { describe, expect, it } from 'vitest'
import type { ApiEnvelope } from './client'
import { requireAgentEnvelope, requireAgentListEnvelope } from './agent-response'

const agent = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'AP Reviewer',
  description: null,
  personaId: null,
  branchId: null,
  departmentId: null,
  instructions: 'Review invoices',
  status: 'draft',
  version: 1,
  createdByUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  createdAt: '2026-10-14T00:00:00.000Z',
  updatedAt: '2026-10-14T00:00:00.000Z',
}
const meta = { requestId: 'req-123', timestamp: '2026-10-14T00:00:00.000Z' }
const envelope = (data: unknown) => ({ data, meta }) as ApiEnvelope<unknown>
function mismatch(callback: () => unknown) {
  expect(callback).toThrowError(expect.objectContaining({
    name: 'ApiError', code: 'API_CONTRACT_MISMATCH', requestId: meta.requestId, status: 502,
  }))
}

describe('Agent response v1 defensive parsing', () => {
  it('returns only the documented public projection', () => {
    expect(requireAgentEnvelope(envelope({ ...agent, privateNote: 'untrusted' })).data).toEqual(agent)
  })

  it('rejects invalid ownership, identifiers, status, version and dates', () => {
    for (const change of [
      { id: '../' }, { createdByUserId: undefined }, { status: 'deleted' },
      { version: 0 }, { version: Number.MAX_SAFE_INTEGER + 1 },
      { updatedAt: 'yesterday' }, { personaId: 'bad-id' },
    ]) mismatch(() => requireAgentEnvelope(envelope({ ...agent, ...change })))
  })

  it('enforces API field-length bounds before rendering', () => {
    for (const change of [
      { name: ' ' }, { name: 'a'.repeat(121) },
      { instructions: ' ' }, { instructions: 'a'.repeat(12001) },
      { description: 'a'.repeat(1001) },
    ]) mismatch(() => requireAgentEnvelope(envelope({ ...agent, ...change })))
  })

  it('validates every list element, page limit and cursor', () => {
    expect(requireAgentListEnvelope(envelope({ items: [agent], nextCursor: 'opaque' })).data.items).toHaveLength(1)
    mismatch(() => requireAgentListEnvelope(envelope({ items: [agent, { ...agent, name: null }], nextCursor: null })))
    mismatch(() => requireAgentListEnvelope(envelope({ items: Array(101).fill(agent), nextCursor: null })))
    mismatch(() => requireAgentListEnvelope(envelope({ items: [], nextCursor: '' })))
    mismatch(() => requireAgentListEnvelope(envelope({ items: [], nextCursor: 'a'.repeat(2049) })))
  })

  it('rejects invalid envelope metadata with an unknown request ID', () => {
    expect(() => requireAgentEnvelope({ data: agent, meta: null } as never)).toThrowError(
      expect.objectContaining({ code: 'API_CONTRACT_MISMATCH', requestId: 'unknown' }),
    )
  })
})
