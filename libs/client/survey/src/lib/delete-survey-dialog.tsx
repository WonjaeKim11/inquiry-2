'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';
import { deleteSurvey } from './api';

/**
 * 설문 삭제 확인 다이얼로그.
 * 삭제 경고 메시지를 표시하고 확인 시 DELETE 요청을 서버에 보낸다.
 */
export function DeleteSurveyDialog({
  surveyId,
  surveyName,
  open,
  onOpenChange,
  onDeleted,
}: {
  /** 삭제할 설문 ID */
  surveyId: string;
  /** 삭제할 설문 이름 (표시용) */
  surveyName: string;
  /** 다이얼로그 열림/닫힘 상태 */
  open: boolean;
  /** 열림/닫힘 상태 변경 핸들러 */
  onOpenChange: (open: boolean) => void;
  /** 삭제 성공 시 호출되는 콜백 */
  onDeleted: () => void;
}) {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 설문 삭제 요청을 서버에 보낸다.
   * 성공 시 다이얼로그를 닫고 onDeleted 콜백을 호출한다.
   */
  const handleDelete = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await deleteSurvey(surveyId);
      if (!result.ok) {
        throw new Error(result.message || t('survey.delete.fail'));
      }

      onOpenChange(false);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('survey.delete.fail'));
    } finally {
      setLoading(false);
    }
  };

  /** 다이얼로그가 닫힐 때 에러 상태를 초기화한다 */
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('survey.delete.title')}</DialogTitle>
          <DialogDescription>{t('survey.delete.confirm')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 삭제 대상 설문 이름 표시 */}
          <p className="text-sm font-medium">{surveyName}</p>

          {/* 에러 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            {t('survey.delete.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? t('survey.delete.deleting') : t('survey.delete.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
