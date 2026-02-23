import { createAttribute } from '@coltorapps/builder';
import { localizedStringOptionalSchema } from '../../types/localized-string';

/**
 * lowerLabel 속성 — 척도의 하단 라벨 (선택적 다국어 문자열).
 * 예: "매우 불만족", "전혀 그렇지 않다" 등 척도 최솟값에 표시되는 설명.
 */
export const lowerLabelAttribute = createAttribute({
  name: 'lowerLabel',
  validate(value) {
    return localizedStringOptionalSchema.parse(value);
  },
});
