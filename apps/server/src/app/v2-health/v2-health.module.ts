import { Module } from '@nestjs/common';
import { V2HealthController } from './v2-health.controller';

/**
 * v2 API 헬스 체크 모듈 (스텁).
 * RouterModule로 /api/v2 경로에 마운트된다.
 */
@Module({
  controllers: [V2HealthController],
})
export class V2HealthModule {}
