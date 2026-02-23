import { z } from 'zod';

/**
 * Management API 설문 수정 요청 스키마.
 * 모든 필드가 선택이며, 변경할 필드만 전달한다.
 */
export const UpdateSurveySchema = z.object({
  /** 설문 이름 (1~255자) */
  name: z.string().trim().min(1).max(255).optional(),
  /** 설문 질문 데이터 (JSON 구조) */
  questions: z.unknown().optional(),
  /** 설문 상태 */
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'PAUSED', 'COMPLETED']).optional(),
});

export type UpdateSurveyDto = z.infer<typeof UpdateSurveySchema>;
