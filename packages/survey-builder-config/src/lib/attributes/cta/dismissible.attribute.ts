import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * dismissible 속성 — CTA(Call-to-Action) 질문의 닫기 가능 여부.
 * true이면 응답자가 CTA를 건너뛸 수 있다.
 */
export const dismissibleAttribute = createAttribute({
  name: 'dismissible',
  validate(value) {
    return z.boolean().parse(value);
  },
});
