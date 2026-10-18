import { parseUsageHistory, parseUsageSummary, type UsageScope } from '@/contracts/usage'
import { apiRequest } from './client'
export const usageApi = {
  async summary(scope: UsageScope, range: URLSearchParams, signal: AbortSignal) {
    const response = await apiRequest<unknown>(`/usage/${scope}?${range}`, { cache: 'no-store', signal })
    return parseUsageSummary(response.data, scope)
  },
  async history(scope: UsageScope, filters: URLSearchParams, signal: AbortSignal) {
    const response = await apiRequest<unknown>(`/usage/${scope}/history?${filters}`, { cache: 'no-store', signal })
    return parseUsageHistory(response.data)
  },
}
