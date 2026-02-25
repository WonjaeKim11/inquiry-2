import { z } from 'zod';

/** 속성 키 생성 폼 스키마 */
export const createAttributeKeySchema = z.object({
  key: z
    .string()
    .min(1, '속성 키는 필수입니다.')
    .max(64, '최대 64자입니다.')
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_]*$/,
      '알파벳으로 시작, 알파벳/숫자/언더스코어만 사용 가능'
    ),
  name: z.string().max(128).optional(),
  description: z.string().max(512).optional(),
  dataType: z.enum(['STRING', 'NUMBER', 'DATE']).default('STRING'),
});

/** CSV Import 폼 스키마 */
export const csvImportSchema = z.object({
  duplicateStrategy: z.enum(['skip', 'update', 'overwrite']).default('skip'),
});

export type CreateAttributeKeyFormData = z.infer<
  typeof createAttributeKeySchema
>;
export type CsvImportFormData = z.infer<typeof csvImportSchema>;
