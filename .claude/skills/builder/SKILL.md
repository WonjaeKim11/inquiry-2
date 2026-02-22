---
name: builder
description: "@coltorapps/builder 라이브러리 사용 가이드. headless, type-safe 동적 폼 빌더 구축 시 사용합니다. Attribute 정의, Entity 설계, Schema 구조, Builder/Interpreter Store, React 바인딩, 검증 아키텍처 등의 패턴을 다룹니다. 동적 폼이나 페이지 빌더 관련 작업에서 트리거됩니다."
license: MIT
metadata:
  author: coltorapps
  version: "1.0.0"
---

# @coltorapps/builder Skill

## Overview

`@coltorapps/builder`는 headless, type-safe 동적 폼 빌더 라이브러리입니다. 코어 패키지(`@coltorapps/builder`)와 React 바인딩(`@coltorapps/builder-react`)으로 구성되며, Zod 기반 검증, 스키마 관리, 빌더/인터프리터 Store 패턴을 제공합니다.

## When to Apply

- `@coltorapps/builder` 또는 `@coltorapps/builder-react` 패키지를 사용하는 코드 작성/리뷰 시
- 동적 폼 빌더, 페이지 빌더, 설문 빌더 등을 구축할 때
- Attribute, Entity, Schema, Builder/Interpreter Store 관련 코드 작업 시
- 폼 값 검증 및 서버 제출 로직 구현 시

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
- [attr-zod-validation](rules/attr-zod-validation.md) — Zod 스키마로 validate 메서드 작성
- [attr-atomic-design](rules/attr-atomic-design.md) — 독립적이고 재사용 가능한 Attribute 설계
- [attr-transform-awareness](rules/attr-transform-awareness.md) — 변환 적용 시점 이해
- [attr-context-usage](rules/attr-context-usage.md) — validation context로 cross-entity 인식
- [attr-error-types](rules/attr-error-types.md) — 일관된 에러 타입으로 UI 처리 통일

### 2. Entity Design (CRITICAL)
- [entity-attribute-composition](rules/entity-attribute-composition.md) — Atomic attribute 배열로 entity 구성
- [entity-relationship-constraints](rules/entity-relationship-constraints.md) — parentRequired, childrenAllowed 설정
- [entity-conditional-processing](rules/entity-conditional-processing.md) — shouldBeProcessed로 동적 가시성
- [entity-attribute-extensions](rules/entity-attribute-extensions.md) — attributesExtensions로 상호의존 검증
- [entity-default-values](rules/entity-default-values.md) — defaultValue와 타입 정합성

### 3. Schema Architecture (HIGH)
- [schema-structure](rules/schema-structure.md) — 올바른 { entities, root } 구조
- [schema-hierarchy](rules/schema-hierarchy.md) — parent-child 관계 설계
- [schema-validate-shape](rules/schema-validate-shape.md) — 동기적 구조 검증용 validateSchemaShape
- [schema-custom-validation](rules/schema-custom-validation.md) — builder 레벨 비즈니스 규칙 검증

### 4. Builder Store Patterns (HIGH)
- [store-react-hook](rules/store-react-hook.md) — useBuilderStore 훅 사용
- [store-event-handling](rules/store-event-handling.md) — store 이벤트 구독으로 반응형 업데이트
- [store-entity-operations](rules/store-entity-operations.md) — addEntity/deleteEntity/cloneEntity 등 CRUD
- [store-initial-data](rules/store-initial-data.md) — initialData로 기존 스키마 로드
- [store-selective-rerender](rules/store-selective-rerender.md) — useBuilderStoreData의 shouldUpdate로 성능 최적화

### 5. Interpreter & Form Filling (MEDIUM-HIGH)
- [interp-store-setup](rules/interp-store-setup.md) — useInterpreterStore 설정과 이벤트 핸들러
- [interp-value-management](rules/interp-value-management.md) — setEntityValue/resetEntityValue/clearEntityValue 구분
- [interp-default-values](rules/interp-default-values.md) — initialEntitiesValuesWithDefaults 동작 이해
- [interp-selective-rerender](rules/interp-selective-rerender.md) — useInterpreterStoreData의 shouldUpdate로 성능 최적화
- [interp-entities-values-hook](rules/interp-entities-values-hook.md) — useInterpreterEntitiesValues로 값 접근

### 6. React Integration (MEDIUM)
- [react-entity-components](rules/react-entity-components.md) — createEntityComponent로 타입 안전 entity 렌더링
- [react-attribute-components](rules/react-attribute-components.md) — createAttributeComponent로 타입 안전 attribute 편집
- [react-builder-entities](rules/react-builder-entities.md) — BuilderEntities 컴포넌트맵 + render props
- [react-interpreter-entities](rules/react-interpreter-entities.md) — InterpreterEntities로 폼 렌더링
- [react-client-directive](rules/react-client-directive.md) — "use client" 지시어 필요성

### 7. Validation Architecture (MEDIUM)
- [validation-server-schema](rules/validation-server-schema.md) — 서버에서 반드시 validateSchema 호출
- [validation-server-values](rules/validation-server-values.md) — 서버에서 반드시 validateEntitiesValues 호출
- [validation-client-before-submit](rules/validation-client-before-submit.md) — 서버 전송 전 클라이언트 검증
- [validation-error-handling](rules/validation-error-handling.md) — discriminated union 결과 처리

### 8. Advanced Patterns (LOW-MEDIUM)
- [advanced-factory-pattern](rules/advanced-factory-pattern.md) — 환경별 builder 생성 팩토리
- [advanced-dnd-integration](rules/advanced-dnd-integration.md) — dnd-kit과 builder store 연동
- [advanced-custom-ids](rules/advanced-custom-ids.md) — generateEntityId/validateEntityId 커스텀

## How to Use

이 스킬은 `@coltorapps/builder` 관련 코드를 작성하거나 리뷰할 때 자동으로 활성화됩니다. 전체 가이드는 [AGENTS.md](AGENTS.md)를 참조하세요.
