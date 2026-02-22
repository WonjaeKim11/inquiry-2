# 기능 구현 계획: 관리자 UI 다국어(i18n)

> 문서 번호: FSD-030 | 작성일: 2026-02-22 | 상태: 구현 계획

---

## 1. 명세 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 설명 |
|---------|--------|------|
| FN-030-01 | 지원 언어 관리 | 14개 언어의 로케일 코드, 번역 파일, 기본 로케일 정의 및 관리 |
| FN-030-02 | 사용자 로케일 저장 | User.locale 필드에 로케일 저장, 프로필 설정에서 변경 |
| FN-030-03 | 로케일 결정 로직 | DB > Accept-Language > 폴백(en-US) 우선순위로 로케일 결정 |
| FN-030-04 | 서버 사이드 번역 | i18next 인스턴스를 통한 서버 컴포넌트 번역 처리 |
| FN-030-05 | 클라이언트 사이드 번역 | react-i18next useTranslation hook 기반 클라이언트 번역 |
| FN-030-06 | 번역 키 명명 규칙 | 소문자 + 점(dot) 구분자 + snake_case 설명 형식 |
| FN-030-07 | ICU Message Format 지원 | i18next-icu 플러그인을 통한 복수형, 성별, 변수 보간 처리 |
| FN-030-08 | 설문 UI 다국어 유틸리티 | ISO 639 언어 코드 DB, 14개 로케일별 표시 이름 |
| FN-030-09 | i18nString 타입 | 설문 콘텐츠 다국어 문자열 표현 타입 및 유틸리티 함수 |
| FN-030-10 | 앱 언어 목록 제공 | UI 드롭다운용 14개 언어 목록 (로케일 코드 + 영어 표시 이름) |
| FN-030-11 | 번역 검증 도구 | en-US 기준 파일 대비 13개 로케일의 누락 키 스캔 CLI |

### 1.2 비기능 요구사항

| ID | 요구사항 | 카테고리 |
|----|---------|---------|
| NFR-I01 | 번역 파일은 동적 import로 필요한 로케일만 로드 (번들 크기 최적화) | 성능 |
| NFR-I02 | 번역 키 누락 시 en-US 폴백 사용 (빈 텍스트 표시 방지) | 가용성 |
| NFR-I03 | i18next escape 비활성화, React 내장 XSS 방지에 의존 | 보안 |
| NFR-I04 | 번역 키 누락 자동 검증 도구 제공 | 유지보수성 |
| NFR-I05 | JSON 파일 + 로케일 배열 추가만으로 새 언어 확장 가능 | 유지보수성 |
| NFR-I06 | 서버/클라이언트 동일 번역 파일 사용 (번역 불일치 방지) | 가용성 |

### 1.3 명세의 모호성 및 해석

| 항목 | 모호성 | 해석 |
|------|--------|------|
| 번역 파일 구조 | 명세는 flat JSON(`"common.save": "Save"`)을 예시로 보여주나, 기존 코드는 중첩 JSON(`{ "auth": { "login": { ... } } }`)을 사용 | **기존 코드의 중첩 JSON 구조를 유지**한다. 명세의 flat key 예시는 개념적 키 경로를 나타내는 것으로 해석한다. 중첩 구조는 이미 동작 중이며 마이그레이션 비용을 피한다 |
| 로케일 코드 형식 | 기존 코드는 `en`, `ko` 단순 코드를 사용하나, 명세는 `en-US`, `de-DE` 등 지역 코드를 요구 | **명세의 `en-US` 형식으로 마이그레이션**한다. 기존 `en` -> `en-US`, `ko` -> `ko`(한국어는 14개 목록에 없음)로 변환. ko는 지원 언어 목록에 없으므로 `ja-JP`(일본어)로 대체하거나, 한국어를 추가하여 15개 언어로 확장하는 것을 검토해야 한다 |
| 한국어(ko) 지원 여부 | 14개 언어 목록에 한국어(ko)가 없으나, 현재 코드에는 ko 번역이 존재 | **한국어(ko-KR)를 15번째 지원 언어로 추가**한다. 이미 작성된 ko 번역을 버리는 것은 비합리적이며, 명세의 14개는 최소 지원 언어로 해석한다 |
| 프로필 설정 화면 | 명세는 프로필 설정에서 언어 드롭다운을 요구하나, 현재 프로필 설정 페이지가 존재하지 않음 | 프로필 설정 페이지의 전체 구현은 별도 기능이므로, 이 작업에서는 **언어 변경 전용 UI 컴포넌트만 구현**하고 향후 프로필 페이지에 통합한다 |
| API 엔드포인트 | 명세는 "기존 프로필 업데이트 API"를 언급하나, 현재 프로필 업데이트 API가 없음 | **`PATCH /api/users/me/locale` 엔드포인트를 신규 생성**한다. 추후 프로필 업데이트 API가 만들어지면 통합한다 |
| ICU Message Format | 명세는 i18next-icu 플러그인 사용을 지시하나, 현재 설치되어 있지 않음 | i18next-icu 패키지를 설치하고 서버/클라이언트 양쪽 i18next 설정에 추가한다 |
| 이메일 다국어 발송 (AC-030-12) | 이메일 알림이 수신자 로케일에 맞는 언어로 발송되어야 하나, 현재 이메일 템플릿은 한국어 고정 | 이메일 서비스에 로케일 파라미터를 추가하고, 서버 번역 함수를 활용하여 이메일 콘텐츠를 번역한다 |

### 1.4 암묵적 요구사항

| 항목 | 설명 |
|------|------|
| 미들웨어 확장 | 기존 Next.js 미들웨어의 `languages` 배열을 2개(`en`, `ko`) -> 15개로 확장하고, 쿠키 및 URL 패턴을 새 로케일 코드에 맞게 수정 |
| `generateStaticParams` 확장 | 15개 로케일에 대한 정적 경로 파라미터 생성 |
| 번역 파일 12개 신규 생성 | `en-US`, `ko-KR` 외 13개 로케일의 번역 JSON 파일 생성 (초기값은 en-US 복사) |
| 서버 사이드 번역 함수 ICU 지원 | 기존 서버 사이드 번역 함수(`apps/client/src/app/i18n/index.ts`)에 ICU 플러그인 추가 |
| 클라이언트 i18next 초기화 리팩토링 | 현재 2개 언어 리소스를 static import하는 방식에서 동적 로드로 전환 (15개 번들 방지) |
| 서버 User API locale 반환 | GET /api/auth/me 응답에 `locale` 필드를 포함해야 함 |
| Accept-Language 접두사 매칭 | 현재 `accept-language` 라이브러리가 처리하지만, 명세의 `pt` -> `pt-BR` 우선 매칭 규칙 적용 필요 |
| 이메일 발송 서비스 다국어화 | EmailService가 수신자 locale을 받아 서버 번역 함수로 번역된 이메일 템플릿 생성 |
| User 모듈 신규 생성 | 현재 사용자 프로필 관리 모듈이 없으므로, locale 업데이트를 위한 User 모듈/서비스/컨트롤러 생성 필요 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────────┐
│                         클라이언트 (Next.js 16)                       │
│                                                                     │
│  ┌──────────────────┐   ┌─────────────────────────────────────────┐ │
│  │ Next.js Middleware│   │ apps/client/src/app/i18n/               │ │
│  │ (locale routing)  │   │ ├── settings.ts (15개 로케일 정의)       │ │
│  │                   │   │ ├── index.ts (서버 번역 함수 + ICU)      │ │
│  └──────────────────┘   │ ├── client.ts (클라이언트 i18next + ICU) │ │
│                          │ └── locales/                             │ │
│  ┌──────────────────┐   │     ├── en-US/translation.json           │ │
│  │ I18nProvider      │   │     ├── ko-KR/translation.json           │ │
│  │ (클라이언트 제공자)│   │     ├── de-DE/translation.json           │ │
│  └──────────────────┘   │     └── ... (15개 로케일)                 │ │
│                          └─────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ libs/client/i18n (공유 라이브러리)                              │   │
│  │ ├── supported-locales.ts (로케일 목록 + 앱 언어 데이터)        │   │
│  │ ├── i18n-utils.ts (i18nString 유틸리티)                       │   │
│  │ ├── iso-languages.ts (ISO 639 언어 코드 DB)                   │   │
│  │ └── types.ts (I18nString, AppLanguage 타입)                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 언어 선택 UI (LanguageSelector 컴포넌트)                       │   │
│  │ - 프로필 설정에서 사용                                          │   │
│  │ - PATCH /api/users/me/locale 호출                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         서버 (NestJS)                                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ libs/server/user (신규 모듈)                                   │   │
│  │ ├── user.module.ts                                            │   │
│  │ ├── user.controller.ts  (PATCH /api/users/me/locale)          │   │
│  │ ├── user.service.ts                                           │   │
│  │ └── dto/update-locale.dto.ts                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ libs/server/email (기존 모듈 수정)                              │   │
│  │ └── email.service.ts (locale 파라미터 추가, 서버 번역 적용)     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ JwtStrategy (기존 수정)                                        │   │
│  │ └── validate() 응답에 locale 필드 추가                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                  공유 패키지                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ packages/shared-i18n (신규)                                    │   │
│  │ ├── supported-locales.ts (15개 로케일 상수 + 유효성 검증)      │   │
│  │ ├── i18n-string.ts (i18nString 타입 + 유틸리티)               │   │
│  │ └── index.ts                                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ scripts/check-i18n.ts (번역 검증 도구)                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 모델

**User 모델 (이미 locale 필드 존재 - 변경 불필요)**

```prisma
model User {
  // ... 기존 필드
  locale String @default("en-US")  // 현재 이미 존재
}
```

기존 Prisma 스키마에 `locale` 필드가 이미 `@default("en-US")`로 정의되어 있으므로, DB 마이그레이션은 불필요하다.

**i18nString 타입 (TypeScript)**

```typescript
/** 설문 콘텐츠 다국어 문자열 타입 */
interface I18nString {
  default: string;
  [languageCode: string]: string;
}
```

**AppLanguage 타입**

```typescript
/** 앱 지원 언어 항목 */
interface AppLanguage {
  code: string;       // 로케일 코드 (e.g., "de-DE")
  label: string;      // 영어 표시 이름 (e.g., "German")
  nativeLabel: string; // 해당 언어 표시 이름 (e.g., "Deutsch")
}
```

### 2.3 API 설계

**신규 엔드포인트: 사용자 로케일 업데이트**

```
PATCH /api/users/me/locale
Authorization: Bearer <accessToken>

Request Body:
{
  "locale": "de-DE"
}

Response 200:
{
  "locale": "de-DE"
}

Response 400 (유효하지 않은 로케일):
{
  "statusCode": 400,
  "message": "지원하지 않는 로케일 코드입니다."
}
```

**기존 엔드포인트 수정: GET /api/auth/me**

```
// 기존 응답에 locale 필드 추가
Response 200:
{
  "id": "...",
  "email": "...",
  "name": "...",
  "image": null,
  "emailVerified": "...",
  "locale": "en-US"  // 신규 추가
}
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 packages/shared-i18n - 공유 i18n 상수 및 타입

서버와 클라이언트 양쪽에서 사용하는 로케일 관련 상수, 타입, 유틸리티를 공유 패키지로 분리한다.

```typescript
// packages/shared-i18n/src/supported-locales.ts

export const SUPPORTED_LOCALES = [
  'de-DE', 'en-US', 'es-ES', 'fr-FR', 'hu-HU',
  'ja-JP', 'ko-KR', 'nl-NL', 'pt-BR', 'pt-PT',
  'ro-RO', 'ru-RU', 'sv-SE', 'zh-Hans-CN', 'zh-Hant-TW',
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en-US';
export const FALLBACK_LOCALE: SupportedLocale = 'en-US';

/** 로케일 코드가 지원 목록에 있는지 검증 */
export function isSupportedLocale(code: string): code is SupportedLocale {
  return SUPPORTED_LOCALES.includes(code as SupportedLocale);
}

/** Accept-Language 접두사를 지원 로케일로 매핑 */
export const LOCALE_PREFIX_MAP: Record<string, SupportedLocale> = {
  de: 'de-DE',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  hu: 'hu-HU',
  ja: 'ja-JP',
  ko: 'ko-KR',
  nl: 'nl-NL',
  pt: 'pt-BR',  // pt는 pt-BR에 우선 매칭 (BR-03-02)
  ro: 'ro-RO',
  ru: 'ru-RU',
  sv: 'sv-SE',
  zh: 'zh-Hans-CN',
};

/** 앱 언어 목록 (드롭다운 표시용) */
export const APP_LANGUAGES: AppLanguage[] = [
  { code: 'de-DE', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'en-US', label: 'English (US)', nativeLabel: 'English (US)' },
  { code: 'es-ES', label: 'Spanish', nativeLabel: 'Espanol' },
  { code: 'fr-FR', label: 'French', nativeLabel: 'Francais' },
  { code: 'hu-HU', label: 'Hungarian', nativeLabel: 'Magyar' },
  { code: 'ja-JP', label: 'Japanese', nativeLabel: '日本語' },
  { code: 'ko-KR', label: 'Korean', nativeLabel: '한국어' },
  { code: 'nl-NL', label: 'Dutch', nativeLabel: 'Nederlands' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)', nativeLabel: 'Portugues (Brasil)' },
  { code: 'pt-PT', label: 'Portuguese (Portugal)', nativeLabel: 'Portugues (Portugal)' },
  { code: 'ro-RO', label: 'Romanian', nativeLabel: 'Romana' },
  { code: 'ru-RU', label: 'Russian', nativeLabel: 'Русский' },
  { code: 'sv-SE', label: 'Swedish', nativeLabel: 'Svenska' },
  { code: 'zh-Hans-CN', label: 'Chinese (Simplified)', nativeLabel: '简体中文' },
  { code: 'zh-Hant-TW', label: 'Chinese (Traditional)', nativeLabel: '繁體中文' },
];
```

#### 2.4.2 i18nString 유틸리티

```typescript
// packages/shared-i18n/src/i18n-string.ts

export interface I18nString {
  default: string;
  [languageCode: string]: string;
}

/** i18nString 객체 생성 */
export function createI18nString(text: string, languages: string[]): I18nString {
  const result: I18nString = { default: text };
  for (const lang of languages) {
    result[lang] = '';
  }
  return result;
}

/** 값이 I18nString 객체인지 판별 */
export function isI18nString(value: unknown): value is I18nString {
  return (
    typeof value === 'object' &&
    value !== null &&
    'default' in value &&
    typeof (value as Record<string, unknown>).default === 'string'
  );
}

/** 특정 언어의 번역 값 추출 (없으면 default) */
export function getI18nValue(i18nStr: I18nString, lang: string): string {
  return i18nStr[lang] || i18nStr.default;
}

/** 설문 객체에서 사용된 언어 코드 목록 추출 */
export function extractSurveyLanguages(survey: { languages?: string[] }): string[] {
  return survey.languages || [];
}
```

#### 2.4.3 클라이언트 i18next 설정 리팩토링

기존의 static import 방식에서 `i18next-resources-to-backend`를 활용한 동적 로드 방식으로 전환한다. 단, 초기 렌더링 시 플리커를 방지하기 위해 현재 로케일의 리소스만 즉시 로드한다.

```typescript
// apps/client/src/app/i18n/settings.ts (리팩토링)
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@inquiry/shared-i18n';

export const fallbackLng = DEFAULT_LOCALE;
export const languages = [...SUPPORTED_LOCALES];
export const defaultNS = 'translation';
export const cookieName = 'i18next';

export function getOptions(lng = fallbackLng, ns: string | string[] = defaultNS) {
  return {
    supportedLngs: languages,
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns,
    interpolation: {
      escapeValue: false,  // React 내장 XSS 방지에 의존 (NFR-I03)
    },
  };
}
```

#### 2.4.4 미들웨어 로케일 결정 로직

```typescript
// apps/client/src/middleware.ts (리팩토링)
// 1. 쿠키 확인 -> 2. Accept-Language 헤더 -> 3. 폴백 en-US
// 접두사 매칭 로직 추가: LOCALE_PREFIX_MAP 활용
```

#### 2.4.5 서버 모듈: User 로케일 관리

```typescript
// libs/server/user/src/lib/user.controller.ts
@Controller('users')
export class UserController {
  @UseGuards(JwtAuthGuard)
  @Patch('me/locale')
  async updateLocale(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateLocaleDto
  ) {
    return this.userService.updateLocale(user.id, dto.locale);
  }
}
```

### 2.5 기존 시스템 영향도 분석

| 대상 | 변경 내용 | 영향도 |
|------|----------|--------|
| `apps/client/src/app/i18n/settings.ts` | 로케일 목록 2개 -> 15개 확장, 로케일 코드 형식 변경 | 높음 - 전체 라우팅에 영향 |
| `apps/client/src/app/i18n/client.ts` | static import에서 동적 로드로 전환, ICU 플러그인 추가 | 높음 - 클라이언트 번역 전체에 영향 |
| `apps/client/src/app/i18n/index.ts` | ICU 플러그인 추가, escape 비활성화 | 중간 - 서버 번역에 영향 |
| `apps/client/src/middleware.ts` | 15개 로케일 라우팅, 접두사 매칭 로직 | 높음 - URL 라우팅에 영향 |
| `apps/client/src/app/[lng]/layout.tsx` | `generateStaticParams` 15개로 확장 | 낮음 - settings.ts 참조 |
| `apps/client/src/app/[lng]/i18n-provider.tsx` | 동적 로드 방식에 맞게 Provider 수정 | 중간 |
| `libs/server/auth/src/lib/strategies/jwt.strategy.ts` | validate() 응답에 locale 추가 | 낮음 |
| `libs/server/email/src/lib/email.service.ts` | locale 파라미터 추가, 다국어 이메일 템플릿 | 중간 |
| `libs/client/core/src/lib/auth-context.tsx` | User 타입에 locale 추가 | 낮음 |
| `apps/client/src/app/i18n/locales/` | en -> en-US, ko -> ko-KR 이름 변경 + 13개 번역 파일 추가 | 중간 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|----------|
| T-01 | packages/shared-i18n 패키지 생성 | 로케일 상수, 타입, i18nString 유틸리티를 공유 패키지로 정의 | 없음 | 낮음 | 1h |
| T-02 | 번역 파일 디렉토리 구조 마이그레이션 | `en/` -> `en-US/`, `ko/` -> `ko-KR/` 이름 변경, 13개 로케일 디렉토리 및 기본 번역 파일 생성 | T-01 | 낮음 | 1h |
| T-03 | i18n settings.ts 리팩토링 | 15개 로케일 적용, shared-i18n 패키지 import, getOptions 업데이트 | T-01, T-02 | 낮음 | 30m |
| T-04 | i18next-icu 플러그인 설치 및 설정 | i18next-icu 패키지 설치, 서버/클라이언트 i18next 설정에 ICU 플러그인 추가 | T-03 | 중간 | 1h |
| T-05 | 서버 사이드 번역 함수 업데이트 | `apps/client/src/app/i18n/index.ts` ICU 플러그인 적용, escape 비활성화 | T-03, T-04 | 낮음 | 30m |
| T-06 | 클라이언트 i18next 초기화 리팩토링 | static import -> 동적 로드 전환, ICU 플러그인 적용, 15개 로케일 지원 | T-03, T-04 | 높음 | 2h |
| T-07 | I18nProvider 수정 | 동적 로드 방식에 맞게 Provider 로직 수정 | T-06 | 중간 | 1h |
| T-08 | 미들웨어 로케일 결정 로직 리팩토링 | 15개 로케일 지원, 접두사 매칭, DB 로케일 우선 로직 (쿠키 기반) | T-03 | 중간 | 1.5h |
| T-09 | libs/server/user 모듈 생성 | UserModule, UserController, UserService, UpdateLocaleDto 생성 | T-01 | 중간 | 2h |
| T-10 | JwtStrategy locale 포함 | validate() 응답에 locale 필드 추가 | 없음 | 낮음 | 15m |
| T-11 | AuthContext User 타입 확장 | User 인터페이스에 locale 필드 추가 | T-10 | 낮음 | 15m |
| T-12 | LanguageSelector 컴포넌트 구현 | 드롭다운 UI, locale 변경 API 호출, i18n 언어 전환 | T-09, T-11 | 중간 | 2h |
| T-13 | 번역 키 명명 규칙 문서화 | 번역 키 규칙을 CLAUDE.md 또는 별도 문서로 정리 | 없음 | 낮음 | 30m |
| T-14 | 번역 검증 스크립트 작성 | en-US 기준 누락 키 검출 CLI 도구 | T-02 | 중간 | 1.5h |
| T-15 | ISO 639 언어 코드 데이터 구현 | 설문 UI 다국어 유틸리티용 언어 코드 DB | T-01 | 중간 | 1.5h |
| T-16 | 이메일 서비스 다국어화 | EmailService locale 파라미터 추가, 서버 번역 함수로 이메일 내용 번역 | T-05, T-09 | 높음 | 3h |
| T-17 | 빌드 검증 및 기존 번역 키 마이그레이션 | 모든 변경 반영 후 빌드, 기존 번역 키가 중첩 구조에서 정상 동작하는지 확인 | T-01~T-16 | 중간 | 1h |
| T-18 | 테스트 작성 | i18nString 유틸리티, 로케일 검증, 번역 검증 도구 테스트 | T-01, T-14 | 중간 | 2h |

### 3.2 구현 순서 및 마일스톤

```
마일스톤 1: i18n 기반 인프라 (T-01 ~ T-05)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  T-01 shared-i18n 패키지 생성
   ↓
  T-02 번역 파일 디렉토리 마이그레이션
   ↓
  T-03 settings.ts 리팩토링
   ↓
  T-04 i18next-icu 설치 및 설정
   ↓
  T-05 서버 번역 함수 업데이트

  [검증 지점] 서버 사이드 번역이 en-US로 정상 동작하는지 확인

마일스톤 2: 클라이언트 i18n 전환 (T-06 ~ T-08)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  T-06 클라이언트 i18next 리팩토링
   ↓
  T-07 I18nProvider 수정
   ↓
  T-08 미들웨어 로케일 결정 로직

  [검증 지점] 15개 로케일 URL 라우팅 + 클라이언트 번역이 정상 동작하는지 확인

마일스톤 3: 서버 API 및 사용자 로케일 (T-09 ~ T-12)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  T-09 User 모듈 생성 ──┐
  T-10 JwtStrategy 수정 ─┤
  T-11 AuthContext 수정 ──┘
   ↓
  T-12 LanguageSelector 컴포넌트

  [검증 지점] 로그인 -> 언어 변경 -> UI 즉시 전환 플로우 확인

마일스톤 4: 부가 기능 및 도구 (T-13 ~ T-16)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  T-13 번역 키 명명 규칙 문서화
  T-14 번역 검증 스크립트
  T-15 ISO 639 언어 코드 데이터
  T-16 이메일 서비스 다국어화

  [검증 지점] 검증 스크립트 실행, 이메일 다국어 발송 확인

마일스톤 5: 통합 검증 (T-17 ~ T-18)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  T-17 빌드 검증 + 마이그레이션
  T-18 테스트 작성

  [검증 지점] 전체 빌드 통과, 모든 수용 기준 검증
```

### 3.3 파일 수정 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|----------|----------|
| `packages/shared-i18n/package.json` | 생성 | 공유 i18n 패키지 정의 |
| `packages/shared-i18n/tsconfig.json` | 생성 | TypeScript 설정 |
| `packages/shared-i18n/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `packages/shared-i18n/project.json` | 생성 | Nx 프로젝트 설정 |
| `packages/shared-i18n/src/index.ts` | 생성 | 패키지 진입점 |
| `packages/shared-i18n/src/supported-locales.ts` | 생성 | 15개 로케일 상수, 검증 함수, 앱 언어 목록 |
| `packages/shared-i18n/src/i18n-string.ts` | 생성 | I18nString 타입 및 유틸리티 함수 |
| `packages/shared-i18n/src/types.ts` | 생성 | AppLanguage 등 타입 정의 |
| `packages/shared-i18n/src/iso-languages.ts` | 생성 | ISO 639 언어 코드 데이터 (설문 UI용) |
| `apps/client/src/app/i18n/locales/en-US/translation.json` | 생성 | en -> en-US로 이동 (내용 동일) |
| `apps/client/src/app/i18n/locales/ko-KR/translation.json` | 생성 | ko -> ko-KR로 이동 (내용 동일) |
| `apps/client/src/app/i18n/locales/de-DE/translation.json` | 생성 | 독일어 번역 파일 (초기값 en-US 복사) |
| `apps/client/src/app/i18n/locales/es-ES/translation.json` | 생성 | 스페인어 번역 파일 |
| `apps/client/src/app/i18n/locales/fr-FR/translation.json` | 생성 | 프랑스어 번역 파일 |
| `apps/client/src/app/i18n/locales/hu-HU/translation.json` | 생성 | 헝가리어 번역 파일 |
| `apps/client/src/app/i18n/locales/ja-JP/translation.json` | 생성 | 일본어 번역 파일 |
| `apps/client/src/app/i18n/locales/nl-NL/translation.json` | 생성 | 네덜란드어 번역 파일 |
| `apps/client/src/app/i18n/locales/pt-BR/translation.json` | 생성 | 포르투갈어(브라질) 번역 파일 |
| `apps/client/src/app/i18n/locales/pt-PT/translation.json` | 생성 | 포르투갈어(포르투갈) 번역 파일 |
| `apps/client/src/app/i18n/locales/ro-RO/translation.json` | 생성 | 루마니아어 번역 파일 |
| `apps/client/src/app/i18n/locales/ru-RU/translation.json` | 생성 | 러시아어 번역 파일 |
| `apps/client/src/app/i18n/locales/sv-SE/translation.json` | 생성 | 스웨덴어 번역 파일 |
| `apps/client/src/app/i18n/locales/zh-Hans-CN/translation.json` | 생성 | 중국어(간체) 번역 파일 |
| `apps/client/src/app/i18n/locales/zh-Hant-TW/translation.json` | 생성 | 중국어(번체) 번역 파일 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 삭제 | en-US로 이동 |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 삭제 | ko-KR로 이동 |
| `apps/client/src/app/i18n/settings.ts` | 수정 | shared-i18n 패키지 import, 15개 로케일 |
| `apps/client/src/app/i18n/index.ts` | 수정 | ICU 플러그인 추가, escape 비활성화, 로케일 경로 변경 |
| `apps/client/src/app/i18n/client.ts` | 수정 | 동적 로드 방식 전환, ICU 플러그인, 15개 로케일 |
| `apps/client/src/middleware.ts` | 수정 | 15개 로케일 라우팅, 접두사 매칭 로직 |
| `apps/client/src/app/[lng]/layout.tsx` | 수정 | 필요 시 generateStaticParams 확인 |
| `apps/client/src/app/[lng]/i18n-provider.tsx` | 수정 | 동적 로드에 맞는 Provider 로직 |
| `apps/client/package.json` | 수정 | i18next-icu, @inquiry/shared-i18n 의존성 추가 |
| `libs/server/user/package.json` | 생성 | User 모듈 패키지 정의 |
| `libs/server/user/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/user/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `libs/server/user/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/server/user/src/index.ts` | 생성 | 패키지 진입점 |
| `libs/server/user/src/lib/user.module.ts` | 생성 | NestJS 모듈 정의 |
| `libs/server/user/src/lib/user.controller.ts` | 생성 | PATCH /api/users/me/locale 엔드포인트 |
| `libs/server/user/src/lib/user.service.ts` | 생성 | 로케일 업데이트 비즈니스 로직 |
| `libs/server/user/src/lib/dto/update-locale.dto.ts` | 생성 | 로케일 업데이트 DTO |
| `libs/server/auth/src/lib/strategies/jwt.strategy.ts` | 수정 | validate() select에 locale 추가 |
| `libs/server/email/src/lib/email.service.ts` | 수정 | locale 파라미터 추가, 다국어 이메일 템플릿 |
| `libs/server/auth/src/lib/server-auth.service.ts` | 수정 | 이메일 발송 시 locale 전달 |
| `libs/client/core/src/lib/auth-context.tsx` | 수정 | User 타입에 locale 추가 |
| `apps/server/src/app/app.module.ts` | 수정 | UserModule import 추가 |
| `tsconfig.base.json` | 수정 | @inquiry/shared-i18n, @inquiry/server-user 경로 매핑 추가 |
| `pnpm-workspace.yaml` | 확인 | packages/* 이미 포함 - 변경 불필요 |
| `scripts/check-i18n.ts` | 생성 | 번역 검증 도구 스크립트 |
| `package.json` (루트) | 수정 | `i18n:check` 스크립트 추가 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 확률 | 완화 전략 |
|--------|------|------|----------|
| 로케일 코드 형식 마이그레이션(`en` -> `en-US`)으로 기존 URL 북마크/링크 깨짐 | 높음 | 높음 | 미들웨어에서 레거시 코드(`/en/...`, `/ko/...`)를 새 코드(`/en-US/...`, `/ko-KR/...`)로 301 리다이렉트하는 호환성 레이어 추가 |
| 15개 번역 파일 전체 static import 시 클라이언트 번들 크기 증가 | 중간 | 높음 | 초기 로드 시 현재 로케일 1개만 로드하고, 나머지는 `i18next-resources-to-backend`의 동적 import 활용 |
| ICU Message Format 파싱 에러로 UI 크래시 | 중간 | 낮음 | i18next의 `parseMissingKeyHandler` 설정으로 파싱 실패 시 키 문자열 폴백. 번역 검증 도구에 ICU 구문 검증 추가 검토 |
| 클라이언트 i18next 초기화 방식 변경으로 언어 플리커 발생 | 높음 | 중간 | 현재 로케일은 서버에서 SSR 시 번역 파일을 inline으로 포함하거나, I18nProvider에서 `changeLanguage` 동기 호출 패턴 유지 |
| `accept-language` 라이브러리가 `zh-Hans-CN`, `zh-Hant-TW` 같은 비표준 BCP 47 코드를 올바르게 매칭하지 못함 | 중간 | 중간 | 커스텀 Accept-Language 파싱 로직 구현. `accept-language` 라이브러리 대신 `LOCALE_PREFIX_MAP`을 활용한 자체 매칭 |
| 이메일 서비스 다국어화 시 번역 파일이 서버(NestJS) 런타임에서 접근 불가 | 중간 | 중간 | 번역 파일을 `packages/shared-i18n` 또는 별도 경로에 복사하여 서버에서도 접근 가능하게 하거나, 이메일 전용 번역을 NestJS 내에서 관리 |
| 기존 번역 키 구조(중첩 JSON)와 명세의 flat key 컨벤션 혼동 | 낮음 | 중간 | 번역 키 명명 규칙 문서에 "코드에서는 중첩 JSON 사용, 키 경로는 점 구분자로 표현"을 명시 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 테스트 대상 | 테스트 항목 |
|------------|-----------|
| `isSupportedLocale()` | 유효한 로케일 코드 검증 통과, 유효하지 않은 코드 거부 |
| `createI18nString()` | 올바른 default 값 및 언어 키 생성 확인 |
| `isI18nString()` | I18nString 객체 판별 정확성 |
| `getI18nValue()` | 존재하는 언어 반환, 없으면 default 반환 |
| `UpdateLocaleDto` | 유효한 로케일 통과, 유효하지 않은 로케일 거부 |
| `UserService.updateLocale()` | DB 업데이트 정상, 유효하지 않은 로케일 예외 |
| 접두사 매칭 로직 | `pt` -> `pt-BR`, `de` -> `de-DE`, `zh` -> `zh-Hans-CN` 매칭 확인 |
| 번역 검증 도구 | 누락 키 정상 검출, 모든 키 존재 시 통과, 파일 누락 시 에러 보고 |

### 5.2 통합 테스트

| 테스트 대상 | 테스트 항목 |
|------------|-----------|
| `PATCH /api/users/me/locale` | 인증된 사용자가 유효한 로케일로 변경 성공 (200) |
| `PATCH /api/users/me/locale` | 유효하지 않은 로케일 거부 (400) |
| `PATCH /api/users/me/locale` | 미인증 요청 거부 (401) |
| `GET /api/auth/me` | 응답에 locale 필드 포함 확인 |
| 서버 번역 함수 | ICU Message Format 복수형 처리 정확성 |
| 이메일 서비스 | 수신자 locale에 따른 이메일 제목/내용 번역 |

### 5.3 E2E 테스트 (수동 검증)

| 시나리오 | 검증 항목 |
|---------|----------|
| 비로그인 + Accept-Language: de | `/de-DE/auth/login`으로 리다이렉트, 독일어 UI 표시 |
| 비로그인 + Accept-Language: xx (미지원) | `/en-US/auth/login`으로 리다이렉트, 영어 UI 표시 |
| 비로그인 + Accept-Language: pt | `/pt-BR/auth/login`으로 리다이렉트 (pt-PT 아닌 pt-BR) |
| 로그인 후 프로필에서 언어 변경 | UI 즉시 전환, 새로고침 후에도 유지 |
| 기존 URL (`/en/auth/login`) 접속 | `/en-US/auth/login`으로 301 리다이렉트 |
| 서버 컴포넌트 번역 | SSR 시 올바른 번역 텍스트 포함 |
| 클라이언트 컴포넌트 번역 | CSR 시 올바른 번역 텍스트, 하이드레이션 불일치 없음 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 설명 |
|------|------|
| 초기 번역 품질 | en-US, ko-KR 외 13개 언어의 번역 파일은 en-US 복사본으로 시작. 실제 번역은 별도 작업으로 진행 필요 |
| RTL 미지원 | 아랍어, 히브리어 등 RTL 언어 레이아웃 미지원 (명세 범위 외) |
| 자동 번역 미지원 | 번역 관리는 수동. 자동 번역 시스템 미제공 |
| 설문 콘텐츠 다국어 | i18nString 타입만 정의. 실제 설문 에디터 다국어 UI는 Enterprise 기능으로 별도 구현 필요 |
| 서버(NestJS) 번역 | NestJS 서버에서의 번역은 이메일 발송에 한정. 본격적인 API 에러 메시지 다국어화는 추후 과제 |
| 이메일 템플릿 | HTML 인라인 스타일 기반 단순 템플릿. 향후 이메일 템플릿 엔진(mjml 등) 도입 시 번역 통합 방식 재설계 필요 |

### 6.2 향후 개선 가능 사항

| 항목 | 설명 |
|------|------|
| 번역 관리 도구 | Crowdin, Lokalise 등 외부 번역 관리 플랫폼 연동 |
| 번역 품질 검증 | ICU 구문 유효성, 변수 일관성 등을 검증하는 고급 검증 도구 |
| 네임스페이스 분할 | 번역 파일이 커지면 모듈별 네임스페이스(`auth.json`, `dashboard.json` 등)로 분할하여 번들 최적화 |
| RTL 지원 | 아랍어 등 RTL 언어 추가 시 레이아웃 미러링 구현 |
| API 에러 메시지 다국어화 | NestJS 서버의 에러 응답 메시지도 요청자 로케일에 맞게 번역 |
| 언어 자동 감지 정확도 향상 | GeoIP 기반 국가 감지로 Accept-Language 보완 |

---

## 7. i18n 고려사항

### 7.1 번역 키 추가/수정 목록

이 기능 자체는 i18n 인프라를 구축하는 것이므로, 기존 번역 키의 구조적 변경과 새 번역 키 추가가 함께 발생한다.

**기존 번역 키 이동 (구조 변경 없음, 경로만 변경)**

- `apps/client/src/app/i18n/locales/en/translation.json` -> `en-US/translation.json`
- `apps/client/src/app/i18n/locales/ko/translation.json` -> `ko-KR/translation.json`

**신규 번역 키 (언어 선택 UI 관련)**

| 키 | en-US 값 | 설명 |
|----|---------|------|
| `settings.language.title` | `Language` | 언어 설정 섹션 제목 |
| `settings.language.description` | `Choose your preferred language` | 언어 설정 설명 |
| `settings.language.updated` | `Language updated successfully` | 언어 변경 성공 메시지 |
| `settings.language.error` | `Failed to update language` | 언어 변경 실패 메시지 |

### 7.2 번역 파일 관리 규칙

- 모든 새 번역 키는 15개 로케일 파일 전체에 추가해야 한다
- en-US 파일이 기준 파일로, 모든 키가 100% 존재해야 한다
- `scripts/check-i18n.ts` 실행으로 누락 키를 검증한다
- 키 형식: `{모듈}.{하위경로}.{설명_snake_case}` (소문자, 점 구분)
- JSON 파일 구조: 중첩 객체 사용 (기존 패턴 유지)
