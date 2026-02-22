> ⚠️ @coltorapps/builder 기반 재작성 (2026-02-22)

# 기능 구현 계획: 질문 유형 카탈로그 (FS-009) - @coltorapps/builder 기반

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 설명 | 우선순위 |
|---------|--------|------|---------|
| FN-009-01 | Element 공통 속성 관리 | 15가지 질문 유형이 공유하는 기본 Attribute 정의 (headline, required, subheader, imageUrl, videoUrl, isDraft). Element ID 규칙 및 금지 ID 10개 | 필수 |
| FN-009-02 | OpenText 질문 유형 | createEntity로 정의. inputType, charLimitEnabled, minLength/maxLength 교차 검증(attributesExtensions). 14가지 Validation Rule 적용 가능 | 필수 |
| FN-009-03 | MultipleChoiceSingle 질문 유형 | choices(최소 2개), displayType, shuffleOption. Validation Rule 없음 | 필수 |
| FN-009-04 | MultipleChoiceMulti 질문 유형 | MultipleChoiceSingle 속성 + minSelections/maxSelections Validation 지원 | 필수 |
| FN-009-05 | NPS 질문 유형 | 0~10 고정 척도. lowerLabel, upperLabel, isColorCodingEnabled | 필수 |
| FN-009-06 | CTA 질문 유형 | dismissible 조건부 검증(true일 때 buttonUrl/buttonLabel 필수) - attributesExtensions 활용 | 필수 |
| FN-009-07 | Rating 질문 유형 | scale(3가지), range(3~10), lowerLabel, upperLabel, isColorCodingEnabled | 필수 |
| FN-009-08 | Consent 질문 유형 | label(LocalizedString) 필수, 비어 있으면 안 됨 | 필수 |
| FN-009-09 | PictureSelection 질문 유형 | PictureChoice[](최소 2개), allowMulti. minSelections/maxSelections Validation | 필수 |
| FN-009-10 | Date 질문 유형 | dateFormat(3가지), html(LocalizedString). 날짜 범위 Validation 4가지 | 필수 |
| FN-009-11 | FileUpload 질문 유형 | allowMultipleFiles, maxSizeInMB, allowedFileExtensions(26가지 내). 파일 확장자 Validation 2가지 | 필수 |
| FN-009-12 | Cal 질문 유형 | calUserName(최소 1자), calHost | 필수 |
| FN-009-13 | Matrix 질문 유형 | rows/columns(MatrixChoice[]), shuffleOption. minRowsAnswered/answerAllRows Validation | 필수 |
| FN-009-14 | Address 질문 유형 | 6개 SubField 개별 제어(show/required/placeholder). 서브 필드별 10가지 텍스트 Validation Rule | 필수 |
| FN-009-15 | Ranking 질문 유형 | choices(2~25개), shuffleOption. minRanked/rankAll Validation | 필수 |
| FN-009-16 | ContactInfo 질문 유형 | 5개 SubField 개별 제어. 서브 필드별 10가지 텍스트 Validation Rule | 필수 |
| FN-009-17 | Validation 규칙 시스템 | 24가지 ValidationRuleType, and/or 논리 결합, Element Type별 적용 가능 Rule 매핑 | 필수 |
| FN-009-18 | Shuffle 옵션 | none/all/exceptLast 3가지. 4개 Entity 유형에 적용 | 필수 |

### 1.2 비기능 요구사항

| NFR ID | 항목 | 요구사항 |
|--------|------|---------|
| NFR-001 | 타입 안전성 | @coltorapps/builder의 Entity 타입 시스템으로 유형별 속성 엄격 검증. Zod를 통한 Attribute 검증으로 TypeScript 타입 자동 추론 |
| NFR-002 | 하위 호환성 | Entity name이 곧 ElementType을 대체. 기존 discriminated union 패턴에서 Entity 기반 패턴으로 전환하되, 타입 호환성 유지 |
| NFR-003 | 확장성 | 새 Entity 추가만으로 질문 유형 확장 가능. Validation Rule도 별도 모듈로 확장 용이 |
| NFR-004 | 클라이언트 검증 | 파일 크기 검증은 클라이언트 사이드에서 수행. Interpreter Store에서 처리 |

### 1.3 명세서 내 모호한 점 및 해석

| 항목 | 모호한 점 | 해석/결정 |
|------|----------|----------|
| DB 저장 방식 | Element가 별도 테이블인지 Survey의 JSON 필드인지 명세에 미정의 | FS-008의 설계를 따라 Survey 모델의 `blocks` JSON 필드 내에 builder Schema 형태로 저장. `{ entities: { [id]: { type, attributes, parentId?, children? } }, root: [] }` flat map 구조 |
| Block과 Element의 관계 | FS-008에서 Block 개념을 도입했으나, FS-009에서는 Block 없이 Element만 다룸 | Block을 `childrenAllowed: true`인 부모 Entity로 정의. Element는 `parentRequired: true`로 Block 내에만 존재. builder의 parent-child hierarchy로 자연스럽게 모델링 |
| LocalizedString 구조 | 다국어 문자열의 구체적 구조가 미정의 | `Record<string, string>` 형태. Attribute의 Zod 검증에서 `z.record(z.string(), z.string()).refine(obj => Object.values(obj).some(v => v.trim().length > 0))` 패턴 사용 |
| CTA의 dismissible vs 외부 버튼 | 의미가 불명확 | `dismissible: true`는 외부 URL 이동 버튼을 의미. `attributesExtensions`를 활용하여 `dismissible=true`일 때 `buttonUrl`, `buttonLabel` 필수 교차 검증 |
| Validation Rule의 field 속성 | Address/ContactInfo에서만 사용되는지 불명확 | `field` 속성은 Address/ContactInfo 전용. 다른 Entity에서는 무시. 타입 수준에서 optional 처리 |
| Rating의 scale/range | 공통 속성(4.1.8)에 선택 필드, Rating(4.7.8)에서는 필수 | Rating Entity에서만 해당 Attribute를 필수로 포함. 공통 Attribute에서는 제외하고, Rating Entity 전용 Attribute로 정의 |
| Entity 기반 전환과 discriminated union 호환 | builder의 Entity 시스템은 자체 타입 추론을 제공하나, 기존 명세의 discriminated union 패턴과의 관계 | builder의 Schema 구조가 곧 discriminated union을 대체. `entity.type` 필드가 식별자 역할을 하며, Attribute validate의 Zod 스키마에서 타입이 자동 추론됨 |

### 1.4 암묵적 요구사항

| 항목 | 설명 |
|------|------|
| @coltorapps/builder 패키지 설치 | packages/survey-builder에서 `@coltorapps/builder` 코어 패키지 의존성 필요. React 바인딩은 FS-010에서 추가 |
| Attribute 원자적 설계 | builder 규칙에 따라 각 속성을 개별 `createAttribute()`로 정의. headline, required, subheader 등 공통 Attribute는 Entity 간 공유 |
| Entity defaultValue 정의 | 각 Entity의 `defaultValue` 함수로 빌더 Store에서 새 Entity 추가 시 기본값 제공 (기존 팩토리 함수 대체) |
| Schema 구조 관리 | builder의 flat map Schema `{ entities: { [id]: { type, attributes, parentId, children } }, root: [] }` 구조를 DB 저장 형식으로 사용 |
| generateEntityId/validateEntityId | Element ID 규칙(영문/숫자/하이픈/언더스코어, 금지 ID 회피)을 builder의 커스텀 ID 생성/검증에 통합 |
| Shuffle 유틸리티 별도 유지 | builder에서 제공하지 않는 도메인 로직. 클라이언트 렌더링 시 사용하는 별도 유틸리티로 유지 |
| Validation Engine 별도 유지 | builder의 `validate` (Entity 레벨)은 응답값 검증용이고, 24가지 ValidationRule의 and/or 결합 평가 엔진은 별도 모듈로 구현 |
| FS-008 Survey 모델 선행 | Block Entity가 Survey Schema의 최상위 Entity이므로, Survey 모델 구현이 선행되어야 실제 통합 가능 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

기존 계획의 `packages/survey-schema` (Zod discriminated union 기반)를 **`packages/survey-builder`** (@coltorapps/builder 기반)로 재설계한다. builder 라이브러리의 Entity/Attribute/Schema 패턴을 전면 활용하여, 별도 Zod discriminated union을 구축하는 대신 builder의 내장 타입 시스템과 검증 체계를 사용한다.

```
packages/
├── survey-builder/                      # @coltorapps/builder 기반 설문 빌더 정의
│   ├── package.json                     # @coltorapps/builder, zod, @paralleldrive/cuid2
│   ├── tsconfig.json
│   ├── tsconfig.lib.json
│   ├── project.json                     # Nx 프로젝트 설정
│   └── src/
│       ├── index.ts                     # 퍼블릭 API
│       ├── builder.ts                   # createBuilder - surveyBuilder 정의
│       ├── attributes/                  # 원자적 Attribute 정의 (createAttribute)
│       │   ├── index.ts
│       │   ├── common/                  # 공통 Attribute
│       │   │   ├── headline.attribute.ts
│       │   │   ├── subheader.attribute.ts
│       │   │   ├── required.attribute.ts
│       │   │   ├── image-url.attribute.ts
│       │   │   ├── video-url.attribute.ts
│       │   │   └── is-draft.attribute.ts
│       │   ├── text/                    # 텍스트 관련 Attribute
│       │   │   ├── placeholder.attribute.ts
│       │   │   ├── long-answer.attribute.ts
│       │   │   ├── input-type.attribute.ts
│       │   │   ├── insights-enabled.attribute.ts
│       │   │   ├── char-limit-enabled.attribute.ts
│       │   │   ├── min-length.attribute.ts
│       │   │   └── max-length.attribute.ts
│       │   ├── choice/                  # 선택지 관련 Attribute
│       │   │   ├── choices.attribute.ts
│       │   │   ├── picture-choices.attribute.ts
│       │   │   ├── shuffle-option.attribute.ts
│       │   │   ├── display-type.attribute.ts
│       │   │   ├── other-option-placeholder.attribute.ts
│       │   │   └── allow-multi.attribute.ts
│       │   ├── scale/                   # 척도 관련 Attribute
│       │   │   ├── scale.attribute.ts
│       │   │   ├── range.attribute.ts
│       │   │   ├── lower-label.attribute.ts
│       │   │   ├── upper-label.attribute.ts
│       │   │   └── is-color-coding-enabled.attribute.ts
│       │   ├── cta/                     # CTA 관련 Attribute
│       │   │   ├── dismissible.attribute.ts
│       │   │   ├── button-url.attribute.ts
│       │   │   └── button-label.attribute.ts
│       │   ├── consent/                 # 동의 관련 Attribute
│       │   │   └── label.attribute.ts
│       │   ├── date/                    # 날짜 관련 Attribute
│       │   │   ├── date-format.attribute.ts
│       │   │   └── html.attribute.ts
│       │   ├── file/                    # 파일 관련 Attribute
│       │   │   ├── allow-multiple-files.attribute.ts
│       │   │   ├── max-size-in-mb.attribute.ts
│       │   │   └── allowed-file-extensions.attribute.ts
│       │   ├── cal/                     # Cal 관련 Attribute
│       │   │   ├── cal-user-name.attribute.ts
│       │   │   └── cal-host.attribute.ts
│       │   ├── matrix/                  # 행렬 관련 Attribute
│       │   │   ├── rows.attribute.ts
│       │   │   └── columns.attribute.ts
│       │   ├── sub-field/               # 서브 필드 관련 Attribute
│       │   │   ├── address-fields.attribute.ts
│       │   │   └── contact-info-fields.attribute.ts
│       │   └── validation/              # Validation 관련 Attribute
│       │       └── validation-config.attribute.ts
│       ├── entities/                    # Entity 정의 (createEntity)
│       │   ├── index.ts
│       │   ├── block.entity.ts          # Block (childrenAllowed: true)
│       │   ├── open-text.entity.ts
│       │   ├── multiple-choice-single.entity.ts
│       │   ├── multiple-choice-multi.entity.ts
│       │   ├── nps.entity.ts
│       │   ├── cta.entity.ts
│       │   ├── rating.entity.ts
│       │   ├── consent.entity.ts
│       │   ├── picture-selection.entity.ts
│       │   ├── date.entity.ts
│       │   ├── file-upload.entity.ts
│       │   ├── cal.entity.ts
│       │   ├── matrix.entity.ts
│       │   ├── address.entity.ts
│       │   ├── ranking.entity.ts
│       │   └── contact-info.entity.ts
│       ├── constants/                   # 상수 정의
│       │   ├── index.ts
│       │   ├── forbidden-ids.ts         # 금지 ID 10개
│       │   ├── allowed-file-extensions.ts # 허용 확장자 26가지
│       │   └── validation-rule-map.ts   # ElementType-ValidationRuleType 매핑
│       ├── validation/                  # Validation 엔진 (builder 외부 로직)
│       │   ├── index.ts
│       │   ├── validation-rule-type.ts  # 24가지 ValidationRuleType enum
│       │   ├── validation.types.ts      # ValidationRule, ValidationConfig 타입
│       │   ├── validation.engine.ts     # and/or 논리 결합 평가 엔진
│       │   ├── validation.utils.ts      # getApplicableRules, isRuleApplicable
│       │   └── rules/                   # 개별 Rule 평가 함수
│       │       ├── text-rules.ts        # minLength, maxLength, pattern, email, url, phone, equals, doesNotEqual, contains, doesNotContain
│       │       ├── number-rules.ts      # minValue, maxValue, isGreaterThan, isLessThan
│       │       ├── date-rules.ts        # isLaterThan, isEarlierThan, isBetween, isNotBetween
│       │       ├── selection-rules.ts   # minSelections, maxSelections
│       │       ├── ranking-rules.ts     # minRanked, rankAll
│       │       ├── matrix-rules.ts      # minRowsAnswered, answerAllRows
│       │       └── file-rules.ts        # fileExtensionIs, fileExtensionIsNot
│       ├── shuffle/                     # Shuffle 유틸리티 (builder 외부 로직)
│       │   └── shuffle.utils.ts
│       ├── types/                       # 보조 타입 (builder 타입과 통합)
│       │   ├── index.ts
│       │   ├── localized-string.ts      # LocalizedString 타입
│       │   ├── choice.types.ts          # Choice, PictureChoice, MatrixChoice
│       │   └── sub-field.types.ts       # SubField, AddressFieldId, ContactInfoFieldId
│       └── __tests__/                   # 테스트
│           ├── attributes/
│           │   └── attributes.spec.ts
│           ├── entities/
│           │   ├── open-text.entity.spec.ts
│           │   ├── multiple-choice.entity.spec.ts
│           │   ├── cta.entity.spec.ts
│           │   └── ... (유형별)
│           ├── builder.spec.ts
│           ├── validation.engine.spec.ts
│           └── shuffle.utils.spec.ts

packages/shared-types/                   # FS-012에서 결정된 공유 타입 패키지
└── src/
    ├── survey/
    │   └── element-type.enum.ts         # EntityType 재내보내기 (호환용)
    └── validation/
        └── validation.types.ts          # ValidationRule 관련 타입 재내보내기
```

**기존 계획 대비 주요 변경점:**

| 영역 | 기존 계획 (packages/survey-schema) | 변경 계획 (packages/survey-builder) |
|------|-----------------------------------|------------------------------------|
| 패키지명 | `@inquiry/survey-schema` | `@inquiry/survey-builder` |
| 스키마 정의 | Zod discriminated union (`z.discriminatedUnion('type', [...])`) | `createEntity()` + `createAttribute()` 조합 |
| 타입 추론 | Zod의 `z.infer<typeof elementSchema>` | builder의 내장 타입 추론 (Attribute validate 반환 타입) |
| 교차 검증 | `.refine()` / `.superRefine()` | `attributesExtensions` / `entitiesExtensions` |
| 팩토리 함수 | `createDefaultElement()` 커스텀 함수 | Entity의 `defaultValue` 메서드 |
| ID 관리 | 별도 유틸 함수 | `generateEntityId` / `validateEntityId` 빌더 레벨 설정 |
| Schema 구조 | `Element[]` (배열) | `{ entities: { [id]: {...} }, root: [] }` (flat map) |
| Validation Engine | 별도 유지 (동일) | 별도 유지 (동일) - builder의 validate와 역할 분리 |
| Shuffle | 별도 유지 (동일) | 별도 유지 (동일) |

**데이터 흐름:**

```
[설문 편집기 UI (클라이언트)]
    |
    | BuilderStore - Entity 추가/수정/삭제
    |
    v
[builder Attribute validate] ── 실시간 Attribute 검증 (Zod 기반)
    |
    | API 호출 (Survey 전체 Schema 저장)
    v
[Survey API (서버)]
    |
    | validateSchema(surveyBuilder, schema) ── 서버 사이드 Schema 검증
    v
[Prisma - Survey JSON 필드 저장] ── { entities: {...}, root: [...] } 구조

[설문 응답 (클라이언트)]
    |
    | InterpreterStore - Entity 값 입력
    |
    v
[builder Entity validate] ── 응답 값 검증 (Entity 레벨)
    |
    | + Validation Engine ── and/or 논리 결합 24가지 Rule 평가
    v
[validateEntitiesValues()] ── 서버 사이드 응답 검증
```

**설계 근거:**

1. **builder 도입 이유**: 이미 프로젝트에서 @coltorapps/builder를 사용하기로 결정된 상태이며, Entity/Attribute/Schema 패턴이 설문 빌더의 본질적 구조(질문 유형 = Entity, 속성 = Attribute, 설문 = Schema)와 정확히 매핑된다.
2. **Attribute 원자적 설계**: builder 스킬 문서(attr-atomic-design)에 따라 각 속성을 개별 `createAttribute()`로 정의한다. headline, required 등 공통 Attribute는 15가지 Entity에서 재사용한다.
3. **교차 검증**: charLimitEnabled와 minLength/maxLength의 관계, dismissible과 buttonUrl/buttonLabel의 관계 등은 `attributesExtensions`를 사용하여 Entity 정의 내에서 처리한다.
4. **Validation Engine 분리**: builder의 `validate` 메서드는 응답 값의 기본 타입 검증(예: openText -> string)에 사용하고, 24가지 ValidationRule의 and/or 결합 평가는 별도 엔진으로 유지한다. 이는 builder가 제공하지 않는 도메인 로직이다.
5. **Schema 저장 형식**: builder의 표준 Schema 구조 `{ entities: { [id]: { type, attributes, parentId?, children? } }, root: [] }`를 그대로 DB JSON 필드에 저장한다.

### 2.2 데이터 모델

#### 2.2.1 DB 스키마 변경

FS-009 자체로 인한 Prisma 스키마 변경은 없다. FS-008에서 정의된 Survey 모델의 `blocks` JSON 필드가 builder Schema 형태로 저장된다.

단, FS-008 구현 시 아래 Survey 모델이 필요하다 (참조용):

```prisma
model Survey {
  id              String   @id @default(cuid())
  name            String
  type            String   @default("app")
  status          String   @default("draft")
  environmentId   String
  creatorId       String?
  schema          Json     @default("{\"entities\":{},\"root\":[]}")  // builder Schema 구조
  welcomeCard     Json     @default("{\"enabled\": false}")
  endings         Json     @default("[]")
  hiddenFields    Json     @default("{\"enabled\": false}")
  variables       Json     @default("[]")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  environment     Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)

  @@index([environmentId])
  @@map("surveys")
}
```

**기존 계획과의 차이**: `blocks Json` 필드 대신 `schema Json` 필드를 사용한다. builder Schema의 flat map 구조가 곧 Block > Element 계층을 포함하기 때문이다.

#### 2.2.2 Builder Schema 구조

```typescript
// builder Schema는 다음 구조를 따른다
interface SurveySchema {
  entities: {
    [entityId: string]: {
      type: string;            // Entity name (예: "block", "openText", "rating")
      attributes: {
        [attrName: string]: unknown;  // Attribute validate 반환 타입
      };
      parentId?: string | null; // 부모 Entity ID (null이면 root)
      children?: string[];      // 자식 Entity ID 배열
    };
  };
  root: string[];               // 최상위 Entity ID 배열 (주로 Block들)
}
```

예시:

```typescript
const surveySchema = {
  entities: {
    "block-1": {
      type: "block",
      attributes: {
        name: { en: "Welcome Block" },
        logicItems: [],
        logicFallback: "next",
      },
      children: ["q-1", "q-2"],
    },
    "q-1": {
      type: "openText",
      attributes: {
        headline: { en: "What is your name?" },
        required: true,
        inputType: "text",
        charLimitEnabled: false,
        insightsEnabled: false,
      },
      parentId: "block-1",
    },
    "q-2": {
      type: "rating",
      attributes: {
        headline: { en: "How satisfied are you?" },
        required: true,
        scale: "star",
        range: 5,
        isColorCodingEnabled: false,
      },
      parentId: "block-1",
    },
  },
  root: ["block-1"],
};
```

#### 2.2.3 주요 보조 타입

```typescript
// 다국어 문자열
type LocalizedString = Record<string, string>;

// 객관식/순위 선택지
interface Choice {
  id: string;
  label: LocalizedString;
}

// 이미지 선택지
interface PictureChoice {
  id: string;
  imageUrl: string;
}

// 행렬 선택지
interface MatrixChoice {
  id: string;
  label: LocalizedString;
}

// 서브 필드 (Address/ContactInfo)
interface SubField {
  show: boolean;
  required: boolean;
  placeholder?: LocalizedString;
}

// Validation 구조 (builder 외부 - Validation Engine용)
interface ValidationConfig {
  logic: 'and' | 'or';
  rules: ValidationRule[];
}

interface ValidationRule {
  id: string;
  type: ValidationRuleType;
  params?: Record<string, unknown>;
  field?: string; // Address/ContactInfo 서브 필드 지정용
}
```

### 2.3 API 설계 (참조)

FS-009 자체는 스키마 정의 중심이므로 별도 API 엔드포인트를 생성하지 않는다. Element 관련 CRUD는 FS-008의 Survey API에 통합된다.

Survey API에서 builder Schema 검증이 수행되는 지점:

| 메서드 | 엔드포인트 | 검증 방식 |
|--------|-----------|----------|
| POST | `/api/surveys` | `validateSchema(surveyBuilder, schema)` - 서버 사이드 Schema 전체 검증 |
| PATCH | `/api/surveys/:id` | `validateSchema(surveyBuilder, schema)` - Schema 수정 시 검증 |
| POST | `/api/surveys/:id/publish` | `validateSchema()` + 추가 비즈니스 검증 (isDraft Entity 불허) |
| POST | `/api/surveys/:id/responses` | `validateEntitiesValues()` - 응답 값 검증 |

### 2.4 주요 컴포넌트 설계

#### 2.4.1 Attribute 정의 패턴 (핵심)

```typescript
// attributes/common/headline.attribute.ts
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

// 원자적 Attribute: 하나의 속성만 담당
export const headlineAttribute = createAttribute({
  name: "headline",
  validate(value) {
    // Zod로 검증하고 타입을 자동 추론
    return z.record(z.string(), z.string()).refine(
      (obj) => Object.values(obj).some((v) => v.trim().length > 0),
      { message: "headline은 비어 있을 수 없습니다" }
    ).parse(value);
  },
});

// attributes/common/required.attribute.ts
export const requiredAttribute = createAttribute({
  name: "required",
  validate(value) {
    return z.boolean().parse(value);
  },
});

// attributes/text/input-type.attribute.ts
export const inputTypeAttribute = createAttribute({
  name: "inputType",
  validate(value) {
    return z.enum(["text", "email", "url", "number", "phone"]).parse(value);
  },
});

// attributes/text/char-limit-enabled.attribute.ts
export const charLimitEnabledAttribute = createAttribute({
  name: "charLimitEnabled",
  validate(value) {
    return z.boolean().parse(value);
  },
});

// attributes/text/min-length.attribute.ts
export const minLengthAttribute = createAttribute({
  name: "minLength",
  validate(value) {
    return z.number().positive().optional().parse(value);
  },
});
```

#### 2.4.2 Entity 정의 패턴 (핵심)

```typescript
// entities/open-text.entity.ts
import { createEntity } from "@coltorapps/builder";
import { z } from "zod";

// 공통 Attribute import
import { headlineAttribute } from "../attributes/common/headline.attribute";
import { requiredAttribute } from "../attributes/common/required.attribute";
import { subheaderAttribute } from "../attributes/common/subheader.attribute";
import { imageUrlAttribute } from "../attributes/common/image-url.attribute";
import { videoUrlAttribute } from "../attributes/common/video-url.attribute";
import { isDraftAttribute } from "../attributes/common/is-draft.attribute";

// 고유 Attribute import
import { placeholderAttribute } from "../attributes/text/placeholder.attribute";
import { longAnswerAttribute } from "../attributes/text/long-answer.attribute";
import { inputTypeAttribute } from "../attributes/text/input-type.attribute";
import { insightsEnabledAttribute } from "../attributes/text/insights-enabled.attribute";
import { charLimitEnabledAttribute } from "../attributes/text/char-limit-enabled.attribute";
import { minLengthAttribute } from "../attributes/text/min-length.attribute";
import { maxLengthAttribute } from "../attributes/text/max-length.attribute";
import { validationConfigAttribute } from "../attributes/validation/validation-config.attribute";

export const openTextEntity = createEntity({
  name: "openText",
  attributes: [
    // 공통 Attribute
    headlineAttribute,
    requiredAttribute,
    subheaderAttribute,
    imageUrlAttribute,
    videoUrlAttribute,
    isDraftAttribute,
    // 고유 Attribute
    placeholderAttribute,
    longAnswerAttribute,
    inputTypeAttribute,
    insightsEnabledAttribute,
    charLimitEnabledAttribute,
    minLengthAttribute,
    maxLengthAttribute,
    validationConfigAttribute,
  ],
  parentRequired: true,
  // 응답 값 검증 (Interpreter에서 사용)
  validate(value, context) {
    return z.string().parse(value);
  },
  // Entity 추가 시 기본값 제공 (기존 createDefaultElement 대체)
  defaultValue() {
    return "";
  },
  // Entity 내 교차 검증
  attributesExtensions: {
    minLength: {
      validate(value, context) {
        const validated = context.validate(value);
        const attrs = context.entity.attributes;
        // charLimitEnabled가 true이고 minLength와 maxLength 모두 제공된 경우
        if (attrs.charLimitEnabled && validated !== undefined && attrs.maxLength !== undefined) {
          if (validated > attrs.maxLength) {
            throw new Error("최소 길이는 최대 길이보다 작아야 합니다");
          }
        }
        return validated;
      },
    },
    maxLength: {
      validate(value, context) {
        const validated = context.validate(value);
        const attrs = context.entity.attributes;
        if (attrs.charLimitEnabled && validated !== undefined && attrs.minLength !== undefined) {
          if (validated < attrs.minLength) {
            throw new Error("최대 길이는 최소 길이보다 커야 합니다");
          }
        }
        return validated;
      },
    },
  },
});
```

#### 2.4.3 Block Entity 정의

```typescript
// entities/block.entity.ts
import { createEntity } from "@coltorapps/builder";
import { nameAttribute } from "../attributes/common/name.attribute";
import { logicItemsAttribute } from "../attributes/logic/logic-items.attribute";
import { logicFallbackAttribute } from "../attributes/logic/logic-fallback.attribute";

export const blockEntity = createEntity({
  name: "block",
  attributes: [nameAttribute, logicItemsAttribute, logicFallbackAttribute],
  childrenAllowed: true,
});
```

#### 2.4.4 CTA Entity (조건부 필수 교차 검증 예시)

```typescript
// entities/cta.entity.ts
import { createEntity } from "@coltorapps/builder";
import { z } from "zod";
// ... Attribute imports

export const ctaEntity = createEntity({
  name: "cta",
  attributes: [
    headlineAttribute, requiredAttribute, subheaderAttribute,
    imageUrlAttribute, videoUrlAttribute, isDraftAttribute,
    dismissibleAttribute, buttonUrlAttribute, buttonLabelAttribute,
  ],
  parentRequired: true,
  validate(value, context) {
    // CTA는 값을 수집하지 않으므로 undefined 반환
    return undefined;
  },
  // 교차 검증: dismissible=true일 때 buttonUrl, buttonLabel 필수
  attributesExtensions: {
    buttonUrl: {
      validate(value, context) {
        const validated = context.validate(value);
        if (context.entity.attributes.dismissible === true && !validated) {
          throw new Error("외부 버튼 활성화 시 버튼 URL은 필수입니다");
        }
        if (validated) {
          z.string().url({ message: "유효한 URL을 입력해야 합니다" }).parse(validated);
        }
        return validated;
      },
    },
    buttonLabel: {
      validate(value, context) {
        const validated = context.validate(value);
        if (context.entity.attributes.dismissible === true) {
          if (!validated || !Object.values(validated).some((v) => v.trim().length > 0)) {
            throw new Error("외부 버튼 활성화 시 버튼 라벨은 필수입니다");
          }
        }
        return validated;
      },
    },
  },
});
```

#### 2.4.5 Builder 정의

```typescript
// builder.ts
import { createBuilder } from "@coltorapps/builder";
import { createId, isCuid } from "@paralleldrive/cuid2";

import { blockEntity } from "./entities/block.entity";
import { openTextEntity } from "./entities/open-text.entity";
import { multipleChoiceSingleEntity } from "./entities/multiple-choice-single.entity";
// ... 15가지 Entity import

import { FORBIDDEN_IDS } from "./constants/forbidden-ids";

const ELEMENT_ENTITY_NAMES = [
  "openText", "multipleChoiceSingle", "multipleChoiceMulti",
  "nps", "cta", "rating", "consent", "pictureSelection",
  "date", "fileUpload", "cal", "matrix", "address",
  "ranking", "contactInfo",
] as const;

export const surveyBuilder = createBuilder({
  entities: [
    blockEntity,
    openTextEntity,
    multipleChoiceSingleEntity,
    multipleChoiceMultiEntity,
    npsEntity,
    ctaEntity,
    ratingEntity,
    consentEntity,
    pictureSelectionEntity,
    dateEntity,
    fileUploadEntity,
    calEntity,
    matrixEntity,
    addressEntity,
    rankingEntity,
    contactInfoEntity,
  ],

  // Element ID 규칙 적용
  generateEntityId() {
    let id: string;
    do {
      id = createId();
    } while (FORBIDDEN_IDS.includes(id));
    return id;
  },

  validateEntityId(id) {
    // 1. 패턴 검증: 영문, 숫자, 하이픈, 언더스코어만 허용
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error("Element ID는 영문, 숫자, 하이픈, 언더스코어만 허용됩니다");
    }
    // 2. 공백 검증
    if (/\s/.test(id)) {
      throw new Error("Element ID에 공백은 허용되지 않습니다");
    }
    // 3. 금지 ID 검증
    if (FORBIDDEN_IDS.includes(id)) {
      throw new Error(`금지된 Element ID입니다: ${id}`);
    }
  },

  // Parent-child 관계 제약
  entitiesExtensions: {
    // 모든 Element Entity: parentRequired, allowedParents
    openText: { parentRequired: true, allowedParents: ["block"] },
    multipleChoiceSingle: { parentRequired: true, allowedParents: ["block"] },
    multipleChoiceMulti: { parentRequired: true, allowedParents: ["block"] },
    nps: { parentRequired: true, allowedParents: ["block"] },
    cta: { parentRequired: true, allowedParents: ["block"] },
    rating: { parentRequired: true, allowedParents: ["block"] },
    consent: { parentRequired: true, allowedParents: ["block"] },
    pictureSelection: { parentRequired: true, allowedParents: ["block"] },
    date: { parentRequired: true, allowedParents: ["block"] },
    fileUpload: { parentRequired: true, allowedParents: ["block"] },
    cal: { parentRequired: true, allowedParents: ["block"] },
    matrix: { parentRequired: true, allowedParents: ["block"] },
    address: { parentRequired: true, allowedParents: ["block"] },
    ranking: { parentRequired: true, allowedParents: ["block"] },
    contactInfo: { parentRequired: true, allowedParents: ["block"] },
    // Block: 모든 Element를 자식으로 허용
    block: {
      childrenAllowed: ELEMENT_ENTITY_NAMES as unknown as string[],
    },
  },

  // 스키마 전체 검증
  validateSchema(schema) {
    // 1. 발행 시 isDraft Entity 검증
    const draftEntities = Object.entries(schema.entities)
      .filter(([, entity]) => entity.attributes.isDraft === true);

    // isDraft 검증은 발행 API에서 별도 수행하므로 여기서는 구조적 검증만
    // 2. 순환 참조 검증은 builder가 내부적으로 처리

    return schema;
  },
});
```

#### 2.4.6 Validation Engine (builder 외부)

```typescript
// validation/validation.engine.ts
import { ValidationConfig, ValidationRule, ValidationResult } from "./validation.types";
import { evaluateRule } from "./rules";

/**
 * ValidationConfig에 따라 응답 값을 검증한다.
 * builder의 Entity validate와는 별개로, 24가지 ValidationRule의
 * and/or 논리 결합을 평가하는 도메인 로직 엔진이다.
 */
export function evaluateValidation(
  config: ValidationConfig,
  value: unknown,
  entityType: string
): ValidationResult {
  const results = config.rules.map((rule) => evaluateRule(rule, value, entityType));

  if (config.logic === 'and') {
    return results.every((r) => r.valid)
      ? { valid: true }
      : { valid: false, errors: results.filter((r) => !r.valid).flatMap((r) => r.errors) };
  }

  // logic === 'or'
  return results.some((r) => r.valid)
    ? { valid: true }
    : { valid: false, errors: results.flatMap((r) => r.errors) };
}
```

#### 2.4.7 Shuffle 유틸리티

```typescript
// shuffle/shuffle.utils.ts

/**
 * Fisher-Yates 알고리즘으로 배열을 셔플한다.
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 셔플 옵션에 따라 선택지를 셔플한다.
 * builder에서 제공하지 않는 도메인 로직으로 별도 유틸리티로 유지.
 */
export function shuffleChoices<T>(
  choices: T[],
  option: 'none' | 'all' | 'exceptLast'
): T[] {
  if (option === 'none') return choices;
  if (option === 'all') return fisherYatesShuffle(choices);
  // exceptLast: 마지막 항목 고정
  const last = choices[choices.length - 1];
  const rest = fisherYatesShuffle(choices.slice(0, -1));
  return [...rest, last];
}
```

### 2.5 기존 시스템 영향 분석

| 영향 받는 모듈 | 영향 내용 | 수준 |
|---------------|----------|------|
| `packages/shared-types` | EntityType 재내보내기, ValidationRule 타입 재내보내기 추가 (FS-012에서 이미 생성 예정) | 간접 수정 |
| `packages/db` (Prisma) | Survey 모델의 `schema` JSON 필드 구조가 builder Schema 형태. FS-008 범위에서 처리 | 없음 (FS-008 의존) |
| `apps/server` | Survey API에서 `validateSchema(surveyBuilder, schema)` 호출. NestJS 서비스에서 import | 간접 의존 |
| `apps/client` | 빌더 Store, Interpreter Store 사용. React 바인딩은 FS-010에서 추가 | 직접 참조 (FS-010) |
| `tsconfig.base.json` | paths에 `@inquiry/survey-builder` 경로 alias 추가 | 설정 변경 |
| `pnpm-workspace.yaml` | `packages/*` 패턴으로 이미 포함됨. 별도 변경 불필요 | 없음 |
| `package.json` (루트) | `@coltorapps/builder`, `@paralleldrive/cuid2` 의존성은 packages/survey-builder에 격리 | 없음 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|----------|
| T-01 | 패키지 초기 설정 | `packages/survey-builder` 생성. package.json (@coltorapps/builder, zod, @paralleldrive/cuid2 의존성), tsconfig.json (base 확장), tsconfig.lib.json, project.json (Nx). tsconfig.base.json에 경로 alias 추가 | 없음 | 낮음 | 1h |
| T-02 | 보조 타입 정의 | `types/` 하위에 LocalizedString, Choice, PictureChoice, MatrixChoice, SubField, AddressFieldId, ContactInfoFieldId 타입 정의 | T-01 | 낮음 | 0.5h |
| T-03 | 상수 정의 | `constants/` 하위에 금지 ID 10개, 허용 파일 확장자 26가지, ValidationRuleType enum, Element-ValidationRule 매핑 테이블 | T-01 | 낮음 | 1h |
| T-04 | 공통 Attribute 정의 | headline, subheader, required, imageUrl, videoUrl, isDraft - 6개 공통 Attribute를 `createAttribute()`로 정의. Zod 스키마 내장 | T-02 | 낮음 | 1h |
| T-05 | 텍스트 Attribute 정의 | placeholder, longAnswer, inputType, insightsEnabled, charLimitEnabled, minLength, maxLength - 7개 Attribute | T-02 | 낮음 | 1h |
| T-06 | 선택지 Attribute 정의 | choices, pictureChoices, shuffleOption, displayType, otherOptionPlaceholder, allowMulti - 6개 Attribute. choices는 최소 2개 검증 포함 | T-02 | 중간 | 1h |
| T-07 | 척도/CTA/동의/날짜/파일/Cal/행렬/서브필드 Attribute 정의 | scale, range, lowerLabel, upperLabel, isColorCodingEnabled, dismissible, buttonUrl, buttonLabel, label, dateFormat, html, allowMultipleFiles, maxSizeInMB, allowedFileExtensions, calUserName, calHost, rows, columns, addressFields, contactInfoFields - 20개 Attribute | T-02, T-03 | 중간 | 2h |
| T-08 | ValidationConfig Attribute 정의 | validationConfig Attribute: logic(and/or) + rules[] 구조를 Zod로 검증. 24가지 Rule의 params 타입별 검증 포함 | T-03 | 높음 | 2h |
| T-09 | Block Entity 정의 | `createEntity({ name: "block", childrenAllowed: true, ... })`. name, logicItems, logicFallback Attribute 포함 | T-04 | 낮음 | 0.5h |
| T-10 | OpenText Entity 정의 | 공통 + 텍스트 Attribute 조합. charLimitEnabled 교차 검증(attributesExtensions). defaultValue, validate 정의 | T-04, T-05, T-08 | 중간 | 1.5h |
| T-11 | MultipleChoiceSingle Entity 정의 | 공통 + 선택지 Attribute. choices 최소 2개 검증은 Attribute 레벨에서 처리 | T-04, T-06 | 중간 | 1h |
| T-12 | MultipleChoiceMulti Entity 정의 | MultipleChoiceSingle과 동일 Attribute + validationConfig. 복수 선택 허용 | T-11, T-08 | 낮음 | 0.5h |
| T-13 | NPS Entity 정의 | 공통 + lowerLabel, upperLabel, isColorCodingEnabled. 고정 0~10 척도 | T-04, T-07 | 낮음 | 0.5h |
| T-14 | CTA Entity 정의 | 공통 + dismissible, buttonUrl, buttonLabel. attributesExtensions로 조건부 필수 교차 검증 | T-04, T-07 | 중간 | 1h |
| T-15 | Rating Entity 정의 | 공통 + scale, range, lowerLabel, upperLabel, isColorCodingEnabled | T-04, T-07 | 낮음 | 0.5h |
| T-16 | Consent Entity 정의 | 공통 + label(필수, 비어있으면 안됨) | T-04, T-07 | 낮음 | 0.5h |
| T-17 | PictureSelection Entity 정의 | 공통 + pictureChoices(최소 2개), allowMulti + validationConfig | T-04, T-06, T-08 | 중간 | 1h |
| T-18 | Date Entity 정의 | 공통 + dateFormat, html + validationConfig | T-04, T-07, T-08 | 낮음 | 0.5h |
| T-19 | FileUpload Entity 정의 | 공통 + allowMultipleFiles, maxSizeInMB, allowedFileExtensions + validationConfig | T-04, T-07, T-08 | 중간 | 1h |
| T-20 | Cal Entity 정의 | 공통 + calUserName(최소 1자), calHost | T-04, T-07 | 낮음 | 0.5h |
| T-21 | Matrix Entity 정의 | 공통 + rows, columns(MatrixChoice[]), shuffleOption + validationConfig | T-04, T-06, T-07, T-08 | 중간 | 1h |
| T-22 | Address Entity 정의 | 공통 + addressFields(6개 SubField) + validationConfig | T-04, T-07, T-08 | 중간 | 1.5h |
| T-23 | Ranking Entity 정의 | 공통 + choices(2~25개), shuffleOption, otherOptionPlaceholder + validationConfig | T-04, T-06, T-08 | 중간 | 1h |
| T-24 | ContactInfo Entity 정의 | 공통 + contactInfoFields(5개 SubField) + validationConfig | T-04, T-07, T-08 | 중간 | 1h |
| T-25 | Builder 정의 (createBuilder) | surveyBuilder 생성. 16개 Entity 등록, generateEntityId/validateEntityId, entitiesExtensions (parentRequired/allowedParents/childrenAllowed), validateSchema | T-09 ~ T-24 | 높음 | 2h |
| T-26 | Validation Engine 구현 | 24가지 Rule별 평가 로직 (텍스트/숫자/날짜/선택/순위/행렬/파일). and/or 논리 결합 평가. 에러 메시지를 번역 키로 반환 | T-03 | 높음 | 4h |
| T-27 | Shuffle 유틸리티 구현 | fisherYatesShuffle, shuffleChoices(none/all/exceptLast) | T-01 | 낮음 | 0.5h |
| T-28 | 패키지 빌드 및 내보내기 설정 | index.ts 정리, 빌드 설정, 다른 패키지에서 import 테스트 | T-25, T-26, T-27 | 낮음 | 1h |
| T-29 | shared-types 타입 재내보내기 | packages/shared-types에 EntityType, ValidationRule 관련 타입 재내보내기 추가 | T-25 | 낮음 | 0.5h |
| T-30 | 단위 테스트 - Attribute 검증 | 각 Attribute의 Zod 검증 테스트 (유효/무효 값) | T-04 ~ T-08 | 중간 | 2h |
| T-31 | 단위 테스트 - Entity 스키마 검증 | 15가지 Entity별 Attribute 조합 검증. validateSchema로 Entity 생성/수정 테스트. 교차 검증(attributesExtensions) 테스트 | T-25 | 중간 | 3h |
| T-32 | 단위 테스트 - Builder 통합 | Builder 레벨 테스트: parent-child 제약, validateEntityId, validateSchema, Entity 간 관계 | T-25 | 중간 | 2h |
| T-33 | 단위 테스트 - Validation Engine | 24가지 Rule별 평가 테스트, and/or 논리 결합 테스트, Element-Rule 매핑 검증 | T-26 | 중간 | 3h |
| T-34 | 단위 테스트 - Shuffle 유틸리티 | none/all/exceptLast 동작 테스트 | T-27 | 낮음 | 0.5h |

### 3.2 구현 순서 및 마일스톤

```
마일스톤 1: 기반 설정 (T-01 ~ T-03)                       [예상: 2.5h]
  ├── T-01: 패키지 초기 설정
  ├── T-02: 보조 타입 정의
  └── T-03: 상수 정의
  [검증 포인트] 패키지 빌드 성공, import 확인, tsc 에러 없음

마일스톤 2: Attribute 정의 완성 (T-04 ~ T-08)              [예상: 7h]
  ├── T-04: 공통 Attribute (6개)
  ├── T-05: 텍스트 Attribute (7개)
  ├── T-06: 선택지 Attribute (6개)
  ├── T-07: 기타 Attribute (20개)
  └── T-08: ValidationConfig Attribute
  [검증 포인트] 모든 Attribute의 validate가 올바른 Zod 타입을 반환하는지 확인

마일스톤 3: Entity 정의 완성 (T-09 ~ T-24)                 [예상: 12h]
  ├── T-09: Block Entity
  ├── T-10: OpenText Entity (교차 검증 포함)
  ├── T-11 ~ T-24: 나머지 14가지 Element Entity (병렬 작업 가능)
  [검증 포인트] 각 Entity의 Attribute 조합이 올바르게 구성되는지 확인
  [검증 포인트] defaultValue가 Attribute validate를 통과하는지 확인

마일스톤 4: Builder 정의 및 유틸리티 (T-25 ~ T-29)          [예상: 8h]
  ├── T-25: surveyBuilder 생성 (핵심)
  ├── T-26: Validation Engine 구현
  ├── T-27: Shuffle 유틸리티
  ├── T-28: 패키지 빌드 및 내보내기
  └── T-29: shared-types 연동
  [검증 포인트] validateSchema()로 유효/무효 Schema 검증 성공/실패 확인
  [검증 포인트] 패키지 빌드 성공, 다른 패키지에서 import 가능

마일스톤 5: 테스트 (T-30 ~ T-34)                           [예상: 10.5h]
  ├── T-30: Attribute 단위 테스트
  ├── T-31: Entity 스키마 검증 테스트
  ├── T-32: Builder 통합 테스트
  ├── T-33: Validation Engine 테스트
  └── T-34: Shuffle 테스트
  [검증 포인트] 전체 테스트 스위트 통과, 커버리지 80% 이상
```

**총 예상 시간: 약 40h (5~6일)**

### 3.3 파일 수정 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|----------|----------|
| **packages/survey-builder (패키지 설정)** | | |
| `packages/survey-builder/package.json` | 생성 | @coltorapps/builder, zod, @paralleldrive/cuid2 의존성. `@inquiry/survey-builder` 패키지명 |
| `packages/survey-builder/tsconfig.json` | 생성 | base 확장, references 설정 |
| `packages/survey-builder/tsconfig.lib.json` | 생성 | 빌드 설정 (packages/db 패턴 참조) |
| `packages/survey-builder/project.json` | 생성 | Nx 프로젝트 설정 |
| **packages/survey-builder/src/types/ (보조 타입)** | | |
| `packages/survey-builder/src/types/index.ts` | 생성 | 타입 re-export |
| `packages/survey-builder/src/types/localized-string.ts` | 생성 | `type LocalizedString = Record<string, string>` |
| `packages/survey-builder/src/types/choice.types.ts` | 생성 | Choice, PictureChoice, MatrixChoice 인터페이스 |
| `packages/survey-builder/src/types/sub-field.types.ts` | 생성 | SubField, AddressFieldId, ContactInfoFieldId 타입 |
| **packages/survey-builder/src/constants/ (상수)** | | |
| `packages/survey-builder/src/constants/index.ts` | 생성 | 상수 re-export |
| `packages/survey-builder/src/constants/forbidden-ids.ts` | 생성 | 금지 ID 10개 배열 |
| `packages/survey-builder/src/constants/allowed-file-extensions.ts` | 생성 | 허용 확장자 26가지 배열 |
| `packages/survey-builder/src/constants/validation-rule-map.ts` | 생성 | EntityType-ValidationRuleType 매핑 객체 |
| **packages/survey-builder/src/attributes/ (Attribute 정의)** | | |
| `packages/survey-builder/src/attributes/index.ts` | 생성 | Attribute re-export |
| `packages/survey-builder/src/attributes/common/headline.attribute.ts` | 생성 | headline: LocalizedString, 비어있으면 안됨 |
| `packages/survey-builder/src/attributes/common/subheader.attribute.ts` | 생성 | subheader: LocalizedString optional |
| `packages/survey-builder/src/attributes/common/required.attribute.ts` | 생성 | required: boolean |
| `packages/survey-builder/src/attributes/common/image-url.attribute.ts` | 생성 | imageUrl: string optional |
| `packages/survey-builder/src/attributes/common/video-url.attribute.ts` | 생성 | videoUrl: string optional |
| `packages/survey-builder/src/attributes/common/is-draft.attribute.ts` | 생성 | isDraft: boolean optional |
| `packages/survey-builder/src/attributes/text/placeholder.attribute.ts` | 생성 | placeholder: LocalizedString optional |
| `packages/survey-builder/src/attributes/text/long-answer.attribute.ts` | 생성 | longAnswer: boolean optional |
| `packages/survey-builder/src/attributes/text/input-type.attribute.ts` | 생성 | inputType: enum 5가지 |
| `packages/survey-builder/src/attributes/text/insights-enabled.attribute.ts` | 생성 | insightsEnabled: boolean |
| `packages/survey-builder/src/attributes/text/char-limit-enabled.attribute.ts` | 생성 | charLimitEnabled: boolean |
| `packages/survey-builder/src/attributes/text/min-length.attribute.ts` | 생성 | minLength: number positive optional |
| `packages/survey-builder/src/attributes/text/max-length.attribute.ts` | 생성 | maxLength: number positive optional |
| `packages/survey-builder/src/attributes/choice/choices.attribute.ts` | 생성 | choices: Choice[] 최소 2개 |
| `packages/survey-builder/src/attributes/choice/picture-choices.attribute.ts` | 생성 | choices: PictureChoice[] 최소 2개 |
| `packages/survey-builder/src/attributes/choice/shuffle-option.attribute.ts` | 생성 | shuffleOption: enum 3가지 |
| `packages/survey-builder/src/attributes/choice/display-type.attribute.ts` | 생성 | displayType: enum 2가지 |
| `packages/survey-builder/src/attributes/choice/other-option-placeholder.attribute.ts` | 생성 | otherOptionPlaceholder: LocalizedString optional |
| `packages/survey-builder/src/attributes/choice/allow-multi.attribute.ts` | 생성 | allowMulti: boolean |
| `packages/survey-builder/src/attributes/scale/scale.attribute.ts` | 생성 | scale: "number" \| "smiley" \| "star" |
| `packages/survey-builder/src/attributes/scale/range.attribute.ts` | 생성 | range: 3~10 정수 리터럴 |
| `packages/survey-builder/src/attributes/scale/lower-label.attribute.ts` | 생성 | lowerLabel: LocalizedString optional |
| `packages/survey-builder/src/attributes/scale/upper-label.attribute.ts` | 생성 | upperLabel: LocalizedString optional |
| `packages/survey-builder/src/attributes/scale/is-color-coding-enabled.attribute.ts` | 생성 | isColorCodingEnabled: boolean |
| `packages/survey-builder/src/attributes/cta/dismissible.attribute.ts` | 생성 | dismissible: boolean |
| `packages/survey-builder/src/attributes/cta/button-url.attribute.ts` | 생성 | buttonUrl: string optional |
| `packages/survey-builder/src/attributes/cta/button-label.attribute.ts` | 생성 | buttonLabel: LocalizedString optional |
| `packages/survey-builder/src/attributes/consent/label.attribute.ts` | 생성 | label: LocalizedString 필수, 비어있으면 안됨 |
| `packages/survey-builder/src/attributes/date/date-format.attribute.ts` | 생성 | dateFormat: enum 3가지 |
| `packages/survey-builder/src/attributes/date/html.attribute.ts` | 생성 | html: LocalizedString optional |
| `packages/survey-builder/src/attributes/file/allow-multiple-files.attribute.ts` | 생성 | allowMultipleFiles: boolean |
| `packages/survey-builder/src/attributes/file/max-size-in-mb.attribute.ts` | 생성 | maxSizeInMB: number positive optional |
| `packages/survey-builder/src/attributes/file/allowed-file-extensions.attribute.ts` | 생성 | allowedFileExtensions: string[] 26가지 내 |
| `packages/survey-builder/src/attributes/cal/cal-user-name.attribute.ts` | 생성 | calUserName: string min(1) |
| `packages/survey-builder/src/attributes/cal/cal-host.attribute.ts` | 생성 | calHost: string optional |
| `packages/survey-builder/src/attributes/matrix/rows.attribute.ts` | 생성 | rows: MatrixChoice[] |
| `packages/survey-builder/src/attributes/matrix/columns.attribute.ts` | 생성 | columns: MatrixChoice[] |
| `packages/survey-builder/src/attributes/sub-field/address-fields.attribute.ts` | 생성 | 6개 주소 SubField 구조 검증 |
| `packages/survey-builder/src/attributes/sub-field/contact-info-fields.attribute.ts` | 생성 | 5개 연락처 SubField 구조 검증 |
| `packages/survey-builder/src/attributes/validation/validation-config.attribute.ts` | 생성 | ValidationConfig Zod 검증 (logic + rules[]) |
| **packages/survey-builder/src/entities/ (Entity 정의)** | | |
| `packages/survey-builder/src/entities/index.ts` | 생성 | Entity re-export |
| `packages/survey-builder/src/entities/block.entity.ts` | 생성 | Block Entity (childrenAllowed: true) |
| `packages/survey-builder/src/entities/open-text.entity.ts` | 생성 | OpenText Entity + attributesExtensions (charLimit 교차 검증) |
| `packages/survey-builder/src/entities/multiple-choice-single.entity.ts` | 생성 | MultipleChoiceSingle Entity |
| `packages/survey-builder/src/entities/multiple-choice-multi.entity.ts` | 생성 | MultipleChoiceMulti Entity |
| `packages/survey-builder/src/entities/nps.entity.ts` | 생성 | NPS Entity |
| `packages/survey-builder/src/entities/cta.entity.ts` | 생성 | CTA Entity + attributesExtensions (dismissible 교차 검증) |
| `packages/survey-builder/src/entities/rating.entity.ts` | 생성 | Rating Entity |
| `packages/survey-builder/src/entities/consent.entity.ts` | 생성 | Consent Entity |
| `packages/survey-builder/src/entities/picture-selection.entity.ts` | 생성 | PictureSelection Entity |
| `packages/survey-builder/src/entities/date.entity.ts` | 생성 | Date Entity |
| `packages/survey-builder/src/entities/file-upload.entity.ts` | 생성 | FileUpload Entity |
| `packages/survey-builder/src/entities/cal.entity.ts` | 생성 | Cal Entity |
| `packages/survey-builder/src/entities/matrix.entity.ts` | 생성 | Matrix Entity |
| `packages/survey-builder/src/entities/address.entity.ts` | 생성 | Address Entity |
| `packages/survey-builder/src/entities/ranking.entity.ts` | 생성 | Ranking Entity |
| `packages/survey-builder/src/entities/contact-info.entity.ts` | 생성 | ContactInfo Entity |
| **packages/survey-builder/src/ (Builder + 유틸리티)** | | |
| `packages/survey-builder/src/builder.ts` | 생성 | surveyBuilder 정의 (createBuilder) |
| `packages/survey-builder/src/index.ts` | 생성 | 퍼블릭 API export |
| **packages/survey-builder/src/validation/ (Validation Engine)** | | |
| `packages/survey-builder/src/validation/index.ts` | 생성 | Validation re-export |
| `packages/survey-builder/src/validation/validation-rule-type.ts` | 생성 | 24가지 ValidationRuleType enum |
| `packages/survey-builder/src/validation/validation.types.ts` | 생성 | ValidationRule, ValidationConfig, ValidationResult 타입 |
| `packages/survey-builder/src/validation/validation.engine.ts` | 생성 | evaluateValidation, evaluateRule 함수 |
| `packages/survey-builder/src/validation/validation.utils.ts` | 생성 | getApplicableRules, isRuleApplicable |
| `packages/survey-builder/src/validation/rules/text-rules.ts` | 생성 | 10가지 텍스트 Rule 평가 함수 |
| `packages/survey-builder/src/validation/rules/number-rules.ts` | 생성 | 4가지 숫자 Rule 평가 함수 |
| `packages/survey-builder/src/validation/rules/date-rules.ts` | 생성 | 4가지 날짜 Rule 평가 함수 |
| `packages/survey-builder/src/validation/rules/selection-rules.ts` | 생성 | 2가지 선택 Rule 평가 함수 |
| `packages/survey-builder/src/validation/rules/ranking-rules.ts` | 생성 | 2가지 순위 Rule 평가 함수 |
| `packages/survey-builder/src/validation/rules/matrix-rules.ts` | 생성 | 2가지 행렬 Rule 평가 함수 |
| `packages/survey-builder/src/validation/rules/file-rules.ts` | 생성 | 2가지 파일 Rule 평가 함수 |
| `packages/survey-builder/src/validation/rules/index.ts` | 생성 | evaluateRule 통합 함수 |
| **packages/survey-builder/src/shuffle/ (Shuffle)** | | |
| `packages/survey-builder/src/shuffle/shuffle.utils.ts` | 생성 | fisherYatesShuffle, shuffleChoices |
| **프로젝트 설정** | | |
| `tsconfig.base.json` | 수정 | paths에 `@inquiry/survey-builder` 경로 alias 추가 |
| **packages/shared-types (타입 재내보내기)** | | |
| `packages/shared-types/src/survey/element-type.enum.ts` | 생성 | EntityType 재내보내기 (호환용) |
| `packages/shared-types/src/validation/validation.types.ts` | 생성 | ValidationRule 타입 재내보내기 |
| `packages/shared-types/src/index.ts` | 수정 | 위 타입들 re-export 추가 |
| **테스트** | | |
| `packages/survey-builder/src/__tests__/attributes/attributes.spec.ts` | 생성 | Attribute Zod 검증 단위 테스트 |
| `packages/survey-builder/src/__tests__/entities/open-text.entity.spec.ts` | 생성 | OpenText Entity 검증 테스트 (교차 검증 포함) |
| `packages/survey-builder/src/__tests__/entities/multiple-choice.entity.spec.ts` | 생성 | MultipleChoice Entity 검증 테스트 |
| `packages/survey-builder/src/__tests__/entities/cta.entity.spec.ts` | 생성 | CTA Entity 교차 검증 테스트 |
| `packages/survey-builder/src/__tests__/entities/rating.entity.spec.ts` | 생성 | Rating Entity 검증 테스트 |
| `packages/survey-builder/src/__tests__/entities/address.entity.spec.ts` | 생성 | Address Entity SubField 검증 테스트 |
| `packages/survey-builder/src/__tests__/entities/contact-info.entity.spec.ts` | 생성 | ContactInfo Entity SubField 검증 테스트 |
| `packages/survey-builder/src/__tests__/entities/remaining.entity.spec.ts` | 생성 | 나머지 Entity 검증 테스트 (NPS, Consent, PictureSelection, Date, FileUpload, Cal, Matrix, Ranking) |
| `packages/survey-builder/src/__tests__/builder.spec.ts` | 생성 | Builder 통합 테스트 (parent-child, ID 검증, Schema 검증) |
| `packages/survey-builder/src/__tests__/validation.engine.spec.ts` | 생성 | Validation Engine 24가지 Rule 테스트 |
| `packages/survey-builder/src/__tests__/shuffle.utils.spec.ts` | 생성 | Shuffle 유틸리티 테스트 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 발생 확률 | 완화 전략 |
|--------|------|----------|----------|
| @coltorapps/builder API 한계 | Attribute validate에서 다른 Attribute 값을 참조하는 교차 검증이 `attributesExtensions`의 context에서만 가능. Entity 레벨이 아닌 builder 레벨(entitiesExtensions)에서만 schema 전체 접근 가능 | 중간 | Entity 내 `attributesExtensions`로 동일 Entity 내 교차 검증 처리. Schema 전체 교차 검증은 builder의 `entitiesExtensions` 또는 `validateSchema`에서 처리. 불가능한 케이스 발견 시 별도 검증 레이어 추가 |
| FS-008 Survey 모델 미구현 | FS-009는 스키마 정의 중심이므로 독립 구현 가능하나, builder Schema를 DB에 저장/조회하는 통합은 FS-008 완료 후 가능 | 높음 | packages/survey-builder를 순수 builder 정의 + 유틸리티 패키지로 독립 구현. validateSchema/validateEntitiesValues 호출은 FS-008 서비스에서 수행 |
| Attribute 간 의존성 복잡성 | charLimitEnabled가 true일 때만 minLength/maxLength 관련 교차 검증이 필요한 등, 조건부 검증 로직이 attributesExtensions에서 복잡해질 수 있음 | 중간 | 교차 검증이 필요한 Entity만 attributesExtensions를 사용하고 (OpenText, CTA), 나머지는 단순 Attribute 조합으로 유지. 복잡한 경우 별도 헬퍼 함수로 분리 |
| Validation Engine 24가지 Rule 구현량 | 24가지 Rule의 개별 평가 로직 구현량이 상당함. builder 외부 로직이므로 별도 테스트도 필요 | 중간 | 카테고리별(텍스트/숫자/날짜/선택/순위/행렬/파일)로 모듈화. 텍스트 카테고리(10가지)에서 공통 패턴 추출. 각 카테고리별 테스트 파일 분리 |
| defaultValue와 Attribute validate 타입 불일치 | Entity의 defaultValue가 Attribute validate의 Zod 스키마를 통과하지 못할 경우 런타임 에러 발생 | 중간 | builder 스킬 문서(entity-default-values)에 따라 defaultValue의 타입이 반드시 Zod 스키마 출력 타입과 일치하도록 구현. 단위 테스트에서 각 Entity의 defaultValue가 validate를 통과하는지 검증 |
| builder Schema와 기존 discriminated union 호환 | 기존 명세가 discriminated union 패턴을 전제로 작성됨. builder의 flat map Schema 구조로 전환 시 기존 참조 문서와의 불일치 | 낮음 | `entity.type` 필드가 discriminated union의 type 역할을 하므로 본질적 차이 없음. shared-types에서 EntityType을 재내보내기하여 호환성 유지 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

#### 5.1.1 Attribute 검증 테스트 (T-30)

| 테스트 카테고리 | 세부 케이스 |
|---------------|-----------|
| 공통 Attribute | headline: 유효한 LocalizedString 통과, 빈 문자열 거부, 비객체 타입 거부 |
| | required: boolean 통과, 문자열 거부 |
| | subheader: LocalizedString optional 통과, undefined 허용 |
| | imageUrl/videoUrl: string optional 통과 |
| | isDraft: boolean optional 통과 |
| 텍스트 Attribute | inputType: 5가지 enum 통과, 잘못된 값 거부 |
| | charLimitEnabled: boolean 통과 |
| | minLength/maxLength: 양수 통과, 0/음수 거부, undefined 허용 |
| 선택지 Attribute | choices: 2개 이상 Choice[] 통과, 1개 거부, 빈 배열 거부 |
| | shuffleOption: 3가지 enum 통과 |
| | displayType: 2가지 enum 통과 |
| 척도 Attribute | scale: 3가지 enum 통과, 잘못된 값 거부 |
| | range: 3~10 리터럴 통과, 2/11 거부 |
| 파일 Attribute | allowedFileExtensions: 26가지 내 통과, 미허용 확장자 거부 |
| ValidationConfig | logic: and/or 통과, 잘못된 값 거부 |
| | rules: 유효한 Rule 구조 통과, 잘못된 params 거부 |

#### 5.1.2 Entity 스키마 검증 테스트 (T-31)

| Entity | 테스트 케이스 |
|--------|-------------|
| OpenText | 기본값으로 생성 시 모든 Attribute 통과. charLimitEnabled=true인데 minLength/maxLength 모두 없으면 교차 검증 통과(하나라도 있으면 됨). minLength > maxLength 시 에러 |
| MultipleChoiceSingle | choices 1개일 때 에러. 2개 이상 통과. displayType/shuffleOption 유효값 통과 |
| MultipleChoiceMulti | MultipleChoiceSingle 테스트 + validationConfig 유효 테스트 |
| CTA | dismissible=false일 때 buttonUrl 없어도 통과. dismissible=true인데 buttonUrl 없으면 에러. 잘못된 URL 형식 에러 |
| Rating | scale 잘못된 값 에러. range 2/11 에러. 유효한 조합 통과 |
| Consent | label 빈 문자열 에러. 유효한 LocalizedString 통과 |
| PictureSelection | pictureChoices 1개 에러. imageUrl 누락 에러. 2개 이상 통과 |
| Date | dateFormat 잘못된 값 에러. 유효한 3가지 통과 |
| FileUpload | allowedFileExtensions에 미허용 확장자 에러. 유효한 확장자 통과 |
| Cal | calUserName 빈 문자열 에러. 1자 이상 통과 |
| Matrix | rows/columns 유효 MatrixChoice 통과 |
| Address | 6개 SubField 구조 검증. show/required/placeholder 타입 검증 |
| Ranking | choices 1개 에러, 26개 에러. 2~25개 통과 |
| ContactInfo | 5개 SubField 구조 검증 |

#### 5.1.3 Builder 통합 테스트 (T-32)

| 테스트 카테고리 | 세부 케이스 |
|---------------|-----------|
| Parent-child 제약 | Element Entity가 Block 없이 root에 직접 배치 시 에러 |
| | Element Entity가 다른 Element의 자식으로 배치 시 에러 |
| | Block이 Element를 자식으로 허용하는지 확인 |
| Entity ID 검증 | 금지 ID 사용 시 에러 |
| | 공백/특수문자 포함 ID 에러 |
| | 유효한 ID 패턴 통과 |
| Schema 검증 | validateSchema 성공/실패 케이스 |
| | validateSchemaShape 구조 검증 |

#### 5.1.4 Validation Engine 테스트 (T-33)

| 테스트 카테고리 | 세부 케이스 |
|---------------|-----------|
| 텍스트 Rule | minLength/maxLength 경계값, pattern 정규식 매칭, email/url/phone 형식, equals/doesNotEqual 일치/불일치, contains/doesNotContain 포함 여부 |
| 숫자 Rule | minValue/maxValue 경계값, isGreaterThan/isLessThan 비교 |
| 날짜 Rule | isLaterThan/isEarlierThan 날짜 비교, isBetween/isNotBetween 범위 |
| 선택 Rule | minSelections/maxSelections 개수 |
| 순위 Rule | minRanked, rankAll |
| 행렬 Rule | minRowsAnswered, answerAllRows |
| 파일 Rule | fileExtensionIs/fileExtensionIsNot 확장자 |
| 논리 결합 | and: 모든 Rule 통과 시만 유효. or: 하나라도 통과 시 유효 |
| Element-Rule 매핑 | 적용 불가한 Rule이 거부되는지 확인 |

#### 5.1.5 Shuffle 유틸리티 테스트 (T-34)

| 테스트 카테고리 | 세부 케이스 |
|---------------|-----------|
| none | 원래 순서 유지 |
| all | 모든 항목 셔플 (통계적 검증: 여러 번 실행 시 순서 변동 확인) |
| exceptLast | 마지막 항목 고정, 나머지 셔플 |

### 5.2 통합 테스트

통합 테스트는 FS-008 (Survey CRUD)와 함께 구현된 후 수행한다.

| 테스트 시나리오 | 설명 |
|---------------|------|
| Survey 생성 시 Schema 검증 | validateSchema(surveyBuilder, schema)로 서버 사이드 검증 |
| Survey 수정 시 Schema 검증 | Entity 추가/수정/삭제 후 Schema 재검증 |
| 발행 시 Entity 완전성 | isDraft=true인 Entity 포함 시 발행 거부 |
| 응답 검증 | validateEntitiesValues로 응답 값 검증 |
| 다국어 Schema | LocalizedString Attribute에 복수 언어 설정 후 저장/조회 |

### 5.3 E2E 테스트

E2E 테스트는 FS-010 (설문 편집기 UX) 구현 후 수행한다.

| 테스트 시나리오 | 설명 |
|---------------|------|
| 질문 유형 추가 | BuilderStore에서 각 유형의 Entity를 추가하고 저장 |
| Attribute 검증 에러 | 잘못된 Attribute 설정 시 UI에서 에러 표시 |
| Shuffle 동작 | InterpreterStore에서 선택지 셔플 적용 확인 |
| 응답 값 검증 | InterpreterStore에서 응답 입력 후 Entity validate 확인 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 제약사항 | 설명 |
|---------|------|
| FS-008 의존 | Builder Schema를 DB에 저장하려면 Survey 모델(FS-008)이 먼저 구현되어야 함. 현재 계획은 packages/survey-builder의 정의/유틸리티 레이어만 포함 |
| UI 편집기 미포함 | BuilderStore, React 컴포넌트(BuilderEntities, InterpreterEntities)는 FS-010 범위 |
| 응답 저장 포맷 미정의 | Entity 응답 값의 저장 형식은 FS-021 범위. Entity의 validate는 타입 검증만 수행 |
| Storage URL 구체적 형식 미정 | imageUrl, videoUrl 등의 Storage URL 검증은 실제 Storage 서비스 구현 시 구체화 |
| Cal.com 연동 미구현 | Cal Entity의 실제 위젯 렌더링은 Cal.com SDK 연동 필요. 스키마 정의만 포함 |
| @coltorapps/builder-react 미포함 | React 바인딩은 FS-010에서 설치 및 설정. 현재는 코어 패키지만 사용 |

### 6.2 향후 개선 가능성

| 개선 항목 | 설명 |
|----------|------|
| 새 질문 유형 추가 | 새 Entity를 `createEntity()`로 정의하고 builder의 entities 배열에 추가하면 됨. entitiesExtensions에 parent-child 제약 추가 |
| Validation Rule 확장 | ValidationRuleType enum에 새 규칙 추가, rules/ 디렉토리에 평가 함수 추가, validation-rule-map에 Entity 매핑 추가 |
| shouldBeProcessed 활용 | 조건부 로직(FS-012)과 연계하여 Entity의 shouldBeProcessed로 동적 표시/숨김 처리 |
| Factory 패턴 | 환경/테넌트별 다른 Entity 집합이 필요한 경우 createFormBuilder 팩토리 함수 도입 |
| Schema 마이그레이션 | 스키마 구조 변경 시 기존 JSON 데이터 마이그레이션 전략 필요. validateSchemaShape로 구조 검증 후 변환 |
| 성능 최적화 | 대규모 설문(100+ Entity)의 경우 validateSchema 비동기 처리 및 부분 검증 전략 |

---

## 7. i18n 고려사항

FS-009는 데이터 스키마 정의 문서이므로 클라이언트 UI 문자열은 직접적으로 포함하지 않는다. 다만, 다음의 i18n 관련 사항이 있다.

### 7.1 Element 내 다국어 지원 (LocalizedString)

Element의 텍스트 Attribute(headline, subheader, placeholder, label, lowerLabel, upperLabel, buttonLabel, html, otherOptionPlaceholder 등)는 모두 `LocalizedString` (`Record<string, string>`) 타입이다. 이는 **설문 콘텐츠의 다국어**에 해당하며, 관리자 UI의 i18n (react-i18next)과는 별개이다.

Attribute validate에서 `z.record(z.string(), z.string())` 패턴으로 검증하되, 필수 필드의 경우 `.refine(obj => Object.values(obj).some(v => v.trim().length > 0))`으로 최소 하나의 언어에 값이 있는지 확인한다.

### 7.2 검증 에러 메시지 번역 키 (FS-010 구현 시 추가 예정)

설문 편집기 UI 구현 시 아래 번역 키가 필요하지만, 이는 FS-010 범위에서 추가한다.

| 번역 키 (예시) | 설명 |
|---------------|------|
| `survey.element.error.invalidId` | Element ID 형식 오류 |
| `survey.element.error.forbiddenId` | 금지된 Element ID |
| `survey.element.error.minChoices` | 최소 선택지 수 미달 |
| `survey.element.error.requiredField` | 필수 필드 누락 |
| `survey.element.error.invalidUrl` | 유효하지 않은 URL |
| `survey.element.error.charLimit` | 글자 수 제한 조건 미충족 |
| `survey.validation.error.*` | 각 Validation Rule별 에러 메시지 |

### 7.3 Validation Engine 에러 메시지

Validation Engine의 에러 메시지는 번역 키를 반환하여 클라이언트에서 i18n 처리할 수 있도록 한다.

```typescript
// 에러 메시지를 번역 키로 반환하는 패턴
interface ValidationError {
  ruleType: ValidationRuleType;
  messageKey: string;   // e.g., 'validation.error.minLength'
  params?: Record<string, unknown>; // e.g., { min: 5 }
}
```
