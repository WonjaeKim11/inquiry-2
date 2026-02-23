# FSD-002 2FA/SSO 인증 서버 사이드 구현

## Overview
2단계 인증(2FA)과 SSO(Single Sign-On) 기능의 서버 사이드 구현이다. TOTP 기반 2FA를 통해 계정 보안을 강화하고, Azure AD/OpenID Connect SSO 연동을 위한 골격 구조를 마련하였다. AES-256-GCM 기반 암호화 모듈을 신규 라이브러리로 분리하여 TOTP Secret과 Backup Code를 안전하게 저장한다.

## Changed Files

### 신규 파일
- `libs/server/crypto/package.json` - @inquiry/server-crypto 패키지 정의
- `libs/server/crypto/tsconfig.json` - TypeScript 프로젝트 참조 설정
- `libs/server/crypto/tsconfig.lib.json` - TypeScript 라이브러리 빌드 설정
- `libs/server/crypto/src/index.ts` - 모듈/서비스 export
- `libs/server/crypto/src/lib/crypto.module.ts` - CryptoModule (@Global)
- `libs/server/crypto/src/lib/encryption.service.ts` - AES-256-GCM 암호화/복호화 서비스
- `libs/server/auth/src/lib/two-factor.service.ts` - 2FA TOTP/Backup Code 관리 서비스
- `libs/server/auth/src/lib/sso-callback.service.ts` - SSO 콜백 공통 처리 서비스
- `libs/server/auth/src/lib/strategies/azure-ad.strategy.ts` - Azure AD 인증 전략 (골격)
- `libs/server/auth/src/lib/strategies/openid.strategy.ts` - OpenID Connect 인증 전략 (골격)

### 수정 파일
- `packages/db/prisma/schema.prisma` - IdentityProvider enum에 AZUREAD, OPENID, SAML 추가
- `libs/server/auth/src/lib/dto/login.dto.ts` - totpCode, backupCode 필드 추가
- `libs/server/auth/src/lib/server-auth.service.ts` - 2FA 검증 로직 통합 (validateUser 수정)
- `libs/server/auth/src/lib/server-auth.controller.ts` - 2FA 엔드포인트 3개 추가
- `libs/server/auth/src/lib/server-auth.module.ts` - TwoFactorService, SsoCallbackService 등록
- `libs/server/auth/src/lib/strategies/local.strategy.ts` - passReqToCallback으로 2FA 코드 전달
- `libs/server/auth/src/index.ts` - 신규 서비스/전략 export 추가
- `libs/server/auth/package.json` - otplib, @inquiry/server-crypto, @inquiry/server-license 의존성 추가
- `libs/server/auth/tsconfig.lib.json` - crypto, license 프로젝트 참조 추가
- `apps/server/src/app/app.module.ts` - CryptoModule import 추가
- `apps/server/package.json` - @inquiry/server-crypto 의존성 추가
- `.env.example` - ENCRYPTION_KEY, SSO 설정, Feature Flag 환경변수 추가
- `tsconfig.json` - server-crypto 프로젝트 참조 추가
- `apps/server/tsconfig.app.json` - crypto tsconfig 참조 추가

## Major Changes

### 1. AES-256-GCM 암호화 모듈 (`libs/server/crypto/`)

`EncryptionService`는 ENCRYPTION_KEY 환경변수(32바이트 hex)에서 키를 로드하여 AES-256-GCM 암호화/복호화를 수행한다. 키 미설정 시 no-op 모드(평문 반환)로 동작하여 개발 환경을 지원한다.

```typescript
// 암호화 결과 형식: {iv}:{authTag}:{ciphertext} (모두 hex)
const encrypted = encryptionService.encrypt('my-secret');
// → "a1b2c3d4e5f6a7b8c9d0e1f2:1234567890abcdef12345678:9876543210"
const decrypted = encryptionService.decrypt(encrypted);
// → "my-secret"
```

- IV(12바이트): 매 암호화마다 `crypto.randomBytes`로 생성하여 동일 평문도 다른 결과 보장
- AuthTag(16바이트): GCM 모드의 인증 태그로 무결성 검증
- `@Global()` 모듈로 등록하여 어디서든 주입 가능

### 2. 2FA 서비스 (`TwoFactorService`)

TOTP(Time-based One-Time Password)와 Backup Code 기반 2단계 인증을 관리한다.

**TOTP 처리 흐름:**
1. `enableTwoFactor()`: Secret 생성 → QR URI 생성 → 암호화 저장 → 평문 반환
2. 로그인 시: 암호화된 Secret 복호화 → `authenticator.verify()` 검증 (window: -1 ~ 0)

**Backup Code 처리 흐름:**
1. `generateBackupCodes()`: `crypto.randomBytes(4)`로 10개 코드 생성 (xxxx-xxxx 형식)
2. `verifyBackupCode()`: 모든 코드에 대해 `crypto.timingSafeEqual`로 비교 (타이밍 공격 방지)
3. 매칭 시 해당 코드를 배열에서 제거 → 재암호화 → DB 업데이트

```typescript
// Timing-safe comparison: 길이가 다른 문자열도 동일 시간에 비교
private timingSafeCompare(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(maxLength);
  const bufB = Buffer.alloc(maxLength);
  bufA.write(a);
  bufB.write(b);
  const lengthMatch = a.length === b.length;
  return timingSafeEqual(bufA, bufB) && lengthMatch;
}
```

### 3. 로그인 2FA 통합

`ServerAuthService.validateUser()` 메서드에 2FA 검증 단계를 추가하였다.

```
1단계: 이메일+비밀번호 검증 (기존)
  ↓
2단계: twoFactorEnabled 확인
  ├─ 코드 미제공 → errorCode: 'second-factor-required' 반환
  ├─ totpCode 제공 → verifyTotpCode() 호출
  └─ backupCode 제공 → verifyBackupCode() 호출 + 소진 처리
  ↓
성공 → 사용자 정보 반환
```

`LocalStrategy`를 `passReqToCallback: true`로 설정하여 요청 본문에서 `totpCode`, `backupCode`를 추출한다.

### 4. SSO 골격 구조

**SsoCallbackService**: SSO 프로바이더 콜백의 공통 사용자 매칭/생성 로직을 담당한다.
- 시나리오 1: 동일 provider + providerAccountId → 기존 계정으로 로그인
- 시나리오 2: 동일 이메일의 기존 사용자 → Account 연결
- 시나리오 3: 완전 신규 → User + Account 생성

Azure AD, OpenID Connect 전략은 타입/인터페이스만 정의하고, 실제 구현은 외부 패키지(passport-azure-ad, openid-client) 설치 후 진행 예정이다.

### 5. Prisma 스키마 확장

`IdentityProvider` enum에 `AZUREAD`, `OPENID`, `SAML`을 추가하여 SSO 인증 제공자를 지원한다.

## How to use it

### 2FA 활성화
```bash
# JWT 인증 헤더 필요
POST /api/auth/2fa/enable
Authorization: Bearer <access_token>

# 응답
{
  "success": true,
  "message": "2단계 인증이 활성화되었습니다.",
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCodeUri": "otpauth://totp/Inquiry:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Inquiry",
    "backupCodes": ["a1b2-c3d4", "e5f6-7890", ...]
  }
}
```

### 2FA가 활성화된 계정으로 로그인
```bash
# 1차 시도: 이메일+비밀번호만
POST /api/auth/login
{ "email": "user@example.com", "password": "password" }
# → 401 { "errorCode": "second-factor-required", "message": "2단계 인증이 필요합니다." }

# 2차 시도: TOTP 코드 포함
POST /api/auth/login
{ "email": "user@example.com", "password": "password", "totpCode": "123456" }
# → 200 { "accessToken": "..." }

# 또는 Backup Code 사용
POST /api/auth/login
{ "email": "user@example.com", "password": "password", "backupCode": "a1b2-c3d4" }
# → 200 { "accessToken": "..." }
```

### 2FA 상태 조회
```bash
GET /api/auth/2fa/status
Authorization: Bearer <access_token>
# → { "success": true, "data": { "enabled": true } }
```

### 2FA 비활성화
```bash
POST /api/auth/2fa/disable
Authorization: Bearer <access_token>
# → { "success": true, "message": "2단계 인증이 비활성화되었습니다." }
```

### 환경변수 설정
```bash
# ENCRYPTION_KEY 생성 (32바이트 = 64자 hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → .env에 ENCRYPTION_KEY=<결과값> 추가
```

## Related Components/Modules
- `libs/server/license/` - LicenseService.hasFeature('twoFactorAuth')로 2FA Feature Flag 확인
- `libs/server/audit-log/` - AuditLogService.logEvent()로 2FA 활성화/비활성화 감사 로그 기록
- `libs/server/prisma/` - ServerPrismaService를 통한 User 모델 접근
- `packages/db/prisma/schema.prisma` - User 모델의 twoFactorSecret, twoFactorEnabled, backupCodes 필드
- `apps/server/src/app/app.module.ts` - CryptoModule을 @Global() 모듈로 등록

## Precautions
- **ENCRYPTION_KEY 미설정**: 개발 환경에서는 평문 모드로 동작하지만, 프로덕션에서는 반드시 32바이트 hex 키를 설정해야 한다.
- **SSO 전략 골격**: Azure AD, OpenID Connect 전략은 인터페이스/타입만 정의되어 있으며, 실제 동작을 위해서는 passport-azure-ad, openid-client 패키지 설치 및 구현이 필요하다.
- **DB 마이그레이션**: IdentityProvider enum 확장에 대한 Prisma 마이그레이션은 PostgreSQL 실행 환경에서 별도로 실행해야 한다 (`pnpm prisma migrate dev`).
- **Backup Code 소진**: 10개 Backup Code가 모두 소진되면 TOTP 앱으로만 인증 가능하다. 사용자에게 남은 Backup Code 수를 안내하는 클라이언트 기능이 향후 필요하다.
- **라이선스 Feature Flag**: 2FA 기능은 라이선스의 `twoFactorAuth` feature가 포함된 플랜에서만 활성화 가능하다. 무료 플랜에서는 기능이 차단된다.
