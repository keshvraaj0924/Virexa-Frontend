import { afterEach, expect, it, vi } from 'vitest'
import { fetchTenantAudit, parseTenantAudit } from './tenant-audit'
const id = '00000000-0000-4000-8000-000000000001'
const data = { events: [{ id, organizationId: id, actorUserId: id, action: 'auth.login', resourceType: 'session', resourceId: null, requestId: id, createdAt: '2026-10-01T00:00:00Z', metadata: { outcome: 'succeeded', secret: 'NEVER_RENDER' } }], nextCursor: null, coverage: { mode: 'forward_only', version: 'python-audit-v1', actions: ['auth.login'], notice: 'Forward-only records.' } }
afterEach(() => vi.unstubAllGlobals())
it('accepts documented records but never returns arbitrary metadata', () => {
  const parsed = parseTenantAudit(data)
  expect(parsed.events[0].outcome).toBe('succeeded')
  expect(JSON.stringify(parsed)).not.toContain('NEVER_RENDER')
  expect(JSON.stringify(parsed)).not.toContain('organizationId')
})
it('fails closed on missing coverage and malformed records', () => {
  for (const value of [{ ...data, coverage: null }, { ...data, events: [{}] }, { ...data, nextCursor: 123 }, { ...data, coverage: { ...data.coverage, mode: 'complete' } }]) expect(() => parseTenantAudit(value)).toThrow()
})
it('makes a bounded read with no client tenant or actor selector', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data, meta: {} })))
  vi.stubGlobal('fetch', fetch)
  await fetchTenantAudit({ action: 'auth.login', outcome: 'succeeded', cursor: 'opaque' })
  expect(fetch.mock.calls[0][0]).toBe('http://localhost:4000/api/v1/audit/events?limit=50&action=auth.login&outcome=succeeded&cursor=opaque')
  expect(fetch.mock.calls[0][1].method).toBe('GET')
})
it('accepts recorded workflow lifecycle events and their forward-only coverage', () => {
  const events = ['workflow.created', 'workflow.updated'].map(action => ({ ...data.events[0], action, resourceType: 'workflow', resourceId: id }))
  const parsed = parseTenantAudit({ ...data, events, coverage: { ...data.coverage, actions: ['workflow.created', 'workflow.updated'] } })
  expect(parsed.events.map(event => event.action)).toEqual(['workflow.created', 'workflow.updated'])
  expect(parsed.events.every(event => event.resourceType === 'workflow')).toBe(true)
  expect(JSON.stringify(parsed)).not.toContain('NEVER_RENDER')
})
it('accepts documented member role events without exposing arbitrary metadata', () => {
  const parsed = parseTenantAudit({ ...data, events: [{ ...data.events[0], action: 'organization.member.role_updated', resourceType: 'user' }], coverage: { ...data.coverage, actions: ['organization.member.role_updated'] } })
  expect(parsed.events[0].action).toBe('organization.member.role_updated')
  expect(JSON.stringify(parsed)).not.toContain('NEVER_RENDER')
})

it('accepts scan events while stripping scanner details', () => {
  const actions = ['document.scan.clean', 'document.scan.rejected', 'document.scan.error']
  const parsed = parseTenantAudit({ ...data, events: actions.map(action => ({ ...data.events[0], action, resourceType: 'document' })), coverage: { ...data.coverage, actions } })
  expect(parsed.events.map(event => event.action)).toEqual(actions)
  expect(JSON.stringify(parsed)).not.toContain('NEVER_RENDER')
})
