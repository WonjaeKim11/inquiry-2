---
title: Understand Attribute Value Transform Timing
impact: CRITICAL
impactDescription: Misunderstanding transform timing causes silent data mismatches between the builder store preview and final validated output
tags: attribute, transform, validation, timing, validateSchema, builder-store
---

## Understand Attribute Value Transform Timing

Zod's `.transform()` chains inside an attribute's `validate` method only produce transformed values when the schema is validated through the standalone `validateSchema()` function. The builder store's live validation (used for real-time UI feedback) does **not** apply transforms -- it only checks whether the value passes the base schema. Relying on transforms for the builder store's live preview will result in the UI displaying the raw, untransformed value while the developer expects the transformed one.

**Incorrect (relying on transform for live builder preview):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    // .transform() will NOT run during builder store live validation.
    // The builder preview will show the raw value, not the trimmed one.
    return z
      .string()
      .min(1)
      .transform((val) => val.trim().toLowerCase())
      .parse(value);
  },
});

// Developer expects the builder store to show "hello" for input "  Hello  ",
// but the store displays "  Hello  " as-is during editing.
```

**Correct (understanding when transforms apply):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { validateSchema } from "@coltorapps/builder";
import { z } from "zod";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    // Base validation runs in both the builder store AND validateSchema().
    // Transforms only run during validateSchema() calls.
    return z
      .string()
      .min(1)
      .transform((val) => val.trim().toLowerCase())
      .parse(value);
  },
});

// During builder store editing: raw value is used for preview, only base
// validation (string, min length 1) is checked for error display.
//
// During final submission via validateSchema(builder, schema):
// transforms run, so the output contains the trimmed, lowercased value.
```

If you need the transformed value to appear in the builder store preview in real time, perform the transformation explicitly before `.parse()` rather than inside a Zod `.transform()` chain. Reserve `.transform()` for final output normalization that should only happen at submission time through `validateSchema()`.
