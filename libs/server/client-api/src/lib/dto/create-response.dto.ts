import { z } from 'zod';

/** 응답 생성 요청 스키마 */
export const CreateResponseSchema = z.object({
  /** 응답 대상 설문 ID */
  surveyId: z.string().min(1, { message: 'Survey ID is required' }),
  /** 설문 응답 데이터 (질문별 답변) */
  data: z.record(z.unknown()).optional(),
  /** 응답 완료 여부 */
  finished: z.boolean().optional(),
  /** 응답 메타 정보 (브라우저, OS 등) */
  meta: z.record(z.unknown()).optional(),
  /** 응답 언어 코드 */
  language: z.string().optional(),
  /** 연결된 Display ID */
  displayId: z.string().optional(),
  /** 연결된 Contact ID */
  contactId: z.string().optional(),
});

export type CreateResponseDto = z.infer<typeof CreateResponseSchema>;
