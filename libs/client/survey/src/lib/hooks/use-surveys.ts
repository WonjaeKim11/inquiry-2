'use client';

import { useEffect, useState, useCallback } from 'react';
import type { SurveyListItem } from '../types';
import { fetchSurveys } from '../api';

/**
 * 환경별 설문 목록을 조회하는 훅.
 * @param envId - 대상 환경 ID
 * @param options - 선택적 쿼리 파라미터 및 제어 옵션
 */
export function useSurveys(
  envId: string,
  options?: { query?: Record<string, string> }
) {
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSurveys(envId, options?.query);
      if (!result.ok) {
        throw new Error('Failed to load surveys');
      }
      setSurveys(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load surveys');
    } finally {
      setLoading(false);
    }
  }, [envId, options?.query]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { surveys, loading, error, refetch };
}
