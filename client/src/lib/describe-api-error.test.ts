import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api-error';
import type { ApiErrorBody } from '@/types/api';
import { describeApiError } from './describe-api-error';

function apiError(body: Partial<ApiErrorBody> & Pick<ApiErrorBody, 'code'>) {
  return new ApiError({ statusCode: 502, message: 'Server message', ...body });
}

describe('describeApiError', () => {
  it('tells the user when a rate limit lifts', () => {
    const view = describeApiError(
      apiError({
        statusCode: 429,
        code: 'PROVIDER_RATE_LIMITED',
        retryAfterSeconds: 840,
      }),
    );
    expect(view.description).toBe(
      'Apollo accepts requests again in 14 minutes.',
    );
    expect(view.canRetry).toBe(false);
  });

  it.each([
    [30, '1 minute'],
    [60, '1 minute'],
    [61, '2 minutes'],
  ])('rounds %i seconds up to %s', (seconds, label) => {
    const view = describeApiError(
      apiError({
        statusCode: 429,
        code: 'PROVIDER_RATE_LIMITED',
        retryAfterSeconds: seconds,
      }),
    );
    expect(view.description).toContain(label);
  });

  it('does not offer a retry for a plan restriction', () => {
    const view = describeApiError(apiError({ code: 'PROVIDER_ACCESS_DENIED' }));
    expect(view.canRetry).toBe(false);
  });

  it('offers a retry for a timeout', () => {
    const view = describeApiError(
      apiError({ statusCode: 504, code: 'PROVIDER_TIMEOUT' }),
    );
    expect(view.eyebrow).toBe('504 · Timeout');
    expect(view.canRetry).toBe(true);
  });

  it('keeps the error code and request id for support', () => {
    const view = describeApiError(
      apiError({ code: 'PROVIDER_ACCESS_DENIED', requestId: 'abc-123' }),
    );
    expect(view.detail).toBe('PROVIDER_ACCESS_DENIED · request abc-123');
  });

  it('does not show raw server messages for unexpected errors', () => {
    const view = describeApiError(
      apiError({
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'TypeError at foo.ts:12',
      }),
    );
    expect(view.description).not.toContain('TypeError');
  });

  it('treats a non-API error as an unreachable server', () => {
    const view = describeApiError(new TypeError('Failed to fetch'));
    expect(view.title).toBe("Couldn't reach the LeadForge server");
    expect(view.canRetry).toBe(true);
  });
});
