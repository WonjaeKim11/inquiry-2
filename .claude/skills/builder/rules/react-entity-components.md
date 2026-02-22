---
title: Use createEntityComponent for Type-Safe Entity Rendering
impact: MEDIUM
impactDescription: provides type-safe entity props and proper context
tags: react, createEntityComponent, entity, type-safety
---

## Use createEntityComponent for Type-Safe Entity Rendering

Always use `createEntityComponent` from `@coltorapps/builder-react` when defining entity components for the builder. This helper automatically infers the correct TypeScript types for `entity`, `entityId`, and `children` props based on the entity definition, eliminating manual typing errors and ensuring the component receives proper builder context.

**Incorrect (manually typed, error-prone):**

```typescript
// Manually typing entity components loses type safety and context integration.
function TextFieldBuilder({ entity, entityId }: { entity: any; entityId: string }) {
  return <div>{entity.attributes.label}</div>;
}
```

**Correct (type-safe with createEntityComponent):**

```typescript
import { createEntityComponent } from "@coltorapps/builder-react";
import { textFieldEntity } from "./text-field-entity";

const TextFieldBuilder = createEntityComponent(textFieldEntity, ({ entity, entityId, children }) => {
  return (
    <div>
      <label>{entity.attributes.label}</label>
      <input placeholder={entity.attributes.placeholder} />
      {children}
    </div>
  );
});
```
