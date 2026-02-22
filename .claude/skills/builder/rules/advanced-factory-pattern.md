---
title: Use Factory Pattern for Environment-Specific Builders
impact: LOW-MEDIUM
impactDescription: enables multi-tenant and environment-specific builder configurations
tags: factory, pattern, multi-tenant, environment, builder
---

## Use Factory Pattern for Environment-Specific Builders

When you need different entity sets or validation rules per environment or tenant, use a factory function that returns fully configured builder instances. The `createBuilder` API does not support adding entities after construction, so conditional entity registration must happen at creation time through a factory.

**Incorrect (creating a single global builder and conditionally adding entities at runtime):**

```typescript
// runtime conditional entity registration
const formBuilder = createBuilder({
  entities: [textFieldEntity],
});
// Trying to add entities later... not supported!
```

**Correct (using a factory function that returns configured builders):**

```typescript
import { createBuilder } from "@coltorapps/builder";
import { textFieldEntity } from "./entities/text-field";
import { selectFieldEntity } from "./entities/select-field";
import { fileUploadEntity } from "./entities/file-upload";

function createFormBuilder(options: { enableFileUpload: boolean }) {
  const entities = [textFieldEntity, selectFieldEntity];

  if (options.enableFileUpload) {
    entities.push(fileUploadEntity);
  }

  return createBuilder({
    entities,
    validateSchema(schema) {
      if (Object.keys(schema.entities).length === 0) {
        throw new Error("At least one field is required");
      }
      return schema;
    },
  });
}

// Usage per environment
export const basicFormBuilder = createFormBuilder({ enableFileUpload: false });
export const proFormBuilder = createFormBuilder({ enableFileUpload: true });
```
