---
title: Use createAttributeComponent for Type-Safe Attribute Editing
impact: MEDIUM
impactDescription: provides type-safe attribute editing with proper context
tags: react, createAttributeComponent, attribute, type-safety
---

## Use createAttributeComponent for Type-Safe Attribute Editing

Always use `createAttributeComponent` from `@coltorapps/builder-react` when building attribute editor components. This helper provides type-safe access to the `attribute` object (including `value` and `setValue`), the parent `entity`, and the `entityId`, removing the need to manually reach into the builder store for attribute data.

**Incorrect (no type safety for attribute value):**

```typescript
// Manually accessing store data bypasses type safety and couples the component to store internals.
function LabelEditor({ entityId, builderStore }: any) {
  const value = builderStore.getData().schema.entities[entityId]?.attributes?.label;
  return (
    <input
      value={value || ""}
      onChange={(e) => builderStore.setEntityAttributeValue(entityId, "label", e.target.value)}
    />
  );
}
```

**Correct (using createAttributeComponent):**

```typescript
import { createAttributeComponent } from "@coltorapps/builder-react";
import { labelAttribute } from "./attributes/label";

const LabelEditor = createAttributeComponent(labelAttribute, ({ attribute, entity, entityId }) => {
  return (
    <input
      value={attribute.value ?? ""}
      onChange={(e) => attribute.setValue(e.target.value)}
    />
  );
});
```
