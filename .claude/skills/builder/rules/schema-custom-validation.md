---
title: Add Business Rules via Builder-Level validateSchema
impact: HIGH
impactDescription: enforces domain-specific schema constraints
tags: schema, validation, business-rules, custom, validateSchema
---

## Add Business Rules via Builder-Level validateSchema

Schema-wide business rules belong in the builder's `validateSchema` method, not in individual entity attribute validators. Attribute validators operate on a single entity's values, while `validateSchema` has access to the entire schema -- making it the correct place for cross-entity constraints, minimum entity counts, uniqueness checks, and other domain-specific rules. The method can also transform the schema before returning it.

**Incorrect (business rules inside attribute validators):**

```typescript
// Wrong: checking schema-wide constraints at the attribute level
const textFieldEntity = createEntity({
  name: "textField",
  attributes: [
    createAttribute({
      name: "label",
      validate(value, context) {
        // Wrong level of abstraction — an attribute validator should not
        // be inspecting other entities in the schema
        const allLabels = Object.values(context.schema.entities).map(
          (e) => e.attributes.label
        );
        if (new Set(allLabels).size !== allLabels.length) {
          throw new Error("All labels must be unique");
        }
        return value;
      },
    }),
  ],
});
```

**Correct (schema-wide business rules in builder's validateSchema):**

```typescript
export const formBuilder = createBuilder({
  entities: [textFieldEntity, selectFieldEntity],
  validateSchema(schema) {
    // Rule: schema must contain at least one entity
    if (Object.keys(schema.entities).length === 0) {
      throw new Error("Schema must contain at least one entity");
    }

    // Rule: at least one field must be marked as required
    const hasRequired = Object.values(schema.entities).some(
      (entity) => entity.attributes.required === true
    );
    if (!hasRequired) {
      throw new Error("At least one field must be required");
    }

    // Rule: all labels must be unique across the schema
    const labels = Object.values(schema.entities).map(
      (entity) => entity.attributes.label
    );
    if (new Set(labels).size !== labels.length) {
      throw new Error("All entity labels must be unique");
    }

    return schema; // optionally transform the schema before returning
  },
});
```
