import { test, expect, type APIRequestContext } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
const origin = 'http://127.0.0.1:3000'
const password = 'Synthetic-team-only-927!'
async function register(request: APIRequestContext, email: string) {
  expect((await request.post('/api/v1/auth/register', { headers: { Origin: origin }, data: { displayName: 'Synthetic Organization Admin', email, password, organizationName: 'Synthetic Meridian Team' } })).status()).toBe(201)
  return (await (await request.get('/api/v1/auth/session')).json()).data.user
}
function seed(email: string, action: string) { return execFileSync('python', [path.resolve('e2e-team/seed.py'), email, action], { cwd: path.resolve('.auth-backend'), encoding: 'utf8' }) }
test('real roster, confirmed role changes, pagination, version conflicts, audit and isolation', async ({ page, browser }) => {
  const email = `team-admin-${Date.now()}@example.com`; const owner = await register(page.request, email)
  const members = JSON.parse(seed(email, 'members')) as { id: string; name: string; email: string; role: string }[]
  await page.goto('/app/users'); await expect(page.getByRole('heading', { name: 'Organization members', exact: true })).toBeVisible()
  await expect(page.getByText('Organization workspace · Verified organization root')).toBeVisible(); await expect(page.locator('.team-table tbody tr')).toHaveCount(25); await page.getByRole('button', { name: 'Load more members' }).click(); await expect(page.locator('.team-table tbody tr')).toHaveCount(28)
  expect(await page.getByText('Own role protected').count()).toBe(1)
  const target = members[1]
  await page.getByRole('button', { name: `Review role for ${target.name}`, exact: true }).click()
  await page.getByLabel('New role').selectOption('manager'); await expect(page.getByRole('button', { name: 'Confirm role change' })).toBeDisabled()
  await page.getByRole('button', { name: 'Close review' }).click()
  expect((await (await page.request.get(`/api/v1/organization/members/${target.id}`)).json()).data.role).toBe('viewer')
  await page.getByRole('button', { name: `Review role for ${target.name}`, exact: true }).click(); await page.getByLabel('New role').selectOption('manager'); await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Confirm role change' }).dblclick(); await expect(page.getByRole('status')).toContainText('Role updated')
  let member = (await (await page.request.get(`/api/v1/organization/members/${target.id}`)).json()).data
  expect(member.role).toBe('manager'); expect(member.version).toBe(2)
  await page.getByRole('button', { name: `Review role for ${target.name}`, exact: true }).click(); await page.getByLabel('New role').selectOption('operator'); await page.getByRole('checkbox').check()
  expect((await page.request.patch(`/api/v1/organization/members/${target.id}/role`, { headers: { Origin: origin }, data: { role: 'auditor', expectedVersion: 2 } })).status()).toBe(200)
  await page.getByRole('button', { name: 'Confirm role change' }).click(); await expect(page.locator('.team-alert')).toContainText('This member changed'); await expect(page.getByRole('button', { name: 'Confirm role change' })).toBeDisabled(); await page.getByRole('button', { name: 'Close review' }).click()
  member = (await (await page.request.get(`/api/v1/organization/members/${target.id}`)).json()).data
  expect((await page.request.patch(`/api/v1/organization/members/${target.id}/role`, { headers: { Origin: origin }, data: { role: 'platform_admin', expectedVersion: member.version } })).status()).toBe(400)
  expect((await page.request.patch(`/api/v1/organization/members/${owner.id}/role`, { headers: { Origin: origin }, data: { role: 'viewer', expectedVersion: 1 } })).status()).toBe(403)
  const foreign = await browser.newContext({ baseURL: origin }); await register(foreign.request, `team-foreign-${Date.now()}@example.com`)
  expect((await foreign.request.get(`/api/v1/organization/members/${target.id}`)).status()).toBe(404)
  expect((await foreign.request.patch(`/api/v1/organization/members/${target.id}/role`, { headers: { Origin: origin }, data: { role: 'viewer', expectedVersion: member.version } })).status()).toBe(404)
  const ownPage = (await (await foreign.request.get(`/api/v1/organization/members?organizationId=${owner.organizationId}`)).json()).data
  expect(ownPage.items).toHaveLength(1); expect(ownPage.items[0].organizationId).not.toBe(owner.organizationId)
  const auditor = await browser.newContext({ baseURL: origin }); expect((await auditor.request.post('/api/v1/auth/login', { headers: { Origin: origin }, data: { accountType: 'organization', email: members[0].email, password } })).status()).toBe(200)
  const auditPage = await auditor.newPage(); await auditPage.goto('/app/users'); await expect(auditPage.getByText('Read-only roster')).toBeVisible(); await expect(auditPage.getByRole('button', { name: /Review role for/ })).toHaveCount(0)
  expect((await auditor.request.patch(`/api/v1/organization/members/${target.id}/role`, { headers: { Origin: origin }, data: { role: 'viewer', expectedVersion: member.version } })).status()).toBe(403)
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.screenshot({ path: 'test-results/team-desktop.png', fullPage: true }); await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: 'test-results/team-mobile.png', fullPage: true })
  await page.goto('/app/audit'); await page.getByLabel('Action', { exact: true }).selectOption('organization.member.role_updated'); await expect(page.locator('.audit-table tbody tr')).toHaveCount(2)
  await foreign.close(); await auditor.close()
})

test('downgraded sessions fail closed, permission outages recover, and individual workspace has no team controls', async ({ page }) => {
  const email = `team-downgrade-${Date.now()}@example.com`; await register(page.request, email); const members = JSON.parse(seed(email, 'members')) as { name: string }[]
  await page.goto('/app/users'); await page.getByRole('button', { name: 'Load more members' }).click(); await page.getByRole('button', { name: `Review role for ${members[1].name}`, exact: true }).click(); await page.getByLabel('New role').selectOption('manager'); await page.getByRole('checkbox').check()
  seed(email, 'auditor'); await page.getByRole('button', { name: 'Confirm role change' }).click(); await expect(page.getByText('Read-only roster')).toBeVisible(); await expect(page.getByLabel('New role')).toHaveCount(0)
  await page.route('**/api/v1/organization/members?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })); await page.getByRole('button', { name: 'Refresh roster' }).click(); await expect(page.locator('.team-alert')).toContainText('unavailable'); await page.unroute('**/api/v1/organization/members?*'); await page.getByRole('button', { name: 'Refresh roster' }).click(); await expect(page.locator('.team-table tbody tr')).toHaveCount(25)
  seed(email, 'viewer'); await page.reload(); await expect(page.getByRole('heading', { name: 'Organization members are restricted' })).toBeVisible()
  seed(email, 'individual'); await page.reload(); await expect(page.getByRole('heading', { name: 'Personal workspace', exact: true })).toBeVisible(); await expect(page.locator('.team-table')).toHaveCount(0); expect((await page.request.get('/api/v1/organization/members')).status()).toBe(403)
  await page.screenshot({ path: 'test-results/team-personal.png', fullPage: true })
})
