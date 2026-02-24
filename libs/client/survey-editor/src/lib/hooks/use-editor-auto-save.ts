'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useBuilderStoreData } from '@coltorapps/builder-react';
import type { BuilderStore } from '@coltorapps/builder';
import { updateSurvey } from '@inquiry/client-survey';
import type { SurveyBuilderSchema } from '@inquiry/survey-builder-config';
import { useEditorUI } from './use-editor-ui';
import { useSurveyMeta } from './use-survey-meta';
import { builderDataToSurvey } from '../utils/schema-converter';
import type { SurveyMeta } from '../utils/schema-converter';

/** 자동 저장 디바운스 시간 (ms) */
const AUTO_SAVE_DEBOUNCE = 10_000;

/**
 * Builder Store 데이터와 SurveyMeta 변경을 감시하여 자동 저장하는 훅.
 *
 * 동작 원리:
 * 1. Builder Store의 schema 변경과 SurveyMeta 상태 변경을 감시한다
 * 2. 변경 감지 시 10초 디바운스 타이머를 시작/재설정한다
 * 3. 디바운스 완료 후 builderDataToSurvey로 데이터를 병합하여 서버에 PATCH 요청한다
 * 4. DRAFT 상태에서만 자동 저장이 활성화된다
 * 5. 페이지 이탈(beforeunload) 시 sendBeacon으로 즉시 저장을 시도한다
 *
 * @param builderStore - @coltorapps/builder-react의 BuilderStore 인스턴스
 * @returns performSave - 즉시 저장을 수행하는 함수 (수동 저장 트리거용)
 */
export function useEditorAutoSave(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builderStore: BuilderStore<any>
) {
  const meta = useSurveyMeta();
  const { setAutoSaveStatus } = useEditorUI();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  // 현재 데이터 참조 (beforeunload 핸들러에서 클로저 없이 최신 값 접근용)
  const latestMetaRef = useRef<SurveyMeta | null>(null);
  const latestSchemaRef = useRef<SurveyBuilderSchema | null>(null);
  const isDirtyRef = useRef(false);

  // Builder Store 데이터 변경 감시
  const builderData = useBuilderStoreData(builderStore);

  // 메타 상태 변경 시 ref 갱신
  useEffect(() => {
    latestMetaRef.current = meta as unknown as SurveyMeta;
  }, [meta]);

  // 스키마 변경 시 ref 갱신
  useEffect(() => {
    if (builderData?.schema) {
      latestSchemaRef.current = builderData.schema as SurveyBuilderSchema;
    }
  }, [builderData]);

  /**
   * 실제 저장을 수행한다.
   * 이미 저장 중이거나, 스키마/메타가 없거나, DRAFT가 아닌 경우 건너뛴다.
   */
  const performSave = useCallback(async () => {
    if (isSavingRef.current) return;
    if (!latestSchemaRef.current || !latestMetaRef.current) return;
    if (latestMetaRef.current.status !== 'DRAFT') return;

    isSavingRef.current = true;
    isDirtyRef.current = false;
    setAutoSaveStatus('saving');

    try {
      const input = builderDataToSurvey(
        latestSchemaRef.current,
        latestMetaRef.current
      );
      await updateSurvey(latestMetaRef.current.surveyId, input);
      setAutoSaveStatus('saved');
    } catch {
      setAutoSaveStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [setAutoSaveStatus]);

  /**
   * 디바운스된 저장을 예약한다.
   * 기존 타이머가 있으면 취소하고 새 타이머를 설정한다.
   */
  const scheduleSave = useCallback(() => {
    isDirtyRef.current = true;
    setAutoSaveStatus('idle');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      performSave();
    }, AUTO_SAVE_DEBOUNCE);
  }, [performSave, setAutoSaveStatus]);

  // Builder Store 데이터 변경 시 저장 예약
  useEffect(() => {
    if (builderData && meta.status === 'DRAFT') {
      scheduleSave();
    }
  }, [builderData, meta.status, scheduleSave]);

  // SurveyMeta 주요 필드 변경 시 저장 예약
  useEffect(() => {
    if (meta.status === 'DRAFT') {
      scheduleSave();
    }
    // 개별 메타 필드만 의존하여 불필요한 트리거를 방지한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    meta.name,
    meta.welcomeCard,
    meta.endings,
    meta.hiddenFields,
    meta.variables,
    meta.styling,
    meta.displayOption,
    meta.singleUse,
    meta.autoComplete,
  ]);

  // 페이지 이탈 시 미저장 데이터를 sendBeacon으로 즉시 전송
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (
        isDirtyRef.current &&
        latestSchemaRef.current &&
        latestMetaRef.current
      ) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        // sendBeacon은 페이지 닫힐 때도 비동기 전송을 보장한다
        const input = builderDataToSurvey(
          latestSchemaRef.current,
          latestMetaRef.current
        );
        const blob = new Blob([JSON.stringify(input)], {
          type: 'application/json',
        });
        navigator.sendBeacon(
          `/api/surveys/${latestMetaRef.current.surveyId}`,
          blob
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { performSave };
}
