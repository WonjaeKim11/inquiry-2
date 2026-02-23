'use client';

import { useBuilderStore } from '@coltorapps/builder-react';
import { surveyBuilder } from '@inquiry/survey-builder-config';
import type { SurveyBuilderSchema } from '@inquiry/survey-builder-config';

/**
 * @coltorapps/builder-react의 useBuilderStore를 래핑하는 훅.
 * surveyBuilder 인스턴스를 바인딩하여 설문 빌더 스토어를 생성한다.
 *
 * @param initialSchema - 초기 스키마 (편집 시 기존 스키마 전달)
 */
export function useSurveyBuilderStore(initialSchema?: SurveyBuilderSchema) {
  const builderStore = useBuilderStore(surveyBuilder, {
    initialData: initialSchema ? { schema: initialSchema } : undefined,
  });

  return builderStore;
}
