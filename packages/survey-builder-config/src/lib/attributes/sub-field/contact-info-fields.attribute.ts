import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';
import {
  subFieldSchema,
  CONTACT_INFO_FIELD_IDS,
} from '../../types/sub-field.types';

/**
 * contactInfoFields 속성 — 연락처 입력 질문의 서브 필드 구성.
 * 각 연락처 구성요소(firstName, lastName, email, phone, company)별로
 * 표시 여부, 필수 여부, placeholder를 설정할 수 있다.
 */
const contactInfoFieldsSchema = z.object(
  Object.fromEntries(
    CONTACT_INFO_FIELD_IDS.map((id) => [id, subFieldSchema])
  ) as Record<string, typeof subFieldSchema>
);

export const contactInfoFieldsAttribute = createAttribute({
  name: 'contactInfoFields',
  validate(value) {
    return contactInfoFieldsSchema.parse(value);
  },
});
