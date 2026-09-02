import { describe, expect, it } from 'vitest'
import { canTransitionWorkflowStatus } from './workflows'

describe('workflow lifecycle contract', () => {
  it('allows idempotent status updates', () => {
    expect(canTransitionWorkflowStatus('active', 'active')).toBe(true)
  })

  it('matches the backend-supported lifecycle transitions', () => {
    expect(canTransitionWorkflowStatus('draft', 'active')).toBe(true)
    expect(canTransitionWorkflowStatus('active', 'paused')).toBe(true)
    expect(canTransitionWorkflowStatus('active', 'archived')).toBe(true)
    expect(canTransitionWorkflowStatus('paused', 'active')).toBe(true)
    expect(canTransitionWorkflowStatus('paused', 'archived')).toBe(true)
  })

  it('does not advertise invalid or terminal-state transitions', () => {
    expect(canTransitionWorkflowStatus('draft', 'paused')).toBe(false)
    expect(canTransitionWorkflowStatus('draft', 'archived')).toBe(false)
    expect(canTransitionWorkflowStatus('archived', 'active')).toBe(false)
  })
})
