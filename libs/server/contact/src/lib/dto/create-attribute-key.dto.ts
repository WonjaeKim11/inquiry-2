import { z } from 'zod';

/** 속성 키 생성 요청 스키마 */
export const CreateAttributeKeySchema = z.object({
  key: z
    .string()
    .min(1, '속성 키는 필수입니다.')
    .max(64, '속성 키는 최대 64자입니다.')
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_]*$/,
      '알파벳으로 시작하고 알파벳, 숫자, 언더스코어만 사용할 수 있습니다.'
    ),
  name: z.string().max(128).optional(),
  description: z.string().max(512).optional(),
  dataType: z.enum(['STRING', 'NUMBER', 'DATE']).optional().default('STRING'),
});

export type CreateAttributeKeyDto = z.infer<typeof CreateAttributeKeySchema>;
