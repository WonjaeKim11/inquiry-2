---
title: Use Consistent Error Types for UI Handling
impact: CRITICAL
impactDescription: Inconsistent error shapes force UI code to handle multiple formats and cause unpredictable error displays
tags: attribute, error, zod, validation, error-handling, ui
---

## Use Consistent Error Types for UI Handling

All attribute validation errors must follow a predictable, structured format so that UI components can render error messages without format-specific branching logic. Zod's `ZodError` provides a consistent `.issues` array where each issue has `code`, `message`, and `path` properties. Stick to Zod errors as the primary error type, and when custom errors are needed, use a dedicated error class with the same predictable shape.

**Incorrect (inconsistent error formats):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    // Throwing raw strings -- the UI cannot extract structured info.
    if (typeof value !== "string") {
      throw "must be a string";
    }

    // Throwing a plain Error -- different shape from ZodError.
    if (value.length < 1) {
      throw new Error("Label is required");
    }

    // Returning an error object -- yet another format to handle.
    if (value.length > 100) {
      return { error: true, message: "Label too long" };
    }

    return value;
  },
});

// The UI now needs to check: is it a string? an Error? an object? a ZodError?
```

**Correct (Zod errors with custom messages for consistent structure):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    // Zod's .parse() throws a ZodError on failure.
    // ZodError.issues is always an array of { code, message, path }.
    return z
      .string({ required_error: "Label is required" })
      .min(1, "Label cannot be empty")
      .max(100, "Label must be 100 characters or fewer")
      .parse(value);
  },
});

// UI code can uniformly handle errors:
// try { validate(value) } catch (e) {
//   if (e instanceof ZodError) {
//     const messages = e.issues.map((i) => i.message);
//   }
// }
```

When a validation rule cannot be expressed with built-in Zod methods, use `.refine()` or `.superRefine()` to keep the error within the `ZodError` structure rather than throwing a separate error type.

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

export const slugAttribute = createAttribute({
  name: "slug",
  validate(value) {
    return z
      .string()
      .min(1, "Slug is required")
      .refine((val) => /^[a-z0-9-]+$/.test(val), {
        message: "Slug must contain only lowercase letters, numbers, and hyphens",
      })
      .parse(value);
  },
});
```

By keeping all validation errors as `ZodError` instances, UI components only need a single error-handling path, reducing rendering bugs and simplifying internationalization of error messages.
