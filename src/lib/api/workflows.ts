import type { CreateWorkflowRequest, UpdateWorkflowRequest, Workflow } from '@/contracts/workflows'
import { apiRequest } from './client'

export async function listWorkflows(limit = 50): Promise<Workflow[]> {
  const response = await apiRequest<Workflow[]>(`/workflows?limit=${limit}`)
  return response.data
}

export async function createWorkflow(input: CreateWorkflowRequest): Promise<Workflow> {
  const response = await apiRequest<Workflow>('/workflows', { method: 'POST', body: JSON.stringify(input) })
  return response.data
}

export async function getWorkflow(workflowId: string): Promise<Workflow> {
  const response = await apiRequest<Workflow>(`/workflows/${encodeURIComponent(workflowId)}`)
  return response.data
}

export async function updateWorkflow(workflowId: string, input: UpdateWorkflowRequest): Promise<Workflow> {
  const response = await apiRequest<Workflow>(`/workflows/${encodeURIComponent(workflowId)}`, { method: 'PATCH', body: JSON.stringify(input) })
  return response.data
}
