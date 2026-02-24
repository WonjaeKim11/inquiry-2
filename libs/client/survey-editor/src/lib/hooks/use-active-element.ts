'use client';

import { useCallback } from 'react';
import { useEditorUI } from './use-editor-ui';

/**
 * 활성 Element ID를 관리하는 훅.
 * Element 선택/해제/토글 기능을 제공한다.
 *
 * 사용 예시:
 * ```tsx
 * const { activeElementId, selectElement, deselectElement, toggleElement } = useActiveElement();
 *
 * // 사이드바에서 질문 클릭 시
 * <QuestionItem onClick={() => selectElement(questionId)} />
 *
 * // 프리뷰 영역 빈 곳 클릭 시
 * <PreviewArea onClick={() => deselectElement()} />
 *
 * // 같은 질문 재클릭으로 토글
 * <QuestionItem onClick={() => toggleElement(questionId)} />
 * ```
 */
export function useActiveElement() {
  const { activeElementId, setActiveElement } = useEditorUI();

  /** Element를 활성화한다 */
  const selectElement = useCallback(
    (elementId: string) => {
      setActiveElement(elementId);
    },
    [setActiveElement]
  );

  /** 현재 활성 Element를 해제한다 */
  const deselectElement = useCallback(() => {
    setActiveElement(null);
  }, [setActiveElement]);

  /** Element를 토글한다 (이미 활성이면 해제, 아니면 활성화) */
  const toggleElement = useCallback(
    (elementId: string) => {
      if (activeElementId === elementId) {
        setActiveElement(null);
      } else {
        setActiveElement(elementId);
      }
    },
    [activeElementId, setActiveElement]
  );

  return {
    activeElementId,
    selectElement,
    deselectElement,
    toggleElement,
  };
}
