import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

const optionalI18nStringSchema = z
  .record(z.string(), z.string())
  .optional()
  .nullable();

/**
 * placeholder 속성: 입력 필드 플레이스홀더 (다국어, 선택).
 */
export const placeholderAttribute = createAttribute({
  name: 'placeholder',
  validate(value) {
    return optionalI18nStringSchema.parse(value);
  },
});
