import { describe, expect, it } from 'vitest'
import { hasPermission } from './permissions'

describe('hasPermission', () => {
  it('allows viewers to read workflows and documents', () => {
    expect(hasPermission('viewer', 'workflow:read')).toBe(true)
    expect(hasPermission('viewer', 'document:read')).toBe(true)
  })

  it('prevents viewers from creating workflows or documents', () => {
    expect(hasPermission('viewer', 'workflow:create')).toBe(false)
    expect(hasPermission('viewer', 'document:create')).toBe(false)
  })

  it('mirrors backend document capabilities for operational roles', () => {
    expect(hasPermission('operator', 'document:read')).toBe(true)
    expect(hasPermission('operator', 'document:create')).toBe(true)
    expect(hasPermission('operator', 'document:manage')).toBe(false)
    expect(hasPermission('manager', 'document:manage')).toBe(true)
    expect(hasPermission('admin', 'document:manage')).toBe(true)
  })

  it('keeps backend role names authoritative', () => {
    expect(hasPermission('admin', 'workflow:manage')).toBe(true)
    expect(hasPermission('operator', 'workflow:create')).toBe(true)
  })
})
