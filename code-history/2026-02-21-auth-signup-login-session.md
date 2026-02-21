# 인증 시스템 구현 (회원가입 · 로그인 · 세션)

## Overview

기능 명세서 FN-001 ~ FN-009에 기반하여 NestJS + Passport.js 아키텍처로 인증 시스템을 구현하였다.
이메일+비밀번호 로컬 인증과 Google/GitHub OAuth 소셜 로그인을 지원하며, JWT Access Token(15분) + Refresh Token(7일) 로테이션 전략으로 세션을 관리한다.

### 구현 배경
- SaaS 제품의 사용자 인증/인가 기반 구축
- 보안 모범 사례 적용: Timing Attack 방지, User Enumeration 방지, bcrypt DoS 방지, Rate Limiting
- 이메일 검증 흐름, 비밀번호 재설정, 초대 토큰 처리, Multi-Org 자동 조직 생성 지원

### 관련 커밋
- `e533e10` — 로컬 로그인/OAuth 인증 시스템 초기 구현 (57개 파일)
- `b155a9e` — 보안 강화 및 이메일 검증/비밀번호 재설정 구현 (56개 파일)
- `5a8adc3` — dev 스크립트 추가 및 bcrypt→bcryptjs 교체 (10개 파일)

---

## Changed Files

### 서버 — `@inquiry/server-auth` (인증 모듈)
| 파일 | 역할 |
|------|------|
| `libs/server/auth/package.json` | 인증 모듈 패키지 정의 (passport, jwt, bcryptjs 의존성) |
| `libs/server/auth/src/index.ts` | 모듈 공개 API export |
| `libs/server/auth/src/lib/server-auth.module.ts` | NestJS 모듈 정의 (Passport, JWT, Prisma, Email, AuditLog 통합) |
| `libs/server/auth/src/lib/server-auth.controller.ts` | 인증 API 엔드포인트 (signup, login, refresh, logout, OAuth, verify-email, forgot/reset-password) |
| `libs/server/auth/src/lib/server-auth.service.ts` | 핵심 비즈니스 로직 (비밀번호 검증, 토큰 발급, OAuth 처리, 이메일 검증) |
| `libs/server/auth/src/lib/strategies/local.strategy.ts` | Passport LocalStrategy (이메일+비밀번호 검증) |
| `libs/server/auth/src/lib/strategies/jwt.strategy.ts` | Passport JwtStrategy (Bearer 토큰 검증 + isActive 확인) |
| `libs/server/auth/src/lib/strategies/google.strategy.ts` | Google OAuth2 Strategy |
| `libs/server/auth/src/lib/strategies/github.strategy.ts` | GitHub OAuth Strategy |
| `libs/server/auth/src/lib/guards/local-auth.guard.ts` | LocalAuth Guard |
| `libs/server/auth/src/lib/guards/jwt-auth.guard.ts` | JWT Auth Guard |
| `libs/server/auth/src/lib/guards/google-auth.guard.ts` | Google OAuth Guard |
| `libs/server/auth/src/lib/guards/github-auth.guard.ts` | GitHub OAuth Guard |
| `libs/server/auth/src/lib/decorators/current-user.decorator.ts` | @CurrentUser() 파라미터 데코레이터 |
| `libs/server/auth/src/lib/dto/signup.dto.ts` | 회원가입 DTO (class-validator, 비밀번호 규칙) |
| `libs/server/auth/src/lib/dto/login.dto.ts` | 로그인 DTO |
| `libs/server/auth/src/lib/dto/verify-email.dto.ts` | 이메일 검증 DTO |
| `libs/server/auth/src/lib/dto/forgot-password.dto.ts` | 비밀번호 찾기 DTO |
| `libs/server/auth/src/lib/dto/reset-password.dto.ts` | 비밀번호 재설정 DTO |
| `libs/server/auth/src/lib/dto/password.dto.ts` | 비밀번호 공통 유효성 규칙 |
| `libs/server/auth/src/lib/services/turnstile.service.ts` | Cloudflare Turnstile CAPTCHA 검증 서비스 |
| `libs/server/auth/src/lib/services/brevo.service.ts` | Brevo 마케팅 연동 서비스 |

### 서버 — `@inquiry/server-prisma` (Prisma 서비스)
| 파일 | 역할 |
|------|------|
| `libs/server/prisma/package.json` | Prisma 모듈 패키지 정의 |
| `libs/server/prisma/src/index.ts` | export |
| `libs/server/prisma/src/lib/server-prisma.module.ts` | PrismaModule (Global) |
| `libs/server/prisma/src/lib/server-prisma.service.ts` | PrismaService (NestJS lifecycle 통합) |

### 서버 — `@inquiry/server-email` (이메일 서비스)
| 파일 | 역할 |
|------|------|
| `libs/server/email/package.json` | 이메일 모듈 패키지 정의 |
| `libs/server/email/src/index.ts` | export |
| `libs/server/email/src/lib/email.module.ts` | EmailModule (Global) |
| `libs/server/email/src/lib/email.service.ts` | nodemailer SMTP 기반 이메일 서비스 (검증/재설정/알림 템플릿) |

### 서버 — `@inquiry/server-rate-limit` (Rate Limiting)
| 파일 | 역할 |
|------|------|
| `libs/server/rate-limit/package.json` | Rate Limit 모듈 패키지 정의 |
| `libs/server/rate-limit/src/index.ts` | export |
| `libs/server/rate-limit/src/lib/rate-limit.module.ts` | ThrottlerModule 설정 |
| `libs/server/rate-limit/src/lib/rate-limit.guard.ts` | CustomThrottlerGuard (경로 기반 키) |
| `libs/server/rate-limit/src/lib/rate-limit.decorators.ts` | 엔드포인트별 Rate Limit 데코레이터 |

### 서버 — `@inquiry/server-audit-log` (감사 로그)
| 파일 | 역할 |
|------|------|
| `libs/server/audit-log/package.json` | 감사 로그 모듈 패키지 정의 |
| `libs/server/audit-log/src/index.ts` | export |
| `libs/server/audit-log/src/lib/audit-log.module.ts` | AuditLogModule (Global) |
| `libs/server/audit-log/src/lib/audit-log.service.ts` | fire-and-forget 감사 로그 기록 서비스 |

### 클라이언트 — `@inquiry/client-auth` (인증 UI)
| 파일 | 역할 |
|------|------|
| `libs/client/auth/package.json` | 클라이언트 인증 라이브러리 패키지 정의 |
| `libs/client/auth/src/index.ts` | 컴포넌트 export |
| `libs/client/auth/src/lib/login-form.tsx` | 로그인 폼 (Zod 유효성 검증, 에러 코드 처리) |
| `libs/client/auth/src/lib/signup-form.tsx` | 회원가입 폼 (비밀번호 규칙 동기화) |
| `libs/client/auth/src/lib/social-login-buttons.tsx` | Google/GitHub OAuth 버튼 |
| `libs/client/auth/src/lib/auth-callback.tsx` | OAuth 콜백 처리 (토큰 저장 → 리다이렉트) |
| `libs/client/auth/src/lib/forgot-password-form.tsx` | 비밀번호 찾기 폼 |
| `libs/client/auth/src/lib/reset-password-form.tsx` | 비밀번호 재설정 폼 |
| `libs/client/auth/src/lib/verify-email.tsx` | 이메일 검증 결과 표시 |
| `libs/client/auth/src/lib/logout-page.tsx` | 로그아웃 처리 페이지 |

### 클라이언트 — `@inquiry/client-core` (공통 라이브러리)
| 파일 | 역할 |
|------|------|
| `libs/client/core/package.json` | 클라이언트 코어 라이브러리 패키지 정의 |
| `libs/client/core/src/index.ts` | export |
| `libs/client/core/src/lib/auth-context.tsx` | AuthProvider (React Context, 토큰 관리, 자동 갱신) |
| `libs/client/core/src/lib/api.ts` | API 클라이언트 (401 시 자동 refresh, 인터셉터) |

### 클라이언트 — Next.js 라우트
| 파일 | 역할 |
|------|------|
| `apps/client/src/app/auth/login/page.tsx` | 로그인 페이지 |
| `apps/client/src/app/auth/signup/page.tsx` | 회원가입 페이지 |
| `apps/client/src/app/auth/callback/page.tsx` | OAuth 콜백 페이지 |
| `apps/client/src/app/auth/verify-email/page.tsx` | 이메일 검증 페이지 |
| `apps/client/src/app/auth/forgot-password/page.tsx` | 비밀번호 찾기 페이지 |
| `apps/client/src/app/auth/reset-password/page.tsx` | 비밀번호 재설정 페이지 |
| `apps/client/src/app/auth/logout/page.tsx` | 로그아웃 페이지 |
| `apps/client/src/app/login/page.tsx` | 레거시 경로 → /auth/login 리다이렉트 |
| `apps/client/src/app/signup/page.tsx` | 레거시 경로 → /auth/signup 리다이렉트 |
| `apps/client/src/app/layout.tsx` | 루트 레이아웃 (AuthProvider 래핑) |

### DB 스키마
| 파일 | 역할 |
|------|------|
| `packages/db/prisma/schema.prisma` | Prisma 스키마 (User, Account, RefreshToken, Organization, Membership, Invite, AuditLog) |

### 앱 설정
| 파일 | 역할 |
|------|------|
| `apps/server/src/app/app.module.ts` | NestJS AppModule (AuthModule, RateLimitModule 등록) |
| `apps/server/src/main.ts` | NestJS 부트스트랩 (CORS, cookie-parser, ValidationPipe 설정) |
| `apps/server/webpack.config.js` | NestJS webpack externals (bcryptjs, nodemailer 제외) |
| `apps/server/tsconfig.app.json` | 서버 TypeScript 경로 설정 |
| `apps/client/tsconfig.json` | 클라이언트 TypeScript 경로 설정 |
| `tsconfig.json` | 루트 TypeScript paths (라이브러리 alias) |
| `.env.example` | 환경변수 템플릿 |
| `package.json` | dev 스크립트 (dev, dev:server, dev:client) 추가 |
| `pnpm-workspace.yaml` | pnpm 워크스페이스 설정 |

---

## Major Changes

### 1. Prisma 스키마 설계

7개 모델과 2개 Enum으로 인증/조직 데이터 구조를 정의한다.

```prisma
enum IdentityProvider { EMAIL  GOOGLE  GITHUB }
enum MembershipRole   { OWNER  ADMIN   MEMBER }

model User {
  id                        String           @id @default(cuid())
  email                     String           @unique
  name                      String
  password                  String?          // OAuth 사용자는 null
  emailVerified             DateTime?        // null이면 미검증
  identityProvider          IdentityProvider @default(EMAIL)
  identityProviderAccountId String?
  lastLoginAt               DateTime?
  isActive                  Boolean          @default(true)
  twoFactorEnabled          Boolean          @default(false)
  // ... relations: accounts, refreshTokens, memberships, auditLogs
}
```

- **Account**: OAuth 프로바이더 연결 (provider + providerAccountId unique)
- **RefreshToken**: JWT refresh token DB 저장 (rotation, revoked 관리)
- **Organization / Membership**: Multi-Org 지원 (OWNER/ADMIN/MEMBER 역할)
- **Invite**: 조직 초대 (token unique, 만료 시간)
- **AuditLog**: 사용자 활동 추적 (action, entity, ipAddress)

### 2. 보안 강화

#### Timing Attack 방지
사용자가 존재하지 않아도 `bcrypt.compare`를 수행하여 응답 시간을 동일하게 유지한다:
```typescript
// 모듈 초기화 시 더미 해시 생성
async onModuleInit() {
  this.CONTROL_HASH = await bcrypt.hash('timing-attack-prevention-dummy', this.BCRYPT_ROUNDS);
}

// 사용자 미존재 시에도 bcrypt 비교 수행
if (!user) {
  await bcrypt.compare(password, this.CONTROL_HASH);
  return { success: false, errorCode: 'invalid-credentials', ... };
}
```

#### User Enumeration 방지
회원가입 시 이메일 중복(Prisma P2002)이어도 동일한 성공 응답을 반환한다.
비밀번호 재설정 요청도 사용자 유무에 관계없이 동일한 응답을 반환한다.

#### bcrypt DoS 방지
비밀번호 최대 128자로 제한하여 의도적으로 긴 문자열의 해싱 부하를 방지한다.

#### Rate Limiting
`@nestjs/throttler` 기반으로 엔드포인트별 차등 제한:
- 회원가입: 30회/시간
- 로그인: 10회/15분
- 이메일 검증: 10회/시간
- 비밀번호 재설정: 5회/시간

### 3. 인증 흐름

#### 회원가입 → 이메일 검증 → 로그인
```
[클라이언트] POST /api/auth/signup
    → User 생성 (emailVerified = null)
    → 초대 토큰 처리 (있으면 Membership 생성)
    → 개인 조직 자동 생성 (MULTI_ORG_ENABLED)
    → 이메일 검증 메일 발송
    → { success: true, message: "이메일을 확인해주세요." }

[클라이언트] POST /api/auth/verify-email { token }
    → JWT에서 userId 추출 → emailVerified 업데이트
    → { success: true, message: "이메일 인증이 완료되었습니다." }

[클라이언트] POST /api/auth/login { email, password }
    → LocalStrategy.validate → AuthService.validateUser
    → isActive 확인 → emailVerified 확인
    → Access Token(Body) + Refresh Token(HttpOnly Cookie) 발급
```

#### OAuth 흐름
```
[클라이언트] → GET /api/auth/google
    → Google 로그인 페이지 리다이렉트
    → GET /api/auth/google/callback
    → validateOAuthUser (기존 Account 연결 또는 신규 생성)
    → 토큰 발급 → CLIENT_URL/auth/callback?accessToken=xxx 리다이렉트
```

#### 비밀번호 재설정 흐름
```
POST /api/auth/forgot-password { email }
    → 사용자 존재 시 재설정 이메일 발송 (1시간 유효 JWT)
    → 항상 동일 응답 반환 (User Enumeration 방지)

POST /api/auth/reset-password { token, password }
    → JWT 검증 → 새 비밀번호 해싱 → DB 업데이트 → 알림 이메일 발송
```

### 4. JWT 토큰 관리

- **Access Token**: 15분 유효, `JWT_ACCESS_SECRET`으로 서명, 응답 body로 전달
- **Refresh Token**: 7일 유효 (SESSION_MAX_DURATION 상한), 랜덤 64바이트 hex, DB 저장, HttpOnly 쿠키
- **Token Rotation**: refresh 시 기존 토큰 폐기(revoked=true) → 새 토큰 페어 발급
- **JwtStrategy**: Bearer 토큰에서 userId 추출 후 DB에서 isActive 확인

### 5. 외부 서비스 연동 (선택적)

모든 외부 서비스는 환경변수 미설정 시 no-op으로 동작하여 로컬 개발에 영향 없다:

- **Turnstile**: `TURNSTILE_SECRET_KEY` 미설정 시 검증 통과
- **Brevo**: `BREVO_API_KEY` 미설정 시 fire-and-forget 실패 무시
- **SMTP**: `SMTP_HOST` 미설정 시 이메일 발송 건너뜀 (로그만 출력)

### 6. 클라이언트 AuthProvider

React Context 기반의 인증 상태 관리:

```typescript
// AuthProvider가 앱 루트를 감싸서 전역 인증 상태 제공
<AuthProvider>
  <App />
</AuthProvider>

// 컴포넌트에서 사용
const { user, loading, login, logout } = useAuth();
```

- Access Token 만료 시 자동 refresh (401 인터셉터)
- 페이지 로드 시 `/api/auth/me`로 사용자 정보 복원

---

## How to use it

### 환경변수 설정

`.env.example`을 `.env`로 복사하고 필수값을 설정한다:

```bash
cp .env.example .env
```

필수 환경변수:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/inquiry?schema=public"
JWT_ACCESS_SECRET="your-access-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
CLIENT_URL="http://localhost:4200"
```

선택 환경변수 (OAuth 사용 시):
```env
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
```

### DB 마이그레이션 및 서버 실행

```bash
# Prisma 마이그레이션 실행
pnpm prisma migrate dev --schema=packages/db/prisma/schema.prisma

# 클라이언트 + 서버 동시 실행
pnpm dev

# 또는 개별 실행
pnpm dev:server   # NestJS 서버 (http://localhost:3000)
pnpm dev:client   # Next.js 클라이언트 (http://localhost:4200)
```

### API 엔드포인트

#### 회원가입
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass1",
  "name": "홍길동",
  "userLocale": "ko-KR"
}

→ 200 { "success": true, "message": "회원가입이 완료되었습니다. 이메일을 확인해주세요." }
```

#### 로그인
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass1"
}

→ 200 { "accessToken": "eyJ..." }
   Set-Cookie: refresh_token=xxx; HttpOnly; Path=/; Max-Age=604800
```

#### 토큰 갱신
```http
POST /api/auth/refresh
Cookie: refresh_token=xxx

→ 200 { "accessToken": "eyJ..." }
   Set-Cookie: refresh_token=new-xxx; HttpOnly
```

#### 로그아웃
```http
POST /api/auth/logout
Cookie: refresh_token=xxx

→ 200 { "message": "로그아웃 되었습니다." }
```

#### 이메일 검증
```http
POST /api/auth/verify-email
Content-Type: application/json

{ "token": "jwt-verification-token" }

→ 200 { "success": true, "message": "이메일 인증이 완료되었습니다." }
```

#### 비밀번호 찾기 / 재설정
```http
POST /api/auth/forgot-password
{ "email": "user@example.com" }
→ 200 { "success": true, "message": "비밀번호 재설정 링크가 이메일로 발송되었습니다." }

POST /api/auth/reset-password
{ "token": "jwt-reset-token", "password": "NewSecure1" }
→ 200 { "success": true, "message": "비밀번호가 성공적으로 변경되었습니다." }
```

#### 현재 사용자 정보
```http
GET /api/auth/me
Authorization: Bearer eyJ...

→ 200 { "id": "...", "email": "user@example.com", "name": "홍길동" }
```

#### Google/GitHub OAuth
```
GET /api/auth/google   → Google 로그인 페이지로 리다이렉트
GET /api/auth/github   → GitHub 로그인 페이지로 리다이렉트
```

---

## Related Components/Modules

### 모듈 의존성 관계

```
AppModule
├── ServerAuthModule
│   ├── ServerPrismaModule (Global)
│   ├── JwtModule
│   ├── PassportModule
│   ├── EmailModule (Global)
│   ├── AuditLogModule (Global) → ServerPrismaModule
│   ├── TurnstileService
│   └── BrevoService
├── RateLimitModule (ThrottlerModule)
└── ConfigModule (Global)
```

### 데이터 플로우

```
[Next.js Client] → AuthProvider (React Context)
    ↓ API 호출 (api.ts 인터셉터)
[NestJS Server] → AuthController
    ↓ Guard (Local/JWT/OAuth)
    → AuthService → PrismaService (DB)
                  → EmailService (SMTP)
                  → AuditLogService (감사 로그)
                  → TurnstileService (CAPTCHA)
                  → BrevoService (마케팅)
```

### 클라이언트 라우팅

| 경로 | 컴포넌트 | 인증 필요 |
|------|----------|-----------|
| `/auth/login` | LoginForm | 아니오 |
| `/auth/signup` | SignupForm | 아니오 |
| `/auth/callback` | AuthCallback | 아니오 |
| `/auth/verify-email` | VerifyEmail | 아니오 |
| `/auth/forgot-password` | ForgotPasswordForm | 아니오 |
| `/auth/reset-password` | ResetPasswordForm | 아니오 |
| `/auth/logout` | LogoutPage | 아니오 |
| `/login`, `/signup` | 리다이렉트 | — |

---

## Precautions

### 필수 요구사항
- **DATABASE_URL**: PostgreSQL 연결 필수. 설정 없이는 서버가 시작되지 않음
- **Prisma 마이그레이션**: 스키마 변경 후 반드시 `prisma migrate dev` 실행 필요
- **JWT_ACCESS_SECRET**: 필수. 미설정 시 서버 시작 실패 (`getOrThrow`)

### bcryptjs 사용 이유
- 네이티브 바인딩(`bcrypt`)은 node-gyp 빌드 문제가 발생하여 순수 JS 구현체인 `bcryptjs`로 교체
- webpack externals에 `bcryptjs`, `nodemailer`를 추가하여 서버 빌드 시 번들링에서 제외

### 선택적 외부 서비스
- **SMTP**: 미설정 시 이메일 발송이 건너뛰어짐 → 개발 시 `EMAIL_VERIFICATION_DISABLED=true` 권장
- **Turnstile**: 미설정 시 CAPTCHA 검증 통과 (개발 편의)
- **Brevo**: 미설정 시 마케팅 연동 비활성화

### 알려진 제한사항
- 2FA(TOTP) 스키마 필드만 정의됨, 실제 구현은 향후 작업
- Refresh Token 정리(만료된 토큰 삭제) 배치 작업 미구현
- 소셜 로그인 버튼 텍스트가 영문("Continue with Google/GitHub")으로 하드코딩됨 → i18n 적용 필요
- Rate Limiting이 메모리 기반이므로, 다중 인스턴스 환경에서는 Redis 스토어로 전환 필요
