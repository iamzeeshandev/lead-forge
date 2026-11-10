import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export type DependencyStatus = 'up' | 'down';

export interface HealthStatus {
  status: 'ok' | 'error';
  database: DependencyStatus;
  uptimeSeconds: number;
  timestamp: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    const database = await this.checkDatabase();

    return {
      status: database === 'up' ? 'ok' : 'error',
      database,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch (error) {
      // Prisma error messages span several lines; keep one log line per event.
      const reason = (error instanceof Error ? error.message : String(error))
        .replace(/\s+/g, ' ')
        .trim();
      this.logger.warn(`Database check failed: ${reason}`);
      return 'down';
    }
  }
}
