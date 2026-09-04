import { describe, expect, it } from 'vitest'
import { hasPermission } from './permissions'

describe('hasPermission', () => {
  it('allows viewers to read workflows', () => {
    expect(hasPermission('viewer', 'workflow:read')).toBe(true)
  })

  it('prevents viewers from creating workflows', () => {
    expect(hasPermission('viewer', 'workflow:create')).toBe(false)
  })

  it('keeps backend role names authoritative', () => {
    expect(hasPermission('admin', 'workflow:manage')).toBe(true)
    expect(hasPermission('operator', 'workflow:create')).toBe(true)
  })
})
