---
title: Set Up Interpreter Store with useInterpreterStore
impact: MEDIUM-HIGH
impactDescription: correct store initialization for form filling
tags: interpreter, useInterpreterStore, setup, form
---

## Set Up Interpreter Store with useInterpreterStore

The interpreter store drives form filling and rendering. In React, always use the `useInterpreterStore` hook to create the store. The standalone `createInterpreterStore` function is intended for non-React contexts; calling it directly inside a component body creates a brand-new store on every render, causing lost state and infinite loops.

**Incorrect (creating a new store every render):**

```typescript
import { createInterpreterStore } from "@coltorapps/builder";

function FormRenderer({ schema }) {
  // New store instance on every render - all user input is lost!
  const store = createInterpreterStore(formBuilder, schema);
  return <div>...</div>;
}
```

**Correct (using the React hook with event handlers):**

```typescript
import { useInterpreterStore, InterpreterEntities } from "@coltorapps/builder-react";

function FormRenderer({ schema }) {
  const interpreterStore = useInterpreterStore(formBuilder, schema, {
    events: {
      onEntityValueUpdated(event) {
        console.log("Value changed:", event.payload.entityId, event.payload.value);
      },
    },
  });

  return <InterpreterEntities interpreterStore={interpreterStore} components={{ ... }} />;
}
```
