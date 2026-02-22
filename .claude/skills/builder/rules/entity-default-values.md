---
title: Ensure defaultValue Type Matches Attribute Validation
impact: CRITICAL
impactDescription: A type-mismatched defaultValue will fail Zod validation at runtime when the entity is instantiated, causing immediate crashes or corrupted form state
tags: entity, defaultValue, zod, type-safety, validation, attributes
---

## Ensure defaultValue Type Matches Attribute Validation

Every `defaultValue` set on an entity must produce a value that passes the corresponding attribute's Zod validation schema. Because default values are run through the same validation pipeline as user-provided values, a type mismatch (e.g., providing a string `"yes"` for a `z.boolean()` attribute) will throw a Zod parse error at entity instantiation time. Always verify that the TypeScript type of each default value aligns with the Zod schema's output type.

**Incorrect (defaultValue type does not match Zod schema):**

```typescript
import { createAttribute, createEntity } from "@coltorapps/builder";
import { z } from "zod";

const requiredAttribute = createAttribute({
  name: "required",
  validate(value) {
    return z.boolean().parse(value);
  },
});

const maxLengthAttribute = createAttribute({
  name: "maxLength",
  validate(value) {
    return z.number().min(1).parse(value);
  },
});

// BAD: "yes" is a string, but z.boolean() expects a boolean -- runtime crash
// BAD: "100" is a string, but z.number() expects a number -- runtime crash
export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [requiredAttribute, maxLengthAttribute],
  defaultValue: {
    required: "yes",
    maxLength: "100",
  },
});
```

**Correct (defaultValue types match Zod schema output types):**

```typescript
import { createAttribute, createEntity } from "@coltorapps/builder";
import { z } from "zod";

const requiredAttribute = createAttribute({
  name: "required",
  validate(value) {
    return z.boolean().parse(value);
  },
});

const maxLengthAttribute = createAttribute({
  name: "maxLength",
  validate(value) {
    return z.number().min(1).parse(value);
  },
});

// GOOD: false is a boolean, matching z.boolean() output
// GOOD: 100 is a number, matching z.number() output
export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [requiredAttribute, maxLengthAttribute],
  defaultValue: {
    required: false,
    maxLength: 100,
  },
});
```
