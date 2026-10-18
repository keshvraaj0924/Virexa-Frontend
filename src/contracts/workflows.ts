export const WORKFLOW_STATUSES = ['draft', 'active', 'paused', 'archived'] as const
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number]

export interface Workflow {
  id: string
  organizationId: string
  createdByUserId: string
  name: string
  description: string | null
  status: WorkflowStatus
  version: number
  createdAt: string
  updatedAt: string
}

export interface CreateWorkflowRequest {
  name: string
  description?: string | null
}

export interface UpdateWorkflowRequest {
  expectedVersion: number
  name?: string
  description?: string | null
  status?: WorkflowStatus
}

export interface WorkflowListQuery {
  status?: WorkflowStatus
  limit?: number
  cursor?: string
}

export interface WorkflowListResponse {
  items: Workflow[]
  nextCursor: string | null
}

/** Validate untrusted record responses before rendering status-dependent controls. */
export function parseWorkflow(value: unknown): Workflow {
  if (!value || typeof value !== 'object') throw new Error('Invalid workflow record')
  const record = value as Record<string, unknown>
  if (!['id', 'organizationId', 'createdByUserId', 'name', 'createdAt', 'updatedAt'].every(key => typeof record[key] === 'string' && (record[key] as string).length > 0)
    || !(record.description === null || typeof record.description === 'string')
    || !WORKFLOW_STATUSES.includes(record.status as WorkflowStatus)
    || !Number.isSafeInteger(record.version) || (record.version as number) < 1
    || !Number.isFinite(Date.parse(record.createdAt as string)) || !Number.isFinite(Date.parse(record.updatedAt as string))) throw new Error('Invalid workflow record')
  return value as Workflow
}
export function parseWorkflowList(value: unknown): WorkflowListResponse {
  if (!value || typeof value !== 'object') throw new Error('Invalid workflow list')
  const list = value as Record<string, unknown>
  if (!Array.isArray(list.items) || list.items.length > 100 || !(list.nextCursor === null || typeof list.nextCursor === 'string')) throw new Error('Invalid workflow list')
  return { items: list.items.map(parseWorkflow), nextCursor: list.nextCursor as string | null }
}
