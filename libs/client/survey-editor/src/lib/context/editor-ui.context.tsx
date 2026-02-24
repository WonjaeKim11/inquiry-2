'use client';

import { createContext, useReducer, useMemo, type ReactNode } from 'react';
import type { EditorUIState, EditorUIAction, EditorConfig } from './types';

/** 기본 편집기 설정 */
const DEFAULT_EDITOR_CONFIG: EditorConfig = {
  isCxMode: false,
  isStyleOverrideAllowed: true,
  selectedLanguage: 'default',
};

/** 기본 편집기 UI 상태 */
const DEFAULT_UI_STATE: EditorUIState = {
  activeTab: 'elements',
  activeElementId: null,
  autoSaveStatus: 'idle',
  invalidElements: [],
  expandedBlockIds: [],
  editorConfig: DEFAULT_EDITOR_CONFIG,
};

/** EditorUI Context 값 타입 */
export interface EditorUIContextValue {
  state: EditorUIState;
  dispatch: React.Dispatch<EditorUIAction>;
}

export const EditorUIContext = createContext<EditorUIContextValue | null>(null);

/**
 * EditorUI Reducer.
 * 편집기 UI 상태(탭, 활성 요소, 자동 저장, 유효하지 않은 요소, 블록 펼침, 설정)를 관리한다.
 *
 * @param state - 현재 상태
 * @param action - 디스패치된 액션
 * @returns 새로운 상태
 */
function editorUIReducer(
  state: EditorUIState,
  action: EditorUIAction
): EditorUIState {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.tab };

    case 'SET_ACTIVE_ELEMENT':
      return { ...state, activeElementId: action.elementId };

    case 'SET_AUTO_SAVE_STATUS':
      return { ...state, autoSaveStatus: action.status };

    case 'SET_INVALID_ELEMENTS':
      return { ...state, invalidElements: action.elementIds };

    case 'TOGGLE_BLOCK_EXPANDED':
      return {
        ...state,
        expandedBlockIds: state.expandedBlockIds.includes(action.blockId)
          ? state.expandedBlockIds.filter((id) => id !== action.blockId)
          : [...state.expandedBlockIds, action.blockId],
      };

    case 'SET_ALL_BLOCKS_EXPANDED':
      return { ...state, expandedBlockIds: action.blockIds };

    case 'SET_EDITOR_CONFIG':
      return {
        ...state,
        editorConfig: { ...state.editorConfig, ...action.config },
      };

    case 'SET_SELECTED_LANGUAGE':
      return {
        ...state,
        editorConfig: {
          ...state.editorConfig,
          selectedLanguage: action.language,
        },
      };

    default:
      return state;
  }
}

/** EditorUIProvider Props */
interface EditorUIProviderProps {
  children: ReactNode;
  /** 초기 편집기 설정 (기본값 덮어쓰기) */
  initialConfig?: Partial<EditorConfig>;
  /** 초기에 펼쳐진 블록 ID 목록 */
  initialExpandedBlockIds?: string[];
}

/**
 * 편집기 UI 상태를 관리하는 Provider.
 * activeTab, activeElementId, autoSaveStatus, invalidElements,
 * expandedBlockIds, editorConfig를 useReducer로 관리한다.
 *
 * @param props - children, initialConfig, initialExpandedBlockIds
 */
export function EditorUIProvider({
  children,
  initialConfig,
  initialExpandedBlockIds,
}: EditorUIProviderProps) {
  const [state, dispatch] = useReducer(editorUIReducer, {
    ...DEFAULT_UI_STATE,
    editorConfig: { ...DEFAULT_EDITOR_CONFIG, ...initialConfig },
    expandedBlockIds: initialExpandedBlockIds ?? [],
  });

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <EditorUIContext.Provider value={value}>
      {children}
    </EditorUIContext.Provider>
  );
}
