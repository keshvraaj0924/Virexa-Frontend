import { test, expect, type APIRequestContext } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
const origin = 'http://127.0.0.1:3000'
const password = 'Synthetic-session-test-927!'
async function register(request: APIRequestContext, email: string) {
  expect((await request.post('/api/v1/auth/register', { headers: { Origin: origin }, data: { displayName: 'Session Owner', email, password, organizationName: 'Synthetic Sessions' } })).status()).toBe(201)
}
function seed(email: string, action: 'paginate' | 'expire') {
  execFileSync('python', [path.resolve('e2e-sessions/seed.py'), email, action], { cwd: path.resolve('.auth-backend'), stdio: 'pipe' })
}

test('real paginated sessions, owner scope, repeat actions, revoke others and current logout', async ({ page, browser }) => {
  const email = `sessions-${Date.now()}@example.com`
  await register(page.request, email)
  const second = await browser.newContext({ baseURL: origin })
  expect((await second.request.post('/api/v1/auth/login', { headers: { Origin: origin }, data: { email, password } })).status()).toBe(200)
  const secondPage = await second.newPage()
  await secondPage.goto('/app/settings/security')
  await expect(secondPage.getByText('Current session', { exact: true })).toBeVisible()
  seed(email, 'paginate')
  const inventory = await page.request.get('/api/v1/auth/sessions?limit=100')
  expect(inventory.status()).toBe(200)
  const rows = (await inventory.json()).data
  expect(rows).toHaveLength(24)
  for (const row of rows) expect(Object.keys(row).sort()).toEqual(['createdAt', 'current', 'expiresAt', 'id'])
  const other = await browser.newContext({ baseURL: origin })
  await register(other.request, `sessions-other-${Date.now()}@example.com`)
  expect((await other.request.delete(`/api/v1/auth/sessions/${rows[0].id}`, { headers: { Origin: origin } })).status()).toBe(404)
  expect((await page.request.delete(`/api/v1/auth/sessions/${rows[0].id}`)).status()).toBe(403)
  expect((await page.request.post('/api/v1/auth/sessions/revoke-others', { headers: { Origin: 'https://evil.example', 'X-Forwarded-Host': '127.0.0.1:3000' } })).status()).toBe(403)
  expect((await page.request.get('/api/v1/auth/mfa')).status()).toBe(404)
  await other.close()

  await page.goto('/app')
  await page.getByRole('link', { name: 'Security', exact: true }).click()
  await expect(page.getByText('20 active sessions shown. More sessions are available.')).toBeVisible()
  await page.getByRole('button', { name: 'Load more sessions' }).click()
  await expect(page.getByText('24 active sessions shown.')).toBeVisible()
  await expect(page.getByText('Current session', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Load more sessions' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Refresh sessions' }).click()
  await expect(page.getByText('20 active sessions shown. More sessions are available.')).toBeVisible()
  // Revoke all pages from an incomplete view; same-tick clicks send just one mutation.
  let revocations = 0
  page.on('request', request => { if (request.url().endsWith('/auth/sessions/revoke-others') && request.method() === 'POST') revocations++ })
  await page.getByRole('button', { name: 'Sign out other sessions' }).evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
  await expect(page.getByText('23 other sessions were revoked.')).toBeVisible()
  expect(revocations).toBe(1)
  await expect(page.getByText('1 active session shown.')).toBeVisible()
  expect((await (await page.request.post('/api/v1/auth/sessions/revoke-others', { headers: { Origin: origin } })).json()).data.revokedCount).toBe(0)
  expect((await second.request.get('/api/v1/auth/session')).status()).toBe(401)
  await secondPage.getByRole('button', { name: 'Refresh sessions' }).click()
  await expect(secondPage).toHaveURL(`${origin}/login`)
  await second.close()

  // New login after revocation is a new active session, then targeted revocation removes it.
  const third = await browser.newContext({ baseURL: origin })
  expect((await third.request.post('/api/v1/auth/login', { headers: { Origin: origin }, data: { email, password } })).status()).toBe(200)
  await page.getByRole('button', { name: 'Refresh sessions' }).click()
  await expect(page.getByText('2 active sessions shown.')).toBeVisible()
  await page.getByRole('button', { name: 'Revoke this session' }).click()
  await expect(page.getByText('Session revoked.')).toBeVisible()
  expect((await third.request.get('/api/v1/auth/session')).status()).toBe(401)
  await third.close()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: 'test-results/sessions-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/sessions-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Sign out this session' }).click()
  await expect(page).toHaveURL(`${origin}/login`)
  expect((await page.context().cookies()).filter(cookie => cookie.name === 'virexa_session')).toHaveLength(0)
  expect((await page.request.get('/api/v1/auth/session')).status()).toBe(401)
  await page.goto('/app/settings/security')
  await expect(page).toHaveURL(`${origin}/login`)
})

test('expired inventory redirects cleanly to login', async ({ page }) => {
  const email = `sessions-expired-${Date.now()}@example.com`
  await register(page.request, email)
  await page.goto('/app/settings/security')
  await expect(page.getByText('Current session', { exact: true })).toBeVisible()
  seed(email, 'expire')
  await page.getByRole('button', { name: 'Refresh sessions' }).click()
  await expect(page).toHaveURL(`${origin}/login`)
  await page.goto('/app/settings/security')
  await expect(page).toHaveURL(`${origin}/login`)
})

test('a late unauthorized inventory response cannot undo newer navigation', async ({ page }) => {
  const email = `sessions-navigation-${Date.now()}@example.com`
  await register(page.request, email)
  await page.goto('/app/settings/security')
  await expect(page.getByText('Current session', { exact: true })).toBeVisible()
  let release!: () => void
  let intercepted = false
  const held = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/v1/auth/sessions?*', async route => {
    intercepted = true
    await held
    await route.continue().catch(() => {})
  }, { times: 1 })
  await page.getByRole('button', { name: 'Refresh sessions' }).click()
  await expect.poll(() => intercepted).toBe(true)
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(page).toHaveURL(`${origin}/app`)
  seed(email, 'expire')
  const response = page.waitForResponse(response => response.url().includes('/api/v1/auth/sessions?') && response.status() === 401)
  release()
  await (await response).finished()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  await expect(page).toHaveURL(`${origin}/app`)
  await page.goto('/app/settings/security')
  await expect(page).toHaveURL(`${origin}/login`)
})
