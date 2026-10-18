// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { UsageDashboard } from './usage-dashboard'
import { usageApi } from '@/lib/api/usage'
import { USAGE_METERS, type UsageSummary } from '@/contracts/usage'
const access = vi.hoisted(() => ({ capabilities: ['usage:read', 'usage:organization:read'] as string[] }))
vi.mock('@/components/access/access-provider', () => ({ useAccess: () => ({ allows: (value: string) => access.capabilities.includes(value) }), AccessDenied: () => <p>Access restricted</p> }))
vi.mock('@/lib/api/usage', () => ({ usageApi: { summary: vi.fn(), history: vi.fn() } }))
const emptyHistory = { items: [], nextCursor: null, start: '2026-10-01T00:00:00Z', end: '2026-10-18T00:00:00Z' }
function fixture(scope: 'me' | 'organization'): UsageSummary {
  return { scope: scope === 'me' ? 'user' : 'organization', organizationId: 'synthetic', userId: scope === 'me' ? 'synthetic-user' : null, start: emptyHistory.start, end: emptyHistory.end, meters: Object.fromEntries(USAGE_METERS.map(meter => [meter, { used: meter === 'document_uploads' ? 3 : null, reserved: meter === 'document_uploads' ? 0 : null, available: meter === 'document_uploads' }])) as UsageSummary['meters'], states: { reserved: 0, succeeded: 3, failed: 0, released: 0 }, cost: { amount: null, currency: null, pricingVersion: null, available: false }, subscription: { plan: 'internal_preview', status: 'preview', billingAvailable: false, scope: 'organization', periodStart: emptyHistory.start, periodEnd: '2026-11-01T00:00:00Z', limits: Object.fromEntries(USAGE_METERS.map(meter => [meter, meter === 'document_uploads' ? { limit: 1000, usedAndReserved: 3, remaining: 997 } : null])) as UsageSummary['subscription']['limits'] }, groups: [], groupsTruncated: false }
}
beforeEach(() => { vi.resetAllMocks(); access.capabilities = ['usage:read', 'usage:organization:read']; vi.mocked(usageApi.summary).mockImplementation(async scope => fixture(scope)); vi.mocked(usageApi.history).mockResolvedValue(emptyHistory) })
afterEach(cleanup)
it('shows honest unavailable AI and payment states with personal scope by default', async () => {
  render(<UsageDashboard/>)
  await screen.findByText('997 remaining')
  expect(screen.getAllByText('Not available')).toHaveLength(5)
  expect(screen.getByText(/Payments are not configured/)).toBeTruthy()
  expect(screen.getByText(/not a personal allocation/)).toBeTruthy()
  expect(usageApi.summary).toHaveBeenCalledWith('me', expect.any(URLSearchParams), expect.any(AbortSignal))
})
it('never fetches without capability and never displays tenant controls to ordinary users', async () => {
  access.capabilities = []
  const view = render(<UsageDashboard/>)
  expect(usageApi.summary).not.toHaveBeenCalled()
  access.capabilities = ['usage:read']
  view.rerender(<UsageDashboard/>)
  await screen.findByText('997 remaining')
  expect(screen.queryByRole('button', { name: 'Organization usage' })).toBeNull()
})
it('discards late personal responses and removes tenant data after permission revocation', async () => {
  let resolve!: (value: UsageSummary) => void
  vi.mocked(usageApi.summary).mockImplementationOnce(() => new Promise(done => { resolve = done }))
  const view = render(<UsageDashboard/>)
  fireEvent.click(screen.getByRole('button', { name: 'Organization usage' }))
  await screen.findByRole('heading', { name: 'People & operations' })
  resolve({ ...fixture('me'), subscription: { ...fixture('me').subscription, plan: 'stale personal result' } })
  await waitFor(() => expect(screen.queryByText('stale personal result')).toBeNull())
  access.capabilities = ['usage:read']
  view.rerender(<UsageDashboard/>)
  expect(screen.queryByRole('heading', { name: 'People & operations' })).toBeNull()
  await screen.findByText('997 remaining')
})
it('reports outage without fake zeroes and retries explicitly', async () => {
  vi.mocked(usageApi.summary).mockRejectedValueOnce(new Error('offline'))
  render(<UsageDashboard/>)
  await screen.findByRole('alert')
  expect(screen.queryByText('997 remaining')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Refresh usage' }))
  await screen.findByText('997 remaining')
})
it('drills a tenant group down using bound account, operation and state filters', async () => {
  vi.mocked(usageApi.summary).mockImplementation(async scope => ({ ...fixture(scope), groups: scope === 'organization' ? [{ userId: 'synthetic-user', operation: 'document_intake', meter: 'document_uploads', state: 'failed', events: 1, quantity: 1 }] : [] }))
  render(<UsageDashboard/>)
  fireEvent.click(screen.getByRole('button', { name: 'Organization usage' }))
  fireEvent.click(await screen.findByRole('button', { name: /Account synthetic-user/ }))
  await waitFor(() => {
    const filters = vi.mocked(usageApi.history).mock.calls.at(-1)![1]
    expect(filters.get('userId')).toBe('synthetic-user')
    expect(filters.get('operation')).toBe('document_intake')
    expect(filters.get('state')).toBe('failed')
  })
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  await waitFor(() => expect(vi.mocked(usageApi.history).mock.calls.at(-1)![1].has('userId')).toBe(false))
})
