import { Module } from '@nestjs/common';
import { ProjectController } from './controllers/project.controller.js';
import { EnvironmentController } from './controllers/environment.controller.js';
import { ActionClassController } from './controllers/action-class.controller.js';
import { LanguageController } from './controllers/language.controller.js';
import { ProjectService } from './services/project.service.js';
import { EnvironmentService } from './services/environment.service.js';
import { ActionClassService } from './services/action-class.service.js';
import { LanguageService } from './services/language.service.js';

/**
 * 프로젝트 모듈.
 * Project, Environment, ActionClass, Language CRUD 엔드포인트를 제공한다.
 * AuditLogModule, ServerPrismaModule, ConfigModule은 @Global()이므로 별도 import 불필요.
 */
@Module({
  controllers: [
    ProjectController,
    EnvironmentController,
    ActionClassController,
    LanguageController,
  ],
  providers: [
    ProjectService,
    EnvironmentService,
    ActionClassService,
    LanguageService,
  ],
  exports: [
    ProjectService,
    EnvironmentService,
    ActionClassService,
    LanguageService,
  ],
})
export class ProjectModule {}
