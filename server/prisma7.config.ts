import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// The Prisma CLI runs outside Nest, so ConfigModule never loads .env for it.
// The file is optional so `prisma generate` still works on a fresh clone or in CI.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
