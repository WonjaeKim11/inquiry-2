import type { TI18nString } from './types';

/**
 * string 또는 TI18nString 값을 TI18nString으로 정규화한다.
 * 하위 호환성: 기존 단일 언어 string을 { default: "..." } 형태로 변환.
 *
 * @param value - 단일 문자열 또는 TI18nString 객체
 * @returns 정규화된 TI18nString 객체
 */
export function normalizeToI18nString(
  value: string | TI18nString
): TI18nString {
  if (typeof value === 'string') return { default: value };
  return value;
}

/**
 * TI18nString에 새 언어 키를 추가한다.
 * 이미 존재하는 키는 기존 값을 보존한다 (NFR-015-04).
 *
 * @param i18nStr - 기존 TI18nString 객체
 * @param code - 추가할 언어 코드
 * @returns 새 언어 키가 추가된 TI18nString (불변 — 새 객체 반환)
 */
export function addLanguageKey(
  i18nStr: TI18nString,
  code: string
): TI18nString {
  if (code in i18nStr) return i18nStr;
  return { ...i18nStr, [code]: '' };
}

/**
 * TI18nString에서 default 키만 남기고 번역을 제거한다.
 *
 * @param i18nStr - 번역이 포함된 TI18nString 객체
 * @returns default 값만 포함된 TI18nString
 */
export function stripTranslations(i18nStr: TI18nString): TI18nString {
  return { default: i18nStr.default };
}

/**
 * TI18nString에서 지정된 언어의 텍스트를 반환한다.
 * 해당 언어가 없으면 default 값을 반환한다.
 *
 * @param i18nStr - TI18nString 객체
 * @param code - 조회할 언어 코드
 * @returns 해당 언어의 텍스트, 없으면 default 텍스트
 */
export function getLocalizedText(i18nStr: TI18nString, code: string): string {
  return i18nStr[code] || i18nStr.default;
}

/**
 * 값이 TI18nString 형태인지 판별한다.
 * 객체이고 default 키가 string인 경우 true.
 *
 * @param value - 판별할 값
 * @returns TI18nString 형태이면 true
 */
export function isI18nString(value: unknown): value is TI18nString {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const obj = value as Record<string, unknown>;
  return typeof obj['default'] === 'string';
}
