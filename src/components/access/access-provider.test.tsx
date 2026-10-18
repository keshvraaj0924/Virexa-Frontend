// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AccessProvider, useAccess } from './access-provider'
import { EffectivePermissions } from './effective-permissions'
import { notifyAccessDenied } from '@/lib/auth/access-events'
vi.mock('next/navigation', () => ({ usePathname: () => '/app/access' }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
function Controls() {
  const access = useAccess()!
  return <button disabled={!access.allows('document:upload')} onClick={() => notifyAccessDenied(403)}>Upload</button>
}
it('refreshes current capabilities after denial and removes stale write access', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(Response.json({ data: { capabilities: ['document:read', 'document:upload'] } })).mockResolvedValueOnce(Response.json({ data: { capabilities: ['document:read'] } }))
  vi.stubGlobal('fetch', fetch)
  render(<AccessProvider initial={null}><Controls/></AccessProvider>)
  await waitFor(() => expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(screen.getByRole('button'))
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  await waitFor(() => expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true))
})
it('never infers access from a role when the contract fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({}, { status: 503 })))
  render(<AccessProvider initial={null}><Controls/><EffectivePermissions/></AccessProvider>)
  await screen.findByText('Access could not be verified')
  expect((screen.getByRole('button', { name: 'Upload' }) as HTMLButtonElement).disabled).toBe(true)
})
it('presents read-only permissions and labels denied operations clearly', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: { capabilities: ['session:read'] } })))
  render(<AccessProvider initial={null}><EffectivePermissions/></AccessProvider>)
  await screen.findByText('Allowed')
  expect(screen.getAllByText('Restricted')).toHaveLength(11)
  expect(screen.queryByRole('button', { name: /save|edit/i })).toBeNull()
})
