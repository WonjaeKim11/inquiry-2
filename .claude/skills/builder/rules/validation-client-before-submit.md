---
title: Run Client-Side Validation Before Server Submission
impact: MEDIUM
impactDescription: provides instant feedback without network round-trip
tags: validation, client, pre-submit, UX
---

## Run Client-Side Validation Before Server Submission

Use `interpreterStore.validateEntitiesValues()` on the client to provide instant validation feedback before submitting to the server. This improves UX by avoiding unnecessary network round-trips for obviously invalid data. However, never skip server-side validation -- client validation is a UX optimization, not a security measure.

**Incorrect (what's wrong):**

```typescript
// No client-side validation -- poor UX, slow feedback
async function handleSubmit() {
  const values = interpreterStore.getEntitiesValues();
  const result = await submitToServer(values); // Slow feedback
  if (!result.success) showErrors(result.errors);
}
```

**Correct (what's right):**

```typescript
// Client validation first for instant feedback, then server validation
async function handleSubmit() {
  const clientResult = interpreterStore.validateEntitiesValues();

  if (!clientResult.success) {
    // Show errors immediately without network request
    return;
  }

  // Then validate on server (never skip this!)
  const serverResult = await submitToServer(clientResult.data);
  if (!serverResult.success) showErrors(serverResult.errors);
}
```
