/**
 * 감사 이벤트 Zod 검증 스키마.
 * AuditEventInput 데이터의 런타임 유효성을 검증한다.
 */

import { z } from 'zod';

/** 감사 이벤트 입력 검증 스키마 - 필수 필드와 선택 필드를 정의 */
export const AuditEventSchema = z.object({
  /** 액션 문자열 (최소 1자) */
  action: z.string().min(1),
  /** 사용자 ID (선택) */
  userId: z.string().optional(),
  /** 대상 엔티티 타입 (최소 1자) */
  targetType: z.string().min(1),
  /** 대상 엔티티 ID (선택) */
  targetId: z.string().optional(),
  /** 조직 ID (선택) */
  organizationId: z.string().optional(),
  /** IP 주소 (선택) */
  ipAddress: z.string().optional(),
  /** User-Agent (선택) */
  userAgent: z.string().optional(),
  /** 추가 메타데이터 (선택) */
  metadata: z.record(z.unknown()).optional(),
  /** 변경 전/후 diff (선택) */
  changes: z
    .object({
      before: z.record(z.unknown()).optional(),
      after: z.record(z.unknown()).optional(),
    })
    .optional(),
});

/** Zod 스키마에서 추론된 검증 완료 타입 */
export type ValidatedAuditEvent = z.infer<typeof AuditEventSchema>;
