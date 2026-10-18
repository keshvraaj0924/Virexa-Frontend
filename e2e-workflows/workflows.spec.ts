import { test, expect, type APIRequestContext } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
const origin = 'http://127.0.0.1:3000'
const password = 'Synthetic-workflow-only-927!'
async function register(request: APIRequestContext, email: string) {
  expect((await request.post('/api/v1/auth/register', { headers: { Origin: origin }, data: { displayName: 'Synthetic Process Owner', email, password, organizationName: 'Synthetic Workflow Workspace' } })).status()).toBe(201)
}
function role(email: string, value: string) { execFileSync('python', [path.resolve('e2e-workflows/seed.py'), email, value], { cwd: path.resolve('.auth-backend'), stdio: 'pipe' }) }

test('real definition creation, detail, version conflict, retained archive and tenant isolation', async ({ page, browser }) => {
  const email = `workflow-owner-${Date.now()}@example.com`
  await register(page.request, email)
  await page.goto('/app/workflows')
  await expect(page.getByRole('heading', { name: 'Workflow definitions' })).toBeVisible()
  await page.getByLabel('Name', { exact: true }).fill('Synthetic invoice review')
  await page.getByLabel('Description', { exact: true }).fill('Definition only. Human approval is required before any implementation.')
  await page.getByRole('button', { name: 'Create record', exact: true }).dblclick()
  await expect(page.locator('.workflow-card')).toHaveCount(1)
  const record = (await (await page.request.get('/api/v1/workflows')).json()).data.items[0]
  expect(record.version).toBe(1); expect(record.status).toBe('draft')
  await page.getByRole('button', { name: 'View record' }).click()
  await page.getByLabel('Record name', { exact: true }).fill('Cancelled change')
  await page.getByRole('button', { name: 'Close editor' }).click()
  expect((await (await page.request.get(`/api/v1/workflows/${record.id}`)).json()).data.name).toBe('Synthetic invoice review')
  await page.getByRole('button', { name: 'View record' }).click()
  await expect(page.getByLabel('Record name', { exact: true })).toHaveValue('Synthetic invoice review')
  expect((await page.request.patch(`/api/v1/workflows/${record.id}`, { headers: { Origin: origin }, data: { expectedVersion: 1, description: 'Updated in another session' } })).status()).toBe(200)
  await page.getByRole('button', { name: 'Save record' }).click()
  await expect(page.getByRole('alert')).toContainText('This record changed')
  await page.getByRole('button', { name: 'Close editor' }).click()
  await page.getByRole('button', { name: 'View record' }).click()
  await expect(page.getByLabel('Record description')).toHaveValue('Updated in another session')
  await page.getByLabel('Recorded status').selectOption('active')
  await page.getByRole('button', { name: 'Save record' }).click()
  await expect(page.locator('.workflow-status')).toHaveText('active')
  await expect(page.getByRole('status')).toContainText('no actions were executed')
  await page.getByRole('button', { name: 'View record' }).click()
  await page.getByLabel('Recorded status').selectOption('archived')
  await page.getByRole('button', { name: 'Save record' }).click()
  await expect(page.locator('.workflow-status')).toHaveText('archived')
  const outsider = await browser.newContext({ baseURL: origin })
  await register(outsider.request, `workflow-outsider-${Date.now()}@example.com`)
  expect((await outsider.request.get(`/api/v1/workflows/${record.id}`)).status()).toBe(404)
  expect((await outsider.request.patch(`/api/v1/workflows/${record.id}`, { headers: { Origin: origin }, data: { expectedVersion: 4, name: 'Cross tenant' } })).status()).toBe(404)
  expect((await (await outsider.request.get(`/api/v1/workflows?organizationId=${record.organizationId}`)).json()).data.items).toEqual([])
  expect((await page.request.delete(`/api/v1/workflows/${record.id}`, { headers: { Origin: origin } })).status()).toBe(404)
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.screenshot({ path: 'test-results/workflow-records-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/workflow-records-mobile.png', fullPage: true })
  const audit = (await (await page.request.get('/api/v1/audit/events?limit=100')).json()).data
  expect(audit.coverage.actions).toEqual(expect.arrayContaining(['workflow.created', 'workflow.updated']))
  expect(audit.events.filter((event: { resourceId: string }) => event.resourceId === record.id).map((event: { action: string }) => event.action)).toEqual(expect.arrayContaining(['workflow.created', 'workflow.updated']))
  await page.goto('/app/audit')
  await page.getByLabel('Action', { exact: true }).selectOption('workflow.created')
  await expect(page.locator('.audit-table tbody tr')).toHaveCount(1)
  await outsider.close()
})

test('uncertain create retries reuse the same key, status pagination, stale rights and recovery', async ({ page }) => {
  const email = `workflow-retry-${Date.now()}@example.com`; await register(page.request, email)
  await page.goto('/app/workflows')
  let interrupted = false
  const keys: string[] = []
  await page.route('**/api/v1/workflows', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    keys.push(route.request().headers()['idempotency-key'])
    if (!interrupted) { interrupted = true; await route.fetch(); return route.abort('failed') }
    return route.continue()
  })
  await page.getByLabel('Name', { exact: true }).fill('Retry without duplicates')
  await page.getByRole('button', { name: 'Create record', exact: true }).click()
  await page.getByRole('button', { name: 'Retry same creation' }).click()
  await expect(page.locator('.workflow-card')).toHaveCount(1)
  expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1])
  await page.unroute('**/api/v1/workflows')
  for (let index = 0; index < 25; index++) expect((await page.request.post('/api/v1/workflows', { headers: { Origin: origin, 'Idempotency-Key': crypto.randomUUID() }, data: { name: `Synthetic pagination ${index}` } })).status()).toBe(201)
  await page.getByRole('button', { name: 'Refresh records' }).click(); await expect(page.locator('.workflow-card')).toHaveCount(24)
  await page.getByRole('button', { name: 'Load more records' }).click(); await expect(page.locator('.workflow-card')).toHaveCount(26)
  await page.getByLabel('Filter workflow status').selectOption('active'); await expect(page.getByText('No matching workflow records.')).toBeVisible()
  await page.getByLabel('Filter workflow status').selectOption(''); await expect(page.locator('.workflow-card')).toHaveCount(24)
  role(email, 'viewer')
  await page.getByLabel('Name', { exact: true }).fill('Denied after downgrade')
  await page.getByRole('button', { name: 'Create record', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Create record', exact: true })).toHaveCount(0)
  await page.reload(); await expect(page.locator('.workflow-card')).toHaveCount(24)
  await page.getByRole('button', { name: 'View record' }).first().click()
  await expect(page.getByText('Read-only. You cannot update this record.')).toBeVisible()
  await page.getByRole('button', { name: 'Close editor' }).click()
  await page.route('**/api/v1/workflows?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
  await page.getByRole('button', { name: 'Refresh records' }).click(); await expect(page.getByRole('alert')).toContainText('could not be loaded')
  await expect(page.locator('.workflow-card')).toHaveCount(0)
  await page.unroute('**/api/v1/workflows?*'); await page.getByRole('button', { name: 'Refresh records' }).click(); await expect(page.locator('.workflow-card')).toHaveCount(24)
})

test('UI limits match the pinned backend create and versioned update boundaries', async ({ page }) => {
  await register(page.request, `workflow-contract-${Date.now()}@example.com`)
  await page.goto('/app/workflows')
  await expect(page.getByLabel('Name', { exact: true })).toHaveAttribute('maxlength', '120')
  await expect(page.getByLabel('Description', { exact: true })).toHaveAttribute('maxlength', '1000')
  for (const data of [{ name: 'n'.repeat(121) }, { name: 'Valid', description: 'd'.repeat(1001) }]) {
    expect((await page.request.post('/api/v1/workflows', { headers: { Origin: origin, 'Idempotency-Key': crypto.randomUUID() }, data })).status()).toBe(400)
  }
  const result = await page.request.post('/api/v1/workflows', { headers: { Origin: origin, 'Idempotency-Key': crypto.randomUUID() }, data: { name: 'n'.repeat(120), description: 'd'.repeat(1000) } })
  expect(result.status()).toBe(201)
  const record = (await result.json()).data
  expect(record).toMatchObject({ name: 'n'.repeat(120), description: 'd'.repeat(1000), status: 'draft', version: 1 })
  for (const data of [{ expectedVersion: 0, name: 'Valid' }, { expectedVersion: 1, status: 'executing' }, { expectedVersion: 1, name: 'n'.repeat(121) }, { expectedVersion: 1, description: 'd'.repeat(1001) }]) {
    expect((await page.request.patch(`/api/v1/workflows/${record.id}`, { headers: { Origin: origin }, data })).status()).toBe(400)
  }
  await page.getByRole('button', { name: 'Refresh records' }).click()
  await page.getByRole('button', { name: 'View record' }).click()
  await expect(page.getByLabel('Record name')).toHaveAttribute('maxlength', '120')
  await expect(page.getByLabel('Record description')).toHaveAttribute('maxlength', '1000')
})
