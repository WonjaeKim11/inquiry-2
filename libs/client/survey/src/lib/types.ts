import type {
  WelcomeCard,
  SurveyEnding,
  HiddenFields,
  SurveyVariable,
} from '@inquiry/survey-builder-config';

/** 설문 상태 */
export type SurveyStatus = 'DRAFT' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';

/** 설문 유형 */
export type SurveyType = 'link' | 'app';

/** 설문 표시 옵션 */
export type DisplayOption =
  | 'displayOnce'
  | 'displayMultiple'
  | 'respondMultiple'
  | 'displaySome';

/** 설문 목록 아이템 (목록 조회 응답용) */
export interface SurveyListItem {
  id: string;
  name: string;
  type: SurveyType;
  status: SurveyStatus;
  createdAt: string;
  updatedAt: string;
  _count?: { responses: number; displays: number };
}

/** 설문 상세 정보 (단건 조회 응답용) */
export interface SurveyDetail extends SurveyListItem {
  schema: unknown;
  welcomeCard: WelcomeCard;
  endings: SurveyEnding[];
  hiddenFields: HiddenFields;
  variables: SurveyVariable[];
  displayOption: DisplayOption;
  delay: number;
  autoClose: number | null;
  autoComplete: number | null;
  pin: string | null;
  singleUse: boolean;
  recontactDays: number | null;
  environmentId: string;
  projectId: string;
}

/** 설문 생성 요청 바디 */
export interface CreateSurveyInput {
  name: string;
  type: SurveyType;
}

/** 설문 수정 요청 바디 (모든 필드 선택) */
export interface UpdateSurveyInput {
  name?: string;
  schema?: unknown;
  welcomeCard?: WelcomeCard;
  endings?: SurveyEnding[];
  hiddenFields?: HiddenFields;
  variables?: SurveyVariable[];
  displayOption?: DisplayOption;
  delay?: number;
  autoClose?: number | null;
  autoComplete?: number | null;
  pin?: string | null;
  singleUse?: boolean;
  recontactDays?: number | null;
}

/** 설문 템플릿 */
export interface SurveyTemplate {
  id: string;
  name: string;
  description?: string;
  schema: unknown;
}
