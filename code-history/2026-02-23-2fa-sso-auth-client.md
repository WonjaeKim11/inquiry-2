# FSD-002: 2FA/SSO Authentication Client Implementation

## Overview
Inquiry SaaS 플랫폼에 2단계 인증(2FA, TOTP 기반) 및 SSO(Azure AD, OpenID Connect) 클라이언트 사이드 UI를 구현하였다. 서버에 이미 구현된 2FA/SSO API 엔드포인트와 통합하여, 사용자가 로그인 시 2FA 코드를 입력하고, 보안 설정 페이지에서 2FA를 활성화/비활성화할 수 있도록 한다. SSO 버튼은 환경변수를 통해 조건부로 표시된다.

## Changed Files

### Modified Files
- **`libs/client/core/src/lib/auth-context.tsx`**: `login` 함수 시그니처를 `(email, password, totpCode?, backupCode?)` 형태로 확장하고, `LoginResult` 타입을 추가하여 2FA 필요 시 throw 대신 결과 객체를 반환하도록 변경
- **`libs/client/core/src/index.ts`**: `LoginResult` 타입 export 추가
- **`libs/client/auth/src/lib/login-form.tsx`**: `step` 상태(`'credentials' | 'two-factor'`)를 추가하여 2FA 필요 시 TOTP 코드/백업 코드 입력 UI로 전환
- **`libs/client/auth/src/lib/social-login-buttons.tsx`**: Azure AD, OpenID Connect SSO 버튼을 환경변수 기반으로 조건부 추가
- **`libs/client/auth/src/index.ts`**: `TwoFactorSetup` 컴포넌트 export 추가
- **`apps/client/src/app/i18n/locales/en-US/translation.json`**: 2FA, SSO, 보안 설정 관련 영문 번역 키 추가
- **`apps/client/src/app/i18n/locales/ko-KR/translation.json`**: 2FA, SSO, 보안 설정 관련 한국어 번역 키 추가

### Created Files
- **`libs/client/auth/src/lib/two-factor-setup.tsx`**: 2FA 설정 컴포넌트 (상태 조회, QR 코드 표시, 백업 코드 표시, 활성화/비활성화)
- **`apps/client/src/app/[lng]/settings/security/page.tsx`**: 보안 설정 페이지 라우트 (인증 필요, TwoFactorSetup 컴포넌트 렌더링)

## Major Changes

### 1. AuthContext login 함수 2FA 지원
기존 `login(email, password)` 시그니처를 `login(email, password, totpCode?, backupCode?)`로 확장했다. 2FA가 필요한 사용자가 코드 없이 로그인하면, 서버가 `{ errorCode: "second-factor-required" }` 에러를 반환한다. 이를 감지하여 throw 대신 `{ success: false, requiresTwoFactor: true }` 객체를 반환함으로써 LoginForm이 UI 전환을 처리할 수 있다.

```typescript
export type LoginResult =
  | { success: true }
  | { success: false; requiresTwoFactor: true };

// login 함수 내부
if (error.errorCode === 'second-factor-required') {
  return { success: false, requiresTwoFactor: true };
}
```

### 2. LoginForm 2단계 흐름
LoginForm에 `step` 상태를 추가하여 두 단계로 분리했다:
- **credentials 단계**: 기존 이메일+비밀번호 폼
- **two-factor 단계**: TOTP 6자리 코드 입력 또는 백업 코드 입력 (토글 전환 가능)

credentials 단계에서 login 결과가 `requiresTwoFactor: true`이면 two-factor 단계로 전환한다. two-factor 단계에서는 이메일/비밀번호와 함께 totpCode 또는 backupCode를 서버에 전송한다.

### 3. TwoFactorSetup 컴포넌트
4단계 상태 머신으로 구현:
- `loading`: 2FA 상태 조회 중
- `disabled`: 2FA 비활성 상태 (활성화 버튼 표시)
- `enabled`: 2FA 활성 상태 (비활성화 버튼 표시)
- `setup`: QR 코드 + 시크릿 키 + 백업 코드 표시 (활성화 직후)

QR 코드는 Google Charts API를 사용하여 외부 패키지 없이 img 태그로 렌더링한다:
```
https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl={encodedUri}
```

### 4. SSO 버튼 확장
`SocialLoginButtons` 컴포넌트에 Azure AD와 OpenID Connect 버튼을 추가했다. 환경변수 `NEXT_PUBLIC_AZURE_AD_ENABLED=true`, `NEXT_PUBLIC_OPENID_ENABLED=true`에 의해 조건부로 렌더링되며, 클릭 시 서버의 SSO 엔드포인트로 리다이렉트한다.

## How to Use

### 로그인 시 2FA 흐름
1. 사용자가 이메일/비밀번호를 입력하고 로그인 버튼 클릭
2. 2FA가 활성화된 계정이면 자동으로 TOTP 코드 입력 화면으로 전환
3. 인증기 앱(Google Authenticator 등)의 6자리 코드 입력 후 "Verify" 클릭
4. 또는 "Use a backup code instead"를 클릭하여 백업 코드로 인증

### 2FA 설정 페이지 접근
- URL: `/{lng}/settings/security` (예: `/en-US/settings/security`)
- 로그인 필수, 미인증 시 자동으로 로그인 페이지로 리다이렉트

### 2FA 활성화
1. 보안 설정 페이지에서 "Enable 2FA" 버튼 클릭
2. QR 코드를 인증기 앱으로 스캔 (또는 시크릿 키 수동 입력)
3. 백업 코드를 안전한 곳에 저장
4. "Done" 버튼 클릭

### SSO 활성화
`.env` 파일에 다음 환경변수를 추가:
```
NEXT_PUBLIC_AZURE_AD_ENABLED=true
NEXT_PUBLIC_OPENID_ENABLED=true
```

## Related Components/Modules
- **서버 API**: `POST /api/auth/login` (2FA 코드 포함), `POST/GET /api/auth/2fa/*` 엔드포인트 (이미 구현됨)
- **AuthContext** (`libs/client/core`): 인증 상태 관리 및 login 함수 제공
- **LoginForm** (`libs/client/auth`): 로그인 UI (2FA 흐름 포함)
- **SocialLoginButtons** (`libs/client/auth`): 소셜/SSO 로그인 버튼
- **i18n**: `apps/client/src/app/i18n/locales/` 번역 파일

## Precautions
- Google Charts QR API는 Google이 서비스를 중단할 경우 대안이 필요할 수 있다. 향후 `qrcode` npm 패키지로 클라이언트 사이드 QR 생성으로 전환을 고려할 수 있다.
- Azure AD, OpenID Connect 서버 전략은 골격만 구현되어 있으므로, 실제 SSO 연동을 위해서는 서버 사이드 구현이 완료되어야 한다.
- 2FA 비활성화 시 `window.confirm` 다이얼로그를 사용하는데, 향후 커스텀 확인 다이얼로그로 교체하는 것이 UX 개선에 좋다.
- `LoginResult` 타입이 core 라이브러리에서 export되므로, 다른 라이브러리에서도 login 결과를 타입 안전하게 사용할 수 있다.
