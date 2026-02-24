import type {
  WelcomeCard,
  SurveyEnding,
  HiddenFields,
  SurveyVariable,
  SurveyLanguage,
} from '@inquiry/survey-builder-config';

/** 편집기 탭 식별자 */
export type EditorTab = 'elements' | 'styling' | 'settings' | 'followUps';

/** 자동 저장 상태 */
export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * 편집기 설정.
 * 편집기의 동작 모드와 언어 설정을 관리한다.
 */
export interface EditorConfig {
  /** CX 모드 여부 (true이면 Settings 탭 숨김) */
  isCxMode: boolean;
  /** 스타일 오버라이드 허용 여부 (false이면 프로젝트 테마만 사용) */
  isStyleOverrideAllowed: boolean;
  /** 현재 편집 중인 언어 코드 (예: 'ko', 'en') */
  selectedLanguage: string;
}

/**
 * 편집기 UI 상태.
 * 현재 활성 탭, 선택된 요소, 자동 저장 상태 등 UI에 필요한 상태를 관리한다.
 */
export interface EditorUIState {
  /** 현재 활성 탭 */
  activeTab: EditorTab;
  /** 현재 선택된 Element ID (null이면 선택 없음) */
  activeElementId: string | null;
  /** 자동 저장 상태 */
  autoSaveStatus: AutoSaveStatus;
  /** 검증 오류가 있는 Entity ID 목록 (UI에서 오류 표시 용도) */
  invalidElements: string[];
  /** 사이드바에서 펼쳐진 Block ID 목록 */
  expandedBlockIds: string[];
  /** 편집기 설정 */
  editorConfig: EditorConfig;
}

/** 편집기 UI 상태 변경 액션 */
export type EditorUIAction =
  | { type: 'SET_ACTIVE_TAB'; tab: EditorTab }
  | { type: 'SET_ACTIVE_ELEMENT'; elementId: string | null }
  | { type: 'SET_AUTO_SAVE_STATUS'; status: AutoSaveStatus }
  | { type: 'SET_INVALID_ELEMENTS'; elementIds: string[] }
  | { type: 'TOGGLE_BLOCK_EXPANDED'; blockId: string }
  | { type: 'SET_ALL_BLOCKS_EXPANDED'; blockIds: string[] }
  | { type: 'SET_EDITOR_CONFIG'; config: Partial<EditorConfig> }
  | { type: 'SET_SELECTED_LANGUAGE'; language: string };

/**
 * SurveyMeta 상태 (Builder Schema 외부 데이터).
 * schema-converter.ts의 SurveyMeta와 동일한 구조를 유지한다.
 */
export interface SurveyMetaState {
  /** 설문 고유 ID */
  surveyId: string;
  /** 설문 이름 */
  name: string;
  /** 설문 유형 */
  type: 'link' | 'app';
  /** 설문 상태 */
  status: 'DRAFT' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  /** 웰컴 카드 설정 */
  welcomeCard: WelcomeCard;
  /** 종료 카드 목록 */
  endings: SurveyEnding[];
  /** 히든 필드 설정 */
  hiddenFields: HiddenFields;
  /** 변수 목록 */
  variables: SurveyVariable[];
  /** 표시 옵션 */
  displayOption: string;
  /** 설문 표시 지연 시간 (ms) */
  delay: number;
  /** 자동 닫힘 시간 (초) */
  autoClose: number | null;
  /** 자동 완료 시간 (초) */
  autoComplete: number | null;
  /** PIN 코드 */
  pin: string | null;
  /** 단일 응답 모드 */
  singleUse: boolean;
  /** 재접촉 방지 일수 */
  recontactDays: number | null;
  /** 지원 언어 목록 */
  languages: SurveyLanguage[];
  /** 언어 전환 UI 표시 여부 */
  showLanguageSwitch: boolean | null;
  /** 설문 개별 스타일링 */
  styling: Record<string, unknown> | null;
}

/** SurveyMeta 상태 변경 액션 */
export type SurveyMetaAction =
  | { type: 'UPDATE_SURVEY_NAME'; name: string }
  | { type: 'UPDATE_WELCOME_CARD'; welcomeCard: WelcomeCard }
  | { type: 'ADD_ENDING'; ending: SurveyEnding }
  | { type: 'DELETE_ENDING'; endingId: string }
  | { type: 'UPDATE_ENDING'; ending: SurveyEnding }
  | { type: 'REORDER_ENDINGS'; endings: SurveyEnding[] }
  | { type: 'UPDATE_HIDDEN_FIELDS'; hiddenFields: HiddenFields }
  | { type: 'ADD_HIDDEN_FIELD'; fieldId: string }
  | { type: 'DELETE_HIDDEN_FIELD'; fieldId: string }
  | { type: 'ADD_VARIABLE'; variable: SurveyVariable }
  | { type: 'UPDATE_VARIABLE'; variable: SurveyVariable }
  | { type: 'DELETE_VARIABLE'; variableId: string }
  | { type: 'UPDATE_STYLING'; styling: Record<string, unknown> | null }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<SurveyMetaState> }
  | { type: 'INIT_META'; meta: SurveyMetaState };
