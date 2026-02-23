import { createAttribute } from '@coltorapps/builder';

/**
 * required 속성: 질문 필수 응답 여부.
 */
export const requiredAttribute = createAttribute({
  name: 'required',
  validate(value) {
    if (typeof value !== 'boolean') {
      throw new Error('required 값은 boolean이어야 합니다');
    }
    return value;
  },
});
