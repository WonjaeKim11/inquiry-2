import { z } from 'zod';

/**
 * 초대 생성 DTO (Zod 스키마).
 * 이메일, 조직 ID, 역할은 필수이며, 이름과 팀 ID 목록은 선택.
 */
export const CreateInviteSchema = z.object({
  /** 초대 대상 이메일 주소 */
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: '올바른 이메일 형식을 입력해주세요.' })
    .max(255),

  /** 초대 대상자 이름 (선택) */
  name: z
    .string()
    .trim()
    .min(1, { message: '이름은 비어있을 수 없습니다.' })
    .max(50)
    .optional(),

  /** 초대할 조직 ID */
  organizationId: z.string().min(1, { message: '조직 ID는 필수입니다.' }),

  /** 할당할 역할 */
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'BILLING'], {
    message: '올바른 역할을 선택해주세요.',
  }),

  /** 할당할 팀 ID 목록 (선택) */
  teamIds: z.array(z.string().min(1)).default([]),
});

export type CreateInviteDto = z.infer<typeof CreateInviteSchema>;
