# FSD-014 쿼터 관리 (Quota Management) 구현

## Overview
설문 응답 수를 조건별로 제한하는 **쿼터 관리** 기능을 구현했다.
4단계 설문 도메인 코어의 마지막 항목으로, 조건 충족 응답을 카운트하고 한도 초과 시 설문 종료/계속 진행 액션을 수행한다.

FSD-012(조건부 로직 엔진)의 `evaluateConditionGroup()`을 재사용하여 쿼터 조건을 평가하며,
DB 트랜잭션 내에서 원자적으로 카운트를 확인하고 ResponseQuota 레코드를 관리한다.

**스코프**: 공유 패키지(quota 타입/상수/검증) + 서버 모듈(CRUD + 평가 엔진) + Prisma 스키마 + i18n 15개 로케일

## Changed Files

### Phase 1-A: Prisma 스키마 변경 (1 수정)
| 파일 | 역할 |
|------|------|
| `packages/db/prisma/schema.prisma` | `QuotaAction`, `ResponseQuotaStatus` enum + `Quota`, `ResponseQuota` 모델 추가, Survey/Response 관계 확장 |

### Phase 1-B: 공유 패키지 quota 모듈 (4 신규 + 1 수정)
| 파일 | 역할 |
|------|------|
| `packages/survey-builder-config/src/lib/quota/types.ts` | `QuotaDefinition`, `QuotaEvaluationInput`, `QuotaEvaluationResult`, `QuotaCheckSummary` 타입 + Zod 스키마 |
| `packages/survey-builder-config/src/lib/quota/constants.ts` | `MAX_QUOTAS_PER_SURVEY(50)`, `QUOTA_NAME_MAX_LENGTH(100)`, `QUOTA_NAME_PATTERN` |
| `packages/survey-builder-config/src/lib/quota/validator.ts` | `validateQuotaName()`, `validateQuotaConditions()`, `validateQuotas()` |
| `packages/survey-builder-config/src/lib/quota/index.ts` | barrel export |
| `packages/survey-builder-config/src/index.ts` | quota 모듈 re-export 추가 |

### Phase 2: 서버 쿼터 모듈 (11 신규)
| 파일 | 역할 |
|------|------|
| `libs/server/quota/package.json` | `@inquiry/server-quota` 패키지 정의 |
| `libs/server/quota/tsconfig.json` | 프로젝트 레퍼런스 (composite) |
| `libs/server/quota/tsconfig.lib.json` | 빌드 설정 |
| `libs/server/quota/src/index.ts` | 공개 API barrel export |
| `libs/server/quota/src/lib/quota.module.ts` | NestJS 모듈 정의 |
| `libs/server/quota/src/lib/quota.controller.ts` | REST API 5개 엔드포인트 |
| `libs/server/quota/src/lib/services/quota.service.ts` | CRUD + endingCardId 검증 + 감사 로그 |
| `libs/server/quota/src/lib/services/quota-evaluation.service.ts` | 조건 평가 + 한도 확인 + DB 트랜잭션 |
| `libs/server/quota/src/lib/dto/create-quota.dto.ts` | Zod 기반 생성 DTO |
| `libs/server/quota/src/lib/dto/update-quota.dto.ts` | Zod 기반 수정 DTO |
| `libs/server/quota/src/lib/guards/quota-feature.guard.ts` | Enterprise Feature Flag 스텁 |

### Phase 3-A: 서버 통합 (3 수정)
| 파일 | 역할 |
|------|------|
| `apps/server/src/app/app.module.ts` | `QuotaModule` import 추가 |
| `apps/server/tsconfig.app.json` | `libs/server/quota/tsconfig.lib.json` reference 추가 |
| `libs/server/survey/src/lib/services/survey-validation.service.ts` | `validateForPublish()` 5단계: 쿼터 검증 추가 |

### Phase 3-B: i18n 번역 (15 수정)
| 파일 | 역할 |
|------|------|
| `apps/client/src/app/i18n/locales/{locale}/translation.json` | 15개 로케일에 `survey.quota` 번역 키 추가 |

로케일: en-US, ko-KR, ja-JP, de-DE, es-ES, fr-FR, hu-HU, nl-NL, pt-BR, pt-PT, ro-RO, ru-RU, sv-SE, zh-Hans-CN, zh-Hant-TW

## Major Changes

### 1. Prisma 스키마

```prisma
enum QuotaAction { endSurvey, continueSurvey }
enum ResponseQuotaStatus { screenedIn, screenedOut }

model Quota {
  id, surveyId, name, limit, logic(Json), action(QuotaAction),
  endingCardId?, countPartialSubmissions(Boolean)
  @@unique([surveyId, name])  // NFR-014-04
  @@index([surveyId])
}

model ResponseQuota {
  responseId, quotaId, status(ResponseQuotaStatus)
  @@id([responseId, quotaId])           // 복합 PK
  @@index([quotaId, status])            // NFR-014-02
}
```

### 2. 쿼터 평가 엔진 (`QuotaEvaluationService.evaluate()`)

```
1. 설문의 모든 쿼터 조회
2. 부분 제출 필터링 (isFinished 기반)
   - endSurvey 쿼터: 항상 평가
   - continueSurvey 쿼터: countPartialSubmissions=true일 때만
3. evaluateConditionGroup()으로 조건 평가 → passed/failed 분류
4. DB 트랜잭션 (NFR-014-01):
   a. failed 쿼터 → 기존 ResponseQuota 삭제
   b. passed 쿼터 → screenedIn 카운트 조회 (현재 응답 제외)
   c. 한도 미초과 → ResponseQuota screenedIn upsert
   d. 한도 초과 → ResponseQuota screenedOut upsert
   e. 첫 번째 초과 쿼터 액션 적용
5. QuotaEvaluationResult 반환
```

에러 발생 시 `DEFAULT_EVALUATION_RESULT` (shouldEndSurvey: false) 반환 — NFR-014-03

### 3. REST API 엔드포인트

| HTTP | 경로 | 설명 |
|------|------|------|
| POST | `/api/surveys/:surveyId/quotas` | 쿼터 생성 |
| GET | `/api/surveys/:surveyId/quotas` | 설문별 쿼터 목록 |
| PATCH | `/api/quotas/:quotaId` | 쿼터 수정 |
| DELETE | `/api/quotas/:quotaId` | 쿼터 삭제 |
| POST | `/api/surveys/:surveyId/evaluate-quotas` | 쿼터 평가 (디버그용) |

### 4. 발행 검증 5단계 추가

`SurveyValidationService.validateForPublish()`에 5단계 쿼터 검증을 추가했다.
`ServerPrismaService`로 직접 쿼터를 조회하여 순환 의존을 방지한다.

## How to use it

### 쿼터 생성
```bash
POST /api/surveys/{surveyId}/quotas
Authorization: Bearer {jwt}
Content-Type: application/json

{
  "name": "남성 응답자",
  "limit": 100,
  "action": "endSurvey",
  "endingCardId": "ending_card_1",
  "logic": {
    "id": "group_1",
    "connector": "and",
    "conditions": [
      {
        "id": "cond_1",
        "leftOperand": { "type": "element", "id": "gender_question" },
        "operator": "equals",
        "rightOperand": { "type": "static", "value": "male" }
      }
    ]
  },
  "countPartialSubmissions": false
}
```

### 쿼터 목록 조회
```bash
GET /api/surveys/{surveyId}/quotas
Authorization: Bearer {jwt}
```

### 쿼터 수정
```bash
PATCH /api/quotas/{quotaId}
Authorization: Bearer {jwt}

{
  "limit": 150,
  "name": "남성 응답자 (업데이트)"
}
```

### 쿼터 삭제
```bash
DELETE /api/quotas/{quotaId}
Authorization: Bearer {jwt}
```

### 쿼터 평가 (디버그)
```bash
POST /api/surveys/{surveyId}/evaluate-quotas
Authorization: Bearer {jwt}

{
  "responseId": "resp_123",
  "responseData": { "gender_question": "male" },
  "isFinished": true
}
```

### 공유 패키지 사용
```typescript
import {
  validateQuotas,
  validateQuotaName,
  MAX_QUOTAS_PER_SURVEY,
  DEFAULT_EVALUATION_RESULT,
  evaluateConditionGroup,
} from '@inquiry/survey-builder-config';
```

## Related Components/Modules

| 모듈 | 관계 |
|------|------|
| `@inquiry/survey-builder-config` (Logic 모듈) | `evaluateConditionGroup()` 재사용 — 쿼터 조건 평가 |
| `@inquiry/survey-builder-config` (Validators 모듈) | `validateConditionGroup()` 재사용 — 쿼터 조건 검증 |
| `@inquiry/server-survey` (SurveyValidationService) | 발행 검증 5단계에 쿼터 검증 추가 |
| `@inquiry/server-prisma` (ServerPrismaService) | Quota/ResponseQuota CRUD + 트랜잭션 |
| `@inquiry/server-audit-log` (AuditLogService) | 쿼터 생성/수정/삭제 감사 로그 |
| Prisma Schema | `Quota`, `ResponseQuota` 모델 + Survey/Response 관계 |
| i18n 15개 로케일 | `survey.quota.*` 번역 키 |

## Precautions

### NFR 준수 사항
| NFR | 요구사항 | 구현 |
|-----|---------|------|
| NFR-014-01 | DB 트랜잭션 내 쿼터 평가 | `prisma.$transaction` |
| NFR-014-02 | screenedIn 카운트 최적화 | `@@index([quotaId, status])` |
| NFR-014-03 | 에러 시 설문 진행 차단 금지 | try-catch + `DEFAULT_EVALUATION_RESULT` |
| NFR-014-04 | 동일 설문 내 이름 유일성 | `@@unique([surveyId, name])` |
| NFR-014-05 | Cascade 삭제 | Survey→Quota, Response→ResponseQuota, Quota→ResponseQuota |
| NFR-014-06 | 동시성 처리 | upsert 패턴 |

### 향후 구현 예정
- **FSD-029**: `QuotaFeatureGuard`를 Enterprise Feature Flag 기반으로 교체
- **클라이언트 UI**: QuotaPanel, QuotaCard 등 (FSD-010 이후)
- **실시간 카운트**: WebSocket 기반 실시간 쿼터 현황 업데이트 (별도 FSD)

### 관련 세부 문서
- `code-history/2026-02-24-fsd-014-quota-schema-phase-1a.md`
- `code-history/2026-02-24-fsd-014-quota-shared-package-phase-1b.md`
- `code-history/2026-02-24-fsd-014-server-quota-module-phase-2.md`
- `code-history/2026-02-24-fsd-014-server-integration-phase-3a.md`
- `code-history/2026-02-24-fsd-014-quota-i18n-phase-3b.md`
