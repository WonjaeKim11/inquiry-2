import { Module, Global } from '@nestjs/common';
import { PinoLoggerService } from './pino-logger.service';

/**
 * 로거 글로벌 모듈.
 * PinoLoggerService를 전역으로 제공한다.
 */
@Global()
@Module({
  providers: [PinoLoggerService],
  exports: [PinoLoggerService],
})
export class LoggerModule {}
