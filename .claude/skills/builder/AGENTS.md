# @coltorapps/builder Best Practices

**Version 1.0.0**
February 2026

> **Note:**
> This document is primarily intended for AI agents and LLMs as a comprehensive reference for @coltorapps/builder patterns. Human developers should refer to the individual rule files in `rules/` for quick lookups.

## Abstract

This document provides a comprehensive guide to building dynamic, type-safe form builders using @coltorapps/builder. It covers 36 rules organized into 8 categories: Attribute Definition, Entity Design, Schema Architecture, Builder Store Patterns, Interpreter & Form Filling, React Integration, Validation Architecture, and Advanced Patterns. Each rule includes detailed explanations, incorrect usage examples to avoid, and correct patterns to follow.

---

## Table of Contents

- [1. Attribute Definition](#1-attribute-definition) **(CRITICAL)**
  - [1.1 Use Zod Schemas for Attribute Validation](#11-use-zod-schemas-for-attribute-validation)
  - [1.2 Design Attributes as Atomic Reusable Units](#12-design-attributes-as-atomic-reusable-units)
  - [1.3 Understand Attribute Value Transform Timing](#13-understand-attribute-value-transform-timing)
  - [1.4 Use Validation Context for Cross-Entity Awareness](#14-use-validation-context-for-cross-entity-awareness)
  - [1.5 Use Consistent Error Types for UI Handling](#15-use-consistent-error-types-for-ui-handling)
- [2. Entity Design](#2-entity-design) **(CRITICAL)**
  - [2.1 Compose Entities from Atomic Attributes](#21-compose-entities-from-atomic-attributes)
  - [2.2 Define Parent-Child Relationship Constraints](#22-define-parent-child-relationship-constraints)
  - [2.3 Use shouldBeProcessed for Dynamic Visibility](#23-use-shouldbeprocessed-for-dynamic-visibility)
  - [2.4 Use attributesExtensions for Cross-Entity Validation](#24-use-attributesextensions-for-cross-entity-validation)
  - [2.5 Ensure defaultValue Type Matches Attribute Validation](#25-ensure-defaultvalue-type-matches-attribute-validation)
- [3. Schema Architecture](#3-schema-architecture) **(HIGH)**
  - [3.1 Use Correct Schema Structure with entities and root](#31-use-correct-schema-structure-with-entities-and-root)
  - [3.2 Design Parent-Child Hierarchies Correctly](#32-design-parent-child-hierarchies-correctly)
  - [3.3 Use validateSchemaShape for Synchronous Structure Checks](#33-use-validateschemaShape-for-synchronous-structure-checks)
  - [3.4 Add Business Rules via Builder-Level validateSchema](#34-add-business-rules-via-builder-level-validateschema)
- [4. Builder Store Patterns](#4-builder-store-patterns) **(HIGH)**
  - [4.1 Use useBuilderStore Hook in React Components](#41-use-usebuilderstore-hook-in-react-components)
  - [4.2 Subscribe to Store Events for Reactive Updates](#42-subscribe-to-store-events-for-reactive-updates)
  - [4.3 Use Store Methods for Entity CRUD Operations](#43-use-store-methods-for-entity-crud-operations)
  - [4.4 Load Existing Schemas with initialData](#44-load-existing-schemas-with-initialdata)
  - [4.5 Optimize Renders with useBuilderStoreData shouldUpdate](#45-optimize-renders-with-usebuilderstoredata-shouldupdate)
- [5. Interpreter & Form Filling](#5-interpreter--form-filling) **(MEDIUM-HIGH)**
  - [5.1 Set Up Interpreter Store with useInterpreterStore](#51-set-up-interpreter-store-with-useinterpreterstore)
  - [5.2 Distinguish setEntityValue, resetEntityValue, and clearEntityValue](#52-distinguish-setentityvalue-resetentityvalue-and-clearentityvalue)
  - [5.3 Understand initialEntitiesValuesWithDefaults Behavior](#53-understand-initialentitiesvalueswithdefaults-behavior)
  - [5.4 Optimize Renders with useInterpreterStoreData shouldUpdate](#54-optimize-renders-with-useinterpreterstoredata-shouldupdate)
  - [5.5 Use useInterpreterEntitiesValues for Reactive Value Access](#55-use-useinterpreterentitiesvalues-for-reactive-value-access)
- [6. React Integration](#6-react-integration) **(MEDIUM)**
  - [6.1 Use createEntityComponent for Type-Safe Entity Rendering](#61-use-createentitycomponent-for-type-safe-entity-rendering)
  - [6.2 Use createAttributeComponent for Type-Safe Attribute Editing](#62-use-createattributecomponent-for-type-safe-attribute-editing)
  - [6.3 Use BuilderEntities with Component Map and Render Props](#63-use-builderentities-with-component-map-and-render-props)
  - [6.4 Use InterpreterEntities for Form Rendering](#64-use-interpreterentities-for-form-rendering)
  - [6.5 Add 'use client' Directive for Next.js App Router](#65-add-use-client-directive-for-nextjs-app-router)
- [7. Validation Architecture](#7-validation-architecture) **(MEDIUM)**
  - [7.1 Always Validate Schema on the Server](#71-always-validate-schema-on-the-server)
  - [7.2 Always Validate Entity Values on the Server](#72-always-validate-entity-values-on-the-server)
  - [7.3 Run Client-Side Validation Before Server Submission](#73-run-client-side-validation-before-server-submission)
  - [7.4 Handle Validation Results as Discriminated Unions](#74-handle-validation-results-as-discriminated-unions)
- [8. Advanced Patterns](#8-advanced-patterns) **(LOW-MEDIUM)**
  - [8.1 Use Factory Pattern for Environment-Specific Builders](#81-use-factory-pattern-for-environment-specific-builders)
  - [8.2 Integrate dnd-kit with Builder Store for Drag and Drop](#82-integrate-dnd-kit-with-builder-store-for-drag-and-drop)
  - [8.3 Customize Entity ID Generation and Validation](#83-customize-entity-id-generation-and-validation)

---

## 1. Attribute Definition

**Impact: CRITICAL**

Attributes are the fundamental building blocks of the @coltorapps/builder system. Each attribute represents a single, atomic property that can be attached to entities -- such as a label, a required flag, or a placeholder text. Correct attribute definition is critical because the entire type-safety chain, from entity composition through builder store validation to UI rendering, depends on attributes being properly defined with Zod schemas, following atomic design principles, and using consistent error formats. Mistakes at this layer propagate throughout the entire system.

### 1.1 Use Zod Schemas for Attribute Validation

Every attribute's `validate` method must use a Zod schema to parse and validate incoming values. Zod provides automatic TypeScript type inference from the schema, ensuring that the return type of `validate` is always correctly typed without manual annotation. Manual type checks bypass the builder's type-safety guarantees and produce inconsistent error formats.

**Incorrect (manual type checks without Zod):**

```typescript
import { createAttribute } from "@coltorapps/builder";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    // Manual type checking loses automatic type inference
    // and produces inconsistent error shapes.
    if (typeof value !== "string") {
      throw new Error("Label must be a string");
    }
    if (value.length < 1) {
      throw new Error("Label is required");
    }
    return value;
  },
});
```

**Correct (Zod schema for automatic type inference):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    // Zod parses, validates, and infers the return type automatically.
    // Errors are always ZodError instances with a structured .issues array.
    return z.string().min(1).parse(value);
  },
});
```

Zod's `.parse()` both validates and returns the typed value in a single call. The builder's generic type parameters automatically pick up the return type, so downstream consumers (entity definitions, builder store, UI components) all benefit from correct types without any manual `as` casts or type annotations.

### 1.2 Design Attributes as Atomic Reusable Units

Each attribute must represent exactly one property or concern (e.g., "label", "required", "placeholder"). Attributes are the smallest composable unit in the builder -- entities are assembled by combining multiple attributes. A single attribute that bundles several concerns cannot be selectively reused, makes validation logic harder to maintain, and breaks the builder's entity-attribute composition model.

**Incorrect (one attribute handling multiple concerns):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

// Bundling label, placeholder, and required into one attribute
// makes it impossible to reuse "required" alone in another entity.
export const fieldPropsAttribute = createAttribute({
  name: "fieldProps",
  validate(value) {
    return z
      .object({
        label: z.string().min(1),
        placeholder: z.string().optional(),
        required: z.boolean(),
      })
      .parse(value);
  },
});
```

**Correct (separate single-concern attributes):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    return z.string().min(1).parse(value);
  },
});

export const requiredAttribute = createAttribute({
  name: "required",
  validate(value) {
    return z.boolean().parse(value);
  },
});

export const placeholderAttribute = createAttribute({
  name: "placeholder",
  validate(value) {
    return z.string().optional().parse(value);
  },
});
```

With atomic attributes, an entity definition selects only the attributes it needs. A "textField" entity might use all three, while a "checkbox" entity might use only `labelAttribute` and `requiredAttribute`, omitting `placeholderAttribute`. This selective composition is only possible when each attribute is a standalone unit.

### 1.3 Understand Attribute Value Transform Timing

Zod's `.transform()` chains inside an attribute's `validate` method only produce transformed values when the schema is validated through the standalone `validateSchema()` function. The builder store's live validation (used for real-time UI feedback) does **not** apply transforms -- it only checks whether the value passes the base schema. Relying on transforms for the builder store's live preview will result in the UI displaying the raw, untransformed value while the developer expects the transformed one.

**Incorrect (relying on transform for live builder preview):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    // .transform() will NOT run during builder store live validation.
    // The builder preview will show the raw value, not the trimmed one.
    return z
      .string()
      .min(1)
      .transform((val) => val.trim().toLowerCase())
      .parse(value);
  },
});

// Developer expects the builder store to show "hello" for input "  Hello  ",
// but the store displays "  Hello  " as-is during editing.
```

**Correct (understanding when transforms apply):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { validateSchema } from "@coltorapps/builder";
import { z } from "zod";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    // Base validation runs in both the builder store AND validateSchema().
    // Transforms only run during validateSchema() calls.
    return z
      .string()
      .min(1)
      .transform((val) => val.trim().toLowerCase())
      .parse(value);
  },
});

// During builder store editing: raw value is used for preview, only base
// validation (string, min length 1) is checked for error display.
//
// During final submission via validateSchema(builder, schema):
// transforms run, so the output contains the trimmed, lowercased value.
```

If you need the transformed value to appear in the builder store preview in real time, perform the transformation explicitly before `.parse()` rather than inside a Zod `.transform()` chain. Reserve `.transform()` for final output normalization that should only happen at submission time through `validateSchema()`.

### 1.4 Use Validation Context for Cross-Entity Awareness

The `validate` method's second parameter is a context object containing `schema` (the full schema with all entities), `entity` (the current entity being validated), and `validate(value)` (a helper for running base validation). Use `context.schema` to access other entities when the attribute needs to enforce cross-entity constraints such as uniqueness or referential integrity. Never attempt to access external state or module-level variables for this purpose.

**Incorrect (accessing external state for cross-entity checks):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

// Storing schema reference in module scope is fragile and
// will not stay in sync with the builder store's current state.
let currentSchema: any = null;

export function setSchema(schema: any) {
  currentSchema = schema;
}

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    const label = z.string().min(1).parse(value);

    // This external reference may be stale or null.
    if (currentSchema) {
      const duplicate = Object.values(currentSchema.entities).some(
        (entity: any) => entity.attributes.label === label
      );
      if (duplicate) throw new Error("Duplicate label");
    }

    return label;
  },
});
```

**Correct (using the context parameter):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

export const uniqueLabelAttribute = createAttribute({
  name: "label",
  validate(value, context) {
    const label = z.string().min(1).parse(value);

    // context.schema contains the current schema snapshot with all entities.
    // context.entity is the entity currently being validated.
    const duplicateExists = Object.values(context.schema.entities).some(
      (entity) =>
        entity.id !== context.entity.id &&
        entity.attributes.label === label
    );

    if (duplicateExists) {
      throw new Error("Label must be unique across all entities");
    }

    return label;
  },
});
```

The context object is always provided by the builder at validation time and reflects the current state of the schema. This guarantees that cross-entity checks are performed against an up-to-date snapshot rather than a potentially stale external reference. Use `context.entity.id` to exclude the current entity from comparison checks to avoid false-positive self-matches.

### 1.5 Use Consistent Error Types for UI Handling

All attribute validation errors must follow a predictable, structured format so that UI components can render error messages without format-specific branching logic. Zod's `ZodError` provides a consistent `.issues` array where each issue has `code`, `message`, and `path` properties. Stick to Zod errors as the primary error type, and when custom errors are needed, use a dedicated error class with the same predictable shape.

**Incorrect (inconsistent error formats):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    // Throwing raw strings -- the UI cannot extract structured info.
    if (typeof value !== "string") {
      throw "must be a string";
    }

    // Throwing a plain Error -- different shape from ZodError.
    if (value.length < 1) {
      throw new Error("Label is required");
    }

    // Returning an error object -- yet another format to handle.
    if (value.length > 100) {
      return { error: true, message: "Label too long" };
    }

    return value;
  },
});

// The UI now needs to check: is it a string? an Error? an object? a ZodError?
```

**Correct (Zod errors with custom messages for consistent structure):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    // Zod's .parse() throws a ZodError on failure.
    // ZodError.issues is always an array of { code, message, path }.
    return z
      .string({ required_error: "Label is required" })
      .min(1, "Label cannot be empty")
      .max(100, "Label must be 100 characters or fewer")
      .parse(value);
  },
});

// UI code can uniformly handle errors:
// try { validate(value) } catch (e) {
//   if (e instanceof ZodError) {
//     const messages = e.issues.map((i) => i.message);
//   }
// }
```

When a validation rule cannot be expressed with built-in Zod methods, use `.refine()` or `.superRefine()` to keep the error within the `ZodError` structure rather than throwing a separate error type.

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

export const slugAttribute = createAttribute({
  name: "slug",
  validate(value) {
    return z
      .string()
      .min(1, "Slug is required")
      .refine((val) => /^[a-z0-9-]+$/.test(val), {
        message: "Slug must contain only lowercase letters, numbers, and hyphens",
      })
      .parse(value);
  },
});
```

By keeping all validation errors as `ZodError` instances, UI components only need a single error-handling path, reducing rendering bugs and simplifying internationalization of error messages.

---

## 2. Entity Design

**Impact: CRITICAL**

Entities are the core structural units in the builder -- they represent the form fields and containers that end users interact with. Each entity is composed of attributes and can participate in parent-child hierarchies. Correct entity design ensures that the builder maintains structural integrity, supports dynamic visibility, and enables cross-entity validation. Errors in entity design lead to broken form structures, orphaned children, and validation bypasses.

### 2.1 Compose Entities from Atomic Attributes

Entities must be composed from pre-defined, reusable attribute arrays rather than embedding validation logic directly inside the entity definition. Each attribute should be a standalone unit created with `createAttribute`, and entities should import and assemble them declaratively. This ensures attributes can be shared across multiple entities, tested independently, and maintained in a single location.

**Incorrect (inline validation or monolithic definition):**

```typescript
import { createEntity } from "@coltorapps/builder";
import { z } from "zod";

// BAD: Validation logic defined inline within the entity
// BAD: Attributes are not reusable across other entities
export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [
    {
      name: "label",
      validate(value: unknown) {
        return z.string().min(1).parse(value);
      },
    },
    {
      name: "required",
      validate(value: unknown) {
        return z.boolean().parse(value);
      },
    },
    {
      name: "placeholder",
      validate(value: unknown) {
        return z.string().optional().parse(value);
      },
    },
  ],
});
```

**Correct (composing from atomic attributes):**

```typescript
import { createEntity } from "@coltorapps/builder";
import { labelAttribute } from "./attributes/label";
import { requiredAttribute } from "./attributes/required";
import { placeholderAttribute } from "./attributes/placeholder";

// GOOD: Each attribute is defined once and reused across entities
// GOOD: Entity is a clean composition of atomic, testable attributes
export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [labelAttribute, requiredAttribute, placeholderAttribute],
});

// The same attributes can be reused in other entities
export const textAreaEntity = createEntity({
  name: "textArea",
  attributes: [labelAttribute, requiredAttribute, placeholderAttribute],
});
```

### 2.2 Define Parent-Child Relationship Constraints

Every entity's parent-child relationships must be explicitly constrained using `parentRequired` and `childrenAllowed` in the builder's `entitiesExtensions` configuration. Leaving these unconstrained allows users to create structurally invalid schemas where entities appear in places they should never exist (e.g., a text field nested inside another text field, or a section floating without a parent).

**Incorrect (no relationship constraints):**

```typescript
import { createBuilder } from "@coltorapps/builder";
import { sectionEntity } from "./entities/section";
import { textFieldEntity } from "./entities/text-field";
import { selectFieldEntity } from "./entities/select-field";

// BAD: No relationship constraints defined
// BAD: Any entity can be placed anywhere in the hierarchy
export const formBuilder = createBuilder({
  entities: [sectionEntity, textFieldEntity, selectFieldEntity],
});
```

**Correct (explicit parent-child constraints via entitiesExtensions):**

```typescript
import { createBuilder } from "@coltorapps/builder";
import { sectionEntity } from "./entities/section";
import { textFieldEntity } from "./entities/text-field";
import { selectFieldEntity } from "./entities/select-field";

// GOOD: Every entity has explicit relationship rules
// GOOD: The builder enforces structural validity at the schema level
export const formBuilder = createBuilder({
  entities: [sectionEntity, textFieldEntity, selectFieldEntity],
  entitiesExtensions: {
    textField: {
      parentRequired: true,
      allowedParents: ["section"],
    },
    selectField: {
      parentRequired: true,
      allowedParents: ["section"],
    },
    section: {
      childrenAllowed: ["textField", "selectField"],
    },
  },
});
```

### 2.3 Use shouldBeProcessed for Dynamic Visibility

The `shouldBeProcessed` function on an entity definition controls whether that entity and all of its children are included in the validation and processing pipeline. When `shouldBeProcessed` returns `false`, the entity is completely skipped -- no attribute validation runs and no child entities are processed. Always use this mechanism instead of manually filtering entities or relying on external state management to hide or show fields.

**Incorrect (manual filtering or external state for visibility):**

```typescript
import { createEntity } from "@coltorapps/builder";
import { labelAttribute } from "./attributes/label";

// BAD: No shouldBeProcessed -- visibility is handled externally
export const conditionalFieldEntity = createEntity({
  name: "conditionalField",
  attributes: [labelAttribute],
});

// BAD: Manually filtering entities outside the builder pipeline
function processForm(schema: FormSchema) {
  const visibleEntities = Object.values(schema.entities).filter((entity) => {
    if (entity.type === "conditionalField") {
      const parent = schema.entities[entity.parentId];
      return parent?.attributes?.showDetails === true;
    }
    return true;
  });

  // This skips the builder's validation entirely for filtered entities
  return visibleEntities;
}
```

**Correct (using shouldBeProcessed in entity definition):**

```typescript
import { createEntity } from "@coltorapps/builder";
import { labelAttribute } from "./attributes/label";
import { visibleWhenAttribute } from "./attributes/visible-when";

// GOOD: shouldBeProcessed integrates directly with the builder's pipeline
// GOOD: When false, the entity AND its children are skipped during validation
export const conditionalFieldEntity = createEntity({
  name: "conditionalField",
  attributes: [labelAttribute, visibleWhenAttribute],
  shouldBeProcessed(entity, context) {
    // Skip processing if the parent's "showDetails" attribute is false
    const parentEntity = context.schema.entities[entity.parentId];
    return parentEntity?.attributes?.showDetails === true;
  },
});
```

### 2.4 Use attributesExtensions for Cross-Entity Validation

When an attribute's validation depends on values from other entities in the schema (e.g., ensuring label uniqueness across all fields), the validation must be defined in the builder's `entitiesExtensions.attributes` configuration rather than inside the attribute's own `validate` method. The builder-level extension receives a `context` object that includes the full schema and the current entity reference, enabling cross-entity checks that are impossible at the individual attribute level.

**Incorrect (cross-entity validation inside the attribute's own validate):**

```typescript
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

// BAD: The attribute's validate method has no access to the full schema
// BAD: Cannot check other entities' attribute values from here
const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    const parsed = z.string().min(1).parse(value);

    // This is impossible -- there is no schema or entity context here
    // const allLabels = schema.entities...
    // if (allLabels.includes(parsed)) { throw new Error("Duplicate"); }

    return parsed;
  },
});
```

**Correct (using entitiesExtensions.attributes in builder config):**

```typescript
import { createBuilder } from "@coltorapps/builder";
import { textFieldEntity } from "./entities/text-field";

// GOOD: Cross-entity validation is defined at the builder level
// GOOD: context.schema provides access to all entities for comparison
export const formBuilder = createBuilder({
  entities: [textFieldEntity],
  entitiesExtensions: {
    textField: {
      attributes: {
        label: {
          validate(value, context) {
            // First, run the attribute's own validation via context.validate
            const validatedValue = context.validate(value);

            // Access the full schema for cross-entity checks
            const allLabels = Object.values(context.schema.entities)
              .filter((e) => e.id !== context.entity.id)
              .map((e) => e.attributes.label);

            if (allLabels.includes(validatedValue)) {
              throw new Error("Label must be unique across all fields");
            }

            return validatedValue;
          },
        },
      },
    },
  },
});
```

### 2.5 Ensure defaultValue Type Matches Attribute Validation

Every `defaultValue` set on an entity must produce a value that passes the corresponding attribute's Zod validation schema. Because default values are run through the same validation pipeline as user-provided values, a type mismatch (e.g., providing a string `"yes"` for a `z.boolean()` attribute) will throw a Zod parse error at entity instantiation time. Always verify that the TypeScript type of each default value aligns with the Zod schema's output type.

**Incorrect (defaultValue type does not match Zod schema):**

```typescript
import { createAttribute, createEntity } from "@coltorapps/builder";
import { z } from "zod";

const requiredAttribute = createAttribute({
  name: "required",
  validate(value) {
    return z.boolean().parse(value);
  },
});

const maxLengthAttribute = createAttribute({
  name: "maxLength",
  validate(value) {
    return z.number().min(1).parse(value);
  },
});

// BAD: "yes" is a string, but z.boolean() expects a boolean -- runtime crash
// BAD: "100" is a string, but z.number() expects a number -- runtime crash
export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [requiredAttribute, maxLengthAttribute],
  defaultValue: {
    required: "yes",
    maxLength: "100",
  },
});
```

**Correct (defaultValue types match Zod schema output types):**

```typescript
import { createAttribute, createEntity } from "@coltorapps/builder";
import { z } from "zod";

const requiredAttribute = createAttribute({
  name: "required",
  validate(value) {
    return z.boolean().parse(value);
  },
});

const maxLengthAttribute = createAttribute({
  name: "maxLength",
  validate(value) {
    return z.number().min(1).parse(value);
  },
});

// GOOD: false is a boolean, matching z.boolean() output
// GOOD: 100 is a number, matching z.number() output
export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [requiredAttribute, maxLengthAttribute],
  defaultValue: {
    required: false,
    maxLength: 100,
  },
});
```

---

## 3. Schema Architecture

**Impact: HIGH**

The schema is the serializable data structure that represents a complete form definition. It contains a flat map of entity instances and a root array defining the top-level ordering. Correct schema architecture ensures efficient entity lookups, consistent parent-child relationships, and proper separation between structural validation and attribute-level validation. Schema design mistakes lead to orphaned entities, circular references, and validation bypasses.

### 3.1 Use Correct Schema Structure with entities and root

A schema must be a flat map of entity instances keyed by their IDs, paired with a `root` array that lists the IDs of all top-level entities (those with no parent). Never nest entities inside other entities or use arrays as the primary container. The flat structure enables O(1) lookups by ID and keeps parent-child relationships explicit through `parentId` and `children` references.

**Incorrect (nested or non-flat structures):**

```typescript
// Wrong: nesting entities inside parent objects
const schema = {
  sections: [
    {
      type: "section",
      label: "Contact",
      fields: [
        { type: "textField", label: "Email" },
        { type: "textField", label: "Phone" },
      ],
    },
  ],
};

// Wrong: using an array instead of a keyed map
const schema = {
  entities: [
    { id: "entity-1", type: "textField", attributes: { label: "Name" } },
    { id: "entity-2", type: "textField", attributes: { label: "Email" } },
  ],
};
```

**Correct (flat entities map with root array):**

```typescript
const schema = {
  entities: {
    "entity-1": {
      type: "textField",
      attributes: { label: "First Name", required: true },
      parentId: null,
    },
    "entity-2": {
      type: "textField",
      attributes: { label: "Last Name", required: true },
      parentId: null,
    },
    "entity-3": {
      type: "section",
      attributes: { label: "Contact Info" },
      parentId: null,
      children: ["entity-4"],
    },
    "entity-4": {
      type: "textField",
      attributes: { label: "Email" },
      parentId: "entity-3",
    },
  },
  root: ["entity-1", "entity-2", "entity-3"],
};
```

### 3.2 Design Parent-Child Hierarchies Correctly

Parent-child relationships in a schema must be bidirectionally consistent. If an entity sets `parentId` to another entity's ID, that parent entity's `children` array must include the child's ID. Failing to maintain this consistency leads to orphaned entities, broken tree traversals, and validation errors. Additionally, never create circular references where an entity is both an ancestor and a descendant of another entity.

**Incorrect (inconsistent parent-child references):**

```typescript
// Wrong: field-1 references section-1 as parent, but section-1 has no children array
const schema = {
  entities: {
    "section-1": {
      type: "section",
      attributes: { label: "Section" },
      // Missing children: ["field-1"]
    },
    "field-1": {
      type: "textField",
      attributes: { label: "Name" },
      parentId: "section-1", // parent set but section doesn't list this as child
    },
  },
  root: ["section-1"],
};

// Wrong: circular reference -- entity-a is parent of entity-b and vice versa
const schema = {
  entities: {
    "entity-a": {
      type: "section",
      attributes: { label: "A" },
      parentId: "entity-b",
      children: ["entity-b"],
    },
    "entity-b": {
      type: "section",
      attributes: { label: "B" },
      parentId: "entity-a",
      children: ["entity-a"],
    },
  },
  root: [],
};
```

**Correct (consistent bidirectional references):**

```typescript
const schema = {
  entities: {
    "section-1": {
      type: "section",
      attributes: { label: "Section" },
      children: ["field-1", "field-2"],
    },
    "field-1": {
      type: "textField",
      attributes: { label: "Name" },
      parentId: "section-1",
    },
    "field-2": {
      type: "textField",
      attributes: { label: "Email" },
      parentId: "section-1",
    },
  },
  root: ["section-1"],
};
```

### 3.3 Use validateSchemaShape for Synchronous Structure Checks

`validateSchemaShape` performs synchronous structural validation of a schema against a builder definition. It checks that entity types exist in the builder, parent-child references are consistent, and required structural constraints are met. It does NOT validate attribute values -- use the async `validateSchema` for that. Prefer `validateSchemaShape` when you only need to verify structural correctness, such as during initial load or schema import, to avoid unnecessary async overhead.

**Incorrect (using full async validation for structure-only checks):**

```typescript
import { validateSchema } from "@coltorapps/builder";

// Wrong: unnecessary async + attribute validation overhead when you only need structure checks
async function loadSchema(schemaFromDatabase: unknown) {
  const result = await validateSchema(formBuilder, schemaFromDatabase);

  if (!result.success) {
    console.error("Invalid schema:", result.error);
    return;
  }

  return result.data;
}
```

**Correct (synchronous structural validation with validateSchemaShape):**

```typescript
import { validateSchemaShape } from "@coltorapps/builder";

// Correct: synchronous structural validation -- no async, no attribute value checks
function loadSchema(schemaFromDatabase: unknown) {
  const result = validateSchemaShape(formBuilder, schemaFromDatabase);

  if (!result.success) {
    console.error("Invalid schema structure:", result.error);
    return;
  }

  // result.data contains the validated schema shape
  return result.data;
}
```

### 3.4 Add Business Rules via Builder-Level validateSchema

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
        // Wrong level of abstraction -- an attribute validator should not
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

---

## 4. Builder Store Patterns

**Impact: HIGH**

The builder store is the central state container for the form builder UI. It manages the schema, entity CRUD operations, attribute values, validation errors, and event subscriptions. Correct store usage ensures stable React lifecycle integration, efficient re-renders, and reliable event-driven updates. Misusing the store leads to infinite render loops, stale data, and silent state corruption.

### 4.1 Use useBuilderStore Hook in React Components

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

### 4.2 Subscribe to Store Events for Reactive Updates

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

### 4.3 Use Store Methods for Entity CRUD Operations

Always modify entities through the store's dedicated methods: `addEntity()`, `deleteEntity()`, `cloneEntity()`, and `setEntityAttributeValue()`. These methods enforce validation, emit the correct events, and keep internal indexes consistent. Directly mutating the schema object obtained from `getData()` bypasses all of these safeguards, leading to silent data corruption, missed event notifications, and broken undo/redo or persistence workflows.

**Incorrect (directly mutating the schema object):**

```typescript
// Never reach into the store's data and mutate it by hand.
const data = builderStore.getData();
data.schema.entities["new-id"] = { type: "textField", attributes: { label: "Hack" } };
// The store has no idea this happened: no events fire, no validation runs,
// and dependent UI stays stale.
```

**Correct (using store methods):**

```typescript
// Add a new entity. The store assigns an ID, validates the type,
// and emits onEntityAdded.
builderStore.addEntity({
  type: "textField",
  attributes: { label: "New Field", required: false },
  parentId: "section-1", // optional, for nested structures
});

// Remove an entity and all its children. Emits onEntityDeleted.
builderStore.deleteEntity("entity-to-remove");

// Duplicate an entity with a new unique ID. Emits onEntityCloned.
builderStore.cloneEntity("entity-to-clone");

// Update a single attribute value. Emits onEntityAttributeUpdated.
builderStore.setEntityAttributeValue("entity-1", "label", "Updated Label");
```

### 4.4 Load Existing Schemas with initialData

When restoring a previously saved builder state (e.g., from a database or API response), pass the data through the `initialData` option at store creation time. The store uses `initialData` to hydrate its internal state before the first render, so all entities, attribute errors, and schema-level errors are available immediately. Attempting to assign properties on the store instance after creation or calling undocumented setters will silently fail or throw, leaving the store empty.

**Incorrect (trying to set data after store creation):**

```typescript
const builderStore = useBuilderStore(formBuilder);

// These assignments have no effect. The store does not expose a writable
// `schema` property or a generic setter for bulk data.
builderStore.schema = savedSchema; // Won't work!
builderStore.data = savedData;     // Also won't work!
```

**Correct (using the initialData option):**

```typescript
import { useBuilderStore } from "@coltorapps/builder-react";

const builderStore = useBuilderStore(formBuilder, {
  initialData: {
    schema: savedSchemaFromDatabase,
    entitiesAttributesErrors: {},
    schemaError: null,
  },
});

// For non-React contexts, createBuilderStore accepts the same option.
import { createBuilderStore } from "@coltorapps/builder";

const store = createBuilderStore(formBuilder, {
  initialData: {
    schema: savedSchemaFromDatabase,
    entitiesAttributesErrors: {},
    schemaError: null,
  },
});
```

### 4.5 Optimize Renders with useBuilderStoreData shouldUpdate

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

---

## 5. Interpreter & Form Filling

**Impact: MEDIUM-HIGH**

The interpreter store drives the form-filling experience -- the end-user side of the builder. It manages entity values, default values, validation state, and reactive subscriptions for form rendering. Correct interpreter usage ensures that form state is properly initialized, values are managed through the right methods, and components re-render efficiently. Mistakes here lead to lost user input, incorrect default values, and sluggish form interactions.

### 5.1 Set Up Interpreter Store with useInterpreterStore

The interpreter store drives form filling and rendering. In React, always use the `useInterpreterStore` hook to create the store. The standalone `createInterpreterStore` function is intended for non-React contexts; calling it directly inside a component body creates a brand-new store on every render, causing lost state and infinite loops.

**Incorrect (creating a new store every render):**

```typescript
import { createInterpreterStore } from "@coltorapps/builder";

function FormRenderer({ schema }) {
  // New store instance on every render - all user input is lost!
  const store = createInterpreterStore(formBuilder, schema);
  return <div>...</div>;
}
```

**Correct (using the React hook with event handlers):**

```typescript
import { useInterpreterStore, InterpreterEntities } from "@coltorapps/builder-react";

function FormRenderer({ schema }) {
  const interpreterStore = useInterpreterStore(formBuilder, schema, {
    events: {
      onEntityValueUpdated(event) {
        console.log("Value changed:", event.payload.entityId, event.payload.value);
      },
    },
  });

  return <InterpreterEntities interpreterStore={interpreterStore} components={{ ... }} />;
}
```

### 5.2 Distinguish setEntityValue, resetEntityValue, and clearEntityValue

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

### 5.3 Understand initialEntitiesValuesWithDefaults Behavior

By default the interpreter store auto-populates every entity's value from its `defaultValue` definition in the schema. This is convenient for most cases, but sometimes you need an empty form (e.g., a "create new" flow) or you want to load previously saved values (e.g., an "edit" flow). The `initialEntitiesValuesWithDefaults` option and `initialData` option control this behavior.

**Incorrect (manually setting defaults after store creation):**

```typescript
const interpreterStore = useInterpreterStore(formBuilder, schema);

// Redundant -- the store already auto-populated defaults above
useEffect(() => {
  schema.entities.forEach((entity) => {
    if (entity.defaultValue !== undefined) {
      interpreterStore.setEntityValue(entity.id, entity.defaultValue);
    }
  });
}, []);
```

**Correct (controlling default value behavior via options):**

```typescript
// Default behavior: auto-populates from entity defaultValue definitions
const interpreterStore = useInterpreterStore(formBuilder, schema);
// All entities with defaultValue will have their values pre-filled

// When you want an empty form (e.g., for "new" mode):
const interpreterStore = useInterpreterStore(formBuilder, schema, {
  initialEntitiesValuesWithDefaults: false,
});

// When loading saved values (e.g., for "edit" mode):
const interpreterStore = useInterpreterStore(formBuilder, schema, {
  initialData: {
    entitiesValues: savedValuesFromDatabase,
  },
});
```

### 5.4 Optimize Renders with useInterpreterStoreData shouldUpdate

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

### 5.5 Use useInterpreterEntitiesValues for Reactive Value Access

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

---

## 6. React Integration

**Impact: MEDIUM**

React integration covers the component patterns for rendering entities and attributes in both the builder (admin) and interpreter (end-user) UIs. Using the library's dedicated component factories and rendering components ensures type safety, proper context propagation, and correct lifecycle management. Manual rendering approaches bypass the builder's context chain and lose type inference, leading to runtime errors and broken nested entity support.

### 6.1 Use createEntityComponent for Type-Safe Entity Rendering

Always use `createEntityComponent` from `@coltorapps/builder-react` when defining entity components for the builder. This helper automatically infers the correct TypeScript types for `entity`, `entityId`, and `children` props based on the entity definition, eliminating manual typing errors and ensuring the component receives proper builder context.

**Incorrect (manually typed, error-prone):**

```typescript
// Manually typing entity components loses type safety and context integration.
function TextFieldBuilder({ entity, entityId }: { entity: any; entityId: string }) {
  return <div>{entity.attributes.label}</div>;
}
```

**Correct (type-safe with createEntityComponent):**

```typescript
import { createEntityComponent } from "@coltorapps/builder-react";
import { textFieldEntity } from "./text-field-entity";

const TextFieldBuilder = createEntityComponent(textFieldEntity, ({ entity, entityId, children }) => {
  return (
    <div>
      <label>{entity.attributes.label}</label>
      <input placeholder={entity.attributes.placeholder} />
      {children}
    </div>
  );
});
```

### 6.2 Use createAttributeComponent for Type-Safe Attribute Editing

Always use `createAttributeComponent` from `@coltorapps/builder-react` when building attribute editor components. This helper provides type-safe access to the `attribute` object (including `value` and `setValue`), the parent `entity`, and the `entityId`, removing the need to manually reach into the builder store for attribute data.

**Incorrect (no type safety for attribute value):**

```typescript
// Manually accessing store data bypasses type safety and couples the component to store internals.
function LabelEditor({ entityId, builderStore }: any) {
  const value = builderStore.getData().schema.entities[entityId]?.attributes?.label;
  return (
    <input
      value={value || ""}
      onChange={(e) => builderStore.setEntityAttributeValue(entityId, "label", e.target.value)}
    />
  );
}
```

**Correct (using createAttributeComponent):**

```typescript
import { createAttributeComponent } from "@coltorapps/builder-react";
import { labelAttribute } from "./attributes/label";

const LabelEditor = createAttributeComponent(labelAttribute, ({ attribute, entity, entityId }) => {
  return (
    <input
      value={attribute.value ?? ""}
      onChange={(e) => attribute.setValue(e.target.value)}
    />
  );
});
```

### 6.3 Use BuilderEntities with Component Map and Render Props

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

### 6.4 Use InterpreterEntities for Form Rendering

Use the `InterpreterEntities` component from `@coltorapps/builder-react` to render the end-user form-filling UI. Pass an `interpreterStore` and a `components` map that maps each entity type string to its interpreter component. Use the optional render props pattern (`children` as a function) to wrap entities in a `<form>` or custom layout. Never manually reconstruct the form from raw schema data.

**Incorrect (manually building form from schema):**

```typescript
// Manually building the form skips interpreter context, validation state, and value binding.
function FormRenderer({ interpreterStore }) {
  const schema = interpreterStore.getSchema();
  return (
    <form>
      {schema.root.map((id) => {
        const entity = schema.entities[id];
        if (entity.type === "textField") return <input key={id} />;
        return null;
      })}
    </form>
  );
}
```

**Correct (using InterpreterEntities with component mapping):**

```typescript
import { InterpreterEntities } from "@coltorapps/builder-react";

function FormRenderer({ interpreterStore }) {
  return (
    <InterpreterEntities
      interpreterStore={interpreterStore}
      components={{
        textField: TextFieldInterpreter,
        selectField: SelectFieldInterpreter,
      }}
    >
      {(entities) => <form className="dynamic-form">{entities}</form>}
    </InterpreterEntities>
  );
}
```

### 6.5 Add 'use client' Directive for Next.js App Router

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

---

## 7. Validation Architecture

**Impact: MEDIUM**

Validation in @coltorapps/builder operates at multiple levels: attribute-level (Zod schemas), schema-level (structural and business rules), and submission-level (entity values). A robust validation architecture requires server-side validation as the authoritative check, with client-side validation serving as a UX optimization for instant feedback. All validation results use discriminated union patterns for type-safe error handling. Skipping server validation is a security vulnerability; skipping client validation degrades user experience.

### 7.1 Always Validate Schema on the Server

Never trust client-side schema validation alone. Always call `validateSchema` on the server before persisting a schema to the database. This function is async because it validates the schema structure, attribute values, runs transforms, and executes any custom `validateSchema` logic defined in the builder.

**Incorrect (saving schema without server validation):**

```typescript
// Saving schema without server validation
async function saveSchema(schema: unknown) {
  await db.schemas.create({ data: { schema } }); // Unsafe!
}
```

**Correct (validating before saving):**

```typescript
// Validate before saving
import { validateSchema } from "@coltorapps/builder";
import { formBuilder } from "./form-builder";

async function saveSchema(schema: unknown) {
  const result = await validateSchema(formBuilder, schema);

  if (!result.success) {
    return {
      errors: {
        entitiesAttributesErrors: result.entitiesAttributesErrors,
        schemaError: result.schemaError,
      },
    };
  }

  // result.data contains the validated (and possibly transformed) schema
  await db.schemas.create({ data: { schema: result.data } });
  return { success: true };
}
```

### 7.2 Always Validate Entity Values on the Server

Never trust client form values. Always call `validateEntitiesValues` on the server before persisting submitted form data. This function validates the values against the builder definition and the schema, ensuring all entity values conform to their attribute validators.

**Incorrect (saving values without server validation):**

```typescript
// Saving values without server validation
async function submitForm(values: unknown, schemaId: string) {
  await db.submissions.create({ data: { values, schemaId } }); // Unsafe!
}
```

**Correct (validating before saving):**

```typescript
// Validate before saving
import { validateEntitiesValues } from "@coltorapps/builder";
import { formBuilder } from "./form-builder";

async function submitForm(values: unknown, schemaId: string) {
  const schema = await db.schemas.findUnique({ where: { id: schemaId } });

  const result = validateEntitiesValues(values, formBuilder, schema);

  if (!result.success) {
    return { errors: result.entitiesErrors };
  }

  // result.data contains validated values ready for storage
  await db.submissions.create({ data: { values: result.data, schemaId } });
  return { success: true };
}
```

### 7.3 Run Client-Side Validation Before Server Submission

Use `interpreterStore.validateEntitiesValues()` on the client to provide instant validation feedback before submitting to the server. This improves UX by avoiding unnecessary network round-trips for obviously invalid data. However, never skip server-side validation -- client validation is a UX optimization, not a security measure.

**Incorrect (no client-side validation, poor UX):**

```typescript
// No client-side validation -- poor UX, slow feedback
async function handleSubmit() {
  const values = interpreterStore.getEntitiesValues();
  const result = await submitToServer(values); // Slow feedback
  if (!result.success) showErrors(result.errors);
}
```

**Correct (client validation first for instant feedback, then server validation):**

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

### 7.4 Handle Validation Results as Discriminated Unions

Both `validateSchema` and `validateEntitiesValues` return discriminated union results: `{ success: true, data }` or `{ success: false, ...errors }`. Always check `result.success` before accessing `result.data` or error fields. This ensures TypeScript can narrow the type correctly and prevents runtime errors from accessing undefined properties.

**Incorrect (accessing data without checking success):**

```typescript
// Accessing data without checking success
const result = await validateSchema(formBuilder, schema);
await db.schemas.create({ data: { schema: result.data } }); // May be undefined!
```

**Correct (discriminated union pattern):**

```typescript
// Discriminated union pattern
const result = await validateSchema(formBuilder, schema);

if (result.success) {
  // TypeScript knows result.data exists here
  await db.schemas.create({ data: { schema: result.data } });
} else {
  // TypeScript knows error fields exist here
  console.error("Attribute errors:", result.entitiesAttributesErrors);
  console.error("Schema error:", result.schemaError);
}
```

---

## 8. Advanced Patterns

**Impact: LOW-MEDIUM**

Advanced patterns extend the builder's capabilities for specialized use cases: multi-tenant configurations via the factory pattern, visual entity reordering via drag-and-drop integration, and custom ID formats for database compatibility. These patterns are not required for basic builder implementations but become important as the application scales to support multiple environments, rich UI interactions, or specific infrastructure requirements.

### 8.1 Use Factory Pattern for Environment-Specific Builders

When you need different entity sets or validation rules per environment or tenant, use a factory function that returns fully configured builder instances. The `createBuilder` API does not support adding entities after construction, so conditional entity registration must happen at creation time through a factory.

**Incorrect (creating a single global builder and conditionally adding entities at runtime):**

```typescript
// runtime conditional entity registration
const formBuilder = createBuilder({
  entities: [textFieldEntity],
});
// Trying to add entities later... not supported!
```

**Correct (using a factory function that returns configured builders):**

```typescript
import { createBuilder } from "@coltorapps/builder";
import { textFieldEntity } from "./entities/text-field";
import { selectFieldEntity } from "./entities/select-field";
import { fileUploadEntity } from "./entities/file-upload";

function createFormBuilder(options: { enableFileUpload: boolean }) {
  const entities = [textFieldEntity, selectFieldEntity];

  if (options.enableFileUpload) {
    entities.push(fileUploadEntity);
  }

  return createBuilder({
    entities,
    validateSchema(schema) {
      if (Object.keys(schema.entities).length === 0) {
        throw new Error("At least one field is required");
      }
      return schema;
    },
  });
}

// Usage per environment
export const basicFormBuilder = createFormBuilder({ enableFileUpload: false });
export const proFormBuilder = createFormBuilder({ enableFileUpload: true });
```

### 8.2 Integrate dnd-kit with Builder Store for Drag and Drop

Use `@dnd-kit/core` and `@dnd-kit/sortable` to enable drag-and-drop entity reordering in the builder UI. Never directly mutate the schema arrays. Instead, compute the new order with `arrayMove` and apply it immutably through `builderStore.setData`.

**Incorrect (directly mutating the root array):**

```typescript
function handleDragEnd(event) {
  const data = builderStore.getData();
  const oldIndex = data.schema.root.indexOf(event.active.id);
  const newIndex = data.schema.root.indexOf(event.over.id);
  data.schema.root.splice(oldIndex, 1);
  data.schema.root.splice(newIndex, 0, event.active.id); // Direct mutation!
}
```

**Correct (using dnd-kit with builder store immutably):**

```typescript
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useBuilderStoreData } from "@coltorapps/builder-react";

function BuilderCanvas({ builderStore }) {
  const data = useBuilderStoreData(builderStore);

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = data.schema.root.indexOf(active.id);
    const newIndex = data.schema.root.indexOf(over.id);
    const newRoot = arrayMove(data.schema.root, oldIndex, newIndex);

    builderStore.setData({
      ...builderStore.getData(),
      schema: {
        ...builderStore.getData().schema,
        root: newRoot,
      },
    });
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={data.schema.root}
        strategy={verticalListSortingStrategy}
      >
        <BuilderEntities
          builderStore={builderStore}
          components={componentMap}
        />
      </SortableContext>
    </DndContext>
  );
}
```

### 8.3 Customize Entity ID Generation and Validation

By default, the builder generates UUID v4 identifiers for entities. When your database or system requires a different ID format (e.g., CUID, nanoid), configure `generateEntityId` and `validateEntityId` directly in the builder definition. This ensures all entity creation and schema loading use consistent, validated IDs.

**Incorrect (post-processing entity IDs after schema creation):**

```typescript
const builderStore = useBuilderStore(formBuilder);
// Manually replacing all UUIDs with CUIDs... fragile and error-prone
```

**Correct (configuring generateEntityId and validateEntityId at builder level):**

```typescript
import { createBuilder } from "@coltorapps/builder";
import { createId, isCuid } from "@paralleldrive/cuid2";

export const formBuilder = createBuilder({
  entities: [textFieldEntity, selectFieldEntity],
  generateEntityId() {
    return createId(); // Generate CUID instead of UUID
  },
  validateEntityId(id) {
    if (!isCuid(id)) {
      throw new Error(`Invalid entity ID format: ${id}`);
    }
  },
});

// Now all entities created by addEntity() will use CUIDs
// And schema loading will validate that all IDs are valid CUIDs
```

---

## References

- [Official Documentation](https://builder.coltorapps.com/)
- [GitHub Repository](https://github.com/coltorapps/builder)
- [React Form Builder Guide](https://builder.coltorapps.com/docs/guides/form-builder)
- [Factory Pattern Guide](https://builder.coltorapps.com/docs/guides/factory-pattern)
- [Drag and Drop Guide](https://builder.coltorapps.com/docs/guides/drag-and-drop)
