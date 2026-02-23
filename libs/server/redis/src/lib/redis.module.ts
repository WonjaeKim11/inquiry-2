import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Redis 글로벌 모듈.
 * @Global()로 등록하여 어디서든 RedisService를 주입받을 수 있다.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
