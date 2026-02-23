import { createEntity } from '@coltorapps/builder';
import {
  headlineAttribute,
  requiredAttribute,
  subheaderAttribute,
  imageUrlAttribute,
  videoUrlAttribute,
  isDraftAttribute,
  rowsAttribute,
  columnsAttribute,
  shuffleOptionAttribute,
  validationConfigAttribute,
} from '../attributes/index';

/**
 * Matrix 질문 엔티티: 행렬(그리드) 형태의 질문.
 * 행(질문 항목)과 열(선택지)을 교차 배치하며, 셔플과 검증 규칙을 지원한다.
 */
export const matrixEntity = createEntity({
  name: 'matrix',
  attributes: [
    // 공통
    headlineAttribute,
    requiredAttribute,
    subheaderAttribute,
    imageUrlAttribute,
    videoUrlAttribute,
    isDraftAttribute,
    // 고유
    rowsAttribute,
    columnsAttribute,
    shuffleOptionAttribute,
    validationConfigAttribute,
  ],
  parentRequired: true,
});
