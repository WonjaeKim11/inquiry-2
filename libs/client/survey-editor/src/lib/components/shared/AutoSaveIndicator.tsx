'use client';

import { useTranslation } from 'react-i18next';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import type { AutoSaveStatus } from '../../context/types';

interface AutoSaveIndicatorProps {
  /** 현재 자동 저장 상태 */
  status: AutoSaveStatus;
}

/**
 * 자동 저장 상태 표시 컴포넌트.
 *
 * 상태별 표시:
 * - idle: 아무것도 렌더링하지 않음
 * - saving: 스피너 아이콘 + "Saving..." 텍스트
 * - saved: 체크 아이콘 + "Saved" 텍스트
 * - error: 경고 아이콘 + "Save failed" 텍스트
 *
 * @param status - AutoSaveStatus 타입의 현재 저장 상태
 */
export function AutoSaveIndicator({ status }: AutoSaveIndicatorProps) {
  const { t } = useTranslation();

  // idle 상태에서는 아무것도 표시하지 않는다
  if (status === 'idle') return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{t('surveyEditor.menuBar.autoSave.saving', 'Saving...')}</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3 w-3 text-green-600" />
          <span>{t('surveyEditor.menuBar.autoSave.saved', 'Saved')}</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span>{t('surveyEditor.menuBar.autoSave.error', 'Save failed')}</span>
        </>
      )}
    </div>
  );
}
