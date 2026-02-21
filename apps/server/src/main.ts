/**
 * NestJS 서버 부트스트랩.
 * CORS, 쿠키 파서, ValidationPipe를 글로벌로 설정한다.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // CORS: 클라이언트 도메인에서의 요청 허용 (쿠키 포함)
  app.enableCors({
    origin: process.env['CLIENT_URL'] || 'http://localhost:4200',
    credentials: true,
  });

  // 쿠키 파서: refresh token 읽기용
  app.use(cookieParser());

  // 글로벌 ValidationPipe: class-validator 기반 DTO 검증
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성 제거
      forbidNonWhitelisted: true, // 정의되지 않은 속성이 있으면 에러
      transform: true, // 요청 데이터를 DTO 인스턴스로 변환
    })
  );

  const port = process.env['PORT'] || 3000;
  await app.listen(port);
  Logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
