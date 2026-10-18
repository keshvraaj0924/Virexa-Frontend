import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type APIRequestContext } from '@playwright/test'

/** Only synthetic loopback SMTP captures, outside the repository and test artifacts. */
export function capturedCode(email: string): string {
  if (!/@example\.(com|test|invalid)$/.test(email)) throw new Error('Synthetic email required')
  const directory = process.env.SIGNUP_CAPTURE_DIRECTORY
  if (!directory) throw new Error('Set SIGNUP_CAPTURE_DIRECTORY for the isolated SMTP sink')
  const file = path.join(directory, `${createHash('sha256').update(email.toLowerCase()).digest('hex')}.json`)
  const capture = JSON.parse(readFileSync(file, 'utf8')) as { email: string; body: string }
  const code = capture.body.match(/Your verification code: ([A-Za-z0-9_-]+)/)?.[1]
  if (!code || capture.email !== email.toLowerCase()) throw new Error('Valid synthetic email capture unavailable')
  return code
}
export async function verifiedAccount(request: APIRequestContext, input: { email: string; password: string; accountType: 'individual' | 'organization'; displayName: string; organizationName?: string }) {
  const headers = { Origin: 'http://127.0.0.1:3000' }
  const { password, ...details } = input
  const start = await request.post('/api/v1/auth/signup/start', { headers, data: details })
  expect(start.status()).toBe(202)
  const { challengeId } = (await start.json()).data
  const verify = await request.post('/api/v1/auth/signup/verify', { headers, data: { challengeId, code: capturedCode(input.email) } })
  expect(verify.status()).toBe(200)
  const { setupToken } = (await verify.json()).data
  const complete = await request.post('/api/v1/auth/signup/complete', { headers, data: { challengeId, setupToken, password } })
  expect(complete.status()).toBe(201)
  return (await complete.json()).data
}
