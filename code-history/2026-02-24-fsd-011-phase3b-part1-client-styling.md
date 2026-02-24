# FSD-011 Phase 3B Part 1: 클라이언트 스타일링 패키지 기반 구현

## Overview
설문 빌더의 스타일링 UI를 담당하는 `@inquiry/client-styling` 패키지의 기반 구조를 생성한다.
`@inquiry/survey-builder-config`에 이미 정의된 스타일링 타입/스키마/유틸리티를 활용하여,
클라이언트 전용 폼 컴포넌트(ColorPicker, 8개 섹션, StylingForm)와 상태 관리 훅(useStylingForm)을 구현한다.
`libs/client/multilingual/` 패키지의 구조 패턴을 따른다.

## Changed Files
| 파일 경로 | 역할 |
|---|---|
| `libs/client/styling/package.json` | 패키지 메타데이터 및 workspace 의존성 선언 |
| `libs/client/styling/tsconfig.json` | TypeScript 루트 프로젝트 참조 |
| `libs/client/styling/tsconfig.lib.json` | TypeScript 빌드 설정 (JSX, DOM lib, 프로젝트 참조) |
| `libs/client/styling/src/lib/types.ts` | 클라이언트 전용 타입 + 공유 타입 re-export |
| `libs/client/styling/src/lib/hooks/use-styling-form.ts` | 스타일링 폼 상태 관리 훅 (updateField, updateColor, reset, resolvedStyling) |
| `libs/client/styling/src/lib/components/color-picker.tsx` | react-colorful 기반 색상 피커 (light/dark 지원) |
| `libs/client/styling/src/lib/components/styling-section.tsx` | Collapsible 기반 섹션 래퍼 |
| `libs/client/styling/src/lib/components/general-colors-section.tsx` | 일반 색상 섹션 (brandColor 등 5개 + fontFamily + Suggest Colors) |
| `libs/client/styling/src/lib/components/headlines-section.tsx` | 헤드라인/설명 섹션 (headline/description/topLabel × fontSize/fontWeight/color) |
| `libs/client/styling/src/lib/components/buttons-section.tsx` | 버튼 스타일 섹션 (bgColor/textColor/borderRadius/height/fontSize/fontWeight/paddingX/paddingY) |
| `libs/client/styling/src/lib/components/inputs-section.tsx` | 입력 필드 스타일 섹션 (bgColor/borderColor/textColor/borderRadius/height/fontSize/opacity/padding/shadow) |
| `libs/client/styling/src/lib/components/options-section.tsx` | 옵션 스타일 섹션 (bgColor/labelColor/borderRadius/fontSize/paddingX/paddingY) |
| `libs/client/styling/src/lib/components/progress-bar-section.tsx` | 프로그레스 바 섹션 (hide/trackHeight/trackBgColor/indicatorColor) |
| `libs/client/styling/src/lib/components/card-layout-section.tsx` | 카드 레이아웃 섹션 (bgColor/borderColor/highlightBorder/roundness/arrangement/hideLogo) |
| `libs/client/styling/src/lib/components/background-section.tsx` | 배경 섹션 (타입 선택 + 밝기 슬라이더, image/upload/animation placeholder) |
| `libs/client/styling/src/lib/components/styling-form.tsx` | 메인 합성 폼 (Dark Mode 토글 + allowStyleOverride + 모든 섹션 조합) |
| `libs/client/styling/src/index.ts` | 패키지 barrel export |

## Major Changes

### 1. 패키지 구조
`libs/client/multilingual/` 패턴을 따라 `src/lib/types.ts`, `src/lib/hooks/`, `src/lib/components/` 구조로 구성.

### 2. useStylingForm 훅
```typescript
const { styling, updateField, updateColor, reset, isDirty, resolvedStyling } = useStylingForm({
  mode: 'project', // 또는 'survey'
  initialData: existingStyling,
  projectStyling: projectTheme, // survey 모드에서 프로젝트 테마 참조
});
```
- `updateField(key, value)`: 단일 필드 업데이트
- `updateColor(key, partial)`: StylingColor 객체 병합 업데이트
- `resolvedStyling`: `resolveStyling()` 호출로 5단계 우선순위 해석된 최종 스타일링

### 3. ColorPicker 컴포넌트
react-colorful의 `HexColorPicker`를 Popover 안에 렌더링. `darkModeEnabled` prop으로 dark 색상 입력 행을 조건부 표시.

### 4. StylingSection 컴포넌트
`@inquiry/client-ui`의 Collapsible 기반. ChevronDown 아이콘 회전 애니메이션 포함.

### 5. StylingForm 메인 합성 컴포넌트
- Dark Mode 토글: 활성화 시 모든 ColorPicker에 dark 입력 행 표시
- allowStyleOverride 토글: project 모드에서만 표시
- 8개 섹션: GeneralColors, Headlines, Buttons, Inputs, Options, ProgressBar, CardLayout, Background
- Background 섹션: project 모드이거나 surveyType이 'link'일 때만 표시

## How to use it
```tsx
import { StylingForm, useStylingForm } from '@inquiry/client-styling';

function ProjectStylingPanel({ project }) {
  const { styling, updateField, updateColor, isDirty, resolvedStyling } = useStylingForm({
    mode: 'project',
    initialData: project.styling ?? {},
  });

  return (
    <StylingForm
      styling={styling}
      updateField={updateField}
      updateColor={updateColor}
      mode="project"
    />
  );
}
```

## Related Components/Modules
- `@inquiry/survey-builder-config`: 스타일링 타입, 스키마, 유틸리티 (resolveStyling, suggestColors 등) 제공
- `@inquiry/client-ui`: 기본 UI 컴포넌트 (Popover, Collapsible, Slider, Switch 등)
- `@inquiry/client-project`: 프로젝트 컨텍스트 (projectStyling 참조)
- `react-colorful`: HexColorPicker 렌더링
- `lucide-react`: ChevronDown 아이콘

## Precautions
- Background 섹션의 image/upload/animation 타입은 placeholder 상태 (후속 Phase에서 구현)
- `react-colorful` 패키지가 새로 추가됨 — pnpm install 필요
- `lucide-react` 패키지가 의존성에 추가됨 (client-ui와 동일 버전)
