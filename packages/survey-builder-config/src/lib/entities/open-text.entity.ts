import { createEntity } from '@coltorapps/builder';
import {
  headlineAttribute,
  requiredAttribute,
  placeholderAttribute,
  subheaderAttribute,
} from '../attributes/index';

/**
 * OpenText 질문 엔티티: 자유 텍스트 입력 질문.
 * headline(필수), required, placeholder, subheader 속성을 가진다.
 */
export const openTextEntity = createEntity({
  name: 'openText',
  attributes: [
    headlineAttribute,
    requiredAttribute,
    placeholderAttribute,
    subheaderAttribute,
  ],
});
