import { createEntity } from '@coltorapps/builder';
import {
  headlineAttribute,
  requiredAttribute,
  subheaderAttribute,
  imageUrlAttribute,
  videoUrlAttribute,
  isDraftAttribute,
  contactInfoFieldsAttribute,
  validationConfigAttribute,
} from '../attributes/index';

/**
 * ContactInfo 질문 엔티티: 연락처 정보 수집 질문.
 * 이름, 이메일, 전화번호, 회사명 등의 필드 구성과 검증 규칙을 지원한다.
 */
export const contactInfoEntity = createEntity({
  name: 'contactInfo',
  attributes: [
    // 공통
    headlineAttribute,
    requiredAttribute,
    subheaderAttribute,
    imageUrlAttribute,
    videoUrlAttribute,
    isDraftAttribute,
    // 고유
    contactInfoFieldsAttribute,
    validationConfigAttribute,
  ],
  parentRequired: true,
});
