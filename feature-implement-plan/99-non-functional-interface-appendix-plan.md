# 기능 구현 계획: 비기능 요구사항 / 인터페이스 명세 / 부록 (FS-099)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

본 명세서(FS-099)는 개별 기능이 아닌 **횡단 관심사(Cross-cutting Concerns)**를 다룬다. 크게 세 범주로 나뉜다.

**비기능 요구사항 (NFR-001 ~ NFR-010):**
- NFR-001: 성능 - API 응답 2초 이내, 캐싱 전략(요청 단위/Redis/Memory), 페이지네이션 정책
- NFR-002: 가용성 - License Grace Period(3일), API Retry(지수 백오프 3회)
- NFR-003: 보안 - TLS 강제, 인증 체계, 비밀번호 정책, RBAC, Rate Limiting 상세
- NFR-004: GDPR 준수 - Hard delete, 데이터 격리, 동의 관리
- NFR-005: 브라우저 호환성 - Chrome/Firefox/Safari/Edge 최신 2버전, Shadow DOM
- NFR-006: 확장성 - 속성 키 150개, CSV 10,000건, Bulk 250건 한도
- NFR-007: 유지보수성 - ESLint/Prettier/SonarQube, TypeScript strict, Vitest/Playwright
- NFR-008: 로깅/모니터링 - Pino, Sentry, 감사 로그, 텔레메트리
- NFR-009: 국제화 - 14개 언어, i18next, ICU Message Format
- NFR-010: 데이터 무결성 - Zod 검증, DB 제약, Prisma 트랜잭션

**인터페이스 요구사항 (IFR-001 ~ IFR-011):**
- IFR-001: Client API - Environment ID 기반 공개 API
- IFR-002: Management API - API Key Bearer 인증 관리 API
- IFR-003: Webhook - Standard Webhooks 기반 이벤트 발송
- IFR-004: JavaScript SDK - `@formbricks/js` UMD + ESM 패키지
- IFR-005: GTM 통합
- IFR-006: Email Embed - 이메일 내 첫 질문 임베드
- IFR-007: Export - CSV/Excel 내보내기
- IFR-008: SSO - Google/GitHub/Azure AD/OIDC/SAML
- IFR-009: reCAPTCHA - 스팸 방지
- IFR-010: Stripe 결제
- IFR-011: Standard Webhooks 사양

**부록:**
- 기능-플랜 매트릭스 (Community vs Enterprise, Cloud 플랜별)
- Self-hosted 전용 기능
- 용어 사전 (40개 도메인 용어)
- 제약사항 (기술/법적/비용/운영)

### 1.2 비기능 요구사항

| 분류 | 핵심 지표 | 현재 상태 |
|------|----------|----------|
| 성능 | API 응답 2초, 설문 로딩 2초 | 미구현 (캐싱 인프라 없음) |
| 가용성 | 99.9% (Custom), Grace Period 3일 | 미구현 (License 시스템 없음) |
| 보안 | TLS, Rate Limiting, RBAC | 부분 구현 (Rate Limiting 기본 구조 존재) |
| GDPR | Hard delete, 데이터 격리 | 미구현 (Organization 격리 기본 구조만 존재) |
| 호환성 | 최신 2개 브라우저 | 미측정 |
| 확장성 | 속성 키 150, CSV 10K, Bulk 250 | 미구현 |
| 유지보수성 | ESLint/Prettier 설정 | Prettier 존재, ESLint/Vitest 미확인 |
| 모니터링 | Pino + Sentry | 미구현 |
| 국제화 | 14개 언어, i18next | 부분 구현 (ko/en 2개 언어) |
| 데이터 무결성 | Zod + Prisma 트랜잭션 | 부분 구현 (class-validator 사용 중, Zod 미도입) |

### 1.3 명세서 내 모호한 부분 및 해석

| 번호 | 모호한 부분 | 제안 해석 |
|------|-----------|----------|
| 1 | NFR-001의 "P95 기준 별도 정의 필요"라고만 언급 | MVP에서는 평균 2초 목표만 적용, P95는 모니터링 데이터 축적 후 별도 정의 |
| 2 | NFR-002 License API가 무엇을 가리키는지 불명확 | Enterprise License 검증을 위한 외부 라이선스 서버 API로 해석. 현재 프로젝트에는 License 시스템이 없으므로 인프라 정의만 선행 |
| 3 | NFR-003에서 "Redis URL 환경변수 설정 필수"인데, 현재 .env에 Redis 설정이 없음 | Redis 인프라 도입을 선행 작업으로 추가 |
| 4 | NFR-007의 SonarQube 도입 범위 불명확 | CI/CD 파이프라인 구축 시점에 SonarQube 통합으로 연기. 본 계획에서는 ESLint + Prettier 강화에 집중 |
| 5 | NFR-008의 Pino 도입 vs NestJS 기본 Logger | NestJS의 기본 Logger를 Pino 기반으로 교체하여 구조화된 JSON 로그 출력 |
| 6 | NFR-010에서 Zod를 요구하지만 현재 class-validator 사용 중 | 점진적 마이그레이션 전략 채택 - 신규 코드는 Zod, 기존 코드는 class-validator 유지 후 점진 전환 |
| 7 | IFR-001~002의 v1/v2 엔드포인트 공존 정책 불명확 | v2를 기본 구현 대상으로 하되, v1 호환 라우팅 구조를 설계에 포함 |
| 8 | IFR-004 SDK 패키지가 현재 모노레포에 없음 | SDK는 별도 FS-007에서 상세 구현. 본 계획에서는 인터페이스 계약 정의만 포함 |
| 9 | IFR-008의 next-auth 4.24.12 언급이나 프로젝트는 NestJS 기반 JWT 인증 | 현재 NestJS Passport 기반 인증을 유지하고, SSO 프로바이더 추가는 Passport Strategy 확장으로 구현 |
| 10 | 명세서에서 RBAC 역할로 `billing`을 정의하나 기존 스키마에는 없음 | MembershipRole enum에 BILLING 역할 추가를 스키마 변경 계획에 포함 |

### 1.4 암묵적 요구사항

| 번호 | 암묵적 요구사항 | 도출 근거 |
|------|--------------|----------|
| 1 | **Redis 인프라 도입** | NFR-001 캐싱, NFR-003 Rate Limiting, NFR-002 Grace Period 모두 Redis 의존 |
| 2 | **환경변수 체계 재설계** | 20+ 신규 환경변수 필요 (Redis, Sentry, Stripe, SSO 프로바이더, reCAPTCHA 등) |
| 3 | **에러 응답 표준화** | NFR-003/010에서 HTTP 상태 코드별 응답 포맷을 정의하나, 현재 통일된 에러 응답 포맷이 없음 |
| 4 | **API 버전 라우팅 구조** | IFR-001/002에서 v1/v2 엔드포인트 체계를 요구 |
| 5 | **License 체크 모듈** | NFR-002의 Grace Period, Community/Enterprise 기능 분기 등에 필수 |
| 6 | **Feature Flag 시스템** | 기능-플랜 매트릭스의 License Flag 기반 기능 활성/비활성 제어 |
| 7 | **Zod 유효성 검증 유틸리티** | NFR-010에서 Zod 기반 검증을 명시하지만 현재 class-validator 사용 중 |
| 8 | **Health Check 엔드포인트** | NFR-002 가용성 모니터링을 위해 필수 |
| 9 | **CORS 정책 강화** | NFR-003 보안 요구에 따라 허용 Origin 목록 관리 필요 |
| 10 | **Prisma 스키마 확장** | Project, Environment, ApiKey, Survey 등 핵심 모델이 현재 스키마에 없음 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

본 FS-099는 횡단 관심사이므로, 개별 기능 모듈이 아닌 **인프라 레이어와 공통 모듈**을 구축하는 것이 핵심이다.

```
                              [인프라 레이어]
  +-----------+  +---------+  +--------+  +---------+  +----------+
  | Redis     |  | Sentry  |  | Pino   |  | Zod     |  | Feature  |
  | Module    |  | Module  |  | Logger |  | Pipes   |  | Flag     |
  +-----------+  +---------+  +--------+  +---------+  +----------+
        |              |           |           |             |
        v              v           v           v             v
  +--------------------------------------------------------------------+
  |                    Application Server (NestJS)                      |
  |                                                                    |
  |  +------------------+  +-------------------+  +-----------------+  |
  |  | Rate Limit       |  | Auth Guards       |  | Validation      |  |
  |  | (Redis-backed)   |  | (JWT/API Key)     |  | (Zod Pipes)     |  |
  |  +------------------+  +-------------------+  +-----------------+  |
  |                                                                    |
  |  +------------------+  +-------------------+  +-----------------+  |
  |  | Error Filter     |  | License Check     |  | API Version     |  |
  |  | (표준화 응답)     |  | (Grace Period)    |  | Router          |  |
  |  +------------------+  +-------------------+  +-----------------+  |
  +--------------------------------------------------------------------+
        |                         |                        |
        v                         v                        v
  [PostgreSQL (Prisma)]     [Redis Cache]           [외부 서비스]
                                                   (Stripe, SSO, SMTP)
```

**주요 설계 원칙:**
1. 기존 NestJS 모듈 패턴(`libs/server/`)을 그대로 따름
2. 횡단 관심사는 Guard, Interceptor, Filter, Pipe로 구현
3. Redis는 별도 모듈로 분리하여 Rate Limiting과 캐싱이 공유
4. Feature Flag은 License 모듈과 환경변수 기반으로 구현

### 2.2 데이터 모델

#### 2.2.1 Prisma 스키마 변경사항

**MembershipRole enum 확장:**
```prisma
enum MembershipRole {
  OWNER
  ADMIN     // 기존 ADMIN을 MANAGER로 개칭 검토 (명세서에서 manager로 정의)
  MEMBER
  BILLING   // 신규 추가: 빌링 정보만 접근 가능
}
```

> 참고: 명세서에서 역할을 owner/manager/member/billing으로 정의하나, 기존 스키마는 OWNER/ADMIN/MEMBER이다. ADMIN -> MANAGER 변경은 하위 호환성 영향이 크므로, ADMIN을 MANAGER와 동일 권한으로 유지하고 BILLING만 신규 추가하는 것을 권장한다.

**ApiKey 모델 (신규):**
```prisma
model ApiKey {
  id            String    @id @default(cuid())
  label         String
  hashedKey     String    @unique   // API Key 해시값 (원본 키는 생성 시 1회만 표시)
  environmentId String
  lastUsedAt    DateTime?
  expiresAt     DateTime?
  createdAt     DateTime  @default(now())

  @@index([hashedKey])
  @@map("api_keys")
}
```

> 참고: ApiKey 모델의 environmentId는 Environment 모델이 FS-006에서 구현된 이후에 FK 관계를 설정한다. 현 단계에서는 모델 정의와 인터페이스만 선행한다.

#### 2.2.2 환경변수 확장 (.env)

```bash
# === Redis (NFR-001, NFR-003) ===
REDIS_URL="redis://localhost:6379"
RATE_LIMIT_DISABLED=false           # Rate Limiting 비활성화 (개발용)

# === Sentry (NFR-008) ===
SENTRY_DSN=""
SENTRY_ENVIRONMENT="development"

# === Encryption (NFR-003) ===
ENCRYPTION_KEY=""                   # AES 암호화 키

# === License (NFR-002) ===
LICENSE_KEY=""                      # Enterprise License Key
LICENSE_API_URL=""                  # License 검증 서버 URL

# === Stripe (IFR-010) ===
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# === SSO (IFR-008) ===
AZURE_AD_CLIENT_ID=""
AZURE_AD_CLIENT_SECRET=""
AZURE_AD_TENANT_ID=""
OIDC_CLIENT_ID=""
OIDC_CLIENT_SECRET=""
OIDC_ISSUER=""

# === reCAPTCHA (IFR-009) ===
RECAPTCHA_SITE_KEY=""
RECAPTCHA_SECRET_KEY=""

# === 텔레메트리 (NFR-008) ===
TELEMETRY_DISABLED=false

# === 법적 고지 (NFR-004) ===
PRIVACY_POLICY_URL=""
TERMS_OF_SERVICE_URL=""
```

### 2.3 API 설계

#### 2.3.1 API 버전 라우팅 구조

```
/api/v1/client/{environmentId}/...     # Client API v1 (레거시)
/api/v2/client/{environmentId}/...     # Client API v2
/api/v1/management/...                 # Management API v1 (레거시)
/api/v2/management/...                 # Management API v2
/api/auth/...                          # 인증 (기존 유지)
/api/health                            # Health Check
```

#### 2.3.2 표준 에러 응답 포맷

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "요청 데이터 검증에 실패했습니다.",
  "details": [
    {
      "field": "email",
      "message": "올바른 이메일 형식이 아닙니다."
    }
  ],
  "timestamp": "2026-02-22T12:00:00.000Z",
  "path": "/api/v2/management/surveys"
}
```

#### 2.3.3 표준 페이지네이션 응답 포맷

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 30,
    "hasMore": true
  }
}
```

#### 2.3.4 Health Check 엔드포인트

```
GET /api/health

Response 200:
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

#### 2.3.5 Rate Limiting 응답 헤더

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1708599600
Retry-After: 60           // 429 응답 시에만
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 Redis 모듈 (`libs/server/redis`)

```typescript
// redis.module.ts
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}

// redis.service.ts
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  async get(key: string): Promise<string | null>;
  async set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  async del(key: string): Promise<void>;
  async exists(key: string): Promise<boolean>;
}
```

**설계 근거:** Rate Limiting(NFR-003), 캐싱(NFR-001), License Grace Period(NFR-002) 모두 Redis에 의존하므로 공통 모듈로 분리한다.

#### 2.4.2 Rate Limiting 강화 (`libs/server/rate-limit`)

현재 `@nestjs/throttler` 기반 기본 구조가 있다. 이를 Redis 스토리지 백엔드로 교체하고, 엔드포인트별 세분화된 Rate Limiting을 추가한다.

```typescript
// rate-limit.module.ts 개선
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redis: RedisService) => ({
        throttlers: [
          { name: 'default', ttl: 60000, limit: 100 },
        ],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
  ],
})
export class RateLimitModule {}
```

**신규 데코레이터 추가:**
```typescript
// rate-limit.decorators.ts 확장
/** Management API: 분당 100회 */
export function ManagementApiRateLimit() { ... }

/** Client API: 분당 100회 */
export function ClientApiRateLimit() { ... }

/** 이메일 업데이트: 시간당 3회 */
export function EmailUpdateRateLimit() { ... }

/** 파일 업로드: 분당 5회 */
export function FileUploadRateLimit() { ... }

/** 파일 삭제: 분당 5회 */
export function FileDeleteRateLimit() { ... }

/** 라이선스 재확인: 분당 5회 */
export function LicenseCheckRateLimit() { ... }
```

#### 2.4.3 표준 에러 필터 (`libs/server/core`)

```typescript
// http-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // 모든 예외를 표준 응답 포맷으로 변환
    // Zod 검증 에러 -> 400 + details 배열
    // Prisma Unique 위반 -> 409 Conflict
    // Throttler 에러 -> 429 + Retry-After 헤더
  }
}
```

#### 2.4.4 Zod 검증 파이프 (`libs/server/core`)

```typescript
// zod-validation.pipe.ts
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: '요청 데이터 검증에 실패했습니다.',
        details: result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
```

**설계 근거:** NFR-010에서 Zod 기반 검증을 명시한다. 기존 class-validator(`ValidationPipe`)와 공존할 수 있도록 Pipe 단위로 적용한다.

#### 2.4.5 Pino 로거 (`libs/server/logger`)

```typescript
// logger.module.ts
@Global()
@Module({
  providers: [
    {
      provide: 'PINO_LOGGER',
      useFactory: () => pino({
        level: process.env['LOG_LEVEL'] || 'info',
        transport: process.env['NODE_ENV'] !== 'production'
          ? { target: 'pino-pretty' }
          : undefined,
      }),
    },
    PinoLoggerService,
  ],
  exports: [PinoLoggerService],
})
export class LoggerModule {}
```

#### 2.4.6 Sentry 모듈 (`libs/server/sentry`)

```typescript
// sentry.module.ts
@Global()
@Module({
  providers: [SentryService],
  exports: [SentryService],
})
export class SentryModule {}

// sentry.service.ts
@Injectable()
export class SentryService implements OnModuleInit {
  onModuleInit() {
    const dsn = process.env['SENTRY_DSN'];
    if (!dsn) return; // Sentry 미설정 시 no-op
    Sentry.init({ dsn, environment: process.env['SENTRY_ENVIRONMENT'] });
  }

  captureException(error: Error, context?: Record<string, unknown>): void;
  captureMessage(message: string, level?: Sentry.SeverityLevel): void;
}
```

#### 2.4.7 Feature Flag / License 모듈 (`libs/server/license`)

```typescript
// license.service.ts
@Injectable()
export class LicenseService {
  // Memory Cache (1분 TTL)
  private memoryCache: Map<string, { data: LicenseResult; expiry: number }>;

  /**
   * License 체크 흐름 (NFR-001-BR-02):
   * 1. Memory Cache(1분) 확인
   * 2. Redis Cache(24시간) 확인
   * 3. License API 호출 (Retry 3회, 지수 백오프)
   * 4. 실패 시 Grace Period 적용
   */
  async checkLicense(): Promise<LicenseResult>;

  /** 특정 Enterprise 기능이 활성화되어 있는지 확인 */
  isFeatureEnabled(flag: LicenseFlag): boolean;
}

type LicenseFlag =
  | 'contacts'
  | 'twoFactorAuth'
  | 'sso'
  | 'saml'
  | 'removeBranding'
  | 'whitelabel'
  | 'multiLanguageSurveys'
  | 'accessControl'
  | 'isMultiOrgEnabled'
  | 'spamProtection'
  | 'ai'
  | 'auditLogs'
  | 'quotas'
  | 'projects';
```

#### 2.4.8 페이지네이션 유틸리티 (`libs/server/core`)

```typescript
// pagination.ts
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

/** 페이지 크기 기본값 (NFR-001) */
export const DEFAULT_PAGE_SIZES = {
  general: 30,
  surveys: 12,
  responses: 25,
} as const;

export function createPaginatedQuery(options: PaginationOptions, type: keyof typeof DEFAULT_PAGE_SIZES);
```

### 2.5 기존 시스템 영향 분석

| 기존 모듈 | 영향 | 변경 내용 |
|----------|------|----------|
| `libs/server/rate-limit` | **높음** | Redis 스토리지 백엔드 교체, 신규 데코레이터 추가, ThrottlerGuard 강화 |
| `libs/server/auth` | **중간** | Rate Limiting 데코레이터 적용 확인, API Key 인증 Guard 신규 추가 |
| `libs/server/prisma` | **낮음** | 스키마 변경(BILLING 역할, ApiKey 모델), 서비스 코드 변경 없음 |
| `libs/server/email` | **낮음** | 변경 없음 (기존 패턴 유지) |
| `libs/server/audit-log` | **낮음** | 변경 없음 (Enterprise 플래그 체크만 추가 가능) |
| `libs/client/core` | **중간** | 표준 에러 응답 파싱 유틸리티 추가 |
| `libs/client/ui` | **낮음** | 변경 없음 |
| `apps/server/main.ts` | **높음** | GlobalExceptionFilter, Pino Logger 교체, Sentry 초기화 추가 |
| `apps/server/app.module.ts` | **높음** | Redis, Logger, Sentry, License 모듈 임포트 추가 |
| `apps/client/middleware.ts` | **낮음** | 변경 없음 (추후 i18n 언어 확장 시 수정) |
| `.env.example` | **높음** | 20+ 신규 환경변수 추가 |
| `docker-compose.yml` | **중간** | Redis 서비스 추가 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|----------|
| **M1: 인프라 기반** | | | | | |
| 1.1 | Redis 인프라 도입 | docker-compose에 Redis 추가, 환경변수 설정 | 없음 | 낮음 | 0.5h |
| 1.2 | Redis 공통 모듈 생성 | `libs/server/redis` - RedisService, RedisModule | 1.1 | 중간 | 2h |
| 1.3 | 환경변수 체계 재설계 | .env.example 확장, 환경변수 검증 유틸리티 | 없음 | 낮음 | 1h |
| 1.4 | Zod 의존성 도입 | zod 패키지 설치, 환경변수 스키마 정의 | 1.3 | 낮음 | 1h |
| **M2: 코어 인프라 모듈** | | | | | |
| 2.1 | 서버 Core 라이브러리 생성 | `libs/server/core` - 공통 유틸리티, 타입, 상수 | 없음 | 낮음 | 1h |
| 2.2 | 표준 에러 응답 필터 | GlobalExceptionFilter (Zod, Prisma, Throttler 에러 처리) | 2.1 | 중간 | 3h |
| 2.3 | Zod 검증 파이프 | ZodValidationPipe + 공용 스키마 유틸리티 | 1.4, 2.1 | 중간 | 2h |
| 2.4 | 페이지네이션 유틸리티 | PaginationOptions, PaginatedResult, createPaginatedQuery | 2.1 | 낮음 | 1.5h |
| 2.5 | API 버전 라우팅 구조 | v1/v2 모듈 분리 패턴, 공통 인터페이스 | 2.1 | 중간 | 2h |
| **M3: Rate Limiting 강화** | | | | | |
| 3.1 | Rate Limiting Redis 스토리지 | ThrottlerStorageRedisService 구현 | 1.2 | 중간 | 2h |
| 3.2 | Rate Limiting 모듈 리팩토링 | Redis 스토리지 백엔드로 교체, 환경변수 비활성화 지원 | 3.1 | 중간 | 2h |
| 3.3 | 신규 Rate Limiting 데코레이터 | Management API, Client API, 파일 업로드/삭제, 라이선스 등 | 3.2 | 낮음 | 1.5h |
| 3.4 | Rate Limiting 응답 헤더 | X-RateLimit-* 헤더, Retry-After 헤더 | 3.2 | 낮음 | 1h |
| **M4: 로깅 및 모니터링** | | | | | |
| 4.1 | Pino 로거 모듈 생성 | `libs/server/logger` - PinoLoggerService, NestJS Logger 교체 | 2.1 | 중간 | 2.5h |
| 4.2 | Sentry 모듈 생성 | `libs/server/sentry` - SentryService, 에러 자동 보고 | 2.1 | 중간 | 2h |
| 4.3 | GlobalExceptionFilter에 Sentry 통합 | 미처리 예외 Sentry 자동 보고 | 2.2, 4.2 | 낮음 | 1h |
| **M5: 보안 강화** | | | | | |
| 5.1 | API Key 인증 Guard | ApiKeyGuard - Bearer 토큰 검증, Environment 스코프 | 2.1 | 중간 | 2.5h |
| 5.2 | API Key CRUD 서비스 | ApiKey 생성/조회/폐기, 해시 저장 | 5.1 | 중간 | 2h |
| 5.3 | Prisma 스키마 - ApiKey 모델 추가 | ApiKey 모델, MembershipRole BILLING 추가 | 없음 | 낮음 | 1h |
| 5.4 | RBAC 강화 | RolesGuard에 BILLING 역할 추가, 권한 체크 유틸리티 | 5.3 | 중간 | 2h |
| **M6: License 및 Feature Flag** | | | | | |
| 6.1 | License 모듈 생성 | `libs/server/license` - LicenseService, LicenseModule | 1.2, 2.1 | 높음 | 4h |
| 6.2 | License API Retry 로직 | 지수 백오프 3회 재시도 (1s -> 2s -> 4s) | 6.1 | 중간 | 2h |
| 6.3 | Grace Period 구현 | Redis 캐시 기반 3일 유예, 이전 결과 4일 TTL | 6.1, 1.2 | 높음 | 3h |
| 6.4 | Feature Flag Guard | LicenseGuard - Enterprise 기능 접근 제어 데코레이터 | 6.1 | 중간 | 2h |
| **M7: 데이터 무결성** | | | | | |
| 7.1 | Zod 공용 스키마 라이브러리 | `libs/shared/schemas` - 공통 Zod 스키마 (이메일, 비밀번호 등) | 1.4 | 중간 | 2h |
| 7.2 | 환경변수 Zod 검증 | 서버 부트스트랩 시 환경변수 검증 | 7.1 | 낮음 | 1.5h |
| 7.3 | 트랜잭션 헬퍼 유틸리티 | Prisma $transaction 래퍼 + 에러 핸들링 | 2.1 | 낮음 | 1h |
| **M8: Health Check 및 기타** | | | | | |
| 8.1 | Health Check 엔드포인트 | /api/health - DB, Redis 연결 상태 확인 | 1.2 | 낮음 | 1.5h |
| 8.2 | 텔레메트리 서비스 | 익명 사용 통계 수집 (환경변수 비활성화 가능) | 2.1 | 낮음 | 1.5h |
| 8.3 | AppModule 통합 | 모든 신규 모듈 AppModule에 임포트 | 전체 | 낮음 | 1h |
| **M9: 클라이언트 공통** | | | | | |
| 9.1 | 클라이언트 에러 처리 유틸리티 | 표준 에러 응답 파싱, 토스트 메시지 매핑 | 2.2 | 낮음 | 1.5h |
| 9.2 | API Retry 유틸리티 (클라이언트) | fetch 래퍼에 지수 백오프 재시도 추가 | 9.1 | 중간 | 2h |
| **M10: 테스트 인프라** | | | | | |
| 10.1 | Vitest 설정 | 서버/클라이언트 Vitest 설정 파일 | 없음 | 중간 | 2h |
| 10.2 | Redis 모듈 단위 테스트 | RedisService mock 및 테스트 | 1.2, 10.1 | 낮음 | 1.5h |
| 10.3 | Rate Limiting 통합 테스트 | 엔드포인트별 Rate Limiting 검증 | 3.2, 10.1 | 중간 | 2h |
| 10.4 | 에러 필터 단위 테스트 | GlobalExceptionFilter 동작 검증 | 2.2, 10.1 | 낮음 | 1.5h |
| 10.5 | Playwright 기본 설정 | E2E 테스트 환경 구성 (Chromium) | 없음 | 중간 | 2h |

### 3.2 구현 순서 및 마일스톤

```
마일스톤 1: 인프라 기반 (M1)
  1.1 -> 1.2 -> 1.3 -> 1.4
  검증: Redis 연결, 환경변수 검증 통과
  빌드 확인 포인트

마일스톤 2: 코어 인프라 모듈 (M2)
  2.1 -> 2.2 -> 2.3 -> 2.4 -> 2.5
  검증: 에러 응답 포맷 통일, Zod 파이프 동작
  빌드 확인 포인트

마일스톤 3: Rate Limiting + 로깅 (M3 + M4, 병렬 가능)
  M3: 3.1 -> 3.2 -> 3.3 -> 3.4
  M4: 4.1 -> 4.2 -> 4.3
  검증: Rate Limiting Redis 백엔드 동작, Pino JSON 로그 출력, Sentry 에러 전송
  빌드 확인 포인트

마일스톤 4: 보안 + License (M5 + M6)
  M5: 5.3 -> 5.1 -> 5.2 -> 5.4
  M6: 6.1 -> 6.2 -> 6.3 -> 6.4
  검증: API Key 인증 동작, License 체크 + Grace Period 동작
  빌드 확인 포인트

마일스톤 5: 데이터 무결성 + 기타 (M7 + M8)
  M7: 7.1 -> 7.2 -> 7.3
  M8: 8.1 -> 8.2 -> 8.3
  검증: Health Check 200 OK, 환경변수 검증 부트스트랩
  빌드 확인 포인트

마일스톤 6: 클라이언트 + 테스트 (M9 + M10)
  M9: 9.1 -> 9.2
  M10: 10.1 -> (10.2, 10.3, 10.4 병렬) -> 10.5
  검증: 단위 테스트 전체 통과, E2E 기본 환경 실행
  최종 빌드 확인 포인트
```

### 3.3 파일 수정 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|----------|----------|----------|
| **인프라** | | |
| `docker-compose.yml` | 수정 | Redis 서비스 추가 |
| `.env.example` | 수정 | Redis, Sentry, Stripe, SSO, reCAPTCHA 등 20+ 환경변수 추가 |
| `package.json` | 수정 | zod, ioredis, pino, @sentry/node 등 의존성 추가 |
| `packages/db/prisma/schema.prisma` | 수정 | BILLING 역할, ApiKey 모델 추가 |
| **Redis 모듈** | | |
| `libs/server/redis/src/index.ts` | 생성 | 모듈 진입점 |
| `libs/server/redis/src/lib/redis.module.ts` | 생성 | RedisModule (@Global) |
| `libs/server/redis/src/lib/redis.service.ts` | 생성 | RedisService (ioredis 래퍼) |
| `libs/server/redis/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/server/redis/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/redis/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| **Core 모듈** | | |
| `libs/server/core/src/index.ts` | 생성 | 모듈 진입점 |
| `libs/server/core/src/lib/filters/http-exception.filter.ts` | 생성 | GlobalExceptionFilter |
| `libs/server/core/src/lib/pipes/zod-validation.pipe.ts` | 생성 | ZodValidationPipe |
| `libs/server/core/src/lib/utils/pagination.ts` | 생성 | 페이지네이션 유틸리티 |
| `libs/server/core/src/lib/utils/transaction.ts` | 생성 | Prisma 트랜잭션 헬퍼 |
| `libs/server/core/src/lib/constants/defaults.ts` | 생성 | 시스템 한도 상수 (페이지 크기, 속성 키 한도 등) |
| `libs/server/core/src/lib/interfaces/api-response.ts` | 생성 | 표준 응답 인터페이스 |
| `libs/server/core/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/server/core/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/core/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| **Rate Limiting 강화** | | |
| `libs/server/rate-limit/src/lib/rate-limit.module.ts` | 수정 | Redis 스토리지 백엔드로 교체 |
| `libs/server/rate-limit/src/lib/rate-limit.guard.ts` | 수정 | Rate Limiting 헤더 추가, 환경변수 비활성화 지원 |
| `libs/server/rate-limit/src/lib/rate-limit.decorators.ts` | 수정 | 신규 데코레이터 6개 추가 |
| `libs/server/rate-limit/src/lib/throttler-storage-redis.service.ts` | 생성 | Redis 기반 ThrottlerStorage 구현 |
| **Logger 모듈** | | |
| `libs/server/logger/src/index.ts` | 생성 | 모듈 진입점 |
| `libs/server/logger/src/lib/logger.module.ts` | 생성 | LoggerModule (@Global) |
| `libs/server/logger/src/lib/pino-logger.service.ts` | 생성 | Pino 기반 NestJS LoggerService |
| `libs/server/logger/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/server/logger/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/logger/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| **Sentry 모듈** | | |
| `libs/server/sentry/src/index.ts` | 생성 | 모듈 진입점 |
| `libs/server/sentry/src/lib/sentry.module.ts` | 생성 | SentryModule (@Global) |
| `libs/server/sentry/src/lib/sentry.service.ts` | 생성 | Sentry 에러 추적 서비스 |
| `libs/server/sentry/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/server/sentry/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/sentry/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| **License 모듈** | | |
| `libs/server/license/src/index.ts` | 생성 | 모듈 진입점 |
| `libs/server/license/src/lib/license.module.ts` | 생성 | LicenseModule (@Global) |
| `libs/server/license/src/lib/license.service.ts` | 생성 | License 체크, Grace Period, Feature Flag |
| `libs/server/license/src/lib/license.guard.ts` | 생성 | Enterprise 기능 접근 제어 Guard |
| `libs/server/license/src/lib/license.types.ts` | 생성 | LicenseResult, LicenseFlag 타입 |
| `libs/server/license/src/lib/retry.utils.ts` | 생성 | 지수 백오프 재시도 유틸리티 |
| `libs/server/license/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/server/license/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/license/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| **Shared Schemas** | | |
| `libs/shared/schemas/src/index.ts` | 생성 | 모듈 진입점 |
| `libs/shared/schemas/src/lib/common.schemas.ts` | 생성 | 이메일, 비밀번호, ID 등 공용 Zod 스키마 |
| `libs/shared/schemas/src/lib/env.schemas.ts` | 생성 | 환경변수 검증 스키마 |
| `libs/shared/schemas/src/lib/pagination.schemas.ts` | 생성 | 페이지네이션 요청 스키마 |
| `libs/shared/schemas/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/shared/schemas/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/shared/schemas/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| **Auth 모듈 확장** | | |
| `libs/server/auth/src/lib/guards/api-key-auth.guard.ts` | 생성 | API Key 인증 Guard |
| `libs/server/auth/src/lib/services/api-key.service.ts` | 생성 | API Key CRUD 서비스 |
| `libs/server/auth/src/lib/guards/roles.guard.ts` | 생성 | RBAC 역할 검증 Guard (BILLING 포함) |
| `libs/server/auth/src/lib/decorators/roles.decorator.ts` | 생성 | @Roles() 데코레이터 |
| `libs/server/auth/src/lib/decorators/require-license.decorator.ts` | 생성 | @RequireLicense() 데코레이터 |
| **서버 App 수정** | | |
| `apps/server/src/main.ts` | 수정 | Pino Logger, GlobalExceptionFilter, Sentry 초기화 |
| `apps/server/src/app/app.module.ts` | 수정 | Redis, Logger, Sentry, License, Core 모듈 임포트 |
| `apps/server/src/app/health/health.controller.ts` | 생성 | Health Check 엔드포인트 |
| `apps/server/src/app/health/health.module.ts` | 생성 | Health Check 모듈 |
| **클라이언트 수정** | | |
| `libs/client/core/src/lib/error.ts` | 생성 | 표준 에러 응답 파싱 유틸리티 |
| `libs/client/core/src/lib/api.ts` | 수정 | 지수 백오프 재시도 로직 추가 |
| **테스트** | | |
| `vitest.config.ts` (루트) | 생성 | Vitest 글로벌 설정 |
| `libs/server/redis/src/lib/__tests__/redis.service.spec.ts` | 생성 | Redis 서비스 단위 테스트 |
| `libs/server/core/src/lib/__tests__/http-exception.filter.spec.ts` | 생성 | 에러 필터 단위 테스트 |
| `libs/server/rate-limit/src/lib/__tests__/rate-limit.spec.ts` | 생성 | Rate Limiting 통합 테스트 |
| `libs/server/license/src/lib/__tests__/license.service.spec.ts` | 생성 | License 서비스 단위 테스트 |
| `playwright.config.ts` (루트) | 생성 | Playwright E2E 설정 |
| **Nx 설정** | | |
| `tsconfig.base.json` | 수정 | 신규 라이브러리 경로 매핑 추가 |
| `pnpm-workspace.yaml` | 수정 | 필요 시 libs/shared 경로 추가 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향도 | 발생 확률 | 완화 전략 |
|--------|--------|----------|----------|
| Redis 의존성 도입으로 개발 환경 복잡도 증가 | 중간 | 높음 | docker-compose에 Redis 포함, RATE_LIMIT_DISABLED 환경변수로 개발 시 Redis 없이 동작 가능하게 설계 |
| class-validator에서 Zod로의 마이그레이션 충돌 | 중간 | 중간 | 점진적 마이그레이션 - 기존 코드는 class-validator 유지, 신규 코드만 Zod 적용. 두 파이프가 공존할 수 있도록 설계 |
| @nestjs/throttler의 Redis 스토리지 커스텀 구현 복잡도 | 중간 | 중간 | `@nestjs/throttler-storage-redis` 공식 패키지 존재 여부 확인 후, 없으면 `ioredis` 기반 직접 구현. 인메모리 폴백 지원 |
| License API 외부 의존 - 개발/테스트 시 불가용 | 낮음 | 높음 | 개발 환경에서는 License 체크를 무조건 통과시키는 mock 모드 제공. LICENSE_KEY 미설정 시 Community Edition으로 동작 |
| Pino 로거 교체로 기존 NestJS Logger 호환성 문제 | 낮음 | 낮음 | NestJS의 `LoggerService` 인터페이스를 구현하여 기존 코드의 `Logger` 사용 패턴과 호환 유지 |
| Sentry DSN 미설정 시 에러 추적 누락 | 낮음 | 중간 | Sentry 미설정 시 no-op 패턴으로 동작. 기존 Logger에 에러 로깅은 유지 |
| 환경변수 20+ 추가로 인한 설정 관리 복잡도 | 중간 | 높음 | Zod 스키마로 부트스트랩 시 필수/선택 검증. .env.example에 그룹별 주석 및 기본값 명시 |
| Prisma 스키마 변경 시 마이그레이션 충돌 | 중간 | 낮음 | 다른 FS 구현과 스키마 변경이 겹치지 않도록, 본 계획의 스키마 변경은 BILLING 역할과 ApiKey만으로 최소화 |
| Feature Flag 로직이 여러 모듈에 분산되어 일관성 저하 | 중간 | 중간 | LicenseGuard 데코레이터로 선언적 접근. 서비스 레벨에서도 `LicenseService.isFeatureEnabled()` 메서드로 통일된 체크 포인트 제공 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 테스트 대상 | 프레임워크 | 핵심 검증 항목 |
|-----------|----------|--------------|
| `RedisService` | Vitest | 연결/해제, get/set/del, TTL 만료, 연결 실패 시 에러 핸들링 |
| `GlobalExceptionFilter` | Vitest | Zod 에러 -> 400, Prisma Unique -> 409, Throttler -> 429, 일반 에러 -> 500 포맷 검증 |
| `ZodValidationPipe` | Vitest | 스키마 통과/실패, 필드별 에러 메시지 매핑 |
| `LicenseService` | Vitest | Memory Cache -> Redis Cache -> API 호출 순서, Grace Period 로직, Feature Flag |
| `RetryUtils` | Vitest | 지수 백오프 간격 검증, 재시도 대상 HTTP 상태 코드 필터링, 최대 재시도 횟수 |
| `PaginationUtils` | Vitest | 기본 페이지 크기, 커서/오프셋 쿼리 생성, 범위 초과 처리 |
| `ApiKeyService` | Vitest | Key 생성/해시 저장, 해시 기반 조회, 만료 처리 |
| `apiFetch` (클라이언트) | Vitest | 401 자동 갱신, 429/502/503/504 재시도, 에러 응답 파싱 |

### 5.2 통합 테스트

| 테스트 대상 | 프레임워크 | 핵심 검증 항목 |
|-----------|----------|--------------|
| Rate Limiting 엔드포인트 | Vitest + NestJS Testing | 각 데코레이터별 한도 초과 시 429 응답 + Retry-After 헤더 |
| Health Check | Vitest + NestJS Testing | DB/Redis 정상 -> 200, DB 다운 -> 503 |
| API Key 인증 | Vitest + NestJS Testing | 유효 키 -> 200, 무효 키 -> 401, 범위 외 -> 403 |
| License Guard | Vitest + NestJS Testing | Enterprise 기능 활성 -> 통과, 비활성 -> 403 |
| 에러 응답 일관성 | Vitest + NestJS Testing | 다양한 에러 시나리오에서 표준 포맷 준수 검증 |

### 5.3 E2E 테스트

| 테스트 시나리오 | 프레임워크 | 핵심 검증 항목 |
|--------------|----------|--------------|
| 로그인 Rate Limiting | Playwright | 15분 내 10회 초과 시 UI 에러 메시지 표시 |
| API 에러 응답 표시 | Playwright | 서버 에러 시 클라이언트 토스트 메시지 표시 |
| Health Check 페이지 | Playwright (API 테스트) | /api/health 200 응답 검증 |

> 참고: E2E 테스트는 NFR-005에 따라 Chromium 기반으로만 실행한다.

---

## 6. 제약사항 및 향후 개선사항

### 6.1 알려진 제약사항

| 제약사항 | 상세 설명 |
|---------|----------|
| License API 미존재 | 현재 프로젝트에 Enterprise License 서버가 없으므로, License 모듈은 인터페이스만 정의하고 mock 모드로 동작 |
| IFR 인터페이스는 계약 정의만 | Client API, Management API, Webhook, SDK 등의 실제 엔드포인트 구현은 각 FS(FS-007, FS-008, FS-021, FS-024 등)에서 진행. 본 계획에서는 라우팅 구조와 인증 Guard만 준비 |
| 14개 언어 확장 미포함 | 현재 ko/en 2개 언어만 존재. 12개 추가 언어는 FS-030에서 구현 |
| Stripe 결제 구현 미포함 | IFR-010 Stripe 통합은 FS-029에서 상세 구현. 본 계획에서는 환경변수와 모듈 자리만 확보 |
| SSO 프로바이더 확장 미포함 | Azure AD, OIDC, SAML은 FS-002에서 상세 구현. 본 계획에서는 인증 Guard 구조만 준비 |
| `unstable_cache()` 사용 금지 | NFR-001에 따라 Next.js의 `unstable_cache()` 사용을 금지. 서버 측 캐싱은 Redis, 클라이언트 측은 React Query 등 별도 방안 사용 |
| Prisma `skip`/`offset` + `count` 동시 사용 금지 | 페이지네이션 구현 시 별도 쿼리로 총 건수를 조회해야 함 |

### 6.2 잠재적 향후 개선사항

| 개선 항목 | 설명 | 시점 |
|----------|------|------|
| P95 응답 시간 기준 정의 | 모니터링 데이터 축적 후 P95 목표값 설정 | 운영 데이터 확보 후 |
| SonarQube 통합 | CI/CD 파이프라인 구축 시 코드 품질 분석 자동화 | CI/CD 구축 시 |
| Redis Cluster 지원 | 단일 Redis에서 Cluster 구성으로 확장 | 트래픽 증가 시 |
| Rate Limiting 동적 설정 | 환경변수가 아닌 DB 기반 동적 Rate Limit 설정 | 관리자 UI 구현 시 |
| Webhook 재시도 메커니즘 | 현재 명세서에서는 자동 재시도 없음으로 정의. 추후 재시도 큐 도입 가능 | IFR-003 확장 시 |
| OpenTelemetry 통합 | Pino + Sentry를 넘어선 분산 추적 | 마이크로서비스 전환 시 |
| class-validator 완전 제거 | Zod로 점진 마이그레이션 완료 후 class-validator 의존성 제거 | 전체 FS 구현 완료 후 |

---

## 7. i18n 고려사항

본 FS-099는 주로 서버 인프라 작업이므로 클라이언트 UI 문자열 변경은 최소한이다. 다만 아래 번역 키가 필요하다.

### 7.1 추가/수정 필요한 번역 키

```json
{
  "errors": {
    "rate_limit_exceeded": "요청 횟수를 초과했습니다. {{seconds}}초 후에 다시 시도해주세요.",
    "server_error": "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    "validation_failed": "입력 데이터를 확인해주세요.",
    "forbidden": "접근 권한이 없습니다.",
    "unauthorized": "인증이 필요합니다.",
    "conflict": "이미 존재하는 데이터입니다.",
    "not_found": "요청한 리소스를 찾을 수 없습니다.",
    "network_error": "네트워크 연결을 확인해주세요.",
    "timeout": "요청 시간이 초과되었습니다."
  },
  "license": {
    "enterprise_required": "이 기능은 Enterprise 플랜에서 사용 가능합니다.",
    "license_expired": "라이선스가 만료되었습니다. 갱신해주세요."
  },
  "health": {
    "status_ok": "시스템 정상",
    "status_degraded": "시스템 성능 저하",
    "status_down": "시스템 장애"
  }
}
```

위 키들은 `apps/client/src/app/i18n/locales/ko/translation.json`과 `en/translation.json` 모두에 추가해야 한다.
