import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
const origin = 'http://127.0.0.1:3000'
function seed(email: string, action: string, ...args: string[]) {
  execFileSync('python', [path.resolve('e2e-usage/seed.py'), email, action, ...args], { cwd: path.resolve('.auth-backend'), stdio: 'pipe' })
}
async function register(context: BrowserContext, email: string, name: string) {
  expect((await context.request.post('/api/v1/auth/register', { headers: { Origin: origin }, data: { displayName: name, email, password: 'Synthetic-usage-only-927!', organizationName: `Synthetic ${name}` } })).status()).toBe(201)
}
async function upload(page: Page, name: string) {
  await page.goto('/app/documents')
  await page.getByLabel('Choose a document').setInputFiles({ name: `${name}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from(`%PDF-1.7\n% synthetic usage fixture ${name}\n%%EOF`) })
  await page.getByRole('button', { name: 'Upload to quarantine' }).click()
}
async function uploaded(page: Page) { await expect(page.getByRole('region', { name: 'Upload a document' }).getByRole('status')).toContainText('Received in private quarantine') }

test('real tenant-scoped metering, retry exactly once, entitlement, history and downgraded access', async ({ page, context, browser }) => {
  const email = `usage-owner-${Date.now()}@example.com`
  await register(context, email, 'Usage Owner')
  await upload(page, 'owner-first'); await uploaded(page)
  await page.route('**/api/v1/documents/*/uploads/*/complete', async route => { expect((await route.fetch()).status()).toBe(200); await route.abort('failed') }, { times: 1 })
  await upload(page, 'owner-retry')
  await expect(page.getByRole('region', { name: 'Upload a document' }).getByRole('alert')).toContainText('could not be confirmed')
  await page.getByRole('button', { name: 'Retry upload' }).click(); await uploaded(page)
  const own = (await (await page.request.get('/api/v1/usage/me')).json()).data
  expect(own.scope).toBe('user'); expect(own.meters.document_uploads.used).toBe(2)
  expect(own.meters.input_tokens.used).toBeNull(); expect(own.meters.ocr_pages.used).toBeNull(); expect(own.cost.amount).toBeNull()
  const member = await browser.newContext({ baseURL: origin })
  const memberEmail = `usage-member-${Date.now()}@example.com`
  await register(member, memberEmail, 'Usage Member'); seed(memberEmail, 'join', email)
  const memberPage = await member.newPage(); await upload(memberPage, 'member-only'); await uploaded(memberPage)
  const memberOwn = (await (await member.request.get('/api/v1/usage/me?userId=ignored&organizationId=ignored')).json()).data
  expect(memberOwn.meters.document_uploads.used).toBe(1)
  expect((await member.request.get('/api/v1/usage/organization')).status()).toBe(403)
  expect((await member.request.get('/api/v1/usage/organization/history')).status()).toBe(403)
  await memberPage.goto('/app/usage'); await expect(memberPage.getByRole('button', { name: 'Organization usage' })).toHaveCount(0)
  const outsider = await browser.newContext({ baseURL: origin }); await register(outsider, `usage-outsider-${Date.now()}@example.com`, 'Outside Tenant')
  const outsidePage = await outsider.newPage(); await upload(outsidePage, 'outside-only'); await uploaded(outsidePage)
  const org = (await (await page.request.get('/api/v1/usage/organization')).json()).data
  expect(org.meters.document_uploads.used).toBe(3)
  expect(org.subscription.scope).toBe('organization'); expect(org.subscription.limits.document_uploads.remaining).toBe(997)
  const outsideOrg = (await (await outsider.request.get(`/api/v1/usage/organization?organizationId=${org.organizationId}`)).json()).data
  expect(outsideOrg.meters.document_uploads.used).toBe(1); expect(outsideOrg.organizationId).not.toBe(org.organizationId)
  await page.goto('/app/usage'); await expect(page.getByRole('heading', { name: 'Your activity', exact: true })).toBeVisible()
  await expect(page.getByRole('article', { name: 'Document uploads' })).toContainText('2')
  await expect(page.getByText('Payments are not configured.', { exact: false })).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 1100 }); await page.screenshot({ path: 'test-results/usage-personal-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'Organization usage' }).click()
  await expect(page.getByRole('article', { name: 'Document uploads' })).toContainText('3')
  await expect(page.getByRole('heading', { name: 'People & operations' })).toBeVisible()
  await page.screenshot({ path: 'test-results/usage-organization-desktop.png', fullPage: true })
  await page.getByRole('button', { name: new RegExp(`Account ${memberOwn.userId}`) }).click()
  await expect(page.locator('.vx-usage-history li')).toHaveCount(1)
  await expect(page.locator('.vx-usage-history')).toContainText(memberOwn.userId)
  await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/usage-organization-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'My usage', exact: true }).click()
  await expect(page.locator('.vx-usage-history li')).toHaveCount(2)
  await page.screenshot({ path: 'test-results/usage-personal-mobile.png', fullPage: true })
  // Synthetic failure events exercise pagination only, never presented as production usage.
  seed(email, 'history'); await page.getByRole('button', { name: 'Refresh usage' }).click()
  await expect(page.locator('.vx-usage-history li')).toHaveCount(25)
  await page.getByRole('button', { name: 'Older events' }).click(); await expect(page.locator('.vx-usage-history li')).toHaveCount(7)
  await page.getByRole('button', { name: 'Newer events' }).click(); await expect(page.locator('.vx-usage-history li')).toHaveCount(25)
  await page.getByLabel('Status', { exact: true }).selectOption('failed'); await expect(page.locator('.vx-usage-history li')).toHaveCount(25)
  await expect(page.locator('.vx-usage-history li').first()).toContainText('SYNTHETIC_TEST_FAILURE')
  await page.getByRole('button', { name: 'Organization usage' }).click(); await expect(page.getByRole('heading', { name: 'People & operations' })).toBeVisible()
  seed(email, 'viewer'); await page.getByRole('button', { name: 'Refresh usage' }).click()
  await expect(page.getByRole('button', { name: 'Organization usage' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Your activity', exact: true })).toBeVisible()
  expect((await page.request.get('/api/v1/usage/organization')).status()).toBe(403)
  await member.close(); await outsider.close()
})

test('usage outage never manufactures totals and explicit refresh recovers', async ({ page, context }) => {
  await register(context, `usage-outage-${Date.now()}@example.com`, 'Usage Outage')
  await page.route('**/api/v1/usage/me?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
  await page.goto('/app/usage'); await expect(page.getByRole('alert')).toContainText('No totals are shown')
  await expect(page.getByRole('article', { name: 'Document uploads' })).toHaveCount(0)
  await page.unroute('**/api/v1/usage/me?*'); await page.getByRole('button', { name: 'Refresh usage' }).click()
  await expect(page.getByRole('article', { name: 'Document uploads' })).toContainText('0')
  await expect(page.getByRole('article', { name: 'Input tokens' })).toContainText('Not available')
})
