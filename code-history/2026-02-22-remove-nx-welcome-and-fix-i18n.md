# Nx Welcome 페이지 제거 및 i18n 정리

## Overview
Nx 초기화 시 자동 생성된 Welcome 보일러플레이트(페이지, CSS, 번역 키)가 그대로 남아있었고, ko 번역 파일에 영어가 섞여있는 상태였다.
루트 페이지를 대시보드(미인증 시 로그인 리다이렉트) 스켈레톤으로 교체하고, 불필요한 Nx 잔재를 정리하여 프로젝트를 실사용 상태로 전환한다.

## Changed Files
- `apps/client/src/app/[lng]/page.tsx` — Nx Welcome 페이지(472줄) → 대시보드 스켈레톤 페이지로 전체 교체
- `apps/client/src/app/global.css` — Nx Welcome 전용 CSS(52~413줄) 삭제, Tailwind 디렉티브 + HTML/body 리셋만 유지
- `apps/client/src/app/i18n/locales/ko/translation.json` — 영어로 남아있던 11개 키 한국어 번역, `page` 섹션 삭제, `dashboard` 키 추가
- `apps/client/src/app/i18n/locales/en/translation.json` — `page` 섹션 삭제, `dashboard` 키 추가

## Major Changes

### 1. 루트 페이지 교체 (`page.tsx`)
- `'use client'` 클라이언트 컴포넌트로 전환
- `useAuth()` 훅으로 인증 상태 확인
- 미인증 시 `useEffect`에서 `router.replace(/{lng}/auth/login)` 리다이렉트
- 인증 시 대시보드 플레이스홀더 UI 렌더링
- `react-i18next`의 `useTranslation()` 사용 (기존 라이브러리 컴포넌트와 동일 패턴)

```tsx
// 인증 확인 → 미인증 시 리다이렉트
useEffect(() => {
  if (!loading && !user) {
    router.replace(`/${lng}/auth/login`);
  }
}, [loading, user, router, lng]);
```

### 2. Nx 전용 CSS 삭제 (`global.css`)
- 414줄 → 51줄로 축소
- 삭제된 스타일: `.shadow`, `.rounded`, `.wrapper`, `.container`, `#welcome`, `#hero`, `#middle-content`, `#learning-materials`, `.list-item-link`, `.button-pill`, `#nx-console*`, `#nx-cloud`, `#commands`, `details/summary`, `#love`, 관련 미디어쿼리
- 유지된 스타일: Tailwind 디렉티브, HTML/body/typography 리셋, pre/svg 기본 스타일

### 3. ko 번역 한국어화
총 11개 키 번역:
- `auth.login_form.title`: "Login to your account" → "계정에 로그인"
- `auth.login_form.submit`: "Login with Email" → "이메일로 로그인"
- `auth.login_form.new_user`: "New to Inquiry?" → "Inquiry가 처음이신가요?"
- `auth.login_form.create_account`: "Create an account" → "계정 만들기"
- `auth.signup_form.title`: "Create your account" → "계정 만들기"
- `auth.signup_form.name_placeholder`: "Full Name" → "이름"
- `auth.signup_form.submit`: "Sign up with Email" → "이메일로 가입"
- `auth.signup_form.already_have_account`: "Already have an account?" → "이미 계정이 있으신가요?"
- `auth.signup_form.login`: "Login" → "로그인"
- `auth.social.google`: "Continue with Google" → "Google로 계속하기"
- `auth.social.github`: "Continue with GitHub" → "GitHub로 계속하기"

### 4. 번역 키 정리
- 양쪽 번역 파일(ko, en)에서 `page` 섹션 전체 삭제 (Nx Welcome 전용 17개 키)
- 새 `dashboard` 섹션 추가: `title`, `placeholder`

## How to use it
1. `pnpm dev` 또는 `nx dev @inquiry/client` 실행
2. `localhost:4200` 접속 → 미인증 시 자동으로 로그인 페이지(`/{lng}/auth/login`)로 리다이렉트
3. 로그인 후 `/ko` 또는 `/en` 접속 → "대시보드" / "Dashboard" 플레이스홀더 표시
4. 로그인/회원가입 폼에서 한국어 번역 정상 표시 확인

## Related Components/Modules
- `@inquiry/client-core` (`libs/client/core/src/lib/auth-context.tsx`) — `useAuth` 훅 제공
- `@inquiry/client-auth` — 로그인/회원가입 폼 컴포넌트 (번역 키 참조)
- `apps/client/src/app/i18n/client.ts` — 클라이언트 사이드 i18n 초기화
- `apps/client/src/app/[lng]/layout.tsx` — `AuthProvider` 래핑

## Precautions
- 루트 페이지는 클라이언트 컴포넌트(`'use client'`)이므로 빌드 시 정적 프리렌더링됨. i18n은 `react-i18next`의 `useTranslation()`을 직접 사용 (커스텀 훅의 `useCookies` 의존성 회피)
- 대시보드 페이지는 플레이스홀더 상태이며, 실제 대시보드 기능은 추후 구현 필요
- `apps/client/src/app/[lng]/login/page.tsx`, `signup/page.tsx`는 의도된 호환 라우트로 유지됨
