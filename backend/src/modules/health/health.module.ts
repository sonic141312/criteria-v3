import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';

/**
 * Phase 2 placeholder. The only endpoint is a health check used to verify
 * the application boots and connects to the database.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
