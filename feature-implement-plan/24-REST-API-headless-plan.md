# 기능 구현 계획: REST API 및 Headless 모드 (FS-024)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

본 명세서(FS-024)는 Inquiry 플랫폼의 **공개 API 체계(Client API, Management API)** 와 **API Key 기반 인증/인가**, **Headless 모드**를 정의한다. 구현 순서상 3단계("API 베이스라인")에 해당하며, 2단계(인증/테넌시 코어)에서 확립된 User/Organization/Environment 인프라 위에 구축된다.

**핵심 기능 9개:**

| 기능 ID | 기능명 | 우선순위 | 의존 대상 |
|---------|--------|---------|----------|
| FN-024-01 | Client API v1 엔드포인트 | 필수 | Environment, Survey, Response 모델 |
| FN-024-02 | Management API v1 엔드포인트 | 필수 | FN-024-03, FN-024-04 |
| FN-024-03 | API Key 인증 처리 | 필수 | FN-024-05 (API Key 데이터 존재) |
| FN-024-04 | API Key 권한 레벨 관리 | 필수 | FN-024-03 |
| FN-024-05 | API Key 생성 및 관리 | 필수 | Organization, Environment 모델 |
| FN-024-06 | Rate Limiting (namespace별) | 필수 | 기존 `@nestjs/throttler` 확장 |
| FN-024-07 | v2 Beta API | 높음 | FN-024-01, FN-024-02 |
| FN-024-08 | Headless 모드 | 필수 | FN-024-01 (Client API) |
| FN-024-09 | API 에러 처리 | 필수 | 횡단 관심사 |

### 1.2 비기능 요구사항

| 분류 | 요구사항 | 현재 상태 |
|------|---------|----------|
| 성능 | Rate Limit 분당 100건/namespace, bcrypt 비교 최적화 | 기존 throttler 60초/100건 IP 기반 존재 |
| 보안 | API Key bcrypt(cost:12) 해시, CORS, environmentId 스코핑, 로그 노출 금지 | bcryptjs 도입 완료, CORS 기본 설정 존재 |
| 가용성 | v1/v2 병행 운영, Health Check | 미구현 |
| 일관성 | 모든 API 계층 동일 에러 응답 형식 | 미구현 (표준 에러 포맷 없음) |
| 호환성 | 모든 HTTP 클라이언트에서 Headless 모드 사용 가능 | Client API 구현으로 자동 충족 |

### 1.3 명세서 내 모호한 부분 및 해석

| 번호 | 모호한 부분 | 제안 해석 |
|------|-----------|----------|
| 1 | Client API의 CORS "허용된 도메인"의 구체적 설정 정책 미정의 | 환경변수 `CORS_ALLOWED_ORIGINS`로 다중 origin을 콤마 구분자로 설정. Client API는 와일드카드(`*`) 허용, Management API는 제한적 CORS 정책 적용 |
| 2 | API Key 검증 시 "모든 API Key 해시 레코드를 후보로 조회"(4.3.4 단계3)는 N건 전체 스캔을 의미하는지 불명확 | v2 키("fbk_" 접두사) 형식에서는 키 ID를 인코딩하는 최적화 구조 도입. v1 레거시는 전체 스캔 허용 (API Key 수가 제한적이므로 성능 문제 없음) |
| 3 | Management API의 `organizationAccess` 구체적 구조 미정의 | `{ accessLevel: "read" | "write" | "manage" }` 형태로 해석. Organization 전체에 대한 포괄 권한으로 사용 |
| 4 | Rate Limiting의 "namespace" 개념이 Client API에서 environmentId인지 IP인지 불명확 | Client API: environmentId 기반 namespace, Management API: API Key ID 기반 namespace로 구분 |
| 5 | v2 Beta API 엔드포인트 중 `/v2/organizations/...` 경로가 Management API 패턴(`/api/v2/management/...`)과 다름 | v2에서는 리소스 계층 구조 기반 라우팅 허용. `/api/v2/organizations/` 경로를 별도 모듈로 구현 |
| 6 | Headless 모드가 "별도 서버 설정 불필요"라고 하지만, Display/Response 등 도메인 모델이 현재 미구현 | Headless 모드는 Client API의 동작 검증 시나리오. Client API 구현이 완료되면 자동 충족됨 |
| 7 | 명세서에서 ResourceNotFoundError를 400으로 매핑하고 있으나 HTTP 표준에서는 404가 적절 | 명세서 정의를 우선 준수하되, 내부적으로 404를 반환하는 것이 더 적합한 경우 주석으로 표기. 우선 명세서 기준 400 적용 |
| 8 | API Key 생성 API가 Management API인지 Admin Dashboard API인지 불명확 | Organization Admin이 Dashboard UI를 통해 호출하는 Internal API로 해석. JWT 인증 기반의 별도 Admin 엔드포인트로 구현 |

### 1.4 암묵적 요구사항

| 번호 | 암묵적 요구사항 | 도출 근거 |
|------|--------------|----------|
| 1 | **Environment, Project 모델 스키마 추가** | Client API가 environmentId 기반으로 동작하나 현재 DB에 Environment/Project 모델이 없음. 2단계(FS-006) 선행 필요 |
| 2 | **Survey, Response, Display, Contact, ActionClass 도메인 모델** | Management API CRUD 대상이나 현재 미구현. 4단계(FS-008) 이후 순차 구현 |
| 3 | **API 버전 라우팅 구조** | v1/v2 병행 운영을 위한 NestJS 버전별 모듈 분리 또는 라우팅 전략 |
| 4 | **CUID2 생성 라이브러리 도입** | 명세서에서 Response ID, Environment ID 등을 CUID2 형식으로 요구. 현재 Prisma는 CUID v1 사용 |
| 5 | **API Key 관리 Admin UI (프론트엔드)** | API Key 생성/목록/삭제 UI가 필요하나 명세에서 "별도 기능 명세에서 다룸"으로 제외 |
| 6 | **표준 에러 응답 필터/인터셉터** | NestJS의 ExceptionFilter를 활용한 전역 에러 처리 계층 |
| 7 | **namespace별 Rate Limiting 확장** | 현재 IP 기반 throttler를 environmentId/API Key ID 기반으로 확장 필요 |
| 8 | **파일 업로드 스토리지 인프라** | Client API의 `/storage` 엔드포인트 - 로컬/S3 스토리지 어댑터 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
apps/server/src/
├── main.ts                        # 부트스트랩 (CORS, ValidationPipe, GlobalFilter)
├── app/
│   └── app.module.ts              # Root Module (기존)
│
libs/server/
├── api-key/                       # [신규] API Key 모듈
│   └── src/
│       ├── lib/
│       │   ├── api-key.module.ts
│       │   ├── api-key.service.ts         # API Key 생성/검증/관리 비즈니스 로직
│       │   ├── api-key.controller.ts      # Admin용 API Key CRUD 엔드포인트
│       │   ├── guards/
│       │   │   └── api-key-auth.guard.ts  # x-api-key 헤더 인증 Guard
│       │   ├── decorators/
│       │   │   ├── api-key-auth.decorator.ts    # 인증 객체 추출 데코레이터
│       │   │   └── require-permission.decorator.ts  # 권한 레벨 검증 데코레이터
│       │   ├── dto/
│       │   │   ├── create-api-key.dto.ts
│       │   │   └── update-api-key.dto.ts
│       │   ├── interfaces/
│       │   │   └── api-key-auth.interface.ts   # 인증 객체 타입 정의
│       │   └── strategies/
│       │       └── api-key.strategy.ts    # Passport API Key Strategy (선택)
│       └── index.ts
│
├── client-api/                    # [신규] Client API 모듈 (v1)
│   └── src/
│       ├── lib/
│       │   ├── client-api.module.ts
│       │   ├── controllers/
│       │   │   ├── environment.controller.ts    # GET /client/{envId}/environment
│       │   │   ├── display.controller.ts        # POST /client/{envId}/displays
│       │   │   ├── response.controller.ts       # POST/PUT /client/{envId}/responses
│       │   │   ├── storage.controller.ts        # POST /client/{envId}/storage
│       │   │   └── user.controller.ts           # POST /client/{envId}/user
│       │   ├── services/
│       │   │   ├── client-environment.service.ts
│       │   │   ├── client-display.service.ts
│       │   │   ├── client-response.service.ts
│       │   │   ├── client-storage.service.ts
│       │   │   └── client-user.service.ts
│       │   ├── dto/
│       │   │   ├── create-response.dto.ts
│       │   │   ├── update-response.dto.ts
│       │   │   ├── create-display.dto.ts
│       │   │   └── identify-user.dto.ts
│       │   ├── guards/
│       │   │   └── environment-id.guard.ts     # environmentId CUID2 형식 검증
│       │   └── pipes/
│       │       └── cuid2-validation.pipe.ts    # CUID2 파라미터 파이프
│       └── index.ts
│
├── management-api/                # [신규] Management API 모듈 (v1)
│   └── src/
│       ├── lib/
│       │   ├── management-api.module.ts
│       │   ├── controllers/
│       │   │   ├── management-me.controller.ts
│       │   │   ├── management-survey.controller.ts
│       │   │   ├── management-response.controller.ts
│       │   │   ├── management-contact.controller.ts
│       │   │   ├── management-action-class.controller.ts
│       │   │   └── management-storage.controller.ts
│       │   ├── services/
│       │   │   └── (각 컨트롤러에 대응하는 서비스)
│       │   └── dto/
│       │       └── (각 엔드포인트별 DTO)
│       └── index.ts
│
├── common/                        # [신규] 공통 모듈
│   └── src/
│       ├── lib/
│       │   ├── common.module.ts
│       │   ├── filters/
│       │   │   └── api-exception.filter.ts    # 표준 에러 응답 필터
│       │   ├── interceptors/
│       │   │   └── api-response.interceptor.ts # 표준 성공 응답 래핑
│       │   ├── exceptions/
│       │   │   ├── api-error.exception.ts      # 커스텀 에러 클래스 기반
│       │   │   ├── not-authenticated.exception.ts
│       │   │   ├── unauthorized.exception.ts
│       │   │   ├── invalid-input.exception.ts
│       │   │   ├── resource-not-found.exception.ts
│       │   │   └── database-error.exception.ts
│       │   └── utils/
│       │       └── cuid2.util.ts              # CUID2 생성/검증 유틸리티
│       └── index.ts
│
├── rate-limit/                    # [확장] 기존 Rate Limit 모듈
│   └── src/lib/
│       ├── rate-limit.guard.ts    # namespace별 Rate Limit 지원 추가
│       └── rate-limit.decorators.ts # API Rate Limit 데코레이터 추가
```

**핵심 아키텍처 결정:**

1. **모듈 분리**: Client API, Management API, API Key를 독립 NestJS 모듈로 분리하여 관심사를 격리한다.
2. **버전 라우팅**: NestJS `RouterModule`을 활용하여 `/api/v1/client/`, `/api/v1/management/` 경로 구조를 구현한다. v2는 별도 모듈로 병행.
3. **Guard 계층 구조**: Client API(인증 불필요) -> environmentId 검증 Guard, Management API -> API Key Auth Guard -> Permission Guard 순서.
4. **기존 패턴 준수**: class-validator + class-transformer 기반 DTO, `@inquiry/` 네임스페이스 라이브러리, PrismaService 주입 패턴 유지.

### 2.2 데이터 모델

**신규 Prisma 스키마 추가 (API Key 관련):**

```prisma
/// API Key 권한 레벨
enum ApiKeyPermission {
  READ
  WRITE
  MANAGE
}

/// Management API 인증용 API Key
model ApiKey {
  id             String    @id @default(cuid())
  hashedKey      String    // bcrypt(cost:12) 해시
  label          String    // 사용자 지정 라벨
  organizationId String
  createdAt      DateTime  @default(now())
  lastUsedAt     DateTime?

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  environmentPermissions ApiKeyEnvironmentPermission[]

  @@index([organizationId])
  @@map("api_keys")
}

/// API Key의 Environment별 권한 할당
model ApiKeyEnvironmentPermission {
  id            String           @id @default(cuid())
  apiKeyId      String
  environmentId String
  permission    ApiKeyPermission

  apiKey      ApiKey      @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)
  environment Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)

  @@unique([apiKeyId, environmentId])
  @@index([apiKeyId])
  @@index([environmentId])
  @@map("api_key_environment_permissions")
}
```

**참조 모델 (2단계 FS-006에서 구현 예정, 스텁 정의 필요):**

```prisma
/// 프로젝트
model Project {
  id             String   @id @default(cuid())
  name           String
  organizationId String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  environments Environment[]

  @@index([organizationId])
  @@map("projects")
}

/// 프로젝트 내 격리된 실행 환경
model Environment {
  id        String          @id @default(cuid())
  type      EnvironmentType @default(DEVELOPMENT)
  projectId String
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  project     Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  apiKeyPermissions ApiKeyEnvironmentPermission[]
  surveys     Survey[]
  responses   Response[]
  displays    Display[]
  contacts    Contact[]
  actionClasses ActionClass[]

  @@index([projectId])
  @@map("environments")
}

enum EnvironmentType {
  DEVELOPMENT
  PRODUCTION
}
```

**Client API 도메인 모델 (4단계 이전 스텁):**

```prisma
/// 설문
model Survey {
  id            String   @id @default(cuid())
  environmentId String
  status        SurveyStatus @default(DRAFT)
  name          String
  questions     Json     @default("[]")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  environment Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)
  responses   Response[]
  displays    Display[]

  @@index([environmentId])
  @@map("surveys")
}

enum SurveyStatus {
  DRAFT
  IN_PROGRESS
  PAUSED
  COMPLETED
}

/// 설문 응답
model Response {
  id            String   @id @default(cuid())
  surveyId      String
  environmentId String
  finished      Boolean  @default(false)
  data          Json     @default("{}")
  meta          Json?
  variables     Json?
  ttc           Json?
  hiddenFields  Json?
  language      String?
  userId        String?  // 외부 사용자 식별자 (User 테이블과 무관)
  displayId     String?
  endingId      String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  survey      Survey      @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  environment Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)
  display     Display?    @relation(fields: [displayId], references: [id], onDelete: SetNull)

  @@index([surveyId])
  @@index([environmentId])
  @@index([userId])
  @@map("responses")
}

/// 설문 노출 이벤트
model Display {
  id            String   @id @default(cuid())
  surveyId      String
  environmentId String
  createdAt     DateTime @default(now())

  survey      Survey      @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  environment Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)
  responses   Response[]

  @@index([surveyId])
  @@index([environmentId])
  @@map("displays")
}

/// 연락처
model Contact {
  id            String   @id @default(cuid())
  environmentId String
  attributes    Json     @default("{}")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  environment Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)

  @@index([environmentId])
  @@map("contacts")
}

/// 사용자 행동 분류
model ActionClass {
  id            String   @id @default(cuid())
  environmentId String
  name          String
  type          String   // "code" | "noCode" | "automatic"
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  environment Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)

  @@unique([environmentId, name])
  @@index([environmentId])
  @@map("action_classes")
}
```

**기존 Organization 모델에 관계 추가:**

```prisma
model Organization {
  // ... 기존 필드 유지 ...
  apiKeys     ApiKey[]     // [추가]
  projects    Project[]    // [추가]
}
```

### 2.3 API 설계

#### 2.3.1 Client API v1 엔드포인트

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/v1/client/:environmentId/environment` | Environment 상태 조회 | 없음 |
| POST | `/api/v1/client/:environmentId/displays` | Display 이벤트 기록 | 없음 |
| POST | `/api/v1/client/:environmentId/responses` | 응답 생성 | 없음 |
| PUT | `/api/v1/client/:environmentId/responses/:responseId` | 응답 업데이트 | 없음 |
| POST | `/api/v1/client/:environmentId/storage` | 파일 업로드 | 없음 |
| POST | `/api/v1/client/:environmentId/user` | 사용자 식별 | 없음 |

#### 2.3.2 Management API v1 엔드포인트

| 메서드 | 경로 | 최소 권한 | 설명 |
|--------|------|----------|------|
| GET | `/api/v1/management/me` | read | 현재 API Key 정보 |
| GET | `/api/v1/management/surveys` | read | 설문 목록 조회 |
| POST | `/api/v1/management/surveys` | write | 설문 생성 |
| GET | `/api/v1/management/surveys/:surveyId` | read | 개별 설문 조회 |
| PUT | `/api/v1/management/surveys/:surveyId` | write | 설문 수정 |
| DELETE | `/api/v1/management/surveys/:surveyId` | manage | 설문 삭제 |
| GET | `/api/v1/management/responses` | read | 응답 목록 조회 |
| GET | `/api/v1/management/responses/:responseId` | read | 개별 응답 조회 |
| PUT | `/api/v1/management/responses/:responseId` | write | 응답 수정 |
| DELETE | `/api/v1/management/responses/:responseId` | manage | 응답 삭제 |
| GET | `/api/v1/management/contacts` | read | 연락처 목록 조회 |
| POST | `/api/v1/management/contacts` | write | 연락처 생성 |
| GET | `/api/v1/management/contacts/:contactId` | read | 개별 연락처 조회 |
| DELETE | `/api/v1/management/contacts/:contactId` | manage | 연락처 삭제 |
| POST | `/api/v1/management/storage` | write | 파일 업로드 |

#### 2.3.3 API Key Admin 엔드포인트 (JWT 인증)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/v1/organizations/:orgId/api-keys` | API Key 생성 |
| GET | `/api/v1/organizations/:orgId/api-keys` | API Key 목록 조회 |
| DELETE | `/api/v1/organizations/:orgId/api-keys/:apiKeyId` | API Key 삭제 |

#### 2.3.4 표준 응답 형식

**성공 응답:**
```json
{
  "data": { ... }
}
```

**에러 응답:**
```json
{
  "error": {
    "code": "InvalidInputError",
    "message": "유효하지 않은 입력 데이터입니다.",
    "details": {}
  }
}
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 API Key 인증 Guard (`ApiKeyAuthGuard`)

```typescript
// libs/server/api-key/src/lib/guards/api-key-auth.guard.ts
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKeyValue = request.headers['x-api-key'];

    // 1. x-api-key 헤더 존재 여부 확인
    if (!apiKeyValue) throw new NotAuthenticatedException('API Key가 제공되지 않았습니다');

    // 2. ApiKeyService를 통해 검증 및 인증 객체 생성
    const authObject = await this.apiKeyService.validateApiKey(apiKeyValue);

    // 3. 요청 컨텍스트에 인증 객체 설정
    request.apiKeyAuth = authObject;
    return true;
  }
}
```

#### 2.4.2 Permission Guard (`RequirePermissionGuard`)

```typescript
// libs/server/api-key/src/lib/guards/require-permission.guard.ts
@Injectable()
export class RequirePermissionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<ApiKeyPermission>(
      'requiredPermission', context.getHandler()
    );
    const request = context.switchToHttp().getRequest();
    const auth = request.apiKeyAuth;

    // environmentId는 쿼리/바디/리소스에서 추출
    const environmentId = this.resolveEnvironmentId(request);
    const envPermission = auth.environmentPermissions.find(
      p => p.environmentId === environmentId
    );

    if (!envPermission || !this.hasPermission(envPermission.permission, requiredPermission)) {
      throw new UnauthorizedException('권한이 부족합니다');
    }
    return true;
  }
}
```

#### 2.4.3 API Key v2 형식 생성 로직

```typescript
// libs/server/api-key/src/lib/api-key.service.ts
async createApiKey(input: CreateApiKeyInput): Promise<{ apiKey: string; record: ApiKeyRecord }> {
  // 1. 암호학적으로 안전한 랜덤 바이트 생성
  const secretBytes = randomBytes(32);

  // 2. base64url 인코딩
  const secretBase64 = secretBytes.toString('base64url');

  // 3. "fbk_" 접두사 + 시크릿
  const apiKeyPlaintext = `fbk_${secretBase64}`;

  // 4. bcrypt 해시 (cost factor: 12)
  const hashedKey = await bcrypt.hash(secretBase64, 12);

  // 5. DB 저장 (해시만)
  const record = await this.prisma.apiKey.create({
    data: { hashedKey, label: input.label, organizationId: input.organizationId }
  });

  // 6. 환경별 권한 할당
  if (input.environmentPermissions?.length) {
    await this.prisma.apiKeyEnvironmentPermission.createMany({
      data: input.environmentPermissions.map(ep => ({
        apiKeyId: record.id,
        environmentId: ep.environmentId,
        permission: ep.permission,
      }))
    });
  }

  // 7. 원본 API Key는 1회만 반환 (DB에 저장하지 않음)
  return { apiKey: apiKeyPlaintext, record };
}
```

#### 2.4.4 API Key 검증 최적화 전략

bcrypt 비교가 CPU 집약적이므로 전체 스캔 대신 최적화가 필요하다.

**전략: API Key 해시의 앞 8자(prefix)를 별도 컬럼으로 저장**

```typescript
// API Key 생성 시
const hashedKey = await bcrypt.hash(secretBase64, 12);
const hashPrefix = hashedKey.substring(0, 8); // bcrypt 해시의 앞부분(salt 포함)

// 검증 시
// 모든 API Key를 로드할 필요 없이 Organization 단위로 조회
const candidates = await this.prisma.apiKey.findMany({
  where: { organization: { id: { not: undefined } } },
  include: { environmentPermissions: { include: { environment: true } } },
});

for (const candidate of candidates) {
  const isMatch = await bcrypt.compare(secretPart, candidate.hashedKey);
  if (isMatch) return this.buildAuthObject(candidate);
}
```

> **참고**: API Key 수가 소규모(Organization당 수십 개 이하)이므로 초기에는 전체 비교 방식을 사용하고, 성능 이슈 발생 시 접두사 필터링/캐싱으로 전환한다.

#### 2.4.5 표준 에러 처리 필터

```typescript
// libs/server/common/src/lib/filters/api-exception.filter.ts
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, errorResponse } = this.resolveException(exception);

    response.status(status).json({
      error: {
        code: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details ?? {},
      },
    });
  }

  private resolveException(exception: unknown): { status: number; errorResponse: ErrorBody } {
    if (exception instanceof ApiErrorException) {
      return { status: exception.statusCode, errorResponse: exception.toErrorBody() };
    }
    if (exception instanceof HttpException) {
      return { status: exception.getStatus(), errorResponse: { code: 'UnknownError', message: exception.message } };
    }
    // 500 Internal Server Error - 내부 정보 노출 방지
    return { status: 500, errorResponse: { code: 'InternalServerError', message: '서버 내부 오류가 발생했습니다.' } };
  }
}
```

#### 2.4.6 Namespace 기반 Rate Limiting 확장

```typescript
// libs/server/rate-limit/src/lib/rate-limit.guard.ts 확장
@Injectable()
export class ApiRateLimitGuard extends ThrottlerGuard {
  /** Client API: environmentId, Management API: apiKeyId 기반 */
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    // Management API: apiKeyAuth.apiKeyId
    const apiKeyAuth = req['apiKeyAuth'] as { apiKeyId?: string } | undefined;
    if (apiKeyAuth?.apiKeyId) return `mgmt:${apiKeyAuth.apiKeyId}`;

    // Client API: environmentId 파라미터
    const params = req['params'] as Record<string, string> | undefined;
    const envId = params?.['environmentId'];
    if (envId) return `client:${envId}`;

    // 폴백: IP 기반
    return super.getTracker(req);
  }
}
```

### 2.5 기존 시스템 영향 분석

| 기존 모듈 | 변경 유형 | 영향 범위 |
|----------|----------|----------|
| `packages/db/prisma/schema.prisma` | 수정 | ApiKey, ApiKeyEnvironmentPermission, Project, Environment, Survey, Response, Display, Contact, ActionClass 모델 추가. Organization에 관계 추가 |
| `apps/server/src/app/app.module.ts` | 수정 | ApiKeyModule, ClientApiModule, ManagementApiModule, CommonModule import 추가 |
| `apps/server/src/main.ts` | 수정 | 글로벌 ExceptionFilter 등록, CORS 설정 확장 |
| `libs/server/rate-limit/` | 수정 | namespace별 Rate Limit Guard 추가, API Rate Limit 데코레이터 추가 |
| `.env.example` | 수정 | `CORS_ALLOWED_ORIGINS`, 스토리지 관련 환경변수 추가 |
| `libs/server/auth/` | 영향 없음 | JWT 인증과 API Key 인증은 독립적으로 동작 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 태스크명 | 설명 | 의존 | 복잡도 | 예상 시간 |
|-----|---------|------|------|--------|----------|
| **M0: 공통 인프라** |
| T-01 | 공통 모듈 라이브러리 생성 | `libs/server/common/` Nx 라이브러리 scaffolding | - | 낮음 | 0.5h |
| T-02 | 커스텀 에러 예외 클래스 정의 | NotAuthenticated, Unauthorized, InvalidInput, ResourceNotFound, DatabaseError, TooManyRequests 예외 클래스 | T-01 | 중간 | 1h |
| T-03 | 표준 에러 응답 ExceptionFilter | ApiExceptionFilter 구현 및 글로벌 등록 | T-02 | 중간 | 1.5h |
| T-04 | 표준 성공 응답 Interceptor | `{ data: ... }` 형태 래핑 인터셉터 (선택 적용) | T-01 | 낮음 | 0.5h |
| T-05 | CUID2 유틸리티 | `@paralleldrive/cuid2` 도입, 생성/검증 함수 | T-01 | 낮음 | 0.5h |
| T-06 | CUID2 Validation Pipe | NestJS Param Pipe로 CUID2 형식 검증 | T-05 | 낮음 | 0.5h |
| **M1: DB 스키마 확장** |
| T-07 | Project, Environment 모델 추가 | Prisma 스키마에 Project, Environment, EnvironmentType 추가 | - | 중간 | 1h |
| T-08 | ApiKey, ApiKeyEnvironmentPermission 모델 추가 | API Key 관련 모델 + enum 추가 | T-07 | 중간 | 1h |
| T-09 | Survey, Response, Display 스텁 모델 추가 | Client/Management API 대상 도메인 모델 기본 스키마 | T-07 | 중간 | 1h |
| T-10 | Contact, ActionClass 스텁 모델 추가 | Management API 대상 추가 모델 | T-07 | 낮음 | 0.5h |
| T-11 | Organization 관계 확장 | Organization에 apiKeys, projects 관계 추가 | T-07, T-08 | 낮음 | 0.5h |
| T-12 | Prisma 마이그레이션 생성 및 적용 | `prisma migrate dev` 실행 | T-07~T-11 | 낮음 | 0.5h |
| **M2: API Key 모듈** |
| T-13 | API Key 라이브러리 생성 | `libs/server/api-key/` Nx 라이브러리 scaffolding | T-01 | 낮음 | 0.5h |
| T-14 | API Key 인증 객체 인터페이스 정의 | `ApiKeyAuthObject` 타입 정의 | T-13 | 낮음 | 0.5h |
| T-15 | API Key 서비스 구현 | 생성(fbk_ 형식), 검증(bcrypt 비교), 삭제 로직 | T-13, T-08 | 높음 | 3h |
| T-16 | API Key Auth Guard 구현 | x-api-key 헤더 추출 및 검증, 인증 객체 주입 | T-14, T-15 | 중간 | 1.5h |
| T-17 | Permission Guard 구현 | 권한 레벨 계층 검증 (read < write < manage) | T-14, T-16 | 중간 | 1.5h |
| T-18 | Permission 데코레이터 구현 | `@RequirePermission('read'|'write'|'manage')` 메타데이터 데코레이터 | T-17 | 낮음 | 0.5h |
| T-19 | API Key Auth 데코레이터 | `@ApiKeyAuth()` 인증 객체 추출 파라미터 데코레이터 | T-14 | 낮음 | 0.5h |
| T-20 | API Key CRUD DTO | CreateApiKeyDto, 응답 DTO 정의 | T-13 | 낮음 | 0.5h |
| T-21 | API Key Admin 컨트롤러 | JWT 인증 기반 API Key 생성/목록/삭제 엔드포인트 | T-15, T-20 | 중간 | 2h |
| T-22 | API Key 모듈 등록 | ApiKeyModule 정의 및 AppModule에 등록 | T-13~T-21 | 낮음 | 0.5h |
| **M3: Rate Limiting 확장** |
| T-23 | Namespace 기반 Rate Limit Guard | ApiRateLimitGuard: environmentId/apiKeyId 기반 tracker | T-16 | 중간 | 1.5h |
| T-24 | Rate Limit 응답 헤더 인터셉터 | X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset 헤더 추가 | T-23 | 중간 | 1h |
| T-25 | API Rate Limit 데코레이터 | `@ApiRateLimit()` 분당 100건 적용 데코레이터 | T-23 | 낮음 | 0.5h |
| **M4: Client API v1** |
| T-26 | Client API 라이브러리 생성 | `libs/server/client-api/` Nx 라이브러리 scaffolding | T-01 | 낮음 | 0.5h |
| T-27 | Environment ID 검증 Guard | CUID2 형식 + DB 존재 여부 확인 | T-06, T-26 | 중간 | 1h |
| T-28 | Environment 상태 조회 서비스/컨트롤러 | GET /client/:envId/environment | T-27, T-09 | 중간 | 2h |
| T-29 | Display 이벤트 서비스/컨트롤러 | POST /client/:envId/displays | T-27, T-09 | 중간 | 1.5h |
| T-30 | Response 생성 DTO 및 검증 | CreateResponseDto (surveyId, data, userId, finished, variables, ttc, meta) | T-26 | 중간 | 1h |
| T-31 | Response 생성 서비스/컨트롤러 | POST /client/:envId/responses | T-27, T-30 | 높음 | 2h |
| T-32 | Response 업데이트 DTO 및 검증 | UpdateResponseDto (data, finished, language, variables, ttc, meta, hiddenFields, displayId, endingId) | T-26 | 중간 | 1h |
| T-33 | Response 업데이트 서비스/컨트롤러 | PUT /client/:envId/responses/:responseId | T-27, T-32 | 높음 | 2h |
| T-34 | 파일 업로드 서비스/컨트롤러 | POST /client/:envId/storage (multipart/form-data) | T-27 | 중간 | 2h |
| T-35 | 사용자 식별 서비스/컨트롤러 | POST /client/:envId/user | T-27 | 중간 | 1h |
| T-36 | Client API 모듈 등록 및 라우팅 | RouterModule로 `/api/v1/client/:environmentId/` 경로 매핑 | T-26~T-35 | 중간 | 1h |
| **M5: Management API v1** |
| T-37 | Management API 라이브러리 생성 | `libs/server/management-api/` Nx 라이브러리 scaffolding | T-01 | 낮음 | 0.5h |
| T-38 | Management Me 컨트롤러 | GET /management/me | T-37, T-16 | 낮음 | 1h |
| T-39 | Management Survey 컨트롤러/서비스 | 설문 CRUD (GET list, POST, GET/:id, PUT/:id, DELETE/:id) | T-37, T-17, T-09 | 높음 | 3h |
| T-40 | Management Response 컨트롤러/서비스 | 응답 CRUD (GET list, GET/:id, PUT/:id, DELETE/:id) | T-37, T-17, T-09 | 높음 | 2.5h |
| T-41 | Management Contact 컨트롤러/서비스 | 연락처 CRUD (GET list, POST, GET/:id, DELETE/:id) | T-37, T-17, T-10 | 중간 | 2h |
| T-42 | Management ActionClass 컨트롤러/서비스 | ActionClass CRUD | T-37, T-17, T-10 | 중간 | 1.5h |
| T-43 | Management Storage 컨트롤러 | 파일 업로드 (POST) | T-37, T-17 | 낮음 | 1h |
| T-44 | Management API 모듈 등록 및 라우팅 | RouterModule로 `/api/v1/management/` 경로 매핑 | T-37~T-43 | 중간 | 1h |
| **M6: CORS 및 글로벌 설정** |
| T-45 | CORS 설정 확장 | Client API 와일드카드, Management API 제한적 CORS | T-36, T-44 | 낮음 | 1h |
| T-46 | 글로벌 필터/인터셉터 등록 | main.ts에 ApiExceptionFilter, Rate Limit 헤더 등록 | T-03, T-24 | 낮음 | 0.5h |
| T-47 | 환경변수 추가 | `.env.example` 업데이트 (CORS_ALLOWED_ORIGINS, STORAGE_PATH 등) | - | 낮음 | 0.5h |
| **M7: v2 Beta API (높음 우선순위)** |
| T-48 | v2 Health Check 엔드포인트 | GET /api/v2/health | - | 낮음 | 0.5h |
| T-49 | v2 Client API 모듈 | v1 Client API를 v2 경로로 확장 (reCAPTCHA, organization 추가) | T-36 | 중간 | 2h |
| T-50 | v2 Management API 모듈 | v1 Management API에 bulk contacts, webhooks 스텁 추가 | T-44 | 중간 | 2h |
| T-51 | v2 Organization 엔드포인트 | teams, users, project-teams 스텁 | T-37 | 중간 | 2h |
| T-52 | v2 라우팅 통합 | `/api/v2/` 경로 라우팅 설정 | T-48~T-51 | 낮음 | 1h |

### 3.2 구현 순서 및 마일스톤

```
M0 (공통 인프라)  ─────┐
    T-01~T-06          │
    검증: 에러 응답 필터 │
    단위 테스트 통과     │
                        │
M1 (DB 스키마) ─────────┤
    T-07~T-12           │
    검증: 마이그레이션   │
    적용 및 빌드 성공    │
                        │
M2 (API Key) ──────────┤──── [마일스톤 1: API Key 인증 기반 완성]
    T-13~T-22           │     API Key 생성 -> 검증 -> 권한 확인 E2E 통과
    검증: API Key 생성   │
    및 bcrypt 검증 통과  │
                        │
M3 (Rate Limiting) ────┤
    T-23~T-25           │
    검증: namespace별    │
    Rate Limit 동작 확인 │
                        │
M4 (Client API v1) ────┤──── [마일스톤 2: Client API 동작 완성]
    T-26~T-36           │     환경 조회 -> 응답 생성 -> 응답 업데이트 E2E 통과
    검증: Client API     │     = Headless 모드(FN-024-08) 자동 충족
    전체 흐름 동작 확인   │
                        │
M5 (Management API) ───┤──── [마일스톤 3: Management API 동작 완성]
    T-37~T-44           │     API Key 인증 -> 설문 CRUD E2E 통과
    검증: Management API │
    CRUD 및 권한 검증    │
                        │
M6 (글로벌 설정) ───────┤──── [마일스톤 4: 통합 검증 완료]
    T-45~T-47           │     전체 API 라우팅 + CORS + 에러 처리 통합 테스트
                        │
M7 (v2 Beta) ──────────┘──── [마일스톤 5: v2 베타 스텁 완성]
    T-48~T-52                  v2 Health Check + 기본 라우팅 동작 확인
```

### 3.3 파일 수정 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|----------|----------|----------|
| `packages/db/prisma/schema.prisma` | 수정 | ApiKey, ApiKeyEnvironmentPermission, Project, Environment, Survey, Response, Display, Contact, ActionClass 모델 및 enum 추가. Organization 관계 확장 |
| `packages/db/prisma/migrations/` | 생성 | 신규 마이그레이션 파일 |
| `libs/server/common/src/index.ts` | 생성 | 공통 모듈 export |
| `libs/server/common/src/lib/common.module.ts` | 생성 | CommonModule 정의 |
| `libs/server/common/src/lib/filters/api-exception.filter.ts` | 생성 | 표준 에러 응답 ExceptionFilter |
| `libs/server/common/src/lib/interceptors/api-response.interceptor.ts` | 생성 | 표준 성공 응답 Interceptor |
| `libs/server/common/src/lib/exceptions/api-error.exception.ts` | 생성 | 기반 에러 예외 클래스 |
| `libs/server/common/src/lib/exceptions/not-authenticated.exception.ts` | 생성 | 401 에러 |
| `libs/server/common/src/lib/exceptions/unauthorized.exception.ts` | 생성 | 403 에러 |
| `libs/server/common/src/lib/exceptions/invalid-input.exception.ts` | 생성 | 400 에러 (유효성) |
| `libs/server/common/src/lib/exceptions/resource-not-found.exception.ts` | 생성 | 400 에러 (리소스) |
| `libs/server/common/src/lib/exceptions/database-error.exception.ts` | 생성 | 400 에러 (DB) |
| `libs/server/common/src/lib/utils/cuid2.util.ts` | 생성 | CUID2 생성/검증 유틸리티 |
| `libs/server/common/package.json` | 생성 | `@inquiry/server-common` 패키지 정의 |
| `libs/server/common/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/api-key/src/index.ts` | 생성 | API Key 모듈 export |
| `libs/server/api-key/src/lib/api-key.module.ts` | 생성 | ApiKeyModule 정의 |
| `libs/server/api-key/src/lib/api-key.service.ts` | 생성 | API Key 생성/검증/관리 서비스 |
| `libs/server/api-key/src/lib/api-key.controller.ts` | 생성 | API Key Admin CRUD 컨트롤러 |
| `libs/server/api-key/src/lib/guards/api-key-auth.guard.ts` | 생성 | x-api-key 인증 Guard |
| `libs/server/api-key/src/lib/guards/require-permission.guard.ts` | 생성 | 권한 레벨 검증 Guard |
| `libs/server/api-key/src/lib/decorators/api-key-auth.decorator.ts` | 생성 | 인증 객체 추출 데코레이터 |
| `libs/server/api-key/src/lib/decorators/require-permission.decorator.ts` | 생성 | 권한 메타데이터 데코레이터 |
| `libs/server/api-key/src/lib/dto/create-api-key.dto.ts` | 생성 | API Key 생성 DTO |
| `libs/server/api-key/src/lib/interfaces/api-key-auth.interface.ts` | 생성 | 인증 객체 타입 |
| `libs/server/api-key/package.json` | 생성 | `@inquiry/server-api-key` 패키지 정의 |
| `libs/server/api-key/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/client-api/src/index.ts` | 생성 | Client API 모듈 export |
| `libs/server/client-api/src/lib/client-api.module.ts` | 생성 | ClientApiModule 정의 |
| `libs/server/client-api/src/lib/controllers/environment.controller.ts` | 생성 | Environment 상태 조회 |
| `libs/server/client-api/src/lib/controllers/display.controller.ts` | 생성 | Display 이벤트 기록 |
| `libs/server/client-api/src/lib/controllers/response.controller.ts` | 생성 | Response 생성/업데이트 |
| `libs/server/client-api/src/lib/controllers/storage.controller.ts` | 생성 | 파일 업로드 |
| `libs/server/client-api/src/lib/controllers/user.controller.ts` | 생성 | 사용자 식별 |
| `libs/server/client-api/src/lib/services/client-environment.service.ts` | 생성 | Environment 조회 로직 |
| `libs/server/client-api/src/lib/services/client-display.service.ts` | 생성 | Display 기록 로직 |
| `libs/server/client-api/src/lib/services/client-response.service.ts` | 생성 | Response 생성/업데이트 로직 |
| `libs/server/client-api/src/lib/services/client-storage.service.ts` | 생성 | 파일 저장 로직 |
| `libs/server/client-api/src/lib/services/client-user.service.ts` | 생성 | 사용자 식별 로직 |
| `libs/server/client-api/src/lib/dto/create-response.dto.ts` | 생성 | 응답 생성 DTO |
| `libs/server/client-api/src/lib/dto/update-response.dto.ts` | 생성 | 응답 업데이트 DTO |
| `libs/server/client-api/src/lib/dto/create-display.dto.ts` | 생성 | Display 생성 DTO |
| `libs/server/client-api/src/lib/dto/identify-user.dto.ts` | 생성 | 사용자 식별 DTO |
| `libs/server/client-api/src/lib/guards/environment-id.guard.ts` | 생성 | environmentId 검증 Guard |
| `libs/server/client-api/src/lib/pipes/cuid2-validation.pipe.ts` | 생성 | CUID2 파라미터 파이프 |
| `libs/server/client-api/package.json` | 생성 | `@inquiry/server-client-api` 패키지 정의 |
| `libs/server/client-api/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/management-api/src/index.ts` | 생성 | Management API 모듈 export |
| `libs/server/management-api/src/lib/management-api.module.ts` | 생성 | ManagementApiModule 정의 |
| `libs/server/management-api/src/lib/controllers/management-me.controller.ts` | 생성 | Me 엔드포인트 |
| `libs/server/management-api/src/lib/controllers/management-survey.controller.ts` | 생성 | 설문 CRUD |
| `libs/server/management-api/src/lib/controllers/management-response.controller.ts` | 생성 | 응답 CRUD |
| `libs/server/management-api/src/lib/controllers/management-contact.controller.ts` | 생성 | 연락처 CRUD |
| `libs/server/management-api/src/lib/controllers/management-action-class.controller.ts` | 생성 | ActionClass CRUD |
| `libs/server/management-api/src/lib/controllers/management-storage.controller.ts` | 생성 | 파일 업로드 |
| `libs/server/management-api/src/lib/services/` | 생성 | 각 컨트롤러 대응 서비스 |
| `libs/server/management-api/package.json` | 생성 | `@inquiry/server-management-api` 패키지 정의 |
| `libs/server/management-api/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/rate-limit/src/lib/rate-limit.guard.ts` | 수정 | ApiRateLimitGuard 클래스 추가 (namespace 기반) |
| `libs/server/rate-limit/src/lib/rate-limit.decorators.ts` | 수정 | `ApiRateLimit()` 데코레이터 추가 |
| `libs/server/rate-limit/src/index.ts` | 수정 | 신규 Guard/데코레이터 export 추가 |
| `apps/server/src/app/app.module.ts` | 수정 | CommonModule, ApiKeyModule, ClientApiModule, ManagementApiModule import 추가 |
| `apps/server/src/main.ts` | 수정 | 글로벌 ExceptionFilter 등록, CORS origin 설정 확장 |
| `.env.example` | 수정 | CORS_ALLOWED_ORIGINS, STORAGE_PATH 환경변수 추가 |
| `package.json` | 수정 | `@paralleldrive/cuid2` 의존성 추가 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 발생 확률 | 완화 전략 |
|--------|------|----------|----------|
| **bcrypt 전체 스캔 성능** | API Key 검증이 API Key 수에 비례하여 느려짐 | 중간 | 초기에는 Organization 범위로 조회 범위 한정. 성능 이슈 발생 시 API Key 해시 접두사 인덱싱 또는 Redis 캐싱 도입 |
| **2단계(FS-006) 미완성 시 Environment 모델 부재** | Client API가 동작하지 않음 | 높음 | 본 계획에 Project/Environment 스텁 모델을 포함하여 최소한의 도메인 구조를 확보. FS-006 구현 시 확장 |
| **도메인 모델(Survey, Response) 4단계 의존** | Management API CRUD가 껍데기만 구현 | 높음 | 스텁 모델로 기본 CRUD를 구현하고, 4단계(FS-008)에서 비즈니스 로직을 보강하는 점진적 접근 |
| **v1/v2 라우팅 복잡도** | NestJS Router 설정 충돌, 경로 혼동 | 중간 | NestJS RouterModule로 명확한 prefix 분리. v2는 v1 모듈을 import하여 확장하되 별도 라우트 모듈로 격리 |
| **Rate Limiting 정확도** | namespace별 카운팅이 부정확할 수 있음 (인메모리 vs Redis) | 중간 | 초기에는 `@nestjs/throttler` 인메모리 스토리지 사용. 다중 인스턴스 배포 시 Redis 스토리지(`@nestjs/throttler-storage-redis`)로 전환 |
| **CORS 설정 보안** | Client API 와일드카드 설정 시 보안 취약점 | 낮음 | 환경변수로 허용 origin 목록을 관리하되, 기본값은 제한적으로 설정. 프로덕션 배포 전 검토 필수 |
| **파일 업로드 스토리지 미결정** | 로컬 vs S3 vs 다른 오브젝트 스토리지 | 중간 | 스토리지 인터페이스를 정의하고 로컬 파일시스템 구현을 기본으로 제공. S3 어댑터는 별도 구현으로 분리 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 대상 | 테스트 항목 | 도구 |
|------|-----------|------|
| `ApiKeyService.createApiKey()` | fbk_ 접두사 형식 생성, bcrypt 해시 저장, 환경 권한 할당 | Jest/Vitest |
| `ApiKeyService.validateApiKey()` | 유효한 키 검증 성공, 잘못된 키 401 반환, 빈 키 401 반환 | Jest/Vitest |
| `RequirePermissionGuard` | read < write < manage 계층 검증, 권한 부족 시 403 | Jest/Vitest |
| `ApiExceptionFilter` | 각 에러 타입별 올바른 HTTP 상태 코드 및 JSON 구조 반환 | Jest/Vitest |
| `ApiRateLimitGuard.getTracker()` | environmentId 기반, apiKeyId 기반, IP 폴백 tracker 추출 | Jest/Vitest |
| `CUID2 유틸리티` | 유효한 CUID2 생성 및 검증, 잘못된 형식 거부 | Jest/Vitest |
| `CreateResponseDto` | 필수 필드 누락 검증, CUID2 형식 검증, 선택 필드 기본값 | Jest/Vitest |
| `ClientResponseService` | 응답 생성 시 환경 스코핑, finished=true 완료 처리, 데이터 병합 | Jest/Vitest |

### 5.2 통합 테스트

| 시나리오 | 테스트 흐름 | 검증 포인트 |
|---------|-----------|-----------|
| **API Key 라이프사이클** | JWT 로그인 -> API Key 생성 -> 목록 조회 -> Management API 호출 -> 삭제 | 생성된 키로 인증 성공, 삭제 후 인증 실패 |
| **Client API 응답 흐름** | Environment 조회 -> Display 기록 -> Response 생성 -> Response 업데이트(finished=true) | 각 단계 올바른 HTTP 상태 코드, 데이터 정합성 |
| **Management API 권한** | read 키로 GET 성공/POST 실패 -> write 키로 POST 성공/DELETE 실패 -> manage 키로 DELETE 성공 | 권한 레벨별 올바른 접근 제어 |
| **Rate Limiting** | 동일 namespace로 101회 연속 요청 | 100회까지 성공, 101번째 429 반환, X-RateLimit-Remaining 헤더 검증 |
| **에러 처리 일관성** | 잘못된 environmentId, 존재하지 않는 리소스, 인증 실패 등 다양한 에러 | 모든 에러가 표준 JSON 형식으로 반환 |
| **환경 스코핑** | 환경 A의 리소스를 환경 B의 environmentId로 접근 시도 | ResourceNotFoundError 반환, 교차 접근 불가 |

### 5.3 E2E 테스트 (해당하는 경우)

| 시나리오 | 설명 |
|---------|------|
| **Headless 모드 전체 흐름** | 1) Environment 상태 조회 2) Display 기록 3) Response 생성 4) 부분 업데이트 반복 5) finished=true로 완료 -- Client API만으로 설문 응답 전체 사이클 검증 |
| **Management API CRUD 사이클** | API Key 생성 -> 설문 생성(POST) -> 조회(GET) -> 수정(PUT) -> 삭제(DELETE) -- 전체 CRUD 사이클 검증 |
| **v1/v2 병행 운영** | v1 Client API 호출 + v2 Health Check + v2 Management API 호출이 독립적으로 동작하는지 검증 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 번호 | 제약사항 | 영향 |
|------|---------|------|
| 1 | Survey, Response 등 도메인 모델이 스텁 수준이므로, 실제 설문 비즈니스 로직(질문 타입 검증, 조건부 로직 등)은 4단계(FS-008~012) 구현 후 보강 필요 | Management API CRUD는 기본적인 DB CRUD만 수행 |
| 2 | 파일 업로드는 로컬 파일시스템 기반 구현. 프로덕션 환경에서는 S3 등 오브젝트 스토리지로 전환 필요 | 다중 서버 환경에서 파일 접근 불가 |
| 3 | Rate Limiting이 인메모리 기반이므로 서버 재시작 시 카운트 초기화, 다중 인스턴스 환경에서 분산 카운팅 불가 | 프로덕션 배포 시 Redis 스토리지 전환 필수 |
| 4 | v2 Beta API의 팀, 웹훅, reCAPTCHA 등은 스텁(라우트만 정의) 수준 구현. 실제 비즈니스 로직은 해당 기능 명세서 구현 시 채워짐 | v2 전용 기능은 동작하지 않을 수 있음 |
| 5 | API Key 검증 시 전체 키 bcrypt 비교 방식은 API Key 수가 수백 개 이상일 때 성능 저하 우려 | 대규모 사용 시 키 ID 인코딩 등 최적화 필요 |
| 6 | 명세서에서 ResourceNotFoundError를 400으로 정의하고 있어 HTTP 표준(404)과 불일치 | API 소비자에게 혼란을 줄 수 있으나 명세서 준수를 우선 |

### 6.2 향후 개선 가능 사항

| 번호 | 개선 사항 | 시점 |
|------|----------|------|
| 1 | Redis 기반 Rate Limiting으로 전환 (`@nestjs/throttler-storage-redis`) | FS-099 NFR 인프라 도입 시 |
| 2 | API Key 해시 접두사 인덱싱 또는 Redis 캐싱으로 검증 최적화 | API Key 수 100개 이상 시 |
| 3 | S3 스토리지 어댑터 도입 (멀티파트 업로드, 사전 서명 URL) | 프로덕션 배포 전 |
| 4 | API 문서 자동 생성 (Swagger/OpenAPI) | 안정화 이후 |
| 5 | API Key 회전(rotation) 기능 | 보안 강화 필요 시 |
| 6 | API Key 만료일 설정 기능 | 거버넌스 요구 발생 시 |
| 7 | Webhook 연동 (응답 생성/수정/삭제 이벤트) | FS-023 구현 시 |
| 8 | API 사용량 분석 대시보드 | 운영 안정화 이후 |

---

## 7. i18n 고려사항 (클라이언트 UI 변경 시)

본 명세서(FS-024)는 백엔드 API 구현이 주 범위이므로 클라이언트 UI 변경은 제한적이다. 다만 API Key 관리 Admin UI 구현 시(암묵적 요구사항 5번) 아래 번역 키가 필요하다.

**API Key 관리 UI용 번역 키 (향후 Admin Dashboard 구현 시):**

| 키 | 설명 | ko | en |
|---|------|---|---|
| `apiKey.create.title` | API Key 생성 제목 | API Key 생성 | Create API Key |
| `apiKey.create.label` | 라벨 필드 | 라벨 | Label |
| `apiKey.create.labelPlaceholder` | 라벨 플레이스홀더 | API Key 이름을 입력하세요 | Enter API Key name |
| `apiKey.create.permission` | 권한 선택 | 권한 | Permission |
| `apiKey.create.permission.read` | 읽기 권한 | 읽기 | Read |
| `apiKey.create.permission.write` | 쓰기 권한 | 읽기+쓰기 | Read+Write |
| `apiKey.create.permission.manage` | 관리 권한 | 전체 관리 | Full Access |
| `apiKey.create.success` | 생성 성공 | API Key가 생성되었습니다. 이 키는 다시 표시되지 않습니다. | API Key created. This key will not be shown again. |
| `apiKey.list.title` | 목록 제목 | API Keys | API Keys |
| `apiKey.list.empty` | 빈 목록 | 등록된 API Key가 없습니다. | No API Keys registered. |
| `apiKey.list.lastUsed` | 마지막 사용 | 마지막 사용 | Last used |
| `apiKey.delete.confirm` | 삭제 확인 | 이 API Key를 삭제하시겠습니까? | Delete this API Key? |
| `apiKey.delete.success` | 삭제 성공 | API Key가 삭제되었습니다. | API Key deleted. |

**에러 메시지 번역 키 (서버 API 에러 응답용):**

| 키 | ko | en |
|---|---|---|
| `error.notAuthenticated` | 인증되지 않은 요청입니다. | Not authenticated. |
| `error.unauthorized` | 권한이 부족합니다. | Unauthorized. |
| `error.invalidInput` | 유효하지 않은 입력 데이터입니다. | Invalid input data. |
| `error.resourceNotFound` | 리소스를 찾을 수 없습니다. | Resource not found. |
| `error.databaseError` | 데이터 처리 중 오류가 발생했습니다. | Database error occurred. |
| `error.tooManyRequests` | 요청이 너무 많습니다. 잠시 후 다시 시도해주세요. | Too many requests. Please try again later. |
| `error.internalServer` | 서버 내부 오류가 발생했습니다. | Internal server error. |
