# FSD-013 변수 / 히든 필드 / 리콜 (Variables / Hidden Fields / Recall) 구현

## Overview
FSD-008(설문 CRUD), FSD-009(질문 유형 카탈로그), FSD-012(조건부 로직 엔진) 완료 후,
**FSD-013 변수 / 히든 필드 / 리콜** 핵심 모듈을 구현했다.

Recall 모듈은 설문 텍스트에 `#recall:id/fallback:val#` 패턴을 삽입하여
변수/응답/히든 필드 값을 동적으로 치환하는 기능을 제공한다.
Validators 모듈은 변수 이름/ID, 히든 필드 ID의 유효성과 참조 무결성을 검증한다.

**스코프**: Recall/Validators 공유 모듈 + 서버 검증 강화 + i18n 15 로케일
**스코프 제외**: 클라이언트 UI 컴포넌트, 런타임 엔진, Rich Text Editor 통합 (FSD-010 이후)

## Changed Files

### 신규 파일 (13개)

#### Recall 모듈 (`packages/survey-builder-config/src/lib/recall/`)
| 파일 | 역할 |
|------|------|
| `types/recall.types.ts` | `RecallInfo`, `RecallContext`, `RecallItem` 인터페이스 + Zod 스키마 |
| `types/index.ts` | 타입 barrel export |
| `recall-parser.ts` | `RECALL_PATTERN` 정규식, `getFirstRecallId()`, `getAllRecallIds()`, `getFallbackValue()`, `getAllRecallInfo()` |
| `recall-resolver.ts` | `resolveRecalls()` — 변수→응답→히든필드→fallback 4단계 우선순위 치환 |
| `recall-formatter.ts` | `formatDateValue()` 서수 포매팅, `formatArrayValue()` 배열 연결, `truncateText()` 25자 축약, `replaceNbsp()` |
| `recall-editor.ts` | `recallToEditor()` 저장→에디터 변환, `editorToRecall()` 에디터→저장 변환 (HTML 태그 제거) |
| `recall-safety.ts` | `sanitizeNestedRecall()` 중첩 recall 대체, `stripHtmlTags()` XSS 방지, `validateFallbacks()` 빈 fallback 탐지 |
| `index.ts` | 모듈 barrel export |

#### Validators 모듈 (`packages/survey-builder-config/src/lib/validators/`)
| 파일 | 역할 |
|------|------|
| `id-validator.ts` | `validateId()` — 공통 ID 유효성 검증 (빈 문자열→중복→금지→공백→패턴) |
| `variable-validator.ts` | `validateVariableName()`, `validateVariableId()`, `validateVariables()` |
| `hidden-field-validator.ts` | `HIDDEN_FIELD_FORBIDDEN_IDS`, `validateHiddenFieldId()`, `validateHiddenFields()` |
| `reference-checker.ts` | `checkHiddenFieldReferences()`, `checkVariableReferences()` — 삭제 시 로직/리콜 참조 무결성 검사 |
| `index.ts` | barrel export + `validateSurveyVariablesAndFields()` 통합 검증 함수 |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `packages/survey-builder-config/src/index.ts` | Recall, Validators 모듈 re-export 추가 |
| `libs/server/survey/src/lib/services/survey-validation.service.ts` | `validateForPublish()` 4단계 추가: `validateVariablesAndHiddenFields()` |
| `libs/server/survey/src/lib/survey.controller.ts` | `POST /surveys/:surveyId/validate-entities` 엔드포인트 추가 |
| `apps/client/src/app/i18n/locales/*/translation.json` (15개) | `survey.variables.validation`, `survey.hidden_fields.validation`, `recall` 네임스페이스 추가 |

## Major Changes

### 1. Recall 파싱/치환 시스템

```typescript
// recall-parser.ts — 정규식 패턴
const RECALL_PATTERN = /#recall:([a-zA-Z0-9_-]+)\/fallback:(.*?)#/g;

// recall-resolver.ts — 4단계 우선순위 치환
export function resolveRecalls(text: string, context: RecallContext): string {
  return text.replace(regex, (_match, id, fallback) => {
    // 1순위: 변수(variables) → 2순위: 응답(responseData) →
    // 3순위: 히든 필드(hiddenFieldValues) → 4순위: fallback
  });
}
```

- `while(match !== null)` 패턴으로 regex.exec() null 시 즉시 중단 (NFR-013-04)
- 매번 `new RegExp()`으로 lastIndex 상태 누출 방지

### 2. 포매팅/안전 처리

- **날짜 서수**: "2024-01-01" → "1st January 2024" (11th~13th은 항상 "th")
- **배열 포매팅**: 빈 값 제거 후 쉼표 연결
- **텍스트 축약**: 25자 초과 시 `앞10자...뒤10자`
- **중첩 recall**: 라벨 내 recall 태그를 "___"로 대체 (NFR-013-05)
- **XSS 방지**: `editorToRecall()` 시 HTML 태그 제거 (NFR-013-06)

### 3. Validators — ID/이름 검증 체계

```typescript
// id-validator.ts — 5단계 순서 검증
function validateId(id, type, existingIds, forbiddenIds) {
  // 빈 문자열 → 중복(대소문자 무시) → 금지 ID → 공백 → 문자 패턴
}

// 변수 이름: ^[a-z0-9_]+$ (소문자만 허용)
// 히든 필드 ID: ^[a-zA-Z0-9_-]+$ (대소문자 허용)
// 히든 필드 금지 ID: suid, odp, userId, recipientId 등 9개
```

### 4. 참조 무결성 검사

```typescript
// reference-checker.ts
checkHiddenFieldReferences(fieldId, schema)  // 로직 + 리콜 참조 검사
checkVariableReferences(variableId, schema)   // 로직 + 리콜 참조 검사
// → ReferenceCheckResult { inUse, usedIn: [{ type, description }] }
```

### 5. 서버 검증 4단계

```
validateForPublish():
  1단계: Builder 스키마 구조 검증
  2단계: 비즈니스 규칙 검증
  3단계: 조건부 로직 검증
  4단계: 변수/히든 필드 검증 ← [신규]
        - 변수 ID 유일성, 이름 패턴/유일성
        - 히든 필드 ID 유효성, 금지 ID, 중복
        - Recall fallback 빈 값 → 경고 로그 (발행 차단하지 않음)
```

## How to use it

### Recall 파싱
```typescript
import { getAllRecallInfo, resolveRecalls } from '@inquiry/survey-builder-config';

// 텍스트에서 recall 정보 추출
const infos = getAllRecallInfo('Hello #recall:user_name/fallback:there#!');
// → [{ id: 'user_name', fallback: 'there' }]

// 실제 값으로 치환
const result = resolveRecalls(
  'Hello #recall:user_name/fallback:there#!',
  {
    variables: [{ id: 'user_name', name: 'user_name', type: 'text', value: 'John' }],
    responseData: {},
    hiddenFieldValues: {},
  }
);
// → "Hello John!"
```

### 에디터 변환
```typescript
import { recallToEditor, editorToRecall } from '@inquiry/survey-builder-config';

const items = [{ id: 'q1', label: '이름', type: 'element' as const }];

// 저장 → 에디터
recallToEditor('#recall:q1/fallback:이름#님 환영합니다', items);
// → "@이름님 환영합니다"

// 에디터 → 저장
editorToRecall('@이름님 환영합니다', items);
// → "#recall:q1/fallback:#님 환영합니다"
```

### 변수/히든 필드 검증
```typescript
import {
  validateVariableName,
  validateHiddenFieldId,
  checkVariableReferences,
} from '@inquiry/survey-builder-config';

validateVariableName('my_var', ['existing_var']);
// → { valid: true }

validateHiddenFieldId('suid', [], HIDDEN_FIELD_FORBIDDEN_IDS);
// → { valid: false, error: 'Hidden field ID is not allowed.' }

checkVariableReferences('var_1', schema);
// → { inUse: true, usedIn: [{ type: 'logic', description: '...' }] }
```

### 엔티티 참조 검사 API
```
POST /api/surveys/:surveyId/validate-entities
Body: { "entityId": "var_1", "entityType": "variable" }
Response: { "entityId": "var_1", "entityType": "variable", "inUse": false, "usedIn": [] }
```

## Related Components/Modules

| 모듈 | 관계 |
|------|------|
| `logic/` (FSD-012) | `DynamicField`, `LogicEvaluationContext`, `CalculateAction`에서 변수/히든 필드 참조 |
| `types.ts` | `SurveyVariable`, `HiddenFields` 타입 정의 |
| `constants/forbidden-ids.ts` | Element 금지 ID 10개 (recall/validator에서 참조) |
| `server/survey-validation.service.ts` | 발행 시 4단계 검증에서 validators 모듈 호출 |
| `server/survey.controller.ts` | validate-entities 엔드포인트에서 reference-checker 호출 |
| i18n 15 로케일 | 검증 메시지 + recall 소스 라벨 |

## Precautions

- **런타임 엔진 미포함**: recall-resolver는 공유 유틸리티만 제공. 실제 설문 응답 시 치환 로직은 FSD-010에서 구현 예정
- **쿼터/followUp 참조 검사**: 현재 reference-checker는 로직/리콜만 검사. 쿼터/followUp은 해당 모듈 구현 시 확장 필요
- **Turbopack 호환**: 비구조화 할당에서 `!` non-null assertion 사용하지 않음
- **Recall 보안**: HTML 태그 제거(XSS 방지), 중첩 recall "___" 대체로 무한 재귀 방지
- **fallback 경고**: 빈 fallback은 오류가 아닌 경고로 처리 (발행 차단하지 않음)
