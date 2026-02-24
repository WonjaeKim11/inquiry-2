# FSD-016 Phase 3: Block 시스템 + DnD + Elements View 구현

## Overview
설문 에디터의 Elements 탭 메인 뷰와 Block 시스템을 구현한다.
`@coltorapps/builder-react`의 `BuilderEntities`, `createEntityComponent` API를 활용하여
16종 Entity(1 Block + 15 Element)를 렌더링하고, `@dnd-kit`를 통해 Block 순서 변경(DnD)을 지원한다.
Phase 5에서 구현될 WelcomeCard, EndingCard, HiddenFields, Variables 영역은 placeholder로 배치한다.

## Changed Files

### 신규 생성 (11개)

| 파일 경로 | 역할 |
|-----------|------|
| `libs/client/survey-editor/src/lib/components/elements-view/ElementsView.tsx` | Elements 탭 메인 뷰. 다국어 설정 → WelcomeCard → BuilderCanvas → EndingCards → HiddenFields → Variables 순서 배치 |
| `libs/client/survey-editor/src/lib/components/elements-view/LanguageSettingsCard.tsx` | 다국어 설정 안내 카드 |
| `libs/client/survey-editor/src/lib/components/elements-view/BuilderCanvas.tsx` | DndContext + SortableContext + BuilderEntities로 Block DnD 캔버스 구성 |
| `libs/client/survey-editor/src/lib/components/elements-view/BuilderStoreContext.tsx` | BuilderStore를 하위 Entity 컴포넌트에 전달하는 React Context |
| `libs/client/survey-editor/src/lib/components/elements-view/BlockComponent.tsx` | createEntityComponent(blockEntity)로 생성한 Block 카드. Sortable + Collapsible |
| `libs/client/survey-editor/src/lib/components/elements-view/BlockHeader.tsx` | Block 헤더: 드래그 핸들, 접기/펼치기, 라벨, 메뉴(복제/삭제) |
| `libs/client/survey-editor/src/lib/components/elements-view/BlockSettings.tsx` | Block 설정 패널. Logic 편집 진입점 (Phase 5에서 확장) |
| `libs/client/survey-editor/src/lib/components/elements-view/ElementComponent.tsx` | 15종 Element 공통 래퍼. 카드 UI, 활성 상태 표시, 고급 설정 접기/펼치기 |
| `libs/client/survey-editor/src/lib/components/elements-view/ElementCardMenu.tsx` | Element 카드 메뉴: 복제, 삭제, 위/아래 이동 |
| `libs/client/survey-editor/src/lib/components/elements-view/AddElementButton.tsx` | 15가지 Element 유형 선택 드롭다운 + DEFAULT_ELEMENT_ATTRS 정의 |
| `libs/client/survey-editor/src/lib/components/elements-view/entity-components/index.tsx` | Entity Type → Component 매핑. Block은 실제 컴포넌트, 15종 Element는 placeholder |

### 수정 (1개)

| 파일 경로 | 역할 |
|-----------|------|
| `libs/client/survey-editor/src/index.ts` | barrel export에 새 컴포넌트 11개 추가 |

## Major Changes

### 1. BuilderStoreContext 패턴

`createEntityComponent`로 만든 컴포넌트는 자체 props에 builderStore를 받을 수 없으므로,
React Context를 통해 BuilderCanvas → Block/Element 컴포넌트로 전달한다.

```typescript
// BuilderCanvas에서 Provider 래핑
<BuilderStoreProvider builderStore={builderStore} blockLabels={blockLabels}>
  <DndContext ...>
    <BuilderEntities builderStore={builderStore} components={entityComponentMap} />
  </DndContext>
</BuilderStoreProvider>

// BlockComponent 내부에서 사용
const { builderStore, blockLabels } = useBuilderStoreContext();
builderStore.cloneEntity(entityId);
builderStore.deleteEntity(entityId);
builderStore.addEntity({ type, attributes, parentId });
```

### 2. Block DnD (Drag and Drop)

`@dnd-kit/core` DndContext + `@dnd-kit/sortable` SortableContext로 Block 순서 변경을 구현한다.

```typescript
// BuilderCanvas: DnD 완료 시 root 배열 순서 변경
const handleDragEnd = (event: DragEndEvent) => {
  const newRoot = arrayMove(rootIds, oldIndex, newIndex);
  builderStore.setData({
    ...builderStore.getData(),
    schema: { ...builderStore.getData().schema, root: newRoot },
  });
};

// BlockComponent: useSortable로 DnD 상태 관리
const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entityId });
// @dnd-kit/utilities 미설치 → transform 수동 변환
const style = {
  transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  transition,
  opacity: isDragging ? 0.5 : 1,
};
```

### 3. Entity Component Map (Placeholder 패턴)

Phase 4에서 각 Entity 타입별 실제 컴포넌트가 구현되기 전까지,
`createPlaceholderComponent` 팩토리로 15종 placeholder를 생성한다.

```typescript
function createPlaceholderComponent(entity: any, label: string) {
  return createEntityComponent(entity, ({ entity: e }) => {
    const headline = (e.attributes as any)?.headline?.['default'] ?? '';
    return (
      <div className="rounded-md border border-dashed p-3">
        <p>{label}</p>
        {headline && <p>{headline}</p>}
      </div>
    );
  });
}
```

### 4. Element 추가 시 기본 속성 (DEFAULT_ELEMENT_ATTRS)

각 Element 타입별 초기 속성을 정의한다. headline은 `{ default: '' }` (I18nString),
isDraft: true로 미완성 상태 표시.

## How to use it

```tsx
import { ElementsView } from '@inquiry/client-survey-editor';
import { useBuilderStore } from '@coltorapps/builder-react';
import { surveyBuilder } from '@inquiry/survey-builder-config';

function SurveyEditor() {
  const builderStore = useBuilderStore(surveyBuilder, {
    initialData: { schema: { root: [], entities: {} } },
  });

  return <ElementsView builderStore={builderStore} />;
}
```

## Related Components/Modules

- **@coltorapps/builder-react**: BuilderEntities, createEntityComponent, useBuilderStoreData
- **@coltorapps/builder**: BuilderStore, createEntity
- **@dnd-kit/core**: DndContext, PointerSensor, closestCenter
- **@dnd-kit/sortable**: SortableContext, useSortable, arrayMove, verticalListSortingStrategy
- **@inquiry/survey-builder-config**: blockEntity, 15종 Element entity, ELEMENT_ENTITY_NAMES
- **@inquiry/client-ui**: Button, Card, DropdownMenu, Collapsible 등
- **../shared/ConfirmDeleteDialog**: 삭제 확인 모달
- **../../hooks/use-editor-ui**: expandedBlockIds, toggleBlockExpanded
- **../../hooks/use-active-element**: activeElementId, toggleElement
- **../../utils/block-numbering**: getBlockLabels

## Precautions

- `@dnd-kit/utilities`는 직접 설치되어 있지 않으므로 CSS.Transform 대신 `translate3d()` 문자열을 수동 생성한다.
- `createEntityComponent`의 render 함수는 React hooks를 자유롭게 사용할 수 있으나, `EntityComponentProps`에 `builderStore`가 없으므로 Context를 통해 전달해야 한다.
- Entity Component Map의 타입을 `Record<string, any>`로 선언한 이유: `BuilderEntities`의 `components` prop은 `EntitiesComponents<TBuilder>` 타입을 요구하는데, 각 Entity별 specific 타입과 generic `EntityComponent` 사이의 공변성 문제로 인해 explicit 타입 어노테이션이 불가하다.
- Phase 4에서 15종 Element placeholder를 실제 컴포넌트로 교체 예정.
- Phase 5에서 WelcomeCard, EndingCards, HiddenFields, Variables placeholder를 실제 컴포넌트로 교체 예정.
