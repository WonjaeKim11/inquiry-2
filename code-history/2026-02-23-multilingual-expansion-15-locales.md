# FSD-030 다국어 확장 (프론트엔드 파트)

## Overview
기존 2개 언어(en, ko)만 지원하던 i18n 시스템을 15개 언어로 확장하였다.
공유 패키지 `@inquiry/shared-i18n`을 생성하여 로케일 설정을 중앙에서 관리하고,
번역 파일 로딩 방식을 정적 임포트에서 동적 로딩으로 전환하여 번들 크기를 최적화하였다.
또한 언어 선택 UI 컴포넌트(LanguageSelector)를 추가하고, User 타입에 locale 필드를 추가하였다.

## Changed Files

### 신규 생성
- `packages/shared-i18n/package.json` - 공유 i18n 패키지 메타데이터
- `packages/shared-i18n/tsconfig.json` - TypeScript 프로젝트 참조 설정
- `packages/shared-i18n/tsconfig.lib.json` - 라이브러리 빌드 설정
- `packages/shared-i18n/src/index.ts` - 패키지 진입점 (모든 export 집합)
- `packages/shared-i18n/src/types.ts` - SupportedLocale 타입, LocaleConfig 인터페이스 정의
- `packages/shared-i18n/src/supported-locales.ts` - 15개 로케일 목록, DEFAULT_LOCALE, 유효성 검사 함수
- `packages/shared-i18n/src/i18n-string.ts` - TI18nString 타입, 다국어 문자열 헬퍼 함수
- `libs/client/ui/src/components/language-selector.tsx` - 언어 선택 드롭다운 컴포넌트
- `apps/client/src/app/i18n/locales/{de-DE,es-ES,fr-FR,hu-HU,ja-JP,nl-NL,pt-BR,pt-PT,ro-RO,ru-RU,sv-SE,zh-Hans-CN,zh-Hant-TW}/translation.json` - 13개 신규 로케일 번역 파일 (en-US 복사)

### 수정
- `apps/client/src/app/i18n/settings.ts` - `@inquiry/shared-i18n`에서 로케일 설정 가져오도록 변경
- `apps/client/src/app/i18n/client.ts` - 정적 임포트 → resourcesToBackend 동적 로딩으로 전환
- `apps/client/src/app/[lng]/i18n-provider.tsx` - 주석 업데이트 (동적 로딩 반영)
- `libs/client/core/src/lib/auth-context.tsx` - User 인터페이스에 locale 필드 추가
- `libs/client/ui/src/index.ts` - LanguageSelector export 추가
- `libs/client/ui/package.json` - `@inquiry/shared-i18n`, `i18next`, `react-i18next` 의존성 추가
- `libs/client/ui/tsconfig.lib.json` - shared-i18n 프로젝트 참조 추가
- `apps/client/package.json` - `@inquiry/shared-i18n` 의존성 추가
- `apps/client/tsconfig.json` - shared-i18n 프로젝트 참조 추가
- `tsconfig.json` (루트) - shared-i18n 프로젝트 참조 추가

### 이동 (rename)
- `apps/client/src/app/i18n/locales/en/` -> `apps/client/src/app/i18n/locales/en-US/` - 영문 번역 디렉토리 (BCP 47 형식)
- `apps/client/src/app/i18n/locales/ko/` -> `apps/client/src/app/i18n/locales/ko-KR/` - 한국어 번역 디렉토리 (BCP 47 형식)

## Major Changes

### 1. `@inquiry/shared-i18n` 공유 패키지
15개 로케일 설정을 중앙에서 관리하는 패키지를 생성하였다.
클라이언트/서버 양쪽에서 동일한 로케일 목록과 유틸리티를 사용할 수 있다.

```typescript
// supported-locales.ts
export const SUPPORTED_LOCALES: readonly LocaleConfig[] = [
  { code: 'en-US', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어', dir: 'ltr' },
  // ... 13개 추가 로케일
] as const;

export const LOCALE_CODES = SUPPORTED_LOCALES.map(l => l.code);
export const DEFAULT_LOCALE = 'en-US';
```

### 2. 번역 파일 동적 로딩 전환
기존에는 `ko`, `en` 번역 파일을 정적 임포트했으나, 15개 언어로 확장하면서
`i18next-resources-to-backend`를 사용한 동적 임포트로 전환하였다.
사용자가 선택한 언어의 번역 파일만 로드되어 번들 크기가 최적화된다.

```typescript
// client.ts - 동적 번역 로드
i18next
  .use(initReactI18next)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`./locales/${language}/${namespace}.json`)
    )
  )
  .init({ ... });
```

### 3. 로케일 코드 BCP 47 형식 마이그레이션
`en` -> `en-US`, `ko` -> `ko-KR`로 변경하여 국제 표준(BCP 47)을 준수한다.
URL 경로도 `/en/dashboard` -> `/en-US/dashboard` 형식으로 변경된다.

### 4. LanguageSelector 컴포넌트
15개 언어를 원어명으로 표시하는 드롭다운으로, 선택 시 i18next 언어 변경 + 쿠키 저장을 수행한다.

### 5. User 타입 locale 필드 추가
서버에서 사용자 선호 언어를 저장/반환할 수 있도록 User 인터페이스에 `locale: string` 필드를 추가하였다.

## How to use it

### LanguageSelector 컴포넌트 사용
```tsx
import { LanguageSelector } from '@inquiry/client-ui';

function Header() {
  return (
    <nav>
      <LanguageSelector
        className="rounded border px-2 py-1"
        onLocaleChange={(locale) => {
          // 필요 시 서버에 locale 저장 API 호출
          console.log('Language changed:', locale);
        }}
      />
    </nav>
  );
}
```

### 공유 i18n 유틸리티 사용
```typescript
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  isValidLocale,
  getLocaleConfig,
  getLocalizedString,
} from '@inquiry/shared-i18n';

// 로케일 유효성 검사
isValidLocale('ko-KR'); // true
isValidLocale('xx-XX'); // false

// 로케일 설정 조회
const config = getLocaleConfig('ko-KR');
// { code: 'ko-KR', name: 'Korean', nativeName: '한국어', dir: 'ltr' }

// 다국어 문자열에서 특정 로케일 값 가져오기
const title = { 'en-US': 'Hello', 'ko-KR': '안녕하세요' };
getLocalizedString(title, 'ko-KR'); // '안녕하세요'
getLocalizedString(title, 'ja-JP'); // 'Hello' (fallback to en-US)
```

## Related Components/Modules
- `apps/client/src/middleware.ts` - 15개 언어에 대한 라우팅을 자동 처리 (settings.ts의 languages 배열 참조)
- `apps/client/src/app/[lng]/layout.tsx` - 동적 라우트 파라미터로 언어별 페이지 생성
- `apps/client/src/app/[lng]/i18n-provider.tsx` - 클라이언트 측 i18next 언어 동기화
- `apps/client/src/app/i18n/index.ts` - 서버 측 번역 로딩 (동적 임포트 경로 자동 호환)
- 서버 측 User 모델 (Prisma) - locale 필드 추가 필요 (별도 서버 작업)

## Precautions
- 13개 신규 로케일의 번역 파일은 현재 en-US 내용이 복사된 상태이므로, 실제 번역 작업이 필요하다.
- 로케일 코드가 `en` -> `en-US` 형식으로 변경되었으므로, 기존 URL 북마크나 캐시된 쿠키가 있는 사용자는 최초 방문 시 기본 언어로 리다이렉트될 수 있다.
- 서버 측 Prisma User 모델에도 `locale` 컬럼을 추가하는 마이그레이션이 필요하다 (서버 파트에서 별도 처리).
- `accept-language` 라이브러리의 BCP 47 코드(예: `zh-Hans-CN`) 매칭 동작을 실제 환경에서 테스트해야 한다.
