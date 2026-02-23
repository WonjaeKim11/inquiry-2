import { z } from 'zod';

/**
 * API 키 생성 DTO (Zod 스키마).
 * label, environmentPermissions 필수, expiresAt 선택.
 */
export const CreateApiKeySchema = z.object({
  /** API 키 라벨 (용도 식별용, 1~100자) */
  label: z
    .string()
    .trim()
    .min(1, { message: 'Label is required' })
    .max(100, { message: 'Label must be 100 characters or less' }),
  /** 환경별 권한 목록 */
  environmentPermissions: z
    .array(
      z.object({
        environmentId: z
          .string()
          .min(1, { message: 'Environment ID is required' }),
        permission: z.enum(['READ', 'WRITE', 'MANAGE']),
      })
    )
    .min(1, { message: 'At least one environment permission is required' }),
  /** 만료일 (선택, ISO 8601) */
  expiresAt: z.string().datetime().optional(),
});

export type CreateApiKeyDto = z.infer<typeof CreateApiKeySchema>;
