import { createEntity } from '@coltorapps/builder';
import {
  headlineAttribute,
  requiredAttribute,
  subheaderAttribute,
  imageUrlAttribute,
  videoUrlAttribute,
  isDraftAttribute,
  lowerLabelAttribute,
  upperLabelAttribute,
  isColorCodingEnabledAttribute,
} from '../attributes/index';

/**
 * NPS(Net Promoter Score) 질문 엔티티: 0~10 범위의 추천 점수 질문.
 * 하단/상단 라벨, 색상 코딩 활성화 옵션을 지원한다.
 */
export const npsEntity = createEntity({
  name: 'nps',
  attributes: [
    // 공통
    headlineAttribute,
    requiredAttribute,
    subheaderAttribute,
    imageUrlAttribute,
    videoUrlAttribute,
    isDraftAttribute,
    // 고유
    lowerLabelAttribute,
    upperLabelAttribute,
    isColorCodingEnabledAttribute,
  ],
  parentRequired: true,
});
