'use client';

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Copy,
  Trash2,
} from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@inquiry/client-ui';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';

interface BlockHeaderProps {
  /** Block Entity ID */
  entityId: string;
  /** Block 표시 라벨 (예: "Block 1") */
  blockLabel: string;
  /** 현재 펼침 상태 */
  isExpanded: boolean;
  /** 접기/펼치기 토글 콜백 */
  onToggleExpand: () => void;
  /** dnd-kit의 드래그 관련 DOM 속성 (role, tabIndex, aria-* 등) */
  dragAttributes?: DraggableAttributes;
  /** dnd-kit의 드래그 이벤트 리스너 (onPointerDown 등) */
  dragListeners?: SyntheticListenerMap;
  /** Block 복제 콜백. 미전달 시 복제 메뉴 비활성화. */
  onDuplicate?: () => void;
  /** Block 삭제 콜백. 미전달 시 삭제 메뉴 비활성화. */
  onDelete?: () => void;
}

/**
 * Block 헤더 컴포넌트.
 * 드래그 핸들(GripVertical), 접기/펼치기(ChevronDown/Right),
 * Block 라벨, 메뉴(복제/삭제)를 포함한다.
 */
export function BlockHeader({
  entityId,
  blockLabel,
  isExpanded,
  onToggleExpand,
  dragAttributes,
  dragListeners,
  onDuplicate,
  onDelete,
}: BlockHeaderProps) {
  const { t } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  /** Block 복제 핸들러 */
  const handleDuplicate = useCallback(() => {
    onDuplicate?.();
  }, [onDuplicate]);

  /** Block 삭제 확인 모달 열기 */
  const handleDelete = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  /** Block 삭제 확인 핸들러 */
  const handleConfirmDelete = useCallback(() => {
    onDelete?.();
  }, [onDelete]);

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2">
        {/* 드래그 핸들 */}
        <button
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...dragAttributes}
          {...dragListeners}
          aria-label={t('surveyEditor.block.dragHandle', 'Drag to reorder')}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* 접기/펼치기 버튼 */}
        <button
          onClick={onToggleExpand}
          className="text-muted-foreground hover:text-foreground"
          aria-expanded={isExpanded}
          aria-label={
            isExpanded
              ? t('surveyEditor.block.collapse', 'Collapse')
              : t('surveyEditor.block.expand', 'Expand')
          }
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Block 이름 */}
        <span className="flex-1 text-sm font-medium">{blockLabel}</span>

        {/* 메뉴 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDuplicate} disabled={!onDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              {t('surveyEditor.block.menu.duplicate', 'Duplicate')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive"
              disabled={!onDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('surveyEditor.block.menu.delete', 'Delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t('surveyEditor.block.menu.deleteTitle', 'Delete Block')}
        description={t(
          'surveyEditor.block.menu.deleteDesc',
          'This will delete the block and all its elements. This action cannot be undone.'
        )}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
