export type AccountType = 'individual' | 'organization'

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'operator'
  | 'viewer'
  | 'auditor'

export type Permission =
  | 'platform:read'
  | 'platform:manage'
  | 'organization:manage'
  | 'audit:read'
  | 'workflow:read'
  | 'workflow:create'
  | 'workflow:manage'

export interface ActiveSession {
  id: string
  createdAt: string
  expiresAt: string
  current: boolean
}

export interface RevokeOtherSessionsResult {
  revokedCount: number
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
  | 'EMAIL_DELIVERY_UNAVAILABLE'
  | 'SIGNUP_PROOF_INVALID'
  | 'SIGNUP_COOLDOWN'

export interface UserSummary {
  accountType: AccountType
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

export interface AuthenticatedContext extends AuthSession {
  permissions: readonly Permission[]
}

export interface LoginRequest {
  accountType?: AccountType
  email: string
  password: string
}

export interface RegisterRequest {
  displayName: string
  email: string
  password: string
  organizationName: string
}

export interface ApiErrorBody {
  code: ApiErrorCode
  message: string
  requestId: string
  fieldErrors?: Record<string, string[]>
}

export interface SignupDetails {
  accountType: AccountType
  displayName: string
  email: string
  organizationName?: string
}
export interface SignupChallenge {
  challengeId: string
  message: string
  expiresInSeconds: number
  resendAfterSeconds: number
}
export interface SignupProof { setupToken: string; expiresInSeconds: number }
export interface SignupCompletion { challengeId: string; setupToken: string; password: string }
