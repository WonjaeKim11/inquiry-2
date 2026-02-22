---
title: Use Zod Schemas for Attribute Validation
impact: CRITICAL
impactDescription: Without Zod, attribute types are not inferred and validation is inconsistent across the builder
tags: attribute, zod, validation, type-inference, schema
---

## Use Zod Schemas for Attribute Validation

Every attribute's `validate` method must use a Zod schema to parse and validate incoming values. Zod provides automatic TypeScript type inference from the schema, ensuring that the return type of `validate` is always correctly typed without manual annotation. Manual type checks bypass the builder's type-safety guarantees and produce inconsistent error formats.

**Incorrect (manual type checks without Zod):**

```typescript
import { createAttribute } from "@coltorapps/builder";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    // Manual type checking loses automatic type inference
    // and produces inconsistent error shapes.
    if (typeof value !== "string") {
      throw new Error("Label must be a string");
    }
    if (value.length < 1) {
      throw new Error("Label is required");
    }
    return value;
  },
});
```

**Correct (Zod schema for automatic type inference):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    // Zod parses, validates, and infers the return type automatically.
    // Errors are always ZodError instances with a structured .issues array.
    return z.string().min(1).parse(value);
  },
});
```

Zod's `.parse()` both validates and returns the typed value in a single call. The builder's generic type parameters automatically pick up the return type, so downstream consumers (entity definitions, builder store, UI components) all benefit from correct types without any manual `as` casts or type annotations.
