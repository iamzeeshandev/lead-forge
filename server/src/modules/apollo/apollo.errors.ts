import { HttpStatus } from '@nestjs/common';
import { AxiosError, isAxiosError } from 'axios';
import { ApiException } from '../../common/errors/api-exception.js';
import { readRequestId, readRetryAfterSeconds } from './apollo.headers.js';
import type {
  ApolloErrorBody,
  ApolloErrorDetails,
} from './interfaces/apollo-error-body.js';

export type ApolloErrorKind =
  | 'auth'
  | 'access'
  | 'validation'
  | 'not_found'
  | 'rate_limit'
  | 'server'
  | 'timeout'
  | 'network'
  | 'unexpected';

export interface ApolloErrorInfo {
  kind: ApolloErrorKind;
  /** Apollo's HTTP status; null when no response arrived. */
  status: number | null;
  /** `error_details.code`, e.g. `USAGE.RATE_LIMIT.API_RATE_LIMIT_EXCEEDED`. */
  code: string | null;
  /** Apollo's own explanation. For logs, not for API responses. */
  detail: string;
  retryAfterSeconds: number | null;
  requestId: string | null;
}

/**
 * A failed Apollo call. Deliberately has no `cause`: the AxiosError's config
 * holds the x-api-key header, and anything that logs or serialises the error
 * chain would leak it.
 */
export class ApolloApiError extends Error {
  override readonly name = 'ApolloApiError';

  constructor(readonly info: ApolloErrorInfo) {
    super(
      `Apollo ${info.status ?? info.kind}${info.code ? ` ${info.code}` : ''}: ${info.detail}`,
    );
  }
}

export function toApolloApiError(error: unknown): ApolloApiError {
  if (error instanceof ApolloApiError) {
    return error;
  }
  if (!isAxiosError(error)) {
    return new ApolloApiError({
      kind: 'unexpected',
      status: null,
      code: null,
      detail: error instanceof Error ? error.message : String(error),
      retryAfterSeconds: null,
      requestId: null,
    });
  }

  const { response } = error;
  if (!response) {
    // No answer doesn't mean Apollo didn't process the request: a timed-out
    // enrichment may still have spent a credit.
    const timedOut =
      error.code === AxiosError.ECONNABORTED ||
      error.code === AxiosError.ETIMEDOUT;
    return new ApolloApiError({
      kind: timedOut ? 'timeout' : 'network',
      status: null,
      code: null,
      detail: error.code ? `${error.code}: ${error.message}` : error.message,
      retryAfterSeconds: null,
      requestId: null,
    });
  }

  const headers = response.headers as Record<string, unknown>;
  const details = readErrorDetails(response.data);
  return new ApolloApiError({
    kind: classify(response.status, details?.code ?? null),
    status: response.status,
    code: details?.code ?? null,
    detail:
      details?.message ??
      describeBody(response.data) ??
      `HTTP ${response.status}`,
    retryAfterSeconds:
      readRetryAfterSeconds(headers) ?? suggestedRetryAfter(details),
    requestId: readRequestId(headers),
  });
}

function classify(status: number, code: string | null): ApolloErrorKind {
  // The code decides when there is one: a missing key comes back as 422, which
  // by status alone would look like a validation error.
  if (code?.startsWith('AUTH.AUTHENTICATION.')) {
    return 'auth';
  }
  if (code?.startsWith('AUTH.AUTHORIZATION.')) {
    return 'access';
  }
  if (code?.startsWith('USAGE.RATE_LIMIT.')) {
    return 'rate_limit';
  }
  // Undocumented codes and plain-text bodies fall back to the status.
  if (status === 401) {
    return 'auth';
  }
  if (status === 403) {
    return 'access';
  }
  if (status === 404) {
    return 'not_found';
  }
  if (status === 429) {
    return 'rate_limit';
  }
  if (status === 400 || status === 422) {
    return 'validation';
  }
  return status >= 500 ? 'server' : 'unexpected';
}

function readErrorDetails(data: unknown): ApolloErrorDetails | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const details = (data as ApolloErrorBody).error_details;
  return typeof details?.code === 'string' ? details : null;
}

function describeBody(data: unknown): string | null {
  return typeof data === 'string' && data.trim() !== ''
    ? data.trim().slice(0, 200)
    : null;
}

// PLATFORM_RATE_LIMIT (Apollo-wide load) sends no Retry-After header, only this.
function suggestedRetryAfter(
  details: ApolloErrorDetails | null,
): number | null {
  const seconds = details?.suggestions?.find(
    (suggestion) => typeof suggestion.retry_after_seconds === 'number',
  )?.retry_after_seconds;
  return seconds ?? null;
}

/**
 * What our API tells the client. Key and plan problems become 502, not 401/403:
 * the failing credential is the server's, not the user's.
 */
export function toApiException(error: ApolloApiError): ApiException {
  const { kind, status, retryAfterSeconds, requestId } = error.info;
  const extras = {
    ...(retryAfterSeconds !== null && { retryAfterSeconds }),
    ...(requestId !== null && { requestId }),
  };

  switch (kind) {
    case 'auth':
      return new ApiException({
        statusCode: HttpStatus.BAD_GATEWAY,
        code: 'PROVIDER_ACCESS_DENIED',
        message: "Apollo rejected the server's API key.",
        ...extras,
      });
    case 'access':
      return new ApiException({
        statusCode: HttpStatus.BAD_GATEWAY,
        code: 'PROVIDER_ACCESS_DENIED',
        message: "The Apollo API key or plan doesn't include this endpoint.",
        ...extras,
      });
    case 'rate_limit':
      return new ApiException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'PROVIDER_RATE_LIMITED',
        message: "Apollo's request limit is used up.",
        ...extras,
      });
    case 'validation':
      return new ApiException({
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION_FAILED',
        message: 'Apollo rejected the request parameters.',
        ...extras,
      });
    case 'not_found':
      return new ApiException({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'NOT_FOUND',
        message: 'Apollo has no record for this request.',
        ...extras,
      });
    case 'timeout':
      return new ApiException({
        statusCode: HttpStatus.GATEWAY_TIMEOUT,
        code: 'PROVIDER_TIMEOUT',
        message: "Apollo didn't respond in time.",
        ...extras,
      });
    case 'server':
    case 'network':
      return new ApiException({
        statusCode: HttpStatus.BAD_GATEWAY,
        code: 'PROVIDER_UNAVAILABLE',
        message:
          kind === 'network'
            ? "The server couldn't reach Apollo."
            : 'Apollo had a server error. Try again shortly.',
        ...extras,
      });
    case 'unexpected':
      // A status we don't handle came from Apollo; no status means a bug on our side.
      return status === null
        ? new ApiException({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            code: 'INTERNAL_ERROR',
            message: 'Something went wrong on the LeadForge server.',
          })
        : new ApiException({
            statusCode: HttpStatus.BAD_GATEWAY,
            code: 'PROVIDER_UNAVAILABLE',
            message: 'Apollo sent an unexpected response.',
            ...extras,
          });
  }
}
