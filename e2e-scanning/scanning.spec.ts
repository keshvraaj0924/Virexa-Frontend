import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const origin = 'http://127.0.0.1:3000'

test('actual worker and PostgreSQL expose read-only scan verdicts with a synthetic protocol fixture', async ({ page, browser }) => {
  const password = 'Synthetic-scanning-test-927!'
  const email = `scan-${Date.now()}@example.com`
  expect((await page.request.post('/api/v1/auth/register', { headers: { Origin: origin }, data: { displayName: 'Synthetic Scan Owner', email, password, organizationName: 'Synthetic Scan Workspace' } })).status()).toBe(201)
  await page.goto('/app/documents')
  await expect(page.getByText('Configured malware scanning is one security layer', { exact: false })).toBeVisible()
  let writes = 0
  page.on('request', request => {
    if (request.url().includes('/api/v1/documents') && ['POST', 'PUT'].includes(request.method())) writes++
  })
  for (const verdict of ['clean', 'rejected', 'error'] as const) {
    const name = `synthetic-${verdict}.pdf`
    await page.getByLabel('Choose a document').setInputFiles({ name, mimeType: 'application/pdf', buffer: Buffer.from(`%PDF-1.7\n% Synthetic ${verdict} protocol fixture only\n%%EOF\n`) })
    if (verdict !== 'error') {
      // Lose a genuine completion response, then let the actual worker finish
      // before the user retries. Recovery must issue reads only.
      await page.route('**/api/v1/documents/*/uploads/*/complete', async route => {
        expect((await route.fetch()).status()).toBe(200)
        await route.abort('failed')
      }, { times: 1 })
    }
    await page.getByRole('button', { name: 'Upload to quarantine' }).click()
    const uploadRegion = page.getByRole('region', { name: 'Upload a document' })
    if (verdict === 'error') await expect(uploadRegion.getByRole('status')).toContainText('Pending scan')
    else await expect(uploadRegion.getByRole('alert')).toContainText('could not be confirmed')
    const row = page.getByRole('listitem').filter({ has: page.getByText(name, { exact: true }) })
    await expect(row).toContainText('Pending scan · private quarantine')
    execFileSync('python', [resolve('e2e-scanning/run-fixture-worker.py'), verdict], { cwd: resolve('.auth-backend'), env: { ...process.env, PYTHONPATH: resolve('.auth-backend') }, timeout: 30000, stdio: 'pipe' })
    if (verdict !== 'error') {
      const writesBeforeRetry = writes
      await page.getByRole('button', { name: 'Retry upload' }).click()
      await expect(uploadRegion.getByRole('status')).toContainText(verdict === 'clean' ? 'Scan passed' : 'Scan rejected')
      expect(writes).toBe(writesBeforeRetry)
    }
    await page.getByRole('button', { name: 'Refresh records' }).click()
    await expect(row).toContainText(verdict === 'clean' ? 'Scan passed' : verdict === 'rejected' ? 'Scan rejected' : 'Pending scan')
    const records = (await (await page.request.get('/api/v1/documents?limit=50')).json()).data.items
    const record = records.find((item: { originalFileName: string }) => item.originalFileName === name)
    expect(record.scanStatus).toBe(verdict === 'error' ? 'pending_scan' : verdict)
    expect(record.status).toBe('received')
    expect(JSON.stringify(record)).not.toMatch(/SyntheticFixture|storageKey|quarantinePath|lease_token/)
    expect((await page.request.get(`/api/v1/documents/${record.id}/download`)).status()).toBe(404)
    expect((await page.request.get(`/api/v1/documents/${record.id}/extractions`)).status()).toBe(404)
    const other = await browser.newContext({ baseURL: origin })
    expect((await other.request.post('/api/v1/auth/register', { headers: { Origin: origin }, data: { displayName: 'Other Owner', email: `${verdict}-${email}`, password, organizationName: 'Other Synthetic Workspace' } })).status()).toBe(201)
    expect((await other.request.get(`/api/v1/documents/${record.id}`)).status()).toBe(404)
    await other.close()
  }
  await page.reload()
  await expect(page.getByText('Scan passed · private quarantine', { exact: false })).toBeVisible()
  await expect(page.getByText('Scan rejected · private quarantine', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: /download|extract|mark clean|scan now/i })).toHaveCount(0)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: 'test-results/synthetic-scan-status-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/synthetic-scan-status-mobile.png', fullPage: true })
  await page.goto('/app/audit')
  await expect(page.getByText('Audit trail unavailable', { exact: true })).toHaveCount(0)
  for (const action of ['document.scan.clean', 'document.scan.rejected', 'document.scan.error']) {
    await expect(page.getByRole('cell', { name: action, exact: true })).toBeVisible()
  }
  await expect(page.getByText('SyntheticFixture', { exact: false })).toHaveCount(0)
  await page.goBack()
  await expect(page.getByText('Scan passed · private quarantine', { exact: false })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('cell', { name: 'document.scan.error', exact: true })).toBeVisible()
})
