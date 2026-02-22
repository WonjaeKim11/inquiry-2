---
title: Use Validation Context for Cross-Entity Awareness
impact: CRITICAL
impactDescription: Without using the validation context, attributes cannot perform cross-entity checks like uniqueness or dependency validation
tags: attribute, context, schema, entity, cross-validation, validate
---

## Use Validation Context for Cross-Entity Awareness

The `validate` method's second parameter is a context object containing `schema` (the full schema with all entities), `entity` (the current entity being validated), and `validate(value)` (a helper for running base validation). Use `context.schema` to access other entities when the attribute needs to enforce cross-entity constraints such as uniqueness or referential integrity. Never attempt to access external state or module-level variables for this purpose.

**Incorrect (accessing external state for cross-entity checks):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

// Storing schema reference in module scope is fragile and
// will not stay in sync with the builder store's current state.
let currentSchema: any = null;

export function setSchema(schema: any) {
  currentSchema = schema;
}

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    const label = z.string().min(1).parse(value);

    // This external reference may be stale or null.
    if (currentSchema) {
      const duplicate = Object.values(currentSchema.entities).some(
        (entity: any) => entity.attributes.label === label
      );
      if (duplicate) throw new Error("Duplicate label");
    }

    return label;
  },
});
```

**Correct (using the context parameter):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

export const uniqueLabelAttribute = createAttribute({
  name: "label",
  validate(value, context) {
    const label = z.string().min(1).parse(value);

    // context.schema contains the current schema snapshot with all entities.
    // context.entity is the entity currently being validated.
    const duplicateExists = Object.values(context.schema.entities).some(
      (entity) =>
        entity.id !== context.entity.id &&
        entity.attributes.label === label
    );

    if (duplicateExists) {
      throw new Error("Label must be unique across all entities");
    }

    return label;
  },
});
```

The context object is always provided by the builder at validation time and reflects the current state of the schema. This guarantees that cross-entity checks are performed against an up-to-date snapshot rather than a potentially stale external reference. Use `context.entity.id` to exclude the current entity from comparison checks to avoid false-positive self-matches.
