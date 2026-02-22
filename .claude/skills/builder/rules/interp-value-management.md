---
title: Distinguish setEntityValue, resetEntityValue, and clearEntityValue
impact: MEDIUM-HIGH
impactDescription: correct value lifecycle management
tags: interpreter, setEntityValue, resetEntityValue, clearEntityValue, values
---

## Distinguish setEntityValue, resetEntityValue, and clearEntityValue

The interpreter store exposes three distinct methods for changing an entity's value. Each has a different semantic meaning and confusing them leads to subtle bugs, especially when entities define a `defaultValue`.

- `setEntityValue(entityId, value)` -- assigns a specific value to the entity.
- `resetEntityValue(entityId)` -- reverts the entity back to its configured `defaultValue`.
- `clearEntityValue(entityId)` -- sets the entity's value to `undefined` (no value at all).

**Incorrect (using clearEntityValue when the intent is to reset to default):**

```typescript
// User clicks "Reset field" button -- developer expects the default value to reappear
interpreterStore.clearEntityValue("entity-1");
// Result: value becomes undefined, NOT the default value
```

**Correct (choosing the right method for each intent):**

```typescript
// Set a specific value provided by the user
interpreterStore.setEntityValue("entity-1", "John Doe");

// Reset to the entity's configured defaultValue (e.g., "N/A")
interpreterStore.resetEntityValue("entity-1");

// Clear completely -- value becomes undefined
interpreterStore.clearEntityValue("entity-1");
```
