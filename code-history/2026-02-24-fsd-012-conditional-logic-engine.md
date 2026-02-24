# FSD-012 조건부 로직 엔진 (Conditional Logic Engine) 구현

## Overview
설문 Block 레벨에서 조건부 분기, 변수 계산, 필수 응답 강제를 설정할 수 있는
조건부 로직 엔진을 `packages/survey-builder-config/` 패키지 내에 구현하였다.

FSD-008(설문 CRUD), FSD-009(질문 유형 카탈로그 16개 Entity) 이후 단계로,
기존 `@coltorapps/builder` Entity 시스템과 validation 디스패처 패턴을 그대로 활용하여
신규 패키지 없이 공유 패키지 내에서 완결하였다.

## Changed Files

### 신규 파일 (34개)

**Logic 타입 모듈** (`packages/survey-builder-config/src/lib/logic/types/`)
- `operator.types.ts` — `ConditionOperator`(31개) + `CalculateOperator`(7개) 리터럴 유니온 타입
- `condition.types.ts` — `DynamicField`, `RightOperand`, `SingleCondition`, `ConditionGroup` 인터페이스 + Zod 스키마 + `isSingleCondition()` 타입 가드
- `action.types.ts` — `CalculateAction`, `RequireAnswerAction`, `JumpToBlockAction` + Zod 스키마
- `logic-item.types.ts` — `LogicItem`, `ActionResult`, `LogicEvaluationContext` + Zod 스키마
- `index.ts` — 타입 barrel export

**Logic 상수 모듈** (`packages/survey-builder-config/src/lib/logic/constants/`)
- `operators-without-right-operand.ts` — 우측 피연산자 불필요 연산자 12개 배열
- `logic-defaults.ts` — `MAX_NESTING_DEPTH(10)`, `MAX_BLOCK_REVISIT(100)` 등 5개 제한 상수
- `index.ts` — 상수 barrel export

**Logic 연산자 모듈** (`packages/survey-builder-config/src/lib/logic/operators/`)
- `string-operators.ts` — 문자열 비교 12개 (equals, contains, startsWith, isEmpty, isSet 등)
- `number-operators.ts` — 숫자 비교 4개 (isGreaterThan, isLessThan 등)
- `multi-select-operators.ts` — 다중 선택 5개 (equalsOneOf, includesAllOf 등)
- `status-operators.ts` — 상태 확인 8개 (isSubmitted, isSkipped, isClicked 등)
- `date-operators.ts` — 날짜 비교 2개 (isBefore, isAfter)
- `calculate-operators.ts` — 계산 7개 (assign, concat, add, subtract, multiply, divide, isAnyOf)
- `index.ts` — `evaluateConditionOperator()` + `executeCalculateOperator()` 디스패처

**Logic 평가 엔진** (`packages/survey-builder-config/src/lib/logic/evaluator/`)
- `operand-resolver.ts` — `resolveDynamicField()`, `resolveLeftOperand()`, `resolveRightOperand()`
- `condition-evaluator.ts` — `evaluateSingleCondition()` — 피연산자 resolve → 연산자 dispatch
- `group-evaluator.ts` — `evaluateConditionGroup()` — 재귀 AND/OR 평가, 중첩 깊이 제한
- `action-performer.ts` — `performActions()` — jumpTarget, requiredElementIds, calculations 반환
- `logic-evaluator.ts` — `evaluateBlockLogic()` — 로직 아이템 순차 평가 + logicFallback 처리
- `index.ts` — 평가 엔진 barrel export

**Logic 검증기** (`packages/survey-builder-config/src/lib/logic/validators/`)
- `condition-validator.ts` — `validateSingleCondition()`, `validateConditionGroup()` — 조건 구조 검증
- `block-logic-validator.ts` — `validateBlockLogic()` — Block 레벨 유효성 (Element ID, hiddenField, divideByZero)
- `cycle-detector.ts` — `detectCyclicLogic()` — DFS 기반 순환 로직 검출
- `index.ts` — `validateSurveyLogic()` 통합 검증 + barrel export

**Logic 유틸리티** (`packages/survey-builder-config/src/lib/logic/utils/`)
- `logic-item-utils.ts` — `addLogicItem()`, `duplicateLogicItem()`, `removeLogicItem()`, `reorderLogicItems()`
- `condition-utils.ts` — `addCondition()`, `removeCondition()`, `duplicateCondition()`, `updateCondition()`
- `group-utils.ts` — `createConditionGroup()`, `toggleConnector()`, `nestAsGroup()`
- `action-utils.ts` — `addAction()`, `removeAction()`, `updateAction()`, `changeObjective()`
- `index.ts` — 유틸리티 barrel export

**Logic 메인 barrel** (`packages/survey-builder-config/src/lib/logic/`)
- `index.ts` — 전체 logic 모듈 공개 API

**Block Attribute** (`packages/survey-builder-config/src/lib/attributes/logic/`)
- `logic-items.attribute.ts` — `logicItemsAttribute` (LogicItem[] optional)
- `logic-fallback.attribute.ts` — `logicFallbackAttribute` (string nullable optional)

### 수정 파일 (19개)

- `packages/survey-builder-config/src/lib/entities/block.entity.ts` — logicItems, logicFallback 속성 추가
- `packages/survey-builder-config/src/lib/attributes/index.ts` — logic attribute re-export 추가
- `packages/survey-builder-config/src/index.ts` — Logic 모듈 전체 re-export 추가
- `libs/server/survey/src/lib/services/survey-validation.service.ts` — 3단계 로직 검증 메서드 추가
- `libs/server/survey/src/lib/survey.controller.ts` — `POST /surveys/:surveyId/validate-logic` 엔드포인트 추가
- `apps/client/src/app/i18n/locales/{15개 locale}/translation.json` — `logic.*` 번역 키 추가

## Major Changes

### 1. 조건 비교 연산자 시스템 (31 + 7)
기존 `validation/rules/` 의 RULE_EVALUATORS 디스패처 패턴을 그대로 따라
`CONDITION_EVALUATORS` Record에 31개 조건 연산자를, `CALCULATE_EXECUTORS`에 7개 계산 연산자를 매핑한다.

```typescript
// logic/operators/index.ts
const CONDITION_EVALUATORS: Record<string, (left: unknown, right: unknown) => boolean> = {
  equals: evaluateEquals,      // 문자열 동등 (대소문자 무시)
  contains: evaluateContains,  // 문자열 포함
  isGreaterThan: evaluateIsGreaterThan,  // 숫자 비교
  equalsOneOf: evaluateEqualsOneOf,      // 다중 선택
  isSubmitted: evaluateIsSubmitted,      // 상태 확인
  isBefore: evaluateIsBefore,            // 날짜 비교
  // ... 총 31개
};

export function evaluateConditionOperator(operator, left, right): boolean {
  try {
    const evaluator = CONDITION_EVALUATORS[operator];
    if (!evaluator) return false;
    return evaluator(left, right);
  } catch { return false; }  // NFR-012-01: 에러 시 false
}
```

### 2. 재귀 AND/OR 조건 그룹 평가 엔진
`ConditionGroup`은 `SingleCondition | ConditionGroup` 배열을 재귀적으로 포함할 수 있다.
`evaluateConditionGroup()`은 depth 파라미터로 `MAX_NESTING_DEPTH(10)` 제한을 적용한다.

### 3. Block 로직 평가 흐름
```
evaluateBlockLogic(logicItems, logicFallback, context)
  → 각 LogicItem 순차 순회
    → evaluateConditionGroup(item.conditions, context)
    → 첫 번째 매칭 시 performActions(item.actions, context) 반환
  → 모든 불일치 시 logicFallback을 jumpTarget으로 사용
```

### 4. DFS 순환 로직 검출
각 Block의 `jumpToBlock` 액션과 `logicFallback`을 간선으로 방향 그래프를 구성하고,
DFS로 순환을 탐지한다. 순환 발견 시 경로(예: `A → B → C → A`)를 반환한다.

### 5. 서버 검증 3단계 통합
`SurveyValidationService.validateForPublish()`에 3단계가 추가되었다:
1. Builder 스키마 구조 검증 (기존)
2. 비즈니스 규칙 검증 (기존)
3. **조건부 로직 검증** (신규) — `validateSurveyLogic()` + `detectCyclicLogic()` 호출

### 6. i18n 15개 로케일 번역
`logic.operator.*`(38개), `logic.action.*`(3개), `logic.panel.*`(5개),
`logic.condition.*`(5개), `logic.connector.*`(2개), `logic.operand.*`(5개),
`logic.fallback.*`(3개), `logic.validation.*`(7개) = 총 68개 키 × 15개 locale.

## How to use it

### 로직 평가 (클라이언트/서버 공통)
```typescript
import {
  evaluateBlockLogic,
  type LogicItem,
  type LogicEvaluationContext,
} from '@inquiry/survey-builder-config';

const context: LogicEvaluationContext = {
  responses: { questionId1: 'yes', questionId2: 42 },
  variables: { score: 100 },
  hiddenFields: { source: 'email' },
  elementStatuses: { questionId1: 'submitted' },
};

const result = evaluateBlockLogic(logicItems, logicFallback, context);
// result.matchedItemId — 매칭된 로직 ID
// result.actionResult.jumpTarget — 이동할 블록 ID
// result.actionResult.requiredElementIds — 필수 응답 요소 ID 배열
// result.actionResult.calculations — 계산 결과 배열
// result.isFallback — fallback 적용 여부
```

### 로직 구조 검증
```typescript
import { validateSurveyLogic, detectCyclicLogic } from '@inquiry/survey-builder-config';

const result = validateSurveyLogic(
  blockLogicMap,    // Record<blockId, LogicItem[]>
  blockFallbackMap, // Record<blockId, string | null>
  elementIds,
  blockIds,
  hiddenFieldIds,
  variableIds
);
// result.valid — 전체 검증 통과 여부
// result.blockErrors — 블록별 오류 목록
// result.cycleResult.hasCycle — 순환 존재 여부
```

### 로직 CRUD 유틸리티
```typescript
import {
  addLogicItem, removeLogicItem, duplicateLogicItem,
  addCondition, removeCondition, updateCondition,
  createConditionGroup, toggleConnector, nestAsGroup,
  addAction, removeAction, updateAction,
} from '@inquiry/survey-builder-config';

// 순수 함수 — 원본을 변경하지 않고 새 객체를 반환
const newItems = addLogicItem(currentItems, newItem);
const updated = updateCondition(group, conditionId, { operator: 'contains' });
```

### 서버 로직 검증 엔드포인트
```
POST /api/surveys/:surveyId/validate-logic
Authorization: Bearer <jwt>

→ 200: { valid: true, message: "로직 검증을 통과했습니다." }
→ 400: BadRequestException (오류 메시지)
```

## Related Components/Modules

- `packages/survey-builder-config/src/lib/validation/` — 기존 24개 검증 규칙 (디스패처 패턴 참조)
- `packages/survey-builder-config/src/lib/entities/block.entity.ts` — Block Entity (logicItems/logicFallback 추가)
- `packages/survey-builder-config/src/lib/types.ts` — SurveyVariable, HiddenFields (LogicEvaluationContext에서 참조)
- `libs/server/survey/src/lib/services/survey.service.ts` — SurveyService (컨트롤러에서 호출)
- `apps/client/src/app/i18n/` — i18next 번역 시스템

## Precautions

- **Turbopack 호환성**: 비구조화 할당에서 `!` (non-null assertion) 사용 금지 → `as T` 캐스트 사용
- **에러 안전성 (NFR-012-01)**: 모든 평가 함수에서 에러 발생 시 `false` (조건) 또는 현재 값(계산) 반환
- **순환 방지**: `MAX_BLOCK_REVISIT=100` 으로 런타임 무한 루프 방지, DFS로 빌드 시 순환 검출
- **성능**: 재귀 조건 그룹 평가는 `MAX_NESTING_DEPTH=10` 으로 제한
- **divideByZero**: 계산 연산자에서 0으로 나누기 시 현재 값 유지, 검증기에서 정적 0 값 경고
- **하위 호환**: `DynamicField.type = 'question'`은 `'element'`와 동일하게 처리 (deprecated)
