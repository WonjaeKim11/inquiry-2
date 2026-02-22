---
name: builder
description: "Guide for using the @coltorapps/builder library. Use when building headless, type-safe dynamic form builders. Covers patterns for Attribute definition, Entity design, Schema structure, Builder/Interpreter Store, React bindings, and validation architecture. Triggers on tasks related to dynamic forms or page builders."
license: MIT
metadata:
  author: coltorapps
  version: "1.0.0"
---

# @coltorapps/builder Skill

## Overview

`@coltorapps/builder` is a headless, type-safe dynamic form builder library. It consists of a core package (`@coltorapps/builder`) and React bindings (`@coltorapps/builder-react`), providing Zod-based validation, schema management, and Builder/Interpreter Store patterns.

## When to Apply

- When writing or reviewing code that uses `@coltorapps/builder` or `@coltorapps/builder-react` packages
- When building dynamic form builders, page builders, survey builders, etc.
- When working with Attribute, Entity, Schema, or Builder/Interpreter Store code
- When implementing form value validation and server submission logic

## Rule Categories

| Priority | Category | Impact | Prefix | Count |
|----------|----------|--------|--------|-------|
| 1 | Attribute Definition | CRITICAL | `attr-` | 5 |
| 2 | Entity Design | CRITICAL | `entity-` | 5 |
| 3 | Schema Architecture | HIGH | `schema-` | 4 |
| 4 | Builder Store Patterns | HIGH | `store-` | 5 |
| 5 | Interpreter & Form Filling | MEDIUM-HIGH | `interp-` | 5 |
| 6 | React Integration | MEDIUM | `react-` | 5 |
| 7 | Validation Architecture | MEDIUM | `validation-` | 4 |
| 8 | Advanced Patterns | LOW-MEDIUM | `advanced-` | 3 |

## Quick Reference

### 1. Attribute Definition (CRITICAL)
- [attr-zod-validation](rules/attr-zod-validation.md) — Write validate methods with Zod schemas
- [attr-atomic-design](rules/attr-atomic-design.md) — Design independent, reusable Attributes
- [attr-transform-awareness](rules/attr-transform-awareness.md) — Understand when transforms are applied
- [attr-context-usage](rules/attr-context-usage.md) — Cross-entity awareness via validation context
- [attr-error-types](rules/attr-error-types.md) — Unified UI handling with consistent error types

### 2. Entity Design (CRITICAL)
- [entity-attribute-composition](rules/entity-attribute-composition.md) — Compose entities from atomic attribute arrays
- [entity-relationship-constraints](rules/entity-relationship-constraints.md) — Configure parentRequired and childrenAllowed
- [entity-conditional-processing](rules/entity-conditional-processing.md) — Dynamic visibility with shouldBeProcessed
- [entity-attribute-extensions](rules/entity-attribute-extensions.md) — Cross-entity validation via attributesExtensions
- [entity-default-values](rules/entity-default-values.md) — Type consistency between defaultValue and validation

### 3. Schema Architecture (HIGH)
- [schema-structure](rules/schema-structure.md) — Correct { entities, root } structure
- [schema-hierarchy](rules/schema-hierarchy.md) — Parent-child relationship design
- [schema-validate-shape](rules/schema-validate-shape.md) — Synchronous structural validation with validateSchemaShape
- [schema-custom-validation](rules/schema-custom-validation.md) — Builder-level business rule validation

### 4. Builder Store Patterns (HIGH)
- [store-react-hook](rules/store-react-hook.md) — Use the useBuilderStore hook
- [store-event-handling](rules/store-event-handling.md) — Reactive updates via store event subscription
- [store-entity-operations](rules/store-entity-operations.md) — CRUD with addEntity/deleteEntity/cloneEntity
- [store-initial-data](rules/store-initial-data.md) — Load existing schemas with initialData
- [store-selective-rerender](rules/store-selective-rerender.md) — Performance optimization with useBuilderStoreData shouldUpdate

### 5. Interpreter & Form Filling (MEDIUM-HIGH)
- [interp-store-setup](rules/interp-store-setup.md) — useInterpreterStore setup and event handlers
- [interp-value-management](rules/interp-value-management.md) — Distinguish setEntityValue/resetEntityValue/clearEntityValue
- [interp-default-values](rules/interp-default-values.md) — Understand initialEntitiesValuesWithDefaults behavior
- [interp-selective-rerender](rules/interp-selective-rerender.md) — Performance optimization with useInterpreterStoreData shouldUpdate
- [interp-entities-values-hook](rules/interp-entities-values-hook.md) — Access values with useInterpreterEntitiesValues

### 6. React Integration (MEDIUM)
- [react-entity-components](rules/react-entity-components.md) — Type-safe entity rendering with createEntityComponent
- [react-attribute-components](rules/react-attribute-components.md) — Type-safe attribute editing with createAttributeComponent
- [react-builder-entities](rules/react-builder-entities.md) — BuilderEntities component map + render props
- [react-interpreter-entities](rules/react-interpreter-entities.md) — Form rendering with InterpreterEntities
- [react-client-directive](rules/react-client-directive.md) — "use client" directive requirement

### 7. Validation Architecture (MEDIUM)
- [validation-server-schema](rules/validation-server-schema.md) — Always call validateSchema on the server
- [validation-server-values](rules/validation-server-values.md) — Always call validateEntitiesValues on the server
- [validation-client-before-submit](rules/validation-client-before-submit.md) — Client-side validation before server submission
- [validation-error-handling](rules/validation-error-handling.md) — Handle discriminated union results

### 8. Advanced Patterns (LOW-MEDIUM)
- [advanced-factory-pattern](rules/advanced-factory-pattern.md) — Factory for environment-specific builders
- [advanced-dnd-integration](rules/advanced-dnd-integration.md) — dnd-kit and builder store integration
- [advanced-custom-ids](rules/advanced-custom-ids.md) — Custom generateEntityId/validateEntityId

## How to Use

This skill is automatically activated when writing or reviewing code related to `@coltorapps/builder`. See [AGENTS.md](AGENTS.md) for the full guide.
