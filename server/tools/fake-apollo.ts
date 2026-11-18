/**
 * Fake Apollo API for the endpoint the Free plan can't call (People API Search).
 * Run `npm run apollo:fake`, then set APOLLO_BASE_URL=http://127.0.0.1:4010/api/v1.
 * The NestJS code doesn't change: it can't tell this from api.apollo.io.
 *
 * Every other request is passed through to the real Apollo with the same key,
 * so company enrichment stays live (and still costs credits).
 *
 * Responses follow Apollo's documented shapes. Trigger failures with q_keywords:
 * test:empty, test:rate-limit, test:platform-limit, test:access-denied,
 * test:invalid, test:unavailable, test:timeout.
 */
import { createHash, randomUUID } from 'node:crypto';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { request as httpsRequest } from 'node:https';

const PORT = Number(process.env.FAKE_APOLLO_PORT ?? 4010);
const LIVE_APOLLO = 'https://api.apollo.io';
const MAX_PAGES = 500;

// Free-plan limits for search endpoints. Fixed windows: each one starts with the
// first request after the previous window ended, not on the clock.
const WINDOWS = {
  minute: { limit: 50, ms: 60_000, header: 'minute' },
  hour: { limit: 200, ms: 3_600_000, header: 'hourly' },
  day: { limit: 600, ms: 86_400_000, header: '24-hour' },
} as const;
type WindowName = keyof typeof WINDOWS;
const usage = new Map<WindowName, { startedAt: number; used: number }>();

const FIRST_NAMES = [
  'Ines',
  'Jonas',
  'Yusuf',
  'Amara',
  'Liam',
  'Sofia',
  'Mateo',
  'Priya',
  'Noah',
  'Hana',
  'Elias',
  'Zara',
  'Omar',
  'Lena',
  'Kenji',
  'Maya',
  'Arjun',
  'Clara',
  'Theo',
  'Nadia',
];
const LAST_NAMES = [
  'Hudson',
  'Keller',
  'Okafor',
  'Lindqvist',
  'Moreau',
  'Tanaka',
  'Fischer',
  'Romero',
  'Novak',
  'Haddad',
  'Walsh',
  'Ivanova',
  'Mensah',
  'Costa',
  'Brennan',
  'Sato',
  'Weber',
  'Duarte',
  'Kowalski',
  'Nair',
];
const TITLES = [
  'Chief Technology Officer',
  'VP of Engineering',
  'Head of Sales',
  'Director of Marketing',
  'Engineering Manager',
  'Senior Software Engineer',
  'Founder & CEO',
  'Product Manager',
  'Head of Growth',
  'Data Engineer',
];
const COMPANIES = [
  'Corvid Analytics',
  'Northwind Labs',
  'Bluefin Logistics',
  'Quarry Health',
  'Ledgerline',
  'Halcyon Robotics',
  'Fernhill Software',
  'Tidewater Energy',
  'Copperleaf AI',
  'Brightpath Learning',
];

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  if (
    req.method === 'POST' &&
    url.pathname === '/api/v1/mixed_people/api_search'
  ) {
    searchPeople(req, res, url);
  } else {
    passThrough(req, res, url);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(
    `Fake Apollo on http://127.0.0.1:${PORT}/api/v1 (people search faked, everything else → ${LIVE_APOLLO})`,
  );
});

function searchPeople(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): void {
  const query = url.searchParams;
  if (!req.headers['x-api-key']) {
    // What the live API returned for a missing key on 2026-11-11.
    return sendJson(
      res,
      422,
      errorBody(
        'AUTH.AUTHENTICATION.API_KEY_REQUIRED',
        'This endpoint needs an API key, and the request did not carry one.',
      ),
    );
  }

  const rateLimit = countRequest(Date.now());
  if (rateLimit.exhausted) {
    const { name, retryAfterSeconds } = rateLimit.exhausted;
    log(url, `429 (${name} window used up)`);
    return sendJson(
      res,
      429,
      errorBody(
        'USAGE.RATE_LIMIT.API_RATE_LIMIT_EXCEEDED',
        'You have made more API requests than your plan allows in this time window.',
        {
          context: {
            window: {
              value: name,
              description: 'The rate limit window that was exhausted',
            },
          },
        },
      ),
      { ...rateLimit.headers, 'retry-after': String(retryAfterSeconds) },
    );
  }

  const keywords = query.get('q_keywords') ?? '';
  const scenario = SCENARIOS[keywords];
  if (scenario) {
    log(url, `scenario ${keywords}`);
    return scenario(res, rateLimit.headers);
  }

  const page = positiveInt(query.get('page'), 1);
  // The docs give 100 as the maximum page size.
  const perPage = Math.min(positiveInt(query.get('per_page'), 10), 100);
  const titles = query.getAll('person_titles[]');
  // Same filters → same results, whatever the page: paging works like a real search.
  const searchKey = [...query.entries()]
    .filter(([key]) => key !== 'page' && key !== 'per_page')
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('&');
  const [high, low] = numbers(searchKey);
  // Up to 60,000, so broad searches go past what 500 pages can show.
  const totalEntries =
    keywords === 'test:empty' ? 0 : 1 + ((high * 256 + low) % 60_000);

  const first = (page - 1) * perPage;
  // Apollo serves 500 pages at most; past the last result the list is just empty.
  const count =
    page > MAX_PAGES ? 0 : Math.max(0, Math.min(perPage, totalEntries - first));
  const people = Array.from({ length: count }, (_, index) =>
    fakePerson(searchKey, first + index, titles),
  );

  log(url, `200 total_entries=${totalEntries} people=${people.length}`);
  sendJson(
    res,
    200,
    { total_entries: totalEntries, people },
    rateLimit.headers,
  );
}

type Scenario = (res: ServerResponse, headers: Record<string, string>) => void;

const SCENARIOS: Record<string, Scenario> = {
  'test:rate-limit': (res, headers) =>
    sendJson(
      res,
      429,
      errorBody(
        'USAGE.RATE_LIMIT.API_RATE_LIMIT_EXCEEDED',
        'You have made more API requests than your plan allows in this time window.',
        {
          context: {
            window: {
              value: 'hour',
              description: 'The rate limit window that was exhausted',
            },
          },
        },
      ),
      { ...headers, 'retry-after': '1800' },
    ),
  // Apollo-wide load: no Retry-After header, only a suggestion in the body.
  'test:platform-limit': (res) =>
    sendJson(
      res,
      429,
      errorBody(
        'USAGE.RATE_LIMIT.PLATFORM_RATE_LIMIT',
        'Apollo is receiving too many requests right now.',
        {
          suggestions: [
            {
              label: 'Retry the request after a short wait.',
              retry_after_seconds: 60,
            },
          ],
        },
      ),
    ),
  // The real body from the task 1.4 access check.
  'test:access-denied': (res) =>
    sendJson(res, 403, {
      error:
        'This API key is not authorized to access api/v1/mixed_people/api_search. Request an API key from your administrator that includes this endpoint in its configured scope.',
      error_code: 'API_INACCESSIBLE',
      ...errorBody(
        'AUTH.AUTHORIZATION.ENDPOINT_ACCESS_DENIED',
        'Your team is not permitted to call this endpoint.',
        {
          context: {
            endpoint: {
              value: 'api/v1/mixed_people/api_search',
              description: 'The endpoint your request named',
            },
          },
        },
      ),
    }),
  // The documented 422 example has no error_details: only the status says what happened.
  'test:invalid': (res) => sendJson(res, 422, { error: 'Invalid parameters' }),
  'test:unavailable': (res) => {
    res.writeHead(500, { 'content-type': 'text/html' });
    res.end('<html><body>Internal Server Error</body></html>');
  },
  // Longer than the server's 10 s timeout.
  'test:timeout': (res, headers) => {
    setTimeout(
      () => sendJson(res, 200, { total_entries: 0, people: [] }, headers),
      15_000,
    );
  },
};

function fakePerson(searchKey: string, position: number, titles: string[]) {
  const n = numbers(`${searchKey}#${position}`);
  const lastName = LAST_NAMES[n[1] % LAST_NAMES.length];
  const title =
    n[2] % 12 === 0
      ? null
      : titles.length > 0
        ? titles[n[3] % titles.length]
        : TITLES[n[3] % TITLES.length];
  const refreshedDaysAgo = n[7] % 120;
  return {
    id: createHash('sha1')
      .update(`${searchKey}#${position}`)
      .digest('hex')
      .slice(0, 24),
    first_name: FIRST_NAMES[n[0] % FIRST_NAMES.length],
    // Documented format: first two characters, asterisks, last character.
    last_name_obfuscated: `${lastName.slice(0, 2)}***${lastName.slice(-1)}`,
    title,
    last_refreshed_at: new Date(
      Date.UTC(2026, 10, 1) - refreshedDaysAgo * 86_400_000,
    ).toISOString(),
    has_email: n[4] % 4 !== 0,
    has_city: n[5] % 3 !== 0,
    has_state: n[5] % 3 !== 0,
    has_country: n[5] % 5 !== 0,
    has_direct_phone:
      n[6] % 3 === 0
        ? 'Yes'
        : 'Maybe: please request direct dial via people/bulk_match',
    organization: {
      name: COMPANIES[n[8] % COMPANIES.length],
      has_industry: true,
      has_phone: n[9] % 2 === 0,
      has_city: true,
      has_state: true,
      has_country: true,
      has_zip_code: n[9] % 3 !== 0,
      has_revenue: n[10] % 2 === 0,
      has_employee_count: true,
    },
  };
}

function countRequest(now: number): {
  headers: Record<string, string>;
  exhausted: { name: WindowName; retryAfterSeconds: number } | null;
} {
  const names = Object.keys(WINDOWS) as WindowName[];
  let exhausted: { name: WindowName; retryAfterSeconds: number } | null = null;
  for (const name of names) {
    const window = WINDOWS[name];
    let state = usage.get(name);
    if (!state || now - state.startedAt >= window.ms) {
      state = { startedAt: now, used: 0 };
      usage.set(name, state);
    }
    if (!exhausted && state.used >= window.limit) {
      exhausted = {
        name,
        retryAfterSeconds: Math.ceil(
          (state.startedAt + window.ms - now) / 1000,
        ),
      };
    }
  }
  // A refused request doesn't count against the limit.
  const headers: Record<string, string> = {};
  for (const name of names) {
    const window = WINDOWS[name];
    const state = usage.get(name)!;
    if (!exhausted) {
      state.used += 1;
    }
    headers[`x-rate-limit-${window.header}`] = String(window.limit);
    headers[`x-${window.header}-usage`] = String(state.used);
    headers[`x-${window.header}-requests-left`] = String(
      Math.max(0, window.limit - state.used),
    );
  }
  return { headers, exhausted };
}

function passThrough(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): void {
  log(url, `passed through to ${LIVE_APOLLO}`);
  const upstream = httpsRequest(
    `${LIVE_APOLLO}${url.pathname}${url.search}`,
    { method: req.method, headers: { ...req.headers, host: 'api.apollo.io' } },
    (live) => {
      res.writeHead(live.statusCode ?? 502, live.headers);
      live.pipe(res);
    },
  );
  upstream.on('error', (error) => {
    if (res.headersSent) {
      res.destroy(error);
    } else {
      sendJson(res, 502, {
        error: `Fake Apollo couldn't reach ${LIVE_APOLLO}: ${error.message}`,
      });
    }
  });
  req.pipe(upstream);
}

function errorBody(code: string, message: string, extra: object = {}) {
  return {
    error_details: { code, message, suggestions: [], context: {}, ...extra },
  };
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'x-request-id': randomUUID(),
    ...headers,
  });
  res.end(JSON.stringify(body));
}

/** Deterministic pseudo-random bytes for a key. */
function numbers(key: string): number[] {
  return [...createHash('sha1').update(key).digest()];
}

function positiveInt(value: string | null, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

// Path and query only: the x-api-key header is never printed.
function log(url: URL, outcome: string): void {
  console.log(
    `${new Date().toISOString().slice(11, 19)} ${url.pathname}${url.search ? `?${decodeURIComponent(url.search.slice(1))}` : ''} → ${outcome}`,
  );
}
