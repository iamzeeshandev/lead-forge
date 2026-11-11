import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  ApolloApiError,
  type ApolloErrorKind,
  toApiException,
  toApolloApiError,
} from './apollo.errors.js';

const API_KEY = 'secret-test-key';

function requestConfig(): InternalAxiosRequestConfig {
  return { headers: new AxiosHeaders({ 'x-api-key': API_KEY }) };
}

function responseError(
  status: number,
  data: unknown,
  headers: Record<string, string> = {},
): AxiosError {
  const config = requestConfig();
  const response: AxiosResponse = {
    status,
    statusText: '',
    headers: new AxiosHeaders(headers),
    config,
    data,
  };
  return new AxiosError(
    `Request failed with status code ${status}`,
    AxiosError.ERR_BAD_REQUEST,
    config,
    {},
    response,
  );
}

const details = (code: string, extra: object = {}) => ({
  error_details: { code, message: `${code} message`, ...extra },
});

// Bodies as the live API returned them on 2026-11-11 (error_details only).
describe('toApolloApiError', () => {
  it.each<[string, number, unknown, ApolloErrorKind, string | null]>([
    [
      'invalid key (JSON)',
      401,
      details('AUTH.AUTHENTICATION.API_KEY_INVALID'),
      'auth',
      'AUTH.AUTHENTICATION.API_KEY_INVALID',
    ],
    [
      'invalid key (plain text, as the docs show)',
      401,
      'Invalid API key. See https://docs.apollo.io/reference/authentication for how to authenticate.',
      'auth',
      null,
    ],
    [
      'missing key, sent as 422',
      422,
      details('AUTH.AUTHENTICATION.API_KEY_REQUIRED'),
      'auth',
      'AUTH.AUTHENTICATION.API_KEY_REQUIRED',
    ],
    [
      'endpoint outside the key scope or plan',
      403,
      details('AUTH.AUTHORIZATION.ENDPOINT_ACCESS_DENIED'),
      'access',
      'AUTH.AUTHORIZATION.ENDPOINT_ACCESS_DENIED',
    ],
    [
      'missing identifier',
      422,
      details('ORGANIZATION.VALIDATION.ORGANIZATION_IDENTIFIER_REQUIRED'),
      'validation',
      'ORGANIZATION.VALIDATION.ORGANIZATION_IDENTIFIER_REQUIRED',
    ],
    [
      'team rate limit',
      429,
      details('USAGE.RATE_LIMIT.API_RATE_LIMIT_EXCEEDED'),
      'rate_limit',
      'USAGE.RATE_LIMIT.API_RATE_LIMIT_EXCEEDED',
    ],
    ['record not found', 404, '', 'not_found', null],
    ['server error', 500, '<html>oops</html>', 'server', null],
    ['unexpected redirect', 302, '', 'unexpected', null],
  ])('%s → %s', (_name, status, body, kind, code) => {
    const error = toApolloApiError(responseError(status, body));

    expect(error).toBeInstanceOf(ApolloApiError);
    expect(error.info).toMatchObject({ kind, status, code });
  });

  it('reads Retry-After and the request id from the headers', () => {
    const error = toApolloApiError(
      responseError(429, details('USAGE.RATE_LIMIT.API_RATE_LIMIT_EXCEEDED'), {
        'retry-after': '60',
        'x-request-id': 'd5b02f7e-33f5-43b6-94f4-cbc3ced2274f',
      }),
    );

    expect(error.info.retryAfterSeconds).toBe(60);
    expect(error.info.requestId).toBe('d5b02f7e-33f5-43b6-94f4-cbc3ced2274f');
  });

  it('falls back to retry_after_seconds when there is no Retry-After header', () => {
    const body = details('USAGE.RATE_LIMIT.PLATFORM_RATE_LIMIT', {
      suggestions: [{ label: 'Wait' }, { retry_after_seconds: 60 }],
    });

    const error = toApolloApiError(responseError(429, body));

    expect(error.info.retryAfterSeconds).toBe(60);
  });

  it('keeps Apollo’s message for the logs', () => {
    const error = toApolloApiError(
      responseError(401, details('AUTH.AUTHENTICATION.API_KEY_INVALID')),
    );

    expect(error.info.detail).toBe(
      'AUTH.AUTHENTICATION.API_KEY_INVALID message',
    );
  });

  it.each([AxiosError.ECONNABORTED, AxiosError.ETIMEDOUT])(
    'treats %s without a response as a timeout',
    (code) => {
      const error = toApolloApiError(
        new AxiosError('timeout of 200ms exceeded', code, requestConfig(), {}),
      );

      expect(error.info).toMatchObject({ kind: 'timeout', status: null });
    },
  );

  it('treats other failures without a response as network errors', () => {
    const error = toApolloApiError(
      new AxiosError(
        'connect ECONNREFUSED 127.0.0.1:1',
        'ECONNREFUSED',
        requestConfig(),
        {},
      ),
    );

    expect(error.info).toMatchObject({ kind: 'network', status: null });
  });

  it('wraps non-axios errors as unexpected', () => {
    const error = toApolloApiError(new TypeError('boom'));

    expect(error.info).toMatchObject({ kind: 'unexpected', detail: 'boom' });
  });

  it('never carries the API key from the request config', () => {
    const error = toApolloApiError(
      responseError(401, details('AUTH.AUTHENTICATION.API_KEY_INVALID')),
    );

    expect(error.cause).toBeUndefined();
    expect(
      [error.message, error.stack, JSON.stringify(error)].join(' '),
    ).not.toContain(API_KEY);
  });
});

describe('toApiException', () => {
  const apolloError = (kind: ApolloErrorKind, status: number | null = 400) =>
    new ApolloApiError({
      kind,
      status,
      code: null,
      detail: 'detail',
      retryAfterSeconds: null,
      requestId: null,
    });

  it.each<[ApolloErrorKind, number, string]>([
    ['auth', 502, 'PROVIDER_ACCESS_DENIED'],
    ['access', 502, 'PROVIDER_ACCESS_DENIED'],
    ['rate_limit', 429, 'PROVIDER_RATE_LIMITED'],
    ['validation', 400, 'VALIDATION_FAILED'],
    ['not_found', 404, 'NOT_FOUND'],
    ['timeout', 504, 'PROVIDER_TIMEOUT'],
    ['server', 502, 'PROVIDER_UNAVAILABLE'],
    ['network', 502, 'PROVIDER_UNAVAILABLE'],
    ['unexpected', 502, 'PROVIDER_UNAVAILABLE'],
  ])('maps %s to %i %s', (kind, statusCode, code) => {
    expect(toApiException(apolloError(kind)).body).toMatchObject({
      statusCode,
      code,
    });
  });

  it('maps an unexpected error without an Apollo status to a 500', () => {
    expect(toApiException(apolloError('unexpected', null)).body).toMatchObject({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });
  });

  it('passes on the retry delay and Apollo’s request id', () => {
    const error = new ApolloApiError({
      kind: 'rate_limit',
      status: 429,
      code: 'USAGE.RATE_LIMIT.API_RATE_LIMIT_EXCEEDED',
      detail: 'detail',
      retryAfterSeconds: 60,
      requestId: 'req-1',
    });

    expect(toApiException(error).body).toEqual({
      statusCode: 429,
      code: 'PROVIDER_RATE_LIMITED',
      message: "Apollo's request limit is used up.",
      retryAfterSeconds: 60,
      requestId: 'req-1',
    });
  });

  it('never exposes Apollo’s own message to the client', () => {
    const body = toApiException(apolloError('validation')).body;

    expect(body.message).not.toContain('detail');
  });
});
