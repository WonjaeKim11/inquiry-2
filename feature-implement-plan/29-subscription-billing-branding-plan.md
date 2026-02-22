# 기능 구현 계획: 구독/빌링/브랜딩 (FS-029)

## 1. 명세 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 우선순위 | 핵심 설명 |
|---------|--------|---------|----------|
| F-029-08 | Organization Billing 데이터 모델 | High | Organization에 billing(JSON), whitelabel(JSON) 필드 추가 |
| F-029-01 | 요금제 구조 관리 | High | Free/Startup/Custom 3단계 요금제 정의 및 사용량 제한 적용 |
| F-029-02 | Stripe 결제 통합 | High | Stripe Checkout 구독 생성, Webhook 상태 동기화 |
| F-029-03 | Enterprise License 시스템 | High | 14개 Feature Flag 제어, 다계층 캐싱, Grace Period |
| F-029-04 | Cloud/Self-hosted 기능 게이팅 | High | 3가지 게이팅 패턴(기능 권한, Custom 전용, Feature Flag) |
| F-029-05 | 설문 브랜딩 제거 | Medium | 프로젝트 단위 링크/인앱 설문 브랜딩 토글 |
| F-029-06 | 이메일 로고 커스터마이징 | Medium | Organization 단위 커스텀 이메일 로고 설정 |
| F-029-07 | 파비콘 커스터마이징 | Medium | Organization 단위 커스텀 파비콘 설정 |

### 1.2 비기능 요구사항

| ID | 항목 | 요구사항 |
|----|------|---------|
| NFR-B01 | 가용성 | License Server 장애 시 3일 Grace Period |
| NFR-B02 | 성능 | Memory Cache(1분) + Redis Cache(24시간) 다계층 캐싱 |
| NFR-B03 | 보안 | License Key 해시 캐싱, Stripe Secret Key 환경변수 관리 |
| NFR-B04 | 복원력 | License API 429/502/503/504 지수 백오프 재시도 (최대 3회) |
| NFR-B05 | 원자성 | Stripe Webhook 서명 검증 필수, 이벤트 처리 멱등성 보장 |

### 1.3 명세의 모호성 및 해석

| 항목 | 모호한 점 | 해석/결정 |
|------|----------|----------|
| BR-01-05 | UI 표시 수치(1,000 응답/1개 워크스페이스)와 실제 제한(1,500 응답/3개 워크스페이스)이 상이 | UI에는 명세대로 낮은 수치를 표시하고, 서버 제한은 실제 값(1,500/3)을 적용한다. 이는 마케팅 목적의 의도적 차이로 해석한다. |
| MembershipRole | 명세에 "Billing Role"이 언급되지만, 현재 스키마의 MembershipRole에는 OWNER/ADMIN/MEMBER만 존재 | 현 단계에서 Billing Role은 별도 추가하지 않고, OWNER가 빌링 관리 권한을 가지며 ADMIN이 빌링 조회 가능하도록 한다. Billing Role은 향후 RBAC 확장 시 추가한다. |
| Redis 의존성 | docker-compose.yml에 Redis가 미포함 | Redis 컨테이너를 docker-compose.yml에 추가하고 관련 환경변수를 설정해야 한다. |
| Custom 플랜 | 영업팀 협의로만 가입 가능 | Custom 플랜 구독은 API로 관리자가 직접 설정하는 admin endpoint로 구현한다. Stripe 자동 연동은 제외한다. |
| 환경 구분 | IS_CLOUD 환경변수로 Cloud/Self-hosted 식별 | 환경변수 `IS_CLOUD_INSTANCE=true/false`로 구분한다. Cloud 배포 시 true, Self-hosted 시 false (기본값). |
| Stripe Webhook 멱등성 | 구체적 구현 방식 미정의 | Stripe 이벤트의 `id` 필드를 DB에 저장하여 중복 처리를 방지한다. `StripeEvent` 모델을 추가한다. |
| License Server API 요청 형식 | 요청 본문 상세 미정의 | `{ licenseKey: string }` 형태로 POST 요청을 보내고, 응답에서 status, features 객체를 파싱한다. |

### 1.4 암묵적 요구사항

| 항목 | 설명 |
|------|------|
| Redis 인프라 | License 캐싱을 위해 Redis 서버가 필요하다. docker-compose.yml에 Redis 서비스 추가 필수. |
| Stripe NPM 패키지 | `stripe` npm 패키지를 서버에 설치해야 한다. |
| Raw Body 파싱 | Stripe Webhook 서명 검증에는 raw body가 필요하다. NestJS의 raw body 파싱 설정이 필요하다. |
| StripeEvent 멱등성 테이블 | Webhook 이벤트 중복 처리 방지를 위한 처리된 이벤트 ID 저장소가 필요하다. |
| Organization 생성 시 billing 초기화 | 기존 Organization 생성 로직에 Free 플랜 billing 기본값 설정 로직을 추가해야 한다. |
| 환경변수 추가 | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, REDIS_URL, IS_CLOUD_INSTANCE, ENTERPRISE_LICENSE_KEY, STRIPE_STARTUP_MONTHLY_PRICE_ID, STRIPE_STARTUP_YEARLY_PRICE_ID 등 다수의 환경변수가 필요하다. |
| ioredis NPM 패키지 | Redis 클라이언트로 `ioredis` 패키지가 필요하다. |
| crypto 해시 유틸리티 | License Key를 해시하여 캐시 키로 사용하기 위한 유틸리티가 필요하다. |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
apps/server/
  src/app/app.module.ts              -- 루트 모듈에 새 모듈 등록

libs/server/
  billing/                           -- [신규] 빌링 모듈 (Stripe 연동, 요금제 관리)
  license/                           -- [신규] 라이선스 모듈 (Enterprise License, Feature Flag)
  feature-gating/                    -- [신규] 기능 게이팅 모듈 (Cloud/Self-hosted 게이팅)
  branding/                          -- [신규] 브랜딩 모듈 (설문 브랜딩, Whitelabel)
  redis/                             -- [신규] Redis 글로벌 모듈 (ioredis 클라이언트)

libs/client/
  billing/                           -- [신규] 빌링 클라이언트 (API 호출, 상태 관리)

apps/client/
  src/app/[lng]/settings/billing/    -- [신규] 빌링 설정 페이지
  src/app/[lng]/settings/branding/   -- [신규] 브랜딩 설정 페이지 (Whitelabel)
```

**모듈 의존 관계**:

```
FeatureGatingModule
    ├── LicenseModule (License 검증 결과 제공)
    └── BillingModule (Organization billing 정보 제공)

BillingModule
    ├── ServerPrismaModule (DB 접근)
    └── Stripe SDK (외부 결제 서비스)

LicenseModule
    ├── RedisModule (캐시)
    └── HTTP (License Server API)

BrandingModule
    ├── ServerPrismaModule (DB 접근)
    └── FeatureGatingModule (권한 확인)
```

### 2.2 데이터 모델

#### 2.2.1 Prisma 스키마 변경

**Organization 모델 변경** (기존 모델에 필드 추가):

```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  billing   Json     @default("{\"plan\":\"free\",\"billingCycle\":null,\"stripeCustomerId\":null,\"periodStart\":null,\"limits\":{\"projects\":3,\"monthlyResponses\":1500,\"monthlyMIU\":2000}}")
  whitelabel Json    @default("{\"logoUrl\":null,\"faviconUrl\":null}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  memberships Membership[]
  invites     Invite[]

  @@map("organizations")
}
```

**StripeEvent 모델 추가** (Webhook 멱등성 보장):

```prisma
model StripeEvent {
  id        String   @id  // Stripe Event ID (evt_xxx)
  type      String        // 이벤트 타입 (e.g., "checkout.session.completed")
  processed Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([type])
  @@map("stripe_events")
}
```

**OrganizationPlan Enum 추가**:

```prisma
enum OrganizationPlan {
  FREE
  STARTUP
  CUSTOM
}
```

> 참고: billing JSON 내부의 plan 필드는 Enum 대신 문자열("free", "startup", "custom")로 관리한다. JSON 컬럼이므로 Prisma Enum을 직접 사용할 수 없다. 대신 TypeScript 타입으로 검증한다.

#### 2.2.2 Billing JSON 타입 정의 (TypeScript)

```typescript
/** Organization.billing JSON 타입 */
export interface OrganizationBilling {
  plan: 'free' | 'startup' | 'custom';
  billingCycle: 'monthly' | 'yearly' | null;
  stripeCustomerId: string | null;
  periodStart: string | null; // ISO 8601
  limits: {
    projects: number;
    monthlyResponses: number;
    monthlyMIU: number;
  };
}

/** Organization.whitelabel JSON 타입 */
export interface OrganizationWhitelabel {
  logoUrl: string | null;
  faviconUrl: string | null;
}

/** Free 플랜 기본값 */
export const FREE_PLAN_BILLING: OrganizationBilling = {
  plan: 'free',
  billingCycle: null,
  stripeCustomerId: null,
  periodStart: null,
  limits: {
    projects: 3,
    monthlyResponses: 1500,
    monthlyMIU: 2000,
  },
};

/** Startup 플랜 기본값 */
export const STARTUP_PLAN_LIMITS = {
  projects: 3,
  monthlyResponses: 5000,
  monthlyMIU: 7500,
};
```

#### 2.2.3 Enterprise License 타입 정의

```typescript
export type LicenseStatus = 'active' | 'expired' | 'unreachable' | 'invalid_license' | 'no-license';

export interface LicenseFeatures {
  multiOrgEnabled: boolean;
  contacts: boolean;
  projects: number | null; // null = 무제한
  whitelabel: boolean;
  removeBranding: boolean;
  twoFactorAuth: boolean;
  sso: boolean;
  saml: boolean;
  spamProtection: boolean;
  ai: boolean;
  auditLogs: boolean;
  multiLanguage: boolean;
  accessControl: boolean;
  quotas: boolean;
}

export interface LicenseCheckResult {
  status: LicenseStatus;
  features: LicenseFeatures;
  lastChecked: string; // ISO 8601
  expiresAt: string | null;
}

/** 라이선스 비활성 시 기본값 */
export const DEFAULT_INACTIVE_FEATURES: LicenseFeatures = {
  multiOrgEnabled: false,
  contacts: false,
  projects: 3,
  whitelabel: false,
  removeBranding: false,
  twoFactorAuth: false,
  sso: false,
  saml: false,
  spamProtection: false,
  ai: false,
  auditLogs: false,
  multiLanguage: false,
  accessControl: false,
  quotas: false,
};
```

### 2.3 API 설계

#### 2.3.1 빌링 API

| 메서드 | 엔드포인트 | 설명 | 인증 | 요청 | 응답 |
|--------|-----------|------|------|------|------|
| GET | /api/billing/:organizationId | 현재 빌링 정보 조회 | JWT (OWNER/ADMIN) | - | `{ billing: OrganizationBilling }` |
| POST | /api/billing/:organizationId/checkout | Stripe Checkout 세션 생성 | JWT (OWNER) | `{ plan: "startup", billingCycle: "monthly" \| "yearly" }` | `{ checkoutUrl: string }` |
| POST | /api/webhooks/stripe | Stripe Webhook 수신 | Stripe 서명 검증 | Stripe Event (raw body) | `200 OK` |
| POST | /api/billing/:organizationId/portal | Stripe Customer Portal 세션 생성 | JWT (OWNER) | - | `{ portalUrl: string }` |

#### 2.3.2 라이선스 API

| 메서드 | 엔드포인트 | 설명 | 인증 | 요청 | 응답 |
|--------|-----------|------|------|------|------|
| GET | /api/license/status | 현재 라이선스 상태 조회 | JWT (OWNER/ADMIN) | - | `{ status: LicenseStatus, features: LicenseFeatures }` |
| PUT | /api/license/key | Enterprise License Key 등록/변경 (Self-hosted) | JWT (OWNER) | `{ licenseKey: string }` | `{ status: LicenseStatus, features: LicenseFeatures }` |

#### 2.3.3 브랜딩 API

| 메서드 | 엔드포인트 | 설명 | 인증 | 요청 | 응답 |
|--------|-----------|------|------|------|------|
| PUT | /api/organizations/:id/whitelabel | Whitelabel 설정 업데이트 | JWT (OWNER/ADMIN) | `{ logoUrl?: string \| null, faviconUrl?: string \| null }` | `{ whitelabel: OrganizationWhitelabel }` |
| GET | /api/organizations/:id/whitelabel | Whitelabel 설정 조회 | JWT (OWNER/ADMIN) | - | `{ whitelabel: OrganizationWhitelabel }` |

> 참고: 설문 브랜딩 토글 API(`PUT /api/projects/:id/branding`)는 Project CRUD가 구현된 이후에 추가한다. 현재는 데이터 모델과 서비스 레이어만 준비한다.

### 2.4 주요 컴포넌트 설계

#### 2.4.1 BillingModule (libs/server/billing)

```
libs/server/billing/
  src/
    index.ts
    lib/
      billing.module.ts         -- NestJS 모듈 정의
      billing.controller.ts     -- 빌링 API 컨트롤러
      billing.service.ts        -- 빌링 비즈니스 로직 (Stripe 연동)
      stripe-webhook.controller.ts  -- Stripe Webhook 수신 컨트롤러 (별도)
      stripe-webhook.service.ts     -- Webhook 이벤트 처리 서비스
      dto/
        create-checkout.dto.ts  -- Checkout 세션 생성 DTO
      types/
        billing.types.ts        -- OrganizationBilling, 플랜 상수 등
      constants/
        plans.ts                -- 요금제별 제한/가격 상수
  package.json
  tsconfig.json
  tsconfig.lib.json
```

**핵심 로직**:
- `BillingService.createCheckoutSession()`: Stripe Checkout Session 생성, Organization ID를 metadata에 포함
- `StripeWebhookService.handleCheckoutCompleted()`: billing JSON 업데이트 (plan=startup, limits 변경)
- `StripeWebhookService.handleSubscriptionDeleted()`: billing JSON을 Free 플랜으로 다운그레이드
- `StripeWebhookService.handleInvoiceFinalized()`: periodStart 업데이트
- 멱등성: StripeEvent 테이블에 event.id 기록 후 처리

#### 2.4.2 LicenseModule (libs/server/license)

```
libs/server/license/
  src/
    index.ts
    lib/
      license.module.ts         -- NestJS 모듈 정의
      license.controller.ts     -- 라이선스 API 컨트롤러
      license.service.ts        -- 라이선스 검증 비즈니스 로직
      license-cache.service.ts  -- 다계층 캐싱 (Memory + Redis)
      license-api.service.ts    -- License Server API 호출 (재시도 포함)
      types/
        license.types.ts        -- LicenseFeatures, LicenseStatus 등
      constants/
        cache-config.ts         -- TTL 상수 정의
  package.json
  tsconfig.json
  tsconfig.lib.json
```

**핵심 로직**:
- `LicenseService.checkLicense()`: 다계층 캐시 확인 -> API 호출 -> 결과 캐싱
- `LicenseCacheService`: Map 기반 Memory Cache(TTL 60초) + Redis Cache(성공 24시간, 실패 10분, 이전 결과 4일)
- `LicenseApiService.callLicenseServer()`: HTTP POST, 5초 timeout, 지수 백오프 재시도(429/502/503/504, 최대 3회)
- Grace Period: License Server 접근 불가 시 Redis의 이전 결과(4일 TTL)를 확인하고, 3일 이내면 기존 상태 유지
- License Key 해시: SHA-256으로 해시하여 캐시 키로 사용

#### 2.4.3 FeatureGatingModule (libs/server/feature-gating)

```
libs/server/feature-gating/
  src/
    index.ts
    lib/
      feature-gating.module.ts     -- NestJS 모듈 정의
      feature-gating.service.ts    -- 기능 게이팅 판단 로직
      decorators/
        require-feature.decorator.ts -- 기능 게이팅 데코레이터
      guards/
        feature-gate.guard.ts       -- 기능 게이팅 Guard
      types/
        gating.types.ts             -- 게이팅 패턴 타입 정의
  package.json
  tsconfig.json
  tsconfig.lib.json
```

**핵심 로직 - 3가지 게이팅 패턴**:

```typescript
// 패턴 1: 기능 권한 패턴
// Cloud: plan != FREE AND licenseActive
// Self-hosted: licenseActive AND featureFlag == true
canAccessFeaturePermission(feature: string): boolean

// 패턴 2: Custom 플랜 전용 패턴
// Cloud: plan == CUSTOM AND licenseActive AND featureFlag == true
// Self-hosted: licenseActive AND featureFlag == true
canAccessCustomOnly(feature: string): boolean

// 패턴 3: 특정 Feature Flag 패턴
// Cloud/Self-hosted 모두: featureFlag == true
canAccessByFlag(feature: string): boolean
```

#### 2.4.4 BrandingModule (libs/server/branding)

```
libs/server/branding/
  src/
    index.ts
    lib/
      branding.module.ts          -- NestJS 모듈 정의
      branding.controller.ts      -- Whitelabel API 컨트롤러
      branding.service.ts         -- 브랜딩 비즈니스 로직
      dto/
        update-whitelabel.dto.ts  -- Whitelabel 업데이트 DTO
  package.json
  tsconfig.json
  tsconfig.lib.json
```

#### 2.4.5 RedisModule (libs/server/redis)

```
libs/server/redis/
  src/
    index.ts
    lib/
      redis.module.ts           -- @Global() NestJS 모듈
      redis.service.ts          -- ioredis 클라이언트 래퍼
  package.json
  tsconfig.json
  tsconfig.lib.json
```

### 2.5 기존 시스템에 대한 영향 분석

| 대상 | 변경 유형 | 영향 범위 | 설명 |
|------|----------|----------|------|
| `packages/db/prisma/schema.prisma` | 수정 | DB 마이그레이션 필요 | Organization에 billing/whitelabel JSON 필드 추가, StripeEvent 모델 추가 |
| `apps/server/src/app/app.module.ts` | 수정 | 서버 부트스트랩 | BillingModule, LicenseModule, FeatureGatingModule, BrandingModule, RedisModule import 추가 |
| `apps/server/src/main.ts` | 수정 | 서버 부트스트랩 | Stripe Webhook raw body 파싱을 위한 설정 추가 |
| `docker-compose.yml` | 수정 | 인프라 | Redis 컨테이너 추가 |
| `.env.example` | 수정 | 환경 설정 | Stripe, Redis, License 관련 환경변수 추가 |
| `libs/server/email/src/lib/email.service.ts` | 수정 | 이메일 발송 | Whitelabel 로고 URL을 이메일 템플릿에 적용하는 로직 추가 |
| `apps/client/src/app/i18n/locales/` | 수정 | i18n | 빌링/브랜딩 관련 번역 키 추가 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|----------|
| **마일스톤 1: 인프라 및 데이터 모델** | | | | | |
| 1.1 | Redis 인프라 구성 | docker-compose.yml에 Redis 추가, 환경변수 설정 | - | Low | 0.5h |
| 1.2 | RedisModule 생성 | libs/server/redis 모듈 생성, ioredis 클라이언트 래퍼 | 1.1 | Low | 1h |
| 1.3 | Prisma 스키마 변경 | Organization에 billing/whitelabel 필드 추가, StripeEvent 모델 추가 | - | Low | 1h |
| 1.4 | DB 마이그레이션 실행 | prisma migrate dev 실행 | 1.3 | Low | 0.5h |
| 1.5 | 공유 타입 정의 | billing.types.ts, license.types.ts, gating.types.ts 등 TypeScript 타입 정의 | - | Low | 1h |
| 1.6 | 환경변수 추가 | .env.example에 Stripe, Redis, License 관련 환경변수 추가 | - | Low | 0.5h |
| **마일스톤 2: Enterprise License 시스템** | | | | | |
| 2.1 | LicenseModule 스캐폴딩 | 모듈, 서비스, 컨트롤러 파일 생성 | 1.2, 1.5 | Low | 0.5h |
| 2.2 | LicenseCacheService 구현 | Memory Cache(Map + TTL) + Redis Cache 다계층 캐시 | 2.1 | High | 3h |
| 2.3 | LicenseApiService 구현 | License Server HTTP 호출, 5초 timeout, 지수 백오프 재시도 | 2.1 | High | 2.5h |
| 2.4 | LicenseService 구현 | 캐시 확인 -> API 호출 -> 결과 저장 -> Grace Period 처리 | 2.2, 2.3 | High | 3h |
| 2.5 | License API 컨트롤러 | GET /api/license/status, PUT /api/license/key 엔드포인트 | 2.4 | Medium | 1.5h |
| 2.6 | License 단위 테스트 | 캐시 히트/미스, 재시도, Grace Period, no-license 시나리오 | 2.4 | High | 3h |
| **마일스톤 3: 기능 게이팅** | | | | | |
| 3.1 | FeatureGatingModule 스캐폴딩 | 모듈, 서비스 파일 생성 | 2.4 | Low | 0.5h |
| 3.2 | FeatureGatingService 구현 | 3가지 게이팅 패턴 (기능 권한, Custom 전용, Feature Flag) | 3.1 | Medium | 2.5h |
| 3.3 | RequireFeature 데코레이터/Guard | NestJS Guard + 커스텀 데코레이터로 엔드포인트 게이팅 | 3.2 | Medium | 2h |
| 3.4 | SAML 특수 규칙 구현 | Cloud에서 항상 false, Self-hosted에서 sso AND saml 조건 | 3.2 | Low | 0.5h |
| 3.5 | 게이팅 단위 테스트 | Cloud/Self-hosted 각 패턴별 허용/차단 시나리오 | 3.2 | Medium | 2h |
| **마일스톤 4: Stripe 빌링 연동** | | | | | |
| 4.1 | Stripe SDK 설치 및 설정 | stripe npm 패키지 설치, Stripe 클라이언트 초기화 | 1.6 | Low | 0.5h |
| 4.2 | BillingModule 스캐폴딩 | 모듈, 서비스, 컨트롤러, DTO 파일 생성 | 1.3, 1.5 | Low | 0.5h |
| 4.3 | BillingService 구현 | Checkout 세션 생성, Customer Portal 세션 생성, 빌링 조회 | 4.1, 4.2 | High | 3h |
| 4.4 | Raw Body 파싱 설정 | NestJS main.ts에서 /api/webhooks/stripe 경로 raw body 설정 | 4.1 | Medium | 1h |
| 4.5 | StripeWebhookController 구현 | Webhook 수신, 서명 검증, 이벤트 라우팅 | 4.4 | High | 2h |
| 4.6 | StripeWebhookService 구현 | checkout.session.completed, customer.subscription.deleted, invoice.finalized 핸들러 | 4.5 | High | 3h |
| 4.7 | 멱등성 처리 구현 | StripeEvent 테이블 활용 중복 이벤트 방지 | 4.6 | Medium | 1h |
| 4.8 | Billing API 컨트롤러 | GET/POST 빌링 엔드포인트, 권한 확인 | 4.3 | Medium | 1.5h |
| 4.9 | 빌링 단위/통합 테스트 | Checkout 흐름, Webhook 처리, 멱등성, 다운그레이드 | 4.6, 4.7 | High | 3h |
| **마일스톤 5: 브랜딩 및 Whitelabel** | | | | | |
| 5.1 | BrandingModule 스캐폴딩 | 모듈, 서비스, 컨트롤러, DTO 파일 생성 | 3.2 | Low | 0.5h |
| 5.2 | BrandingService 구현 | Whitelabel 설정 CRUD, URL 유효성 검증 | 5.1 | Medium | 2h |
| 5.3 | Branding API 컨트롤러 | PUT/GET whitelabel 엔드포인트 (게이팅 적용) | 5.2 | Medium | 1.5h |
| 5.4 | EmailService 수정 | Whitelabel 로고 URL을 이메일 템플릿에 적용 | 5.2 | Medium | 1.5h |
| 5.5 | 브랜딩 단위 테스트 | Whitelabel 설정/조회, 권한 없는 경우 차단 | 5.2, 5.3 | Medium | 1.5h |
| **마일스톤 6: AppModule 통합 및 서버 빌드 검증** | | | | | |
| 6.1 | AppModule 업데이트 | 모든 새 모듈 import, 의존성 연결 | 2.5, 3.3, 4.8, 5.3 | Low | 0.5h |
| 6.2 | 서버 빌드 검증 | nx build @inquiry/server 빌드 통과 확인 | 6.1 | Low | 0.5h |
| 6.3 | 통합 테스트 | 전체 흐름: Checkout -> Webhook -> billing 업데이트 -> 게이팅 확인 | 6.1 | High | 3h |
| **마일스톤 7: 클라이언트 UI** | | | | | |
| 7.1 | i18n 번역 키 추가 | 빌링/브랜딩 관련 번역 키 (en/ko) 추가 | - | Low | 1h |
| 7.2 | 빌링 API 클라이언트 | apiFetch 기반 빌링 API 호출 함수 | - | Low | 1h |
| 7.3 | 빌링 설정 페이지 | 현재 요금제, 사용량, 업그레이드 버튼, Customer Portal 링크 | 7.1, 7.2 | High | 4h |
| 7.4 | 요금제 비교 화면 | Free/Startup/Custom 비교 테이블 | 7.1 | Medium | 2h |
| 7.5 | Checkout 성공/취소 페이지 | 업그레이드 완료 확인, 취소 시 안내 | 7.1 | Medium | 1.5h |
| 7.6 | Whitelabel 설정 페이지 | 이메일 로고, 파비콘 설정 UI (미리보기, 업로드/URL 입력) | 7.1 | High | 3h |
| 7.7 | 라이선스 상태 UI (Self-hosted) | License Key 입력, 상태 표시, Feature Flag 목록 | 7.1 | Medium | 2h |
| 7.8 | 업그레이드 안내 모달 | 게이팅에 의해 차단된 기능 접근 시 업그레이드 안내 | 7.1 | Medium | 1.5h |
| 7.9 | 클라이언트 빌드 검증 | nx build @inquiry/client 빌드 통과 확인 | 7.3~7.8 | Low | 0.5h |

### 3.2 구현 순서 및 마일스톤

```
마일스톤 1: 인프라 및 데이터 모델 (4.5h)
    ├── 1.1 Redis 인프라 구성
    ├── 1.2 RedisModule 생성
    ├── 1.3 Prisma 스키마 변경
    ├── 1.4 DB 마이그레이션
    ├── 1.5 공유 타입 정의
    └── 1.6 환경변수 추가
    [검증: DB 마이그레이션 성공, Redis 연결 테스트]

마일스톤 2: Enterprise License 시스템 (13.5h)
    ├── 2.1 LicenseModule 스캐폴딩
    ├── 2.2 LicenseCacheService (Memory + Redis)
    ├── 2.3 LicenseApiService (HTTP + 재시도)
    ├── 2.4 LicenseService (통합 로직)
    ├── 2.5 License API 컨트롤러
    └── 2.6 단위 테스트
    [검증: License 검증 API 호출, 캐시 동작, Grace Period 테스트]

마일스톤 3: 기능 게이팅 (7.5h)
    ├── 3.1 FeatureGatingModule 스캐폴딩
    ├── 3.2 FeatureGatingService (3 패턴)
    ├── 3.3 RequireFeature 데코레이터/Guard
    ├── 3.4 SAML 특수 규칙
    └── 3.5 단위 테스트
    [검증: Cloud/Self-hosted 각 게이팅 패턴 테스트]

마일스톤 4: Stripe 빌링 연동 (15.5h)
    ├── 4.1 Stripe SDK 설치
    ├── 4.2 BillingModule 스캐폴딩
    ├── 4.3 BillingService
    ├── 4.4 Raw Body 파싱
    ├── 4.5 StripeWebhookController
    ├── 4.6 StripeWebhookService
    ├── 4.7 멱등성 처리
    ├── 4.8 Billing API 컨트롤러
    └── 4.9 단위/통합 테스트
    [검증: Stripe CLI로 Webhook 시뮬레이션, billing JSON 업데이트 확인]

마일스톤 5: 브랜딩 및 Whitelabel (7h)
    ├── 5.1 BrandingModule 스캐폴딩
    ├── 5.2 BrandingService
    ├── 5.3 Branding API 컨트롤러
    ├── 5.4 EmailService 수정
    └── 5.5 단위 테스트
    [검증: Whitelabel 설정 API, 이메일 로고 반영 확인]

마일스톤 6: 서버 통합 및 빌드 검증 (4h)
    ├── 6.1 AppModule 업데이트
    ├── 6.2 서버 빌드 검증
    └── 6.3 통합 테스트
    [검증: 서버 빌드 성공, 전체 플로우 E2E]

마일스톤 7: 클라이언트 UI (16.5h)
    ├── 7.1 i18n 번역 키 추가
    ├── 7.2 빌링 API 클라이언트
    ├── 7.3 빌링 설정 페이지
    ├── 7.4 요금제 비교 화면
    ├── 7.5 Checkout 성공/취소 페이지
    ├── 7.6 Whitelabel 설정 페이지
    ├── 7.7 라이선스 상태 UI
    ├── 7.8 업그레이드 안내 모달
    └── 7.9 클라이언트 빌드 검증
    [검증: 클라이언트 빌드 성공, UI 수동 검증]
```

**총 예상 시간**: 약 68.5시간 (약 8.5 인일, 8시간/일 기준)

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|----------|----------|
| **인프라 및 설정** | | |
| `docker-compose.yml` | 수정 | Redis 서비스 추가 (redis:7-alpine, 포트 6379) |
| `.env.example` | 수정 | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, REDIS_URL, IS_CLOUD_INSTANCE, ENTERPRISE_LICENSE_KEY, STRIPE_STARTUP_MONTHLY_PRICE_ID, STRIPE_STARTUP_YEARLY_PRICE_ID 추가 |
| `packages/db/prisma/schema.prisma` | 수정 | Organization에 billing/whitelabel JSON 필드 추가, StripeEvent 모델 추가 |
| `apps/server/src/main.ts` | 수정 | Stripe Webhook raw body 파싱 설정 추가 |
| `apps/server/src/app/app.module.ts` | 수정 | RedisModule, BillingModule, LicenseModule, FeatureGatingModule, BrandingModule import 추가 |
| **libs/server/redis (신규)** | | |
| `libs/server/redis/package.json` | 생성 | @inquiry/server-redis 패키지 정의 |
| `libs/server/redis/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/redis/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `libs/server/redis/src/index.ts` | 생성 | 공개 API export |
| `libs/server/redis/src/lib/redis.module.ts` | 생성 | @Global() Redis 모듈 (ioredis 클라이언트 provider) |
| `libs/server/redis/src/lib/redis.service.ts` | 생성 | ioredis 래퍼 서비스 (get/set/del with TTL) |
| **libs/server/billing (신규)** | | |
| `libs/server/billing/package.json` | 생성 | @inquiry/server-billing 패키지 정의 (stripe 의존성 포함) |
| `libs/server/billing/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/billing/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `libs/server/billing/src/index.ts` | 생성 | 공개 API export |
| `libs/server/billing/src/lib/billing.module.ts` | 생성 | BillingModule 정의 |
| `libs/server/billing/src/lib/billing.controller.ts` | 생성 | 빌링 API 컨트롤러 (GET 빌링 조회, POST checkout, POST portal) |
| `libs/server/billing/src/lib/billing.service.ts` | 생성 | Stripe Checkout/Portal 세션 생성, 빌링 조회/업데이트 |
| `libs/server/billing/src/lib/stripe-webhook.controller.ts` | 생성 | Stripe Webhook 수신 전용 컨트롤러 |
| `libs/server/billing/src/lib/stripe-webhook.service.ts` | 생성 | Webhook 이벤트 핸들러 (checkout.completed, subscription.deleted, invoice.finalized) |
| `libs/server/billing/src/lib/dto/create-checkout.dto.ts` | 생성 | CreateCheckoutDto (plan, billingCycle 검증) |
| `libs/server/billing/src/lib/types/billing.types.ts` | 생성 | OrganizationBilling, OrganizationWhitelabel 타입, 플랜 상수 |
| `libs/server/billing/src/lib/constants/plans.ts` | 생성 | 요금제별 제한/가격 상수 (FREE_PLAN_BILLING, STARTUP_PLAN_LIMITS) |
| **libs/server/license (신규)** | | |
| `libs/server/license/package.json` | 생성 | @inquiry/server-license 패키지 정의 |
| `libs/server/license/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/license/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `libs/server/license/src/index.ts` | 생성 | 공개 API export |
| `libs/server/license/src/lib/license.module.ts` | 생성 | LicenseModule 정의 |
| `libs/server/license/src/lib/license.controller.ts` | 생성 | 라이선스 API 컨트롤러 |
| `libs/server/license/src/lib/license.service.ts` | 생성 | 라이선스 검증 통합 로직 (캐시 -> API -> Grace Period) |
| `libs/server/license/src/lib/license-cache.service.ts` | 생성 | 다계층 캐시 (Memory Map + Redis) |
| `libs/server/license/src/lib/license-api.service.ts` | 생성 | License Server HTTP 호출 (지수 백오프 재시도) |
| `libs/server/license/src/lib/types/license.types.ts` | 생성 | LicenseFeatures, LicenseStatus, LicenseCheckResult 타입 |
| `libs/server/license/src/lib/constants/cache-config.ts` | 생성 | TTL 상수 (Memory 60s, Redis 성공 86400s, 실패 600s, 이전결과 345600s) |
| **libs/server/feature-gating (신규)** | | |
| `libs/server/feature-gating/package.json` | 생성 | @inquiry/server-feature-gating 패키지 정의 |
| `libs/server/feature-gating/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/feature-gating/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `libs/server/feature-gating/src/index.ts` | 생성 | 공개 API export |
| `libs/server/feature-gating/src/lib/feature-gating.module.ts` | 생성 | FeatureGatingModule 정의 |
| `libs/server/feature-gating/src/lib/feature-gating.service.ts` | 생성 | 3가지 게이팅 패턴 구현 |
| `libs/server/feature-gating/src/lib/decorators/require-feature.decorator.ts` | 생성 | @RequireFeature() 파라미터 데코레이터 |
| `libs/server/feature-gating/src/lib/guards/feature-gate.guard.ts` | 생성 | FeatureGateGuard (CanActivate) |
| `libs/server/feature-gating/src/lib/types/gating.types.ts` | 생성 | GatingPattern enum, FeatureConfig 타입 |
| **libs/server/branding (신규)** | | |
| `libs/server/branding/package.json` | 생성 | @inquiry/server-branding 패키지 정의 |
| `libs/server/branding/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/branding/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `libs/server/branding/src/index.ts` | 생성 | 공개 API export |
| `libs/server/branding/src/lib/branding.module.ts` | 생성 | BrandingModule 정의 |
| `libs/server/branding/src/lib/branding.controller.ts` | 생성 | Whitelabel API 컨트롤러 |
| `libs/server/branding/src/lib/branding.service.ts` | 생성 | Whitelabel 설정 CRUD |
| `libs/server/branding/src/lib/dto/update-whitelabel.dto.ts` | 생성 | UpdateWhitelabelDto (logoUrl, faviconUrl 검증) |
| **기존 파일 수정** | | |
| `libs/server/email/src/lib/email.service.ts` | 수정 | send() 메서드에 Organization whitelabel.logoUrl 지원 추가 |
| **클라이언트 (신규 페이지)** | | |
| `apps/client/src/app/[lng]/settings/billing/page.tsx` | 생성 | 빌링 설정 페이지 |
| `apps/client/src/app/[lng]/settings/billing/pricing/page.tsx` | 생성 | 요금제 비교 페이지 |
| `apps/client/src/app/[lng]/settings/billing/success/page.tsx` | 생성 | Checkout 성공 페이지 |
| `apps/client/src/app/[lng]/settings/branding/page.tsx` | 생성 | Whitelabel 설정 페이지 |
| `apps/client/src/app/[lng]/settings/license/page.tsx` | 생성 | 라이선스 상태 페이지 (Self-hosted) |
| `apps/client/src/app/[lng]/settings/layout.tsx` | 생성 | 설정 레이아웃 (사이드바 내비게이션) |
| **클라이언트 컴포넌트** | | |
| `libs/client/billing/src/index.ts` | 생성 | 빌링 클라이언트 라이브러리 공개 API |
| `libs/client/billing/src/lib/billing-api.ts` | 생성 | 빌링 API 호출 함수 (apiFetch 기반) |
| `libs/client/billing/src/lib/components/pricing-table.tsx` | 생성 | 요금제 비교 테이블 컴포넌트 |
| `libs/client/billing/src/lib/components/billing-summary.tsx` | 생성 | 현재 빌링 요약 카드 |
| `libs/client/billing/src/lib/components/upgrade-modal.tsx` | 생성 | 업그레이드 안내 모달 |
| **i18n** | | |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | billing, branding, license 관련 번역 키 추가 |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | billing, branding, license 관련 번역 키 추가 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 발생확률 | 완화 전략 |
|--------|------|---------|----------|
| Stripe Webhook 서명 검증 실패 (raw body 파싱 오류) | High - 빌링 동기화 불가 | 중간 | NestJS에서 특정 경로만 raw body를 파싱하는 미들웨어를 정확히 설정한다. Stripe CLI로 로컬 테스트를 반드시 수행한다. |
| Redis 장애 시 License 캐시 불가 | Medium - License 검증 지연 | 낮음 | Memory Cache가 1차 방어선 역할을 하므로 Redis 장애 시에도 60초간은 정상 동작한다. Redis 장애 감지 시 fallback으로 Memory Cache TTL을 늘리는 방안을 고려한다. |
| License Server API 응답 형식 변경 | High - 라이선스 검증 불가 | 낮음 | License Server 응답을 파싱할 때 defensive coding을 적용하고, 예상 외 응답 시 no-license로 fallback한다. 응답 스키마 변경 감지를 위한 로깅을 추가한다. |
| Stripe Webhook 이벤트 순서 보장 불가 | Medium - 빌링 상태 불일치 | 중간 | 각 Webhook 핸들러에서 현재 상태를 확인한 후 업데이트한다. Stripe의 이벤트 timestamp를 비교하여 순서가 뒤바뀐 이벤트를 무시한다. |
| Organization billing JSON 스키마 변경 시 하위 호환성 | Medium - 기존 데이터 파싱 오류 | 중간 | billing JSON 읽기 시 항상 기본값과 merge하는 유틸리티 함수를 사용한다. JSON 필드 누락 시 Free 플랜 기본값으로 fallback한다. |
| Stripe API 버전 호환성 (2024-06-20) | Low - API 동작 불일치 | 낮음 | Stripe 클라이언트 초기화 시 apiVersion을 명시적으로 지정한다. `new Stripe(secretKey, { apiVersion: '2024-06-20' })` |
| 기존 Organization 데이터 마이그레이션 | Medium - billing 필드 null 참조 | 높음 | Prisma 스키마에 @default() 값을 설정하고, 마이그레이션 SQL에서 기존 레코드에 기본값을 적용한다. |
| NestJS 모듈 순환 의존성 | Medium - 부트스트랩 실패 | 중간 | FeatureGatingModule이 LicenseModule과 BillingModule에 의존하므로 forwardRef()를 사용하지 않도록 단방향 의존성을 유지한다. |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 대상 | 테스트 항목 | 주요 시나리오 |
|------|-----------|-------------|
| `LicenseCacheService` | Memory Cache CRUD | TTL 만료 후 캐시 미스, 캐시 히트 시 값 반환 |
| `LicenseCacheService` | Redis Cache CRUD | 성공 응답 TTL 24h, 실패 응답 TTL 10m, 이전 결과 TTL 4d |
| `LicenseApiService` | HTTP 호출 | 정상 응답, 5초 timeout, 429/502/503/504 재시도 |
| `LicenseApiService` | 지수 백오프 | 재시도 간격 증가 확인, 3회 초과 시 중단 |
| `LicenseService` | 캐시 계층 흐름 | Memory hit -> return, Memory miss -> Redis hit -> return, Redis miss -> API call |
| `LicenseService` | Grace Period | API 실패 -> Redis 이전 결과 확인 -> 3일 이내면 기존 상태 유지, 3일 초과면 비활성화 |
| `LicenseService` | no-license | License Key 미설정 시 모든 Flag false, 프로젝트 3개 제한 |
| `FeatureGatingService` | 패턴 1 (기능 권한) | Cloud: FREE+active=false, STARTUP+active=true; Self-hosted: active+flag=true |
| `FeatureGatingService` | 패턴 2 (Custom 전용) | Cloud: CUSTOM+active+flag=true, STARTUP+active+flag=false |
| `FeatureGatingService` | 패턴 3 (Feature Flag) | Cloud/Self-hosted: flag=true->허용, flag=false->차단 |
| `FeatureGatingService` | SAML 특수 규칙 | Cloud: 항상 false; Self-hosted: sso AND saml |
| `BillingService` | Checkout 세션 생성 | monthly/yearly Price ID 매핑, metadata에 orgId 포함 |
| `StripeWebhookService` | checkout.session.completed | billing JSON 업데이트 (plan=startup, limits 변경) |
| `StripeWebhookService` | customer.subscription.deleted | billing JSON 다운그레이드 (plan=free) |
| `StripeWebhookService` | 멱등성 | 동일 이벤트 ID 중복 처리 시 무시 |
| `BrandingService` | Whitelabel 설정 | logoUrl/faviconUrl 저장, null로 기본 복원 |
| `BrandingService` | URL 유효성 검증 | 유효하지 않은 URL 거부 |

### 5.2 통합 테스트

| 대상 | 테스트 항목 | 주요 시나리오 |
|------|-----------|-------------|
| Stripe Webhook 흐름 | 서명 검증 -> 이벤트 처리 -> DB 업데이트 | 유효한 서명: 처리 성공, 무효한 서명: 400 반환 |
| 빌링 + 게이팅 | 요금제 변경 후 게이팅 | Startup 업그레이드 후 removeBranding 게이팅 통과 확인 |
| License + 게이팅 | 라이선스 변경 후 게이팅 | 라이선스 활성화 후 Feature Flag 기반 게이팅 통과 확인 |
| 다운그레이드 흐름 | 구독 취소 -> Free 플랜 -> 기능 차단 | subscription.deleted 수신 후 Startup 전용 기능 차단 확인 |

### 5.3 E2E 테스트 (해당 시 수동 검증)

| 시나리오 | 검증 항목 |
|---------|----------|
| Free -> Startup 업그레이드 | 1. 요금제 비교 화면 접근 2. Startup 선택 3. Stripe Checkout 완료 4. 성공 페이지 확인 5. 빌링 설정에서 Startup 표시 |
| Startup -> Free 다운그레이드 | 1. Customer Portal에서 구독 취소 2. Webhook 수신 3. 빌링 설정에서 Free 표시 4. 브랜딩 토글 비활성화 |
| Self-hosted License 등록 | 1. 라이선스 페이지 접근 2. License Key 입력 3. 상태 active 표시 4. Feature Flag 목록 확인 |
| Whitelabel 설정 | 1. Organization 설정 접근 2. 로고 URL 입력 3. 저장 4. 이메일 발송 시 커스텀 로고 표시 확인 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 설명 |
|------|------|
| Custom 플랜 자동화 부재 | Custom 플랜은 영업팀 협의 후 관리자가 수동으로 DB를 업데이트해야 한다. Admin API를 향후 추가할 수 있다. |
| 설문 브랜딩 토글 API 미구현 | Project 모델과 CRUD가 아직 구현되지 않았으므로, 브랜딩 토글 API는 Project 구현 후 추가한다. 현재는 타입 정의와 게이팅 로직만 준비한다. |
| 파일 업로드 미구현 | Whitelabel 로고/파비콘의 파일 업로드는 별도 파일 스토리지(S3 등) 연동이 필요하다. 현 단계에서는 URL 입력만 지원한다. |
| 사용량 추적 미구현 | 월 응답 수, MIU 실시간 추적은 별도 기능(응답 관리, 연락처 관리)이 구현된 이후에 연동한다. 현재는 제한 값만 저장한다. |
| 환불 처리 제외 | Stripe Customer Portal로 위임. 별도 환불 API는 구현하지 않는다. |
| Billing Role 미추가 | 현재 MembershipRole에 BILLING 역할을 추가하지 않는다. OWNER가 빌링 관리, ADMIN이 빌링 조회를 담당한다. |

### 6.2 향후 개선 가능 사항

| 항목 | 설명 |
|------|------|
| Admin API | Custom 플랜 설정, 사용량 한도 수동 조정을 위한 내부 관리자 API |
| 사용량 대시보드 | 월간 응답 수, MIU를 실시간으로 추적하고 시각화하는 대시보드 |
| 프로모션 코드 관리 | Stripe 프로모션 코드의 내부 관리 및 추적 |
| 파일 스토리지 연동 | S3/R2 등을 활용한 로고/파비콘 파일 업로드 |
| Billing Role RBAC | 빌링 전용 역할을 MembershipRole에 추가하여 세분화된 권한 관리 |
| Webhook 재시도 큐 | Webhook 처리 실패 시 Dead Letter Queue를 통한 재처리 메커니즘 |
| 사용량 초과 알림 | 월간 제한에 근접하거나 초과 시 이메일/인앱 알림 발송 |
| 연간 결제 할인 프로모션 | 월간 -> 연간 전환 시 남은 기간에 대한 비례 할인 계산 |

---

## 7. i18n 고려사항 (클라이언트 UI 변경 관련)

### 추가/변경이 필요한 번역 키 목록

**네임스페이스: `translation`**

```json
{
  "billing": {
    "title": "Billing Settings / 빌링 설정",
    "current_plan": "Current Plan / 현재 요금제",
    "plan_free": "Free",
    "plan_startup": "Startup",
    "plan_custom": "Custom",
    "billing_cycle": "Billing Cycle / 결제 주기",
    "monthly": "Monthly / 월간",
    "yearly": "Yearly / 연간",
    "next_billing_date": "Next Billing Date / 다음 결제일",
    "usage": "Usage / 사용량",
    "projects": "Projects / 프로젝트",
    "responses": "Monthly Responses / 월간 응답",
    "miu": "Monthly Identified Users / 월간 식별 사용자",
    "of_limit": "{{current}} / {{limit}}",
    "unlimited": "Unlimited / 무제한",
    "upgrade": "Upgrade / 업그레이드",
    "manage_subscription": "Manage Subscription / 구독 관리",
    "compare_plans": "Compare Plans / 요금제 비교",
    "checkout_success_title": "Upgrade Complete / 업그레이드 완료",
    "checkout_success_message": "Your plan has been upgraded to {{plan}}. / {{plan}} 플랜으로 업그레이드되었습니다.",
    "checkout_cancel_message": "Checkout was cancelled. Your plan has not changed. / 결제가 취소되었습니다. 요금제가 변경되지 않았습니다.",
    "error_checkout_failed": "Failed to create checkout session. Please try again. / 결제 세션 생성에 실패했습니다. 다시 시도해주세요.",
    "free_trial": "{{days}}-day free trial / {{days}}일 무료 체험",
    "per_month": "/month / /월",
    "per_year": "/year / /년",
    "contact_sales": "Contact Sales / 영업팀 문의",
    "pricing_table": {
      "feature": "Feature / 기능",
      "max_projects": "Max Projects / 최대 프로젝트",
      "monthly_responses": "Monthly Responses / 월간 응답",
      "monthly_miu": "Monthly MIU / 월간 MIU",
      "price": "Price / 가격",
      "custom_negotiation": "Custom pricing / 맞춤 가격"
    }
  },
  "branding": {
    "title": "Branding & Whitelabel / 브랜딩 & 화이트라벨",
    "survey_branding": "Survey Branding / 설문 브랜딩",
    "link_survey_branding": "Link Survey Branding / 링크 설문 브랜딩",
    "in_app_survey_branding": "In-app Survey Branding / 인앱 설문 브랜딩",
    "branding_enabled": "Show 'Powered by Inquiry' / 'Powered by Inquiry' 표시",
    "branding_disabled": "Hide 'Powered by Inquiry' / 'Powered by Inquiry' 숨기기",
    "upgrade_to_remove": "Upgrade to remove branding / 브랜딩 제거를 위해 업그레이드하세요",
    "whitelabel": "Whitelabel / 화이트라벨",
    "email_logo": "Email Logo / 이메일 로고",
    "email_logo_description": "Custom logo for notification emails / 알림 이메일에 표시될 커스텀 로고",
    "favicon": "Favicon / 파비콘",
    "favicon_description": "Custom favicon for link survey pages / 링크 설문 페이지에 표시될 커스텀 파비콘",
    "logo_url_placeholder": "Enter image URL / 이미지 URL 입력",
    "save": "Save / 저장",
    "restore_default": "Restore Default / 기본값 복원",
    "preview": "Preview / 미리보기",
    "invalid_url": "Please enter a valid image URL. / 유효한 이미지 URL을 입력해주세요.",
    "save_success": "Settings saved successfully. / 설정이 저장되었습니다.",
    "upgrade_required": "This feature requires an upgrade. / 이 기능을 사용하려면 업그레이드가 필요합니다."
  },
  "license": {
    "title": "Enterprise License / 엔터프라이즈 라이선스",
    "status": "License Status / 라이선스 상태",
    "status_active": "Active / 활성",
    "status_expired": "Expired / 만료",
    "status_unreachable": "Unreachable / 접근 불가",
    "status_invalid": "Invalid / 유효하지 않음",
    "status_no_license": "No License / 라이선스 없음",
    "license_key": "License Key / 라이선스 키",
    "license_key_placeholder": "Enter your Enterprise License Key / 엔터프라이즈 라이선스 키 입력",
    "save_key": "Register Key / 키 등록",
    "feature_flags": "Feature Flags / 기능 플래그",
    "enabled": "Enabled / 활성",
    "disabled": "Disabled / 비활성"
  },
  "common": {
    "upgrade_modal_title": "Upgrade Required / 업그레이드 필요",
    "upgrade_modal_message": "This feature is available on {{plan}} plan and above. / 이 기능은 {{plan}} 플랜 이상에서 사용 가능합니다.",
    "upgrade_now": "Upgrade Now / 지금 업그레이드",
    "maybe_later": "Maybe Later / 나중에"
  }
}
```

> 위 목록은 en/ko 양쪽에 해당하는 키를 나열한 것이며, 실제 구현 시 각 언어 파일에 해당 언어로 작성한다.
