# FSD-027 세그먼트/필터 시스템 Phase 1: Prisma 스키마 + 공유 패키지

## Overview
세그먼트/필터 시스템의 기반을 구축한다. 연락처를 속성, 행동, 디바이스, 다른 세그먼트 등 다양한 조건으로 그룹화하여 설문 대상을 정밀하게 타겟팅할 수 있는 기반 인프라를 마련한다.

기존 Survey 모델의 `segment Json?` 필드를 정규화된 Segment 모델로 대체하여, 세그먼트를 독립적으로 관리하고 여러 설문에서 재사용할 수 있게 했다. 또한 필터 트리 조작 및 평가 로직을 `@inquiry/shared-segment` 공유 패키지로 분리하여 서버/클라이언트 양쪽에서 일관되게 사용할 수 있도록 했다.

## Changed Files

### Prisma 스키마
- `packages/db/prisma/schema.prisma` — Segment 모델 추가, Survey.segment Json? → Survey.segmentId FK 변경, Environment에 segments 관계 추가

### 공유 패키지 (신규 생성)
- `packages/shared-segment/package.json` — 패키지 설정 (@inquiry/shared-segment)
- `packages/shared-segment/tsconfig.json` — TypeScript 프로젝트 참조 설정
- `packages/shared-segment/tsconfig.lib.json` — 라이브러리 빌드 설정
- `packages/shared-segment/src/index.ts` — barrel export
- `packages/shared-segment/src/types.ts` — FilterItem, FilterOperator 등 핵심 타입 정의
- `packages/shared-segment/src/operators.ts` — 연산자 매핑 (문자열/숫자/날짜별 연산자 목록)
- `packages/shared-segment/src/date-utils.ts` — 날짜 유틸리티 (subtractTimeUnit, startOfDay 등)
- `packages/shared-segment/src/filter-utils.ts` — 필터 트리 조작 순수 함수 13개
- `packages/shared-segment/src/evaluate-segment.ts` — 세그먼트 평가 엔진 (필터 트리 → boolean)

### 루트 설정
- `tsconfig.json` — shared-segment 프로젝트 참조 추가

## Major Changes

### 1. Segment 모델 (Prisma)
```prisma
model Segment {
  id            String   @id @default(cuid())
  title         String
  description   String?
  isPrivate     Boolean  @default(true)
  filters       Json     @default("[]")
  environmentId String

  environment Environment @relation(...)
  surveys     Survey[]

  @@unique([environmentId, title])
  @@index([environmentId])
  @@map("segments")
}
```
- Environment에 속하며, 같은 환경 내에서 title이 유니크하다
- `filters` JSON 필드에 FilterItem[] 트리 구조를 저장한다
- Survey와 1:N 관계 (하나의 세그먼트를 여러 설문에서 재사용)

### 2. 필터 타입 시스템 (types.ts)
22종의 연산자를 4개 리소스 유형(attribute, person, segment, device)에 매핑한다. FilterItem은 재귀 구조로 중첩 그룹을 지원하며, AND/OR 커넥터로 조건을 결합한다.

### 3. 필터 트리 조작 함수 (filter-utils.ts)
13개 순수 함수로 필터 트리를 불변(immutable)하게 조작한다:
- `createEmptyFilter` / `findFilterById` — 생성/검색
- `addFilterBelow` / `deleteFilter` / `moveFilter` — CRUD
- `createGroupFromFilter` / `toggleConnector` — 그룹화/연결자 토글
- `updateFilter` / `resetFilterForResource` — 업데이트/리셋
- `getFilterDepth` / `countFilters` / `flattenFilters` — 트리 분석
- `isFilterComplete` — 유효성 검사

### 4. 세그먼트 평가 엔진 (evaluate-segment.ts)
필터 트리를 재귀적으로 순회하여 연락처 속성 맵에 대해 boolean 결과를 반환한다. 세그먼트 간 순환참조를 방지하기 위해 segmentChecker 콜백을 외부에서 주입받는 설계를 채택했다.

## How to use it

### 타입 import
```typescript
import type { FilterItem, FilterOperator } from '@inquiry/shared-segment';
```

### 필터 트리 조작
```typescript
import { createEmptyFilter, addFilterBelow, deleteFilter } from '@inquiry/shared-segment';

// 새 필터 생성
const filter = createEmptyFilter('filter-1');

// 필터 아래에 추가
const updated = addFilterBelow([filter], 'filter-1', createEmptyFilter('filter-2'));
```

### 세그먼트 평가
```typescript
import { evaluateFilters } from '@inquiry/shared-segment';

const filters: FilterItem[] = [
  { id: '1', connector: 'and', resource: 'attribute', operator: 'equals', attributeKey: 'country', filterType: 'string', value: 'KR' }
];

const result = evaluateFilters(filters, { country: 'KR' }); // true
```

## Related Components/Modules
- `packages/db` — Prisma 스키마 및 클라이언트 생성
- `packages/survey-builder-config` — 동일 패턴의 공유 패키지 참조
- Survey 모델 — segmentId FK로 Segment와 연결
- Environment 모델 — segments 관계 추가

## Precautions
- DB 마이그레이션은 아직 실행하지 않음 (Phase 2에서 진행 예정)
- 기존 Survey.segment Json? 필드가 segmentId String?로 변경되었으므로, 기존 데이터가 있다면 마이그레이션 스크립트에서 데이터 이관 필요
- person 리소스 타입은 향후 행동 데이터 통합 시 구현 예정 (현재 항상 true 반환)
- evaluate-segment의 segmentChecker 콜백은 서버 서비스에서 구현해야 함
