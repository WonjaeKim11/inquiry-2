import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * isColorCodingEnabled 속성 — 색상 코딩 활성화 여부.
 * true이면 척도 값에 따라 빨강(낮음)~초록(높음) 등의 그라데이션 색상이 적용된다.
 */
export const isColorCodingEnabledAttribute = createAttribute({
  name: 'isColorCodingEnabled',
  validate(value) {
    return z.boolean().parse(value);
  },
});
