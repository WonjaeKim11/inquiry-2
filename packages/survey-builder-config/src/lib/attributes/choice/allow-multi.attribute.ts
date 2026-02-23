import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * allowMulti 속성 — 복수 선택 허용 여부.
 * true이면 응답자가 여러 개의 선택지를 동시에 선택할 수 있다.
 */
export const allowMultiAttribute = createAttribute({
  name: 'allowMulti',
  validate(value) {
    return z.boolean().parse(value);
  },
});
