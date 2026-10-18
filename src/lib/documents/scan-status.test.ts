import { describe, expect, it } from 'vitest'
import { scanLabel, intakeReceipt } from './scan-status'

describe('authoritative document scan labels', () => {
  it.each([
    ['awaiting_upload', 'Awaiting upload confirmation'],
    ['pending_scan', 'Pending scan · private quarantine'],
    ['clean', 'Scan passed · private quarantine'],
    ['rejected', 'Scan rejected · private quarantine'],
    [undefined, 'Scan status unavailable · private quarantine'],
  ] as const)('renders %s without promising safety or processing', (state, label) => {
    expect(scanLabel(state)).toBe(label)
    expect(scanLabel(state)).not.toMatch(/safe|completed|extracted/i)
  })
  it('keeps unknown runtime states fail-closed', () => {
    expect(scanLabel('unexpected' as never)).toContain('unavailable')
    expect(intakeReceipt('clean')).toContain('Processing remains unavailable')
    expect(intakeReceipt('rejected')).toContain('Processing is blocked')
  })
})
