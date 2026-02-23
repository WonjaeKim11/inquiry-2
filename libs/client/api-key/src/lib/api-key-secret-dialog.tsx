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

/**
 * API Key 비밀 표시 다이얼로그.
 * 생성 직후 한 번만 평문 키를 보여주며,
 * 클립보드 복사 기능과 "다시 볼 수 없다"는 경고를 제공한다.
 */
export function ApiKeySecretDialog({
  plainKey,
  open,
  onOpenChange,
}: {
  /** 생성된 API Key 평문 */
  plainKey: string;
  /** 다이얼로그 열림/닫힘 상태 */
  open: boolean;
  /** 열림/닫힘 상태 변경 핸들러 */
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();

  const [copied, setCopied] = useState(false);

  /**
   * 평문 키를 클립보드에 복사한다.
   * 복사 성공 시 2초간 "복사됨" 상태를 표시한다.
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainKey);
      setCopied(true);
      // 2초 후 복사 상태를 초기화한다
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 API 미지원 시 fallback (무시)
    }
  };

  /** 다이얼로그가 닫힐 때 복사 상태를 초기화한다 */
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCopied(false);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('apiKey.secret.title')}</DialogTitle>
          <DialogDescription>
            {t('apiKey.secret.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 평문 키를 code block으로 표시 */}
          <div className="rounded-lg bg-muted p-4">
            <code className="block break-all text-sm font-mono">
              {plainKey}
            </code>
          </div>

          {/* 클립보드 복사 버튼 */}
          <Button
            onClick={handleCopy}
            className="w-full"
            variant={copied ? 'outline' : 'default'}
          >
            {copied ? t('apiKey.secret.copied') : t('apiKey.secret.copy')}
          </Button>

          {/* 키가 다시 표시되지 않는다는 경고 */}
          <Alert>
            <AlertDescription>{t('apiKey.secret.warning')}</AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button onClick={() => handleOpenChange(false)}>
            {t('apiKey.secret.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
