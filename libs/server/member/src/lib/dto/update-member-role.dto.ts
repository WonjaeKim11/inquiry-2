import { z } from 'zod';

/**
 * 멤버 역할 변경 DTO (Zod 스키마).
 * 유효한 MembershipRole 중 하나를 지정해야 한다.
 */
export const UpdateMemberRoleSchema = z.object({
  /** 변경할 역할 */
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'BILLING'], {
    message: '올바른 역할을 선택해주세요.',
  }),
});

export type UpdateMemberRoleDto = z.infer<typeof UpdateMemberRoleSchema>;
