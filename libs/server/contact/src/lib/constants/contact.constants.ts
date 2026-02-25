/** CSV Import 최대 레코드 수 */
export const MAX_CSV_RECORDS = 10_000;

/** Bulk Upload API 최대 건수 */
export const MAX_BULK_SIZE = 250;

/** 환경당 최대 속성 키 수 */
export const MAX_ATTRIBUTE_KEYS = 150;

/**
 * Environment 생성 시 자동으로 생성되는 기본 속성 키 목록.
 * type: DEFAULT, 삭제/수정 불가.
 */
export const DEFAULT_ATTRIBUTE_KEYS = [
  {
    key: 'userId',
    name: 'User ID',
    dataType: 'STRING' as const,
    isUnique: true,
  },
  { key: 'email', name: 'Email', dataType: 'STRING' as const, isUnique: true },
  {
    key: 'firstName',
    name: 'First Name',
    dataType: 'STRING' as const,
    isUnique: false,
  },
  {
    key: 'lastName',
    name: 'Last Name',
    dataType: 'STRING' as const,
    isUnique: false,
  },
] as const;

/** safe identifier 정규식 (소문자, 숫자, 언더스코어, 첫 글자는 알파벳) */
export const SAFE_IDENTIFIER_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;
