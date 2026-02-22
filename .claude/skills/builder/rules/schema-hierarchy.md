---
title: Design Parent-Child Hierarchies Correctly
impact: HIGH
impactDescription: prevents orphaned entities and circular references
tags: schema, hierarchy, parent, children, relationships
---

## Design Parent-Child Hierarchies Correctly

Parent-child relationships in a schema must be bidirectionally consistent. If an entity sets `parentId` to another entity's ID, that parent entity's `children` array must include the child's ID. Failing to maintain this consistency leads to orphaned entities, broken tree traversals, and validation errors. Additionally, never create circular references where an entity is both an ancestor and a descendant of another entity.

**Incorrect (inconsistent parent-child references):**

```typescript
// Wrong: field-1 references section-1 as parent, but section-1 has no children array
const schema = {
  entities: {
    "section-1": {
      type: "section",
      attributes: { label: "Section" },
      // Missing children: ["field-1"]
    },
    "field-1": {
      type: "textField",
      attributes: { label: "Name" },
      parentId: "section-1", // parent set but section doesn't list this as child
    },
  },
  root: ["section-1"],
};

// Wrong: circular reference — entity-a is parent of entity-b and vice versa
const schema = {
  entities: {
    "entity-a": {
      type: "section",
      attributes: { label: "A" },
      parentId: "entity-b",
      children: ["entity-b"],
    },
    "entity-b": {
      type: "section",
      attributes: { label: "B" },
      parentId: "entity-a",
      children: ["entity-a"],
    },
  },
  root: [],
};
```

**Correct (consistent bidirectional references):**

```typescript
const schema = {
  entities: {
    "section-1": {
      type: "section",
      attributes: { label: "Section" },
      children: ["field-1", "field-2"],
    },
    "field-1": {
      type: "textField",
      attributes: { label: "Name" },
      parentId: "section-1",
    },
    "field-2": {
      type: "textField",
      attributes: { label: "Email" },
      parentId: "section-1",
    },
  },
  root: ["section-1"],
};
```
