'use client';

import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Button,
} from '@inquiry/client-ui';

interface ConfirmDeleteDialogProps {
  /** 모달 표시 여부 */
  open: boolean;
  /** 모달 열림/닫힘 상태 변경 콜백 */
  onOpenChange: (open: boolean) => void;
  /** 모달 제목 */
  title: string;
  /** 모달 설명 (삭제 대상에 대한 안내) */
  description: string;
  /** 삭제 확인 콜백. 확인 시 호출되며 모달이 자동으로 닫힌다 */
  onConfirm: () => void;
  /** 삭제 버튼 텍스트 (기본: i18n "Delete") */
  confirmLabel?: string;
  /** 삭제 진행 중 여부. true이면 버튼 비활성화 */
  loading?: boolean;
}

/**
 * 삭제 확인 모달 컴포넌트.
 * 삭제 전 사용자에게 확인을 요청하는 Dialog 기반 모달이다.
 * 확인 시 onConfirm을 호출하고 모달을 닫는다.
 *
 * @param props - ConfirmDeleteDialogProps
 * @returns 삭제 확인 Dialog를 렌더링한다
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel,
  loading = false,
}: ConfirmDeleteDialogProps) {
  const { t } = useTranslation();

  /** 확인 버튼 클릭 시 콜백 실행 후 모달 닫기 */
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('surveyEditor.shared.cancel', 'Cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {confirmLabel ?? t('surveyEditor.shared.confirmDelete', 'Delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
