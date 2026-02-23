import { createEntity } from '@coltorapps/builder';
import {
  headlineAttribute,
  requiredAttribute,
  subheaderAttribute,
  imageUrlAttribute,
  videoUrlAttribute,
  isDraftAttribute,
  choicesAttribute,
  shuffleOptionAttribute,
  otherOptionPlaceholderAttribute,
  validationConfigAttribute,
} from '../attributes/index';

/**
 * Ranking 질문 엔티티: 드래그 앤 드롭으로 항목 순위를 매기는 질문.
 * 선택지 목록, 셔플 옵션, 기타 옵션, 검증 규칙을 지원한다.
 */
export const rankingEntity = createEntity({
  name: 'ranking',
  attributes: [
    // 공통
    headlineAttribute,
    requiredAttribute,
    subheaderAttribute,
    imageUrlAttribute,
    videoUrlAttribute,
    isDraftAttribute,
    // 고유
    choicesAttribute,
    shuffleOptionAttribute,
    otherOptionPlaceholderAttribute,
    validationConfigAttribute,
  ],
  parentRequired: true,
});
