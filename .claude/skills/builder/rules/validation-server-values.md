---
title: Always Validate Entity Values on the Server
impact: MEDIUM
impactDescription: prevents invalid form data from being persisted
tags: validation, server, validateEntitiesValues, security
---

## Always Validate Entity Values on the Server

Never trust client form values. Always call `validateEntitiesValues` on the server before persisting submitted form data. This function validates the values against the builder definition and the schema, ensuring all entity values conform to their attribute validators.

**Incorrect (what's wrong):**

```typescript
// Saving values without server validation
async function submitForm(values: unknown, schemaId: string) {
  await db.submissions.create({ data: { values, schemaId } }); // Unsafe!
}
```

**Correct (what's right):**

```typescript
// Validate before saving
import { validateEntitiesValues } from "@coltorapps/builder";
import { formBuilder } from "./form-builder";

async function submitForm(values: unknown, schemaId: string) {
  const schema = await db.schemas.findUnique({ where: { id: schemaId } });

  const result = validateEntitiesValues(values, formBuilder, schema);

  if (!result.success) {
    return { errors: result.entitiesErrors };
  }

  // result.data contains validated values ready for storage
  await db.submissions.create({ data: { values: result.data, schemaId } });
  return { success: true };
}
```
