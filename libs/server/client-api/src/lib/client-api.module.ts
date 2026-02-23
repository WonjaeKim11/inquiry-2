import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientEnvironmentController } from './controllers/client-environment.controller';
import { ClientDisplayController } from './controllers/client-display.controller';
import { ClientResponseController } from './controllers/client-response.controller';
import { ClientStorageController } from './controllers/client-storage.controller';
import { ClientUserController } from './controllers/client-user.controller';
import { ClientEnvironmentService } from './services/client-environment.service';
import { ClientDisplayService } from './services/client-display.service';
import { ClientResponseService } from './services/client-response.service';
import { ClientStorageService } from './services/client-storage.service';
import { ClientUserService } from './services/client-user.service';
import { EnvironmentIdGuard } from './guards/environment-id.guard';

/**
 * Client API 모듈.
 * 인증 불필요한 공개 API 엔드포인트를 제공한다.
 * RouterModule로 `/v1/client` 경로에 마운트된다.
 *
 * 제공 기능:
 * - 환경 상태 조회 (Environment)
 * - 설문 노출 기록 (Display)
 * - 설문 응답 생성/수정 (Response)
 * - 파일 업로드 (Storage)
 * - 사용자 식별 (User/Contact)
 */
@Module({
  imports: [ConfigModule],
  controllers: [
    ClientEnvironmentController,
    ClientDisplayController,
    ClientResponseController,
    ClientStorageController,
    ClientUserController,
  ],
  providers: [
    ClientEnvironmentService,
    ClientDisplayService,
    ClientResponseService,
    ClientStorageService,
    ClientUserService,
    EnvironmentIdGuard,
  ],
})
export class ClientApiModule {}
