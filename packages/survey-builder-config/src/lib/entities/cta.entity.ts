import { createEntity } from '@coltorapps/builder';
import {
  headlineAttribute,
  requiredAttribute,
  subheaderAttribute,
  imageUrlAttribute,
  videoUrlAttribute,
  isDraftAttribute,
  dismissibleAttribute,
  buttonUrlAttribute,
  buttonLabelAttribute,
} from '../attributes/index';

/**
 * CTA(Call To Action) 질문 엔티티: 외부 링크 버튼이 포함된 안내 화면.
 * dismissible 설정에 따라 버튼 URL/라벨 필수 여부가 결정된다.
 */
export const ctaEntity = createEntity({
  name: 'cta',
  attributes: [
    // 공통
    headlineAttribute,
    requiredAttribute,
    subheaderAttribute,
    imageUrlAttribute,
    videoUrlAttribute,
    isDraftAttribute,
    // 고유
    dismissibleAttribute,
    buttonUrlAttribute,
    buttonLabelAttribute,
  ],
  parentRequired: true,
  attributesExtensions: {
    buttonUrl: {
      validate(value, context) {
        const validated = context.validate(value);
        if (context.entity.attributes.dismissible === true && !validated) {
          throw new Error('외부 버튼 활성화 시 버튼 URL은 필수입니다');
        }
        return validated;
      },
    },
    buttonLabel: {
      validate(value, context) {
        const validated = context.validate(value);
        if (context.entity.attributes.dismissible === true) {
          if (
            !validated ||
            typeof validated !== 'object' ||
            !Object.values(validated).some((v) => String(v).trim().length > 0)
          ) {
            throw new Error('외부 버튼 활성화 시 버튼 라벨은 필수입니다');
          }
        }
        return validated;
      },
    },
  },
});
