import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * minLength 속성 — 텍스트 입력의 최소 문자 수 (선택).
 * 양수만 허용되며, undefined/null이면 제한 없음.
 */
export const minLengthAttribute = createAttribute({
  name: 'minLength',
  validate(value) {
    return z.number().positive().optional().nullable().parse(value);
  },
});
