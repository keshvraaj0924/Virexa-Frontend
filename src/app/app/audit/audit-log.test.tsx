// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import AuditLog from './audit-log'
import { fetchTenantAudit } from '@/lib/api/tenant-audit'
const access = vi.hoisted(() => ({ allowed: true }))
vi.mock('@/components/access/access-provider', () => ({ useAccess: () => ({ allows: () => access.allowed }), AccessDenied: () => <p>Audit events are restricted</p> }))
vi.mock('@/lib/api/tenant-audit', async original => ({ ...await original<object>(), fetchTenantAudit: vi.fn() }))
const empty = { events: [], nextCursor: null, coverage: { actions: [] as never[], notice: 'Earlier activity is not covered.' } }
afterEach(() => { cleanup(); vi.clearAllMocks(); access.allowed = true })
it('distinguishes empty recorded results and preserves coverage with filters', async () => {
  vi.mocked(fetchTenantAudit).mockResolvedValue(empty)
  render(<AuditLog />)
  await screen.findByText('No matching recorded events')
  expect(screen.getByText('Earlier activity is not covered.')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Outcome'), { target: { value: 'failed' } })
  await waitFor(() => expect(fetchTenantAudit).toHaveBeenLastCalledWith({ cursor: undefined, action: undefined, outcome: 'failed' }, expect.any(AbortSignal)))
})
it('hides unavailable records and supports explicit retry', async () => {
  vi.mocked(fetchTenantAudit).mockRejectedValueOnce(new Error('private error')).mockResolvedValueOnce(empty)
  render(<AuditLog />)
  await screen.findByText('Audit trail unavailable')
  expect(screen.queryByText('private error')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Refresh audit events' }))
  await screen.findByText('No matching recorded events')
})
it('aborts and hides records when access changes', async () => {
  vi.mocked(fetchTenantAudit).mockResolvedValue(empty)
  const view = render(<AuditLog />)
  await screen.findByText('No matching recorded events')
  const signal = vi.mocked(fetchTenantAudit).mock.calls[0][1]!
  access.allowed = false; view.rerender(<AuditLog />)
  expect(screen.getByText('Audit events are restricted')).toBeTruthy()
  expect(signal.aborted).toBe(true)
  expect(screen.queryByText('Recording coverage')).toBeNull()
})
it('uses cursor history and resets pagination when filters change', async () => {
  vi.mocked(fetchTenantAudit).mockResolvedValueOnce({ ...empty, nextCursor: 'page-two' }).mockResolvedValueOnce(empty).mockResolvedValueOnce({ ...empty, nextCursor: 'page-two' }).mockResolvedValue(empty)
  render(<AuditLog />)
  await screen.findByText('0 events on page 1')
  fireEvent.click(screen.getByRole('button', { name: 'Older events' }))
  await screen.findByText('0 events on page 2')
  expect(fetchTenantAudit).toHaveBeenLastCalledWith({ cursor: 'page-two', action: undefined, outcome: undefined }, expect.any(AbortSignal))
  fireEvent.click(screen.getByRole('button', { name: 'Newer events' }))
  await screen.findByText('0 events on page 1')
  fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'auth.login' } })
  await waitFor(() => expect(fetchTenantAudit).toHaveBeenLastCalledWith({ cursor: undefined, action: 'auth.login', outcome: undefined }, expect.any(AbortSignal)))
})
