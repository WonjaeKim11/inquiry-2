---
title: Define Parent-Child Relationship Constraints
impact: CRITICAL
impactDescription: Without explicit relationship constraints, entities can be nested arbitrarily, leading to invalid form structures and runtime errors during schema validation
tags: entity, parent-child, constraints, hierarchy, builder-config, entitiesExtensions
---

## Define Parent-Child Relationship Constraints

Every entity's parent-child relationships must be explicitly constrained using `parentRequired` and `childrenAllowed` in the builder's `entitiesExtensions` configuration. Leaving these unconstrained allows users to create structurally invalid schemas where entities appear in places they should never exist (e.g., a text field nested inside another text field, or a section floating without a parent).

**Incorrect (no relationship constraints):**

```typescript
import { createBuilder } from "@coltorapps/builder";
import { sectionEntity } from "./entities/section";
import { textFieldEntity } from "./entities/text-field";
import { selectFieldEntity } from "./entities/select-field";

// BAD: No relationship constraints defined
// BAD: Any entity can be placed anywhere in the hierarchy
export const formBuilder = createBuilder({
  entities: [sectionEntity, textFieldEntity, selectFieldEntity],
});
```

**Correct (explicit parent-child constraints via entitiesExtensions):**

```typescript
import { createBuilder } from "@coltorapps/builder";
import { sectionEntity } from "./entities/section";
import { textFieldEntity } from "./entities/text-field";
import { selectFieldEntity } from "./entities/select-field";

// GOOD: Every entity has explicit relationship rules
// GOOD: The builder enforces structural validity at the schema level
export const formBuilder = createBuilder({
  entities: [sectionEntity, textFieldEntity, selectFieldEntity],
  entitiesExtensions: {
    textField: {
      parentRequired: true,
      allowedParents: ["section"],
    },
    selectField: {
      parentRequired: true,
      allowedParents: ["section"],
    },
    section: {
      childrenAllowed: ["textField", "selectField"],
    },
  },
});
```
