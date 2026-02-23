# FSD-001 회원가입/로그인/세션 Gap 보정 구현

## Overview
FSD-001 명세서의 기능 요구사항 대비 현재 구현에 존재하는 6개의 Gap을 보정하는 작업이다.
서버 측에서는 Brevo 호출 시점 수정과 JWT payload 확장, 클라이언트 측에서는 LoginForm 비밀번호 찾기 링크, Turnstile CAPTCHA 위젯 연동, inviteToken/userLocale 전달, auth-context 확장을 수행했다.

## Changed Files

### 서버 사이드
- `libs/server/auth/src/lib/server-auth.service.ts` — signup()에서 Brevo createContact 호출 제거, generateTokens()에서 JWT payload에 isActive 필드 추가
- `libs/server/auth/src/lib/strategies/jwt.strategy.ts` — validate() 반환 객체에 isActive 필드 추가

### 클라이언트 사이드
- `libs/client/auth/src/lib/login-form.tsx` — 비밀번호 필드 아래에 "비밀번호를 잊으셨나요?" 링크 추가
- `libs/client/auth/src/lib/signup-form.tsx` — Turnstile CAPTCHA 위젯 연동, URL query string에서 inviteToken 추출, i18n locale을 userLocale로 전달
- `libs/client/core/src/lib/auth-context.tsx` — User 타입에 isActive 추가, SignupOptions 인터페이스 정의, signup 함수에 options 파라미터 추가

### i18n
- `apps/client/src/app/i18n/locales/en-US/translation.json` — forgot_password, captcha_required, captcha_loading, captcha_error 키 추가
- `apps/client/src/app/i18n/locales/ko-KR/translation.json` — 동일 키의 한국어 번역 추가

### 패키지
- `package.json` — `@marsidev/react-turnstile` 의존성 추가

## Major Changes

### 1. Brevo 호출 시점 수정
명세서에 따르면 Brevo createContact는 이메일 검증 완료 시에만 호출되어야 한다. 기존에는 signup()에서도 호출하고 있었으나, 이를 제거하여 verifyEmail() 성공 시에만 호출되도록 수정했다.

```typescript
// server-auth.service.ts - signup() 내 Brevo 호출 제거
// NOTE: Brevo createContact는 이메일 검증 완료(verifyEmail) 시에만 호출한다.
```

### 2. JWT payload에 isActive 포함
generateTokens()에서 DB 조회를 통해 사용자의 isActive 상태를 가져와 JWT payload에 포함시킨다. JwtStrategy의 validate()에서도 isActive를 반환 객체에 추가하여 /auth/me 응답에 포함된다.

```typescript
// generateTokens에서 isActive 조회 후 payload에 포함
const user = await this.prisma.user.findUnique({
  where: { id: userId },
  select: { isActive: true },
});
const payload = { sub: userId, email, isActive: user?.isActive ?? true };
```

### 3. Turnstile CAPTCHA 위젯 연동
`@marsidev/react-turnstile` 패키지를 사용하여 SignupForm에 Cloudflare Turnstile 위젯을 추가했다. NEXT_PUBLIC_TURNSTILE_SITE_KEY 환경변수가 미설정이면 위젯이 표시되지 않는 graceful degradation을 구현했다.

### 4. inviteToken/userLocale 전달
SignupForm에서 URL query string의 `inviteToken` 파라미터를 추출하고, 현재 i18n locale을 `userLocale`로 서버에 전달한다. auth-context의 signup 함수는 SignupOptions 객체를 통해 이 값들을 받는다.

## How to use it

### Turnstile CAPTCHA 활성화
`.env` 파일에 다음 환경변수를 설정:
```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key_here
```

### 초대 기반 회원가입
초대 링크를 통해 회원가입 시 URL에 inviteToken이 포함됨:
```
/auth/signup?inviteToken=abc123
```

### /auth/me 응답에서 isActive 확인
```json
{
  "id": "...",
  "email": "...",
  "name": "...",
  "isActive": true,
  "locale": "ko-KR"
}
```

## Related Components/Modules
- `libs/server/auth/src/lib/services/turnstile.service.ts` — 서버 사이드 Turnstile 토큰 검증 (기존 구현, 변경 없음)
- `libs/server/auth/src/lib/services/brevo.service.ts` — Brevo 고객 관리 서비스 (호출 시점만 변경)
- `libs/server/auth/src/lib/dto/signup.dto.ts` — SignupDto에 inviteToken, userLocale, turnstileToken이 이미 optional로 정의됨 (변경 없음)
- `packages/db/prisma/schema.prisma` — User 모델의 isActive 필드 (스키마 변경 없음)

## Precautions
- Turnstile CAPTCHA는 NEXT_PUBLIC_TURNSTILE_SITE_KEY 환경변수 미설정 시 위젯이 표시되지 않으며, 서버의 TurnstileService도 토큰이 없으면 graceful하게 통과시킨다.
- JWT payload에 isActive를 추가했으므로, 기존에 발급된 토큰에는 isActive 필드가 없을 수 있다. JwtStrategy에서는 항상 DB에서 최신 isActive를 조회하므로 보안상 문제는 없다.
- ResetPasswordForm의 실시간 비밀번호 유효성 피드백 추가는 이번 작업에서 스킵했다.
