---
title: Load Existing Schemas with initialData
impact: HIGH
impactDescription: correctly restores saved builder state
tags: store, initialData, load, restore, schema
---

## Load Existing Schemas with initialData

When restoring a previously saved builder state (e.g., from a database or API response), pass the data through the `initialData` option at store creation time. The store uses `initialData` to hydrate its internal state before the first render, so all entities, attribute errors, and schema-level errors are available immediately. Attempting to assign properties on the store instance after creation or calling undocumented setters will silently fail or throw, leaving the store empty.

**Incorrect (trying to set data after store creation):**

```typescript
const builderStore = useBuilderStore(formBuilder);

// These assignments have no effect. The store does not expose a writable
// `schema` property or a generic setter for bulk data.
builderStore.schema = savedSchema; // Won't work!
builderStore.data = savedData;     // Also won't work!
```

**Correct (using the initialData option):**

```typescript
import { useBuilderStore } from "@coltorapps/builder-react";

const builderStore = useBuilderStore(formBuilder, {
  initialData: {
    schema: savedSchemaFromDatabase,
    entitiesAttributesErrors: {},
    schemaError: null,
  },
});

// For non-React contexts, createBuilderStore accepts the same option.
import { createBuilderStore } from "@coltorapps/builder";

const store = createBuilderStore(formBuilder, {
  initialData: {
    schema: savedSchemaFromDatabase,
    entitiesAttributesErrors: {},
    schemaError: null,
  },
});
```
