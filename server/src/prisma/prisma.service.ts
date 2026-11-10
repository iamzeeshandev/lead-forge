import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { Env } from '../config/env.schema.js';
import { PrismaClient } from '../generated/prisma/client.js';

const logger = new Logger('PrismaService');

// No $connect() on startup: the pool connects on the first query, so the API
// still boots while Postgres is down and /api/health can report it.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg(
        {
          connectionString: config.get('DATABASE_URL', { infer: true }),
          // pg defaults to 0 (wait forever), so an unreachable database hangs requests instead of failing them.
          connectionTimeoutMillis: 5_000,
        },
        {
          // Otherwise idle-connection errors (e.g. Postgres restarting) only reach Prisma's debug output.
          onPoolError: (error) =>
            logger.error(`Idle database connection failed: ${error.message}`),
        },
      ),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
