import { createAttribute } from '@coltorapps/builder';
import { localizedStringOptionalSchema } from '../../types/localized-string';

/**
 * upperLabel 속성 — 척도의 상단 라벨 (선택적 다국어 문자열).
 * 예: "매우 만족", "매우 그렇다" 등 척도 최댓값에 표시되는 설명.
 */
export const upperLabelAttribute = createAttribute({
  name: 'upperLabel',
  validate(value) {
    return localizedStringOptionalSchema.parse(value);
  },
});
