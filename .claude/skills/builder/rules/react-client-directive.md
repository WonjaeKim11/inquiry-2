---
title: "Add 'use client' Directive for Next.js App Router"
impact: MEDIUM
impactDescription: prevents server component errors with builder-react hooks
tags: react, next.js, use-client, app-router, SSR
---

## Add 'use client' Directive for Next.js App Router

In Next.js App Router projects, any component that imports hooks or interactive APIs from `@coltorapps/builder-react` (such as `useBuilderStore`, `useInterpreterStore`, `BuilderEntities`, or `InterpreterEntities`) must include the `"use client"` directive at the very top of the file. Without it, Next.js treats the file as a React Server Component, and hooks will throw a runtime error.

**Incorrect (missing "use client" in Next.js App Router):**

```typescript
// This will fail at runtime: hooks cannot be used in Server Components.
import { useBuilderStore } from "@coltorapps/builder-react";

export function FormBuilder() {
  const builderStore = useBuilderStore(formBuilder);
  return <div>...</div>;
}
```

**Correct ("use client" directive at the top of the file):**

```typescript
"use client";

import { useBuilderStore } from "@coltorapps/builder-react";

export function FormBuilder() {
  const builderStore = useBuilderStore(formBuilder);
  return <div>...</div>;
}
```
