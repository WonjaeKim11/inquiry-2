# FSD-005 감사 로그 리팩토링

## Overview
기존의 단순한 fire-and-forget Prisma 기반 감사 로그 서비스를 엔터프라이즈급으로 리팩토링했다. 기존 `log()` 메서드는 하위 호환을 위해 유지하면서, Zod 검증/PII Redaction/Pino 구조화 로그/Feature Flag 기반 제어를 제공하는 `logEvent()` 메서드를 새로 추가했다. 인증 서비스(auth)의 5곳 호출을 새 API로 마이그레이션했다.

## Changed Files

### 신규 생성
- `libs/server/audit-log/src/lib/audit-log.types.ts` - AuditAction, AuditTarget, AuditMode, AuditEventInput 등 타입 정의 및 PII 필드 상수
- `libs/server/audit-log/src/lib/audit-log.schema.ts` - Zod 기반 AuditEventInput 런타임 검증 스키마
- `libs/server/audit-log/src/lib/audit-log.pii-redaction.ts` - 이메일/IP/민감정보 마스킹 유틸리티
- `libs/server/audit-log/src/lib/audit-log.changes.ts` - 엔티티 변경 전/후 diff 생성 유틸리티
- `libs/server/audit-log/src/lib/audit-log.ip-resolver.ts` - Express Request에서 클라이언트 IP 추출 (X-Forwarded-For 지원)
- `libs/server/audit-log/src/lib/audit-log.target-resolver.ts` - AuditAction에서 AuditTarget 자동 매핑
- `libs/server/audit-log/src/lib/audit-log.logger.ts` - 감사 전용 Pino 로거 인스턴스 팩토리
- `libs/server/audit-log/src/lib/audit-log.feature-flag.ts` - 라이선스 기반 기능 플래그 서비스 (Memory Cache 1분 TTL)
- `libs/server/audit-log/src/lib/audit-log.wrapper.ts` - 비즈니스 로직 래핑 고차 함수 (성공/실패 자동 기록)
- `code-history/2026-02-23-audit-log-refactoring.md` - 본 문서

### 수정
- `libs/server/audit-log/src/lib/audit-log.service.ts` - logEvent() 메서드 추가, AuditFeatureFlagService 의존성 주입
- `libs/server/audit-log/src/lib/audit-log.module.ts` - AuditFeatureFlagService 프로바이더/익스포트 추가
- `libs/server/audit-log/src/index.ts` - 새 모듈 8개 배럴 익스포트 추가
- `libs/server/audit-log/package.json` - @inquiry/server-license, @inquiry/server-logger, pino, pino-pretty, zod 의존성 추가
- `libs/server/audit-log/tsconfig.lib.json` - logger, license 프로젝트 참조 추가
- `libs/server/auth/src/lib/server-auth.service.ts` - auditLogService.log() 5곳을 logEvent()로 마이그레이션

## Major Changes

### 1. 타입 시스템 (audit-log.types.ts)
27개 AuditAction과 10개 AuditTarget을 문자열 리터럴 유니온 타입으로 정의하여 컴파일 타임 타입 안전성을 보장한다.

### 2. Zod 런타임 검증 (audit-log.schema.ts)
`logEvent()` 호출 시 입력 데이터를 Zod 스키마로 검증한다. 검증 실패 시 이벤트를 무시하고 경고 로그만 남긴다.

### 3. PII Redaction (audit-log.pii-redaction.ts)
```typescript
maskEmail('abc@example.com')  // → 'a***@e***.com'
maskIp('192.168.1.100')        // → '192.168.*.*'
redactPii({ email: 'a@b.com', name: 'John' })  // → { email: 'a***@b***.com', name: 'John' }
```
중첩 객체도 재귀적으로 처리한다.

### 4. Feature Flag 제어 (audit-log.feature-flag.ts)
LicenseService의 `hasFeature()`를 통해 3가지 기능을 개별 제어한다:
- `audit.pii_redaction` - PII 마스킹 활성화
- `audit.log_output` - Pino 로그 출력 활성화
- `audit.db_storage` - DB 저장 활성화 (실패 시 기본 활성)

Memory Cache(1분 TTL)로 매 호출마다 라이선스 질의를 방지한다.

### 5. 서비스 리팩토링 (audit-log.service.ts)
```typescript
// 기존 API (하위 호환 유지)
auditLogService.log({ action: 'user.signup', entity: 'user', ... });

// 신규 API (권장)
auditLogService.logEvent({
  action: 'user.signup',
  targetType: 'user',
  userId: user.id,
  targetId: user.id,
  ipAddress,
  metadata: { source: 'web' },
  changes: { after: { email: user.email } },
});
```

### 6. Auth 서비스 마이그레이션
signup, login, verifyEmail, forgotPassword, resetPassword 5곳의 `log()` 호출을 `logEvent()`로 전환했다.

## How to use it

### 기본 감사 이벤트 기록
```typescript
import { AuditLogService } from '@inquiry/server-audit-log';

@Injectable()
export class SurveyService {
  constructor(private readonly auditLogService: AuditLogService) {}

  async createSurvey(userId: string, data: CreateSurveyDto) {
    const survey = await this.prisma.survey.create({ data });

    this.auditLogService.logEvent({
      action: 'survey.created',
      userId,
      targetType: 'survey',
      targetId: survey.id,
      organizationId: data.organizationId,
    });

    return survey;
  }
}
```

### 변경 사항 diff 기록
```typescript
import { buildChanges } from '@inquiry/server-audit-log';

const before = { name: '기존 이름', description: '기존 설명' };
const after = { name: '새 이름', description: '기존 설명' };

this.auditLogService.logEvent({
  action: 'survey.updated',
  userId,
  targetType: 'survey',
  targetId: surveyId,
  changes: buildChanges(before, after),
  // → changes: { before: { name: '기존 이름' }, after: { name: '새 이름' } }
});
```

### 고차 함수로 자동 감사
```typescript
import { withAuditLogging } from '@inquiry/server-audit-log';

const result = await withAuditLogging(
  this.auditLogService,
  { action: 'survey.deleted', targetType: 'survey', userId, targetId: surveyId },
  () => this.prisma.survey.delete({ where: { id: surveyId } })
);
```

### IP 주소 추출
```typescript
import { resolveIp } from '@inquiry/server-audit-log';

@Post()
async handler(@Req() req: Request) {
  const ip = resolveIp(req);
  this.auditLogService.logEvent({ action: 'user.login', ..., ipAddress: ip });
}
```

## Related Components/Modules
- `@inquiry/server-prisma` - AuditLog 테이블 저장에 사용
- `@inquiry/server-license` - Feature Flag 판단에 사용 (hasFeature)
- `@inquiry/server-logger` - Pino 인스턴스 패턴 참조 (별도 audit 전용 인스턴스 사용)
- `@inquiry/server-auth` - 마이그레이션 대상 (5곳 logEvent 전환 완료)

## Precautions
- 기존 `log()` 메서드는 `@deprecated` 표시했지만 삭제하지 않았다. 다른 서비스의 마이그레이션이 완료되면 제거할 수 있다.
- Feature Flag가 라이선스에 등록되지 않으면 기본적으로 비활성 상태다. DB 저장만 실패 시 기본 활성이다.
- PII Redaction은 `AUDIT_CONSTANTS.PII_FIELDS`에 정의된 필드명과 정확히 일치하는 키만 마스킹한다.
- 빌드는 메인 에이전트의 통합 빌드에서 수행한다.
