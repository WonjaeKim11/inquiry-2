import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';
import { pictureChoiceSchema } from '../../types/choice.types';

/**
 * pictureChoices 속성 — 이미지 기반 선택지 목록.
 * PictureSelection 질문에서 사용되며, 최소 2개의 이미지 선택지가 필요하다.
 */
export const pictureChoicesAttribute = createAttribute({
  name: 'pictureChoices',
  validate(value) {
    return z
      .array(pictureChoiceSchema)
      .min(2, '최소 2개 이미지 선택지가 필요합니다')
      .parse(value);
  },
});
