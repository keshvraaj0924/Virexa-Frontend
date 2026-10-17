import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e-sessions',
  workers: 1,
  retries: 0,
  timeout: 90000,
  use: { actionTimeout: 10000, baseURL: 'http://127.0.0.1:3000', trace: 'off', screenshot: 'off', video: 'off' },
  // Never retain traces containing real session cookies or submitted passwords.
  webServer: { command: 'npm run start -- --hostname 127.0.0.1', url: 'http://127.0.0.1:3000/login', reuseExistingServer: false },
})
