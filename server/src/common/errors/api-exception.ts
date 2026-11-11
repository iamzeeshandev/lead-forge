import { HttpException } from '@nestjs/common';

// Mirrors client/src/types/api.ts: the client branches on `code`, never on `message`.
export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'PROVIDER_ACCESS_DENIED'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'INTERNAL_ERROR';

/** The JSON body of every non-2xx response from the LeadForge API. */
export interface ApiErrorBody {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  retryAfterSeconds?: number;
  /** The provider's request id (Apollo's x-request-id), for support tickets. */
  requestId?: string;
}

export class ApiException extends HttpException {
  constructor(readonly body: ApiErrorBody) {
    super(body, body.statusCode);
  }
}
