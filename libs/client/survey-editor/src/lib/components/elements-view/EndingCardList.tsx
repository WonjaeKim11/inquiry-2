'use client';

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { createId } from '@paralleldrive/cuid2';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@inquiry/client-ui';
import type { SurveyEnding } from '@inquiry/survey-builder-config';
import { useSurveyMeta } from '../../hooks/use-survey-meta';
import { EndingCardEditor } from './EndingCardEditor';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';

interface SortableEndingCardProps {
  /** 편집할 종료 카드 데이터 */
  ending: SurveyEnding;
  /** 목록 내 인덱스 */
  index: number;
  /** 종료 카드 업데이트 콜백 */
  onUpdate: (ending: SurveyEnding) => void;
  /** 종료 카드 삭제 콜백. ID를 전달한다 */
  onDelete: (id: string) => void;
}

/**
 * Sortable Ending Card 래퍼.
 * @dnd-kit/sortable의 useSortable 훅을 사용하여
 * 드래그 앤 드롭 정렬 기능을 EndingCardEditor에 추가한다.
 */
function SortableEndingCard({
  ending,
  index,
  onUpdate,
  onDelete,
}: SortableEndingCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ending.id });

  /** 드래그 중 transform/transition 스타일 적용 */
  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const { t } = useTranslation();
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-start gap-2">
        {/* 드래그 핸들 */}
        <button
          className="mt-4 cursor-grab touch-none text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* 종료 카드 편집기 */}
        <div className="flex-1">
          <EndingCardEditor ending={ending} onChange={onUpdate} index={index} />
        </div>

        {/* 삭제 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => setShowDelete(true)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title={t('surveyEditor.ending.deleteTitle', 'Delete Ending Card')}
        description={t(
          'surveyEditor.ending.deleteDesc',
          'This ending card will be permanently deleted.'
        )}
        onConfirm={() => onDelete(ending.id)}
      />
    </div>
  );
}

/**
 * Ending Card 목록 컴포넌트.
 * SurveyMeta의 endings 배열을 렌더링하며,
 * DnD 순서 변경, 카드 추가/삭제 기능을 제공한다.
 *
 * - @dnd-kit을 사용한 드래그 앤 드롭 정렬
 * - createId()로 새 카드 ID 생성
 * - ConfirmDeleteDialog로 삭제 전 확인
 */
export function EndingCardList() {
  const { t } = useTranslation();
  const { endings, addEnding, updateEnding, deleteEnding, reorderEndings } =
    useSurveyMeta();

  /** PointerSensor: 8px 이상 이동 시 드래그 활성화 (클릭과 구분) */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  /**
   * 드래그 종료 핸들러.
   * active/over 아이템의 인덱스를 찾아 arrayMove로 순서를 변경한 뒤
   * reorderEndings로 상태를 업데이트한다.
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIdx = endings.findIndex((e) => e.id === active.id);
      const newIdx = endings.findIndex((e) => e.id === over.id);
      if (oldIdx !== -1 && newIdx !== -1) {
        reorderEndings(arrayMove(endings, oldIdx, newIdx));
      }
    },
    [endings, reorderEndings]
  );

  /** 새 종료 카드 추가. 기본값으로 endScreen 유형을 생성한다 */
  const handleAdd = useCallback(() => {
    addEnding({
      id: createId(),
      type: 'endScreen',
      headline: { default: '' },
    });
  }, [addEnding]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">
        {t('surveyEditor.ending.title', 'Ending Cards')}
      </h3>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={endings.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          {endings.map((ending, idx) => (
            <SortableEndingCard
              key={ending.id}
              ending={ending}
              index={idx}
              onUpdate={updateEnding}
              onDelete={deleteEnding}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* 종료 카드 추가 버튼 */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAdd}
        className="w-full"
      >
        <Plus className="mr-1.5 h-4 w-4" />
        {t('surveyEditor.ending.addEnding', 'Add Ending Card')}
      </Button>
    </div>
  );
}
