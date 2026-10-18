import { apiRequest } from './client'
export const AUDIT_ACTIONS = ['auth.signup.completed', 'auth.login', 'auth.logout', 'auth.session.revoked', 'organization.member.role_updated', 'workflow.created', 'workflow.updated', 'document.created', 'document.intake.completed', 'document.intake.failed', 'access.denied'] as const
export type AuditAction = typeof AUDIT_ACTIONS[number]
export const AUDIT_OUTCOMES = ['succeeded', 'failed', 'denied'] as const
export type AuditOutcome = typeof AUDIT_OUTCOMES[number]
export interface TenantAuditEvent { id: string; actorUserId: string | null; action: AuditAction; resourceType: string; resourceId: string | null; requestId: string; createdAt: string; outcome: AuditOutcome }
export interface TenantAuditPage { events: TenantAuditEvent[]; nextCursor: string | null; coverage: { actions: AuditAction[]; notice: string } }
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'
export function parseTenantAudit(value: unknown): TenantAuditPage {
  const invalid = () => { throw new Error('Audit response could not be verified.') }
  if (!object(value) || !Array.isArray(value.events) || value.events.length > 100 || !(value.nextCursor === null || (typeof value.nextCursor === 'string' && value.nextCursor.length <= 2048)) || !object(value.coverage)) return invalid()
  const coverage = value.coverage
  if (coverage.mode !== 'forward_only' || coverage.version !== 'python-audit-v1' || typeof coverage.notice !== 'string' || !Array.isArray(coverage.actions) || !coverage.actions.every(a => AUDIT_ACTIONS.includes(a))) return invalid()
  const events = value.events.map((e: unknown): TenantAuditEvent => {
    if (!object(e) || !uuid(e.id) || !uuid(e.organizationId) || !(e.actorUserId === null || uuid(e.actorUserId)) || !(e.resourceId === null || uuid(e.resourceId)) || !uuid(e.requestId) || !AUDIT_ACTIONS.includes(e.action as AuditAction) || !['user', 'session', 'document', 'access', 'workflow'].includes(e.resourceType as string) || typeof e.createdAt !== 'string' || Number.isNaN(Date.parse(e.createdAt)) || !object(e.metadata) || !AUDIT_OUTCOMES.includes(e.metadata.outcome as AuditOutcome)) return invalid()
    // Pick only the documented public fields, never render arbitrary metadata.
    return { id: e.id, actorUserId: e.actorUserId, action: e.action as AuditAction, resourceType: e.resourceType as string, resourceId: e.resourceId, requestId: e.requestId, createdAt: e.createdAt, outcome: e.metadata.outcome as AuditOutcome }
  })
  return { events, nextCursor: value.nextCursor, coverage: { actions: coverage.actions as AuditAction[], notice: coverage.notice } }
}
export async function fetchTenantAudit(options: { cursor?: string; action?: AuditAction; outcome?: AuditOutcome }, signal?: AbortSignal) {
  const query = new URLSearchParams({ limit: '50' })
  if (options.action) { if (!AUDIT_ACTIONS.includes(options.action)) throw new Error('Invalid action'); query.set('action', options.action) }
  if (options.outcome) { if (!AUDIT_OUTCOMES.includes(options.outcome)) throw new Error('Invalid outcome'); query.set('outcome', options.outcome) }
  if (options.cursor) { if (options.cursor.length > 2048) throw new Error('Invalid cursor'); query.set('cursor', options.cursor) }
  return parseTenantAudit((await apiRequest<unknown>(`/audit/events?${query}`, { method: 'GET', cache: 'no-store', signal })).data)
}
