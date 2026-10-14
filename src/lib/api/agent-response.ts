import { AGENT_STATUSES, type Agent, type AgentListResponse } from '../../contracts/agents'
import { ApiError, type ApiEnvelope } from './client'

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function uuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
function iso(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(value) && Number.isFinite(Date.parse(value))
}
function mismatch(response: unknown): never {
  const requestId = record(response) && record(response.meta) && typeof response.meta.requestId === 'string'
    ? response.meta.requestId : 'unknown'
  throw new ApiError({
    code: 'API_CONTRACT_MISMATCH',
    message: 'Incompatible Agent API v1 response. Contact support with the request ID.',
    requestId,
    status: 502,
  })
}
function assertEnvelope(response: unknown): asserts response is ApiEnvelope<unknown> {
  if (!record(response) || !record(response.meta) ||
      typeof response.meta.requestId !== 'string' || !response.meta.requestId ||
      !iso(response.meta.timestamp) || !('data' in response)) mismatch(response)
}
function agent(value: unknown, response: unknown): Agent {
  if (!record(value) || !uuid(value.id) ||
      typeof value.name !== 'string' || value.name.trim().length < 2 || value.name.length > 120 ||
      typeof value.instructions !== 'string' || !value.instructions.trim() || value.instructions.length > 12000 ||
      !(value.description === null || (typeof value.description === 'string' && value.description.length <= 1000)) ||
      !([value.personaId, value.branchId, value.departmentId].every((id) => id === null || uuid(id))) ||
      typeof value.status !== 'string' || !AGENT_STATUSES.some((status) => status === value.status) ||
      !Number.isSafeInteger(value.version) || (value.version as number) < 1 ||
      !uuid(value.createdByUserId) || !iso(value.createdAt) || !iso(value.updatedAt)) mismatch(response)
  return {
    id: value.id as string, name: value.name as string,
    description: value.description as string | null,
    personaId: value.personaId as string | null,
    branchId: value.branchId as string | null,
    departmentId: value.departmentId as string | null,
    instructions: value.instructions as string,
    status: value.status as Agent['status'],
    version: value.version as number,
    createdByUserId: value.createdByUserId as string,
    createdAt: value.createdAt as string,
    updatedAt: value.updatedAt as string,
  }
}
export function requireAgentEnvelope(response: ApiEnvelope<unknown>): ApiEnvelope<Agent> {
  assertEnvelope(response)
  return { meta: response.meta, data: agent(response.data, response) }
}
export function requireAgentListEnvelope(response: ApiEnvelope<unknown>): ApiEnvelope<AgentListResponse> {
  assertEnvelope(response)
  if (!record(response.data) || !Array.isArray(response.data.items) ||
      response.data.items.length > 100 ||
      !(response.data.nextCursor === null ||
       (typeof response.data.nextCursor === 'string' &&
        response.data.nextCursor.length > 0 && response.data.nextCursor.length <= 2048))) mismatch(response)
  return { meta: response.meta, data: {
    items: response.data.items.map((value) => agent(value, response)),
    nextCursor: response.data.nextCursor as string | null,
  } }
}
