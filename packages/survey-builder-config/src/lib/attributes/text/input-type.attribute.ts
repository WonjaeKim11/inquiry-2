import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * inputType 속성 — 텍스트 입력 필드의 유형.
 * HTML input type에 대응하며, 모바일 키보드 레이아웃에도 영향을 준다.
 * 'text' | 'email' | 'url' | 'number' | 'phone'
 */
export const inputTypeAttribute = createAttribute({
  name: 'inputType',
  validate(value) {
    return z.enum(['text', 'email', 'url', 'number', 'phone']).parse(value);
  },
});
