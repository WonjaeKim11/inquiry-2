/**
 * 감사 로그 자동 래핑 고차 함수.
 * 비즈니스 로직을 감싸서 성공/실패 여부를 자동으로 감사 로그에 기록한다.
 */

import type { AuditLogService } from './audit-log.service';
import type { AuditAction, AuditTarget } from './audit-log.types';

/** withAuditLogging 옵션 - 감사 이벤트의 기본 정보 */
interface WithAuditOptions {
  /** 수행되는 액션 */
  action: AuditAction;
  /** 대상 엔티티 타입 */
  targetType: AuditTarget;
  /** 액션을 수행한 사용자 ID */
  userId?: string;
  /** 대상 엔티티 ID */
  targetId?: string;
  /** 관련 조직 ID */
  organizationId?: string;
  /** 클라이언트 IP 주소 */
  ipAddress?: string;
  /** 클라이언트 User-Agent */
  userAgent?: string;
}

/**
 * 감사 로그를 자동으로 감싸는 고차 함수.
 * 전달된 함수가 성공하면 status: 'success',
 * 실패하면 status: 'failure'와 에러 메시지를 기록한다.
 * 원본 함수의 예외는 그대로 re-throw한다.
 *
 * @example
 * ```typescript
 * const result = await withAuditLogging(
 *   auditService,
 *   { action: 'survey.created', targetType: 'survey', userId: user.id },
 *   () => surveyService.create(data)
 * );
 * ```
 *
 * @param auditService - AuditLogService 인스턴스
 * @param options - 감사 이벤트 기본 정보
 * @param fn - 감싸야 할 비즈니스 로직 함수
 * @returns 원본 함수의 반환값
 */
export async function withAuditLogging<T>(
  auditService: AuditLogService,
  options: WithAuditOptions,
  fn: () => Promise<T>
): Promise<T> {
  try {
    const result = await fn();
    // 성공 시 감사 로그 기록
    auditService.logEvent({
      ...options,
      metadata: { status: 'success' },
    });
    return result;
  } catch (error) {
    // 실패 시 에러 정보와 함께 감사 로그 기록
    auditService.logEvent({
      ...options,
      metadata: {
        status: 'failure',
        error: error instanceof Error ? error.message : String(error),
      },
    });
    // 원본 예외를 그대로 전파
    throw error;
  }
}
