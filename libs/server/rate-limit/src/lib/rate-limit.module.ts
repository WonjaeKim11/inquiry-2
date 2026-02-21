import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

/**
 * Rate Limiting 모듈.
 * @nestjs/throttler를 기반으로 API 요청 속도를 제한한다.
 * 기본값은 60초당 100회이며, 각 엔드포인트별로 커스텀 데코레이터로 재정의한다.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60초
        limit: 100,
      },
    ]),
  ],
})
export class RateLimitModule {}
