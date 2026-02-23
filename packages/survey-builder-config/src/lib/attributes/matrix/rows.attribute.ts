import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';
import { matrixChoiceSchema } from '../../types/choice.types';

/**
 * rows 속성 — 행렬(Matrix) 질문의 행 목록.
 * 각 행은 id와 다국어 라벨을 가지며, 최소 1개의 행이 필요하다.
 */
export const rowsAttribute = createAttribute({
  name: 'rows',
  validate(value) {
    return z
      .array(matrixChoiceSchema)
      .min(1, '최소 1개 행이 필요합니다')
      .parse(value);
  },
});
