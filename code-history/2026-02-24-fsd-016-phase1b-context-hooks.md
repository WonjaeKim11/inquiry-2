# FSD-016 Phase 1B: 설문 에디터 Context + Hooks 구현

## Overview
설문 에디터(`@inquiry/client-survey-editor`)의 상태 관리 인프라를 구현한다. 편집기 UI 상태(탭, 활성 요소, 자동 저장 등)와 설문 메타데이터(WelcomeCard, Endings, HiddenFields, Variables 등)를 React Context + useReducer 패턴으로 관리하며, 이를 쉽게 사용할 수 있는 Custom Hooks를 제공한다. 또한 Builder Store 변경 감시를 통한 10초 디바운스 자동 저장, 발행 전 클라이언트 검증, 활성 요소 토글 등의 고급 기능을 포함한다.

## Changed Files

### 생성된 파일

- `libs/client/survey-editor/src/lib/context/editor-ui.context.tsx` — 편집기 UI 상태(activeTab, activeElementId, autoSaveStatus 등)를 관리하는 Context Provider 및 Reducer
- `libs/client/survey-editor/src/lib/context/survey-meta.context.tsx` — 설문 메타데이터(name, welcomeCard, endings, hiddenFields, variables, styling 등)를 관리하는 Context Provider 및 Reducer (14개 액션 처리)
- `libs/client/survey-editor/src/lib/hooks/use-editor-ui.ts` — EditorUI Context 접근 훅. 상태 읽기 + 편의 메서드(setActiveTab, setAutoSaveStatus 등) 제공
- `libs/client/survey-editor/src/lib/hooks/use-survey-meta.ts` — SurveyMeta Context 접근 훅. useCallback으로 감싼 14개 업데이트 함수 제공
- `libs/client/survey-editor/src/lib/hooks/use-editor-auto-save.ts` — Builder Store + SurveyMeta 변경을 감시하여 10초 디바운스 후 자동 저장 + beforeunload sendBeacon 지원
- `libs/client/survey-editor/src/lib/hooks/use-survey-publish.ts` — 발행 전 클라이언트 검증(validateSurveyForPublish) + publishSurvey API 호출 훅
- `libs/client/survey-editor/src/lib/hooks/use-active-element.ts` — 활성 Element ID 선택/해제/토글 훅

### 수정된 파일

- `libs/client/survey-editor/src/index.ts` — Context Provider, Hook 내보내기 추가

## Major Changes

### 1. EditorUI Context (editor-ui.context.tsx)
편집기의 UI 상태를 useReducer로 관리한다. 8가지 액션(SET_ACTIVE_TAB, SET_ACTIVE_ELEMENT, SET_AUTO_SAVE_STATUS, SET_INVALID_ELEMENTS, TOGGLE_BLOCK_EXPANDED, SET_ALL_BLOCKS_EXPANDED, SET_EDITOR_CONFIG, SET_SELECTED_LANGUAGE)을 처리한다.

```tsx
// Provider 사용 예시
<EditorUIProvider
  initialConfig={{ isCxMode: true, selectedLanguage: 'ko' }}
  initialExpandedBlockIds={['block1', 'block2']}
>
  <SurveyEditor />
</EditorUIProvider>
```

### 2. SurveyMeta Context (survey-meta.context.tsx)
Builder Schema 외부에서 관리되는 설문 메타데이터를 15가지 액션으로 관리한다. 서버에서 가져온 SurveyMeta를 INIT_META 액션으로 초기화하고, 이후 각 필드별 세분화된 액션으로 업데이트한다.

### 3. 자동 저장 훅 (use-editor-auto-save.ts)
`@coltorapps/builder-react`의 `useBuilderStoreData`로 Builder Store 변경을 감시하고, SurveyMeta 주요 필드 변경도 함께 감시한다. 변경 감지 시 10초 디바운스 후 `builderDataToSurvey` + `updateSurvey` API로 저장한다. 페이지 이탈 시 `navigator.sendBeacon`으로 미저장 데이터를 즉시 전송한다. DRAFT 상태에서만 동작한다.

```typescript
// 데이터 흐름
Builder Store 변경 → useBuilderStoreData → scheduleSave() → 10초 후 → performSave()
SurveyMeta 변경 → useEffect dependency → scheduleSave() → 10초 후 → performSave()
페이지 이탈 → beforeunload → sendBeacon으로 즉시 전송
```

### 4. 발행 훅 (use-survey-publish.ts)
`validateSurveyForPublish`로 클라이언트 측 검증을 먼저 수행하고, 통과하면 `publishSurvey` API를 호출한다. 검증 실패 시 invalidEntityIds를 EditorUI Context에 반영하여 UI에서 오류를 표시한다.

### 5. 활성 요소 훅 (use-active-element.ts)
selectElement, deselectElement, toggleElement 3가지 편의 함수를 제공한다. toggleElement은 같은 요소를 다시 클릭하면 해제하는 토글 동작을 구현한다.

## How to use it

### Context Provider 설정
```tsx
import {
  EditorUIProvider,
  SurveyMetaProvider,
} from '@inquiry/client-survey-editor';

function SurveyEditorPage({ survey }) {
  const { schema, meta } = surveyToBuilderData(survey);

  return (
    <EditorUIProvider initialConfig={{ isCxMode: false }}>
      <SurveyMetaProvider initialMeta={meta}>
        <SurveyEditorContent schema={schema} />
      </SurveyMetaProvider>
    </EditorUIProvider>
  );
}
```

### Hook 사용
```tsx
import {
  useEditorUI,
  useSurveyMeta,
  useActiveElement,
  useEditorAutoSave,
  useSurveyPublish,
} from '@inquiry/client-survey-editor';

function SurveyEditorContent({ schema }) {
  const builderStore = useBuilderStore(surveyBuilder, { initialData: { schema } });

  // 자동 저장 활성화
  const { performSave } = useEditorAutoSave(builderStore);

  // 발행
  const { publish, publishing } = useSurveyPublish(
    () => builderStore.getSchema()
  );

  // UI 상태
  const { activeTab, setActiveTab } = useEditorUI();

  // 메타데이터
  const { name, updateSurveyName } = useSurveyMeta();

  // 활성 요소
  const { activeElementId, toggleElement } = useActiveElement();
}
```

## Related Components/Modules

- `@inquiry/survey-builder-config` — SurveyBuilderSchema, WelcomeCard, SurveyEnding 등 공유 타입
- `@inquiry/client-survey` — updateSurvey, publishSurvey API 함수
- `@coltorapps/builder-react` — useBuilderStore, useBuilderStoreData (Builder Store 관리)
- `libs/client/survey-editor/src/lib/utils/schema-converter.ts` — builderDataToSurvey, surveyToBuilderData (데이터 변환)
- `libs/client/survey-editor/src/lib/utils/survey-validation.ts` — validateSurveyForPublish (발행 전 검증)
- `libs/client/survey-editor/src/lib/context/types.ts` — EditorUIState, SurveyMetaState, EditorUIAction, SurveyMetaAction 타입 정의

## Precautions

- `useEditorAutoSave`의 `builderStore` 파라미터는 `BuilderStore<any>` 타입으로 정의되어 있다. 이는 `@coltorapps/builder`의 제네릭 타입이 복잡하여 실용적인 접근을 택한 것이다.
- 자동 저장은 DRAFT 상태에서만 동작한다. IN_PROGRESS, PAUSED, COMPLETED 상태에서는 자동 저장이 비활성화된다.
- `beforeunload`의 `sendBeacon`은 브라우저 지원 상황에 따라 데이터 전송이 보장되지 않을 수 있다.
- `useSurveyMeta`와 `useEditorUI`는 각각 Provider 외부에서 호출하면 에러를 throw한다.
- Context와 Reducer가 분리되어 있어 EditorUI와 SurveyMeta는 독립적으로 리렌더링된다. 하나의 Context 변경이 다른 Context를 구독하는 컴포넌트에는 영향을 주지 않는다.
