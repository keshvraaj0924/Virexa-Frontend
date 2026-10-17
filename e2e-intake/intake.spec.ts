import { test, expect } from '@playwright/test'
const origin = 'http://127.0.0.1:3000'
const password = 'Synthetic-intake-test-927!'
const pdf = Buffer.from('%PDF-1.7\n% Synthetic non-sensitive test fixture\n1 0 obj <<>> endobj\n%%EOF\n')
const fixture = { name: 'synthetic-invoice.pdf', mimeType: 'application/pdf', buffer: pdf }

test('real bytes reach quarantine with safe repeated, interrupted, retry and tenant flows', async ({ page, browser }) => {
  const email = `intake-${Date.now()}@example.com`
  expect((await page.request.post('/api/v1/auth/register', { headers: { Origin: origin }, data: { displayName: 'Intake Owner', email, password, organizationName: 'Synthetic Intake' } })).status()).toBe(201)
  await page.goto('/app')
  await page.getByRole('link', { name: 'Documents', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Private document intake' })).toBeVisible()
  for (const name of ['Workflows', 'Users & Access', 'Audit Log', 'Security']) await expect(page.getByRole('link', { name, exact: true })).toHaveCount(0)
  await page.getByLabel('Choose a document').setInputFiles({ name: 'unsupported.txt', mimeType: 'text/plain', buffer: Buffer.from('synthetic') })
  await expect(page.getByRole('region', { name: 'Upload a document' }).getByRole('alert')).toContainText('PDF, PNG or JPEG')
  await expect(page.getByRole('button', { name: 'Upload to quarantine' })).toBeDisabled()
  await page.getByLabel('Choose a document').setInputFiles(fixture)
  let creations = 0
  page.on('request', request => { if (request.url().endsWith('/api/v1/documents') && request.method() === 'POST') creations++ })
  await page.getByRole('button', { name: 'Upload to quarantine' }).evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
  await expect(page.getByRole('region', { name: 'Upload a document' }).getByRole('status')).toContainText('Received in private quarantine. Pending scan.')
  expect(creations).toBe(1)
  const list = await page.request.get('/api/v1/documents?limit=50')
  expect(list.status()).toBe(200)
  const record = (await list.json()).data.items[0]
  expect(record.originalFileName).toBe(fixture.name)
  expect(record.sizeBytes).toBe(pdf.length)
  expect(record.scanStatus).toBe('pending_scan')
  expect(record.status).toBe('received')
  expect(JSON.stringify(record)).not.toMatch(/storageKey|quarantinePath|bucket/)
  await expect(page.getByText('Pending scan · private quarantine', { exact: false })).toBeVisible()
  expect((await page.request.get(`/api/v1/documents/${record.id}/download`)).status()).toBe(404)
  expect((await page.request.get(`/api/v1/documents/${record.id}/extractions`)).status()).toBe(404)
  expect((await page.request.get('/api/v1/workflows')).status()).toBe(404)
  await page.reload()
  await expect(page.getByText(fixture.name, { exact: true })).toBeVisible()

  const other = await browser.newContext({ baseURL: origin })
  expect((await other.request.post('/api/v1/auth/register', { headers: { Origin: origin }, data: { displayName: 'Other Owner', email: `other-${email}`, password, organizationName: 'Other Synthetic' } })).status()).toBe(201)
  expect((await other.request.get(`/api/v1/documents/${record.id}`)).status()).toBe(404)
  expect((await other.request.post(`/api/v1/documents/${record.id}/uploads`, { headers: { Origin: origin, 'Idempotency-Key': 'other-tenant-test-key' }, data: {} })).status()).toBe(404)
  const otherList = (await (await other.request.get('/api/v1/documents?limit=50')).json()).data.items
  expect(otherList).toEqual([])
  await other.close()
  expect((await page.request.post('/api/v1/documents', { data: {} })).status()).toBe(403)
  expect((await page.request.post('/api/v1/documents', { headers: { Origin: 'https://evil.example', 'X-Forwarded-Host': '127.0.0.1:3000' }, data: {} })).status()).toBe(403)

  // Cancel before forwarding content, then retry the same document and attempt.
  let release!: () => void
  let started!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  const intercepted = new Promise<void>(resolve => { started = resolve })
  await page.route('**/api/v1/documents/*/uploads/*/content', async route => { started(); await held; await route.continue().catch(() => {}) }, { times: 1 })
  await page.getByLabel('Choose a document').setInputFiles({ ...fixture, name: 'cancel-retry.pdf' })
  await page.getByRole('button', { name: 'Upload to quarantine' }).click()
  await intercepted
  await page.getByRole('button', { name: 'Cancel upload' }).click()
  release()
  await expect(page.getByRole('region', { name: 'Upload a document' }).getByRole('alert')).toContainText('Upload stopped')
  const beforeRetry = creations
  await page.getByRole('button', { name: 'Retry upload' }).click()
  await expect(page.getByRole('region', { name: 'Upload a document' }).getByRole('status')).toContainText('Received in private quarantine. Pending scan.')
  expect(creations).toBe(beforeRetry)
  await expect(page.getByText('cancel-retry.pdf', { exact: true })).toBeVisible()

  // Complete genuinely on the backend but lose the response. Retry reads pending_scan.
  await page.route('**/api/v1/documents/*/uploads/*/complete', async route => {
    const response = await route.fetch()
    expect(response.status()).toBe(200)
    await route.abort('failed')
  }, { times: 1 })
  await page.getByLabel('Choose a document').setInputFiles({ ...fixture, name: 'lost-confirmation.pdf' })
  await page.getByRole('button', { name: 'Upload to quarantine' }).click()
  await expect(page.getByRole('region', { name: 'Upload a document' }).getByRole('alert')).toContainText('could not be confirmed')
  const beforeRecovery = creations
  await page.getByRole('button', { name: 'Retry upload' }).click()
  await expect(page.getByRole('region', { name: 'Upload a document' }).getByRole('status')).toContainText('Received in private quarantine. Pending scan.')
  expect(creations).toBe(beforeRecovery)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: 'test-results/intake-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/intake-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/app/workflows')
  await expect(page).toHaveURL(`${origin}/app`)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect((await page.request.get('/api/v1/documents')).status()).toBe(401)
  await page.goto('/app/documents')
  await expect(page).toHaveURL(/\/login$/)
})
