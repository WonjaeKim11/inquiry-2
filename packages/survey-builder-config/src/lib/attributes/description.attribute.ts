import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

const optionalI18nStringSchema = z
  .record(z.string(), z.string())
  .optional()
  .nullable();

/**
 * description 속성: 질문에 대한 추가 설명 (다국어, 선택).
 */
export const descriptionAttribute = createAttribute({
  name: 'description',
  validate(value) {
    return optionalI18nStringSchema.parse(value);
  },
});
