import { z } from 'zod';

/**
 * Management API 설문 생성 요청 스키마.
 * name 필드는 필수이며, 나머지 필드는 선택.
 * questions → schema로 마이그레이션됨.
 */
export const CreateSurveySchema = z.object({
  /** 설문 이름 (1~255자) */
  name: z
    .string()
    .trim()
    .min(1, { message: 'Survey name is required' })
    .max(255),
  /** 설문 유형 */
  type: z.enum(['link', 'app']).optional(),
  /** 설문 상태 */
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'PAUSED', 'COMPLETED']).optional(),
  /** Builder 스키마 (질문 구조 JSON) */
  schema: z.unknown().optional(),
  /** Welcome Card 설정 */
  welcomeCard: z.record(z.unknown()).optional(),
  /** 종료 카드 목록 */
  endings: z.array(z.record(z.unknown())).optional(),
  /** Hidden Fields 설정 */
  hiddenFields: z.record(z.unknown()).optional(),
  /** 설문 변수 목록 */
  variables: z.array(z.record(z.unknown())).optional(),
  /** 표시 옵션 */
  displayOption: z
    .enum(['displayOnce', 'displayMultiple', 'respondMultiple', 'displaySome'])
    .optional(),
  /** displaySome일 때 표시 횟수 제한 */
  displayLimit: z.number().int().min(1).optional(),
  /** 설문 표시 지연 시간 (ms) */
  delay: z.number().int().min(0).optional(),
  /** 자동 닫기 시간 (초) */
  autoClose: z.number().int().min(1).nullable().optional(),
  /** 자동 완료 응답 수 */
  autoComplete: z.number().int().min(1).nullable().optional(),
});

export type CreateSurveyDto = z.infer<typeof CreateSurveySchema>;
