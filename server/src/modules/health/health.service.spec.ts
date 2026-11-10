import { Logger } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { HealthService } from './health.service.js';

function createHealthService(queryRaw: () => Promise<unknown>): HealthService {
  const prisma = { $queryRaw: vi.fn(queryRaw) };
  return new HealthService(prisma as unknown as PrismaService);
}

describe('HealthService', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports ok when the database answers', async () => {
    const health = await createHealthService(() =>
      Promise.resolve([{ '?column?': 1 }]),
    ).check();

    expect(health).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('reports an error when the database query fails', async () => {
    const health = await createHealthService(() =>
      Promise.reject(new Error("Can't reach database server")),
    ).check();

    expect(health).toMatchObject({ status: 'error', database: 'down' });
  });
});
