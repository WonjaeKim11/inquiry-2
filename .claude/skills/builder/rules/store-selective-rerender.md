---
title: Optimize Renders with useBuilderStoreData shouldUpdate
impact: HIGH
impactDescription: prevents unnecessary re-renders in large forms
tags: store, useBuilderStoreData, shouldUpdate, performance, optimization
---

## Optimize Renders with useBuilderStoreData shouldUpdate

Use the `useBuilderStoreData` hook with a `shouldUpdate` predicate to subscribe to store data selectively. Without `shouldUpdate`, every store mutation triggers a re-render of the subscribing component, even if the change is irrelevant to what that component displays. In large form builders with dozens or hundreds of entities, this leads to severe frame drops and input lag. The `shouldUpdate` function receives the list of events that occurred since the last render and should return `true` only when the component genuinely needs to update.

**Incorrect (re-renders on every store change):**

```typescript
// Calling getData() inline means the component never subscribes to updates at all,
// so it renders stale data. Wrapping it in useEffect + setState re-renders on
// every change, which is equally problematic for performance.
function EntityCount({ builderStore }) {
  const data = builderStore.getData();
  return <span>{Object.keys(data.schema.entities).length} fields</span>;
}
```

**Correct (re-renders only when the entity count actually changes):**

```typescript
import { useBuilderStoreData } from "@coltorapps/builder-react";

function EntityCount({ builderStore }) {
  // shouldUpdate filters the event stream so the component re-renders only
  // when entities are added or deleted, not on every attribute change.
  const data = useBuilderStoreData(builderStore, {
    shouldUpdate: (events) =>
      events.some(
        (event) =>
          event.name === "EntityAdded" || event.name === "EntityDeleted"
      ),
  });

  return <span>{Object.keys(data.schema.entities).length} fields</span>;
}
```
