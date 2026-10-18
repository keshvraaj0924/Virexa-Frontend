// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import WorkflowRecords from './workflow-records'
import { workflowsApi } from '@/lib/api/workflows'
import { ApiError } from '@/lib/api/client'
const access = vi.hoisted(() => ({ values: ['workflow:read', 'workflow:create', 'workflow:manage'] }))
vi.mock('@/components/access/access-provider', () => ({ useAccess: () => ({ allows: (capability: string) => access.values.includes(capability) }), AccessDenied: () => <p>Records restricted</p> }))
vi.mock('@/lib/api/workflows', () => ({ workflowsApi: { list: vi.fn(), create: vi.fn(), get: vi.fn(), update: vi.fn() } }))
const record = { id: 'record-1', organizationId: 'tenant', createdByUserId: 'owner', name: 'Synthetic review', description: 'Record only', status: 'draft' as const, version: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01' }
const wrap = <T,>(data: T) => ({ data, meta: { requestId: 'id', timestamp: 'now' } })
beforeEach(() => { access.values = ['workflow:read', 'workflow:create', 'workflow:manage']; vi.mocked(workflowsApi.list).mockResolvedValue(wrap({ items: [record], nextCursor: null })); vi.mocked(workflowsApi.get).mockResolvedValue(wrap(record)) })
afterEach(() => { cleanup(); vi.resetAllMocks() })
it('reuses the exact create payload and idempotency key after an uncertain response', async () => {
  vi.mocked(workflowsApi.create).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(wrap(record))
  render(<WorkflowRecords userId="owner" />); await screen.findByText('Synthetic review')
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New record' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create record' }))
  await screen.findByRole('button', { name: 'Retry same creation' })
  fireEvent.click(screen.getByRole('button', { name: 'Retry same creation' }))
  await waitFor(() => expect(workflowsApi.create).toHaveBeenCalledTimes(2))
  expect(vi.mocked(workflowsApi.create).mock.calls[0]).toEqual(vi.mocked(workflowsApi.create).mock.calls[1])
  await screen.findByText(/No actions were executed/)
})
it('loads current detail, cancels without writing, and requires an explicit conflict reload', async () => {
  vi.mocked(workflowsApi.update).mockRejectedValue(new ApiError({ status: 409, code: 'WORKFLOW_CONFLICT', message: 'conflict', requestId: 'id' }))
  render(<WorkflowRecords userId="owner" />); await screen.findByText('Synthetic review')
  fireEvent.click(screen.getByRole('button', { name: 'View record' })); await screen.findByLabelText('Record name')
  fireEvent.change(screen.getByLabelText('Record name'), { target: { value: 'Changed' } })
  fireEvent.click(screen.getByRole('button', { name: 'Close editor' })); expect(workflowsApi.update).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'View record' })); await screen.findByLabelText('Record name')
  fireEvent.click(screen.getByRole('button', { name: 'Save record' })); await screen.findByRole('alert')
  expect(workflowsApi.update).toHaveBeenCalledTimes(1)
  expect(workflowsApi.update).toHaveBeenCalledWith('record-1', expect.objectContaining({ expectedVersion: 1 }))
})
it('fails closed on revoked capabilities and suppresses late detail responses', async () => {
  let resolve!: (value: ReturnType<typeof wrap<typeof record>>) => void
  vi.mocked(workflowsApi.get).mockImplementation(() => new Promise(done => { resolve = done }))
  const view = render(<WorkflowRecords userId="owner" />); await screen.findByText('Synthetic review')
  fireEvent.click(screen.getByRole('button', { name: 'View record' }))
  access.values = []; view.rerender(<WorkflowRecords userId="owner" />)
  resolve(wrap(record)); await screen.findByText('Records restricted')
  expect(screen.queryByLabelText('Record name')).toBeNull(); expect(screen.queryByText('Synthetic review')).toBeNull()
})
it('operators cannot edit another owner’s records and viewers cannot create', async () => {
  access.values = ['workflow:read', 'workflow:create']
  const view = render(<WorkflowRecords userId="other" />); await screen.findByText('Synthetic review')
  fireEvent.click(screen.getByRole('button', { name: 'View record' })); await screen.findByText('Read-only. You cannot update this record.')
  expect(screen.queryByRole('button', { name: 'Save record' })).toBeNull()
  access.values = ['workflow:read']; view.rerender(<WorkflowRecords userId="other" />)
  expect(screen.queryByRole('button', { name: 'Create record' })).toBeNull()
})
it('ignores older filter results after newer navigation', async () => {
  let resolve!: (value: ReturnType<typeof wrap<{ items: typeof record[]; nextCursor: null }>>) => void
  vi.mocked(workflowsApi.list).mockImplementationOnce(() => new Promise(done => { resolve = done })).mockResolvedValueOnce(wrap({ items: [], nextCursor: null }))
  render(<WorkflowRecords userId="owner" />)
  fireEvent.change(screen.getByLabelText('Filter workflow status'), { target: { value: 'paused' } })
  await screen.findByText('No matching workflow records.')
  resolve(wrap({ items: [record], nextCursor: null }))
  await waitFor(() => expect(screen.queryByText('Synthetic review')).toBeNull())
})
it('matches backend length limits in creation and detail editing', async () => {
  render(<WorkflowRecords userId="owner" />); await screen.findByText('Synthetic review')
  expect((screen.getByLabelText('Name') as HTMLInputElement).maxLength).toBe(120)
  expect((screen.getByLabelText('Description') as HTMLInputElement).maxLength).toBe(1000)
  fireEvent.click(screen.getByRole('button', { name: 'View record' })); await screen.findByLabelText('Record name')
  expect((screen.getByLabelText('Record name') as HTMLInputElement).maxLength).toBe(120)
  expect((screen.getByLabelText('Record description') as HTMLInputElement).maxLength).toBe(1000)
})
it('requires detail reload after a malformed successful update response', async () => {
  vi.mocked(workflowsApi.update).mockResolvedValue(wrap({ ...record, status: 'executing' } as never))
  render(<WorkflowRecords userId="owner" />); await screen.findByText('Synthetic review')
  fireEvent.click(screen.getByRole('button', { name: 'View record' })); await screen.findByLabelText('Record name')
  fireEvent.click(screen.getByRole('button', { name: 'Save record' })); await screen.findByRole('alert')
  expect((screen.getByRole('button', { name: 'Save record' }) as HTMLButtonElement).disabled).toBe(true)
})
it('resets uncertain creation when the session user changes', async () => {
  vi.mocked(workflowsApi.create).mockRejectedValue(new Error('network'))
  const view = render(<WorkflowRecords userId="owner" />); await screen.findByText('Synthetic review')
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'First account draft' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create record' })); await screen.findByRole('button', { name: 'Retry same creation' })
  vi.mocked(workflowsApi.list).mockResolvedValue(wrap({ items: [], nextCursor: null }))
  view.rerender(<WorkflowRecords userId="second-user" />)
  await screen.findByText('No matching workflow records.')
  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('')
  expect(screen.queryByRole('button', { name: 'Retry same creation' })).toBeNull()
})
it('retains the creation key when an uncertain write replay is rate-limited', async () => {
  vi.mocked(workflowsApi.create).mockRejectedValueOnce(new Error('lost response')).mockRejectedValueOnce(new ApiError({ status: 429, code: 'RATE_LIMITED', message: 'Later', requestId: 'id' })).mockResolvedValueOnce(wrap(record))
  render(<WorkflowRecords userId="owner" />); await screen.findByText('Synthetic review')
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Safe retry' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create record' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Retry same creation' }))
  await waitFor(() => expect(workflowsApi.create).toHaveBeenCalledTimes(2))
  fireEvent.click(await screen.findByRole('button', { name: 'Retry same creation' }))
  await waitFor(() => expect(workflowsApi.create).toHaveBeenCalledTimes(3))
  const calls = vi.mocked(workflowsApi.create).mock.calls
  expect(calls[1]).toEqual(calls[0]); expect(calls[2]).toEqual(calls[0])
})
