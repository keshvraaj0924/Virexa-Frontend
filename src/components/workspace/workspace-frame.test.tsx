// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { WorkspaceFrame } from './workspace-frame'
import type { AuthSession } from '@/contracts/auth'
import { authApi } from '@/lib/api/auth'
const capabilities = vi.hoisted(() => ({ values: [] as string[] }))
vi.mock('@/components/access/access-provider', () => ({ useAccess: () => ({ allows: (capability: string) => capabilities.values.includes(capability) }) }))
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/app/documents' }))
vi.mock('@/lib/api/auth', () => ({ authApi: { logout: vi.fn() } }))
const session: AuthSession = { user: { id: 'u', displayName: 'Alex', email: 'a@example.com', organizationId: 'o', organizationName: 'Acme', role: 'viewer' }, expiresAt: '2026-12-01T00:00:00Z' }
afterEach(cleanup)
beforeEach(() => { vi.clearAllMocks(); capabilities.values = [] })
it('keeps navigation role-aware and only links implemented routes', () => {
  render(<WorkspaceFrame session={session}>Content</WorkspaceFrame>)
  expect(screen.getByRole('link', { name: 'Documents' }).getAttribute('aria-current')).toBe('page')
  expect(screen.queryByRole('link', { name: 'Workflows' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Analytics' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Users & Access' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Security' }).getAttribute('href')).toBe('/app/settings/security')
})
it('provides an expandable mobile navigation', () => {
  render(<WorkspaceFrame session={session}>Content</WorkspaceFrame>)
  fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
  expect(screen.getByRole('button', { name: 'Close navigation' }).getAttribute('aria-expanded')).toBe('true')
  screen.getByRole('link', { name: 'Documents' }).addEventListener('click', (event) => event.preventDefault())
  fireEvent.click(screen.getByRole('link', { name: 'Documents' }))
  expect(screen.getByRole('button', { name: 'Open navigation' }).getAttribute('aria-expanded')).toBe('false')
})
it('retains the workspace after failed logout and allows retry', async () => {
  vi.mocked(authApi.logout).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({} as never)
  render(<WorkspaceFrame session={session}>Content</WorkspaceFrame>)
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Sign out failed'))
  expect(router.replace).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'))
})
it('gates all unported features in the isolated auth candidate even for admins', () => {
  render(<WorkspaceFrame authOnly session={{ ...session, user: { ...session.user, role: 'admin' } }}>Preview</WorkspaceFrame>)
  expect(screen.getByRole('link', { name: 'Dashboard' })).toBeTruthy()
  for (const name of ['Documents', 'Workflows', 'Users & Access', 'Audit Log', 'Security']) {
    expect(screen.queryByRole('link', { name })).toBeNull()
  }
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy()
})
it('enables only documents with explicit intake capability', () => {
  capabilities.values = ['document:read']
  render(<WorkspaceFrame authOnly documentIntake session={{ ...session, user: { ...session.user, role: 'admin' } }}>Intake</WorkspaceFrame>)
  expect(screen.getByRole('link', { name: 'Documents' })).toBeTruthy()
  for (const name of ['Workflows', 'Users & Access', 'Audit Log', 'Security']) expect(screen.queryByRole('link', { name })).toBeNull()
})
it('enables Security only with explicit session capability', () => {
  capabilities.values = ['session:read']
  render(<WorkspaceFrame authOnly sessionControls session={{ ...session, user: { ...session.user, role: 'admin' } }}>Sessions</WorkspaceFrame>)
  expect(screen.getByRole('link', { name: 'Security' })).toBeTruthy()
  for (const name of ['Documents', 'Workflows', 'Users & Access', 'Audit Log']) expect(screen.queryByRole('link', { name })).toBeNull()
})

it('denies candidate navigation even for admin when capabilities are absent', () => {
  render(<WorkspaceFrame authOnly documentIntake sessionControls session={{ ...session, user: { ...session.user, role: 'admin' } }}>Restricted</WorkspaceFrame>)
  expect(screen.queryByRole('link', { name: 'Documents' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Security' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Your access' })).toBeTruthy()
})
it('shows auditor session access without exposing documents or admin routes', () => {
  capabilities.values = ['session:read', 'session:revoke']
  render(<WorkspaceFrame authOnly documentIntake sessionControls session={{ ...session, user: { ...session.user, role: 'auditor' } }}>Auditor</WorkspaceFrame>)
  expect(screen.getByRole('link', { name: 'Security' })).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Documents' })).toBeNull()
})

it('requires both explicit enablement and server capability for usage navigation', () => {
  capabilities.values = ['usage:read']
  const view = render(<WorkspaceFrame authOnly session={session}>Usage</WorkspaceFrame>)
  expect(screen.queryByRole('link', { name: 'Usage & plan' })).toBeNull()
  view.rerender(<WorkspaceFrame authOnly usageAnalytics session={session}>Usage</WorkspaceFrame>)
  expect(screen.getByRole('link', { name: 'Usage & plan' }).getAttribute('href')).toBe('/app/usage')
  capabilities.values = []
  view.rerender(<WorkspaceFrame authOnly usageAnalytics session={session}>Usage</WorkspaceFrame>)
  expect(screen.queryByRole('link', { name: 'Usage & plan' })).toBeNull()
})
