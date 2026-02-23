# FSD-024 M5: Management API v1 구현

## Overview
API Key 인증 기반의 Management API v1을 구현했다. 외부 시스템이 API Key와 환경별 권한(READ/WRITE/MANAGE)을 사용하여 설문(Survey), 응답(Response), 연락처(Contact), 파일(Storage) 리소스를 프로그래밍 방식으로 CRUD 할 수 있도록 한다.

기존 `@inquiry/server-client-api` 라이브러리의 구조를 따르며, `@inquiry/server-api-key` 모듈의 ApiKeyAuthGuard와 RequirePermissionGuard를 활용하여 인증/인가를 처리한다.

## Changed Files

### 신규 생성

| 파일 | 역할 |
|------|------|
| `libs/server/management-api/package.json` | 패키지 정의. workspace 의존성 설정 |
| `libs/server/management-api/tsconfig.json` | TypeScript 프로젝트 레퍼런스 설정 |
| `libs/server/management-api/tsconfig.lib.json` | TypeScript 빌드 설정 |
| `libs/server/management-api/src/index.ts` | Barrel exports (모듈, 컨트롤러, 서비스, DTO) |
| `libs/server/management-api/src/lib/management-api.module.ts` | NestJS 모듈 정의 |
| `libs/server/management-api/src/lib/controllers/management-me.controller.ts` | /me 인증 정보 조회 컨트롤러 |
| `libs/server/management-api/src/lib/controllers/management-survey.controller.ts` | Survey CRUD 컨트롤러 |
| `libs/server/management-api/src/lib/controllers/management-response.controller.ts` | Response CRUD 컨트롤러 |
| `libs/server/management-api/src/lib/controllers/management-contact.controller.ts` | Contact CRUD 컨트롤러 |
| `libs/server/management-api/src/lib/controllers/management-storage.controller.ts` | Storage 파일 업로드 컨트롤러 |
| `libs/server/management-api/src/lib/services/management-me.service.ts` | /me 서비스 |
| `libs/server/management-api/src/lib/services/management-survey.service.ts` | Survey CRUD 서비스 |
| `libs/server/management-api/src/lib/services/management-response.service.ts` | Response CRUD 서비스 |
| `libs/server/management-api/src/lib/services/management-contact.service.ts` | Contact CRUD 서비스 |
| `libs/server/management-api/src/lib/services/management-storage.service.ts` | Storage 파일 업로드 서비스 |
| `libs/server/management-api/src/lib/dto/create-survey.dto.ts` | 설문 생성 Zod 스키마 |
| `libs/server/management-api/src/lib/dto/update-survey.dto.ts` | 설문 수정 Zod 스키마 |
| `libs/server/management-api/src/lib/dto/update-management-response.dto.ts` | 응답 수정 Zod 스키마 |
| `libs/server/management-api/src/lib/dto/create-contact.dto.ts` | 연락처 생성 Zod 스키마 |
| `libs/server/management-api/src/lib/dto/upload-management-file.dto.ts` | 파일 업로드 Zod 스키마 |

### 수정

| 파일 | 역할 |
|------|------|
| `tsconfig.json` | 루트 references에 management-api 추가 |

## Major Changes

### 인증/인가 아키텍처
모든 엔드포인트에 3단계 Guard 체인을 적용한다:

1. **ApiKeyAuthGuard**: `x-api-key` 헤더에서 API Key를 추출하고 검증한 후, `request.apiKeyAuth`에 `ApiKeyAuthObject`를 주입
2. **RequirePermissionGuard**: `@RequirePermission('READ'|'WRITE'|'MANAGE')` 데코레이터의 메타데이터를 읽어 쿼리 파라미터의 `environmentId`에 대한 계층적 권한(READ < WRITE < MANAGE) 검증
3. **ApiRateLimitGuard**: API Key ID 기반 분당 100건 Rate Limiting

```typescript
// 컨트롤러 패턴 예시
@Controller('surveys')
@UseFilters(new ApiExceptionFilter())
@UseGuards(ApiKeyAuthGuard, RequirePermissionGuard, ApiRateLimitGuard)
@ApiRateLimit()
export class ManagementSurveyController {
  @Get()
  @RequirePermission('READ')
  list(@Query('environmentId') environmentId: string) { ... }
}
```

### /me 엔드포인트 특수 처리
`/me`는 environmentId가 불필요한 전역 엔드포인트이므로 `RequirePermissionGuard`를 적용하지 않고 `ApiKeyAuthGuard`만 사용한다. RequirePermissionGuard는 `@RequirePermission()` 데코레이터가 없으면 자동으로 스킵하므로 문제 없다.

### 환경 소유권 검증
모든 리소스 접근 시 `environmentId`로 소유권을 검증한다. Prisma 쿼리에 항상 `where: { id, environmentId }` 조건을 포함하여 다른 환경의 리소스에 접근할 수 없도록 한다.

### DTO 유효성 검증
Zod 스키마 + `ZodValidationPipe`를 사용하여 요청 Body를 검증한다. 잘못된 입력 시 `ApiExceptionFilter`가 표준 에러 응답을 반환한다.

## How to use it

### 모듈 등록 (RouterModule)
```typescript
// apps/server에서 RouterModule로 마운트
RouterModule.register([
  { path: 'v1/management', module: ManagementApiModule },
])
```

### API 호출 예시

#### 인증 정보 조회
```bash
curl -H "x-api-key: ink_xxxx" GET /v1/management/me
# 200: { apiKeyId, organizationId, label, environmentPermissions }
```

#### 설문 목록 조회
```bash
curl -H "x-api-key: ink_xxxx" GET /v1/management/surveys?environmentId=env_123
# 200: [{ id, name, status, questions, ... }]
```

#### 설문 생성
```bash
curl -H "x-api-key: ink_xxxx" -H "Content-Type: application/json" \
  -X POST /v1/management/surveys?environmentId=env_123 \
  -d '{"name": "Customer Survey", "status": "DRAFT"}'
# 201: { id, name, status, ... }
```

#### 설문 수정
```bash
curl -H "x-api-key: ink_xxxx" -H "Content-Type: application/json" \
  -X PUT /v1/management/surveys/surv_123?environmentId=env_123 \
  -d '{"name": "Updated Survey"}'
# 200: { id, name, ... }
```

#### 설문 삭제 (MANAGE 권한 필요)
```bash
curl -H "x-api-key: ink_xxxx" -X DELETE /v1/management/surveys/surv_123?environmentId=env_123
# 204 No Content
```

#### 연락처 생성
```bash
curl -H "x-api-key: ink_xxxx" -H "Content-Type: application/json" \
  -X POST /v1/management/contacts?environmentId=env_123 \
  -d '{"attributes": {"email": "user@example.com", "name": "John"}}'
# 201: { id, attributes, ... }
```

#### 파일 업로드
```bash
curl -H "x-api-key: ink_xxxx" -H "Content-Type: application/json" \
  -X POST /v1/management/storage?environmentId=env_123 \
  -d '{"fileName": "image.png", "fileData": "<base64>"}'
# 201: { url: "/storage/management/env_123/xxx.png" }
```

## Related Components/Modules
- `@inquiry/server-api-key`: ApiKeyAuthGuard, RequirePermissionGuard, RequirePermission, ApiKeyAuth 데코레이터 제공
- `@inquiry/server-core`: ApiExceptionFilter, ZodValidationPipe, ResourceNotFoundException, generateCuid2 등 공통 유틸
- `@inquiry/server-rate-limit`: ApiRateLimitGuard, ApiRateLimit 데코레이터 (분당 100건)
- `@inquiry/server-prisma`: ServerPrismaService (DB 접근)
- `@inquiry/server-client-api`: 동일한 라이브러리 구조 패턴 참조 (client-api와 대응되는 management-api)

## Precautions
- 이 라이브러리는 아직 앱 모듈(`apps/server`)에 등록되지 않았다. RouterModule로 `/v1/management` 경로에 마운트해야 사용 가능하다.
- 빌드는 이후 통합 빌드 시 수행한다.
- Survey의 `questions` 필드는 `z.unknown()`으로 유효성 검증이 느슨하다. 추후 구조화된 스키마가 필요할 수 있다.
- Storage 서비스는 로컬 파일 시스템 기반이다. 운영 환경에서는 S3 등 외부 스토리지로 전환이 필요하다.
- 목록 조회 엔드포인트에 페이지네이션이 미적용 상태이다. 대량 데이터 시 성능 이슈가 발생할 수 있으며, 추후 cursor/offset 기반 페이지네이션 도입을 검토해야 한다.
