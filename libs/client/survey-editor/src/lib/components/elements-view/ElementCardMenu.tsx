'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Copy, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@inquiry/client-ui';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';

interface ElementCardMenuProps {
  /** Element Entity ID */
  entityId: string;
  /** Element 복제 콜백. 미전달 시 복제 버튼이 비활성 상태가 된다. */
  onDuplicate?: () => void;
  /** Element 삭제 콜백. 미전달 시 삭제 버튼이 비활성 상태가 된다. */
  onDelete?: () => void;
  /** 위로 이동 콜백. 미전달 시 이동 버튼이 비활성 상태가 된다. */
  onMoveUp?: () => void;
  /** 아래로 이동 콜백. 미전달 시 이동 버튼이 비활성 상태가 된다. */
  onMoveDown?: () => void;
}

/**
 * Element 카드 메뉴.
 * 복제, 삭제, 위/아래 이동 액션을 제공한다.
 * builderStore 메서드는 부모 컴포넌트에서 콜백으로 전달받는다.
 * 콜백이 전달되지 않은 경우 해당 메뉴 항목은 비활성 상태가 된다.
 */
export function ElementCardMenu({
  entityId,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ElementCardMenuProps) {
  const { t } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  /** 복제 버튼 핸들러 */
  const handleDuplicate = useCallback(() => {
    onDuplicate?.();
  }, [onDuplicate]);

  /** 위로 이동 핸들러 */
  const handleMoveUp = useCallback(() => {
    onMoveUp?.();
  }, [onMoveUp]);

  /** 아래로 이동 핸들러 */
  const handleMoveDown = useCallback(() => {
    onMoveDown?.();
  }, [onMoveDown]);

  /** 삭제 확인 핸들러. ConfirmDeleteDialog에서 확인 시 호출된다. */
  const handleConfirmDelete = useCallback(() => {
    onDelete?.();
  }, [onDelete]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDuplicate} disabled={!onDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            {t('surveyEditor.element.menu.duplicate', 'Duplicate')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleMoveUp} disabled={!onMoveUp}>
            <ArrowUp className="mr-2 h-4 w-4" />
            {t('surveyEditor.element.menu.moveUp', 'Move Up')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleMoveDown} disabled={!onMoveDown}>
            <ArrowDown className="mr-2 h-4 w-4" />
            {t('surveyEditor.element.menu.moveDown', 'Move Down')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive"
            disabled={!onDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('surveyEditor.element.menu.delete', 'Delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t('surveyEditor.element.menu.deleteTitle', 'Delete Element')}
        description={t(
          'surveyEditor.element.menu.deleteDesc',
          'This will delete the element. This action cannot be undone.'
        )}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
