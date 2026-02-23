import { z } from 'zod';

/**
 * Management API 설문 생성 요청 스키마.
 * name 필드는 필수이며, questions와 status는 선택.
 */
export const CreateSurveySchema = z.object({
  /** 설문 이름 (1~255자) */
  name: z
    .string()
    .trim()
    .min(1, { message: 'Survey name is required' })
    .max(255),
  /** 설문 질문 데이터 (JSON 구조) */
  questions: z.unknown().optional(),
  /** 설문 상태 */
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'PAUSED', 'COMPLETED']).optional(),
});

export type CreateSurveyDto = z.infer<typeof CreateSurveySchema>;
