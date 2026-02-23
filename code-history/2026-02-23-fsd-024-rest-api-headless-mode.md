# FSD-024: REST API / Headless Mode

## Overview
3단계 구현으로, 2단계(인증/테넌시 코어)에서 확립된 User/Organization/Project/Environment 인프라 위에 **공개 API 체계(Client API v1, Management API v1)**, **API Key 기반 인증/인가**, **Headless 모드**를 구현하여 SDK, 외부 통합, Headless 사용의 공통 진입점을 확보한다.

핵심 산출물:
- Client API v1: 6개 엔드포인트 (인증 불필요)
- Management API v1: 15개 엔드포인트 (API Key 인증)
- API Key 인증/권한 시스템 (조직 스코프, 환경별 READ/WRITE/MANAGE)
- namespace별 Rate Limiting (environmentId/apiKeyId 기반)
- 표준 API 에러 응답 (`{ error: { code, message, details } }`)
- API Key 관리 UI (15개 언어 i18n)
- v2 API 스텁

## Changed Files

### M0: 공통 인프라 확장
| 파일 | 역할 |
|------|------|
| `libs/server/core/src/lib/exceptions/api-error.exception.ts` | API 에러 기반 클래스 (code/message/details) |
| `libs/server/core/src/lib/exceptions/not-authenticated.exception.ts` | 401 NotAuthenticatedError |
| `libs/server/core/src/lib/exceptions/forbidden.exception.ts` | 403 ForbiddenError |
| `libs/server/core/src/lib/exceptions/invalid-input.exception.ts` | 422 InvalidInputError |
| `libs/server/core/src/lib/exceptions/resource-not-found.exception.ts` | 404 ResourceNotFoundError |
| `libs/server/core/src/lib/exceptions/too-many-requests.exception.ts` | 429 TooManyRequestsError |
| `libs/server/core/src/lib/filters/api-exception.filter.ts` | API 전용 ExceptionFilter (컨트롤러 레벨) |
| `libs/server/core/src/lib/utils/cuid2.util.ts` | CUID2 생성/검증 유틸리티 |
| `libs/server/core/src/lib/pipes/cuid2-validation.pipe.ts` | CUID2 파라미터 검증 파이프 |
| `libs/server/core/src/index.ts` | (수정) 신규 exports 추가 |
| `libs/server/core/package.json` | (수정) @paralleldrive/cuid2 의존성 |

### M1: DB 스키마 변경
| 파일 | 역할 |
|------|------|
| `packages/db/prisma/schema.prisma` | (수정) ApiKeyPermission/SurveyStatus enum, ApiKey 재구조화(organizationId), ApiKeyEnvironmentPermission, Survey/Response/Display/Contact 스텁 모델 |
| `packages/db/prisma/migrations/20260223000000_add_api_key_permissions_and_domain_stubs/migration.sql` | 마이그레이션 SQL |

### M2: API Key 모듈 (`libs/server/api-key/`)
| 파일 | 역할 |
|------|------|
| `src/lib/api-key.service.ts` | 조직 스코프 API Key CRUD + bcrypt 검증 |
| `src/lib/api-key.controller.ts` | JWT 인증 Admin 엔드포인트 (POST/GET/DELETE) |
| `src/lib/api-key.module.ts` | NestJS 모듈 정의 |
| `src/lib/guards/api-key-auth.guard.ts` | x-api-key 헤더 인증 → ApiKeyAuthObject 주입 |
| `src/lib/guards/require-permission.guard.ts` | 계층적 권한 검증 (READ < WRITE < MANAGE) |
| `src/lib/decorators/require-permission.decorator.ts` | @RequirePermission() 데코레이터 |
| `src/lib/decorators/api-key-auth.decorator.ts` | @ApiKeyAuth() 파라미터 데코레이터 |
| `src/lib/interfaces/api-key-auth.interface.ts` | ApiKeyAuthObject 타입 정의 |
| `src/lib/dto/create-api-key.dto.ts` | Zod 기반 생성 DTO |
| `libs/server/auth/src/lib/services/api-key.service.ts` | (삭제) 기존 auth 모듈에서 분리 |
| `libs/server/auth/src/lib/guards/api-key-auth.guard.ts` | (삭제) 기존 auth 모듈에서 분리 |
| `libs/server/auth/src/lib/dto/create-api-key.dto.ts` | (삭제) 기존 auth 모듈에서 분리 |

### M3: Rate Limiting 확장
| 파일 | 역할 |
|------|------|
| `libs/server/rate-limit/src/lib/api-rate-limit.guard.ts` | (생성) namespace 기반 Guard (mgmt/client/IP) |
| `libs/server/rate-limit/src/lib/rate-limit.decorators.ts` | (수정) ApiRateLimit() 데코레이터 추가 |
| `libs/server/rate-limit/src/index.ts` | (수정) 신규 export |

### M4: Client API v1 (`libs/server/client-api/`)
| 파일 | 역할 |
|------|------|
| `src/lib/controllers/client-environment.controller.ts` | GET :envId/environment |
| `src/lib/controllers/client-display.controller.ts` | POST :envId/displays |
| `src/lib/controllers/client-response.controller.ts` | POST/PUT :envId/responses |
| `src/lib/controllers/client-storage.controller.ts` | POST :envId/storage |
| `src/lib/controllers/client-user.controller.ts` | POST :envId/user |
| `src/lib/services/` | 각 컨트롤러별 비즈니스 로직 서비스 |
| `src/lib/dto/` | Zod 기반 요청 검증 DTO (5개) |
| `src/lib/guards/environment-id.guard.ts` | EnvironmentId CUID2 + DB 존재 검증 |

### M5: Management API v1 (`libs/server/management-api/`)
| 파일 | 역할 |
|------|------|
| `src/lib/controllers/management-me.controller.ts` | GET /me |
| `src/lib/controllers/management-survey.controller.ts` | CRUD /surveys (5개 엔드포인트) |
| `src/lib/controllers/management-response.controller.ts` | CRUD /responses (4개 엔드포인트) |
| `src/lib/controllers/management-contact.controller.ts` | CRUD /contacts (4개 엔드포인트) |
| `src/lib/controllers/management-storage.controller.ts` | POST /storage |
| `src/lib/services/` | 각 컨트롤러별 서비스 (5개) |
| `src/lib/dto/` | Zod 기반 DTO (5개) |

### M6: 글로벌 설정 + v2 스텁
| 파일 | 역할 |
|------|------|
| `apps/server/src/app/app.module.ts` | (수정) 모듈 등록 + RouterModule 라우팅 |
| `apps/server/src/main.ts` | (수정) CORS 확장 |
| `apps/server/src/app/config/env.validation.ts` | (수정) 환경변수 추가 |
| `apps/server/src/app/v2-health/` | (생성) v2 Health 스텁 |
| `.env.example` | (수정) 신규 환경변수 문서화 |

### M7: API Key 관리 UI (`libs/client/api-key/`)
| 파일 | 역할 |
|------|------|
| `src/lib/api-key-list.tsx` | API Key 카드 리스트 |
| `src/lib/create-api-key-dialog.tsx` | 생성 다이얼로그 (환경 권한 동적 추가) |
| `src/lib/delete-api-key-dialog.tsx` | 삭제 확인 다이얼로그 |
| `src/lib/api-key-secret-dialog.tsx` | 1회 키 표시 + 복사 |
| `apps/client/src/app/[lng]/organizations/[orgId]/api-keys/page.tsx` | API Keys 전용 페이지 |
| `apps/client/src/app/[lng]/organizations/[orgId]/settings/page.tsx` | (수정) API Keys 버튼 추가 |
| `apps/client/src/app/[lng]/organizations/[orgId]/members/page.tsx` | (수정) API Keys 버튼 추가 |

### M8: i18n 번역
| 파일 | 역할 |
|------|------|
| `apps/client/src/app/i18n/locales/*/translation.json` | (수정) 15개 로케일에 `apiKey.*` 네임스페이스 추가 |

## Major Changes

### 1. API Key 재구조화 (environmentId → organizationId + 다대다)
기존 ApiKey 모델은 단일 environmentId에 바인딩되었으나, 조직 스코프로 변경하고 `ApiKeyEnvironmentPermission` 중간 테이블을 통해 여러 환경에 각각 다른 권한(READ/WRITE/MANAGE)을 부여할 수 있게 되었다.

```
ApiKey (organizationId) ──< ApiKeyEnvironmentPermission >── Environment
                              (apiKeyId, environmentId, permission)
```

### 2. API 에러 응답 이중 체계
기존 `GlobalExceptionFilter`는 관리 API(내부)용으로 유지하고, 신규 `ApiExceptionFilter`는 공개 API(v1)용으로 컨트롤러 레벨에서 `@UseFilters()`로 적용한다.

```typescript
// GlobalExceptionFilter (기존): { statusCode, error, message, timestamp, path }
// ApiExceptionFilter (신규): { error: { code, message, details? } }
```

### 3. namespace별 Rate Limiting
`ApiRateLimitGuard`는 요청 유형에 따라 추적 키를 분리한다:
- Management API: `mgmt:{apiKeyId}` — API Key별 분당 100건
- Client API: `client:{environmentId}` — 환경별 분당 100건
- 폴백: IP 기반

### 4. RouterModule 기반 API 버전 라우팅
```
/api/v1/client/:environmentId/...    → ClientApiModule (인증 불필요)
/api/v1/management/...               → ManagementApiModule (API Key 인증)
/api/v2/health                       → V2HealthModule (스텁)
```

## How to use it

### Client API 사용 예시
```bash
# 환경 상태 조회
curl http://localhost:3000/api/v1/client/{environmentId}/environment

# Display 이벤트 생성
curl -X POST http://localhost:3000/api/v1/client/{environmentId}/displays \
  -H "Content-Type: application/json" \
  -d '{"surveyId": "survey123"}'

# 응답 생성
curl -X POST http://localhost:3000/api/v1/client/{environmentId}/responses \
  -H "Content-Type: application/json" \
  -d '{"surveyId": "survey123", "data": {"q1": "answer"}, "finished": false}'
```

### Management API 사용 예시
```bash
# API Key 정보 확인
curl http://localhost:3000/api/v1/management/me \
  -H "x-api-key: fbk_xxxxx"

# 설문 목록 조회
curl "http://localhost:3000/api/v1/management/surveys?environmentId={envId}" \
  -H "x-api-key: fbk_xxxxx"

# 설문 생성
curl -X POST "http://localhost:3000/api/v1/management/surveys?environmentId={envId}" \
  -H "x-api-key: fbk_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Survey", "questions": [{"type": "text", "label": "Q1"}]}'
```

### API Key 관리 (JWT 인증 필요)
```bash
# API Key 생성
curl -X POST http://localhost:3000/api/organizations/{orgId}/api-keys \
  -H "Authorization: Bearer {jwt}" \
  -H "Content-Type: application/json" \
  -d '{"label": "SDK Key", "environmentPermissions": [{"environmentId": "env1", "permission": "WRITE"}]}'

# API Key 목록 조회
curl http://localhost:3000/api/organizations/{orgId}/api-keys \
  -H "Authorization: Bearer {jwt}"
```

### UI
조직 설정 또는 멤버 페이지에서 "API Keys" 버튼으로 접근하거나, 직접 `/{lng}/organizations/{orgId}/api-keys` 경로로 접근한다.

## Related Components/Modules

| 모듈 | 관계 |
|------|------|
| `@inquiry/server-auth` | API Key 관련 코드가 분리됨 (ServerAuthModule에서 제거) |
| `@inquiry/server-prisma` | 모든 서비스에서 DB 접근에 사용 |
| `@inquiry/server-rate-limit` | ApiRateLimitGuard 확장으로 namespace 기반 제한 추가 |
| `@inquiry/server-core` | API 예외 클래스, 필터, CUID2 유틸리티 제공 |
| `@inquiry/client-core` | apiFetch, useAuth 등 프론트엔드 공통 기능 |
| `@inquiry/client-ui` | 프론트엔드 UI 컴포넌트 (Dialog, Card, Button 등) |

## Precautions

- **DB 마이그레이션 필요**: 기존 ApiKey 모델이 변경됨. DB 서버 기동 후 `pnpm db:migrate` 실행 필요.
- **기존 ApiKey 데이터**: environmentId → organizationId 마이그레이션 SQL이 포함되어 있지만, 데이터가 있는 경우 검증 필요.
- **파일 업로드**: 현재 로컬 FS(base64) 방식. 프로덕션에서는 S3 등 외부 스토리지로 전환 필요.
- **API Key 검증 성능**: 현재 모든 키를 순회하며 bcrypt 비교. 대량의 키가 있을 경우 성능 최적화 필요 (키 접두사 인덱싱 등).
- **환경변수**: `CORS_ALLOWED_ORIGINS`(쉼표 구분 도메인), `STORAGE_PATH`(파일 저장 경로) 추가.
- **v2 API**: 현재 `/api/v2/health` 스텁만 구현. 향후 확장 예정.
