'use client';

import { useContext } from 'react';
import { EditorUIContext } from '../context/editor-ui.context';
import type { EditorTab, AutoSaveStatus } from '../context/types';

/**
 * EditorUI Context에 접근하는 훅.
 * 편집기 UI 상태(탭, 활성 요소, 자동 저장 상태 등)를 읽고 업데이트한다.
 *
 * 반환값:
 * - state의 모든 프로퍼티를 스프레드로 제공 (activeTab, activeElementId, ...)
 * - dispatch: 원시 액션 디스패치 함수
 * - 편의 메서드: setActiveTab, setActiveElement, setAutoSaveStatus 등
 *
 * @throws EditorUIProvider 외부에서 호출 시 에러를 throw한다
 */
export function useEditorUI() {
  const context = useContext(EditorUIContext);
  if (!context) {
    throw new Error('useEditorUI must be used within EditorUIProvider');
  }

  const { state, dispatch } = context;

  return {
    ...state,
    dispatch,

    /** 활성 탭을 변경한다 */
    setActiveTab: (tab: EditorTab) => dispatch({ type: 'SET_ACTIVE_TAB', tab }),

    /** 활성 요소를 설정한다 (null이면 선택 해제) */
    setActiveElement: (elementId: string | null) =>
      dispatch({ type: 'SET_ACTIVE_ELEMENT', elementId }),

    /** 자동 저장 상태를 변경한다 */
    setAutoSaveStatus: (status: AutoSaveStatus) =>
      dispatch({ type: 'SET_AUTO_SAVE_STATUS', status }),

    /** 검증 오류가 있는 요소 ID 목록을 설정한다 */
    setInvalidElements: (elementIds: string[]) =>
      dispatch({ type: 'SET_INVALID_ELEMENTS', elementIds }),

    /** 특정 블록의 펼침/접힘 상태를 토글한다 */
    toggleBlockExpanded: (blockId: string) =>
      dispatch({ type: 'TOGGLE_BLOCK_EXPANDED', blockId }),

    /** 모든 블록의 펼침 상태를 한꺼번에 설정한다 */
    setAllBlocksExpanded: (blockIds: string[]) =>
      dispatch({ type: 'SET_ALL_BLOCKS_EXPANDED', blockIds }),

    /** 현재 편집 언어를 변경한다 */
    setSelectedLanguage: (language: string) =>
      dispatch({ type: 'SET_SELECTED_LANGUAGE', language }),
  };
}
