---
title: Use attributesExtensions for Cross-Entity Validation
impact: CRITICAL
impactDescription: Cross-entity validation inside an attribute's own validate method lacks schema context, resulting in incomplete checks and silent data integrity violations
tags: entity, attributesExtensions, cross-entity, validation, builder-config, entitiesExtensions
---

## Use attributesExtensions for Cross-Entity Validation

When an attribute's validation depends on values from other entities in the schema (e.g., ensuring label uniqueness across all fields), the validation must be defined in the builder's `entitiesExtensions.attributes` configuration rather than inside the attribute's own `validate` method. The builder-level extension receives a `context` object that includes the full schema and the current entity reference, enabling cross-entity checks that are impossible at the individual attribute level.

**Incorrect (cross-entity validation inside the attribute's own validate):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

// BAD: The attribute's validate method has no access to the full schema
// BAD: Cannot check other entities' attribute values from here
const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    const parsed = z.string().min(1).parse(value);

    // This is impossible -- there is no schema or entity context here
    // const allLabels = schema.entities...
    // if (allLabels.includes(parsed)) { throw new Error("Duplicate"); }

    return parsed;
  },
});
```

**Correct (using entitiesExtensions.attributes in builder config):**

```typescript
import { createBuilder } from "@coltorapps/builder";
import { textFieldEntity } from "./entities/text-field";

// GOOD: Cross-entity validation is defined at the builder level
// GOOD: context.schema provides access to all entities for comparison
export const formBuilder = createBuilder({
  entities: [textFieldEntity],
  entitiesExtensions: {
    textField: {
      attributes: {
        label: {
          validate(value, context) {
            // First, run the attribute's own validation via context.validate
            const validatedValue = context.validate(value);

            // Access the full schema for cross-entity checks
            const allLabels = Object.values(context.schema.entities)
              .filter((e) => e.id !== context.entity.id)
              .map((e) => e.attributes.label);

            if (allLabels.includes(validatedValue)) {
              throw new Error("Label must be unique across all fields");
            }

            return validatedValue;
          },
        },
      },
    },
  },
});
```
