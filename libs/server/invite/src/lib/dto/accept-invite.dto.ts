import { z } from 'zod';

/**
 * 초대 수락 DTO (Zod 스키마).
 * JWT 초대 토큰이 필수.
 */
export const AcceptInviteSchema = z.object({
  /** JWT 초대 토큰 */
  token: z.string().min(1, { message: '초대 토큰은 필수입니다.' }),
});

export type AcceptInviteDto = z.infer<typeof AcceptInviteSchema>;
