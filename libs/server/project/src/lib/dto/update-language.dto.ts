import { z } from 'zod';
import { LANGUAGE_ALIAS_MAX_LENGTH } from '../enums/project.enums.js';

/**
 * Language 수정 DTO (Zod 스키마).
 * 코드와 별칭 모두 선택적이며, 제공된 필드만 업데이트한다.
 */
export const UpdateLanguageSchema = z.object({
  /** 언어 코드 (ISO 639-1 형식) */
  code: z
    .string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
      message: '언어 코드는 ISO 639-1 형식이어야 합니다.',
    })
    .optional(),
  /** 사용자 정의 별칭 (최대 64자, null로 삭제 가능) */
  alias: z.string().max(LANGUAGE_ALIAS_MAX_LENGTH).nullable().optional(),
});

export type UpdateLanguageDto = z.infer<typeof UpdateLanguageSchema>;
