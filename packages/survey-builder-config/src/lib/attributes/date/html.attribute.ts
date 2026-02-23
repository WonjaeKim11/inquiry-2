import { createAttribute } from '@coltorapps/builder';
import { localizedStringOptionalSchema } from '../../types/localized-string';

/**
 * html 속성 — 날짜 질문에 첨부되는 HTML 콘텐츠 (선택적 다국어 문자열).
 * 날짜 선택 UI 위/아래에 추가적인 안내 HTML을 렌더링할 때 사용된다.
 */
export const htmlAttribute = createAttribute({
  name: 'html',
  validate(value) {
    return localizedStringOptionalSchema.parse(value);
  },
});
