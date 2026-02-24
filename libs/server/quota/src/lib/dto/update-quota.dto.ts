import { z } from 'zod';

/**
 * 쿼터 수정 DTO (Zod 스키마).
 * 모든 필드가 선택적이다.
 */
export const UpdateQuotaSchema = z.object({
  /** 쿼터 이름 (1~100자) */
  name: z.string().trim().min(1).max(100).optional(),
  /** 응답 한도 (1 이상 정수) */
  limit: z.number().int().min(1).optional(),
  /** 쿼터 조건 (JSON) */
  logic: z.unknown().optional(),
  /** 한도 초과 시 액션 */
  action: z.enum(['endSurvey', 'continueSurvey']).optional(),
  /** 종료 카드 ID */
  endingCardId: z.string().nullable().optional(),
  /** 부분 제출도 카운트 */
  countPartialSubmissions: z.boolean().optional(),
});

export type UpdateQuotaDto = z.infer<typeof UpdateQuotaSchema>;
