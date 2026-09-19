import { apiRequest } from './client'
import type { AuditEvent } from '@/contracts'

export interface AuditEventsResponse {
  events: AuditEvent[]
}

export async function fetchAuditEvents(limit = 50): Promise<AuditEvent[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new RangeError('Audit event limit must be an integer between 1 and 100.')
  }

  const response = await apiRequest<AuditEventsResponse>(`/audit/events?limit=${limit}`, {
    method: 'GET',
    cache: 'no-store',
  })
  return response.data.events
}
