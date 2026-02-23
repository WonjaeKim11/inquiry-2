import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';
import { matrixChoiceSchema } from '../../types/choice.types';

/**
 * columns 속성 — 행렬(Matrix) 질문의 열 목록.
 * 각 열은 id와 다국어 라벨을 가지며, 최소 1개의 열이 필요하다.
 */
export const columnsAttribute = createAttribute({
  name: 'columns',
  validate(value) {
    return z
      .array(matrixChoiceSchema)
      .min(1, '최소 1개 열이 필요합니다')
      .parse(value);
  },
});
