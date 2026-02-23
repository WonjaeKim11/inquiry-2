/**
 * 감사 로그 글로벌 모듈.
 * @Global()로 등록하여 어디서든 AuditLogService와
 * AuditFeatureFlagService를 주입받을 수 있다.
 */

import { Module, Global } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditFeatureFlagService } from './audit-log.feature-flag';

@Global()
@Module({
  providers: [AuditLogService, AuditFeatureFlagService],
  exports: [AuditLogService, AuditFeatureFlagService],
})
export class AuditLogModule {}
