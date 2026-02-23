import { createAttribute } from '@coltorapps/builder';
import { localizedStringOptionalSchema } from '../../types/localized-string';

/**
 * placeholder 속성 — 텍스트 입력 필드의 안내 문구 (선택적 다국어 문자열).
 * 사용자가 아직 입력하지 않았을 때 입력 필드에 표시되는 힌트 텍스트.
 */
export const placeholderAttribute = createAttribute({
  name: 'placeholder',
  validate(value) {
    return localizedStringOptionalSchema.parse(value);
  },
});
