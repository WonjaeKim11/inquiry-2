import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';
import { choiceSchema } from '../../types/choice.types';

/**
 * choices 속성 — 텍스트 기반 선택지 목록.
 * 객관식(MultipleChoice) 질문에서 사용되며, 최소 2개의 선택지가 필요하다.
 */
export const choicesAttribute = createAttribute({
  name: 'choices',
  validate(value) {
    return z
      .array(choiceSchema)
      .min(2, '최소 2개 선택지가 필요합니다')
      .parse(value);
  },
});
