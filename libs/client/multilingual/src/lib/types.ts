import type { ProjectLanguage } from '@inquiry/client-project';
import type { SurveyLanguage } from '@inquiry/survey-builder-config';

/** 번역 완료도 상태 */
export type TranslationStatus = 'complete' | 'incomplete' | 'missing';

/**
 * 프로젝트 언어 + 설문 언어 설정을 결합한 뷰 타입.
 * 설문 에디터의 다국어 카드에서 각 언어의 상태를 표시하는 데 사용한다.
 */
export interface LanguageWithConfig {
  /** 프로젝트 Language 엔티티 */
  language: ProjectLanguage;
  /** survey.languages 배열에서 매칭되는 항목 (없으면 null) */
  surveyConfig: SurveyLanguage | null;
  /** 기본 언어 여부 */
  isDefault: boolean;
  /** 활성화 여부 */
  isEnabled: boolean;
  /** 번역 완료도 */
  translationStatus: TranslationStatus;
}

/**
 * 현재 편집 중인 언어 컨텍스트.
 * 설문 에디터에서 어떤 언어를 편집 중인지를 추적한다.
 */
export interface EditingLanguageContext {
  /** Language 테이블 ID */
  languageId: string;
  /** ISO 언어 코드 */
  code: string;
  /** RTL 언어 여부 */
  isRtl: boolean;
}
