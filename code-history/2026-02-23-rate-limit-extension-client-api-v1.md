# FSD-024 M3(Rate Limiting 확장) + M4(Client API v1) 구현

## Overview
기존 IP 기반 Rate Limiting을 확장하여 API Key/Environment ID 기반 namespace Rate Limiting을 지원하고, 클라이언트 SDK가 사용하는 공개 Client API v1 엔드포인트를 구현한다.

- **M3**: Management API는 `mgmt:{apiKeyId}`, Client API는 `client:{environmentId}` namespace로 Rate Limiting을 적용하여 API 소비자별 독립적인 요청 제한을 보장한다.
- **M4**: 인증 불필요한 Client API 엔드포인트를 제공하여, 클라이언트 SDK가 환경 상태 조회, 설문 노출 기록, 응답 생성/수정, 파일 업로드, 사용자 식별을 수행할 수 있도록 한다.

## Changed Files

### M3: Rate Limiting 확장

| 파일 | 역할 |
|------|------|
| `libs/server/rate-limit/src/lib/api-rate-limit.guard.ts` | (신규) namespace 기반 API Rate Limit Guard |
| `libs/server/rate-limit/src/lib/rate-limit.decorators.ts` | (수정) ApiRateLimit 데코레이터 추가 |
| `libs/server/rate-limit/src/index.ts` | (수정) ApiRateLimitGuard export 추가 |

### M4: Client API v1

| 파일 | 역할 |
|------|------|
| `libs/server/client-api/package.json` | (신규) 패키지 설정 |
| `libs/server/client-api/tsconfig.json` | (신규) TypeScript 프로젝트 레퍼런스 |
| `libs/server/client-api/tsconfig.lib.json` | (신규) TypeScript 빌드 설정 |
| `libs/server/client-api/src/index.ts` | (신규) barrel exports |
| `libs/server/client-api/src/lib/client-api.module.ts` | (신규) NestJS 모듈 정의 |
| `libs/server/client-api/src/lib/guards/environment-id.guard.ts` | (신규) Environment ID 검증 가드 |
| `libs/server/client-api/src/lib/services/client-environment.service.ts` | (신규) 환경 상태 조회 서비스 |
| `libs/server/client-api/src/lib/services/client-display.service.ts` | (신규) Display 이벤트 서비스 |
| `libs/server/client-api/src/lib/services/client-response.service.ts` | (신규) 응답 생성/수정 서비스 |
| `libs/server/client-api/src/lib/services/client-storage.service.ts` | (신규) 파일 업로드 서비스 |
| `libs/server/client-api/src/lib/services/client-user.service.ts` | (신규) 사용자 식별 서비스 |
| `libs/server/client-api/src/lib/controllers/client-environment.controller.ts` | (신규) 환경 상태 조회 컨트롤러 |
| `libs/server/client-api/src/lib/controllers/client-display.controller.ts` | (신규) Display 이벤트 컨트롤러 |
| `libs/server/client-api/src/lib/controllers/client-response.controller.ts` | (신규) 응답 CRUD 컨트롤러 |
| `libs/server/client-api/src/lib/controllers/client-storage.controller.ts` | (신규) 파일 업로드 컨트롤러 |
| `libs/server/client-api/src/lib/controllers/client-user.controller.ts` | (신규) 사용자 식별 컨트롤러 |
| `libs/server/client-api/src/lib/dto/create-display.dto.ts` | (신규) Display 생성 Zod 스키마 |
| `libs/server/client-api/src/lib/dto/create-response.dto.ts` | (신규) 응답 생성 Zod 스키마 |
| `libs/server/client-api/src/lib/dto/update-response.dto.ts` | (신규) 응답 수정 Zod 스키마 |
| `libs/server/client-api/src/lib/dto/identify-user.dto.ts` | (신규) 사용자 식별 Zod 스키마 |
| `libs/server/client-api/src/lib/dto/upload-file.dto.ts` | (신규) 파일 업로드 Zod 스키마 |
| `tsconfig.json` | (수정) client-api 프로젝트 레퍼런스 추가 |

## Major Changes

### M3: ApiRateLimitGuard - namespace 기반 추적

기존 `CustomThrottlerGuard`는 IP 기반으로만 Rate Limiting을 적용했으나, API 환경에서는 같은 IP에서 여러 API Key를 사용하거나, 여러 Environment에서 요청이 올 수 있다. `ApiRateLimitGuard`는 요청의 컨텍스트에 따라 추적 키를 분리한다:

```typescript
protected override async getTracker(req: Record<string, unknown>): Promise<string> {
  // 1순위: Management API → mgmt:{apiKeyId}
  // 2순위: Client API → client:{environmentId}
  // 3순위: 폴백 → IP 기반
}
```

### M4: EnvironmentIdGuard - 이중 검증

모든 Client API 엔드포인트에 적용되며, CUID2 형식 검증과 DB 존재 확인을 수행한다:

```typescript
// 1. CUID2 형식 검증 (정규식 기반, DB 조회 없이 빠르게 실패)
if (!environmentId || !isValidCuid2(environmentId)) {
  throw new InvalidInputException('Invalid environment ID format');
}
// 2. DB 존재 확인
const environment = await this.prisma.environment.findUnique({ ... });
```

### M4: ClientResponseService - 안전한 부분 업데이트

응답 업데이트 시 환경 소속 검증 후, undefined가 아닌 필드만 선택적으로 갱신한다:

```typescript
// 해당 환경에 속한 응답인지 확인 (환경 간 데이터 격리)
const existing = await this.prisma.response.findFirst({
  where: { id: responseId, environmentId },
});
// undefined가 아닌 필드만 업데이트 (부분 업데이트 지원)
data: {
  ...(input.data !== undefined && { data: input.data }),
  ...(input.finished !== undefined && { finished: input.finished }),
}
```

### M4: ClientUserService - Contact upsert

userId를 attributes JSON 필드 내에서 관리하며, Prisma의 JSON 경로 쿼리로 기존 Contact을 검색한다:

```typescript
const existing = await this.prisma.contact.findFirst({
  where: {
    environmentId,
    attributes: { path: ['userId'], equals: input.userId },
  },
});
```

## How to use it

### Client API 엔드포인트 (RouterModule로 `/v1/client` 경로에 마운트 필요)

**환경 상태 조회:**
```
GET /v1/client/:environmentId/environment
→ { data: { id, project, actionClasses, surveys } }
```

**Display 이벤트 생성:**
```
POST /v1/client/:environmentId/displays
Body: { "surveyId": "clxxxxxxxxx" }
→ 201 { id, surveyId, environmentId, createdAt }
```

**응답 생성:**
```
POST /v1/client/:environmentId/responses
Body: { "surveyId": "clxxxxxxxxx", "data": { "q1": "answer" }, "finished": false }
→ 201 { id, surveyId, data, finished, ... }
```

**응답 업데이트:**
```
PUT /v1/client/:environmentId/responses/:responseId
Body: { "data": { "q1": "answer", "q2": "answer2" }, "finished": true }
→ { id, surveyId, data, finished, ... }
```

**파일 업로드:**
```
POST /v1/client/:environmentId/storage
Body: { "fileName": "image.png", "fileData": "base64...", "contentType": "image/png" }
→ 201 { url: "/storage/:environmentId/:storedName" }
```

**사용자 식별:**
```
POST /v1/client/:environmentId/user
Body: { "userId": "user-123", "attributes": { "email": "user@example.com" } }
→ { id, environmentId, attributes }
```

### ApiRateLimit 데코레이터 사용법
```typescript
import { ApiRateLimitGuard, ApiRateLimit } from '@inquiry/server-rate-limit';

@Controller('my-endpoint')
@UseGuards(ApiRateLimitGuard)
@ApiRateLimit()  // 분당 100건 제한
export class MyController { }
```

## Related Components/Modules

- **`@inquiry/server-rate-limit`**: ApiRateLimitGuard와 ApiRateLimit 데코레이터를 제공. Client API 및 향후 Management API에서 공통 사용.
- **`@inquiry/server-prisma`**: 모든 서비스의 DB 접근에 사용. ServerPrismaService를 주입받아 Environment, Survey, Response, Display, Contact 모델을 조회/생성.
- **`@inquiry/server-core`**: 예외 클래스(InvalidInputException, ResourceNotFoundException), 유효성 검사(ZodValidationPipe, isValidCuid2), 필터(ApiExceptionFilter), 유틸(generateCuid2) 제공.
- **`@inquiry/db`**: Prisma 스키마 정의 (Environment, Survey, Response, Display, Contact 모델).
- **앱 서버(`apps/server`)**: ClientApiModule을 RouterModule로 `/v1/client` 경로에 마운트해야 실제로 엔드포인트가 활성화된다.

## Precautions

- **RouterModule 마운트 필요**: `ClientApiModule`은 자체적으로 `/v1/client` 경로를 설정하지 않으므로, 앱 서버의 AppModule에서 `RouterModule.register([{ path: 'v1/client', module: ClientApiModule }])` 형태로 등록해야 한다.
- **인증 없는 공개 API**: Client API는 인증을 요구하지 않으므로, Rate Limiting과 Environment ID 검증이 유일한 보호 수단이다. 민감한 데이터 노출에 주의해야 한다.
- **로컬 파일 스토리지**: `ClientStorageService`는 로컬 파일 시스템에 저장하므로, 프로덕션 환경에서는 S3/GCS 등 클라우드 스토리지로 교체가 필요하다.
- **STORAGE_PATH 환경변수**: 파일 저장 경로를 설정해야 한다. 미설정 시 `./uploads` 기본값 사용.
- **Rate Limit 설정**: 현재 분당 100건으로 고정되어 있으며, 엔드포인트별 세분화가 필요할 수 있다.
