import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * buttonUrl 속성 — CTA 버튼 클릭 시 이동할 URL (선택).
 * 설정하면 버튼 클릭 시 해당 URL로 리다이렉트된다.
 */
export const buttonUrlAttribute = createAttribute({
  name: 'buttonUrl',
  validate(value) {
    return z.string().optional().nullable().parse(value);
  },
});
