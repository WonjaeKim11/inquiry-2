# Phase 5A: WelcomeCard + EndingCards + HiddenFields + Variables 에디터 구현

## Overview
설문 에디터의 Elements 탭에서 Builder Schema 외부 데이터(SurveyMeta)를 편집하는 4가지 에디터 컴포넌트를 구현하였다. 기존에 placeholder div로 표시되던 Welcome Card, Ending Cards, Hidden Fields, Variables 섹션을 실제 편집 가능한 UI 컴포넌트로 교체하였다.

이 작업은 설문 에디터의 핵심 기능 완성도를 높이기 위해 필요하며, 설문의 시작/종료 화면 구성, URL 파라미터 기반 숨겨진 필드 관리, 설문 내부 변수 관리 기능을 제공한다.

## Changed Files

### 생성된 파일
- `libs/client/survey-editor/src/lib/components/elements-view/WelcomeCardEditor.tsx` - Welcome Card 편집기. enabled 토글, headline, subtitle(html), 이미지 URL, 버튼 라벨(48자 제한), 응답 수 표시, 예상 소요 시간 표시 7가지 속성을 관리한다.
- `libs/client/survey-editor/src/lib/components/elements-view/EndingCardEditor.tsx` - 단일 Ending Card 편집기. endScreen/redirectToUrl 유형 전환을 OptionsSwitch로 제공하며, 유형에 따라 다른 필드를 렌더링한다.
- `libs/client/survey-editor/src/lib/components/elements-view/EndingCardList.tsx` - Ending Card 목록 컴포넌트. @dnd-kit 기반 드래그 앤 드롭 순서 변경, 카드 추가/삭제 기능을 제공한다.
- `libs/client/survey-editor/src/lib/components/elements-view/HiddenFieldsCard.tsx` - Hidden Fields 편집기 카드. enabled 토글, Field ID 추가(중복 검증)/삭제, Enter 키 빠른 추가를 지원한다.
- `libs/client/survey-editor/src/lib/components/elements-view/SurveyVariablesCard.tsx` - Survey Variables 편집기 카드. number/text 타입 변수의 추가/편집/삭제를 지원하며, 타입 변경 시 value 자동 초기화 로직을 포함한다.

### 수정된 파일
- `libs/client/survey-editor/src/lib/components/elements-view/ElementsView.tsx` - placeholder div들을 실제 에디터 컴포넌트로 교체. useTranslation 임포트 제거(불필요해짐).
- `libs/client/survey-editor/src/index.ts` - WelcomeCardEditor, EndingCardEditor, EndingCardList, HiddenFieldsCard, SurveyVariablesCard를 barrel export에 추가.

## Major Changes

### 1. WelcomeCardEditor
`useSurveyMeta()` 훅에서 `welcomeCard`와 `updateWelcomeCard`를 가져와 사용한다. 제네릭 `updateField` 헬퍼를 통해 개별 속성을 타입 안전하게 업데이트한다.

```typescript
const updateField = useCallback(
  <K extends keyof WelcomeCard>(key: K, value: WelcomeCard[K]) => {
    updateWelcomeCard({ ...welcomeCard, [key]: value });
  },
  [welcomeCard, updateWelcomeCard]
);
```

`showResponseCount` 옵션은 `surveyType === 'link'`인 경우에만 렌더링된다.

### 2. EndingCardEditor + EndingCardList
EndingCardEditor는 단일 카드 편집을 담당하고, EndingCardList는 목록 관리(DnD, 추가, 삭제)를 담당한다.

- `@dnd-kit/core`의 `DndContext`, `PointerSensor`와 `@dnd-kit/sortable`의 `SortableContext`, `useSortable`, `arrayMove`를 사용
- PointerSensor에 `distance: 8` 제약 조건을 설정하여 클릭과 드래그를 구분
- 새 카드 생성 시 `createId()`로 고유 ID 생성

### 3. HiddenFieldsCard
Field ID 추가 시 중복 검증을 수행한다:

```typescript
if (hiddenFields.fieldIds.includes(id)) {
  setError(t('surveyEditor.hiddenFields.duplicateError', 'This field ID already exists'));
  return;
}
```

Enter 키로 빠른 추가를 지원하며, 입력값 변경 시 에러 메시지가 자동으로 초기화된다.

### 4. SurveyVariablesCard
변수 타입 변경 시 value를 자동으로 초기값(number: 0, text: '')으로 리셋한다:

```typescript
onValueChange={(v) =>
  handleUpdate(variable.id, {
    type: v as 'number' | 'text',
    value: v === 'number' ? 0 : '',
  })
}
```

삭제 시 ConfirmDeleteDialog를 통해 "로직 규칙이 깨질 수 있음" 경고를 표시한다.

### 5. ElementsView 교체
기존 placeholder div 4개를 실제 컴포넌트로 교체하였다:

```
<WelcomeCardEditor />   ← 기존 placeholder div
<BuilderCanvas />       ← 변경 없음
<EndingCardList />      ← 기존 placeholder div
<HiddenFieldsCard />    ← 기존 placeholder div
<SurveyVariablesCard /> ← 기존 placeholder div
```

## How to use it

### ElementsView 내에서 자동 렌더링
ElementsView를 사용하는 곳에서는 별도 작업 없이 자동으로 새 에디터들이 렌더링된다.

### 개별 컴포넌트 사용
SurveyMetaProvider 하위에서 개별 컴포넌트를 직접 사용할 수도 있다:

```tsx
import { WelcomeCardEditor, EndingCardList, HiddenFieldsCard, SurveyVariablesCard } from '@inquiry/client-survey-editor';

// SurveyMetaProvider 내부에서:
<WelcomeCardEditor />
<EndingCardList />
<HiddenFieldsCard />
<SurveyVariablesCard />
```

### EndingCardEditor 단독 사용
EndingCardEditor는 controlled 컴포넌트로 단독 사용 가능하다:

```tsx
import { EndingCardEditor } from '@inquiry/client-survey-editor';

<EndingCardEditor
  ending={endingData}
  onChange={(updated) => handleEndingChange(updated)}
  index={0}
/>
```

## Related Components/Modules

### 상위 의존성
- `SurveyMetaProvider` / `useSurveyMeta` 훅 - 모든 에디터가 SurveyMeta 상태를 읽고 업데이트하는 데 사용
- `EditorUIProvider` / `useEditorUI` 훅 - LocalizedInput이 현재 선택된 언어를 참조

### 공유 컴포넌트
- `LocalizedInput` - I18nString 다국어 입력
- `FileUploadInput` - 이미지 URL 입력 (추후 실제 업로드로 교체 예정)
- `OptionsSwitch` - 세그먼트 전환 UI (Ending 유형 전환)
- `ConfirmDeleteDialog` - 삭제 확인 모달

### 외부 라이브러리
- `@dnd-kit/core` v6.3.1 + `@dnd-kit/sortable` v10.0.0 - EndingCardList DnD
- `@paralleldrive/cuid2` - 새 Ending/Variable ID 생성
- `lucide-react` - 아이콘 (Plus, GripVertical, Trash2, X)

## Precautions
- FileUploadInput은 현재 URL 직접 입력 방식이며, 추후 실제 파일 업로드 기능으로 교체할 예정이다.
- SurveyVariable 삭제 시 해당 변수를 참조하는 로직 규칙이 깨질 수 있다. 현재는 경고 메시지만 표시하며, 추후 참조 검증 로직 추가가 필요하다.
- typecheck 시 기존 파일(BlockLogicEditor, ValidationRulesEditor 등)에서 pre-existing 에러가 있으나, 본 변경과 무관하다.
