import { test, expect, type APIRequestContext } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
const origin = 'http://127.0.0.1:3000'
const password = 'Synthetic-audit-only-927!'
async function register(request: APIRequestContext, email: string) {
  expect((await request.post('/api/v1/auth/register', { headers: { Origin: origin }, data: { displayName: 'Synthetic Audit Reviewer', email, password, organizationName: 'Synthetic Audit Workspace' } })).status()).toBe(201)
}
function seed(email: string, action: string) { execFileSync('python', [path.resolve('e2e-audit/seed.py'), email, action], { cwd: path.resolve('.auth-backend'), stdio: 'pipe' }) }

test('real auth, intake and session events stay tenant-scoped; authorized auditor can read, viewer cannot', async ({ page, browser }) => {
  const email = `audit-owner-${Date.now()}@example.com`
  await register(page.request, email)
  const second = await browser.newContext({ baseURL: origin })
  expect((await second.request.post('/api/v1/auth/login', { headers: { Origin: origin }, data: { email, password } })).status()).toBe(200)
  const sessions = (await (await page.request.get('/api/v1/auth/sessions?limit=100')).json()).data
  const otherSession = sessions.find((s: { current: boolean }) => !s.current)
  expect((await page.request.delete(`/api/v1/auth/sessions/${otherSession.id}`, { headers: { Origin: origin } })).status()).toBe(200)
  await page.goto('/app/documents')
  await page.getByLabel('Choose a document').setInputFiles({ name: 'synthetic-private.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n% SYNTHETIC_PRIVATE_PAYLOAD\n%%EOF') })
  await page.getByRole('button', { name: 'Upload to quarantine' }).click()
  await expect(page.getByRole('region', { name: 'Upload a document' }).getByRole('status')).toContainText('Received in private quarantine')
  const response = await page.request.get('/api/v1/audit/events?limit=100')
  expect(response.status()).toBe(200); expect(response.headers()['cache-control']).toContain('no-store')
  const own = (await response.json()).data
  expect(own.events.map((e: { action: string }) => e.action)).toEqual(expect.arrayContaining(['auth.login', 'auth.session.revoked', 'document.created', 'document.intake.completed']))
  for (const event of own.events) expect(Object.keys(event.metadata)).toEqual(['outcome'])
  expect(JSON.stringify(own)).not.toMatch(/SYNTHETIC_PRIVATE_PAYLOAD|synthetic-private.pdf|Synthetic-audit-only|@example.com/)
  const outsider = await browser.newContext({ baseURL: origin })
  await register(outsider.request, `audit-outsider-${Date.now()}@example.com`)
  const other = (await (await outsider.request.get('/api/v1/audit/events?limit=100')).json()).data
  for (const event of other.events) expect(own.events.some((e: { id: string }) => e.id === event.id)).toBe(false)
  const firstPage = (await (await page.request.get('/api/v1/audit/events?limit=1')).json()).data
  expect(firstPage.nextCursor).toBeTruthy()
  expect((await outsider.request.get(`/api/v1/audit/events?cursor=${encodeURIComponent(firstPage.nextCursor)}`)).status()).toBe(400)
  const injection = (await (await outsider.request.get(`/api/v1/audit/events?organizationId=${own.events[0].organizationId}`)).json()).data
  for (const event of injection.events) expect(event.organizationId).not.toBe(own.events[0].organizationId)
  await page.goto('/app/audit'); await expect(page.getByRole('heading', { name: 'Recent activity' })).toBeVisible()
  await expect(page.getByLabel('Recording coverage')).toContainText('Earlier activity')
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.screenshot({ path: 'test-results/audit-real-events-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/audit-real-events-mobile.png', fullPage: true })
  seed(email, 'auditor'); await page.reload()
  await expect(page.getByRole('heading', { name: 'Recent activity' })).toBeVisible()
  expect((await page.request.get('/api/v1/audit/events')).status()).toBe(200)
  seed(email, 'viewer'); await page.getByRole('button', { name: 'Refresh audit events' }).click()
  await expect(page.getByRole('heading', { name: 'Audit events are restricted' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Audit Log' })).toHaveCount(0)
  expect((await page.request.get('/api/v1/audit/events')).status()).toBe(403)
  await page.reload(); await expect(page).toHaveURL(`${origin}/app/access`)
  await second.close(); await outsider.close()
})

test('bounded pagination, filter reset, empty results and recoverable outage', async ({ page }) => {
  const email = `audit-paging-${Date.now()}@example.com`; await register(page.request, email)
  seed(email, 'paginate') // Explicit synthetic history only for pagination; real records covered above.
  await page.goto('/app/audit'); await expect(page.locator('.vx-audit tbody tr')).toHaveCount(50)
  await page.getByRole('button', { name: 'Older events' }).click(); await expect(page.getByText(/events on page 2/)).toBeVisible()
  await page.getByRole('button', { name: 'Newer events' }).click(); await expect(page.locator('.vx-audit tbody tr')).toHaveCount(50)
  await page.getByLabel('Outcome', { exact: true }).selectOption('failed'); await expect(page.getByText('No matching recorded events')).toBeVisible()
  await page.getByLabel('Outcome', { exact: true }).selectOption(''); await expect(page.locator('.vx-audit tbody tr')).toHaveCount(50)
  await page.getByLabel('Action', { exact: true }).selectOption('auth.login'); await expect(page.locator('.vx-audit tbody tr')).toHaveCount(50)
  await page.route('**/api/v1/audit/events?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
  await page.getByRole('button', { name: 'Refresh audit events' }).click(); await expect(page.getByText('Audit trail unavailable')).toBeVisible()
  await expect(page.locator('.vx-audit tbody tr')).toHaveCount(0)
  await page.unroute('**/api/v1/audit/events?*'); await page.getByRole('button', { name: 'Refresh audit events' }).click()
  await expect(page.locator('.vx-audit tbody tr')).toHaveCount(50)
})
