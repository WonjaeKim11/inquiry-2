# 기능 구현 계획: 조건부 로직 엔진 (Conditional Logic Engine)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 설명 | 우선순위 |
|---------|--------|------|---------|
| FN-012-01 | 조건 비교 연산자 평가 | 31개의 조건 비교 연산자(문자열 12, 숫자 4, 다중선택 5, 상태확인 8, 날짜 2)를 사용하여 좌/우 피연산자 간 비교를 수행하고 boolean 반환 | 상 |
| FN-012-02 | 변수 계산 연산자 수행 | 7개의 변수 계산 연산자(텍스트 2 + 숫자 5)로 변수 값을 계산/업데이트 | 상 |
| FN-012-03 | 피연산자 타입 처리 | element, variable, hiddenField 3가지 좌측 피연산자 타입 + static/dynamic 우측 피연산자 값 추출 및 변환 | 상 |
| FN-012-04 | 조건 그룹 평가 (중첩 AND/OR) | 재귀적 조건 그룹을 AND/OR connector에 따라 평가하여 boolean 결과 반환 | 상 |
| FN-012-05 | 단일 조건 검증 | 연산자-피연산자 조합의 구조적 유효성 검증 (우측 피연산자 필수/불필요 확인) | 상 |
| FN-012-06 | Block 레벨 로직 정의 | Block별 로직 아이템 정의, logicFallback 설정, 유효성 검증 | 상 |
| FN-012-07 | 액션 타입 수행 | 3가지 액션 타입 (calculate, requireAnswer, jumpToBlock) 정의 및 수행 | 상 |
| FN-012-08 | 로직 평가 엔진 | 설문/응답/변수/조건그룹/언어를 입력으로 받아 재귀적 조건 평가를 수행하는 핵심 런타임 엔진 | 상 |
| FN-012-09 | 액션 수행 처리 | 조건 true 시 액션 배열을 순회하며 jumpTarget, requiredElementIds, calculations 반환 | 상 |
| FN-012-10 | 로직 유틸리티 기능 | 에디터에서 로직 아이템/조건/그룹/액션 편집을 위한 유틸리티 함수 (복제, 추가, 삭제, 토글, 업데이트) | 중 |
| FN-012-11 | 순환 로직 검증 | 설문 내 Block 간 jumpToBlock/logicFallback 참조의 순환 구조 검출 (DFS) | 중 |

### 1.2 비기능 요구사항

| NFR ID | 항목 | 요구사항 |
|--------|------|---------|
| NFR-012-01 | 에러 시 false 반환 | 조건 평가 중 예외 발생 시 false를 반환하여 설문 진행을 차단하지 않음 |
| NFR-012-02 | 순환 로직 검출 | 설문 저장 시 자동으로 순환 로직 검증 수행, 순환 발견 시 저장 차단 |
| NFR-012-03 | Element ID 유일성 | Block 내 Element ID 중복 불가 (유효성 검증) |
| NFR-012-04 | 히든 필드 존재 검증 | 로직에서 참조하는 히든 필드가 설문 내에 존재하는지 저장 시 검증 |
| NFR-012-05 | 0으로 나누기 방지 | calculate 액션에서 divide + static 0 조합 시 유효성 검증 실패 처리 |
| NFR-012-PERF-01 | 성능 | 조건 그룹 평가가 재귀 깊이에 비례하는 선형 시간 복잡도 |

### 1.3 명세서 내 모호한 점 및 해석

| 항목 | 모호한 점 | 해석/결정 |
|------|----------|----------|
| 클라이언트/서버 분리 | 로직 평가 엔진이 "클라이언트 사이드 로직 평가"라고 명시되어 있으나, 서버 사이드 검증도 필요한지 불명확 | 로직 평가 엔진(런타임)은 **클라이언트 전용**으로 구현한다. 서버에서는 설문 저장 시 유효성 검증(순환 로직, 구조 검증)만 수행한다. 향후 서버 사이드 응답 처리 시 공유 패키지로 이동 가능하도록 순수 함수로 설계한다 |
| Survey 데이터 모델 의존 | Survey, Block, Element, Variable, HiddenField 등의 타입이 FS-008, FS-009, FS-013에 정의되어 있으나 아직 코드베이스에 없음 | 본 구현 계획에서 조건부 로직 엔진에 필요한 타입을 **공유 타입 패키지**(`packages/shared-types`)에 정의한다. FS-008, FS-013 구현 시 이 타입을 확장/통합한다 |
| v1 API 호환 (question 타입) | deprecated된 "question" 타입 피연산자를 어느 수준까지 지원할지 불명확 | 좌측 피연산자의 type이 "question"이면 "element"와 동일하게 처리하는 단순 매핑만 구현한다. 별도 마이그레이션 도구는 이 범위 밖이다 |
| 로직 유틸리티의 상태 관리 | 에디터 내 로직 편집 시 상태 관리 방식(전역 스토어 vs 로컬 상태)이 명세에 없음 | 설문 에디터의 전체 상태 관리 전략은 FS-010(설문 에디터 UX)에서 결정될 예정이다. 본 구현에서는 로직 유틸리티 함수를 **순수 함수**로 작성하여 상태 관리 방식에 무관하게 사용 가능하도록 한다 |
| Matrix 요소 처리 | BR-03-03에서 "Column 라벨을 Column 인덱스로 변환"한다고만 명시. Column 인덱스가 0-based인지, 라벨 매칭이 exact match인지 불명확 | Column 인덱스는 0-based로 해석한다. 라벨 매칭은 선택 언어에 맞는 exact match를 수행한다 |
| isAnyOf vs equalsOneOf | 기능이 매우 유사 (좌측 값이 우측 목록 중 하나에 해당). isAnyOf가 별도 분류("기타 연산자")에 있어 차이가 불명확 | equalsOneOf는 다중 선택 비교 연산자 카테고리에, isAnyOf는 기타 연산자에 속하지만 동작은 동일하게 구현한다. 미래 분기 가능성을 위해 별도 case로 유지한다 |
| logicFallback 자기 참조 | logicFallback이 현재 Block 자신을 참조하는 경우가 순환으로 취급되는지 불명확 | 자기 참조는 순환으로 취급하지 **않는다**. 이는 해당 Block을 다시 표시하는 의미로 해석한다. 단, jumpToBlock과 logicFallback을 결합한 전체 그래프에서의 순환만 검출한다 |

### 1.4 암묵적 요구사항

| 항목 | 설명 |
|------|------|
| 공유 타입 패키지 필요 | Survey, Block, Element, Variable, HiddenField, LogicItem, ConditionGroup, Action 등의 TypeScript 타입을 클라이언트와 서버 모두에서 참조할 수 있는 공유 패키지가 필요하다 |
| CUID / CUID2 생성 라이브러리 | 로직 아이템, 조건 ID 생성을 위한 `@paralleldrive/cuid2` 또는 유사 라이브러리 도입 필요 |
| 깊은 복사(deep copy) 유틸리티 | 로직 아이템 복제, 조건 복제 등에서 재귀적 구조의 깊은 복사가 필요하다. `structuredClone()` 사용 |
| 에디터 UI 컴포넌트 | 로직 설정 패널, 조건 그룹 시각화, 액션 타입 선택 등의 UI 컴포넌트가 필요하다 (FS-010과 연계) |
| 서버 측 유효성 검증 API | 설문 저장 시 순환 로직 검증, Element ID 유일성, 히든 필드 존재 검증 등을 수행하는 서버 API가 필요하다 |
| i18n 번역 키 | 에디터 UI의 연산자 라벨, 액션 타입 라벨, 검증 에러 메시지 등에 대한 번역 키 추가 필요 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

조건부 로직 엔진은 크게 **3개의 레이어**로 구성된다.

```
packages/
├── shared-types/                         # [신규] 공유 타입 패키지
│   └── src/
│       ├── survey/
│       │   ├── block.types.ts            # Block, Element 타입
│       │   ├── survey.types.ts           # Survey 최상위 타입
│       │   ├── variable.types.ts         # Variable 타입
│       │   └── hidden-field.types.ts     # HiddenField 타입
│       └── logic/
│           ├── condition.types.ts        # ConditionGroup, SingleCondition, DynamicField, RightOperand
│           ├── operator.types.ts         # ConditionOperator(31개), CalculateOperator(7개) enum
│           ├── action.types.ts           # Action(calculate/requireAnswer/jumpToBlock) 타입
│           └── logic-item.types.ts       # LogicItem 타입

libs/client/
├── logic-engine/                         # [신규] 클라이언트 로직 엔진 라이브러리
│   └── src/
│       ├── index.ts
│       └── lib/
│           ├── evaluator/
│           │   ├── condition-evaluator.ts     # 조건 비교 연산자 평가 (FN-012-01)
│           │   ├── operand-resolver.ts        # 피연산자 값 추출 (FN-012-03)
│           │   ├── group-evaluator.ts         # 조건 그룹 재귀 평가 (FN-012-04)
│           │   └── logic-evaluator.ts         # 로직 평가 엔진 메인 (FN-012-08)
│           ├── performer/
│           │   ├── calculate-performer.ts     # 변수 계산 수행 (FN-012-02)
│           │   ├── action-performer.ts        # 액션 수행 처리 (FN-012-07, FN-012-09)
│           │   └── types.ts                   # 수행 결과 타입 (ActionResult)
│           ├── validator/
│           │   ├── condition-validator.ts      # 단일 조건 검증 (FN-012-05)
│           │   ├── block-logic-validator.ts    # Block 레벨 로직 유효성 검증 (FN-012-06)
│           │   └── cycle-detector.ts          # 순환 로직 검증 (FN-012-11)
│           ├── utils/
│           │   ├── logic-item-utils.ts        # 로직 아이템 CRUD 유틸리티 (FN-012-10)
│           │   ├── condition-utils.ts         # 조건 CRUD 유틸리티 (FN-012-10)
│           │   ├── group-utils.ts             # 그룹 생성/connector 토글 유틸리티 (FN-012-10)
│           │   └── action-utils.ts            # 액션 편집 유틸리티 (FN-012-10)
│           └── constants.ts                   # 우측 피연산자 불필요 연산자 목록 등 상수

apps/client/src/
├── app/[lng]/
│   └── surveys/[surveyId]/edit/
│       └── logic/                        # [신규] 설문 에디터 로직 탭 (FS-010과 연계)
│           ├── page.tsx                  # 로직 설정 페이지
│           └── components/
│               ├── LogicPanel.tsx         # 로직 설정 패널 컨테이너
│               ├── LogicItemCard.tsx      # 로직 아이템 카드
│               ├── ConditionGroupView.tsx # 조건 그룹 재귀 시각화
│               ├── SingleConditionRow.tsx # 단일 조건 행
│               ├── ActionRow.tsx          # 액션 행
│               ├── OperatorSelect.tsx     # 연산자 선택 드롭다운
│               ├── OperandSelect.tsx      # 피연산자 선택 UI
│               ├── BlockSelect.tsx        # Block 선택 드롭다운
│               ├── VariableSelect.tsx     # 변수 선택 드롭다운
│               └── FallbackSetting.tsx    # logicFallback 설정 UI

apps/server/src/
├── app/
│   └── survey/                           # [신규] 설문 모듈 (일부, 검증 엔드포인트만)
│       ├── survey.module.ts
│       ├── survey.controller.ts          # 설문 저장 시 검증 API
│       └── survey-validation.service.ts  # 서버 측 유효성 검증 서비스
```

**데이터 흐름:**

```
[설문 에디터 (Editor)]
  │
  ├── 로직 유틸리티 (utils/) ── 순수 함수로 상태 조작
  │     └── 상태 관리 (FS-010 결정) <- utils 호출
  │
  ├── 유효성 검증 (validator/) ── 저장 전 클라이언트 사이드 검증
  │     ├── 순환 로직 검출
  │     ├── 단일 조건 구조 검증
  │     └── Block 로직 구조 검증
  │
  └── 서버 저장 API ── 서버 사이드 이중 검증
        └── survey-validation.service.ts

[설문 응답 (Runtime)]
  │
  ├── 로직 평가 엔진 (evaluator/)
  │     ├── operand-resolver ── 피연산자 값 추출
  │     ├── condition-evaluator ── 연산자별 비교
  │     └── group-evaluator ── 재귀적 AND/OR 평가
  │
  └── 액션 수행 (performer/)
        ├── calculate-performer ── 변수 계산
        └── action-performer ── jumpTarget, requiredElementIds, calculations 반환
```

### 2.2 데이터 모델

조건부 로직 엔진은 설문 데이터의 JSON 필드 내에 저장되는 구조이다. 별도의 DB 테이블이 필요하지 않으며 Survey 모델의 `blocks` JSON 필드에 포함된다.

**핵심 TypeScript 타입 정의:**

```typescript
// packages/shared-types/src/logic/operator.types.ts

/** 31개 조건 비교 연산자 */
export type ConditionOperator =
  // 문자열/일반 비교 (12개)
  | 'equals' | 'doesNotEqual'
  | 'contains' | 'doesNotContain'
  | 'startsWith' | 'doesNotStartWith'
  | 'endsWith' | 'doesNotEndWith'
  | 'isEmpty' | 'isNotEmpty'
  | 'isSet' | 'isNotSet'
  // 숫자 비교 (4개)
  | 'isGreaterThan' | 'isLessThan'
  | 'isGreaterThanOrEqual' | 'isLessThanOrEqual'
  // 다중 선택 비교 (5개)
  | 'equalsOneOf' | 'includesAllOf' | 'includesOneOf'
  | 'doesNotIncludeOneOf' | 'doesNotIncludeAllOf'
  // 상태 확인 (8개)
  | 'isSubmitted' | 'isSkipped'
  | 'isClicked' | 'isNotClicked'
  | 'isAccepted' | 'isBooked'
  | 'isPartiallySubmitted' | 'isCompletelySubmitted'
  // 날짜 비교 (2개)
  | 'isBefore' | 'isAfter'
  // 기타 (1개)
  | 'isAnyOf';

/** 7개 변수 계산 연산자 */
export type CalculateOperator =
  | 'assign' | 'concat'                           // 텍스트
  | 'add' | 'subtract' | 'multiply' | 'divide';   // 숫자 (assign 공용)

/** 우측 피연산자 불필요 연산자 12개 */
export const OPERATORS_WITHOUT_RIGHT_OPERAND: ConditionOperator[] = [
  'isSubmitted', 'isSkipped', 'isClicked', 'isNotClicked',
  'isAccepted', 'isBooked', 'isPartiallySubmitted', 'isCompletelySubmitted',
  'isSet', 'isNotSet', 'isEmpty', 'isNotEmpty',
];
```

```typescript
// packages/shared-types/src/logic/condition.types.ts

export interface DynamicField {
  type: 'element' | 'variable' | 'hiddenField' | 'question'; // question은 deprecated
  id: string;
  meta?: { row?: string } | null;
}

export interface RightOperandStatic {
  type: 'static';
  value: string | number | string[];
}

export interface RightOperandDynamic {
  type: 'dynamic';
  fieldType: 'element' | 'variable' | 'hiddenField';
  fieldId: string;
}

export type RightOperand = RightOperandStatic | RightOperandDynamic;

export interface SingleCondition {
  id: string;
  leftOperand: DynamicField;
  operator: ConditionOperator;
  rightOperand: RightOperand | null;
}

export interface ConditionGroup {
  connector: 'and' | 'or';
  conditions: (SingleCondition | ConditionGroup)[];
}

/** 타입 가드: SingleCondition인지 ConditionGroup인지 판별 */
export function isSingleCondition(
  item: SingleCondition | ConditionGroup
): item is SingleCondition {
  return 'operator' in item && 'leftOperand' in item;
}
```

```typescript
// packages/shared-types/src/logic/action.types.ts

export interface CalculateAction {
  objective: 'calculate';
  variableId: string;       // CUID2
  operator: CalculateOperator;
  value: {
    type: 'static' | 'dynamic';
    value?: string | number;            // static인 경우
    fieldType?: 'element' | 'variable' | 'hiddenField'; // dynamic인 경우
    fieldId?: string;                   // dynamic인 경우
  };
}

export interface RequireAnswerAction {
  objective: 'requireAnswer';
  elementId: string;
}

export interface JumpToBlockAction {
  objective: 'jumpToBlock';
  blockId: string;           // CUID
}

export type Action = CalculateAction | RequireAnswerAction | JumpToBlockAction;
```

```typescript
// packages/shared-types/src/logic/logic-item.types.ts

export interface LogicItem {
  id: string;
  conditions: ConditionGroup;
  actions: Action[];
}
```

**Block 로직 관련 필드 (Survey 데이터 모델 내):**

```typescript
// packages/shared-types/src/survey/block.types.ts

export interface Block {
  id: string;                    // CUID
  name: string;                  // 최소 1자
  elements: Element[];           // 최소 1개
  logicItems?: LogicItem[];      // 로직 아이템 배열
  logicFallback?: string | null; // 모든 조건 불일치 시 이동할 Block ID
}
```

### 2.3 API 설계 (서버 측 검증)

서버 측에는 설문 저장 시 유효성 검증만 수행한다. 로직 평가 자체는 클라이언트에서 이루어진다.

**1) 설문 저장 (검증 포함) - 기존 설문 API에 검증 로직 통합**

```
PUT /api/surveys/:surveyId
Request Body: Survey 전체 JSON
Response: { success: boolean, errors?: ValidationError[] }
```

검증 항목:
- 순환 로직 검출 (NFR-012-02)
- Element ID 유일성 (NFR-012-03)
- 히든 필드 존재 검증 (NFR-012-04)
- 0으로 나누기 방지 (NFR-012-05)
- 단일 조건 구조 검증 (FN-012-05)

**2) 로직 검증 전용 엔드포인트 (에디터에서 실시간 검증용)**

```
POST /api/surveys/:surveyId/validate-logic
Request Body: { blocks: Block[], hiddenFields: HiddenField }
Response: {
  isValid: boolean,
  errors: {
    type: 'cyclic' | 'elementIdDuplicate' | 'hiddenFieldMissing' | 'divideByZero' | 'conditionInvalid',
    message: string,
    path?: string  // 예: "blocks[0].logicItems[1].conditions"
  }[]
}
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 조건 비교 연산자 평가 (`condition-evaluator.ts`)

```typescript
/**
 * 31개 연산자에 대한 비교 수행.
 * 에러 발생 시 false 반환 (NFR-012-01).
 */
export function evaluateCondition(
  operator: ConditionOperator,
  leftValue: unknown,
  rightValue: unknown
): boolean {
  try {
    switch (operator) {
      case 'equals': return evaluateEquals(leftValue, rightValue);
      case 'doesNotEqual': return !evaluateEquals(leftValue, rightValue);
      case 'contains': return evaluateContains(leftValue, rightValue);
      // ... 31개 연산자 각각 구현
      default: return false;
    }
  } catch {
    return false; // NFR-012-01
  }
}
```

#### 2.4.2 피연산자 값 추출 (`operand-resolver.ts`)

```typescript
/**
 * 좌측 피연산자에서 값을 추출한다.
 * element, variable, hiddenField, question(deprecated) 타입 처리.
 */
export function resolveLeftOperand(
  operand: DynamicField,
  survey: Survey,
  responseData: ResponseData,
  variables: Record<string, string | number>,
  selectedLanguage: string
): unknown {
  const type = operand.type === 'question' ? 'element' : operand.type; // v1 호환
  switch (type) {
    case 'element': return resolveElementValue(operand, survey, responseData, selectedLanguage);
    case 'variable': return resolveVariableValue(operand, variables);
    case 'hiddenField': return resolveHiddenFieldValue(operand, responseData);
    default: return undefined;
  }
}
```

#### 2.4.3 순환 로직 검증 (`cycle-detector.ts`)

```typescript
/**
 * DFS 기반 순환 검출.
 * jumpToBlock 액션과 logicFallback을 모두 방향 그래프의 간선으로 수집한 뒤
 * 방문 상태(white/gray/black)로 back edge를 검출한다.
 */
export function detectCyclicLogic(blocks: Block[]): {
  hasCycle: boolean;
  cyclePath: string[] | null;
} {
  // 1. 그래프 구성: blockId -> Set<targetBlockId>
  // 2. DFS로 순환 검출
  // 3. 순환 경로 추적
}
```

#### 2.4.4 로직 평가 엔진 (`logic-evaluator.ts`)

```typescript
/**
 * Block의 로직 아이템을 순서대로 평가하여
 * 첫 번째로 조건이 true인 아이템의 액션을 수행한다.
 */
export function evaluateBlockLogic(
  block: Block,
  survey: Survey,
  responseData: ResponseData,
  variables: Record<string, string | number>,
  selectedLanguage: string
): ActionResult {
  // 1. 로직 아이템이 없으면 기본 결과 반환
  // 2. 순서대로 조건 그룹 평가
  // 3. 첫 번째 true인 아이템의 액션 수행
  // 4. 모두 false이면 logicFallback 확인
}
```

### 2.5 기존 시스템 영향도 분석

| 영향 대상 | 변경 유형 | 영향 범위 | 상세 |
|----------|----------|----------|------|
| `packages/db/prisma/schema.prisma` | 변경 없음 | - | 로직 데이터는 Survey의 JSON 필드(blocks) 내에 저장되므로 스키마 변경 불필요 |
| `apps/server/src/app/app.module.ts` | 수정 | 낮음 | SurveyModule import 추가 (FS-008 구현 시 통합) |
| `libs/client/core/` | 변경 없음 | - | apiFetch 래퍼 그대로 사용 |
| `apps/client/src/app/i18n/` | 수정 | 낮음 | 로직 에디터 UI 관련 번역 키 추가 |
| `packages/shared-types/` | 신규 생성 | 높음 | 클라이언트/서버 공유 타입 패키지. FS-008, FS-009, FS-013과 병합 필요 |
| `libs/client/logic-engine/` | 신규 생성 | 높음 | 로직 엔진 핵심 라이브러리 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|----------|
| T-01 | 공유 타입 패키지 생성 | `packages/shared-types` Nx 라이브러리 생성 + tsconfig 설정 | 없음 | 낮음 | 2h |
| T-02 | 연산자 타입/상수 정의 | ConditionOperator(31개), CalculateOperator(7개) 타입 + OPERATORS_WITHOUT_RIGHT_OPERAND 상수 | T-01 | 낮음 | 1h |
| T-03 | 조건/피연산자 타입 정의 | ConditionGroup, SingleCondition, DynamicField, RightOperand 타입 + 타입 가드 | T-01 | 낮음 | 1h |
| T-04 | 액션/로직아이템 타입 정의 | Action(3종), LogicItem 타입 | T-02 | 낮음 | 1h |
| T-05 | 설문 관련 타입 정의 (최소) | Block, Element(최소), Variable, HiddenField 타입 (FS-008/013과 공유) | T-01 | 중간 | 2h |
| T-06 | 로직 엔진 라이브러리 생성 | `libs/client/logic-engine` Nx 라이브러리 생성 + tsconfig 설정 | T-01 | 낮음 | 1h |
| T-07 | 조건 비교 연산자 구현 | 31개 연산자별 비교 로직 (condition-evaluator.ts) | T-02, T-06 | 높음 | 6h |
| T-08 | 피연산자 값 추출 구현 | element/variable/hiddenField 타입별 값 추출 + 특수 처리 (operand-resolver.ts) | T-03, T-05, T-06 | 높음 | 5h |
| T-09 | 변수 계산 연산자 구현 | 7개 계산 연산자 수행 + divide by zero 처리 (calculate-performer.ts) | T-02, T-06 | 중간 | 3h |
| T-10 | 조건 그룹 재귀 평가 구현 | AND/OR connector 기반 재귀 평가 (group-evaluator.ts) | T-07, T-08 | 중간 | 3h |
| T-11 | 액션 수행 처리 구현 | 3가지 액션 타입 수행 + ActionResult 반환 (action-performer.ts) | T-09 | 중간 | 3h |
| T-12 | 로직 평가 엔진 통합 | Block 로직 평가 메인 함수 + logicFallback 처리 (logic-evaluator.ts) | T-10, T-11 | 중간 | 3h |
| T-13 | 단일 조건 검증 구현 | 연산자-피연산자 조합 유효성 검증 (condition-validator.ts) | T-02, T-03 | 낮음 | 2h |
| T-14 | Block 로직 유효성 검증 구현 | Element ID 유일성, 히든 필드 존재, divide by zero 검증 (block-logic-validator.ts) | T-13 | 중간 | 3h |
| T-15 | 순환 로직 검증 구현 | DFS 기반 순환 검출 (cycle-detector.ts) | T-04, T-05 | 중간 | 3h |
| T-16 | 로직 유틸리티 함수 구현 | 로직 아이템/조건/그룹/액션 CRUD 순수 함수 (utils/) | T-03, T-04 | 중간 | 4h |
| T-17 | 서버 측 검증 서비스 구현 | survey-validation.service.ts + controller 엔드포인트 | T-13, T-14, T-15 | 중간 | 4h |
| T-18 | i18n 번역 키 추가 | 연산자 라벨, 액션 타입 라벨, 검증 에러 메시지 (ko/en) | 없음 | 낮음 | 2h |
| T-19 | 에디터 UI - LogicPanel | 로직 설정 패널 컨테이너 컴포넌트 | T-16, T-18 | 중간 | 3h |
| T-20 | 에디터 UI - ConditionGroupView | 재귀적 조건 그룹 시각화 컴포넌트 | T-19 | 높음 | 5h |
| T-21 | 에디터 UI - ActionRow | 액션 타입별 입력 UI 컴포넌트 | T-19 | 중간 | 3h |
| T-22 | 에디터 UI - 연산자/피연산자 선택 | OperatorSelect, OperandSelect 드롭다운 컴포넌트 | T-19, T-18 | 중간 | 3h |
| T-23 | 에디터 UI - FallbackSetting | logicFallback Block 선택 UI | T-19 | 낮음 | 2h |
| T-24 | 단위 테스트 - 연산자 평가 | 31개 연산자별 테스트 케이스 | T-07 | 중간 | 4h |
| T-25 | 단위 테스트 - 엔진 통합 | 로직 평가 엔진 통합 테스트 | T-12 | 중간 | 3h |
| T-26 | 단위 테스트 - 유효성 검증 | 순환 로직, 조건 구조, Block 검증 테스트 | T-13, T-14, T-15 | 중간 | 3h |
| T-27 | 단위 테스트 - 유틸리티 | 로직 유틸리티 함수 테스트 | T-16 | 낮음 | 2h |

### 3.2 구현 순서 및 마일스톤

```
Milestone 1: 타입 기반 + 핵심 엔진 (T-01 ~ T-12)
├── Phase 1A: 타입/인프라 (T-01 ~ T-06) ...................... 약 8h
│   ├── T-01: 공유 타입 패키지 생성
│   ├── T-02: 연산자 타입/상수 정의
│   ├── T-03: 조건/피연산자 타입 정의
│   ├── T-04: 액션/로직아이템 타입 정의
│   ├── T-05: 설문 관련 타입 정의 (최소)
│   └── T-06: 로직 엔진 라이브러리 생성
│
├── Phase 1B: 평가 엔진 코어 (T-07 ~ T-12) .................. 약 23h
│   ├── T-07: 조건 비교 연산자 구현 (31개)
│   ├── T-08: 피연산자 값 추출 구현
│   ├── T-09: 변수 계산 연산자 구현 (7개)
│   ├── T-10: 조건 그룹 재귀 평가 구현
│   ├── T-11: 액션 수행 처리 구현
│   └── T-12: 로직 평가 엔진 통합
│
│   [검증 포인트] 단위 테스트로 엔진의 입출력 검증 가능
│   - evaluateBlockLogic() 함수에 테스트 데이터를 넣어 정확한 결과 반환 확인

Milestone 2: 유효성 검증 + 유틸리티 (T-13 ~ T-17)
├── T-13: 단일 조건 검증 구현
├── T-14: Block 로직 유효성 검증 구현
├── T-15: 순환 로직 검증 구현
├── T-16: 로직 유틸리티 함수 구현
└── T-17: 서버 측 검증 서비스 구현
│
│   [검증 포인트] 순환 검출, 구조 검증, CRUD 유틸리티 모두 단위 테스트 통과
│   - 에디터 UI 없이도 유틸리티 함수로 로직 조작 가능

Milestone 3: 에디터 UI + 테스트 (T-18 ~ T-27)
├── T-18: i18n 번역 키 추가
├── T-19: 에디터 UI - LogicPanel
├── T-20: 에디터 UI - ConditionGroupView
├── T-21: 에디터 UI - ActionRow
├── T-22: 에디터 UI - 연산자/피연산자 선택
├── T-23: 에디터 UI - FallbackSetting
├── T-24: 단위 테스트 - 연산자 평가
├── T-25: 단위 테스트 - 엔진 통합
├── T-26: 단위 테스트 - 유효성 검증
└── T-27: 단위 테스트 - 유틸리티
│
│   [검증 포인트] 에디터에서 로직 설정 → 저장 → 응답 시 로직 평가까지 E2E 흐름 확인
```

**FS-008, FS-013과의 병행 구현 전략:**

구현 순서 가이드에 따르면 FS-012(조건부 로직 엔진)는 4단계에서 FS-008(설문 생성), FS-009(질문 유형), FS-013(변수/히든 필드)과 함께 구현된다. 실제 작업 시에는 다음 순서를 권장한다:

1. FS-008 타입/DB 스키마 → FS-013 타입 → **FS-012 타입** (공유 타입 패키지를 함께 구축)
2. FS-008 서버 API → **FS-012 엔진 코어** (클라이언트 순수 함수는 서버 API 없이도 개발 가능)
3. FS-013 런타임 → **FS-012 피연산자 해석** (변수/히든 필드 값 추출은 FS-013 구현에 의존)
4. **FS-012 에디터 UI** (FS-010 설문 에디터 UX와 병행)

### 3.3 파일 수정 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|----------|----------|
| `packages/shared-types/` | 생성 | Nx 라이브러리 생성. Survey, Block, Element, Variable, HiddenField, LogicItem, ConditionGroup, Action 등 공유 타입 정의 |
| `packages/shared-types/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 |
| `packages/shared-types/src/logic/operator.types.ts` | 생성 | ConditionOperator(31개), CalculateOperator(7개) 타입 + 상수 |
| `packages/shared-types/src/logic/condition.types.ts` | 생성 | ConditionGroup, SingleCondition, DynamicField, RightOperand 타입 + 타입 가드 |
| `packages/shared-types/src/logic/action.types.ts` | 생성 | CalculateAction, RequireAnswerAction, JumpToBlockAction, Action 유니온 타입 |
| `packages/shared-types/src/logic/logic-item.types.ts` | 생성 | LogicItem 인터페이스 |
| `packages/shared-types/src/survey/block.types.ts` | 생성 | Block 인터페이스 (logicItems, logicFallback 포함) |
| `packages/shared-types/src/survey/survey.types.ts` | 생성 | Survey 최상위 타입 (최소 정의, FS-008과 통합 예정) |
| `packages/shared-types/src/survey/variable.types.ts` | 생성 | Variable 타입 (text/number) |
| `packages/shared-types/src/survey/hidden-field.types.ts` | 생성 | HiddenField 타입 |
| `packages/shared-types/project.json` | 생성 | Nx 프로젝트 설정 |
| `packages/shared-types/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/client/logic-engine/` | 생성 | Nx 라이브러리 생성 |
| `libs/client/logic-engine/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 |
| `libs/client/logic-engine/src/lib/constants.ts` | 생성 | 우측 피연산자 불필요 연산자 목록, 기본값 등 상수 |
| `libs/client/logic-engine/src/lib/evaluator/condition-evaluator.ts` | 생성 | 31개 조건 비교 연산자 평가 함수 |
| `libs/client/logic-engine/src/lib/evaluator/operand-resolver.ts` | 생성 | 좌/우 피연산자 값 추출 함수 |
| `libs/client/logic-engine/src/lib/evaluator/group-evaluator.ts` | 생성 | AND/OR 재귀 그룹 평가 함수 |
| `libs/client/logic-engine/src/lib/evaluator/logic-evaluator.ts` | 생성 | 로직 평가 엔진 메인 함수 |
| `libs/client/logic-engine/src/lib/performer/calculate-performer.ts` | 생성 | 7개 변수 계산 연산자 수행 함수 |
| `libs/client/logic-engine/src/lib/performer/action-performer.ts` | 생성 | 액션 수행 처리 함수 (jumpTarget, requiredElementIds, calculations 반환) |
| `libs/client/logic-engine/src/lib/performer/types.ts` | 생성 | ActionResult 타입 정의 |
| `libs/client/logic-engine/src/lib/validator/condition-validator.ts` | 생성 | 단일 조건 구조 검증 함수 |
| `libs/client/logic-engine/src/lib/validator/block-logic-validator.ts` | 생성 | Block 레벨 로직 유효성 검증 함수 |
| `libs/client/logic-engine/src/lib/validator/cycle-detector.ts` | 생성 | DFS 기반 순환 로직 검출 함수 |
| `libs/client/logic-engine/src/lib/utils/logic-item-utils.ts` | 생성 | 로직 아이템 추가/복제/삭제 순수 함수 |
| `libs/client/logic-engine/src/lib/utils/condition-utils.ts` | 생성 | 조건 추가/삭제/복제/업데이트 순수 함수 |
| `libs/client/logic-engine/src/lib/utils/group-utils.ts` | 생성 | 그룹 생성/connector 토글 순수 함수 |
| `libs/client/logic-engine/src/lib/utils/action-utils.ts` | 생성 | 액션 objective 변경 시 기본 본문 생성 순수 함수 |
| `apps/server/src/app/survey/survey.module.ts` | 생성 | 설문 모듈 (검증 서비스 포함, FS-008 통합 예정) |
| `apps/server/src/app/survey/survey.controller.ts` | 생성 | 설문 저장 시 검증 API 엔드포인트 |
| `apps/server/src/app/survey/survey-validation.service.ts` | 생성 | 서버 측 유효성 검증 서비스 (순환, Element ID, 히든 필드, divide by zero) |
| `apps/server/src/app/app.module.ts` | 수정 | SurveyModule import 추가 |
| `apps/client/src/app/[lng]/surveys/[surveyId]/edit/logic/` | 생성 | 로직 에디터 페이지 및 컴포넌트 (7개 컴포넌트) |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | 로직 에디터 UI 번역 키 추가 (영어) |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | 로직 에디터 UI 번역 키 추가 (한국어) |
| `tsconfig.base.json` (루트) | 수정 | `@inquiry/shared-types`, `@inquiry/client-logic-engine` 경로 별칭 추가 |
| `pnpm-workspace.yaml` | 수정 (필요 시) | `packages/shared-types` 워크스페이스 추가 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향도 | 발생 확률 | 완화 전략 |
|--------|--------|----------|----------|
| FS-008 설문 데이터 모델과 타입 불일치 | 높음 | 중간 | 공유 타입 패키지(`packages/shared-types`)를 FS-008과 **동시에** 정의한다. 로직 엔진에서는 필요한 최소 인터페이스만 정의하고, FS-008 구현 시 확장한다. 타입을 제네릭으로 설계하여 Element 타입의 변경에 유연하게 대응한다 |
| 재귀적 조건 그룹의 깊이로 인한 스택 오버플로우 | 중간 | 낮음 | 재귀 깊이 제한(MAX_NESTING_DEPTH = 10)을 상수로 두고, 초과 시 false 반환한다. 검증 단계에서도 중첩 깊이를 제한한다 |
| 31개 연산자의 엣지 케이스 | 중간 | 높음 | 각 연산자별 최소 5개 이상의 테스트 케이스를 작성한다. 특히 null/undefined, 타입 불일치, 빈 배열 등의 경계 조건을 커버한다 |
| 에디터 UI 상태 관리 복잡도 | 높음 | 중간 | 로직 유틸리티를 순수 함수로 구현하여 상태 관리 방식에 비종속적으로 만든다. FS-010 에디터 UX 구현 시 선택되는 상태 관리 전략(Zustand, Context 등)에 맞춰 래퍼만 추가한다 |
| 순환 로직 검증의 성능 | 낮음 | 낮음 | DFS 알고리즘의 시간 복잡도는 O(V+E)로 Block 수에 선형이다. 일반적인 설문의 Block 수(10~50개)에서는 성능 문제가 없다 |
| multipleChoice 라벨-ID 변환의 다국어 처리 | 중간 | 중간 | 선택 언어 코드를 평가 엔진에 전달하고, 해당 언어의 라벨로 매칭한다. 매칭 실패 시 기본 언어(default language)로 폴백한다 |
| FS-013(변수/히든 필드)과의 순환 의존 | 중간 | 중간 | 공유 타입 패키지에서 인터페이스를 정의하고, 각 모듈이 해당 인터페이스만 참조하도록 한다. 런타임 의존은 피연산자 해석 시에만 발생하므로 함수 주입 패턴으로 분리한다 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

**테스트 프레임워크:** Jest (Nx 기본 설정)

| 테스트 대상 | 파일 | 주요 테스트 시나리오 | 예상 케이스 수 |
|------------|------|---------------------|-------------|
| 조건 비교 연산자 (T-24) | `condition-evaluator.spec.ts` | 31개 연산자 x (정상, null, 타입 불일치, 경계값) | 약 150개 |
| 변수 계산 연산자 | `calculate-performer.spec.ts` | 7개 연산자 x (정상, divide by zero, 타입 변환) | 약 30개 |
| 피연산자 값 추출 | `operand-resolver.spec.ts` | element/variable/hiddenField 타입별 + 특수 처리 (number 변환, multipleChoice 라벨, matrix) | 약 25개 |
| 조건 그룹 평가 (T-25) | `group-evaluator.spec.ts` | AND 전체 true/false, OR 일부 true, 중첩 그룹, 빈 그룹 | 약 15개 |
| 로직 평가 엔진 (T-25) | `logic-evaluator.spec.ts` | 다중 로직 아이템, 첫 번째 매칭, logicFallback, 로직 없음 | 약 10개 |
| 단일 조건 검증 (T-26) | `condition-validator.spec.ts` | 우측 필수/불필요 검증, 빈 문자열, 유효하지 않은 연산자 | 약 15개 |
| Block 로직 검증 (T-26) | `block-logic-validator.spec.ts` | Element ID 중복, 히든 필드 미존재, divide by zero | 약 10개 |
| 순환 로직 검증 (T-26) | `cycle-detector.spec.ts` | 선형 경로, 단순 순환, 복잡 순환, logicFallback 순환, 순환 없음 | 약 10개 |
| 로직 유틸리티 (T-27) | `logic-item-utils.spec.ts` 등 | 복제(deep copy 확인), 삭제(빈 그룹 정리), 추가, 토글, 업데이트 | 약 25개 |

**핵심 테스트 케이스 예시:**

```typescript
// condition-evaluator.spec.ts
describe('evaluateCondition', () => {
  describe('equals', () => {
    it('동일한 문자열이면 true를 반환한다', () => {
      expect(evaluateCondition('equals', 'hello', 'hello')).toBe(true);
    });
    it('다른 문자열이면 false를 반환한다', () => {
      expect(evaluateCondition('equals', 'hello', 'world')).toBe(false);
    });
    it('Date 타입이면 타임스탬프로 비교한다', () => {
      const d1 = new Date('2026-01-01').getTime();
      const d2 = new Date('2026-01-01').getTime();
      expect(evaluateCondition('equals', d1, d2)).toBe(true);
    });
    it('MultiChoiceMulti 배열이면 포함 여부로 비교한다', () => {
      expect(evaluateCondition('equals', ['a', 'b', 'c'], 'b')).toBe(true);
    });
    it('에러 발생 시 false를 반환한다', () => {
      // null에 대한 연산이 에러를 유발하는 경우
      expect(evaluateCondition('contains', null, 'test')).toBe(false);
    });
  });

  describe('isSubmitted', () => {
    it('비어있지 않은 문자열이면 true를 반환한다', () => {
      expect(evaluateCondition('isSubmitted', 'answer', null)).toBe(true);
    });
    it('빈 문자열이면 false를 반환한다', () => {
      expect(evaluateCondition('isSubmitted', '', null)).toBe(false);
    });
    it('length > 0인 배열이면 true를 반환한다', () => {
      expect(evaluateCondition('isSubmitted', ['a'], null)).toBe(true);
    });
  });
});

// cycle-detector.spec.ts
describe('detectCyclicLogic', () => {
  it('A -> B -> C 선형 경로에서는 순환이 없다', () => {
    const blocks = createLinearBlocks(['A', 'B', 'C']);
    expect(detectCyclicLogic(blocks).hasCycle).toBe(false);
  });
  it('A -> B -> C -> A 순환을 검출한다', () => {
    const blocks = createCyclicBlocks(['A', 'B', 'C']);
    const result = detectCyclicLogic(blocks);
    expect(result.hasCycle).toBe(true);
    expect(result.cyclePath).toContain('A');
  });
  it('logicFallback으로 인한 순환을 검출한다', () => {
    const blocks = createBlocksWithFallbackCycle();
    expect(detectCyclicLogic(blocks).hasCycle).toBe(true);
  });
});
```

### 5.2 통합 테스트

| 테스트 시나리오 | 범위 | 검증 포인트 |
|---------------|------|-----------|
| 로직 평가 + 액션 수행 | evaluator + performer | Block의 조건이 true일 때 올바른 jumpTarget, requiredElementIds, calculations가 반환되는지 검증 |
| 다중 Block 로직 흐름 | logic-evaluator + performer | 여러 Block을 거치며 변수가 누적 계산되고 올바른 Block으로 이동하는지 검증 |
| 유효성 검증 + 저장 API | validator + server API | 순환 로직이 있는 설문 저장 시 에러 반환, 정상 설문 저장 시 성공 반환 |
| 유틸리티 + 검증 | utils + validator | 유틸리티로 로직을 편집한 후 검증을 수행하면 올바른 결과가 나오는지 확인 |

### 5.3 E2E 테스트 (FS-010 에디터와 통합 후)

| 시나리오 | 행위 | 기대 결과 |
|---------|------|----------|
| 기본 분기 로직 설정 | 에디터에서 "성별" 질문에 대해 "남성" 선택 시 Block B로 이동하는 로직을 추가 → 저장 → 응답 시 "남성" 선택 | Block B로 이동 |
| 변수 계산 스코어링 | 각 질문 응답에 따라 score 변수에 점수를 누적하는 로직 설정 → 응답 완료 | score 변수에 올바른 합계 |
| 순환 로직 차단 | Block A → Block B → Block A 순환 로직을 설정 → 저장 시도 | 순환 로직 에러 표시, 저장 차단 |
| 중첩 AND/OR 조건 | 3단계 중첩 조건 그룹 (OR 내 AND 내 조건) 설정 → 조건 충족 응답 | 올바른 분기 동작 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 설명 |
|------|------|
| Element 타입 의존 | Element의 상세 타입(openText, multipleChoiceSingle, matrix 등)이 FS-009에서 정의되어야 피연산자 값 추출의 특수 처리를 완전히 구현할 수 있다. 초기 구현에서는 기본 타입만 지원하고 FS-009 구현 후 확장한다 |
| 에디터 상태 관리 미정 | FS-010(설문 에디터 UX)에서 결정될 상태 관리 전략에 따라 에디터 UI 컴포넌트의 상태 관리 코드가 변경될 수 있다 |
| 서버 사이드 로직 평가 미지원 | 현재 구현은 클라이언트 사이드 전용이다. 서버에서 응답 검증이 필요해지면(FS-021 응답 관리) 로직 엔진을 공유 패키지로 이동해야 한다 |
| 조건 비교 연산자 31개 고정 | 명세에서 31개로 고정되어 있어 추가 시 스키마 및 평가 엔진 수정이 필요하다 |
| Question 레벨 로직 미지원 | deprecated된 Question 레벨 로직은 v1 API 호환을 위한 읽기 전용으로만 유지하며 신규 로직 생성은 Block 레벨만 지원한다 |
| 자기 참조 logicFallback | 현재 Block 자신을 logicFallback으로 참조하는 경우 무한 루프의 가능성이 있다. 런타임에서 최대 반복 횟수 제한(MAX_BLOCK_REVISIT = 100)을 두어 방지한다 |

### 6.2 잠재적 향후 개선

| 항목 | 설명 |
|------|------|
| 서버 사이드 로직 평가 | 응답 제출 시 서버에서도 로직을 평가하여 응답 무결성을 보장. 로직 엔진을 `packages/shared-types` 또는 별도 `packages/logic-engine`으로 이동하여 클라이언트/서버 공유 |
| 로직 디버거 | 에디터에서 시뮬레이션 응답을 입력하면 각 조건의 평가 결과를 시각적으로 표시하는 디버깅 도구 |
| 로직 템플릿 | 자주 사용되는 로직 패턴(NPS 스코어 분기, 성별 분기 등)을 템플릿으로 제공 |
| 외부 API 조건 | 외부 API 호출 결과를 조건으로 사용할 수 있는 커스텀 연산자 (현재 Out-of-scope) |
| 시간 기반 조건 | 타이머/시간 기반 자동 분기 (현재 Out-of-scope) |
| 조건부 요소 표시/숨김 | jumpToBlock 외에 특정 Element를 동적으로 표시/숨기는 액션 타입 추가 |
| 로직 버전 관리 | 설문 발행 시점의 로직 스냅샷을 저장하여 발행 후 수정해도 기존 응답의 무결성 보장 |

---

## 7. i18n 고려사항 (클라이언트 UI 변경)

로직 에디터 UI에 필요한 번역 키 목록:

### 7.1 연산자 라벨 (31개 + 7개 계산)

```
logic.operator.equals
logic.operator.doesNotEqual
logic.operator.contains
logic.operator.doesNotContain
logic.operator.startsWith
logic.operator.doesNotStartWith
logic.operator.endsWith
logic.operator.doesNotEndWith
logic.operator.isEmpty
logic.operator.isNotEmpty
logic.operator.isSet
logic.operator.isNotSet
logic.operator.isGreaterThan
logic.operator.isLessThan
logic.operator.isGreaterThanOrEqual
logic.operator.isLessThanOrEqual
logic.operator.equalsOneOf
logic.operator.includesAllOf
logic.operator.includesOneOf
logic.operator.doesNotIncludeOneOf
logic.operator.doesNotIncludeAllOf
logic.operator.isSubmitted
logic.operator.isSkipped
logic.operator.isClicked
logic.operator.isNotClicked
logic.operator.isAccepted
logic.operator.isBooked
logic.operator.isPartiallySubmitted
logic.operator.isCompletelySubmitted
logic.operator.isBefore
logic.operator.isAfter
logic.operator.isAnyOf
logic.calculate.assign
logic.calculate.concat
logic.calculate.add
logic.calculate.subtract
logic.calculate.multiply
logic.calculate.divide
```

### 7.2 액션 타입 라벨

```
logic.action.calculate
logic.action.requireAnswer
logic.action.jumpToBlock
```

### 7.3 UI 라벨

```
logic.panel.title
logic.panel.addLogicItem
logic.panel.noLogic
logic.logicItem.duplicate
logic.logicItem.delete
logic.condition.addCondition
logic.condition.delete
logic.condition.duplicate
logic.condition.createGroup
logic.connector.and
logic.connector.or
logic.operand.element
logic.operand.variable
logic.operand.hiddenField
logic.operand.static
logic.operand.dynamic
logic.operand.selectElement
logic.operand.selectVariable
logic.operand.selectHiddenField
logic.operand.enterValue
logic.fallback.title
logic.fallback.selectBlock
logic.fallback.noFallback
logic.fallback.nextBlock
```

### 7.4 검증 에러 메시지

```
logic.validation.cyclicLogic
logic.validation.cyclicLogicPath
logic.validation.elementIdDuplicate
logic.validation.hiddenFieldMissing
logic.validation.divideByZero
logic.validation.conditionInvalid
logic.validation.rightOperandRequired
logic.validation.rightOperandNotAllowed
logic.validation.emptyStaticValue
logic.validation.invalidOperator
logic.validation.blockNameRequired
logic.validation.blockElementRequired
```

---

## 부록: 구현 우선순위 판단 근거

1. **Phase 1A (타입/인프라)를 최우선으로 하는 이유:** FS-008, FS-009, FS-013과 공유 타입 패키지를 먼저 합의해야 4단계 전체 작업의 타입 충돌을 방지한다.

2. **평가 엔진 코어를 UI보다 먼저 하는 이유:** 순수 함수 기반 엔진은 UI 없이도 단위 테스트로 검증 가능하다. 에디터 UI는 FS-010과의 합의가 필요하므로 후순위.

3. **유효성 검증을 별도 마일스톤으로 분리하는 이유:** 검증 로직은 클라이언트/서버 양측에서 사용되므로, 평가 엔진이 안정된 후 검증 규칙을 확정하는 것이 효율적이다.
