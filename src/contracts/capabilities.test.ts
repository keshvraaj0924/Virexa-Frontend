import { expect, it } from 'vitest'
import { parseEffectivePermissions } from './capabilities'
it('accepts only implemented capabilities and deduplicates them', () => {
  expect(parseEffectivePermissions({ capabilities: ['document:read', 'workflow:execute', 'document:read'] })).toEqual({ capabilities: ['document:read'] })
})
it('fails closed on missing or malformed permissions', () => {
  for (const value of [null, [], {}, { capabilities: 'document:read' }, { capabilities: [true] }]) expect(parseEffectivePermissions(value)).toBeNull()
  expect(parseEffectivePermissions({ capabilities: [] })).toEqual({ capabilities: [] })
})
