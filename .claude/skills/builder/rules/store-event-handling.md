---
title: Subscribe to Store Events for Reactive Updates
impact: HIGH
impactDescription: enables reactive UI updates and side effects
tags: store, events, subscribe, reactive
---

## Subscribe to Store Events for Reactive Updates

React to store changes by subscribing to granular events rather than polling or using timers. The builder store emits events such as `onEntityAdded`, `onEntityUpdated`, `onEntityAttributeUpdated`, `onEntityDeleted`, `onEntityCloned`, `onRootUpdated`, `onEntityAttributeErrorUpdated`, `onSchemaErrorUpdated`, `onSchemaUpdated`, and `onDataSet`. In React components, pass event callbacks through the `events` option of `useBuilderStore`. Outside React, call the store's `subscribe` method and remember to invoke the returned unsubscribe function when you no longer need the subscription.

**Incorrect (polling the store with intervals):**

```typescript
function App() {
  const builderStore = useBuilderStore(formBuilder);

  // Polling is wasteful and introduces unnecessary latency between actual changes and UI updates.
  useEffect(() => {
    const interval = setInterval(() => {
      const data = builderStore.getData();
      console.log("Checking for changes...", data);
    }, 1000);
    return () => clearInterval(interval);
  }, [builderStore]);

  return <div>...</div>;
}
```

**Correct (declarative event subscription via useBuilderStore):**

```typescript
import { useBuilderStore } from "@coltorapps/builder-react";

function App() {
  const builderStore = useBuilderStore(formBuilder, {
    events: {
      onEntityAdded(event) {
        console.log("New entity:", event.payload.entity);
      },
      onEntityDeleted(event) {
        console.log("Deleted:", event.payload.entity.id);
      },
      onEntityAttributeUpdated(event) {
        console.log("Attribute changed:", event.payload);
      },
    },
  });

  return <div>...</div>;
}

// Outside React, use subscribe and clean up with the returned unsubscribe function.
const builderStore = createBuilderStore(formBuilder);

const unsubscribe = builderStore.subscribe("onEntityAdded", (event) => {
  console.log("New entity:", event.payload.entity);
});

// Call when the subscription is no longer needed.
unsubscribe();
```
