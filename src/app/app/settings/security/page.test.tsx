// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import SecuritySettingsPage from './page'
import { authApi, ApiRequestError } from '@/lib/api/auth'
vi.mock('@/lib/api/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/auth')>('@/lib/api/auth')
  return { ...actual, authApi: { activeSessions: vi.fn(), revokeSession: vi.fn(), revokeOtherSessions: vi.fn() } }
})
const current = { id: 'current', current: true, createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z' }
const other = { ...current, id: 'other', current: false }
function page(data = [current], nextCursor: string | null = null) { return { data, meta: { requestId: 'test', timestamp: '', pagination: { nextCursor } } } }
beforeEach(() => { vi.clearAllMocks(); vi.mocked(authApi.activeSessions).mockResolvedValue(page()); vi.mocked(authApi.revokeOtherSessions).mockResolvedValue({ data: { revokedCount: 1 }, meta: { requestId: '', timestamp: '' } }); vi.mocked(authApi.revokeSession).mockResolvedValue({ data: { success: true }, meta: { requestId: '', timestamp: '' } }) })
afterEach(cleanup)
it('loads additional pages without duplication and refresh resets the live inventory', async () => {
  vi.mocked(authApi.activeSessions).mockResolvedValueOnce(page([other], 'cursor')).mockResolvedValueOnce(page([other, current]))
  render(<SecuritySettingsPage />)
  await screen.findByRole('button', { name: 'Load more sessions' })
  expect(screen.getByText('1 active session shown. More sessions are available.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Load more sessions' }))
  await screen.findByText('Current session')
  expect(authApi.activeSessions).toHaveBeenLastCalledWith('cursor')
  expect(screen.getByText('2 active sessions shown.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Refresh sessions' }))
  await screen.findByText('1 active session shown.')
  expect(screen.queryByText('Active session')).toBeNull()
})
it('does not mistake an incomplete page for no other active sessions', async () => {
  vi.mocked(authApi.activeSessions).mockResolvedValueOnce(page([current], 'cursor'))
  render(<SecuritySettingsPage />)
  await screen.findByRole('button', { name: 'Load more sessions' })
  expect((screen.getByRole('button', { name: 'Sign out other sessions' }) as HTMLButtonElement).disabled).toBe(false)
})
it('serializes repeat clicks and refreshes after revoke others', async () => {
  let resolve!: (value: Awaited<ReturnType<typeof authApi.revokeOtherSessions>>) => void
  vi.mocked(authApi.activeSessions).mockResolvedValueOnce(page([current, other]))
  vi.mocked(authApi.revokeOtherSessions).mockReturnValueOnce(new Promise(done => { resolve = done }))
  render(<SecuritySettingsPage />)
  await screen.findByText('2 active sessions shown.')
  act(() => { const button = screen.getByRole('button', { name: 'Sign out other sessions' }); button.click(); button.click() })
  expect(authApi.revokeOtherSessions).toHaveBeenCalledTimes(1)
  expect((screen.getByRole('button', { name: 'Refresh sessions' }) as HTMLButtonElement).disabled).toBe(true)
  await act(async () => resolve({ data: { revokedCount: 1 }, meta: { requestId: '', timestamp: '' } }))
  await screen.findByText('1 other session was revoked.')
  expect(screen.getByText('1 active session shown.')).toBeTruthy()
})
it('recovers from a failed request and permits a targeted revoke retry', async () => {
  vi.mocked(authApi.activeSessions).mockResolvedValue(page([current, other]))
  vi.mocked(authApi.revokeSession).mockRejectedValueOnce(new ApiRequestError('Service unavailable.', { code: 'DEPENDENCY_UNAVAILABLE' }))
  render(<SecuritySettingsPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Revoke this session' }))
  await screen.findByRole('alert')
  expect(screen.getByRole('alert').textContent).toBe('Service unavailable.')
  vi.mocked(authApi.activeSessions).mockResolvedValue(page())
  fireEvent.click(screen.getByRole('button', { name: 'Revoke this session' }))
  await waitFor(() => expect(authApi.revokeSession).toHaveBeenCalledTimes(2))
  await screen.findByText('Session revoked.')
  expect(screen.queryByRole('button', { name: 'Revoke this session' })).toBeNull()
})
it('shows load failure instead of claiming there are no active sessions', async () => {
  vi.mocked(authApi.activeSessions).mockRejectedValueOnce(new Error('offline'))
  render(<SecuritySettingsPage />)
  await screen.findByRole('alert')
  expect(screen.queryByText('No active sessions were returned.')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Refresh sessions' }))
  await screen.findByText('Current session')
})
it('ignores an inventory response after the page unmounts', async () => {
  let resolve!: (value: ReturnType<typeof page>) => void
  vi.mocked(authApi.activeSessions).mockReturnValueOnce(new Promise(done => { resolve = done }))
  const view = render(<SecuritySettingsPage />)
  view.unmount()
  await act(async () => resolve(page([current, other], 'cursor')))
  expect(screen.queryByText('Current session')).toBeNull()
})
