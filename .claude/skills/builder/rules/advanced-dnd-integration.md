---
title: Integrate dnd-kit with Builder Store for Drag and Drop
impact: LOW-MEDIUM
impactDescription: enables visual entity reordering in builder UI
tags: dnd-kit, drag-and-drop, reorder, builder, UI
---

## Integrate dnd-kit with Builder Store for Drag and Drop

Use `@dnd-kit/core` and `@dnd-kit/sortable` to enable drag-and-drop entity reordering in the builder UI. Never directly mutate the schema arrays. Instead, compute the new order with `arrayMove` and apply it immutably through `builderStore.setData`.

**Incorrect (directly mutating the root array):**

```typescript
function handleDragEnd(event) {
  const data = builderStore.getData();
  const oldIndex = data.schema.root.indexOf(event.active.id);
  const newIndex = data.schema.root.indexOf(event.over.id);
  data.schema.root.splice(oldIndex, 1);
  data.schema.root.splice(newIndex, 0, event.active.id); // Direct mutation!
}
```

**Correct (using dnd-kit with builder store immutably):**

```typescript
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useBuilderStoreData } from "@coltorapps/builder-react";

function BuilderCanvas({ builderStore }) {
  const data = useBuilderStoreData(builderStore);

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = data.schema.root.indexOf(active.id);
    const newIndex = data.schema.root.indexOf(over.id);
    const newRoot = arrayMove(data.schema.root, oldIndex, newIndex);

    builderStore.setData({
      ...builderStore.getData(),
      schema: {
        ...builderStore.getData().schema,
        root: newRoot,
      },
    });
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={data.schema.root}
        strategy={verticalListSortingStrategy}
      >
        <BuilderEntities
          builderStore={builderStore}
          components={componentMap}
        />
      </SortableContext>
    </DndContext>
  );
}
```
