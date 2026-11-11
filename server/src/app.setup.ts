import {
  type INestApplication,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import type { Env } from './config/env.schema.js';

/**
 * App-wide HTTP settings. main.ts and the e2e tests both call this,
 * so the tests run against the same setup as the real server.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix('api');
  // Validates every @Body/@Query/@Param that declares a Zod schema and
  // passes the parsed (coerced) value to the handler.
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }) });
}
