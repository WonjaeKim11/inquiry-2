import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * allowMultipleFiles 속성 — 다중 파일 업로드 허용 여부.
 * true이면 응답자가 여러 개의 파일을 동시에 업로드할 수 있다.
 */
export const allowMultipleFilesAttribute = createAttribute({
  name: 'allowMultipleFiles',
  validate(value) {
    return z.boolean().parse(value);
  },
});
