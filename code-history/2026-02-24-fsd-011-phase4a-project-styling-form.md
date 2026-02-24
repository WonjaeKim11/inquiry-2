# FSD-011 Phase 4A: 프로젝트 스타일링 폼 교체

## Overview

기존 `ProjectStylingForm` 컴포넌트는 7개 속성(brandColor, cardBackgroundColor, cardBorderColor, roundness, hideProgressBar, isLogoHidden, allowStyleOverride)만을 개별 `useState`로 수동 관리하고 있었다. Phase 3에서 생성된 `@inquiry/client-styling` 패키지의 `StylingForm` 컴포넌트와 `useStylingForm` 훅을 활용하여, 40+ 속성을 지원하는 섹션 기반 스타일링 폼으로 전면 교체했다.

이로써 프로젝트 레벨에서 General Colors, Headlines, Buttons, Inputs, Options, Progress Bar, Card & Layout, Background 등 모든 스타일링 섹션을 일괄 편집할 수 있게 되었다.

## Changed Files

| 파일 | 역할 |
|------|------|
| `libs/client/project/src/lib/project-styling-form.tsx` | 기존 7속성 수동 폼을 `StylingForm` + `useStylingForm` 기반으로 전면 교체 |
| `libs/client/project/src/lib/project-context.tsx` | `ProjectStyling` 타입을 `interface`에서 `Record<string, unknown>`으로 변경하여 40+ 속성 수용 |
| `libs/client/project/package.json` | `@inquiry/client-styling` 워크스페이스 의존성 추가 |
| `apps/client/package.json` | `@inquiry/client-styling` 워크스페이스 의존성 추가 |
| `apps/client/tsconfig.json` | `references`에 `../../libs/client/styling` 경로 추가 |
| `libs/client/styling/package.json` | 불필요한 `@inquiry/client-project` 의존성 제거 (순환 참조 방지) |
| `libs/client/project/tsconfig.lib.json` | NX sync에 의한 자동 참조 업데이트 |
| `libs/client/styling/tsconfig.lib.json` | NX sync에 의한 자동 참조 업데이트 (project 참조 제거) |

## Major Changes

### 1. ProjectStylingForm 전면 교체

기존:
- 7개의 개별 `useState` 훅으로 각 속성 관리
- `useEffect`로 project prop 변경 시 동기화
- 각 필드에 대한 수동 JSX 렌더링 (Input, Switch 등)

변경 후:
- `useStylingForm({ mode: 'project', initialData })` 훅으로 상태 일괄 관리
- `StylingForm` 컴포넌트에 `styling`, `updateField`, `updateColor`, `mode` props 전달
- `isDirty` 상태를 활용한 Reset 버튼 조건부 렌더링
- `handleSubmit`에서 `styling` 객체를 그대로 `{ styling }` 형태로 PATCH 전송

```tsx
const { styling, updateField, updateColor, isDirty, reset } = useStylingForm({
  mode: 'project',
  initialData: (project.styling as Record<string, unknown>) ?? {},
});
```

### 2. ProjectStyling 타입 확장

```typescript
// Before
export interface ProjectStyling {
  brandColor?: string | null;
  cardBackgroundColor?: string | null;
  // ... 7개 속성
}

// After
export type ProjectStyling = Record<string, unknown>;
```

40+ 속성을 동적으로 수용하기 위해 유연한 Record 타입으로 변경했다.

### 3. 순환 참조 해소

`@inquiry/client-styling`이 `@inquiry/client-project`에 의존성을 선언하고 있었으나, 소스 코드에서 실제로 사용하지 않고 있었다. `client-project`에서 `client-styling`을 의존성으로 추가하면서 순환 참조가 발생할 수 있으므로, `client-styling`의 불필요한 `client-project` 의존성을 제거했다.

## How to use it

프로젝트 설정 페이지에서 `ProjectStylingForm`을 기존과 동일하게 사용한다:

```tsx
<ProjectStylingForm
  project={currentProject}
  onUpdated={() => refreshProjects()}
/>
```

컴포넌트 내부적으로 `StylingForm`이 8개 섹션(General Colors, Headlines, Buttons, Inputs, Options, Progress Bar, Card & Layout, Background)을 아코디언 형태로 렌더링한다. Dark Mode 토글과 allowStyleOverride 토글도 포함된다.

## Related Components/Modules

- `@inquiry/client-styling` (`libs/client/styling/`) - StylingForm 컴포넌트, useStylingForm 훅 제공
- `@inquiry/survey-builder-config` - BaseStyling, ProjectStyling, SurveyStyling 타입 및 resolveStyling 함수
- 프로젝트 설정 페이지 (`apps/client/src/app/[lng]/projects/[projectId]/settings/`) - ProjectStylingForm 소비처
- 서버 PATCH `/api/projects/:projectId` - styling JSON 필드 저장

## Precautions

- `ProjectStyling` 타입이 `Record<string, unknown>`으로 변경되었으므로, 다른 곳에서 `project.styling.brandColor` 등 특정 속성에 직접 접근하는 코드가 있다면 타입 단언이 필요할 수 있다.
- 서버 측에서 styling JSON 필드의 validation이 40+ 속성을 모두 허용하는지 확인이 필요하다.
- `client-styling`의 `client-project` 의존성을 제거했으므로, 향후 `client-styling`에서 Project 타입이 필요하면 `survey-builder-config` 등 공유 패키지를 통해 참조해야 한다.
