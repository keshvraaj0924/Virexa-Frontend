import type { CreateWorkflowRequest, UpdateWorkflowRequest, Workflow } from '@/contracts/workflows'
import { apiRequest } from './client'

export const workflowsApi = {
  list: (limit = 50) => apiRequest<Workflow[]>(`/workflows?limit=${limit}`),
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
