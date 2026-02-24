'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '@inquiry/client-core';
import type { ProjectLanguage } from '@inquiry/client-project';
import type { SurveyLanguage } from '@inquiry/survey-builder-config';
import type { SurveyDetail, UpdateSurveyInput } from '@inquiry/client-survey';
import type { LanguageWithConfig } from '../types';

/**
 * 설문 다국어 설정을 관리하는 훅.
 * 프로젝트 언어 목록과 survey.languages를 결합하여 LanguageWithConfig[] 을 생성하고,
 * 기본 언어 변경, 토글, 추가/제거, showLanguageSwitch 등의 액션을 제공한다.
 *
 * @param projectId - 프로젝트 ID
 * @param survey - 현재 설문 상세 데이터
 * @param onUpdate - 설문 업데이트 콜백 (autoSave 흐름과 연결)
 */
export function useSurveyLanguages(
  projectId: string,
  survey: SurveyDetail | null,
  onUpdate: (data: Partial<UpdateSurveyInput>) => void
) {
  const [projectLanguages, setProjectLanguages] = useState<ProjectLanguage[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  // 프로젝트 언어 목록을 서버에서 조회한다
  useEffect(() => {
    let cancelled = false;
    async function fetchLanguages() {
      setLoading(true);
      try {
        const res = await apiFetch(`/projects/${projectId}/languages`);
        if (!res.ok) throw new Error('Failed to fetch languages');
        const data = await res.json();
        if (!cancelled) {
          setProjectLanguages(Array.isArray(data) ? data : data.data ?? []);
        }
      } catch {
        if (!cancelled) setProjectLanguages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchLanguages();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // 프로젝트 언어와 설문 언어 설정을 결합한다
  const languagesWithConfig: LanguageWithConfig[] = useMemo(() => {
    if (!survey) return [];
    const surveyLangs = survey.languages ?? [];

    return projectLanguages.map((lang) => {
      const config =
        surveyLangs.find((sl) => sl.languageId === lang.id) ?? null;
      return {
        language: lang,
        surveyConfig: config,
        isDefault: config?.default ?? false,
        isEnabled: config?.enabled ?? false,
        translationStatus: config
          ? config.enabled
            ? 'complete'
            : 'incomplete'
          : 'missing',
      };
    });
  }, [projectLanguages, survey]);

  /** 기본 언어를 변경한다 */
  const setDefaultLanguage = useCallback(
    (languageId: string) => {
      if (!survey) return;
      const currentLangs = survey.languages ?? [];
      // 선택한 언어가 이미 목록에 있는지 확인
      const exists = currentLangs.some((l) => l.languageId === languageId);
      const updated: SurveyLanguage[] = exists
        ? currentLangs.map((l) => ({
            ...l,
            default: l.languageId === languageId,
            enabled: l.languageId === languageId ? true : l.enabled,
          }))
        : [
            ...currentLangs.map((l) => ({ ...l, default: false })),
            { languageId, default: true, enabled: true },
          ];
      onUpdate({ languages: updated });
    },
    [survey, onUpdate]
  );

  /** 언어 활성화/비활성화를 토글한다 */
  const toggleLanguage = useCallback(
    (languageId: string, enabled: boolean) => {
      if (!survey) return;
      const currentLangs = survey.languages ?? [];
      const exists = currentLangs.some((l) => l.languageId === languageId);
      const updated: SurveyLanguage[] = exists
        ? currentLangs.map((l) =>
            l.languageId === languageId ? { ...l, enabled } : l
          )
        : [...currentLangs, { languageId, default: false, enabled }];
      onUpdate({ languages: updated });
    },
    [survey, onUpdate]
  );

  /** 설문에 새 언어를 추가한다 */
  const addLanguageToSurvey = useCallback(
    (languageId: string) => {
      if (!survey) return;
      const currentLangs = survey.languages ?? [];
      if (currentLangs.some((l) => l.languageId === languageId)) return;
      const isFirst = currentLangs.length === 0;
      const updated: SurveyLanguage[] = [
        ...currentLangs,
        { languageId, default: isFirst, enabled: true },
      ];
      onUpdate({ languages: updated });
    },
    [survey, onUpdate]
  );

  /** 모든 번역을 제거한다 (언어 설정을 빈 배열로 초기화) */
  const removeAllTranslations = useCallback(() => {
    onUpdate({ languages: [], showLanguageSwitch: false });
  }, [onUpdate]);

  /** 응답자 언어 전환 UI 표시 여부를 설정한다 */
  const setShowLanguageSwitch = useCallback(
    (show: boolean) => {
      onUpdate({ showLanguageSwitch: show });
    },
    [onUpdate]
  );

  return {
    projectLanguages,
    languagesWithConfig,
    loading,
    setDefaultLanguage,
    toggleLanguage,
    addLanguageToSurvey,
    removeAllTranslations,
    setShowLanguageSwitch,
  };
}
