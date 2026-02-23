# FSD-009 Validation Engine + Shuffle 유틸리티

## Overview
FSD-009 질문 유형 카탈로그의 핵심 인프라인 Validation Engine과 Shuffle 유틸리티를 구현했다.

Validation Engine은 설문 응답에 대해 24가지 검증 규칙(텍스트/숫자/날짜/선택/순위/행렬/파일)을 and/or 논리 결합으로 평가하는 도메인 로직 엔진이다. builder의 Entity validate와는 별개로, 클라이언트/서버 공유 패키지에서 응답 값의 유효성을 검증한다.

Shuffle 유틸리티는 Fisher-Yates 알고리즘을 사용하여 선택지 순서를 무작위화하며, 'none'(유지), 'all'(전체 셔플), 'exceptLast'(마지막 항목 고정) 옵션을 지원한다.

## Changed Files

### 신규 파일 - Validation 모듈
- `packages/survey-builder-config/src/lib/validation/validation-rule-type.ts` - 24가지 ValidationRule 유형 상수 및 타입 정의
- `packages/survey-builder-config/src/lib/validation/validation.types.ts` - ValidationRule, ValidationConfig, ValidationError, ValidationResult 인터페이스
- `packages/survey-builder-config/src/lib/validation/rules/text-rules.ts` - 텍스트 검증 규칙 10가지 (minLength, maxLength, pattern, email, url, phone, equals, doesNotEqual, contains, doesNotContain)
- `packages/survey-builder-config/src/lib/validation/rules/number-rules.ts` - 숫자 검증 규칙 4가지 (minValue, maxValue, isGreaterThan, isLessThan)
- `packages/survey-builder-config/src/lib/validation/rules/date-rules.ts` - 날짜 검증 규칙 4가지 (isLaterThan, isEarlierThan, isBetween, isNotBetween)
- `packages/survey-builder-config/src/lib/validation/rules/selection-rules.ts` - 선택 검증 규칙 2가지 (minSelections, maxSelections)
- `packages/survey-builder-config/src/lib/validation/rules/ranking-rules.ts` - 순위 검증 규칙 2가지 (minRanked, rankAll)
- `packages/survey-builder-config/src/lib/validation/rules/matrix-rules.ts` - 행렬 검증 규칙 2가지 (minRowsAnswered, answerAllRows)
- `packages/survey-builder-config/src/lib/validation/rules/file-rules.ts` - 파일 검증 규칙 2가지 (fileExtensionIs, fileExtensionIsNot)
- `packages/survey-builder-config/src/lib/validation/rules/index.ts` - 규칙 디스패처 (evaluateRule)
- `packages/survey-builder-config/src/lib/validation/validation.engine.ts` - 검증 엔진 (evaluateValidation)
- `packages/survey-builder-config/src/lib/validation/validation.utils.ts` - Entity 유형별 적용 가능 규칙 매핑 유틸리티
- `packages/survey-builder-config/src/lib/validation/index.ts` - Validation 모듈 공개 API re-export

### 신규 파일 - Shuffle 모듈
- `packages/survey-builder-config/src/lib/shuffle/shuffle.utils.ts` - Fisher-Yates 셔플 알고리즘 및 shuffleChoices 함수
- `packages/survey-builder-config/src/lib/shuffle/index.ts` - Shuffle 모듈 공개 API re-export

### 수정 파일
- `packages/survey-builder-config/src/index.ts` - Validation, Shuffle 모듈 export 추가

## Major Changes

### 1. Validation Rule 유형 체계 (24가지)
카테고리별로 분류된 24가지 검증 규칙 유형을 `as const` 배열로 정의하여 타입 안전성을 보장한다:

```typescript
export const VALIDATION_RULE_TYPES = [
  // 텍스트 (10가지)
  'minLength', 'maxLength', 'pattern', 'email', 'url', 'phone',
  'equals', 'doesNotEqual', 'contains', 'doesNotContain',
  // 숫자 (4가지)
  'minValue', 'maxValue', 'isGreaterThan', 'isLessThan',
  // 날짜 (4가지)
  'isLaterThan', 'isEarlierThan', 'isBetween', 'isNotBetween',
  // 선택 (2가지)
  'minSelections', 'maxSelections',
  // 순위 (2가지)
  'minRanked', 'rankAll',
  // 행렬 (2가지)
  'minRowsAnswered', 'answerAllRows',
  // 파일 (2가지)
  'fileExtensionIs', 'fileExtensionIsNot',
] as const;
```

### 2. 검증 엔진 (evaluateValidation)
ValidationConfig의 and/or 논리에 따라 여러 규칙을 결합 평가한다:
- `and`: 모든 규칙이 통과해야 유효, 실패한 규칙의 에러만 수집
- `or`: 하나 이상 통과하면 유효, 모두 실패 시 전체 에러 수집

### 3. 규칙 디스패처 (evaluateRule)
`rule.field`가 지정된 경우 복합 객체(Address, ContactInfo 등)에서 서브 필드 값을 추출하여 평가한다. 알 수 없는 규칙 유형은 통과(valid: true)로 처리한다.

### 4. Entity 유형별 규칙 매핑
`getApplicableRules(entityType)`로 해당 질문 유형에 사용 가능한 검증 규칙 목록을 조회할 수 있다.

### 5. Fisher-Yates 셔플
원본 배열을 변경하지 않고 새 배열을 반환하며, `exceptLast` 옵션으로 "기타" 등 마지막 항목을 고정할 수 있다.

## How to use it

### 검증 엔진 사용
```typescript
import { evaluateValidation } from '@inquiry/survey-builder-config';
import type { ValidationConfig } from '@inquiry/survey-builder-config';

const config: ValidationConfig = {
  logic: 'and',
  rules: [
    { id: 'r1', type: 'minLength', params: { min: 3 } },
    { id: 'r2', type: 'maxLength', params: { max: 100 } },
    { id: 'r3', type: 'email' },
  ],
};

const result = evaluateValidation(config, 'user@example.com');
// { valid: true, errors: [] }

const failResult = evaluateValidation(config, 'ab');
// { valid: false, errors: [{ ruleType: 'minLength', messageKey: 'validation.error.minLength', params: { min: 3 } }] }
```

### 서브 필드 검증 (Address/ContactInfo)
```typescript
import { evaluateRule } from '@inquiry/survey-builder-config';

const rule = { id: 'r1', type: 'email' as const, field: 'email' };
const addressValue = { street: '123 Main St', email: 'user@example.com' };
const result = evaluateRule(rule, addressValue);
// { valid: true, errors: [] }
```

### 적용 가능 규칙 조회
```typescript
import { getApplicableRules, isRuleApplicable } from '@inquiry/survey-builder-config';

const rules = getApplicableRules('openText');
// ['minLength', 'maxLength', 'pattern', 'email', ...]

const applicable = isRuleApplicable('date', 'isBetween');
// true
```

### 선택지 셔플
```typescript
import { shuffleChoices } from '@inquiry/survey-builder-config';

const choices = ['A', 'B', 'C', 'D', '기타'];

shuffleChoices(choices, 'none');       // ['A', 'B', 'C', 'D', '기타'] (원본 순서)
shuffleChoices(choices, 'all');        // ['C', 'A', 'D', '기타', 'B'] (무작위)
shuffleChoices(choices, 'exceptLast'); // ['D', 'A', 'C', 'B', '기타'] (마지막 고정)
```

## Related Components/Modules
- `@inquiry/survey-builder-config` - 이 패키지의 lib/ 내에 위치
- `@coltorapps/builder` - Entity 정의 및 빌더 프레임워크 (Entity validate와 별개)
- 향후 Entity 파일들에서 ValidationConfig를 attribute로 사용할 예정
- 클라이언트 UI에서 `messageKey`를 i18n으로 번역하여 에러 메시지 표시

## Precautions
- 검증 에러의 `messageKey`는 클라이언트 i18n 번역 키로 사용됨 (예: `validation.error.minLength`)
- `evaluatePattern`에서 잘못된 정규식이 전달되면 검증 실패로 처리됨
- 날짜 규칙은 JavaScript Date 파싱에 의존하므로 ISO 8601 형식 권장
- `shuffleChoices`는 원본 배열을 변경하지 않고 항상 새 배열을 반환
- `VALIDATION_RULE_MAP`은 `validation.utils.ts`에 인라인 정의되어 있으며, 향후 constants로 통합 가능
