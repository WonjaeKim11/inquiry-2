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
} from '@inquiry/client-ui';
import { deleteSegment, type SegmentItem } from './segment-api.js';

interface DeleteSegmentDialogProps {
  envId: string;
  segment: SegmentItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

/**
 * 세그먼트 삭제 확인 다이얼로그.
 * AlertDialog가 없으므로 Dialog 컴포넌트를 사용하여 확인/취소 UI를 구성한다.
 */
export function DeleteSegmentDialog({
  envId,
  segment,
  open,
  onOpenChange,
  onDeleted,
}: DeleteSegmentDialogProps) {
  const { t } = useTranslation('translation');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  /** 삭제 실행 후 성공 시 콜백 호출 */
  const handleDelete = async () => {
    setDeleting(true);
    setError('');

    const { ok, message } = await deleteSegment(envId, segment.id);

    if (ok) {
      onDeleted();
    } else {
      setError(message ?? t('segment.errors.delete_failed'));
    }
    setDeleting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('segment.dialogs.delete_title')}</DialogTitle>
          <DialogDescription>
            {t('segment.dialogs.delete_message', { title: segment.title })}
          </DialogDescription>
        </DialogHeader>

        {/* 에러 메시지 표시 */}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            {t('segment.form.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting
              ? t('common.deleting', 'Deleting...')
              : t('segment.actions.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
