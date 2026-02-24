'use client';

import { useState, useCallback, useMemo } from 'react';
import { resolveStyling } from '@inquiry/survey-builder-config';
import type {
  ProjectStyling,
  SurveyStyling,
  StylingColor,
  BaseStyling,
} from '@inquiry/survey-builder-config';
import type { StylingFormMode } from '../types';

/** useStylingForm 파라미터 */
interface UseStylingFormParams {
  /** 폼 모드 */
  mode: StylingFormMode;
  /** 초기 스타일링 데이터 */
  initialData: Record<string, unknown>;
  /** survey 모드에서 프로젝트 테마 참조 */
  projectStyling?: ProjectStyling;
}

/** useStylingForm 반환값 */
interface UseStylingFormReturn {
  /** 현재 스타일링 값 */
  styling: Record<string, unknown>;
  /** 단일 필드 업데이트 */
  updateField: (key: string, value: unknown) => void;
  /** 색상 필드 업데이트 (StylingColor) */
  updateColor: (key: string, color: Partial<StylingColor>) => void;
  /** 초기값으로 리셋 */
  reset: () => void;
  /** 변경 여부 */
  isDirty: boolean;
  /** 해석된 최종 스타일링 (미리보기용) */
  resolvedStyling: BaseStyling;
}

/**
 * 스타일링 폼 상태 관리 훅.
 * styling 객체를 로컬 상태로 관리하고, 필드 업데이트/리셋/해석 기능을 제공한다.
 */
export function useStylingForm(
  params: UseStylingFormParams
): UseStylingFormReturn {
  const { mode, initialData, projectStyling } = params;
  const [styling, setStyling] = useState<Record<string, unknown>>({
    ...initialData,
  });
  const [isDirty, setIsDirty] = useState(false);

  /** 단일 필드 업데이트 */
  const updateField = useCallback((key: string, value: unknown) => {
    setStyling((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  /** 색상 필드 업데이트 — 기존 StylingColor와 병합 */
  const updateColor = useCallback(
    (key: string, color: Partial<StylingColor>) => {
      setStyling((prev) => {
        const existing = (prev[key] as StylingColor | undefined) ?? {
          light: '',
        };
        return {
          ...prev,
          [key]: { ...existing, ...color },
        };
      });
      setIsDirty(true);
    },
    []
  );

  /** 초기값으로 리셋 */
  const reset = useCallback(() => {
    setStyling({ ...initialData });
    setIsDirty(false);
  }, [initialData]);

  /** 5단계 우선순위 해석된 최종 스타일링 */
  const resolvedStyling = useMemo(() => {
    return resolveStyling({
      projectStyling:
        mode === 'project'
          ? (styling as unknown as ProjectStyling)
          : projectStyling,
      surveyStyling:
        mode === 'survey' ? (styling as unknown as SurveyStyling) : undefined,
    });
  }, [styling, mode, projectStyling]);

  return {
    styling,
    updateField,
    updateColor,
    reset,
    isDirty,
    resolvedStyling,
  };
}
