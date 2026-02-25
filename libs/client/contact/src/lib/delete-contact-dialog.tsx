'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@inquiry/client-ui';
import { deleteContact, type ContactItem } from './contact-api';

interface DeleteContactDialogProps {
  envId: string;
  contact: ContactItem;
  onClose: () => void;
  onDeleted: () => void;
}

/**
 * 연락처 삭제 확인 다이얼로그.
 * 삭제 전 사용자에게 확인을 요청하고, 삭제 완료 후 콜백을 호출한다.
 */
export function DeleteContactDialog({
  envId,
  contact,
  onClose,
  onDeleted,
}: DeleteContactDialogProps) {
  const { t } = useTranslation('translation');
  const [loading, setLoading] = useState(false);

  /** 삭제 요청 처리 */
  const handleDelete = async () => {
    setLoading(true);
    try {
      const result = await deleteContact(envId, contact.id);
      if (result.ok) {
        onDeleted();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('contact.delete.title')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t('contact.delete.confirm_message')}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('contact.delete.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {t('contact.delete.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
