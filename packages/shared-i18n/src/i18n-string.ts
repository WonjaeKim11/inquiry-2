import { DEFAULT_LOCALE } from './supported-locales';

/** 다국어 문자열 타입 (로케일 코드 → 번역 텍스트 매핑) */
export type TI18nString = Record<string, string>;

/**
 * 다국어 문자열 객체에서 특정 로케일의 값을 가져온다.
 * 해당 로케일 값이 없으면 en-US(기본 로케일)로 fallback하고,
 * 그마저도 없으면 첫 번째 값을 반환한다.
 *
 * @param i18nString - 로케일 코드를 키로 하는 다국어 문자열 객체
 * @param locale - 가져올 로케일 코드
 * @returns 해당 로케일의 번역 텍스트 (없으면 빈 문자열)
 */
export function getLocalizedString(
  i18nString: TI18nString,
  locale: string
): string {
  return (
    i18nString[locale] ||
    i18nString[DEFAULT_LOCALE] ||
    Object.values(i18nString)[0] ||
    ''
  );
}

/**
 * 기본 로케일 키만 가진 빈 다국어 문자열 객체를 생성한다.
 * @returns 기본 로케일 키에 빈 문자열이 매핑된 객체
 */
export function createEmptyI18nString(): TI18nString {
  return { [DEFAULT_LOCALE]: '' };
}
