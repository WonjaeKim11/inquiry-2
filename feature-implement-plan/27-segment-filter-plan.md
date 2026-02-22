# 기능 구현 계획: 세그먼트 필터 (Segment Filter)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 우선순위 | 설명 |
|---------|--------|---------|------|
| FN-027-01 | 세그먼트 데이터 모델 | 필수 | Segment 엔티티 정의. environmentId 기반 소속, filters를 JSON 배열로 저장, 환경+제목 유니크 제약 |
| FN-027-02 | Attribute 필터 | 필수 | 연락처 속성(ContactAttribute) 기반 필터링. string/number/date 타입별 연산자 제한 |
| FN-027-03 | Person 필터 | 필수 | userId 기반 연락처 필터링. 문자열 연산자만 허용 |
| FN-027-04 | Segment 필터 | 필수 | 다른 세그먼트 포함/미포함 기반 필터링. 순환 참조 방지 필수 |
| FN-027-05 | Device 필터 | 필수 | phone/desktop 디바이스 유형 기반 필터링 |
| FN-027-06 | 연산자 체계 | 필수 | 기본 6종 + 문자열 4종 + 존재 2종 + 날짜 8종 + 세그먼트 2종 = 총 22개 연산자 |
| FN-027-07 | 재귀적 필터 트리 | 필수 | AND/OR 논리 커넥터로 연결된 재귀적 중첩 그룹 구조. short-circuit 평가 |
| FN-027-08 | 순환 참조 방지 | 필수 | Segment 필터에서 직접/간접 순환 참조를 재귀적으로 탐지하여 차단 |
| FN-027-09 | Private/Public 세그먼트 관리 | 필수 | Private(설문 전용, upsert) / Public(재사용 가능, 명시적 생성) 구분 |
| FN-027-10 | 세그먼트 CRUD | 필수 | 생성/조회/수정/삭제/복제(Clone)/리셋(Reset) 6종 API |
| FN-027-11 | DB 쿼리 변환 | 필수 | 필터 트리를 Prisma where 조건으로 변환. 날짜 하위 호환성(날짜 컬럼 + ISO 문자열 OR) |
| FN-027-12 | 필터 조작 유틸리티 | 필수 | 13개 유틸리티 함수 (필터 추가/삭제/이동/그룹화/연산자 변경 등) |
| FN-027-13 | 날짜 유틸리티 | 필수 | 6개 날짜 유틸 함수. UTC 기준 처리 |

### 1.2 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 성능 | SDK 런타임에서 세그먼트 실시간 평가. 요청 단위 중복 제거 캐싱 적용 |
| 보안 | Enterprise 라이선스 + contacts feature flag 필수. Organization Owner/Manager 권한 제한 |
| 가용성 | 순환 참조 탐지로 무한 루프 방지 |
| 데이터 무결성 | 환경 ID + 제목 유니크 제약 |
| 하위 호환성 | 날짜 필터 DB 쿼리에서 날짜 컬럼과 ISO 문자열 값 모두 OR 지원 |

### 1.3 명세서 내 모호성 및 해석

| 항목 | 모호성 | 해석/결정 |
|------|--------|----------|
| Survey-Segment 관계 | 명세서에서 Segment-Survey N:N 관계를 언급하지만, 기존 Survey 모델(FSD-008)에서는 `segment`가 `Json?` 단일 필드로 정의됨 | 기존 Survey 모델의 `segment Json?` 필드를 `segmentId String?` FK로 변경한다. Segment 모델은 `surveys Survey[]` 관계를 가진다. N:N이 아닌 Survey가 하나의 Segment를 참조하는 1:N 관계로 해석한다. Private 세그먼트가 surveyId를 제목으로 사용하여 1:1로 동작하는 점을 고려하면, 이 구현이 명세서의 의도에 부합한다. |
| Enterprise 라이선스 검증 방식 | 라이선스/feature flag 검증의 구체적인 구현 방법이 미명시 | FSD-029(구독/빌링) 구현 전까지는 환경변수 `CONTACTS_ENABLED` 플래그로 제어한다. NestJS Guard로 구현하여 API 진입 시점에 검증한다. |
| SDK 런타임 세그먼트 평가 | SDK 측 실시간 평가 구현의 범위 및 위치가 불명확 | SDK 런타임은 FSD-007(SDK/Widget/GTM)에서 구현한다. 본 구현에서는 서버 측 세그먼트 평가 엔진(evaluateSegment 함수)을 구현하고, 이를 공유 패키지에 배치하여 SDK에서도 활용 가능하도록 한다. |
| 필터 조작 유틸리티 위치 | 서버/클라이언트 어디에 배치할지 불명확 | 필터 조작 유틸리티는 클라이언트 UI에서 필터 편집 시 사용되므로 `packages/shared` 패키지에 배치한다. 서버에서도 필터 구조 검증에 일부 유틸리티를 활용할 수 있다. |
| 복제 제목 번호 증가 로직 | "동일 패턴의 기존 복제본 수에 따라 증가"의 구체적인 알고리즘 미명시 | `Copy of {원본 제목}` 패턴의 기존 세그먼트를 DB에서 조회하여 개수를 확인하고, `Copy of {원본 제목} ({개수+1})` 형식으로 생성한다. |
| 연결된 설문 존재 시 Public 세그먼트 삭제 방지 | "연결된 설문이 있으면 삭제 불가"라고 명시되나, Private 세그먼트에는 이 규칙이 적용되는지 불명확 | Private 세그먼트는 BR-09-05에 따라 "설문 삭제 시 함께 삭제"된다. 따라서 연결 설문 삭제 방지 규칙은 Public 세그먼트에만 적용한다. Private 세그먼트는 Survey의 cascade 삭제로 처리한다. |
| Contact 모델 선행 의존 | Segment가 Contact 속성 기반 필터링을 하지만 Contact 모델은 아직 미구현 | FSD-026(연락처 관리)이 본 기능의 직접 선행 의존이다. Contact, ContactAttributeKey, ContactAttribute 모델이 구현되어 있어야 DB 쿼리 변환이 동작한다. 본 구현 계획에서는 Contact/ContactAttributeKey/ContactAttribute 모델이 이미 존재한다고 가정한다. 미구현 상태라면 최소 스키마를 함께 추가한다. |
| 페이지네이션 | 세그먼트 목록 조회 시 페이지네이션 방식이 미명시 | 기존 프로젝트 패턴을 따라 cursor 기반 페이지네이션을 사용한다. 세그먼트 수가 적을 것으로 예상되므로 초기에는 전체 조회로 구현하고, 추후 필요시 페이지네이션을 추가한다. |

### 1.4 암시적 요구사항

| 항목 | 설명 |
|------|------|
| Prisma 스키마 확장 | Segment 모델 추가, Survey 모델에 segmentId FK 추가, Contact/ContactAttributeKey/ContactAttribute 모델 존재 확인 |
| 서버 라이브러리 생성 | `libs/server/segment/` NestJS 모듈 생성 (SegmentModule, SegmentController, SegmentService, FilterQueryService 등) |
| 공유 패키지 확장 | `packages/shared/` 에 필터 유틸리티, 날짜 유틸리티, 필터 타입 정의, 세그먼트 평가 엔진 배치 |
| 클라이언트 라이브러리 생성 | `libs/client/segment/` 세그먼트 관련 컴포넌트, 훅 라이브러리 생성 |
| Feature Flag Guard | Enterprise 라이선스 및 contacts feature flag 검증 가드 구현 |
| 권한 가드 재사용 | OrgRoleGuard를 활용한 Organization Owner/Manager 권한 검증 |
| DTO 유효성 검증 | 세그먼트 관련 Create/Update DTO 클래스 생성 (class-validator) |
| 클라이언트 zod 스키마 | 필터 편집기 폼 검증용 zod 스키마 정의 |
| DB 마이그레이션 | Segment 모델 추가 및 Survey 모델 변경 후 마이그레이션 실행 |
| 감사 로그 연동 | 세그먼트 CRUD 시 AuditLogService.log() 호출 |
| i18n 번역 키 | 세그먼트 관리 UI의 모든 사용자 대면 문자열을 i18next로 관리 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
[클라이언트 (Next.js 16)]
  apps/client/src/app/[lng]/
    └── segments/
        ├── page.tsx                         -- 세그먼트 목록 페이지
        ├── new/
        │   └── page.tsx                     -- 세그먼트 생성 페이지
        └── [segmentId]/
            └── edit/
                └── page.tsx                 -- 세그먼트 편집 페이지

  libs/client/segment/
    ├── src/
    │   ├── index.ts
    │   └── lib/
    │       ├── hooks/
    │       │   ├── use-segments.ts          -- 세그먼트 목록 조회 훅
    │       │   ├── use-segment.ts           -- 세그먼트 단건 조회/수정 훅
    │       │   └── use-segment-mutations.ts -- 생성/삭제/복제/리셋 훅
    │       ├── api/
    │       │   └── segment-api.ts           -- apiFetch 기반 API 클라이언트
    │       ├── components/
    │       │   ├── segment-list.tsx          -- 세그먼트 목록 컴포넌트
    │       │   ├── segment-form.tsx          -- 세그먼트 제목/설명 폼
    │       │   ├── filter-editor.tsx         -- 필터 트리 편집기 (핵심 UI)
    │       │   ├── filter-item.tsx           -- 개별 필터 항목 렌더링
    │       │   ├── filter-group.tsx          -- 그룹 노드 렌더링 (재귀)
    │       │   ├── filter-type-selector.tsx  -- 필터 유형 선택 드롭다운
    │       │   ├── operator-selector.tsx     -- 연산자 선택 드롭다운
    │       │   ├── value-input.tsx           -- 필터 값 입력 (타입별)
    │       │   ├── connector-toggle.tsx      -- AND/OR 커넥터 토글
    │       │   └── delete-segment-dialog.tsx -- 삭제 확인 모달
    │       ├── schemas/
    │       │   └── segment-form.schema.ts   -- zod 폼 검증 스키마
    │       └── types/
    │           └── segment.types.ts         -- 클라이언트 타입 정의

[서버 (NestJS 11)]
  libs/server/segment/
    ├── src/
    │   ├── index.ts
    │   └── lib/
    │       ├── segment.module.ts            -- NestJS 모듈
    │       ├── segment.controller.ts        -- REST API 컨트롤러
    │       ├── segment.service.ts           -- 핵심 비즈니스 로직 (CRUD, 순환 참조 탐지)
    │       ├── filter-query.service.ts      -- 필터 트리 -> Prisma where 변환
    │       ├── dto/
    │       │   ├── create-segment.dto.ts    -- 세그먼트 생성 DTO
    │       │   ├── update-segment.dto.ts    -- 세그먼트 수정 DTO
    │       │   └── segment-query.dto.ts     -- 목록 조회 쿼리 DTO
    │       ├── guards/
    │       │   └── contacts-feature.guard.ts -- Enterprise + contacts feature flag 가드
    │       └── validators/
    │           └── filter-tree.validator.ts  -- 필터 트리 구조 유효성 검증

[공유 패키지]
  packages/shared/
    └── src/
        └── segment/
            ├── types.ts                     -- 필터 타입 정의 (FilterItem, FilterResource 등)
            ├── operators.ts                 -- 연산자 enum 및 타입별 매핑
            ├── filter-utils.ts              -- 13개 필터 조작 유틸리티 함수
            ├── date-utils.ts                -- 6개 날짜 유틸리티 함수
            └── evaluate-segment.ts          -- 세그먼트 평가 엔진 (순수 함수)

[데이터베이스 (PostgreSQL + Prisma 7)]
  packages/db/prisma/schema.prisma           -- Segment 모델 추가, Survey 모델 수정
```

**데이터 흐름:**

```
[Client: 필터 편집기]
    |
    ├── (필터 조작) filter-utils → 로컬 상태 변경
    ├── (저장 요청) → POST/PUT /segments
    |                      |
    |                      v
    |               [서버: SegmentController]
    |                      |
    |                      v
    |               [JwtAuthGuard + ContactsFeatureGuard + OrgRoleGuard]
    |                      |
    |                      v
    |               [SegmentService]
    |                      |
    |                      ├── 필터 검증 (FilterTreeValidator)
    |                      ├── 순환 참조 탐지 (재귀 DFS)
    |                      ├── CRUD → Prisma → PostgreSQL
    |                      └── 감사 로그 → AuditLogService (fire-and-forget)
    |
[SDK 런타임 / 서버 내부]
    |
    └── (세그먼트 평가) → FilterQueryService.buildWhereClause(filters) → Prisma where 조건
                          또는
                          evaluateSegment(filters, contactData) → boolean
```

### 2.2 데이터 모델

**신규 Prisma 모델: Segment**

```prisma
/// 세그먼트 - 연락처를 속성, 행동, 디바이스 등의 조건에 따라 그룹화한 논리적 집합
model Segment {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  title         String
  description   String?
  isPrivate     Boolean  @default(true)
  filters       Json     @default("[]")  // FilterItem[] - 재귀적 필터 트리 JSON
  environmentId String

  environment Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)
  surveys     Survey[]

  @@unique([environmentId, title])
  @@index([environmentId])
  @@map("segments")
}
```

**기존 Survey 모델 수정:**

```prisma
model Survey {
  // ... 기존 필드 유지

  // 세그먼트 관계 변경: Json? -> FK 참조
  segmentId String?

  segment Segment? @relation(fields: [segmentId], references: [id], onDelete: SetNull)

  // 기존 segment Json? 필드 제거
  // segment Json? -- 삭제
}
```

**기존 Environment 모델 수정:**

```prisma
model Environment {
  // ... 기존 필드 유지
  segments Segment[]  // 신규 관계 추가
}
```

**선행 의존 모델 (FSD-026에서 구현 가정):**

```prisma
/// 연락처
model Contact {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  environmentId String

  environment Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)
  attributes  ContactAttribute[]

  @@index([environmentId])
  @@map("contacts")
}

/// 연락처 속성 키 정의
model ContactAttributeKey {
  id            String   @id @default(cuid())
  key           String   // safe identifier: ^[a-z][a-z0-9_]*$
  name          String?
  description   String?
  type          String   // "default" | "custom"
  dataType      String   @default("string") // "string" | "number" | "date"
  isUnique      Boolean  @default(false)
  environmentId String

  environment Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)
  attributes  ContactAttribute[]

  @@unique([key, environmentId])
  @@map("contact_attribute_keys")
}

/// 연락처 속성 값
model ContactAttribute {
  id                     String    @id @default(cuid())
  value                  String    // 문자열 형태 (하위 호환성)
  numberValue            Float?
  dateValue              DateTime?
  contactId              String
  contactAttributeKeyId  String

  contact       Contact             @relation(fields: [contactId], references: [id], onDelete: Cascade)
  attributeKey  ContactAttributeKey @relation(fields: [contactAttributeKeyId], references: [id], onDelete: Cascade)

  @@unique([contactId, contactAttributeKeyId])
  @@index([contactAttributeKeyId, value])
  @@index([contactAttributeKeyId, numberValue])
  @@index([contactAttributeKeyId, dateValue])
  @@map("contact_attributes")
}
```

### 2.3 API 설계

**엔드포인트 설계:**

| 메서드 | 경로 | 설명 | 권한 | 요청 본문 | 응답 |
|--------|------|------|------|----------|------|
| POST | `/api/segments` | 세그먼트 생성 | Owner/Admin | CreateSegmentDto | 201, Segment |
| GET | `/api/segments?environmentId={id}` | 환경별 세그먼트 목록 | Owner/Admin/Member | - | 200, Segment[] |
| GET | `/api/segments/:segmentId` | 세그먼트 단건 조회 | Owner/Admin/Member | - | 200, Segment |
| PUT | `/api/segments/:segmentId` | 세그먼트 수정 | Owner/Admin | UpdateSegmentDto | 200, Segment |
| DELETE | `/api/segments/:segmentId` | 세그먼트 삭제 | Owner/Admin | - | 204 |
| POST | `/api/segments/:segmentId/clone` | 세그먼트 복제 | Owner/Admin | - | 201, Segment |
| POST | `/api/segments/:segmentId/reset` | 세그먼트 리셋 | Owner/Admin | - | 200, Segment |

**DTO 정의:**

```typescript
// create-segment.dto.ts
export class CreateSegmentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  isPrivate: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  filters: FilterItemDto[];

  @IsString()
  @IsNotEmpty()
  environmentId: string;
}

// update-segment.dto.ts
export class UpdateSegmentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  filters?: FilterItemDto[];
}
```

**에러 응답 형식 (기존 프로젝트 패턴):**

```typescript
// 400 Bad Request - 유효성 검증 실패
{ statusCode: 400, message: "필터 구조가 유효하지 않습니다", error: "Bad Request" }

// 404 Not Found
{ statusCode: 404, message: "세그먼트를 찾을 수 없습니다", error: "Not Found" }

// 409 Conflict - 유니크 제약 위반
{ statusCode: 409, message: "동일 환경에 동일 이름의 세그먼트가 이미 존재합니다", error: "Conflict" }

// 409 Conflict - 삭제 제한
{ statusCode: 409, message: "설문에 연결된 세그먼트는 삭제할 수 없습니다", error: "Conflict" }

// 400 Bad Request - 순환 참조
{ statusCode: 400, message: "재귀적 세그먼트 필터는 허용되지 않습니다", error: "Bad Request" }
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 공유 패키지: 필터 타입 정의 (`packages/shared/src/segment/types.ts`)

```typescript
// 논리 커넥터
export type FilterConnector = 'and' | 'or' | null;

// 필터 유형
export type FilterType = 'attribute' | 'person' | 'segment' | 'device';

// 디바이스 유형
export type DeviceType = 'phone' | 'desktop';

// 시간 단위
export type TimeUnit = 'days' | 'weeks' | 'months' | 'years';

// 기본 연산자
export type BaseOperator = 'equals' | 'notEquals' | 'lessThan' | 'lessEqual' | 'greaterThan' | 'greaterEqual';

// 문자열 연산자
export type StringOperator = 'equals' | 'notEquals' | 'contains' | 'doesNotContain' | 'startsWith' | 'endsWith' | 'isSet' | 'isNotSet';

// 숫자 연산자
export type NumberOperator = 'equals' | 'notEquals' | 'lessThan' | 'lessEqual' | 'greaterThan' | 'greaterEqual' | 'isSet' | 'isNotSet';

// 날짜 연산자
export type DateOperator = 'isOlderThan' | 'isNewerThan' | 'isBefore' | 'isAfter' | 'isBetween' | 'isSameDay' | 'isSet' | 'isNotSet';

// 세그먼트 연산자
export type SegmentOperator = 'userIsIn' | 'userIsNotIn';

// 디바이스 연산자
export type DeviceOperator = 'equals' | 'notEquals';

// 날짜 값 (상대 날짜용)
export interface RelativeDateValue {
  value: number;
  unit: TimeUnit;
}

// 날짜 범위 값
export interface DateRangeValue {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}

// 필터 리소스 (리프 노드)
export interface AttributeFilterResource {
  type: 'attribute';
  attributeKey: string;
  operator: StringOperator | NumberOperator | DateOperator;
  value?: string | number | RelativeDateValue | DateRangeValue;
}

export interface PersonFilterResource {
  type: 'person';
  personIdentifier: 'userId';
  operator: StringOperator;
  value?: string;
}

export interface SegmentFilterResource {
  type: 'segment';
  segmentId: string;
  operator: SegmentOperator;
}

export interface DeviceFilterResource {
  type: 'device';
  deviceType: DeviceType;
  operator: DeviceOperator;
}

export type LeafFilterResource =
  | AttributeFilterResource
  | PersonFilterResource
  | SegmentFilterResource
  | DeviceFilterResource;

// 필터 항목 (재귀 구조)
export interface FilterItem {
  id: string;
  connector: FilterConnector;
  resource: LeafFilterResource | FilterItem[]; // 리프 노드 또는 그룹 노드
}
```

#### 2.4.2 공유 패키지: 연산자 매핑 (`packages/shared/src/segment/operators.ts`)

```typescript
// 데이터 타입별 허용 연산자 매핑
export const OPERATORS_BY_DATA_TYPE = {
  string: ['equals', 'notEquals', 'contains', 'doesNotContain', 'startsWith', 'endsWith', 'isSet', 'isNotSet'],
  number: ['equals', 'notEquals', 'lessThan', 'lessEqual', 'greaterThan', 'greaterEqual', 'isSet', 'isNotSet'],
  date: ['isOlderThan', 'isNewerThan', 'isBefore', 'isAfter', 'isBetween', 'isSameDay', 'isSet', 'isNotSet'],
} as const;

// 값이 불필요한 연산자
export const VALUE_LESS_OPERATORS = ['isSet', 'isNotSet'] as const;
```

#### 2.4.3 서버: 순환 참조 탐지 알고리즘

```typescript
/**
 * 순환 참조를 재귀적으로 탐지한다.
 * DFS로 참조 체인을 순회하며, 방문 세트에 현재 세그먼트가 이미 존재하면 순환으로 판정한다.
 *
 * @param currentSegmentId - 현재 저장/수정 중인 세그먼트 ID
 * @param filters - 검증할 필터 트리
 * @param visited - 이미 방문한 세그먼트 ID 집합
 * @throws BadRequestException 순환 참조 발견 시
 */
async detectCircularReference(
  currentSegmentId: string,
  filters: FilterItem[],
  visited: Set<string> = new Set()
): Promise<void> {
  // 1. 현재 세그먼트를 방문 목록에 추가
  visited.add(currentSegmentId);

  // 2. 필터 트리에서 모든 segment 유형 필터의 segmentId를 추출
  const referencedIds = this.extractSegmentReferences(filters);

  for (const refId of referencedIds) {
    // 3. 직접/간접 순환 참조 확인
    if (visited.has(refId)) {
      throw new BadRequestException('재귀적 세그먼트 필터는 허용되지 않습니다');
    }

    // 4. 참조된 세그먼트의 필터를 조회하여 재귀적으로 탐지
    const referencedSegment = await this.prisma.segment.findUnique({
      where: { id: refId },
      select: { filters: true },
    });

    if (referencedSegment) {
      await this.detectCircularReference(
        currentSegmentId,
        referencedSegment.filters as FilterItem[],
        new Set(visited) // 경로별 독립적인 방문 세트 유지
      );
    }
  }
}
```

#### 2.4.4 서버: DB 쿼리 변환 (`FilterQueryService`)

```typescript
/**
 * 필터 트리를 Prisma where 조건 객체로 변환한다.
 * AND/OR 커넥터를 기반으로 Prisma의 AND/OR 배열로 매핑한다.
 *
 * @param filters - 필터 트리
 * @returns Prisma where 조건 객체
 */
buildWhereClause(filters: FilterItem[]): Record<string, unknown> {
  if (filters.length === 0) return {}; // 빈 필터 = 전체 포함

  // AND 블록별로 필터를 그룹화
  const orGroups: FilterItem[][] = [];
  let currentAndBlock: FilterItem[] = [];

  for (const filter of filters) {
    if (filter.connector === 'or') {
      orGroups.push(currentAndBlock);
      currentAndBlock = [filter];
    } else {
      currentAndBlock.push(filter);
    }
  }
  orGroups.push(currentAndBlock);

  // OR 그룹을 Prisma OR 배열로 변환
  const orConditions = orGroups.map(andBlock => {
    const andConditions = andBlock.map(item => this.buildFilterCondition(item));
    return andConditions.length === 1 ? andConditions[0] : { AND: andConditions };
  });

  return orConditions.length === 1 ? orConditions[0] : { OR: orConditions };
}
```

### 2.5 기존 시스템 영향 분석

| 영향 대상 | 변경 유형 | 설명 |
|----------|----------|------|
| `packages/db/prisma/schema.prisma` | 수정 | Segment 모델 추가, Survey.segmentId FK 추가, Environment.segments 관계 추가 |
| `apps/server/src/app/app.module.ts` | 수정 | SegmentModule import 추가 |
| Survey 관련 코드 | 수정 | segment Json? 필드를 segmentId FK로 변경. 설문 생성/수정 시 Private 세그먼트 upsert 연동 |
| Environment 관련 코드 | 수정 | Environment 삭제 시 Segment Cascade 삭제 확인 |
| `packages/shared/` | 확장 | segment 관련 타입, 유틸리티, 평가 엔진 추가 |
| i18n 번역 파일 | 수정 | 세그먼트 관리 UI 번역 키 추가 (ko/en) |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|----------|
| T-01 | 공유 타입 정의 | `packages/shared/src/segment/types.ts` - FilterItem, FilterResource 등 모든 타입 정의 | - | 중 | 2h |
| T-02 | 연산자 매핑 정의 | `packages/shared/src/segment/operators.ts` - 데이터 타입별 연산자 enum, 매핑 테이블 | T-01 | 낮 | 1h |
| T-03 | 날짜 유틸리티 구현 | `packages/shared/src/segment/date-utils.ts` - 6개 날짜 유틸 함수 (UTC 기반) | - | 낮 | 1.5h |
| T-04 | 필터 조작 유틸리티 구현 | `packages/shared/src/segment/filter-utils.ts` - 13개 필터 조작 함수 | T-01 | 높 | 4h |
| T-05 | 세그먼트 평가 엔진 구현 | `packages/shared/src/segment/evaluate-segment.ts` - 필터 트리 런타임 평가 순수 함수 | T-01, T-02, T-03 | 높 | 3h |
| T-06 | Prisma 스키마 추가 | Segment 모델, Survey.segmentId FK, Environment.segments 관계 추가 | - | 중 | 1.5h |
| T-07 | DB 마이그레이션 실행 | `npx prisma migrate dev` 실행 및 검증 | T-06 | 낮 | 0.5h |
| T-08 | Feature Flag Guard 구현 | `libs/server/segment/guards/contacts-feature.guard.ts` - Enterprise + contacts 검증 | - | 중 | 1.5h |
| T-09 | 필터 트리 검증기 구현 | `libs/server/segment/validators/filter-tree.validator.ts` - 서버 측 필터 구조 유효성 검증 | T-01, T-02 | 높 | 3h |
| T-10 | 세그먼트 DTO 정의 | Create/Update/Query DTO 클래스 (class-validator) | T-01 | 중 | 1.5h |
| T-11 | 세그먼트 서비스 구현 | `SegmentService` - CRUD, 순환 참조 탐지, 복제, 리셋 | T-06, T-09, T-10 | 높 | 5h |
| T-12 | 필터 쿼리 변환 서비스 구현 | `FilterQueryService` - 필터 트리 -> Prisma where 조건 변환 | T-01, T-02, T-03 | 높 | 4h |
| T-13 | 세그먼트 컨트롤러 구현 | REST API 7개 엔드포인트 | T-08, T-11 | 중 | 2.5h |
| T-14 | 세그먼트 모듈 구성 | `SegmentModule` 정의 및 AppModule 등록 | T-11, T-12, T-13 | 낮 | 0.5h |
| T-15 | 클라이언트 API 클라이언트 | `libs/client/segment/api/segment-api.ts` - apiFetch 기반 | T-13 | 낮 | 1h |
| T-16 | 클라이언트 zod 스키마 | `libs/client/segment/schemas/segment-form.schema.ts` | T-01 | 중 | 1.5h |
| T-17 | 세그먼트 목록 UI | 세그먼트 목록 페이지 + 컴포넌트 | T-15 | 중 | 3h |
| T-18 | 필터 편집기 UI | 핵심 필터 트리 편집기 (재귀 렌더링, 타입별 입력, 연산자 선택) | T-04, T-15, T-16 | 매우 높 | 8h |
| T-19 | 세그먼트 생성/편집 페이지 | 세그먼트 폼 + 필터 편집기 조합 | T-17, T-18 | 중 | 3h |
| T-20 | i18n 번역 키 추가 | ko/en 번역 파일에 세그먼트 관련 키 추가 | T-17, T-18, T-19 | 낮 | 1.5h |
| T-21 | 서버 단위 테스트 | SegmentService, FilterQueryService, 순환 참조 탐지, 필터 검증 테스트 | T-11, T-12 | 높 | 4h |
| T-22 | 공유 패키지 단위 테스트 | 필터 유틸리티, 날짜 유틸리티, 평가 엔진 테스트 | T-03, T-04, T-05 | 중 | 3h |
| T-23 | API 통합 테스트 | 7개 엔드포인트 통합 테스트 | T-14 | 중 | 3h |
| T-24 | Survey-Segment 연동 | Survey 생성/수정 시 Private 세그먼트 upsert 로직 연동 | T-11 | 중 | 2h |

**총 예상 시간: 약 57시간 (약 7~8일)**

### 3.2 구현 순서 및 마일스톤

**마일스톤 1: 공유 패키지 기반 (T-01 ~ T-05)**
- 목표: 서버/클라이언트 공통 타입, 유틸리티, 평가 엔진 완성
- 검증: 단위 테스트 통과 (T-22)
- 예상 기간: 1.5일

```
T-01 (타입) ──┐
              ├── T-02 (연산자) ──┐
T-03 (날짜)  ─┤                   ├── T-05 (평가 엔진)
              └── T-04 (필터 유틸)
```

**마일스톤 2: DB 스키마 및 서버 기반 (T-06 ~ T-14)**
- 목표: Segment CRUD API 완성, 필터 검증 및 쿼리 변환 동작
- 검증: API 통합 테스트 통과 (T-23), 서버 단위 테스트 통과 (T-21)
- 예상 기간: 3일

```
T-06 (스키마) ── T-07 (마이그레이션) ──┐
                                        ├── T-11 (서비스) ──┐
T-08 (가드) ────────────────────────────┤                   ├── T-13 (컨트롤러) ── T-14 (모듈)
T-09 (검증기) ──────────────────────────┤                   │
T-10 (DTO) ─────────────────────────────┘                   │
                                                             │
T-12 (쿼리 변환) ───────────────────────────────────────────┘
```

**마일스톤 3: 클라이언트 UI (T-15 ~ T-20)**
- 목표: 세그먼트 관리 UI 완성 (목록, 생성, 편집, 필터 편집기)
- 검증: UI에서 세그먼트 CRUD + 필터 편집 동작 확인
- 예상 기간: 2.5일

```
T-15 (API 클라이언트) ──┐
                         ├── T-17 (목록 UI) ──┐
T-16 (zod 스키마) ───────┤                     ├── T-19 (생성/편집 페이지) ── T-20 (i18n)
                         └── T-18 (필터 편집기)┘
```

**마일스톤 4: 연동 및 테스트 (T-21 ~ T-24)**
- 목표: Survey-Segment 연동, 전체 테스트 완료
- 검증: E2E 시나리오 통과 (세그먼트 생성 -> 설문 연결 -> 필터 평가)
- 예상 기간: 1.5일

```
T-21 (서버 테스트) ──┐
T-22 (공유 테스트) ──┼── 최종 검증
T-23 (통합 테스트) ──┤
T-24 (Survey 연동) ──┘
```

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|----------|----------|
| `packages/db/prisma/schema.prisma` | 수정 | Segment 모델 추가, Survey.segmentId FK 추가, Environment.segments 관계 추가 |
| `packages/shared/src/segment/types.ts` | 생성 | FilterItem, FilterResource, 연산자 타입 등 공유 타입 정의 |
| `packages/shared/src/segment/operators.ts` | 생성 | 데이터 타입별 연산자 매핑, VALUE_LESS_OPERATORS 등 |
| `packages/shared/src/segment/date-utils.ts` | 생성 | subtractTimeUnit, addTimeUnit, startOfDay, endOfDay, isSameDay, toUTCDateString |
| `packages/shared/src/segment/filter-utils.ts` | 생성 | 13개 필터 조작 유틸리티 함수 |
| `packages/shared/src/segment/evaluate-segment.ts` | 생성 | 세그먼트 필터 트리 평가 엔진 (순수 함수) |
| `packages/shared/src/index.ts` | 수정 | segment 관련 export 추가 |
| `libs/server/segment/src/index.ts` | 생성 | 퍼블릭 API export |
| `libs/server/segment/src/lib/segment.module.ts` | 생성 | SegmentModule 정의 |
| `libs/server/segment/src/lib/segment.controller.ts` | 생성 | 7개 API 엔드포인트 |
| `libs/server/segment/src/lib/segment.service.ts` | 생성 | CRUD, 순환 참조 탐지, 복제, 리셋 비즈니스 로직 |
| `libs/server/segment/src/lib/filter-query.service.ts` | 생성 | 필터 트리 -> Prisma where 조건 변환 |
| `libs/server/segment/src/lib/dto/create-segment.dto.ts` | 생성 | 생성 DTO (class-validator) |
| `libs/server/segment/src/lib/dto/update-segment.dto.ts` | 생성 | 수정 DTO (class-validator) |
| `libs/server/segment/src/lib/dto/segment-query.dto.ts` | 생성 | 조회 쿼리 DTO |
| `libs/server/segment/src/lib/guards/contacts-feature.guard.ts` | 생성 | Enterprise + contacts feature flag 검증 가드 |
| `libs/server/segment/src/lib/validators/filter-tree.validator.ts` | 생성 | 필터 트리 구조/유효성 검증 |
| `libs/server/segment/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/server/segment/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/segment/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `apps/server/src/app/app.module.ts` | 수정 | SegmentModule import 추가 |
| `libs/client/segment/src/index.ts` | 생성 | 퍼블릭 API export |
| `libs/client/segment/src/lib/api/segment-api.ts` | 생성 | apiFetch 기반 API 클라이언트 |
| `libs/client/segment/src/lib/hooks/use-segments.ts` | 생성 | 세그먼트 목록 조회 훅 |
| `libs/client/segment/src/lib/hooks/use-segment.ts` | 생성 | 세그먼트 단건 조회/수정 훅 |
| `libs/client/segment/src/lib/hooks/use-segment-mutations.ts` | 생성 | 생성/삭제/복제/리셋 mutation 훅 |
| `libs/client/segment/src/lib/components/segment-list.tsx` | 생성 | 세그먼트 목록 테이블 컴포넌트 |
| `libs/client/segment/src/lib/components/segment-form.tsx` | 생성 | 제목/설명 입력 폼 |
| `libs/client/segment/src/lib/components/filter-editor.tsx` | 생성 | 필터 트리 편집기 (핵심 UI 컴포넌트) |
| `libs/client/segment/src/lib/components/filter-item.tsx` | 생성 | 개별 필터 항목 렌더링 |
| `libs/client/segment/src/lib/components/filter-group.tsx` | 생성 | 재귀적 그룹 노드 렌더링 |
| `libs/client/segment/src/lib/components/filter-type-selector.tsx` | 생성 | 필터 유형(attribute/person/segment/device) 선택 |
| `libs/client/segment/src/lib/components/operator-selector.tsx` | 생성 | 데이터 타입별 연산자 선택 드롭다운 |
| `libs/client/segment/src/lib/components/value-input.tsx` | 생성 | 필터 값 입력 (문자열/숫자/날짜/날짜범위) |
| `libs/client/segment/src/lib/components/connector-toggle.tsx` | 생성 | AND/OR 커넥터 토글 버튼 |
| `libs/client/segment/src/lib/components/delete-segment-dialog.tsx` | 생성 | 삭제 확인 다이얼로그 |
| `libs/client/segment/src/lib/schemas/segment-form.schema.ts` | 생성 | zod 폼 검증 스키마 |
| `libs/client/segment/src/lib/types/segment.types.ts` | 생성 | 클라이언트 전용 타입 정의 |
| `libs/client/segment/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/client/segment/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/client/segment/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `apps/client/src/app/[lng]/segments/page.tsx` | 생성 | 세그먼트 목록 페이지 |
| `apps/client/src/app/[lng]/segments/new/page.tsx` | 생성 | 세그먼트 생성 페이지 |
| `apps/client/src/app/[lng]/segments/[segmentId]/edit/page.tsx` | 생성 | 세그먼트 편집 페이지 |
| `apps/client/public/locales/ko/segment.json` | 생성 | 한국어 번역 (세그먼트 UI) |
| `apps/client/public/locales/en/segment.json` | 생성 | 영어 번역 (세그먼트 UI) |
| `tsconfig.base.json` | 수정 | `@inquiry/server-segment`, `@inquiry/client-segment` 경로 별칭 추가 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 확률 | 완화 전략 |
|--------|------|------|----------|
| Contact/ContactAttributeKey 모델 미존재 | DB 쿼리 변환 서비스가 동작 불가. Attribute 필터의 DB 조회 구현 불가 | 높음 (FSD-026 미구현 상태) | FSD-026 구현 전에는 Segment CRUD + 필터 구조 검증까지만 구현하고, DB 쿼리 변환(T-12)은 Contact 모델 최소 스키마를 함께 추가하거나 FSD-026 완료 후 구현한다. 인터페이스만 먼저 정의하여 교체 비용을 최소화한다. |
| Survey.segment Json? -> segmentId FK 마이그레이션 | 기존 Survey 데이터에 segment Json 값이 존재하면 마이그레이션 복잡도 증가 | 중간 (현재 Survey가 미구현이므로 데이터 없을 가능성 높음) | Survey 모델이 아직 실제 데이터가 없으므로 스키마 변경만으로 충분하다. 데이터 존재 시 마이그레이션 스크립트로 Json 값을 Segment 레코드로 변환 후 FK 참조로 전환한다. |
| 필터 편집기 UI 복잡도 | 재귀적 필터 트리 편집기는 프론트엔드에서 가장 복잡한 컴포넌트. 상태 관리 및 UX가 까다로움 | 높음 | filter-utils.ts의 유틸리티 함수가 불변성을 보장하는 순수 함수로 구현되어 상태 관리를 단순화한다. React 상태는 최상위 FilterEditor에서만 관리하고, 하위 컴포넌트는 콜백을 통해 변경을 전파한다. 단계적으로 기본 필터 타입(attribute, person)부터 구현 후 고급 타입(segment, device)을 추가한다. |
| 순환 참조 탐지 성능 | 세그먼트 간 참조 깊이가 깊으면 재귀적 DB 조회 비용이 증가 | 낮음 (세그먼트 수가 적을 것으로 예상) | 재귀 탐지 시 방문 세트를 사용하여 이미 검증한 세그먼트를 재방문하지 않는다. 필요 시 참조 깊이 제한(예: 최대 10단계)을 추가한다. |
| Enterprise 라이선스 시스템 미구현 | ContactsFeatureGuard가 실제 라이선스 검증을 수행할 수 없음 | 높음 (FSD-029 미구현) | 환경변수 `CONTACTS_ENABLED=true/false` 플래그로 대체한다. FSD-029 구현 후 실제 라이선스 검증 로직으로 교체한다. Guard 인터페이스는 동일하게 유지하여 교체 비용을 최소화한다. |
| 필터 쿼리 변환 정확성 | 날짜 필터의 하위 호환성(날짜 컬럼 + ISO 문자열 OR), isBetween 범위 경계 등 엣지 케이스 | 중간 | 각 연산자별 단위 테스트를 작성하여 경계 조건을 명시적으로 검증한다. 날짜 관련 테스트에서 타임존 차이로 인한 오류를 방지하기 위해 모든 테스트 날짜를 UTC로 고정한다. |

---

## 5. 테스트 전략

### 5.1 단위 테스트

**공유 패키지 테스트 (`packages/shared/src/segment/__tests__/`):**

| 테스트 파일 | 대상 | 주요 테스트 케이스 |
|------------|------|------------------|
| `date-utils.spec.ts` | 날짜 유틸리티 | subtractTimeUnit (days/weeks/months/years), addTimeUnit, startOfDay (00:00:00.000Z), endOfDay (23:59:59.999Z), isSameDay (같은 날/다른 날/경계), toUTCDateString |
| `filter-utils.spec.ts` | 필터 조작 유틸리티 | addFilterBelow (올바른 위치 삽입), createGroupFromFilter (그룹 래핑), moveFilter (순서 변경 + 첫 번째 커넥터 null 보정), deleteFilter (삭제 + 빈 그룹 자동 정리), toggleConnector, isAdvancedSegment, isAttributeKeyUsed (재귀 검색) |
| `evaluate-segment.spec.ts` | 평가 엔진 | 빈 필터 = true, AND 조건 (전부 충족/하나 미충족), OR 조건 (하나 충족/전부 미충족), 중첩 그룹, 각 연산자별 평가, 각 필터 유형별 평가, short-circuit 동작 확인 |
| `operators.spec.ts` | 연산자 매핑 | 데이터 타입별 허용 연산자 확인, VALUE_LESS_OPERATORS 확인 |

**서버 단위 테스트 (`libs/server/segment/src/lib/__tests__/`):**

| 테스트 파일 | 대상 | 주요 테스트 케이스 |
|------------|------|------------------|
| `segment.service.spec.ts` | SegmentService | 생성 (유효한 입력/유니크 위반/필터 검증 실패), 수정 (제목 변경/필터 변경), 삭제 (연결 설문 없음/연결 설문 있음 거부), 복제 (제목 자동 생성/번호 증가), 리셋 (필터 빈 배열로 초기화), 순환 참조 탐지 (직접/간접/깊은 체인) |
| `filter-query.service.spec.ts` | FilterQueryService | 빈 필터 -> {}, Attribute 필터 (string equals/contains/startsWith, number lessThan/greaterEqual, date isOlderThan/isBetween/isSameDay), Person 필터, Device 필터, AND/OR 조합, 중첩 그룹, isSet/isNotSet, 날짜 하위 호환성 (OR 조건) |
| `filter-tree.validator.spec.ts` | FilterTreeValidator | 유효한 필터 트리 통과, 첫 번째 커넥터 non-null 에러, 알 수 없는 필터 유형 에러, Attribute 연산자-타입 불일치, Person 필터 잘못된 필드, Device 필터 잘못된 유형, Segment 필터 유효성, 빈 배열 통과, 중첩 그룹 재귀 검증 |

### 5.2 통합 테스트

**API 통합 테스트 (`libs/server/segment/src/lib/__tests__/segment.integration.spec.ts`):**

| 시나리오 | 설명 |
|---------|------|
| 세그먼트 생성 성공 | POST /api/segments + 유효한 입력 -> 201 + Segment 반환 |
| 유니크 제약 위반 | 동일 환경+제목으로 2번 생성 -> 409 |
| 순환 참조 탐지 | 세그먼트 A 생성 -> 세그먼트 B(A 참조) 생성 -> 세그먼트 A 수정(B 참조) -> 400 |
| 목록 조회 | GET /api/segments?environmentId=xxx -> 해당 환경 세그먼트만 반환 |
| 삭제 성공/실패 | 연결 설문 없는 세그먼트 삭제 -> 204, 연결 설문 있는 세그먼트 삭제 -> 409 |
| 복제 | POST /api/segments/:id/clone -> 201 + "Copy of {원본}" 제목 |
| 리셋 | POST /api/segments/:id/reset -> 200 + filters: [] |
| 인증 없이 접근 | Authorization 헤더 없이 요청 -> 401 |
| 권한 부족 | MEMBER 역할로 생성 시도 -> 403 |

### 5.3 E2E 테스트 (수동 검증)

| 시나리오 | 검증 항목 |
|---------|----------|
| Public 세그먼트 전체 흐름 | 세그먼트 생성 -> Attribute 필터 추가 (string equals) -> AND 조건 추가 -> Person 필터 추가 -> 저장 -> 목록 확인 -> 편집 -> 삭제 |
| 필터 편집기 조작 | 필터 추가 -> 그룹 생성 -> 커넥터 토글 -> 필터 이동 -> 필터 삭제 -> 빈 그룹 자동 정리 확인 |
| 순환 참조 방지 | 세그먼트 A -> 세그먼트 필터로 B 참조 -> 세그먼트 B -> 세그먼트 필터로 A 참조 시도 -> 에러 메시지 표시 |
| Private 세그먼트 | 설문 생성 시 Private 세그먼트 자동 생성 -> 설문 편집에서 필터 수정 -> 설문 삭제 시 세그먼트도 삭제됨 |
| Device/Segment 필터 | Device 필터 (phone/desktop) 추가 -> Segment 필터 (다른 세그먼트 참조) 추가 -> 저장 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 설명 |
|------|------|
| Contact 모델 선행 의존 | DB 쿼리 변환(FilterQueryService)은 Contact/ContactAttributeKey/ContactAttribute 모델이 존재해야 동작한다. FSD-026이 미구현이면 쿼리 변환 부분은 인터페이스만 정의하고 실제 구현은 보류한다. |
| Enterprise 라이선스 검증 | 실제 라이선스 시스템(FSD-029)이 구현될 때까지 환경변수 플래그로 대체한다. |
| SDK 런타임 평가 | 서버 측 평가 엔진은 구현하지만, SDK에서의 실시간 평가는 FSD-007 범위이다. |
| 세그먼트 통계/분석 | 명세서의 제외 범위. 세그먼트에 포함된 연락처 수 표시 등은 미구현. |
| 캐싱 | NFR-S04의 요청 단위 중복 제거 캐싱은 초기 구현에서는 적용하지 않는다. 성능 이슈 발생 시 NestJS Interceptor 기반으로 추가한다. |
| 필터 트리 깊이 제한 | 명세서에 재귀 깊이 제한이 없으나, 안전을 위해 향후 최대 깊이(예: 5단계)를 설정할 수 있다. |

### 6.2 향후 개선 가능성

| 항목 | 설명 |
|------|------|
| 세그먼트 기반 자동 알림 | 세그먼트 조건 변화 시 알림 발송 (명세서 제외 범위, 향후 확장 가능) |
| 세그먼트 통계 대시보드 | 세그먼트별 포함 연락처 수, 변화 추이 등 분석 기능 |
| 세그먼트 내보내기 | 세그먼트에 포함된 연락처를 CSV로 내보내기 |
| 실시간 미리보기 | 필터 편집 중 해당 조건에 매칭되는 연락처 수를 실시간으로 표시 |
| 필터 템플릿 | 자주 사용하는 필터 조합을 템플릿으로 저장/재사용 |
| 배치 평가 최적화 | 대량 연락처에 대한 세그먼트 평가 시 배치 처리 및 캐싱 최적화 |
| Person 필터 필드 확장 | 현재 userId만 지원하나, email 등 추가 필드 지원 가능 |
| 필터 재귀 깊이 제한 | 무한 중첩 방지를 위한 최대 깊이 설정 |

---

## 7. i18n 고려사항 (클라이언트 UI 변경)

### 7.1 추가할 번역 키 목록

**네임스페이스: `segment`**

```json
{
  "title": "세그먼트",
  "list": {
    "title": "세그먼트 관리",
    "empty": "생성된 세그먼트가 없습니다",
    "createNew": "새 세그먼트 만들기",
    "publicTab": "공개 세그먼트",
    "privateTab": "비공개 세그먼트"
  },
  "form": {
    "title": "세그먼트 제목",
    "titlePlaceholder": "세그먼트 이름을 입력하세요",
    "description": "설명",
    "descriptionPlaceholder": "세그먼트 설명을 입력하세요 (선택)",
    "create": "세그먼트 생성",
    "save": "저장",
    "cancel": "취소"
  },
  "filter": {
    "addFilter": "필터 추가",
    "addGroup": "그룹으로 만들기",
    "removeFilter": "필터 삭제",
    "moveUp": "위로 이동",
    "moveDown": "아래로 이동",
    "and": "AND",
    "or": "OR",
    "selectType": "필터 유형 선택",
    "selectOperator": "연산자 선택",
    "enterValue": "값 입력",
    "types": {
      "attribute": "속성",
      "person": "사용자",
      "segment": "세그먼트",
      "device": "디바이스"
    },
    "operators": {
      "equals": "같음",
      "notEquals": "같지 않음",
      "lessThan": "미만",
      "lessEqual": "이하",
      "greaterThan": "초과",
      "greaterEqual": "이상",
      "contains": "포함",
      "doesNotContain": "미포함",
      "startsWith": "시작 문자열",
      "endsWith": "끝 문자열",
      "isSet": "값 설정됨",
      "isNotSet": "값 미설정",
      "isOlderThan": "이전",
      "isNewerThan": "이내",
      "isBefore": "이전 날짜",
      "isAfter": "이후 날짜",
      "isBetween": "사이",
      "isSameDay": "같은 날",
      "userIsIn": "포함됨",
      "userIsNotIn": "미포함됨"
    },
    "timeUnits": {
      "days": "일",
      "weeks": "주",
      "months": "월",
      "years": "년"
    },
    "device": {
      "phone": "모바일",
      "desktop": "데스크톱"
    },
    "person": {
      "userId": "사용자 ID"
    },
    "selectSegment": "세그먼트 선택",
    "selectAttribute": "속성 선택",
    "emptyFilters": "필터가 없습니다. 모든 연락처가 포함됩니다."
  },
  "actions": {
    "clone": "복제",
    "reset": "필터 리셋",
    "delete": "삭제"
  },
  "dialogs": {
    "deleteTitle": "세그먼트 삭제",
    "deleteMessage": "이 세그먼트를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.",
    "deleteConfirm": "삭제",
    "deleteCancel": "취소",
    "resetTitle": "필터 리셋",
    "resetMessage": "모든 필터가 제거됩니다. 계속하시겠습니까?",
    "resetConfirm": "리셋",
    "resetCancel": "취소"
  },
  "errors": {
    "notFound": "세그먼트를 찾을 수 없습니다",
    "duplicateTitle": "동일 환경에 동일 이름의 세그먼트가 이미 존재합니다",
    "circularReference": "재귀적 세그먼트 필터는 허용되지 않습니다",
    "linkedSurvey": "설문에 연결된 세그먼트는 삭제할 수 없습니다",
    "invalidFilter": "필터 구조가 유효하지 않습니다",
    "featureDisabled": "이 기능은 Enterprise 라이선스가 필요합니다"
  },
  "toast": {
    "createSuccess": "세그먼트가 생성되었습니다",
    "updateSuccess": "세그먼트가 수정되었습니다",
    "deleteSuccess": "세그먼트가 삭제되었습니다",
    "cloneSuccess": "세그먼트가 복제되었습니다",
    "resetSuccess": "필터가 리셋되었습니다"
  }
}
```

### 7.2 번역 키 영어 버전

위와 동일한 구조로 `en/segment.json`에 영어 번역을 제공한다. 주요 키 예시:

```json
{
  "title": "Segments",
  "list": {
    "title": "Segment Management",
    "empty": "No segments created",
    "createNew": "Create New Segment"
  },
  "filter": {
    "addFilter": "Add Filter",
    "operators": {
      "equals": "Equals",
      "notEquals": "Not Equals",
      "contains": "Contains",
      "isSet": "Is Set",
      "isNotSet": "Is Not Set",
      "userIsIn": "User Is In",
      "userIsNotIn": "User Is Not In"
    }
  },
  "errors": {
    "circularReference": "Recursive segment filters are not allowed",
    "linkedSurvey": "Cannot delete a segment linked to surveys"
  }
}
```
