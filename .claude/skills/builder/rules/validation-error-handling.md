---
title: Handle Validation Results as Discriminated Unions
impact: MEDIUM
impactDescription: type-safe error handling prevents runtime errors
tags: validation, error-handling, discriminated-union, type-safety
---

## Handle Validation Results as Discriminated Unions

Both `validateSchema` and `validateEntitiesValues` return discriminated union results: `{ success: true, data }` or `{ success: false, ...errors }`. Always check `result.success` before accessing `result.data` or error fields. This ensures TypeScript can narrow the type correctly and prevents runtime errors from accessing undefined properties.

**Incorrect (what's wrong):**

```typescript
// Accessing data without checking success
const result = await validateSchema(formBuilder, schema);
await db.schemas.create({ data: { schema: result.data } }); // May be undefined!
```

**Correct (what's right):**

```typescript
// Discriminated union pattern
const result = await validateSchema(formBuilder, schema);

if (result.success) {
  // TypeScript knows result.data exists here
  await db.schemas.create({ data: { schema: result.data } });
} else {
  // TypeScript knows error fields exist here
  console.error("Attribute errors:", result.entitiesAttributesErrors);
  console.error("Schema error:", result.schemaError);
}
```
