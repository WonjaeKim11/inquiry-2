/**
 * NestJS 서버 부트스트랩.
 * CORS, 쿠키 파서, ValidationPipe, Pino Logger, GlobalExceptionFilter를 설정한다.
 */

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app/app.module';
import { PinoLoggerService } from '@inquiry/server-logger';
import { SentryService } from '@inquiry/server-sentry';
import { GlobalExceptionFilter } from '@inquiry/server-core';
import { validateEnv } from './app/config/env.validation';

async function bootstrap() {
  // 환경변수 검증
  validateEnv();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Pino Logger로 교체
  const logger = app.get(PinoLoggerService);
  app.useLogger(logger);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // CORS: 클라이언트 도메인 + 추가 허용 도메인에서의 요청 허용 (쿠키 포함)
  // CORS_ALLOWED_ORIGINS 환경변수로 쉼표 구분된 추가 도메인을 설정할 수 있다.
  const clientUrl = process.env['CLIENT_URL'] || 'http://localhost:4200';
  const corsOrigins = process.env['CORS_ALLOWED_ORIGINS']
    ? [
        clientUrl,
        ...process.env['CORS_ALLOWED_ORIGINS'].split(',').map((o) => o.trim()),
      ]
    : clientUrl;
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // 쿠키 파서: refresh token 읽기용
  app.use(cookieParser());

  // 글로벌 예외 필터: 표준 에러 응답 + Sentry 통합
  const exceptionFilter = new GlobalExceptionFilter();
  const sentryService = app.get(SentryService);
  exceptionFilter.setSentry(sentryService);
  app.useGlobalFilters(exceptionFilter);

  // 글로벌 ValidationPipe: class-validator 기반 DTO 검증
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const port = process.env['PORT'] || 3000;
  await app.listen(port);
  logger.log(`서버가 실행 중입니다: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
