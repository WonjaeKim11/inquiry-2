// Types & Schemas
export type {
  TI18nString,
  SurveyLanguage,
  SurveyLanguageConfig,
} from './types';
export {
  ti18nStringSchema,
  surveyLanguageSchema,
  surveyLanguageArraySchema,
  surveyLanguageConfigSchema,
} from './types';

// Constants
export {
  RTL_LANGUAGE_CODES,
  RTL_LANGUAGE_FULL_CODES,
  MAX_SURVEY_LANGUAGES,
} from './constants';

// ISO Language Codes
export { ISO_LANGUAGE_CODES } from './iso-language-codes';
export type { IsoLanguageCode } from './iso-language-codes';

// RTL Detector
export { isRtlLanguage, detectTextDirection } from './rtl-detector';

// i18n String Utilities
export {
  normalizeToI18nString,
  addLanguageKey,
  stripTranslations,
  getLocalizedText,
  isI18nString,
} from './i18n-string.utils';

// Validators
export {
  validateTI18nString,
  validateSurveyLanguages,
  validateTranslationCompleteness,
  stripHtmlAndCheckEmpty,
} from './validator';
