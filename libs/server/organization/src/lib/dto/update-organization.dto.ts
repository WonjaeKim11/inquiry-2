import { z } from 'zod';
import {
  ORG_NAME_MIN_LENGTH,
  ORG_NAME_MAX_LENGTH,
} from '../constants/billing.constants.js';

/**
 * Billing Limits 부분 업데이트 스키마.
 * null 값은 무제한을 의미한다.
 */
const BillingLimitsSchema = z
  .object({
    projects: z.number().int().min(0).nullable().optional(),
    monthlyResponses: z.number().int().min(0).nullable().optional(),
    monthlyMIU: z.number().int().min(0).nullable().optional(),
  })
  .optional();

/**
 * Billing 부분 업데이트 스키마.
 * 각 필드는 선택적이며, 제공된 필드만 업데이트한다.
 */
const BillingSchema = z
  .object({
    plan: z.enum(['free', 'startup', 'custom']).optional(),
    period: z.enum(['monthly', 'yearly']).optional(),
    periodStart: z.string().nullable().optional(),
    limits: BillingLimitsSchema,
    stripeCustomerId: z.string().nullable().optional(),
  })
  .optional();

/**
 * Whitelabel 부분 업데이트 스키마.
 * logoUrl, faviconUrl 모두 선택적이다.
 */
const WhitelabelSchema = z
  .object({
    logoUrl: z.string().url().nullable().optional(),
    faviconUrl: z.string().url().nullable().optional(),
  })
  .optional();

/**
 * 조직 수정 DTO (Zod 스키마).
 * 모든 필드가 선택적이며, 제공된 필드만 업데이트한다 (부분 업데이트).
 */
export const UpdateOrganizationSchema = z.object({
  /** 조직 이름 (trim 처리, 1~100자) */
  name: z
    .string()
    .trim()
    .min(ORG_NAME_MIN_LENGTH, {
      message: `조직 이름은 최소 ${ORG_NAME_MIN_LENGTH}자 이상이어야 합니다.`,
    })
    .max(ORG_NAME_MAX_LENGTH, {
      message: `조직 이름은 최대 ${ORG_NAME_MAX_LENGTH}자까지 가능합니다.`,
    })
    .optional(),
  /** Billing 부분 업데이트 */
  billing: BillingSchema,
  /** Whitelabel 부분 업데이트 */
  whitelabel: WhitelabelSchema,
  /** AI 기능 활성화 여부 */
  isAIEnabled: z.boolean().optional(),
});

export type UpdateOrganizationDto = z.infer<typeof UpdateOrganizationSchema>;
