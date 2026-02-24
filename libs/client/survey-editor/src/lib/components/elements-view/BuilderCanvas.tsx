'use client';

import { useCallback, useMemo } from 'react';
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
} from '@dnd-kit/sortable';
import {
  BuilderEntities,
  useBuilderStoreData,
} from '@coltorapps/builder-react';
import type { BuilderStore } from '@coltorapps/builder';
import { Plus } from 'lucide-react';
import { Button } from '@inquiry/client-ui';
import { getBlockLabels } from '../../utils/block-numbering';
import { BuilderStoreProvider } from './BuilderStoreContext';
import { entityComponentMap } from './entity-components/index';

interface BuilderCanvasProps {
  /** @coltorapps/builder-react의 BuilderStore 인스턴스 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builderStore: BuilderStore<any>;
}

/**
 * DnD 가능한 Block 캔버스.
 * DndContext + SortableContext로 Block 순서 변경을 지원하고,
 * BuilderEntities로 Entity(Block + Element)를 렌더링한다.
 *
 * BuilderStoreProvider를 통해 하위 Entity 컴포넌트에 builderStore를 전달한다.
 * Block 라벨(Block 1, Block 2, ...)도 Context로 함께 전달된다.
 */
export function BuilderCanvas({ builderStore }: BuilderCanvasProps) {
  const { t } = useTranslation();
  const data = useBuilderStoreData(builderStore);
  const rootIds = data?.schema?.root ?? [];

  /** Block ID -> "Block N" 라벨 매핑 */
  const blockLabels = useMemo(
    () => getBlockLabels(rootIds as string[]),
    [rootIds]
  );

  /**
   * PointerSensor에 distance: 8 제약을 설정하여
   * 클릭과 드래그를 구분한다. 8px 이상 이동해야 드래그로 인식.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  /**
   * Block DnD 완료 핸들러.
   * root 배열에서 드래그된 Block의 위치를 변경한다.
   * arrayMove로 immutable하게 새 배열을 생성한 뒤 setData로 반영.
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = (rootIds as string[]).indexOf(String(active.id));
      const newIndex = (rootIds as string[]).indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      const newRoot = arrayMove(rootIds as string[], oldIndex, newIndex);
      const currentData = builderStore.getData();
      builderStore.setData({
        ...currentData,
        schema: {
          ...currentData.schema,
          root: newRoot,
        },
      });
    },
    [rootIds, builderStore]
  );

  /**
   * 새 Block 추가 핸들러.
   * parentId 없이 addEntity를 호출하면 root에 추가된다.
   */
  const handleAddBlock = useCallback(() => {
    builderStore.addEntity({
      type: 'block',
      attributes: {},
    });
  }, [builderStore]);

  return (
    <div className="space-y-3">
      <BuilderStoreProvider
        builderStore={builderStore}
        blockLabels={blockLabels}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rootIds as string[]}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              <BuilderEntities
                builderStore={builderStore}
                components={entityComponentMap}
              />
            </div>
          </SortableContext>
        </DndContext>
      </BuilderStoreProvider>

      {/* Block 추가 버튼 */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddBlock}
        className="w-full"
      >
        <Plus className="mr-1.5 h-4 w-4" />
        {t('surveyEditor.block.addBlock', 'Add Block')}
      </Button>
    </div>
  );
}
