import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * longAnswer 속성 — 장문 응답 활성화 여부 (선택).
 * true이면 여러 줄 입력이 가능한 textarea로 렌더링된다.
 */
export const longAnswerAttribute = createAttribute({
  name: 'longAnswer',
  validate(value) {
    return z.boolean().optional().parse(value);
  },
});
