import { createEntity } from '@coltorapps/builder';
import {
  headlineAttribute,
  requiredAttribute,
  subheaderAttribute,
  imageUrlAttribute,
  videoUrlAttribute,
  isDraftAttribute,
  pictureChoicesAttribute,
  allowMultiAttribute,
  validationConfigAttribute,
} from '../attributes/index';

/**
 * PictureSelection 질문 엔티티: 이미지 기반 선택 질문.
 * 그림 선택지 목록, 복수 선택 허용, 검증 규칙을 지원한다.
 */
export const pictureSelectionEntity = createEntity({
  name: 'pictureSelection',
  attributes: [
    // 공통
    headlineAttribute,
    requiredAttribute,
    subheaderAttribute,
    imageUrlAttribute,
    videoUrlAttribute,
    isDraftAttribute,
    // 고유
    pictureChoicesAttribute,
    allowMultiAttribute,
    validationConfigAttribute,
  ],
  parentRequired: true,
});
