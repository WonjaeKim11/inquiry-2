# FSD-014 서버 쿼터 모듈 (Phase 2)

## Overview
FSD-014 쿼터 관리 기능의 Phase 2로, NestJS 기반 서버 쿼터 모듈(`libs/server/quota/`)을 구현한다. 이 모듈은 쿼터 CRUD API와 응답 기반 쿼터 평가 엔진을 제공한다. 기존 `libs/server/survey/` 모듈의 패턴(DI, 감사 로그, Zod 검증, JWT 인증)을 그대로 따르며, Phase 1에서 구현한 DB 스키마(Quota, ResponseQuota)와 공유 패키지(`@inquiry/survey-builder-config`)의 타입/유틸리티를 활용한다.

## Changed Files

### 생성된 파일 (11개)

| 파일 | 역할 |
|------|------|
| `libs/server/quota/package.json` | 패키지 메타데이터, workspace 의존성 선언 |
| `libs/server/quota/tsconfig.json` | 프로젝트 레퍼런스 설정 (composite build) |
| `libs/server/quota/tsconfig.lib.json` | 라이브러리 빌드 설정 (decorator, strict 등) |
| `libs/server/quota/src/index.ts` | 공개 API (barrel export) |
| `libs/server/quota/src/lib/quota.module.ts` | NestJS 모듈 정의 |
| `libs/server/quota/src/lib/quota.controller.ts` | REST API 엔드포인트 (CRUD + 평가) |
| `libs/server/quota/src/lib/dto/create-quota.dto.ts` | 생성 DTO (Zod 스키마) |
| `libs/server/quota/src/lib/dto/update-quota.dto.ts` | 수정 DTO (Zod 스키마) |
| `libs/server/quota/src/lib/guards/quota-feature.guard.ts` | 기능 활성화 가드 (스텁) |
| `libs/server/quota/src/lib/services/quota.service.ts` | 쿼터 CRUD 비즈니스 로직 |
| `libs/server/quota/src/lib/services/quota-evaluation.service.ts` | 쿼터 평가 엔진 |

## Major Changes

### 1. QuotaModule (`quota.module.ts`)
`@Module` 데코레이터로 QuotaController, QuotaService, QuotaEvaluationService를 등록한다. AuditLogModule과 ServerPrismaModule은 `@Global()`이므로 별도 import가 불필요하다.

### 2. QuotaService (`quota.service.ts`)
쿼터 CRUD 전체 생명주기를 관리한다.

- **createQuota**: 설문 접근 권한 검증 -> 최대 쿼터 수(50개) 검사 -> 이름 유효성/중복 검사 -> endingCardId 유효성 검증 -> DB 생성 -> 감사 로그
- **listQuotas**: 설문별 쿼터 목록 조회 (이름순 정렬)
- **updateQuota**: 기존 쿼터 조회 -> 이름 변경 시 중복 검사 -> endingCardId 재검증 -> 스프레드 연산자 기반 부분 업데이트
- **deleteQuota**: 쿼터 삭제 + 감사 로그 (Cascade로 ResponseQuota 자동 삭제)
- **validateSurveyAccess**: Organization membership 기반 접근 권한 검증
- **validateEndingCardId**: Survey.endings JSON 배열에서 endingCardId 존재 확인

### 3. QuotaEvaluationService (`quota-evaluation.service.ts`)
핵심 평가 엔진으로, 응답 데이터를 기반으로 쿼터 조건을 평가하고 DB 트랜잭션 내에서 카운트를 관리한다.

```
evaluate(input) 흐름:
1. 설문의 모든 쿼터 조회
2. 부분 제출 필터링 (isFinished 기반)
3. evaluateConditionGroup()으로 조건 평가 -> passed/failed 분류
4. DB 트랜잭션:
   a. failed 쿼터: ResponseQuota 삭제
   b. passed 쿼터: screenedIn 카운트 조회 (현재 응답 제외)
   c. 한도 미초과: ResponseQuota screenedIn upsert
   d. 한도 초과: ResponseQuota screenedOut upsert
   e. 첫 번째 초과 쿼터 액션 적용
5. QuotaEvaluationResult 반환
```

주요 비기능 요구사항:
- **NFR-014-01**: DB 트랜잭션 내 쿼터 평가 (원자성 보장)
- **NFR-014-03**: 에러 시 설문 진행 차단 금지 (DEFAULT_EVALUATION_RESULT 반환)
- **NFR-014-06**: upsert로 동시성 처리

### 4. QuotaController (`quota.controller.ts`)
5개의 REST API 엔드포인트를 제공한다.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/surveys/:surveyId/quotas` | 쿼터 생성 |
| GET | `/surveys/:surveyId/quotas` | 쿼터 목록 조회 |
| PATCH | `/quotas/:quotaId` | 쿼터 수정 |
| DELETE | `/quotas/:quotaId` | 쿼터 삭제 |
| POST | `/surveys/:surveyId/evaluate-quotas` | 쿼터 평가 (디버그용) |

모든 엔드포인트에 `AuthGuard('jwt')` + `QuotaFeatureGuard`가 적용된다.

### 5. DTO (Zod 스키마)
- **CreateQuotaSchema**: name(필수), limit(필수), action(필수), logic(선택), endingCardId(선택), countPartialSubmissions(선택)
- **UpdateQuotaSchema**: 모든 필드 optional (부분 업데이트)

### 6. QuotaFeatureGuard (`quota-feature.guard.ts`)
현재는 항상 true를 반환하는 스텁이다. FSD-029 (Enterprise Feature Flag) 구현 시 라이선스/플랜 기반 체크로 교체 예정.

## How to use it

### 쿼터 생성
```http
POST /api/surveys/:surveyId/quotas
Authorization: Bearer <jwt-token>

{
  "name": "남성 응답자 제한",
  "limit": 100,
  "action": "endSurvey",
  "endingCardId": "ending-card-123",
  "logic": {
    "id": "group-1",
    "connector": "and",
    "conditions": [
      {
        "id": "cond-1",
        "leftOperand": { "type": "element", "id": "gender-question" },
        "operator": "equals",
        "rightOperand": { "type": "static", "value": "male" }
      }
    ]
  }
}
```

### 쿼터 목록 조회
```http
GET /api/surveys/:surveyId/quotas
Authorization: Bearer <jwt-token>
```

### 쿼터 수정
```http
PATCH /api/quotas/:quotaId
Authorization: Bearer <jwt-token>

{
  "limit": 200
}
```

### 쿼터 삭제
```http
DELETE /api/quotas/:quotaId
Authorization: Bearer <jwt-token>
```

### 쿼터 평가 (디버그용)
```http
POST /api/surveys/:surveyId/evaluate-quotas
Authorization: Bearer <jwt-token>

{
  "responseId": "response-abc",
  "responseData": { "gender-question": "male" },
  "isFinished": true
}
```

### 서비스 레벨 사용 (다른 모듈에서)
```typescript
import { QuotaEvaluationService } from '@inquiry/server-quota';

// DI로 주입 후 사용
const result = await this.quotaEvaluationService.evaluate({
  surveyId: 'survey-123',
  responseId: 'response-abc',
  responseData: { 'gender-question': 'male' },
  isFinished: true,
});

if (result.shouldEndSurvey) {
  // 종료 카드로 리다이렉트
}
```

## Related Components/Modules

- **`@inquiry/survey-builder-config`**: 쿼터 타입(`QuotaEvaluationInput`, `QuotaEvaluationResult`), 상수(`MAX_QUOTAS_PER_SURVEY`), 검증(`validateQuotaName`), 평가 엔진(`evaluateConditionGroup`)을 제공
- **`@inquiry/server-prisma`**: Prisma 클라이언트 (Quota, ResponseQuota 모델 접근)
- **`@inquiry/server-audit-log`**: 감사 로그 기록 (quota.created/updated/deleted)
- **`@inquiry/server-core`**: ZodValidationPipe (요청 검증)
- **`packages/db/prisma/schema.prisma`**: Quota, ResponseQuota 모델 정의 (Phase 1a에서 구현)
- **FSD-014 Phase 1b**: `@inquiry/survey-builder-config`의 쿼터 타입/상수/검증 함수
- **FSD-014 Phase 3b**: 쿼터 관련 i18n 번역 키

## Precautions

- **QuotaFeatureGuard는 스텁**: 현재 항상 true를 반환한다. FSD-029에서 실제 라이선스 체크로 교체 필요.
- **서버 앱 등록 필요**: `apps/server`의 AppModule에 QuotaModule을 import해야 실제로 API가 활성화된다. 이 작업은 별도 Phase에서 진행.
- **감사 로그 `log()` 사용**: 기존의 fire-and-forget `log()` 메서드를 사용한다. 신규 `logEvent()` 메서드로의 마이그레이션은 추후 진행 가능.
- **빌드 에러 참고**: `tsc --build` 시 audit-log, core 모듈의 pre-existing 에러가 발생하나, 이는 기존 모듈의 알려진 이슈이며 실제 Nx/webpack 빌드에는 영향 없음.
- **동시성 처리**: `upsert`를 사용하여 동일 응답-쿼터 조합의 중복 삽입을 방지한다.
- **에러 안전성**: 쿼터 평가 실패 시 `DEFAULT_EVALUATION_RESULT`를 반환하여 설문 진행을 차단하지 않는다.
