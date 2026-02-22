---
title: Always Validate Schema on the Server
impact: MEDIUM
impactDescription: prevents invalid schemas from being persisted
tags: validation, server, validateSchema, security
---

## Always Validate Schema on the Server

Never trust client-side schema validation alone. Always call `validateSchema` on the server before persisting a schema to the database. This function is async because it validates the schema structure, attribute values, runs transforms, and executes any custom `validateSchema` logic defined in the builder.

**Incorrect (what's wrong):**

```typescript
// Saving schema without server validation
async function saveSchema(schema: unknown) {
  await db.schemas.create({ data: { schema } }); // Unsafe!
}
```

**Correct (what's right):**

```typescript
// Validate before saving
import { validateSchema } from "@coltorapps/builder";
import { formBuilder } from "./form-builder";

async function saveSchema(schema: unknown) {
  const result = await validateSchema(formBuilder, schema);

  if (!result.success) {
    return {
      errors: {
        entitiesAttributesErrors: result.entitiesAttributesErrors,
        schemaError: result.schemaError,
      },
    };
  }

  // result.data contains the validated (and possibly transformed) schema
  await db.schemas.create({ data: { schema: result.data } });
  return { success: true };
}
```
