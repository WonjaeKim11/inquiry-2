---
title: Use Store Methods for Entity CRUD Operations
impact: HIGH
impactDescription: maintains schema consistency through store API
tags: store, addEntity, deleteEntity, cloneEntity, CRUD
---

## Use Store Methods for Entity CRUD Operations

Always modify entities through the store's dedicated methods: `addEntity()`, `deleteEntity()`, `cloneEntity()`, and `setEntityAttributeValue()`. These methods enforce validation, emit the correct events, and keep internal indexes consistent. Directly mutating the schema object obtained from `getData()` bypasses all of these safeguards, leading to silent data corruption, missed event notifications, and broken undo/redo or persistence workflows.

**Incorrect (directly mutating the schema object):**

```typescript
// Never reach into the store's data and mutate it by hand.
const data = builderStore.getData();
data.schema.entities["new-id"] = { type: "textField", attributes: { label: "Hack" } };
// The store has no idea this happened: no events fire, no validation runs,
// and dependent UI stays stale.
```

**Correct (using store methods):**

```typescript
// Add a new entity. The store assigns an ID, validates the type,
// and emits onEntityAdded.
builderStore.addEntity({
  type: "textField",
  attributes: { label: "New Field", required: false },
  parentId: "section-1", // optional, for nested structures
});

// Remove an entity and all its children. Emits onEntityDeleted.
builderStore.deleteEntity("entity-to-remove");

// Duplicate an entity with a new unique ID. Emits onEntityCloned.
builderStore.cloneEntity("entity-to-clone");

// Update a single attribute value. Emits onEntityAttributeUpdated.
builderStore.setEntityAttributeValue("entity-1", "label", "Updated Label");
```
