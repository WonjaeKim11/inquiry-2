---
title: Use Correct Schema Structure with entities and root
impact: HIGH
impactDescription: ensures schema integrity and correct entity resolution
tags: schema, structure, entities, root
---

## Use Correct Schema Structure with entities and root

A schema must be a flat map of entity instances keyed by their IDs, paired with a `root` array that lists the IDs of all top-level entities (those with no parent). Never nest entities inside other entities or use arrays as the primary container. The flat structure enables O(1) lookups by ID and keeps parent-child relationships explicit through `parentId` and `children` references.

**Incorrect (nested or non-flat structures):**

```typescript
// Wrong: nesting entities inside parent objects
const schema = {
  sections: [
    {
      type: "section",
      label: "Contact",
      fields: [
        { type: "textField", label: "Email" },
        { type: "textField", label: "Phone" },
      ],
    },
  ],
};

// Wrong: using an array instead of a keyed map
const schema = {
  entities: [
    { id: "entity-1", type: "textField", attributes: { label: "Name" } },
    { id: "entity-2", type: "textField", attributes: { label: "Email" } },
  ],
};
```

**Correct (flat entities map with root array):**

```typescript
const schema = {
  entities: {
    "entity-1": {
      type: "textField",
      attributes: { label: "First Name", required: true },
      parentId: null,
    },
    "entity-2": {
      type: "textField",
      attributes: { label: "Last Name", required: true },
      parentId: null,
    },
    "entity-3": {
      type: "section",
      attributes: { label: "Contact Info" },
      parentId: null,
      children: ["entity-4"],
    },
    "entity-4": {
      type: "textField",
      attributes: { label: "Email" },
      parentId: "entity-3",
    },
  },
  root: ["entity-1", "entity-2", "entity-3"],
};
```
