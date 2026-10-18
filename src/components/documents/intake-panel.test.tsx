// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IntakePanel } from './intake-panel'
import { listIntake } from '@/lib/api/intake'
const state = vi.hoisted(() => ({ read: true }))
vi.mock('@/components/access/access-provider', () => ({
  useAccess: () => ({ allows: (capability: string) => state.read && capability === 'document:read' }),
  AccessDenied: () => <p>Document access denied</p>,
}))
vi.mock('@/lib/api/intake', () => ({ listIntake: vi.fn(), sendIntake: vi.fn(), validateIntakeFile: vi.fn(), intakeError: () => 'Records unavailable' }))
afterEach(() => { cleanup(); vi.clearAllMocks(); state.read = true })

it('refreshes authoritative scan states without exposing scanner details or write controls', async () => {
  const record = { id: 'synthetic', originalFileName: 'synthetic.pdf', sizeBytes: 100, scanStatus: 'pending_scan', failureCode: 'private-scanner-detail' }
  vi.mocked(listIntake).mockResolvedValueOnce({ data: { items: [record], nextCursor: null } } as never)
  render(<IntakePanel />)
  await screen.findByText(/Pending scan · private quarantine/)
  vi.mocked(listIntake).mockResolvedValueOnce({ data: { items: [{ ...record, scanStatus: 'clean' }], nextCursor: null } } as never)
  fireEvent.click(screen.getByRole('button', { name: 'Refresh records' }))
  await screen.findByText(/Scan passed · private quarantine/)
  expect(screen.queryByText(/private-scanner-detail/)).toBeNull()
  expect(screen.queryByRole('button', { name: /upload|extract|download|scan now|mark clean/i })).toBeNull()
  expect(screen.getByText(/one security layer/)).toBeTruthy()
})

it('removes records when read access is revoked', async () => {
  vi.mocked(listIntake).mockResolvedValue({ data: { items: [{ id: 'synthetic', originalFileName: 'synthetic.pdf', sizeBytes: 100, scanStatus: 'rejected' }], nextCursor: null } } as never)
  const view = render(<IntakePanel />)
  await screen.findByText(/Scan rejected/)
  state.read = false
  view.rerender(<IntakePanel />)
  await waitFor(() => expect(screen.queryByText('synthetic.pdf')).toBeNull())
  expect(screen.getByText('Document access denied')).toBeTruthy()
  expect(listIntake).toHaveBeenCalledTimes(1)
})
