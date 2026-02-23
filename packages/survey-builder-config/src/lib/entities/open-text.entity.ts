import { createEntity } from '@coltorapps/builder';
import {
  headlineAttribute,
  requiredAttribute,
  placeholderAttribute,
  descriptionAttribute,
} from '../attributes/index';

/**
 * OpenText 질문 엔티티: 자유 텍스트 입력 질문.
 * headline(필수), required, placeholder, description 속성을 가진다.
 */
export const openTextEntity = createEntity({
  name: 'openText',
  attributes: [
    headlineAttribute,
    requiredAttribute,
    placeholderAttribute,
    descriptionAttribute,
  ],
});
