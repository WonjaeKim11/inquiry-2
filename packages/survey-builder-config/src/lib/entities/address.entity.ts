import { createEntity } from '@coltorapps/builder';
import {
  headlineAttribute,
  requiredAttribute,
  subheaderAttribute,
  imageUrlAttribute,
  videoUrlAttribute,
  isDraftAttribute,
  addressFieldsAttribute,
  validationConfigAttribute,
} from '../attributes/index';

/**
 * Address 질문 엔티티: 주소 입력 질문.
 * 주소 필드(도시, 주/도, 우편번호, 국가 등) 구성과 검증 규칙을 지원한다.
 */
export const addressEntity = createEntity({
  name: 'address',
  attributes: [
    // 공통
    headlineAttribute,
    requiredAttribute,
    subheaderAttribute,
    imageUrlAttribute,
    videoUrlAttribute,
    isDraftAttribute,
    // 고유
    addressFieldsAttribute,
    validationConfigAttribute,
  ],
  parentRequired: true,
});
