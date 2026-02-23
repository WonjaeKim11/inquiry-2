import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';
import { subFieldSchema, ADDRESS_FIELD_IDS } from '../../types/sub-field.types';

/**
 * addressFields 속성 — 주소 입력 질문의 서브 필드 구성.
 * 각 주소 구성요소(addressLine1, addressLine2, city, state, zip, country)별로
 * 표시 여부, 필수 여부, placeholder를 설정할 수 있다.
 */
const addressFieldsSchema = z.object(
  Object.fromEntries(
    ADDRESS_FIELD_IDS.map((id) => [id, subFieldSchema])
  ) as Record<string, typeof subFieldSchema>
);

export const addressFieldsAttribute = createAttribute({
  name: 'addressFields',
  validate(value) {
    return addressFieldsSchema.parse(value);
  },
});
