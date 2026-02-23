import { Module, Global } from '@nestjs/common';
import { SentryService } from './sentry.service';

/**
 * Sentry 글로벌 모듈.
 * @Global()로 등록하여 어디서든 SentryService를 주입받을 수 있다.
 */
@Global()
@Module({
  providers: [SentryService],
  exports: [SentryService],
})
export class SentryModule {}
