import { expect, it } from 'vitest'
import { parseUsageHistory, parseUsageSummary, USAGE_METERS } from './usage'
export function summaryFixture(scope: 'user' | 'organization' = 'user') {
  return { scope, organizationId: 'synthetic-tenant', userId: scope === 'user' ? 'synthetic-user' : null, start: '2026-10-01T00:00:00Z', end: '2026-10-18T00:00:00Z', meters: Object.fromEntries(USAGE_METERS.map(meter => [meter, { used: meter === 'document_uploads' ? 3 : null, reserved: meter === 'document_uploads' ? 0 : null, available: meter === 'document_uploads' }])), states: { reserved: 0, succeeded: 3, failed: 0, released: 0 }, cost: { amount: null, currency: null, pricingVersion: null, available: false }, subscription: { plan: 'internal_preview', status: 'preview', billingAvailable: false, scope: 'organization', periodStart: '2026-10-01T00:00:00Z', periodEnd: '2026-11-01T00:00:00Z', limits: Object.fromEntries(USAGE_METERS.map(meter => [meter, meter === 'document_uploads' ? { limit: 1000, usedAndReserved: 3, remaining: 997 } : null])) }, groups: [], groupsTruncated: false }
}
it('preserves unavailable values rather than changing them to zero', () => {
  const parsed = parseUsageSummary(summaryFixture(), 'me')
  expect(parsed.meters.input_tokens.used).toBeNull()
  expect(parsed.meters.document_uploads.used).toBe(3)
})
it('rejects other scope, malformed totals and absent entitlement fields', () => {
  expect(() => parseUsageSummary(summaryFixture('organization'), 'me')).toThrow()
  for (const change of [{ meters: {} }, { states: { succeeded: -1 } }, { subscription: {} }, { cost: {} }, { userId: null }]) expect(() => parseUsageSummary({ ...summaryFixture(), ...change }, 'me')).toThrow()
})
it('accepts only bounded history and explicit nullable cursors', () => {
  const fixture = { items: [], nextCursor: null, start: '2026-10-01T00:00:00Z', end: '2026-10-18T00:00:00Z' }
  expect(parseUsageHistory(fixture)).toEqual(fixture)
  expect(() => parseUsageHistory({ ...fixture, nextCursor: undefined })).toThrow()
  expect(() => parseUsageHistory({ ...fixture, items: [{ id: 'missing-fields' }] })).toThrow()
})
