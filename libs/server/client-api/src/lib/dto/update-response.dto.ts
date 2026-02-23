import { z } from 'zod';

/** 응답 업데이트 요청 스키마 */
export const UpdateResponseSchema = z.object({
  /** 갱신할 응답 데이터 */
  data: z.record(z.unknown()).optional(),
  /** 응답 완료 여부 */
  finished: z.boolean().optional(),
  /** 갱신할 메타 정보 */
  meta: z.record(z.unknown()).optional(),
  /** 변경할 언어 코드 */
  language: z.string().optional(),
  /** Time-to-complete 데이터 (질문별 소요 시간) */
  ttc: z.record(z.unknown()).optional(),
  /** 설문 변수 데이터 */
  variables: z.record(z.unknown()).optional(),
  /** 숨겨진 필드 데이터 */
  hiddenFields: z.record(z.unknown()).optional(),
  /** 종료 화면 ID */
  endingId: z.string().optional(),
});

export type UpdateResponseDto = z.infer<typeof UpdateResponseSchema>;
