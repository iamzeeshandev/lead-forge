import { envSchema } from './env.schema.js';

describe('envSchema', () => {
  it('applies defaults when variables are missing', () => {
    expect(envSchema.parse({})).toEqual({
      NODE_ENV: 'development',
      PORT: 4000,
      CORS_ORIGIN: 'http://localhost:3000',
    });
  });

  it('converts PORT from a string to a number', () => {
    expect(envSchema.parse({ PORT: '5000' }).PORT).toBe(5000);
  });

  it.each(['abc', '', '0', '70000', '3.5'])('rejects PORT=%j', (port) => {
    expect(envSchema.safeParse({ PORT: port }).success).toBe(false);
  });

  it('rejects a CORS_ORIGIN with a trailing slash', () => {
    const result = envSchema.safeParse({
      CORS_ORIGIN: 'http://localhost:3000/',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(envSchema.safeParse({ NODE_ENV: 'staging' }).success).toBe(false);
  });
});
