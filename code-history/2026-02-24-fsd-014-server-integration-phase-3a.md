# FSD-014 쿼터 관리 - Phase 3-A: 서버 통합

## Overview
서버 애플리케이션에 QuotaModule을 등록하고, 설문 발행 전 검증(SurveyValidationService)에 5단계 쿼터 검증을 추가한다.
Phase 2에서 구현한 `@inquiry/server-quota` 모듈을 서버에 통합하여 쿼터 CRUD API가 실제로 동작하게 하고,
발행 시 쿼터의 이름/limit/조건/endingCard 유효성을 검증하여 잘못된 쿼터 설정으로 설문이 발행되는 것을 방지한다.

## Changed Files

| 파일 | 역할 |
|------|------|
| `apps/server/src/app/app.module.ts` | 루트 모듈에 QuotaModule import 추가 |
| `apps/server/tsconfig.app.json` | TypeScript 프로젝트 참조에 quota 라이브러리 추가 |
| `apps/server/package.json` | workspace 의존성에 `@inquiry/server-quota` 추가 |
| `libs/server/survey/src/lib/services/survey-validation.service.ts` | 발행 검증 5단계(쿼터 검증) 추가 |

## Major Changes

### 1. AppModule에 QuotaModule 등록
`app.module.ts`의 import 목록에 `QuotaModule`을 `SurveyModule` 바로 뒤에 추가하였다.
`@Module` 데코레이터의 imports 배열에도 동일한 위치에 추가하여 NestJS DI 컨테이너에 등록된다.

```typescript
import { QuotaModule } from '@inquiry/server-quota';
// ...
@Module({
  imports: [
    // ...
    SurveyModule,
    QuotaModule,  // 추가
    ApiKeyModule,
    // ...
  ],
})
```

### 2. TypeScript 프로젝트 참조 추가
`tsconfig.app.json`의 references 배열에 `libs/server/quota/tsconfig.lib.json` 참조를 추가하여
TypeScript 빌드 시 올바른 의존성 순서가 보장된다.

### 3. workspace 의존성 추가
`apps/server/package.json`의 dependencies에 `"@inquiry/server-quota": "workspace:*"`를 추가하여
pnpm workspace 해석이 올바르게 동작하도록 하였다.

### 4. SurveyValidationService에 쿼터 검증 5단계 추가

#### 4-1. 새로운 import
- `validateQuotas` 함수: `@inquiry/survey-builder-config`에서 import
- `QuotaDefinition`, `SurveyEnding` 타입: `@inquiry/survey-builder-config`에서 import
- `ServerPrismaService`: `@inquiry/server-prisma`에서 import (DB 쿼터 조회용)

#### 4-2. constructor 추가
`ServerPrismaService`를 DI로 주입받는 constructor를 추가하였다.
`ServerPrismaModule`은 `@Global()` 모듈이므로 별도 모듈 import 없이 주입 가능하다.

```typescript
constructor(private readonly prisma: ServerPrismaService) {}
```

#### 4-3. validateForPublish 시그니처 변경
쿼터 조회를 위해 설문 ID가 필요하므로 `id: string` 속성을 파라미터 타입에 추가하였다.
기존 호출부(survey.controller.ts, survey.service.ts)에서 전달하는 Prisma 모델 객체에는
이미 `id` 필드가 포함되어 있으므로 호출부 수정은 불필요하다.

#### 4-4. validateQuotas 메서드 구현
```typescript
private async validateQuotas(survey: {
  id: string;
  schema: unknown;
  endings: unknown;
}): Promise<void> {
  // 1) DB에서 해당 설문의 쿼터 목록 조회
  // 2) 쿼터가 없으면 검증 건너뛰기
  // 3) QuotaDefinition 형태로 변환
  // 4) endings에서 endingCard ID 추출
  // 5) validateQuotas() 통합 검증 수행
  // 6) 검증 실패 시 BadRequestException throw
}
```

데이터 흐름:
1. `prisma.quota.findMany()`로 DB에서 쿼터 조회
2. Prisma 모델을 `QuotaDefinition[]`으로 매핑
3. `survey.endings`에서 `SurveyEnding[]`으로 캐스팅하여 ID 추출
4. `validateQuotas(quotaDefinitions, endingCardIds)` 호출
5. `result.valid`가 false이면 에러 메시지를 합쳐서 throw

## How to use it

### 설문 발행 시 자동 검증
기존과 동일하게 설문 발행 API를 호출하면 5단계 검증이 자동 실행된다:

```
POST /api/surveys/:surveyId/publish
```

쿼터에 문제가 있으면 400 BadRequestException이 반환된다:
```json
{
  "statusCode": 400,
  "message": "쿼터 \"성별\" 의 limit은 1 이상이어야 합니다. 쿼터 \"연령대\" 의 endingCardId가 존재하지 않습니다."
}
```

### 로직 검증 API에서도 동작
```
POST /api/surveys/:surveyId/validate-logic
```
동일한 `validateForPublish`를 호출하므로 쿼터 검증도 포함된다.

## Related Components/Modules

| 모듈/파일 | 관계 |
|-----------|------|
| `@inquiry/server-quota` (Phase 2) | 이번에 서버에 통합된 쿼터 CRUD 모듈 |
| `@inquiry/survey-builder-config` (Phase 1-B) | `validateQuotas()` 함수, `QuotaDefinition` 타입 제공 |
| `@inquiry/server-prisma` | DB 쿼터 조회를 위한 Prisma 서비스 (Global 모듈) |
| `libs/server/survey/src/lib/services/survey.service.ts` | `publishSurvey()`에서 `validateForPublish()` 호출 |
| `libs/server/survey/src/lib/survey.controller.ts` | `validateLogic()`에서 `validateForPublish()` 호출 |

## Precautions
- `ServerPrismaService`를 survey-validation 서비스에서 직접 사용하여 `QuotaService`에 대한 순환 의존을 방지하였다.
- `validateForPublish` 시그니처에 `id: string`이 추가되었으나, 기존 호출부에서 전달하는 Prisma 모델 객체에 이미 `id`가 있으므로 호출부 수정은 불필요하다.
- 쿼터가 없는 설문은 5단계를 즉시 건너뛰므로 기존 동작에 성능 영향이 없다 (단 1회의 empty query).
