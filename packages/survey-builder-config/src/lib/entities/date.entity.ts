import { createEntity } from '@coltorapps/builder';
import {
  headlineAttribute,
  requiredAttribute,
  subheaderAttribute,
  imageUrlAttribute,
  videoUrlAttribute,
  isDraftAttribute,
  dateFormatAttribute,
  htmlAttribute,
  validationConfigAttribute,
} from '../attributes/index';

/**
 * Date 질문 엔티티: 날짜 입력 질문.
 * 날짜 포맷(ISO/로컬 등), HTML 설명, 검증 규칙을 지원한다.
 */
export const dateEntity = createEntity({
  name: 'date',
  attributes: [
    // 공통
    headlineAttribute,
    requiredAttribute,
    subheaderAttribute,
    imageUrlAttribute,
    videoUrlAttribute,
    isDraftAttribute,
    // 고유
    dateFormatAttribute,
    htmlAttribute,
    validationConfigAttribute,
  ],
  parentRequired: true,
});
