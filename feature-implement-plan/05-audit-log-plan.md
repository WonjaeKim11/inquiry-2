# 기능 구현 계획: 감사 로그 (Audit Log)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 설명 | 우선순위 |
|---------|--------|------|---------|
| FN-001 | Audit Log Event Schema 정의 | Actor, Action(25종), Target(21종), Status 등의 필드를 포함하는 감사 로그 이벤트 스키마를 Zod로 정의 | 필수 |
| FN-002 | 감사 로그 기록 서비스 | 이벤트를 유효성 검사 후 Pino 구조화 로거로 출력. 실패 시 비즈니스 로직에 영향 없음 | 필수 |
| FN-003 | 감사 로그 래퍼 패턴 (withAuditLogging) | Server Action을 비침투적으로 래핑하여 성공/실패를 감지하고 자동으로 감사 로그를 기록하는 고차 함수 | 필수 |
| FN-004 | 변경 기록 생성 | created/updated/deleted 액션에 따라 changes 필드를 생성하고 PII Redaction 적용 | 필수 |
| FN-005 | 이벤트 기록 모드 | Background(setImmediate) 및 Blocking(await) 두 가지 모드 제공 | 필수 |
| FN-006 | IP 주소 기록 정책 | 환경변수 기반으로 IP 기록 활성화/비활성화 (GDPR 준수) | 필수 |
| FN-007 | License 활성화 조건 (이중 검사) | 환경변수(래퍼 레벨) + Feature Flag(서비스 레벨) 계층적 활성화 검사 | 필수 |
| FN-008 | 미확인 데이터 처리 | 확인 불가 필드에 "unknown" 상수 대입으로 이벤트 기록 연속성 보장 | 필수 |
| FN-009 | PII Redaction | 비밀번호, 토큰 등 민감 데이터를 changes에서 자동 제거 | 필수 |

### 1.2 비기능 요구사항

| NFR ID | 항목 | 요구사항 |
|--------|------|---------|
| NFR-001 | 비차단 기록 | Background(setImmediate) 방식으로 메인 요청을 차단하지 않음 |
| NFR-002 | 장애 격리 | 감사 로그 실패가 애플리케이션 정상 동작을 중단시키지 않음 (try-catch) |
| NFR-003 | 데이터 무결성 | 모든 이벤트는 Zod 스키마로 유효성 검증 후 기록 |
| NFR-004 | 보안 | PII 자동 제거, IP 주소 선택적 기록, 민감 데이터 배제 |

### 1.3 명세서 내 모호한 점 및 해석

| 항목 | 모호한 점 | 해석/결정 |
|------|----------|----------|
| Enterprise License 서비스 | License 서버 연동 구현이 명세 범위인지 불명확. Feature Flag 확인 로직의 구체적 구현 방법 미정의 | 현재 단계에서는 Enterprise License 서비스가 아직 구현되지 않은 상태이므로, `FeatureFlagService` 인터페이스를 정의하고 환경변수 기반 Mock 구현체를 사용. 추후 실제 License 서버 연동 시 교체 가능하도록 설계 |
| Pino 로거 | 기존 코드베이스에 Pino가 없음. NestJS 기본 Logger 사용 중 | 새로 pino + pino-pretty를 도입. 감사 로그 전용 Pino 인스턴스를 생성하여 NestJS Logger와 공존 |
| withAuditLogging 적용 대상 | "Server Action" 개념이 NestJS 컨텍스트에서 모호 (Next.js Server Action vs NestJS Service Method) | NestJS 환경에서는 Service 메서드를 래핑하는 데코레이터 패턴 또는 고차 함수로 구현. 명세의 부록 9.2에 나열된 10개 사례를 NestJS 서비스 메서드에 적용 |
| Environment ID 역추적 | Organization ID 해석 순서 3번째에 "Environment ID로부터 Organization 역추적" 언급. 현재 Environment 모델이 없음 | 현재 DB에 Environment 모델이 없으므로 이 해석 경로는 스텁 처리. 06-project-environment 구현 후 실제 로직 추가 |
| Memory Cache + Redis Cache | License 확인에 Memory Cache(1분 TTL) + Redis Cache(24시간 TTL) 언급. Redis 미도입 상태 | 1단계: Memory Cache(Map 기반, 1분 TTL)만 구현. Redis 통합은 향후 인프라 준비 후 추가 |
| `setImmediate` 사용 | NestJS 환경에서 setImmediate 사용은 가능하나 테스트 시 주의 필요 | Node.js 런타임에서 setImmediate 사용. 테스트 환경에서는 flush 가능한 유틸리티 제공 |

### 1.4 암묵적 요구사항

| 항목 | 설명 |
|------|------|
| Zod 라이브러리 도입 | 현재 프로젝트에 zod가 없음. audit-log 패키지에 zod 의존성 추가 필요 |
| Pino 라이브러리 도입 | 현재 프로젝트에 pino가 없음. 감사 로그 전용 구조화 로거로 pino 도입 필요 |
| 환경변수 추가 | `AUDIT_LOG_ENABLED`, `AUDIT_LOG_IP_RECORDING_ENABLED`, `ENTERPRISE_LICENSE_KEY` 등 환경변수 정의 필요 |
| 기존 AuditLogService 리팩토링 | 현재 Prisma DB 직접 기록 방식에서 Pino 로거 기반으로 전환. 기존 호출부(auth 모듈 등)도 새 인터페이스에 맞게 마이그레이션 |
| PII Redaction 대상 필드 목록 정의 | 명세에서 "별도 정의/관리"라고만 언급. 구체적 필드 목록(password, token, secret, accessToken, refreshToken 등)을 구현 시 확정 필요 |
| Target ID 매핑 로직 | 17개 Target 유형에 대한 컨텍스트-ID 매핑 테이블을 코드로 구현 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
libs/server/audit-log/
├── src/
│   ├── index.ts                          # 퍼블릭 API 엑스포트
│   └── lib/
│       ├── audit-log.module.ts           # NestJS 글로벌 모듈 (리팩토링)
│       ├── audit-log.service.ts          # 메인 서비스 (리팩토링)
│       ├── audit-log.logger.ts           # Pino 기반 감사 전용 로거
│       ├── audit-log.schema.ts           # Zod 이벤트 스키마 + 타입 정의
│       ├── audit-log.types.ts            # Enum/상수/타입 정의
│       ├── audit-log.wrapper.ts          # withAuditLogging 고차 함수
│       ├── audit-log.changes.ts          # 변경 기록(changes) 생성 + diff 유틸
│       ├── audit-log.pii-redaction.ts    # PII Redaction 함수
│       ├── audit-log.ip-resolver.ts      # IP 주소 추출/정책 적용
│       ├── audit-log.target-resolver.ts  # Target ID 해석 로직
│       └── feature-flag.service.ts       # Feature Flag 서비스 (인터페이스 + Mock)
```

**데이터 흐름:**
```
[비즈니스 로직 (Service Method)]
    |
    v
[withAuditLogging 래퍼] ── 환경변수 AUDIT_LOG_ENABLED 확인 (1차 게이팅)
    |
    +── 원래 메서드 실행
    |
    +── 성공/실패 감지
    |
    v
[이벤트 데이터 수집]
    |── Actor: 인자로 전달된 userId / "unknown"
    |── Target: TargetResolver로 컨텍스트에서 ID 추출
    |── Organization: 컨텍스트 > 입력 파라미터 > "unknown" 순서
    |── IP: IP Resolver (환경변수 확인 후 헤더에서 추출)
    |── Changes: ChangeBuilder (이전/새 객체 diff + PII Redaction)
    |
    v
[AuditLogService.logEvent()] ── Feature Flag 확인 (2차 게이팅)
    |
    +── Zod 스키마 유효성 검증
    |
    +── 검증 실패 → 에러 로그 출력, 이벤트 버림
    |
    v
[AuditLogger (Pino)] ── 구조화된 JSON 출력
```

### 2.2 데이터 모델

**현재 AuditLog Prisma 모델은 유지하되, 새로운 감사 로그 시스템은 Pino 로거로 출력한다.** 기존 Prisma 기반 DB 기록은 레거시 호환성을 위해 당분간 병행할 수 있으나, 명세에서는 Pino 출력이 주요 기록 수단이다.

**AuditLogEvent 타입 (TypeScript + Zod):**

```typescript
// audit-log.types.ts

/** Actor 유형 Enum */
export const AuditActorType = {
  USER: 'user',
  API: 'api',
  SYSTEM: 'system',
} as const;
export type AuditActorType = (typeof AuditActorType)[keyof typeof AuditActorType];

/** Audit Action (25종) */
export const AuditAction = {
  // CRUD
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  MERGED: 'merged',
  CREATED_UPDATED: 'createdUpdated',
  CREATED_FROM_CSV: 'createdFromCSV',
  BULK_CREATED: 'bulkCreated',
  // 인증
  SIGNED_IN: 'signedIn',
  AUTHENTICATION_ATTEMPTED: 'authenticationAttempted',
  AUTHENTICATION_SUCCEEDED: 'authenticationSucceeded',
  PASSWORD_VERIFIED: 'passwordVerified',
  USER_SIGNED_OUT: 'userSignedOut',
  PASSWORD_RESET: 'passwordReset',
  // 2FA
  TWO_FACTOR_VERIFIED: 'twoFactorVerified',
  TWO_FACTOR_ATTEMPTED: 'twoFactorAttempted',
  TWO_FACTOR_REQUIRED: 'twoFactorRequired',
  // 이메일
  VERIFICATION_EMAIL_SENT: 'verificationEmailSent',
  EMAIL_VERIFIED: 'emailVerified',
  EMAIL_VERIFICATION_ATTEMPTED: 'emailVerificationAttempted',
  // 토큰
  JWT_TOKEN_CREATED: 'jwtTokenCreated',
  // 구독
  SUBSCRIPTION_ACCESSED: 'subscriptionAccessed',
  SUBSCRIPTION_UPDATED: 'subscriptionUpdated',
  // Survey
  COPIED_TO_OTHER_ENVIRONMENT: 'copiedToOtherEnvironment',
  // Response
  ADDED_TO_RESPONSE: 'addedToResponse',
  REMOVED_FROM_RESPONSE: 'removedFromResponse',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

/** Audit Target (21종) */
export const AuditTarget = {
  USER: 'user',
  TWO_FACTOR_AUTH: 'twoFactorAuth',
  API_KEY: 'apiKey',
  ORGANIZATION: 'organization',
  MEMBERSHIP: 'membership',
  INVITE: 'invite',
  TEAM: 'team',
  PROJECT_TEAM: 'projectTeam',
  SURVEY: 'survey',
  SEGMENT: 'segment',
  ACTION_CLASS: 'actionClass',
  RESPONSE: 'response',
  TAG: 'tag',
  QUOTA: 'quota',
  PROJECT: 'project',
  LANGUAGE: 'language',
  WEBHOOK: 'webhook',
  INTEGRATION: 'integration',
  CONTACT: 'contact',
  CONTACT_ATTRIBUTE_KEY: 'contactAttributeKey',
  FILE: 'file',
} as const;
export type AuditTarget = (typeof AuditTarget)[keyof typeof AuditTarget];

/** Audit Status */
export const AuditStatus = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const;
export type AuditStatus = (typeof AuditStatus)[keyof typeof AuditStatus];

/** 미확인 데이터 기본값 */
export const UNKNOWN = 'unknown' as const;
```

### 2.3 API 설계 (해당 없음)

감사 로그 시스템은 내부 서비스로, 외부 API를 노출하지 않는다. 감사 로그 조회 API는 Out-of-scope이다.

### 2.4 주요 컴포넌트 설계

#### 2.4.1 Zod 이벤트 스키마 (`audit-log.schema.ts`)

```typescript
import { z } from 'zod';

export const auditLogEventSchema = z.object({
  actor: z.object({
    id: z.string().min(1),
    type: z.enum(['user', 'api', 'system']),
  }),
  action: z.enum([/* 25종 action 값 */]),
  target: z.object({
    id: z.string().optional(),
    type: z.enum([/* 21종 target 값 */]),
  }),
  status: z.enum(['success', 'failure']),
  timestamp: z.string().datetime(), // ISO 8601
  organizationId: z.string().min(1),
  ipAddress: z.string().optional(),
  changes: z.record(z.unknown()).optional(),
  eventId: z.string().optional(),
  apiUrl: z.string().url().optional(),
});

export type AuditLogEvent = z.infer<typeof auditLogEventSchema>;
```

#### 2.4.2 PII Redaction (`audit-log.pii-redaction.ts`)

```typescript
/** PII로 간주되는 필드명 목록 */
const PII_FIELDS = new Set([
  'password', 'hashedPassword', 'currentPassword', 'newPassword',
  'token', 'accessToken', 'refreshToken', 'inviteToken',
  'secret', 'twoFactorSecret', 'backupCodes',
  'apiKey', 'apiSecret',
]);

/**
 * 객체에서 PII 필드를 제거한다.
 * 재귀적으로 중첩 객체도 처리한다.
 */
export function redactPii(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (PII_FIELDS.has(key)) {
      result[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactPii(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
```

#### 2.4.3 변경 기록 생성기 (`audit-log.changes.ts`)

```typescript
import { redactPii } from './audit-log.pii-redaction';

/**
 * action 유형에 따라 changes 객체를 생성한다.
 * - created: 새 객체 전체
 * - updated: 이전/새 객체의 diff
 * - deleted: 이전 객체 전체
 */
export function buildChanges(params: {
  action: string;
  previousObject?: Record<string, unknown>;
  newObject?: Record<string, unknown>;
}): Record<string, unknown> | undefined {
  const { action, previousObject, newObject } = params;

  if (!previousObject && !newObject) return undefined;

  let changes: Record<string, unknown>;

  if (action === 'created' && newObject) {
    changes = { ...newObject };
  } else if (action === 'updated' && previousObject && newObject) {
    changes = computeDiff(previousObject, newObject);
  } else if (action === 'deleted' && previousObject) {
    changes = { ...previousObject };
  } else {
    return undefined;
  }

  return redactPii(changes);
}

/** 두 객체 간 변경된 필드만 추출 (shallow diff) */
function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, unknown> {
  const diff: Record<string, unknown> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diff[key] = { before: before[key], after: after[key] };
    }
  }
  return diff;
}
```

#### 2.4.4 withAuditLogging 래퍼 (`audit-log.wrapper.ts`)

```typescript
/**
 * NestJS 서비스 메서드를 감사 로그로 래핑하는 고차 함수.
 * 환경변수 확인(1차 게이팅) -> 원래 함수 실행 -> 성공/실패 감지 -> Background 기록
 */
export function withAuditLogging<TArgs extends unknown[], TResult>(
  auditLogService: AuditLogService,
  config: {
    action: AuditAction;
    targetType: AuditTarget;
  },
  fn: (...args: TArgs) => Promise<TResult>,
  contextExtractor: (args: TArgs, result?: TResult) => AuditContext,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    // 1차 게이팅: 환경변수 확인
    if (process.env['AUDIT_LOG_ENABLED'] !== '1') {
      return fn(...args);
    }

    try {
      const result = await fn(...args);
      // Background 기록 (setImmediate)
      setImmediate(() => {
        try {
          const context = contextExtractor(args, result);
          auditLogService.logEvent({
            action: config.action,
            targetType: config.targetType,
            status: 'success',
            context,
          });
        } catch (err) {
          // 감사 로그 기록 실패는 비즈니스 로직에 영향 없음
        }
      });
      return result;
    } catch (error) {
      // 실패 시에도 감사 로그 기록
      setImmediate(() => {
        try {
          const context = contextExtractor(args);
          auditLogService.logEvent({
            action: config.action,
            targetType: config.targetType,
            status: 'failure',
            context,
          });
        } catch {
          // 감사 로그 기록 실패는 비즈니스 로직에 영향 없음
        }
      });
      throw error; // 원래 에러 re-throw (에러 투명성)
    }
  };
}
```

#### 2.4.5 Feature Flag 서비스 (`feature-flag.service.ts`)

```typescript
/**
 * Enterprise License Feature Flag 서비스.
 * 현재 단계에서는 환경변수 기반 Mock 구현.
 * 추후 실제 License 서버 연동 시 교체 가능.
 */
@Injectable()
export class FeatureFlagService {
  // Memory Cache: Map 기반 (1분 TTL)
  private cache = new Map<string, { value: boolean; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60_000; // 1분

  /**
   * 감사 로그 Feature Flag 확인.
   * 캐시 히트 시 캐시 값 반환, 미스 시 환경변수 확인.
   */
  isAuditLogEnabled(): boolean {
    const cached = this.cache.get('auditLogs');
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // Mock: 환경변수 기반
    const enabled = process.env['ENTERPRISE_AUDIT_LOG_FEATURE'] === 'true';
    this.cache.set('auditLogs', {
      value: enabled,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
    return enabled;
  }
}
```

### 2.5 기존 시스템 영향 분석

| 영향 받는 모듈 | 변경 유형 | 설명 |
|---------------|----------|------|
| `libs/server/audit-log` | 전면 리팩토링 | 기존 Prisma 직접 기록 -> Pino 로거 기반 + Zod 검증 + 이중 게이팅 |
| `libs/server/auth` (ServerAuthService) | 호출부 수정 | 기존 `auditLogService.log()` 호출을 새 인터페이스 `logEvent()`로 마이그레이션 (하위 호환 메서드 유지 가능) |
| `apps/server/src/app/app.module.ts` | import 수정 | AuditLogModule 설정 변경 (FeatureFlagService 추가 등) |
| `packages/db/prisma/schema.prisma` | 변경 없음 | 기존 AuditLog 모델은 유지 (레거시 호환). Pino 출력이 주된 기록 수단 |
| `.env.example` | 환경변수 추가 | `AUDIT_LOG_ENABLED`, `AUDIT_LOG_IP_RECORDING_ENABLED`, `ENTERPRISE_AUDIT_LOG_FEATURE` 추가 |
| `libs/server/audit-log/package.json` | 의존성 추가 | `zod`, `pino`, `pino-pretty` 추가 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 태스크명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|---------|------|--------|--------|----------|
| T-01 | 의존성 설치 및 환경 설정 | zod, pino, pino-pretty 패키지 설치. 환경변수 정의 (.env.example 업데이트) | - | 낮음 | 0.5h |
| T-02 | 타입 및 상수 정의 | AuditActorType, AuditAction(25종), AuditTarget(21종), AuditStatus, UNKNOWN 상수 정의 (`audit-log.types.ts`) | T-01 | 낮음 | 1h |
| T-03 | Zod 이벤트 스키마 구현 | AuditLogEvent Zod 스키마 정의 및 타입 추출 (`audit-log.schema.ts`) | T-02 | 중간 | 1.5h |
| T-04 | PII Redaction 함수 구현 | PII 필드 목록 정의 및 재귀적 redaction 함수 구현 (`audit-log.pii-redaction.ts`) | - | 중간 | 1h |
| T-05 | 변경 기록 생성기 구현 | buildChanges 함수 (created/updated/deleted 분기) + computeDiff + PII Redaction 통합 (`audit-log.changes.ts`) | T-04 | 중간 | 1.5h |
| T-06 | IP 주소 해석기 구현 | 환경변수 확인 + 요청 헤더에서 IP 추출 로직 (`audit-log.ip-resolver.ts`) | T-02 | 낮음 | 0.5h |
| T-07 | Target ID 해석기 구현 | 17개 Target 유형별 컨텍스트-ID 매핑 로직 (`audit-log.target-resolver.ts`) | T-02 | 중간 | 1h |
| T-08 | Feature Flag 서비스 구현 | 인터페이스 정의 + 환경변수 기반 Mock 구현 + Memory Cache (`feature-flag.service.ts`) | T-01 | 중간 | 1h |
| T-09 | Pino 감사 전용 로거 구현 | Pino 인스턴스 생성 및 설정 (`audit-log.logger.ts`) | T-01 | 낮음 | 0.5h |
| T-10 | AuditLogService 리팩토링 | 새로운 logEvent() 메서드 구현 (2차 게이팅 + Zod 검증 + Pino 출력). 기존 log() 메서드는 하위 호환용 유지 | T-03, T-05, T-06, T-07, T-08, T-09 | 높음 | 3h |
| T-11 | withAuditLogging 래퍼 구현 | 고차 함수 패턴 구현 (1차 게이팅 + 성공/실패 감지 + Background 기록) | T-10 | 높음 | 2h |
| T-12 | 이벤트 기록 모드 구현 | Background(setImmediate) + Blocking(await) 두 가지 큐 함수 구현 | T-10 | 중간 | 1h |
| T-13 | AuditLogModule 리팩토링 | FeatureFlagService 추가, ConfigModule 의존성 처리 | T-08, T-10 | 낮음 | 0.5h |
| T-14 | 기존 호출부 마이그레이션 | ServerAuthService의 기존 auditLogService.log() 호출을 새 인터페이스로 전환 | T-10 | 중간 | 2h |
| T-15 | index.ts 퍼블릭 API 업데이트 | 새 모듈들을 엑스포트하도록 index.ts 갱신 | T-10, T-11, T-12 | 낮음 | 0.25h |
| T-16 | 단위 테스트 작성 | Zod 스키마, PII Redaction, Changes Builder, IP Resolver, Target Resolver, Feature Flag 테스트 | T-03~T-09 | 높음 | 3h |
| T-17 | 통합 테스트 작성 | AuditLogService.logEvent() E2E 흐름, withAuditLogging 래퍼 통합 테스트 | T-10, T-11 | 높음 | 2h |
| T-18 | 빌드 검증 및 문서화 | 전체 빌드 확인, code-history 문서 작성 | T-15 | 낮음 | 1h |

### 3.2 구현 순서 및 마일스톤

**마일스톤 1: 기반 타입/스키마/유틸리티 (T-01 ~ T-09)**
- 목표: 감사 로그의 핵심 데이터 타입, 스키마, 유틸리티 함수 완성
- 검증: 각 유틸리티의 단위 테스트 통과
- 예상 소요: 8.5h

```
T-01 (환경 설정)
  ├─> T-02 (타입/상수)
  │     ├─> T-03 (Zod 스키마)
  │     ├─> T-06 (IP 해석기)
  │     └─> T-07 (Target 해석기)
  ├─> T-04 (PII Redaction)
  │     └─> T-05 (Changes 생성기)
  ├─> T-08 (Feature Flag)
  └─> T-09 (Pino 로거)
```

**마일스톤 2: 핵심 서비스 및 래퍼 (T-10 ~ T-13)**
- 목표: AuditLogService 리팩토링, withAuditLogging 래퍼, 이벤트 기록 모드 완성
- 검증: 새 logEvent() 메서드로 이벤트가 Pino에 정상 출력되는지 확인
- 예상 소요: 6.5h

```
T-03, T-05, T-06, T-07, T-08, T-09
  └─> T-10 (Service 리팩토링)
        ├─> T-11 (withAuditLogging)
        ├─> T-12 (기록 모드)
        └─> T-13 (Module 리팩토링)
```

**마일스톤 3: 마이그레이션 및 통합 (T-14 ~ T-15)**
- 목표: 기존 호출부 마이그레이션, 퍼블릭 API 완성
- 검증: 기존 인증 흐름에서 감사 로그가 새 시스템으로 정상 기록
- 예상 소요: 2.25h

```
T-10
  └─> T-14 (호출부 마이그레이션)
T-10, T-11, T-12
  └─> T-15 (index.ts 업데이트)
```

**마일스톤 4: 테스트 및 문서화 (T-16 ~ T-18)**
- 목표: 충분한 테스트 커버리지, 문서화, 빌드 검증
- 검증: 전체 빌드 성공, 테스트 통과
- 예상 소요: 6h

```
T-03~T-09
  └─> T-16 (단위 테스트)
T-10, T-11
  └─> T-17 (통합 테스트)
T-15
  └─> T-18 (빌드/문서)
```

### 3.3 파일 수정 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|----------|----------|
| `libs/server/audit-log/package.json` | 수정 | zod, pino, pino-pretty 의존성 추가 |
| `libs/server/audit-log/src/lib/audit-log.types.ts` | 생성 | AuditActorType, AuditAction(25종), AuditTarget(21종), AuditStatus enum, UNKNOWN 상수 |
| `libs/server/audit-log/src/lib/audit-log.schema.ts` | 생성 | Zod 기반 AuditLogEvent 스키마 및 타입 추출 |
| `libs/server/audit-log/src/lib/audit-log.pii-redaction.ts` | 생성 | PII 필드 목록 정의, redactPii() 재귀 함수 |
| `libs/server/audit-log/src/lib/audit-log.changes.ts` | 생성 | buildChanges() 함수, computeDiff() 유틸리티 |
| `libs/server/audit-log/src/lib/audit-log.ip-resolver.ts` | 생성 | resolveIpAddress() 함수 (환경변수 확인 + 헤더 추출) |
| `libs/server/audit-log/src/lib/audit-log.target-resolver.ts` | 생성 | resolveTargetId() 함수 (17개 Target 유형별 매핑) |
| `libs/server/audit-log/src/lib/feature-flag.service.ts` | 생성 | FeatureFlagService (NestJS Injectable, Memory Cache) |
| `libs/server/audit-log/src/lib/audit-log.logger.ts` | 생성 | Pino 감사 전용 로거 인스턴스 생성 및 설정 |
| `libs/server/audit-log/src/lib/audit-log.service.ts` | 수정 | logEvent() 메서드 추가 (2차 게이팅 + Zod 검증 + Pino 출력). 기존 log() 유지 |
| `libs/server/audit-log/src/lib/audit-log.wrapper.ts` | 생성 | withAuditLogging() 고차 함수 (1차 게이팅 + Background 기록) |
| `libs/server/audit-log/src/lib/audit-log.module.ts` | 수정 | FeatureFlagService provider 추가, ConfigModule import |
| `libs/server/audit-log/src/index.ts` | 수정 | 새 모듈들 엑스포트 추가 |
| `libs/server/auth/src/lib/server-auth.service.ts` | 수정 | auditLogService.log() 호출을 새 logEvent() 인터페이스로 전환 |
| `.env.example` | 수정 | AUDIT_LOG_ENABLED, AUDIT_LOG_IP_RECORDING_ENABLED, ENTERPRISE_AUDIT_LOG_FEATURE 추가 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 확률 | 완화 전략 |
|--------|------|------|----------|
| Pino 도입에 따른 NestJS Logger와의 충돌 | 중간 | 낮음 | 감사 로그 전용 별도 Pino 인스턴스 사용. NestJS 기본 Logger는 그대로 유지. 두 로거가 독립적으로 동작하도록 설계 |
| 기존 auditLogService.log() 호출부 마이그레이션 누락 | 높음 | 중간 | 기존 log() 메서드를 deprecated로 표시하되 삭제하지 않고 내부에서 logEvent() 위임 호출하는 하위 호환 레이어 유지 |
| setImmediate 기반 Background 기록의 테스트 어려움 | 중간 | 높음 | jest.useFakeTimers() 또는 setImmediate를 주입 가능한 함수로 추상화하여 테스트 시 동기 실행 가능하도록 설계 |
| Enterprise License 미구현으로 Feature Flag 검증 불가 | 중간 | 높음 | 환경변수 기반 Mock 구현체로 대체. 인터페이스를 명확히 정의하여 추후 교체 용이하게 설계. 통합 테스트에서 Mock 주입 |
| Environment-Organization 역추적 경로 미구현 | 낮음 | 확정 | Organization ID 해석 순서 3번째(Environment 역추적)를 스텁 처리하고 TODO 주석 남김. 06-project-environment 구현 후 활성화 |
| Zod 라이브러리 번들 크기 증가 | 낮음 | 낮음 | 서버 사이드 전용이므로 번들 크기 영향 미미. 필요시 zod/mini 고려 |
| PII Redaction 대상 필드 누락 | 높음 | 중간 | 초기 필드 목록을 보수적으로 설정(password, token, secret 계열 모두 포함). 필드 목록을 상수 배열로 분리하여 쉽게 확장 가능하도록 설계 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 테스트 대상 | 테스트 시나리오 | 파일 위치 |
|------------|---------------|----------|
| `audit-log.schema.ts` | 유효한 이벤트 통과, 필수 필드 누락 시 실패, 잘못된 enum 값 거부, 선택 필드 없이도 통과, ISO 8601 형식 검증 | `__tests__/audit-log.schema.spec.ts` |
| `audit-log.pii-redaction.ts` | password 필드 redaction, 중첩 객체 재귀 처리, PII 아닌 필드 보존, 빈 객체 처리 | `__tests__/audit-log.pii-redaction.spec.ts` |
| `audit-log.changes.ts` | created 시 새 객체 반환, updated 시 diff 반환, deleted 시 이전 객체 반환, 양쪽 객체 없으면 undefined, PII redaction 적용 확인 | `__tests__/audit-log.changes.spec.ts` |
| `audit-log.ip-resolver.ts` | 환경변수 활성 + 헤더 IP 추출, 환경변수 비활성 시 "unknown", x-forwarded-for 파싱, 헤더 없으면 "unknown" | `__tests__/audit-log.ip-resolver.spec.ts` |
| `audit-log.target-resolver.ts` | 각 Target 유형별 올바른 ID 추출, 미매핑 유형 시 "unknown", 컨텍스트에 ID 없으면 "unknown" | `__tests__/audit-log.target-resolver.spec.ts` |
| `feature-flag.service.ts` | 환경변수 true -> enabled, 환경변수 없으면 disabled, 캐시 TTL 만료 시 재확인 | `__tests__/feature-flag.service.spec.ts` |
| `audit-log.types.ts` | 모든 Action 25종 정의 확인, 모든 Target 21종 정의 확인 | `__tests__/audit-log.types.spec.ts` |

### 5.2 통합 테스트

| 테스트 대상 | 테스트 시나리오 | 파일 위치 |
|------------|---------------|----------|
| `AuditLogService.logEvent()` | Feature Flag 활성 + 유효 이벤트 -> Pino 출력 확인, Feature Flag 비활성 -> 건너뜀, Zod 검증 실패 -> 에러 로그, 예외 발생 -> 비즈니스 로직 미영향 | `__tests__/audit-log.service.integration.spec.ts` |
| `withAuditLogging` | 환경변수 활성 + 성공 -> status="success" 기록, 환경변수 활성 + 실패 -> status="failure" + 에러 re-throw, 환경변수 비활성 -> 원래 함수만 실행, 감사 로그 기록 실패 -> 원래 결과 미영향 | `__tests__/audit-log.wrapper.integration.spec.ts` |
| 이벤트 기록 모드 | Background 모드: 비동기 실행 확인, Blocking 모드: await 완료 후 진행 확인 | `__tests__/audit-log.modes.integration.spec.ts` |

### 5.3 E2E 테스트 (해당 없음)

감사 로그 시스템은 백엔드 내부 서비스이며, UI가 Out-of-scope이므로 E2E 테스트는 현재 범위에 포함하지 않는다. 단, 기존 인증 E2E 테스트가 감사 로그 리팩토링 후에도 통과하는지 회귀 테스트로 확인한다.

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 설명 |
|------|------|
| Enterprise License 미구현 | 실제 License 서버 연동이 없으므로 환경변수 기반 Mock으로 대체. 실 프로덕션에서는 License 서비스 구현 후 교체 필요 |
| Redis Cache 미도입 | License 확인용 Redis Cache(24시간 TTL)가 명세에 있으나, Redis 인프라 미준비로 Memory Cache만 구현 |
| Environment-Organization 역추적 불가 | Environment 모델이 없어 Organization ID 해석 3번째 경로(Environment 역추적) 미구현 |
| 감사 로그 조회 UI 없음 | Out-of-scope. Pino로 출력된 로그는 외부 로그 수집 시스템(ELK, Datadog 등)으로 확인 필요 |
| 보존 정책 없음 | Retention Policy는 Out-of-scope. 로그 보존 기간 관리는 외부 시스템에 위임 |
| setImmediate Node.js 전용 | 명세에서 지정한 setImmediate는 Node.js 런타임에서만 동작. Edge Runtime에서는 Blocking 모드 사용 |

### 6.2 향후 개선 가능 사항

| 항목 | 설명 |
|------|------|
| 실제 Enterprise License 서비스 연동 | 29-subscription-billing-branding 구현 후 FeatureFlagService를 실제 License 서버 연동으로 교체 |
| Redis Cache 도입 | 인프라 준비 후 FeatureFlagService에 Redis Cache 레이어 추가 (24시간 TTL) |
| 감사 로그 조회 API/UI | 별도 기능 명세로 구현. Pino 로그를 DB에도 저장하는 이중 기록 또는 외부 로그 저장소 연동 고려 |
| 데코레이터 패턴 도입 | withAuditLogging을 NestJS 커스텀 데코레이터(`@AuditLogged()`)로 발전시켜 더 선언적인 사용 지원 |
| 이벤트 큐 시스템 | setImmediate 대신 Bull/BullMQ 등 메시지 큐를 활용한 더 안정적인 비동기 처리 고려 |
| PII Redaction 규칙 외부화 | PII 필드 목록을 설정 파일이나 DB에서 동적으로 로드하여 코드 변경 없이 관리 가능하도록 개선 |

---

## 7. i18n 고려사항 (클라이언트 UI 변경)

감사 로그 시스템은 서버 사이드 전용 기능이며, 감사 로그 조회 UI는 Out-of-scope이므로 현재 단계에서 i18n 관련 변경사항은 없다.

향후 감사 로그 조회 UI가 구현될 경우, 다음 번역 키가 필요할 수 있다:
- Action 25종의 표시명 (예: `audit.action.created`, `audit.action.signedIn` 등)
- Target 21종의 표시명 (예: `audit.target.user`, `audit.target.organization` 등)
- Status 표시명 (예: `audit.status.success`, `audit.status.failure`)
- 감사 로그 조회 페이지 UI 텍스트
