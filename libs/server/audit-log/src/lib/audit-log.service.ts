import { Injectable, Logger } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';

/** Audit Log 기록을 위한 입력 파라미터 */
interface AuditLogInput {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * 감사 로그 서비스.
 * fire-and-forget 방식으로 동작하여 비즈니스 로직을 차단하지 않는다.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: ServerPrismaService) {}

  /**
   * 감사 로그를 비동기로 기록한다.
   * 실패해도 예외를 발생시키지 않고 로그만 남긴다.
   */
  log(input: AuditLogInput): void {
    this.prisma.auditLog
      .create({
        data: {
          userId: input.userId,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          metadata: input.metadata ?? undefined,
          ipAddress: input.ipAddress,
        },
      })
      .catch((error: unknown) => {
        this.logger.error(`감사 로그 기록 실패: ${input.action}`, error);
      });
  }
}
