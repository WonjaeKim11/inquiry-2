'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Switch,
  Button,
  Input,
} from '@inquiry/client-ui';
import { useSurveyMeta } from '../../hooks/use-survey-meta';

/**
 * Hidden Fields 편집기 카드.
 * URL 파라미터를 통해 전달되는 숨겨진 필드를 관리한다.
 *
 * 기능:
 * - enabled 토글로 히든 필드 기능 전체 활성화/비활성화
 * - Field ID 추가 (중복 검증 포함)
 * - 기존 Field ID 삭제
 * - Enter 키로 빠른 추가 지원
 */
export function HiddenFieldsCard() {
  const { t } = useTranslation();
  const {
    hiddenFields,
    updateHiddenFields,
    addHiddenField,
    deleteHiddenField,
  } = useSurveyMeta();

  /** 새 필드 ID 입력값 */
  const [newFieldId, setNewFieldId] = useState('');
  /** 유효성 검증 에러 메시지 */
  const [error, setError] = useState<string | null>(null);

  /**
   * enabled 토글 핸들러.
   * 기존 hiddenFields 객체를 복사한 뒤 enabled 값만 변경한다.
   */
  const handleToggleEnabled = useCallback(
    (enabled: boolean) => {
      updateHiddenFields({ ...hiddenFields, enabled });
    },
    [hiddenFields, updateHiddenFields]
  );

  /**
   * 새 필드 추가 핸들러.
   * 입력값을 trim한 뒤 빈 문자열/중복 여부를 검증하고,
   * 통과하면 addHiddenField를 호출하여 필드를 추가한다.
   */
  const handleAddField = useCallback(() => {
    const id = newFieldId.trim();
    if (!id) return;

    // 중복 검증
    if (hiddenFields.fieldIds.includes(id)) {
      setError(
        t(
          'surveyEditor.hiddenFields.duplicateError',
          'This field ID already exists'
        )
      );
      return;
    }

    addHiddenField(id);
    setNewFieldId('');
    setError(null);
  }, [newFieldId, hiddenFields.fieldIds, addHiddenField, t]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm">
          {t('surveyEditor.hiddenFields.title', 'Hidden Fields')}
        </CardTitle>
        <Switch
          checked={hiddenFields.enabled}
          onCheckedChange={handleToggleEnabled}
        />
      </CardHeader>

      {hiddenFields.enabled && (
        <CardContent className="space-y-3 pt-0">
          {/* 기존 필드 ID 목록 */}
          {hiddenFields.fieldIds.map((fieldId) => (
            <div
              key={fieldId}
              className="flex items-center justify-between rounded-md border px-3 py-1.5"
            >
              <span className="font-mono text-xs">{fieldId}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteHiddenField(fieldId)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {/* 새 필드 ID 추가 입력 */}
          <div className="flex gap-2">
            <Input
              value={newFieldId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setNewFieldId(e.target.value);
                setError(null);
              }}
              placeholder={t(
                'surveyEditor.hiddenFields.addPlaceholder',
                'Enter field ID...'
              )}
              className="h-8 font-mono text-xs"
              onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddField}
              className="h-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* 유효성 검증 에러 표시 */}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      )}
    </Card>
  );
}
