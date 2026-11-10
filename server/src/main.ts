import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { Env } from './config/env.schema.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  // Nest ignores SIGINT/SIGTERM by default, so onModuleDestroy (closing the DB pool) would never run.
  app.enableShutdownHooks();

  const port = app
    .get<ConfigService<Env, true>>(ConfigService)
    .get('PORT', { infer: true });

  await app.listen(port);
  Logger.log(`Listening on http://localhost:${port}/api`, 'Bootstrap');
}

await bootstrap();
