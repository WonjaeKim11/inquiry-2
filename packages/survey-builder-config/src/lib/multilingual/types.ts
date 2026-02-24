import { z } from 'zod';

/**
 * 다국어 문자열 타입.
 * "default" 키는 필수이며, 나머지는 언어 코드별 번역 문자열.
 * 기존 I18nString과의 차이: "default" 키를 명시적으로 요구한다.
 */
export type TI18nString = { default: string; [languageCode: string]: string };

/**
 * 설문 언어 설정 항목.
 * Survey.languages JSON 배열의 각 항목을 나타낸다.
 */
export interface SurveyLanguage {
  /** Language 테이블 ID (CUID2) */
  languageId: string;
  /** 정확히 1개만 true — 기본 언어 */
  default: boolean;
  /** true인 언어만 응답자에게 노출 */
  enabled: boolean;
}

/**
 * 설문 언어 설정 전체.
 * SurveyLanguage 배열 + 언어 전환 UI 표시 여부.
 */
export interface SurveyLanguageConfig {
  languages: SurveyLanguage[];
  showLanguageSwitch: boolean;
}

/** TI18nString Zod 스키마 — default 키 필수, 모든 값이 string */
export const ti18nStringSchema = z
  .object({ default: z.string() })
  .catchall(z.string());

/** SurveyLanguage Zod 스키마 */
export const surveyLanguageSchema = z.object({
  languageId: z.string().min(1),
  default: z.boolean(),
  enabled: z.boolean(),
});

/**
 * SurveyLanguage 배열 Zod 스키마.
 * - default가 true인 항목이 정확히 1개
 * - languageId 중복 불가
 */
export const surveyLanguageArraySchema = z
  .array(surveyLanguageSchema)
  .refine(
    (arr) => {
      if (arr.length === 0) return true; // 빈 배열 허용
      const defaults = arr.filter((l) => l.default);
      return defaults.length === 1;
    },
    { message: '기본 언어(default=true)는 정확히 1개여야 합니다.' }
  )
  .refine(
    (arr) => {
      const ids = arr.map((l) => l.languageId);
      return new Set(ids).size === ids.length;
    },
    { message: 'languageId가 중복되었습니다.' }
  );

/** SurveyLanguageConfig Zod 스키마 */
export const surveyLanguageConfigSchema = z.object({
  languages: surveyLanguageArraySchema,
  showLanguageSwitch: z.boolean(),
});
