import { describe, expect, it } from 'vitest'
import { hasPermission } from './permissions'

describe('hasPermission', () => {
  it('allows viewers to read workflows', () => {
    expect(hasPermission('viewer', 'workflow:read')).toBe(true)
  })

  it('prevents viewers from mutating workflows', () => {
    expect(hasPermission('viewer', 'workflow:create')).toBe(false)
    expect(hasPermission('viewer', 'workflow:manage')).toBe(false)
  })

  it('allows managers to manage workflows but not organization settings', () => {
    expect(hasPermission('manager', 'workflow:manage')).toBe(true)
    expect(hasPermission('manager', 'organization:manage')).toBe(false)
  })
})
