// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'
import RegisterPage from '@/app/register/page'
import { authApi } from '@/lib/api/auth'

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/lib/api/auth', () => ({ authApi: { login: vi.fn(), register: vi.fn() } }))
vi.mock('./document-orbit', () => ({ DocumentOrbit: () => null }))
vi.mock('./auth-submit', () => ({ AuthSubmit: ({ disabled, children }: { disabled: boolean; children: React.ReactNode }) => <button type="submit" disabled={disabled}>{children}</button> }))
afterEach(cleanup)
beforeEach(() => vi.clearAllMocks())
function enterLogin() {
  fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'alex@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'strong password 123' } })
}

describe('premium authentication', () => {
  it('preserves login payload and prevents repeated requests while pending', async () => {
    let complete!: (value: never) => void
    vi.mocked(authApi.login).mockImplementation(() => new Promise((resolve) => { complete = resolve }))
    const view = render(<LoginPage />)
    enterLogin()
    const form = view.container.querySelector('form')!
    fireEvent.submit(form); fireEvent.submit(form)
    expect(authApi.login).toHaveBeenCalledTimes(1)
    expect(authApi.login).toHaveBeenCalledWith({ email: 'alex@example.com', password: 'strong password 123' })
    expect(screen.getByRole('button', { name: 'Signing in…' }).hasAttribute('disabled')).toBe(true)
    expect(router.replace).not.toHaveBeenCalled()
    complete({} as never)
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/app'))
    expect(router.refresh).toHaveBeenCalledOnce()
  })
  it('announces errors, keeps the email, and allows retry', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Unable to sign in.'))
    const view = render(<LoginPage />); enterLogin()
    fireEvent.submit(view.container.querySelector('form')!)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Unable to sign in.'))
    expect(document.activeElement).toBe(screen.getByRole('alert'))
    expect((screen.getByLabelText('Work email') as HTMLInputElement).value).toBe('alex@example.com')
    expect(router.replace).not.toHaveBeenCalled()
    fireEvent.submit(view.container.querySelector('form')!)
    await waitFor(() => expect(authApi.login).toHaveBeenCalledTimes(2))
  })
  it('does not navigate after the user has left the form', async () => {
    let complete!: (value: never) => void
    vi.mocked(authApi.login).mockImplementation(() => new Promise((resolve) => { complete = resolve }))
    const view = render(<LoginPage />); enterLogin(); fireEvent.submit(view.container.querySelector('form')!); view.unmount()
    complete({} as never); await Promise.resolve()
    expect(router.replace).not.toHaveBeenCalled()
  })
  it('reveals passwords only through the accessible toggle', () => {
    render(<LoginPage />)
    const input = screen.getByLabelText('Password') as HTMLInputElement
    expect(input.type).toBe('password')
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input.type).toBe('text')
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input.type).toBe('password')
  })
  it('registers with the unchanged organization-aware request shape', async () => {
    vi.mocked(authApi.register).mockResolvedValue({} as never)
    const view = render(<RegisterPage />)
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: ' Alex Morgan ' } })
    fireEvent.change(screen.getByLabelText('Organization'), { target: { value: ' Acme ' } })
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'alex@example.com' } })
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'strong password 123' } })
    fireEvent.submit(view.container.querySelector('form')!)
    await waitFor(() => expect(authApi.register).toHaveBeenCalledWith({ displayName: 'Alex Morgan', organizationName: 'Acme', email: 'alex@example.com', password: 'strong password 123' }))
  })
  it('rejects whitespace-only organization names before submitting', () => {
    const view = render(<RegisterPage />)
    fireEvent.submit(view.container.querySelector('form')!)
    expect(authApi.register).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain('two characters')
  })
})
