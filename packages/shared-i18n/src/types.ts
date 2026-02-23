/** 지원 로케일 코드 타입 (15개 언어) */
export type SupportedLocale =
  | 'en-US'
  | 'ko-KR'
  | 'ja-JP'
  | 'zh-Hans-CN'
  | 'zh-Hant-TW'
  | 'de-DE'
  | 'es-ES'
  | 'fr-FR'
  | 'pt-BR'
  | 'pt-PT'
  | 'ru-RU'
  | 'nl-NL'
  | 'sv-SE'
  | 'hu-HU'
  | 'ro-RO';

/** 로케일 설정 인터페이스 */
export interface LocaleConfig {
  /** BCP 47 형식의 로케일 코드 */
  code: string;
  /** 영문 언어명 */
  name: string;
  /** 해당 언어의 원어 표기명 */
  nativeName: string;
  /** 텍스트 방향 (ltr: 좌→우, rtl: 우→좌) */
  dir: 'ltr' | 'rtl';
}
