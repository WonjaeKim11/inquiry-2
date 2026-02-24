# Validators 모듈 Phase 1-B 구현

## Overview
설문 빌더에서 ID, 변수, 히든 필드, 참조 무결성을 검증하는 Validators 모듈을 구현했다.
이 모듈은 설문 발행(publish) 시 데이터 무결성을 보장하고, 삭제 시 참조 충돌을 사전에 탐지하기 위해 만들어졌다.
NFR-013 요구사항(변수 ID 유일성, 변수 이름 패턴/유일성, 히든 필드 금지 ID)을 충족한다.

## Changed Files
- `packages/survey-builder-config/src/lib/validators/id-validator.ts` - 공통 ID 유효성 검증 유틸리티 (빈 문자열, 중복, 금지 ID, 공백, 문자 패턴 순서 검증)
- `packages/survey-builder-config/src/lib/validators/variable-validator.ts` - 변수 이름/ID 검증 (패턴, 유일성, 배열 전체 검증)
- `packages/survey-builder-config/src/lib/validators/hidden-field-validator.ts` - 히든 필드 ID 검증 (예약 ID, 패턴, element/variable ID 충돌)
- `packages/survey-builder-config/src/lib/validators/reference-checker.ts` - 삭제 시 참조 무결성 검사 (로직/리콜 영역에서 사용 중인지 확인)
- `packages/survey-builder-config/src/lib/validators/index.ts` - Barrel export + 통합 검증 함수 (validateSurveyVariablesAndFields)
- `packages/survey-builder-config/src/index.ts` - 패키지 루트에 Validators 모듈 re-export 추가

## Major Changes

### 1. ID 검증 (`id-validator.ts`)
공통 ID 유효성 검증 함수. 5단계 순서로 검증:
1. 빈 문자열 검사
2. 중복 검사 (대소문자 무시)
3. 금지 ID 검사
4. 공백 포함 검사
5. 문자 패턴 검사 (`^[a-zA-Z0-9_-]+$`)

```typescript
validateId('myField', 'Hidden field', ['existing1'], HIDDEN_FIELD_FORBIDDEN_IDS);
// => { valid: true }

validateId('suid', 'Hidden field', [], HIDDEN_FIELD_FORBIDDEN_IDS);
// => { valid: false, error: 'Hidden field ID is not allowed.' }
```

### 2. 변수 검증 (`variable-validator.ts`)
- `validateVariableName()`: 소문자/숫자/언더스코어만 허용 (`^[a-z0-9_]+$`), 대소문자 무시 유일성 검사
- `validateVariableId()`: 빈 문자열 + 정확한 문자열 중복 검사
- `validateVariables()`: 배열 전체 검증 (ID 중복, 이름 패턴/중복, 타입-값 일치 검사)

### 3. 히든 필드 검증 (`hidden-field-validator.ts`)
- `HIDDEN_FIELD_FORBIDDEN_IDS`: 서버 예약 ID 9개 (suid, odp, userId, recipientId, recipientEmail, recipientFirstName, recipientLastName, surveyId, source)
- `validateHiddenFieldId()`: `validateId()`를 래핑하여 히든 필드 전용 금지 ID 적용
- `validateHiddenFields()`: 전체 히든 필드 구조 검증 (비활성화 시 스킵, 패턴/금지/내부 중복/element+variable 충돌 검사)

### 4. 참조 무결성 검사 (`reference-checker.ts`)
삭제 전 해당 ID가 스키마 내에서 참조되고 있는지 확인:
- `checkHiddenFieldReferences()`: 히든 필드 삭제 시 로직/리콜 영역 참조 검사
- `checkVariableReferences()`: 변수 삭제 시 로직/리콜 영역 참조 검사
- 내부적으로 JSON 직렬화 방식으로 로직 참조를 검색하고, recall 정규식으로 텍스트 속성 내 참조를 검색

### 5. 통합 검증 (`index.ts`의 `validateSurveyVariablesAndFields`)
설문 발행 시 한 번에 변수 + 히든 필드 + recall fallback을 검증:
1. `validateVariables()` 호출 -> errors에 추가
2. `validateHiddenFields()` 호출 -> errors에 추가
3. 스키마 내 모든 텍스트 속성에서 빈 fallback recall 검사 -> warnings에 추가

## How to use it

```typescript
import {
  validateId,
  validateVariableName,
  validateVariables,
  validateHiddenFieldId,
  validateHiddenFields,
  HIDDEN_FIELD_FORBIDDEN_IDS,
  checkHiddenFieldReferences,
  checkVariableReferences,
  validateSurveyVariablesAndFields,
} from '@inquiry/survey-builder-config';

// 단일 ID 검증
const result = validateId('my_field', 'Element', ['existing_id']);
// => { valid: true }

// 변수 이름 검증
const nameResult = validateVariableName('total_score', ['existing_var']);
// => { valid: true }

// 변수 배열 전체 검증
const varsResult = validateVariables([
  { id: 'v1', name: 'score', type: 'number', value: 0 },
  { id: 'v2', name: 'label', type: 'text', value: 'hello' },
]);
// => { valid: true, errors: [] }

// 히든 필드 삭제 전 참조 검사
const refResult = checkHiddenFieldReferences('campaign', schema);
if (refResult.inUse) {
  console.warn('Cannot delete:', refResult.usedIn);
}

// 통합 검증 (발행 시)
const publishResult = validateSurveyVariablesAndFields(
  variables, hiddenFields, elementIds, schema
);
// => { valid: true/false, errors: [...], warnings: [...] }
```

## Related Components/Modules
- `packages/survey-builder-config/src/lib/recall/recall-safety.ts` - `validateFallbacks()` 함수를 통합 검증에서 import하여 사용
- `packages/survey-builder-config/src/lib/recall/recall-parser.ts` - `RECALL_PATTERN` 정규식 (reference-checker에서 동일 패턴 인라인 사용)
- `packages/survey-builder-config/src/lib/constants/forbidden-ids.ts` - Element용 금지 ID (FORBIDDEN_IDS)
- `packages/survey-builder-config/src/lib/types.ts` - `SurveyVariable`, `HiddenFields` 타입 정의

## Precautions
- `reference-checker.ts`는 현재 logic과 recall 영역만 검사한다. quota, followUp 영역은 해당 모듈 구현 후 확장 필요
- `RECALL_PATTERN`은 `recall-parser.ts`에서 export되지만, reference-checker에서는 순환 의존 방지를 위해 동일 패턴을 인라인으로 정의
- `validateSurveyVariablesAndFields`의 빈 fallback 검사는 errors가 아닌 warnings로 분류되어 발행을 차단하지 않음
- 히든 필드 검증은 `enabled: false`일 때 모든 검증을 건너뛰므로, 비활성화 상태에서 잘못된 ID가 있어도 오류가 발생하지 않음
