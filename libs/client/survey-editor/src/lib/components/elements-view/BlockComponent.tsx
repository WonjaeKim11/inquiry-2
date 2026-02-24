'use client';

import { useCallback, useMemo } from 'react';
import { createEntityComponent } from '@coltorapps/builder-react';
import { useSortable } from '@dnd-kit/sortable';
import { blockEntity } from '@inquiry/survey-builder-config';
import { useEditorUI } from '../../hooks/use-editor-ui';
import { useBuilderStoreContext } from './BuilderStoreContext';
import { BlockHeader } from './BlockHeader';
import { AddElementButton } from './AddElementButton';
import { DEFAULT_ELEMENT_ATTRS } from './AddElementButton';

/**
 * Block Entity 컴포넌트.
 * createEntityComponent(blockEntity)로 타입 안전하게 생성한다.
 * useSortable로 DnD를 지원하고, Collapsible 패턴으로 접기/펼치기를 지원한다.
 *
 * entity.id: Block의 고유 ID
 * children: 이 Block에 속한 Element Entity들의 렌더링 결과 (JSX.Element[])
 */
export const BlockComponent = createEntityComponent(
  blockEntity,
  ({ entity, children }) => {
    const entityId = entity.id;
    const { expandedBlockIds, toggleBlockExpanded } = useEditorUI();
    const { builderStore, blockLabels } = useBuilderStoreContext();
    const isExpanded = expandedBlockIds.includes(entityId);

    const {
      attributes: dragAttributes,
      listeners: dragListeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: entityId });

    /**
     * @dnd-kit/utilities가 직접 설치되지 않았으므로
     * transform 객체를 수동으로 CSS transform 문자열로 변환한다.
     */
    const style = useMemo(
      () => ({
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition,
        opacity: isDragging ? 0.5 : 1,
      }),
      [transform, transition, isDragging]
    );

    /** Block 라벨 (예: "Block 1") */
    const blockLabel = blockLabels[entityId] ?? 'Block';

    /** Block 복제 핸들러 */
    const handleDuplicate = useCallback(() => {
      builderStore.cloneEntity(entityId);
    }, [builderStore, entityId]);

    /** Block 삭제 핸들러 */
    const handleDelete = useCallback(() => {
      builderStore.deleteEntity(entityId);
    }, [builderStore, entityId]);

    /**
     * Element 추가 핸들러.
     * DEFAULT_ELEMENT_ATTRS에서 초기 속성을 가져와 Block 하위에 추가한다.
     */
    const handleAddEntity = useCallback(
      (type: string, parentId: string) => {
        const attrs = DEFAULT_ELEMENT_ATTRS[type] ?? {
          headline: { default: '' },
          isDraft: true,
        };
        builderStore.addEntity({
          type,
          attributes: attrs,
          parentId,
        });
      },
      [builderStore]
    );

    return (
      <div ref={setNodeRef} style={style}>
        <div className="rounded-lg border bg-card shadow-sm">
          {/* Block 헤더: 드래그 핸들, 접기/펼치기, 라벨, 메뉴 */}
          <BlockHeader
            entityId={entityId}
            blockLabel={blockLabel}
            isExpanded={isExpanded}
            onToggleExpand={() => toggleBlockExpanded(entityId)}
            dragAttributes={dragAttributes}
            dragListeners={dragListeners}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />

          {/* Block 바디: 펼쳐진 경우에만 자식 Element 목록과 추가 버튼을 렌더링 */}
          {isExpanded && (
            <div className="border-t p-3 space-y-2">
              {children}
              <AddElementButton
                blockId={entityId}
                onAddEntity={handleAddEntity}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
);
