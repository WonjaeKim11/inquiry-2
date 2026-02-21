# Auth 컴포넌트 다국어(i18n) 적용 완료

## 개요
기존에 하드코딩 되어있던 `@inquiry/client-auth` 패키지 내부의 한글 문자열들을 `react-i18next`를 사용하여 모두 i18n 키로 대체하였습니다. 이를 통해 로그인, 회원가입, 비밀번호 찾기 등 인증 관련 폼에서 다국어 지원이 가능해졌습니다.

## 수정된 파일 목록
- **언어 리소스 (translation.json)**
  - `apps/client/src/app/i18n/locales/ko/translation.json`
  - `apps/client/src/app/i18n/locales/en/translation.json`

- **Auth 라이브러리 컴포넌트**
  - `libs/client/auth/src/lib/auth-callback.tsx`
  - `libs/client/auth/src/lib/login-form.tsx`
  - `libs/client/auth/src/lib/signup-form.tsx`
  - `libs/client/auth/src/lib/forgot-password-form.tsx`
  - `libs/client/auth/src/lib/reset-password-form.tsx`
  - `libs/client/auth/src/lib/social-login-buttons.tsx`

*(참고: `verify-email.tsx` 및 `logout-page.tsx`는 이미 다국어 처리가 되어있었음)*

## 주요 작업 내역
1. **JSON 파일 번역 키 분리**: `ko`와 `en` 각각의 `translation.json` 파일에 컴포넌트 구조대로 `auth.login_form`, `auth.signup_form`, `auth.forgot_password`, `auth.reset_password`, `auth.callback` 객체를 추가하여 번역 텍스트를 매핑했습니다.
2. **`useTranslation` 훅 적용**: 화면에 보이는 제목, 버튼 텍스트, placeholder 문자열 등을 모두 `t('경로.키')` 꼴로 대체했습니다.
3. **Zod Validator 에러 메시지 번역**: 검증 목적의 Zod 스키마들(`loginSchema`, `signupSchema`, `forgotPasswordSchema`, `resetPasswordSchema`)에 정의된 에러 메시지들 또한 i18n 키로 변경하고, `safeParse` 후 반환된 에러 키를 UI에서 `t()` 훅으로 감싸 출력함으로써 오류 메시지에 대해서도 다국어가 매끄럽게 동작하도록 구성했습니다.
