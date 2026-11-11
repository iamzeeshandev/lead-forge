import { readFileSync } from 'node:fs';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { type INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

const API_KEY = 'e2e-test-key';
const fixture: unknown = JSON.parse(
  readFileSync(
    new URL(
      '../src/modules/apollo/__fixtures__/organization-enrich.apollo-io.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

type Reply = (req: IncomingMessage, res: ServerResponse) => void;

// A stand-in for api.apollo.io: the server only knows APOLLO_BASE_URL, so it
// can't tell the difference.
const received: Array<{ url: string; apiKey: unknown }> = [];
let reply: Reply = (_req, res) => res.end();
const fakeApollo = createServer((req, res) => {
  received.push({ url: req.url ?? '', apiKey: req.headers['x-api-key'] });
  reply(req, res);
});

function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Reply {
  return (_req, res) => {
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'x-request-id': 'fake-request-1',
      ...headers,
    });
    res.end(JSON.stringify(body));
  };
}

const enrich = (app: INestApplication<App>, domain: string) =>
  request(app.getHttpServer())
    .get('/api/apollo/organizations/enrich')
    .query({ domain });

describe('Apollo organization enrichment (e2e)', () => {
  let app: INestApplication<App>;
  const logs: string[] = [];

  beforeAll(async () => {
    await new Promise<void>((resolve) =>
      fakeApollo.listen(0, '127.0.0.1', resolve),
    );
    const { port } = fakeApollo.address() as AddressInfo;

    // Set before AppModule is imported: ConfigModule reads process.env at import
    // time. These win over server/.env, so the real key is never sent here.
    vi.stubEnv('APOLLO_BASE_URL', `http://127.0.0.1:${port}/api/v1`);
    vi.stubEnv('APOLLO_API_KEY', API_KEY);
    vi.stubEnv('APOLLO_TIMEOUT_MS', '300');
    for (const level of ['log', 'warn', 'error'] as const) {
      vi.spyOn(Logger.prototype, level).mockImplementation(
        (message: unknown) => {
          logs.push(String(message));
        },
      );
    }

    const { AppModule } = await import('../src/app.module.js');
    const { configureApp } = await import('../src/app.setup.js');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    fakeApollo.closeAllConnections();
    await new Promise((resolve) => fakeApollo.close(resolve));
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    received.length = 0;
  });

  it('returns the mapped company and sends the API key', async () => {
    reply = json(200, fixture, { 'x-minute-requests-left': '49' });

    const response = await enrich(app, 'apollo.io').expect(200);

    expect(response.body).toMatchObject({
      source: 'apollo',
      externalId: '5e66b6381e05b4008c8331b8',
      name: 'Apollo.io',
      domain: 'apollo.io',
      employeeCount: 800,
      annualRevenue: 150_000_000,
    });
    expect(received).toEqual([
      { url: '/api/v1/organizations/enrich?domain=apollo.io', apiKey: API_KEY },
    ]);
  });

  it('normalises the domain before calling Apollo', async () => {
    reply = json(200, fixture);

    await enrich(app, 'https://WWW.Apollo.io/pricing').expect(200);

    expect(received[0]?.url).toBe(
      '/api/v1/organizations/enrich?domain=apollo.io',
    );
  });

  it('rejects an invalid domain without calling Apollo', async () => {
    const response = await enrich(app, 'not a domain').expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'domain: Enter a domain such as acme.com.',
    });
    expect(received).toHaveLength(0);
  });

  it('answers 404 when Apollo finds no company (a 200 with {})', async () => {
    reply = json(200, {});

    const response = await enrich(app, 'unknown.example').expect(404);

    expect(response.body).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Apollo has no company for unknown.example.',
    });
  });

  it('passes a rate limit on as 429 with Retry-After', async () => {
    reply = json(
      429,
      {
        error_details: {
          code: 'USAGE.RATE_LIMIT.API_RATE_LIMIT_EXCEEDED',
          message: 'You have made more API requests than your plan allows.',
          context: { window: { value: 'minute' } },
        },
      },
      { 'retry-after': '42' },
    );

    const response = await enrich(app, 'apollo.io').expect(429);

    expect(response.headers['retry-after']).toBe('42');
    expect(response.body).toEqual({
      statusCode: 429,
      code: 'PROVIDER_RATE_LIMITED',
      message: "Apollo's request limit is used up.",
      retryAfterSeconds: 42,
      requestId: 'fake-request-1',
    });
  });

  it.each([
    [401, 'AUTH.AUTHENTICATION.API_KEY_INVALID'],
    [422, 'AUTH.AUTHENTICATION.API_KEY_REQUIRED'],
    [403, 'AUTH.AUTHORIZATION.ENDPOINT_ACCESS_DENIED'],
  ])('reports Apollo %i %s as a 502', async (status, code) => {
    reply = json(status, { error_details: { code, message: '...' } });

    const response = await enrich(app, 'apollo.io').expect(502);

    expect(response.body).toMatchObject({ code: 'PROVIDER_ACCESS_DENIED' });
  });

  it('reports an Apollo server error as a 502', async () => {
    reply = (_req, res) => {
      res.writeHead(500, { 'content-type': 'text/html' });
      res.end('<html>Internal Server Error</html>');
    };

    const response = await enrich(app, 'apollo.io').expect(502);

    expect(response.body).toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
  });

  it('gives up after APOLLO_TIMEOUT_MS', async () => {
    reply = () => undefined;

    const response = await enrich(app, 'apollo.io').expect(504);

    expect(response.body).toMatchObject({ code: 'PROVIDER_TIMEOUT' });
  });

  it('wraps unknown API routes in the error envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/nope')
      .expect(404);

    expect(response.body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('logs every Apollo call without the API key', () => {
    const apolloLines = logs.filter((line) =>
      line.startsWith('GET /organizations/enrich'),
    );

    expect(apolloLines.length).toBeGreaterThanOrEqual(8);
    expect(apolloLines[0]).toMatch(
      /^GET \/organizations\/enrich \| 200 \| \d+ms \| left 49\/min \?\/h \?\/day \| req fake-request-1$/,
    );
    expect(logs.join('\n')).not.toContain(API_KEY);
  });
});
