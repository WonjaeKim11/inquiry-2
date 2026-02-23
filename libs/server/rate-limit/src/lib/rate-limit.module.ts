import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorageRedisService } from './throttler-storage-redis.service';

/**
 * Rate Limiting 모듈.
 * @nestjs/throttler를 기반으로 API 요청 속도를 제한한다.
 * Redis가 연결되면 Redis 스토리지 사용, 아니면 메모리 폴백.
 * RATE_LIMIT_DISABLED=true 설정 시 매우 높은 한도로 사실상 비활성화.
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService, ThrottlerStorageRedisService],
      useFactory: (
        configService: ConfigService,
        storage: ThrottlerStorageRedisService
      ) => {
        const disabled =
          configService.get<string>('RATE_LIMIT_DISABLED') === 'true';
        return {
          throttlers: [
            {
              name: 'default',
              ttl: 60000,
              limit: disabled ? 999999 : 100,
            },
          ],
          storage,
        };
      },
    }),
  ],
  providers: [ThrottlerStorageRedisService],
  exports: [ThrottlerStorageRedisService],
})
export class RateLimitModule {}
