import type { LocaleConfig } from './types';

/** 지원 로케일 목록 (15개 언어) */
export const SUPPORTED_LOCALES: readonly LocaleConfig[] = [
  { code: 'en-US', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어', dir: 'ltr' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  {
    code: 'zh-Hans-CN',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    dir: 'ltr',
  },
  {
    code: 'zh-Hant-TW',
    name: 'Chinese (Traditional)',
    nativeName: '繁體中文',
    dir: 'ltr',
  },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', dir: 'ltr' },
  {
    code: 'pt-BR',
    name: 'Portuguese (Brazil)',
    nativeName: 'Português (Brasil)',
    dir: 'ltr',
  },
  {
    code: 'pt-PT',
    name: 'Portuguese (Portugal)',
    nativeName: 'Português (Portugal)',
    dir: 'ltr',
  },
  { code: 'ru-RU', name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  { code: 'nl-NL', name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr' },
  { code: 'sv-SE', name: 'Swedish', nativeName: 'Svenska', dir: 'ltr' },
  { code: 'hu-HU', name: 'Hungarian', nativeName: 'Magyar', dir: 'ltr' },
  { code: 'ro-RO', name: 'Romanian', nativeName: 'Română', dir: 'ltr' },
] as const;

/** 로케일 코드 배열 (라우팅, 유효성 검사에 사용) */
export const LOCALE_CODES = SUPPORTED_LOCALES.map((l) => l.code);

/** 기본 로케일 (fallback 언어) */
export const DEFAULT_LOCALE = 'en-US';

/**
 * 로케일 코드로 해당 로케일 설정을 조회한다.
 * @param code - BCP 47 형식의 로케일 코드
 * @returns 일치하는 LocaleConfig 또는 undefined
 */
export function getLocaleConfig(code: string): LocaleConfig | undefined {
  return SUPPORTED_LOCALES.find((l) => l.code === code);
}

/**
 * 주어진 로케일 코드가 지원되는 로케일인지 검사한다.
 * @param code - 검사할 로케일 코드
 * @returns 지원 여부
 */
export function isValidLocale(code: string): boolean {
  return LOCALE_CODES.includes(code);
}
