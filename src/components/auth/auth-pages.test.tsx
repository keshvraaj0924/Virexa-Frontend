// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'
import RegisterPage from '@/app/register/page'
import { ApiRequestError, authApi } from '@/lib/api/auth'

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/lib/api/auth', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/api/auth')>()), authApi: { login: vi.fn(), register: vi.fn(), startSignup: vi.fn(), verifySignup: vi.fn(), completeSignup: vi.fn(), session: vi.fn() } }))
vi.mock('./document-orbit', () => ({ DocumentOrbit: () => null }))
vi.mock('./auth-submit', () => ({ AuthSubmit: ({ disabled, children }: { disabled: boolean; children: React.ReactNode }) => <button type="submit" disabled={disabled}>{children}</button> }))
afterEach(() => { cleanup(); vi.unstubAllEnvs() })
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('VIREXA_AUTH_CANDIDATE', '1') })
function enterLogin() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alex@example.com' } })
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
    expect(authApi.login).toHaveBeenCalledWith({ accountType: 'individual', email: 'alex@example.com', password: 'strong password 123' })
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
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('alert')))
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('alex@example.com')
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
})

function enterDetails() {
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: ' Alex Morgan ' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alex@example.com' } })
}
function submit() { fireEvent.submit(screen.getByRole('button', { name: /Send verification code|Verify email|Create workspace/ }).closest('form')!) }
async function beginVerification() {
  enterDetails(); submit()
  await screen.findByLabelText('Verification code')
}
beforeEach(() => {
  vi.mocked(authApi.startSignup).mockResolvedValue({ data: { challengeId: 'synthetic-challenge', message: 'Check email', expiresInSeconds: 600, resendAfterSeconds: 60 } } as never)
  vi.mocked(authApi.verifySignup).mockResolvedValue({ data: { setupToken: 'synthetic-proof', expiresInSeconds: 300 } } as never)
  vi.mocked(authApi.completeSignup).mockResolvedValue({} as never)
})
describe('verified account creation', () => {
  it('prioritizes individual and organization equally, only requests organization name when chosen', () => {
    render(<RegisterPage />)
    expect(screen.getByRole('radio', { name: /Individual/ })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /Organization/ })).toBeTruthy()
    expect(screen.queryByLabelText('Organization name')).toBeNull()
    expect(screen.queryByLabelText(/Password/)).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: /Organization/ }))
    expect(screen.getByLabelText('Organization name')).toBeTruthy()
  })
  it('requires verified email before a password and never uses legacy registration', async () => {
    render(<RegisterPage />)
    await beginVerification()
    expect(authApi.startSignup).toHaveBeenCalledWith({ accountType: 'individual', displayName: 'Alex Morgan', email: 'alex@example.com' }, expect.any(AbortSignal))
    expect(screen.getByRole('button', { name: /Resend in/ }).hasAttribute('disabled')).toBe(true)
    expect(screen.queryByLabelText(/Password/)).toBeNull()
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: 'synthetic-code' } })
    submit()
    await screen.findByLabelText(/Password/)
    expect(authApi.verifySignup).toHaveBeenCalledWith({ challengeId: 'synthetic-challenge', code: 'synthetic-code' }, expect.any(AbortSignal))
    expect(screen.queryByLabelText('Verification code')).toBeNull()
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'A long unique passphrase' } })
    submit()
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/app'))
    expect(authApi.completeSignup).toHaveBeenCalledWith({ challengeId: 'synthetic-challenge', setupToken: 'synthetic-proof', password: 'A long unique passphrase' }, expect.any(AbortSignal))
    expect(authApi.register).not.toHaveBeenCalled()
  })
  it('submits organization details without domain restrictions or tenant identifiers', async () => {
    render(<RegisterPage />)
    fireEvent.click(screen.getByRole('radio', { name: /Organization/ }))
    fireEvent.change(screen.getByLabelText('Organization name'), { target: { value: ' A small startup ' } })
    await beginVerification()
    expect(authApi.startSignup).toHaveBeenCalledWith({ accountType: 'organization', displayName: 'Alex Morgan', email: 'alex@example.com', organizationName: 'A small startup' }, expect.any(AbortSignal))
  })
  it('does not claim delivery when sending fails and allows retry', async () => {
    vi.mocked(authApi.startSignup).mockRejectedValueOnce(new Error('Email delivery is unavailable.'))
    render(<RegisterPage />); enterDetails(); submit()
    await screen.findByRole('alert')
    expect(screen.queryByLabelText('Verification code')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('alert')))
    submit(); await screen.findByLabelText('Verification code')
  })
  it('retains verification step after an invalid code and clears secrets when editing details', async () => {
    vi.mocked(authApi.verifySignup).mockRejectedValueOnce(new Error('Invalid verification code.'))
    render(<RegisterPage />); await beginVerification()
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: 'synthetic-wrong' } }); submit()
    await screen.findByRole('alert')
    expect(screen.queryByLabelText(/Password/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Edit details' }))
    expect(screen.getByLabelText('Email')).toBeTruthy()
    expect(screen.queryByLabelText('Verification code')).toBeNull()
    submit(); await screen.findByLabelText('Verification code')
    expect((screen.getByLabelText('Verification code') as HTMLInputElement).value).toBe('')
  })
  it('prevents repeated start requests and ignores completion after unmount', async () => {
    let complete!: (value: never) => void
    vi.mocked(authApi.startSignup).mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
    const view = render(<RegisterPage />); enterDetails()
    const form = view.container.querySelector('form')!
    fireEvent.submit(form); fireEvent.submit(form)
    expect(authApi.startSignup).toHaveBeenCalledTimes(1)
    view.unmount(); complete({ data: { challengeId: 'x' } } as never)
    await Promise.resolve()
    expect(router.replace).not.toHaveBeenCalled()
  })
  it('resets verification on pagehide rather than keeping secrets in browser history', async () => {
    render(<RegisterPage />); await beginVerification()
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: 'synthetic-code' } })
    fireEvent(window, new Event('pagehide'))
    expect(screen.queryByLabelText('Verification code')).toBeNull()
    expect(screen.getByLabelText('Email')).toBeTruthy()
  })
})

it('keeps legacy login wire-compatible and explicitly gates unsupported verified signup', async () => {
  vi.stubEnv('VIREXA_AUTH_CANDIDATE', '0')
  vi.mocked(authApi.login).mockResolvedValue({} as never)
  const view = render(<LoginPage />); enterLogin()
  expect(screen.queryByRole('radio')).toBeNull()
  fireEvent.submit(view.container.querySelector('form')!)
  await waitFor(() => expect(authApi.login).toHaveBeenCalledWith({ email: 'alex@example.com', password: 'strong password 123' }))
  view.unmount(); render(<RegisterPage />)
  expect(screen.getByRole('status').textContent).toContain('not available')
  expect(screen.queryByRole('button', { name: 'Send verification code' })).toBeNull()
})

it('reconciles a lost completion response against the real cookie session', async () => {
  vi.mocked(authApi.completeSignup).mockRejectedValueOnce(new Error('Response lost'))
  vi.mocked(authApi.session).mockResolvedValueOnce({ data: { user: { email: 'alex@example.com', accountType: 'individual' } } } as never)
  render(<RegisterPage />); await beginVerification()
  fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: 'synthetic-code' } }); submit()
  await screen.findByLabelText(/Password/)
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'A long unique passphrase' } }); submit()
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/app'))
  expect(authApi.completeSignup).toHaveBeenCalledTimes(1)
})
it('clears consumed proofs after uncertain completion and offers sign-in recovery', async () => {
  vi.mocked(authApi.completeSignup).mockRejectedValueOnce(new Error('Response lost'))
  vi.mocked(authApi.session).mockRejectedValueOnce(new Error('No session'))
  render(<RegisterPage />); await beginVerification()
  fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: 'synthetic-code' } }); submit()
  await screen.findByLabelText(/Password/)
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'A long unique passphrase' } }); submit()
  await screen.findByRole('button', { name: 'Restart verification' })
  expect(screen.queryByLabelText(/Password/)).toBeNull()
  expect(router.replace).not.toHaveBeenCalled()
})
it('keeps password validation correctable without consuming the verified proof', async () => {
  vi.mocked(authApi.completeSignup).mockRejectedValueOnce(new ApiRequestError('Choose a unique password.', { code: 'VALIDATION_ERROR' }))
  render(<RegisterPage />); await beginVerification()
  fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: 'synthetic-code' } }); submit()
  await screen.findByLabelText(/Password/)
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'aaaaaaaaaaaa' } }); submit()
  await screen.findByRole('alert')
  expect(screen.getByLabelText(/Password/)).toBeTruthy()
  expect(authApi.session).not.toHaveBeenCalled()
})
it('aborts pending verification on unmount to discard late response credentials', async () => {
  vi.mocked(authApi.verifySignup).mockImplementationOnce(() => new Promise(() => {}))
  const view = render(<RegisterPage />); await beginVerification()
  fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: 'synthetic-code' } }); submit()
  const signal = vi.mocked(authApi.verifySignup).mock.calls[0][1]!
  expect(signal.aborted).toBe(false)
  view.unmount()
  expect(signal.aborted).toBe(true)
})
it('aborts pending completion and never navigates after leaving the signup page', async () => {
  let complete!: (value: never) => void
  vi.mocked(authApi.completeSignup).mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
  const view = render(<RegisterPage />); await beginVerification()
  fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: 'synthetic-code' } }); submit()
  await screen.findByLabelText(/Password/)
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'A long unique passphrase' } }); submit()
  const signal = vi.mocked(authApi.completeSignup).mock.calls[0][1]!
  view.unmount()
  expect(signal.aborted).toBe(true)
  complete({} as never); await Promise.resolve()
  expect(router.replace).not.toHaveBeenCalled()
})
