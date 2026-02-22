---
title: Understand initialEntitiesValuesWithDefaults Behavior
impact: MEDIUM-HIGH
impactDescription: controls initial form state correctly
tags: interpreter, defaults, initialEntitiesValuesWithDefaults, initialization
---

## Understand initialEntitiesValuesWithDefaults Behavior

By default the interpreter store auto-populates every entity's value from its `defaultValue` definition in the schema. This is convenient for most cases, but sometimes you need an empty form (e.g., a "create new" flow) or you want to load previously saved values (e.g., an "edit" flow). The `initialEntitiesValuesWithDefaults` option and `initialData` option control this behavior.

**Incorrect (manually setting defaults after store creation):**

```typescript
const interpreterStore = useInterpreterStore(formBuilder, schema);

// Redundant -- the store already auto-populated defaults above
useEffect(() => {
  schema.entities.forEach((entity) => {
    if (entity.defaultValue !== undefined) {
      interpreterStore.setEntityValue(entity.id, entity.defaultValue);
    }
  });
}, []);
```

**Correct (controlling default value behavior via options):**

```typescript
// Default behavior: auto-populates from entity defaultValue definitions
const interpreterStore = useInterpreterStore(formBuilder, schema);
// All entities with defaultValue will have their values pre-filled

// When you want an empty form (e.g., for "new" mode):
const interpreterStore = useInterpreterStore(formBuilder, schema, {
  initialEntitiesValuesWithDefaults: false,
});

// When loading saved values (e.g., for "edit" mode):
const interpreterStore = useInterpreterStore(formBuilder, schema, {
  initialData: {
    entitiesValues: savedValuesFromDatabase,
  },
});
```
