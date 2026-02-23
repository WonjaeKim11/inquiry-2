import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller.js';
import { OrganizationService } from './organization.service.js';

/**
 * 조직 모듈.
 * 조직 CRUD, Billing 관리, 월간 응답 수 조회 등의 엔드포인트를 제공한다.
 * AuditLogModule, ServerPrismaModule, ConfigModule은 @Global()이므로 별도 import 불필요.
 */
@Module({
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
