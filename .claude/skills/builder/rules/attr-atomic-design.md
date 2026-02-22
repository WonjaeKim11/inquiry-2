---
title: Design Attributes as Atomic Reusable Units
impact: CRITICAL
impactDescription: Monolithic attributes cannot be reused across entities and violate the composable architecture of the builder
tags: attribute, atomic, composition, reusability, single-responsibility
---

## Design Attributes as Atomic Reusable Units

Each attribute must represent exactly one property or concern (e.g., "label", "required", "placeholder"). Attributes are the smallest composable unit in the builder -- entities are assembled by combining multiple attributes. A single attribute that bundles several concerns cannot be selectively reused, makes validation logic harder to maintain, and breaks the builder's entity-attribute composition model.

**Incorrect (one attribute handling multiple concerns):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

// Bundling label, placeholder, and required into one attribute
// makes it impossible to reuse "required" alone in another entity.
export const fieldPropsAttribute = createAttribute({
  name: "fieldProps",
  validate(value) {
    return z
      .object({
        label: z.string().min(1),
        placeholder: z.string().optional(),
        required: z.boolean(),
      })
      .parse(value);
  },
});
```

**Correct (separate single-concern attributes):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    return z.string().min(1).parse(value);
  },
});

export const requiredAttribute = createAttribute({
  name: "required",
  validate(value) {
    return z.boolean().parse(value);
  },
});

export const placeholderAttribute = createAttribute({
  name: "placeholder",
  validate(value) {
    return z.string().optional().parse(value);
  },
});
```

With atomic attributes, an entity definition selects only the attributes it needs. A "textField" entity might use all three, while a "checkbox" entity might use only `labelAttribute` and `requiredAttribute`, omitting `placeholderAttribute`. This selective composition is only possible when each attribute is a standalone unit.
