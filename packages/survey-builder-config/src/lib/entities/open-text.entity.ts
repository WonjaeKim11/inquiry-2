import { createEntity } from '@coltorapps/builder';
import {
  headlineAttribute,
  requiredAttribute,
  subheaderAttribute,
  imageUrlAttribute,
  videoUrlAttribute,
  isDraftAttribute,
  placeholderAttribute,
  longAnswerAttribute,
  inputTypeAttribute,
  insightsEnabledAttribute,
  charLimitEnabledAttribute,
  minLengthAttribute,
  maxLengthAttribute,
  validationConfigAttribute,
} from '../attributes/index';

/**
 * OpenText 질문 엔티티: 자유 텍스트 입력 질문.
 * 단문/장문 텍스트, 입력 유형(이메일/URL/전화번호 등), 문자 수 제한,
 * AI 인사이트 활성화 등을 지원한다.
 */
export const openTextEntity = createEntity({
  name: 'openText',
  attributes: [
    // 공통
    headlineAttribute,
    requiredAttribute,
    subheaderAttribute,
    imageUrlAttribute,
    videoUrlAttribute,
    isDraftAttribute,
    // 고유
    placeholderAttribute,
    longAnswerAttribute,
    inputTypeAttribute,
    insightsEnabledAttribute,
    charLimitEnabledAttribute,
    minLengthAttribute,
    maxLengthAttribute,
    validationConfigAttribute,
  ],
  parentRequired: true,
  attributesExtensions: {
    minLength: {
      validate(value, context) {
        const validated = context.validate(value);
        if (
          context.entity.attributes.charLimitEnabled &&
          validated != null &&
          context.entity.attributes.maxLength != null
        ) {
          if (validated > context.entity.attributes.maxLength) {
            throw new Error('최소 길이는 최대 길이보다 작아야 합니다');
          }
        }
        return validated;
      },
    },
    maxLength: {
      validate(value, context) {
        const validated = context.validate(value);
        if (
          context.entity.attributes.charLimitEnabled &&
          validated != null &&
          context.entity.attributes.minLength != null
        ) {
          if (validated < context.entity.attributes.minLength) {
            throw new Error('최대 길이는 최소 길이보다 커야 합니다');
          }
        }
        return validated;
      },
    },
  },
});
