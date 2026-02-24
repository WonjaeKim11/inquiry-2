'use client';

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
 * 다국어 번역 전체 삭제 확인 다이얼로그.
 * DeleteProjectDialog 패턴을 따라 destructive 확인 UI를 제공한다.
 */
export function RemoveTranslationsDialog({
  open,
  onOpenChange,
  onConfirm,
  removing,
}: {
  /** 다이얼로그 열림 상태 */
  open: boolean;
  /** 열림/닫힘 상태 변경 핸들러 */
  onOpenChange: (open: boolean) => void;
  /** 삭제 확인 시 호출되는 콜백 */
  onConfirm: () => void;
  /** 삭제 진행 중 여부 */
  removing: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('multilingual.disable_confirm_title')}</DialogTitle>
          <DialogDescription>
            {t('multilingual.disable_confirm')}
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertDescription>
            {t('multilingual.disable_confirm')}
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={removing}
          >
            {t('project.delete.cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={removing}>
            {removing
              ? t('multilingual.removing')
              : t('multilingual.disable_multilingual')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
