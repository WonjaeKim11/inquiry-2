/**
 * 프로젝트 관련 enum 상수 정의.
 * Prisma enum과 동일한 값을 유지하며, Zod 스키마에서 참조한다.
 */

/** 프로젝트 모드 */
export const PROJECT_MODES = ['surveys', 'cx'] as const;
export type ProjectMode = (typeof PROJECT_MODES)[number];

/** 위젯 배치 위치 */
export const WIDGET_PLACEMENTS = [
  'bottomLeft',
  'bottomRight',
  'topLeft',
  'topRight',
  'center',
] as const;
export type WidgetPlacement = (typeof WIDGET_PLACEMENTS)[number];

/** 오버레이 설정 */
export const DARK_OVERLAYS = ['none', 'light', 'dark'] as const;
export type DarkOverlay = (typeof DARK_OVERLAYS)[number];

/** 환경 유형 */
export const ENVIRONMENT_TYPES = ['production', 'development'] as const;
export type EnvironmentType = (typeof ENVIRONMENT_TYPES)[number];

/** ActionClass 유형 */
export const ACTION_CLASS_TYPES = ['code', 'noCode'] as const;
export type ActionClassType = (typeof ACTION_CLASS_TYPES)[number];

/** noCode 액션 유형 */
export const NO_CODE_ACTION_TYPES = [
  'click',
  'pageView',
  'exitIntent',
  'fiftyPercentScroll',
] as const;

/** URL 필터 규칙 */
export const URL_FILTER_RULES = [
  'exactMatch',
  'contains',
  'startsWith',
  'endsWith',
  'notMatch',
  'notContains',
  'matchesRegex',
] as const;

/** URL 필터 연결자 */
export const URL_FILTER_CONNECTORS = ['or', 'and'] as const;

/** 프로젝트 이름 길이 제한 */
export const PROJECT_NAME_MIN_LENGTH = 1;
export const PROJECT_NAME_MAX_LENGTH = 64;

/** ActionClass 이름 길이 제한 */
export const ACTION_CLASS_NAME_MIN_LENGTH = 1;
export const ACTION_CLASS_NAME_MAX_LENGTH = 64;

/** Language alias 길이 제한 */
export const LANGUAGE_ALIAS_MAX_LENGTH = 64;
