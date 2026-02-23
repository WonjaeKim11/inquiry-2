'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@inquiry/client-core';
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

/**
 * API Key 삭제 확인 다이얼로그.
 * 삭제 경고 메시지를 표시하고 확인 시 DELETE 요청을 서버에 보낸다.
 * 이름 확인 입력은 불필요하며, 간단한 확인만 진행한다.
 */
export function DeleteApiKeyDialog({
  organizationId,
  apiKeyId,
  apiKeyLabel,
  open,
  onOpenChange,
  onDeleted,
}: {
  /** 대상 조직 ID */
  organizationId: string;
  /** 삭제할 API Key ID */
  apiKeyId: string;
  /** 삭제할 API Key의 라벨 (표시용) */
  apiKeyLabel: string;
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
   * API Key 삭제 요청을 서버에 보낸다.
   * 성공 시 다이얼로그를 닫고 onDeleted 콜백을 호출한다.
   */
  const handleDelete = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch(
        `/organizations/${organizationId}/api-keys/${apiKeyId}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('apiKey.delete.fail'));
      }

      onOpenChange(false);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('apiKey.delete.fail'));
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
          <DialogTitle>{t('apiKey.delete.title')}</DialogTitle>
          <DialogDescription>
            {t('apiKey.delete.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 삭제 대상 키 라벨 표시 */}
          <p className="text-sm font-medium">{apiKeyLabel}</p>

          {/* 경고: 사용 중인 앱이 즉시 접근을 잃는다 */}
          <Alert variant="destructive">
            <AlertDescription>{t('apiKey.delete.warning')}</AlertDescription>
          </Alert>

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
            {t('apiKey.delete.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? t('apiKey.delete.deleting') : t('apiKey.delete.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
