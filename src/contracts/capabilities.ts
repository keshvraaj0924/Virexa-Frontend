/** Python candidate's implemented operations. Resource authorization stays server-side. */
export const CAPABILITIES = [
  'document:read', 'document:create', 'document:upload',
  'session:read', 'session:revoke', 'organization:read',
] as const
export type Capability = typeof CAPABILITIES[number]
export interface EffectivePermissions { capabilities: Capability[] }

/** Unknown future capabilities grant no UI access; malformed responses fail closed. */
export function parseEffectivePermissions(value: unknown): EffectivePermissions | null {
  if (!value || typeof value !== 'object' || !('capabilities' in value)) return null
  if (!Array.isArray(value.capabilities) || !value.capabilities.every(item => typeof item === 'string')) return null
  return { capabilities: [...new Set(value.capabilities.filter((item): item is Capability => CAPABILITIES.includes(item as Capability)))] }
}
