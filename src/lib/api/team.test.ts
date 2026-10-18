import { expect, it } from 'vitest'
import { parseMember, parseMembers, parseOrganizationRoot } from './team'
const member = { id: '12345678-1234-1234-1234-123456789abc', organizationId: '22345678-1234-1234-1234-123456789abc', displayName: 'Synthetic Member', email: 'person@example.com', role: 'viewer', version: 1, createdAt: '2026-01-01T00:00:00Z' }
it('validates role/version and strips unrelated private fields', () => {
  expect(parseMember({ ...member, passwordHash: 'do-not-render' })).toEqual(member)
  for (const change of [{ role: 'admin' }, { version: 0 }, { version: 1.5 }, { id: 'bad' }, { createdAt: 'bad' }]) expect(() => parseMember({ ...member, ...change })).toThrow()
})
it('bounds roster envelopes and validates every member', () => {
  expect(parseMembers({ items: [member], nextCursor: null }).items).toHaveLength(1)
  for (const value of [{ items: [member], nextCursor: 9 }, { items: Array(101).fill(member), nextCursor: null }, { items: [{}], nextCursor: null }]) expect(() => parseMembers(value)).toThrow()
})

it('verifies the real organization root and refuses unimplemented or malformed node structures', () => {
  const value = { organization: { id: member.organizationId, name: 'Synthetic organization', accountType: 'organization' }, branches: [], departments: [], personas: [] }
  expect(parseOrganizationRoot(value)).toEqual(value.organization)
  expect(() => parseOrganizationRoot({ ...value, branches: [{}] })).toThrow()
  expect(() => parseOrganizationRoot({ ...value, organization: { ...value.organization, accountType: 'individual' } })).toThrow()
})
