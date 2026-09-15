import { describe, expect, it } from 'vitest'
import type { ApiErrorCode } from './auth'

describe('authentication API contract', () => {
  it('publishes the backend rate-limit error code', () => {
    const code: ApiErrorCode = 'RATE_LIMITED'
    expect(code).toBe('RATE_LIMITED')
  })
})
