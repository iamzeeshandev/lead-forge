type Headers = Readonly<Record<string, unknown>>;

/** Requests left in each of Apollo's fixed windows, per endpoint and per team. */
export interface ApolloRateLimit {
  minuteLeft: number | null;
  hourLeft: number | null;
  dayLeft: number | null;
}

export function readRateLimit(headers: Headers): ApolloRateLimit {
  return {
    minuteLeft: readCount(headers, 'x-minute-requests-left'),
    hourLeft: readCount(headers, 'x-hourly-requests-left'),
    dayLeft: readCount(headers, 'x-24-hour-requests-left'),
  };
}

/** Apollo's id for the request; support asks for it. */
export function readRequestId(headers: Headers): string | null {
  return readHeader(headers, 'x-request-id');
}

/** `Retry-After` in seconds. HTTP also allows a date; Apollo sends seconds. */
export function readRetryAfterSeconds(
  headers: Headers,
  now = Date.now(),
): number | null {
  const value = readHeader(headers, 'retry-after');
  if (value === null) {
    return null;
  }
  if (/^\d+$/.test(value)) {
    return Number(value);
  }
  const date = Date.parse(value);
  return Number.isNaN(date)
    ? null
    : Math.max(0, Math.ceil((date - now) / 1000));
}

function readCount(headers: Headers, name: string): number | null {
  const value = readHeader(headers, name);
  return value !== null && /^\d+$/.test(value) ? Number(value) : null;
}

function readHeader(headers: Headers, name: string): string | null {
  const raw = headers[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === 'number') {
    return String(value);
  }
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}
