import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * maxLength 속성 — 텍스트 입력의 최대 문자 수 (선택).
 * 양수만 허용되며, undefined/null이면 제한 없음.
 */
export const maxLengthAttribute = createAttribute({
  name: 'maxLength',
  validate(value) {
    return z.number().positive().optional().nullable().parse(value);
  },
});
