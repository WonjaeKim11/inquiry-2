# 기능 구현 계획: 변수 / 히든 필드 / 리콜 (FSD-013)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 설명 | 우선순위 |
|---------|--------|------|---------|
| FN-013-01 | 변수 정의 및 기본값 관리 | text/number 타입 변수를 설문 내에 정의하고 기본값을 관리. Discriminated Union 구조 | 높음 |
| FN-013-02 | 변수 이름 유효성 검증 | 소문자 알파벳, 숫자, 밑줄만 허용 (`^[a-z0-9_]+$`) | 높음 |
| FN-013-03 | 변수 ID 유일성 검증 | 설문 저장 시 동일 설문 내 변수 ID 중복 검사 | 높음 |
| FN-013-04 | 변수값 업데이트 (Calculate 액션 연동) | 조건부 로직 엔진의 Calculate 액션을 통한 변수값 연산. 숫자(5종), 텍스트(2종) 연산 지원 | 높음 |
| FN-013-05 | 히든 필드 정의 및 활성화 관리 | enabled 토글 + fieldIds 배열로 히든 필드 구성 | 높음 |
| FN-013-06 | 히든 필드 ID 유효성 검증 | 빈 문자열, 중복, 금지 ID, 공백, 문자 패턴 등 다단계 검증. Element/Variable에도 공통 적용 | 높음 |
| FN-013-07 | 히든 필드 삭제 시 안전 검증 | 로직/리콜/쿼터/Follow-up 4개 영역 참조 무결성 검사 | 높음 |
| FN-013-08 | 히든 필드 값 설정 (URL/SDK) | URL 쿼리 파라미터 또는 SDK를 통한 외부 데이터 주입 | 높음 |
| FN-013-09 | Recall 패턴 파싱 | `#recall:{id}/fallback:{value}#` 정규식 파싱. 4가지 파싱 유형 제공 | 높음 |
| FN-013-10 | Recall 값 해석 및 치환 | 변수 -> 응답 데이터 -> Fallback 우선순위로 값 조회 후 치환. 날짜/배열 포매팅 | 높음 |
| FN-013-11 | Recall 에디터 표시 | recall 패턴을 `@라벨명` 또는 `/라벨명\` 형태로 에디터에 표시 | 중간 |
| FN-013-12 | Recall 에디터-저장 형식 변환 | `@라벨명` <-> `#recall:id/fallback:val#` 양방향 변환 | 중간 |
| FN-013-13 | 빈 Fallback 값 검증 | headline/subheader에서 빈 fallback 탐지 및 경고 (저장 차단 없음) | 중간 |
| FN-013-14 | 중첩 Recall 처리 | 라벨 내 중첩 recall을 `"___"`로 대체하여 무한 루프 방지 | 높음 |
| FN-013-15 | Recall 텍스트 축약 | 25자 이상 텍스트를 `앞10자...뒤10자` 형태로 축약 | 낮음 |

### 1.2 비기능 요구사항

| NFR ID | 항목 | 요구사항 |
|--------|------|---------|
| NFR-013-01 | 변수 ID 형식 | CUID2 형식을 준수해야 한다 |
| NFR-013-02 | 변수 이름 유효성 | 소문자, 숫자, 밑줄만 허용 |
| NFR-013-03 | Hidden Field ID 유효성 | 영문 대소문자, 숫자, 하이픈, 밑줄만 허용 |
| NFR-013-04 | Recall 파싱 안전성 | while 루프에서 null 반환 시 즉시 중단하여 무한 루프 방지 |
| NFR-013-05 | 중첩 Recall 안전성 | 중첩 recall을 `"___"`로 대체하여 재귀 해석 차단 |
| NFR-013-06 | HTML 태그 제거 | Element headline에서 HTML 태그를 제거하여 XSS 방지 |
| 성능 | Recall 파싱 | 정규식 기반 텍스트당 수 밀리초 이내 처리 |
| 성능 | 변수값 조회 | O(1) - 변수 ID 기반 직접 조회 |

### 1.3 명세서 내 모호한 점 및 해석

| 항목 | 모호한 점 | 해석/결정 |
|------|----------|----------|
| Survey 데이터 모델 저장 구조 | 명세서에서 Survey의 variables/hiddenFields가 JSON 객체로 저장되는지 별도 테이블인지 명시하지 않음 | FSD-008의 설문 데이터 모델에서 `variables`는 배열, `hiddenFields`는 객체 형태로 Survey 내에 포함. PostgreSQL의 `Json` 타입 필드로 Survey 모델 안에 저장. 별도 정규화 테이블 없이 Document-style 접근 |
| Recall 에디터 UI 구현 기술 | 에디터 내 `@라벨명` 표시의 구체적 UI 기술(Rich Text Editor, contenteditable 등) 미정 | 설문 에디터(FSD-010)의 Rich Text Editor 구현에 의존. 본 계획에서는 recall 변환 로직(utils)에 집중하고, 에디터 통합은 FSD-010 구현 시 수행 |
| Calculate 액션의 값 소스 구조 | "static, 다른 변수, element 응답값, hidden field 값"이라고만 기술. 구체적 데이터 구조 미정의 | FSD-012(조건부 로직 엔진)의 Calculate 액션 데이터 구조를 따름. value 필드에 `{ type: "static" | "variable" | "element" | "hiddenField", value: any }` 형태의 discriminated union으로 설계 |
| 날짜 포매팅 로케일 | "1st January 2024" 형태 포매팅만 정의. 한국어 등 다국어 날짜 포맷 언급 없음 | 초기 구현에서는 영문 서수 날짜 형식만 지원. 추후 로케일별 날짜 포매팅 확장 가능하도록 포매터 함수를 분리 설계 |
| FORBIDDEN_IDS 개수 차이 | FSD-013은 11개, FSD-008은 10개로 언급. 목록 비교 필요 | FSD-013의 11개 목록을 기준으로 구현. FSD-008과 동기화 필요 시 단일 상수로 통합 관리 |
| 변수 name 유일성 | FSD-008(BR-03-06)에서 "Variable name은 설문 내에서 고유"라고 정의되나, FSD-013에서는 name 유일성 검증이 별도 기능으로 분리되어 있지 않음 | FN-013-02(이름 유효성)에 name 유일성 검증도 포함하여 구현. 패턴 검증과 유일성 검증을 함께 수행 |
| 히든 필드 값 응답 저장 구조 | 응답 데이터에 히든 필드 값이 어떤 형태로 저장되는지 미정의 (FSD-021 응답 관리 참조 필요) | 응답 데이터 내 `data` JSON 객체에 `{ [hiddenFieldId]: string }` key-value 형태로 저장. 일반 질문 응답과 동일 레벨에서 관리 |

### 1.4 암묵적 요구사항

| 항목 | 설명 |
|------|------|
| Survey Prisma 모델 생성 | 현재 DB 스키마에 Survey 모델이 존재하지 않음. FSD-008의 Survey 데이터 모델을 Prisma 스키마에 추가해야 함. variables/hiddenFields를 `Json` 타입으로 포함 |
| 공유 유효성 검증 라이브러리 | ID 유효성 검증(FN-013-06)이 서버/클라이언트 양쪽에서 사용됨. 공유 가능한 검증 유틸리티 패키지 필요 |
| `@paralleldrive/cuid2` 라이브러리 도입 | 변수 ID 생성을 위한 CUID2 라이브러리 필요. 현재 Prisma의 `@default(cuid())`는 CUID v1 |
| Survey CRUD API (FSD-008 선행) | 변수/히든 필드는 설문 데이터 모델의 일부. 설문 CRUD API가 선행 구현되어야 함 |
| 조건부 로직 엔진 (FSD-012 선행) | Calculate 액션을 통한 변수값 업데이트는 FSD-012의 로직 엔진에 의존 |
| DOMParser 또는 HTML sanitizer | Recall 에디터 표시 시 HTML 태그 제거를 위한 유틸리티 필요 |
| Survey 런타임 엔진 컨텍스트 | Recall 치환은 클라이언트 사이드 런타임에서 수행. Survey Engine 상태 관리 컨텍스트 필요 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

본 기능은 크게 3개의 도메인(변수, 히든 필드, 리콜)으로 나뉘며, 모두 **설문 데이터 모델의 일부**로서 독립적인 API를 갖지 않는다. 설문 CRUD API를 통해 관리되며, 핵심 비즈니스 로직은 클라이언트(에디터 + 런타임)와 서버(유효성 검증) 양쪽에 분배된다.

```
[공유 패키지]
packages/shared/
├── src/
│   ├── types/
│   │   ├── survey.types.ts            # Survey, Variable, HiddenFields, RecallItem 타입
│   │   └── recall.types.ts            # Recall 관련 타입
│   ├── constants/
│   │   └── forbidden-ids.ts           # FORBIDDEN_IDS 상수 (11개)
│   └── utils/
│       ├── id-validation.ts           # ID 유효성 검증 (공통)
│       ├── variable-validation.ts     # 변수 이름/값 검증
│       ├── recall-parser.ts           # Recall 패턴 파싱 엔진
│       ├── recall-resolver.ts         # Recall 값 해석 및 치환
│       ├── recall-formatter.ts        # 날짜/배열 포매팅, 텍스트 축약
│       ├── recall-editor.ts           # 에디터 표시/저장 형식 변환
│       └── hidden-field-validation.ts # 히든 필드 검증

[서버]
apps/server/src/
├── survey/
│   ├── survey.module.ts
│   ├── survey.controller.ts           # Survey CRUD (FSD-008에서 구현)
│   ├── survey.service.ts
│   └── survey-validation.service.ts   # 서버 사이드 유효성 검증
│       - 변수 ID 유일성 (FN-013-03)
│       - 변수 이름 유효성 (FN-013-02)
│       - 히든 필드 ID 유효성 (FN-013-06)
│       - 빈 Fallback 경고 (FN-013-13)

[클라이언트 - 에디터]
apps/client/src/
├── features/survey-editor/
│   ├── components/
│   │   ├── VariablePanel/             # 변수 관리 패널 (FN-013-01)
│   │   ├── HiddenFieldPanel/          # 히든 필드 관리 패널 (FN-013-05)
│   │   └── RecallTag/                 # Recall UI 태그 컴포넌트 (FN-013-11)
│   ├── hooks/
│   │   ├── useVariables.ts            # 변수 CRUD 로직
│   │   ├── useHiddenFields.ts         # 히든 필드 CRUD 로직
│   │   └── useRecall.ts               # Recall 에디터 통합
│   └── utils/
│       └── hidden-field-safety.ts     # 삭제 시 참조 무결성 검사 (FN-013-07)

[클라이언트 - 설문 런타임]
apps/client/src/
├── features/survey-runtime/
│   ├── engine/
│   │   ├── recall-engine.ts           # Recall 치환 런타임 엔진 (FN-013-10, FN-013-14)
│   │   ├── variable-engine.ts         # 변수값 관리 런타임 (FN-013-04)
│   │   └── hidden-field-engine.ts     # 히든 필드 값 수집 (FN-013-08)
│   └── context/
│       └── survey-runtime.context.ts  # 런타임 상태 관리
```

**데이터 흐름:**
```
[에디터 영역]
설문 에디터 UI
    ↓ 변수/히든 필드 정의
    ↓ Recall @라벨 입력 -> #recall:id/fallback:val# 저장 변환
    ↓ 서버 API 호출 (설문 저장)
    ↓
서버: 유효성 검증 (ID 유일성, 이름 패턴, 금지 ID, 빈 Fallback 경고)
    ↓
DB: Survey 모델의 variables(Json), hiddenFields(Json) 필드에 저장

[런타임 영역]
설문 로드 → URL 파라미터/SDK에서 히든 필드 값 수집
    ↓
응답자가 질문에 답변 → 응답 데이터 축적
    ↓
Block 전환 → 조건부 로직 평가 → Calculate 액션 실행 → 변수값 업데이트
    ↓
Recall 치환 엔진: 텍스트 내 recall 패턴을 실제 값으로 치환
    ↓
치환된 텍스트 렌더링
```

### 2.2 데이터 모델

#### 2.2.1 Prisma 스키마 변경 (Survey 모델 추가)

> **주의**: Survey 모델은 FSD-008(설문 생성/유형/라이프사이클)에서 정의되는 전체 스키마의 일부이다. 본 계획에서는 FSD-013과 직접 관련된 필드(variables, hiddenFields)에 집중하되, FSD-008과의 정합성을 위해 전체 Survey 모델 골격을 포함한다.

```prisma
/// 설문 상태
enum SurveyStatus {
  DRAFT
  IN_PROGRESS
  PAUSED
  COMPLETED
}

/// 설문 유형
enum SurveyType {
  LINK
  APP
}

/// 설문 (FSD-008 + FSD-013)
model Survey {
  id               String       @id @default(cuid())
  name             String
  type             SurveyType   @default(APP)
  status           SurveyStatus @default(DRAFT)
  environmentId    String
  creatorId        String?

  // FSD-013 관련 핵심 필드
  variables        Json         @default("[]")       // Variable[] - 변수 배열 (JSON)
  hiddenFields     Json         @default("{\"enabled\":false,\"fieldIds\":[]}")  // HiddenFields 객체

  // 기타 Survey 필드 (FSD-008에서 정의)
  welcomeCard      Json?
  blocks           Json         @default("[]")
  endings          Json         @default("[]")
  followUps        Json?
  // ... (기타 필드는 FSD-008 구현 시 추가)

  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  environment      Environment  @relation(fields: [environmentId], references: [id], onDelete: Cascade)
  creator          User?        @relation(fields: [creatorId], references: [id], onDelete: SetNull)
  responses        Response[]

  @@index([environmentId])
  @@index([status])
  @@map("surveys")
}
```

#### 2.2.2 TypeScript 타입 정의 (공유 패키지)

```typescript
// packages/shared/src/types/survey.types.ts

/** 숫자 변수 */
interface NumberVariable {
  id: string;       // CUID2 형식
  name: string;     // ^[a-z0-9_]+$
  type: 'number';
  value: number;    // 기본값: 0
}

/** 텍스트 변수 */
interface TextVariable {
  id: string;
  name: string;
  type: 'text';
  value: string;    // 기본값: ""
}

/** 변수 (Discriminated Union) */
type Variable = NumberVariable | TextVariable;

/** 히든 필드 */
interface HiddenFields {
  enabled: boolean;
  fieldIds: string[];
}

/** Recall 아이템 */
interface RecallItem {
  id: string;
  label: string;
  type: 'hiddenField' | 'element' | 'variable';
}

/** Recall 파싱 결과 */
interface RecallInfo {
  id: string;
  fallback: string;
}

/** Calculate 연산자 (숫자) */
type NumberOperator = 'add' | 'subtract' | 'multiply' | 'divide' | 'assign';

/** Calculate 연산자 (텍스트) */
type TextOperator = 'assign' | 'concat';

/** Calculate 값 소스 */
interface CalculateValueSource {
  type: 'static' | 'variable' | 'element' | 'hiddenField';
  value: string | number;
}
```

### 2.3 API 설계 (해당 사항 제한적)

명세서에 명시된 대로, 본 기능은 **독립적인 외부 API를 제공하지 않는다**. Survey CRUD API(FSD-008)를 통해 관리된다.

**설문 저장 시 추가 검증 항목** (Survey 저장 API에 통합):

```
PUT /api/surveys/:surveyId
Request Body: { ...surveyData, variables: Variable[], hiddenFields: HiddenFields, ... }

검증 로직 (SurveyValidationService):
1. 변수 ID 유일성 검증 (FN-013-03)
2. 변수 이름 패턴 검증 (FN-013-02) + 이름 유일성 검증 (FSD-008 BR-03-06)
3. 히든 필드 ID 유효성 검증 (FN-013-06)
4. 빈 Fallback 경고 반환 (FN-013-13) - warnings 배열로 포함

Response:
{
  success: true,
  data: Survey,
  warnings: [
    { type: "EMPTY_FALLBACK", elementId: "...", field: "headline" }
  ]
}
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 Recall 파싱 엔진 (핵심 유틸리티)

```typescript
// packages/shared/src/utils/recall-parser.ts

const RECALL_PATTERN = /#recall:([a-zA-Z0-9_-]+)\/fallback:(.*?)#/g;

/** 첫 번째 recall ID 추출 */
function getFirstRecallId(text: string): string | null;

/** 모든 recall ID 추출 */
function getAllRecallIds(text: string): string[];

/** fallback 값 추출 */
function getFallbackValue(text: string): string | null;

/** 전체 recall 정보 추출 */
function getAllRecallInfo(text: string): RecallInfo[];
```

#### 2.4.2 ID 유효성 검증 (공통 유틸리티)

```typescript
// packages/shared/src/utils/id-validation.ts

const FORBIDDEN_IDS = [
  'userId', 'source', 'suid', 'end', 'start',
  'welcomeCard', 'hidden', 'verifiedEmail',
  'multiLanguage', 'embed', 'verify',
] as const;

interface IdValidationResult {
  valid: boolean;
  error?: string;
}

/** ID 유효성 검증 (공통) - 검증 순서: 빈 문자열 -> 중복 -> 금지 ID -> 공백 -> 문자 패턴 */
function validateId(
  id: string,
  type: 'Hidden field' | 'Variable' | 'Element',
  existingIds: string[],
): IdValidationResult;
```

#### 2.4.3 Recall 값 해석 및 치환 엔진

```typescript
// packages/shared/src/utils/recall-resolver.ts

interface RecallContext {
  variables: Variable[];
  responseData: Record<string, any>;
}

/**
 * 텍스트 내 recall 패턴을 실제 값으로 치환한다.
 * 우선순위: 변수 -> 응답 데이터 -> Fallback
 */
function resolveRecalls(text: string, context: RecallContext): string;

/** 날짜 값 포매팅 (서수 형식: "1st January 2024") */
function formatDateValue(dateString: string): string;

/** 배열 값 포매팅 (빈 값 제거 후 쉼표 연결) */
function formatArrayValue(arr: any[]): string;
```

#### 2.4.4 변수값 업데이트 엔진 (런타임)

```typescript
// apps/client/src/features/survey-runtime/engine/variable-engine.ts

interface CalculateAction {
  variableId: string;
  operator: NumberOperator | TextOperator;
  valueSource: CalculateValueSource;
}

/**
 * Calculate 액션을 실행하여 변수값을 업데이트한다.
 * - 0 나누기: 변수값 변경 없음
 * - 존재하지 않는 변수 ID: 무시
 */
function executeCalculate(
  variables: Variable[],
  action: CalculateAction,
  responseData: Record<string, any>,
  hiddenFieldValues: Record<string, string>,
): Variable[];
```

### 2.5 기존 시스템에 대한 영향도 분석

| 영역 | 영향 | 설명 |
|------|------|------|
| Prisma 스키마 | **높음** | Survey, Environment, Response 등 새 모델 추가. DB 마이그레이션 필요 |
| 패키지 구조 | **높음** | `packages/shared` 공유 패키지 신규 생성 (서버/클라이언트 공통 코드) |
| FSD-008 (설문 생성) | **높음** | Survey CRUD API 구현이 선행되어야 함. variables/hiddenFields 필드 포함 |
| FSD-012 (조건부 로직) | **높음** | Calculate 액션 구현에 의존. 동시 또는 선행 구현 필요 |
| FSD-010 (설문 에디터 UX) | **중간** | Recall 에디터 UI 통합은 에디터 구현 시 수행 |
| 기존 auth/prisma 모듈 | **낮음** | 기존 인증 및 DB 모듈에 직접적 영향 없음. Survey 모듈이 독립적으로 추가됨 |
| i18n | **중간** | 변수/히든 필드 관리 UI의 라벨, 에러 메시지, 토스트 메시지에 대한 번역 키 추가 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|-----------|
| T-01 | 공유 패키지 초기 설정 | `packages/shared` 패키지 생성, tsconfig, 빌드 설정, Nx 프로젝트 등록 | 없음 | 낮음 | 2h |
| T-02 | 공유 타입 정의 | Variable, HiddenFields, RecallItem, RecallInfo, CalculateAction 등 TypeScript 타입 정의 | T-01 | 낮음 | 2h |
| T-03 | FORBIDDEN_IDS 상수 정의 | 11개 금지 ID 상수 및 관련 타입 | T-01 | 낮음 | 0.5h |
| T-04 | ID 유효성 검증 유틸리티 | `validateId()` 함수 구현 - 빈 문자열, 중복, 금지 ID, 공백, 문자 패턴 순서 검증 | T-02, T-03 | 중간 | 3h |
| T-05 | 변수 이름 유효성 검증 유틸리티 | `validateVariableName()` 함수 - 정규식 `^[a-z0-9_]+$` + 유일성 검증 | T-02 | 낮음 | 1.5h |
| T-06 | Recall 패턴 파싱 엔진 | 4가지 파싱 함수 구현 (첫 번째 ID, 모든 ID, fallback, 전체 정보) | T-02 | 중간 | 3h |
| T-07 | Recall 포매팅 유틸리티 | 날짜 서수 포매팅, 배열 포매팅, nbsp 치환, 텍스트 축약(25자) | T-02 | 중간 | 3h |
| T-08 | Recall 값 해석 및 치환 엔진 | `resolveRecalls()` - 변수->응답->Fallback 우선순위, 특수 포매팅 적용 | T-06, T-07 | 높음 | 4h |
| T-09 | 중첩 Recall 처리 | 라벨 내 중첩 recall을 `"___"`로 대체하는 안전 로직 | T-08 | 중간 | 2h |
| T-10 | Recall 에디터 표시 변환 | `#recall:id/fallback:val#` -> `@라벨명` / `/라벨명\` 변환 | T-06 | 중간 | 3h |
| T-11 | Recall 에디터-저장 형식 역변환 | `@라벨명` -> `#recall:id/fallback:val#` 변환 | T-10 | 중간 | 3h |
| T-12 | 빈 Fallback 값 검증 | headline/subheader에서 빈 fallback 탐지 함수 | T-06 | 낮음 | 1.5h |
| T-13 | 히든 필드 검증 유틸리티 | 히든 필드 전용 검증 (enabled + fieldIds 구조 검증) | T-04 | 낮음 | 1h |
| T-14 | Prisma Survey 모델 추가 | Survey 모델 스키마 정의 (variables, hiddenFields Json 필드 포함), 마이그레이션 | 없음 | 높음 | 4h |
| T-15 | Survey 모듈 기본 설정 | NestJS survey.module, controller, service 기본 골격 | T-14 | 중간 | 3h |
| T-16 | 서버 유효성 검증 서비스 | `SurveyValidationService` - 변수 ID 유일성, 이름 유효성, 히든 필드 ID 유효성, 빈 Fallback 경고 | T-04, T-05, T-12, T-13, T-15 | 높음 | 5h |
| T-17 | Survey 저장 API 검증 통합 | Survey 저장 엔드포인트에 검증 서비스 통합 (warnings 응답 포함) | T-16 | 중간 | 3h |
| T-18 | 변수 관리 패널 UI | 변수 목록 조회/추가/수정/삭제 UI. 타입 선택, 이름 인라인 편집, 기본값 편집 | T-02, T-05 | 높음 | 6h |
| T-19 | 히든 필드 관리 패널 UI | enabled 토글, fieldIds 관리 UI. ID 입력 + 유효성 검증 + 삭제 | T-04, T-13 | 높음 | 5h |
| T-20 | 히든 필드 삭제 참조 무결성 검사 | 로직/리콜/쿼터/Follow-up 4개 영역 참조 검사. 토스트 에러 메시지 | T-19 | 높음 | 5h |
| T-21 | 히든 필드 값 수집 엔진 (URL/SDK) | URL 쿼리 파라미터 파싱, SDK 값 주입, fieldIds 매칭 | T-02 | 중간 | 3h |
| T-22 | 변수값 업데이트 엔진 (Calculate) | `executeCalculate()` - 5종 숫자 연산 + 2종 텍스트 연산, 0 나누기 방지, 미존재 변수 무시 | T-02 | 높음 | 4h |
| T-23 | Recall 런타임 통합 | Survey 런타임에서 Recall 치환 엔진 통합, 텍스트 렌더링 전 recall 처리 | T-08, T-09 | 중간 | 3h |
| T-24 | Recall 에디터 UI 컴포넌트 | RecallTag 컴포넌트, 에디터 내 @라벨 표시, 클릭/삭제 인터랙션 | T-10, T-11 | 높음 | 5h |
| T-25 | i18n 번역 키 추가 | 변수/히든 필드/리콜 관련 UI 텍스트 ko/en 번역 | T-18, T-19 | 낮음 | 2h |
| T-26 | 공유 패키지 단위 테스트 | recall-parser, id-validation, variable-validation, recall-resolver 등 핵심 유틸 테스트 | T-04~T-12 | 중간 | 5h |
| T-27 | 서버 통합 테스트 | Survey 저장 시 유효성 검증 통합 테스트 | T-17 | 중간 | 4h |
| T-28 | 클라이언트 컴포넌트 테스트 | VariablePanel, HiddenFieldPanel, RecallTag 컴포넌트 테스트 | T-18, T-19, T-24 | 중간 | 4h |

### 3.2 구현 순서 및 마일스톤

#### 마일스톤 1: 공유 유틸리티 기반 구축 (T-01 ~ T-13)
**목표**: 서버/클라이언트 공용 타입, 상수, 유효성 검증 유틸리티, Recall 파싱/치환 엔진 완성
**검증 가능 산출물**: 단위 테스트로 모든 유효성 검증 규칙과 Recall 파싱/치환 정확성 확인

```
T-01 (공유 패키지 설정)
  └── T-02 (타입 정의) + T-03 (상수 정의)
       └── T-04 (ID 검증) + T-05 (변수 이름 검증)
       └── T-06 (Recall 파싱) + T-07 (Recall 포매팅)
            └── T-08 (Recall 치환)
                 └── T-09 (중첩 Recall)
            └── T-10 (에디터 표시)
                 └── T-11 (역변환)
            └── T-12 (빈 Fallback)
       └── T-13 (히든 필드 검증)
```

**순서**:
1. T-01 -> T-02, T-03 (병렬)
2. T-04, T-05, T-06, T-07 (병렬)
3. T-08 -> T-09
4. T-10 -> T-11
5. T-12, T-13 (병렬)

#### 마일스톤 2: 서버 사이드 구현 (T-14 ~ T-17)
**목표**: Survey Prisma 모델 추가, 서버 유효성 검증 서비스 구현, Survey 저장 API에 검증 통합
**검증 가능 산출물**: Survey 저장 API 호출 시 변수/히든 필드 유효성 검증 동작 확인

```
T-14 (Prisma Survey 모델) -> T-15 (Survey 모듈) -> T-16 (검증 서비스) -> T-17 (API 통합)
```

> **참고**: T-14, T-15는 FSD-008(설문 생성) 구현과 공유된다. FSD-008이 먼저 구현되었다면 이 작업은 기존 Survey 모델에 검증 로직을 추가하는 것으로 축소된다.

#### 마일스톤 3: 클라이언트 에디터 UI (T-18 ~ T-20, T-24, T-25)
**목표**: 변수 관리 패널, 히든 필드 관리 패널, Recall 에디터 UI 구현
**검증 가능 산출물**: 에디터에서 변수/히든 필드 CRUD 및 Recall 태그 삽입/표시 동작 확인

```
T-18 (변수 패널) ─┐
T-19 (히든 필드 패널) ─── T-20 (삭제 참조 검사) ─── T-25 (i18n)
T-24 (Recall 에디터 UI) ─┘
```

#### 마일스톤 4: 클라이언트 런타임 엔진 (T-21 ~ T-23)
**목표**: 히든 필드 값 수집, 변수값 업데이트(Calculate), Recall 런타임 치환 통합
**검증 가능 산출물**: 설문 실행 시 URL 파라미터로 히든 필드 값 수집, 변수값 계산, Recall 텍스트 치환 동작 확인

```
T-21 (히든 필드 값 수집) ─┐
T-22 (변수값 업데이트) ────── T-23 (Recall 런타임 통합)
```

#### 마일스톤 5: 테스트 (T-26 ~ T-28)
**목표**: 유틸리티 단위 테스트, 서버 통합 테스트, 클라이언트 컴포넌트 테스트 완성
**검증 가능 산출물**: 전체 테스트 스위트 통과

### 3.3 파일 수정 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|----------|-----------|
| `packages/shared/package.json` | 생성 | 공유 패키지 설정 (의존성: @paralleldrive/cuid2) |
| `packages/shared/tsconfig.json` | 생성 | TypeScript 설정 (Project References) |
| `packages/shared/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `packages/shared/project.json` | 생성 | Nx 프로젝트 설정 |
| `packages/shared/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 |
| `packages/shared/src/types/survey.types.ts` | 생성 | Variable, HiddenFields, RecallItem 등 타입 정의 |
| `packages/shared/src/types/recall.types.ts` | 생성 | RecallInfo, RecallContext 등 Recall 전용 타입 |
| `packages/shared/src/constants/forbidden-ids.ts` | 생성 | FORBIDDEN_IDS 상수 (11개) |
| `packages/shared/src/utils/id-validation.ts` | 생성 | validateId() 공통 ID 유효성 검증 |
| `packages/shared/src/utils/variable-validation.ts` | 생성 | validateVariableName(), validateVariableValue() |
| `packages/shared/src/utils/hidden-field-validation.ts` | 생성 | validateHiddenFieldId(), validateHiddenFields() |
| `packages/shared/src/utils/recall-parser.ts` | 생성 | Recall 패턴 파싱 엔진 (4가지 파싱 함수) |
| `packages/shared/src/utils/recall-resolver.ts` | 생성 | Recall 값 해석 및 치환 |
| `packages/shared/src/utils/recall-formatter.ts` | 생성 | 날짜/배열 포매팅, 텍스트 축약, nbsp 치환 |
| `packages/shared/src/utils/recall-editor.ts` | 생성 | 에디터 <-> 저장 형식 양방향 변환 |
| `packages/shared/src/utils/html-sanitizer.ts` | 생성 | HTML 태그 제거 유틸리티 |
| `packages/db/prisma/schema.prisma` | 수정 | Survey, Environment, Response 모델 추가 (FSD-008과 공유) |
| `apps/server/src/survey/survey.module.ts` | 생성 | Survey NestJS 모듈 |
| `apps/server/src/survey/survey.controller.ts` | 생성 | Survey CRUD 컨트롤러 |
| `apps/server/src/survey/survey.service.ts` | 생성 | Survey CRUD 서비스 |
| `apps/server/src/survey/survey-validation.service.ts` | 생성 | 변수/히든 필드/Recall 유효성 검증 서비스 |
| `apps/server/src/survey/dto/update-survey.dto.ts` | 생성 | Survey 업데이트 DTO (variables, hiddenFields 포함) |
| `apps/server/src/app/app.module.ts` | 수정 | SurveyModule import 추가 |
| `apps/client/src/features/survey-editor/components/VariablePanel/VariablePanel.tsx` | 생성 | 변수 관리 패널 UI 컴포넌트 |
| `apps/client/src/features/survey-editor/components/VariablePanel/VariableItem.tsx` | 생성 | 개별 변수 항목 컴포넌트 |
| `apps/client/src/features/survey-editor/components/HiddenFieldPanel/HiddenFieldPanel.tsx` | 생성 | 히든 필드 관리 패널 UI 컴포넌트 |
| `apps/client/src/features/survey-editor/components/HiddenFieldPanel/HiddenFieldItem.tsx` | 생성 | 개별 히든 필드 항목 컴포넌트 |
| `apps/client/src/features/survey-editor/components/RecallTag/RecallTag.tsx` | 생성 | Recall UI 태그 컴포넌트 |
| `apps/client/src/features/survey-editor/hooks/useVariables.ts` | 생성 | 변수 CRUD 훅 |
| `apps/client/src/features/survey-editor/hooks/useHiddenFields.ts` | 생성 | 히든 필드 CRUD 훅 |
| `apps/client/src/features/survey-editor/hooks/useRecall.ts` | 생성 | Recall 에디터 통합 훅 |
| `apps/client/src/features/survey-editor/utils/hidden-field-safety.ts` | 생성 | 히든 필드 삭제 시 참조 무결성 검사 |
| `apps/client/src/features/survey-runtime/engine/recall-engine.ts` | 생성 | Recall 런타임 치환 엔진 |
| `apps/client/src/features/survey-runtime/engine/variable-engine.ts` | 생성 | 변수값 런타임 관리 (Calculate 실행) |
| `apps/client/src/features/survey-runtime/engine/hidden-field-engine.ts` | 생성 | 히든 필드 값 수집 (URL/SDK) |
| `apps/client/src/features/survey-runtime/context/survey-runtime.context.ts` | 생성 | 설문 런타임 상태 관리 Context |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | 변수/히든 필드/리콜 관련 한국어 번역 키 추가 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | 변수/히든 필드/리콜 관련 영어 번역 키 추가 |
| `tsconfig.base.json` (루트) | 수정 | `@inquiry/shared` 패키지 path alias 추가 |
| `pnpm-workspace.yaml` | 수정 | `packages/shared` 워크스페이스에 추가 (필요 시) |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향도 | 발생 확률 | 완화 전략 |
|--------|--------|-----------|-----------|
| FSD-008 Survey 모델 미구현 상태에서 작업 시작 | 높음 | 높음 | FSD-013은 구현 순서상 4단계(설문 도메인 코어)에 속하며 FSD-008 이후 구현. 공유 유틸리티(마일스톤 1)를 먼저 구현하여 Survey 모델 없이도 진행 가능한 부분을 선행 |
| FSD-012 조건부 로직 엔진과의 인터페이스 불일치 | 높음 | 중간 | Calculate 액션의 데이터 구조를 FSD-012 명세서의 데이터 요구사항 기준으로 설계. 인터페이스(타입)를 먼저 정의하고 구현부를 뒤에 채우는 Contract-First 방식 적용 |
| 공유 패키지의 서버/클라이언트 호환성 | 중간 | 중간 | `packages/shared`는 순수 TypeScript 유틸리티만 포함 (Node.js/브라우저 API 미사용). `tsconfig`에서 `"module": "esnext"` 설정으로 양쪽 환경 호환 보장 |
| Recall 정규식의 edge case 미처리 | 중간 | 중간 | 포괄적 단위 테스트(T-26)에서 edge case 커버. fallback 값에 특수문자(`#`, `/` 등)가 포함된 경우, 빈 텍스트, 매우 긴 텍스트 등 테스트 |
| Rich Text Editor 통합 복잡성 | 중간 | 높음 | Recall 에디터 UI(T-24)는 FSD-010 에디터 구현에 의존. 변환 로직(T-10, T-11)은 순수 함수로 분리하여 에디터와 독립적으로 테스트 가능하게 설계 |
| 히든 필드 삭제 참조 검사의 성능 | 낮음 | 낮음 | 설문 데이터가 JSON으로 로드된 상태에서 인메모리 검색 수행. 일반적인 설문 크기에서 성능 문제 없을 것으로 예상. 필요 시 참조 인덱스 캐시 도입 |
| CUID2 라이브러리 번들 사이즈 | 낮음 | 낮음 | `@paralleldrive/cuid2`는 경량 (~2KB gzipped). 클라이언트 번들에 포함해도 영향 미미. 서버에서만 ID 생성이 필요한 경우 서버 전용으로 제한 가능 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

**대상**: `packages/shared/src/utils/` 내 모든 유틸리티 함수

| 테스트 파일 | 테스트 대상 | 핵심 테스트 케이스 |
|------------|------------|-------------------|
| `id-validation.spec.ts` | `validateId()` | 빈 문자열, 중복 ID (대소문자 무시), 금지 ID 11개, 공백 포함, 허용 외 문자, 유효한 ID, 검증 순서(첫 번째 실패에서 중단) |
| `variable-validation.spec.ts` | `validateVariableName()` | 유효한 이름(소문자+숫자+밑줄), 대문자 포함, 하이픈 포함, 공백 포함, 빈 문자열, 특수문자, 중복 이름 |
| `recall-parser.spec.ts` | Recall 파싱 함수 4종 | 단일 recall, 다중 recall, recall 없는 텍스트, ID 내 특수문자, fallback에 특수문자, while 루프 안전성 (null 반환 시 중단) |
| `recall-resolver.spec.ts` | `resolveRecalls()` | 변수 1순위 해석, 응답 데이터 2순위 해석, Fallback 3순위, 모두 없을 때 빈 문자열, 날짜 포매팅, 배열 포매팅, nbsp 치환 |
| `recall-formatter.spec.ts` | 포매팅 함수들 | 날짜 서수 (1st, 2nd, 3rd, 4th ~ 31st), 배열 빈 값 제거, 25자 미만 축약 안 함, 25자 이상 축약 형식 |
| `recall-editor.spec.ts` | 에디터 양방향 변환 | 저장->에디터 변환, 에디터->저장 역변환, 대상 없는 recall ID, HTML 태그 제거, 중첩 recall `"___"` 대체 |
| `hidden-field-validation.spec.ts` | 히든 필드 검증 | 유효한 HiddenFields 구조, enabled false일 때, 빈 fieldIds, 금지 ID 포함 |

**테스트 프레임워크**: Jest (기존 프로젝트 설정 따름) 또는 Vitest

### 5.2 통합 테스트

| 테스트 파일 | 테스트 대상 | 핵심 테스트 케이스 |
|------------|------------|-------------------|
| `survey-validation.integration.spec.ts` | SurveyValidationService | 유효한 Survey 저장 성공, 중복 변수 ID 거부, 유효하지 않은 변수 이름 거부, 금지 히든 필드 ID 거부, 빈 Fallback 경고 반환 |
| `survey-save.integration.spec.ts` | Survey 저장 API | PUT /api/surveys/:id - variables/hiddenFields 포함 저장, 유효성 검증 에러 응답, warnings 포함 응답 |
| `variable-engine.integration.spec.ts` | 변수값 업데이트 엔진 | Calculate 5종 숫자 연산 (add/subtract/multiply/divide/assign), 2종 텍스트 연산 (assign/concat), 0 나누기, 미존재 변수 무시 |
| `hidden-field-engine.integration.spec.ts` | 히든 필드 값 수집 | URL 파라미터 파싱 -> fieldIds 매칭 -> 값 설정, 미정의 파라미터 무시, 누락 파라미터 빈 값 |

### 5.3 E2E 테스트 (해당 시)

| 시나리오 | 검증 항목 |
|---------|-----------|
| 에디터에서 변수 CRUD | 변수 추가(타입 선택, 이름 입력) -> 목록 표시 -> 기본값 편집 -> 삭제 |
| 에디터에서 히든 필드 CRUD | 토글 활성화 -> ID 추가(유효성 검증) -> 금지 ID 거부 확인 -> 삭제(참조 무결성 검사) |
| Recall 런타임 치환 | 설문 생성(변수 + recall 패턴 포함) -> 발행 -> 응답 시 recall 텍스트 치환 확인 |
| 히든 필드 URL 주입 | Link Survey URL에 쿼리 파라미터 포함 -> 설문 로드 시 히든 필드 값 설정 확인 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 제약사항 | 설명 |
|---------|------|
| Survey 모델 선행 의존 | FSD-008의 Survey 모델이 구현되어야 서버 사이드(마일스톤 2) 작업 진행 가능. 공유 유틸리티(마일스톤 1)는 독립 진행 가능 |
| 조건부 로직 엔진 의존 | Calculate 액션을 통한 변수값 업데이트(T-22)는 FSD-012 구현에 의존. 인터페이스 기반 Mock으로 선행 개발 가능 |
| Recall 실시간 미리보기 미지원 | 명세서 제외 범위. 에디터에서는 `@라벨명` 형태로만 표시 |
| 히든 필드 서버 사이드 동적 생성 미지원 | 명세서 제외 범위. URL 파라미터/SDK를 통한 외부 주입만 지원 |
| 변수 외부 API 동기화 미지원 | 명세서 제외 범위. 변수값은 설문 내부 로직으로만 관리 |
| 날짜 포매팅 영문 전용 | 초기 구현에서는 영문 서수 형식("1st January 2024")만 지원. 다국어 날짜 포맷은 미포함 |
| 설문 에디터 Rich Text 의존 | Recall 에디터 UI(T-24)는 FSD-010의 Rich Text Editor 구현에 의존. 독립 구현 불가 |

### 6.2 향후 개선 가능성

| 개선 항목 | 설명 |
|----------|------|
| 다국어 날짜 포매팅 | locale 기반 날짜 포매팅 지원 (Intl.DateTimeFormat 활용) |
| Recall 실시간 미리보기 | 에디터에서 recall 패턴의 예상 치환값을 실시간으로 미리보기 |
| 변수 타입 확장 | boolean, date, array 등 추가 변수 타입 지원 |
| 히든 필드 서버 사이드 생성 | 웹훅/API 연동으로 설문 로드 시 서버에서 히든 필드 값을 동적 생성 |
| 변수 외부 API 동기화 | 외부 CRM, 데이터 소스와 변수값 동기화 |
| 참조 무결성 자동 정리 | 히든 필드 삭제 시 참조를 차단하는 대신 사용자 확인 후 관련 참조를 자동 정리하는 옵션 |
| Recall 패턴 자동완성 | 에디터에서 `@` 입력 시 사용 가능한 recall 대상 목록을 자동완성으로 제안 |

---

## 7. i18n 고려사항 (클라이언트 UI 변경)

### 7.1 추가/수정이 필요한 번역 키

**네임스페이스**: `survey_editor`

```json
{
  "survey_editor": {
    "variables": {
      "title": "변수",
      "add": "변수 추가",
      "type_number": "숫자",
      "type_text": "텍스트",
      "name_label": "변수 이름",
      "name_placeholder": "소문자, 숫자, 밑줄만 사용",
      "value_label": "기본값",
      "delete": "변수 삭제",
      "delete_confirm": "이 변수를 삭제하시겠습니까?",
      "validation": {
        "name_pattern": "변수 이름은 소문자, 숫자, 밑줄만 허용됩니다.",
        "name_empty": "변수 이름을 입력해주세요.",
        "name_duplicate": "이미 사용 중인 변수 이름입니다.",
        "id_duplicate": "변수 ID가 중복되었습니다.",
        "type_mismatch": "변수 타입과 일치하지 않는 값입니다."
      }
    },
    "hidden_fields": {
      "title": "히든 필드",
      "enable": "히든 필드 활성화",
      "add": "필드 추가",
      "id_placeholder": "필드 ID 입력",
      "delete": "필드 삭제",
      "validation": {
        "id_empty": "{{type}} ID를 입력해주세요.",
        "id_duplicate": "{{type}} ID가 이미 questions, hidden fields 또는 variables에 존재합니다.",
        "id_forbidden": "{{type}} ID는 허용되지 않습니다.",
        "id_spaces": "{{type}} ID에 공백을 포함할 수 없습니다.",
        "id_pattern": "영문, 숫자, 하이픈, 밑줄만 허용됩니다.",
        "in_use_logic": "이 히든 필드는 조건부 로직에서 사용 중이므로 삭제할 수 없습니다.",
        "in_use_recall": "이 히든 필드는 리콜에서 사용 중이므로 삭제할 수 없습니다.",
        "in_use_quota": "이 히든 필드는 쿼터 조건에서 사용 중이므로 삭제할 수 없습니다.",
        "in_use_followup": "이 히든 필드는 Follow-up에서 사용 중이므로 삭제할 수 없습니다."
      }
    },
    "recall": {
      "fallback_empty_warning": "리콜의 대체 텍스트가 비어 있습니다. 값이 없을 때 빈 텍스트가 표시됩니다.",
      "nested_placeholder": "___",
      "insert": "리콜 삽입"
    }
  }
}
```

> 위 키는 `apps/client/src/app/i18n/locales/ko/translation.json`과 `en/translation.json` 양쪽에 추가한다. 기존 `auth`, `dashboard` 네임스페이스와 동일 레벨에 `survey_editor` 네임스페이스를 추가하는 구조이다.
