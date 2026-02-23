import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyModule } from '@inquiry/server-api-key';
import { ManagementMeController } from './controllers/management-me.controller';
import { ManagementSurveyController } from './controllers/management-survey.controller';
import { ManagementResponseController } from './controllers/management-response.controller';
import { ManagementContactController } from './controllers/management-contact.controller';
import { ManagementStorageController } from './controllers/management-storage.controller';
import { ManagementMeService } from './services/management-me.service';
import { ManagementSurveyService } from './services/management-survey.service';
import { ManagementResponseService } from './services/management-response.service';
import { ManagementContactService } from './services/management-contact.service';
import { ManagementStorageService } from './services/management-storage.service';

/**
 * Management API 모듈.
 * API Key 인증 기반의 관리 API 엔드포인트를 제공한다.
 * RouterModule로 `/v1/management` 경로에 마운트된다.
 *
 * 제공 기능:
 * - API Key 인증 정보 조회 (Me)
 * - 설문 CRUD (Survey)
 * - 응답 관리 (Response)
 * - 연락처 관리 (Contact)
 * - 파일 업로드 (Storage)
 *
 * 인증/인가:
 * - ApiKeyAuthGuard: x-api-key 헤더로 API Key 인증
 * - RequirePermissionGuard: 환경별 READ/WRITE/MANAGE 권한 검증
 * - ApiRateLimitGuard: 분당 100건 Rate Limiting
 */
@Module({
  imports: [ConfigModule, ApiKeyModule],
  controllers: [
    ManagementMeController,
    ManagementSurveyController,
    ManagementResponseController,
    ManagementContactController,
    ManagementStorageController,
  ],
  providers: [
    ManagementMeService,
    ManagementSurveyService,
    ManagementResponseService,
    ManagementContactService,
    ManagementStorageService,
  ],
})
export class ManagementApiModule {}
