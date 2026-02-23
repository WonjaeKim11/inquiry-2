import { Module } from '@nestjs/common';
import { SurveyController } from './survey.controller.js';
import { SurveyService } from './services/survey.service.js';
import { SurveyValidationService } from './services/survey-validation.service.js';
import { SurveyTemplateService } from './services/survey-template.service.js';

/**
 * 설문 모듈.
 * 설문 CRUD, 상태 전이, 발행 검증, 템플릿 기능을 제공한다.
 * AuditLogModule, ServerPrismaModule은 @Global()이므로 별도 import 불필요.
 */
@Module({
  controllers: [SurveyController],
  providers: [SurveyService, SurveyValidationService, SurveyTemplateService],
  exports: [SurveyService, SurveyValidationService, SurveyTemplateService],
})
export class SurveyModule {}
