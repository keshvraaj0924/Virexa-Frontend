import { describe, expect, it } from 'vitest'
import { safePostAuthPath } from './redirect'

describe('safePostAuthPath', () => {
  it('accepts an application-relative path', () => {
    expect(safePostAuthPath('/app/workflows')).toBe('/app/workflows')
  })

  it('rejects protocol-relative redirects', () => {
    expect(safePostAuthPath('//evil.example/app')).toBe('/app')
  })

  it('rejects absolute URLs and backslash-based paths', () => {
    expect(safePostAuthPath('https://evil.example')).toBe('/app')
    expect(safePostAuthPath('/\\evil.example')).toBe('/app')
  })
})
