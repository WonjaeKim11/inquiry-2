'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button, Input } from '@inquiry/client-ui';
import { useEditorUI } from '../../hooks/use-editor-ui';
import { useSurveyMeta } from '../../hooks/use-survey-meta';
import { AutoSaveIndicator } from '../shared/AutoSaveIndicator';

interface SurveyMenuBarProps {
  /** 뒤로가기 버튼 클릭 시 이동할 URL */
  backUrl: string;
  /** 수동 저장을 트리거하는 콜백 (useEditorAutoSave의 performSave) */
  onSave?: () => Promise<void>;
  /** 발행을 트리거하는 콜백 (useSurveyPublish의 publish) */
  onPublish?: () => Promise<void>;
}

/**
 * 설문 편집기 상단 메뉴바.
 *
 * 구성 요소:
 * - 좌측: 뒤로가기 버튼 + 설문 이름 인라인 편집
 * - 우측: 자동 저장 상태 표시기 + 액션 버튼(Save as Draft / Publish / Update)
 *
 * 설문 이름 편집:
 * - 이름 텍스트를 클릭하면 Input으로 전환되어 인라인 편집이 가능하다
 * - Enter 키 또는 블러 시 편집이 완료되고 useSurveyMeta의 updateSurveyName이 호출된다
 * - Escape 키 누르면 편집을 취소하고 원래 이름으로 복원한다
 *
 * @param backUrl - 뒤로가기 버튼의 목적지 URL
 * @param onSave - 수동 저장 콜백 (Save as Draft 버튼에 연결)
 * @param onPublish - 발행 콜백 (Publish / Update 버튼에 연결)
 */
export function SurveyMenuBar({
  backUrl,
  onSave,
  onPublish,
}: SurveyMenuBarProps) {
  const { t } = useTranslation();
  const { autoSaveStatus } = useEditorUI();
  const { name, status, updateSurveyName } = useSurveyMeta();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(name);

  /** 이름 편집 모드를 시작하고 현재 이름을 편집 필드에 채운다 */
  const handleStartEdit = useCallback(() => {
    setEditName(name);
    setIsEditingName(true);
  }, [name]);

  /** 이름 편집을 완료한다. 빈 값이 아니고 변경된 경우에만 updateSurveyName을 호출한다 */
  const handleFinishEdit = useCallback(() => {
    if (editName.trim() && editName.trim() !== name) {
      updateSurveyName(editName.trim());
    } else {
      setEditName(name);
    }
    setIsEditingName(false);
  }, [editName, name, updateSurveyName]);

  /**
   * 키보드 이벤트 핸들러.
   * Enter: 편집 완료
   * Escape: 편집 취소 및 원래 이름 복원
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleFinishEdit();
      } else if (e.key === 'Escape') {
        setEditName(name);
        setIsEditingName(false);
      }
    },
    [handleFinishEdit, name]
  );

  /** Save as Draft 버튼 클릭 핸들러 — onSave 콜백을 호출하여 즉시 저장을 트리거한다 */
  const handleSaveAsDraft = useCallback(async () => {
    if (onSave) {
      await onSave();
    }
  }, [onSave]);

  /** Publish / Update 버튼 클릭 핸들러 — onPublish 콜백을 호출하여 발행을 트리거한다 */
  const handlePublish = useCallback(async () => {
    if (onPublish) {
      await onPublish();
    }
  }, [onPublish]);

  return (
    <div className="flex items-center justify-between border-b bg-background px-4 py-2">
      {/* 좌측: 뒤로가기 버튼 + 설문 이름 인라인 편집 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <a
            href={backUrl}
            aria-label={t(
              'surveyEditor.menuBar.backToSurveys',
              'Back to surveys'
            )}
          >
            <ArrowLeft className="h-4 w-4" />
          </a>
        </Button>

        {isEditingName ? (
          <Input
            value={editName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEditName(e.target.value)
            }
            onBlur={handleFinishEdit}
            onKeyDown={handleKeyDown}
            className="h-8 w-64 text-sm font-medium"
            autoFocus
          />
        ) : (
          <button
            className="cursor-pointer text-sm font-medium hover:underline"
            onClick={handleStartEdit}
            type="button"
          >
            {name ||
              t('surveyEditor.menuBar.untitledSurvey', 'Untitled Survey')}
          </button>
        )}
      </div>

      {/* 우측: 자동 저장 표시기 + 액션 버튼 */}
      <div className="flex items-center gap-3">
        <AutoSaveIndicator status={autoSaveStatus} />

        {/* DRAFT 상태에서만 Save as Draft 버튼 표시 */}
        {status === 'DRAFT' && (
          <Button variant="outline" size="sm" onClick={handleSaveAsDraft}>
            {t('surveyEditor.menuBar.saveAsDraft', 'Save as Draft')}
          </Button>
        )}

        {/* DRAFT 상태에서만 Publish 버튼 표시 */}
        {status === 'DRAFT' && (
          <Button size="sm" onClick={handlePublish}>
            {t('surveyEditor.menuBar.publish', 'Publish')}
          </Button>
        )}

        {/* IN_PROGRESS 또는 PAUSED 상태에서 Update 버튼 표시 */}
        {(status === 'IN_PROGRESS' || status === 'PAUSED') && (
          <Button size="sm" onClick={handlePublish}>
            {t('surveyEditor.menuBar.update', 'Update')}
          </Button>
        )}
      </div>
    </div>
  );
}
