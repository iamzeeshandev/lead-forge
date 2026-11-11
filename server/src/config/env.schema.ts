import { z } from 'zod';

/**
 * Environment variables the server needs. ConfigModule checks them once at
 * startup, so a missing or invalid value stops the app before it serves traffic.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  // Browsers send the Origin header without a trailing slash, so
  // "http://localhost:3000/" would never match and every CORS request would fail.
  CORS_ORIGIN: z
    .url()
    .refine((value) => !value.endsWith('/'), 'must not end with a slash')
    .default('http://localhost:3000'),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  APOLLO_API_KEY: z.string().trim().min(1),
  // http is allowed so the key can point at a local fake Apollo server.
  APOLLO_BASE_URL: z
    .url({ protocol: /^https?$/ })
    .refine((value) => !value.endsWith('/'), 'must not end with a slash')
    .default('https://api.apollo.io/api/v1'),
  APOLLO_TIMEOUT_MS: z.coerce.number().int().min(1).max(60_000).default(10_000),
});

export type Env = z.infer<typeof envSchema>;
