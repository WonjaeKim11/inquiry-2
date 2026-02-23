import { createAttribute } from '@coltorapps/builder';
import { localizedStringRequiredSchema } from '../../types/localized-string';

/**
 * headline 속성 — 질문의 제목 (필수 다국어 문자열).
 * 모든 질문 유형에서 사용되는 공통 속성으로,
 * 최소 1개 언어의 비어있지 않은 값이 필요하다.
 */
export const headlineAttribute = createAttribute({
  name: 'headline',
  validate(value) {
    return localizedStringRequiredSchema.parse(value);
  },
});
