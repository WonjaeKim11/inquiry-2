import { z } from 'zod';
import { LANGUAGE_ALIAS_MAX_LENGTH } from '../enums/project.enums.js';

/**
 * Language 생성 DTO (Zod 스키마).
 * ISO 639-1 형식의 언어 코드와 선택적 별칭을 정의한다.
 */
export const CreateLanguageSchema = z.object({
  /** 언어 코드 (ISO 639-1 형식: "en", "ko", "en-US" 등) */
  code: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
    message: '언어 코드는 ISO 639-1 형식이어야 합니다 (예: "en", "ko-KR").',
  }),
  /** 사용자 정의 별칭 (최대 64자) */
  alias: z.string().max(LANGUAGE_ALIAS_MAX_LENGTH).optional(),
});

export type CreateLanguageDto = z.infer<typeof CreateLanguageSchema>;
