'use client';

import { useContext, useCallback } from 'react';
import { SurveyMetaContext } from '../context/survey-meta.context';
import type { SurveyMetaState } from '../context/types';
import type {
  WelcomeCard,
  SurveyEnding,
  HiddenFields,
  SurveyVariable,
} from '@inquiry/survey-builder-config';

/**
 * SurveyMeta Context에 접근하는 훅.
 * WelcomeCard, Endings, HiddenFields, Variables 등
 * Builder Schema 외부에서 관리되는 설문 메타데이터를 읽고 업데이트한다.
 *
 * 모든 업데이트 함수는 useCallback으로 감싸져 있어
 * 자식 컴포넌트에 props로 전달해도 불필요한 리렌더링을 방지한다.
 *
 * @throws SurveyMetaProvider 외부에서 호출 시 에러를 throw한다
 */
export function useSurveyMeta() {
  const context = useContext(SurveyMetaContext);
  if (!context) {
    throw new Error('useSurveyMeta must be used within SurveyMetaProvider');
  }

  const { state, dispatch } = context;

  /** 설문 이름을 변경한다 */
  const updateSurveyName = useCallback(
    (name: string) => dispatch({ type: 'UPDATE_SURVEY_NAME', name }),
    [dispatch]
  );

  /** 웰컴 카드를 업데이트한다 */
  const updateWelcomeCard = useCallback(
    (welcomeCard: WelcomeCard) =>
      dispatch({ type: 'UPDATE_WELCOME_CARD', welcomeCard }),
    [dispatch]
  );

  /** 새 종료 카드를 추가한다 */
  const addEnding = useCallback(
    (ending: SurveyEnding) => dispatch({ type: 'ADD_ENDING', ending }),
    [dispatch]
  );

  /** 종료 카드를 삭제한다 */
  const deleteEnding = useCallback(
    (endingId: string) => dispatch({ type: 'DELETE_ENDING', endingId }),
    [dispatch]
  );

  /** 종료 카드를 업데이트한다 */
  const updateEnding = useCallback(
    (ending: SurveyEnding) => dispatch({ type: 'UPDATE_ENDING', ending }),
    [dispatch]
  );

  /** 종료 카드 순서를 재정렬한다 */
  const reorderEndings = useCallback(
    (endings: SurveyEnding[]) => dispatch({ type: 'REORDER_ENDINGS', endings }),
    [dispatch]
  );

  /** 히든 필드 전체를 업데이트한다 */
  const updateHiddenFields = useCallback(
    (hiddenFields: HiddenFields) =>
      dispatch({ type: 'UPDATE_HIDDEN_FIELDS', hiddenFields }),
    [dispatch]
  );

  /** 히든 필드를 추가한다 */
  const addHiddenField = useCallback(
    (fieldId: string) => dispatch({ type: 'ADD_HIDDEN_FIELD', fieldId }),
    [dispatch]
  );

  /** 히든 필드를 삭제한다 */
  const deleteHiddenField = useCallback(
    (fieldId: string) => dispatch({ type: 'DELETE_HIDDEN_FIELD', fieldId }),
    [dispatch]
  );

  /** 변수를 추가한다 */
  const addVariable = useCallback(
    (variable: SurveyVariable) => dispatch({ type: 'ADD_VARIABLE', variable }),
    [dispatch]
  );

  /** 변수를 업데이트한다 */
  const updateVariable = useCallback(
    (variable: SurveyVariable) =>
      dispatch({ type: 'UPDATE_VARIABLE', variable }),
    [dispatch]
  );

  /** 변수를 삭제한다 */
  const deleteVariable = useCallback(
    (variableId: string) => dispatch({ type: 'DELETE_VARIABLE', variableId }),
    [dispatch]
  );

  /** 설문 개별 스타일링을 업데이트한다 (null이면 프로젝트 테마 사용) */
  const updateStyling = useCallback(
    (styling: Record<string, unknown> | null) =>
      dispatch({ type: 'UPDATE_STYLING', styling }),
    [dispatch]
  );

  /** 설문 설정(displayOption, singleUse 등)을 부분 업데이트한다 */
  const updateSettings = useCallback(
    (settings: Partial<SurveyMetaState>) =>
      dispatch({ type: 'UPDATE_SETTINGS', settings }),
    [dispatch]
  );

  return {
    ...state,
    dispatch,
    updateSurveyName,
    updateWelcomeCard,
    addEnding,
    deleteEnding,
    updateEnding,
    reorderEndings,
    updateHiddenFields,
    addHiddenField,
    deleteHiddenField,
    addVariable,
    updateVariable,
    deleteVariable,
    updateStyling,
    updateSettings,
  };
}
