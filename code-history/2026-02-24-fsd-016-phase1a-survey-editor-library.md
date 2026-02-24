# FSD-016 Phase 1A: `@inquiry/client-survey-editor` 라이브러리 설정 + 유틸리티 + 타입 정의

## Overview
설문 에디터(`SurveyEditor`)를 구현하기 위한 기반 라이브러리 패키지 `@inquiry/client-survey-editor`를 생성한다.
이 패키지는 설문 에디터의 핵심 유틸리티 함수(스키마 변환, ID 검증, 블록 번호 매핑, 발행 전 검증)와 Context 타입 정의를 포함하며, 이후 Phase에서 구현될 컴포넌트와 훅의 기반이 된다.

## Changed Files

### 생성된 파일

- **`libs/client/survey-editor/package.json`**: 패키지 메타데이터 및 의존성 정의. `@inquiry/client-survey`, `@inquiry/client-styling`, `@inquiry/client-multilingual`, `@inquiry/survey-builder-config` 등 workspace 패키지와 `@coltorapps/builder-react`, `@dnd-kit/core`, `@dnd-kit/sortable` 등 외부 의존성 포함.
- **`libs/client/survey-editor/tsconfig.json`**: 프로젝트 참조용 루트 tsconfig.
- **`libs/client/survey-editor/tsconfig.lib.json`**: 라이브러리 빌드용 tsconfig. React JSX, DOM 타입, bundler 모듈 해석 설정. survey-builder-config, ui, core, survey, styling, multilingual 프로젝트 참조 포함.
- **`libs/client/survey-editor/src/index.ts`**: 패키지 진입점. 모든 유틸리티 함수와 타입을 re-export.
- **`libs/client/survey-editor/src/lib/utils/schema-converter.ts`**: `SurveyDetail` ↔ Builder Schema + `SurveyMeta` 변환 유틸리티. `surveyToBuilderData()`는 서버 응답을 Builder Store 초기 데이터와 메타데이터로 분리하고, `builderDataToSurvey()`는 현재 상태를 서버 전송용 `UpdateSurveyInput`으로 병합한다.
- **`libs/client/survey-editor/src/lib/utils/id-validation.ts`**: Element ID와 Hidden Field ID 검증 유틸리티. `survey-builder-config`의 `validateId`/`validateHiddenFieldId`를 래핑하여 에디터 컨텍스트에 맞는 중복 검사 로직을 추가한다.
- **`libs/client/survey-editor/src/lib/utils/block-numbering.ts`**: Builder Store의 root 배열 순서에 따라 `"Block {N}"` 라벨을 매핑하는 유틸리티.
- **`libs/client/survey-editor/src/lib/utils/survey-validation.ts`**: 설문 발행 전 클라이언트 검증 유틸리티. 스키마 존재, 최소 블록/질문 수, headline 존재, 종료 카드 설정 등 7가지 항목을 검증한다.
- **`libs/client/survey-editor/src/lib/context/types.ts`**: 편집기 Context 타입 정의. `EditorUIState`/`EditorUIAction`(UI 상태 관리)과 `SurveyMetaState`/`SurveyMetaAction`(메타데이터 상태 관리) 타입을 포함한다.

## Major Changes

### 1. 스키마 변환 (`schema-converter.ts`)
서버에서 조회한 `SurveyDetail`을 두 가지 상태로 분리하는 패턴을 도입:
- **Builder Schema**: `@coltorapps/builder-react`가 관리하는 entities/root 구조
- **SurveyMeta**: Builder 외부에서 관리하는 메타데이터 (이름, 상태, 웰컴카드, 종료카드, 히든필드, 변수, 스타일링 등)

```typescript
// 서버 응답 → 에디터 상태 분리
const { schema, meta } = surveyToBuilderData(surveyDetail);

// 에디터 상태 → 서버 전송용 병합
const updateInput = builderDataToSurvey(currentSchema, currentMeta);
```

### 2. ID 검증 래퍼 (`id-validation.ts`)
`validateElementId`는 현재 편집 중인 Entity의 ID를 제외하고 중복 검사를 수행하여, 자기 자신의 ID를 수정하지 않을 때 오류가 발생하지 않도록 한다.

### 3. 발행 전 검증 (`survey-validation.ts`)
7가지 검증 항목을 순차적으로 수행하며, errors(발행 차단)와 warnings(경고만 표시)를 분리하여 반환한다. `invalidEntityIds`를 통해 UI에서 오류가 있는 요소를 하이라이트할 수 있다.

### 4. Context 타입 (`types.ts`)
편집기의 두 가지 독립적인 상태 영역을 정의:
- **EditorUIState**: 활성 탭, 선택 요소, 자동 저장 상태, 블록 펼침 상태 등 UI 전용 상태
- **SurveyMetaState**: 설문 메타데이터 (웰컴카드, 종료카드, 히든필드, 변수 등)

## How to use it

```typescript
import {
  surveyToBuilderData,
  builderDataToSurvey,
  validateElementId,
  validateHiddenFieldIdForEditor,
  getBlockLabels,
  validateSurveyForPublish,
} from '@inquiry/client-survey-editor';
import type {
  EditorUIState,
  SurveyMetaState,
  EditorUIAction,
  SurveyMetaAction,
} from '@inquiry/client-survey-editor';

// 1. 서버 응답을 에디터 상태로 변환
const { schema, meta } = surveyToBuilderData(surveyDetail);

// 2. Element ID 검증 (편집 시)
const result = validateElementId('myId', existingIds, currentEntityId);
if (!result.valid) console.error(result.error);

// 3. 블록 라벨 생성
const labels = getBlockLabels(['block_1', 'block_2']);
// { block_1: 'Block 1', block_2: 'Block 2' }

// 4. 발행 전 검증
const validation = validateSurveyForPublish(schema, meta);
if (!validation.valid) {
  validation.errors.forEach(e => console.error(e));
  validation.invalidEntityIds.forEach(id => highlightElement(id));
}
```

## Related Components/Modules

- **`@inquiry/survey-builder-config`**: Builder 엔티티/속성 정의, ID 검증 함수, 타입 정의 (WelcomeCard, SurveyEnding 등)
- **`@inquiry/client-survey`**: SurveyDetail, UpdateSurveyInput 타입 및 API 함수
- **`@inquiry/client-styling`**: 스타일링 컴포넌트 (StylingForm, SurveyStylingTab)
- **`@inquiry/client-multilingual`**: 다국어 관리 컴포넌트
- **`@coltorapps/builder-react`**: Builder Store 및 React 통합

## Precautions

- `SurveyMeta`(schema-converter.ts)와 `SurveyMetaState`(context/types.ts)는 동일한 구조를 유지해야 한다. 한쪽을 수정하면 다른 쪽도 반드시 동기화해야 한다.
- `validateSurveyForPublish`는 클라이언트 사전 검증용이며, 서버 측 검증을 대체하지 않는다.
- Builder Schema의 내부 구조(`entities`, `root`)는 `@coltorapps/builder` 라이브러리에 의해 정의되므로, 직접 수정 시 주의가 필요하다.
