import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * displayType 속성 — 선택지 표시 레이아웃.
 * 'list': 세로 목록 형태, 'grid': 격자 형태.
 */
export const displayTypeAttribute = createAttribute({
  name: 'displayType',
  validate(value) {
    return z.enum(['list', 'grid']).parse(value);
  },
});
