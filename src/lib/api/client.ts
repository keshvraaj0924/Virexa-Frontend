export type ApiMeta = {
  requestId: string;
  timestamp: string;
};

export type ApiEnvelope<T> = {
  data: T;
  meta: ApiMeta;
};

export type ApiFieldErrors = Record<string, string[]>;

export type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
    requestId: string;
    fieldErrors?: ApiFieldErrors;
  };
  meta: ApiMeta;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init?.headers },
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | ApiErrorEnvelope | null;
  if (!response.ok) {
    const message = payload && 'error' in payload ? payload.error.message : 'Request failed';
    throw new Error(message);
  }
  if (!payload || !('data' in payload) || !('meta' in payload)) {
    throw new Error('Invalid API response');
  }
  return payload;
}
