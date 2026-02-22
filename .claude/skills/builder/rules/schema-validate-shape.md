---
title: Use validateSchemaShape for Synchronous Structure Checks
impact: HIGH
impactDescription: fast structural validation without async overhead
tags: schema, validateSchemaShape, synchronous, structure
---

## Use validateSchemaShape for Synchronous Structure Checks

`validateSchemaShape` performs synchronous structural validation of a schema against a builder definition. It checks that entity types exist in the builder, parent-child references are consistent, and required structural constraints are met. It does NOT validate attribute values -- use the async `validateSchema` for that. Prefer `validateSchemaShape` when you only need to verify structural correctness, such as during initial load or schema import, to avoid unnecessary async overhead.

**Incorrect (using full async validation for structure-only checks):**

```typescript
import { validateSchema } from "@coltorapps/builder";

// Wrong: unnecessary async + attribute validation overhead when you only need structure checks
async function loadSchema(schemaFromDatabase: unknown) {
  const result = await validateSchema(formBuilder, schemaFromDatabase);

  if (!result.success) {
    console.error("Invalid schema:", result.error);
    return;
  }

  return result.data;
}
```

**Correct (synchronous structural validation with validateSchemaShape):**

```typescript
import { validateSchemaShape } from "@coltorapps/builder";

// Correct: synchronous structural validation — no async, no attribute value checks
function loadSchema(schemaFromDatabase: unknown) {
  const result = validateSchemaShape(formBuilder, schemaFromDatabase);

  if (!result.success) {
    console.error("Invalid schema structure:", result.error);
    return;
  }

  // result.data contains the validated schema shape
  return result.data;
}
```
