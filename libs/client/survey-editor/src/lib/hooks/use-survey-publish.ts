'use client';

import { useCallback, useState } from 'react';
import { publishSurvey } from '@inquiry/client-survey';
import { useEditorUI } from './use-editor-ui';
import { useSurveyMeta } from './use-survey-meta';
import { validateSurveyForPublish } from '../utils/survey-validation';
import type { SurveyBuilderSchema } from '@inquiry/survey-builder-config';
import type { SurveyValidationResult } from '../utils/survey-validation';
import type { SurveyMeta } from '../utils/schema-converter';

/**
 * 발행 유효성 검증 + 발행 API 호출 훅.
 *
 * 동작 흐름:
 * 1. getSchema()로 현재 Builder Store의 스키마를 가져온다
 * 2. validateSurveyForPublish로 클라이언트 측 검증을 수행한다
 * 3. 검증 실패 시 invalidElements를 EditorUI에 반영하고 실패를 반환한다
 * 4. 검증 성공 시 publishSurvey API를 호출한다
 * 5. API 성공 시 invalidElements를 초기화하고 성공을 반환한다
 *
 * @param getSchema - Builder Store에서 현재 스키마를 가져오는 콜백
 * @returns publish, publishing, publishError
 */
export function useSurveyPublish(
  getSchema: () => SurveyBuilderSchema | undefined
) {
  const meta = useSurveyMeta();
  const { setInvalidElements } = useEditorUI();
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  /**
   * 발행을 시도한다.
   * @returns 발행 성공 여부와 검증 결과
   */
  const publish = useCallback(async (): Promise<{
    success: boolean;
    validation: SurveyValidationResult | null;
  }> => {
    setPublishError(null);

    // 1. 클라이언트 측 유효성 검증
    const schema = getSchema();
    const validation = validateSurveyForPublish(
      schema,
      meta as unknown as SurveyMeta
    );

    if (!validation.valid) {
      setInvalidElements(validation.invalidEntityIds);
      return { success: false, validation };
    }

    // 2. 서버 발행 API 호출
    setPublishing(true);
    try {
      const result = await publishSurvey(meta.surveyId);
      if (!result.ok) {
        setPublishError(result.message ?? '발행에 실패했습니다');
        return { success: false, validation };
      }
      // 발행 성공 시 오류 표시 초기화
      setInvalidElements([]);
      return { success: true, validation };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '발행에 실패했습니다';
      setPublishError(message);
      return { success: false, validation: null };
    } finally {
      setPublishing(false);
    }
  }, [getSchema, meta, setInvalidElements]);

  return { publish, publishing, publishError };
}
