import { envSchema } from './env.schema.js';

const DATABASE_URL = 'postgresql://user:secret@127.0.0.1:5434/leadforge';
const required = { DATABASE_URL, APOLLO_API_KEY: 'test-key' };

describe('envSchema', () => {
  it('applies defaults to optional variables', () => {
    expect(envSchema.parse(required)).toEqual({
      NODE_ENV: 'development',
      PORT: 4000,
      CORS_ORIGIN: 'http://localhost:3000',
      DATABASE_URL,
      APOLLO_API_KEY: 'test-key',
      APOLLO_BASE_URL: 'https://api.apollo.io/api/v1',
      APOLLO_TIMEOUT_MS: 10_000,
    });
  });

  it.each(['DATABASE_URL', 'APOLLO_API_KEY'])('requires %s', (name) => {
    const env: Record<string, string> = { ...required };
    delete env[name];
    expect(envSchema.safeParse(env).success).toBe(false);
  });

  it.each([DATABASE_URL, 'postgres://user:secret@db.internal:5432/leadforge'])(
    'accepts DATABASE_URL=%s',
    (url) => {
      expect(
        envSchema.safeParse({ ...required, DATABASE_URL: url }).success,
      ).toBe(true);
    },
  );

  it('rejects a non-Postgres DATABASE_URL', () => {
    const result = envSchema.safeParse({
      ...required,
      DATABASE_URL: 'mysql://user:secret@127.0.0.1:3306/leadforge',
    });
    expect(result.success).toBe(false);
  });

  it('converts PORT from a string to a number', () => {
    expect(envSchema.parse({ ...required, PORT: '5000' }).PORT).toBe(5000);
  });

  it.each(['abc', '', '0', '70000', '3.5'])('rejects PORT=%j', (port) => {
    expect(envSchema.safeParse({ ...required, PORT: port }).success).toBe(
      false,
    );
  });

  it('rejects a CORS_ORIGIN with a trailing slash', () => {
    const result = envSchema.safeParse({
      ...required,
      CORS_ORIGIN: 'http://localhost:3000/',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown NODE_ENV', () => {
    const result = envSchema.safeParse({ ...required, NODE_ENV: 'staging' });
    expect(result.success).toBe(false);
  });

  it('rejects a blank APOLLO_API_KEY', () => {
    const result = envSchema.safeParse({ ...required, APOLLO_API_KEY: '   ' });
    expect(result.success).toBe(false);
  });

  it('accepts a local http APOLLO_BASE_URL for the fake server', () => {
    const env = envSchema.parse({
      ...required,
      APOLLO_BASE_URL: 'http://127.0.0.1:4010/api/v1',
    });
    expect(env.APOLLO_BASE_URL).toBe('http://127.0.0.1:4010/api/v1');
  });

  it.each(['https://api.apollo.io/api/v1/', 'ftp://api.apollo.io'])(
    'rejects APOLLO_BASE_URL=%s',
    (url) => {
      const result = envSchema.safeParse({ ...required, APOLLO_BASE_URL: url });
      expect(result.success).toBe(false);
    },
  );

  it('converts APOLLO_TIMEOUT_MS to a number', () => {
    const env = envSchema.parse({ ...required, APOLLO_TIMEOUT_MS: '2500' });
    expect(env.APOLLO_TIMEOUT_MS).toBe(2500);
  });
});
