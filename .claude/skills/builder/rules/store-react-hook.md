---
title: Use useBuilderStore Hook in React Components
impact: HIGH
impactDescription: ensures proper React lifecycle integration
tags: store, useBuilderStore, react, hook
---

## Use useBuilderStore Hook in React Components

In React components, always use the `useBuilderStore` hook from `@coltorapps/builder-react` instead of the standalone `createBuilderStore` function. The hook manages the store instance across React's lifecycle, ensuring a single stable store is created and preserved across re-renders. Using `createBuilderStore` directly inside a component body creates a brand-new store on every render, discarding all accumulated state and causing infinite update loops.

**Incorrect (creates a new store on every render):**

```typescript
import { createBuilderStore } from "@coltorapps/builder";

function App() {
  // createBuilderStore is called on every render, producing a fresh store each time.
  // All entities, attribute values, and event subscriptions are lost after each render cycle.
  const builderStore = createBuilderStore(formBuilder);
  return <div>...</div>;
}
```

**Correct (stable store tied to React lifecycle):**

```typescript
import { useBuilderStore } from "@coltorapps/builder-react";

function App() {
  // useBuilderStore creates the store once and returns the same instance on subsequent renders.
  // It also properly cleans up subscriptions when the component unmounts.
  const builderStore = useBuilderStore(formBuilder);
  return <div>...</div>;
}
```
