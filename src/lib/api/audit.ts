import { apiRequest } from './client'
import type { AuditEvent } from '@/contracts'

export async function fetchAuditEvents(limit = 50): Promise<AuditEvent[]> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const response = await apiRequest<AuditEvent[]>(`/audit/events?limit=${boundedLimit}`)
  return response.data
}
