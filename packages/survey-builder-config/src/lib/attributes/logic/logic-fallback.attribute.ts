import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * logicFallback 속성 -- 모든 로직 조건이 불일치할 때 이동할 기본 블록 ID.
 * null이면 자연 순서(다음 블록)로 진행한다.
 */
export const logicFallbackAttribute = createAttribute({
  name: 'logicFallback',
  validate(value) {
    return z.string().nullable().optional().parse(value);
  },
});
