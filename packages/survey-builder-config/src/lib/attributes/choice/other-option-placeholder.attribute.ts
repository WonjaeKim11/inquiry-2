import { createAttribute } from '@coltorapps/builder';
import { localizedStringOptionalSchema } from '../../types/localized-string';

/**
 * otherOptionPlaceholder 속성 — "기타" 선택지의 텍스트 입력 안내 문구 (선택적 다국어 문자열).
 * 객관식 질문에서 "기타" 옵션이 활성화된 경우 표시되는 placeholder 텍스트.
 */
export const otherOptionPlaceholderAttribute = createAttribute({
  name: 'otherOptionPlaceholder',
  validate(value) {
    return localizedStringOptionalSchema.parse(value);
  },
});
