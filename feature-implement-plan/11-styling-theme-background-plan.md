# 기능 구현 계획: 스타일링 / 테마 / 배경 (FS-011)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 설명 | 우선순위 |
|---------|--------|------|---------|
| FN-011-01 | 기반 스타일링 속성 관리 | 40개 이상의 스타일링 속성 정의 및 관리. 7개 카테고리(General Colors, Headlines, Buttons, Inputs, Options, Progress Bar, Card & Layout) | 필수 |
| FN-011-02 | 색상 시스템 (Light/Dark) | 모든 색상에 light/dark 쌍 관리, Dark Mode 토글로 적용 값 결정 | 필수 |
| FN-011-03 | 카드 배치 설정 | Link Survey / App Survey 독립적 casual/straight/simple 3가지 배치 옵션 | 필수 |
| FN-011-04 | 배경 설정 (4가지 타입) | color/image/upload/animation 4가지 배경 타입. Link Survey 전용. 밝기 조절 | 필수 |
| FN-011-05 | Project 레벨 테마 관리 | Look & Feel 페이지에서 전체 프로젝트 기본 테마 관리. 스타일 오버라이드 허용 토글 | 필수 |
| FN-011-06 | Survey 레벨 스타일 오버라이드 | 설문 에디터 Styling 탭에서 프로젝트 테마를 오버라이드. Reset to Theme Styles 기능 | 필수 |
| FN-011-07 | 스타일 적용 우선순위 해석 | 시스템 기본값 < 프로젝트 레거시 마이그레이션 < 프로젝트 설정 < 설문 레거시 마이그레이션 < 설문 설정 5단계 해석 | 필수 |
| FN-011-08 | Suggest Colors (자동 색상 생성) | Brand Color 하나에서 6가지 색상을 혼합 비율 기반으로 자동 생성 | 필수 |
| FN-011-09 | Legacy 필드 마이그레이션 | v4.6의 3개 레거시 필드(questionColor, brandColor, inputColor)를 v4.7 10개 신규 필드로 자동 변환 | 필수 |
| FN-011-10 | 로고 설정 | 로고 URL/배경색 설정, 숨김 토글. Link Survey 전용 | 필수 |
| FN-011-11 | 프로그레스바 커스터마이징 | 트랙 높이/배경색/인디케이터 색상/숨김 설정 | 필수 |

### 1.2 비기능 요구사항

| NFR ID | 항목 | 요구사항 |
|--------|------|---------|
| NFR-011-01 | 실시간 미리보기 | 폼 값 변경 시 지연 없이 설문 미리보기에 즉시 반영 |
| NFR-011-02 | Fallback 체계 | null/undefined 값은 상위 레벨(시스템 기본값 -> 프로젝트 -> 설문) 기본값으로 fallback |
| NFR-011-03 | CSS Color 검증 | 모든 색상 값이 유효한 CSS Color 포맷인지 검증 |
| NFR-011-04 | 플레이스홀더 투명도 범위 | 0 이상 1 이하 |
| NFR-011-05 | 가용성 | 스타일링 데이터 로드 실패 시 시스템 기본값으로 fallback하여 렌더링 중단 방지 |

### 1.3 명세서 내 모호한 점 및 해석

| 항목 | 모호한 점 | 해석/결정 |
|------|----------|----------|
| 스타일링 저장 위치 | Project.styling과 Survey.styling이 이미 Json 필드로 FS-006/008 계획에 존재하나, 상세 구조가 FS-011에서 비로소 정의됨 | 별도 테이블을 만들지 않고 기존 Project.styling(Json)과 Survey.styling(Json) 필드를 그대로 활용한다. 스키마 검증은 zod로 수행 |
| 서버 Action vs REST API | 명세서가 "Server Action 또는 API"로 모호하게 기술 | 기존 패턴(NestJS REST API + apiFetch)을 따라 REST API로 구현한다. Project 스타일링 저장은 기존 PATCH /api/projects/:id의 styling 필드 업데이트, Survey 스타일링은 PUT /api/surveys/:id의 styling 필드 업데이트로 처리 |
| Unsplash 연동 상세 | Unsplash API 키 환경변수 필요하다고만 기술. 서버 프록시인지 클라이언트 직접 호출인지 미정의 | Unsplash 공식 JS SDK를 클라이언트에서 직접 호출한다. API 키는 환경변수 `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY`로 관리. 미설정 시 image 타입 옵션 비노출 (graceful degradation) |
| 파일 업로드 스토리지 | "파일 스토리지가 설정되어 있어야" 활성화라고만 기술. 구체적 스토리지 서비스 미정의 | 파일 업로드 인프라(FS-099 또는 별도 FileStorage 모듈)가 이미 구현되어 있다고 가정한다. 미구현 시 upload 타입 옵션을 비노출하되, 스타일링 스키마와 UI는 완전히 구현 |
| 애니메이션 배경 목록 | 사용 가능한 애니메이션 식별자 목록이 명세에 정의되지 않음 | 초기 구현에서는 코드 내 상수 배열로 애니메이션 목록을 정의한다 (예: starfield, snowfall, confetti 등). 향후 확장 가능한 구조로 설계 |
| 색상 포맷 검증 범위 | "유효한 CSS Color"의 범위(hex만? rgb/hsl 포함?) | hex(#rrggbb, #rgb, #rrggbbaa), rgb(), rgba(), hsl(), hsla() 및 명명된 색상(named color)을 모두 허용한다. 정규식 + 간단한 파서로 검증 |
| Legacy v4.6 데이터 실존 여부 | 현재 프로젝트가 신규 구현이므로 실제 v4.6 레거시 데이터가 존재하는지 불확실 | 마이그레이션 로직은 완전하게 구현하되, 현재 신규 프로젝트에서는 레거시 필드가 없으므로 실질적으로 no-op이 된다. 향후 데이터 이관 시 자동으로 작동 |
| 프로젝트 스타일링 vs 로고 필드 분리 | FS-006에서 Project.logo를 별도 Json 필드로 정의했으나, FS-011에서는 로고가 BaseStyling 내부에 포함 | 데이터 일관성을 위해 Project.logo 필드를 제거하고 Project.styling JSON 내 logo 객체로 통합한다. 또는 두 필드를 병합하는 어댑터를 제공한다. -- 기존 FS-006 계획과의 호환성을 위해 Project.logo 필드는 유지하되, styling.logo와 동기화하는 로직을 추가 |

### 1.4 암묵적 요구사항

| 항목 | 설명 |
|------|------|
| 공유 스타일링 타입/스키마 | 스타일링 타입(StylingColor, BaseStyling, ProjectStyling, SurveyStyling 등)과 zod 스키마를 서버/클라이언트가 공유해야 함. `packages/survey-schema`에 정의 |
| 시스템 기본값 상수 정의 | 명세서 부록 9.3에 정의된 25+ 기본값을 코드 상수로 관리 |
| 색상 유틸리티 함수 | Suggest Colors의 색상 혼합(mix), 밝기 판단(isLight) 등 순수 유틸 함수 구현 필요 |
| 스타일 해석 엔진 | 5단계 우선순위 해석 + 레거시 마이그레이션을 수행하는 순수 함수. 클라이언트 사이드에서 동작 |
| shadcn/ui 컴포넌트 추가 | ColorPicker, Slider, Collapsible, Switch, Tabs 등 스타일링 편집 UI에 필요한 컴포넌트 |
| i18n 키 추가 | 7개 카테고리명, 40+ 속성 라벨, 버튼 텍스트, 토글 라벨 등 다수의 번역 키 필요 |
| 이미지 업로드 API | 배경 이미지, 로고 이미지 업로드를 위한 서버 엔드포인트 필요 (FileStorage 모듈 의존) |
| Unsplash SDK 패키지 설치 | `unsplash-js` 패키지 설치 및 클라이언트 래퍼 구현 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
[공유 패키지]
packages/survey-schema/
├── src/
│   └── styling/
│       ├── styling-color.schema.ts          # StylingColor zod 스키마 (light/dark 쌍)
│       ├── card-arrangement.schema.ts       # CardArrangement zod 스키마
│       ├── background.schema.ts             # Background zod 스키마
│       ├── logo.schema.ts                   # Logo zod 스키마
│       ├── base-styling.schema.ts           # BaseStyling 40+ 속성 zod 스키마
│       ├── project-styling.schema.ts        # ProjectStyling = BaseStyling + allowStyleOverride
│       ├── survey-styling.schema.ts         # SurveyStyling = BaseStyling + overrideTheme
│       ├── styling-defaults.ts              # 시스템 기본값 상수
│       ├── styling-resolver.ts              # 5단계 우선순위 해석 엔진 (순수 함수)
│       ├── legacy-migration.ts              # v4.6 -> v4.7 필드 마이그레이션 (순수 함수)
│       └── color-utils.ts                   # 색상 혼합, 밝기 판단, Suggest Colors 로직

[서버 (NestJS 11)]
libs/server/project/
├── src/lib/
│   ├── dto/
│   │   └── update-project-styling.dto.ts    # 프로젝트 스타일링 업데이트 DTO
│   └── services/
│       └── project.service.ts               # 기존 서비스에 스타일링 업데이트 메서드 추가

libs/server/survey/
├── src/lib/
│   ├── dto/
│   │   └── update-survey.dto.ts             # 기존 DTO에 styling 필드 검증 강화
│   └── services/
│       └── survey.service.ts                # 기존 서비스에 스타일링 관련 로직 추가

[클라이언트 (Next.js 16)]
libs/client/styling/
├── src/
│   ├── index.ts                             # 퍼블릭 API 엑스포트
│   └── lib/
│       ├── hooks/
│       │   ├── use-styling-form.ts          # 스타일링 폼 상태 관리 (react-hook-form + zod)
│       │   ├── use-style-resolver.ts        # 실시간 스타일 해석 훅
│       │   ├── use-suggest-colors.ts        # Suggest Colors 로직 훅
│       │   └── use-unsplash.ts              # Unsplash 이미지 검색 훅
│       ├── components/
│       │   ├── styling-editor.tsx            # 스타일링 편집기 메인 컨테이너
│       │   ├── color-picker-field.tsx        # 색상 피커 + light/dark 입력 필드
│       │   ├── number-field.tsx              # 숫자 입력 + 슬라이더 필드
│       │   ├── general-colors-section.tsx    # General Colors 섹션
│       │   ├── headlines-section.tsx         # Headlines & Descriptions 섹션
│       │   ├── buttons-section.tsx           # Buttons 섹션
│       │   ├── inputs-section.tsx            # Inputs 섹션
│       │   ├── options-section.tsx           # Options 섹션
│       │   ├── progress-bar-section.tsx      # Progress Bar 섹션
│       │   ├── card-layout-section.tsx       # Card & Layout 섹션
│       │   ├── background-section.tsx        # 배경 설정 섹션
│       │   ├── logo-section.tsx              # 로고 설정 섹션
│       │   ├── unsplash-browser.tsx          # Unsplash 이미지 브라우저 모달
│       │   ├── animation-picker.tsx          # 애니메이션 선택기
│       │   └── survey-preview-panel.tsx      # 실시간 미리보기 패널
│       ├── constants/
│       │   └── animations.ts                # 사용 가능한 애니메이션 목록
│       └── types/
│           └── styling.types.ts             # 클라이언트 타입 re-export

apps/client/src/app/[lng]/
├── projects/[projectId]/settings/
│   └── look-and-feel/
│       └── page.tsx                         # Project Look & Feel 설정 페이지
└── surveys/[surveyId]/edit/
    └── styling/                             # Survey 에디터 Styling 탭 (또는 탭 내 포함)
```

**데이터 흐름:**

```
[스타일링 편집 UI]
    |
    ├── (폼 값 변경) → useStylingForm → useStyleResolver → 실시간 미리보기 반영
    |                                       |
    |                 [stylingResolver 순수 함수]
    |                 1. 시스템 기본값
    |                 2. 프로젝트 레거시 마이그레이션
    |                 3. 프로젝트 스타일링
    |                 4. 설문 레거시 마이그레이션
    |                 5. 설문 스타일링 (overrideTheme=true)
    |                        |
    |                        v
    |                 [ResolvedStyling] → 미리보기 렌더링
    |
    └── (저장) → apiFetch → [NestJS Controller]
                                |
                         [JwtAuthGuard + OrgRoleGuard]
                                |
                         [Project/Survey Service]
                                |
                         [Zod 스키마 검증 (서버)]
                                |
                         [Prisma: Project.styling / Survey.styling JSON 업데이트]
```

### 2.2 데이터 모델

이 기능은 **새로운 DB 테이블을 생성하지 않는다**. 기존 FS-006(Project)과 FS-008(Survey)에서 정의된 Json 필드를 활용한다.

**기존 필드 활용:**

```prisma
// 이미 FS-006에서 정의됨
model Project {
  // ...
  styling  Json  @default("{\"allowStyleOverride\":true}")  // ProjectStyling 구조
  logo     Json?                                            // Logo 구조 (별도 필드로 유지)
}

// 이미 FS-008에서 정의됨
model Survey {
  // ...
  styling  Json?  // SurveyStyling 구조
}
```

**TypeScript 타입 구조 (packages/survey-schema에 정의):**

```typescript
// --- 기본 타입 ---

/** 색상 값 (light 필수, dark 선택) */
interface StylingColor {
  light: string;   // 필수, 유효한 CSS Color
  dark?: string;   // 선택, 유효한 CSS Color
}

/** 카드 배치 옵션 */
type CardArrangementOption = 'casual' | 'straight' | 'simple';

interface CardArrangement {
  linkSurvey?: CardArrangementOption;  // 기본값: simple
  appSurvey?: CardArrangementOption;   // 기본값: simple
}

/** 로고 */
interface Logo {
  url?: string;        // 유효한 이미지 URL
  bgColor?: string;    // 유효한 CSS Color
}

/** 배경 */
type BackgroundType = 'color' | 'image' | 'upload' | 'animation';

interface Background {
  bgType?: BackgroundType;
  bg?: string;          // 타입별 값 (색상코드/URL/애니메이션ID)
  brightness?: number;  // 기본값: 100, 양수
}

// --- 기반 스타일링 (40+ 속성) ---

interface BaseStyling {
  // General Colors (6개)
  brandColor?: StylingColor;
  questionColor?: StylingColor;        // legacy 겸용
  inputColor?: StylingColor;           // legacy 겸용 (general)
  highlightBgColor?: StylingColor;
  selectedHighlightBgColor?: StylingColor;
  fontFamily?: string;

  // Headlines & Descriptions (9개)
  headlineFontSize?: number | string;
  headlineFontWeight?: string | number;
  headlineColor?: StylingColor;
  descriptionFontSize?: number | string;
  descriptionFontWeight?: string | number;
  descriptionColor?: StylingColor;
  topLabelFontSize?: number | string;
  topLabelColor?: StylingColor;
  topLabelFontWeight?: string | number;

  // Buttons (8개)
  buttonBgColor?: StylingColor;
  buttonTextColor?: StylingColor;
  buttonBorderRadius?: number | string;
  buttonHeight?: number | string;      // "auto" 허용
  buttonFontSize?: number | string;
  buttonFontWeight?: string | number;
  buttonPaddingX?: number | string;
  buttonPaddingY?: number | string;

  // Inputs (10개)
  inputBgColor?: StylingColor;
  inputBorderColor?: StylingColor;
  inputBorderRadius?: number | string;
  inputHeight?: number | string;
  inputTextColor?: StylingColor;
  inputFontSize?: number | string;
  placeholderOpacity?: number;         // 0~1
  inputPaddingX?: number | string;
  inputPaddingY?: number | string;
  inputShadow?: string;

  // Options (6개)
  optionBgColor?: StylingColor;
  optionLabelColor?: StylingColor;
  optionBorderRadius?: number | string;
  optionPaddingX?: number | string;
  optionPaddingY?: number | string;
  optionFontSize?: number | string;

  // Progress Bar (3개)
  progressTrackHeight?: number | string;
  progressTrackBgColor?: StylingColor;
  progressIndicatorColor?: StylingColor;

  // Card & Layout
  cardBgColor?: StylingColor;
  cardBorderColor?: StylingColor;
  highlightBorderColor?: StylingColor;
  roundness?: number | string;
  cardArrangement?: CardArrangement;
  hideProgressBar?: boolean;
  hideLogo?: boolean;
  logo?: Logo;

  // Background (Link Survey 전용)
  background?: Background;

  // Dark Mode
  darkMode?: boolean;
}

// --- 프로젝트/설문 스타일링 ---

interface ProjectStyling extends BaseStyling {
  allowStyleOverride?: boolean;  // 기본값: true
}

interface SurveyStyling extends BaseStyling {
  overrideTheme?: boolean;       // 기본값: false
}

/** 최종 해석된 스타일링 (모든 속성이 resolved) */
interface ResolvedStyling extends Required<Omit<BaseStyling, 'background' | 'logo'>> {
  background?: Background;
  logo?: Logo;
}
```

### 2.3 API 설계

FS-011은 **기존 API 엔드포인트를 확장**하는 방식으로 구현한다. 새로운 엔드포인트는 최소화한다.

#### 2.3.1 Project 스타일링 업데이트

| 항목 | 내용 |
|------|------|
| 메서드 | PATCH |
| 경로 | `/api/projects/:projectId` |
| 설명 | 기존 Project 수정 API에 styling 필드 포함 |
| 인증 | JWT 필수 |
| 권한 | OWNER / ADMIN |
| 요청 본문 | `{ styling: ProjectStyling, logo?: Logo }` |
| 검증 | ProjectStyling zod 스키마 |
| 응답 | `{ data: Project }` |

#### 2.3.2 Survey 스타일링 업데이트

| 항목 | 내용 |
|------|------|
| 메서드 | PUT |
| 경로 | `/api/surveys/:surveyId` |
| 설명 | 기존 Survey 수정 API에 styling 필드 포함 |
| 인증 | JWT 필수 |
| 권한 | 환경 접근 권한 (EnvironmentAccessGuard) |
| 요청 본문 | `{ styling: SurveyStyling, ... }` |
| 검증 | SurveyStyling zod 스키마 |
| 응답 | `{ data: Survey }` |

#### 2.3.3 Unsplash 이미지 검색 (클라이언트 직접 호출)

Unsplash API는 클라이언트에서 직접 호출한다 (서버 프록시 불필요, Unsplash 정책상 클라이언트 호출 허용).

```
GET https://api.unsplash.com/search/photos?query={keyword}&per_page=20
Headers: Authorization: Client-ID {UNSPLASH_ACCESS_KEY}
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 스타일 해석 엔진 (stylingResolver)

```typescript
// packages/survey-schema/src/styling/styling-resolver.ts

/**
 * 5단계 우선순위 해석을 통해 최종 스타일 객체를 생성한다.
 * 순수 함수 - 서버/클라이언트 양쪽에서 사용 가능.
 */
function resolveStyling(params: {
  systemDefaults: BaseStyling;
  projectStyling?: ProjectStyling;
  surveyStyling?: SurveyStyling;
  overrideTheme: boolean;
}): ResolvedStyling {
  // 1. 시스템 기본값으로 시작
  let result = { ...params.systemDefaults };

  // 2. 프로젝트 레거시 마이그레이션
  if (params.projectStyling) {
    const migrated = migrateLegacyFields(params.projectStyling);
    result = deepMergeNonNull(result, migrated);
  }

  // 3. 프로젝트 스타일링 적용
  if (params.projectStyling) {
    result = deepMergeNonNull(result, params.projectStyling);
  }

  // 4 & 5. 설문 스타일 오버라이드 (overrideTheme=true 시)
  if (params.overrideTheme && params.surveyStyling) {
    const migrated = migrateLegacyFields(params.surveyStyling);
    result = deepMergeNonNull(result, migrated);
    result = deepMergeNonNull(result, params.surveyStyling);
  }

  return result as ResolvedStyling;
}
```

핵심 원칙: `deepMergeNonNull` 함수는 null/undefined 값을 건너뛰고, 명시적으로 설정된 값만 오버라이드한다.

#### 2.4.2 레거시 마이그레이션 (migrateLegacyFields)

```typescript
// packages/survey-schema/src/styling/legacy-migration.ts

/**
 * v4.6 레거시 필드를 v4.7 신규 필드로 변환한다.
 * 신규 필드에 이미 값이 있으면 건너뛴다 (BR-09-01).
 */
function migrateLegacyFields(styling: BaseStyling): Partial<BaseStyling> {
  const migrated: Partial<BaseStyling> = {};

  // questionColor -> 5개 필드
  if (styling.questionColor) {
    if (!styling.headlineColor) migrated.headlineColor = styling.questionColor;
    if (!styling.descriptionColor) migrated.descriptionColor = styling.questionColor;
    if (!styling.topLabelColor) migrated.topLabelColor = styling.questionColor;
    if (!styling.inputTextColor) migrated.inputTextColor = styling.questionColor;
    if (!styling.optionLabelColor) migrated.optionLabelColor = styling.questionColor;
  }

  // brandColor -> 4개 필드
  if (styling.brandColor) {
    if (!styling.buttonBgColor) migrated.buttonBgColor = styling.brandColor;
    if (!styling.buttonTextColor) migrated.buttonTextColor = styling.brandColor;
    if (!styling.progressIndicatorColor) migrated.progressIndicatorColor = styling.brandColor;
    if (!styling.progressTrackBgColor) migrated.progressTrackBgColor = styling.brandColor;
  }

  // inputColor (general) -> 1개 필드
  if (styling.inputColor) {
    if (!styling.optionBgColor) migrated.optionBgColor = styling.inputColor;
  }

  return migrated;
}
```

#### 2.4.3 Suggest Colors 로직

```typescript
// packages/survey-schema/src/styling/color-utils.ts

/**
 * Brand Color에서 조화로운 색상 팔레트를 생성한다.
 * 색상 혼합(mix)은 선형 보간법을 사용한다.
 */
function suggestColors(brandColor: string): SuggestedColors {
  return {
    questionColor: mixColors(brandColor, '#000000', 0.35),
    inputBackground: mixColors(brandColor, '#ffffff', 0.92),
    inputBorderColor: mixColors(brandColor, '#ffffff', 0.60),
    cardBackground: mixColors(brandColor, '#ffffff', 0.97),
    pageBackground: mixColors(brandColor, '#ffffff', 0.855),
    buttonTextColor: isLightColor(brandColor) ? '#0f172a' : '#ffffff',
  };
}

/** 두 색상을 지정 비율로 혼합 (ratio는 두 번째 색상의 비율) */
function mixColors(color1: string, color2: string, ratio: number): string { /* ... */ }

/** 색상의 밝기를 판단 (상대 휘도 기반) */
function isLightColor(color: string): boolean { /* ... */ }
```

#### 2.4.4 스타일링 폼 구조 (useStylingForm 훅)

```typescript
// libs/client/styling/src/lib/hooks/use-styling-form.ts

/**
 * 스타일링 편집 폼 상태를 관리하는 훅.
 * react-hook-form + zod resolver를 사용하여 실시간 검증과 미리보기를 동시에 수행.
 */
function useStylingForm(params: {
  mode: 'project' | 'survey';
  initialData: ProjectStyling | SurveyStyling;
  projectStyling?: ProjectStyling; // survey 모드에서 프로젝트 테마 참조
}) {
  const form = useForm({
    resolver: zodResolver(
      params.mode === 'project' ? projectStylingSchema : surveyStylingSchema
    ),
    defaultValues: params.initialData,
  });

  // 폼 값 변경을 구독하여 실시간 미리보기 업데이트 (NFR-011-01)
  const watchedValues = form.watch();

  const resolvedStyling = useMemo(() =>
    resolveStyling({
      systemDefaults: STYLING_DEFAULTS,
      projectStyling: params.mode === 'project' ? watchedValues : params.projectStyling,
      surveyStyling: params.mode === 'survey' ? watchedValues : undefined,
      overrideTheme: params.mode === 'survey' ? watchedValues.overrideTheme ?? false : false,
    }),
    [watchedValues, params.projectStyling]
  );

  return { form, resolvedStyling };
}
```

### 2.5 기존 시스템 영향 분석

| 영향 대상 | 변경 유형 | 상세 |
|----------|----------|------|
| `packages/survey-schema` | 신규 모듈 추가 | styling/ 디렉토리 하위에 스키마, 유틸, 상수 추가. FS-009에서 이 패키지가 이미 계획됨 |
| `libs/server/project` | 기존 확장 | DTO에 styling 검증 강화, Service에 스타일링 전용 업데이트 로직 |
| `libs/server/survey` | 기존 확장 | DTO에 styling 검증 강화, Survey 응답 시 resolvedStyling 첨부 |
| `libs/client/styling` | 신규 라이브러리 | 스타일링 편집 UI 컴포넌트, 훅, 유틸 |
| `libs/client/ui` | 컴포넌트 추가 | ColorPicker, Slider, Collapsible, Switch, Tabs, Popover 등 shadcn/ui 컴포넌트 |
| `apps/client` | 페이지 추가 | Look & Feel 페이지, Survey Editor Styling 탭 |
| i18n (ko/en) | 번역 키 추가 | 스타일링 관련 60+ 번역 키 |
| `.env.example` | 환경변수 추가 | `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|----------|
| T-01 | 스타일링 타입 정의 | StylingColor, CardArrangement, Background, Logo, BaseStyling, ProjectStyling, SurveyStyling 인터페이스/타입 정의 | - | 중 | 3h |
| T-02 | 시스템 기본값 상수 정의 | STYLING_DEFAULTS 객체 (명세서 부록 9.3 기반 25+ 기본값) | T-01 | 하 | 1h |
| T-03 | 색상 유틸리티 함수 구현 | CSS Color 파싱, hex/rgb 변환, mixColors, isLightColor, suggestColors | T-01 | 중 | 3h |
| T-04 | CSS Color 유효성 검증 함수 | isValidCssColor 함수 구현 (hex, rgb, hsl, named color 지원) | - | 하 | 1h |
| T-05 | Zod 스키마 정의 (StylingColor) | light(필수)/dark(선택) CSS Color 검증 스키마 | T-01, T-04 | 하 | 1h |
| T-06 | Zod 스키마 정의 (BaseStyling) | 40+ 속성 전체의 zod 스키마. 카테고리별 분리 구성 | T-05 | 중 | 3h |
| T-07 | Zod 스키마 정의 (ProjectStyling, SurveyStyling) | BaseStyling 확장 + allowStyleOverride / overrideTheme | T-06 | 하 | 1h |
| T-08 | Legacy 마이그레이션 함수 구현 | migrateLegacyFields - v4.6 3개 필드 -> v4.7 10개 필드 변환 | T-01 | 중 | 2h |
| T-09 | deepMergeNonNull 유틸 함수 | null/undefined를 건너뛰는 깊은 병합 유틸리티 | - | 하 | 1h |
| T-10 | 스타일 해석 엔진 (resolveStyling) | 5단계 우선순위 해석 순수 함수 | T-02, T-08, T-09 | 중 | 3h |
| T-11 | 스타일링 타입/스키마 단위 테스트 | 스키마 검증, 기본값, 마이그레이션, 색상 유틸, 스타일 해석 테스트 | T-01~T-10 | 중 | 4h |
| T-12 | shadcn/ui 컴포넌트 추가 | Slider, Collapsible, Switch, Tabs, Popover, Tooltip 설치 및 등록 | - | 하 | 1h |
| T-13 | ColorPicker 컴포넌트 구현 | 색상 피커 UI (hex 입력 + 비주얼 피커 + light/dark 모드 전환) | T-12 | 중상 | 4h |
| T-14 | NumberField 컴포넌트 구현 | 숫자 입력 + 슬라이더 조합 필드 | T-12 | 하 | 1h |
| T-15 | General Colors 섹션 컴포넌트 | Brand Color, Question Color, Input Color 등 6개 속성 편집 + Suggest Colors 버튼 | T-13, T-03 | 중 | 3h |
| T-16 | Headlines & Descriptions 섹션 컴포넌트 | 9개 속성 편집 (폰트 크기, 굵기, 색상) | T-13, T-14 | 중 | 2h |
| T-17 | Buttons 섹션 컴포넌트 | 8개 속성 편집 | T-13, T-14 | 중 | 2h |
| T-18 | Inputs 섹션 컴포넌트 | 10개 속성 편집 (인풋 그림자 문자열 입력 포함) | T-13, T-14 | 중 | 2h |
| T-19 | Options 섹션 컴포넌트 | 6개 속성 편집 | T-13, T-14 | 중 | 1.5h |
| T-20 | Progress Bar 섹션 컴포넌트 | 3개 속성 + 숨김 토글 편집 | T-13, T-14 | 하 | 1h |
| T-21 | Card & Layout 섹션 컴포넌트 | 카드 배경/테두리, 둥글기, CardArrangement 선택, 프로그레스바/로고 숨김 토글 | T-13, T-14 | 중 | 2h |
| T-22 | 배경 설정 섹션 컴포넌트 | 4가지 배경 타입 선택 UI, 밝기 슬라이더 | T-13, T-14 | 중상 | 3h |
| T-23 | Unsplash 브라우저 컴포넌트 | Unsplash API 검색 + 이미지 그리드 + 선택 UI | T-22 | 중 | 3h |
| T-24 | 애니메이션 선택기 컴포넌트 | 애니메이션 목록 + 미리보기 + 선택 UI | T-22 | 중 | 2h |
| T-25 | 로고 설정 섹션 컴포넌트 | 로고 URL 입력/업로드, 배경색 설정, 숨김 토글 | T-13 | 중 | 2h |
| T-26 | 스타일링 편집기 메인 컨테이너 | Collapsible 섹션 구성, Dark Mode 토글, 오버라이드 토글 통합 | T-15~T-25 | 중 | 3h |
| T-27 | 설문 미리보기 패널 | resolvedStyling을 실시간 반영하는 미리보기 영역 | T-10 | 중상 | 4h |
| T-28 | useStylingForm 훅 구현 | react-hook-form + zod + 실시간 해석 통합 | T-07, T-10 | 중 | 3h |
| T-29 | Project Look & Feel 페이지 구현 | 프로젝트 설정 내 스타일링 편집 페이지 (Project 모드) | T-26, T-28 | 중 | 3h |
| T-30 | Survey Editor Styling 탭 구현 | 설문 에디터 내 스타일링 탭 (Survey 모드, 오버라이드 토글) | T-26, T-28 | 중 | 3h |
| T-31 | Reset to Theme Styles 기능 | 설문 스타일을 프로젝트 기본값으로 초기화하는 버튼/로직 | T-30 | 하 | 1h |
| T-32 | 서버 DTO 스타일링 검증 강화 | Project/Survey 수정 DTO에 스타일링 JSON 검증 추가 (class-validator + zod) | T-07 | 중 | 2h |
| T-33 | 서버 스타일링 저장 로직 | Project/Survey Service에 스타일링 저장 로직 통합 | T-32 | 중 | 2h |
| T-34 | i18n 번역 키 추가 (ko/en) | 60+ 번역 키: 카테고리명, 속성 라벨, 버튼, 토글, 에러 메시지 | - | 중 | 2h |
| T-35 | 환경변수 설정 | NEXT_PUBLIC_UNSPLASH_ACCESS_KEY를 .env.example에 추가 | - | 하 | 0.5h |
| T-36 | 통합 테스트 (스타일링 저장/로드) | API 통합 테스트: 프로젝트/설문 스타일링 저장, 유효성 검증, 응답 확인 | T-33 | 중 | 3h |
| T-37 | E2E 테스트 시나리오 작성 | Look & Feel 페이지 스타일 변경 -> 저장 -> 설문 미리보기 반영 확인 | T-29, T-30 | 중 | 3h |

### 3.2 구현 순서 및 마일스톤

**마일스톤 1: 스타일링 도메인 모델 (T-01 ~ T-11)**
- 기간: 약 3일
- 목표: 공유 패키지에 스타일링 타입, 스키마, 유틸리티, 해석 엔진 완성
- 검증: 단위 테스트 전체 통과
- 순서: T-01 -> T-02 -> T-04 -> T-03 -> T-05 -> T-06 -> T-07 -> T-09 -> T-08 -> T-10 -> T-11

**마일스톤 2: 서버 스타일링 검증/저장 (T-32 ~ T-33, T-35)**
- 기간: 약 1.5일
- 목표: 서버에서 스타일링 JSON 검증 및 저장이 동작
- 검증: API 테스트로 유효한/유효하지 않은 스타일링 데이터 저장 확인
- 순서: T-35 -> T-32 -> T-33

**마일스톤 3: UI 기반 컴포넌트 (T-12 ~ T-14, T-34)**
- 기간: 약 1일
- 목표: shadcn/ui 컴포넌트 추가, ColorPicker/NumberField 완성, i18n 키 등록
- 검증: Storybook 또는 개별 컴포넌트 렌더링 확인
- 순서: T-12 -> T-14 -> T-13 -> T-34

**마일스톤 4: 스타일링 섹션 컴포넌트 (T-15 ~ T-25)**
- 기간: 약 3일
- 목표: 7개 카테고리 섹션 + 배경/로고/Unsplash/애니메이션 컴포넌트 완성
- 검증: 각 섹션이 독립적으로 렌더링되고 폼 값 변경이 동작
- 순서: T-15 -> T-16 -> T-17 -> T-18 -> T-19 -> T-20 -> T-21 -> T-22 -> T-23 -> T-24 -> T-25

**마일스톤 5: 통합 및 페이지 구현 (T-26 ~ T-31)**
- 기간: 약 2.5일
- 목표: 스타일링 편집기 통합, 미리보기 패널, Project/Survey 페이지 완성
- 검증: Project Look & Feel에서 스타일 편집 -> 저장 -> 설문 미리보기 반영 E2E 플로우
- 순서: T-28 -> T-26 -> T-27 -> T-29 -> T-30 -> T-31

**마일스톤 6: 테스트 (T-36 ~ T-37)**
- 기간: 약 1.5일
- 목표: 통합 테스트 + E2E 테스트 완료
- 순서: T-36 -> T-37

**전체 예상 소요 시간: 약 12~13일 (1명 기준)**

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|----------|----------|
| `packages/survey-schema/src/styling/styling-color.schema.ts` | 생성 | StylingColor zod 스키마 정의 |
| `packages/survey-schema/src/styling/card-arrangement.schema.ts` | 생성 | CardArrangement zod 스키마 및 enum |
| `packages/survey-schema/src/styling/background.schema.ts` | 생성 | Background zod 스키마 (bgType discriminated) |
| `packages/survey-schema/src/styling/logo.schema.ts` | 생성 | Logo zod 스키마 |
| `packages/survey-schema/src/styling/base-styling.schema.ts` | 생성 | BaseStyling 전체 40+ 속성 zod 스키마 |
| `packages/survey-schema/src/styling/project-styling.schema.ts` | 생성 | ProjectStyling = BaseStyling + allowStyleOverride |
| `packages/survey-schema/src/styling/survey-styling.schema.ts` | 생성 | SurveyStyling = BaseStyling + overrideTheme |
| `packages/survey-schema/src/styling/styling-defaults.ts` | 생성 | STYLING_DEFAULTS 시스템 기본값 상수 |
| `packages/survey-schema/src/styling/styling-resolver.ts` | 생성 | resolveStyling 5단계 해석 엔진 + deepMergeNonNull |
| `packages/survey-schema/src/styling/legacy-migration.ts` | 생성 | migrateLegacyFields v4.6 -> v4.7 변환 |
| `packages/survey-schema/src/styling/color-utils.ts` | 생성 | mixColors, isLightColor, suggestColors, isValidCssColor |
| `packages/survey-schema/src/styling/index.ts` | 생성 | styling 모듈 배럴 엑스포트 |
| `packages/survey-schema/src/index.ts` | 수정 | styling 모듈 re-export 추가 |
| `libs/client/styling/src/index.ts` | 생성 | 스타일링 라이브러리 퍼블릭 API |
| `libs/client/styling/src/lib/hooks/use-styling-form.ts` | 생성 | react-hook-form + zod + 실시간 해석 통합 훅 |
| `libs/client/styling/src/lib/hooks/use-style-resolver.ts` | 생성 | resolveStyling 래핑 + useMemo 훅 |
| `libs/client/styling/src/lib/hooks/use-suggest-colors.ts` | 생성 | suggestColors 래핑 + 폼 값 자동 업데이트 |
| `libs/client/styling/src/lib/hooks/use-unsplash.ts` | 생성 | Unsplash API 검색 + 디바운스 훅 |
| `libs/client/styling/src/lib/components/styling-editor.tsx` | 생성 | 스타일링 편집기 메인 컨테이너 (Collapsible 섹션 + 토글) |
| `libs/client/styling/src/lib/components/color-picker-field.tsx` | 생성 | 색상 피커 컴포넌트 (light/dark 입력, 시각적 피커) |
| `libs/client/styling/src/lib/components/number-field.tsx` | 생성 | 숫자 입력 + 슬라이더 조합 컴포넌트 |
| `libs/client/styling/src/lib/components/general-colors-section.tsx` | 생성 | General Colors 카테고리 섹션 |
| `libs/client/styling/src/lib/components/headlines-section.tsx` | 생성 | Headlines & Descriptions 카테고리 섹션 |
| `libs/client/styling/src/lib/components/buttons-section.tsx` | 생성 | Buttons 카테고리 섹션 |
| `libs/client/styling/src/lib/components/inputs-section.tsx` | 생성 | Inputs 카테고리 섹션 |
| `libs/client/styling/src/lib/components/options-section.tsx` | 생성 | Options 카테고리 섹션 |
| `libs/client/styling/src/lib/components/progress-bar-section.tsx` | 생성 | Progress Bar 카테고리 섹션 |
| `libs/client/styling/src/lib/components/card-layout-section.tsx` | 생성 | Card & Layout 카테고리 섹션 |
| `libs/client/styling/src/lib/components/background-section.tsx` | 생성 | 배경 설정 섹션 (4가지 타입 선택 + 밝기) |
| `libs/client/styling/src/lib/components/logo-section.tsx` | 생성 | 로고 설정 섹션 (URL/업로드/배경색/숨김) |
| `libs/client/styling/src/lib/components/unsplash-browser.tsx` | 생성 | Unsplash 이미지 검색 브라우저 모달 |
| `libs/client/styling/src/lib/components/animation-picker.tsx` | 생성 | 애니메이션 배경 선택기 |
| `libs/client/styling/src/lib/components/survey-preview-panel.tsx` | 생성 | 실시간 미리보기 패널 |
| `libs/client/styling/src/lib/constants/animations.ts` | 생성 | 사용 가능한 애니메이션 목록 상수 |
| `libs/client/styling/src/lib/types/styling.types.ts` | 생성 | 클라이언트 타입 re-export |
| `libs/client/ui/src/components/ui/slider.tsx` | 생성 | shadcn/ui Slider 컴포넌트 |
| `libs/client/ui/src/components/ui/collapsible.tsx` | 생성 | shadcn/ui Collapsible 컴포넌트 |
| `libs/client/ui/src/components/ui/switch.tsx` | 생성 | shadcn/ui Switch 컴포넌트 |
| `libs/client/ui/src/components/ui/tabs.tsx` | 생성 | shadcn/ui Tabs 컴포넌트 |
| `libs/client/ui/src/components/ui/popover.tsx` | 생성 | shadcn/ui Popover 컴포넌트 (ColorPicker에 사용) |
| `libs/client/ui/src/components/ui/tooltip.tsx` | 생성 | shadcn/ui Tooltip 컴포넌트 |
| `libs/client/ui/src/index.ts` | 수정 | 신규 컴포넌트 export 추가 |
| `libs/server/project/src/lib/dto/update-project-styling.dto.ts` | 생성 | 프로젝트 스타일링 업데이트 DTO (class-validator) |
| `libs/server/project/src/lib/services/project.service.ts` | 수정 | updateStyling 메서드 추가, zod 스키마 서버 검증 |
| `libs/server/project/src/lib/controllers/project.controller.ts` | 수정 | PATCH /:id 핸들러에 스타일링 업데이트 분기 추가 |
| `libs/server/survey/src/lib/dto/update-survey.dto.ts` | 수정 | styling 필드에 SurveyStyling 검증 강화 |
| `libs/server/survey/src/lib/services/survey.service.ts` | 수정 | 스타일링 저장 시 zod 스키마 검증 추가 |
| `apps/client/src/app/[lng]/projects/[projectId]/settings/look-and-feel/page.tsx` | 생성 | Project Look & Feel 설정 페이지 |
| `apps/client/src/app/i18n/locales/ko/styling.json` | 생성 | 한국어 스타일링 번역 키 |
| `apps/client/src/app/i18n/locales/en/styling.json` | 생성 | 영어 스타일링 번역 키 |
| `.env.example` | 수정 | NEXT_PUBLIC_UNSPLASH_ACCESS_KEY 추가 |
| `package.json` (root) | 수정 | unsplash-js, @radix-ui/react-slider 등 의존성 추가 |

---

## 4. 리스크 및 대응 전략

| 리스크 | 영향 | 발생 확률 | 대응 전략 |
|--------|------|----------|----------|
| packages/survey-schema 미구현 | FS-009/012에서 이 패키지가 계획되었으나 아직 구현되지 않았으면 스키마 정의 불가 | 높음 | FS-011 구현 시 packages/survey-schema의 기본 구조(tsconfig, package.json, index.ts)를 함께 생성한다. 향후 FS-009 구현 시 merge |
| 선행 모듈(Project/Survey) 미구현 | FS-006, FS-008이 아직 구현되지 않으면 API 연동 불가 | 중간 | 스타일링 도메인 모델(마일스톤 1)과 UI 컴포넌트(마일스톤 3-4)는 독립적으로 구현 가능. API 연동은 모의(mock) 데이터로 개발하고, 실제 모듈 구현 후 통합 |
| ColorPicker 서드파티 의존성 | 자체 구현 시 복잡도 높음, 서드파티 라이브러리 품질/호환성 불확실 | 중간 | react-colorful(경량 3KB)을 기본 라이브러리로 채택하고, hex 입력 필드를 자체 구현으로 보완. 라이브러리 문제 시 순수 CSS + input으로 대체 가능 |
| Unsplash API Rate Limit | 무료 플랜 시간당 50건 제한 | 낮음 | 검색에 500ms 디바운스 적용. 결과를 로컬 캐시. Rate Limit 도달 시 사용자에게 안내 메시지 표시 |
| 실시간 미리보기 성능 | 40+ 속성 변경마다 미리보기 렌더링 시 프레임 드롭 가능 | 중간 | resolveStyling을 useMemo로 메모이제이션, 미리보기 컴포넌트에 React.memo 적용, CSS 변수(custom properties) 기반 스타일 적용으로 DOM 조작 최소화 |
| CSS Color 파싱 복잡도 | 모든 CSS Color 포맷을 지원하는 파서 자체 구현 부담 | 중간 | 초기에는 hex 포맷 위주 지원. 확장 필요 시 tinycolor2 또는 colord 경량 라이브러리 도입. 서버 검증에서도 동일 라이브러리 사용 |
| Deep Merge 엣지 케이스 | 중첩 객체(StylingColor, CardArrangement 등)의 null/undefined 처리 오류 | 중간 | deepMergeNonNull에 대한 철저한 단위 테스트(중첩 객체, 배열, null, undefined, 빈 문자열 등 경계 케이스) |

---

## 5. 테스트 전략

### 5.1 단위 테스트

**대상: packages/survey-schema/src/styling/**

| 테스트 대상 | 테스트 항목 |
|------------|------------|
| `styling-color.schema.ts` | (1) light 필수 검증, (2) dark 선택 검증, (3) 유효하지 않은 CSS Color 거부, (4) hex/rgb/hsl/named color 모두 허용 |
| `base-styling.schema.ts` | (1) 빈 객체 허용 (모든 속성 선택), (2) 각 카테고리 속성 타입 검증, (3) placeholderOpacity 범위(0~1) 검증, (4) buttonHeight "auto" 문자열 허용 |
| `project-styling.schema.ts` | (1) allowStyleOverride 기본값 true, (2) 전체 속성 유효성 검증 통과 |
| `survey-styling.schema.ts` | (1) overrideTheme 기본값 false, (2) 전체 속성 유효성 검증 통과 |
| `color-utils.ts` | (1) mixColors 혼합 비율 정확도, (2) isLightColor 밝기 판단 (흰색=true, 검정=false, 중간값), (3) suggestColors 6개 필드 모두 유효한 색상 반환, (4) isValidCssColor 유효/무효 케이스 |
| `legacy-migration.ts` | (1) questionColor -> 5개 필드 매핑, (2) brandColor -> 4개 필드 매핑, (3) inputColor -> 1개 필드 매핑, (4) 신규 필드 존재 시 마이그레이션 건너뜀 (BR-09-01), (5) 레거시 필드 없으면 빈 객체 반환 |
| `styling-resolver.ts` | (1) 시스템 기본값만으로 해석, (2) 프로젝트 스타일링 오버라이드 확인, (3) overrideTheme=false 시 설문 스타일 무시, (4) overrideTheme=true 시 설문 스타일 최우선, (5) null/undefined 속성 fallback 동작, (6) 레거시 마이그레이션이 해석 과정에서 적용 |
| `styling-defaults.ts` | (1) 모든 기본값이 명세서 부록 9.3과 일치 |

### 5.2 통합 테스트

| 테스트 시나리오 | 검증 항목 |
|----------------|----------|
| Project 스타일링 저장 | (1) PATCH /api/projects/:id 로 유효한 styling 전송 -> 200 OK, (2) 유효하지 않은 색상 값 -> 400 Bad Request, (3) 권한 없는 사용자 -> 403 Forbidden |
| Survey 스타일링 저장 | (1) PUT /api/surveys/:id 로 유효한 styling 전송 -> 200 OK, (2) overrideTheme=true + 스타일 속성 설정 -> 저장 성공, (3) 프로젝트 allowStyleOverride=false 시 오버라이드 거부 확인 |
| 스타일 해석 API | (1) 설문 조회 시 resolvedStyling이 올바르게 계산되어 반환 |

### 5.3 E2E 테스트

| 시나리오 | 플로우 |
|---------|--------|
| Project Look & Feel 설정 | (1) 프로젝트 설정 > Look & Feel 접근, (2) Brand Color 변경, (3) Suggest Colors 클릭, (4) 생성된 색상 팔레트 확인, (5) 저장, (6) 새 설문에서 프로젝트 테마 적용 확인 |
| Survey 스타일 오버라이드 | (1) 설문 에디터 > Styling 탭 접근, (2) 오버라이드 토글 활성화, (3) 카드 배경색 변경, (4) 미리보기에 즉시 반영 확인, (5) 저장, (6) Reset to Theme Styles 로 초기화 확인 |
| 배경 설정 (Link Survey) | (1) Link Survey 생성, (2) Styling 탭 > 배경 섹션, (3) color 타입 선택 + 색상 설정, (4) image 타입 전환 + Unsplash 검색, (5) 밝기 슬라이더 조절, (6) 미리보기 반영 확인 |
| Dark Mode 토글 | (1) Dark Mode 활성화, (2) dark 색상 입력 필드 활성화 확인, (3) dark 값 입력, (4) 미리보기에 다크 모드 적용 확인, (5) dark 값 미설정 시 light 값 fallback 확인 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 설명 |
|------|------|
| 선행 의존 | packages/survey-schema, libs/server/project, libs/server/survey가 구현되어 있어야 완전한 통합 가능. 미구현 시 mock 기반 개발 |
| 파일 업로드 | FileStorage 모듈이 필요 (upload 배경, 로고 이미지). 미구현 시 해당 기능은 UI만 구현하고 실제 업로드는 비활성화 |
| CSS 직접 편집 불가 | 명세서에 의해 사전 정의된 40+ 속성만 편집 가능 |
| 커스텀 폰트 업로드 불가 | 폰트 패밀리는 문자열(Google Fonts 등)로만 지정 |
| 런타임 동적 스타일 변경 불가 | 설문 실행 중 스타일 변경 미지원 |
| 애니메이션 배경 목록 | 초기 구현에서는 하드코딩된 3~5개 애니메이션만 제공 |

### 6.2 향후 개선 가능 항목

| 항목 | 설명 |
|------|------|
| 커스텀 폰트 업로드 | 사용자가 폰트 파일을 업로드하여 설문에 적용하는 기능 |
| 테마 프리셋 | 다양한 사전 정의 테마를 원클릭으로 적용하는 기능 |
| 실시간 협업 편집 | 여러 사용자가 동시에 스타일링을 편집하는 기능 (WebSocket) |
| CSS 변수 최적화 | resolvedStyling을 CSS Custom Properties로 변환하여 렌더링 성능 극대화 |
| 색상 접근성 검사 | WCAG 대비 비율 자동 검사 및 경고 표시 |
| 애니메이션 배경 확장 | 사용자 정의 CSS 애니메이션 또는 Lottie 애니메이션 지원 |
| 스타일링 이력 관리 | 스타일링 변경 이력을 저장하고 특정 시점으로 복원하는 기능 |

---

## 7. i18n 고려사항

### 7.1 신규 번역 키 목록

네임스페이스: `styling`

**카테고리 및 섹션 제목:**
- `styling.sections.generalColors` - "일반 색상" / "General Colors"
- `styling.sections.headlines` - "제목 및 설명" / "Headlines & Descriptions"
- `styling.sections.buttons` - "버튼" / "Buttons"
- `styling.sections.inputs` - "입력 필드" / "Inputs"
- `styling.sections.options` - "선택지" / "Options"
- `styling.sections.progressBar` - "프로그레스바" / "Progress Bar"
- `styling.sections.cardLayout` - "카드 및 레이아웃" / "Card & Layout"
- `styling.sections.background` - "배경" / "Background"
- `styling.sections.logo` - "로고" / "Logo"

**속성 라벨 (주요 항목):**
- `styling.fields.brandColor` - "브랜드 색상" / "Brand Color"
- `styling.fields.questionColor` - "질문 텍스트 색상" / "Question Text Color"
- `styling.fields.fontFamily` - "폰트 패밀리" / "Font Family"
- `styling.fields.darkMode` - "다크 모드" / "Dark Mode"
- `styling.fields.cardArrangement` - "카드 배치" / "Card Arrangement"
- `styling.fields.hideProgressBar` - "프로그레스바 숨기기" / "Hide Progress Bar"
- `styling.fields.hideLogo` - "로고 숨기기" / "Hide Logo"
- (그 외 40+ 속성 라벨은 동일 패턴으로 추가)

**버튼 및 액션:**
- `styling.actions.suggestColors` - "색상 자동 생성" / "Suggest Colors"
- `styling.actions.resetToTheme` - "테마 스타일로 초기화" / "Reset to Theme Styles"
- `styling.actions.save` - "저장" / "Save"
- `styling.actions.uploadImage` - "이미지 업로드" / "Upload Image"
- `styling.actions.searchImages` - "이미지 검색" / "Search Images"

**토글 및 설정:**
- `styling.toggles.allowOverride` - "스타일 오버라이드 허용" / "Allow Style Override"
- `styling.toggles.overrideTheme` - "테마 스타일 오버라이드" / "Override Theme Styles"
- `styling.toggles.lightMode` - "라이트" / "Light"
- `styling.toggles.darkModeLabel` - "다크" / "Dark"

**배경 타입:**
- `styling.background.color` - "단색" / "Color"
- `styling.background.image` - "이미지 (Unsplash)" / "Image (Unsplash)"
- `styling.background.upload` - "이미지 업로드" / "Upload Image"
- `styling.background.animation` - "애니메이션" / "Animation"
- `styling.background.brightness` - "밝기" / "Brightness"

**카드 배치 옵션:**
- `styling.cardArrangement.casual` - "캐주얼" / "Casual"
- `styling.cardArrangement.straight` - "정렬" / "Straight"
- `styling.cardArrangement.simple` - "심플" / "Simple"

**에러 메시지:**
- `styling.errors.invalidColor` - "유효한 색상 값을 입력해주세요" / "Please enter a valid color value"
- `styling.errors.brandColorRequired` - "Suggest Colors를 사용하려면 브랜드 색상을 먼저 설정해주세요" / "Please set a brand color first to use Suggest Colors"
- `styling.errors.uploadRequired` - "업로드 배경 타입에서는 이미지가 필수입니다" / "Image is required for upload background type"
- `styling.errors.saveFailed` - "스타일링 저장에 실패했습니다" / "Failed to save styling"
