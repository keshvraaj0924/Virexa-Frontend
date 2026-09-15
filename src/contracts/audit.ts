export interface AuditEvent {
  id: string
  organizationId: string
  actorUserId: string | null
  action: string
  resourceType: string
  resourceId: string | null
  requestId: string
  metadata: Record<string, unknown>
  createdAt: string
}
