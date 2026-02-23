import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * 헬스 체크 모듈.
 * DB, Redis 상태를 확인하는 엔드포인트를 제공한다.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
