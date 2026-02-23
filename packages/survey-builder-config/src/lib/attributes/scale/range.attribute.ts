import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * range 속성 — 평가 척도의 범위 (3~10).
 * 응답자가 선택할 수 있는 척도의 최댓값을 정의한다.
 */
export const rangeAttribute = createAttribute({
  name: 'range',
  validate(value) {
    return z.number().int().min(3).max(10).parse(value);
  },
});
