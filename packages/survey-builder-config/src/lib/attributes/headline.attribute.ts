import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/** i18n 문자열 Zod 스키마 (locale → text 매핑, 최소 1개 필수) */
const i18nStringSchema = z
  .record(z.string(), z.string())
  .refine((val) => Object.keys(val).length > 0, {
    message: '최소 1개 언어의 값이 필요합니다',
  });

/**
 * headline 속성: 질문/카드의 제목 텍스트 (다국어 지원).
 * 예: { "en-US": "What is your name?", "ko-KR": "이름이 무엇인가요?" }
 */
export const headlineAttribute = createAttribute({
  name: 'headline',
  validate(value) {
    return i18nStringSchema.parse(value);
  },
});
