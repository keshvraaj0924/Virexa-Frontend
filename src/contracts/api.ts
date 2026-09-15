import type { ApiErrorBody } from './auth'

export interface ApiMeta {
  requestId: string
  timestamp: string
}

export interface ApiSuccess<T> {
  data: T
  meta: ApiMeta
}

export interface ApiFailure {
  error: ApiErrorBody
  meta?: ApiMeta
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure
