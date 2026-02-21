import { Module, Global } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';

/**
 * 감사 로그 글로벌 모듈.
 * @Global()로 등록하여 어디서든 AuditLogService를 주입받을 수 있다.
 */
@Global()
@Module({
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
