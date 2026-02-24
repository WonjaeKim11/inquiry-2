import { Module } from '@nestjs/common';
import { QuotaController } from './quota.controller.js';
import { QuotaService } from './services/quota.service.js';
import { QuotaEvaluationService } from './services/quota-evaluation.service.js';

/**
 * 쿼터 모듈.
 * 쿼터 CRUD + 평가 엔진을 제공한다.
 * AuditLogModule, ServerPrismaModule은 @Global()이므로 별도 import 불필요.
 */
@Module({
  controllers: [QuotaController],
  providers: [QuotaService, QuotaEvaluationService],
  exports: [QuotaService, QuotaEvaluationService],
})
export class QuotaModule {}
