/** 설문 당 최대 쿼터 수 */
export const MAX_QUOTAS_PER_SURVEY = 50;

/** 쿼터 이름 최대 길이 */
export const QUOTA_NAME_MAX_LENGTH = 100;

/** 쿼터 이름 유효 패턴 (알파벳, 숫자, 한글, 공백, 하이픈, 언더스코어) */
export const QUOTA_NAME_PATTERN = /^[\p{L}\p{N}\s\-_]+$/u;
