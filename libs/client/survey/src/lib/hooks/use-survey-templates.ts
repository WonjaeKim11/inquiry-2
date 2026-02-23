'use client';

import { useEffect, useState, useCallback } from 'react';
import type { SurveyTemplate } from '../types';
import { fetchTemplates } from '../api';

/**
 * 설문 템플릿 목록을 조회하는 훅.
 */
export function useSurveyTemplates() {
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTemplates();
      if (!result.ok) {
        throw new Error('Failed to load templates');
      }
      setTemplates(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { templates, loading, error, refetch };
}
