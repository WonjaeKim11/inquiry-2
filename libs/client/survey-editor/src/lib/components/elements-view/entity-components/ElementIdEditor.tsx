'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Label, Button } from '@inquiry/client-ui';
import { validateElementId } from '../../../utils/id-validation';

interface ElementIdEditorProps {
  /** Entity ID (자기 자신 중복 검사 제외용) */
  entityId: string;
  /** 현재 Element ID */
  currentId: string;
  /** 기존 모든 Element ID 목록 (중복 검사 대상) */
  existingIds: string[];
  /** isDraft 상태 — DRAFT 상태일 때만 ID 편집이 가능하다 */
  isDraft: boolean;
  /** ID 변경 시 호출되는 콜백 */
  onIdChange: (newId: string) => void;
}

/**
 * Element ID 편집 폼.
 * isDraft가 true일 때만 편집 가능하며, 그 외에는 읽기 전용으로 표시한다.
 * 저장 시 validateElementId로 패턴/중복 검사를 수행한다.
 *
 * @param props - ElementIdEditorProps
 * @returns Element ID 편집 UI 또는 읽기 전용 표시
 */
export function ElementIdEditor({
  entityId,
  currentId,
  existingIds,
  isDraft,
  onIdChange,
}: ElementIdEditorProps) {
  const { t } = useTranslation();
  const [editId, setEditId] = useState(currentId);
  const [error, setError] = useState<string | null>(null);

  /**
   * 저장 버튼 핸들러.
   * 현재 값과 동일하면 무시하고, 유효하지 않으면 에러를 표시한다.
   */
  const handleSave = useCallback(() => {
    if (editId === currentId) return;

    const result = validateElementId(editId, existingIds, entityId);
    if (!result.valid) {
      setError(
        result.error ?? t('surveyEditor.element.invalidId', 'Invalid ID')
      );
      return;
    }

    setError(null);
    onIdChange(editId);
  }, [editId, currentId, existingIds, entityId, onIdChange, t]);

  // DRAFT가 아닌 경우 읽기 전용으로 표시
  if (!isDraft) {
    return (
      <div>
        <Label className="mb-1 block text-xs text-muted-foreground">
          {t('surveyEditor.element.elementId', 'Element ID')}
        </Label>
        <span className="text-xs font-mono">{currentId}</span>
      </div>
    );
  }

  return (
    <div>
      <Label className="mb-1 block text-xs">
        {t('surveyEditor.element.elementId', 'Element ID')}
      </Label>
      <div className="flex gap-2">
        <Input
          value={editId}
          onChange={(e) => {
            setEditId(e.target.value);
            setError(null);
          }}
          className="h-7 font-mono text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          className="h-7 text-xs"
        >
          {t('surveyEditor.shared.save', 'Save')}
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
