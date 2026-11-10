import type { ApiErrorBody, ApiErrorCode } from '@/types/api';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly retryAfterSeconds?: number;
  readonly requestId?: string;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = body.statusCode;
    this.code = body.code;
    this.retryAfterSeconds = body.retryAfterSeconds;
    this.requestId = body.requestId;
  }
}
