# i18n 페이지 새로고침 시 언어 플리커 수정

## Overview
페이지 새로고침 시 영어 텍스트가 잠깐 보였다가 한국어로 전환되는 플리커 현상이 발생하고 있었다. 원인은 `client.ts`에서 i18next를 `lng: undefined`로 초기화하여 `LanguageDetector`가 비동기로 언어를 감지하기 전까지 fallback인 영어가 표시되었기 때문이다. 또한 번역 리소스도 `resourcesToBackend`를 통해 비동기 dynamic import로 로딩되어 추가 지연이 발생했다.

## Changed Files
- `apps/client/src/app/i18n/client.ts` — 비동기 언어 감지/리소스 로딩을 동기 초기화로 전면 교체
- `apps/client/src/app/[lng]/i18n-provider.tsx` — `I18nextProvider`로 하위 컴포넌트에 i18next 인스턴스 명시적 제공 (신규 생성)
- `apps/client/src/app/[lng]/layout.tsx` — `I18nProvider` import 추가 및 래핑
- `apps/client/package.json` — 미사용 의존성 제거 (`i18next-browser-languagedetector`, `react-cookie`)
- `package.json` — 미사용 의존성 제거 (`i18next-browser-languagedetector`, `i18next-http-backend`)
- `pnpm-lock.yaml` — lockfile 동기화

## Major Changes

### 1. client.ts 동기 초기화 전환
기존에는 `LanguageDetector` 플러그인과 `resourcesToBackend`를 사용하여 언어와 번역 리소스를 비동기로 로딩했다. 이를 다음과 같이 변경:

- `document.documentElement.lang`에서 서버가 렌더링한 `<html lang="ko">`를 동기적으로 읽어 초기 언어 설정
- 번역 JSON을 static import로 번들에 직접 포함 (ko + en 합쳐 ~8KB로 무시 가능한 크기)
- 미사용 커스텀 `useTranslation` 함수 제거 (모든 컴포넌트가 이미 `react-i18next`의 `useTranslation`을 직접 사용 중)

```typescript
// 서버가 렌더링한 <html lang="..."> 속성에서 동기적으로 언어 감지
function getInitialLng(): string | undefined {
  if (runsOnServerSide) return undefined;
  const htmlLang = document.documentElement.lang;
  if (htmlLang && languages.includes(htmlLang)) return htmlLang;
  return undefined;
}

i18next.use(initReactI18next).init({
  ...getOptions(),
  lng: getInitialLng(),
  resources: {
    ko: { translation: koTranslation },
    en: { translation: enTranslation },
  },
});
```

### 2. I18nProvider에서 동기적 언어 설정
`react-i18next`의 `I18nextProvider`를 사용하여 i18next 인스턴스를 React 트리에 명시적으로 제공한다. 핵심은 **렌더 본문에서 `i18next.changeLanguage(lng)`를 동기적으로 호출**하는 것이다. `useEffect`는 SSR/SSG에서 실행되지 않으므로, 렌더 본문에서 호출해야 프리렌더링된 HTML에 올바른 언어가 포함된다.

```typescript
export function I18nProvider({ children, lng }: I18nProviderProps) {
  // SSR/SSG에서도 올바른 언어로 렌더링하기 위해 동기적으로 언어 설정
  if (i18next.resolvedLanguage !== lng) {
    i18next.changeLanguage(lng);
  }

  // 클라이언트 사이드 라우트 변경 시 언어 동기화
  useEffect(() => {
    if (!lng || i18next.resolvedLanguage === lng) return;
    i18next.changeLanguage(lng);
  }, [lng]);

  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
}
```

## How to use it
- `/ko/auth/login` 하드 리프레시 시 한국어가 즉시 표시됨 (영어 플리커 없음)
- `/en/auth/login` 하드 리프레시 시 영어가 즉시 표시됨
- 기존 컴포넌트에서 `react-i18next`의 `useTranslation()`을 그대로 사용하면 됨

## Related Components/Modules
- `apps/client/src/app/i18n/index.ts` — 서버 사이드 i18n으로 `resourcesToBackend` 계속 사용 (변경 없음)
- `apps/client/src/app/i18n/settings.ts` — 공유 설정 파일 (변경 없음)
- `apps/client/src/middleware.ts` — 언어 감지/리다이렉트 로직 (변경 없음)
- `libs/client/auth/src/lib/*.tsx` — `react-i18next`의 `useTranslation` 직접 사용 중 (변경 없음)

## Precautions
- 번역 JSON을 static import로 번들에 포함하므로 지원 언어나 번역 키가 크게 늘어나면 번들 크기 영향을 재검토할 것
- 새 언어를 추가할 때는 `client.ts`의 `resources` 객체에도 해당 언어의 static import를 추가해야 함
