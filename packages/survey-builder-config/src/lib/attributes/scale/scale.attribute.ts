import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * scale 속성 — 평가 척도의 표시 유형.
 * 'number': 숫자, 'smiley': 이모티콘, 'star': 별점.
 */
export const scaleAttribute = createAttribute({
  name: 'scale',
  validate(value) {
    return z.enum(['number', 'smiley', 'star']).parse(value);
  },
});
