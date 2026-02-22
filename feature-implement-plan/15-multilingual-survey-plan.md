# 기능 구현 계획: 다국어 설문 (Multi-Language Surveys)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 설명 | 우선순위 |
|---------|--------|------|---------|
| FN-015-01 | 다국어 문자열 타입 (TI18nString) | `Record<string, string>` 형태로 `"default"` 키 필수. 설문의 모든 텍스트 필드에 적용 | 필수 |
| FN-015-02 | 프로젝트 레벨 언어 관리 | 프로젝트 설정의 Languages 페이지에서 언어 CRUD. CUID2 ID, ISO 언어 코드, 선택적 별칭 | 필수 |
| FN-015-03 | 설문 레벨 언어 활성화 | 개별 설문에서 프로젝트 언어 중 활성화할 언어 관리. 정확히 1개의 default + 0개 이상 secondary | 필수 |
| FN-015-04 | Multi-Language Card UI | 설문 에디터 내 다국어 설정 카드. 라이선스/언어 상태별 분기 UI (UpgradePrompt 포함) | 필수 |
| FN-015-05 | 기본 언어 변경 | 설문의 기본 언어를 다른 언어로 변경. 기존 번역 보존 | 필수 |
| FN-015-06 | 보조 언어 추가/제거 | 보조 언어 토글(enabled). 추가 시 TI18nString 키 자동 추가, 비활성화 시 데이터 보존 | 필수 |
| FN-015-07 | 다국어 비활성화 | 파괴적 작업. 확인 모달 후 모든 번역 삭제, languages 배열 초기화 | 필수 |
| FN-015-08 | Language Switch UI | 응답자 설문 진행 중 언어 전환 드롭다운. showLanguageSwitch 속성으로 제어 | 필수 |
| FN-015-09 | Link Survey 언어 지정 | `?lang=` 쿼리 파라미터로 설문 표시 언어 지정. 무효 코드 시 default fallback | 필수 |
| FN-015-10 | RTL 언어 지원 | 8개 RTL 언어 코드 기반 자동 감지, `dir="rtl"` 적용. 단일 언어 시 유니코드 Bidi 판별 | 필수 |
| FN-015-11 | Enterprise 라이선스 검증 | `multiLanguageSurveys`(LicenseFeatures의 `multiLanguage`) 기능 플래그 검증. Cloud: Custom 플랜 전용, Self-hosted: Enterprise 라이선스 필수 | 필수 |
| FN-015-12 | 번역 필드 관리 | 언어 추가 시 TI18nString 필드에 해당 언어 키 자동 추가(빈 문자열). 재활성화 시 기존 값 보존 | 필수 |
| FN-015-13 | 텍스트 필드 언어별 검증 | 활성 언어 전체에 대해 비어있지 않은 텍스트 검증. HTML 태그 제거 후 판별 | 필수 |

### 1.2 비기능 요구사항

| NFR ID | 항목 | 요구사항 |
|--------|------|---------|
| NFR-015-01 | 유효성 검증 | TI18nString에 "default" 키 필수 |
| NFR-015-02 | 번역 검증 | 활성화된 모든 언어에 번역 필요 (발행 시 검증) |
| NFR-015-03 | RTL 감지 | 언어 코드 또는 유니코드 방향성 기반 자동 감지 |
| NFR-015-04 | 데이터 보존 | 언어 비활성화 시 번역 데이터 보존 (enabled=false) |
| NFR-015-05 | Enterprise 라이선스 | 다국어 기능 접근에 Enterprise 라이선스 필수 |
| NFR-PERF-01 | 언어 전환 성능 | 화면 깜빡임 없이 즉시 전환 (클라이언트 사이드 렌더링) |
| NFR-PERF-02 | 검증 성능 | 설문 저장 시 TI18nString 유효성 검증 2초 이내 |
| NFR-SEC-01 | 서버 검증 | 라이선스 검증은 서버 사이드에서 수행 (클라이언트 우회 방지) |
| NFR-SEC-02 | RBAC 적용 | 언어 관리는 프로젝트 접근 권한이 있는 사용자만 가능 |

### 1.3 명세서 내 모호한 점 및 해석

| 항목 | 모호한 점 | 해석/결정 |
|------|----------|----------|
| multiLanguageSurveys vs multiLanguage | 명세서에서는 라이선스 플래그명을 `multiLanguageSurveys`로 표기하지만, FS-029 구현 계획의 LicenseFeatures에서는 `multiLanguage`로 정의되어 있음 | FS-029의 기존 정의(`multiLanguage: boolean`)를 따른다. 명세서의 `multiLanguageSurveys`는 `multiLanguage` 플래그로 매핑한다. 기존 코드베이스 일관성을 우선한다. |
| SurveyLanguage 저장 방식 | 명세서는 SurveyLanguage를 별도 엔티티/테이블처럼 정의하고 있으나, FS-008의 Survey 모델에는 `languages Json @default("[]")`로 JSON 필드가 이미 존재 | FS-008의 기존 설계를 따라 `Survey.languages` JSON 필드에 SurveyLanguage 배열을 저장한다. 별도 `SurveyLanguage` Prisma 모델은 생성하지 않는다. 이유: (1) 설문 전체를 원자적으로 읽고/저장하는 기존 패턴과 일관, (2) Survey CRUD API 내에서 관리되므로 별도 테이블의 이점이 적음, (3) Language 테이블과의 참조 무결성은 서비스 레벨에서 검증. |
| TI18nString 적용 대상 필드 | 어떤 Survey 필드들이 TI18nString으로 전환되어야 하는지 구체적 목록이 명세서에 없음 | 기존 Survey 모델(FS-008)에서 사용자에게 노출되는 텍스트를 포함하는 JSON 필드 내부의 문자열을 TI18nString으로 전환한다. 대상: welcomeCard(headline, html, buttonLabel), blocks 내 Element(headline, subheader, placeholder, buttonLabel, choice labels 등), endings(headline, subheader, buttonLabel). Survey 최상위 `name` 필드는 관리자용이므로 단일 문자열 유지. |
| 번역 필드 자동 관리 주체 | 서버에서 수행하는지 클라이언트에서 수행하는지 불명확 | 클라이언트에서 수행한다. 설문 에디터에서 보조 언어가 추가될 때, 클라이언트가 Survey JSON 내 모든 TI18nString 필드를 순회하며 해당 언어 키를 빈 문자열로 추가한다. 서버는 저장 시 유효성 검증만 수행. 이유: (1) 설문 에디터가 이미 전체 Survey JSON을 메모리에 보유, (2) 클라이언트 사이드 편집이 즉시 반영되어 UX 향상. |
| Language 삭제 시 설문 영향 | 프로젝트에서 언어를 삭제할 때 해당 언어를 사용 중인 설문의 SurveyLanguage/번역 데이터 처리 방식이 명확하지 않음 | Language 삭제 시 해당 languageId를 참조하는 SurveyLanguage 항목을 자동 제거하지만, Survey JSON 내 번역 데이터(TI18nString의 해당 언어 키)는 즉시 삭제하지 않는다. 향후 설문 저장 시 클라이언트가 정리하거나, 별도 배치 처리로 정리한다. |
| 설문 에디터 내 언어 전환 입력 UX | "탭 또는 드롭다운"이라 되어 있으나 구체적 UX 미정의 | FS-010(설문 에디터 UX)에서 구체화될 영역이므로, 이 계획에서는 드롭다운 기반의 최소 UI를 구현한다. 설문 에디터 상단에 현재 편집 언어 선택 드롭다운을 배치하고, 선택된 언어에 따라 TI18nString의 해당 키 값을 편집 필드에 바인딩한다. |
| Cloud/Self-hosted 판별 | isCloud 값의 소스가 불명확 | FS-029에서 정의한 환경변수 `IS_CLOUD_INSTANCE`를 사용한다. 클라이언트는 서버 API를 통해 이 값을 조회한다. |

### 1.4 암묵적 요구사항

| 항목 | 설명 |
|------|------|
| Language Prisma 모델 존재 확인 | FS-006에서 Language 모델이 이미 정의되어 있으므로, 본 계획에서는 Prisma 스키마를 추가하지 않는다. FS-006이 선행 구현된 상태를 전제한다. |
| SurveyLanguage TypeScript 타입 | Survey.languages JSON 필드의 구조를 정의하는 TypeScript 인터페이스가 필요하다 (packages/shared-types 또는 서버 라이브러리 내). |
| TI18nString Zod 스키마 | 클라이언트/서버 공용 TI18nString 유효성 검증을 위한 Zod 스키마가 필요하다. |
| FeatureGateGuard 선행 구현 | FS-029에서 정의한 FeatureGateGuard / @RequireFeature() 데코레이터가 구현되어 있어야 서버 API에서 라이선스 검증이 가능하다. 미구현 시 본 계획에서 최소한으로 구현한다. |
| 설문 발행 검증 확장 | FS-008에서 정의한 survey-validation.service.ts에 다국어 관련 검증 규칙(활성 언어 번역 완료 여부)을 추가해야 한다. |
| RTL 유틸리티 함수 | 언어 코드 기반 RTL 판별 유틸리티, 유니코드 Bidi 방향 판별 유틸리티가 필요하다. |
| 프로젝트 설정 Languages 페이지 라우트 | `apps/client/src/app/[lng]/projects/[projectId]/settings/languages/page.tsx` 신규 페이지가 필요하다. |
| ISO 언어 코드 목록 | 프로젝트 언어 등록 시 사용 가능한 ISO 639-1 언어 코드 목록을 정적 데이터로 제공해야 한다. |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
[신규/수정 모듈 구조]

libs/server/multilingual/                    <-- [신규] 다국어 서버 라이브러리
├── src/
│   ├── index.ts                             # 퍼블릭 API export
│   └── lib/
│       ├── multilingual.module.ts           # NestJS 모듈 정의
│       ├── multilingual-validation.service.ts  # TI18nString 및 번역 검증
│       ├── constants/
│       │   ├── rtl-languages.ts             # RTL 언어 코드 목록 (8개)
│       │   └── iso-language-codes.ts        # ISO 639-1 언어 코드 전체 목록
│       ├── types/
│       │   ├── i18n-string.type.ts          # TI18nString 타입 정의
│       │   └── survey-language.type.ts      # SurveyLanguage 타입 정의
│       └── utils/
│           ├── rtl-detector.ts              # RTL 판별 유틸리티
│           └── i18n-string.utils.ts         # TI18nString 조작 유틸리티

libs/client/multilingual/                    <-- [신규] 다국어 클라이언트 라이브러리
├── src/
│   ├── index.ts
│   └── lib/
│       ├── components/
│       │   ├── multi-language-card.tsx       # 설문 에디터 다국어 카드 UI
│       │   ├── language-switch.tsx           # 응답자용 언어 전환 드롭다운
│       │   ├── editor-language-selector.tsx  # 에디터 내 편집 언어 선택
│       │   └── remove-translations-dialog.tsx # 다국어 비활성화 확인 모달
│       ├── hooks/
│       │   ├── use-survey-languages.ts      # 설문 언어 관리 훅
│       │   └── use-rtl.ts                   # RTL 감지 훅
│       ├── utils/
│       │   ├── i18n-string.utils.ts         # TI18nString 클라이언트 유틸리티
│       │   ├── rtl-detector.ts              # RTL 판별 (클라이언트)
│       │   ├── translation-validator.ts     # 번역 완료 여부 검증
│       │   └── bidi-detector.ts             # 유니코드 Bidi 방향 판별
│       ├── schemas/
│       │   └── i18n-string.schema.ts        # TI18nString Zod 스키마
│       └── types/
│           └── multilingual.types.ts        # 클라이언트 타입 정의

[기존 모듈 수정]

libs/server/project/                          <-- [수정] Language 서비스 확장
├── src/lib/
│   ├── services/language.service.ts         # 삭제 시 SurveyLanguage 연쇄 처리 추가
│   └── controllers/language.controller.ts   # 라이선스 검증 가드 추가

libs/server/survey/                           <-- [수정] 다국어 검증 통합
├── src/lib/
│   ├── survey-validation.service.ts         # 다국어 검증 규칙 추가
│   └── dto/update-survey.dto.ts             # languages 필드 검증 강화

libs/client/project/                          <-- [수정]
├── src/lib/
│   └── language-manager.tsx                  # 라이선스 게이팅 UI 추가

apps/client/src/app/[lng]/                    <-- [수정/신규]
├── projects/[projectId]/
│   └── settings/languages/page.tsx           # [신규] 언어 관리 페이지
├── surveys/[surveyId]/
│   └── edit/                                 # [수정] 에디터에 다국어 카드 통합
```

**모듈 의존 관계:**

```
libs/server/multilingual (신규)
    ├── depends on: libs/server/prisma
    └── used by: libs/server/survey, libs/server/project

libs/client/multilingual (신규)
    ├── depends on: libs/client/core (apiFetch), libs/client/ui (shadcn/ui)
    └── used by: apps/client (설문 에디터, 응답자 화면, 프로젝트 설정)

libs/server/project (기존)
    └── 확장: LanguageController에 @RequireFeature('multiLanguage') 적용

libs/server/survey (기존)
    └── 확장: SurveyValidationService에 다국어 검증 규칙 추가
```

### 2.2 데이터 모델

**Language 모델 (FS-006에서 이미 정의됨, Prisma 변경 없음):**

```prisma
model Language {
  id        String   @id @default(cuid(2))
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  code      String   // ISO 639-1 언어 코드
  alias     String?  // 사용자 지정 별칭
  projectId String

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, code])
  @@map("languages")
}
```

**SurveyLanguage TypeScript 타입 (Survey.languages JSON 필드 구조):**

```typescript
/** 설문 레벨 언어 설정. Survey.languages JSON 배열의 항목 */
export interface SurveyLanguage {
  /** Language 엔티티의 ID (CUID2). Language 테이블과 논리적 참조 */
  languageId: string;
  /** 기본 언어 여부. 설문당 정확히 1개만 true */
  default: boolean;
  /** 활성화 여부. true인 언어만 응답자에게 노출 */
  enabled: boolean;
}
```

**TI18nString TypeScript 타입:**

```typescript
/**
 * 다국어 문자열 타입. "default" 키에 기본 언어 텍스트를 저장하고,
 * 추가 언어는 ISO 언어 코드를 키로 사용한다.
 *
 * @example
 * { "default": "What is your name?", "ko": "이름이 무엇인가요?", "ar": "ما اسمك؟" }
 */
export type TI18nString = {
  default: string;
  [languageCode: string]: string;
};
```

**Survey 모델 영향 (기존 FS-008 스키마, Prisma 변경 없음):**

```
Survey.languages      : Json  -- SurveyLanguage[] 저장
Survey.showLanguageSwitch : Boolean? -- 언어 전환 UI 표시 여부
Survey.welcomeCard    : Json  -- 내부 텍스트 필드가 string -> TI18nString으로 전환
Survey.blocks         : Json  -- Element 내부 텍스트 필드가 string -> TI18nString으로 전환
Survey.endings        : Json  -- 내부 텍스트 필드가 string -> TI18nString으로 전환
Survey.surveyClosedMessage : Json? -- TI18nString으로 전환
```

주의: Prisma 스키마 자체는 변경하지 않는다. 이들은 모두 `Json` 타입이므로, 내부 구조의 변경은 TypeScript 타입과 런타임 검증으로 관리한다.

**TI18nString 적용 대상 필드 목록:**

| Survey JSON 필드 | 내부 TI18nString 대상 서브 필드 |
|-------------------|-------------------------------|
| welcomeCard | headline, html, buttonLabel |
| blocks[].questions[] | headline, subheader, placeholder, buttonLabel, choice.label, lowerLabel, upperLabel, consent.label, dismissButtonLabel |
| endings[] | headline, subheader, buttonLabel |
| surveyClosedMessage | (전체가 TI18nString) |

### 2.3 API 설계

#### 2.3.1 프로젝트 언어 관리 API (FS-006에서 정의, 본 계획에서 라이선스 가드 추가)

| 메서드 | 엔드포인트 | 설명 | 인증 | 라이선스 | 권한 |
|--------|-----------|------|------|---------|------|
| GET | `/api/projects/:projectId/languages` | 언어 목록 조회 | JWT | multiLanguage | 조직 멤버 |
| POST | `/api/projects/:projectId/languages` | 언어 등록 | JWT | multiLanguage | OWNER/ADMIN |
| PATCH | `/api/languages/:languageId` | 언어 수정 | JWT | multiLanguage | OWNER/ADMIN |
| DELETE | `/api/languages/:languageId` | 언어 삭제 | JWT | multiLanguage | OWNER/ADMIN |

**언어 등록 요청 본문:**
```json
{
  "code": "ko",
  "alias": "한국어"
}
```

**언어 등록 응답:**
```json
{
  "id": "cuid2_string",
  "code": "ko",
  "alias": "한국어",
  "projectId": "cuid2_string",
  "createdAt": "2026-02-22T00:00:00.000Z",
  "updatedAt": "2026-02-22T00:00:00.000Z"
}
```

#### 2.3.2 설문 언어 설정 API (설문 CRUD API 내 통합)

설문 생성/수정 API(FS-008)의 요청 본문에 `languages`, `showLanguageSwitch` 필드를 포함하여 관리한다.

**설문 수정 시 languages 필드 예시:**
```json
{
  "languages": [
    { "languageId": "cuid2_en", "default": true, "enabled": true },
    { "languageId": "cuid2_ko", "default": false, "enabled": true },
    { "languageId": "cuid2_ar", "default": false, "enabled": false }
  ],
  "showLanguageSwitch": true
}
```

#### 2.3.3 Management API 확장 (FS-024 연계)

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| GET | `/api/v1/management/projects/:projectId/languages` | 언어 목록 조회 | API Key |
| POST | `/api/v1/management/projects/:projectId/languages` | 언어 생성 | API Key (WRITE+) |
| PUT | `/api/v1/management/projects/:projectId/languages/:languageId` | 언어 수정 | API Key (WRITE+) |
| DELETE | `/api/v1/management/projects/:projectId/languages/:languageId` | 언어 삭제 | API Key (MANAGE) |

### 2.4 주요 컴포넌트 설계

#### 2.4.1 MultilingualValidationService (서버)

```typescript
/**
 * 다국어 관련 유효성 검증 서비스.
 * Survey 저장/발행 시 TI18nString 및 SurveyLanguage 검증을 담당한다.
 */
class MultilingualValidationService {
  /** TI18nString의 "default" 키 존재 여부 검증 */
  validateI18nString(value: unknown): ValidationResult

  /** SurveyLanguage 배열의 비즈니스 규칙 검증 (default 유일성, enabled 상태 등) */
  validateSurveyLanguages(languages: SurveyLanguage[]): ValidationResult

  /** 활성 언어에 대한 번역 완료 여부 검증 (발행 시) */
  validateTranslationCompleteness(
    survey: SurveyData,
    enabledLanguageCodes: string[]
  ): TranslationValidationResult

  /** HTML 태그 제거 후 실제 텍스트 존재 여부 확인 */
  stripHtmlAndCheckEmpty(html: string): boolean
}
```

#### 2.4.2 RTL 판별 유틸리티

```typescript
/** RTL 언어 코드 목록 */
const RTL_LANGUAGE_CODES = ['ar', 'he', 'fa', 'ur'] as const;

/** 전체 RTL 코드 (지역 코드 포함) */
const RTL_LANGUAGE_FULL_CODES = [
  'ar', 'ar-SA', 'ar-EG', 'ar-AE', 'ar-MA', 'he', 'fa', 'ur'
] as const;

/** 언어 코드에서 base code를 추출하여 RTL 여부 판별 */
function isRtlLanguage(languageCode: string): boolean {
  const baseCode = languageCode.split('-')[0];
  return RTL_LANGUAGE_CODES.includes(baseCode as any);
}

/** 유니코드 Bidi 알고리즘으로 텍스트의 주요 방향 판별 (다국어 미설정 시 사용) */
function detectTextDirection(text: string): 'rtl' | 'ltr'
```

#### 2.4.3 TI18nString 유틸리티

```typescript
/** TI18nString에 새 언어 키를 추가 (기존 값 보존) */
function addLanguageKey(i18nString: TI18nString, languageCode: string): TI18nString {
  if (languageCode in i18nString) return i18nString; // 기존 값 보존
  return { ...i18nString, [languageCode]: '' };
}

/** TI18nString에서 "default" 이외의 언어 키를 모두 제거 */
function stripTranslations(i18nString: TI18nString): TI18nString {
  return { default: i18nString.default };
}

/** 설문 JSON 내 모든 TI18nString 필드를 순회하며 변환 함수 적용 */
function traverseAndTransformI18nStrings(
  surveyData: unknown,
  transform: (i18nString: TI18nString) => TI18nString
): unknown

/** 특정 언어에 대한 텍스트를 추출 (fallback: default) */
function getLocalizedText(i18nString: TI18nString, languageCode: string): string {
  return i18nString[languageCode] || i18nString.default;
}
```

#### 2.4.4 Multi-Language Card UI 컴포넌트

```
MultiLanguageCard (상위 컴포넌트)
├── 라이선스 미보유 상태 → UpgradePrompt
├── 언어 0개 상태 → "No languages found" + 설정 링크
├── 언어 1개 상태 → "2개 이상 언어 필요" + 설정 링크
└── 정상 상태 (2개 이상)
    ├── Default Language 드롭다운
    ├── Secondary Language 토글 리스트
    ├── Language Switch 토글
    └── "다국어 비활성화" 버튼 → RemoveTranslationsDialog
```

#### 2.4.5 Language Switch UI (응답자)

```
LanguageSwitch
├── 조건: showLanguageSwitch === true && enabledLanguages.length >= 2
├── 드롭다운 형태
│   ├── 현재 언어 표시 (alias || code)
│   └── 활성 언어 목록
├── 선택 시 → 설문 전체 재렌더링 (클라이언트 사이드)
└── RTL 감지 → dir 속성 자동 전환
```

### 2.5 기존 시스템 영향 분석

| 기존 모듈 | 영향 범위 | 변경 유형 | 상세 |
|----------|----------|----------|------|
| `libs/server/project` | 중간 | 수정 | LanguageController에 `@RequireFeature('multiLanguage')` 가드 추가. LanguageService 삭제 로직에 Survey.languages 연쇄 정리 추가 |
| `libs/server/survey` | 높음 | 수정 | SurveyValidationService에 다국어 검증 규칙 추가. Survey DTO에 languages/showLanguageSwitch 검증 강화 |
| `libs/client/project` | 낮음 | 수정 | language-manager.tsx에 라이선스 게이팅 조건부 렌더링 추가 |
| `apps/client` (에디터) | 높음 | 수정 | 설문 에디터 페이지에 Multi-Language Card 통합, 편집 언어 선택 드롭다운 추가 |
| `apps/client` (응답자) | 중간 | 수정 | 설문 응답 화면에 Language Switch UI 추가, RTL 레이아웃 지원 |
| `packages/shared-types` (또는 서버/클라이언트 내 타입) | 중간 | 수정 | TI18nString, SurveyLanguage 타입 정의 추가. 기존 Survey 타입의 텍스트 필드 타입 변경 (string -> TI18nString) |
| `libs/server/feature-gating` | 낮음 | 사용 | @RequireFeature() 데코레이터 + FeatureGateGuard 활용 (FS-029에서 구현) |

**하위 호환성 고려사항:**

기존 단일 언어 설문과의 하위 호환을 위해, TI18nString이 아닌 단순 string이 저장된 경우에도 정상 동작해야 한다. 런타임에서 다음 정규화 로직을 적용한다:

```typescript
/**
 * string 또는 TI18nString을 TI18nString으로 정규화.
 * 기존 단일 언어 설문 데이터와의 하위 호환성 보장.
 */
function normalizeToI18nString(value: string | TI18nString): TI18nString {
  if (typeof value === 'string') {
    return { default: value };
  }
  return value;
}
```

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 태스크명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|---------|------|--------|--------|----------|
| T-01 | TI18nString/SurveyLanguage 타입 정의 | 공유 TypeScript 타입 및 상수 정의 (TI18nString, SurveyLanguage, RTL 코드 목록, ISO 언어 코드 목록) | 없음 | 낮음 | 1h |
| T-02 | TI18nString Zod 스키마 정의 | 클라이언트/서버 공용 Zod 검증 스키마 (default 키 필수, 값 비어있지 않은지 검증) | T-01 | 낮음 | 0.5h |
| T-03 | RTL 판별 유틸리티 구현 | isRtlLanguage(), detectTextDirection() 함수. 서버/클라이언트 공용 | T-01 | 낮음 | 1h |
| T-04 | TI18nString 조작 유틸리티 구현 | addLanguageKey(), stripTranslations(), traverseAndTransformI18nStrings(), getLocalizedText(), normalizeToI18nString() | T-01 | 중간 | 2h |
| T-05 | MultilingualValidationService 구현 | 서버 사이드 다국어 검증 서비스. TI18nString 검증, SurveyLanguage 배열 검증, 번역 완료 여부 검증 | T-01, T-04 | 높음 | 3h |
| T-06 | MultilingualModule NestJS 모듈 설정 | 모듈 정의, export 설정, 빌드 구성 (tsconfig, package.json, project.json) | T-05 | 낮음 | 0.5h |
| T-07 | LanguageController 라이선스 가드 추가 | 기존 Language CRUD 엔드포인트에 @RequireFeature('multiLanguage') 적용 | T-06 | 낮음 | 0.5h |
| T-08 | LanguageService 삭제 로직 확장 | Language 삭제 시 해당 projectId의 모든 Survey에서 해당 languageId를 참조하는 SurveyLanguage 항목 자동 제거 | T-07 | 중간 | 2h |
| T-09 | SurveyValidationService 다국어 검증 통합 | 발행 시 검증 규칙에 활성 언어 번역 완료 검증 추가. MultilingualValidationService를 주입하여 사용 | T-05 | 중간 | 1.5h |
| T-10 | Survey DTO languages 필드 검증 강화 | UpdateSurveyDto에 languages(SurveyLanguage[]) 및 showLanguageSwitch 검증 추가 | T-01 | 낮음 | 1h |
| T-11 | 클라이언트 다국어 라이브러리 빌드 설정 | libs/client/multilingual 라이브러리 생성 (package.json, tsconfig, project.json) | 없음 | 낮음 | 0.5h |
| T-12 | 클라이언트 TI18nString 유틸리티 구현 | 클라이언트용 TI18nString 조작 함수 (서버 유틸리티와 동일 로직 + 설문 JSON 순회) | T-01, T-04 | 중간 | 1.5h |
| T-13 | 클라이언트 RTL 유틸리티 및 Bidi 감지기 | isRtlLanguage() (서버와 공유 가능), detectTextDirection() 유니코드 Bidi 구현 | T-03 | 중간 | 1.5h |
| T-14 | 번역 검증 유틸리티 (클라이언트) | 활성 언어 번역 완료율 계산, 누락 필드 목록 생성, HTML 태그 제거 후 빈 문자열 검출 | T-12 | 중간 | 1.5h |
| T-15 | useSurveyLanguages 훅 구현 | 설문 언어 상태 관리 훅. 기본 언어 변경, 보조 언어 토글, 다국어 비활성화, 언어 추가 시 TI18nString 자동 키 추가 | T-12 | 높음 | 3h |
| T-16 | useRtl 훅 구현 | 현재 설문 언어에 따른 RTL 감지, dir 속성 관리, 언어 전환 시 동적 업데이트 | T-13 | 낮음 | 1h |
| T-17 | Multi-Language Card 컴포넌트 구현 | 설문 에디터 내 다국어 설정 카드 UI. 라이선스/언어 상태별 4가지 분기 렌더링 | T-15 | 높음 | 4h |
| T-18 | RemoveTranslationsDialog 컴포넌트 구현 | 다국어 비활성화 확인 모달. destructive 스타일, 번역 삭제 경고 | T-11 | 낮음 | 1h |
| T-19 | EditorLanguageSelector 컴포넌트 구현 | 에디터 상단 편집 언어 선택 드롭다운. 활성 언어 목록 표시, 선택 시 편집 컨텍스트 전환 | T-15 | 중간 | 2h |
| T-20 | Language Switch 컴포넌트 구현 (응답자) | 응답자 설문 화면 언어 전환 드롭다운. RTL 전환, 설문 재렌더링 | T-16 | 중간 | 2.5h |
| T-21 | Link Survey ?lang= 파라미터 처리 | Link Survey 페이지에서 ?lang= 쿼리 파라미터 파싱, 유효성 검증, fallback 로직 | T-13 | 낮음 | 1h |
| T-22 | 프로젝트 설정 Languages 페이지 | 언어 CRUD UI 페이지. 라이선스 게이팅 (UpgradePrompt 또는 정상 UI) | T-07 | 중간 | 3h |
| T-23 | 설문 에디터에 Multi-Language Card 통합 | 기존 설문 에디터 페이지에 Multi-Language Card 배치, EditorLanguageSelector 통합 | T-17, T-19 | 중간 | 2h |
| T-24 | 응답자 화면에 Language Switch/RTL 통합 | 설문 응답 화면에 Language Switch UI 배치, RTL dir 속성 적용, 언어별 텍스트 렌더링 | T-20, T-21 | 중간 | 2h |
| T-25 | Management API 언어 엔드포인트 | FS-024 Management API에 Language CRUD 엔드포인트 추가 (API Key 인증) | T-07, T-08 | 중간 | 2h |
| T-26 | i18n 번역 키 추가 | 다국어 기능 관련 UI 문자열의 ko/en 번역 키 추가 | T-17, T-18, T-22 | 낮음 | 1h |
| T-27 | 단위 테스트 | TI18nString 유틸리티, RTL 판별, MultilingualValidationService, SurveyLanguage 검증 | T-05, T-12, T-13, T-14 | 중간 | 3h |
| T-28 | 통합 테스트 | Language API + 라이선스 가드, Survey 저장/발행 시 다국어 검증 | T-09, T-10, T-25 | 중간 | 3h |
| T-29 | E2E 테스트 | 프로젝트 언어 등록 -> 설문 다국어 활성화 -> 번역 입력 -> 발행 -> ?lang= 응답 플로우 | T-23, T-24 | 높음 | 3h |

### 3.2 구현 순서 및 마일스톤

**마일스톤 1: 공유 타입 및 유틸리티 (T-01 ~ T-04)** -- 예상 4.5h

```
T-01 (타입 정의) ─────────┐
                          ├─> T-02 (Zod 스키마)
T-03 (RTL 유틸) <─ T-01   │
T-04 (i18n 유틸) <─ T-01  │
```

검증 기준: 타입이 빌드되고, 유틸리티 함수의 단위 테스트 통과.

**마일스톤 2: 서버 다국어 모듈 (T-05 ~ T-10)** -- 예상 8.5h

```
T-05 (ValidationService) <── T-01, T-04
T-06 (Module 설정) <── T-05
T-07 (라이선스 가드) <── T-06
T-08 (Language 삭제 확장) <── T-07
T-09 (Survey 검증 통합) <── T-05
T-10 (DTO 검증 강화) <── T-01
```

검증 기준: Language API에 라이선스 가드 적용됨. Survey 발행 시 다국어 검증 동작. 통합 테스트 통과.

**마일스톤 3: 클라이언트 다국어 라이브러리 (T-11 ~ T-16)** -- 예상 10h

```
T-11 (빌드 설정)
T-12 (i18n 유틸) <── T-01, T-04
T-13 (RTL 유틸) <── T-03
T-14 (번역 검증) <── T-12
T-15 (useSurveyLanguages) <── T-12
T-16 (useRtl) <── T-13
```

검증 기준: 훅과 유틸리티 함수의 단위 테스트 통과. 라이브러리 빌드 성공.

**마일스톤 4: 관리자 UI (T-17 ~ T-19, T-22, T-23)** -- 예상 12h

```
T-17 (Multi-Language Card) <── T-15
T-18 (확인 모달) <── T-11
T-19 (EditorLanguageSelector) <── T-15
T-22 (Languages 페이지) <── T-07
T-23 (에디터 통합) <── T-17, T-19
```

검증 기준: 프로젝트 설정에서 언어 CRUD 가능. 설문 에디터에서 다국어 활성화/비활성화 가능. 편집 언어 전환 시 해당 언어 텍스트 표시.

**마일스톤 5: 응답자 UI (T-20 ~ T-21, T-24)** -- 예상 5.5h

```
T-20 (Language Switch) <── T-16
T-21 (?lang= 처리) <── T-13
T-24 (응답자 화면 통합) <── T-20, T-21
```

검증 기준: 응답자가 언어 전환 가능. ?lang= 파라미터로 특정 언어 설문 표시. RTL 언어 시 레이아웃 전환.

**마일스톤 6: API 확장 및 테스트 (T-25 ~ T-29)** -- 예상 12h

```
T-25 (Management API)
T-26 (i18n 키)
T-27 (단위 테스트)
T-28 (통합 테스트)
T-29 (E2E 테스트)
```

검증 기준: 전체 기능 E2E 플로우 통과. Management API 동작 확인.

**총 예상 시간: 약 52.5h (약 6.5 작업일)**

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|----------|----------|
| **libs/server/multilingual (신규 라이브러리)** | | |
| `libs/server/multilingual/package.json` | 생성 | @inquiry/server-multilingual 패키지 정의 |
| `libs/server/multilingual/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/multilingual/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `libs/server/multilingual/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/server/multilingual/src/index.ts` | 생성 | 공개 API export |
| `libs/server/multilingual/src/lib/multilingual.module.ts` | 생성 | NestJS MultilingualModule 정의 |
| `libs/server/multilingual/src/lib/multilingual-validation.service.ts` | 생성 | 다국어 유효성 검증 서비스 |
| `libs/server/multilingual/src/lib/types/i18n-string.type.ts` | 생성 | TI18nString 타입 정의 |
| `libs/server/multilingual/src/lib/types/survey-language.type.ts` | 생성 | SurveyLanguage 인터페이스 정의 |
| `libs/server/multilingual/src/lib/constants/rtl-languages.ts` | 생성 | RTL 언어 코드 상수 (8개) |
| `libs/server/multilingual/src/lib/constants/iso-language-codes.ts` | 생성 | ISO 639-1 언어 코드 목록 |
| `libs/server/multilingual/src/lib/utils/rtl-detector.ts` | 생성 | isRtlLanguage(), detectTextDirection() |
| `libs/server/multilingual/src/lib/utils/i18n-string.utils.ts` | 생성 | TI18nString 조작 유틸리티 함수 |
| **libs/client/multilingual (신규 라이브러리)** | | |
| `libs/client/multilingual/package.json` | 생성 | @inquiry/client-multilingual 패키지 정의 |
| `libs/client/multilingual/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/client/multilingual/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `libs/client/multilingual/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/client/multilingual/src/index.ts` | 생성 | 공개 API export |
| `libs/client/multilingual/src/lib/components/multi-language-card.tsx` | 생성 | 설문 에디터 다국어 설정 카드 (4가지 상태 분기) |
| `libs/client/multilingual/src/lib/components/language-switch.tsx` | 생성 | 응답자 언어 전환 드롭다운 |
| `libs/client/multilingual/src/lib/components/editor-language-selector.tsx` | 생성 | 에디터 편집 언어 선택 드롭다운 |
| `libs/client/multilingual/src/lib/components/remove-translations-dialog.tsx` | 생성 | 다국어 비활성화 확인 모달 (destructive) |
| `libs/client/multilingual/src/lib/hooks/use-survey-languages.ts` | 생성 | 설문 언어 상태 관리 훅 |
| `libs/client/multilingual/src/lib/hooks/use-rtl.ts` | 생성 | RTL 감지 및 dir 속성 관리 훅 |
| `libs/client/multilingual/src/lib/utils/i18n-string.utils.ts` | 생성 | 클라이언트 TI18nString 유틸리티 |
| `libs/client/multilingual/src/lib/utils/rtl-detector.ts` | 생성 | RTL 판별 유틸리티 |
| `libs/client/multilingual/src/lib/utils/bidi-detector.ts` | 생성 | 유니코드 Bidi 방향 판별 |
| `libs/client/multilingual/src/lib/utils/translation-validator.ts` | 생성 | 번역 완료 여부 검증 |
| `libs/client/multilingual/src/lib/schemas/i18n-string.schema.ts` | 생성 | TI18nString Zod 스키마 |
| `libs/client/multilingual/src/lib/types/multilingual.types.ts` | 생성 | 클라이언트 타입 정의 |
| **기존 서버 모듈 수정** | | |
| `libs/server/project/src/lib/controllers/language.controller.ts` | 수정 | @RequireFeature('multiLanguage') 가드 추가 |
| `libs/server/project/src/lib/services/language.service.ts` | 수정 | deleteLanguage()에 Survey.languages 연쇄 정리 로직 추가 |
| `libs/server/survey/src/lib/survey-validation.service.ts` | 수정 | 다국어 번역 완료 검증 규칙 추가 |
| `libs/server/survey/src/lib/dto/update-survey.dto.ts` | 수정 | languages(SurveyLanguage[]) 검증 데코레이터 추가 |
| `apps/server/src/app/app.module.ts` | 수정 | MultilingualModule import 추가 |
| **기존 클라이언트 모듈 수정** | | |
| `libs/client/project/src/lib/language-manager.tsx` | 수정 | 라이선스 게이팅 조건부 렌더링 추가 (UpgradePrompt) |
| **신규 페이지/라우트** | | |
| `apps/client/src/app/[lng]/projects/[projectId]/settings/languages/page.tsx` | 생성 | 프로젝트 언어 관리 페이지 |
| **i18n 번역 파일** | | |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | multilingual 네임스페이스 키 추가 |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | multilingual 네임스페이스 키 추가 |
| **테스트 파일** | | |
| `libs/server/multilingual/src/lib/__tests__/multilingual-validation.service.spec.ts` | 생성 | 검증 서비스 단위 테스트 |
| `libs/server/multilingual/src/lib/__tests__/i18n-string.utils.spec.ts` | 생성 | TI18nString 유틸리티 단위 테스트 |
| `libs/server/multilingual/src/lib/__tests__/rtl-detector.spec.ts` | 생성 | RTL 판별 단위 테스트 |
| `libs/client/multilingual/src/lib/__tests__/i18n-string.utils.spec.ts` | 생성 | 클라이언트 유틸리티 단위 테스트 |
| `libs/client/multilingual/src/lib/__tests__/translation-validator.spec.ts` | 생성 | 번역 검증 단위 테스트 |
| `libs/client/multilingual/src/lib/__tests__/bidi-detector.spec.ts` | 생성 | Bidi 판별 단위 테스트 |
| **tsconfig 경로 설정** | | |
| `tsconfig.base.json` | 수정 | @inquiry/server-multilingual, @inquiry/client-multilingual 경로 매핑 추가 |

---

## 4. 위험 및 완화 전략

| 위험 | 영향 | 발생 확률 | 완화 전략 |
|------|------|----------|----------|
| TI18nString 마이그레이션으로 기존 설문 데이터 호환성 파손 | 높음 | 중간 | `normalizeToI18nString()` 함수를 모든 읽기 경로에 적용하여 기존 string 값을 TI18nString으로 자동 변환. 마이그레이션 스크립트 없이 읽기 시점 정규화 방식 채택 |
| FS-006(Language 모델) 미구현 상태에서 작업 시작 | 높음 | 중간 | FS-006이 5단계보다 2단계에서 선행 구현되므로 Language 모델이 존재할 것으로 예상. 만약 미구현이면 Language 모델의 최소 스텁(스키마+기본 CRUD)을 본 계획에서 함께 생성 |
| FS-029(FeatureGateGuard) 미구현 상태 | 중간 | 중간 | FeatureGateGuard가 미구현이면 간이 가드를 libs/server/multilingual 내에 임시 구현. FS-029 완성 시 교체 |
| 설문 JSON 내 TI18nString 순회 성능 | 중간 | 낮음 | 대규모 설문(100+ 질문)에서도 JSON 순회는 ms 단위. 검증 시 early return 적용. 필요 시 검증을 비동기로 분리 |
| RTL 레이아웃 깨짐 | 중간 | 중간 | Tailwind CSS의 RTL 유틸리티(rtl: 변형) 활용. 주요 RTL 언어(아랍어, 히브리어)로 수동 레이아웃 테스트 필수 |
| traverseAndTransformI18nStrings의 Survey JSON 구조 변경 시 유지보수 | 중간 | 중간 | Survey JSON 내 TI18nString 필드 경로를 상수로 관리하고, FS-009/FS-012 등에서 구조 변경 시 경로 상수를 업데이트. 타입 수준에서 TI18nString이 적용된 필드를 명시적으로 표기 |
| 클라이언트/서버 간 RTL 유틸리티 중복 | 낮음 | 높음 | RTL 상수와 isRtlLanguage() 로직이 서버/클라이언트에 중복됨. packages/shared-types가 구현되면 공유 패키지로 이동. 현재는 의도적 중복 허용 (코드 양이 적어 유지보수 비용 낮음) |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 테스트 대상 | 테스트 케이스 | 도구 |
|------------|-------------|------|
| **TI18nString 유틸리티** | addLanguageKey: 새 키 추가, 기존 키 보존 | Jest |
| | stripTranslations: default만 남기고 제거 | Jest |
| | normalizeToI18nString: string -> TI18nString, TI18nString -> TI18nString | Jest |
| | getLocalizedText: 지정 언어 반환, 미존재 시 default fallback | Jest |
| | traverseAndTransformI18nStrings: 중첩 JSON 순회, 모든 TI18nString 변환 확인 | Jest |
| **RTL 판별** | isRtlLanguage: 8개 RTL 코드 true, LTR 코드 false | Jest |
| | isRtlLanguage: base code 추출 (ar-SA -> ar) | Jest |
| | detectTextDirection: 아랍어 텍스트 -> rtl, 영어 텍스트 -> ltr | Jest |
| **MultilingualValidationService** | validateI18nString: default 키 필수, 빈 문자열 불가 | Jest + NestJS Testing |
| | validateSurveyLanguages: default 유일성, 빈 배열 허용, 중복 languageId 거부 | Jest + NestJS Testing |
| | validateTranslationCompleteness: 전체 번역 완료, 일부 누락, HTML 태그만 있는 경우 | Jest + NestJS Testing |
| | stripHtmlAndCheckEmpty: `<p></p>` -> 빈, `<b>text</b>` -> 비어있지 않음 | Jest |
| **Zod 스키마** | i18nStringSchema: 유효한 TI18nString, default 누락, 빈 default 값 | Jest |
| **번역 검증 유틸리티** | 번역 완료율 계산 정확성, 누락 필드 목록 생성, HTML 태그 제거 후 검증 | Jest |

### 5.2 통합 테스트

| 테스트 대상 | 테스트 케이스 | 도구 |
|------------|-------------|------|
| **Language API + 라이선스 가드** | Enterprise 라이선스 활성 시 Language CRUD 성공 | Jest + Supertest |
| | 라이선스 비활성 시 403 Forbidden 반환 | Jest + Supertest |
| | 동일 프로젝트 내 중복 언어 코드 등록 시 409 Conflict | Jest + Supertest |
| **Language 삭제 연쇄** | 언어 삭제 시 해당 언어를 참조하는 Survey.languages에서 항목 자동 제거 | Jest + TestDB |
| **Survey 저장 (다국어)** | languages 필드 포함 Survey 수정 시 SurveyLanguage 검증 통과 | Jest + Supertest |
| | default가 2개인 languages 배열 제출 시 400 Bad Request | Jest + Supertest |
| **Survey 발행 (다국어 검증)** | 활성 언어 번역이 모두 완료된 설문 발행 성공 | Jest + Supertest |
| | 번역 누락 언어가 있는 설문 발행 시 검증 경고 반환 | Jest + Supertest |
| **Management API** | API Key로 Language CRUD 정상 동작 | Jest + Supertest |
| | READ 권한 API Key로 Language 생성 시 403 | Jest + Supertest |

### 5.3 E2E 테스트

| 시나리오 | 검증 항목 | 도구 |
|---------|----------|------|
| **전체 다국어 플로우** | 1. 프로젝트에 en/ko/ar 3개 언어 등록 -> 2. 설문 생성, 다국어 활성화 (en=default, ko=secondary) -> 3. ko 번역 입력 -> 4. 발행 -> 5. ?lang=ko로 접근 시 한국어 표시 | Playwright |
| **RTL 플로우** | 1. ar 언어 추가, 설문 활성화 -> 2. ar 번역 입력 -> 3. ?lang=ar로 접근 -> 4. dir="rtl" 적용 확인 -> 5. 로고 위치 반전 확인 | Playwright |
| **Language Switch 플로우** | 1. showLanguageSwitch=true 설정 -> 2. 응답자 접근 -> 3. 언어 전환 드롭다운 표시 확인 -> 4. 언어 전환 시 텍스트 변경 확인 | Playwright |
| **라이선스 게이팅 플로우** | 1. Enterprise 라이선스 없이 Languages 페이지 접근 -> 2. UpgradePrompt 표시 확인 -> 3. 설문 에디터 Multi-Language Card에서도 UpgradePrompt 표시 확인 | Playwright |
| **다국어 비활성화 플로우** | 1. 다국어 활성 상태에서 비활성화 버튼 클릭 -> 2. 확인 모달 표시 -> 3. 확인 후 languages 초기화 -> 4. 모든 TI18nString에서 default만 남음 확인 | Playwright |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 설명 |
|------|------|
| AI 자동 번역 미지원 | 명세서 범위 외. 사용자가 수동으로 번역을 입력해야 한다. |
| 번역 워크플로우 없음 | 번역자 역할, 번역 승인 프로세스 등은 현재 범위에 포함되지 않는다. |
| TI18nString 순회 경로 하드코딩 | traverseAndTransformI18nStrings가 Survey JSON의 특정 경로를 알아야 한다. Survey 구조 변경 시 경로 업데이트 필요. |
| 클라이언트/서버 유틸리티 중복 | RTL 판별, TI18nString 조작 유틸리티가 서버/클라이언트에 각각 존재한다. packages/shared-types 패키지가 구현될 때까지 의도적 중복. |
| 프로젝트 언어 삭제 시 Survey 번역 즉시 정리 안 됨 | SurveyLanguage 항목은 즉시 제거되지만, Survey JSON 내 해당 언어의 번역 텍스트는 즉시 삭제되지 않는다 (다음 설문 편집/저장 시 정리). |
| 단일 언어에서 다국어로 전환 시 기존 텍스트 | 기존 string 타입 텍스트는 normalizeToI18nString()으로 `{ default: "기존 텍스트" }`로 자동 변환. 명시적 마이그레이션 스크립트는 제공하지 않는다. |
| RTL 언어 목록 고정 | 8개 RTL 언어 코드가 상수로 고정. 새 RTL 언어 추가 시 코드 변경 필요. |

### 6.2 향후 개선 가능사항

| 항목 | 설명 |
|------|------|
| AI 자동 번역 통합 | OpenAI/DeepL 등을 활용한 자동 번역 기능. 번역 초안 자동 생성 후 사용자 검수. |
| 번역 워크플로우 | 번역자 역할 추가, 번역 상태 관리(초안/검토/승인), 번역 대시보드. |
| 공유 패키지로 유틸리티 통합 | packages/shared 또는 packages/shared-types 패키지 구현 시 RTL 유틸리티, TI18nString 유틸리티를 공유 패키지로 이동. |
| 번역 메모리 (Translation Memory) | 이전에 번역한 유사 텍스트를 추천하여 번역 효율 향상. |
| 실시간 번역 협업 | 여러 번역자가 동시에 설문 번역을 편집할 수 있는 실시간 협업 기능. |
| RTL 언어 목록 동적 관리 | 관리자가 RTL 언어 목록을 설정으로 관리할 수 있도록 확장. |
| 번역 내보내기/가져오기 | XLIFF, CSV 등 표준 형식으로 번역 데이터를 내보내고 가져오는 기능. |

---

## 7. i18n 고려사항 (관리자 UI)

다국어 설문 기능의 관리자 UI에서 사용되는 문자열은 기존 react-i18next 시스템을 통해 관리한다.

### 추가/수정 필요한 번역 키

```json
{
  "multilingual": {
    "card": {
      "title": "Multi-Language",
      "description": "Manage survey translations",
      "upgrade_prompt_cloud": "Start Free Trial",
      "upgrade_prompt_selfhosted": "Request Trial License",
      "no_languages": "No languages found",
      "no_languages_link": "Add languages in project settings",
      "min_languages": "At least 2 languages required",
      "min_languages_link": "Manage languages",
      "default_language": "Default Language",
      "secondary_languages": "Secondary Languages",
      "language_switch": "Language Switch",
      "language_switch_description": "Allow respondents to switch language",
      "language_switch_disabled_hint": "Requires at least 2 enabled languages",
      "disable_multilingual": "Disable Multi-Language",
      "disable_multilingual_description": "Remove all translations"
    },
    "dialog": {
      "remove_title": "Remove translations",
      "remove_description": "This will permanently delete all translation data. Only the default language text will be kept. This action cannot be undone.",
      "remove_confirm": "Remove Translations",
      "remove_cancel": "Cancel"
    },
    "editor": {
      "editing_language": "Editing Language",
      "translation_missing": "Translation missing",
      "translation_complete": "Translation complete"
    },
    "language_switch": {
      "label": "Language"
    },
    "validation": {
      "default_key_required": "Default language text is required",
      "translation_missing": "Translation missing for {{language}}",
      "translation_incomplete": "{{count}} translations incomplete"
    },
    "languages_page": {
      "title": "Languages",
      "description": "Manage languages available for surveys in this project",
      "add_language": "Add Language",
      "code_label": "Language Code",
      "code_placeholder": "e.g., ko, ar-SA",
      "alias_label": "Alias",
      "alias_placeholder": "e.g., Korean",
      "duplicate_code": "This language code is already registered",
      "invalid_code": "Please enter a valid ISO language code",
      "delete_confirm": "Are you sure you want to delete this language?",
      "delete_warning": "Surveys using this language will have their language settings updated.",
      "empty_state": "No languages registered yet"
    }
  }
}
```

한국어 번역 키도 동일한 구조로 `ko/translation.json`에 추가한다.
