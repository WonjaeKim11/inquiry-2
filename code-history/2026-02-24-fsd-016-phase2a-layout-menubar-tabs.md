# FSD-016 Phase 2A: 레이아웃 + 메뉴바 + EditorTabs 컴포넌트 구현

## Overview
설문 편집기의 기본 UI 골격을 구성하는 레이아웃, 메뉴바, 탭 전환, 자동 저장 표시기 컴포넌트를 구현한다.
이 4개 컴포넌트는 편집기의 3분할 레이아웃(메뉴바 + 편집 영역 + 프리뷰 영역)을 구성하며,
Phase 1에서 생성한 Context/Hooks 인프라(`EditorUIProvider`, `SurveyMetaProvider`, `useEditorUI`, `useSurveyMeta`)를 실제 UI에서 소비하는 첫 번째 컴포넌트 레이어이다.

## Changed Files

### 생성된 파일

- `libs/client/survey-editor/src/lib/components/layout/SurveyEditorLayout.tsx`
  - 3분할 레이아웃 컴포넌트 (MenuBar + Editor 2/3 + Preview 1/3)
  - md(768px) 미만에서 프리뷰 영역 자동 숨김

- `libs/client/survey-editor/src/lib/components/layout/SurveyMenuBar.tsx`
  - 상단 메뉴바 컴포넌트
  - 뒤로가기 버튼, 설문 이름 인라인 편집, AutoSaveIndicator, 액션 버튼(Save as Draft/Publish/Update)

- `libs/client/survey-editor/src/lib/components/layout/EditorTabs.tsx`
  - 4탭 전환 컴포넌트 (Elements/Styling/Settings/FollowUps)
  - CX 모드 시 Settings 숨김, 스타일 오버라이드 미허용 시 Styling 숨김

- `libs/client/survey-editor/src/lib/components/shared/AutoSaveIndicator.tsx`
  - 자동 저장 상태 표시 컴포넌트 (idle/saving/saved/error)

### 수정된 파일

- `libs/client/survey-editor/src/index.ts`
  - 새로 생성한 4개 컴포넌트의 barrel export 추가

## Major Changes

### 1. SurveyEditorLayout - 3분할 반응형 레이아웃

```tsx
<div className="flex h-screen flex-col">
  <SurveyMenuBar backUrl={backUrl} onSave={onSave} onPublish={onPublish} />
  <div className="flex flex-1 overflow-hidden">
    {/* 편집 영역: md 이상 2/3, md 미만 전체 */}
    <div className="flex w-full flex-col overflow-y-auto md:w-2/3">
      <EditorTabs />
      <div className="flex-1 p-4">{editorContent}</div>
    </div>
    {/* 프리뷰 영역: md 이상에서만 1/3로 표시 */}
    <div className="hidden border-l bg-muted/30 md:block md:w-1/3">...</div>
  </div>
</div>
```

- `h-screen` + `flex-col`로 전체 뷰포트를 차지하는 레이아웃 구성
- `overflow-hidden`으로 메인 영역 오버플로 제어, 각 하위 영역에서 개별 스크롤
- `md:` 프리픽스로 768px 이상에서만 프리뷰 영역 표시

### 2. SurveyMenuBar - 인라인 이름 편집 + 상태별 버튼

- 이름 텍스트 클릭 -> `<Input>` 전환으로 인라인 편집 지원
- Enter/블러 시 `updateSurveyName` 호출, Escape 시 취소
- 설문 상태(`DRAFT`/`IN_PROGRESS`/`PAUSED`)에 따라 다른 액션 버튼 표시
- `backUrl`은 `<a>` 태그 + `asChild` 패턴으로 라이브러리의 프레임워크 독립성 유지 (next/navigation 미사용)
- `onSave`/`onPublish` 콜백 props로 외부에서 저장/발행 로직 주입

### 3. EditorTabs - 조건부 탭 표시

- `editorConfig.isStyleOverrideAllowed`가 false이면 Styling 탭 숨김
- `editorConfig.isCxMode`가 true이면 Settings 탭 숨김
- FollowUps 탭에 `<Badge variant="secondary">Pro</Badge>` 표시
- Radix Tabs의 `onValueChange`로 `setActiveTab` 연동

### 4. AutoSaveIndicator - 4가지 상태 표시

| 상태 | 아이콘 | 텍스트 |
|------|--------|--------|
| idle | (렌더링 안 함) | - |
| saving | Loader2 (스피너) | Saving... |
| saved | Check (초록) | Saved |
| error | AlertCircle (destructive) | Save failed |

## How to use it

### 기본 사용법

```tsx
import {
  SurveyEditorLayout,
  EditorUIProvider,
  SurveyMetaProvider,
} from '@inquiry/client-survey-editor';

function SurveyEditorPage() {
  return (
    <EditorUIProvider initialConfig={{ isCxMode: false, isStyleOverrideAllowed: true, selectedLanguage: 'ko' }}>
      <SurveyMetaProvider initialMeta={surveyMeta}>
        <SurveyEditorLayout
          backUrl="/surveys"
          editorContent={<ElementsPanel />}
          previewContent={<SurveyPreview />}
          onSave={async () => { /* performSave() */ }}
          onPublish={async () => { /* publish() */ }}
        />
      </SurveyMetaProvider>
    </EditorUIProvider>
  );
}
```

### AutoSaveIndicator 단독 사용

```tsx
import { AutoSaveIndicator } from '@inquiry/client-survey-editor';

<AutoSaveIndicator status="saving" />
```

## Related Components/Modules

- `libs/client/survey-editor/src/lib/context/editor-ui.context.tsx` - EditorTabs와 SurveyMenuBar가 소비하는 UI 상태 제공
- `libs/client/survey-editor/src/lib/context/survey-meta.context.tsx` - SurveyMenuBar가 소비하는 설문 메타데이터 제공
- `libs/client/survey-editor/src/lib/hooks/use-editor-ui.ts` - activeTab, autoSaveStatus, editorConfig 접근
- `libs/client/survey-editor/src/lib/hooks/use-survey-meta.ts` - name, status, updateSurveyName 접근
- `libs/client/survey-editor/src/lib/hooks/use-editor-auto-save.ts` - performSave를 onSave 콜백으로 전달
- `libs/client/survey-editor/src/lib/hooks/use-survey-publish.ts` - publish를 onPublish 콜백으로 전달
- `@inquiry/client-ui` - Button, Input, Tabs, TabsList, TabsTrigger, Badge 컴포넌트
- `lucide-react` - ArrowLeft, Loader2, Check, AlertCircle 아이콘

## Precautions

- SurveyMenuBar의 `backUrl`은 `<a href>` 태그를 사용하므로 SPA 라우팅이 필요한 경우 소비측에서 Next.js Link로 감싸거나 이벤트를 가로채야 한다.
- `onSave`/`onPublish` props가 제공되지 않으면 해당 버튼 클릭 시 아무 동작도 하지 않는다. 반드시 상위에서 `useEditorAutoSave`의 `performSave`와 `useSurveyPublish`의 `publish`를 연결해야 한다.
- EditorTabs, SurveyMenuBar는 반드시 `EditorUIProvider`와 `SurveyMetaProvider` 하위에서 렌더링해야 한다 (Context 의존).
- 모든 사용자 대면 문자열은 `react-i18next`의 `t()` 함수로 래핑되어 있으며, fallback 값이 포함되어 있어 i18n 설정 없이도 기본 영문 텍스트가 표시된다.
