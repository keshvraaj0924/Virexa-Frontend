export type Role =
  | 'platform_admin'
  | 'tenant_admin'
  | 'organization_admin'
  | 'manager'
  | 'operator'
  | 'viewer'
  | 'auditor';

export type ApiMeta = {
  requestId: string;
  timestamp: string;
};

export type ApiEnvelope<T> = {
  data: T;
  meta: ApiMeta;
};

export type ApiFailure = {
  error: {
    code: string;
    message: string;
    requestId: string;
    fieldErrors?: Record<string, string[]>;
  };
  meta: ApiMeta;
};

export type UserSummary = {
  id: string;
  display_name: string;
  email: string;
  role: Role;
};

export type Session = {
  authenticated: boolean;
  user: UserSummary | null;
  organization_id: string | null;
};
