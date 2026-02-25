# FSD-010 설문 편집기 UX — Phase 6B~8 구현

## Overview

FSD-010 설문 편집기 UX 구현의 마지막 단계(Phase 6B, 7, 8)를 완료했다.
- **Phase 6B**: Preview 컴포넌트 3종(SurveyPreview, PreviewModal, PreviewFullwidth) 구현
- **Phase 7**: 라우트 페이지 통합(기존 JSON 편집기 → 새 편집기 레이아웃으로 교체) + barrel export 업데이트
- **Phase 8**: 빌드 검증 + 문서 + 커밋

이로써 FSD-010 설문 편집기 UX의 전체 8단계 구현이 완료되었다.

## Changed Files

### Phase 6B — Preview 컴포넌트 (신규 3파일)

| 파일 | 역할 |
|------|------|
| `libs/client/survey-editor/src/lib/components/preview/SurveyPreview.tsx` | 프리뷰 메인 컨테이너. builderStore에서 schema를 구독하고, SurveyMeta에서 type/welcomeCard/endings를 가져와 app/link 모드에 따라 적절한 프리뷰 컴포넌트를 렌더링한다. RefreshCw 버튼으로 강제 리마운트를 지원한다. |
| `libs/client/survey-editor/src/lib/components/preview/PreviewModal.tsx` | App 모드 프리뷰. 375px 너비의 모바일 프레임으로 WelcomeCard → Block별 Elements → EndingCard를 읽기 전용으로 표시한다. 활성 Element에 ring-2 하이라이트 + scrollIntoView를 적용한다. |
| `libs/client/survey-editor/src/lib/components/preview/PreviewFullwidth.tsx` | Link 모드 프리뷰. max-w-2xl 중앙 정렬로 동일한 렌더링 구조를 제공한다. |

### Phase 7 — 라우트 통합 + barrel export

| 파일 | 변경 내용 |
|------|----------|
| `apps/client/src/app/[lng]/.../surveys/[surveyId]/edit/page.tsx` | 기존 JSON textarea 편집기 → EditorUIProvider + SurveyMetaProvider + SurveyEditorLayout 기반 편집기로 전면 교체. useBuilderStore로 Builder Store 생성, useEditorAutoSave/useSurveyPublish 훅 연결, 활성 탭에 따라 ElementsView/SettingsView/StylingView/FollowUpsView 전환 |
| `apps/client/package.json` | `@inquiry/client-survey-editor: "workspace:*"` 의존성 추가 |
| `apps/client/tsconfig.json` | references에 `../../libs/client/survey-editor` 추가 |
| `libs/client/survey-editor/src/index.ts` | Preview 컴포넌트 3종(SurveyPreview, PreviewModal, PreviewFullwidth) export 추가 |

### Phase 7 — i18n

| 파일 | 변경 내용 |
|------|----------|
| `apps/client/src/app/i18n/locales/en-US/translation.json` | `surveyEditor.preview.*` 5개 키 추가 |
| 나머지 14개 로케일 | 이전 Phase에서 이미 preview 키가 추가되어 있었음 |

## Major Changes

### 1. Preview 렌더링 아키텍처

Preview 컴포넌트는 인터랙티브 프리뷰가 아닌 **읽기 전용** 프리뷰를 제공한다. schema.entities를 직접 순회하여 Block/Element 구조를 구성한다.

```tsx
// SurveyPreview.tsx — type에 따라 프리뷰 모드를 선택한다
const PreviewComponent = type === 'app' ? PreviewModal : PreviewFullwidth;

// PreviewModal/PreviewFullwidth — 공통 렌더링 패턴
rootIds.map((blockId) => {
  const block = entities[blockId];
  const children = (block.children ?? []) as string[];
  return children.map((elementId) => {
    const element = entities[elementId];
    const isActive = elementId === activeElementId;
    // type 라벨 + headline 표시, 활성 요소 하이라이트
  });
});
```

I18nString(`Record<string, string>`) 타입의 headline에서 `'default'` 키를 우선 사용하고, 없으면 첫 번째 값을 표시하는 `getI18nText` 헬퍼를 사용한다.

### 2. 라우트 페이지 통합

기존 JSON textarea 편집기를 새 설문 편집기 레이아웃으로 완전 교체했다. 페이지 구조를 2단계로 분리:

```tsx
// 외부 컴포넌트: 인증 + 데이터 로드 + Context Provider
SurveyEditPage
  ├─ useAuth → 인증 확인
  ├─ useSurvey → 설문 데이터 로드
  ├─ surveyToBuilderData → schema + meta 분리
  └─ EditorUIProvider + SurveyMetaProvider 래핑

// 내부 컴포넌트: 훅 사용 + 레이아웃 렌더링
SurveyEditorInner
  ├─ useBuilderStore → Builder Store 생성 (initialData로 서버 데이터 복원)
  ├─ useEditorAutoSave → 자동 저장 연결
  ├─ useSurveyPublish → 발행 기능 연결
  └─ SurveyEditorLayout (editorContent + previewContent)
```

## How to use it

설문 편집 페이지(`/[lng]/projects/[projectId]/environments/[envId]/surveys/[surveyId]/edit`)에 접근하면 새 편집기 UI가 로드된다.

- **좌측 편집 영역**: Elements / Styling / Settings / Follow-Ups 4탭 전환
- **우측 프리뷰 영역**: 설문 type(app/link)에 따라 모바일 프레임 또는 전체 너비 프리뷰
- **상단 메뉴바**: 설문 이름 인라인 편집, 자동 저장 상태, Save as Draft / Publish 버튼

## Related Components/Modules

- `@inquiry/client-survey-editor` — 편집기 라이브러리 (Phase 1~6B에서 구현된 전체 컴포넌트)
- `@coltorapps/builder-react` — Builder Store 관리 (useBuilderStore, useBuilderStoreData)
- `@inquiry/survey-builder-config` — 설문 빌더 정의 (surveyBuilder, 엔티티 타입)
- `@inquiry/client-survey` — 설문 CRUD API (useSurvey, updateSurvey, publishSurvey)

## Precautions

- Preview는 읽기 전용이며 실제 응답 입력 기능은 제공하지 않는다 (향후 인터랙티브 프리뷰로 확장 가능)
- Builder Store의 schema `root` 타입이 `readonly string[]`이므로, 하위 컴포넌트에서도 readonly 타입을 사용해야 한다
- `useEditorAutoSave`는 DRAFT 상태에서만 활성화되며, 10초 디바운스로 동작한다
- 페이지 이탈 시 `sendBeacon`으로 미저장 데이터를 전송한다
