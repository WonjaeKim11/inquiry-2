# FSD-011 스타일링 / 테마 / 배경 구현

## Overview

FSD-015(다국어 설문) 완료 후 5단계(설문 UX 확장)의 다음 작업으로, 프로젝트/설문 스타일링 시스템을 확장 구현하였다. 기존 7개 속성 기본 스타일링을 **40+ 속성, light/dark 쌍 색상 시스템, 5단계 우선순위 해석, 설문 레벨 오버라이드**로 확장한다.

**포함 범위**: 공유 스타일링 스키마/유틸, 서버 DTO 강화, UI 프리미티브 추가, 클라이언트 스타일링 라이브러리, 프로젝트 스타일링 폼 교체, 설문 에디터 스타일링 탭, i18n 15개 로케일

**제외 범위**: 실시간 미리보기 패널(설문 응답 페이지 미구현), Unsplash/파일 업로드(후속 Phase), 애니메이션 배경(상수만 정의)

## Changed Files

### Phase 1: 공유 스타일링 스키마 + 유틸리티 (6개 생성, 1개 수정)

| 파일 | 역할 |
|------|------|
| `packages/survey-builder-config/src/lib/styling/types.ts` | `StylingColor`, `CardArrangement`, `SurveyBackground`, `SurveyLogo`, `BaseStyling`(40+속성), `ProjectStyling`, `SurveyStyling` 인터페이스 + Zod 스키마 |
| `packages/survey-builder-config/src/lib/styling/constants.ts` | `STYLING_DEFAULTS` 시스템 기본값 상수, `ANIMATION_BACKGROUNDS` 목록 |
| `packages/survey-builder-config/src/lib/styling/color-utils.ts` | `parseHexColor`, `rgbToHex`, `mixColors`, `isLightColor`, `suggestColors`, `isValidCssColor` |
| `packages/survey-builder-config/src/lib/styling/legacy-migration.ts` | `migrateLegacyStyling` — questionColor→5필드, brandColor→4필드, inputColor→1필드 변환 |
| `packages/survey-builder-config/src/lib/styling/resolve-styling.ts` | `resolveStyling` 5단계 우선순위 해석 + `deepMergeNonNull` 유틸 |
| `packages/survey-builder-config/src/lib/styling/index.ts` | barrel export |
| `packages/survey-builder-config/src/index.ts` | (수정) Styling 모듈 re-export 추가 |

### Phase 2: UI 프리미티브 컴포넌트 (4개 생성, 2개 수정)

| 파일 | 역할 |
|------|------|
| `libs/client/ui/src/components/ui/slider.tsx` | Radix UI 기반 shadcn/ui Slider 컴포넌트 |
| `libs/client/ui/src/components/ui/popover.tsx` | Radix UI 기반 shadcn/ui Popover 컴포넌트 |
| `libs/client/ui/src/components/ui/collapsible.tsx` | Radix UI 기반 shadcn/ui Collapsible 컴포넌트 |
| `libs/client/ui/src/components/ui/tooltip.tsx` | Radix UI 기반 shadcn/ui Tooltip 컴포넌트 |
| `libs/client/ui/src/index.ts` | (수정) 4개 컴포넌트 export 추가 |
| `libs/client/ui/package.json` | (수정) @radix-ui/react-slider, popover, collapsible, tooltip, react-colorful 의존성 추가 |

### Phase 3A: 서버 DTO 검증 강화 (2개 수정)

| 파일 | 역할 |
|------|------|
| `libs/server/project/src/lib/dto/update-project.dto.ts` | (수정) `z.record(z.unknown())` → `projectStylingSchema.passthrough()` + `surveyLogoSchema.passthrough()` |
| `libs/server/survey/src/lib/dto/create-survey.dto.ts` | (수정) `z.record(z.unknown())` → `surveyStylingSchema.passthrough().nullable()` |

### Phase 3B: 클라이언트 스타일링 라이브러리 (17개 생성)

| 파일 | 역할 |
|------|------|
| `libs/client/styling/package.json` | `@inquiry/client-styling` 패키지 정의 |
| `libs/client/styling/tsconfig.json` | TypeScript 루트 참조 |
| `libs/client/styling/tsconfig.lib.json` | 빌드 설정 (4개 프로젝트 참조) |
| `libs/client/styling/src/lib/types.ts` | 클라이언트 전용 타입 + 공유 타입 re-export |
| `libs/client/styling/src/lib/hooks/use-styling-form.ts` | 스타일링 폼 상태 관리 훅 (`updateField`, `updateColor`, `reset`, `isDirty`, `resolvedStyling`) |
| `libs/client/styling/src/lib/components/color-picker.tsx` | react-colorful + Popover 래핑, light/dark 입력 지원 |
| `libs/client/styling/src/lib/components/styling-section.tsx` | Collapsible 기반 섹션 래퍼 |
| `libs/client/styling/src/lib/components/general-colors-section.tsx` | 6필드 + Suggest Colors 버튼 |
| `libs/client/styling/src/lib/components/headlines-section.tsx` | 9필드 (fontSize, fontWeight, color × 3그룹) |
| `libs/client/styling/src/lib/components/buttons-section.tsx` | 8필드 (색상 + 수치) |
| `libs/client/styling/src/lib/components/inputs-section.tsx` | 10필드 (placeholderOpacity Slider 포함) |
| `libs/client/styling/src/lib/components/options-section.tsx` | 6필드 |
| `libs/client/styling/src/lib/components/progress-bar-section.tsx` | 3필드 + hideProgressBar Switch |
| `libs/client/styling/src/lib/components/card-layout-section.tsx` | cardBgColor, roundness Slider, cardArrangement Select, hideLogo Switch |
| `libs/client/styling/src/lib/components/background-section.tsx` | 4가지 배경 타입 선택 + 밝기 Slider (image/upload/animation은 placeholder) |
| `libs/client/styling/src/lib/components/styling-form.tsx` | 메인 합성 컴포넌트 — 모든 섹션 조합 |
| `libs/client/styling/src/index.ts` | barrel export |

### Phase 4A: 프로젝트 스타일링 폼 교체 (5개 수정)

| 파일 | 역할 |
|------|------|
| `libs/client/project/src/lib/project-styling-form.tsx` | (수정) 기존 7속성 폼 → `StylingForm` mode='project' 사용으로 교체 |
| `libs/client/project/src/lib/project-context.tsx` | (수정) `ProjectStyling` 인터페이스 → `Record<string, unknown>` 타입으로 변경 |
| `libs/client/project/package.json` | (수정) `@inquiry/client-styling` 의존성 추가 |
| `apps/client/package.json` | (수정) `@inquiry/client-styling` 의존성 추가 |
| `apps/client/tsconfig.json` | (수정) references에 `libs/client/styling` 추가 |

### Phase 4B: i18n 15개 로케일 보강 (15개 수정)

모든 15개 로케일의 `translation.json` 파일에 `project.styling` 섹션을 7개 키 → 60+ 키로 확장:
- 8개 섹션 제목 (sections)
- 48개 필드 라벨 (fields)
- 3개 액션 버튼 (actions)
- 배경 타입, 카드 배치, 다크모드, 오버라이드 관련 26개 키

### Phase 5: 설문 에디터 스타일링 탭 (1개 생성, 3개 수정)

| 파일 | 역할 |
|------|------|
| `libs/client/styling/src/lib/components/survey-styling-tab.tsx` | (생성) 설문 스타일링 래퍼: overrideTheme 토글 + Reset to Theme Styles + StylingForm |
| `libs/client/survey/src/lib/types.ts` | (수정) `SurveyDetail`, `UpdateSurveyInput`에 `styling` 필드 추가 |
| `libs/client/styling/src/index.ts` | (수정) `SurveyStylingTab` export 추가 |
| `apps/client/.../surveys/[surveyId]/edit/page.tsx` | (수정) Tabs로 감싸서 "편집"/"스타일링" 2개 탭 구성 |

## Major Changes

### 1. 색상 시스템 (Light/Dark)

모든 색상 속성은 `StylingColor` 타입으로 관리된다:

```typescript
interface StylingColor {
  light: string;   // 필수, 유효한 CSS Color
  dark?: string;   // 선택, 다크 모드용
}
```

Dark Mode 토글을 활성화하면 각 색상 필드에 dark 값 입력이 표시된다.

### 2. 5단계 우선순위 해석 엔진

```
1. 시스템 기본값 (STYLING_DEFAULTS)
2. 프로젝트 레거시 마이그레이션 (questionColor→5필드, brandColor→4필드, inputColor→1필드)
3. 프로젝트 스타일링 설정
4. 설문 레거시 마이그레이션 (overrideTheme=true 시)
5. 설문 스타일링 설정 (overrideTheme=true 시)
```

`deepMergeNonNull` 유틸이 null/undefined 값을 건너뛰고, 명시적으로 설정된 값만 오버라이드한다.

### 3. Suggest Colors

`suggestColors(brandColor)` 함수가 brandColor 하나에서 6가지 조화로운 색상을 자동 생성한다:
- questionColor: brandColor + #000 (35% 혼합)
- inputBackground: brandColor + #fff (92% 혼합)
- inputBorderColor: brandColor + #fff (60% 혼합)
- cardBackground: brandColor + #fff (97% 혼합)
- pageBackground: brandColor + #fff (85.5% 혼합)
- buttonTextColor: 밝기 기반 자동 결정 (#0f172a 또는 #ffffff)

### 4. 서버 DTO 검증 강화

`z.record(z.unknown())`를 `projectStylingSchema.passthrough()`로 교체하여 정의된 필드에 타입 검증을 수행하면서 `.passthrough()`로 레거시 필드 호환성을 유지한다.

### 5. 설문 에디터 탭 구조

기존 단일 페이지를 `<Tabs>` 컴포넌트로 감싸서 "편집" / "스타일링" 2개 탭으로 분리:
- **편집 탭**: 기존 설문 이름, 스키마, 다국어 설정
- **스타일링 탭**: overrideTheme 토글 + 40+ 속성 스타일링 편집 + Reset to Theme Styles

## How to use it

### 프로젝트 스타일링 설정

프로젝트 설정 페이지의 스타일링 섹션에서 40+ 속성을 편집:
1. General Colors에서 Brand Color 설정
2. "Suggest Colors" 버튼으로 조화로운 팔레트 자동 생성
3. 각 섹션(Headlines, Buttons, Inputs 등)을 펼쳐 세부 속성 조정
4. Dark Mode 토글로 다크 색상 값 설정
5. "Allow Style Override" 토글로 설문별 오버라이드 허용/차단
6. 저장

### 설문 스타일 오버라이드

설문 에디터의 "스타일링" 탭에서:
1. "Override Theme Styles" 토글 활성화
2. 프로젝트 테마와 다른 스타일 속성 설정
3. 저장
4. "Reset to Theme Styles" 버튼으로 프로젝트 기본값 복원

### API 사용

```bash
# 프로젝트 스타일링 업데이트
PATCH /api/projects/:projectId
{
  "styling": {
    "brandColor": { "light": "#3b82f6" },
    "questionColor": { "light": "#0f172a" },
    "darkMode": false,
    "allowStyleOverride": true
  }
}

# 설문 스타일링 업데이트
PUT /api/surveys/:surveyId
{
  "styling": {
    "overrideTheme": true,
    "cardBgColor": { "light": "#fef3c7" },
    "roundness": 12
  }
}
```

## Related Components/Modules

| 모듈 | 관계 |
|------|------|
| `packages/survey-builder-config` | 스타일링 타입/스키마/유틸/해석 엔진의 공유 패키지 |
| `libs/client/ui` | Slider, Popover, Collapsible, Tooltip UI 프리미티브 |
| `libs/client/styling` | 스타일링 편집 컴포넌트/훅 라이브러리 |
| `libs/client/project` | 프로젝트 스타일링 폼 — `StylingForm` 사용 |
| `libs/client/survey` | 설문 타입에 `styling` 필드 추가 |
| `libs/server/project` | 프로젝트 DTO에서 `projectStylingSchema` 검증 |
| `libs/server/survey` | 설문 DTO에서 `surveyStylingSchema` 검증 |
| `apps/client` | 설문 에디터에 스타일링 탭 추가 |
| i18n (15개 로케일) | 스타일링 관련 60+ 번역 키 |

## Precautions

### 알려진 제한사항
- **실시간 미리보기**: 설문 응답 페이지가 미구현이므로 미리보기 패널은 제외됨
- **Unsplash 연동**: 배경 이미지 타입은 placeholder로 구현. Unsplash API 키 환경변수(`NEXT_PUBLIC_UNSPLASH_ACCESS_KEY`) 설정 필요
- **파일 업로드**: 배경 업로드 타입은 placeholder. FileStorage 모듈 구현 후 활성화
- **애니메이션 배경**: 상수 목록만 정의 (starfield, snowfall, confetti, particles, gradient-wave). 실제 렌더링은 후속 구현
- **레거시 마이그레이션**: 현재 신규 프로젝트에서는 레거시 필드가 없으므로 실질적으로 no-op. 데이터 이관 시 자동 작동

### 향후 개선
- Unsplash 이미지 검색 브라우저 컴포넌트
- 파일 업로드 배경 지원
- 애니메이션 배경 렌더링
- 테마 프리셋 (원클릭 테마 적용)
- CSS 변수 기반 실시간 미리보기 최적화
- WCAG 대비 비율 자동 검사
