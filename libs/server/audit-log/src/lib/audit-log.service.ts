/**
 * 감사 로그 서비스 (리팩토링).
 * 기존 fire-and-forget Prisma 기반 로깅에 Zod 검증, PII Redaction,
 * Pino 구조화 로그, Feature Flag 기반 제어를 추가한다.
 *
 * - `log()`: 기존 메서드 (하위 호환 유지)
 * - `logEvent()`: 신규 메서드 (Zod 검증, PII Redaction, Pino 출력, Feature Flag)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { AuditEventSchema } from './audit-log.schema';
import { redactPii } from './audit-log.pii-redaction';
import { createAuditLogger } from './audit-log.logger';
import {
  AuditFeatureFlagService,
  AUDIT_FEATURES,
} from './audit-log.feature-flag';
import type { AuditEventInput } from './audit-log.types';
import type pino from 'pino';

/** 기존 AuditLogInput 인터페이스 (하위 호환을 위해 유지) */
interface AuditLogInput {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  /** 감사 전용 Pino 로거 인스턴스 (비즈니스 로그와 분리) */
  private readonly auditLogger: pino.Logger;

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly featureFlag: AuditFeatureFlagService
  ) {
    this.auditLogger = createAuditLogger();
  }

  /**
   * 기존 감사 로그 메서드 (하위 호환).
   * 단순 fire-and-forget 방식으로 Prisma에 직접 저장한다.
   * @deprecated logEvent()를 사용하세요
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

  /**
   * 신규 감사 이벤트 기록 (Zod 검증 + PII Redaction + Pino 출력).
   * fire-and-forget 방식으로 동작하여 비즈니스 로직을 차단하지 않는다.
   * Feature Flag에 따라 PII 마스킹, 로그 출력, DB 저장을 개별 제어한다.
   * @param input - 감사 이벤트 데이터
   */
  logEvent(input: AuditEventInput): void {
    // Zod 스키마 검증: 잘못된 입력은 조기 반환 (로그만 남김)
    const parsed = AuditEventSchema.safeParse(input);
    if (!parsed.success) {
      this.logger.warn(
        `감사 이벤트 검증 실패: ${JSON.stringify(parsed.error.issues)}`
      );
      return;
    }

    // fire-and-forget: 비동기 처리를 시작하고 에러만 로깅
    this.processEvent(input).catch((error: unknown) => {
      this.logger.error(`감사 이벤트 처리 실패: ${input.action}`, error);
    });
  }

  /**
   * 감사 이벤트 비동기 처리.
   * Feature Flag 상태에 따라 PII Redaction, Pino 출력, DB 저장을 수행한다.
   */
  private async processEvent(input: AuditEventInput): Promise<void> {
    // PII Redaction: 활성화 시 메타데이터, 변경사항, IP 주소를 마스킹
    const piiEnabled = await this.featureFlag.isEnabled(
      AUDIT_FEATURES.PII_REDACTION
    );
    let metadata = input.metadata;
    let changes = input.changes;
    let ipAddress = input.ipAddress;

    if (piiEnabled) {
      if (metadata) {
        metadata = redactPii(metadata);
      }
      if (changes) {
        changes = {
          before: changes.before ? redactPii(changes.before) : undefined,
          after: changes.after ? redactPii(changes.after) : undefined,
        };
      }
      // IP 주소 마스킹: 마지막 두 옥텟을 가림
      if (ipAddress) {
        const parts = ipAddress.split('.');
        if (parts.length === 4) {
          ipAddress = `${parts[0]}.${parts[1]}.*.*`;
        }
      }
    }

    // Pino 로그 출력: 활성화 시 감사 전용 로거로 구조화 로그 기록
    const logEnabled = await this.featureFlag.isEnabled(
      AUDIT_FEATURES.LOG_OUTPUT
    );
    if (logEnabled) {
      this.auditLogger.info({
        action: input.action,
        userId: input.userId,
        targetType: input.targetType,
        targetId: input.targetId,
        organizationId: input.organizationId,
        ...(metadata && { metadata }),
        ...(changes && { changes }),
      });
    }

    // DB 저장: 활성화 시 Prisma를 통해 auditLog 테이블에 기록
    const dbEnabled = await this.featureFlag.isEnabled(
      AUDIT_FEATURES.DB_STORAGE
    );
    if (dbEnabled) {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          entity: input.targetType,
          entityId: input.targetId,
          metadata: {
            ...(metadata ?? {}),
            ...(changes ? { changes } : {}),
            ...(input.organizationId
              ? { organizationId: input.organizationId }
              : {}),
            ...(input.userAgent ? { userAgent: input.userAgent } : {}),
          },
          ipAddress,
        },
      });
    }
  }
}
