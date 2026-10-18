import { expect, test } from '@playwright/test'

test('desktop login renders, reveals password and keeps real failure visible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({ status: route.request().method() === 'OPTIONS' ? 204 : 401, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:3000', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID' }, body: JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } }) }))
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
  await page.screenshot({ path: 'test-results/login-desktop.png', fullPage: true })
  await page.getByLabel('Email').fill('alex@example.com')
  await page.getByLabel('Password', { exact: true }).fill('example password')
  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Hide password' }).click()
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.locator('form').getByRole('alert')).toHaveText('Invalid email or password.')
  await expect(page).toHaveURL(/\/login$/)
  await page.screenshot({ path: 'test-results/login-error.png', fullPage: true })
})

test('mobile registration is usable without decorative canvas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/register')
  await expect(page.getByRole('heading', { name: 'Create your workspace.' })).toBeVisible()
  await expect(page.getByLabel('Full name')).toBeVisible()
  await page.getByRole('radio', { name: /Organization/ }).check()
  await expect(page.getByLabel('Organization name')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await expect(page.locator('.vx-auth-art')).toBeHidden()
  await page.screenshot({ path: 'test-results/register-mobile.png', fullPage: true })
  await page.getByRole('link', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/register$/)
})

test('desktop reduced motion retains the CSS fallback and accessible form', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/register')
  await expect(page.locator('.vx-document-orbit canvas')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Send verification code' })).toBeVisible()
  await page.screenshot({ path: 'test-results/register-desktop.png', fullPage: true })
})


test('original product guide opens contextual tips and supports Escape', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/login')
  await page.getByRole('button', { name: 'Open product guide' }).click()
  await expect(page.getByRole('region', { name: 'Let’s get you back in.' })).toBeVisible()
  await page.screenshot({ path: 'test-results/login-product-guide.png', fullPage: true })
  await page.getByRole('button', { name: 'Next tip' }).click()
  await expect(page.getByText('The eye button lets you check your password before signing in.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Open product guide' })).toBeFocused()
})

test('landing introduces the connected sign-in and registration journey', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => Array.from(document.fonts).some(font => font.family === 'Geist' && font.status === 'loaded'))).toBe(true)
  expect((await page.request.get('/fonts/geist-latin.woff2')).status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Documents in.')
  await page.screenshot({ path: 'test-results/landing-desktop.png', fullPage: true })
  await page.getByRole('navigation').getByRole('link', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/')
  await page.getByRole('navigation').getByRole('link', { name: 'Register' }).click()
  await expect(page).toHaveURL(/\/register$/)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Sign in', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/landing-mobile.png', fullPage: true })
})

test('animated landing loads real WebGL and keeps content usable after context loss', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const failures: string[] = []
  page.on('pageerror', error => failures.push(error.message))
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.vx-document-field canvas')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('opacity', '1')
  await page.waitForTimeout(1300)
  await page.screenshot({ path: 'test-results/landing-webgl-desktop.png', fullPage: true })
  await page.locator('#platform').scrollIntoViewIfNeeded()
  await page.waitForTimeout(1100)
  await page.screenshot({ path: 'test-results/landing-platform.png' })
  await page.evaluate(() => {
    const canvas = document.querySelector('.vx-document-field canvas') as HTMLCanvasElement
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
  })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: 'test-results/landing-webgl-fallback.png' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(failures).toEqual([])
})

test('reduced motion avoids the decorative renderer and has no horizontal overflow', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [360, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.locator('.vx-document-field canvas')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    for (const selector of ['.vx-hero-content', '.vx-hero-visual', '.vx-hero-content > p', '.vx-process-glass']) {
      const bounds = await page.locator(selector).boundingBox()
      expect(bounds, selector).not.toBeNull()
      expect(bounds!.x + bounds!.width, selector).toBeLessThanOrEqual(width + 3)
    }
  }
})

test('records the real public landing motion for visual review', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'no-preference',
    recordVideo: { dir: 'test-results/motion-capture', size: { width: 1440, height: 900 } },
  })
  const page = await context.newPage()
  const video = page.video()
  await page.goto('http://127.0.0.1:3000/')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.vx-document-field canvas')).toBeVisible()
  await page.waitForTimeout(1800)
  await page.getByRole('link', { name: 'Create your workspace', exact: true }).first().hover()
  await page.waitForTimeout(1000)
  await page.mouse.move(950, 380, { steps: 20 })
  await page.waitForTimeout(1800)
  await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'smooth' }))
  await page.waitForTimeout(1800)
  await page.evaluate(() => window.scrollTo({ top: 1320, behavior: 'smooth' }))
  await page.waitForTimeout(1800)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await page.waitForTimeout(1800)
  await context.close()
  await video?.saveAs('test-results/virexa-landing-motion.webm')
})
