import { apiRequest } from './client'
export const MEMBER_ROLES = ['tenant_admin', 'organization_admin', 'manager', 'operator', 'viewer', 'auditor'] as const
export type MemberRole = typeof MEMBER_ROLES[number]
export interface Member { id: string; organizationId: string; displayName: string; email: string; role: MemberRole | 'platform_admin'; version: number; createdAt: string }
export interface MemberPage { items: Member[]; nextCursor: string | null }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
export function parseMember(v: unknown): Member {
  if (!object(v) || !uuid(v.id) || !uuid(v.organizationId) || typeof v.displayName !== 'string' || typeof v.email !== 'string' || ![...MEMBER_ROLES, 'platform_admin'].includes(v.role as MemberRole) || !Number.isSafeInteger(v.version) || (v.version as number) < 1 || typeof v.createdAt !== 'string' || Number.isNaN(Date.parse(v.createdAt))) throw new Error('Member response could not be verified.')
  return { id: v.id, organizationId: v.organizationId, displayName: v.displayName, email: v.email, role: v.role as Member['role'], version: v.version as number, createdAt: v.createdAt }
}
export function parseMembers(v: unknown): MemberPage {
  if (!object(v) || !Array.isArray(v.items) || v.items.length > 100 || !(v.nextCursor === null || typeof v.nextCursor === 'string' && v.nextCursor.length <= 2048)) throw new Error('Member list could not be verified.')
  return { items: v.items.map(parseMember), nextCursor: v.nextCursor }
}
export interface OrganizationRoot { id: string; name: string; accountType: 'organization' }
export function parseOrganizationRoot(value: unknown): OrganizationRoot {
  if (!object(value) || !object(value.organization) || !uuid(value.organization.id) || typeof value.organization.name !== 'string' || value.organization.accountType !== 'organization' || !['branches', 'departments', 'personas'].every(key => Array.isArray(value[key]) && value[key].length === 0)) throw new Error('Organization structure could not be verified.')
  return { id: value.organization.id, name: value.organization.name, accountType: 'organization' }
}
export const teamApi = {
  async hierarchy(signal?: AbortSignal) { return parseOrganizationRoot((await apiRequest<unknown>('/organization/hierarchy', { signal, cache: 'no-store' })).data) },
  async list(cursor?: string, signal?: AbortSignal) { const query = new URLSearchParams({ limit: '25' }); if (cursor) query.set('cursor', cursor); return parseMembers((await apiRequest<unknown>(`/organization/members?${query}`, { signal, cache: 'no-store' })).data) },
  async get(id: string) { return parseMember((await apiRequest<unknown>(`/organization/members/${encodeURIComponent(id)}`, { cache: 'no-store' })).data) },
  async changeRole(member: Member, role: MemberRole) { return parseMember((await apiRequest<unknown>(`/organization/members/${encodeURIComponent(member.id)}/role`, { method: 'PATCH', body: JSON.stringify({ role, expectedVersion: member.version }) })).data) },
}
