import { expect, it } from 'vitest'
import { parseWorkflow, parseWorkflowList } from './workflows'
const record = { id: '1', organizationId: 'org', createdByUserId: 'owner', name: 'Review', description: null, status: 'draft', version: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01' }
it('accepts only valid versioned records and bounded pagination', () => {
  expect(parseWorkflow(record)).toEqual(record)
  expect(parseWorkflowList({ items: [record], nextCursor: null }).items).toHaveLength(1)
  for (const invalid of [{ ...record, status: 'executing' }, { ...record, version: 0 }, { ...record, name: {} }, { ...record, updatedAt: 'invalid' }]) expect(() => parseWorkflow(invalid)).toThrow()
  expect(() => parseWorkflowList({ items: [record], nextCursor: {} })).toThrow()
})
