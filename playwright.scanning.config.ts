import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e-scanning',
  workers: 1,
  retries: 0,
  timeout: 90000,
  use: { launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] } : undefined, actionTimeout: 10000, baseURL: 'http://127.0.0.1:3000', trace: 'off', screenshot: 'off', video: 'off' },
  // Never retain traces containing real session cookies or submitted passwords.
  webServer: { command: 'npm run start -- --hostname 127.0.0.1', url: 'http://127.0.0.1:3000/login', reuseExistingServer: false },
})
