# FSD-016 Phase 4C: 복잡 Entity 컴포넌트 5종 구현

## Overview
설문 에디터의 나머지 복잡 Entity 컴포넌트 4종(FileUpload, Matrix, Address, ContactInfo)과 범용 유틸리티 컴포넌트 1종(ElementIdEditor)을 구현하여, 모든 15종 Element Entity의 placeholder를 실제 편집 가능한 컴포넌트로 교체 완료하였다. 이로써 `entity-components/index.tsx`에서 placeholder 팩토리 함수(`createPlaceholderComponent`)가 더 이상 필요하지 않게 되어 제거되었다.

## Changed Files

### 생성된 파일
- `libs/client/survey-editor/src/lib/components/elements-view/entity-components/FileUploadComponent.tsx`
  - 파일 업로드 질문 Entity 컴포넌트. 복수 파일 허용, 최대 크기, 허용 확장자 편집 지원
- `libs/client/survey-editor/src/lib/components/elements-view/entity-components/MatrixComponent.tsx`
  - 행렬(Matrix) 질문 Entity 컴포넌트. 행/열 CRUD 및 셔플 옵션(none/all/exceptLast) 선택 지원
- `libs/client/survey-editor/src/lib/components/elements-view/entity-components/AddressComponent.tsx`
  - 주소 입력 질문 Entity 컴포넌트. 6개 서브필드(addressLine1/2, city, state, zip, country)별 show/required 토글
- `libs/client/survey-editor/src/lib/components/elements-view/entity-components/ContactInfoComponent.tsx`
  - 연락처 정보 수집 질문 Entity 컴포넌트. 5개 서브필드(firstName, lastName, email, phone, company)별 show/required 토글
- `libs/client/survey-editor/src/lib/components/elements-view/entity-components/ElementIdEditor.tsx`
  - Element ID 편집 폼. isDraft 상태일 때만 편집 가능하며 validateElementId로 ID 유효성 검증
- `code-history/2026-02-24-fsd-016-phase4c-complex-entity-components.md`
  - 본 문서

### 수정된 파일
- `libs/client/survey-editor/src/lib/components/elements-view/entity-components/index.tsx`
  - 4개 placeholder(fileUpload, matrix, address, contactInfo)를 실제 컴포넌트로 교체
  - createPlaceholderComponent 팩토리 함수 및 미사용 import 제거
- `libs/client/survey-editor/src/lib/components/elements-view/BlockLogicEditor.tsx`
  - 기존 `setEntityAttributeValue` -> `setEntityAttribute` 오타 수정 (기존 버그)

## Major Changes

### 1. FileUploadComponent
`createEntityComponent(fileUploadEntity, ...)`으로 생성. 공통 헬퍼 `setAttr`을 통해 `builderStore.setEntityAttribute`를 호출한다.

- **headline**: `LocalizedInput`으로 다국어 질문 텍스트 입력
- **고급 설정**:
  - `allowMultipleFiles`: Switch 토글
  - `maxSizeInMB`: number Input
  - `allowedFileExtensions`: `ALLOWED_FILE_EXTENSIONS`(26종)를 순회하는 체크박스 그룹. 토글 시 배열에 추가/제거

### 2. MatrixComponent
행/열(rows/columns)을 MatrixChoice 배열로 관리하며, `@paralleldrive/cuid2`의 `createId()`로 고유 ID를 생성한다.

- **rows CRUD**: 추가(addRow), 수정(updateRowLabel), 삭제(removeRow)
- **columns CRUD**: 동일 패턴
- **고급 설정**: `shuffleOption`은 string enum(`none | all | exceptLast`)이므로 Select 컴포넌트로 구현

### 3. AddressComponent / ContactInfoComponent
서브필드 데이터는 배열이 아닌 **객체**(Record<FieldId, SubField>) 형태로 저장된다.

```typescript
// addressFields 구조
{
  addressLine1: { show: true, required: false },
  addressLine2: { show: true, required: false },
  city: { show: true, required: false },
  // ...
}
```

각 필드별 show/required Switch를 렌더링하며, `toggleFieldProp` 콜백으로 불변 업데이트를 수행한다.

### 4. ElementIdEditor
일반 React 컴포넌트(createEntityComponent 아님). isDraft가 false이면 읽기 전용, true이면 편집 가능한 Input + Save 버튼을 표시한다. `validateElementId` 유틸을 사용하여 패턴/중복 검사를 수행한다.

### 5. index.tsx 정리
모든 15종 Element Entity가 실제 컴포넌트로 구현되어 `createPlaceholderComponent` 팩토리 함수와 관련 import가 완전히 제거되었다.

## How to use it

컴포넌트들은 `entityComponentMap`을 통해 `BuilderEntities`에 자동 매핑되므로 별도 설정 없이 설문 에디터에서 해당 타입의 Element를 추가하면 자동으로 렌더링된다.

```tsx
// BuilderCanvas.tsx에서 이미 사용 중
import { entityComponentMap } from './entity-components/index';
<BuilderEntities components={entityComponentMap}>{...}</BuilderEntities>
```

ElementIdEditor는 개별 Entity 컴포넌트 내부에서 직접 import하여 사용한다:

```tsx
import { ElementIdEditor } from './ElementIdEditor';

<ElementIdEditor
  entityId={entity.id}
  currentId={currentId}
  existingIds={allElementIds}
  isDraft={isDraft}
  onIdChange={(newId) => { /* ID 변경 처리 */ }}
/>
```

## Related Components/Modules
- `@inquiry/survey-builder-config`: Entity 정의(fileUploadEntity, matrixEntity, addressEntity, contactInfoEntity), 타입(MatrixChoice, SubField, I18nString), 상수(ALLOWED_FILE_EXTENSIONS, ADDRESS_FIELD_IDS, CONTACT_INFO_FIELD_IDS)
- `@inquiry/client-ui`: Switch, Label, Input, Button, Select 등 UI 프리미티브
- `@coltorapps/builder-react`: createEntityComponent
- `ElementComponent`: 공통 카드 래퍼 (헤더, 메뉴, 고급 설정 접기/펼치기)
- `LocalizedInput`: 다국어 텍스트 입력 공유 컴포넌트
- `BuilderStoreContext`: builderStore 접근 Context
- `id-validation.ts`: validateElementId 유틸리티

## Precautions
- `shuffleOption`은 boolean이 아닌 string enum이므로 Switch가 아닌 Select로 구현하였다
- `builderStore`의 올바른 메서드명은 `setEntityAttribute`이며 `setEntityAttributeValue`가 아니다
- Address/ContactInfo의 서브필드 데이터는 배열이 아닌 객체(Record) 형태임에 유의
- ElementIdEditor의 ID 변경은 isDraft 상태에서만 허용되어, 배포된 설문의 ID 변경으로 인한 데이터 불일치를 방지한다
