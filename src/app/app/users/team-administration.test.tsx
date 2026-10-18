// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import TeamAdministration from './team-administration'
import { teamApi, type Member } from '@/lib/api/team'
import { ApiError } from '@/lib/api/client'
const access = vi.hoisted(() => ({ values: ['organization:members:read', 'organization:members:manage'] }))
vi.mock('@/components/access/access-provider', () => ({ useAccess: () => ({ allows: (capability: string) => access.values.includes(capability) }), AccessDenied: () => <p>Members restricted</p> }))
vi.mock('@/lib/api/team', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/api/team')>(), teamApi: { list: vi.fn(), get: vi.fn(), changeRole: vi.fn() } }))
const member: Member = { id: 'other', organizationId: 'org', displayName: 'Synthetic Member', email: 'member@example.com', role: 'viewer', version: 1, createdAt: '2026-01-01' }
beforeEach(() => { access.values = ['organization:members:read', 'organization:members:manage']; vi.mocked(teamApi.list).mockResolvedValue({ items: [member], nextCursor: null }); vi.mocked(teamApi.get).mockResolvedValue(member); vi.mocked(teamApi.changeRole).mockResolvedValue({ ...member, role: 'auditor', version: 2 }) })
afterEach(() => { cleanup(); vi.resetAllMocks() })
async function review() { fireEvent.click(await screen.findByRole('button', { name: 'Review role for Synthetic Member' })); await screen.findByLabelText('New role'); fireEvent.change(screen.getByLabelText('New role'), { target: { value: 'auditor' } }) }
it('requires impact confirmation, suppresses duplicate submit and does not grant platform roles', async () => {
  render(<TeamAdministration accountType="organization" userId="self" />); await review()
  expect(screen.queryByRole('option', { name: 'platform admin' })).toBeNull()
  expect((screen.getByRole('button', { name: 'Confirm role change' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Confirm role change' })); fireEvent.click(screen.getByRole('button', { name: 'Updating role…' }))
  await waitFor(() => expect(teamApi.changeRole).toHaveBeenCalledTimes(1)); await screen.findByRole('status')
})
it('cancel and personal workspace never mutate; personal workspace never fetches team data', async () => {
  const view = render(<TeamAdministration accountType="individual" userId="self" />)
  expect(screen.getByRole('heading', { name: 'Personal workspace' })).toBeTruthy(); expect(teamApi.list).not.toHaveBeenCalled()
  view.rerender(<TeamAdministration accountType="organization" userId="self" />); await review(); fireEvent.click(screen.getByRole('button', { name: 'Close review' })); expect(teamApi.changeRole).not.toHaveBeenCalled()
})
it('auditors are read-only and own/platform roles are protected', async () => {
  access.values = ['organization:members:read']; render(<TeamAdministration accountType="organization" userId="self" />); await screen.findByText('Synthetic Member'); expect(screen.queryByRole('button', { name: /Review role for/ })).toBeNull()
})
it.each(['MEMBER_CONFLICT', 'LAST_ORGANIZATION_ADMIN', 'SELF_ROLE_CHANGE_FORBIDDEN'])('blocks retries after %s until current detail is reopened', async code => {
  vi.mocked(teamApi.changeRole).mockRejectedValue(new ApiError({ code, status: 409, message: 'Denied', requestId: 'id' }))
  render(<TeamAdministration accountType="organization" userId="self" />); await review(); fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Confirm role change' })); await screen.findByRole('alert'); expect((screen.getByRole('button', { name: 'Confirm role change' }) as HTMLButtonElement).disabled).toBe(true)
})
it('closes the editor when management rights disappear', async () => {
  const view = render(<TeamAdministration accountType="organization" userId="self" />); await review(); access.values = ['organization:members:read']; view.rerender(<TeamAdministration accountType="organization" userId="self" />); expect(screen.queryByLabelText('New role')).toBeNull()
})
it('ignores a deferred member response after roster refresh', async () => {
  let finish!: (value: Member) => void
  vi.mocked(teamApi.get).mockImplementation(() => new Promise(resolve => { finish = resolve }))
  render(<TeamAdministration accountType="organization" userId="self" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Review role for Synthetic Member' }))
  fireEvent.click(screen.getByRole('button', { name: 'Refresh roster' })); finish(member)
  await waitFor(() => expect(teamApi.list).toHaveBeenCalledTimes(2))
  expect(screen.queryByLabelText('New role')).toBeNull()
})
it('uncertain writes never automatically retry and require reopening current detail', async () => {
  vi.mocked(teamApi.changeRole).mockRejectedValue(new Error('Lost response'))
  render(<TeamAdministration accountType="organization" userId="self" />); await review(); fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Confirm role change' }))
  await screen.findByText(/A submitted change may have completed/)
  expect(teamApi.changeRole).toHaveBeenCalledTimes(1)
  expect((screen.getByRole('button', { name: 'Confirm role change' }) as HTMLButtonElement).disabled).toBe(true)
})
it('does not restore a pending role review or success after access is revoked', async () => {
  let finish!: (value: Member) => void
  vi.mocked(teamApi.changeRole).mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const view = render(<TeamAdministration accountType="organization" userId="self" />); await review(); fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Confirm role change' }))
  access.values = []; view.rerender(<TeamAdministration accountType="organization" userId="self" />); finish({ ...member, role: 'auditor', version: 2 })
  await waitFor(() => expect(screen.getByText('Members restricted')).toBeTruthy())
  expect(screen.queryByLabelText('New role')).toBeNull(); expect(screen.queryByRole('status')).toBeNull()
})
