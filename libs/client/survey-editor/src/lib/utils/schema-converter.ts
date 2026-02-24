import type { SurveyDetail, UpdateSurveyInput } from '@inquiry/client-survey';
import type {
  SurveyBuilderSchema,
  WelcomeCard,
  SurveyEnding,
  HiddenFields,
  SurveyVariable,
  SurveyLanguage,
} from '@inquiry/survey-builder-config';

/**
 * SurveyMeta: Builder Schema 외부에서 관리하는 설문 메타데이터.
 * Builder Store가 관리하는 schema(entities, root)와 분리되어,
 * 설문의 이름, 상태, 웰컴카드, 종료카드, 히든필드, 변수 등을 포함한다.
 */
export interface SurveyMeta {
  /** 설문 고유 ID */
  surveyId: string;
  /** 설문 이름 */
  name: string;
  /** 설문 유형 (link: 링크 공유, app: 앱 내장) */
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
  /** 표시 옵션 (displayOnce, displayMultiple 등) */
  displayOption: string;
  /** 설문 표시 지연 시간 (ms) */
  delay: number;
  /** 자동 닫힘 시간 (초, null이면 비활성) */
  autoClose: number | null;
  /** 자동 완료 시간 (초, null이면 비활성) */
  autoComplete: number | null;
  /** PIN 코드 (null이면 비활성) */
  pin: string | null;
  /** 단일 응답 모드 */
  singleUse: boolean;
  /** 재접촉 방지 일수 (null이면 비활성) */
  recontactDays: number | null;
  /** 지원 언어 목록 */
  languages: SurveyLanguage[];
  /** 언어 전환 UI 표시 여부 */
  showLanguageSwitch: boolean | null;
  /** 설문 개별 스타일링 (null이면 프로젝트 테마 사용) */
  styling: Record<string, unknown> | null;
}

/** 비활성 상태의 기본 WelcomeCard */
const DEFAULT_WELCOME_CARD: WelcomeCard = {
  enabled: false,
};

/** 비활성 상태의 기본 HiddenFields */
const DEFAULT_HIDDEN_FIELDS: HiddenFields = {
  enabled: false,
  fieldIds: [],
};

/**
 * SurveyDetail을 Builder Store initialData와 SurveyMeta로 분리한다.
 * Builder Store는 schema(entities, root)를 관리하고,
 * 나머지 메타데이터는 SurveyMeta로 분리하여 별도 상태로 관리한다.
 *
 * @param survey - 서버에서 조회한 설문 상세 정보
 * @returns schema(Builder Store용)와 meta(메타데이터 상태용) 분리 결과
 */
export function surveyToBuilderData(survey: SurveyDetail): {
  schema: SurveyBuilderSchema | undefined;
  meta: SurveyMeta;
} {
  // survey.schema가 유효한 Builder Schema면 그대로 사용
  const schema = survey.schema as SurveyBuilderSchema | undefined;

  const meta: SurveyMeta = {
    surveyId: survey.id,
    name: survey.name,
    type: survey.type,
    status: survey.status,
    welcomeCard: survey.welcomeCard ?? DEFAULT_WELCOME_CARD,
    endings: survey.endings ?? [],
    hiddenFields: survey.hiddenFields ?? DEFAULT_HIDDEN_FIELDS,
    variables: survey.variables ?? [],
    displayOption: survey.displayOption ?? 'displayOnce',
    delay: survey.delay ?? 0,
    autoClose: survey.autoClose ?? null,
    autoComplete: survey.autoComplete ?? null,
    pin: survey.pin ?? null,
    singleUse: survey.singleUse ?? false,
    recontactDays: survey.recontactDays ?? null,
    languages: survey.languages ?? [],
    showLanguageSwitch: survey.showLanguageSwitch ?? null,
    styling: (survey.styling as Record<string, unknown>) ?? null,
  };

  return { schema, meta };
}

/**
 * Builder Store의 현재 schema와 SurveyMeta를 UpdateSurveyInput으로 병합한다.
 * 자동 저장이나 수동 저장 시 서버에 전송할 데이터를 생성한다.
 *
 * @param schema - Builder Store의 현재 스키마 (entities, root 포함)
 * @param meta - 현재 메타데이터 상태
 * @returns 서버 전송용 UpdateSurveyInput
 */
export function builderDataToSurvey(
  schema: SurveyBuilderSchema,
  meta: SurveyMeta
): UpdateSurveyInput {
  return {
    name: meta.name,
    schema: schema as unknown,
    welcomeCard: meta.welcomeCard,
    endings: meta.endings,
    hiddenFields: meta.hiddenFields,
    variables: meta.variables,
    displayOption: meta.displayOption as UpdateSurveyInput['displayOption'],
    delay: meta.delay,
    autoClose: meta.autoClose,
    autoComplete: meta.autoComplete,
    pin: meta.pin,
    singleUse: meta.singleUse,
    recontactDays: meta.recontactDays,
    languages: meta.languages,
    showLanguageSwitch: meta.showLanguageSwitch ?? undefined,
    styling: meta.styling,
  };
}
