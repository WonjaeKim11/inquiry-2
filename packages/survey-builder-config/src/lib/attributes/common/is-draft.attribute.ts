import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * isDraft 속성 — 질문의 임시저장 상태 여부 (선택).
 * true이면 아직 완성되지 않은 초안 상태의 질문임을 나타낸다.
 */
export const isDraftAttribute = createAttribute({
  name: 'isDraft',
  validate(value) {
    return z.boolean().optional().parse(value);
  },
});
