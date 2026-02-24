import type { SurveyLanguage } from './types';
import { MAX_SURVEY_LANGUAGES } from './constants';

/**
 * TI18nString 값을 검증한다.
 * - 객체인지
 * - default 키가 존재하는지
 * - default 값이 비어있지 않은지
 *
 * @param value - 검증할 값
 * @returns 검증 결과 ({ valid, error? })
 */
export function validateTI18nString(value: unknown): {
  valid: boolean;
  error?: string;
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { valid: false, error: 'TI18nString은 객체여야 합니다.' };
  }
  const obj = value as Record<string, unknown>;
  if (!('default' in obj)) {
    return { valid: false, error: '"default" 키가 필요합니다.' };
  }
  if (typeof obj['default'] !== 'string') {
    return { valid: false, error: '"default" 값은 문자열이어야 합니다.' };
  }
  // 모든 값이 string인지 확인
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val !== 'string') {
      return { valid: false, error: `"${key}" 값은 문자열이어야 합니다.` };
    }
  }
  return { valid: true };
}

/**
 * SurveyLanguage 배열을 검증한다.
 * - default가 true인 항목이 정확히 1개
 * - languageId 중복 불가
 * - 최대 언어 수 초과 여부
 * - 기본 언어는 반드시 enabled
 *
 * @param languages - 검증할 SurveyLanguage 배열
 * @returns 검증 결과 ({ valid, errors })
 */
export function validateSurveyLanguages(languages: SurveyLanguage[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (languages.length === 0) return { valid: true, errors: [] };

  // 최대 언어 수 검사
  if (languages.length > MAX_SURVEY_LANGUAGES) {
    errors.push(
      `언어는 최대 ${MAX_SURVEY_LANGUAGES}개까지 설정할 수 있습니다.`
    );
  }

  // default 유일성 검사
  const defaults = languages.filter((l) => l.default);
  if (defaults.length === 0) {
    errors.push('기본 언어(default=true)가 1개 필요합니다.');
  } else if (defaults.length > 1) {
    errors.push('기본 언어(default=true)는 정확히 1개여야 합니다.');
  }

  // languageId 중복 검사
  const ids = languages.map((l) => l.languageId);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    errors.push(
      `languageId가 중복되었습니다: ${[...new Set(duplicates)].join(', ')}`
    );
  }

  // 기본 언어는 반드시 enabled
  const defaultLang = defaults[0];
  if (defaultLang && !defaultLang.enabled) {
    errors.push('기본 언어는 반드시 활성화(enabled=true)되어야 합니다.');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * HTML 태그를 제거한 후 빈 문자열인지 확인한다.
 *
 * @param html - HTML 문자열
 * @returns 태그 제거 후 빈 문자열이면 true
 */
export function stripHtmlAndCheckEmpty(html: string): boolean {
  const stripped = html.replace(/<[^>]*>/g, '').trim();
  return stripped.length === 0;
}

/**
 * 번역 완료 검증.
 * 활성 언어에 대해 모든 TI18nString 필드의 해당 언어 키가 비어있지 않은지 확인한다.
 *
 * surveyData 내의 모든 TI18nString 필드를 재귀적으로 탐색하여 검증.
 *
 * @param surveyData - 설문 데이터 객체 (TI18nString 필드를 포함)
 * @param enabledLanguageCodes - 활성 언어 코드 배열
 * @returns 검증 결과 ({ valid, missingTranslations })
 */
export function validateTranslationCompleteness(
  surveyData: Record<string, unknown>,
  enabledLanguageCodes: string[]
): {
  valid: boolean;
  missingTranslations: { field: string; language: string }[];
} {
  const missingTranslations: { field: string; language: string }[] = [];

  /**
   * 재귀적으로 TI18nString 필드를 찾아 검증한다.
   * TI18nString은 "default" 키가 string인 객체로 판별한다.
   */
  function traverse(obj: unknown, path: string): void {
    if (obj === null || obj === undefined) return;

    if (typeof obj === 'object' && !Array.isArray(obj)) {
      const record = obj as Record<string, unknown>;

      // TI18nString인지 확인 (default 키가 string인 객체)
      if (typeof record['default'] === 'string') {
        // TI18nString으로 간주하고 번역 완료 여부 확인
        for (const langCode of enabledLanguageCodes) {
          const value = record[langCode];
          if (typeof value !== 'string' || value.trim().length === 0) {
            missingTranslations.push({ field: path, language: langCode });
          }
        }
        return; // TI18nString 내부는 더 이상 탐색하지 않음
      }

      // 일반 객체는 재귀 탐색
      for (const [key, val] of Object.entries(record)) {
        traverse(val, path ? `${path}.${key}` : key);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        traverse(item, `${path}[${index}]`);
      });
    }
  }

  traverse(surveyData, '');

  return {
    valid: missingTranslations.length === 0,
    missingTranslations,
  };
}
