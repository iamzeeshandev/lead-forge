import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService, type HealthStatus } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const health = await this.healthService.check();

    // Monitors and load balancers decide on the status code, not the body.
    if (health.status === 'error') {
      throw new ServiceUnavailableException(health);
    }

    return health;
  }
}
