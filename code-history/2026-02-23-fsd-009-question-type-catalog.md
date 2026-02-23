# FSD-009 질문 유형 카탈로그 - Types, Constants, Attributes

## Overview
FSD-009 질문 유형 카탈로그 구현의 기반 작업으로, `survey-builder-config` 패키지에 모든 질문 유형이 공유하는 타입 정의, 상수, 그리고 40개의 속성(attribute) 파일을 생성했다.

기존에 평면(flat) 구조로 관리되던 4개의 속성 파일(headline, required, description, placeholder)을 삭제하고, 기능 도메인별로 분류된 12개 하위 디렉터리 구조로 재편하여 확장성과 유지보수성을 개선했다.

## Changed Files

### types/ (4 files)
- `src/lib/types/localized-string.ts` — 다국어 문자열(LocalizedString) 타입 및 필수/선택 Zod 스키마 정의
- `src/lib/types/choice.types.ts` — Choice, PictureChoice, MatrixChoice 인터페이스 및 Zod 스키마
- `src/lib/types/sub-field.types.ts` — SubField 인터페이스, AddressFieldId/ContactInfoFieldId 타입 및 ID 배열
- `src/lib/types/index.ts` — types/ 디렉터리 배럴 re-export

### constants/ (4 files)
- `src/lib/constants/forbidden-ids.ts` — 시스템 예약 Element ID 10개 (as const)
- `src/lib/constants/allowed-file-extensions.ts` — 허용 파일 확장자 26가지 (as const)
- `src/lib/constants/validation-rule-map.ts` — 질문 유형별 허용 검증 규칙 매핑
- `src/lib/constants/index.ts` — constants/ 디렉터리 배럴 re-export

### attributes/ (41 files: 40 attribute + 1 barrel)
- `attributes/common/` (6개) — headline, subheader, required, imageUrl, videoUrl, isDraft
- `attributes/text/` (7개) — placeholder, longAnswer, inputType, insightsEnabled, charLimitEnabled, minLength, maxLength
- `attributes/choice/` (6개) — choices, pictureChoices, shuffleOption, displayType, otherOptionPlaceholder, allowMulti
- `attributes/scale/` (5개) — scale, range, lowerLabel, upperLabel, isColorCodingEnabled
- `attributes/cta/` (3개) — dismissible, buttonUrl, buttonLabel
- `attributes/consent/` (1개) — label
- `attributes/date/` (2개) — dateFormat, html
- `attributes/file/` (3개) — allowMultipleFiles, maxSizeInMB, allowedFileExtensions
- `attributes/cal/` (2개) — calUserName, calHost
- `attributes/matrix/` (2개) — rows, columns
- `attributes/sub-field/` (2개) — addressFields, contactInfoFields
- `attributes/validation/` (1개) — validationConfig
- `attributes/index.ts` — 전체 속성 배럴 re-export

### 수정된 기존 파일
- `src/index.ts` — 새로운 types, constants, attributes 전체 export 추가, 삭제된 descriptionAttribute 참조 제거
- `src/lib/entities/open-text.entity.ts` — descriptionAttribute를 subheaderAttribute로 교체

## Major Changes

### 1. 다국어 문자열 타입 시스템
`LocalizedString = Record<string, string>` 타입을 기반으로 필수/선택 두 가지 Zod 스키마를 정의했다.
```typescript
// 필수: 최소 1개 언어의 비어있지 않은 값 필요
export const localizedStringRequiredSchema = z
  .record(z.string(), z.string())
  .refine((obj) => Object.values(obj).some((v) => v.trim().length > 0), {
    message: '최소 1개 언어의 값이 필요합니다',
  });
```

### 2. 속성 도메인별 분류 (12개 하위 디렉터리)
모든 속성을 기능 도메인에 따라 분류하여, 각 질문 유형 엔티티가 필요한 속성만 선택적으로 가져올 수 있도록 했다.

### 3. 복합 필드 스키마 (addressFields, contactInfoFields)
`ADDRESS_FIELD_IDS` / `CONTACT_INFO_FIELD_IDS` 배열로부터 동적으로 Zod 스키마를 생성한다:
```typescript
const addressFieldsSchema = z.object(
  Object.fromEntries(
    ADDRESS_FIELD_IDS.map((id) => [id, subFieldSchema])
  ) as Record<string, typeof subFieldSchema>
);
```

### 4. 파일 확장자 검증
`ALLOWED_FILE_EXTENSIONS` 상수와 refine을 조합하여 허용되지 않은 확장자를 차단한다.

## How to use it

### 새 질문 유형 엔티티에서 속성 사용
```typescript
import { createEntity } from '@coltorapps/builder';
import {
  headlineAttribute,
  requiredAttribute,
  choicesAttribute,
  shuffleOptionAttribute,
  allowMultiAttribute,
} from '../attributes/index';

export const multipleChoiceEntity = createEntity({
  name: 'multipleChoice',
  attributes: [
    headlineAttribute,
    requiredAttribute,
    choicesAttribute,
    shuffleOptionAttribute,
    allowMultiAttribute,
  ],
});
```

### 타입/상수 직접 import
```typescript
import {
  type LocalizedString,
  localizedStringRequiredSchema,
  FORBIDDEN_IDS,
  ALLOWED_FILE_EXTENSIONS,
  VALIDATION_RULE_MAP,
} from '@inquiry/survey-builder-config';
```

## Related Components/Modules
- `@coltorapps/builder` — `createAttribute` API를 통해 모든 속성이 빌더 시스템에 등록됨
- `src/lib/entities/` — 각 질문 유형 엔티티가 이 속성들을 조합하여 사용 (향후 FSD-009 후속 작업)
- `src/lib/validation/` — `VALIDATION_RULE_MAP` 상수와 연계하여 질문 유형별 검증 규칙 적용
- `src/lib/types.ts` — 기존 설문 구조 타입(WelcomeCard, SurveyEnding 등)과 공존

## Precautions
- Zod 4 (v4.3.6)를 사용하고 있으므로 Zod 3과 API 차이가 있을 수 있음
- `descriptionAttribute`가 삭제되어 `subheaderAttribute`로 대체됨 — 기존 데이터 마이그레이션 필요 여부 확인 필요
- 엔티티(entity) 파일은 이 작업에 포함되지 않음 — 별도 후속 작업에서 생성 예정
- `as const` 배열의 타입 추론을 위해 TypeScript 5.0+ 권장
