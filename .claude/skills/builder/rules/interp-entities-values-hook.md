---
title: Use useInterpreterEntitiesValues for Reactive Value Access
impact: MEDIUM-HIGH
impactDescription: simplified reactive access to all form values
tags: interpreter, useInterpreterEntitiesValues, values, reactive
---

## Use useInterpreterEntitiesValues for Reactive Value Access

When a component needs to reactively read all entity values from the interpreter store, use the dedicated `useInterpreterEntitiesValues` hook. It handles subscription, memoization, and cleanup internally. Manually subscribing via `useEffect` and mirroring values into local state is error-prone (stale closures, missing cleanup, extra re-renders) and unnecessary boilerplate.

**Incorrect (manual subscription with local state):**

```typescript
function FormDebugger({ interpreterStore }) {
  const [values, setValues] = useState({});

  useEffect(() => {
    const unsubscribe = interpreterStore.subscribe((data) => {
      setValues(data.entitiesValues);
    });
    return unsubscribe;
  }, [interpreterStore]);

  return <pre>{JSON.stringify(values)}</pre>;
}
```

**Correct (using the dedicated hook):**

```typescript
import { useInterpreterEntitiesValues } from "@coltorapps/builder-react";

function FormDebugger({ interpreterStore }) {
  const entitiesValues = useInterpreterEntitiesValues(interpreterStore);
  return <pre>{JSON.stringify(entitiesValues)}</pre>;
}
```
