import { z } from 'zod';

/** 개인화 링크 생성 요청 스키마 */
export const CreatePersonalizedLinkSchema = z.object({
  surveyId: z.string().min(1, 'surveyId는 필수입니다.'),
  contactIds: z
    .array(z.string().min(1))
    .min(1, '최소 1개의 연락처 ID가 필요합니다.')
    .max(1000, '최대 1,000개의 연락처에 대해 링크를 생성할 수 있습니다.'),
  expirationDays: z.number().int().min(1).max(365).optional().nullable(),
});

export type CreatePersonalizedLinkDto = z.infer<
  typeof CreatePersonalizedLinkSchema
>;
