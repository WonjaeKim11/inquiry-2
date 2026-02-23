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
  validationConfigAttribute,
} from '../attributes/index';

/**
 * MultipleChoiceMulti 질문 엔티티: 복수 선택(체크박스) 질문.
 * 선택지 목록, 셔플 옵션, 표시 유형, 기타 옵션 및 검증 규칙을 지원한다.
 */
export const multipleChoiceMultiEntity = createEntity({
  name: 'multipleChoiceMulti',
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
    validationConfigAttribute,
  ],
  parentRequired: true,
});
