import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
const origin = 'http://127.0.0.1:3000'
function setRole(email: string, role: 'viewer' | 'auditor' | 'operator') {
  execFileSync('python', [path.resolve('e2e-sessions/seed.py'), email, role], { cwd: path.resolve('.auth-backend'), stdio: 'pipe' })
}

test('current backend role controls UI, rejects stale writes, and keeps auditor session-only', async ({ page }) => {
  const email = `sessions-access-${Date.now()}@example.com`
  expect((await page.request.post('/api/v1/auth/register', { headers: { Origin: origin }, data: { displayName: 'Synthetic Access Reviewer', email, password: 'Synthetic-access-only-927!', organizationName: 'Synthetic Policy Review' } })).status()).toBe(201)
  await page.goto('/app/documents')
  await page.getByLabel('Choose a document').setInputFiles({ name: 'synthetic-policy.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n% synthetic policy fixture only\n%%EOF') })
  await expect(page.getByRole('button', { name: 'Upload to quarantine' })).toBeEnabled()
  // Change the trusted DB role after the page has loaded. Stale UI must not authorize a write.
  setRole(email, 'viewer')
  const denied = page.waitForResponse(response => response.url().endsWith('/api/v1/documents') && response.request().method() === 'POST' && response.status() === 403)
  await page.getByRole('button', { name: 'Upload to quarantine' }).click()
  await denied
  await expect(page.getByRole('heading', { name: 'Read-only document access' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Upload to quarantine' })).toHaveCount(0)
  const permissions = await page.request.get('/api/v1/me/permissions')
  expect(permissions.headers()['cache-control']).toContain('no-store')
  expect((await permissions.json()).data.capabilities).not.toContain('document:create')
  await expect(page.getByText('No documents received yet.')).toBeVisible()
  await page.getByRole('link', { name: 'Your access', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your effective permissions' })).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: 'test-results/access-viewer-synthetic-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/access-viewer-synthetic-mobile.png', fullPage: true })

  setRole(email, 'auditor')
  await page.goto('/app/documents')
  await expect(page.getByRole('heading', { name: 'Document records are restricted' })).toBeVisible()
  expect((await page.request.get('/api/v1/documents')).status()).toBe(403)
  await expect(page.getByRole('link', { name: 'Documents', exact: true })).toHaveCount(0)
  await page.goto('/app/settings/security')
  await expect(page.getByText('Current session', { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('link', { name: 'Your access', exact: true }).click()
  await expect(page.locator('article').filter({ has: page.getByRole('heading', { name: 'Read audit events', exact: true }) })).toContainText('Allowed')
  await expect(page.locator('article').filter({ has: page.getByRole('heading', { name: 'View documents', exact: true }) })).toContainText('Restricted')

  // A later role change is reflected without a fresh login.
  setRole(email, 'operator')
  await page.getByRole('button', { name: 'Refresh permissions', exact: true }).click()
  await expect(page.locator('article').filter({ has: page.getByRole('heading', { name: 'Upload document files', exact: true }) })).toContainText('Allowed')
  await expect(page.locator('article').filter({ has: page.getByRole('heading', { name: 'Read audit events', exact: true }) })).toContainText('Restricted')
  await page.getByRole('link', { name: 'Documents', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Upload to quarantine' })).toBeVisible()
})

test('permissions outage fails closed and recovers without offering fake administration', async ({ page }) => {
  const email = `sessions-access-outage-${Date.now()}@example.com`
  expect((await page.request.post('/api/v1/auth/register', { headers: { Origin: origin }, data: { displayName: 'Synthetic Access Outage', email, password: 'Synthetic-access-only-927!', organizationName: 'Synthetic Policy Review' } })).status()).toBe(201)
  await page.route('**/api/v1/me/permissions', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
  await page.goto('/app/access')
  await expect(page.getByRole('heading', { name: 'Access could not be verified' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Documents', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Users & Access', exact: true })).toHaveCount(0)
  await page.unroute('**/api/v1/me/permissions')
  await page.getByRole('button', { name: 'Check access again' }).click()
  for (const name of ['Read audit events', 'View documents', 'Upload document files', 'Review your sessions', 'Revoke your sessions', 'Read organization details', 'Review your usage', 'Review organization usage', 'Create intake records']) {
    await expect(page.locator('article').filter({ has: page.getByRole('heading', { name, exact: true }) })).toContainText('Allowed')
  }
})
