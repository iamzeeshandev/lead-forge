import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import type { Env } from '../src/config/env.schema.js';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;
  let clientOrigin: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    clientOrigin = app
      .get<ConfigService<Env, true>>(ConfigService)
      .get('CORS_ORIGIN', { infer: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health returns ok', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toMatchObject({ status: 'ok' });
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
