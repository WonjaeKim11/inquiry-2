# FSD Phase 5B: Logic + Validation 에디터 구현

## Overview

Block Logic 편집기(BlockLogicEditor)와 Validation Rules 편집기(ValidationRulesEditor)를 구현하여 설문 에디터에서 조건부 로직 및 검증 규칙을 시각적으로 편집할 수 있도록 한다.

기존 BlockSettings에 있던 Logic 편집 placeholder를 실제 BlockLogicEditor 컴포넌트로 교체하고, Element 유형별 검증 규칙 편집을 위한 ValidationRulesEditor를 신규 생성했다.

## Changed Files

| 파일 | 변경 유형 | 역할 |
|------|-----------|------|
| `libs/client/survey-editor/src/lib/components/elements-view/BlockLogicEditor.tsx` | 생성 | Block의 logicItems, logicFallback을 편집하는 Logic 편집기 컴포넌트 |
| `libs/client/survey-editor/src/lib/components/elements-view/ValidationRulesEditor.tsx` | 생성 | Element 유형별 검증 규칙을 편집하는 Validation 편집기 컴포넌트 |
| `libs/client/survey-editor/src/lib/components/elements-view/BlockSettings.tsx` | 수정 | Logic placeholder를 BlockLogicEditor로 교체, builderStore 데이터 읽기 통합 |
| `libs/client/survey-editor/src/index.ts` | 수정 | BlockLogicEditor, ValidationRulesEditor를 barrel export에 추가 |

## Major Changes

### 1. BlockLogicEditor

`@inquiry/survey-builder-config`의 Logic CRUD 유틸 함수들(addLogicItem, removeLogicItem, addCondition, removeCondition, toggleConnector, addAction, removeAction)을 활용하여 ConditionGroup 기반 조건부 로직을 편집한다.

핵심 구현:

- **LogicItem CRUD**: 각 LogicItem은 id, conditions(ConditionGroup), actions(Action[])로 구성. `addLogicItem(items, newItem)` / `removeLogicItem(items, itemId)` 사용
- **조건 관리**: `addCondition(group, condition)` / `removeCondition(group, conditionId)` / `toggleConnector(group)`로 AND/OR 전환
- **액션 관리**: `addAction(logicItem, action)` / `removeAction(logicItem, actionId)`로 액션 추가/삭제
- **Fallback 설정**: 모든 조건 불일치 시 이동할 블록을 Select로 설정
- **접기/펼치기**: 각 LogicItem별 expandedItems 상태로 UI 간소화

```typescript
// Logic 유틸 함수의 실제 시그니처 (task 설명과 다름)
addLogicItem(items: LogicItem[], newItem: LogicItem): LogicItem[]
removeLogicItem(items: LogicItem[], itemId: string): LogicItem[]
addCondition(group: ConditionGroup, condition: SingleCondition): ConditionGroup
removeCondition(group: ConditionGroup, conditionId: string): ConditionGroup
toggleConnector(group: ConditionGroup): ConditionGroup
addAction(logicItem: LogicItem, action: Action): LogicItem
removeAction(logicItem: LogicItem, actionId: string): LogicItem
```

### 2. ValidationRulesEditor

`getApplicableRules(entityType)` 함수로 엔티티 타입별 적용 가능 규칙을 필터링하고, 규칙 추가/삭제 및 AND/OR 논리 전환을 지원한다.

핵심 구현:

- **규칙 필터링**: 이미 추가된 규칙은 드롭다운에서 제외
- **AND/OR 토글**: 규칙이 2개 이상일 때 logic 전환 버튼 표시
- **ValidationConfig 구조**: `{ logic: 'and' | 'or', rules: ValidationRule[] }` 형태
- **ValidationRule 구조**: `{ id: string, type: ValidationRuleType, params?: Record<string, unknown>, field?: string }`

### 3. BlockSettings 업데이트

- `useBuilderStoreData`를 통해 반응형으로 entity 속성을 읽어옴
- `schema.entities[entityId].attributes`에서 logicItems, logicFallback 추출
- placeholder 대신 `<BlockLogicEditor>` 컴포넌트를 렌더링

## How to use it

### BlockLogicEditor (BlockSettings 내부에서 자동 사용)

```tsx
// BlockSettings를 렌더링하면 내부적으로 BlockLogicEditor가 포함됨
<BlockSettings entityId={blockId} onAttributeChange={handleChange} />
```

### ValidationRulesEditor (Element 컴포넌트에서 직접 사용)

```tsx
import { ValidationRulesEditor } from '@inquiry/client-survey-editor';

<ValidationRulesEditor
  entityId={entity.id}
  entityType="openText"           // Entity 유형에 따라 적용 가능 규칙이 달라짐
  validationConfig={attrs.validationConfig}
  onChange={(config) => setAttr('validationConfig', config)}
/>
```

적용 가능한 entityType 목록:
- `openText`: 텍스트 + 숫자 규칙 14종
- `multipleChoiceMulti`: 선택 규칙 2종
- `pictureSelection`: 선택 규칙 2종
- `date`: 날짜 규칙 4종
- `fileUpload`: 파일 규칙 2종
- `matrix`: 행렬 규칙 2종
- `ranking`: 순위 규칙 2종
- `address`, `contactInfo`: 텍스트 규칙 10종

## Related Components/Modules

- `@inquiry/survey-builder-config` Logic 모듈: 모든 Logic CRUD 유틸 함수와 타입 제공
- `@inquiry/survey-builder-config` Validation 모듈: 규칙 유형 정의, 적용 가능 규칙 매핑
- `BuilderStoreContext`: builderStore + blockLabels를 하위 컴포넌트에 전달
- `@coltorapps/builder-react`: `useBuilderStoreData`로 반응형 데이터 구독
- Entity 컴포넌트 (OpenTextComponent 등): ValidationRulesEditor를 advancedSettings에 통합 가능

## Precautions

- Logic 유틸 함수들의 시그니처가 task 설명과 다름 (실제 API 기준으로 구현):
  - `addLogicItem`은 `newItem` 파라미터 필요
  - `removeLogicItem`은 인덱스가 아닌 `itemId`(string) 사용
  - `addAction`/`removeAction`은 `LogicItem`을 반환
- Radix Select의 `value=""` 빈 문자열 이슈: fallback 없음은 `"__none__"` 값 사용
- ValidationRulesEditor의 `onChange`는 `ValidationConfig` 전체를 반환하므로 호출측에서 `setEntityAttribute`로 저장 필요
- `crypto.randomUUID()`는 브라우저 환경(HTTPS 또는 localhost) 에서만 동작
