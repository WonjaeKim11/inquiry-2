import { z } from 'zod';
import { LOCALE_CODES } from '@inquiry/shared-i18n';

/**
 * 로케일 업데이트 DTO (Zod 스키마).
 * 15개 지원 로케일 중 하나를 선택해야 한다.
 */
export const UpdateLocaleSchema = z.object({
  locale: z
    .string()
    .refine((val) => LOCALE_CODES.includes(val), {
      message: '지원하지 않는 로케일입니다.',
    }),
});

export type UpdateLocaleDto = z.infer<typeof UpdateLocaleSchema>;
