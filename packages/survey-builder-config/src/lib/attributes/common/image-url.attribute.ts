import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * imageUrl 속성 — 질문에 첨부할 이미지 URL (선택).
 * 유효한 URL 형식이어야 하며, undefined/null 허용.
 */
export const imageUrlAttribute = createAttribute({
  name: 'imageUrl',
  validate(value) {
    return z.string().url().optional().nullable().parse(value);
  },
});
