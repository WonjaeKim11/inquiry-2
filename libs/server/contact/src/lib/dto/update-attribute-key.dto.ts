import { z } from 'zod';

/** 속성 키 수정 요청 스키마 */
export const UpdateAttributeKeySchema = z.object({
  name: z.string().max(128).optional(),
  description: z.string().max(512).optional(),
});

export type UpdateAttributeKeyDto = z.infer<typeof UpdateAttributeKeySchema>;
