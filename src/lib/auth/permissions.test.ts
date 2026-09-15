import { describe, expect, it } from 'vitest';
import { hasPermission } from './permissions';

describe('hasPermission', () => {
  it('allows viewers to read the dashboard', () => {
    expect(hasPermission('viewer', 'dashboard:read')).toBe(true);
  });

  it('prevents viewers from managing users', () => {
    expect(hasPermission('viewer', 'user:manage')).toBe(false);
  });

  it('limits auditors to audit access', () => {
    expect(hasPermission('auditor', 'audit:read')).toBe(true);
    expect(hasPermission('auditor', 'workflow:manage')).toBe(false);
  });
});
