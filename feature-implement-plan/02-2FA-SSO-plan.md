# 기능 구현 계획: 2FA / SSO 인증

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 우선순위 | 설명 |
|---------|--------|---------|------|
| FN-001 | TOTP 2FA 활성화 | 높음 | TOTP Secret + Backup Code 생성/암호화 저장, QR 코드 반환 |
| FN-002 | TOTP 코드 검증 (로그인) | 높음 | 로그인 시 2FA 활성 사용자에 대한 TOTP 코드 검증 |
| FN-003 | Backup Code 검증 (로그인) | 높음 | TOTP 불가 시 Backup Code로 대체 인증 |
| FN-004 | 2FA 비활성화 | 중간 | 2FA 해제 및 관련 데이터 삭제 |
| FN-005 | 2FA Feature Flag 확인 | 높음 | Enterprise License 기반 2FA 기능 접근 제어 |
| FN-006 | SSO Provider 등록 | 높음 | 5종 SSO Provider 동적 등록 (GitHub, Google, Azure AD, OpenID, SAML) |
| FN-007 | SSO Callback 처리 | 높음 | SSO 인증 후 사용자 매칭/생성/프로비저닝 |
| FN-008 | SSO Feature Flag 확인 | 높음 | Enterprise License 기반 SSO/SAML 기능 접근 제어 |

### 1.2 비기능 요구사항

| 분류 | 요구사항 |
|------|---------|
| 보안 | TOTP Secret/Backup Code는 AES 대칭 암호화로 DB 저장. 평문 저장 금지 |
| 보안 | Backup Code 비교 시 timing-safe comparison 사용 |
| 보안 | OpenID/SAML Provider에 PKCE + State 체크 적용 |
| 보안 | 로그인 Rate Limit(10회/15분)이 2FA 검증에도 동일 적용 |
| 보안 | 로그에서 PII(이메일 등) 자동 제거 |
| 성능 | 2FA 검증/SSO Callback 응답 시간 평균 2초 이내 |
| 성능 | License Feature Flag 캐싱: Memory 1분, Redis 24시간 |
| 가용성 | License 서버 접근 불가 시 Grace Period 3일, 이전 결과 TTL 4일 |
| 가용성 | License API 재시도: 최대 3회, 지수 백오프, 대상 429/502/503/504 |
| 감사 | 2FA 인증 시도(성공/실패), Backup Code 사용, SSO Callback 모두 Audit Log 기록 |

### 1.3 명세서의 모호한 부분과 해석

| 항목 | 모호한 부분 | 해석/결정 |
|------|-----------|----------|
| TOTP 라이브러리 | "OTP 라이브러리 사용"으로만 기술 | `otplib` 패키지를 사용한다 (Node.js 생태계에서 가장 널리 쓰이는 TOTP 라이브러리) |
| AES 암호화 구현 | 구체적 알고리즘/모드 미기술 | AES-256-GCM을 사용한다 (인증 태그 포함으로 무결성 보장) |
| Backup Code 형식 | "하이픈 포함 형식"만 기술 | `xxxx-xxxx` 형식 (8자리 영숫자, 중간 하이픈)으로 구현한다 |
| License 서버 연동 | License 서버 API 구체적 스펙 미기술 | 초기 구현은 환경변수 기반 Feature Flag로 대체하고, License 서버 연동은 FN-029(구독/과금) 구현 시 통합한다 |
| Redis 캐싱 | Redis 인프라 전제 | 현재 프로젝트에 Redis 미구성 상태. 초기 구현은 in-memory 캐시(Map + TTL)로 대체하고, Redis는 인프라 준비 후 전환한다 |
| SAML/BoxyHQ | BoxyHQ 설정 및 배포 방식 미기술 | Self-hosted 환경 전용이므로 초기 구현은 골격만 구성하고, SAML 전체 구현은 별도 마일스톤으로 분리한다 |
| Next-Auth vs NestJS Passport | 명세서는 "Next-Auth"를 언급하나 현재 코드베이스는 NestJS+Passport 구조 | 기존 NestJS+Passport 아키텍처를 유지하며, 명세서의 "Next-Auth" 개념을 Passport 전략으로 매핑하여 구현한다 |
| SSO Provider 동적 등록 | "서버 시작 시 환경변수 확인"으로 기술 | NestJS 모듈 초기화 시 환경변수를 확인하여 해당 Passport 전략을 동적으로 등록/비등록한다 |
| 2FA 설정 페이지 위치 | UI 위치 미기술 | `/settings/security` 경로에 2FA 설정 섹션을 배치한다 (현재 settings 페이지가 없으므로 새로 생성) |

### 1.4 암묵적 요구사항

| 항목 | 설명 |
|------|------|
| DB 마이그레이션 | User 모델에 SSO용 IdentityProvider enum 확장 (AZUREAD, OPENID, SAML 추가) |
| 암호화 유틸리티 | AES-256-GCM 암호화/복호화 공통 유틸리티 모듈 생성 필요 |
| Feature Flag 모듈 | Enterprise License Feature Flag 관리를 위한 서버 라이브러리 모듈 생성 필요 |
| 2FA 전용 서비스 | 기존 `ServerAuthService`가 이미 비대하므로(658줄) 2FA 로직은 별도 서비스로 분리 |
| 환경변수 추가 | `ENCRYPTION_KEY`, SSO Provider별 클라이언트 ID/Secret 등 다수의 환경변수 추가 필요 |
| LoginDto 확장 | `totpCode`, `backupCode` 필드 추가 필요 |
| AuthContext 확장 | 클라이언트 login 함수가 2FA 흐름(two-step)을 지원해야 함 |
| Passport 전략 추가 | Azure AD, OpenID, SAML 전략 추가 필요 |
| 클라이언트 2FA 입력 UI | TOTP 코드/Backup Code 입력 화면 컴포넌트 필요 |
| 클라이언트 2FA 설정 UI | 2FA 활성화/비활성화, QR 코드 표시, Backup Code 표시 화면 필요 |
| QR 코드 생성 | 서버에서 `otpauth://` URI를 반환하면 클라이언트에서 QR 코드 이미지로 렌더링 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
+------------------+     +---------------------+     +-------------------+
|  클라이언트       |     |  NestJS 서버         |     |  외부 시스템       |
|  (Next.js 16)    |     |  (apps/server)       |     |                   |
+------------------+     +---------------------+     +-------------------+
|                  |     |                     |     |                   |
| [2FA 입력 UI]    |---->| [AuthController]    |     |                   |
| [2FA 설정 UI]    |---->|   +- login (2FA)    |     |                   |
| [SSO 버튼 UI]    |---->|   +- 2FA enable     |     |                   |
|                  |     |   +- 2FA disable    |     |                   |
|                  |     |   +- SSO callback   |     |                   |
|                  |     |                     |     |                   |
|                  |     | [TwoFactorService]  |     |                   |
|                  |     |   +- TOTP 생성/검증  |     |                   |
|                  |     |   +- Backup Code    |     |                   |
|                  |     |                     |     |                   |
|                  |     | [SsoService]        |---->| GitHub OAuth      |
|                  |     |   +- Callback 처리   |---->| Google OAuth      |
|                  |     |   +- 사용자 프로비저닝|---->| Azure AD          |
|                  |     |                     |---->| OpenID Provider   |
|                  |     | [LicenseService]    |---->| SAML/BoxyHQ       |
|                  |     |   +- Feature Flag   |---->| License Server    |
|                  |     |                     |     |                   |
|                  |     | [EncryptionUtil]    |     |                   |
|                  |     |   +- AES-256-GCM    |     |                   |
+------------------+     +---------------------+     +-------------------+
         |                        |
         v                        v
+------------------------------------------+
|           PostgreSQL (Prisma)            |
|  User (2FA 필드 + SSO 필드 확장)          |
|  Account (OAuth 토큰)                    |
|  AuditLog (2FA/SSO 이벤트)               |
+------------------------------------------+
```

**핵심 설계 결정:**

1. **서비스 분리**: 기존 `ServerAuthService`(658줄)에 2FA/SSO 로직을 추가하면 단일 책임 원칙 위반. `TwoFactorService`, `SsoCallbackService`, `LicenseService`로 분리한다.
2. **NestJS+Passport 유지**: 명세서가 Next-Auth를 언급하지만, 현재 코드베이스는 NestJS+Passport 기반이므로 이를 유지하고 새로운 Passport 전략을 추가한다.
3. **암호화 유틸리티 독립**: `EncryptionUtil`은 libs/server/crypto로 독립 모듈화하여 재사용성을 확보한다.
4. **Feature Flag 초기 구현**: License 서버 연동은 구독/과금 명세서(FN-029)와 함께 구현하므로, 현 단계에서는 환경변수 기반 Feature Flag + in-memory 캐시로 구현한다.

### 2.2 데이터 모델

**Prisma 스키마 변경:**

```prisma
// IdentityProvider enum 확장
enum IdentityProvider {
  EMAIL
  GOOGLE
  GITHUB
  AZUREAD    // 추가
  OPENID     // 추가
  SAML       // 추가
}

// User 모델 - 이미 존재하는 필드 (변경 불필요):
//   twoFactorSecret   String?
//   twoFactorEnabled   Boolean  @default(false)
//   backupCodes        String?
//   identityProvider   IdentityProvider @default(EMAIL)
//   identityProviderAccountId String?
```

현재 스키마에 `twoFactorSecret`, `twoFactorEnabled`, `backupCodes` 필드가 이미 존재하므로, **IdentityProvider enum에 3개 값을 추가하는 것**이 유일한 스키마 변경이다.

### 2.3 API 설계

**새로 추가되는 엔드포인트:**

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/auth/2fa/enable` | JWT 필수 | 2FA 활성화: TOTP Secret + Backup Code 생성 |
| POST | `/api/auth/2fa/disable` | JWT 필수 | 2FA 비활성화 |
| GET | `/api/auth/2fa/status` | JWT 필수 | 2FA 활성화 상태 조회 |
| GET | `/api/auth/feature-flags` | 없음 | Enterprise Feature Flag 조회 (2FA, SSO, SAML) |
| GET | `/api/auth/azure-ad` | 없음 | Azure AD OAuth 시작 |
| GET | `/api/auth/azure-ad/callback` | 없음 | Azure AD OAuth 콜백 |
| GET | `/api/auth/openid` | 없음 | OpenID Connect 시작 |
| GET | `/api/auth/openid/callback` | 없음 | OpenID Connect 콜백 |
| GET | `/api/auth/saml` | 없음 | SAML 시작 |
| GET | `/api/auth/saml/callback` | 없음 | SAML 콜백 |

**기존 엔드포인트 변경:**

| 메서드 | 경로 | 변경 내용 |
|--------|------|----------|
| POST | `/api/auth/login` | `totpCode`, `backupCode` 필드 지원 추가. 2FA 활성 사용자에 대해 "second factor required" 응답 |

**API 상세 - 2FA 활성화:**

```
POST /api/auth/2fa/enable
Headers: Authorization: Bearer <token>

Response 200:
{
  "secret": "JBSWY3DPEHPK3PXP...", // base32, 32자
  "qrCodeUri": "otpauth://totp/Inquiry:user@email.com?secret=...&issuer=Inquiry",
  "backupCodes": ["abcd-1234", "efgh-5678", ...]  // 10개
}

Response 400: { "message": "2FA is already enabled" }
Response 403: { "message": "Feature not available" }  // License 미보유
```

**API 상세 - 로그인 (2FA 흐름):**

```
POST /api/auth/login
Body: { "email": "...", "password": "..." }

// 2FA 활성 사용자의 첫 번째 요청 (totpCode 미제공)
Response 401:
{
  "errorCode": "second-factor-required",
  "message": "2단계 인증이 필요합니다."
}

// 두 번째 요청 (totpCode 또는 backupCode 포함)
POST /api/auth/login
Body: { "email": "...", "password": "...", "totpCode": "123456" }
  또는
Body: { "email": "...", "password": "...", "backupCode": "abcd-1234" }

Response 200: { "accessToken": "..." }
Response 401: { "errorCode": "invalid-two-factor-code", "message": "..." }
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 서버 - `libs/server/crypto` (새로 생성)

```typescript
// AES-256-GCM 암호화/복호화 유틸리티
export class EncryptionService {
  encrypt(plaintext: string): string;   // iv:authTag:ciphertext (hex)
  decrypt(encrypted: string): string;
}
```

- `ENCRYPTION_KEY` 환경변수에서 키를 읽어 AES-256-GCM으로 암호화/복호화
- iv(초기화 벡터)는 매 암호화마다 랜덤 생성
- 결과 형식: `{iv}:{authTag}:{ciphertext}` (모두 hex)

#### 2.4.2 서버 - `libs/server/auth` 내 `TwoFactorService`

```typescript
@Injectable()
export class TwoFactorService {
  // TOTP Secret 생성 (base32, 32자)
  generateTotpSecret(email: string): { secret: string; qrCodeUri: string };

  // TOTP 코드 검증 (window: delta -1 ~ 0)
  verifyTotpCode(encryptedSecret: string, code: string): boolean;

  // Backup Code 10개 생성
  generateBackupCodes(): string[];

  // Backup Code 검증 및 소진 처리
  verifyBackupCode(encryptedBackupCodes: string, code: string): {
    valid: boolean;
    updatedEncryptedCodes: string | null;
  };

  // 2FA 활성화 (Secret + Backup Code 생성 및 암호화 저장)
  enableTwoFactor(userId: string): Promise<TwoFactorEnableResult>;

  // 2FA 비활성화 (Secret + Backup Code 삭제)
  disableTwoFactor(userId: string): Promise<void>;
}
```

#### 2.4.3 서버 - `libs/server/license` (새로 생성)

```typescript
@Injectable()
export class LicenseService {
  // Feature Flag 조회 (환경변수 기반 초기 구현)
  getFeatureFlags(): FeatureFlags;

  // 개별 Feature Flag 확인
  isTwoFactorEnabled(): boolean;
  isSsoEnabled(): boolean;
  isSamlEnabled(): boolean;
}

interface FeatureFlags {
  twoFactorAuth: boolean;
  sso: boolean;
  saml: boolean;
}
```

초기 구현: `ENTERPRISE_LICENSE_KEY` 환경변수 존재 여부 + 개별 Feature Flag 환경변수(`FEATURE_TWO_FACTOR_AUTH`, `FEATURE_SSO`, `FEATURE_SAML`)로 제어.

#### 2.4.4 서버 - SSO Passport 전략 추가

| 전략 | 파일 | 라이브러리 |
|------|------|-----------|
| Azure AD | `azure-ad.strategy.ts` | `passport-azure-ad` |
| OpenID | `openid.strategy.ts` | `openid-client` (passport 래퍼) |
| SAML | `saml.strategy.ts` | `@boxyhq/saml-jackson` |

각 전략은 기존 `google.strategy.ts`, `github.strategy.ts` 패턴을 따라 구현.

#### 2.4.5 서버 - `SsoCallbackService`

```typescript
@Injectable()
export class SsoCallbackService {
  // SSO Callback에서 사용자 매칭/생성 통합 처리
  async handleCallback(input: SsoCallbackInput): Promise<SsoCallbackResult>;

  // 시나리오 1: 기존 SSO 계정 존재
  private handleExistingSsoAccount(...);

  // 시나리오 2: 기존 이메일 사용자 존재
  private handleExistingEmailUser(...);

  // 시나리오 3: 완전한 신규 사용자
  private handleNewUser(...);

  // Provider별 사용자 이름 추출
  private extractUserName(provider: string, profile: any): string;
}
```

#### 2.4.6 클라이언트 - 2FA 관련 UI 컴포넌트

| 컴포넌트 | 파일 위치 | 설명 |
|---------|----------|------|
| `TwoFactorForm` | `libs/client/auth/src/lib/two-factor-form.tsx` | TOTP 6자리 코드 입력 + Backup Code 전환 |
| `BackupCodeForm` | `libs/client/auth/src/lib/backup-code-form.tsx` | Backup Code 입력 |
| `TwoFactorSetup` | `libs/client/auth/src/lib/two-factor-setup.tsx` | QR 코드 표시 + Backup Code 목록 |
| `TwoFactorSettings` | `libs/client/auth/src/lib/two-factor-settings.tsx` | 2FA 활성화/비활성화 토글 |

#### 2.4.7 클라이언트 - SSO 버튼 확장

기존 `SocialLoginButtons` 컴포넌트를 확장하여 Feature Flag에 따라 Azure AD, OpenID, SAML 버튼을 동적으로 표시한다.

### 2.5 기존 시스템 영향도 분석

| 파일/모듈 | 변경 유형 | 영향도 | 설명 |
|----------|----------|--------|------|
| `packages/db/prisma/schema.prisma` | 수정 | 중 | IdentityProvider enum에 3개 값 추가 |
| `libs/server/auth/src/lib/server-auth.service.ts` | 수정 | 높 | `validateUser`에 2FA 검증 로직 통합, `validateOAuthUser`에 SSO Callback 로직 통합 |
| `libs/server/auth/src/lib/server-auth.module.ts` | 수정 | 중 | 새 전략/서비스 등록 |
| `libs/server/auth/src/lib/server-auth.controller.ts` | 수정 | 높 | 2FA/SSO 엔드포인트 추가 |
| `libs/server/auth/src/lib/dto/login.dto.ts` | 수정 | 낮 | `totpCode`, `backupCode` 필드 추가 |
| `libs/server/auth/src/lib/strategies/local.strategy.ts` | 수정 | 중 | 2FA "second factor required" 처리 |
| `libs/server/auth/src/index.ts` | 수정 | 낮 | 새 모듈 export 추가 |
| `libs/server/auth/package.json` | 수정 | 낮 | `otplib`, `qrcode` 등 의존성 추가 |
| `apps/server/src/app/app.module.ts` | 수정 | 낮 | LicenseModule, CryptoModule import 추가 |
| `libs/client/auth/src/lib/login-form.tsx` | 수정 | 높 | 2FA 입력 단계 추가 |
| `libs/client/auth/src/lib/social-login-buttons.tsx` | 수정 | 중 | SSO Provider 버튼 동적 표시 |
| `libs/client/core/src/lib/auth-context.tsx` | 수정 | 높 | login 함수에 2FA two-step 흐름 지원 |
| `apps/client/src/app/i18n/locales/*/translation.json` | 수정 | 낮 | 2FA/SSO 관련 번역 키 추가 |
| `.env.example` | 수정 | 낮 | 새 환경변수 문서화 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 태스크명 | 설명 | 선행 태스크 | 복잡도 | 예상 시간 |
|-----|---------|------|-----------|--------|----------|
| **M1: 인프라/기반** | | | | | |
| 1.1 | DB 스키마 확장 | IdentityProvider enum에 AZUREAD, OPENID, SAML 추가 + 마이그레이션 | 없음 | 낮 | 0.5h |
| 1.2 | 암호화 모듈 생성 | `libs/server/crypto` - AES-256-GCM 암호화/복호화 서비스 | 없음 | 중 | 2h |
| 1.3 | License/Feature Flag 모듈 생성 | `libs/server/license` - 환경변수 기반 Feature Flag 서비스 | 없음 | 중 | 2h |
| 1.4 | 환경변수 추가 | `.env.example`에 `ENCRYPTION_KEY`, SSO Provider 환경변수, Feature Flag 환경변수 추가 | 없음 | 낮 | 0.5h |
| 1.5 | AppModule 업데이트 | CryptoModule, LicenseModule import | 1.2, 1.3 | 낮 | 0.5h |
| **M2: 2FA 서버 구현** | | | | | |
| 2.1 | TwoFactorService 생성 | TOTP Secret 생성, 검증, Backup Code 생성/검증/소진 | 1.2 | 높 | 4h |
| 2.2 | LoginDto 확장 | `totpCode`, `backupCode` 선택적 필드 추가 | 없음 | 낮 | 0.5h |
| 2.3 | 로그인 흐름에 2FA 통합 | `validateUser`에서 2FA 활성 시 "second factor required" 반환, TOTP/Backup 검증 | 2.1, 2.2 | 높 | 3h |
| 2.4 | 2FA 활성화/비활성화 엔드포인트 | `POST /2fa/enable`, `POST /2fa/disable`, `GET /2fa/status` | 2.1, 1.3 | 중 | 2h |
| 2.5 | 2FA Audit Log 통합 | 2FA 활성화, 비활성화, 인증 성공/실패 이벤트 기록 | 2.3, 2.4 | 낮 | 1h |
| 2.6 | 2FA Feature Flag Guard | 엔드포인트에 License Feature Flag 검증 Guard 적용 | 1.3, 2.4 | 낮 | 1h |
| **M3: 2FA 클라이언트 구현** | | | | | |
| 3.1 | TwoFactorForm 컴포넌트 | TOTP 6자리 코드 입력 UI | 2.3 | 중 | 2h |
| 3.2 | BackupCodeForm 컴포넌트 | Backup Code 입력 UI | 2.3 | 중 | 1.5h |
| 3.3 | LoginForm 2FA 통합 | login 함수에 2FA two-step 흐름 연결 | 3.1, 3.2 | 높 | 2h |
| 3.4 | AuthContext 2FA 지원 | login 함수가 "second-factor-required" 응답 처리 | 3.3 | 중 | 1.5h |
| 3.5 | TwoFactorSetup 컴포넌트 | QR 코드 표시, Secret 문자열 복사, Backup Code 목록 | 2.4 | 중 | 2.5h |
| 3.6 | TwoFactorSettings 컴포넌트 | 2FA 설정 페이지 (활성화/비활성화 토글) | 3.5 | 중 | 2h |
| 3.7 | 보안 설정 페이지 라우트 | `/settings/security` 페이지 생성 | 3.6 | 낮 | 1h |
| 3.8 | i18n 키 추가 (2FA) | ko/en 번역 파일에 2FA 관련 키 추가 | 3.1~3.7 | 낮 | 1h |
| **M4: SSO 서버 구현** | | | | | |
| 4.1 | Azure AD Passport 전략 | `passport-azure-ad` 전략 구현 | 1.1, 1.3 | 중 | 2h |
| 4.2 | OpenID Connect Passport 전략 | `openid-client` 기반 전략 (PKCE + State) | 1.1, 1.3 | 높 | 3h |
| 4.3 | SAML Passport 전략 (골격) | BoxyHQ 기반 전략 골격 구현 (Self-hosted 전용) | 1.1, 1.3 | 높 | 3h |
| 4.4 | SSO Provider 동적 등록 | 환경변수 기반 Passport 전략 조건부 등록 | 4.1, 4.2, 4.3 | 중 | 2h |
| 4.5 | SsoCallbackService | 3가지 시나리오 처리 (기존SSO/기존이메일/신규) | 4.4 | 높 | 4h |
| 4.6 | SSO Controller 엔드포인트 | Azure AD, OpenID, SAML 라우트 추가 | 4.4, 4.5 | 중 | 2h |
| 4.7 | SSO Feature Flag Guard | SSO/SAML 엔드포인트에 Feature Flag Guard 적용 | 1.3, 4.6 | 낮 | 1h |
| 4.8 | SSO Audit Log 통합 | SSO 인증 시도, 사용자 프로비저닝 이벤트 기록 | 4.5 | 낮 | 1h |
| **M5: SSO 클라이언트 구현** | | | | | |
| 5.1 | SocialLoginButtons 확장 | Feature Flag 기반 SSO Provider 버튼 동적 표시 | 4.6, 1.3 | 중 | 2h |
| 5.2 | Feature Flag API 연동 | 클라이언트에서 Feature Flag 조회 훅 | 1.3 | 낮 | 1h |
| 5.3 | i18n 키 추가 (SSO) | ko/en 번역 파일에 SSO 관련 키 추가 | 5.1 | 낮 | 0.5h |
| **M6: 테스트 및 문서화** | | | | | |
| 6.1 | 암호화 모듈 단위 테스트 | 암호화/복호화 정합성, 키 누락 처리 | 1.2 | 낮 | 1h |
| 6.2 | TwoFactorService 단위 테스트 | TOTP 생성/검증, Backup Code 생성/검증/소진 | 2.1 | 중 | 2h |
| 6.3 | 로그인 2FA 통합 테스트 | 2FA 활성/비활성 사용자 로그인 E2E | 2.3 | 중 | 2h |
| 6.4 | SSO Callback 통합 테스트 | 3가지 시나리오 E2E | 4.5 | 중 | 2h |
| 6.5 | Feature Flag 단위 테스트 | 환경변수 조합별 Flag 반환값 검증 | 1.3 | 낮 | 1h |
| 6.6 | 구현 문서화 | `code-history/2026-02-22-2FA-SSO-implementation.md` | 전체 | 낮 | 1.5h |

**총 예상 시간: 약 60시간 (7.5인일)**

### 3.2 구현 순서 및 마일스톤

```
마일스톤 1: 인프라/기반 (M1) ---- 5.5h
  [1.1] DB 스키마 확장
  [1.2] 암호화 모듈 생성
  [1.3] License/Feature Flag 모듈 생성  (병렬)
  [1.4] 환경변수 추가                    (병렬)
  [1.5] AppModule 업데이트

  검증 포인트: 빌드 성공, 마이그레이션 적용, 암호화/복호화 테스트 통과

마일스톤 2: 2FA 서버 (M2) ---- 11.5h
  [2.1] TwoFactorService 생성
  [2.2] LoginDto 확장           (병렬)
  [2.3] 로그인 흐름 2FA 통합
  [2.4] 2FA 엔드포인트
  [2.5] Audit Log 통합
  [2.6] Feature Flag Guard

  검증 포인트: 빌드 성공, 2FA enable/disable API 동작,
             2FA 활성 사용자 로그인 시 "second factor required" 응답 확인

마일스톤 3: 2FA 클라이언트 (M3) ---- 13.5h
  [3.1] TwoFactorForm          [3.2] BackupCodeForm  (병렬)
  [3.3] LoginForm 2FA 통합
  [3.4] AuthContext 2FA 지원
  [3.5] TwoFactorSetup
  [3.6] TwoFactorSettings
  [3.7] 보안 설정 페이지
  [3.8] i18n 키 추가

  검증 포인트: 빌드 성공, 2FA 전체 흐름 E2E
             (활성화 -> QR코드 스캔 -> 로그인 시 TOTP 입력 -> 비활성화)

마일스톤 4: SSO 서버 (M4) ---- 18h
  [4.1] Azure AD 전략   [4.2] OpenID 전략   [4.3] SAML 전략 (병렬)
  [4.4] 동적 Provider 등록
  [4.5] SsoCallbackService
  [4.6] SSO 엔드포인트
  [4.7] Feature Flag Guard
  [4.8] Audit Log 통합

  검증 포인트: 빌드 성공, Azure AD/OpenID 인증 흐름 E2E,
             신규 사용자 프로비저닝 확인

마일스톤 5: SSO 클라이언트 (M5) ---- 3.5h
  [5.1] SocialLoginButtons 확장
  [5.2] Feature Flag 훅
  [5.3] i18n 키 추가

  검증 포인트: 빌드 성공, Feature Flag에 따른 SSO 버튼 표시/숨김 확인

마일스톤 6: 테스트 및 문서화 (M6) ---- 9.5h
  [6.1]~[6.5] 테스트   (병렬 가능)
  [6.6] 문서화

  검증 포인트: 전체 테스트 통과, 문서 완성
```

### 3.3 파일 수정 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|----------|----------|----------|
| **인프라/기반** | | |
| `packages/db/prisma/schema.prisma` | 수정 | IdentityProvider enum에 AZUREAD, OPENID, SAML 추가 |
| `libs/server/crypto/src/index.ts` | 생성 | 모듈 export |
| `libs/server/crypto/src/lib/crypto.module.ts` | 생성 | NestJS 암호화 모듈 정의 |
| `libs/server/crypto/src/lib/encryption.service.ts` | 생성 | AES-256-GCM 암호화/복호화 서비스 |
| `libs/server/crypto/package.json` | 생성 | 패키지 설정 |
| `libs/server/crypto/tsconfig.json` | 생성 | TS 설정 |
| `libs/server/crypto/tsconfig.lib.json` | 생성 | 라이브러리 TS 설정 |
| `libs/server/license/src/index.ts` | 생성 | 모듈 export |
| `libs/server/license/src/lib/license.module.ts` | 생성 | NestJS License 모듈 정의 |
| `libs/server/license/src/lib/license.service.ts` | 생성 | Feature Flag 서비스 |
| `libs/server/license/src/lib/feature-flag.guard.ts` | 생성 | Feature Flag Guard 데코레이터 |
| `libs/server/license/package.json` | 생성 | 패키지 설정 |
| `libs/server/license/tsconfig.json` | 생성 | TS 설정 |
| `libs/server/license/tsconfig.lib.json` | 생성 | 라이브러리 TS 설정 |
| `.env.example` | 수정 | 새 환경변수 추가 |
| `apps/server/src/app/app.module.ts` | 수정 | CryptoModule, LicenseModule import |
| `tsconfig.json` (루트) | 수정 | 새 라이브러리 경로 alias 추가 |
| `pnpm-workspace.yaml` | 수정 (확인 필요) | 새 패키지 경로 추가 (이미 `libs/**` 패턴이면 불필요) |
| **2FA 서버** | | |
| `libs/server/auth/src/lib/services/two-factor.service.ts` | 생성 | TOTP/Backup Code 비즈니스 로직 |
| `libs/server/auth/src/lib/dto/login.dto.ts` | 수정 | `totpCode`, `backupCode` 필드 추가 |
| `libs/server/auth/src/lib/dto/two-factor.dto.ts` | 생성 | 2FA 관련 DTO |
| `libs/server/auth/src/lib/server-auth.service.ts` | 수정 | `validateUser`에 2FA 분기 추가 |
| `libs/server/auth/src/lib/server-auth.controller.ts` | 수정 | 2FA 엔드포인트 추가 |
| `libs/server/auth/src/lib/server-auth.module.ts` | 수정 | TwoFactorService, CryptoModule import 추가 |
| `libs/server/auth/src/lib/strategies/local.strategy.ts` | 수정 | 2FA "second-factor-required" 에러 처리 |
| `libs/server/auth/src/index.ts` | 수정 | 새 서비스/Guard export |
| `libs/server/auth/package.json` | 수정 | `otplib` 의존성 추가 |
| **SSO 서버** | | |
| `libs/server/auth/src/lib/services/sso-callback.service.ts` | 생성 | SSO Callback 3가지 시나리오 처리 |
| `libs/server/auth/src/lib/strategies/azure-ad.strategy.ts` | 생성 | Azure AD Passport 전략 |
| `libs/server/auth/src/lib/strategies/openid.strategy.ts` | 생성 | OpenID Connect Passport 전략 |
| `libs/server/auth/src/lib/strategies/saml.strategy.ts` | 생성 | SAML/BoxyHQ Passport 전략 |
| `libs/server/auth/src/lib/guards/azure-ad-auth.guard.ts` | 생성 | Azure AD Auth Guard |
| `libs/server/auth/src/lib/guards/openid-auth.guard.ts` | 생성 | OpenID Auth Guard |
| `libs/server/auth/src/lib/guards/saml-auth.guard.ts` | 생성 | SAML Auth Guard |
| `libs/server/auth/package.json` | 수정 | `passport-azure-ad`, `openid-client`, `@boxyhq/saml-jackson` 추가 |
| **2FA 클라이언트** | | |
| `libs/client/auth/src/lib/two-factor-form.tsx` | 생성 | TOTP 코드 입력 UI |
| `libs/client/auth/src/lib/backup-code-form.tsx` | 생성 | Backup Code 입력 UI |
| `libs/client/auth/src/lib/two-factor-setup.tsx` | 생성 | QR 코드 + Backup Code 표시 |
| `libs/client/auth/src/lib/two-factor-settings.tsx` | 생성 | 2FA 설정 토글 UI |
| `libs/client/auth/src/lib/login-form.tsx` | 수정 | 2FA 입력 단계 통합 |
| `libs/client/auth/src/index.ts` | 수정 | 새 컴포넌트 export |
| `libs/client/auth/package.json` | 수정 | `qrcode.react` 의존성 추가 |
| `libs/client/core/src/lib/auth-context.tsx` | 수정 | login 함수에 2FA two-step 흐름 지원 |
| **SSO 클라이언트** | | |
| `libs/client/auth/src/lib/social-login-buttons.tsx` | 수정 | Feature Flag 기반 SSO 버튼 동적 표시 |
| `libs/client/core/src/lib/use-feature-flags.ts` | 생성 | Feature Flag 조회 훅 |
| `libs/client/core/src/index.ts` | 수정 | 새 훅 export |
| **라우트/페이지** | | |
| `apps/client/src/app/[lng]/settings/security/page.tsx` | 생성 | 보안 설정 페이지 |
| `apps/client/src/app/[lng]/settings/layout.tsx` | 생성 | 설정 레이아웃 |
| **i18n** | | |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | 2FA/SSO 번역 키 추가 |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | 2FA/SSO 번역 키 추가 |
| **문서화** | | |
| `code-history/2026-02-22-2FA-SSO-implementation.md` | 생성 | 구현 문서 |

---

## 4. 위험 및 완화 전략

| 위험 | 영향 | 발생 확률 | 완화 전략 |
|------|------|----------|----------|
| 기존 `ServerAuthService` 수정으로 인한 로그인 회귀 | 높 | 중 | `validateUser` 변경 전 기존 로그인 흐름에 대한 회귀 테스트 작성 후 수정. 2FA 로직은 별도 서비스로 분리하여 기존 코드 변경 최소화 |
| TOTP 시간 동기화 문제 | 중 | 낮 | window를 이전 1개(30초)로 설정하여 유연성 확보. 서버 NTP 동기화 확인 문서화 |
| ENCRYPTION_KEY 유출/분실 | 높 | 낮 | 환경변수 관리 가이드 문서화. 키 변경 시 기존 암호화 데이터 마이그레이션 스크립트 준비 |
| SSO Provider 환경변수 설정 복잡성 | 중 | 중 | `.env.example`에 각 Provider별 필수/선택 환경변수를 그룹화하여 명시. 설정 검증 로직 추가 |
| `passport-azure-ad` 라이브러리 호환성 | 중 | 중 | NestJS 11.x + Passport 0.7.x 환경에서 호환성 사전 검증. 대안으로 `openid-client` 통합 전략 사용 가능 |
| SAML/BoxyHQ 구현 복잡성 | 높 | 높 | SAML은 골격만 구현하고 전체 구현은 별도 마일스톤으로 분리. Self-hosted 전용이므로 Cloud 환경 영향 없음 |
| LoginDto에 필드 추가 시 기존 클라이언트 호환성 | 낮 | 낮 | `totpCode`, `backupCode`를 `@IsOptional()`로 선언하여 기존 요청과 완벽 호환 |
| License 서버 미구현 상태에서 Feature Flag 동작 | 중 | 높 | 환경변수 기반 Feature Flag로 초기 구현. License 서버 연동은 구독/과금 명세서 구현 시 전환 |
| QR 코드 라이브러리 SSR 호환성 | 낮 | 중 | `qrcode.react`는 클라이언트 전용 컴포넌트에서만 사용 (`'use client'` 지시어). dynamic import 적용 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 테스트 대상 | 테스트 항목 | 우선순위 |
|-----------|-----------|---------|
| `EncryptionService` | 암호화 후 복호화 시 원본 복원 | 높 |
| `EncryptionService` | ENCRYPTION_KEY 미설정 시 에러 발생 | 높 |
| `EncryptionService` | 다른 키로 복호화 시 실패 | 높 |
| `TwoFactorService.generateTotpSecret` | Secret 길이 32자, base32 형식 검증 | 높 |
| `TwoFactorService.verifyTotpCode` | 유효한 TOTP 코드 검증 성공 | 높 |
| `TwoFactorService.verifyTotpCode` | 만료된 TOTP 코드 검증 실패 | 높 |
| `TwoFactorService.verifyTotpCode` | 미래 시간 기반 코드 거부 (window 미래 = 0) | 높 |
| `TwoFactorService.generateBackupCodes` | 10개 코드 생성, 형식 검증 | 중 |
| `TwoFactorService.verifyBackupCode` | 유효한 Backup Code 검증 성공 + 소진 처리 | 높 |
| `TwoFactorService.verifyBackupCode` | 하이픈 유무 무관 비교 | 중 |
| `TwoFactorService.verifyBackupCode` | 이미 사용된(null) 코드 거부 | 중 |
| `TwoFactorService.verifyBackupCode` | 모든 코드 소진 시 에러 | 중 |
| `LicenseService.getFeatureFlags` | 환경변수 조합별 반환값 검증 | 중 |
| `LicenseService` | License Key 미설정 시 모든 Flag false | 중 |
| `SsoCallbackService.extractUserName` | Provider별 이름 추출 규칙 검증 | 중 |

### 5.2 통합 테스트

| 테스트 시나리오 | 테스트 항목 | 우선순위 |
|---------------|-----------|---------|
| 2FA 활성화 | POST /2fa/enable -> Secret + QR URI + Backup Codes 반환 | 높 |
| 2FA 활성화 | 이미 활성화된 상태에서 재요청 시 400 에러 | 중 |
| 2FA 활성화 | Feature Flag 비활성 시 403 에러 | 중 |
| 로그인 + 2FA | 2FA 활성 사용자: 비밀번호만 제출 -> "second-factor-required" 응답 | 높 |
| 로그인 + 2FA | 2FA 활성 사용자: 비밀번호 + 유효한 TOTP 코드 -> 토큰 발급 | 높 |
| 로그인 + 2FA | 2FA 활성 사용자: 비밀번호 + 잘못된 TOTP 코드 -> 401 에러 | 높 |
| 로그인 + Backup | 2FA 활성 사용자: 비밀번호 + Backup Code -> 토큰 발급 + 코드 소진 | 높 |
| 2FA 비활성화 | POST /2fa/disable -> Secret/Backup 삭제, 이후 로그인 시 2FA 불요 | 중 |
| SSO Callback | 시나리오 1: 기존 SSO 계정 -> 즉시 인증 | 높 |
| SSO Callback | 시나리오 2: 기존 이메일 사용자 -> 기존 계정 연결 | 높 |
| SSO Callback | 시나리오 3: 신규 사용자 -> User+Account+Membership 생성 | 높 |
| SSO Callback | Feature Flag 비활성 시 Callback 거부 | 중 |
| Feature Flag | GET /feature-flags -> 환경변수에 따른 정확한 Flag 반환 | 중 |

### 5.3 E2E 테스트 (해당하는 경우)

| 시나리오 | 흐름 |
|---------|------|
| 2FA 전체 흐름 | 로그인 -> 설정 페이지 -> 2FA 활성화 -> QR 코드 확인 -> 로그아웃 -> 재로그인 시 TOTP 입력 -> 대시보드 진입 |
| 2FA Backup Code 흐름 | 2FA 활성화 -> 로그아웃 -> 재로그인 -> "Backup Code 사용" 선택 -> Backup Code 입력 -> 대시보드 진입 |
| 2FA 비활성화 흐름 | 2FA 활성화 상태 -> 설정 페이지 -> 비활성화 -> 로그아웃 -> 재로그인 시 TOTP 불요 |
| SSO 로그인 | SSO 버튼 클릭 -> IdP 인증 -> Callback -> 대시보드 진입 (기존/신규 사용자) |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 설명 |
|------|------|
| License 서버 미연동 | 현 단계에서는 환경변수 기반 Feature Flag로 구현. 실제 License 서버 연동은 구독/과금(FN-029) 구현 시 전환 |
| Redis 미사용 | Feature Flag 캐싱에 Redis 대신 in-memory 캐시 사용. 멀티 인스턴스 환경에서는 인스턴스별 캐시 불일치 발생 가능 |
| SAML 골격 구현 | SAML/BoxyHQ는 골격만 구현. 전체 SAML IdP 설정 UI, 메타데이터 교환 등은 별도 작업 필요 |
| next-auth 미사용 | 명세서가 next-auth 4.24.12를 명시하나, 현재 코드베이스가 NestJS+Passport이므로 이를 유지. Next-Auth 전환은 별도 아키텍처 결정 필요 |
| 2FA Rate Limit | 기존 로그인 Rate Limit(10회/15분)을 그대로 적용. 2FA 전용 Rate Limit은 현재 미지원 |
| TOTP 앱 연동 테스트 | 자동화된 TOTP 검증 테스트는 `otplib`의 `authenticator.generate()`로 테스트 시간의 토큰을 생성하여 검증 |

### 6.2 향후 개선 가능 사항

| 항목 | 설명 |
|------|------|
| License 서버 통합 | 실제 License API 호출 + Memory/Redis 2단 캐시 + Grace Period + 지수 백오프 재시도 |
| WebAuthn/FIDO2 | 2FA 수단으로 하드웨어 보안 키 지원 추가 |
| 2FA 강제 정책 | 조직 관리자가 모든 멤버에게 2FA 활성화를 강제할 수 있는 정책 |
| Backup Code 재생성 | 기존 Backup Code를 무효화하고 새로 생성하는 기능 |
| SAML 설정 UI | 조직 관리자가 SAML IdP 설정(Entity ID, SSO URL, 인증서)을 UI에서 관리 |
| SSO JIT Provisioning 확장 | SCIM 프로토콜을 통한 자동 프로비저닝/디프로비저닝 |
| 2FA 복구 흐름 | Backup Code도 모두 소진된 경우의 계정 복구 흐름 (관리자 승인 등) |
| ENCRYPTION_KEY 회전 | 암호화 키 변경 시 기존 암호화 데이터 자동 마이그레이션 |

---

## 7. i18n 고려사항 (클라이언트 UI 변경)

### 추가/수정이 필요한 번역 키

```json
{
  "auth": {
    "two_factor": {
      "title": "2단계 인증",
      "enter_totp_code": "인증 앱의 6자리 코드를 입력하세요",
      "totp_placeholder": "000000",
      "verify": "인증",
      "verifying": "인증 중...",
      "use_backup_code": "백업 코드 사용",
      "use_totp_code": "TOTP 코드 입력으로 돌아가기",
      "enter_backup_code": "백업 코드를 입력하세요",
      "backup_placeholder": "xxxx-xxxx",
      "backup_hint": "하이픈은 포함하지 않아도 됩니다",
      "invalid_code": "잘못된 인증 코드입니다",
      "invalid_backup_code": "잘못된 백업 코드입니다",
      "no_backup_codes": "사용 가능한 백업 코드가 없습니다",
      "second_factor_required": "2단계 인증이 필요합니다"
    },
    "two_factor_setup": {
      "title": "2단계 인증 설정",
      "scan_qr": "인증 앱(Google Authenticator 등)으로 QR 코드를 스캔하세요",
      "manual_entry": "QR 코드를 스캔할 수 없나요?",
      "secret_label": "수동 입력 키",
      "copy_secret": "키 복사",
      "copied": "복사됨",
      "backup_codes_title": "백업 코드",
      "backup_codes_description": "이 코드를 안전한 곳에 보관하세요. 인증 앱에 접근할 수 없을 때 사용할 수 있습니다.",
      "copy_codes": "코드 복사",
      "done": "완료",
      "enable_button": "2FA 활성화",
      "disable_button": "2FA 비활성화",
      "enabled_status": "활성화됨",
      "disabled_status": "비활성화됨",
      "disable_confirm_title": "2FA 비활성화",
      "disable_confirm_message": "2단계 인증을 비활성화하시겠습니까? 보안이 약해질 수 있습니다.",
      "disable_confirm": "비활성화",
      "disable_cancel": "취소",
      "already_enabled": "이미 2FA가 활성화되어 있습니다",
      "not_enabled": "2FA가 활성화되어 있지 않습니다",
      "feature_unavailable": "이 기능은 Enterprise 라이선스가 필요합니다"
    },
    "social": {
      "google": "Google로 계속하기",
      "github": "GitHub로 계속하기",
      "azure_ad": "Azure AD로 계속하기",
      "openid": "OpenID로 계속하기",
      "saml": "SAML SSO로 계속하기"
    },
    "settings": {
      "security_title": "보안 설정",
      "two_factor_section": "2단계 인증 (2FA)"
    }
  }
}
```

모든 키는 `en/translation.json`(영어), `ko/translation.json`(한국어) 양쪽에 추가해야 한다.
