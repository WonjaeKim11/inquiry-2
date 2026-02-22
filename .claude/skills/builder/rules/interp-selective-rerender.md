---
title: Optimize Renders with useInterpreterStoreData shouldUpdate
impact: MEDIUM-HIGH
impactDescription: prevents unnecessary re-renders in form filling
tags: interpreter, useInterpreterStoreData, shouldUpdate, performance
---

## Optimize Renders with useInterpreterStoreData shouldUpdate

Components that read interpreter store data re-render whenever the store changes. For components that only care about a subset of events (e.g., value changes but not error changes), use the `shouldUpdate` callback in `useInterpreterStoreData` to filter which events trigger a re-render. Without this, summary panels, debug views, and derived-value components re-render on every keystroke and every validation event alike.

**Incorrect (not reactive, or reactive to everything):**

```typescript
// Not reactive at all -- getData() returns a snapshot, component never updates
function FormSummary({ interpreterStore }) {
  const data = interpreterStore.getData();
  return <pre>{JSON.stringify(data.entitiesValues)}</pre>;
}
```

**Correct (selectively subscribing to value-change events only):**

```typescript
import { useInterpreterStoreData } from "@coltorapps/builder-react";

function FormSummary({ interpreterStore }) {
  const data = useInterpreterStoreData(interpreterStore, {
    shouldUpdate: (events) =>
      events.some((event) => event.name === "EntityValueUpdated"),
  });

  return <pre>{JSON.stringify(data.entitiesValues)}</pre>;
}
```
