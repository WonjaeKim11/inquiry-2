import { createAttribute } from '@coltorapps/builder';
import { localizedStringRequiredSchema } from '../../types/localized-string';

/**
 * label 속성 — 동의(Consent) 질문의 라벨 텍스트 (필수 다국어 문자열).
 * 예: "개인정보 수집 및 이용에 동의합니다".
 * 최소 1개 언어의 비어있지 않은 값이 필요하다.
 */
export const labelAttribute = createAttribute({
  name: 'label',
  validate(value) {
    return localizedStringRequiredSchema.parse(value);
  },
});
