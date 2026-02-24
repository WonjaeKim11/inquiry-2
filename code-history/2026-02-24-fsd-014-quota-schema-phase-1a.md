# FSD-014 쿼터 관리 - Phase 1-A: Prisma 스키마 변경

## Overview
설문 응답 수를 제한하는 쿼터(Quota) 기능을 위해 데이터베이스 스키마를 확장한다.
쿼터는 설문에 대한 응답 수를 조건별로 제한하고, 한도 초과 시 설문 종료 또는 계속 진행 여부를 결정하는 핵심 기능이다.
이 Phase에서는 Prisma 스키마에 새로운 enum과 모델을 추가하여 쿼터 데이터 구조의 기반을 마련한다.

## Changed Files
- `packages/db/prisma/schema.prisma`: Quota/ResponseQuota 모델 및 QuotaAction/ResponseQuotaStatus enum 추가, Survey/Response 모델에 관계 필드 추가

## Major Changes

### 1. 새로운 Enum 추가 (line 105~115)

`QuotaAction` enum은 쿼터 한도 초과 시 수행할 액션을 정의한다:
- `endSurvey`: 설문 종료
- `continueSurvey`: 설문 계속 진행

`ResponseQuotaStatus` enum은 응답이 쿼터에 대해 가지는 상태를 정의한다:
- `screenedIn`: 쿼터 조건에 부합하여 포함됨
- `screenedOut`: 쿼터 한도 초과로 제외됨

```prisma
enum QuotaAction {
  endSurvey
  continueSurvey
}

enum ResponseQuotaStatus {
  screenedIn
  screenedOut
}
```

### 2. Quota 모델 추가 (line 514~533)

설문별 쿼터를 관리하는 핵심 모델이다. 주요 필드:
- `surveyId`: 소속 설문 (Cascade 삭제)
- `name`: 쿼터 이름 (설문 내 유니크)
- `limit`: 응답 수 한도
- `logic`: 쿼터 적용 조건 (JSON, 조건부 로직 엔진과 연동)
- `action`: 한도 초과 시 액션 (QuotaAction enum)
- `endingCardId`: endSurvey 시 표시할 엔딩 카드 ID
- `countPartialSubmissions`: 부분 제출도 카운트할지 여부

인덱스 전략:
- `@@unique([surveyId, name])`: 같은 설문 내 쿼터 이름 중복 방지
- `@@index([surveyId])`: 설문별 쿼터 목록 조회 최적화
- `@@map("quotas")`: 테이블명 snake_case 매핑

### 3. ResponseQuota 모델 추가 (line 535~547)

응답-쿼터 간 다대다 매핑 테이블이다. 복합 PK(`responseId + quotaId`)를 사용한다.
각 응답이 어떤 쿼터에 대해 screenedIn/screenedOut 상태인지를 기록한다.

인덱스 전략:
- `@@id([responseId, quotaId])`: 복합 기본키
- `@@index([quotaId, status])`: 특정 쿼터의 상태별 응답 카운트 조회 최적화
- `@@map("response_quotas")`: 테이블명 snake_case 매핑

### 4. 기존 모델 관계 추가

**Survey 모델** (line 478):
```prisma
quotas      Quota[]
```

**Response 모델** (line 506):
```prisma
responseQuotas ResponseQuota[]
```

## How to use it

### Prisma 클라이언트 생성
```bash
pnpm db:generate
```

### 마이그레이션 생성 (DB 적용 시)
```bash
pnpm db:migrate -- --name add_quota_models
```

### 쿼터 생성 예시 (Prisma Client)
```typescript
const quota = await prisma.quota.create({
  data: {
    surveyId: 'survey-id',
    name: '남성 응답자 제한',
    limit: 100,
    logic: { conditions: [{ field: 'gender', operator: 'equals', value: 'male' }] },
    action: 'endSurvey',
    endingCardId: 'ending-card-id',
  },
});
```

### 응답-쿼터 상태 기록 예시
```typescript
await prisma.responseQuota.create({
  data: {
    responseId: 'response-id',
    quotaId: quota.id,
    status: 'screenedIn',
  },
});
```

### 쿼터별 screenedIn 카운트 조회
```typescript
const count = await prisma.responseQuota.count({
  where: { quotaId: quota.id, status: 'screenedIn' },
});
```

## Related Components/Modules
- `packages/db/prisma/schema.prisma`: 이번 변경의 대상 파일
- `FSD-012 조건부 로직 엔진`: Quota의 `logic` 필드가 조건부 로직 엔진과 연동될 예정
- `Survey 모델`: 1:N 관계로 쿼터를 소유
- `Response 모델`: N:M 관계로 ResponseQuota를 통해 쿼터와 연결
- 향후 Phase 1-B에서 쿼터 CRUD API 및 서비스 레이어 구현 예정

## Precautions
- `endingCardId`는 현재 외래키 제약 없이 String으로 저장된다. 향후 엔딩 카드 모델이 별도로 분리되면 관계를 추가할 수 있다.
- `logic` 필드는 JSON 타입으로 유연하게 설계되었으나, 애플리케이션 레벨에서 Zod 스키마를 통한 검증이 필요하다.
- 마이그레이션은 이 Phase에서 수행하지 않으며, DB 적용은 별도 단계에서 진행한다.
- `cuid(2)` 패턴을 사용하여 기존 모델과 일관성을 유지한다.
