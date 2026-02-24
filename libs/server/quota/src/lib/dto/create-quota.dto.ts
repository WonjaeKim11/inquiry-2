import { z } from 'zod';

/**
 * 쿼터 생성 DTO (Zod 스키마).
 * name, limit, action은 필수. endingCardId는 endSurvey 시 필수.
 */
export const CreateQuotaSchema = z.object({
  /** 쿼터 이름 (1~100자) */
  name: z
    .string()
    .trim()
    .min(1, { message: '쿼터 이름은 필수입니다.' })
    .max(100, { message: '쿼터 이름은 최대 100자까지 가능합니다.' }),
  /** 응답 한도 (1 이상 정수) */
  limit: z
    .number()
    .int({ message: '한도는 정수여야 합니다.' })
    .min(1, { message: '한도는 최소 1이어야 합니다.' }),
  /** 쿼터 조건 (JSON) -- 빈 객체이면 모든 응답 카운트 */
  logic: z.unknown().optional().default({}),
  /** 한도 초과 시 액션 */
  action: z.enum(['endSurvey', 'continueSurvey'], {
    message: '액션을 선택해 주세요.',
  }),
  /** 종료 카드 ID (endSurvey 시 필수) */
  endingCardId: z.string().nullable().optional(),
  /** 부분 제출도 카운트 */
  countPartialSubmissions: z.boolean().optional().default(false),
});

export type CreateQuotaDto = z.infer<typeof CreateQuotaSchema>;
