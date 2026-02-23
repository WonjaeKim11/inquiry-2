import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * maxSizeInMB 속성 — 업로드 파일의 최대 크기(MB 단위, 선택).
 * 양수만 허용되며, undefined/null이면 제한 없음.
 */
export const maxSizeInMBAttribute = createAttribute({
  name: 'maxSizeInMB',
  validate(value) {
    return z.number().positive().optional().nullable().parse(value);
  },
});
