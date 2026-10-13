/** Matches backend src/agents/contracts.ts (/api/v1/agents).
 * Tenant identity and createdByUserId are derived from the server session.
 * Never accept organizationId in create/update/list request bodies.
 */
export const AGENT_STATUSES = ['draft', 'active', 'paused', 'archived'] as const
export type AgentStatus = (typeof AGENT_STATUSES)[number]

export interface Agent {
  id: string
  name: string
  description: string | null
  personaId: string | null
  branchId: string | null
  departmentId: string | null
  instructions: string
  status: AgentStatus
  version: number
  createdByUserId: string
  createdAt: string
  updatedAt: string
}

export interface CreateAgentRequest {
  name: string
  description?: string | null
  instructions: string
  personaId?: string | null
  branchId?: string | null
  departmentId?: string | null
}

export interface UpdateAgentRequest {
  expectedVersion: number
  name?: string
  description?: string | null
  instructions?: string
  personaId?: string | null
  branchId?: string | null
  departmentId?: string | null
  status?: AgentStatus
}

export interface AgentListQuery {
  status?: AgentStatus
  cursor?: string
  limit?: number
}

export interface AgentListResponse {
  items: Agent[]
  nextCursor: string | null
}
