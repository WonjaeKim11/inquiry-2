'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { UpdateSurveyInput } from '../types';
import { updateSurvey } from '../api';

/** 기본 디바운스 딜레이 (ms) */
const DEFAULT_DEBOUNCE_MS = 10_000;

/**
 * 두 값의 JSON 직렬화를 비교하여 동일 여부를 반환한다.
 * deep-equal 라이브러리 대신 간단한 JSON 비교를 사용한다.
 */
function isDeepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * 설문 자동 저장 훅.
 * 데이터가 변경되면 디바운스 후 서버에 저장한다.
 * Page Visibility API로 탭 이탈 시 즉시 저장한다.
 *
 * @param surveyId - 대상 설문 ID
 * @param data - 현재 설문 데이터
 * @param options - 디바운스 딜레이 등 옵션
 */
export function useAutoSave(
  surveyId: string,
  data: UpdateSurveyInput,
  options?: { debounceMs?: number; enabled?: boolean }
) {
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const enabled = options?.enabled ?? true;

  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  /** 이전에 저장된 데이터를 추적하는 Ref */
  const lastSavedDataRef = useRef<UpdateSurveyInput>(data);
  /** 디바운스 타이머 Ref */
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 변경 사항이 있으면 서버에 저장한다.
   * 이전 저장 데이터와 동일하면 스킵한다.
   */
  const save = useCallback(async () => {
    if (!enabled) return;
    if (isDeepEqual(data, lastSavedDataRef.current)) return;

    setSaving(true);
    try {
      const result = await updateSurvey(surveyId, data);
      if (result.ok) {
        lastSavedDataRef.current = data;
        setLastSavedAt(new Date());
      }
    } finally {
      setSaving(false);
    }
  }, [surveyId, data, enabled]);

  // 데이터 변경 시 디바운스 타이머 설정
  useEffect(() => {
    if (!enabled) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      save();
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, debounceMs, save, enabled]);

  // Page Visibility API: 탭 이탈 시 즉시 저장
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        save();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [save, enabled]);

  return { saving, lastSavedAt };
}
