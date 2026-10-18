export const USAGE_METERS = ['input_tokens', 'output_tokens', 'cached_tokens', 'ocr_pages', 'document_uploads', 'workflow_runs'] as const
export type UsageMeter = typeof USAGE_METERS[number]
export type UsageScope = 'me' | 'organization'
export type UsageState = 'reserved' | 'succeeded' | 'failed' | 'released'
export const METER_LABELS: Record<UsageMeter, string> = { input_tokens: 'Input tokens', output_tokens: 'Output tokens', cached_tokens: 'Cached tokens', ocr_pages: 'OCR pages', document_uploads: 'Document uploads', workflow_runs: 'Workflow runs' }
export interface UsageSummary {
  scope: 'user' | 'organization'; organizationId: string; userId: string | null; start: string; end: string
  meters: Record<UsageMeter, { used: number | null; reserved: number | null; available: boolean }>
  states: Record<UsageState, number>
  cost: { amount: string | null; currency: string | null; pricingVersion: string | null; available: boolean }
  subscription: { plan: string; status: string; billingAvailable: boolean; scope: 'organization'; periodStart: string; periodEnd: string; limits: Record<UsageMeter, { limit: number; usedAndReserved: number; remaining: number } | null> }
  groups: { userId: string; operation: string; meter: UsageMeter; state: UsageState; events: number; quantity: number }[]
  groupsTruncated: boolean
}
export interface UsageRecord { id: string; userId: string; operation: string; meter: UsageMeter; quantity: number; state: UsageState; errorCode: string | null; amount: string | null; currency: string | null; pricingVersion: string | null; createdAt: string; updatedAt: string }
export interface UsageHistory { items: UsageRecord[]; nextCursor: string | null; start: string; end: string }
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const nullableCount = (value: unknown) => value === null || count(value)
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
const states: UsageState[] = ['reserved', 'succeeded', 'failed', 'released']
/** Reject malformed payloads instead of presenting invented zeroes or another scope. */
export function parseUsageSummary(value: unknown, scope: UsageScope): UsageSummary {
  if (!object(value) || value.scope !== (scope === 'me' ? 'user' : 'organization') || typeof value.organizationId !== 'string' || !date(value.start) || !date(value.end) || !object(value.meters) || !object(value.states) || !object(value.subscription) || !object(value.cost)) throw new Error('Invalid usage response')
  if (scope === 'me' ? typeof value.userId !== 'string' : value.userId !== null) throw new Error('Invalid usage scope')
  const meters = value.meters, totals = value.states, subscription = value.subscription
  for (const key of USAGE_METERS) {
    const meter = meters[key]
    if (!object(meter) || typeof meter.available !== 'boolean' || !nullableCount(meter.used) || !nullableCount(meter.reserved)) throw new Error('Invalid meter')
  }
  if (!states.every(state => count(totals[state])) || subscription.scope !== 'organization' || typeof subscription.plan !== 'string' || typeof subscription.status !== 'string' || typeof subscription.billingAvailable !== 'boolean' || !date(subscription.periodStart) || !date(subscription.periodEnd) || !object(subscription.limits)) throw new Error('Invalid entitlement')
  for (const key of USAGE_METERS) {
    const limit = subscription.limits[key]
    if (limit !== null && (!object(limit) || !count(limit.limit) || !count(limit.usedAndReserved) || !count(limit.remaining))) throw new Error('Invalid limit')
  }
  if (!Array.isArray(value.groups) || value.groups.length > 100 || typeof value.groupsTruncated !== 'boolean' || !value.groups.every(group => object(group) && typeof group.userId === 'string' && typeof group.operation === 'string' && USAGE_METERS.includes(group.meter as UsageMeter) && states.includes(group.state as UsageState) && count(group.events) && count(group.quantity))) throw new Error('Invalid usage groups')
  if (typeof value.cost.available !== 'boolean' || !['amount', 'currency', 'pricingVersion'].every(key => value.cost && object(value.cost) && (value.cost[key] === null || typeof value.cost[key] === 'string')) || (scope === 'me' && value.groups.length !== 0)) throw new Error('Invalid cost or personal groups')
  return value as unknown as UsageSummary
}
export function parseUsageHistory(value: unknown): UsageHistory {
  if (!object(value) || !Array.isArray(value.items) || value.items.length > 100 || !(value.nextCursor === null || typeof value.nextCursor === 'string') || !date(value.start) || !date(value.end) || !value.items.every(row => object(row) && typeof row.id === 'string' && typeof row.userId === 'string' && typeof row.operation === 'string' && USAGE_METERS.includes(row.meter as UsageMeter) && states.includes(row.state as UsageState) && count(row.quantity) && date(row.createdAt) && date(row.updatedAt) && (row.errorCode === null || typeof row.errorCode === 'string'))) throw new Error('Invalid usage history')
  return value as unknown as UsageHistory
}
