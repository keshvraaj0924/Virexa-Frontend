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

export class ApiError extends Error {
  readonly code: string;
  readonly requestId: string;
  readonly status: number;
  readonly fieldErrors?: ApiFieldErrors;

  constructor(options: {
    code: string;
    message: string;
    requestId: string;
    status: number;
    fieldErrors?: ApiFieldErrors;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.code = options.code;
    this.requestId = options.requestId;
    this.status = options.status;
    this.fieldErrors = options.fieldErrors;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

function correlationHeaders(): HeadersInit {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return { 'X-Request-ID': crypto.randomUUID() };
  }
  return {};
}

function isApiErrorEnvelope(payload: ApiEnvelope<unknown> | ApiErrorEnvelope | null): payload is ApiErrorEnvelope {
  return Boolean(
    payload &&
    'error' in payload &&
    typeof payload.error?.code === 'string' &&
    typeof payload.error?.message === 'string' &&
    typeof payload.error?.requestId === 'string',
  );
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...correlationHeaders(),
      ...init?.headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | ApiErrorEnvelope | null;
  if (!response.ok) {
    if (isApiErrorEnvelope(payload)) {
      throw new ApiError({
        code: payload.error.code,
        message: payload.error.message,
        requestId: payload.error.requestId,
        status: response.status,
        fieldErrors: payload.error.fieldErrors,
      });
    }

    throw new ApiError({
      code: 'API_REQUEST_FAILED',
      message: 'Request failed',
      requestId: response.headers.get('X-Request-ID') ?? 'unknown',
      status: response.status,
    });
  }
  if (!payload || !('data' in payload) || !('meta' in payload)) {
    throw new Error('Invalid API response');
  }
  return payload;
}
