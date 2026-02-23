import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * charLimitEnabled 속성 — 문자 수 제한 활성화 여부.
 * true이면 minLength/maxLength 속성에 의한 입력 길이 제한이 적용된다.
 */
export const charLimitEnabledAttribute = createAttribute({
  name: 'charLimitEnabled',
  validate(value) {
    return z.boolean().parse(value);
  },
});
