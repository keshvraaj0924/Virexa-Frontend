import type {
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  Workflow,
  WorkflowListQuery,
  WorkflowListResponse,
} from '@/contracts/workflows'
import { apiRequest } from './client'

function workflowListQuery(input: WorkflowListQuery = {}): string {
  const query = new URLSearchParams()
  if (input.status) query.set('status', input.status)
  if (input.cursor) query.set('cursor', input.cursor)
  if (input.limit !== undefined) query.set('limit', String(input.limit))
  const encoded = query.toString()
  return encoded ? `?${encoded}` : ''
}

export const workflowsApi = {
  list: (query?: WorkflowListQuery) =>
    apiRequest<WorkflowListResponse>(`/workflows${workflowListQuery(query)}`),
  create: (input: CreateWorkflowRequest, idempotencyKey: string) => apiRequest<Workflow>('/workflows', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(input),
  }),
  get: (workflowId: string) => apiRequest<Workflow>(`/workflows/${encodeURIComponent(workflowId)}`),
  update: (workflowId: string, input: UpdateWorkflowRequest) => apiRequest<Workflow>(`/workflows/${encodeURIComponent(workflowId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }),
}
