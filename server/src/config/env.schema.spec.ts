import { envSchema } from './env.schema.js';

const DATABASE_URL = 'postgresql://user:secret@127.0.0.1:5434/leadforge';

describe('envSchema', () => {
  it('applies defaults to optional variables', () => {
    expect(envSchema.parse({ DATABASE_URL })).toEqual({
      NODE_ENV: 'development',
      PORT: 4000,
      CORS_ORIGIN: 'http://localhost:3000',
      DATABASE_URL,
    });
  });

  it('requires DATABASE_URL', () => {
    expect(envSchema.safeParse({}).success).toBe(false);
  });

  it.each([DATABASE_URL, 'postgres://user:secret@db.internal:5432/leadforge'])(
    'accepts DATABASE_URL=%s',
    (url) => {
      expect(envSchema.safeParse({ DATABASE_URL: url }).success).toBe(true);
    },
  );

  it('rejects a non-Postgres DATABASE_URL', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'mysql://user:secret@127.0.0.1:3306/leadforge',
    });
    expect(result.success).toBe(false);
  });

  it('converts PORT from a string to a number', () => {
    expect(envSchema.parse({ DATABASE_URL, PORT: '5000' }).PORT).toBe(5000);
  });

  it.each(['abc', '', '0', '70000', '3.5'])('rejects PORT=%j', (port) => {
    expect(envSchema.safeParse({ DATABASE_URL, PORT: port }).success).toBe(
      false,
    );
  });

  it('rejects a CORS_ORIGIN with a trailing slash', () => {
    const result = envSchema.safeParse({
      DATABASE_URL,
      CORS_ORIGIN: 'http://localhost:3000/',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown NODE_ENV', () => {
    const result = envSchema.safeParse({ DATABASE_URL, NODE_ENV: 'staging' });
    expect(result.success).toBe(false);
  });
});
