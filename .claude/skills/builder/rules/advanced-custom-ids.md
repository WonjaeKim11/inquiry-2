---
title: Customize Entity ID Generation and Validation
impact: LOW-MEDIUM
impactDescription: enables custom ID formats for database compatibility
tags: custom-ids, generateEntityId, validateEntityId, UUID, CUID
---

## Customize Entity ID Generation and Validation

By default, the builder generates UUID v4 identifiers for entities. When your database or system requires a different ID format (e.g., CUID, nanoid), configure `generateEntityId` and `validateEntityId` directly in the builder definition. This ensures all entity creation and schema loading use consistent, validated IDs.

**Incorrect (post-processing entity IDs after schema creation):**

```typescript
const builderStore = useBuilderStore(formBuilder);
// Manually replacing all UUIDs with CUIDs... fragile and error-prone
```

**Correct (configuring generateEntityId and validateEntityId at builder level):**

```typescript
import { createBuilder } from "@coltorapps/builder";
import { createId, isCuid } from "@paralleldrive/cuid2";

export const formBuilder = createBuilder({
  entities: [textFieldEntity, selectFieldEntity],
  generateEntityId() {
    return createId(); // Generate CUID instead of UUID
  },
  validateEntityId(id) {
    if (!isCuid(id)) {
      throw new Error(`Invalid entity ID format: ${id}`);
    }
  },
});

// Now all entities created by addEntity() will use CUIDs
// And schema loading will validate that all IDs are valid CUIDs
```
