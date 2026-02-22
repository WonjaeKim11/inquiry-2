> ⚠️ @coltorapps/builder 기반 재작성 (2026-02-22)

# 기능 구현 계획: 설문 생성, 유형 & 라이프사이클

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 설명 | 우선순위 |
|---------|--------|------|---------|
| FN-008-01 | 설문 유형 관리 | 설문 배포 유형을 link/app으로 분류. 기본값 app | 필수 |
| FN-008-02 | 설문 상태 관리 (라이프사이클) | draft -> inProgress -> paused/completed 상태 전이. 허용 매트릭스 기반 전이 제어 | 필수 |
| FN-008-03 | 설문 데이터 모델 관리 | 전체 Survey 스키마 정의 및 CRUD. CUID2 기반 ID, builder 스키마 구조 | 필수 |
| FN-008-04 | 설문 표시 옵션 관리 | displayOnce/displayMultiple/respondMultiple/displaySome 4가지 옵션 + displayLimit + displayPercentage | 필수 |
| FN-008-05 | autoComplete 기능 | 설정된 응답 수 도달 시 자동 completed 전환 | 필수 |
| FN-008-06 | Welcome Card 관리 | 설문 시작 전 환영 화면. 활성화 시 제목 필수, 다국어 지원 | 필수 |
| FN-008-07 | Ending (종료 카드) 관리 | endScreen/redirectToUrl 2종. 복수 종료 카드, CUID2 ID | 필수 |
| FN-008-08 | Hidden Fields 관리 | URL 파라미터 기반 숨김 필드. 금지 ID 10개, 형식 검증 | 필수 |
| FN-008-09 | Survey Variables 관리 | number/text 2종 변수. 이름 패턴 `^[a-z0-9_]+$`, ID/name 고유성 | 필수 |
| FN-008-10 | Draft 자동 저장 | 10초 간격 클라이언트 타이머. Builder Store의 getData()를 기반으로 변경 감지 및 서버 동기화 | 필수 |
| FN-008-11 | 템플릿 기반 설문 생성 | 역할/채널/산업 필터링. 프리셋 데이터를 builder 스키마 형태로 적용하여 draft 생성 | 필수 |
| FN-008-12 | 발행 시 유효성 검증 | builder의 validateSchema() + 비즈니스 규칙 검증 통합. 전체 오류 목록 일괄 반환 | 필수 |
| FN-008-13 | 추가 설정 필드 관리 | delay, PIN, reCAPTCHA, singleUse, slug, metadata 등 부가 설정 | 보통 |

### 1.2 비기능 요구사항

| NFR ID | 항목 | 요구사항 |
|--------|------|---------|
| NFR-001 | 자동 저장 성능 | 10초 간격, Ref 기반 구현으로 불필요한 리렌더링 방지. Builder Store의 getData()로 스냅샷 비교 |
| NFR-002 | DB 인덱싱 | Survey는 environmentId 기반 인덱스로 조회 최적화 |
| NFR-003 | 데이터 무결성 | builder의 validateSchema() + 커스텀 비즈니스 규칙 검증 이중 체계 |
| NFR-004 | Cascade 삭제 | Environment 삭제 시 해당 Survey 전체 Cascade 삭제 |
| NFR-005 | 보안 | PIN(4자리), reCAPTCHA(0.1~0.9), Single Use 암호화, 이메일 인증 |

### 1.3 명세서 내 모호한 점 및 해석

| 항목 | 모호한 점 | 해석/결정 |
|------|----------|----------|
| Environment 모델 부재 | 현재 DB에 Environment 모델이 없음. 설문은 environmentId를 필수 참조 | FSD-006(프로젝트/환경)이 2단계에 포함되어 있어 아직 미구현. Environment/Project 모델을 이 구현 계획에서 최소한으로 함께 생성하되, 관리 API는 FSD-006 구현 시 완성 |
| Welcome Card, Ending, Hidden Fields, Variables의 builder Entity 포함 여부 | builder의 flat entity map에 모든 요소를 넣을지, 별도 JSON 필드로 유지할지 | **결정: 하이브리드 접근** -- Block과 질문 유형(15종)만 builder Entity로 관리. Welcome Card, Ending, Hidden Fields, Variables는 Survey 모델의 별도 JSON 필드로 유지. 이유: (1) Welcome Card/Ending/Variables는 질문과 다른 라이프사이클을 가짐 (2) builder의 parent-child 계층 구조와 무관 (3) Ending은 복수이나 Block의 자식이 아님 (4) builder schema는 설문 콘텐츠(Block+Question)의 구조를 관리하는 데 집중 |
| questions vs blocks 상호 배타성 | questions가 deprecated이고 blocks로 대체 중이라 언급 | 신규 구현은 builder schema만 사용. questions 필드는 완전 제거. builder schema의 entities flat map이 questions/blocks를 통합 대체 |
| 템플릿 저장 위치 | 템플릿이 DB 저장인지 코드 내장인지 불명확 | 초기 구현은 코드 내장(JSON 파일) 방식으로 시드 템플릿 제공. 템플릿의 preset은 builder schema 형태로 정의 |
| creatorId nullable | creatorId가 nullable인 이유 미설명 | API를 통한 생성이나 시스템 자동 생성 시 null이 될 수 있다고 해석 |
| i18nString 타입 | Welcome Card, Ending 등의 다국어 문자열 타입 | `Record<string, string>` 형태의 JSON 객체. 기본 언어("default" 키) 필수 |
| autoComplete 판정 시점 | "응답 제출 시" 판정이라 되어 있으나, 응답 관리(FSD-021)가 미구현 | Survey 모델에 autoComplete 필드만 정의. 실제 판정 로직은 FSD-021 구현 시 트리거로 연결 |
| displayOption 런타임 동작 | displayOnce, displaySome 등의 실제 노출 제어 로직 | 설정 저장/검증만 담당. 실제 노출 제어는 FSD-019(타겟팅/트리거) 및 SDK(FSD-007)에서 처리 |

### 1.4 암묵적 요구사항

| 항목 | 설명 |
|------|------|
| Environment/Project 최소 모델 | Survey가 environmentId를 FK로 참조하므로, Project/Environment 모델을 최소한으로 생성해야 함 |
| @coltorapps/builder 패키지 도입 | `@coltorapps/builder` (core) + `@coltorapps/builder-react` (React 바인딩) 설치 필요 |
| @paralleldrive/cuid2 패키지 도입 | builder의 generateEntityId에서 CUID2 사용. Survey ID 및 entity ID 통일 |
| zod 패키지 도입 | builder attribute validation에서 Zod 스키마 사용 필수 |
| @dnd-kit 패키지 도입 | builder store와 DnD 통합을 위해 `@dnd-kit/core`, `@dnd-kit/sortable` 설치 |
| Survey Builder 정의 | `createBuilder()`로 surveyBuilder를 정의하는 공유 모듈 필요 (서버/클라이언트 양쪽에서 사용) |
| 설문 목록 조회 API | CRUD 중 목록 조회(List)가 명세에 명시되지 않았으나 필수 |
| Survey 접근 권한 확인 | Environment에 대한 사용자 접근 권한(Membership) 확인 Guard 필요 |
| 감사 로그 연동 | 설문 CRUD 및 상태 전이 시 AuditLog 기록 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

#### 2.1.1 @coltorapps/builder 도입에 따른 아키텍처 변경

기존 계획에서 `blocks: Json @default("[]")` + `questions: Json @default("[]")`의 중첩 배열 구조를 사용했으나, `@coltorapps/builder`의 flat entity map 기반 스키마로 전면 교체한다.

**핵심 설계 결정:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Survey 데이터 모델                         │
├─────────────────────────────────────────────────────────────┤
│  Prisma 컬럼 (직접 관리)      │  Builder Schema (schema Json) │
│  ────────────────────────────│  ──────────────────────────── │
│  name, type, status          │  entities: { flat map }       │
│  welcomeCard (Json)          │    - block Entity             │
│  endings (Json)              │    - openText Entity          │
│  hiddenFields (Json)         │    - rating Entity            │
│  variables (Json)            │    - ... (15종 질문 유형)      │
│  displayOption, autoComplete │  root: [block IDs]            │
│  pin, singleUse, recaptcha   │                               │
│  delay, slug, styling, ...   │                               │
└─────────────────────────────────────────────────────────────┘
```

- **Builder Schema에 포함되는 것**: Block(컨테이너) + 질문 유형 Entity(15종). parent-child 계층 구조를 builder가 관리
- **별도 JSON 필드로 유지하는 것**: Welcome Card, Ending, Hidden Fields, Variables. builder의 계층 구조와 무관한 독립 데이터

#### 2.1.2 공유 모듈 구조

```
packages/survey-builder-config/        # 서버/클라이언트 공유 모듈 (새로 생성)
├── src/
│   ├── index.ts                       # 퍼블릭 엑스포트
│   ├── builder.ts                     # surveyBuilder 정의 (createBuilder)
│   ├── entities/
│   │   ├── block.entity.ts            # Block 컨테이너 Entity
│   │   └── questions/                 # 질문 유형 Entity (FSD-009에서 상세화)
│   │       └── open-text.entity.ts    # 초기: openText 스텁 Entity
│   ├── attributes/
│   │   ├── headline.attribute.ts      # 재사용 가능 Attribute들
│   │   ├── required.attribute.ts
│   │   ├── description.attribute.ts
│   │   └── ...
│   └── types/
│       └── schema.types.ts           # Builder Schema 관련 TypeScript 타입

libs/server/survey/                    # 서버 모듈
├── src/
│   ├── index.ts
│   └── lib/
│       ├── survey.module.ts
│       ├── survey.controller.ts
│       ├── survey.service.ts
│       ├── survey-validation.service.ts   # builder validateSchema + 비즈니스 규칙
│       ├── survey-template.service.ts
│       ├── dto/
│       │   ├── create-survey.dto.ts
│       │   ├── update-survey.dto.ts
│       │   ├── survey-status.dto.ts
│       │   └── survey-query.dto.ts
│       ├── guards/
│       │   └── environment-access.guard.ts
│       ├── constants/
│       │   ├── hidden-field-forbidden-ids.ts
│       │   └── survey-status-transitions.ts
│       ├── templates/
│       │   └── default-templates.ts       # builder schema 형태의 프리셋
│       └── validators/
│           └── survey-publish.validator.ts

libs/client/survey/                     # 클라이언트 라이브러리
├── src/
│   ├── index.ts
│   └── lib/
│       ├── hooks/
│       │   ├── use-survey.ts
│       │   ├── use-auto-save.ts          # Builder Store getData() 기반
│       │   ├── use-survey-templates.ts
│       │   └── use-survey-builder-store.ts  # useBuilderStore 래퍼
│       ├── api/
│       │   └── survey-api.ts
│       └── types/
│           └── survey.types.ts

apps/client/src/app/[lng]/surveys/
├── page.tsx                            # 설문 목록 페이지
├── new/
│   └── page.tsx                        # 새 설문 생성 (유형 선택 + 템플릿)
└── [surveyId]/
    └── edit/
        └── page.tsx                    # 설문 편집기 (Builder Store + 자동 저장)
```

#### 2.1.3 데이터 흐름

```
[클라이언트: 설문 편집기]
    │
    ├── useBuilderStore(surveyBuilder, { initialData: savedSchema })
    │     │
    │     ├── addEntity / deleteEntity / setEntityAttributeValue
    │     │     (Block, Question 조작 → Builder Store 이벤트 발생)
    │     │
    │     └── getData() → schema 스냅샷 추출
    │
    ├── (10초마다) useAutoSave 훅
    │     │   builderStore.getData().schema + 별도 JSON 필드들
    │     └── PUT /surveys/:id (전체 Survey 데이터)
    │
    └── (발행 요청) → POST /surveys/:id/publish
                          │
                          v
                    [서버: SurveyController]
                          │
                          v
                    [서버: SurveyService]
                          │
                          ├── validateSchema(surveyBuilder, schema)  ← builder 검증
                          ├── SurveyValidationService.validate()      ← 비즈니스 규칙
                          ├── 상태 전이 → 매트릭스 확인
                          └── 감사 로그 → AuditLogService
```

### 2.2 데이터 모델

#### 2.2.1 선행 모델: Project, Environment (최소 정의)

```prisma
/// 프로젝트 (Environment의 상위 개념)
model Project {
  id             String   @id @default(cuid())
  name           String
  organizationId String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  environments Environment[]

  @@index([organizationId])
  @@map("projects")
}

/// 설문이 속한 실행 환경 (개발/프로덕션)
model Environment {
  id        String   @id @default(cuid())
  type      String   @default("production") // "development" | "production"
  projectId String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  project   Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  surveys   Survey[]

  @@index([projectId])
  @@map("environments")
}
```

#### 2.2.2 핵심 모델: Survey

```prisma
/// 설문 유형
enum SurveyType {
  link
  app
}

/// 설문 상태 (라이프사이클)
enum SurveyStatus {
  draft
  inProgress
  paused
  completed
}

/// 설문 표시 옵션
enum SurveyDisplayOption {
  displayOnce
  displayMultiple
  respondMultiple
  displaySome
}

/// 설문 데이터 모델
model Survey {
  id            String              @id @default(cuid())
  name          String
  type          SurveyType          @default(app)
  status        SurveyStatus        @default(draft)
  environmentId String
  creatorId     String?

  // @coltorapps/builder 스키마 (핵심 변경)
  // flat entity map 구조: { entities: {...}, root: [...] }
  schema        Json                @default("{\"entities\":{},\"root\":[]}")

  // 표시 옵션
  displayOption     SurveyDisplayOption @default(displayOnce)
  displayLimit      Int?
  displayPercentage Float?              // 0.01 ~ 100

  // 콘텐츠 (builder schema 외부의 독립 JSON 필드)
  welcomeCard       Json             @default("{\"enabled\":false}")
  endings           Json             @default("[]")
  hiddenFields      Json             @default("{\"enabled\":false}")
  variables         Json             @default("[]")
  followUps         Json             @default("[]")
  triggers          Json             @default("[]")

  // 설정
  delay                            Int              @default(0)
  autoClose                        Int?
  autoComplete                     Int?
  recontactDays                    Int?
  pin                              String?          // 정확히 4자리
  singleUse                        Json?            @default("{\"enabled\":false,\"isEncrypted\":true}")
  isVerifyEmailEnabled             Boolean          @default(false)
  isSingleResponsePerEmailEnabled  Boolean          @default(false)
  isBackButtonHidden               Boolean          @default(false)
  isIpCollectionEnabled            Boolean          @default(false)
  showLanguageSwitch               Boolean?

  // 보안/스팸 방지
  recaptcha          Json?

  // 스타일링/브랜딩
  projectOverwrites  Json?
  styling            Json?

  // 다국어
  languages          Json             @default("[]")

  // SEO/메타데이터 (link 유형)
  surveyMetadata     Json?
  slug               String?
  surveyClosedMessage Json?

  // 커스텀 스크립트
  customHeadScript     String?
  customHeadScriptMode String?        // "add" | "replace"

  // 세그먼트
  segment            Json?

  // 타임스탬프
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // 관계
  environment Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)
  creator     User?       @relation(fields: [creatorId], references: [id], onDelete: SetNull)

  @@index([environmentId])
  @@index([status])
  @@index([type])
  @@index([createdAt])
  @@map("surveys")
}
```

**기존 계획 대비 핵심 변경점:**
- `blocks Json @default("[]")` 제거 → `schema Json` 필드로 대체
- `questions Json @default("[]")` (deprecated) 완전 제거
- `schema`는 builder의 flat entity map 구조: `{ entities: {...}, root: [...] }`
- Welcome Card, Ending, Hidden Fields, Variables는 별도 JSON 필드 유지

#### 2.2.3 Builder Schema 내부 구조 (schema 필드)

```typescript
// builder schema 필드의 JSON 구조
interface SurveyBuilderSchema {
  entities: {
    [entityId: string]: {
      type: 'block' | 'openText' | 'rating' | /* ...15종 질문 유형 */;
      attributes: Record<string, unknown>;
      parentId?: string;   // block의 자식인 경우 block의 entityId
      children?: string[]; // block인 경우 자식 entity ID 배열
    };
  };
  root: string[];  // 최상위 entity ID 배열 (보통 block들)
}

// 예시
{
  entities: {
    "clxyz001": {
      type: "block",
      attributes: { name: "페이지 1" },
      children: ["clxyz002", "clxyz003"]
    },
    "clxyz002": {
      type: "openText",
      attributes: { headline: { default: "이름을 알려주세요" }, required: true },
      parentId: "clxyz001"
    },
    "clxyz003": {
      type: "rating",
      attributes: { headline: { default: "만족도를 평가해주세요" }, scale: "star", range: 5 },
      parentId: "clxyz001"
    }
  },
  root: ["clxyz001"]
}
```

### 2.3 API 설계

#### 2.3.1 설문 CRUD

| 엔드포인트 | 메서드 | 설명 | 인증 | 요청 본문 | 응답 |
|-----------|--------|------|------|----------|------|
| `GET /environments/:envId/surveys` | GET | 설문 목록 조회 | JWT 필수 | Query: page, limit, status, type | `{ data: Survey[], meta: { total, page, limit } }` |
| `POST /environments/:envId/surveys` | POST | 설문 생성 | JWT 필수 | CreateSurveyDto | `{ data: Survey }` |
| `GET /surveys/:id` | GET | 설문 상세 조회 | JWT 필수 | - | `{ data: Survey }` |
| `PUT /surveys/:id` | PUT | 설문 수정 (자동 저장 포함) | JWT 필수 | UpdateSurveyDto (schema 포함) | `{ data: Survey }` |
| `DELETE /surveys/:id` | DELETE | 설문 삭제 | JWT 필수 | - | `{ message: string }` |

**PUT /surveys/:id 요청 본문 변경 (builder 기반):**

```typescript
// UpdateSurveyDto - schema 필드가 builder의 flat entity map 구조
{
  name?: string;
  schema?: {                          // builder schema (핵심 변경)
    entities: Record<string, EntityInstance>;
    root: string[];
  };
  welcomeCard?: WelcomeCardSchema;    // 별도 JSON
  endings?: EndingSchema[];           // 별도 JSON
  hiddenFields?: HiddenFieldsSchema;  // 별도 JSON
  variables?: VariableSchema[];       // 별도 JSON
  displayOption?: SurveyDisplayOption;
  // ... 기타 설정 필드
}
```

#### 2.3.2 설문 상태 전이 (기존과 동일)

| 엔드포인트 | 메서드 | 설명 | 전이 | 선행 조건 |
|-----------|--------|------|------|----------|
| `POST /surveys/:id/publish` | POST | 설문 발행 | draft -> inProgress | builder validateSchema() + 비즈니스 규칙 통과 |
| `POST /surveys/:id/pause` | POST | 설문 일시정지 | inProgress -> paused | - |
| `POST /surveys/:id/resume` | POST | 설문 재개 | paused -> inProgress | - |
| `POST /surveys/:id/complete` | POST | 설문 완료 | inProgress -> completed | - |

#### 2.3.3 템플릿 (기존과 동일)

| 엔드포인트 | 메서드 | 설명 | 인증 | 쿼리 파라미터 |
|-----------|--------|------|------|-------------|
| `GET /templates` | GET | 템플릿 목록 조회 | JWT 필수 | role, channels, industries (필터) |
| `POST /environments/:envId/surveys/from-template` | POST | 템플릿 기반 설문 생성 | JWT 필수 | `{ templateName: string, name: string, type?: SurveyType }` |

#### 2.3.4 발행 검증 응답 형식 (builder 통합)

```typescript
// 발행 성공
{ data: Survey } // status: "inProgress"

// 발행 실패 (422 Unprocessable Entity)
{
  statusCode: 422,
  message: "설문 유효성 검증에 실패했습니다.",
  errors: [
    // builder 스키마 검증 오류
    { source: "builder", entityId: "clxyz002", attribute: "headline", message: "제목은 필수입니다" },
    { source: "builder", schemaError: "스키마에 최소 1개의 질문이 필요합니다" },
    // 비즈니스 규칙 검증 오류
    { source: "business", ruleId: "BR-12-07", field: "welcomeCard.headline", message: "Welcome Card가 활성화되었으나 제목이 없습니다" },
    { source: "business", ruleId: "BR-12-10", field: "pin", message: "PIN은 정확히 4자리여야 합니다" }
  ]
}
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 Survey Builder 정의 (공유 모듈)

```typescript
// packages/survey-builder-config/src/builder.ts
import { createBuilder, createEntity, createAttribute } from '@coltorapps/builder';
import { createId, isCuid } from '@paralleldrive/cuid2';
import { z } from 'zod';
import { blockEntity } from './entities/block.entity';
import { openTextEntity } from './entities/questions/open-text.entity';
// ... 추가 질문 유형 Entity (FSD-009에서 상세화)

/**
 * 설문 빌더 정의.
 * Block(컨테이너) + 질문 유형(15종)의 parent-child 계층을 관리한다.
 * CUID2를 entity ID로 사용하며, 스키마 수준 비즈니스 규칙을 포함한다.
 */
export const surveyBuilder = createBuilder({
  entities: [blockEntity, openTextEntity /* , ...추가 질문 유형 */],
  entitiesExtensions: {
    block: {
      childrenAllowed: ['openText' /* , ...추가 질문 유형 */],
    },
    openText: {
      parentRequired: true,
      allowedParents: ['block'],
    },
    // ... 모든 질문 유형에 대해 parentRequired + allowedParents 설정
  },
  // CUID2 기반 entity ID 생성
  generateEntityId() {
    return createId();
  },
  validateEntityId(id) {
    if (!isCuid(id)) {
      throw new Error(`유효하지 않은 entity ID 형식입니다: ${id}`);
    }
  },
  // 스키마 수준 비즈니스 규칙
  validateSchema(schema) {
    // Entity ID 고유성은 flat map 구조에 의해 자동 보장
    // 추가 규칙: 최소 1개 block, block 내 최소 1개 질문 등
    const blocks = Object.values(schema.entities).filter(e => e.type === 'block');
    if (blocks.length === 0) {
      throw new Error('설문에 최소 1개의 블록이 필요합니다');
    }
    const questions = Object.values(schema.entities).filter(e => e.type !== 'block');
    if (questions.length === 0) {
      throw new Error('설문에 최소 1개의 질문이 필요합니다');
    }
    return schema;
  },
});
```

#### 2.4.2 Block Entity 정의

```typescript
// packages/survey-builder-config/src/entities/block.entity.ts
import { createEntity, createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

const blockNameAttribute = createAttribute({
  name: 'name',
  validate(value) {
    return z.string().min(1, '블록 이름은 필수입니다').parse(value);
  },
});

/**
 * Block Entity: 질문을 담는 컨테이너 (페이지 개념).
 * childrenAllowed는 builder의 entitiesExtensions에서 설정한다.
 */
export const blockEntity = createEntity({
  name: 'block',
  attributes: [blockNameAttribute],
  defaultValue: {
    name: 'Block',
  },
});
```

#### 2.4.3 상태 전이 매트릭스 (서버)

```typescript
// libs/server/survey/src/lib/constants/survey-status-transitions.ts
import { SurveyStatus } from '@prisma/client';

/**
 * 설문 상태 전이 허용 매트릭스.
 * 각 키는 현재 상태, 값 배열은 허용된 목표 상태를 나타낸다.
 * completed에서는 어떤 상태로도 전이할 수 없다.
 */
export const SURVEY_STATUS_TRANSITIONS: Record<SurveyStatus, SurveyStatus[]> = {
  draft: ['inProgress'],              // 발행만 허용
  inProgress: ['paused', 'completed'], // 일시정지 또는 완료
  paused: ['inProgress'],             // 재개만 허용
  completed: [],                      // 전이 불가
};
```

#### 2.4.4 발행 유효성 검증 서비스 (builder + 비즈니스 규칙 통합)

```typescript
// libs/server/survey/src/lib/survey-validation.service.ts
import { Injectable } from '@nestjs/common';
import { validateSchema } from '@coltorapps/builder';
import { surveyBuilder } from '@inquiry/survey-builder-config';

@Injectable()
export class SurveyValidationService {
  /**
   * 발행 검증을 2단계로 수행한다:
   * 1단계: builder의 validateSchema()로 스키마 구조 + 속성값 검증
   * 2단계: 비즈니스 규칙 검증 (Welcome Card, Hidden Fields, Variables, PIN 등)
   *
   * 일부 실패해도 나머지 검증을 계속 수행하여 전체 오류 목록을 반환한다.
   */
  async validateForPublish(survey: SurveyWithRelations): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // 1단계: builder 스키마 검증
    const schemaResult = await validateSchema(surveyBuilder, survey.schema);
    if (!schemaResult.success) {
      // builder 검증 오류를 표준 오류 형태로 변환
      if (schemaResult.schemaError) {
        errors.push({ source: 'builder', schemaError: schemaResult.schemaError.message });
      }
      if (schemaResult.entitiesAttributesErrors) {
        for (const [entityId, attrErrors] of Object.entries(schemaResult.entitiesAttributesErrors)) {
          for (const [attr, error] of Object.entries(attrErrors)) {
            errors.push({ source: 'builder', entityId, attribute: attr, message: String(error) });
          }
        }
      }
    }

    // 2단계: 비즈니스 규칙 검증
    // BR-12-04: Ending ID 고유성
    // BR-12-05~06: Variable ID/name 고유성
    // BR-12-07: Welcome Card 제목 필수
    // BR-12-08: 다국어 완성도
    // BR-12-10~17: PIN, autoComplete, displayPercentage, reCAPTCHA, slug, hiddenFields, variable 형식

    return { isValid: errors.length === 0, errors };
  }
}
```

#### 2.4.5 자동 저장 훅 (Builder Store 통합)

```typescript
// libs/client/survey/src/lib/hooks/use-auto-save.ts
/**
 * Draft 설문의 10초 간격 자동 저장을 담당하는 훅.
 * Builder Store의 getData().schema를 포함한 전체 설문 데이터를 서버에 동기화한다.
 *
 * 저장 조건 4가지:
 * 1. 설문 상태가 draft
 * 2. 브라우저 탭이 활성 상태 (Page Visibility API)
 * 3. 변경 사항 존재 (builderStore.getData() + 별도 필드 deep-equal 비교)
 * 4. 자동 저장 중 또는 수동 저장 중 플래그가 false
 *
 * Builder Store의 이벤트(onEntityAdded 등)가 발생해도
 * 즉시 저장하지 않고 10초 타이머에 의존한다.
 */
export function useAutoSave(params: {
  surveyId: string;
  status: SurveyStatus;
  builderStore: BuilderStoreInstance;
  surveyData: SurveyEditableFields;  // welcomeCard, endings 등 builder 외부 데이터
}): AutoSaveReturn {
  const isAutoSavingRef = useRef(false);
  const isManualSavingRef = useRef(false);
  const lastSavedDataRef = useRef<SerializedSurvey | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // ...
}
```

#### 2.4.6 Hidden Fields 금지 ID 상수

```typescript
// libs/server/survey/src/lib/constants/hidden-field-forbidden-ids.ts
export const HIDDEN_FIELD_FORBIDDEN_IDS = [
  'userId', 'source', 'suid', 'end', 'start',
  'welcomeCard', 'hidden', 'verifiedEmail', 'multiLanguage', 'embed',
] as const;
```

### 2.5 기존 시스템 영향 분석

| 영향 대상 | 변경 유형 | 상세 |
|----------|----------|------|
| `packages/db/prisma/schema.prisma` | 수정 | Project, Environment, Survey 모델 추가. SurveyType/SurveyStatus/SurveyDisplayOption enum 추가. User, Organization에 관계 추가 |
| `apps/server/src/app/app.module.ts` | 수정 | SurveyModule import 추가 |
| `libs/server/audit-log/` | 확장 사용 | survey.create, survey.update, survey.delete, survey.publish 등 감사 이벤트 추가 |
| `libs/client/core/src/lib/api.ts` | 기존 유지 | apiFetch 래퍼를 그대로 활용 |
| `apps/client/src/app/i18n/locales/` | 수정 | ko/en 번역 파일에 survey 관련 키 추가 |
| `libs/client/ui/` | 확장 사용 | shadcn/ui 컴포넌트(Switch, Select, Dialog, Tabs, RadioGroup 등) 추가 필요 시 설치 |
| `package.json` | 수정 | `@coltorapps/builder`, `@coltorapps/builder-react`, `@paralleldrive/cuid2`, `zod`, `@dnd-kit/core`, `@dnd-kit/sortable`, `deep-equal` 의존성 추가 |

---

## 3. 구현 계획

### 3.1 작업 분류 구조 (WBS)

#### Phase 1: 데이터 기반 및 공유 모듈 구축

| No. | 태스크명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|---------|------|--------|--------|----------|
| T-01 | 패키지 의존성 설치 | `@coltorapps/builder`, `@coltorapps/builder-react`, `@paralleldrive/cuid2`, `zod`, `@dnd-kit/core`, `@dnd-kit/sortable`, `deep-equal` 설치 | 없음 | 하 | 0.5h |
| T-02 | Prisma 스키마 확장 | Project, Environment 최소 모델 + Survey 전체 모델 + enum 정의. User/Organization 관계 추가. `schema Json` 필드 적용 | T-01 | 중 | 2h |
| T-03 | DB 마이그레이션 실행 | `prisma migrate dev`로 마이그레이션 생성 및 적용 | T-02 | 하 | 0.5h |
| T-04 | Survey Builder Config 공유 모듈 생성 | `packages/survey-builder-config` 패키지 스캐폴딩. Nx 라이브러리 설정 | T-01 | 하 | 1h |
| T-05 | Attribute 정의 | 재사용 가능한 Attribute 파일 생성: headline, required, description, name 등. Zod 스키마 기반 validate 구현 | T-04 | 중 | 2h |
| T-06 | Block Entity 정의 | blockEntity 생성. name attribute, defaultValue 설정 | T-05 | 하 | 0.5h |
| T-07 | 초기 Question Entity 정의 (스텁) | openText 등 2-3개 기본 질문 유형 Entity를 스텁으로 생성. FSD-009 구현 시 상세화 | T-05 | 중 | 1.5h |
| T-08 | surveyBuilder 정의 | createBuilder()로 surveyBuilder 생성. entitiesExtensions(parent-child 제약), generateEntityId(CUID2), validateEntityId, validateSchema(비즈니스 규칙) 설정 | T-06, T-07 | 상 | 2h |

#### Phase 2: 서버 핵심 모듈

| No. | 태스크명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|---------|------|--------|--------|----------|
| T-09 | Survey 서버 라이브러리 생성 | `nx g @nx/nest:library server-survey --directory=libs/server/survey` Nx 라이브러리 스캐폴딩 | T-03 | 하 | 0.5h |
| T-10 | 상수/타입 정의 | 상태 전이 매트릭스, 금지 Hidden Field ID, 변수 이름 패턴 등 상수 파일 | T-09 | 하 | 1h |
| T-11 | DTO 정의 | CreateSurveyDto, UpdateSurveyDto(schema 필드 포함), SurveyQueryDto. class-validator 데코레이터 적용 | T-09, T-10 | 중 | 2h |
| T-12 | Environment 접근 권한 Guard | JWT 사용자가 해당 Environment의 Organization 멤버인지 확인하는 Guard | T-03 | 중 | 2h |
| T-13 | SurveyService 구현 (CRUD) | 생성/조회/목록/수정/삭제 비즈니스 로직. 수정 시 builder validateSchema() 호출하여 스키마 검증 후 저장. 감사 로그 연동 | T-08, T-11, T-12 | 상 | 4h |
| T-14 | 상태 전이 로직 구현 | publish/pause/resume/complete 각 전이 메서드. 매트릭스 검증 포함 | T-13 | 중 | 2h |
| T-15 | SurveyValidationService 구현 | builder validateSchema() + 비즈니스 규칙 검증 통합. 전체 오류 일괄 반환 | T-08, T-13 | 상 | 4h |
| T-16 | SurveyTemplateService 구현 | 내장 템플릿 로딩, 필터링. 프리셋을 builder schema 형태로 적용 | T-08, T-13 | 중 | 2h |
| T-17 | SurveyController 구현 | REST API 엔드포인트 연결. Guard, DTO 파이프 적용 | T-13, T-14, T-15, T-16 | 중 | 2h |
| T-18 | SurveyModule 등록 | AppModule에 SurveyModule import. NestJS 의존성 주입 구성 | T-17 | 하 | 0.5h |

#### Phase 3: 클라이언트 기반 구축

| No. | 태스크명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|---------|------|--------|--------|----------|
| T-19 | Survey 클라이언트 라이브러리 생성 | `nx g @nx/react:library client-survey --directory=libs/client/survey` | T-18 | 하 | 0.5h |
| T-20 | 클라이언트 타입 정의 | Survey, WelcomeCard, Ending, Variable 등 TypeScript 타입/인터페이스. builder schema 타입 포함 | T-19, T-08 | 중 | 1.5h |
| T-21 | Survey API 클라이언트 | apiFetch 기반 CRUD/상태전이/템플릿 API 호출 함수. schema 필드 직렬화/역직렬화 포함 | T-19, T-20 | 중 | 2h |
| T-22 | useSurveyBuilderStore 래퍼 훅 | useBuilderStore(surveyBuilder, { initialData }) 래퍼. DB에서 가져온 schema를 initialData로 주입 | T-08, T-21 | 중 | 1.5h |
| T-23 | useAutoSave 훅 구현 | builderStore.getData().schema + 별도 필드 기반 10초 자동 저장. Ref 기반, Page Visibility API, deep-equal 변경 감지 | T-21, T-22 | 상 | 3h |
| T-24 | useSurvey 훅 구현 | 설문 CRUD 상태 관리 훅 (로딩/에러/데이터) | T-21 | 중 | 2h |
| T-25 | useSurveyTemplates 훅 구현 | 템플릿 목록 조회 및 필터링 훅 | T-21 | 하 | 1h |

#### Phase 4: 클라이언트 UI 페이지

| No. | 태스크명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|---------|------|--------|--------|----------|
| T-26 | 설문 목록 페이지 | environmentId 기반 설문 목록 표시. 상태 필터, 유형 필터. 페이지네이션 | T-24 | 중 | 3h |
| T-27 | 새 설문 생성 페이지 | 유형 선택(link/app) + 템플릿 갤러리(역할/채널/산업 필터) + Scratch 생성 | T-24, T-25 | 중 | 3h |
| T-28 | 설문 편집기 기본 프레임 | useBuilderStore로 스키마 로드, BuilderEntities로 Block/Question 렌더링, 자동 저장 연동, AutoSave Indicator, 상태 전이 버튼. "use client" 디렉티브 적용 | T-22, T-23, T-24 | 상 | 5h |
| T-29 | Block/Question DnD 통합 | @dnd-kit/core + @dnd-kit/sortable로 Block 순서 변경 및 Block 내 Question 순서 변경. builderStore.setData() immutable 업데이트 | T-28 | 상 | 3h |
| T-30 | Welcome Card 편집 UI | 활성화 토글, 제목/부제목/이미지/비디오/버튼 라벨 편집. builder 외부 데이터로 관리 | T-28 | 중 | 2h |
| T-31 | Ending 편집 UI | endScreen/redirectToUrl 추가/삭제/편집. 복수 종료 카드 관리. builder 외부 데이터 | T-28 | 중 | 2h |
| T-32 | Hidden Fields 편집 UI | 활성화 토글, 필드 ID 추가/삭제, 금지 ID 실시간 검증 | T-28 | 중 | 1.5h |
| T-33 | Variables 편집 UI | number/text 변수 추가/수정/삭제, 이름 패턴 검증 | T-28 | 중 | 1.5h |
| T-34 | 표시 옵션 편집 UI | 4가지 옵션 라디오, displayLimit 조건부 입력, displayPercentage 입력 | T-28 | 하 | 1h |
| T-35 | 추가 설정 편집 UI | delay, PIN, reCAPTCHA, singleUse, slug, metadata 등 설정 패널 | T-28 | 중 | 2h |
| T-36 | 발행 검증 결과 UI | builder 검증 오류 + 비즈니스 규칙 오류 통합 표시 모달. entityId 클릭 시 해당 entity로 포커스 | T-28 | 중 | 2h |

#### Phase 5: i18n 및 마무리

| No. | 태스크명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|---------|------|--------|--------|----------|
| T-37 | i18n 번역 키 추가 | ko/en 번역 파일에 survey 관련 모든 UI 문자열 추가 | T-26~T-36 | 중 | 2h |
| T-38 | shadcn/ui 컴포넌트 추가 | Switch, Select, Dialog, Tabs, RadioGroup 등 필요 컴포넌트 설치 | 없음 | 하 | 1h |
| T-39 | 서버 단위 테스트 | SurveyService, SurveyValidationService(builder + 비즈니스), 상태 전이 로직 테스트 | T-13, T-14, T-15 | 상 | 4h |
| T-40 | Builder Config 단위 테스트 | surveyBuilder 정의 검증: entity 관계 제약, validateSchema, generateEntityId/validateEntityId | T-08 | 중 | 2h |
| T-41 | 클라이언트 훅 테스트 | useAutoSave 훅 테스트 (builderStore mock, 타이머, 조건 분기, 변경 감지) | T-23 | 중 | 2h |
| T-42 | API 통합 테스트 | CRUD(schema 필드 포함), 상태 전이, 발행 검증(builder + 비즈니스) E2E 테스트 | T-18 | 상 | 3h |

**총 예상 시간: 약 76시간 (9.5일 기준, 8h/일)**

### 3.2 구현 순서 및 마일스톤

```
Milestone 1: 공유 모듈 + 데이터 기반 (T-01 ~ T-08)
├── 검증: packages/survey-builder-config 빌드 성공
├── 검증: surveyBuilder에 entity 추가/삭제/속성 변경 테스트 (단위)
├── 검증: prisma migrate 성공, DB 테이블 생성 확인
└── 빌드: packages/db + packages/survey-builder-config 빌드 성공

Milestone 2: 서버 API 완성 (T-09 ~ T-18)
├── 검증: curl/Postman으로 CRUD 동작 확인 (schema 필드 포함)
├── 검증: PUT /surveys/:id에 잘못된 schema 전송 시 builder 검증 오류 반환
├── 검증: POST /surveys/:id/publish에서 builder + 비즈니스 규칙 통합 검증 확인
├── 검증: 잘못된 상태 전이 시 에러 응답 확인
└── 빌드: apps/server 빌드 성공

Milestone 3: 클라이언트 기반 (T-19 ~ T-25, T-38)
├── 검증: API 클라이언트 함수 단위 확인
├── 검증: useBuilderStore initialData 로딩 확인
├── 검증: useAutoSave 훅 독립 테스트 (builderStore mock)
└── 빌드: libs/client/survey 빌드 성공

Milestone 4: 클라이언트 UI 완성 (T-26 ~ T-37)
├── 검증: 설문 목록 → 새 설문 생성 → 편집기에서 Block/Question 추가/삭제/DnD → 발행 플로우
├── 검증: BuilderEntities로 entity 렌더링 정상 동작
├── 검증: DnD로 Block/Question 순서 변경 후 builderStore 데이터 반영 확인
├── 검증: 자동 저장 인디케이터 표시 확인
├── 검증: 발행 실패 시 builder 오류 + 비즈니스 오류 통합 표시 확인
├── 검증: 한국어/영어 전환 시 모든 UI 문자열 정상 표시
└── 빌드: apps/client 빌드 성공

Milestone 5: 테스트 및 품질 확보 (T-39 ~ T-42)
├── 검증: builder config 단위 테스트 통과
├── 검증: 서버 단위 테스트 통과
├── 검증: 클라이언트 훅 테스트 통과
├── 검증: API 통합 테스트 통과
└── 빌드: 전체 빌드 성공
```

### 3.3 파일 수정 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|----------|----------|
| `package.json` | 수정 | `@coltorapps/builder`, `@coltorapps/builder-react`, `@paralleldrive/cuid2`, `zod`, `@dnd-kit/core`, `@dnd-kit/sortable`, `deep-equal` 의존성 추가 |
| `packages/db/prisma/schema.prisma` | 수정 | SurveyType, SurveyStatus, SurveyDisplayOption enum 추가. Project, Environment, Survey 모델 추가. User/Organization에 관계 필드 추가. Survey에 `schema Json` 필드 적용 |
| `packages/survey-builder-config/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 (surveyBuilder, entity, attribute 타입) |
| `packages/survey-builder-config/src/builder.ts` | 생성 | createBuilder()로 surveyBuilder 정의. entitiesExtensions, generateEntityId, validateEntityId, validateSchema 설정 |
| `packages/survey-builder-config/src/entities/block.entity.ts` | 생성 | Block 컨테이너 Entity 정의 |
| `packages/survey-builder-config/src/entities/questions/open-text.entity.ts` | 생성 | openText 질문 유형 Entity 스텁 (FSD-009에서 상세화) |
| `packages/survey-builder-config/src/attributes/headline.attribute.ts` | 생성 | 다국어 headline Attribute (Zod 검증) |
| `packages/survey-builder-config/src/attributes/required.attribute.ts` | 생성 | required 불리언 Attribute (Zod 검증) |
| `packages/survey-builder-config/src/attributes/description.attribute.ts` | 생성 | description 텍스트 Attribute (Zod 검증) |
| `packages/survey-builder-config/src/types/schema.types.ts` | 생성 | Builder Schema 관련 TypeScript 타입 |
| `apps/server/src/app/app.module.ts` | 수정 | SurveyModule import 추가 |
| `libs/server/survey/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 |
| `libs/server/survey/src/lib/survey.module.ts` | 생성 | NestJS 모듈 정의 |
| `libs/server/survey/src/lib/survey.controller.ts` | 생성 | CRUD + 상태 전이 + 템플릿 REST API 컨트롤러 |
| `libs/server/survey/src/lib/survey.service.ts` | 생성 | 설문 CRUD, 상태 전이, 감사 로그 연동. 수정 시 builder validateSchema() 호출 |
| `libs/server/survey/src/lib/survey-validation.service.ts` | 생성 | builder validateSchema() + 비즈니스 규칙 통합 검증. 전체 오류 일괄 반환 |
| `libs/server/survey/src/lib/survey-template.service.ts` | 생성 | 내장 템플릿 로딩, 필터링, builder schema 형태 프리셋 적용 |
| `libs/server/survey/src/lib/dto/create-survey.dto.ts` | 생성 | 설문 생성 DTO (class-validator) |
| `libs/server/survey/src/lib/dto/update-survey.dto.ts` | 생성 | 설문 수정 DTO. schema 필드(builder flat map) 포함 |
| `libs/server/survey/src/lib/dto/survey-query.dto.ts` | 생성 | 목록 조회 쿼리 파라미터 DTO |
| `libs/server/survey/src/lib/dto/survey-status.dto.ts` | 생성 | 상태 전이 관련 DTO |
| `libs/server/survey/src/lib/guards/environment-access.guard.ts` | 생성 | Environment 접근 권한 확인 Guard |
| `libs/server/survey/src/lib/constants/survey-status-transitions.ts` | 생성 | 상태 전이 허용 매트릭스 |
| `libs/server/survey/src/lib/constants/hidden-field-forbidden-ids.ts` | 생성 | 금지 Hidden Field ID 목록 |
| `libs/server/survey/src/lib/templates/default-templates.ts` | 생성 | builder schema 형태의 내장 설문 템플릿 데이터 |
| `libs/server/survey/src/lib/validators/survey-publish.validator.ts` | 생성 | 비즈니스 규칙 발행 검증 개별 규칙 함수 모음 |
| `libs/client/survey/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 |
| `libs/client/survey/src/lib/types/survey.types.ts` | 생성 | 클라이언트 Survey 타입 정의 (builder schema 타입 포함) |
| `libs/client/survey/src/lib/api/survey-api.ts` | 생성 | apiFetch 기반 Survey API 클라이언트 |
| `libs/client/survey/src/lib/hooks/use-survey.ts` | 생성 | 설문 CRUD 상태 관리 훅 |
| `libs/client/survey/src/lib/hooks/use-auto-save.ts` | 생성 | builderStore 기반 Ref 10초 자동 저장 훅 |
| `libs/client/survey/src/lib/hooks/use-survey-templates.ts` | 생성 | 템플릿 조회/필터링 훅 |
| `libs/client/survey/src/lib/hooks/use-survey-builder-store.ts` | 생성 | useBuilderStore(surveyBuilder) 래퍼 훅 |
| `apps/client/src/app/[lng]/surveys/page.tsx` | 생성 | 설문 목록 페이지 |
| `apps/client/src/app/[lng]/surveys/new/page.tsx` | 생성 | 새 설문 생성 페이지 (유형 선택 + 템플릿) |
| `apps/client/src/app/[lng]/surveys/[surveyId]/edit/page.tsx` | 생성 | 설문 편집기 페이지 (BuilderEntities, DnD, 자동 저장) |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | survey 관련 한국어 번역 키 추가 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | survey 관련 영어 번역 키 추가 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 발생 확률 | 완화 전략 |
|--------|------|----------|----------|
| @coltorapps/builder와 NestJS 서버 환경 호환성 | 상 | 중간 | builder core 패키지는 환경 비의존적(isomorphic). 서버에서는 `validateSchema()`, `validateEntitiesValues()` 함수만 사용하므로 React 바인딩 불필요. 공유 모듈(`packages/survey-builder-config`)은 순수 JS/TS로 작성하여 서버/클라이언트 양쪽에서 import 가능하도록 설계 |
| builder schema와 기존 JSON 필드의 이중 관리 복잡성 | 중 | 높음 | Welcome Card/Ending/Variables는 builder 외부에 두되, 서버에서 통합 검증 서비스가 두 영역을 모두 커버. 명확한 책임 분리: builder = 구조(Block+Question), JSON = 메타데이터 |
| Environment/Project 모델 미확정 | 상 | 높음 | FSD-006 구현 전이므로 최소 스키마로 생성. 마이그레이션 호환성을 고려하여 nullable 필드로 설계 |
| builder validateSchema()의 async 특성으로 인한 성능 | 중 | 중간 | 자동 저장(PUT) 시에는 `validateSchemaShape()`(동기, 구조 검증만) 사용. 발행(Publish) 시에만 전체 `validateSchema()`(비동기, 속성값+변환 포함) 실행 |
| 자동 저장과 수동 저장의 동시성 충돌 | 중 | 중간 | Ref 기반 플래그로 동시 실행 방지. builderStore.getData()로 항상 최신 스냅샷을 가져오므로 stale 데이터 문제 없음 |
| builder의 entity 타입 확장 시 하위 호환성 | 중 | 중간 | FSD-009에서 질문 유형을 추가할 때 기존 스키마가 깨지지 않도록 `validateSchemaShape()`에서 미등록 entity type은 경고만 하고 패스. 또는 factory 패턴으로 버전별 builder 생성 |
| DnD와 builder store 통합 시 성능 | 중 | 중간 | `useBuilderStoreData`의 `shouldUpdate`를 활용하여 DnD 중 불필요한 리렌더링 방지. root/children 변경 이벤트에만 반응 |
| 대규모 설문(100+ entity)의 flat map 성능 | 하 | 낮음 | flat map은 O(1) 조회. builder store 내부가 이미 최적화되어 있음. 향후 필요 시 `shouldUpdate` 세분화 |
| 템플릿의 builder schema 형태 변환 | 중 | 중간 | 템플릿 프리셋을 처음부터 builder schema 형태(`{ entities, root }`)로 정의. 별도 변환 로직 불필요 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 테스트 대상 | 테스트 항목 | 우선순위 |
|------------|-----------|---------|
| `surveyBuilder` 정의 | entity 등록 확인, parent-child 관계 제약 검증(block만 children 허용, 질문은 block 내부만), generateEntityId가 CUID2 반환, validateEntityId가 비-CUID 거부 | 필수 |
| `surveyBuilder.validateSchema` | 빈 스키마 거부, block 없는 스키마 거부, 질문 없는 스키마 거부, 정상 스키마 통과 | 필수 |
| `validateSchema(surveyBuilder, schema)` | builder 레벨 전체 검증 (구조 + 속성값 + 비즈니스 규칙). 성공/실패 discriminated union 반환 확인 | 필수 |
| Attribute validate | 각 Attribute의 Zod 스키마 성공/실패 케이스. headline 빈 문자열 거부, required 불리언 파싱 등 | 필수 |
| `SurveyService.create` | 기본값 적용(type=app, status=draft, schema={entities:{},root:[]}), creatorId 설정, CUID2 ID 생성 | 필수 |
| `SurveyService.update` | schema 필드 포함 업데이트, validateSchemaShape() 통과 확인, updatedAt 자동 갱신 | 필수 |
| 상태 전이 매트릭스 검증 | 모든 허용/불가 조합 테스트 (4x4=16 케이스) | 필수 |
| `SurveyValidationService` | builder 검증 오류 + 비즈니스 규칙 오류 통합 반환 확인. 17개 비즈니스 규칙 각각 성공/실패 | 필수 |
| 금지 Hidden Field ID 검증 | 10개 금지 ID 각각 거부 + 허용 ID 통과 확인 | 필수 |
| Variable name 패턴 검증 | `^[a-z0-9_]+$` 패턴 통과/실패 케이스 | 필수 |
| PIN 형식 검증 | 4자리 정확히 일치 + 길이 위반 케이스 | 필수 |
| Slug 형식 검증 | `^[a-z0-9\-]+$` 패턴 통과/실패 케이스 | 보통 |

### 5.2 통합 테스트

| 테스트 시나리오 | 테스트 항목 | 우선순위 |
|---------------|-----------|---------|
| 설문 CRUD 전체 흐름 | POST 생성(schema={entities:{},root:[]}) -> GET 조회 -> PUT 수정(schema에 entity 추가) -> DELETE 삭제 | 필수 |
| 설문 수정 시 builder 검증 | PUT에 유효하지 않은 schema 전송 시 validateSchemaShape 오류 반환 확인 | 필수 |
| 설문 라이프사이클 전체 | 생성(draft) -> schema에 block+question 추가 -> 발행(inProgress) -> 일시정지(paused) -> 재개(inProgress) -> 완료(completed) | 필수 |
| 발행 검증 실패 시나리오 | builder 검증 실패 + 비즈니스 규칙 실패 시 422 응답 + 통합 오류 목록 반환 + 상태 draft 유지 | 필수 |
| 템플릿 기반 생성 | 템플릿 선택 -> builder schema 형태 프리셋 적용 확인 -> draft 상태 확인 | 필수 |
| 권한 미보유 접근 | 다른 Organization의 Environment에 속한 설문 접근 시 403 반환 | 필수 |
| 잘못된 상태 전이 | draft -> completed 직접 전이 시도 시 400 반환 | 필수 |

### 5.3 E2E 테스트 (해당 시)

| 테스트 시나리오 | 검증 항목 |
|---------------|----------|
| 설문 생성 ~ 발행 전체 플로우 | 로그인 -> 환경 선택 -> 새 설문 생성 -> 편집기에서 Block/Question 추가(BuilderEntities) -> DnD 순서 변경 -> 자동 저장 동작 확인 -> 발행 -> 상태 변경 확인 |
| 템플릿 기반 생성 플로우 | 템플릿 갤러리 진입 -> 필터링 -> 템플릿 선택 -> builder schema 프리셋 적용 확인 -> 편집기 이동 |
| 자동 저장 동작 검증 | 편집기에서 entity 추가/속성 변경 -> 10초 대기 -> AutoSave Indicator "Progress saved" 확인 |
| 발행 검증 실패 UI | 유효하지 않은 설문 발행 시도 -> builder 오류 + 비즈니스 오류 통합 모달 확인 -> entity 클릭 시 포커스 이동 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 제약사항 | 설명 |
|---------|------|
| Environment/Project 최소 구현 | FSD-006이 아직 미구현이므로 최소 모델만 생성. 환경 관리 API/UI는 FSD-006에서 완성 |
| 질문 유형 Entity 스텁 | openText 등 2-3개만 스텁으로 생성. 15종 질문 유형의 상세 Attribute/검증은 FSD-009(질문 유형 카탈로그) 구현 시 완성 |
| autoComplete 실행 트리거 미구현 | Survey 모델에 필드만 정의. 실제 응답 수 판정은 FSD-021(응답 관리) 구현 시 연결 |
| displayOption 런타임 노출 제어 미구현 | 설정 저장/검증만 담당. 실제 노출 제어 로직은 FSD-019(타겟팅/트리거)에서 구현 |
| 순환 로직 감지(BR-12-09) | 질문 간 순환 참조 감지는 조건부 로직(FSD-012) 구현 후 완전 구현 가능. 초기에는 스텁 |
| 다국어 완성도 검증(BR-12-08) | 다국어 설문(FSD-015) 구현 전까지는 기본 언어(default)만 검증 |
| 이미지/비디오 업로드 | Welcome Card, Ending의 fileUrl/videoUrl 업로드는 별도 파일 스토리지 구현 필요. 초기에는 URL 직접 입력만 지원 |
| 설문 편집기 UI 상세 | FSD-010(설문 편집기 UX)에서 상세 정의. 이 구현에서는 BuilderEntities 기반 기본 편집 기능만 구현 |
| builder InterpreterStore | 응답 수집 런타임(FSD-021)에서 InterpreterStore를 활용할 예정이나, 이 구현에서는 BuilderStore만 사용 |

### 6.2 향후 개선 가능 사항

| 개선 항목 | 설명 |
|----------|------|
| 자동 저장 Partial Update | 현재 전체 PUT 방식에서, builderStore의 이벤트(onEntityAttributeUpdated 등)를 감지하여 변경된 entity만 PATCH하는 방식으로 최적화 |
| 실시간 협업 편집 | WebSocket + builderStore 이벤트 기반 동시 편집 지원. builderStore.subscribe()로 변경 이벤트를 다른 클라이언트에 전파 |
| 설문 버전 관리 | 발행 시 builder schema 스냅샷을 별도 히스토리 테이블에 저장. 이전 버전 스키마로 롤백 |
| 설문 복제 | 기존 설문의 builder schema + 메타데이터를 복제하여 새 설문 생성. 모든 entity ID를 새 CUID2로 교체 |
| 설문 임포트/익스포트 | builder schema JSON 형식으로 설문 데이터 임포트/익스포트. validateSchemaShape()로 임포트 시 구조 검증 |
| 템플릿 DB 관리 | 코드 내장에서 DB 기반 관리 + 관리자 템플릿 편집 UI (BuilderStore 기반) |
| builder Factory 패턴 | 환경/라이선스별로 다른 entity set을 제공하는 createSurveyBuilder(options) 팩토리 함수 도입 |
| shouldBeProcessed 조건부 표시 | FSD-012(조건부 로직)과 연계하여 entity의 shouldBeProcessed로 동적 표시/숨김 구현 |

---

## 7. i18n 고려사항 (클라이언트 UI 변경)

### 추가/수정이 필요한 번역 키 목록

```json
{
  "survey": {
    "list": {
      "title": "설문 목록",
      "empty": "아직 설문이 없습니다.",
      "create_new": "새 설문 만들기",
      "filter_all": "전체",
      "filter_draft": "초안",
      "filter_active": "진행 중",
      "filter_paused": "일시정지",
      "filter_completed": "완료",
      "type_link": "링크",
      "type_app": "앱",
      "delete_confirm": "이 설문을 삭제하시겠습니까?"
    },
    "create": {
      "title": "새 설문 만들기",
      "type_selection_title": "설문 유형 선택",
      "type_link_label": "링크 설문",
      "type_link_desc": "URL을 공유하여 이메일, SNS 등으로 배포합니다.",
      "type_app_label": "앱 설문",
      "type_app_desc": "JS SDK를 통해 웹 애플리케이션 내에서 표시합니다.",
      "from_template": "템플릿에서 시작",
      "from_scratch": "빈 설문에서 시작",
      "survey_name_label": "설문 이름",
      "survey_name_placeholder": "설문 이름을 입력하세요"
    },
    "template": {
      "title": "템플릿 갤러리",
      "filter_role": "역할",
      "filter_channel": "채널",
      "filter_industry": "산업",
      "no_results": "조건에 맞는 템플릿이 없습니다.",
      "use_template": "이 템플릿 사용",
      "preview": "미리보기",
      "role_product_manager": "프로덕트 매니저",
      "role_customer_success": "고객 성공",
      "role_marketing": "마케팅",
      "role_sales": "영업",
      "role_people_manager": "인사 관리",
      "channel_link": "링크",
      "channel_app": "앱",
      "channel_website": "웹사이트",
      "industry_ecommerce": "이커머스",
      "industry_saas": "SaaS",
      "industry_other": "기타"
    },
    "editor": {
      "auto_save_on": "자동 저장 켜짐",
      "progress_saved": "변경사항 저장됨",
      "auto_save_disabled": "자동 저장 비활성화",
      "saving": "저장 중...",
      "save_failed": "저장에 실패했습니다.",
      "publish": "발행",
      "pause": "일시정지",
      "resume": "재개",
      "complete": "완료",
      "publish_confirm": "설문을 발행하시겠습니까?",
      "pause_confirm": "설문을 일시정지하시겠습니까?",
      "complete_confirm": "설문을 완료하시겠습니까?",
      "validation_failed_title": "발행 검증 실패",
      "validation_failed_message": "다음 항목을 수정해주세요:",
      "validation_builder_error": "스키마 검증 오류",
      "validation_business_error": "비즈니스 규칙 오류",
      "status_draft": "초안",
      "status_in_progress": "진행 중",
      "status_paused": "일시정지",
      "status_completed": "완료",
      "add_block": "블록 추가",
      "add_question": "질문 추가",
      "delete_entity": "삭제",
      "clone_entity": "복제",
      "drag_to_reorder": "드래그하여 순서 변경"
    },
    "welcome_card": {
      "title": "Welcome Card",
      "enabled": "Welcome Card 활성화",
      "headline_label": "제목",
      "headline_placeholder": "환영 메시지를 입력하세요",
      "html_label": "부제목",
      "button_label": "시작 버튼 텍스트",
      "button_placeholder": "시작하기",
      "time_to_finish": "예상 완료 시간 표시",
      "show_response_count": "응답 수 표시",
      "image_url": "이미지 URL",
      "video_url": "비디오 URL"
    },
    "ending": {
      "title": "종료 카드",
      "add": "종료 카드 추가",
      "type_end_screen": "종료 화면",
      "type_redirect": "URL 리다이렉트",
      "headline_label": "제목",
      "subheader_label": "부제목",
      "button_label": "버튼 텍스트",
      "button_link_label": "버튼 링크",
      "redirect_url_label": "리다이렉트 URL",
      "redirect_label_label": "라벨",
      "delete_confirm": "이 종료 카드를 삭제하시겠습니까?"
    },
    "hidden_fields": {
      "title": "Hidden Fields",
      "enabled": "Hidden Fields 활성화",
      "add_field": "필드 추가",
      "field_id_label": "필드 ID",
      "field_id_placeholder": "영문, 숫자, 하이픈, 언더스코어만 허용",
      "forbidden_id_error": "사용할 수 없는 예약어입니다: {{id}}",
      "invalid_format_error": "필드 ID는 영문, 숫자, 하이픈, 언더스코어만 허용됩니다."
    },
    "variables": {
      "title": "변수",
      "add": "변수 추가",
      "type_number": "숫자",
      "type_text": "텍스트",
      "name_label": "변수 이름",
      "name_placeholder": "소문자, 숫자, 언더스코어만 허용",
      "value_label": "초기값",
      "duplicate_name_error": "이미 사용 중인 변수 이름입니다.",
      "invalid_name_error": "변수 이름은 소문자, 숫자, 언더스코어만 허용됩니다.",
      "delete_confirm": "이 변수를 삭제하시겠습니까?"
    },
    "display_option": {
      "title": "표시 옵션",
      "display_once": "1회만 표시",
      "display_once_desc": "응답 여부와 무관하게 1회만 노출합니다.",
      "display_multiple": "여러 번 표시 (응답 1회)",
      "display_multiple_desc": "여러 번 표시하되 응답은 1회만 허용합니다.",
      "respond_multiple": "여러 번 표시 및 응답",
      "respond_multiple_desc": "여러 번 표시하고 여러 번 응답도 허용합니다.",
      "display_some": "지정 횟수만큼 표시",
      "display_some_desc": "지정된 횟수만큼만 표시합니다.",
      "display_limit_label": "최대 표시 횟수",
      "display_percentage_label": "표시 확률 (%)",
      "display_percentage_placeholder": "0.01 ~ 100"
    },
    "settings": {
      "title": "설정",
      "auto_complete_label": "자동 완료 응답 수",
      "auto_complete_placeholder": "미설정 시 수동 완료만 가능",
      "delay_label": "표시 지연 시간 (초)",
      "recontact_days_label": "재접촉 일수",
      "pin_label": "PIN 코드 (4자리)",
      "pin_placeholder": "4자리 숫자",
      "recaptcha_title": "reCAPTCHA",
      "recaptcha_enabled": "reCAPTCHA 활성화",
      "recaptcha_threshold": "Threshold (0.1 ~ 0.9)",
      "single_use_title": "일회용 링크",
      "single_use_enabled": "일회용 링크 활성화",
      "single_use_encrypted": "응답 ID 암호화",
      "verify_email_enabled": "이메일 인증 필수",
      "single_response_per_email": "이메일당 1회 응답",
      "hide_back_button": "뒤로가기 버튼 숨기기",
      "ip_collection_enabled": "IP 주소 수집",
      "language_switch": "언어 전환 표시",
      "slug_label": "커스텀 URL slug",
      "slug_placeholder": "소문자, 숫자, 하이픈만 허용",
      "metadata_title": "SEO 메타데이터",
      "metadata_title_label": "페이지 제목",
      "metadata_desc_label": "페이지 설명",
      "metadata_og_image_label": "OG 이미지 URL"
    },
    "validation": {
      "schema_min_block": "설문에 최소 1개의 블록이 필요합니다.",
      "schema_min_question": "설문에 최소 1개의 질문이 필요합니다.",
      "duplicate_ending_id": "중복된 Ending ID가 있습니다: {{id}}",
      "duplicate_variable_id": "중복된 Variable ID가 있습니다: {{id}}",
      "duplicate_variable_name": "중복된 Variable 이름이 있습니다: {{name}}",
      "welcome_card_headline_required": "Welcome Card가 활성화되었으나 제목이 없습니다.",
      "i18n_incomplete": "다국어 번역이 완료되지 않은 필드가 있습니다.",
      "circular_logic": "질문 간 순환 로직이 감지되었습니다.",
      "pin_format": "PIN은 정확히 4자리여야 합니다.",
      "auto_complete_min": "자동 완료 응답 수는 1 이상이어야 합니다.",
      "display_percentage_range": "표시 확률은 0.01에서 100 사이여야 합니다.",
      "recaptcha_threshold_range": "reCAPTCHA threshold는 0.1에서 0.9 사이(0.1 단위)여야 합니다.",
      "slug_format": "Slug는 소문자, 숫자, 하이픈만 허용됩니다.",
      "hidden_field_forbidden": "금지된 Hidden Field ID입니다: {{id}}",
      "hidden_field_format": "Hidden Field ID 형식이 올바르지 않습니다.",
      "variable_name_format": "Variable 이름은 소문자, 숫자, 언더스코어만 허용됩니다."
    }
  }
}
```
