export type ApiMeta = {
  requestId: string;
  timestamp: string;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    requestId: string;
    fieldErrors?: Record<string, string[]>;
  };
  meta: ApiMeta;
};

export type Role =
  | 'platform_admin'
  | 'tenant_admin'
  | 'organization_admin'
  | 'manager'
  | 'operator'
  | 'viewer'
  | 'auditor';

export type UserSummary = {
  id: string;
  display_name: string;
  email: string;
  role: Role;
};

export type SessionResponse = {
  authenticated: boolean;
  user: UserSummary | null;
  organization_id: string | null;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(payload?.error.message ?? 'Request failed');
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  session: () => request<{ data: SessionResponse; meta: ApiMeta }>('/auth/session'),
  login: (email: string, password: string) =>
    request<{ data: SessionResponse; meta: ApiMeta }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (displayName: string, email: string, password: string, organizationName: string) =>
    request<{ data: SessionResponse; meta: ApiMeta }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        display_name: displayName,
        email,
        password,
        organization_name: organizationName,
      }),
    }),
  logout: () => request<{ data: { success: boolean }; meta: ApiMeta }>('/auth/logout', { method: 'POST' }),
};
