import type { ApiSuccess } from '@/contracts/api'
import type { CreateWorkflowRequest, Workflow } from '@/contracts/workflows'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

function requestId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId(), ...init?.headers },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error?.message ?? 'Request failed')
  return payload as T
}

export const workflowsApi = {
  list: (limit = 50) => request<ApiSuccess<Workflow[]>>(`/workflows?limit=${limit}`),
  create: (input: CreateWorkflowRequest, idempotencyKey: string) => request<ApiSuccess<Workflow>>('/workflows', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(input),
  }),
}
