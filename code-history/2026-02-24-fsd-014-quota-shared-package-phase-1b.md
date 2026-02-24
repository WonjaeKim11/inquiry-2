# FSD-014 쿼터 관리 구현 - Phase 1-B: 공유 패키지 quota 타입/상수/검증

## Overview
FSD-014 쿼터 관리 기능의 Phase 1-B로, `@inquiry/survey-builder-config` 공유 패키지에 quota 모듈을 추가한다.
설문 빌더와 서버 양쪽에서 사용할 쿼터 관련 타입 정의, Zod 검증 스키마, 상수, 검증 함수를 제공하여
쿼터 기능의 도메인 모델을 통일한다.

## Changed Files

### 생성된 파일
- `packages/survey-builder-config/src/lib/quota/types.ts` - QuotaDefinition, QuotaEvaluationInput/Result, QuotaCheckSummary 타입 및 Zod 스키마 정의
- `packages/survey-builder-config/src/lib/quota/constants.ts` - 설문 당 최대 쿼터 수, 이름 길이 제한, 이름 유효 패턴 상수
- `packages/survey-builder-config/src/lib/quota/validator.ts` - 쿼터 이름/조건/통합 검증 함수 (validateQuotaName, validateQuotaConditions, validateQuotas)
- `packages/survey-builder-config/src/lib/quota/index.ts` - quota 모듈 barrel export

### 수정된 파일
- `packages/survey-builder-config/src/index.ts` - 패키지 루트에서 quota 모듈 전체 re-export 추가

## Major Changes

### 1. 타입 시스템 (types.ts)
- `QuotaAction`: 쿼터 한도 초과 시 'endSurvey' 또는 'continueSurvey' 액션
- `QuotaDefinition`: 쿼터 정의 인터페이스 (id, name, limit, logic, action, endingCardId, countPartialSubmissions)
  - `logic` 필드는 기존 로직 모듈의 `ConditionGroup` 또는 빈 객체(`Record<string, never>`)를 허용
- `QuotaEvaluationInput/Result`: 런타임 쿼터 평가를 위한 입출력 타입
- `QuotaCheckSummary`: 여러 쿼터 평가 후 요약 정보
- `quotaDefinitionSchema`: Zod v4 스키마로 `conditionGroupSchema`와 `z.object({}).strict()` union 사용

### 2. 상수 (constants.ts)
- `MAX_QUOTAS_PER_SURVEY = 50`: 설문 당 최대 쿼터 수
- `QUOTA_NAME_MAX_LENGTH = 100`: 쿼터 이름 최대 길이
- `QUOTA_NAME_PATTERN`: 유니코드 문자, 숫자, 공백, 하이픈, 언더스코어만 허용하는 정규식

### 3. 검증 로직 (validator.ts)
- `validateQuotaName()`: 이름 빈값/길이/패턴 검증
- `validateQuotaConditions()`: 빈 객체면 통과, ConditionGroup이면 기존 `validateConditionGroup()` 위임
- `validateQuotas()`: 설문 전체 쿼터 목록 통합 검증
  - 최대 갯수 초과 검사
  - 이름 중복 검사 (대소문자 무시)
  - 개별 이름/limit/endingCardId/조건 검증

> **참고**: 원본 스펙에서 `validateQuotaConditions`와 `validateQuotas`에 elementIds, blockIds 등의 매개변수가 포함되어 있었으나, 기존 `validateConditionGroup` 함수의 실제 시그니처가 `(group, depth?)` 만 받으므로 불필요한 매개변수를 제거하여 컴파일 오류를 방지했다.

## How to use it

```typescript
import {
  type QuotaDefinition,
  quotaDefinitionSchema,
  validateQuotas,
  validateQuotaName,
  MAX_QUOTAS_PER_SURVEY,
} from '@inquiry/survey-builder-config';

// Zod 스키마로 쿼터 정의 파싱
const parsed = quotaDefinitionSchema.parse({
  id: 'quota-1',
  name: 'Male Quota',
  limit: 100,
  logic: {}, // 빈 객체 = 모든 응답 카운트
  action: 'endSurvey',
  endingCardId: 'ending-1',
  countPartialSubmissions: false,
});

// 이름 검증
const nameResult = validateQuotaName('My Quota');
// { valid: true }

// 전체 쿼터 목록 검증
const quotas: QuotaDefinition[] = [parsed];
const endingCardIds = ['ending-1', 'ending-2'];
const result = validateQuotas(quotas, endingCardIds);
// { valid: true, errors: [] }
```

## Related Components/Modules
- `packages/survey-builder-config/src/lib/logic/types/condition.types.ts` - ConditionGroup, conditionGroupSchema 참조
- `packages/survey-builder-config/src/lib/logic/validators/condition-validator.ts` - validateConditionGroup 함수 위임
- Phase 1-A (`2026-02-24-fsd-014-quota-schema-phase-1a.md`) - DB 스키마 정의 (이 Phase의 타입과 대응)

## Precautions
- `validateConditionGroup`의 실제 시그니처는 `(group, depth?)` 이므로, 쿼터 조건 검증 시 element/block/hiddenField/variable ID 기반 참조 무결성 검증은 별도 validator 모듈에서 수행해야 한다.
- Zod v4 환경에서 동작하며, `z.object({}).strict()`로 빈 객체의 추가 속성을 차단한다.
- `QUOTA_NAME_PATTERN`은 유니코드 속성 이스케이프(`\p{L}`, `\p{N}`)를 사용하므로 `u` 플래그가 필수이다.
