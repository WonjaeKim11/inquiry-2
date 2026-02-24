# FSD-011 Phase 1: 공유 스타일링 스키마 및 유틸리티

## Overview
설문 빌더의 스타일링 시스템을 위한 공유 패키지 모듈을 생성한다. `packages/survey-builder-config`에 `styling/` 디렉토리를 추가하여 Zod v4 기반 스키마(BaseStyling, ProjectStyling, SurveyStyling), 색상 유틸리티, 레거시 마이그레이션, 스타일 해석기를 제공한다. 서버와 클라이언트 양쪽에서 동일한 타입과 로직을 사용할 수 있도록 순수 함수로 구현하였다.

## Changed Files

### 신규 생성
- `packages/survey-builder-config/src/lib/styling/types.ts` - Zod 스키마 및 TypeScript 타입 정의 (StylingColor, BaseStyling 40+ 속성, ProjectStyling, SurveyStyling)
- `packages/survey-builder-config/src/lib/styling/constants.ts` - 시스템 기본값 상수 (STYLING_DEFAULTS), 애니메이션 배경 목록
- `packages/survey-builder-config/src/lib/styling/color-utils.ts` - CSS 색상 검증, hex 파싱, 색상 혼합, 밝기 판단, 팔레트 제안 유틸리티
- `packages/survey-builder-config/src/lib/styling/legacy-migration.ts` - v4.6에서 v4.7로의 레거시 필드 마이그레이션 함수
- `packages/survey-builder-config/src/lib/styling/resolve-styling.ts` - 5단계 우선순위 스타일 해석기 (deepMergeNonNull, resolveStyling)
- `packages/survey-builder-config/src/lib/styling/index.ts` - barrel export

### 수정
- `packages/survey-builder-config/src/index.ts` - Styling 모듈 re-export 추가

## Major Changes

### 1. Zod 스키마 기반 타입 시스템 (types.ts)
- `StylingColor`: `{ light: string; dark?: string }` 구조로 라이트/다크 모드 색상 지원
- `BaseStyling`: 40개 이상 속성을 가진 기본 스타일링 스키마 (General Colors, Headlines, Buttons, Inputs, Options, Progress Bar, Card & Layout, Background, Dark Mode)
- `ProjectStyling`: BaseStyling + `allowStyleOverride` (프로젝트 레벨)
- `SurveyStyling`: BaseStyling + `overrideTheme` (설문 레벨)
- `numberOrString` union 타입으로 fontSize, padding 등에 숫자와 문자열 모두 허용

### 2. 색상 유틸리티 (color-utils.ts)
- `isValidCssColor()`: hex, rgb(), rgba(), hsl(), hsla(), named color 검증
- `parseHexColor()`: hex 문자열을 RGB 객체로 변환 (#rgb, #rrggbb, named color 지원)
- `mixColors()`: 두 색상을 선형 보간법으로 혼합
- `isLightColor()`: WCAG 2.0 상대 휘도 기반 밝기 판단
- `suggestColors()`: brandColor에서 조화로운 6색 팔레트 자동 생성

### 3. 레거시 마이그레이션 (legacy-migration.ts)
```typescript
// questionColor → headlineColor, descriptionColor, topLabelColor, inputTextColor, optionLabelColor
// brandColor → buttonBgColor, buttonTextColor, progressIndicatorColor, progressTrackBgColor
// inputColor → optionBgColor
```
신규 필드에 이미 값이 있으면 건너뛰는 BR-09-01 규칙 준수.

### 4. 스타일 해석기 (resolve-styling.ts)
5단계 우선순위로 최종 스타일을 결정하는 순수 함수:
1. 시스템 기본값 (STYLING_DEFAULTS)
2. 프로젝트 레거시 마이그레이션
3. 프로젝트 스타일링 적용
4. 설문 레거시 마이그레이션 (overrideTheme=true 시)
5. 설문 스타일링 적용 (overrideTheme=true 시)

`deepMergeNonNull()`은 null/undefined가 아닌 값만 재귀적으로 병합한다.

## How to use it

```typescript
import {
  baseStylingSchema,
  resolveStyling,
  suggestColors,
  isValidCssColor,
  STYLING_DEFAULTS,
} from '@inquiry/survey-builder-config';

// 스키마 검증
const parsed = baseStylingSchema.parse({ brandColor: { light: '#3b82f6' } });

// 스타일 해석
const resolved = resolveStyling({
  projectStyling: { brandColor: { light: '#3b82f6' }, allowStyleOverride: true },
  surveyStyling: { overrideTheme: true, buttonBgColor: { light: '#ef4444' } },
});

// 색상 팔레트 제안
const palette = suggestColors('#3b82f6');
// { questionColor, inputBackground, inputBorderColor, cardBackground, pageBackground, buttonTextColor }

// CSS 색상 검증
isValidCssColor('#ff0000'); // true
isValidCssColor('rgb(255, 0, 0)'); // true
```

## Related Components/Modules
- `packages/survey-builder-config/src/lib/multilingual/` - 동일한 디렉토리 패턴 (types, constants, utils, index) 참조
- 서버 측 Survey 모듈에서 `resolveStyling`을 호출하여 최종 스타일 계산
- 클라이언트 설문 렌더러에서 `BaseStyling` 타입으로 CSS 변수 생성 시 사용

## Precautions
- `CSS_COLOR_REGEX`는 types.ts에서 미사용으로 판단하여 제거하였음 (색상 검증은 color-utils.ts의 `isValidCssColor`가 담당)
- `STYLING_DEFAULTS`의 `background`와 `logo`는 optional이므로 `undefined`로 설정
- `deepMergeNonNull`은 배열을 재귀 병합하지 않고 통째로 교체함
- Phase 2 이후에서 서버/클라이언트 통합 및 UI 컴포넌트 구현 예정
