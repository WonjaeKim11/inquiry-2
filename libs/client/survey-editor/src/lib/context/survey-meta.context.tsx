'use client';

import { createContext, useReducer, useMemo, type ReactNode } from 'react';
import type { SurveyMetaState, SurveyMetaAction } from './types';

/** 기본 SurveyMeta 상태 */
const DEFAULT_META_STATE: SurveyMetaState = {
  surveyId: '',
  name: '',
  type: 'link',
  status: 'DRAFT',
  welcomeCard: { enabled: false },
  endings: [],
  hiddenFields: { enabled: false, fieldIds: [] },
  variables: [],
  displayOption: 'displayOnce',
  delay: 0,
  autoClose: null,
  autoComplete: null,
  pin: null,
  singleUse: false,
  recontactDays: null,
  languages: [],
  showLanguageSwitch: null,
  styling: null,
};

/** SurveyMeta Context 값 타입 */
export interface SurveyMetaContextValue {
  state: SurveyMetaState;
  dispatch: React.Dispatch<SurveyMetaAction>;
}

export const SurveyMetaContext = createContext<SurveyMetaContextValue | null>(
  null
);

/**
 * SurveyMeta Reducer.
 * 14개 액션을 처리하여 설문 메타데이터(Builder Schema 외부 데이터)를 관리한다.
 * INIT_META, UPDATE_SURVEY_NAME, UPDATE_WELCOME_CARD, ADD/DELETE/UPDATE/REORDER_ENDING,
 * UPDATE_HIDDEN_FIELDS, ADD/DELETE_HIDDEN_FIELD, ADD/UPDATE/DELETE_VARIABLE,
 * UPDATE_STYLING, UPDATE_SETTINGS를 처리한다.
 *
 * @param state - 현재 메타데이터 상태
 * @param action - 디스패치된 액션
 * @returns 새로운 메타데이터 상태
 */
function surveyMetaReducer(
  state: SurveyMetaState,
  action: SurveyMetaAction
): SurveyMetaState {
  switch (action.type) {
    case 'INIT_META':
      return { ...action.meta };

    case 'UPDATE_SURVEY_NAME':
      return { ...state, name: action.name };

    case 'UPDATE_WELCOME_CARD':
      return { ...state, welcomeCard: action.welcomeCard };

    case 'ADD_ENDING':
      return { ...state, endings: [...state.endings, action.ending] };

    case 'DELETE_ENDING':
      return {
        ...state,
        endings: state.endings.filter((e) => e.id !== action.endingId),
      };

    case 'UPDATE_ENDING':
      return {
        ...state,
        endings: state.endings.map((e) =>
          e.id === action.ending.id ? action.ending : e
        ),
      };

    case 'REORDER_ENDINGS':
      return { ...state, endings: action.endings };

    case 'UPDATE_HIDDEN_FIELDS':
      return { ...state, hiddenFields: action.hiddenFields };

    case 'ADD_HIDDEN_FIELD':
      return {
        ...state,
        hiddenFields: {
          ...state.hiddenFields,
          fieldIds: [...state.hiddenFields.fieldIds, action.fieldId],
        },
      };

    case 'DELETE_HIDDEN_FIELD':
      return {
        ...state,
        hiddenFields: {
          ...state.hiddenFields,
          fieldIds: state.hiddenFields.fieldIds.filter(
            (id) => id !== action.fieldId
          ),
        },
      };

    case 'ADD_VARIABLE':
      return { ...state, variables: [...state.variables, action.variable] };

    case 'UPDATE_VARIABLE':
      return {
        ...state,
        variables: state.variables.map((v) =>
          v.id === action.variable.id ? action.variable : v
        ),
      };

    case 'DELETE_VARIABLE':
      return {
        ...state,
        variables: state.variables.filter((v) => v.id !== action.variableId),
      };

    case 'UPDATE_STYLING':
      return { ...state, styling: action.styling };

    case 'UPDATE_SETTINGS':
      return { ...state, ...action.settings };

    default:
      return state;
  }
}

/** SurveyMetaProvider Props */
interface SurveyMetaProviderProps {
  children: ReactNode;
  /** 초기 메타데이터 상태 (서버에서 가져온 설문 데이터를 전달) */
  initialMeta?: SurveyMetaState;
}

/**
 * Survey 메타데이터(Builder Schema 외부 데이터)를 관리하는 Provider.
 * WelcomeCard, Endings, HiddenFields, Variables, Settings 등
 * Builder Store가 관리하지 않는 설문 데이터를 useReducer로 관리한다.
 *
 * @param props - children, initialMeta
 */
export function SurveyMetaProvider({
  children,
  initialMeta,
}: SurveyMetaProviderProps) {
  const [state, dispatch] = useReducer(
    surveyMetaReducer,
    initialMeta ?? DEFAULT_META_STATE
  );

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <SurveyMetaContext.Provider value={value}>
      {children}
    </SurveyMetaContext.Provider>
  );
}
