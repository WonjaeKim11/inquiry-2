import { z } from 'zod';

/**
 * Management API 연락처 생성 요청 스키마.
 * attributes는 선택이며, 키-값 쌍의 사용자 속성 데이터를 전달한다.
 */
export const CreateContactSchema = z.object({
  /** 연락처 속성 데이터 (키-값 쌍) */
  attributes: z.record(z.unknown()).optional(),
});

export type CreateContactDto = z.infer<typeof CreateContactSchema>;
