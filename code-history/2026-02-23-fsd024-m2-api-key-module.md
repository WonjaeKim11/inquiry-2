# FSD-024 M2: API Key 전용 모듈 구현

## Overview
기존 `@inquiry/server-auth` 모듈에 포함되어 있던 API Key 관련 기능(서비스, 가드, DTO)을 독립 모듈 `@inquiry/server-api-key`로 분리하였다. 이를 통해 인증(Auth) 모듈의 책임을 줄이고, API Key 관리를 조직(Organization) 스코프로 확장하면서 환경별 권한(READ/WRITE/MANAGE) 체계를 도입하였다.

기존 auth 모듈의 API Key는 환경(Environment) 단위로만 키를 관리했으나, 새 모듈에서는 조직 스코프로 키를 생성하고 환경별 세분화된 권한(ApiKeyEnvironmentPermission)을 부여하는 구조로 변경되었다.

## Changed Files

### 신규 생성 파일
- `libs/server/api-key/package.json`: 패키지 정의 (`@inquiry/server-api-key`)
- `libs/server/api-key/tsconfig.json`: TypeScript 프로젝트 참조 설정
- `libs/server/api-key/tsconfig.lib.json`: 라이브러리 빌드 설정
- `libs/server/api-key/src/index.ts`: Barrel export (공개 API 정의)
- `libs/server/api-key/src/lib/api-key.module.ts`: NestJS 모듈 정의
- `libs/server/api-key/src/lib/api-key.service.ts`: API Key CRUD 및 검증 서비스
- `libs/server/api-key/src/lib/api-key.controller.ts`: API Key 관리 REST 컨트롤러
- `libs/server/api-key/src/lib/interfaces/api-key-auth.interface.ts`: API Key 인증 객체 인터페이스
- `libs/server/api-key/src/lib/guards/api-key-auth.guard.ts`: x-api-key 헤더 기반 인증 가드
- `libs/server/api-key/src/lib/guards/require-permission.guard.ts`: 환경별 권한 검증 가드
- `libs/server/api-key/src/lib/decorators/require-permission.decorator.ts`: 최소 권한 수준 데코레이터
- `libs/server/api-key/src/lib/decorators/api-key-auth.decorator.ts`: API Key 인증 정보 파라미터 데코레이터
- `libs/server/api-key/src/lib/dto/create-api-key.dto.ts`: Zod 기반 생성 DTO

### 수정 파일
- `libs/server/auth/src/lib/server-auth.module.ts`: ApiKeyService, ApiKeyAuthGuard 제거
- `libs/server/auth/src/index.ts`: API Key 관련 export 3줄 제거
- `apps/server/src/app/app.module.ts`: ApiKeyModule import 추가
- `apps/server/package.json`: `@inquiry/server-api-key` 의존성 추가
- `apps/server/tsconfig.app.json`: api-key tsconfig.lib.json 참조 추가
- `tsconfig.json` (루트): api-key 프로젝트 참조 추가

### 삭제 파일
- `libs/server/auth/src/lib/services/api-key.service.ts`: 기존 API Key 서비스
- `libs/server/auth/src/lib/guards/api-key-auth.guard.ts`: 기존 API Key 가드
- `libs/server/auth/src/lib/dto/create-api-key.dto.ts`: 기존 class-validator DTO

## Major Changes

### 1. 조직 스코프 API Key 관리
기존에는 환경(Environment) 단위로 API Key를 생성했으나, 새 구조에서는 조직(Organization) 단위로 생성하고 환경별 권한을 별도 테이블(`ApiKeyEnvironmentPermission`)로 관리한다.

```typescript
// 생성 시 환경별 권한을 함께 지정
await apiKeyService.create({
  label: 'Production Key',
  organizationId: 'org_123',
  environmentPermissions: [
    { environmentId: 'env_prod', permission: 'READ' },
    { environmentId: 'env_staging', permission: 'WRITE' },
  ],
  expiresAt: '2026-12-31T23:59:59Z',
});
```

### 2. 계층적 권한 체계
`RequirePermissionGuard`가 READ(1) < WRITE(2) < MANAGE(3) 수준을 비교하여, 보유 권한이 요구 권한 이상인 경우에만 접근을 허용한다.

### 3. 인증 흐름
`ApiKeyAuthGuard`가 `x-api-key` 헤더에서 키를 추출 -> `ApiKeyService.validate()`로 bcrypt 비교 -> `request.apiKeyAuth`에 `ApiKeyAuthObject` 주입.

### 4. DTO 마이그레이션
기존 `class-validator` 기반 DTO에서 `Zod` 스키마 기반으로 변경. `ZodValidationPipe`를 사용하여 요청 본문을 검증한다.

## How to use it

### API Key 생성 (JWT 인증 필요)
```http
POST /api/organizations/:orgId/api-keys
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "label": "CI/CD Pipeline Key",
  "environmentPermissions": [
    { "environmentId": "env_abc", "permission": "WRITE" }
  ],
  "expiresAt": "2027-01-01T00:00:00Z"
}
```

### API Key 목록 조회
```http
GET /api/organizations/:orgId/api-keys
Authorization: Bearer <jwt_token>
```

### API Key 삭제
```http
DELETE /api/organizations/:orgId/api-keys/:apiKeyId
Authorization: Bearer <jwt_token>
```

### 다른 모듈에서 API Key 인증 사용
```typescript
import { ApiKeyAuthGuard, RequirePermissionGuard, RequirePermission, ApiKeyAuth } from '@inquiry/server-api-key';
import type { ApiKeyAuthObject } from '@inquiry/server-api-key';

@Controller('some-resource')
@UseGuards(ApiKeyAuthGuard, RequirePermissionGuard)
export class SomeController {
  @Get(':environmentId/data')
  @RequirePermission('READ')
  getData(@ApiKeyAuth() auth: ApiKeyAuthObject) {
    // auth.apiKeyId, auth.organizationId, auth.environmentPermissions 사용 가능
  }
}
```

## Related Components/Modules
- `@inquiry/server-auth`: API Key 기능이 분리되어 나온 원본 모듈. JWT/OAuth 인증만 담당.
- `@inquiry/server-prisma`: Prisma ORM 서비스 제공 (ApiKey, ApiKeyEnvironmentPermission 모델 접근)
- `@inquiry/server-core`: 공통 예외 클래스(NotAuthenticatedException, ForbiddenException, ResourceNotFoundException), ZodValidationPipe, ApiExceptionFilter 제공
- `@inquiry/db`: Prisma 스키마 정의 (ApiKey, ApiKeyEnvironmentPermission 모델)

## Precautions
- `validate()` 메서드는 만료되지 않은 모든 API Key를 순회하며 bcrypt 비교를 수행하므로, 키 수가 많아지면 성능 저하가 발생할 수 있다. 향후 키 접두사 기반 인덱싱 또는 캐싱 전략을 고려해야 한다.
- 평문 API Key는 생성 시에만 반환되며, 이후에는 해시된 값만 저장되어 복구가 불가능하다.
- 빌드는 하지 않았으므로 통합 빌드 시 확인이 필요하다.
