import { z } from 'zod';

/**
 * 설문 목록 조회 쿼리 DTO (Zod 스키마).
 * 페이지네이션과 필터링을 지원한다.
 */
export const SurveyQuerySchema = z.object({
  /** 페이지 번호 (1부터 시작, 기본값 1) */
  page: z.coerce.number().int().min(1).optional().default(1),
  /** 페이지당 항목 수 (기본값 10, 최대 100) */
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  /** 상태 필터 */
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'PAUSED', 'COMPLETED']).optional(),
  /** 유형 필터 */
  type: z.enum(['link', 'app']).optional(),
});

export type SurveyQueryDto = z.infer<typeof SurveyQuerySchema>;
