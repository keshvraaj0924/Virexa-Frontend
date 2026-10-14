/** Authenticated Agent v1 client; tenant and actor derive from the server session. */
import type { AgentListQuery, CreateAgentRequest, UpdateAgentRequest } from '@/contracts/agents'
import { apiRequest } from './client'
import { requireAgentEnvelope, requireAgentListEnvelope } from './agent-response'

function encodeAgentQuery(input: AgentListQuery = {}): string {
  const query = new URLSearchParams()
  if (input.status !== undefined) query.set('status', input.status)
  if (input.limit !== undefined) query.set('limit', String(input.limit))
  if (input.cursor !== undefined) query.set('cursor', input.cursor)
  const encoded = query.toString()
  return encoded ? '?' + encoded : ''
}

function createPayload(input: CreateAgentRequest): CreateAgentRequest {
  const { name, instructions, description, personaId, branchId, departmentId } = input
  return { name, instructions, description, personaId, branchId, departmentId }
}

function updatePayload(input: UpdateAgentRequest): UpdateAgentRequest {
  const { expectedVersion, name, instructions, description, personaId, branchId, departmentId, status } = input
  return { expectedVersion, name, instructions, description, personaId, branchId, departmentId, status }
}

export const agentsApi = {
  list: async (input?: AgentListQuery) =>
    requireAgentListEnvelope(await apiRequest<unknown>('/agents' + encodeAgentQuery(input))),
  get: async (agentId: string) =>
    requireAgentEnvelope(await apiRequest<unknown>('/agents/' + encodeURIComponent(agentId))),
  create: async (input: CreateAgentRequest, idempotencyKey: string) =>
    requireAgentEnvelope(await apiRequest<unknown>('/agents', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(createPayload(input)),
    })),
  update: async (agentId: string, input: UpdateAgentRequest) =>
    requireAgentEnvelope(await apiRequest<unknown>('/agents/' + encodeURIComponent(agentId), {
      method: 'PATCH',
      body: JSON.stringify(updatePayload(input)),
    })),
}
