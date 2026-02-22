# 기능 구현 계획: 링크 공유 및 임베드 (FS-016)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 설명 | 우선순위 |
|---------|--------|------|---------|
| FN-016-01 | Share Modal 탭 구성 | Link Survey에 대한 10개 탭(공유 7 + 설정 3)의 Share Modal. 환경/Single-use에 따라 탭 필터링/비활성화 | 높음 |
| FN-016-02 | 링크 설문 페이지 렌더링 파이프라인 | /s/{surveyId} URL로 접근하는 설문 페이지의 3단계 데이터 페칭 및 렌더링 파이프라인 | 높음 |
| FN-016-03 | 임베드 모드 (embed=true) | embed=true 파라미터 시 배경/로고/푸터 제거, fullSizeCards 활성화, Autofocus 비활성화 | 높음 |
| FN-016-04 | iframe 완료 이벤트 | 설문 완료 시 window.parent.postMessage("formbricksSurveyCompleted", "*") 호출 | 높음 |
| FN-016-05 | Pretty URL (/p/{slug}) | Self-hosted 전용. 사용자 정의 slug로 /p/{slug} 접근. 소문자+숫자+하이픈만 허용 | 중간 |
| FN-016-06 | OG Meta Tags 생성 | Open Graph/Twitter Card 메타 태그 자동 생성. Link Metadata > Welcome Card > Survey name 우선순위 | 중간 |
| FN-016-07 | 스타일링 결정 로직 | 프로젝트 설정 기반 스타일 오버라이드 허용 여부에 따른 최종 스타일 결정 | 중간 |
| FN-016-08 | 언어 코드 결정 | lang 파라미터 + 다국어 권한 + 설문 언어 설정 기반 표시 언어 결정 | 중간 |
| FN-016-09 | 커스텀 스크립트 주입 | Self-hosted 전용. 프로젝트/설문 수준 커스텀 HTML, add/replace 모드 | 낮음 |
| FN-016-10 | Viewport 설정 | 모바일 확대/축소 비활성화, viewport-fit=contain | 높음 |

### 1.2 비기능 요구사항

| NFR ID | 항목 | 요구사항 |
|--------|------|---------|
| NFR-016-01 | 페이지 로딩 성능 | 3단계 최적화 파이프라인: 200-600ms 응답 시간 |
| NFR-016-02 | 캐싱 | 요청 수준 캐싱(React cache)으로 동일 요청 내 Survey 조회 중복 제거 |
| NFR-016-03 | 병렬 처리 | Stage 2의 3개 쿼리 병렬 실행 (Promise.all) |
| NFR-016-04 | 보안 (postMessage) | targetOrigin 와일드카드("*"), 민감 데이터 미포함 |
| NFR-016-05 | 보안 (커스텀 스크립트) | Self-hosted 전용, Cloud에서 완전 비활성화 |
| NFR-016-06 | SEO | robots: noindex, follow / googlebot: noimageindex |
| NFR-016-07 | 반응형 | 최대 너비 기반 설문 카드, 모바일/데스크톱 대응 |
| NFR-016-08 | Share Modal 성능 | 200ms 이내 렌더링 |

### 1.3 명세서 내 모호한 점 및 해석

| 항목 | 모호한 점 | 해석/결정 |
|------|----------|----------|
| /s/{surveyId} 라우트 위치 | 기존 Next.js App Router가 `[lng]` 동적 세그먼트를 사용하는데, 설문 응답 페이지는 언어 프리픽스 없이 /s/로 접근해야 함 | 설문 응답 페이지는 `apps/client/src/app/(survey)/s/[surveyId]/page.tsx`로 생성한다. `(survey)` Route Group을 사용하여 `[lng]` 레이아웃 밖에 배치한다. 설문 언어는 lang 쿼리 파라미터로 결정하며, 관리 UI의 i18n과는 독립적이다. |
| SurveySlug 테이블 vs Survey.slug 필드 | 명세서 데이터 모델에 SurveySlug 엔티티(id, slug, surveyId)가 별도로 정의되어 있으나, FS-008의 Survey 모델에는 이미 `slug String?` 필드가 존재 | Survey 모델의 기존 `slug` 필드를 활용한다. 별도 SurveySlug 테이블은 생성하지 않는다. 이유: (1) 1:1 관계이므로 별도 테이블의 이점이 적음, (2) FS-008에서 이미 slug 필드를 정의한 기존 설계를 따름. slug에 unique 인덱스를 추가하여 중복 방지. |
| Pretty URL slug API 경로 | 명세서는 `PUT /api/v1/surveys/{surveyId}/slug`로 정의하지만, 기존 Survey CRUD는 `/surveys/:id` 패턴(비버전 경로) 사용 | 기존 패턴을 따라 `PATCH /surveys/:id`의 slug 필드 업데이트로 처리한다. 별도 slug 전용 엔드포인트 대신 기존 Survey 업데이트 API를 활용하여 API 표면을 최소화한다. slug 유효성 검증과 중복 확인은 서비스 레이어에서 처리한다. |
| OG 이미지 API (/api/v1/client/og) | 동적 OG 이미지 생성 API의 구체적 구현 방식 미정의 | Next.js의 Image Response API (`next/og`)를 활용한다. `apps/client/src/app/api/v1/client/og/route.ts`에 Route Handler를 생성하여 surveyId 기반으로 동적 OG 이미지를 생성한다. `@vercel/og` (또는 Satori) 라이브러리를 사용한다. |
| Environment Context 조회 | Stage 2에서 "Environment Context"를 조회한다고 하지만, 현재 서버에 해당 API가 정의되지 않음 | 설문 응답 페이지는 NestJS 서버 API를 통해 환경 정보를 조회한다. `/environments/:id` GET API를 통해 Project, Organization 정보를 포함한 데이터를 가져온다. FS-006 구현에서 이 API가 정의될 것이므로 의존한다. |
| Share Modal 10개 탭 상세 구현 | 각 탭(Anonymous Links, Personal Links, Website Embed, Email, Social Media, QR Code, Dynamic Popup, Link Settings, Pretty URL, Custom HTML)의 상세 UI/동작이 이 명세서에서는 골격만 정의 | Personal Links는 Enterprise 기능(FS-017), Dynamic Popup은 FS-007 SDK 연동이므로 본 계획에서는 골격 UI만 구현한다. Email 탭은 기존 EmailModule 활용. QR Code는 클라이언트 라이브러리(`qrcode` 또는 `qr-code-styling`)로 생성. 핵심은 Anonymous Links, Website Embed, Link Settings 3개 탭이다. |
| 설문 페이지 서버 컴포넌트 vs 클라이언트 | 렌더링 파이프라인이 서버 사이드인지 클라이언트 사이드인지 불명확 | Next.js App Router의 Server Component로 구현한다. 페이지 컴포넌트가 서버에서 3단계 파이프라인을 실행하고 렌더링된 HTML을 반환한다. 설문 인터랙션(응답 입력, 제출)은 Client Component로 구현한다. |
| Cloud/Self-hosted 판별 | 설문 응답 페이지에서 Cloud/Self-hosted를 어떻게 판별하는지 미정의 | 환경변수 `IS_CLOUD_INSTANCE`를 사용한다. Next.js 서버 컴포넌트에서 `process.env.IS_CLOUD_INSTANCE`로 직접 접근한다. |
| "요청 수준 캐싱" 구현 | React/Next.js의 어떤 캐싱 메커니즘을 사용하는지 미정의 | React의 `cache()` 함수를 사용한다. 동일한 서버 요청(렌더링) 내에서 같은 surveyId로의 중복 호출을 자동으로 캐싱/제거한다. `unstable_cache()`는 CLAUDE.md 정책에 따라 사용 금지. |

### 1.4 암묵적 요구사항

| 항목 | 설명 |
|------|------|
| Next.js Route Group 생성 | 설문 응답 페이지를 위한 `(survey)` Route Group 필요. `[lng]` 레이아웃 밖에서 독립적 레이아웃 사용 |
| 서버 API 호출 유틸리티 | 서버 컴포넌트에서 NestJS 서버의 내부 API를 호출하기 위한 유틸리티 필요 (서버-to-서버 호출) |
| 404 Not Found 페이지 | 설문 미발견/비유효 시 표시할 커스텀 404 페이지 필요 |
| QR Code 라이브러리 | Share Modal QR Code 탭에서 클라이언트 사이드 QR 코드 생성/다운로드용 라이브러리 필요 |
| 클립보드 복사 유틸리티 | Share Modal에서 URL/임베드 코드 복사를 위한 Clipboard API 래퍼 필요 |
| 소셜 미디어 공유 URL 생성 | Twitter, Facebook, LinkedIn 등의 공유 URL 포맷 생성 유틸리티 필요 |
| OG 이미지 생성 라이브러리 | `@vercel/og` 또는 `satori` + `sharp` 패키지 필요 |
| Survey.slug 유니크 인덱스 | FS-008에서 정의된 Survey.slug 필드에 유니크 인덱스가 없다면 추가 필요 |
| 감사 로그 연동 | slug 설정/변경 시 AuditLog 기록 |
| i18n 키 추가 | Share Modal, 404 페이지, 미리보기 배너 등의 번역 키 필요 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
[설문 응답 페이지 - Next.js Server/Client Components]
apps/client/src/app/
  (survey)/                                  <-- [신규] Route Group (설문 응답 전용)
    layout.tsx                               # 최소 레이아웃 (viewport, 커스텀 스크립트)
    s/[surveyId]/
      page.tsx                               # 설문 렌더링 (Server Component → 3단계 파이프라인)
      not-found.tsx                          # 404 페이지
    p/[slug]/
      page.tsx                               # Pretty URL → surveyId resolve → 설문 렌더링
      not-found.tsx                          # 404 페이지
  api/v1/client/og/
    route.ts                                 # OG 이미지 동적 생성 Route Handler

[설문 응답 전용 클라이언트 라이브러리]
libs/client/link-survey/                     <-- [신규]
  src/
    index.ts
    lib/
      components/
        survey-page-client.tsx               # 설문 인터랙션 Client Component
        media-background.tsx                 # 배경 렌더링 (color/image/animation)
        client-logo.tsx                      # 로고 렌더링
        legal-footer.tsx                     # 법적 고지 푸터
        preview-banner.tsx                   # 미리보기 배너
        survey-completed-handler.tsx         # iframe 완료 이벤트 처리
      hooks/
        use-survey-completion.ts             # 설문 완료 감지 + postMessage
        use-embed-mode.ts                    # embed 파라미터 감지
      utils/
        og-metadata.ts                       # OG Meta Tags 생성 유틸 (서버 사이드)
        styling-resolver.ts                  # 스타일링 결정 로직 (import from packages/survey-schema)
        language-resolver.ts                 # 언어 코드 결정 로직
        custom-script-resolver.ts            # 커스텀 스크립트 결정 로직
        survey-fetcher.ts                    # React cache 기반 설문 데이터 페칭
      types/
        link-survey.types.ts                 # 링크 설문 관련 타입 정의

[Share Modal 라이브러리]
libs/client/share/                           <-- [신규]
  src/
    index.ts
    lib/
      components/
        share-modal.tsx                      # Share Modal 메인 컴포넌트
        tabs/
          anonymous-links-tab.tsx            # 익명 링크 탭
          personal-links-tab.tsx             # 개인 링크 탭 (Enterprise 스텁)
          website-embed-tab.tsx              # 웹사이트 임베드 코드 생성 탭
          email-tab.tsx                      # 이메일 발송 탭
          social-media-tab.tsx               # 소셜 미디어 공유 탭
          qr-code-tab.tsx                    # QR 코드 생성/다운로드 탭
          dynamic-popup-tab.tsx              # 동적 팝업 설정 탭 (FS-007 연동 스텁)
          link-settings-tab.tsx              # OG Image, 메타데이터 설정 탭
          pretty-url-tab.tsx                 # Pretty URL 설정 탭 (Self-hosted)
          custom-html-tab.tsx                # 커스텀 스크립트 설정 탭 (Self-hosted)
      hooks/
        use-share-tabs.ts                    # 환경/설정에 따른 탭 필터링 로직
        use-clipboard.ts                     # 클립보드 복사 훅
      utils/
        social-share-urls.ts                 # 소셜 미디어 공유 URL 생성
        embed-code-generator.ts              # iframe 임베드 코드 생성
      schemas/
        slug.schema.ts                       # slug 유효성 검증 zod 스키마
        link-metadata.schema.ts              # Link Metadata zod 스키마

[서버 확장 (기존 모듈 수정)]
libs/server/survey/
  src/lib/
    survey.service.ts                        # [수정] slug 유효성 검증, 중복 확인 로직 추가
    dto/update-survey.dto.ts                 # [수정] slug, surveyMetadata 필드 검증 추가
    validators/slug.validator.ts             # [신규] slug 커스텀 밸리데이터

[DB 변경]
packages/db/prisma/schema.prisma             # [수정] Survey.slug에 @unique 추가
```

**데이터 흐름 (설문 응답 페이지):**

```
[브라우저] ---> /s/{surveyId}?embed=true&lang=de
    |
    v
[Next.js Server Component: page.tsx]
    |
    ├── Stage 1: getSurvey(surveyId) -- React cache 적용
    │   └── GET /surveys/:id (NestJS 내부 API 호출)
    │       └── 유효성 검증: 존재 여부, type=="link", status!="draft"
    │
    ├── Stage 2: Promise.all([...]) -- 병렬 실행
    │   ├── getEnvironmentContext(survey.environmentId)
    │   │   └── GET /environments/:id (Project, Organization 정보 포함)
    │   ├── resolveLanguage(lang, survey.languages)
    │   └── getSingleUseResponse(suId) -- FS-017 선행
    │
    ├── Stage 3: checkMultiLanguagePermission(billing)
    │
    ├── resolveStyle(project.styling, survey.styling)
    ├── generateMetadata() -- OG Meta Tags
    │
    └── 렌더링
        ├── embed=true: <SurveyPageClient fullSizeCards autoFocusDisabled />
        └── embed=false: <MediaBackground> + <ClientLogo> + <SurveyPageClient /> + <LegalFooter>
```

### 2.2 데이터 모델

**기존 Survey 모델 변경 (Prisma 스키마):**

```prisma
model Survey {
  // ... 기존 필드 유지

  // slug 필드에 unique 인덱스 추가
  slug               String?          @unique

  // ... 기존 관계 유지
}
```

이미 FS-008에서 정의된 Survey 모델의 필드를 활용한다:
- `slug String?` -- Pretty URL용, @unique 추가
- `surveyMetadata Json?` -- Link Metadata (title, description, ogImage)
- `customHeadScript String?` -- 커스텀 스크립트 내용
- `customHeadScriptMode String?` -- "add" | "replace"
- `styling Json?` -- 설문별 스타일 오버라이드
- `welcomeCard Json` -- Welcome Card (headline 등)
- `languages Json` -- 다국어 설정
- `singleUse Json?` -- Single-use 설정

**surveyMetadata JSON 구조 (TypeScript 타입):**

```typescript
interface SurveyLinkMetadata {
  title?: string;       // 커스텀 OG 제목
  description?: string; // 커스텀 OG 설명
  ogImage?: string;     // 커스텀 OG 이미지 URL
}
```

**추가 인덱스 없음:** slug의 @unique가 자동으로 인덱스를 생성한다.

### 2.3 API 설계

#### 2.3.1 설문 공개 조회 (응답 페이지용, 인증 불필요)

기존 FS-024 Client API 패턴을 활용한다. 설문 응답 페이지는 인증 없이 접근 가능해야 하므로 별도 공개 API가 필요하다.

| 엔드포인트 | 메서드 | 설명 | 인증 | 응답 |
|-----------|--------|------|------|------|
| `GET /api/v1/client/surveys/:surveyId` | GET | 공개 설문 조회 (link 타입, 비draft만) | 불필요 | Survey 공개 데이터 |
| `GET /api/v1/client/environments/:envId` | GET | 환경 컨텍스트 조회 (Project, Organization 포함) | 불필요 | Environment + Project + Org 일부 |
| `GET /api/v1/client/og` | GET | OG 이미지 동적 생성 | 불필요 | image/png |

> 참고: 이 API들은 FS-024(REST API/Headless) 구현 시 정의되는 Client API의 일부이다. FS-024가 미구현 상태라면 본 계획에서 최소한으로 스텁 구현한다.

#### 2.3.2 Slug 관리 (기존 Survey CRUD 활용)

| 엔드포인트 | 메서드 | 설명 | 인증 | 검증 |
|-----------|--------|------|------|------|
| `PATCH /surveys/:id` | PATCH | slug 필드 업데이트 (기존 API) | JWT 필수 | slug: `^[a-z0-9-]+$`, unique |

slug 전용 엔드포인트를 별도로 만들지 않고 기존 Survey 업데이트 API의 slug 필드를 활용한다.

### 2.4 주요 컴포넌트 설계

#### 2.4.1 설문 응답 페이지 (Server Component)

```typescript
// apps/client/src/app/(survey)/s/[surveyId]/page.tsx
// Server Component - 3단계 렌더링 파이프라인

export async function generateMetadata({ params, searchParams }): Promise<Metadata> {
  // Stage 1과 동일한 캐시 키로 Survey 조회 (React cache로 중복 제거)
  const survey = await getCachedSurvey(surveyId);
  if (!survey) return {};

  // OG Meta Tags 생성 (BR-06-01 우선순위 적용)
  return generateOgMetadata(survey, locale);
}

export default async function SurveyPage({ params, searchParams }) {
  const { surveyId } = await params;
  const { embed, lang, preview, suId, verify } = await searchParams;
  const isEmbed = embed === "true";
  const isPreview = preview === "true";

  // Stage 1: Survey 조회 (React cache)
  const survey = await getCachedSurvey(surveyId);
  if (!survey || survey.type !== "link" || survey.status === "draft") {
    notFound();
  }

  // Stage 2: 병렬 조회
  const [envContext, languageCode, singleUseResponse] = await Promise.all([
    getEnvironmentContext(survey.environmentId),
    resolveLanguage(lang, survey),
    suId ? getSingleUseResponse(suId) : null,
  ]);

  // Stage 3: Multi-language Permission
  const multiLangPermission = checkMultiLanguagePermission(envContext.billing);

  // 스타일링 결정
  const resolvedStyling = resolveStyling(envContext.project.styling, survey.styling);

  // 커스텀 스크립트 결정
  const customScript = resolveCustomScript(envContext, survey, isPreview);

  if (isEmbed) {
    return <SurveyPageClient survey={survey} fullSizeCards autoFocusDisabled styling={resolvedStyling} />;
  }

  return (
    <>
      <MediaBackground styling={resolvedStyling} />
      <ClientLogo project={envContext.project} />
      <SurveyPageClient survey={survey} styling={resolvedStyling} />
      <LegalFooter />
      {isPreview && <PreviewBanner />}
    </>
  );
}
```

#### 2.4.2 Share Modal 컴포넌트

```typescript
// libs/client/share/src/lib/components/share-modal.tsx

interface ShareModalProps {
  survey: Survey;
  isOpen: boolean;
  onClose: () => void;
  isSelfHosted: boolean;
}

// useShareTabs 훅으로 탭 필터링
function useShareTabs(survey: Survey, isSelfHosted: boolean) {
  const isSingleUse = survey.singleUse?.enabled ?? false;

  // BR-01-01: Cloud이면 Pretty URL, Custom HTML 제외
  const visibleTabs = ALL_TABS.filter(tab => {
    if (!isSelfHosted && (tab === "prettyUrl" || tab === "customHtml")) return false;
    return true;
  });

  // BR-01-02: Single-use면 5개 탭 비활성화
  const disabledTabs = isSingleUse
    ? ["personalLinks", "websiteEmbed", "email", "socialMedia", "qrCode"]
    : [];

  return { visibleTabs, disabledTabs };
}
```

#### 2.4.3 iframe 완료 이벤트

```typescript
// libs/client/link-survey/src/lib/hooks/use-survey-completion.ts

function useSurveyCompletion() {
  const handleSurveyComplete = useCallback((isResponseSent: boolean, isSurveyEnded: boolean) => {
    // BR-04-01: 두 조건 모두 충족 시에만 이벤트 발화
    if (isResponseSent && isSurveyEnded) {
      window.parent.postMessage("formbricksSurveyCompleted", "*");
    }
  }, []);

  return { handleSurveyComplete };
}
```

#### 2.4.4 언어 코드 결정 로직

```typescript
// libs/client/link-survey/src/lib/utils/language-resolver.ts

function resolveLanguageCode(
  lang: string | undefined,
  survey: { languages: SurveyLanguage[] },
  multiLanguagePermission: boolean
): string {
  // BR-08-01: lang 미지정 → "default"
  if (!lang) return "default";

  // BR-08-02: 다국어 미허용 → "default"
  if (!multiLanguagePermission) return "default";

  // 언어 코드/별칭 매칭
  const matchedLang = survey.languages.find(
    (l) => l.language.code === lang || l.language.alias === lang
  );

  // BR-08-03: 매칭 없음 → "default"
  if (!matchedLang) return "default";

  // BR-08-04: 기본 언어면 → "default"
  if (matchedLang.default) return "default";

  // BR-08-05: 비활성 → "default"
  if (!matchedLang.enabled) return "default";

  // BR-08-06: 활성 언어 코드 반환
  return matchedLang.language.code;
}
```

### 2.5 기존 시스템에 대한 영향 분석

| 영향 대상 | 변경 유형 | 설명 |
|----------|----------|------|
| `packages/db/prisma/schema.prisma` | 수정 | Survey.slug에 @unique 추가 |
| `libs/server/survey/` | 수정 | slug 유효성 검증/중복 확인 로직 추가, 공개 조회 API 추가 |
| `libs/client/core/` | 수정 | apiFetch에 인증 불필요 옵션 추가 (공개 API 호출용) |
| `apps/client/next.config.js` | 수정 | OG 이미지 외부 URL 허용 (images.remotePatterns) |
| `apps/client/src/app/` | 수정 | (survey) Route Group 추가, api/v1/client/og Route Handler 추가 |
| FS-008 (Survey CRUD) | 의존 | Survey 모델, 상태 관리, CRUD API |
| FS-006 (Project/Environment) | 의존 | Environment 조회 API, Project 스타일링 |
| FS-011 (스타일링) | 의존 | packages/survey-schema의 스타일 해석 엔진 |
| FS-015 (다국어) | 의존 | 언어 코드 결정 로직, SurveyLanguage 타입 |
| FS-029 (빌링) | 의존 | Multi-language Permission, IS_CLOUD_INSTANCE 환경변수 |
| FS-024 (REST API) | 의존 | Client API 패턴 및 엔드포인트 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존 | 복잡도 | 예상 시간 |
|-----|--------|------|------|--------|----------|
| T-01 | Prisma 스키마 수정 | Survey.slug @unique 추가, 마이그레이션 실행 | FS-008 | 낮음 | 0.5h |
| T-02 | 서버: slug 유효성 검증 로직 | 정규식 검증, 중복 확인 서비스 메서드, 커스텀 밸리데이터 | T-01 | 중간 | 2h |
| T-03 | 서버: 공개 Survey 조회 API | Client API 패턴으로 인증 불필요 설문 조회 엔드포인트 구현 | FS-024 | 중간 | 3h |
| T-04 | 서버: 공개 Environment 조회 API | Project/Organization 정보 포함한 환경 컨텍스트 공개 API | FS-006, T-03 | 중간 | 2h |
| T-05 | 클라이언트: (survey) Route Group 생성 | layout.tsx (viewport, 최소 HTML), not-found.tsx | - | 낮음 | 1h |
| T-06 | 클라이언트: 서버 사이드 데이터 페칭 유틸 | React cache 기반 getSurvey, getEnvironmentContext 함수 | T-03, T-04 | 중간 | 2h |
| T-07 | 클라이언트: 언어 코드 결정 로직 | resolveLanguageCode 순수 함수 + 단위 테스트 | FS-015 | 중간 | 1.5h |
| T-08 | 클라이언트: 스타일링 결정 로직 | resolveStyling 순수 함수 (FS-011 스타일 해석 엔진 재활용) | FS-011 | 낮음 | 1h |
| T-09 | 클라이언트: 커스텀 스크립트 결정 로직 | resolveCustomScript 순수 함수 (add/replace 모드) | - | 낮음 | 1h |
| T-10 | 클라이언트: OG Meta Tags 생성 | generateOgMetadata 함수 (Next.js Metadata API 활용) | T-06 | 중간 | 2h |
| T-11 | 클라이언트: OG 이미지 Route Handler | /api/v1/client/og GET 핸들러, @vercel/og 기반 동적 이미지 생성 | T-06 | 높음 | 3h |
| T-12 | 클라이언트: MediaBackground 컴포넌트 | 배경 렌더링 (color/image/animation), 스타일링 적용 | T-08, FS-011 | 중간 | 2h |
| T-13 | 클라이언트: ClientLogo 컴포넌트 | 프로젝트 로고 렌더링, 숨김 토글 지원 | T-08 | 낮음 | 1h |
| T-14 | 클라이언트: LegalFooter 컴포넌트 | 법적 고지 푸터 렌더링 | - | 낮음 | 0.5h |
| T-15 | 클라이언트: PreviewBanner 컴포넌트 | 미리보기 모드 배너 (비 임베드 모드에서만 표시) | - | 낮음 | 0.5h |
| T-16 | 클라이언트: SurveyPageClient (설문 인터랙션) | Client Component 골격 (설문 응답 UI는 FS-021에서 완성) | T-06, T-07, T-08 | 높음 | 4h |
| T-17 | 클라이언트: /s/[surveyId]/page.tsx | 3단계 렌더링 파이프라인 Server Component 조립 | T-05 ~ T-16 | 높음 | 3h |
| T-18 | 클라이언트: 임베드 모드 분기 | embed=true 파라미터 처리, fullSizeCards/autofocus 제어 | T-17 | 중간 | 1.5h |
| T-19 | 클라이언트: iframe 완료 이벤트 | useSurveyCompletion 훅, postMessage 처리 | T-16 | 낮음 | 1h |
| T-20 | 클라이언트: Pretty URL 페이지 | /p/[slug]/page.tsx - slug로 Survey 조회 후 렌더링 위임 | T-17, T-02 | 중간 | 2h |
| T-21 | 클라이언트: Viewport 설정 | (survey) layout.tsx에 viewport 메타 태그 설정 | T-05 | 낮음 | 0.5h |
| T-22 | Share Modal: 기본 골격 | 모달 컴포넌트, 탭 네비게이션, useShareTabs 훅 | - | 중간 | 2h |
| T-23 | Share Modal: Anonymous Links 탭 | URL 표시, 클립보드 복사, URL 포맷 선택 | T-22 | 중간 | 1.5h |
| T-24 | Share Modal: Website Embed 탭 | iframe 코드 생성, 복사, embed 옵션 설정 | T-22 | 중간 | 2h |
| T-25 | Share Modal: Social Media 탭 | Twitter/Facebook/LinkedIn/Reddit 공유 URL 생성 | T-22 | 낮음 | 1.5h |
| T-26 | Share Modal: QR Code 탭 | QR 코드 생성, PNG/SVG 다운로드 | T-22 | 중간 | 2h |
| T-27 | Share Modal: Email 탭 | 이메일 발송 폼 (기존 EmailModule 활용) | T-22, FS-099 | 중간 | 2h |
| T-28 | Share Modal: Link Settings 탭 | OG 메타데이터 편집 (title, description, ogImage) | T-22 | 중간 | 2h |
| T-29 | Share Modal: Pretty URL 탭 | slug 입력, 실시간 유효성 검증, 서버 중복 확인 | T-22, T-02 | 중간 | 2h |
| T-30 | Share Modal: Custom HTML 탭 | 프로젝트/설문 수준 스크립트 편집, add/replace 모드 토글 | T-22 | 중간 | 2h |
| T-31 | Share Modal: Personal Links 탭 | Enterprise 기능 스텁 (FS-017 의존) | T-22 | 낮음 | 0.5h |
| T-32 | Share Modal: Dynamic Popup 탭 | SDK 연동 스텁 (FS-007 의존) | T-22 | 낮음 | 0.5h |
| T-33 | i18n: 번역 키 추가 | Share Modal, 404, 미리보기 배너 등 ko/en 번역 키 | T-17, T-22 | 낮음 | 1.5h |
| T-34 | 단위 테스트: 유틸리티 함수 | language-resolver, styling-resolver, custom-script-resolver, slug 검증 | T-07 ~ T-09 | 중간 | 3h |
| T-35 | 통합 테스트: 서버 API | slug 업데이트, 공개 Survey 조회, 공개 Environment 조회 | T-02 ~ T-04 | 중간 | 3h |
| T-36 | E2E 테스트: 설문 응답 페이지 | 기본 렌더링, 임베드 모드, 404 케이스, OG 메타 태그 | T-17 | 높음 | 4h |

### 3.2 구현 순서 및 마일스톤

**마일스톤 1: 인프라 및 데이터 레이어 (T-01 ~ T-04)**
- 목표: 서버 API 준비 완료
- 검증: slug 유효성 검증 통과, 공개 API로 Survey/Environment 조회 가능
- 빌드 후 커밋

**마일스톤 2: 설문 응답 페이지 기반 (T-05 ~ T-15)**
- 목표: 정적 설문 페이지 렌더링 (인터랙션 제외)
- 검증: /s/{surveyId} 접근 시 설문 정보 표시, OG 메타 태그 포함, 404 처리 정상
- 빌드 후 커밋

**마일스톤 3: 설문 응답 페이지 완성 (T-16 ~ T-21)**
- 목표: 임베드 모드, Pretty URL, iframe 이벤트, viewport 설정 완료
- 검증: embed=true 모드 동작, /p/{slug} 접근, iframe 완료 이벤트 발화
- 빌드 후 커밋

**마일스톤 4: Share Modal 코어 (T-22 ~ T-26)**
- 목표: Share Modal 핵심 탭 (Anonymous Links, Embed, Social, QR) 완성
- 검증: Share Modal 열기, URL 복사, 임베드 코드 생성, QR 다운로드
- 빌드 후 커밋

**마일스톤 5: Share Modal 설정 및 완성 (T-27 ~ T-33)**
- 목표: 나머지 탭(Email, Link Settings, Pretty URL, Custom HTML, 스텁 탭) 완성
- 검증: 전체 10개 탭 동작, 환경별 탭 필터링, Single-use 비활성화
- 빌드 후 커밋

**마일스톤 6: 테스트 및 품질 보증 (T-34 ~ T-36)**
- 목표: 단위/통합/E2E 테스트 완성
- 검증: 전체 테스트 통과
- 빌드 후 커밋

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|----------|----------|----------|
| `packages/db/prisma/schema.prisma` | 수정 | Survey.slug에 @unique 추가 |
| `libs/server/survey/src/lib/survey.service.ts` | 수정 | slug 유효성 검증 및 중복 확인 로직 추가 |
| `libs/server/survey/src/lib/dto/update-survey.dto.ts` | 수정 | slug, surveyMetadata 필드 유효성 데코레이터 추가 |
| `libs/server/survey/src/lib/validators/slug.validator.ts` | 생성 | slug 정규식 검증 커스텀 밸리데이터 |
| `libs/server/survey/src/lib/controllers/client-survey.controller.ts` | 생성 | 공개 Survey 조회 API (인증 불필요) |
| `libs/server/survey/src/lib/controllers/client-environment.controller.ts` | 생성 | 공개 Environment 조회 API (인증 불필요) |
| `apps/client/src/app/(survey)/layout.tsx` | 생성 | 설문 응답 전용 레이아웃 (viewport, 최소 HTML) |
| `apps/client/src/app/(survey)/s/[surveyId]/page.tsx` | 생성 | 설문 응답 페이지 (Server Component, 3단계 파이프라인) |
| `apps/client/src/app/(survey)/s/[surveyId]/not-found.tsx` | 생성 | 설문 404 페이지 |
| `apps/client/src/app/(survey)/p/[slug]/page.tsx` | 생성 | Pretty URL 페이지 (slug → surveyId 리졸브) |
| `apps/client/src/app/(survey)/p/[slug]/not-found.tsx` | 생성 | Pretty URL 404 페이지 |
| `apps/client/src/app/api/v1/client/og/route.ts` | 생성 | OG 이미지 동적 생성 Route Handler |
| `libs/client/link-survey/src/index.ts` | 생성 | 링크 설문 라이브러리 퍼블릭 API export |
| `libs/client/link-survey/src/lib/components/survey-page-client.tsx` | 생성 | 설문 인터랙션 Client Component |
| `libs/client/link-survey/src/lib/components/media-background.tsx` | 생성 | 배경 렌더링 컴포넌트 |
| `libs/client/link-survey/src/lib/components/client-logo.tsx` | 생성 | 로고 렌더링 컴포넌트 |
| `libs/client/link-survey/src/lib/components/legal-footer.tsx` | 생성 | 법적 고지 푸터 컴포넌트 |
| `libs/client/link-survey/src/lib/components/preview-banner.tsx` | 생성 | 미리보기 배너 컴포넌트 |
| `libs/client/link-survey/src/lib/components/survey-completed-handler.tsx` | 생성 | iframe 완료 이벤트 처리 컴포넌트 |
| `libs/client/link-survey/src/lib/hooks/use-survey-completion.ts` | 생성 | 설문 완료 감지 + postMessage 훅 |
| `libs/client/link-survey/src/lib/hooks/use-embed-mode.ts` | 생성 | embed 파라미터 감지 훅 |
| `libs/client/link-survey/src/lib/utils/og-metadata.ts` | 생성 | OG Meta Tags 생성 유틸 |
| `libs/client/link-survey/src/lib/utils/styling-resolver.ts` | 생성 | 스타일링 결정 로직 (FS-011 재활용) |
| `libs/client/link-survey/src/lib/utils/language-resolver.ts` | 생성 | 언어 코드 결정 로직 |
| `libs/client/link-survey/src/lib/utils/custom-script-resolver.ts` | 생성 | 커스텀 스크립트 결정 로직 |
| `libs/client/link-survey/src/lib/utils/survey-fetcher.ts` | 생성 | React cache 기반 데이터 페칭 |
| `libs/client/link-survey/src/lib/types/link-survey.types.ts` | 생성 | 링크 설문 타입 정의 |
| `libs/client/share/src/index.ts` | 생성 | Share Modal 라이브러리 퍼블릭 API export |
| `libs/client/share/src/lib/components/share-modal.tsx` | 생성 | Share Modal 메인 컴포넌트 |
| `libs/client/share/src/lib/components/tabs/anonymous-links-tab.tsx` | 생성 | 익명 링크 탭 |
| `libs/client/share/src/lib/components/tabs/personal-links-tab.tsx` | 생성 | 개인 링크 탭 (Enterprise 스텁) |
| `libs/client/share/src/lib/components/tabs/website-embed-tab.tsx` | 생성 | 웹사이트 임베드 탭 |
| `libs/client/share/src/lib/components/tabs/email-tab.tsx` | 생성 | 이메일 발송 탭 |
| `libs/client/share/src/lib/components/tabs/social-media-tab.tsx` | 생성 | 소셜 미디어 공유 탭 |
| `libs/client/share/src/lib/components/tabs/qr-code-tab.tsx` | 생성 | QR 코드 탭 |
| `libs/client/share/src/lib/components/tabs/dynamic-popup-tab.tsx` | 생성 | 동적 팝업 탭 (스텁) |
| `libs/client/share/src/lib/components/tabs/link-settings-tab.tsx` | 생성 | 링크 설정 탭 |
| `libs/client/share/src/lib/components/tabs/pretty-url-tab.tsx` | 생성 | Pretty URL 탭 |
| `libs/client/share/src/lib/components/tabs/custom-html-tab.tsx` | 생성 | 커스텀 HTML 탭 |
| `libs/client/share/src/lib/hooks/use-share-tabs.ts` | 생성 | 탭 필터링 훅 |
| `libs/client/share/src/lib/hooks/use-clipboard.ts` | 생성 | 클립보드 복사 훅 |
| `libs/client/share/src/lib/utils/social-share-urls.ts` | 생성 | 소셜 공유 URL 생성 유틸 |
| `libs/client/share/src/lib/utils/embed-code-generator.ts` | 생성 | 임베드 코드 생성 유틸 |
| `libs/client/share/src/lib/schemas/slug.schema.ts` | 생성 | slug zod 스키마 |
| `libs/client/share/src/lib/schemas/link-metadata.schema.ts` | 생성 | Link Metadata zod 스키마 |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | Share Modal, 404, 미리보기 번역 키 추가 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | Share Modal, 404, 미리보기 번역 키 추가 |
| `apps/client/next.config.js` | 수정 | images.remotePatterns 추가 (OG 이미지 외부 URL) |

**shadcn/ui 컴포넌트 추가 (필요 시):**

| 컴포넌트 | 용도 |
|---------|------|
| Tabs | Share Modal 탭 네비게이션 |
| Dialog | Share Modal 모달 |
| Tooltip | 복사 완료 피드백 |
| Textarea | 커스텀 스크립트 편집 |
| Badge | 탭 상태 표시 |

---

## 4. 리스크 및 대응 전략

| 리스크 | 영향 | 확률 | 대응 전략 |
|--------|------|------|----------|
| FS-024 Client API 미구현 | 공개 Survey/Environment 조회 API를 사용할 수 없음 | 높음 | 본 계획에서 최소한의 Client API 컨트롤러를 직접 구현한다. FS-024 완성 시 통합/리팩토링한다. |
| FS-008 Survey 모델 미구현 | Survey 테이블 자체가 없어 slug @unique 추가 불가 | 높음 | FS-008이 선행 구현되어야 한다. 미구현 시 Survey 모델 최소 스텁을 포함하여 마이그레이션한다. |
| FS-011 스타일 해석 엔진 미구현 | resolveStyling 함수가 없음 | 중간 | 본 계획에서 단순한 스타일 해석 로직(프로젝트 < 설문 오버라이드)을 자체 구현한다. FS-011 완성 시 교체한다. |
| FS-015 다국어 타입 미구현 | SurveyLanguage 타입이 없어 언어 결정 로직 구현 불가 | 중간 | 언어 결정 로직에서 사용하는 타입을 link-survey 라이브러리 내에 로컬 정의한다. FS-015 완성 시 공유 타입으로 교체한다. |
| OG 이미지 생성 성능 | @vercel/og 기반 이미지 생성이 느려 페이지 로딩에 영향 | 낮음 | OG 이미지 URL을 메타 태그에만 포함하므로 페이지 로딩에 직접 영향 없음. 이미지 요청은 소셜 미디어 크롤러가 비동기로 수행한다. |
| Next.js Route Group 충돌 | (survey) Route Group과 기존 [lng] Route Group의 라우팅 충돌 가능성 | 낮음 | /s/와 /p/ 경로는 [lng] 세그먼트의 어떤 유효값과도 충돌하지 않는다. Next.js의 라우팅 우선순위에 따라 정적 세그먼트(s, p)가 동적 세그먼트([lng])보다 우선한다. |
| QR Code 라이브러리 선택 | 라이브러리가 트리 쉐이킹에 적합하지 않거나 번들 크기가 큰 경우 | 낮음 | 경량 라이브러리 `qrcode`(순수 JS, ~30KB)를 우선 검토한다. 커스터마이징 필요 시 `qr-code-styling`으로 전환한다. |
| 설문 응답 UI 부재 | 실제 설문 응답 기능(FS-021)이 미구현이므로 SurveyPageClient가 완전하지 않음 | 높음 | 설문 제목, 질문 목록을 읽기 전용으로 표시하는 최소 UI를 구현한다. 실제 응답 입력/제출은 FS-021에서 완성한다. |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 대상 | 테스트 항목 |
|------|-----------|
| `language-resolver.ts` | lang 파라미터 없음 → "default", 다국어 미허용 → "default", 매칭 없음 → "default", 비활성 → "default", 활성 → 해당 코드 반환 |
| `styling-resolver.ts` | 오버라이드 비허용 → 프로젝트 스타일, 오버라이드 허용+설문 스타일 존재 → 설문 스타일, 오버라이드 허용+설문 없음 → 프로젝트 스타일 |
| `custom-script-resolver.ts` | Cloud → null, preview → null, add 모드 → 프로젝트+설문, replace 모드 → 설문만, 설문 없음 → 프로젝트만, 둘 다 없음 → null |
| `slug.validator.ts` | 유효한 slug → 통과, 대문자 포함 → 실패, 특수문자 포함 → 실패, 빈 문자열 → 실패 |
| `social-share-urls.ts` | Twitter/Facebook/LinkedIn/Reddit URL 포맷 정확성 |
| `embed-code-generator.ts` | iframe 코드 생성, embed=true 파라미터 포함 여부, 크기 옵션 |
| `og-metadata.ts` | Link Metadata 우선 → title 반환, Link Metadata 없음 → Welcome Card headline, 둘 다 없음 → Survey name |
| `use-share-tabs.ts` | Cloud 환경 → 8개 탭, Self-hosted → 10개 탭, Single-use → 5개 탭 비활성화 |

### 5.2 통합 테스트

| 대상 | 테스트 항목 |
|------|-----------|
| 서버: slug 업데이트 | 유효한 slug 설정 성공, 중복 slug 409 에러, 유효하지 않은 slug 400 에러, slug 삭제 (null 설정) |
| 서버: 공개 Survey 조회 | link 타입 설문 조회 성공, app 타입 설문 404, draft 상태 404, 존재하지 않는 ID 404 |
| 서버: 공개 Environment 조회 | 환경 컨텍스트 포함 조회, Project/Organization 정보 포함 |

### 5.3 E2E 테스트 (해당 시)

| 시나리오 | 검증 항목 |
|---------|----------|
| 기본 설문 페이지 접근 | /s/{surveyId} 접근 → 설문 제목 표시, OG 메타 태그 포함, viewport 설정 적용 |
| 임베드 모드 | /s/{surveyId}?embed=true → 배경/로고/푸터 미표시, fullSizeCards 적용 |
| 404 처리 | 존재하지 않는 ID → 404 페이지, draft 설문 → 404, app 타입 → 404 |
| Pretty URL | /p/{slug} → 정상 설문 렌더링, 존재하지 않는 slug → 404 |
| Share Modal 탭 필터링 | Cloud → Pretty URL/Custom HTML 미표시, Single-use → 관련 탭 비활성화 |
| Share Modal URL 복사 | Anonymous Links 탭에서 URL 복사 → 클립보드에 정확한 URL 저장 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 제약 | 설명 |
|------|------|
| 설문 응답 UI 미완성 | 실제 설문 응답 입력/제출은 FS-021(응답 관리) 구현 시 완성. 본 계획에서는 읽기 전용 렌더링만 구현 |
| Single-use 링크 | FS-017에서 구현 예정. 본 계획에서는 singleUse 설정 기반 탭 비활성화 로직만 구현 |
| Personal Links | Enterprise 기능으로 FS-017에서 구현 예정. 스텁 탭만 제공 |
| Dynamic Popup | FS-007 SDK 연동이 필요. 스텁 탭만 제공 |
| 이메일 검증 (verify 파라미터) | FS-018에서 구현 예정. URL 파라미터 파싱만 구현 |
| OG 이미지 캐싱 | 동적 OG 이미지의 서버 사이드 캐싱 미구현. 향후 Redis 캐시 도입 시 추가 |
| 스타일 해석 엔진 의존 | FS-011의 5단계 스타일 해석 엔진이 미구현이면 단순화된 로직 사용 |

### 6.2 잠재적 향후 개선

| 개선 사항 | 설명 |
|----------|------|
| Redis 기반 설문 데이터 캐싱 | 현재 요청 수준 캐싱만 적용. Redis 도입 시 서버 레벨 캐싱으로 응답 시간 추가 개선 가능 |
| ISR (Incremental Static Regeneration) | 설문 페이지를 정적으로 생성하고 주기적으로 갱신하여 성능 극대화 |
| CDN 기반 OG 이미지 캐싱 | OG 이미지를 CDN에 캐싱하여 크롤러 요청 시 즉각 응답 |
| 실시간 미리보기 | Share Modal에서 설문 미리보기를 실시간으로 표시 |
| 분석 추적 코드 주입 | 커스텀 스크립트와 별도로 GA, GTM 등의 분석 코드 자동 주입 |
| A/B 테스트 URL | 동일 설문의 다른 버전을 URL 파라미터로 분기 |

---

## 7. i18n 고려사항

### 7.1 추가/수정이 필요한 번역 키

**Share Modal 관련:**

```json
{
  "share": {
    "modal": {
      "title": "설문 공유",
      "tabs": {
        "anonymousLinks": "익명 링크",
        "personalLinks": "개인 링크",
        "websiteEmbed": "웹사이트 임베드",
        "email": "이메일",
        "socialMedia": "소셜 미디어",
        "qrCode": "QR 코드",
        "dynamicPopup": "동적 팝업",
        "linkSettings": "링크 설정",
        "prettyUrl": "Pretty URL",
        "customHtml": "커스텀 HTML"
      },
      "anonymousLinks": {
        "title": "익명 링크로 공유",
        "description": "누구나 이 링크로 설문에 응답할 수 있습니다",
        "copyUrl": "URL 복사",
        "copied": "복사됨!"
      },
      "websiteEmbed": {
        "title": "웹사이트에 임베드",
        "description": "아래 코드를 복사하여 웹사이트에 붙여넣으세요",
        "width": "너비",
        "height": "높이",
        "copyCode": "코드 복사"
      },
      "socialMedia": {
        "title": "소셜 미디어에 공유",
        "twitter": "Twitter에 공유",
        "facebook": "Facebook에 공유",
        "linkedin": "LinkedIn에 공유",
        "reddit": "Reddit에 공유"
      },
      "qrCode": {
        "title": "QR 코드",
        "download": "다운로드",
        "downloadPng": "PNG 다운로드",
        "downloadSvg": "SVG 다운로드"
      },
      "email": {
        "title": "이메일로 공유",
        "to": "받는 사람",
        "subject": "제목",
        "body": "본문",
        "send": "발송"
      },
      "linkSettings": {
        "title": "링크 설정",
        "ogTitle": "OG 제목",
        "ogDescription": "OG 설명",
        "ogImage": "OG 이미지",
        "save": "저장"
      },
      "prettyUrl": {
        "title": "Pretty URL",
        "description": "사용자 친화적 URL을 설정하세요",
        "slug": "슬러그",
        "slugPlaceholder": "my-survey",
        "slugHelp": "소문자 알파벳, 숫자, 하이픈만 사용 가능합니다",
        "preview": "미리보기",
        "save": "저장",
        "duplicateError": "이미 사용 중인 슬러그입니다",
        "invalidError": "유효하지 않은 슬러그입니다"
      },
      "customHtml": {
        "title": "커스텀 HTML",
        "projectScript": "프로젝트 수준 스크립트",
        "surveyScript": "설문 수준 스크립트",
        "mode": "모드",
        "modeAdd": "추가 (프로젝트 + 설문)",
        "modeReplace": "대체 (설문만)",
        "save": "저장"
      },
      "personalLinks": {
        "title": "개인 링크",
        "enterpriseOnly": "Enterprise 플랜에서 사용 가능합니다"
      },
      "dynamicPopup": {
        "title": "동적 팝업",
        "sdkRequired": "SDK 설치가 필요합니다"
      },
      "disabledBySingleUse": "Single-use 모드에서는 사용할 수 없습니다"
    }
  },
  "survey": {
    "notFound": {
      "title": "설문을 찾을 수 없습니다",
      "description": "요청하신 설문이 존재하지 않거나 접근할 수 없습니다",
      "backHome": "홈으로 돌아가기"
    },
    "preview": {
      "banner": "미리보기 모드입니다. 응답은 저장되지 않습니다."
    }
  }
}
```

### 7.2 번역 키 관리 위치

- 관리 UI(Share Modal) 번역: `apps/client/src/app/i18n/locales/{ko,en}/translation.json`
- 설문 응답 페이지 번역: 동일 파일 또는 별도 네임스페이스 (`survey.json`) 분리 검토

---

## 8. 선행 의존 관계 요약

```
FS-008 (Survey 모델/CRUD) ─── [필수] Survey 테이블, CRUD API, slug 필드
    |
FS-006 (Project/Environment) ─ [필수] Environment 조회 API, Project 스타일링
    |
FS-011 (스타일링) ──────────── [권장] 스타일 해석 엔진 (자체 단순 구현으로 대체 가능)
    |
FS-015 (다국어) ───────────── [권장] SurveyLanguage 타입 (로컬 정의로 대체 가능)
    |
FS-029 (빌링) ─────────────── [권장] IS_CLOUD_INSTANCE, Multi-language Permission
    |
FS-024 (REST API) ─────────── [권장] Client API 패턴 (자체 최소 구현으로 대체 가능)
    |
FS-016 (링크 공유 및 임베드) ── 본 계획
    |
    ├── FS-017 (Single-use/Personal Link) ── [후행] 스텁만 구현
    ├── FS-018 (접근 제어/Prefill) ────────── [후행] verify 파라미터 파싱만
    ├── FS-021 (응답 관리) ─────────────────── [후행] 설문 응답 UI 완성
    └── FS-007 (SDK/위젯/GTM) ──────────────── [후행] Dynamic Popup 탭 완성
```
