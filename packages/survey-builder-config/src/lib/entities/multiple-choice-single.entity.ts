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
  displayTypeAttribute,
  otherOptionPlaceholderAttribute,
} from '../attributes/index';

/**
 * MultipleChoiceSingle 질문 엔티티: 단일 선택(라디오) 질문.
 * 선택지 목록, 셔플 옵션, 표시 유형(라디오/드롭다운), 기타 옵션을 지원한다.
 */
export const multipleChoiceSingleEntity = createEntity({
  name: 'multipleChoiceSingle',
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
    displayTypeAttribute,
    otherOptionPlaceholderAttribute,
  ],
  parentRequired: true,
});
