---
title: Use BuilderEntities with Component Map and Render Props
impact: MEDIUM
impactDescription: correct builder-side entity rendering pattern
tags: react, BuilderEntities, components, render-props
---

## Use BuilderEntities with Component Map and Render Props

Use the `BuilderEntities` component from `@coltorapps/builder-react` to render entities in the builder UI. Pass a `builderStore` and a `components` map that maps each entity type string to its corresponding component. Use the optional render props pattern (`children` as a function) to wrap the rendered entities in custom layout elements. Never manually iterate over schema entities and conditionally render them.

**Incorrect (manual iteration over schema entities):**

```typescript
// Manually iterating breaks the builder context chain and misses nested entity support.
function Builder({ builderStore }) {
  const data = builderStore.getData();
  return (
    <div>
      {data.schema.root.map((entityId) => {
        const entity = data.schema.entities[entityId];
        if (entity.type === "textField") return <TextFieldBuilder key={entityId} entity={entity} />;
        return null;
      })}
    </div>
  );
}
```

**Correct (using BuilderEntities with component mapping):**

```typescript
import { BuilderEntities } from "@coltorapps/builder-react";

function Builder({ builderStore }) {
  return (
    <BuilderEntities
      builderStore={builderStore}
      components={{
        textField: TextFieldBuilder,
        selectField: SelectFieldBuilder,
      }}
    >
      {(entities) => <div className="builder-canvas">{entities}</div>}
    </BuilderEntities>
  );
}
```
