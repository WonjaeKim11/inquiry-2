---
title: Use shouldBeProcessed for Dynamic Visibility
impact: CRITICAL
impactDescription: Manual entity filtering bypasses the builder's validation pipeline, causing orphaned children, inconsistent state, and missed validation errors
tags: entity, shouldBeProcessed, conditional, visibility, dynamic, validation
---

## Use shouldBeProcessed for Dynamic Visibility

The `shouldBeProcessed` function on an entity definition controls whether that entity and all of its children are included in the validation and processing pipeline. When `shouldBeProcessed` returns `false`, the entity is completely skipped -- no attribute validation runs and no child entities are processed. Always use this mechanism instead of manually filtering entities or relying on external state management to hide or show fields.

**Incorrect (manual filtering or external state for visibility):**

```typescript
import { createEntity } from "@coltorapps/builder";
import { labelAttribute } from "./attributes/label";

// BAD: No shouldBeProcessed -- visibility is handled externally
export const conditionalFieldEntity = createEntity({
  name: "conditionalField",
  attributes: [labelAttribute],
});

// BAD: Manually filtering entities outside the builder pipeline
function processForm(schema: FormSchema) {
  const visibleEntities = Object.values(schema.entities).filter((entity) => {
    if (entity.type === "conditionalField") {
      const parent = schema.entities[entity.parentId];
      return parent?.attributes?.showDetails === true;
    }
    return true;
  });

  // This skips the builder's validation entirely for filtered entities
  return visibleEntities;
}
```

**Correct (using shouldBeProcessed in entity definition):**

```typescript
import { createEntity } from "@coltorapps/builder";
import { labelAttribute } from "./attributes/label";
import { visibleWhenAttribute } from "./attributes/visible-when";

// GOOD: shouldBeProcessed integrates directly with the builder's pipeline
// GOOD: When false, the entity AND its children are skipped during validation
export const conditionalFieldEntity = createEntity({
  name: "conditionalField",
  attributes: [labelAttribute, visibleWhenAttribute],
  shouldBeProcessed(entity, context) {
    // Skip processing if the parent's "showDetails" attribute is false
    const parentEntity = context.schema.entities[entity.parentId];
    return parentEntity?.attributes?.showDetails === true;
  },
});
```
