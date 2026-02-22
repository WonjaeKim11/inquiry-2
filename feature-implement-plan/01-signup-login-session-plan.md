# 기능 구현 계획: 회원가입 / 로그인 / 세션 관리 (FSD-001)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 구현 상태 | GAP 분석 |
|---------|--------|----------|----------|
| FN-001 | 비밀번호 유효성 검사 | 완료 | 서버 DTO(`PasswordValidationDto`) + 클라이언트 zod 스키마 모두 구현됨 |
| FN-002 | 사용자 이름 유효성 검사 | 완료 | `SignupDto`에 유니코드, trim, 1자 이상 규칙 적용됨 |
| FN-003 | 이메일 유효성 검사 | 완료 | DTO에 `@IsEmail`, `@MaxLength(255)`, 소문자 Transform 적용됨 |
| FN-004 | 회원가입 | 대부분 완료 | GAP 존재 (아래 상세) |
| FN-005 | 로그인 (Credentials) | 대부분 완료 | GAP 존재 (아래 상세) |
| FN-006 | 이메일 토큰 검증 | 완료 | Token Provider 구현됨 |
| FN-007 | 비밀번호 재설정 | 완료 | forgot-password + reset-password 모두 구현됨 |
| FN-008 | JWT 세션 관리 | 완료 | Access/Refresh Token, rotation, isActive 검증 구현됨 |
| FN-009 | 인증 페이지 라우팅 | 대부분 완료 | GAP 존재 (아래 상세) |

### 1.2 비기능 요구사항

| NFR | 설명 | 구현 상태 |
|-----|------|----------|
| NFR-001 | IP 기반 Rate Limiting | 완료 - 4종 데코레이터 구현(`@SignupRateLimit`, `@LoginRateLimit`, `@EmailVerifyRateLimit`, `@PasswordResetRateLimit`) |
| NFR-002 | Timing Attack 방지 | 완료 - `CONTROL_HASH` + `onModuleInit` 구현 |
| NFR-003 | bcrypt DoS 방지 | 완료 - 128자 사전 검증 + DTO 제한 |
| NFR-004 | Audit Logging | 완료 - signup, login, email-verified, password reset 이벤트 기록 |

### 1.3 명세서의 모호성과 해석

| 항목 | 모호한 부분 | 해석/결정 |
|------|-----------|----------|
| Brevo 연동 시점 | 명세서: "이메일 검증 완료 시" Brevo 고객 생성 / 현재 코드: signup에서도 `createContact` 호출 | 명세서 기준으로 수정 - signup 시 Brevo 호출을 제거하고, `verifyEmail` 성공 시에만 호출하도록 변경 |
| Mailing List 구독 | 명세서 FN-004 단계 12에서 `securityNewsletterSubscription`, `productNewsletterSubscription` 처리 언급 | 현재 `SignupDto`에 해당 필드 없음. Cloud 환경 전용 기능으로 판단하여 선택적 구현 (Nice-to-have) |
| `isCloud` 필드 | 명세서에 `isCloud` 입력 필드 정의 | 현재 `SignupDto`에 없음. 환경변수로 서버 사이드에서 결정하는 것이 적절. DTO에 추가하지 않음 |
| Next-Auth 4.24.12 vs 현재 구조 | 명세서는 Next-Auth 기반 / 현재 구현은 NestJS Passport + 커스텀 JWT | 현재 아키텍처가 더 유연하고 이미 완성도가 높으므로 유지. 명세서의 의도(세션 관리, 콜백 패턴)는 이미 달성됨 |
| Team Membership | 명세서 FN-004 단계 9에서 "Team Membership 생성" 언급 | 현재 DB 스키마에 Team 모델이 없음. FSD-003(조직 관리) 또는 FSD-004(멤버 초대) 범위로 이관. 본 계획에서는 Organization Membership만 처리 |

### 1.4 암묵적 요구사항

| 항목 | 설명 | 현재 상태 |
|------|------|----------|
| 로그인 폼에 "비밀번호 찾기" 링크 | 명세서 FN-005 UI 요구사항에 명시 | **미구현** - `login-form.tsx`에 forgot-password 링크 없음 |
| 비밀번호 재설정 폼 실시간 유효성 피드백 | 명세서 FN-007 UI 요구사항에 명시 | **미구현** - `reset-password-form.tsx`에 실시간 피드백 없음 |
| Turnstile CAPTCHA 위젯 (클라이언트) | 명세서 FN-004 UI 요구사항에 명시 | **미구현** - 서버 검증은 있으나 클라이언트 위젯 연동 없음 |
| signup 시 inviteToken을 클라이언트에서 전달 | 명세서 FN-004에 초대 기반 회원가입 흐름 명시 | **미구현** - `SignupForm`에 inviteToken 전달 로직 없음 |
| signup 시 userLocale 전달 | 명세서 FN-004 입력 데이터에 정의 | **미구현** - `SignupForm`에서 현재 locale을 서버에 전달하지 않음 |
| 에러 코드 query string 처리 | 명세서 FN-009에서 에러 코드를 query string으로 전달 | 부분 구현 - LoginForm에서 query string 에러 파싱은 있으나, 서버에서 리다이렉트 시 에러 코드 포함 로직 미확인 |
| isActive 필드를 JWT/세션에 포함 | 명세서 FN-008에서 세션에 isActive 포함 요구 | **미구현** - 현재 JWT payload에 `sub`, `email`만 포함. `isActive` 미포함 |
| 비밀번호 재설정 Rate Limit | 명세서 BR-007-04에서 5회/시간 Rate Limit 명시 | 완료 - `@PasswordResetRateLimit` 적용됨 (forgot-password, reset-password 양쪽) |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

현재 아키텍처는 명세서의 의도를 대부분 달성한 상태이다. 핵심 차이점은 명세서가 Next-Auth 기반을 가정한 반면, 실제 구현은 NestJS Passport + 커스텀 JWT 구조이다. 이 구조는 더 세밀한 제어가 가능하므로 유지한다.

```
[클라이언트 - Next.js 16]
  libs/client/auth/     → 인증 폼 컴포넌트 (SignupForm, LoginForm 등)
  libs/client/core/     → AuthContext, apiFetch (토큰 관리)
  apps/client/          → 페이지 라우트 (/auth/login, /auth/signup 등)

[서버 - NestJS]
  libs/server/auth/     → 인증 서비스, 컨트롤러, Passport 전략
  libs/server/rate-limit/ → IP 기반 Rate Limiting
  libs/server/email/    → SMTP 이메일 발송
  libs/server/audit-log/ → 감사 로그
  libs/server/prisma/   → Prisma 클라이언트

[데이터베이스 - PostgreSQL]
  packages/db/          → Prisma 스키마
```

### 2.2 데이터 모델

현재 Prisma 스키마는 명세서의 User 엔티티 요구사항을 완전히 충족한다. 스키마 변경이 필요하지 않다.

**현재 스키마와 명세서 대조:**

| 명세서 필드 | Prisma 필드 | 상태 |
|------------|------------|------|
| id (cuid) | id String @id @default(cuid()) | 일치 |
| email (unique, lowercase) | email String @unique | 일치 (Transform에서 lowercase 처리) |
| name | name String | 일치 |
| password (nullable, bcrypt) | password String? | 일치 |
| emailVerified (DateTime?) | emailVerified DateTime? | 일치 |
| twoFactorSecret | twoFactorSecret String? | 일치 |
| twoFactorEnabled | twoFactorEnabled Boolean @default(false) | 일치 |
| backupCodes | backupCodes String? | 일치 |
| identityProvider (Enum) | identityProvider IdentityProvider @default(EMAIL) | 부분 일치 - 현재 EMAIL/GOOGLE/GITHUB만 정의. azuread/openid/saml은 FSD-002 범위 |
| locale | locale String @default("en-US") | 일치 |
| lastLoginAt | lastLoginAt DateTime? | 일치 |
| isActive | isActive Boolean @default(true) | 일치 |
| createdAt | createdAt DateTime @default(now()) | 일치 |
| updatedAt | updatedAt DateTime @updatedAt | 일치 |

### 2.3 API 설계

현재 REST API 엔드포인트는 명세서의 기능 요구사항을 충족한다. 변경 불필요.

| 엔드포인트 | 메서드 | Rate Limit | 상태 |
|-----------|--------|-----------|------|
| POST /api/auth/signup | POST | 30회/시간 | 구현됨 |
| POST /api/auth/login | POST | 10회/15분 | 구현됨 |
| POST /api/auth/verify-email | POST | 10회/시간 | 구현됨 |
| POST /api/auth/forgot-password | POST | 5회/시간 | 구현됨 |
| POST /api/auth/reset-password | POST | 5회/시간 | 구현됨 |
| POST /api/auth/refresh | POST | - | 구현됨 |
| POST /api/auth/logout | POST | - | 구현됨 |
| GET /api/auth/me | GET | - | 구현됨 |
| GET /api/auth/google | GET | - | 구현됨 (OAuth) |
| GET /api/auth/github | GET | - | 구현됨 (OAuth) |

### 2.4 주요 컴포넌트 설계

변경이 필요한 컴포넌트와 변경 방향:

**1. LoginForm - "비밀번호 찾기" 링크 추가**
- 현재: 로그인 폼 하단에 회원가입 링크만 존재
- 변경: 비밀번호 필드 아래 또는 제출 버튼 근처에 "비밀번호를 잊으셨나요?" 링크 추가
- i18n 키 추가 필요

**2. ResetPasswordForm - 실시간 비밀번호 유효성 피드백 추가**
- 현재: 비밀번호 확인만 검증, 실시간 피드백 없음
- 변경: `SignupForm`의 `checkPasswordRules` 패턴을 재사용하여 실시간 피드백 UI 추가

**3. SignupForm - Turnstile CAPTCHA 위젯 연동**
- 현재: 서버 사이드 검증만 존재
- 변경: `@marsidev/react-turnstile` 라이브러리를 사용하여 클라이언트에 위젯 렌더링, `turnstileToken`을 signup 요청에 포함

**4. SignupForm - inviteToken 및 userLocale 전달**
- 현재: email, password, name만 전달
- 변경: URL query string에서 `inviteToken` 추출, 현재 i18n locale을 `userLocale`로 전달

**5. ServerAuthService.signup - Brevo 호출 시점 수정**
- 현재: signup 시 Brevo `createContact` 호출
- 변경: signup에서 Brevo 호출 제거 (명세서 기준: 이메일 검증 완료 시에만 호출)

**6. JWT payload에 isActive 포함**
- 현재: `{ sub, email }` 만 포함
- 변경: `{ sub, email, isActive }` 로 확장. 세션 데이터에도 반영

### 2.5 기존 시스템 영향도 분석

| 변경 대상 | 영향 범위 | 위험도 |
|----------|---------|--------|
| LoginForm에 링크 추가 | UI 전용 변경, 기능 영향 없음 | 낮음 |
| ResetPasswordForm 피드백 추가 | UI 전용 변경, 기존 검증 로직 유지 | 낮음 |
| Turnstile 위젯 추가 | 신규 의존성 추가, TURNSTILE_SITE_KEY 환경변수 필요 | 중간 |
| inviteToken/userLocale 전달 | auth-context.tsx의 signup 함수 시그니처 변경 | 중간 |
| Brevo 호출 시점 변경 | ServerAuthService 수정, 기존 동작 변경 | 낮음 |
| JWT payload 확장 | JwtStrategy, generateTokens, auth-context 전반 영향 | 중간 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|----------|
| T-01 | LoginForm에 "비밀번호 찾기" 링크 추가 | 로그인 폼에 forgot-password 페이지로의 링크 추가 | 없음 | 낮음 | 15분 |
| T-02 | i18n 키 추가 (forgot_password 링크) | ko/en translation.json에 "비밀번호를 잊으셨나요?" 키 추가 | T-01 | 낮음 | 10분 |
| T-03 | ResetPasswordForm에 실시간 비밀번호 유효성 피드백 추가 | SignupForm의 `checkPasswordRules` 패턴 재사용 | 없음 | 낮음 | 30분 |
| T-04 | Turnstile 클라이언트 위젯 연동 | `@marsidev/react-turnstile` 설치, SignupForm에 위젯 추가, turnstileToken 전달 | 없음 | 중간 | 1시간 |
| T-05 | i18n 키 추가 (Turnstile 관련) | CAPTCHA 로딩/에러 메시지 키 추가 | T-04 | 낮음 | 10분 |
| T-06 | SignupForm에 inviteToken 전달 로직 추가 | URL query string에서 inviteToken 추출, signup 요청에 포함 | 없음 | 낮음 | 20분 |
| T-07 | SignupForm에 userLocale 전달 로직 추가 | 현재 i18n locale을 signup 요청에 포함 | 없음 | 낮음 | 15분 |
| T-08 | auth-context.tsx signup 함수 시그니처 확장 | inviteToken, userLocale, turnstileToken 파라미터 추가 | T-04, T-06, T-07 | 중간 | 30분 |
| T-09 | Brevo 호출 시점 수정 | signup에서 Brevo createContact 제거 (verifyEmail에는 이미 존재) | 없음 | 낮음 | 10분 |
| T-10 | JWT payload에 isActive 포함 | generateTokens에서 isActive 추가, JwtStrategy에서 payload 확장 | 없음 | 중간 | 30분 |
| T-11 | 세션 데이터에 isActive 반영 | auth-context User 타입에 isActive 추가, /auth/me 응답에 포함 확인 | T-10 | 낮음 | 20분 |
| T-12 | 단위 테스트 작성 | 변경된 컴포넌트에 대한 테스트 | T-01~T-11 | 중간 | 2시간 |
| T-13 | 빌드 검증 및 E2E 확인 | 전체 빌드 통과 확인, 주요 플로우 수동 검증 | T-12 | 낮음 | 30분 |

### 3.2 구현 순서 및 마일스톤

**마일스톤 1: UI 개선 (T-01, T-02, T-03)** - 예상 55분

로그인 폼의 "비밀번호 찾기" 링크 추가와 비밀번호 재설정 폼의 실시간 유효성 피드백 추가. 기존 기능에 영향 없이 독립적으로 진행 가능.

검증 기준:
- 로그인 페이지에서 "비밀번호를 잊으셨나요?" 링크가 표시되고 클릭 시 `/auth/forgot-password`로 이동
- 비밀번호 재설정 폼에서 비밀번호 입력 시 실시간으로 규칙 충족 여부가 표시됨
- ko/en 번역이 모두 정상 표시됨

**마일스톤 2: 서버 로직 보정 (T-09, T-10, T-11)** - 예상 1시간

Brevo 호출 시점 수정, JWT payload 확장, 세션 데이터 보정. 서버 사이드 변경이므로 클라이언트와 독립적.

검증 기준:
- signup 시 Brevo createContact가 호출되지 않음
- verifyEmail 성공 시에만 Brevo createContact 호출됨
- JWT payload에 isActive 필드가 포함됨
- /auth/me 응답에 isActive 필드가 포함됨

**마일스톤 3: Turnstile CAPTCHA 연동 (T-04, T-05)** - 예상 1시간 10분

클라이언트에 Turnstile 위젯을 추가하고 서버에 토큰을 전달. 환경변수 미설정 시 위젯이 표시되지 않도록 graceful degradation 처리.

검증 기준:
- NEXT_PUBLIC_TURNSTILE_SITE_KEY가 설정된 경우 회원가입 폼에 Turnstile 위젯 표시
- 위젯 미설정 시 기존과 동일하게 동작 (위젯 미표시)
- 위젯 검증 실패 시 회원가입 불가

**마일스톤 4: 초대 가입 및 locale 전달 (T-06, T-07, T-08)** - 예상 1시간 5분

회원가입 시 초대 토큰과 사용자 locale을 서버에 전달하는 로직 구현.

검증 기준:
- `/auth/signup?inviteToken=xxx`로 접근 시 inviteToken이 서버에 전달됨
- 현재 브라우저 locale이 signup 요청에 포함됨
- auth-context의 signup 함수가 확장된 파라미터를 처리함

**마일스톤 5: 테스트 및 최종 검증 (T-12, T-13)** - 예상 2시간 30분

단위 테스트 작성, 빌드 검증, E2E 플로우 확인.

### 3.3 파일 수정 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|----------|----------|----------|
| `libs/client/auth/src/lib/login-form.tsx` | 수정 | "비밀번호 찾기" 링크 추가 |
| `libs/client/auth/src/lib/reset-password-form.tsx` | 수정 | 실시간 비밀번호 유효성 피드백 UI 추가 (`checkPasswordRules` 패턴 재사용) |
| `libs/client/auth/src/lib/signup-form.tsx` | 수정 | Turnstile 위젯 추가, inviteToken/userLocale 전달 로직 추가 |
| `libs/client/core/src/lib/auth-context.tsx` | 수정 | signup 함수 시그니처 확장 (inviteToken, userLocale, turnstileToken 파라미터) |
| `libs/server/auth/src/lib/server-auth.service.ts` | 수정 | signup에서 Brevo 호출 제거, generateTokens에 isActive 포함 |
| `libs/server/auth/src/lib/strategies/jwt.strategy.ts` | 수정 | validate에서 isActive를 반환 객체에 포함 (이미 포함되어 있으므로 확인만) |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | `auth.login_form.forgot_password` 키 추가 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | `auth.login_form.forgot_password` 키 추가 |

---

## 4. 위험 요소 및 완화 전략

| 위험 | 영향 | 확률 | 완화 전략 |
|------|------|------|----------|
| Turnstile 라이브러리 React 19 호환성 | 높음 | 낮음 | `@marsidev/react-turnstile`는 React 19를 지원. 호환성 문제 발생 시 vanilla JS로 직접 연동하는 대안 준비 |
| JWT payload 확장으로 인한 기존 토큰 비호환 | 중간 | 낮음 | isActive는 optional 필드로 처리. JwtStrategy에서 payload.isActive가 undefined일 때 DB 조회로 폴백 (현재 이미 DB에서 isActive를 조회하므로 문제 없음) |
| auth-context signup 시그니처 변경의 영향 범위 | 중간 | 낮음 | 추가 파라미터를 옵셔널 객체로 전달하여 기존 호출 코드의 변경 최소화 |
| Turnstile 위젯 로딩 실패 시 회원가입 불가 | 중간 | 낮음 | 클라이언트에서 Turnstile 위젯 로딩 실패 시 토큰 없이 요청. 서버의 TurnstileService가 graceful degradation 처리 |
| inviteToken 위변조 | 낮음 | 낮음 | 서버 사이드에서 이미 invite 레코드 검증 + 이메일 일치 확인 로직이 구현되어 있음 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 테스트 대상 | 테스트 항목 | 우선순위 |
|------------|-----------|---------|
| `checkPasswordRules` 함수 | 8자 미만/128자 초과/대문자 미포함/숫자 미포함/모두 충족 케이스 | 높음 |
| `ServerAuthService.signup` | Brevo가 호출되지 않는지 확인 | 높음 |
| `ServerAuthService.verifyEmail` | Brevo가 호출되는지 확인 | 높음 |
| `ServerAuthService.generateTokens` | JWT payload에 isActive가 포함되는지 확인 | 높음 |
| `SignupDto` 유효성 | inviteToken, userLocale, turnstileToken optional 검증 | 중간 |
| `TurnstileService.verify` | 토큰 없을 때 / 유효 토큰 / 무효 토큰 케이스 | 중간 |

### 5.2 통합 테스트

| 테스트 시나리오 | 검증 내용 |
|---------------|----------|
| 회원가입 + 이메일 검증 + 로그인 전체 플로우 | signup -> verify-email -> login 순서대로 성공 |
| 초대 기반 회원가입 | inviteToken 포함 signup -> Membership 생성 확인 |
| Turnstile 설정 환경에서 CAPTCHA 없이 가입 시도 | 400 에러 반환 |
| 이미 존재하는 이메일로 가입 | 동일한 성공 응답 반환 (User Enumeration 방지) |
| 128자 초과 비밀번호로 로그인 | 즉시 "Invalid credentials" 반환 |
| Timing Attack 방지 검증 | 존재/미존재 사용자 로그인 시 응답 시간 차이 10% 이내 |

### 5.3 E2E 테스트 (해당 시)

| 시나리오 | 검증 내용 |
|---------|----------|
| 회원가입 폼 작성 -> 제출 -> 이메일 검증 안내 표시 | 전체 UI 플로우 |
| 로그인 폼에서 "비밀번호 찾기" 클릭 -> forgot-password 페이지 이동 | 라우팅 정상 |
| 비밀번호 재설정 폼에서 실시간 유효성 피드백 표시 | UI 피드백 정상 |
| Turnstile 위젯 렌더링 (설정된 환경) | 위젯 표시 및 토큰 발급 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 제약사항 | 설명 |
|---------|------|
| Team Membership 미구현 | 명세서 FN-004 단계 9의 "Team Membership 생성"은 현재 DB 스키마에 Team 모델이 없어 구현 불가. FSD-003/FSD-004에서 처리 |
| Mailing List 구독 미구현 | `securityNewsletterSubscription`, `productNewsletterSubscription` 필드는 Brevo 리스트 관리 API 연동이 필요하며, Cloud 환경 전용 기능으로 분류 |
| IdentityProvider Enum 확장 | azuread, openid, saml은 FSD-002(2FA/SSO) 범위에서 추가 예정 |
| Next-Auth vs 현재 구조 차이 | 명세서는 Next-Auth 콜백 패턴을 기술하나, 현재는 NestJS Passport 기반. 동일한 보안 수준과 기능을 제공하므로 변경하지 않음 |
| 지원 로케일 제한 | 명세서에 14개 로케일이 정의되어 있으나, 현재 ko/en만 구현됨. 추가 로케일은 i18n 작업 시 확장 |

### 6.2 향후 개선 가능 사항

| 개선 사항 | 설명 | 우선순위 |
|----------|------|---------|
| 비밀번호 강도 미터 | 실시간 피드백에 강도 시각화(프로그레스 바) 추가 | 낮음 |
| 로그인 실패 횟수 기반 CAPTCHA | Rate Limit 외에 N회 실패 후 자동 CAPTCHA 표시 | 중간 |
| 비밀번호 재사용 방지 | 이전 N개 비밀번호와 동일한 비밀번호 사용 차단 | 낮음 |
| Refresh Token 전체 폐기 | 비밀번호 변경 시 해당 사용자의 모든 Refresh Token을 폐기하여 기존 세션 강제 만료 | 높음 |
| 이메일 검증 재발송 기능 | 검증 이메일을 다시 요청할 수 있는 UI/API 추가 | 중간 |
| Mailing List 구독 처리 | Brevo 리스트 관리 API 연동으로 구독 처리 구현 | 낮음 |

---

## 7. i18n 고려사항

### 추가/수정이 필요한 번역 키

| 키 | ko 값 | en 값 | 사용처 |
|----|-------|-------|--------|
| `auth.login_form.forgot_password` | "비밀번호를 잊으셨나요?" | "Forgot your password?" | LoginForm - forgot-password 링크 |
| `auth.signup_form.captcha_required` | "CAPTCHA 인증을 완료해주세요." | "Please complete CAPTCHA verification." | SignupForm - Turnstile 미완료 시 |
| `auth.signup_form.captcha_loading` | "보안 인증 로딩 중..." | "Loading security verification..." | SignupForm - Turnstile 로딩 시 |
| `auth.signup_form.captcha_error` | "보안 인증 로딩에 실패했습니다. 페이지를 새로고침해주세요." | "Failed to load security verification. Please refresh the page." | SignupForm - Turnstile 로드 실패 시 |

기존 번역 키는 변경 없이 유지된다. `reset-password-form.tsx`에 추가되는 실시간 피드백은 이미 존재하는 `auth.reset_password.min_length`, `auth.reset_password.require_uppercase`, `auth.reset_password.require_number` 키를 재사용하거나, `auth.signup_form.pwd_rule_*` 키를 재사용할 수 있다. 일관성을 위해 signup과 동일한 `auth.signup_form.pwd_rule_*` 키를 재사용하는 것을 권장한다.
