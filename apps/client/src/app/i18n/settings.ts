import { LOCALE_CODES, DEFAULT_LOCALE } from '@inquiry/shared-i18n';

/** 기본 fallback 언어 (en-US) */
export const fallbackLng = DEFAULT_LOCALE;

/** 지원하는 전체 로케일 코드 목록 (15개) */
export const languages = [...LOCALE_CODES];

/** 기본 네임스페이스 */
export const defaultNS = 'translation';

/** i18next 쿠키명 */
export const cookieName = 'i18next';

/**
 * i18next 초기화 옵션을 생성한다.
 * @param lng - 사용할 언어 코드 (기본값: fallbackLng)
 * @param ns - 사용할 네임스페이스 (기본값: defaultNS)
 * @returns i18next init 옵션 객체
 */
export function getOptions(
  lng = fallbackLng,
  ns: string | string[] = defaultNS
) {
  return {
    supportedLngs: languages,
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns,
  };
}
