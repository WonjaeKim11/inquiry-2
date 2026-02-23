# 1단계: 공통 기준/게이팅 인프라

## Overview

Inquiry 설문조사 SaaS 플랫폼의 8단계 구현 중 **1단계(공통 기준/게이팅)**를 완료했다. 이 단계는 Redis, 표준 에러 처리, 로깅, License/Feature Flag, 감사 로그 리팩토링, 다국어 확장 등 **이후 모든 기능의 인프라 기반**을 구축하는 핵심 단계이다.

구현된 FSD:
- **FSD-099**: 비기능/인터페이스 부록 (Redis, Core, Logger, Sentry, License, Rate Limit, API Key, RBAC, Health Check)
- **FSD-005**: 감사 로그 리팩토링 (Zod 검증, PII Redaction, Pino, Feature Flag)
- **FSD-030**: 관리자 UI 다국어 (15개 로케일, shared-i18n, User 모듈)
- **FSD-029**: License/Feature Flag만 구현, Stripe 빌링/브랜딩은 스킵 (SKIPPED-FEATURES.md 참조)

## Changed Files

### 신규 생성 라이브러리

| 패키지 | 경로 | 역할 |
|--------|------|------|
| `@inquiry/server-redis` | `libs/server/redis/` | Redis @Global 모듈 (ioredis 래퍼, no-op 지원) |
| `@inquiry/server-core` | `libs/server/core/` | 표준 에러 필터, Zod 파이프, DTO, 시스템 상수 |
| `@inquiry/server-logger` | `libs/server/logger/` | Pino 기반 NestJS 로거 (dev: pretty, prod: JSON) |
| `@inquiry/server-sentry` | `libs/server/sentry/` | Sentry 에러 트래킹 (DSN 미설정 시 no-op) |
| `@inquiry/server-license` | `libs/server/license/` | License/Feature Flag (Memory→Redis 캐시, 3단계 게이팅) |
| `@inquiry/server-user` | `libs/server/user/` | 사용자 프로필 관리 (로케일 변경 API) |
| `@inquiry/shared-i18n` | `packages/shared-i18n/` | 15개 로케일 설정 공유 패키지 |

### 주요 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `docker-compose.yml` | Redis 7 서비스 추가 |
| `.env.example` | REDIS_URL, RATE_LIMIT_DISABLED, SENTRY_DSN, LOG_LEVEL, LICENSE_KEY 추가 |
| `packages/db/prisma/schema.prisma` | MembershipRole에 BILLING 추가, ApiKey 모델 신규 |
| `apps/server/src/app/app.module.ts` | 모든 신규 모듈 import |
| `apps/server/src/main.ts` | Pino Logger, GlobalExceptionFilter, Sentry, 환경변수 검증 |
| `libs/server/rate-limit/` | ThrottlerModule.forRootAsync() + Redis 스토리지 |
| `libs/server/auth/` | API Key Guard, RBAC Guard, Roles 데코레이터, AuditLog logEvent() 마이그레이션 |
| `libs/server/audit-log/` | Zod 검증, PII Redaction, Pino 출력, Feature Flag 기반 제어 |
| `libs/server/email/` | locale 파라미터 추가 (향후 다국어 이메일 지원) |
| `libs/server/auth/src/lib/strategies/jwt.strategy.ts` | validate()에 locale 필드 추가 |
| `libs/client/core/src/lib/api.ts` | 429/5xx 지수 백오프 재시도 (최대 3회) |
| `libs/client/core/src/lib/error.ts` | ApiError 인터페이스, parseApiError() 유틸리티 |
| `libs/client/core/src/lib/auth-context.tsx` | User 타입에 locale 필드 추가 |
| `apps/client/src/app/i18n/settings.ts` | 2개→15개 로케일 확장 |
| `apps/client/src/app/i18n/client.ts` | 정적 임포트 → 동적 로드 (resourcesToBackend) |
| `libs/client/ui/` | LanguageSelector 컴포넌트 추가 |
| `scripts/check-i18n.ts` | 번역 키 누락 검사 스크립트 |

## Major Changes

### 1. Redis 모듈 (`libs/server/redis/`)

```typescript
// REDIS_URL 미설정 시 모든 메서드가 no-op으로 동작
@Global()
@Module({ providers: [RedisService], exports: [RedisService] })
export class RedisModule {}
```

- `get/set/del/exists/incr/expire/ttl` 메서드 제공
- `isConnected` getter로 연결 상태 확인
- Rate Limit, License 캐시에서 공유 사용

### 2. 표준 에러 처리 (`libs/server/core/`)

- `GlobalExceptionFilter`: 모든 예외를 `{ statusCode, error, message, details?, timestamp, path }` 형태로 표준화
- `ZodValidationPipe`: Zod 스키마 기반 요청 Body 검증
- Sentry 통합: `setSentry(sentryService)` 호출 시 500 에러 자동 보고

### 3. License/Feature Flag (`libs/server/license/`)

캐시 계층: Memory(1분) → Redis(24시간) → License Key 파싱 → Grace Period(3일)

```typescript
// 3가지 게이팅 패턴
checkHardGate(feature)    // 403 Forbidden
checkSoftGate(feature)    // 기본값 폴백
checkCapacityGate(limit)  // 수량 제한 확인
```

`@RequireLicense('feature')` 데코레이터로 컨트롤러에 선언적 적용.

### 4. 감사 로그 리팩토링 (`libs/server/audit-log/`)

기존 `log()` (하위 호환) + 신규 `logEvent()`:
- Zod 스키마 검증 (AuditEventSchema)
- PII Redaction: 이메일, IP, 토큰 등 민감 정보 마스킹
- Pino 구조화 로그 출력 (감사 전용 인스턴스)
- Feature Flag로 DB 저장, 로그 출력, PII 마스킹 개별 제어

### 5. 다국어 확장 (15개 로케일)

지원 언어: en-US, ko-KR, ja-JP, zh-Hans-CN, zh-Hant-TW, de-DE, es-ES, fr-FR, pt-BR, pt-PT, ru-RU, nl-NL, sv-SE, hu-HU, ro-RO

- `packages/shared-i18n/`: 로케일 상수를 서버/클라이언트 공유
- 클라이언트: `resourcesToBackend`로 동적 번역 파일 로드
- 서버: `PATCH /api/users/me/locale` 엔드포인트
- JWT validate()에서 locale 필드 포함하여 반환

## How to use it

### Redis 사용
```bash
# .env에 추가
REDIS_URL=redis://localhost:6379

# Docker로 Redis 기동
docker compose up -d redis
```

### Health Check
```bash
curl http://localhost:3000/api/health
# { "status": "ok", "timestamp": "...", "services": { "database": { "status": "up" }, "redis": { "status": "up" } } }
```

### License Key
```bash
# .env에 추가 (base64 인코딩된 JSON)
LICENSE_KEY=eyJwbGFuIjoicHJvIiwiZmVhdHVyZXMiOlsic3VydmV5LmJhc2ljIl19

# 미설정 시 무료 플랜(free)으로 동작
```

### API Key 인증
```bash
# x-api-key 헤더로 인증
curl -H "x-api-key: fbk_xxxxx" http://localhost:3000/api/...
```

### RBAC
```typescript
@UseGuards(AuthGuard('jwt'), OrgRoleGuard)
@Roles(MembershipRole.ADMIN, MembershipRole.OWNER)
@Get('settings')
getSettings() { ... }
```

### 로케일 변경
```bash
curl -X PATCH http://localhost:3000/api/users/me/locale \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"locale": "ko-KR"}'
```

### 감사 로그 (신규 방식)
```typescript
this.auditLogService.logEvent({
  action: 'survey.created',
  userId: user.id,
  targetType: 'survey',
  targetId: survey.id,
  organizationId: org.id,
  ipAddress: resolveIp(req),
  metadata: { surveyTitle: survey.title },
});
```

### 번역 검증
```bash
npx tsx scripts/check-i18n.ts
```

## Related Components/Modules

### 모듈 의존성 그래프
```
AppModule
├── ConfigModule (isGlobal)
├── ServerPrismaModule (@Global)
├── RedisModule (@Global) ← ioredis
├── LoggerModule (@Global) ← pino
├── SentryModule (@Global) ← @sentry/node
├── LicenseModule (@Global) ← RedisModule
├── RateLimitModule ← RedisModule, @nestjs/throttler
├── EmailModule (@Global) ← nodemailer
├── AuditLogModule (@Global) ← LicenseModule, pino
├── ServerAuthModule ← PassportModule, JwtModule
├── UserModule ← AuditLogModule, shared-i18n
└── HealthModule ← ServerPrismaModule, RedisModule
```

### 클라이언트 의존성
```
@inquiry/client
├── @inquiry/shared-i18n (로케일 설정 공유)
├── @inquiry/client-core (apiFetch, ApiError, AuthContext)
├── @inquiry/client-ui (LanguageSelector, UI 컴포넌트)
└── i18next + react-i18next + i18next-resources-to-backend
```

## Precautions

1. **DB 마이그레이션 미실행**: `MembershipRole.BILLING` 및 `ApiKey` 모델은 schema.prisma에 반영되었으나, PostgreSQL이 미실행 상태여서 마이그레이션이 완료되지 않았다. DB 기동 후 `pnpm db:migrate`를 실행해야 한다.

2. **신규 로케일 번역 미완성**: 13개 신규 로케일(de-DE, es-ES 등)의 번역 파일은 en-US 복사본이다. 실제 번역 작업이 별도로 필요하다.

3. **Sentry DSN**: `SENTRY_DSN` 환경변수 미설정 시 no-op으로 동작한다. 프로덕션 배포 전 설정 필요.

4. **License API 연동**: 현재 라이선스 검증은 로컬 키 파싱 방식이다. 향후 외부 라이선스 서버 또는 Stripe Subscription API로 대체 예정.

5. **이메일 다국어 템플릿**: `EmailService`에 `locale` 파라미터가 추가되었으나, 실제 다국어 이메일 템플릿은 미구현 상태이다.
