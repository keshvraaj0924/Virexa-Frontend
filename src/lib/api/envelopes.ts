export type ApiMeta = {
  requestId: string;
  timestamp: string;
};

export type ApiSuccess<T> = {
  data: T;
  meta: ApiMeta;
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
