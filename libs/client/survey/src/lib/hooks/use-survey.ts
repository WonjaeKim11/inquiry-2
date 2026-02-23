'use client';

import { useEffect, useState, useCallback } from 'react';
import type { SurveyDetail, UpdateSurveyInput } from '../types';
import { fetchSurvey, updateSurvey } from '../api';

/**
 * 단일 설문을 조회하고 로컬 상태를 관리하는 훅.
 * @param surveyId - 대상 설문 ID
 */
export function useSurvey(surveyId: string) {
  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSurvey(surveyId);
      if (!result.ok) {
        throw new Error('Failed to load survey');
      }
      setSurvey(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load survey');
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  /**
   * 설문을 서버에 저장하고 로컬 상태를 갱신한다.
   * @param input - 수정할 필드
   */
  const mutate = useCallback(
    async (input: UpdateSurveyInput) => {
      const result = await updateSurvey(surveyId, input);
      if (result.ok && result.data) {
        setSurvey(result.data);
      }
      return result;
    },
    [surveyId]
  );

  return { survey, loading, error, refetch, mutate };
}
