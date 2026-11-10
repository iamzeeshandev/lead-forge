import { type INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import type { Env } from '../src/config/env.schema.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

async function createApp(
  prismaOverride?: object,
): Promise<INestApplication<App>> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (prismaOverride) {
    builder = builder.overrideProvider(PrismaService).useValue(prismaOverride);
  }

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}

// Needs the database from docker-compose.yml to be running.
describe('Health (e2e)', () => {
  let app: INestApplication<App>;
  let clientOrigin: string;

  beforeAll(async () => {
    app = await createApp();
    clientOrigin = app
      .get<ConfigService<Env, true>>(ConfigService)
      .get('CORS_ORIGIN', { infer: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health reports the API and database as up', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toMatchObject({ status: 'ok', database: 'up' });
    expect(response.body).toHaveProperty('uptimeSeconds');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('serves routes only under the /api prefix', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });

  it('allows CORS requests from the client origin', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', clientOrigin)
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe(clientOrigin);
  });

  // CORS is enforced by the browser, not the server. The server always
  // announces the one allowed origin; a browser on any other site sees the
  // mismatch and blocks the response. Non-browser clients (curl) are unaffected.
  it('announces only the client origin to other sites', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'https://other-site.example')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe(clientOrigin);
  });
});

describe('Health (e2e) with the database down', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    app = await createApp({
      $queryRaw: () => Promise.reject(new Error("Can't reach database server")),
    });
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('GET /api/health returns 503 with the database marked down', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(503);

    expect(response.body).toMatchObject({ status: 'error', database: 'down' });
  });
});
