---
title: Use InterpreterEntities for Form Rendering
impact: MEDIUM
impactDescription: correct form-filling entity rendering pattern
tags: react, InterpreterEntities, form, rendering
---

## Use InterpreterEntities for Form Rendering

Use the `InterpreterEntities` component from `@coltorapps/builder-react` to render the end-user form-filling UI. Pass an `interpreterStore` and a `components` map that maps each entity type string to its interpreter component. Use the optional render props pattern (`children` as a function) to wrap entities in a `<form>` or custom layout. Never manually reconstruct the form from raw schema data.

**Incorrect (manually building form from schema):**

```typescript
// Manually building the form skips interpreter context, validation state, and value binding.
function FormRenderer({ interpreterStore }) {
  const schema = interpreterStore.getSchema();
  return (
    <form>
      {schema.root.map((id) => {
        const entity = schema.entities[id];
        if (entity.type === "textField") return <input key={id} />;
        return null;
      })}
    </form>
  );
}
```

**Correct (using InterpreterEntities with component mapping):**

```typescript
import { InterpreterEntities } from "@coltorapps/builder-react";

function FormRenderer({ interpreterStore }) {
  return (
    <InterpreterEntities
      interpreterStore={interpreterStore}
      components={{
        textField: TextFieldInterpreter,
        selectField: SelectFieldInterpreter,
      }}
    >
      {(entities) => <form className="dynamic-form">{entities}</form>}
    </InterpreterEntities>
  );
}
```
