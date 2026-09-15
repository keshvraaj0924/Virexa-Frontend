export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'operator'
  | 'viewer'

export interface UserSummary {
  id: string
  email: string
  displayName: string
  role: UserRole
  organizationId: string
  organizationName: string
}

export interface AuthSession {
  user: UserSummary
  expiresAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  displayName: string
  email: string
  password: string
  organizationName: string
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNTRUSTED_ORIGIN'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_STATE_TRANSITION'
  | 'WORKFLOW_CONFLICT'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'RATE_LIMITED'

export interface ApiErrorBody {
  code: ApiErrorCode
  message: string
  requestId: string
  fieldErrors?: Record<string, string[]>
}
