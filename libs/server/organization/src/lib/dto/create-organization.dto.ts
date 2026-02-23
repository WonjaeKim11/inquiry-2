import { z } from 'zod';
import {
  ORG_NAME_MIN_LENGTH,
  ORG_NAME_MAX_LENGTH,
} from '../constants/billing.constants.js';

/**
 * 조직 생성 DTO (Zod 스키마).
 * 조직 이름은 필수이며, 선택적으로 클라이언트에서 cuid2 형식의 ID를 지정할 수 있다.
 */
export const CreateOrganizationSchema = z.object({
  /** 조직 이름 (trim 처리, 1~100자) */
  name: z
    .string()
    .trim()
    .min(ORG_NAME_MIN_LENGTH, {
      message: `조직 이름은 최소 ${ORG_NAME_MIN_LENGTH}자 이상이어야 합니다.`,
    })
    .max(ORG_NAME_MAX_LENGTH, {
      message: `조직 이름은 최대 ${ORG_NAME_MAX_LENGTH}자까지 가능합니다.`,
    }),
  /** 선택: 클라이언트에서 cuid2 형식 ID 지정 */
  id: z.string().min(1).optional(),
});

export type CreateOrganizationDto = z.infer<typeof CreateOrganizationSchema>;
