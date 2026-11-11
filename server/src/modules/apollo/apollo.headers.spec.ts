import {
  readRateLimit,
  readRequestId,
  readRetryAfterSeconds,
} from './apollo.headers.js';

describe('readRateLimit', () => {
  it('reads the requests left in each window', () => {
    expect(
      readRateLimit({
        'x-minute-requests-left': '47',
        'x-hourly-requests-left': '197',
        'x-24-hour-requests-left': '596',
      }),
    ).toEqual({ minuteLeft: 47, hourLeft: 197, dayLeft: 596 });
  });

  // Error responses for a bad or missing key carry no rate-limit headers.
  it('returns null for missing or malformed values', () => {
    expect(
      readRateLimit({
        'x-minute-requests-left': '',
        'x-hourly-requests-left': 'n/a',
      }),
    ).toEqual({ minuteLeft: null, hourLeft: null, dayLeft: null });
  });
});

describe('readRequestId', () => {
  it('reads x-request-id', () => {
    expect(readRequestId({ 'x-request-id': 'abc-123' })).toBe('abc-123');
    expect(readRequestId({})).toBeNull();
  });
});

describe('readRetryAfterSeconds', () => {
  const now = Date.parse('2026-11-11T10:00:00Z');

  it('reads seconds', () => {
    expect(readRetryAfterSeconds({ 'retry-after': '60' }, now)).toBe(60);
  });

  it('converts an HTTP date into seconds from now', () => {
    expect(
      readRetryAfterSeconds(
        { 'retry-after': 'Wed, 11 Nov 2026 10:01:30 GMT' },
        now,
      ),
    ).toBe(90);
  });

  it.each([{}, { 'retry-after': 'soon' }])('returns null for %j', (headers) => {
    expect(readRetryAfterSeconds(headers, now)).toBeNull();
  });
});
