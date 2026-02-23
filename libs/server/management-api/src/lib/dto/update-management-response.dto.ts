import { z } from 'zod';

/**
 * Management API 응답 수정 요청 스키마.
 * 모든 필드가 선택이며, 변경할 필드만 전달한다.
 */
export const UpdateManagementResponseSchema = z.object({
  /** 응답 데이터 (질문별 답변) */
  data: z.record(z.unknown()).optional(),
  /** 응답 완료 여부 */
  finished: z.boolean().optional(),
  /** 메타 정보 (브라우저, OS 등) */
  meta: z.record(z.unknown()).optional(),
  /** 응답 언어 코드 */
  language: z.string().optional(),
  /** 설문 변수 데이터 */
  variables: z.record(z.unknown()).optional(),
  /** Time-to-complete 데이터 (질문별 소요 시간) */
  ttc: z.record(z.unknown()).optional(),
  /** 숨겨진 필드 데이터 */
  hiddenFields: z.record(z.unknown()).optional(),
  /** 종료 화면 ID */
  endingId: z.string().optional(),
});

export type UpdateManagementResponseDto = z.infer<
  typeof UpdateManagementResponseSchema
>;
