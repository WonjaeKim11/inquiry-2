import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';

/**
 * Sentry 에러 추적 서비스.
 * SENTRY_DSN 미설정 시 no-op으로 동작한다 (EmailService 패턴 동일).
 */
@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const dsn = this.configService.get<string>('SENTRY_DSN');
    if (!dsn) {
      this.logger.warn(
        'SENTRY_DSN이 설정되지 않았습니다. Sentry가 비활성화됩니다.'
      );
      return;
    }

    Sentry.init({
      dsn,
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      tracesSampleRate: 0.1,
    });
    this.initialized = true;
    this.logger.log('Sentry 초기화 완료');
  }

  /** 예외를 Sentry에 보고 */
  captureException(error: unknown) {
    if (!this.initialized) return;
    Sentry.captureException(error);
  }

  /** 메시지를 Sentry에 보고 */
  captureMessage(message: string) {
    if (!this.initialized) return;
    Sentry.captureMessage(message);
  }
}
