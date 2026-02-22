---
title: Compose Entities from Atomic Attributes
impact: CRITICAL
impactDescription: Inline validation or monolithic entity definitions break reusability, make testing harder, and lead to duplicated logic across entities
tags: entity, attribute, composition, reusability, separation-of-concerns
---

## Compose Entities from Atomic Attributes

Entities must be composed from pre-defined, reusable attribute arrays rather than embedding validation logic directly inside the entity definition. Each attribute should be a standalone unit created with `createAttribute`, and entities should import and assemble them declaratively. This ensures attributes can be shared across multiple entities, tested independently, and maintained in a single location.

**Incorrect (inline validation or monolithic definition):**

```typescript
import { createEntity } from "@coltorapps/builder";
import { z } from "zod";

// BAD: Validation logic defined inline within the entity
// BAD: Attributes are not reusable across other entities
export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [
    {
      name: "label",
      validate(value: unknown) {
        return z.string().min(1).parse(value);
      },
    },
    {
      name: "required",
      validate(value: unknown) {
        return z.boolean().parse(value);
      },
    },
    {
      name: "placeholder",
      validate(value: unknown) {
        return z.string().optional().parse(value);
      },
    },
  ],
});
```

**Correct (composing from atomic attributes):**

```typescript
import { createEntity } from "@coltorapps/builder";
import { labelAttribute } from "./attributes/label";
import { requiredAttribute } from "./attributes/required";
import { placeholderAttribute } from "./attributes/placeholder";

// GOOD: Each attribute is defined once and reused across entities
// GOOD: Entity is a clean composition of atomic, testable attributes
export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [labelAttribute, requiredAttribute, placeholderAttribute],
});

// The same attributes can be reused in other entities
export const textAreaEntity = createEntity({
  name: "textArea",
  attributes: [labelAttribute, requiredAttribute, placeholderAttribute],
});
```
