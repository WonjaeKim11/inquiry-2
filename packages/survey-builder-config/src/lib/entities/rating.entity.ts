import { createEntity } from '@coltorapps/builder';
import {
  headlineAttribute,
  requiredAttribute,
  subheaderAttribute,
  imageUrlAttribute,
  videoUrlAttribute,
  isDraftAttribute,
  scaleAttribute,
  rangeAttribute,
  lowerLabelAttribute,
  upperLabelAttribute,
  isColorCodingEnabledAttribute,
} from '../attributes/index';

/**
 * Rating 질문 엔티티: 별점/이모지/숫자 등 척도 기반 평가 질문.
 * 척도 유형, 범위, 하단/상단 라벨, 색상 코딩 옵션을 지원한다.
 */
export const ratingEntity = createEntity({
  name: 'rating',
  attributes: [
    // 공통
    headlineAttribute,
    requiredAttribute,
    subheaderAttribute,
    imageUrlAttribute,
    videoUrlAttribute,
    isDraftAttribute,
    // 고유
    scaleAttribute,
    rangeAttribute,
    lowerLabelAttribute,
    upperLabelAttribute,
    isColorCodingEnabledAttribute,
  ],
  parentRequired: true,
});
