import { createAttribute } from '@coltorapps/builder';
import { localizedStringOptionalSchema } from '../../types/localized-string';

/**
 * subheader 속성 — 질문의 부제목 (선택적 다국어 문자열).
 * 질문 제목 아래에 추가 설명을 표시할 때 사용된다.
 */
export const subheaderAttribute = createAttribute({
  name: 'subheader',
  validate(value) {
    return localizedStringOptionalSchema.parse(value);
  },
});
