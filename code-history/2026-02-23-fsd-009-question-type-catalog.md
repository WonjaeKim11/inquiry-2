# FSD-009 질문 유형 카탈로그

## Overview

4단계 두 번째 기능으로 **질문 유형 카탈로그**를 구현했다. FSD-008에서 구축한 설문 빌더 공유 패키지(`packages/survey-builder-config/`)를 대폭 확장하여, 기존 2개 Entity(Block, OpenText)에서 **16개 Entity**(1개 Block + 15개 질문 유형)로 확대하고, 40개 Attribute, 24가지 Validation Rule 엔진, Shuffle 유틸리티를 추가했다.

`@coltorapps/builder`의 Entity/Attribute/Schema 패턴을 전면 활용하여, 서버/클라이언트가 동일한 설문 스키마 정의를 공유한다. DB 스키마 변경 없이 `packages/survey-builder-config/` 패키지 내에서 완결되는 스키마 정의 중심 작업이다.

## Changed Files

### 신규 타입 정의 (`src/lib/types/`)

| 경로 | 역할 |
|------|------|
| `types/localized-string.ts` | `LocalizedString` 타입 + 필수/선택 Zod 스키마 |
| `types/choice.types.ts` | `Choice`, `PictureChoice`, `MatrixChoice` 인터페이스 + Zod 스키마 |
| `types/sub-field.types.ts` | `SubField` 인터페이스, `AddressFieldId`/`ContactInfoFieldId` 타입 |
| `types/index.ts` | barrel re-export |

### 신규 상수 정의 (`src/lib/constants/`)

| 경로 | 역할 |
|------|------|
| `constants/forbidden-ids.ts` | 금지 Element ID 10개 (suid, odp, userId 등) |
| `constants/allowed-file-extensions.ts` | 허용 파일 확장자 26가지 |
| `constants/validation-rule-map.ts` | Entity Type → ValidationRuleType 매핑 |
| `constants/index.ts` | barrel re-export |

### 속성 정의 (`src/lib/attributes/`) — 40개 Attribute, 12개 카테고리

| 카테고리 | 파일 수 | Attribute 목록 |
|---------|--------|--------------|
| `common/` | 6 | headline, subheader, required, imageUrl, videoUrl, isDraft |
| `text/` | 7 | placeholder, longAnswer, inputType, insightsEnabled, charLimitEnabled, minLength, maxLength |
| `choice/` | 6 | choices, pictureChoices, shuffleOption, displayType, otherOptionPlaceholder, allowMulti |
| `scale/` | 5 | scale, range, lowerLabel, upperLabel, isColorCodingEnabled |
| `cta/` | 3 | dismissible, buttonUrl, buttonLabel |
| `consent/` | 1 | label |
| `date/` | 2 | dateFormat, html |
| `file/` | 3 | allowMultipleFiles, maxSizeInMB, allowedFileExtensions |
| `cal/` | 2 | calUserName, calHost |
| `matrix/` | 2 | rows, columns |
| `sub-field/` | 2 | addressFields, contactInfoFields |
| `validation/` | 1 | validationConfig |

### 엔티티 정의 (`src/lib/entities/`) — 16개 Entity

| Entity | 이름 | 고유 속성 (공통 6개 외) |
|--------|------|----------------------|
| Block | block | (컨테이너, 속성 없음) |
| OpenText | openText | placeholder, longAnswer, inputType, insightsEnabled, charLimitEnabled, minLength, maxLength, validationConfig |
| MultipleChoiceSingle | multipleChoiceSingle | choices, shuffleOption, displayType, otherOptionPlaceholder |
| MultipleChoiceMulti | multipleChoiceMulti | choices, shuffleOption, displayType, otherOptionPlaceholder, validationConfig |
| NPS | nps | lowerLabel, upperLabel, isColorCodingEnabled |
| CTA | cta | dismissible, buttonUrl, buttonLabel |
| Rating | rating | scale, range, lowerLabel, upperLabel, isColorCodingEnabled |
| Consent | consent | label |
| PictureSelection | pictureSelection | pictureChoices, allowMulti, validationConfig |
| Date | date | dateFormat, html, validationConfig |
| FileUpload | fileUpload | allowMultipleFiles, maxSizeInMB, allowedFileExtensions, validationConfig |
| Cal | cal | calUserName, calHost |
| Matrix | matrix | rows, columns, shuffleOption, validationConfig |
| Address | address | addressFields, validationConfig |
| Ranking | ranking | choices, shuffleOption, otherOptionPlaceholder, validationConfig |
| ContactInfo | contactInfo | contactInfoFields, validationConfig |

### Validation Engine (`src/lib/validation/`)

| 경로 | 역할 |
|------|------|
| `validation-rule-type.ts` | 24가지 `ValidationRuleType` enum |
| `validation.types.ts` | ValidationRule, ValidationConfig, ValidationError, ValidationResult 타입 |
| `validation.engine.ts` | `evaluateValidation()` — and/or 논리 결합 평가 엔진 |
| `validation.utils.ts` | `getApplicableRules()`, `isRuleApplicable()` |
| `rules/text-rules.ts` | 텍스트 Rule 10가지 |
| `rules/number-rules.ts` | 숫자 Rule 4가지 |
| `rules/date-rules.ts` | 날짜 Rule 4가지 |
| `rules/selection-rules.ts` | 선택 Rule 2가지 |
| `rules/ranking-rules.ts` | 순위 Rule 2가지 |
| `rules/matrix-rules.ts` | 행렬 Rule 2가지 |
| `rules/file-rules.ts` | 파일 Rule 2가지 |
| `rules/index.ts` | `evaluateRule()` 디스패처 |

### Shuffle 유틸리티 (`src/lib/shuffle/`)

| 경로 | 역할 |
|------|------|
| `shuffle/shuffle.utils.ts` | Fisher-Yates 셔플. `shuffleChoices(choices, option)` |

### 수정 파일

| 경로 | 변경 내용 |
|------|-----------|
| `src/lib/survey-builder.ts` | 16개 Entity 등록, entitiesExtensions, 금지 ID 검증, ELEMENT_ENTITY_NAMES export |
| `src/lib/entities/index.ts` | 16개 Entity barrel re-export |
| `src/index.ts` | 모든 신규 모듈 barrel export |

### 삭제 파일

| 경로 | 사유 |
|------|------|
| `attributes/headline.attribute.ts` | `common/`로 이동 |
| `attributes/required.attribute.ts` | `common/`로 이동 |
| `attributes/description.attribute.ts` | `common/subheader.attribute.ts`로 변경 |
| `attributes/placeholder.attribute.ts` | `text/`로 이동 |

## Major Changes

### 1. Attribute 원자적 설계 (40개)

`createAttribute()` 패턴으로 각 속성을 개별 정의. Zod 검증으로 타입 안전성 보장:

```typescript
// 필수 다국어 문자열
export const headlineAttribute = createAttribute({
  name: 'headline',
  validate(value) { return localizedStringRequiredSchema.parse(value); },
});

// enum 타입
export const inputTypeAttribute = createAttribute({
  name: 'inputType',
  validate(value) { return z.enum(['text', 'email', 'url', 'number', 'phone']).parse(value); },
});

// 배열 최소 개수
export const choicesAttribute = createAttribute({
  name: 'choices',
  validate(value) { return z.array(choiceSchema).min(2).parse(value); },
});
```

### 2. 15가지 질문 Entity

모든 질문 Entity는 공통 6개 Attribute를 포함하고 `parentRequired: true`:

```typescript
export const ratingEntity = createEntity({
  name: 'rating',
  attributes: [
    headlineAttribute, requiredAttribute, subheaderAttribute,
    imageUrlAttribute, videoUrlAttribute, isDraftAttribute,
    scaleAttribute, rangeAttribute, lowerLabelAttribute,
    upperLabelAttribute, isColorCodingEnabledAttribute,
  ],
  parentRequired: true,
});
```

### 3. 교차 검증 (attributesExtensions)

**OpenText**: charLimitEnabled=true 시 minLength ≤ maxLength 검증
**CTA**: dismissible=true 시 buttonUrl, buttonLabel 필수 검증

```typescript
// CTA Entity의 조건부 필수 교차 검증
attributesExtensions: {
  buttonUrl: {
    validate(value, context) {
      const validated = context.validate(value);
      if (context.entity.attributes.dismissible === true && !validated) {
        throw new Error('외부 버튼 활성화 시 버튼 URL은 필수입니다');
      }
      return validated;
    },
  },
},
```

### 4. Builder 확장 (16개 Entity)

```typescript
export const surveyBuilder = createBuilder({
  entities: [blockEntity, openTextEntity, ...], // 16개
  entitiesExtensions: {
    block: { childrenAllowed: [...ELEMENT_ENTITY_NAMES] },
    openText: { parentRequired: true, allowedParents: ['block'] },
    // ... 모든 질문 Entity 동일
  },
  generateEntityId() { /* CUID2 + 금지 ID 충돌 회피 */ },
  validateEntityId(id) { /* 정규식 + CUID + 금지 ID 검증 */ },
  validateSchema(schema) { /* 최소 1 블록 + 1 질문 */ },
});
```

### 5. Validation Engine (24가지 Rule)

```typescript
const result = evaluateValidation(
  { logic: 'and', rules: [
    { id: '1', type: 'minLength', params: { min: 5 } },
    { id: '2', type: 'email', params: {} },
  ]},
  'test@example.com'
);
```

### 6. Shuffle 유틸리티

```typescript
shuffleChoices(choices, 'exceptLast'); // 마지막 고정, 나머지 셔플
```

## How to use it

### import 예시

```typescript
import {
  surveyBuilder,
  openTextEntity, ratingEntity, // Entity
  headlineAttribute, choicesAttribute, // Attribute
  evaluateValidation, getApplicableRules, // Validation
  shuffleChoices, // Shuffle
  ELEMENT_ENTITY_NAMES, FORBIDDEN_IDS, // Constants
  type LocalizedString, type Choice, // Types
} from '@inquiry/survey-builder-config';
```

### Entity별 Validation Rule 조회

```typescript
const rules = getApplicableRules('openText');
// ['minLength', 'maxLength', 'pattern', 'email', 'url', 'phone', ...]

const applicable = isRuleApplicable('date', 'isBetween'); // true
const notApplicable = isRuleApplicable('nps', 'minLength'); // false
```

## Related Components/Modules

- **FSD-008 설문 생성/유형/라이프사이클**: Survey `schema` JSON 필드에 builder Schema 저장. SurveyValidationService에서 `surveyBuilder.validateSchema()` 호출
- **@coltorapps/builder v0.2.4**: Entity/Attribute/Schema 패턴. `createEntity`, `createAttribute`, `createBuilder` API
- **서버 Survey 모듈** (`libs/server/survey/`): 발행 시 스키마 검증 + 응답 시 Validation Engine 사용
- **클라이언트 Survey 라이브러리** (`libs/client/survey/`): useBuilderStore에서 Entity Attribute 실시간 검증

## Precautions

- **FS-010 (설문 편집기 UX)에서 React 바인딩 추가 예정**: `@coltorapps/builder-react` 컴포넌트는 미포함
- **description → subheader 이름 변경**: FSD-008의 `descriptionAttribute`가 `subheaderAttribute`로 변경됨
- **Block Entity에 logicItems/logicFallback 미포함**: 조건부 로직 속성은 FSD-012에서 추가 예정
- **Validation Engine 에러**: `messageKey` 번역 키 반환 → 클라이언트 i18n에서 처리 (FSD-010에서 추가)
- **파일 크기 검증**: FileUpload 실제 파일 크기는 클라이언트 Interpreter에서 수행
- **Cal.com 연동 미구현**: 스키마 정의만 포함, 실제 위젯은 Cal.com SDK 연동 시 구현
- **shared-types 패키지 미생성**: FSD-012에서 EntityType, ValidationRule 타입 재내보내기 추가 예정
