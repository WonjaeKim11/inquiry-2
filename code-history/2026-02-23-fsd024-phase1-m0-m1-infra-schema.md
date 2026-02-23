# FSD-024 Phase 1: M0(공통 인프라) + M1(DB 스키마 변경)

## Overview
FSD-024 3단계 구현의 Phase 1으로서, API 키 관리 및 설문조사 도메인 기능을 위한 공통 인프라 확장(M0)과 데이터베이스 스키마 변경(M1)을 수행한다.

M0에서는 도메인별 API 예외 클래스 체계, API 전용 예외 필터, CUID2 유틸리티 및 검증 파이프를 추가하여 이후 단계에서 사용할 공통 기반을 마련한다.

M1에서는 ApiKey 모델을 조직 스코프로 변경하고 환경별 권한 매핑 테이블을 추가하며, Survey/Response/Display/Contact 스텁 모델을 정의한다.

## Changed Files

### M0: 공통 인프라 확장
- `libs/server/core/src/lib/exceptions/api-error.exception.ts` - API 에러 기반 클래스 (code/message/details 구조)
- `libs/server/core/src/lib/exceptions/not-authenticated.exception.ts` - 401 인증 실패 예외
- `libs/server/core/src/lib/exceptions/forbidden.exception.ts` - 403 권한 부족 예외
- `libs/server/core/src/lib/exceptions/invalid-input.exception.ts` - 422 입력 검증 실패 예외
- `libs/server/core/src/lib/exceptions/resource-not-found.exception.ts` - 404 리소스 미존재 예외
- `libs/server/core/src/lib/exceptions/too-many-requests.exception.ts` - 429 요청 횟수 초과 예외
- `libs/server/core/src/lib/filters/api-exception.filter.ts` - API 전용 예외 필터 (컨트롤러 레벨 적용)
- `libs/server/core/src/lib/utils/cuid2.util.ts` - CUID2 생성/검증 유틸리티
- `libs/server/core/src/lib/pipes/cuid2-validation.pipe.ts` - CUID2 형식 검증 파이프
- `libs/server/core/src/index.ts` - (수정) 신규 모듈 export 추가
- `libs/server/core/package.json` - (수정) @paralleldrive/cuid2 의존성 추가
- `package.json` - (수정) @paralleldrive/cuid2 루트 의존성 추가

### M1: DB 스키마 변경
- `packages/db/prisma/schema.prisma` - (수정) ApiKeyPermission/SurveyStatus enum, ApiKey 모델 변경, ApiKeyEnvironmentPermission/Survey/Response/Display/Contact 모델 추가
- `packages/db/prisma/migrations/20260223000000_add_api_key_permissions_and_domain_stubs/migration.sql` - (생성) 마이그레이션 SQL

## Major Changes

### 1. API 예외 클래스 체계
기존 `GlobalExceptionFilter`는 모든 예외를 일괄 처리하지만, API 컨텍스트에서는 머신-리더블한 `code` 필드가 필요하다. `ApiErrorException`을 기반 클래스로 두고 도메인별 예외를 상속 구조로 정의했다.

```typescript
// 기반 클래스: code + message + details
throw new ApiErrorException('CustomError', 'message', 400, { field: 'value' });

// 도메인 예외: 미리 정의된 code와 상태 코드
throw new NotAuthenticatedException();      // 401
throw new ForbiddenException();             // 403
throw new ResourceNotFoundException('Survey', 'abc123');  // 404
throw new InvalidInputException('Invalid email', { email: ['format'] }); // 422
throw new TooManyRequestsException('Rate limited', 60);  // 429
```

### 2. API 예외 필터
`ApiExceptionFilter`는 `@UseFilters()` 데코레이터로 컨트롤러 레벨에서 적용하며, 응답 형식을 `{ error: { code, message, details? } }`로 통일한다. `GlobalExceptionFilter`와 별도로 동작하여 API 엔드포인트에 특화된 에러 응답을 제공한다.

### 3. CUID2 유틸리티 및 파이프
`@paralleldrive/cuid2` 패키지를 래핑한 유틸리티 함수(`generateCuid2`, `isValidCuid2`)와, 경로 파라미터 검증용 `Cuid2ValidationPipe`를 추가했다.

### 4. ApiKey 모델 구조 변경
기존에는 `environmentId` 하나만 가졌던 ApiKey를 `organizationId` 기반으로 변경하고, `ApiKeyEnvironmentPermission` 중간 테이블을 통해 하나의 API 키가 여러 환경에 서로 다른 권한(READ/WRITE/MANAGE)을 가질 수 있도록 했다.

### 5. 도메인 스텁 모델
Survey, Response, Display, Contact 모델을 스텁(핵심 필드만)으로 정의하여 이후 단계에서 활용할 기반을 마련했다. Environment 모델에 이들 관계를 추가했다.

## How to use it

### API 예외 사용 예시
```typescript
import { Controller, UseFilters } from '@nestjs/common';
import {
  ApiExceptionFilter,
  NotAuthenticatedException,
  ResourceNotFoundException,
  Cuid2ValidationPipe,
} from '@inquiry/server-core';

@Controller('api/v1/surveys')
@UseFilters(ApiExceptionFilter)
export class SurveyController {
  @Get(':id')
  async findOne(@Param('id', Cuid2ValidationPipe) id: string) {
    const survey = await this.surveyService.findById(id);
    if (!survey) throw new ResourceNotFoundException('Survey', id);
    return survey;
  }
}
```

### DB 마이그레이션 적용
```bash
# DB 서버 기동 후
pnpm db:migrate

# 또는 개발 환경 초기화
pnpm --filter @inquiry/db db:reset
```

## Related Components/Modules
- `libs/server/core/src/lib/filters/global-exception.filter.ts` - 기존 글로벌 예외 필터 (공존)
- `packages/db/prisma/schema.prisma` - 전체 DB 스키마
- 이후 Phase 2(M2: API 키 서비스)에서 이 인프라를 사용하여 API 키 CRUD를 구현

## Precautions
- DB 서버가 실행되지 않는 환경에서는 마이그레이션 SQL 파일만 생성됨. DB 기동 후 `pnpm db:migrate` 또는 `pnpm --filter @inquiry/db db:reset`으로 적용 필요
- 기존 ApiKey 테이블에 데이터가 있는 경우, 마이그레이션 SQL에서 환경 -> 프로젝트 -> 조직 경로로 organizationId를 역추적하는 로직이 포함되어 있음
- `ApiExceptionFilter`는 글로벌 등록이 아닌 컨트롤러 레벨 `@UseFilters()`로 적용해야 함
- `ForbiddenException`은 NestJS 내장 `@nestjs/common`의 동명 클래스와 import 경로가 다르므로 주의 필요
