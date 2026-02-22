> **@coltorapps/builder 기반 재작성 (2026-02-22)**

# 기능 구현 계획: 응답 관리 및 부분 응답 (FS-021)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 우선순위 | 설명 |
|---------|--------|---------|------|
| FN-035-01 | 응답 카드 뷰 | 높음 | 개별 응답을 카드 형태(헤더/바디/풋터)로 렌더링. 연락처 정보, 질문별 응답, 태그, 메타데이터 표시 |
| FN-035-02 | 응답 테이블 뷰 | 높음 | TanStack Table 기반 테이블 렌더링. 열 순서 변경, 가시성 설정, 행 선택, 무한 스크롤 |
| FN-035-03 | 응답 메타데이터 표시 | 중간 | source, URL, browser, OS, device, country, action, IP 등 아이콘+툴팁 |
| FN-035-04 | 부분 응답 처리 및 시각화 | 높음 | Completed/Skipped/Aborted 상태 판별 및 그룹화 시각화 |
| FN-035-05 | 질문별 TTC 추적 | 중간 | 질문별 응답 소요 시간(ms) 추적, `_total` 키 합산 |
| FN-035-06 | 응답 삭제 | 높음 | 완료 응답 즉시 삭제, 미완료 응답 5분 대기 규칙, Quota 차감 옵션 |
| FN-035-07 | 응답 생성 및 업데이트 | 높음 | 신규 응답 생성(finished=false 시작), 부분 응답 업데이트(data/ttc 병합). **@coltorapps/builder의 `useInterpreterStore`로 응답 수집 런타임 구동** |
| FN-036-01 | 응답 필터링 시스템 | 높음 | 22가지 연산자 + 다양한 필터 기준(완료 상태, 질문 응답, 태그, 메타데이터 등), AND 조합 |
| FN-036-02 | 태그 관리 시스템 | 중간 | Environment 단위 태그 생성, 응답-태그 연결/제거, 검색, 2초 하이라이트 |

### 1.2 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 성능 | 페이지네이션 기반 10건 단위 로딩, 무한 스크롤 추가 로딩 |
| 보안 | 읽기 전용 사용자(readOnly)는 태그 편집/응답 삭제 차단. IP 주소는 관리자 화면에서만 확인 |
| 데이터 정합성 | 태그 작업 동시 실행 방지, Quota 차감 옵션으로 정합성 유지 |
| 실시간성 | 부분 응답은 마지막 업데이트 시간 기준 상태 실시간 반영 |

### 1.3 명세서 내 모호성 및 해석

| 항목 | 모호성 | 해석/결정 |
|------|--------|----------|
| Contact 모델 참조 | 명세서의 Contact 모델(5.1절)은 userId, attributes만 정의하지만, FS-026에서는 Contact + ContactAttributeKey + ContactAttributeValue 3테이블 구조 | FS-026의 정규화된 Contact 모델을 사용한다. Response는 contactId FK로 Contact를 참조하며, contactAttributes는 Contact의 속성 값을 런타임에 조합하여 반환한다 |
| 권한 모델 | "Survey Manager"와 "Project Member (Read)"를 언급하지만 현재 MembershipRole은 OWNER/ADMIN/MEMBER | Survey Manager = OWNER/ADMIN, Project Member Read = MEMBER로 매핑한다. 삭제/태그 편집은 OWNER/ADMIN만, 조회는 MEMBER 이상 |
| singleUseId 컬럼 | Response 모델에 singleUseId(UNIQUE) 필드가 정의되어 있으나, 일회성 링크 기능(FS-017)은 별도 명세 | 스키마에 필드를 포함하되, 실제 single-use 로직은 FS-017 구현 시 통합한다 |
| 필터링 서버/클라이언트 | 필터 적용 주체(서버 vs 클라이언트)가 명시되지 않음 | 서버 사이드 필터링을 기본으로 한다. 필터 조건을 query parameter(JSON)로 전달하고, 서버에서 Prisma WHERE 절로 변환하여 적용한다 |
| 무한 스크롤 vs 페이지네이션 | 카드 뷰는 "스크롤하여 추가 로딩", 테이블 뷰는 "무한 스크롤"이라 명시. 두 뷰의 구현 방식 차이 불명확 | 카드 뷰: 커서 기반 페이지네이션(Load More 버튼), 테이블 뷰: Intersection Observer 기반 무한 스크롤. 서버 API는 동일한 페이지네이션 엔드포인트를 공유 |
| Display 모델 관계 | Response.displayId가 Display를 FK 참조하지만 Display 모델은 FS-024에서 스텁만 정의 | FS-024의 Display 스텁 모델을 그대로 사용한다. displayId는 nullable FK로 설정하며, Display CRUD는 별도 기능 범위 |
| 응답 업데이트 API 인증 | "불필요 (공개 설문) 또는 SDK 인증"이라 명시. 두 경로의 구분 기준 불명확 | Client API(FS-024)의 인증 미필요 엔드포인트로 구현한다. environmentId 기반 스코핑으로 데이터 접근을 제한한다 |
| 테이블 뷰 열 설정 지속성 | "열 순서와 가시성 설정이 유지된다"라고만 명시. localStorage/서버 저장 여부 불명확 | localStorage에 surveyId 기반 키로 열 설정을 저장한다. 서버 사이드 저장은 후속 개선 |
| 필터링 시 ResponseData | 질문별 응답 데이터 필터링이 JSON 필드 내부 쿼리를 필요로 함 | Prisma의 `path` 기반 JSON 필터를 사용한다. PostgreSQL의 JSONB 연산자를 활용하되, 복잡한 조건은 `$queryRaw`로 처리한다 |
| **응답 데이터 구조와 builder 스키마** | builder의 `entitiesValues`는 `{ [entityId]: value }` flat map이고, 명세서의 `data`는 `Record<string, ResponseValue>`. 동일 구조인지 확인 필요 | **동일한 flat map 구조**이다. builder의 entityId가 곧 질문 ID이며, `interpreterStore.validateEntitiesValues().data`의 결과를 그대로 `Response.data` 필드에 저장한다 |

### 1.4 암시적 요구사항

| 항목 | 설명 |
|------|------|
| Prisma 스키마 확장 | Response 모델을 스텁에서 완전 모델로 확장. Tag, ResponseTag 신규 모델 추가 |
| 서버 라이브러리 생성 | `libs/server/response/` NestJS 모듈 (ResponseModule, ResponseService, ResponseFilterService, ResponseController) |
| 태그 서버 라이브러리 | `libs/server/tag/` NestJS 모듈 (TagModule, TagService, TagController) |
| 클라이언트 라이브러리 생성 | `libs/client/response/` (응답 카드 뷰, 테이블 뷰, 필터 UI, 태그 관리 컴포넌트, hooks) |
| **@coltorapps/builder 패키지 설치** | `@coltorapps/builder` (core), `@coltorapps/builder-react` (React 바인딩) 설치 필요 |
| **Survey Builder 정의** | `packages/survey-builder/`에 surveyBuilder + Entity 정의 (openText, rating 등) + validate/defaultValue/shouldBeProcessed 구현 |
| TanStack Table 설치 | `@tanstack/react-table` 패키지 설치 필요 (테이블 뷰) |
| dnd-kit 설치 | `@dnd-kit/core`, `@dnd-kit/sortable` 열 순서 변경용 |
| Contact 모듈 연동 | Response 조회 시 Contact + ContactAttributeValue 조인 필요 |
| 응답 생성/업데이트 API (Client API) | Client API 모듈에 응답 생성/업데이트 엔드포인트 추가 |
| 응답 조회/삭제 API (Management API) | JWT 인증 기반 내부 API로 응답 조회/삭제 |
| **서버 사이드 검증 (validateEntitiesValues)** | `@coltorapps/builder`의 `validateEntitiesValues()`를 서버에서 호출하여 이중 검증 |
| i18n 번역 키 | 응답 관리 UI의 모든 라벨, 에러 메시지, 필터 연산자 텍스트 번역 |
| DB 마이그레이션 | Response 모델 확장 + Tag, ResponseTag 생성 마이그레이션 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

**기존 계획 대비 @coltorapps/builder 도입으로 변경되는 아키텍처:**

```
[응답자 (Browser)]
    |
    |  *** @coltorapps/builder-react 기반 응답 수집 ***
    |  useInterpreterStore(surveyBuilder, surveySchema, { initialData })
    |  --> InterpreterEntities로 설문 렌더링
    |  --> interpreterStore.validateEntitiesValues() (클라이언트 검증)
    |  --> 검증 통과 시 API 호출
    |
    POST /api/environments/:envId/responses      -- 응답 생성 (인증 불필요)
    PUT /api/responses/:responseId                -- 응답 업데이트 (인증 불필요)
    |
    v
[libs/server/response/]
    |  *** @coltorapps/builder (core) 서버 사이드 검증 ***
    |  validateEntitiesValues(values, surveyBuilder, schema)
    |  --> 검증 통과 시 DB 저장
    |
    ├── response.module.ts
    ├── response.controller.ts          -- 관리자용 조회/삭제 API (JWT 필수)
    ├── response-client.controller.ts   -- 응답자용 생성/업데이트 API (인증 불필요)
    ├── response.service.ts             -- 응답 CRUD 비즈니스 로직
    ├── response-filter.service.ts      -- 22가지 연산자 필터 변환 엔진
    ├── dto/
    │   ├── create-response.dto.ts
    │   ├── update-response.dto.ts
    │   ├── response-query.dto.ts
    │   └── response-filter.dto.ts
    └── types/
        └── response.types.ts

[libs/server/tag/]
    ├── tag.module.ts
    ├── tag.controller.ts               -- 태그 CRUD + 응답-태그 연결/제거
    ├── tag.service.ts
    └── dto/
        ├── create-tag.dto.ts
        └── tag-query.dto.ts

[packages/survey-builder/]  *** 신규: builder 정의 (서버/클라이언트 공유) ***
    ├── src/
    │   ├── index.ts                    -- surveyBuilder export
    │   ├── builder.ts                  -- createBuilder({ entities })
    │   ├── entities/
    │   │   ├── open-text.entity.ts     -- createEntity({ name, attributes, validate, defaultValue })
    │   │   ├── rating.entity.ts
    │   │   ├── multiple-choice.entity.ts
    │   │   ├── nps.entity.ts
    │   │   └── ... (질문 타입별 Entity)
    │   └── attributes/
    │       ├── headline.attribute.ts   -- createAttribute({ name, validate(z.string()) })
    │       ├── required.attribute.ts
    │       ├── placeholder.attribute.ts
    │       └── ... (공통 속성)

[libs/client/response/]
    ├── components/
    │   ├── survey-interpreter.tsx      *** 신규: useInterpreterStore 기반 설문 응답 수집 ***
    │   ├── response-card.tsx           -- 카드 뷰 단일 카드
    │   ├── response-card-list.tsx      -- 카드 뷰 목록 (Load More)
    │   ├── response-table.tsx          -- TanStack Table 기반 테이블 뷰
    │   ├── response-metadata.tsx       -- 메타데이터 아이콘/툴팁
    │   ├── response-filter-bar.tsx     -- 필터 조건 UI
    │   ├── response-tag-manager.tsx    -- 태그 추가/삭제/검색 UI
    │   ├── partial-response-viz.tsx    -- 스킵/중단 그룹 시각화
    │   ├── delete-response-dialog.tsx  -- 삭제 확인 다이얼로그
    │   └── response-view-toggle.tsx    -- 카드/테이블 뷰 전환
    ├── interpreters/                   *** 신규: Entity별 Interpreter 컴포넌트 ***
    │   ├── open-text-interpreter.tsx   -- createEntityComponent(openTextEntity, ...)
    │   ├── rating-interpreter.tsx
    │   ├── multiple-choice-interpreter.tsx
    │   └── ...
    ├── hooks/
    │   ├── use-survey-interpreter.ts   *** 신규: useInterpreterStore + TTC + auto-save 래퍼 ***
    │   ├── use-responses.ts            -- 응답 목록 조회 (페이지네이션)
    │   ├── use-response-filter.ts      -- 필터 상태 관리
    │   ├── use-response-table.ts       -- TanStack Table 설정
    │   └── use-tags.ts                 -- 태그 CRUD hooks
    ├── api/
    │   └── response-api.ts             -- apiFetch 기반 API 클라이언트
    ├── utils/
    │   ├── skip-group.ts               -- 스킵/중단 그룹화 로직 (순수 함수)
    │   ├── response-value.ts           -- 유효 응답 값 판별 (순수 함수)
    │   └── filter-operators.ts         -- 필터 연산자 매핑
    └── types/
        └── response.types.ts

apps/client/src/app/[lng]/surveys/[surveyId]/
    ├── responses/
    │   └── page.tsx                    -- 응답 관리 페이지 (카드/테이블 뷰 전환)
    └── respond/
        └── page.tsx                    -- 설문 응답 페이지 (SurveyInterpreter 사용)
```

**@coltorapps/builder 기반 데이터 흐름 (기존 계획과의 핵심 차이):**

```
[응답자 브라우저]
    |
    |  (1) useInterpreterStore(surveyBuilder, surveySchema) 초기화
    |      - 부분 응답 복원: initialData.entitiesValues = 기존 저장된 data
    |      - defaultValue: Entity에 정의된 기본값으로 초기 상태 설정
    |      - shouldBeProcessed: 조건부 질문 자동 제외
    |
    |  (2) InterpreterEntities로 설문 폼 렌더링
    |      - 각 Entity별 Interpreter 컴포넌트가 value/setValue/error 수신
    |      - interpreterStore.setEntityValue()로 응답 값 설정
    |
    |  (3) TTC 추적 (use-survey-interpreter 훅 내부)
    |      - onEntityValueUpdated 이벤트 구독 -> 질문별 시간 측정
    |
    |  (4) 자동 저장 (부분 응답)
    |      - onEntityValueUpdated 이벤트 발생 시 debounce(2초)
    |      - useInterpreterEntitiesValues()로 현재 값 추출
    |      - PUT /api/responses/:id { data: entitiesValues, finished: false, ttc }
    |
    |  (5) 최종 제출
    |      - interpreterStore.validateEntitiesValues() (클라이언트 검증)
    |      - success일 때만 PUT /api/responses/:id { data: result.data, finished: true }
    |
    v
[서버 - ResponseService]
    |
    |  (6) 서버 사이드 이중 검증
    |      import { validateEntitiesValues } from "@coltorapps/builder";
    |      const result = validateEntitiesValues(data, surveyBuilder, schema);
    |      if (!result.success) throw BadRequest(result.entitiesErrors);
    |
    |  (7) DB 저장
    |      - create: Response { data: result.data, finished, ttc, meta, ... }
    |      - update: 기존 data와 병합 -> { ...existingData, ...newData }
    |
    v
[Survey Manager (관리 화면)]
    |
    ├── GET /api/surveys/:surveyId/responses?page=1&pageSize=10&filter={...}
    │     --> ResponseController.findAll() --> ResponseFilterService.buildWhere()
    │     --> 페이지네이션 조회 (Response + Contact + Tag join)
    |
    ├── DELETE /api/responses/:id?deductQuota=true
    │     --> 5분 규칙 검증 --> Quota 차감 --> 삭제
    |
    ├── POST /api/environments/:envId/tags { name }
    │     --> 중복 검사 --> 태그 생성
    |
    ├── POST /api/responses/:responseId/tags/:tagId
    │     --> ResponseTag 연결
    |
    └── DELETE /api/responses/:responseId/tags/:tagId
          --> ResponseTag 제거
```

### 2.2 데이터 모델

**Response 모델 (기존 스텁에서 완전 확장):**

```prisma
/// 설문 응답
model Response {
  id            String    @id @default(cuid())
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  surveyId      String
  environmentId String
  contactId     String?                       // FS-026 Contact FK (nullable)
  displayId     String?                       // FS-024 Display FK (nullable)
  finished      Boolean   @default(false)
  endingId      String?                       // Survey.endings JSON 내 Ending ID
  data          Json      @default("{}")      // { [entityId]: value } flat map
  variables     Json      @default("{}")      // Record<string, string | number>
  ttc           Json      @default("{}")      // Record<string, number> (ms 단위)
  meta          Json      @default("{}")      // ResponseMeta 구조
  singleUseId   String?   @unique             // 일회성 링크 ID (FS-017)
  language      String?                       // 응답 언어 코드

  // 관계
  survey          Survey          @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  environment     Environment     @relation(fields: [environmentId], references: [id], onDelete: Cascade)
  contact         Contact?        @relation(fields: [contactId], references: [id], onDelete: SetNull)
  display         Display?        @relation(fields: [displayId], references: [id], onDelete: SetNull)
  tags            ResponseTag[]
  responseQuotas  ResponseQuota[]             // FS-014에서 정의

  @@index([surveyId])
  @@index([surveyId, finished])
  @@index([environmentId])
  @@index([contactId])
  @@index([createdAt])
  @@map("responses")
}
```

**Tag 모델 (신규):**

```prisma
/// 응답 분류 태그 (Environment 단위 관리)
model Tag {
  id            String        @id @default(cuid())
  name          String
  environmentId String
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  environment   Environment   @relation(fields: [environmentId], references: [id], onDelete: Cascade)
  responses     ResponseTag[]

  @@unique([name, environmentId])
  @@index([environmentId])
  @@map("tags")
}
```

**ResponseTag 연결 모델 (신규):**

```prisma
/// Response-Tag 다대다 관계 연결 테이블
model ResponseTag {
  responseId  String
  tagId       String

  response    Response   @relation(fields: [responseId], references: [id], onDelete: Cascade)
  tag         Tag        @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([responseId, tagId])
  @@index([tagId])
  @@map("response_tags")
}
```

**기존 모델 관계 추가:**

```prisma
model Environment {
  // ... 기존 필드
  responses  Response[]
  tags       Tag[]
}

model Contact {
  // ... 기존 필드
  responses  Response[]
}

model Survey {
  // ... 기존 필드
  responses  Response[]
}
```

**@coltorapps/builder 관련 데이터 구조:**

응답 `data` 필드는 builder의 `entitiesValues`와 동일한 flat map 구조를 사용한다.

```typescript
// builder의 entitiesValues 구조와 DB 저장 구조가 동일
// { [entityId]: value }
{
  "entity-q1-open-text": "서울",
  "entity-q2-rating": 8,
  "entity-q3-multi-choice": ["A", "B"],
  "entity-q4-matrix": { "row1": "col2" }
}
```

`validateEntitiesValues()`의 반환값:
```typescript
// success 시
{ success: true, data: { "entity-q1": "서울", "entity-q2": 8 } }

// failure 시
{ success: false, entitiesErrors: { "entity-q1": "필수 항목입니다" } }
```

**ResponseMeta TypeScript 타입:**

```typescript
// packages/survey-builder/src/types/response.types.ts (서버/클라이언트 공유)

export interface ResponseMeta {
  source?: string | null;
  url?: string | null;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
  country?: string | null;
  action?: string | null;
  ipAddress?: string | null;
}

export type ResponseValue =
  | string
  | number
  | string[]
  | Record<string, string>
  | undefined;

export interface ResponseData {
  [entityId: string]: ResponseValue;
}

export interface ResponseTtc {
  [entityId: string]: number;
  _total?: number;
}

export type SkipGroupType = 'skipped' | 'aborted';

export interface SkipGroup {
  type: SkipGroupType;
  questionIds: string[];
}

export type ResponseStatus = 'finished' | 'in-progress';
```

### 2.3 API 설계

#### 2.3.1 응답 조회 (관리자용) -- 기존 계획과 동일

| 항목 | 내용 |
|------|------|
| Endpoint | `GET /api/surveys/:surveyId/responses` |
| 인증 | JWT 필수 (MEMBER 이상) |
| Guard | JwtAuthGuard + EnvironmentAccessGuard |

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| page | number | 선택 | 페이지 번호 (기본값: 1) |
| pageSize | number | 선택 | 페이지 크기 (기본값: 10, 최대: 100) |
| filter | string (JSON) | 선택 | 필터 조건 (FilterCriteria JSON 직렬화) |

**Response (200):**

```json
{
  "data": [
    {
      "id": "cuid2...",
      "createdAt": "2026-02-22T...",
      "updatedAt": "2026-02-22T...",
      "surveyId": "cuid2...",
      "displayId": null,
      "contact": { "id": "...", "attributes": {} },
      "contactAttributes": { "email": "user@example.com" },
      "finished": true,
      "endingId": null,
      "data": { "entity-q1": "서울", "entity-q2": 8 },
      "variables": { "score": 42 },
      "ttc": { "entity-q1": 3200, "entity-q2": 5000, "_total": 8200 },
      "tags": [{ "id": "...", "name": "VIP" }],
      "meta": { "browser": "Chrome", "os": "macOS", "device": "desktop" },
      "singleUseId": null,
      "language": "ko"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "pageSize": 10,
    "hasMore": true
  }
}
```

#### 2.3.2 응답 생성 (응답자용) -- @coltorapps/builder 검증 추가

| 항목 | 내용 |
|------|------|
| Endpoint | `POST /api/environments/:environmentId/responses` |
| 인증 | 불필요 (공개 설문) |

**Request Body:** `CreateResponseDto`

```json
{
  "surveyId": "cuid2...",
  "userId": "optional-user-id",
  "finished": false,
  "data": { "entity-q1": "서울" },
  "variables": {},
  "ttc": { "entity-q1": 3200 },
  "meta": { "source": "web", "browser": "Chrome" }
}
```

**서버 처리 핵심 (기존 대비 변경):**

```typescript
// response.service.ts - create()
async create(environmentId: string, dto: CreateResponseDto) {
  // 1. Survey 스키마 조회
  const survey = await this.prisma.survey.findUnique({
    where: { id: dto.surveyId },
    select: { schema: true, status: true },
  });

  // 2. @coltorapps/builder 서버 사이드 검증 (finished=true일 때만 전체 검증)
  if (dto.finished) {
    const result = validateEntitiesValues(
      dto.data,
      surveyBuilder,
      survey.schema as BuilderSchema,
    );
    if (!result.success) {
      throw new BadRequestException(result.entitiesErrors);
    }
    // 검증 통과한 data 사용
    dto.data = result.data;
  }

  // 3. DB 저장
  return this.prisma.response.create({
    data: {
      environmentId,
      surveyId: dto.surveyId,
      finished: dto.finished,
      data: dto.data,
      ttc: dto.ttc ?? {},
      variables: dto.variables ?? {},
      meta: dto.meta ?? {},
    },
  });
}
```

**Response (201):**

```json
{
  "id": "cuid2...",
  "createdAt": "2026-02-22T..."
}
```

#### 2.3.3 응답 업데이트 (응답자용) -- @coltorapps/builder 검증 추가

| 항목 | 내용 |
|------|------|
| Endpoint | `PUT /api/responses/:responseId` |
| 인증 | 불필요 (공개 설문) |

**Request Body:** `UpdateResponseDto`

```json
{
  "finished": true,
  "data": { "entity-q2": 8, "entity-q3": ["A", "B"] },
  "ttc": { "entity-q2": 5000, "entity-q3": 2000 },
  "variables": { "score": 42 },
  "meta": { "url": "https://example.com/survey" },
  "hiddenFields": { "utm_source": "email" },
  "endingId": "ending-1",
  "displayId": "display-cuid..."
}
```

**서버 처리 핵심 (기존 대비 변경):**

```typescript
// response.service.ts - update()
async update(responseId: string, dto: UpdateResponseDto) {
  const existing = await this.prisma.response.findUnique({
    where: { id: responseId },
    include: { survey: { select: { schema: true } } },
  });

  // 기존 data와 병합
  const mergedData = { ...(existing.data as object), ...dto.data };
  const mergedTtc = { ...(existing.ttc as object), ...dto.ttc };

  // finished=true로 전환 시 최종 검증
  if (dto.finished) {
    const result = validateEntitiesValues(
      mergedData,
      surveyBuilder,
      existing.survey.schema as BuilderSchema,
    );
    if (!result.success) {
      throw new BadRequestException(result.entitiesErrors);
    }
  }

  // _total 계산
  const ttcValues = Object.entries(mergedTtc)
    .filter(([key]) => key !== '_total');
  const total = ttcValues.reduce((sum, [, val]) => sum + (val as number), 0);
  (mergedTtc as any)['_total'] = total;

  return this.prisma.response.update({
    where: { id: responseId },
    data: {
      finished: dto.finished,
      data: mergedData,
      ttc: mergedTtc,
      variables: dto.variables
        ? { ...(existing.variables as object), ...dto.variables }
        : undefined,
      meta: dto.meta
        ? { ...(existing.meta as object), ...dto.meta }
        : undefined,
      endingId: dto.endingId,
      displayId: dto.displayId,
    },
  });
}
```

#### 2.3.4 응답 삭제 (관리자용) -- 기존 계획과 동일

| 항목 | 내용 |
|------|------|
| Endpoint | `DELETE /api/responses/:responseId` |
| 인증 | JWT 필수 (OWNER/ADMIN) |

#### 2.3.5 태그 CRUD -- 기존 계획과 동일

| 엔드포인트 | 메서드 | 설명 | 인증 |
|-----------|--------|------|------|
| `POST /api/environments/:envId/tags` | POST | 태그 생성 | JWT (OWNER/ADMIN) |
| `GET /api/environments/:envId/tags` | GET | 태그 목록 조회 | JWT (MEMBER 이상) |
| `DELETE /api/tags/:tagId` | DELETE | 태그 삭제 | JWT (OWNER/ADMIN) |
| `POST /api/responses/:responseId/tags/:tagId` | POST | 응답-태그 연결 | JWT (OWNER/ADMIN) |
| `DELETE /api/responses/:responseId/tags/:tagId` | DELETE | 응답-태그 제거 | JWT (OWNER/ADMIN) |

### 2.4 주요 컴포넌트 설계

#### 2.4.1 Survey Builder 정의 (신규 -- @coltorapps/builder 기반)

```typescript
// packages/survey-builder/src/builder.ts

import { createBuilder } from "@coltorapps/builder";
import { openTextEntity } from "./entities/open-text.entity";
import { ratingEntity } from "./entities/rating.entity";
import { multipleChoiceEntity } from "./entities/multiple-choice.entity";
import { npsEntity } from "./entities/nps.entity";
// ... 기타 Entity import

/**
 * Survey Builder 정의.
 * 서버와 클라이언트 양쪽에서 공유하여 사용한다.
 * - 클라이언트: useInterpreterStore()로 응답 수집 + validateEntitiesValues() 클라이언트 검증
 * - 서버: validateEntitiesValues()로 서버 사이드 이중 검증
 */
export const surveyBuilder = createBuilder({
  entities: [
    openTextEntity,
    ratingEntity,
    multipleChoiceEntity,
    npsEntity,
    // ... 기타 질문 타입 Entity
  ],
});
```

```typescript
// packages/survey-builder/src/entities/open-text.entity.ts

import { createEntity } from "@coltorapps/builder";
import { headlineAttribute } from "../attributes/headline.attribute";
import { requiredAttribute } from "../attributes/required.attribute";
import { placeholderAttribute } from "../attributes/placeholder.attribute";
import { z } from "zod";

/**
 * 개방형 텍스트 질문 Entity.
 * validate: 필수/선택 검증 + 문자열 타입 검증
 * defaultValue: undefined (미응답 상태)
 * shouldBeProcessed: 조건부 로직 엔진(FSD-012) 결과에 따라 표시 여부 결정
 */
export const openTextEntity = createEntity({
  name: "openText",
  attributes: [headlineAttribute, requiredAttribute, placeholderAttribute],

  defaultValue(context) {
    return undefined; // 미응답 상태
  },

  validate(value, context) {
    const isRequired = context.entity.attributes.required;

    if (isRequired) {
      return z.string().min(1, "필수 항목입니다").parse(value);
    }

    // 선택 항목: 값이 없으면 undefined 허용, 있으면 문자열 검증
    if (value === undefined || value === null) return undefined;
    return z.string().parse(value);
  },

  shouldBeProcessed(entity, context) {
    // FSD-012 조건부 로직 엔진 통합 지점
    // 현재는 항상 true, 조건부 로직 구현 시 교체
    return true;
  },
});
```

```typescript
// packages/survey-builder/src/entities/rating.entity.ts

import { createEntity } from "@coltorapps/builder";
import { headlineAttribute } from "../attributes/headline.attribute";
import { requiredAttribute } from "../attributes/required.attribute";
import { rangeAttribute } from "../attributes/range.attribute";
import { z } from "zod";

/**
 * 별점/점수 질문 Entity.
 * validate: 1 ~ range 범위의 정수 검증
 */
export const ratingEntity = createEntity({
  name: "rating",
  attributes: [headlineAttribute, requiredAttribute, rangeAttribute],

  defaultValue(context) {
    return undefined;
  },

  validate(value, context) {
    const isRequired = context.entity.attributes.required;
    const range = context.entity.attributes.range ?? 5;

    if (isRequired) {
      return z.number().int().min(1).max(range).parse(value);
    }

    if (value === undefined || value === null) return undefined;
    return z.number().int().min(1).max(range).parse(value);
  },
});
```

#### 2.4.2 Survey Interpreter 컴포넌트 (신규 -- 응답 수집 런타임)

```typescript
// libs/client/response/src/lib/components/survey-interpreter.tsx
"use client";

import { useInterpreterStore, InterpreterEntities } from "@coltorapps/builder-react";
import { surveyBuilder } from "@inquiry/survey-builder";
import { useSurveyInterpreter } from "../hooks/use-survey-interpreter";

import { OpenTextInterpreter } from "../interpreters/open-text-interpreter";
import { RatingInterpreter } from "../interpreters/rating-interpreter";
import { MultipleChoiceInterpreter } from "../interpreters/multiple-choice-interpreter";

interface SurveyInterpreterProps {
  surveySchema: BuilderSchema;
  responseId?: string;          // 기존 응답 ID (부분 응답 이어서 작성 시)
  initialData?: Record<string, unknown>; // 기존 응답 값 (부분 응답 복원)
  onSubmit: (data: Record<string, unknown>, ttc: Record<string, number>) => void;
  onAutoSave: (data: Record<string, unknown>, ttc: Record<string, number>) => void;
}

/**
 * @coltorapps/builder 기반 설문 응답 수집 컴포넌트.
 *
 * 핵심 동작:
 * 1. useInterpreterStore로 스토어 초기화 (부분 응답 복원 포함)
 * 2. InterpreterEntities로 Entity별 Interpreter 렌더링
 * 3. TTC 추적 + 자동 저장 (use-survey-interpreter 훅)
 * 4. validateEntitiesValues()로 클라이언트 검증 후 제출
 */
export function SurveyInterpreter({
  surveySchema,
  responseId,
  initialData,
  onSubmit,
  onAutoSave,
}: SurveyInterpreterProps) {
  const {
    interpreterStore,
    handleSubmit,
    isSubmitting,
  } = useSurveyInterpreter({
    surveySchema,
    initialData,
    onSubmit,
    onAutoSave,
  });

  return (
    <form onSubmit={handleSubmit}>
      <InterpreterEntities
        interpreterStore={interpreterStore}
        components={{
          openText: OpenTextInterpreter,
          rating: RatingInterpreter,
          multipleChoice: MultipleChoiceInterpreter,
          // ... 기타 Entity별 Interpreter
        }}
      >
        {(entities) => (
          <div className="space-y-6">
            {entities}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? "제출 중..." : "제출"}
            </button>
          </div>
        )}
      </InterpreterEntities>
    </form>
  );
}
```

#### 2.4.3 use-survey-interpreter 훅 (신규 -- 핵심 래퍼)

```typescript
// libs/client/response/src/lib/hooks/use-survey-interpreter.ts
"use client";

import { useCallback, useRef } from "react";
import {
  useInterpreterStore,
  useInterpreterEntitiesValues,
} from "@coltorapps/builder-react";
import { surveyBuilder } from "@inquiry/survey-builder";

interface UseSurveyInterpreterOptions {
  surveySchema: BuilderSchema;
  initialData?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>, ttc: Record<string, number>) => void;
  onAutoSave: (data: Record<string, unknown>, ttc: Record<string, number>) => void;
}

/**
 * useInterpreterStore를 감싸는 래퍼 훅.
 *
 * 제공 기능:
 * 1. InterpreterStore 초기화 (initialData로 부분 응답 복원)
 * 2. onEntityValueUpdated 이벤트 구독 -> TTC 추적
 * 3. debounce 자동 저장 (2초)
 * 4. validateEntitiesValues() 클라이언트 검증 + 제출
 */
export function useSurveyInterpreter({
  surveySchema,
  initialData,
  onSubmit,
  onAutoSave,
}: UseSurveyInterpreterOptions) {
  const ttcRef = useRef<Record<string, number>>({});
  const entityStartTimeRef = useRef<Record<string, number>>({});
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const interpreterStore = useInterpreterStore(surveyBuilder, surveySchema, {
    // 부분 응답 복원: 기존 저장된 값으로 초기화
    initialData: initialData
      ? { entitiesValues: initialData }
      : undefined,
    events: {
      onEntityValueUpdated(event) {
        const { entityId } = event.payload;

        // TTC 측정: 마지막 변경으로부터 경과 시간 누적
        const now = Date.now();
        const startTime = entityStartTimeRef.current[entityId];
        if (startTime) {
          const elapsed = now - startTime;
          ttcRef.current[entityId] = (ttcRef.current[entityId] ?? 0) + elapsed;
        }
        entityStartTimeRef.current[entityId] = now;

        // 자동 저장 debounce (2초)
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
        autoSaveTimerRef.current = setTimeout(() => {
          const values = interpreterStore.getEntitiesValues();
          onAutoSave(values, { ...ttcRef.current });
        }, 2000);
      },
    },
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // 클라이언트 사이드 검증
      const result = interpreterStore.validateEntitiesValues();

      if (!result.success) {
        // 에러는 InterpreterEntities가 자동으로 각 Entity에 전파
        return;
      }

      // _total TTC 계산
      const totalTtc = Object.entries(ttcRef.current)
        .filter(([key]) => key !== '_total')
        .reduce((sum, [, val]) => sum + val, 0);
      ttcRef.current['_total'] = totalTtc;

      // 검증 통과한 값으로 제출
      onSubmit(result.data, { ...ttcRef.current });
    },
    [interpreterStore, onSubmit],
  );

  return {
    interpreterStore,
    handleSubmit,
    isSubmitting: false, // 별도 상태 관리 가능
  };
}
```

#### 2.4.4 Entity Interpreter 컴포넌트 예시

```typescript
// libs/client/response/src/lib/interpreters/open-text-interpreter.tsx
"use client";

import { createEntityComponent } from "@coltorapps/builder-react";
import { openTextEntity } from "@inquiry/survey-builder";

/**
 * 개방형 텍스트 질문 Interpreter 컴포넌트.
 * createEntityComponent를 통해 타입 안전한 props 자동 추론:
 * - entity: 질문 속성 (headline, required, placeholder)
 * - value: 현재 응답 값
 * - setValue: 값 설정 함수
 * - error: 검증 에러 메시지
 */
export const OpenTextInterpreter = createEntityComponent(
  openTextEntity,
  ({ entity, value, setValue, error }) => {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {entity.attributes.headline}
          {entity.attributes.required && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => setValue(e.target.value)}
          placeholder={entity.attributes.placeholder ?? ""}
          className="w-full border rounded-md px-3 py-2"
        />
        {error && (
          <p className="text-sm text-red-500">{String(error)}</p>
        )}
      </div>
    );
  },
);
```

```typescript
// libs/client/response/src/lib/interpreters/rating-interpreter.tsx
"use client";

import { createEntityComponent } from "@coltorapps/builder-react";
import { ratingEntity } from "@inquiry/survey-builder";

export const RatingInterpreter = createEntityComponent(
  ratingEntity,
  ({ entity, value, setValue, error }) => {
    const range = entity.attributes.range ?? 5;

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {entity.attributes.headline}
        </label>
        <div className="flex gap-2">
          {Array.from({ length: range }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setValue(n)}
              className={`w-10 h-10 rounded-full border ${
                value === n ? "bg-primary text-white" : "hover:bg-gray-100"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {error && (
          <p className="text-sm text-red-500">{String(error)}</p>
        )}
      </div>
    );
  },
);
```

#### 2.4.5 응답 필터 엔진 (ResponseFilterService) -- 기존 계획과 동일

22가지 연산자를 Prisma WHERE 조건으로 변환하는 서버 사이드 필터 엔진. builder 라이브러리와 무관한 서버 CRUD이므로 기존 설계를 유지한다.

```typescript
// libs/server/response/src/lib/response-filter.service.ts

@Injectable()
export class ResponseFilterService {
  /**
   * FilterCriteria 객체를 Prisma WHERE 절로 변환한다.
   * 질문 응답 데이터 필터는 { [entityId]: value } flat map 구조에 맞춰
   * JSON path 기반 쿼리를 생성한다.
   */
  buildWhereClause(
    surveyId: string,
    filterCriteria: FilterCriteria,
  ): Prisma.ResponseWhereInput {
    const conditions: Prisma.ResponseWhereInput[] = [{ surveyId }];

    if (filterCriteria.status) {
      conditions.push(this.buildStatusFilter(filterCriteria.status));
    }
    if (filterCriteria.dateRange) {
      conditions.push(this.buildDateFilter(filterCriteria.dateRange));
    }
    if (filterCriteria.tags) {
      conditions.push(this.buildTagFilter(filterCriteria.tags));
    }
    if (filterCriteria.questionFilters) {
      for (const qf of filterCriteria.questionFilters) {
        // entityId 기반 JSON path 필터
        conditions.push(this.buildQuestionFilter(qf));
      }
    }
    if (filterCriteria.metaFilters) {
      for (const mf of filterCriteria.metaFilters) {
        conditions.push(this.buildMetaFilter(mf));
      }
    }

    return { AND: conditions };
  }
}
```

#### 2.4.6 부분 응답 스킵/중단 그룹화 -- 기존 계획과 동일

```typescript
// libs/client/response/src/lib/utils/skip-group.ts

/**
 * 응답의 finished 상태와 Entity별 데이터를 기반으로
 * Skipped/Aborted 그룹을 생성한다.
 *
 * builder 스키마의 root 배열 순서를 기준으로 질문 순서를 결정한다.
 * shouldBeProcessed가 false인 Entity는 건너뛴다 (스킵 그룹에 포함하지 않음).
 *
 * @param entityIds - 스키마 root 배열 (순서 보장된 Entity ID)
 * @param data - 응답 데이터 { [entityId]: value }
 * @param finished - 응답 완료 여부
 */
export function buildSkipGroups(
  entityIds: string[],
  data: Record<string, ResponseValue>,
  finished: boolean,
): SkipGroup[] {
  if (finished) {
    return buildForwardSkipGroups(entityIds, data);
  }
  return buildReverseSkipGroups(entityIds, data);
}
```

#### 2.4.7 유효 응답 값 판별 -- 기존 계획과 동일

```typescript
// libs/client/response/src/lib/utils/response-value.ts

/**
 * BR-10: 유효한 응답 값인지 판별한다.
 * builder의 entitiesValues에서 추출한 개별 값에 대해 적용한다.
 */
export function isValidResponseValue(value: ResponseValue): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value !== '';
  if (typeof value === 'number') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return false;
}
```

### 2.5 기존 시스템 영향 분석

| 기존 시스템 | 영향 | 설명 |
|------------|------|------|
| `packages/db/prisma/schema.prisma` | 수정 | Response 확장, Tag/ResponseTag 신규 추가, Environment/Contact/Survey 관계 추가 |
| `apps/server/src/app/app.module.ts` | 수정 | ResponseModule, TagModule import 추가 |
| `apps/client/package.json` | 수정 | `@coltorapps/builder-react`, `@tanstack/react-table`, `@dnd-kit/core`, `@dnd-kit/sortable` 추가 |
| `apps/server/package.json` 또는 `packages/survey-builder/package.json` | 수정 | `@coltorapps/builder` (core) 추가 |
| **`packages/survey-builder/` (신규)** | 생성 | **서버/클라이언트 공유 패키지. surveyBuilder + Entity + Attribute 정의. 이 패키지가 builder 라이브러리의 검증 로직을 공유하는 핵심** |
| FS-014 QuotaModule | 연동 | 응답 삭제 시 Quota 차감 (QuotaService.deductQuota 호출) |
| FS-008 SurveyModule | 연동 | 응답 생성 시 Survey 활성 상태 검증, **survey.schema에서 builder 스키마 로드** |
| FS-026 ContactModule | 연동 | 응답 조회 시 Contact+속성 조인, 응답 생성 시 userId -> Contact 연결 |
| `libs/client/core/src/lib/api.ts` | 변경 없음 | 기존 apiFetch 래퍼 재사용 |
| i18n JSON 파일 | 수정 | 응답 관리 관련 번역 키 추가 (ko, en) |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 태스크명 | 설명 | 의존 | 복잡도 | 예상 시간 |
|-----|---------|------|------|--------|----------|
| T-01 | Prisma 스키마 확장 | Response 완전 모델, Tag, ResponseTag 모델 추가. 기존 스텁 대체 | - | 중 | 3h |
| T-02 | DB 마이그레이션 실행 | `npx prisma migrate dev` + 생성 코드 확인 | T-01 | 낮 | 0.5h |
| T-03 | **survey-builder 패키지 생성** | `packages/survey-builder/` 생성. `@coltorapps/builder` 설치. surveyBuilder + 공용 타입(ResponseMeta, ResponseValue, SkipGroup 등) 정의 | - | 중 | 4h |
| T-04 | **Entity 정의 (질문 타입별)** | openText, rating, multipleChoice, nps 등 Entity. 각 Entity에 validate, defaultValue, shouldBeProcessed 구현 | T-03 | 높 | 6h |
| T-05 | **Attribute 정의 (공용 속성)** | headline, required, placeholder, range, choices 등 createAttribute + Zod 검증 | T-03 | 중 | 3h |
| T-06 | Response DTO 정의 | CreateResponseDto, UpdateResponseDto, ResponseQueryDto, FilterCriteria DTO (class-validator) | T-01 | 중 | 3h |
| T-07 | ResponseService 핵심 로직 | create(), update() (data/ttc 병합), findById(), findBySurvey() (페이지네이션). **validateEntitiesValues() 서버 이중 검증 통합** | T-02, T-03, T-06 | 높 | 8h |
| T-08 | ResponseFilterService | 22가지 연산자 -> Prisma WHERE 변환 엔진. entityId 기반 JSON path 필터 | T-06, T-07 | 높 | 8h |
| T-09 | ResponseService 삭제 로직 | delete() (5분 규칙, Quota 차감 옵션) | T-07 | 중 | 3h |
| T-10 | ResponseClientController | POST /environments/:envId/responses, PUT /responses/:id (인증 불필요) | T-07 | 중 | 3h |
| T-11 | ResponseController (관리자) | GET /surveys/:surveyId/responses, DELETE /responses/:id (JWT 필수) | T-07, T-08, T-09 | 중 | 3h |
| T-12 | ResponseModule 조립 | NestJS 모듈 정의, AppModule import 추가 | T-10, T-11 | 낮 | 1h |
| T-13 | TagService | create(), findByEnvironment(), delete(), linkToResponse(), unlinkFromResponse() | T-02 | 중 | 3h |
| T-14 | TagController + TagModule | 태그 CRUD + 연결/제거 REST API, 모듈 정의 | T-13 | 중 | 2h |
| T-15 | Tag DTO 정의 | CreateTagDto (class-validator) | - | 낮 | 0.5h |
| T-16 | 서버 단위 테스트 (Response) | ResponseService (특히 validateEntitiesValues 통합), ResponseFilterService 단위 테스트 | T-07, T-08 | 중 | 5h |
| T-17 | 서버 단위 테스트 (Tag) | TagService 단위 테스트 | T-13 | 낮 | 2h |
| T-18 | **@coltorapps/builder-react 패키지 설치** | apps/client에 `@coltorapps/builder-react` + `@tanstack/react-table` + `@dnd-kit/core` + `@dnd-kit/sortable` 설치 | - | 낮 | 0.5h |
| T-19 | 클라이언트 API 함수 | response-api.ts (apiFetch 기반 응답 조회/삭제, 태그 CRUD) | T-11, T-14 | 낮 | 2h |
| T-20 | 클라이언트 유틸리티 함수 | skip-group.ts, response-value.ts, filter-operators.ts (순수 함수) | T-03 | 중 | 3h |
| T-21 | 클라이언트 유틸리티 테스트 | skip-group, response-value 순수 함수 단위 테스트 | T-20 | 중 | 2h |
| T-22 | **Entity Interpreter 컴포넌트 (전체)** | openText, rating, multipleChoice 등 createEntityComponent 기반 Interpreter. 각 질문 타입별 UI 렌더링 | T-04, T-18 | 높 | 6h |
| T-23 | **use-survey-interpreter 훅** | useInterpreterStore 래퍼. TTC 추적, 자동 저장 debounce, validateEntitiesValues 클라이언트 검증 | T-04, T-18 | 높 | 4h |
| T-24 | **SurveyInterpreter 컴포넌트** | InterpreterEntities + 제출 폼. use-survey-interpreter 사용. 부분 응답 복원(initialData) | T-22, T-23 | 중 | 3h |
| T-25 | use-responses 훅 | 페이지네이션 기반 응답 목록 조회 훅 | T-19 | 중 | 2h |
| T-26 | use-response-filter 훅 | 필터 상태 관리, 필터 직렬화/역직렬화 | T-19, T-20 | 중 | 2h |
| T-27 | use-tags 훅 | 태그 CRUD hooks (생성, 연결, 제거, 목록 조회) | T-19 | 낮 | 1.5h |
| T-28 | ResponseCard 컴포넌트 | 카드 뷰 단일 카드 (헤더/바디/풋터), 부분 응답 시각화 포함 | T-20, T-25 | 높 | 5h |
| T-29 | ResponseCardList 컴포넌트 | 카드 뷰 목록 + Load More 버튼 | T-28 | 중 | 2h |
| T-30 | ResponseMetadata 컴포넌트 | 메타데이터 아이콘 + 툴팁 (device/browser/os/url/action 등) | T-03 | 중 | 3h |
| T-31 | PartialResponseViz 컴포넌트 | 스킵/중단 그룹 시각화 (Completed 배지, Skipped/Aborted 그룹) | T-20 | 중 | 3h |
| T-32 | ResponseTable 컴포넌트 | TanStack Table 기반 테이블 뷰, 열 순서 변경(dnd-kit), 열 가시성, 행 선택 | T-25 | 높 | 8h |
| T-33 | ResponseFilterBar 컴포넌트 | 필터 기준 선택, 연산자 선택, 값 입력, 다중 필터 AND 조합 UI | T-26 | 높 | 6h |
| T-34 | ResponseTagManager 컴포넌트 | 태그 추가/삭제/검색 UI, 2초 하이라이트, 동시 작업 방지 | T-27 | 중 | 4h |
| T-35 | DeleteResponseDialog 컴포넌트 | 삭제 확인 다이얼로그, 5분 규칙 표시, Quota 차감 옵션 | T-19 | 중 | 2h |
| T-36 | ResponseViewToggle 컴포넌트 | 카드/테이블 뷰 전환 토글 | - | 낮 | 0.5h |
| T-37 | 응답 관리 페이지 | `surveys/[surveyId]/responses/page.tsx` 조립 | T-29, T-32, T-33, T-34, T-35, T-36 | 중 | 4h |
| T-38 | **설문 응답 페이지** | `surveys/[surveyId]/respond/page.tsx`. SurveyInterpreter + API 연동 | T-24, T-19 | 중 | 3h |
| T-39 | i18n 번역 키 추가 | ko/en JSON 파일에 응답 관리 관련 번역 키 추가 | T-37, T-38 | 낮 | 2h |
| T-40 | 통합 테스트 (API) | 응답 CRUD + 필터 + 태그 API E2E 테스트. **validateEntitiesValues 서버 검증 포함** | T-12, T-14 | 중 | 5h |
| T-41 | 접근 권한 가드 연동 | EnvironmentAccessGuard를 Response/Tag 컨트롤러에 적용 | T-11, T-14 | 중 | 2h |

### 3.2 구현 순서 및 마일스톤

```
Milestone 1: 데이터 계층 + Survey Builder (T-01 ~ T-05, T-18)
├── T-01: Prisma 스키마 확장
├── T-02: DB 마이그레이션
├── T-03: survey-builder 패키지 생성 + @coltorapps/builder 설치
├── T-04: Entity 정의 (openText, rating, multipleChoice, nps ...)
├── T-05: Attribute 정의 (headline, required, placeholder, range ...)
└── T-18: 클라이언트 패키지 설치 (@coltorapps/builder-react, TanStack Table, dnd-kit)
검증 포인트:
  - prisma generate 성공
  - surveyBuilder가 정상 생성됨
  - Entity 정의에서 validate/defaultValue가 정상 동작
  - 빌드 성공 확인

Milestone 2: 서버 API 코어 (T-06 ~ T-12)
├── T-06: DTO 정의
├── T-07: ResponseService 핵심 (create, update, find + validateEntitiesValues 서버 검증)
├── T-08: ResponseFilterService (22가지 연산자)
├── T-09: ResponseService 삭제 로직
├── T-10: ResponseClientController (응답자용)
├── T-11: ResponseController (관리자용)
└── T-12: ResponseModule 조립
검증 포인트:
  - REST API 호출로 응답 생성(finished=false) -> 업데이트 -> 완료(finished=true) 흐름 확인
  - finished=true 시 validateEntitiesValues 서버 검증 동작 확인
  - 잘못된 데이터 제출 시 entitiesErrors 반환 확인
  - 빌드 성공 확인

Milestone 3: 태그 API (T-13 ~ T-15)
├── T-15: Tag DTO
├── T-13: TagService
└── T-14: TagController + TagModule
검증 포인트:
  - 태그 생성 -> 응답 연결 -> 조회 확인
  - 빌드 성공 확인

Milestone 4: 서버 테스트 + 권한 (T-16, T-17, T-41)
├── T-16: Response 단위 테스트 (validateEntitiesValues 통합 테스트 포함)
├── T-17: Tag 단위 테스트
└── T-41: 접근 권한 가드 연동
검증 포인트:
  - 테스트 전체 통과
  - 권한별 API 접근 제어 확인
  - 빌드 성공 확인

Milestone 5: 클라이언트 응답 수집 (@coltorapps/builder-react) (T-19 ~ T-24)
├── T-19: 클라이언트 API 함수
├── T-20: 유틸리티 함수 (skip-group, response-value)
├── T-21: 유틸리티 테스트
├── T-22: Entity Interpreter 컴포넌트 (openText, rating, multipleChoice ...)
├── T-23: use-survey-interpreter 훅 (useInterpreterStore + TTC + 자동 저장)
└── T-24: SurveyInterpreter 컴포넌트 (InterpreterEntities + 제출 폼)
검증 포인트:
  - SurveyInterpreter에서 설문 응답 수집 -> 클라이언트 검증 -> 제출 흐름 확인
  - 부분 응답 복원(initialData.entitiesValues) 동작 확인
  - TTC 추적 + 자동 저장 확인
  - 빌드 성공 확인

Milestone 6: 클라이언트 응답 관리 UI (T-25 ~ T-36)
├── T-25: use-responses 훅
├── T-26: use-response-filter 훅
├── T-27: use-tags 훅
├── T-28: ResponseCard 컴포넌트
├── T-29: ResponseCardList 컴포넌트
├── T-30: ResponseMetadata 컴포넌트
├── T-31: PartialResponseViz 컴포넌트
├── T-32: ResponseTable 컴포넌트
├── T-33: ResponseFilterBar 컴포넌트
├── T-34: ResponseTagManager 컴포넌트
├── T-35: DeleteResponseDialog 컴포넌트
└── T-36: ResponseViewToggle 컴포넌트
검증 포인트:
  - 각 컴포넌트 개별 렌더링 확인
  - 빌드 성공 확인

Milestone 7: 페이지 조립 + i18n + 통합 테스트 (T-37 ~ T-40)
├── T-37: 응답 관리 페이지 조립
├── T-38: 설문 응답 페이지 (SurveyInterpreter 통합)
├── T-39: i18n 번역 키
└── T-40: 통합 테스트
검증 포인트:
  - 전체 사용자 플로우 동작 확인:
    (1) 응답자: 설문 응답 (useInterpreterStore) -> 부분 저장 -> 복원 -> 최종 제출
    (2) 관리자: 응답 카드/테이블 뷰 조회 -> 필터 -> 태그 -> 삭제
  - validateEntitiesValues 클라이언트/서버 이중 검증 전체 흐름
  - 빌드 성공 확인
```

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 내용 요약 |
|-----------|----------|---------------|
| `packages/db/prisma/schema.prisma` | 수정 | Response 완전 모델 확장, Tag/ResponseTag 신규 모델, Environment/Contact/Survey 관계 추가 |
| **`packages/survey-builder/package.json`** | 생성 | `@coltorapps/builder`, `zod` 의존성. 서버/클라이언트 공유 패키지 |
| **`packages/survey-builder/src/index.ts`** | 생성 | surveyBuilder, Entity, Attribute, 타입 re-export |
| **`packages/survey-builder/src/builder.ts`** | 생성 | createBuilder({ entities }) 정의 |
| **`packages/survey-builder/src/entities/open-text.entity.ts`** | 생성 | openText Entity (validate, defaultValue, shouldBeProcessed) |
| **`packages/survey-builder/src/entities/rating.entity.ts`** | 생성 | rating Entity |
| **`packages/survey-builder/src/entities/multiple-choice.entity.ts`** | 생성 | multipleChoice Entity |
| **`packages/survey-builder/src/entities/nps.entity.ts`** | 생성 | NPS Entity |
| **`packages/survey-builder/src/attributes/headline.attribute.ts`** | 생성 | headline createAttribute + z.string() |
| **`packages/survey-builder/src/attributes/required.attribute.ts`** | 생성 | required createAttribute + z.boolean() |
| **`packages/survey-builder/src/attributes/placeholder.attribute.ts`** | 생성 | placeholder createAttribute + z.string().optional() |
| **`packages/survey-builder/src/attributes/range.attribute.ts`** | 생성 | range createAttribute + z.number().min(1) |
| **`packages/survey-builder/src/attributes/choices.attribute.ts`** | 생성 | choices createAttribute + z.array(z.object()) |
| **`packages/survey-builder/src/types/response.types.ts`** | 생성 | ResponseMeta, ResponseValue, SkipGroup, ResponseTtc 공유 타입 |
| `libs/server/response/src/index.ts` | 생성 | ResponseModule 퍼블릭 API 엑스포트 |
| `libs/server/response/src/lib/response.module.ts` | 생성 | NestJS 모듈 정의 (PrismaModule, TagModule 의존) |
| `libs/server/response/src/lib/response.controller.ts` | 생성 | 관리자용 응답 조회/삭제 REST API |
| `libs/server/response/src/lib/response-client.controller.ts` | 생성 | 응답자용 응답 생성/업데이트 REST API (인증 불필요) |
| `libs/server/response/src/lib/response.service.ts` | 생성 | 응답 CRUD + data/ttc 병합 + 5분 삭제 규칙 + **validateEntitiesValues() 서버 검증** |
| `libs/server/response/src/lib/response-filter.service.ts` | 생성 | 22가지 필터 연산자 -> Prisma WHERE 변환 |
| `libs/server/response/src/lib/dto/create-response.dto.ts` | 생성 | 응답 생성 DTO (class-validator) |
| `libs/server/response/src/lib/dto/update-response.dto.ts` | 생성 | 응답 업데이트 DTO (class-validator) |
| `libs/server/response/src/lib/dto/response-query.dto.ts` | 생성 | 응답 조회 Query DTO (page, pageSize, filter) |
| `libs/server/response/src/lib/dto/response-filter.dto.ts` | 생성 | FilterCriteria DTO (필터 조건 구조 검증) |
| `libs/server/response/src/lib/types/response.types.ts` | 생성 | 서버 사이드 응답 관련 타입 |
| `libs/server/response/src/lib/constants/response.constants.ts` | 생성 | DELETION_WAIT_MS(300000), PAGE_SIZE_DEFAULT(10) 등 상수 |
| `libs/server/tag/src/index.ts` | 생성 | TagModule 퍼블릭 API 엑스포트 |
| `libs/server/tag/src/lib/tag.module.ts` | 생성 | NestJS TagModule 정의 |
| `libs/server/tag/src/lib/tag.controller.ts` | 생성 | 태그 CRUD + 응답-태그 연결/제거 API |
| `libs/server/tag/src/lib/tag.service.ts` | 생성 | 태그 비즈니스 로직 (중복 검사, Environment 범위) |
| `libs/server/tag/src/lib/dto/create-tag.dto.ts` | 생성 | 태그 생성 DTO |
| `apps/server/src/app/app.module.ts` | 수정 | ResponseModule, TagModule import 추가 |
| `apps/client/package.json` | 수정 | `@coltorapps/builder-react`, `@tanstack/react-table`, `@dnd-kit/core`, `@dnd-kit/sortable` 추가 |
| `libs/client/response/src/index.ts` | 생성 | 클라이언트 라이브러리 엑스포트 |
| `libs/client/response/src/lib/api/response-api.ts` | 생성 | apiFetch 기반 응답/태그 API 클라이언트 |
| **`libs/client/response/src/lib/components/survey-interpreter.tsx`** | 생성 | useInterpreterStore + InterpreterEntities 기반 설문 응답 수집 |
| **`libs/client/response/src/lib/hooks/use-survey-interpreter.ts`** | 생성 | useInterpreterStore 래퍼 (TTC + 자동저장 + 클라이언트 검증) |
| **`libs/client/response/src/lib/interpreters/open-text-interpreter.tsx`** | 생성 | createEntityComponent(openTextEntity, ...) |
| **`libs/client/response/src/lib/interpreters/rating-interpreter.tsx`** | 생성 | createEntityComponent(ratingEntity, ...) |
| **`libs/client/response/src/lib/interpreters/multiple-choice-interpreter.tsx`** | 생성 | createEntityComponent(multipleChoiceEntity, ...) |
| `libs/client/response/src/lib/hooks/use-responses.ts` | 생성 | 페이지네이션 응답 조회 훅 |
| `libs/client/response/src/lib/hooks/use-response-filter.ts` | 생성 | 필터 상태 관리 훅 |
| `libs/client/response/src/lib/hooks/use-response-table.ts` | 생성 | TanStack Table 설정 훅 |
| `libs/client/response/src/lib/hooks/use-tags.ts` | 생성 | 태그 CRUD 훅 |
| `libs/client/response/src/lib/components/response-card.tsx` | 생성 | 카드 뷰 단일 카드 컴포넌트 |
| `libs/client/response/src/lib/components/response-card-list.tsx` | 생성 | 카드 뷰 목록 + Load More |
| `libs/client/response/src/lib/components/response-table.tsx` | 생성 | TanStack Table 테이블 뷰 |
| `libs/client/response/src/lib/components/response-metadata.tsx` | 생성 | 메타데이터 아이콘/툴팁 |
| `libs/client/response/src/lib/components/response-filter-bar.tsx` | 생성 | 필터 조건 UI |
| `libs/client/response/src/lib/components/response-tag-manager.tsx` | 생성 | 태그 관리 UI |
| `libs/client/response/src/lib/components/partial-response-viz.tsx` | 생성 | 스킵/중단 그룹 시각화 |
| `libs/client/response/src/lib/components/delete-response-dialog.tsx` | 생성 | 삭제 확인 다이얼로그 |
| `libs/client/response/src/lib/components/response-view-toggle.tsx` | 생성 | 카드/테이블 전환 토글 |
| `libs/client/response/src/lib/utils/skip-group.ts` | 생성 | 스킵/중단 그룹화 순수 함수 |
| `libs/client/response/src/lib/utils/response-value.ts` | 생성 | 유효 응답 값 판별 순수 함수 |
| `libs/client/response/src/lib/utils/filter-operators.ts` | 생성 | 필터 연산자 목록/매핑 상수 |
| `libs/client/response/src/lib/types/response.types.ts` | 생성 | 클라이언트 타입 정의 |
| `apps/client/src/app/[lng]/surveys/[surveyId]/responses/page.tsx` | 생성 | 응답 관리 페이지 |
| **`apps/client/src/app/[lng]/surveys/[surveyId]/respond/page.tsx`** | 생성 | 설문 응답 페이지 (SurveyInterpreter) |
| `apps/client/src/app/i18n/locales/ko/response.json` | 생성 | 한국어 번역 키 |
| `apps/client/src/app/i18n/locales/en/response.json` | 생성 | 영어 번역 키 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 발생 확률 | 완화 전략 |
|--------|------|----------|----------|
| **survey-builder 패키지 서버/클라이언트 호환성** | @coltorapps/builder를 서버(NestJS)와 클라이언트(Next.js) 양쪽에서 사용해야 하므로, ESM/CJS 호환 문제 발생 가능 | 중간 | (1) packages/survey-builder를 dual-export (ESM+CJS)로 구성 (2) tsconfig paths alias 설정 (3) Next.js transpilePackages에 추가 |
| **Entity validate 로직 복잡도** | 다양한 질문 타입별 Zod 검증 로직이 복잡해질 수 있음. 특히 Matrix, CTA 등 복합 타입 | 중간 | (1) Entity별 독립 테스트 작성 (2) validate 내부에서 Zod 스키마를 재사용 가능한 형태로 분리 (3) 점진적으로 Entity 추가 |
| **shouldBeProcessed와 조건부 로직 통합** | FSD-012 조건부 로직 엔진이 미구현 상태에서 shouldBeProcessed 스텁 유지 필요 | 높음 | shouldBeProcessed를 항상 true로 반환하는 스텁으로 시작. FSD-012 구현 시 evaluateCondition() 함수로 교체하는 통합 포인트만 명확히 정의해둔다 |
| **validateEntitiesValues 서버 호출 시 스키마 로딩** | 서버에서 응답 검증 시 매번 Survey의 builder 스키마를 DB에서 로드해야 함 | 중간 | (1) Survey.schema를 Response 생성/업데이트 시 JOIN으로 함께 조회 (2) 자주 접근하는 schema는 인메모리 캐시 적용 검토 |
| JSON 필드 필터 성능 저하 | 대량 응답 시 entityId 기반 JSON 필터링 쿼리가 느려질 수 있음 | 중간 | (1) data 필드에 GIN 인덱스 추가 (`CREATE INDEX ON responses USING GIN (data jsonb_path_ops)`) (2) 페이지네이션으로 쿼리 범위 제한 |
| 선행 모듈 미구현 | Survey, Environment, Contact, Display, Quota 모듈이 아직 미구현 | 높음 | 각 모듈의 Prisma 모델 스텁을 사용하여 개발 진행. 서비스 간 연동 포인트에 인터페이스를 정의 |
| TanStack Table + dnd-kit 통합 복잡도 | 열 드래그 앤 드롭과 TanStack Table의 상태 동기화 복잡 | 중간 | 공식 예제 참조 + 별도 POC 수행 후 본 구현 적용 |
| 22가지 필터 연산자 조합 버그 | 다양한 연산자/값 타입 조합에서 쿼리 오류 가능 | 중간 | 연산자별 단위 테스트 작성. 유효하지 않은 조합은 DTO 검증 단계에서 차단 |
| 동시 태그 작업 충돌 | 여러 사용자가 동시에 같은 응답에 태그 작업 시 불일치 | 낮음 | ResponseTag 복합 PK로 DB 레벨 중복 방지. Prisma `skipDuplicates` 활용 |
| 응답 업데이트 API 보안 | 인증 불필요 엔드포인트로 무단 수정 가능 | 중간 | CUID2 예측 불가능성 + Rate Limiting. 향후 FS-020에서 reCAPTCHA 추가 |
| **부분 응답 복원 시 스키마 변경** | 응답자가 부분 응답을 저장한 후 설문 스키마가 변경되면, initialData의 entityId가 현재 스키마와 불일치할 수 있음 | 낮음 | useInterpreterStore는 현재 스키마에 존재하지 않는 entityId의 값을 무시하므로 안전하게 동작. 다만 삭제된 질문의 이전 응답은 유실됨을 감안 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 테스트 대상 | 테스트 항목 | 우선순위 |
|------------|-----------|---------|
| **Entity validate 메서드 (openText)** | 필수: 빈 문자열 reject, 유효 문자열 accept. 선택: undefined 허용 | 높음 |
| **Entity validate 메서드 (rating)** | range 범위 내 정수 accept, 범위 밖 reject, 소수점 reject | 높음 |
| **Entity validate 메서드 (multipleChoice)** | 최소 선택 수 검증, 선택지 유효성 검증 | 높음 |
| **validateEntitiesValues (서버)** | surveyBuilder + schema로 전체 응답 검증. success/failure 분기 확인 | 높음 |
| `ResponseService.create()` | 필수 필드 저장, finished 기본값 false, **finished=true 시 validateEntitiesValues 호출** | 높음 |
| `ResponseService.update()` | data 필드 병합, ttc 병합, **finished=true 전환 시 validateEntitiesValues 호출** | 높음 |
| `ResponseService.delete()` | finished=true 즉시 삭제, finished=false 5분 미경과 거부 | 높음 |
| `ResponseFilterService.buildWhereClause()` | 22가지 연산자 각각의 Prisma WHERE 변환 정확성 | 높음 |
| `ResponseFilterService` 텍스트 연산자 | equals, notEquals, contains, doesNotContain, startsWith, doesNotStartWith, endsWith, doesNotEndWith | 높음 |
| `ResponseFilterService` 숫자 연산자 | lessThan, lessEqual, greaterThan, greaterEqual | 높음 |
| `ResponseFilterService` 배열 연산자 | includesAll, includesOne | 높음 |
| `TagService.create()` | Environment 내 중복 이름 거부 (409), 정상 생성 | 중간 |
| `TagService.linkToResponse()` | 정상 연결, 중복 연결 무시 | 중간 |
| `isValidResponseValue()` | BR-10 규칙별 판별 정확성 | 높음 |
| `buildSkipGroups()` (완료 응답) | 순방향 스킵 그룹화, 연속 미응답 묶음 | 높음 |
| `buildSkipGroups()` (미완료 응답) | 역방향 aborted 그룹, 중간 미응답 skipped 처리 | 높음 |

### 5.2 통합 테스트

| 테스트 시나리오 | 검증 항목 |
|---------------|----------|
| **응답 생성(finished=false) -> 업데이트 -> 완료(finished=true)** | data/ttc 병합 정확성, **validateEntitiesValues 서버 검증 통과**, finished 전환 |
| **잘못된 응답 데이터로 완료 시도** | **validateEntitiesValues 실패 -> 400 Bad Request + entitiesErrors 반환** |
| **부분 응답 복원** | **기존 data를 initialData.entitiesValues로 전달 -> useInterpreterStore 복원** |
| 응답 목록 조회 + 필터 | 필터 조건 적용 후 결과 정확성, 페이지네이션 meta 데이터 |
| 태그 생성 -> 응답 연결 -> 조회 | 태그가 응답 조회 결과에 포함되는지 확인 |
| 완료 응답 삭제 | 즉시 삭제 성공, DB에서 레코드 제거 확인 |
| 미완료 응답 삭제 (5분 미경과) | 403 Forbidden 반환 |
| 미완료 응답 삭제 (5분 경과) | 삭제 성공 |
| 응답 삭제 + Quota 차감 | Quota 서비스 deductQuota 호출 확인 |
| 권한 검증 | MEMBER 조회 허용, MEMBER 삭제 거부, ADMIN 삭제 허용 |
| 동시 태그 작업 | 같은 responseId+tagId 중복 연결 시 충돌 없이 처리 |

### 5.3 E2E 테스트 (선택)

| 시나리오 | 검증 항목 |
|---------|----------|
| **응답자: useInterpreterStore 기반 설문 응답 -> 자동 저장 -> 이탈 -> 복원 -> 제출** | 전체 부분 응답 흐름 + builder 검증 |
| **응답자: 필수 항목 미입력 제출** | **클라이언트 validateEntitiesValues 실패 -> 에러 표시 (서버 미호출)** |
| **응답자: shouldBeProcessed=false 질문 스킵** | **해당 Entity 렌더링 안됨, 검증에서 제외, 응답 데이터에 미포함** |
| 관리자: 카드 뷰 응답 목록 확인 | 카드 렌더링 + 질문별 응답 표시 |
| 관리자: 필터 적용 -> 결과 갱신 | 필터 UI 조작 -> API 호출 -> 결과 목록 변경 |
| 관리자: 태그 추가 -> 2초 하이라이트 | 태그 UI 동작 전체 플로우 |
| 관리자: 테이블 뷰 무한 스크롤 | 스크롤 -> 자동 데이터 로딩 -> 행 추가 |
| 관리자: 카드/테이블 뷰 전환 | 뷰 전환 시 데이터 유지, 필터 상태 유지 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 제약사항 | 설명 |
|---------|------|
| 선행 모듈 미구현 | Survey, Environment, Contact, Display, Quota 모듈이 미구현 상태. Prisma 모델 스텁으로 개발하되, 서비스 연동은 인터페이스 기반으로 준비 |
| **shouldBeProcessed 스텁** | FSD-012 조건부 로직 엔진이 미구현이므로 모든 Entity에서 항상 true 반환. 조건부 질문 스킵은 FSD-012 구현 후 통합 |
| **Entity 정의 범위** | 초기 구현에서는 openText, rating, multipleChoice, nps 등 핵심 질문 타입만 Entity 정의. 나머지 질문 타입(Matrix, CTA, File Upload 등)은 FSD-009에서 점진적 추가 |
| JSON 필터 제한 | Prisma의 JSON 필터는 PostgreSQL JSONB 연산에 의존. 복잡한 배열/중첩 객체 필터는 Raw SQL이 필요할 수 있음 |
| 열 설정 localStorage 한계 | 테이블 뷰 열 설정이 브라우저 로컬에만 저장되어 다른 기기에서는 초기화됨 |
| 실시간 업데이트 미지원 | 부분 응답의 실시간 반영은 폴링 기반. WebSocket/SSE 실시간 업데이트는 현 범위 밖 |
| 일괄 삭제 성능 | 대량 행 선택 시 개별 DELETE 요청이 발생. 배치 삭제 API는 향후 개선 |
| **부분 응답 복원 시 스키마 버전 불일치** | 설문 스키마가 변경된 경우, 기존 부분 응답의 일부 entityId가 현재 스키마에 없을 수 있음. useInterpreterStore가 무시하므로 크래시는 안 나지만 데이터 유실 가능 |

### 6.2 향후 개선 가능 항목

| 항목 | 설명 |
|------|------|
| **FSD-012 조건부 로직 통합** | shouldBeProcessed에 evaluateCondition() 함수를 연결하여 조건부 질문 스킵 구현 |
| **전체 질문 타입 Entity 정의** | Matrix, CTA, Consent, File Upload, Cal, Ranking 등 FSD-009의 모든 질문 타입을 Entity로 정의 |
| **스키마 버전 관리** | 설문 스키마 변경 시 기존 부분 응답과의 호환성을 보장하는 마이그레이션 메커니즘 |
| 배치 삭제 API | `DELETE /api/responses/batch` 엔드포인트로 다건 삭제 한 번에 처리 |
| 열 설정 서버 저장 | 사용자별 테이블 뷰 설정을 서버에 저장하여 다기기 동기화 |
| WebSocket 실시간 업데이트 | 새 응답 수신/부분 응답 갱신 시 실시간 UI 업데이트 |
| 가상 스크롤 (Virtualization) | 대량 데이터 시 TanStack Virtual과 연동하여 DOM 노드 최적화 |
| 응답 데이터 인덱싱 | 자주 필터되는 질문 응답을 별도 인덱스 테이블로 비정규화하여 조회 성능 향상 |
| 필터 프리셋 | 자주 사용하는 필터 조합을 저장/불러오기 기능 |
| 응답 내보내기 (Export) | FSD-025 범위에서 CSV/Excel 내보내기 기능 추가 |
| 응답 파이프라인 연동 | FSD-022/023에서 응답 생성/완료 이벤트에 Webhook/Follow-up Email 트리거 연결 |

---

## 7. i18n 고려사항 (클라이언트 UI 변경 사항)

### 추가/수정 필요 번역 키 목록

**네임스페이스: `response`**

| 키 | 한국어 (ko) | 영어 (en) |
|-----|-----------|----------|
| `response.cardView` | 카드 뷰 | Card View |
| `response.tableView` | 테이블 뷰 | Table View |
| `response.anonymous` | 익명 | Anonymous |
| `response.completed` | 완료됨 | Completed |
| `response.inProgress` | 진행 중 | In Progress |
| `response.skipped` | 건너뜀 | Skipped |
| `response.aborted` | 중단됨 | Aborted |
| `response.emptyState.title` | 아직 응답이 없습니다 | No responses yet |
| `response.emptyState.description` | 설문이 시작되면 여기에 응답이 표시됩니다 | Responses will appear here once the survey starts |
| `response.filter.addFilter` | 필터 추가 | Add Filter |
| `response.filter.clearAll` | 모든 필터 해제 | Clear All Filters |
| `response.filter.noResults` | 조건에 맞는 응답이 없습니다 | No responses match your filters |
| `response.filter.status` | 완료 상태 | Completion Status |
| `response.filter.responseId` | 응답 ID | Response ID |
| `response.filter.dateRange` | 날짜 범위 | Date Range |
| `response.filter.contactAttribute` | 연락처 속성 | Contact Attribute |
| `response.filter.questionData` | 질문 응답 | Question Response |
| `response.filter.tag` | 태그 | Tag |
| `response.filter.metadata` | 메타데이터 | Metadata |
| `response.filter.quota` | 쿼터 | Quota |
| `response.filter.operators.equals` | 같음 | Equals |
| `response.filter.operators.notEquals` | 같지 않음 | Not Equals |
| `response.filter.operators.contains` | 포함 | Contains |
| `response.filter.operators.doesNotContain` | 포함하지 않음 | Does Not Contain |
| `response.filter.operators.startsWith` | 시작함 | Starts With |
| `response.filter.operators.doesNotStartWith` | 시작하지 않음 | Does Not Start With |
| `response.filter.operators.endsWith` | 끝남 | Ends With |
| `response.filter.operators.doesNotEndWith` | 끝나지 않음 | Does Not End With |
| `response.filter.operators.lessThan` | 미만 | Less Than |
| `response.filter.operators.lessEqual` | 이하 | Less or Equal |
| `response.filter.operators.greaterThan` | 초과 | Greater Than |
| `response.filter.operators.greaterEqual` | 이상 | Greater or Equal |
| `response.filter.operators.includesAll` | 모두 포함 | Includes All |
| `response.filter.operators.includesOne` | 하나 이상 포함 | Includes One |
| `response.filter.operators.submitted` | 제출됨 | Submitted |
| `response.filter.operators.skipped` | 건너뜀 | Skipped |
| `response.filter.operators.accepted` | 수락됨 | Accepted |
| `response.filter.operators.clicked` | 클릭됨 | Clicked |
| `response.filter.operators.uploaded` | 업로드됨 | Uploaded |
| `response.filter.operators.notUploaded` | 미업로드 | Not Uploaded |
| `response.filter.operators.booked` | 예약됨 | Booked |
| `response.filter.operators.isEmpty` | 비어있음 | Is Empty |
| `response.filter.operators.isNotEmpty` | 비어있지 않음 | Is Not Empty |
| `response.filter.operators.isAnyOf` | 다음 중 하나 | Is Any Of |
| `response.filter.operators.isCompletelySubmitted` | 완전 제출 | Completely Submitted |
| `response.filter.operators.isPartiallySubmitted` | 부분 제출 | Partially Submitted |
| `response.tag.addTag` | 태그 추가 | Add Tag |
| `response.tag.searchTag` | 태그 검색 | Search Tags |
| `response.tag.createNew` | 새 태그 만들기 | Create New Tag |
| `response.tag.duplicateError` | 이미 존재하는 태그 이름입니다 | Tag name already exists |
| `response.tag.applied` | 적용됨 | Applied |
| `response.tag.notApplied` | 미적용 | Not Applied |
| `response.delete.title` | 응답 삭제 | Delete Response |
| `response.delete.confirm` | 이 응답을 삭제하시겠습니까? | Are you sure you want to delete this response? |
| `response.delete.deductQuota` | 관련 쿼터 차감 | Deduct related quota |
| `response.delete.inProgress` | 이 응답은 진행 중입니다 | This response is in progress |
| `response.delete.bulkTitle` | 선택한 응답 삭제 | Delete Selected Responses |
| `response.delete.bulkConfirm` | 선택한 {{count}}건의 응답을 삭제하시겠습니까? | Delete {{count}} selected responses? |
| `response.table.selectAll` | 전체 선택 | Select All |
| `response.table.selected` | {{count}}건 선택됨 | {{count}} selected |
| `response.table.columnVisibility` | 열 표시/숨김 | Column Visibility |
| `response.table.loadMore` | 더 보기 | Load More |
| `response.table.bulkDelete` | 일괄 삭제 | Bulk Delete |
| `response.table.bulkDownload` | 일괄 다운로드 | Bulk Download |
| `response.meta.device.mobile` | 모바일 | Mobile |
| `response.meta.device.desktop` | PC / 기타 디바이스 | PC / Generic Device |
| `response.meta.source` | 출처 | Source |
| `response.meta.url` | 페이지 URL | Page URL |
| `response.meta.browser` | 브라우저 | Browser |
| `response.meta.os` | 운영체제 | OS |
| `response.meta.country` | 국가 | Country |
| `response.meta.action` | 액션 | Action |
| `response.meta.ipAddress` | IP 주소 | IP Address |
| `response.meta.contactAttributes` | 연락처 속성 | Contact Attributes |
| `response.meta.language` | 언어 | Language |
| `response.ttc.label` | 소요 시간 | Time to Complete |
| `response.error.loadFailed` | 응답 목록을 불러오는 데 실패했습니다 | Failed to load responses |
| `response.error.retry` | 다시 시도 | Retry |
| `response.error.deleteFailed` | 응답 삭제에 실패했습니다 | Failed to delete response |
| `response.error.tagFailed` | 태그 작업에 실패했습니다 | Tag operation failed |
| `response.error.validationFailed` | 응답 검증에 실패했습니다 | Response validation failed |
| `response.variables` | 변수 | Variables |
| `response.hiddenFields` | 히든 필드 | Hidden Fields |
| `response.submit` | 제출 | Submit |
| `response.submitting` | 제출 중... | Submitting... |
| `response.autoSaved` | 자동 저장됨 | Auto-saved |
| `response.required` | 필수 항목입니다 | This field is required |

---

## 부록: 기존 계획 대비 변경 사항 요약

### @coltorapps/builder 도입으로 인한 핵심 변경

| 영역 | 기존 계획 | @coltorapps/builder 기반 |
|------|----------|------------------------|
| **응답 수집 런타임** | 커스텀 폼 상태 관리 (useState/useReducer 등) | `useInterpreterStore(surveyBuilder, surveySchema)` 사용. 값 관리, 에러 상태가 내장됨 |
| **부분 응답 복원** | 커스텀 초기값 로딩 로직 | `initialData: { entitiesValues: savedData }` 옵션으로 한 줄 복원 |
| **클라이언트 검증** | 커스텀 유효성 검증 함수 | `interpreterStore.validateEntitiesValues()` 호출. Entity의 validate 메서드가 자동 실행 |
| **서버 검증** | DTO class-validator만 의존 | `validateEntitiesValues(data, surveyBuilder, schema)` 서버 사이드 이중 검증 추가 |
| **질문 렌더링** | 커스텀 switch/map 기반 렌더링 | `InterpreterEntities` + `createEntityComponent`로 타입 안전한 렌더링 |
| **조건부 질문 스킵** | 커스텀 필터링 로직 | Entity의 `shouldBeProcessed` 반환값으로 자동 제외 (렌더링 + 검증 모두) |
| **응답 데이터 구조** | `Record<string, ResponseValue>` | `{ [entityId]: value }` flat map (동일한 구조이므로 호환됨) |
| **신규 패키지** | 없음 | `packages/survey-builder/` (서버/클라이언트 공유. builder + entity + attribute 정의) |
| **신규 컴포넌트** | 없음 | `SurveyInterpreter`, Entity Interpreter 컴포넌트들, `use-survey-interpreter` 훅 |
| **TTC 추적** | 커스텀 타이머 로직 | `onEntityValueUpdated` 이벤트 구독으로 자연스러운 TTC 측정 |
| **자동 저장** | 커스텀 debounce 로직 | `onEntityValueUpdated` 이벤트 + debounce로 자동 저장 |

### 변경 없는 영역 (기존 계획 유지)

| 영역 | 설명 |
|------|------|
| 응답 목록 조회 API | 서버 CRUD + 페이지네이션. builder와 무관 |
| 응답 필터링 시스템 | 22가지 연산자 -> Prisma WHERE. builder와 무관 |
| 태그 관리 시스템 | 태그 CRUD + 응답-태그 연결. builder와 무관 |
| 응답 삭제 | 5분 규칙, Quota 차감. builder와 무관 |
| 카드 뷰 / 테이블 뷰 UI | 응답 렌더링 + TanStack Table. builder와 무관 |
| 메타데이터 표시 | 아이콘 + 툴팁. builder와 무관 |
| 부분 응답 시각화 | 스킵/중단 그룹화 로직. builder와 무관 (다만 entityId 사용) |
| Prisma 스키마 | Response, Tag, ResponseTag 모델. builder와 무관 |
| i18n 번역 키 | 응답 관리 UI 번역. builder와 무관 (일부 검증 에러 키 추가) |
