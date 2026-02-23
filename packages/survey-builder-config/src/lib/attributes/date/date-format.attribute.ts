import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * dateFormat 속성 — 날짜 표시 형식.
 * 'M/d/yyyy': 미국식, 'dd/MM/yyyy': 유럽식, 'yyyy-MM-dd': ISO 형식.
 */
export const dateFormatAttribute = createAttribute({
  name: 'dateFormat',
  validate(value) {
    return z.enum(['M/d/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd']).parse(value);
  },
});
