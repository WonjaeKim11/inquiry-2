import { createAttribute } from '@coltorapps/builder';
import { localizedStringOptionalSchema } from '../../types/localized-string';

/**
 * buttonLabel 속성 — CTA 버튼에 표시되는 텍스트 (선택적 다국어 문자열).
 * 예: "다음으로", "지금 시작하기" 등.
 */
export const buttonLabelAttribute = createAttribute({
  name: 'buttonLabel',
  validate(value) {
    return localizedStringOptionalSchema.parse(value);
  },
});
