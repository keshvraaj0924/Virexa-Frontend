/**
 * Public projection for the authenticated /api/v1/agents endpoints.
 * Organization ownership is determined by the server session and is never a
 * client-provided field or a client-selectable query parameter.
 *
 * Keep in sync with Virexa-backend/src/agents/contracts.ts and HTTP routes.
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
  instructions: string
  description?: string | null
  personaId?: string | null
  branchId?: string | null
  departmentId?: string | null
}

/** expectedVersion prevents overwriting concurrent updates. */
export interface UpdateAgentRequest {
  expectedVersion: number
  name?: string
  instructions?: string
  description?: string | null
  personaId?: string | null
  branchId?: string | null
  departmentId?: string | null
  status?: AgentStatus
}

export interface AgentListQuery {
  status?: AgentStatus
  limit?: number
  cursor?: string
}

export interface AgentListResponse {
  items: Agent[]
  nextCursor: string | null
}
