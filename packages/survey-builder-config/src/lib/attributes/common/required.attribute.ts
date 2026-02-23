import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * required 속성 — 질문의 필수 응답 여부.
 * true이면 응답자가 반드시 답변해야 다음 질문으로 넘어갈 수 있다.
 */
export const requiredAttribute = createAttribute({
  name: 'required',
  validate(value) {
    return z.boolean().parse(value);
  },
});
