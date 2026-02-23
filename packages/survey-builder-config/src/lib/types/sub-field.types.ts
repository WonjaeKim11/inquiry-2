import { z } from 'zod';
import type { LocalizedString } from './localized-string';

/**
 * 서브 필드 (Address/ContactInfo 등 복합 필드의 개별 항목).
 * show: 표시 여부, required: 필수 여부, placeholder: 다국어 안내 텍스트.
 */
export interface SubField {
  show: boolean;
  required: boolean;
  placeholder?: LocalizedString;
}

/** 서브 필드 Zod 스키마 */
export const subFieldSchema = z.object({
  show: z.boolean(),
  required: z.boolean(),
  placeholder: z.record(z.string(), z.string()).optional(),
});

/** Address 필드 ID — 주소 입력에 필요한 개별 필드 식별자 */
export type AddressFieldId =
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'state'
  | 'zip'
  | 'country';

/** 모든 Address 필드 ID 목록 */
export const ADDRESS_FIELD_IDS: AddressFieldId[] = [
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'zip',
  'country',
];

/** ContactInfo 필드 ID — 연락처 입력에 필요한 개별 필드 식별자 */
export type ContactInfoFieldId =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'company';

/** 모든 ContactInfo 필드 ID 목록 */
export const CONTACT_INFO_FIELD_IDS: ContactInfoFieldId[] = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'company',
];
