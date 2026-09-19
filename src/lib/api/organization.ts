import { apiRequest, type ApiEnvelope } from './client';
import type { OrganizationHierarchy, OrganizationHierarchyQuery } from '../../contracts/organization';

function hierarchySearchParams(query: OrganizationHierarchyQuery = {}): string {
  const params = new URLSearchParams();
  if (query.limit !== undefined) {
    if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 100) {
      throw new RangeError('Organization hierarchy limit must be an integer between 1 and 100');
    }
    params.set('limit', String(query.limit));
  }
  if (query.status) params.set('status', query.status);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

/**
 * Reads the organization hierarchy for the authenticated session.
 * Tenant/organization identifiers are intentionally not accepted by this API.
 */
export function getOrganizationHierarchy(
  query: OrganizationHierarchyQuery = {},
): Promise<ApiEnvelope<OrganizationHierarchy>> {
  return apiRequest<OrganizationHierarchy>(`/organization/hierarchy${hierarchySearchParams(query)}`, {
    method: 'GET',
    cache: 'no-store',
  });
}
