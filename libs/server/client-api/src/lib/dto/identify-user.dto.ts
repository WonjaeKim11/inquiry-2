import { z } from 'zod';

/** 사용자 식별 요청 스키마 */
export const IdentifyUserSchema = z.object({
  /** 클라이언트 측 사용자 고유 ID */
  userId: z.string().min(1, { message: 'User ID is required' }),
  /** 사용자 속성 (이름, 이메일 등 자유 형식) */
  attributes: z.record(z.unknown()).optional(),
});

export type IdentifyUserDto = z.infer<typeof IdentifyUserSchema>;
