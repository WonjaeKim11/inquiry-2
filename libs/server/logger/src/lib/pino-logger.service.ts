import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';

/**
 * Pino 기반 로거 서비스.
 * NestJS LoggerService 인터페이스를 구현하여 내장 로거를 대체한다.
 * 개발 환경: pino-pretty 포매팅, 프로덕션: JSON 구조화 로그
 */
@Injectable()
export class PinoLoggerService implements NestLoggerService {
  private readonly logger: pino.Logger;

  constructor() {
    const isDev = process.env['NODE_ENV'] !== 'production';
    this.logger = pino({
      level: process.env['LOG_LEVEL'] || (isDev ? 'debug' : 'info'),
      ...(isDev && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }),
    });
  }

  /** Pino 인스턴스를 직접 반환 (감사 로그 등에서 사용) */
  getPinoInstance(): pino.Logger {
    return this.logger;
  }

  log(message: string, ...optionalParams: unknown[]) {
    const context = optionalParams[optionalParams.length - 1];
    if (typeof context === 'string') {
      this.logger.info({ context }, message);
    } else {
      this.logger.info(message);
    }
  }

  error(message: string, ...optionalParams: unknown[]) {
    const trace = optionalParams[0];
    const context = optionalParams[1];
    if (typeof context === 'string') {
      this.logger.error({ context, err: trace }, message);
    } else {
      this.logger.error({ err: trace }, message);
    }
  }

  warn(message: string, ...optionalParams: unknown[]) {
    const context = optionalParams[optionalParams.length - 1];
    if (typeof context === 'string') {
      this.logger.warn({ context }, message);
    } else {
      this.logger.warn(message);
    }
  }

  debug(message: string, ...optionalParams: unknown[]) {
    const context = optionalParams[optionalParams.length - 1];
    if (typeof context === 'string') {
      this.logger.debug({ context }, message);
    } else {
      this.logger.debug(message);
    }
  }

  verbose(message: string, ...optionalParams: unknown[]) {
    const context = optionalParams[optionalParams.length - 1];
    if (typeof context === 'string') {
      this.logger.trace({ context }, message);
    } else {
      this.logger.trace(message);
    }
  }
}
