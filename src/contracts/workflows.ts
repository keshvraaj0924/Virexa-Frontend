export const WORKFLOW_STATUSES = ['draft', 'active', 'paused', 'archived'] as const
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number]

/**
 * UI transition hints synchronized with the backend lifecycle policy.
 * The backend remains the authoritative authorization and state-transition boundary.
 */
export const WORKFLOW_STATUS_TRANSITIONS: Record<WorkflowStatus, readonly WorkflowStatus[]> = {
  draft: ['active'],
  active: ['paused', 'archived'],
  paused: ['active', 'archived'],
  archived: [],
}

export function canTransitionWorkflowStatus(current: WorkflowStatus, next: WorkflowStatus): boolean {
  return current === next || WORKFLOW_STATUS_TRANSITIONS[current].includes(next)
}

export interface Workflow {
  id: string
  organizationId: string
  createdByUserId: string
  name: string
  description: string | null
  status: WorkflowStatus
  createdAt: string
  updatedAt: string
}

export interface CreateWorkflowRequest {
  name: string
  description?: string | null
}

export interface UpdateWorkflowRequest {
  name?: string
  description?: string | null
  status?: WorkflowStatus
}
