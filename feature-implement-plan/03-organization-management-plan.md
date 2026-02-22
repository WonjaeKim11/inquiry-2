# 기능 구현 계획: 조직(Organization) 관리

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 우선순위 | 설명 |
|---------|--------|---------|------|
| FN-003-01 | Organization 생성 | 필수 | 이름 입력으로 조직 생성, Billing/Whitelabel 기본값 초기화 |
| FN-003-02 | Organization 조회 | 필수 | ID 단일 조회, 사용자 소속 목록, Environment 경유 조회, 유일 Owner 조회 |
| FN-003-03 | Organization 수정 | 필수 | 이름, Billing, Whitelabel, isAIEnabled 수정 및 캐시 무효화 |
| FN-003-04 | Organization 삭제 | 필수 | Cascade 삭제 및 캐시 무효화 |
| FN-003-05 | Billing 모델 관리 | 필수 | Plan/Period/Limits 관리 (free, startup, custom) |
| FN-003-06 | Whitelabel 설정 | 선택 | 로고 URL, 파비콘 URL 설정 |
| FN-003-07 | Monthly Response Count 조회 | 필수 | Billing Period 기준 월간 응답 수 집계 |
| FN-003-08 | Multi-Org License 제어 | 조건부 필수 | Enterprise License Feature Flag 기반 Multi-Org 제어 |
| FN-003-09 | Survey Response 알림 구독 | 필수 | Survey 생성 시 자동 알림 구독 |

### 1.2 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 성능 | Organization 조회 API 응답 평균 2초 이내, 요청 수준 캐시 적용 |
| 보안 | 인증된 사용자만 접근, 역할 기반 권한(Owner/Manager/Member), 입력 검증 |
| 데이터 격리 | Organization 단위 멀티테넌시 |
| 가용성 | Custom 플랜 99.9% Uptime SLA |
| 캐시 전략 | 요청 수준 캐시(request-level deduplication), License 캐시(Memory 1분 TTL + Redis 24시간 TTL) |
| 감사 추적 | Billing 변경 등 주요 변경사항 감사 로그 기록 |

### 1.3 명세서 내 모호성 및 해석

| 항목 | 모호성 | 해석/결정 |
|------|--------|----------|
| 요청 수준 캐시 | 구체적인 캐시 구현 방식 미명시 | NestJS Interceptor 기반 request-scoped 캐시를 구현한다. 동일 요청 내 같은 파라미터로 호출 시 DB 쿼리를 1회만 수행한다. 이 기능은 Phase 2 이후 최적화 단계에서 도입하고, 초기에는 직접 DB 조회로 구현한다. |
| FN-003-09 Survey Response 알림 | Survey, Response 모델이 아직 없음 | 알림 구독은 Survey CRUD(FSD-006 이후) 구현 시 함께 구현한다. 본 계획에서는 Organization 모듈의 알림 구독 상태 관리 인터페이스만 정의한다. |
| FN-003-08 Enterprise License | License Server 연동 세부사항 미명시 | 환경변수 `MULTI_ORG_ENABLED` 플래그를 기본 제어로 사용하고, License Server 연동은 별도 모듈로 후속 구현한다. 현재 `ServerAuthService.signup()`에서 이미 이 패턴을 사용 중이다. |
| Billing 변경 감사 추적 | 어떤 수준의 감사가 필요한지 미명시 | 기존 `AuditLogService.log()` 패턴을 재사용하여 fire-and-forget 방식으로 기록한다. |
| Cascade 삭제 범위 | Project, Environment, Survey 등 하위 리소스 모델이 아직 없음 | Prisma 스키마에 `onDelete: Cascade`를 설정하고, 현재 존재하는 Membership, Invite만 Cascade 삭제 대상으로 한다. Project 등은 해당 스키마 추가 시 Cascade를 설정한다. |
| 페이지네이션 기본 크기 | "시스템 상수에 의해 결정"이라고만 명시 | 기본값 10으로 설정하고, 상수로 관리하여 추후 변경 가능하도록 한다. |
| 캐시 무효화 대상 | memberships, projects, environments 캐시 무효화 언급 | 요청 수준 캐시를 사용하므로, 같은 요청 내에서만 유효한 캐시이다. 수정/삭제 시 해당 요청 내 후속 조회에서 최신 데이터를 반환하도록 구현한다. 글로벌 캐시(Redis 등)는 현 단계에서 미적용. |

### 1.4 암시적 요구사항

| 항목 | 설명 |
|------|------|
| Prisma 스키마 확장 | Organization 모델에 `billing`, `whitelabel`, `isAIEnabled` 필드 추가 필요 |
| 서버 라이브러리 생성 | `libs/server/organization` NestJS 모듈 생성 필요 |
| 클라이언트 라이브러리 생성 | `libs/client/organization` 컴포넌트/훅 라이브러리 생성 필요 |
| 권한 검증 가드 | Organization별 역할 기반 접근 제어 가드 구현 필요 (JwtAuthGuard 확장) |
| 로그인 후 리다이렉트 개선 | 로그인 후 조직 선택/대시보드 리다이렉트 로직 필요 |
| DTO 유효성 검증 | Organization 관련 입력 DTO 클래스 생성 필요 (class-validator 활용) |
| 에러 클래스 정의 | `DatabaseError`, `ResourceNotFoundError` 커스텀 예외 클래스 필요 |
| DB 마이그레이션 | Prisma 스키마 변경 후 마이그레이션 실행 필요 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
[클라이언트 (Next.js 16)]
  ├── libs/client/organization/     -- Organization 관련 컴포넌트, 훅
  │   ├── hooks/useOrganization.ts  -- API 호출 훅
  │   ├── components/               -- 조직 관련 UI 컴포넌트
  │   └── types.ts                  -- 타입 정의
  ├── apps/client/src/app/[lng]/organizations/  -- 조직 관련 페이지 라우트
  │   ├── new/page.tsx              -- 조직 생성 페이지
  │   ├── [orgId]/settings/page.tsx -- 조직 설정 페이지
  │   └── page.tsx                  -- 조직 목록 페이지
  └── libs/client/core/             -- AuthContext 확장 (조직 컨텍스트)

[서버 (NestJS)]
  ├── libs/server/organization/     -- Organization 모듈
  │   ├── organization.module.ts
  │   ├── organization.controller.ts
  │   ├── organization.service.ts
  │   ├── dto/                      -- 입력 DTO
  │   └── guards/                   -- 역할 기반 가드
  └── libs/server/common/           -- 공용 에러 클래스, 상수 (선택)

[데이터베이스 (PostgreSQL + Prisma)]
  └── packages/db/prisma/schema.prisma  -- Organization 모델 확장
```

**데이터 흐름:**

```
[Client] -- apiFetch --> [NestJS Controller]
                            |
                            v
                    [JwtAuthGuard + OrgRoleGuard]
                            |
                            v
                    [Organization Service]
                            |
                            v
                    [ServerPrismaService (Prisma ORM)]
                            |
                            v
                    [PostgreSQL - Organization Table]
```

### 2.2 데이터 모델

**현재 Organization 스키마:**

```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  memberships Membership[]
  invites     Invite[]

  @@map("organizations")
}
```

**변경 후 Organization 스키마:**

```prisma
model Organization {
  id           String   @id @default(cuid())
  name         String
  billing      Json     @default("{\"plan\":\"free\",\"period\":\"monthly\",\"periodStart\":null,\"limits\":{\"projects\":3,\"monthlyResponses\":1500,\"monthlyMIU\":2000},\"stripeCustomerId\":null}")
  whitelabel   Json     @default("{}")
  isAIEnabled  Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  memberships Membership[]
  invites     Invite[]

  @@map("organizations")
}
```

**Billing JSON 타입 (TypeScript):**

```typescript
interface OrganizationBilling {
  plan: 'free' | 'startup' | 'custom';
  period: 'monthly' | 'yearly';
  periodStart: string; // ISO DateTime
  limits: {
    projects: number | null;     // null = 무제한
    monthlyResponses: number | null;
    monthlyMIU: number | null;
  };
  stripeCustomerId: string | null;
}
```

**Whitelabel JSON 타입 (TypeScript):**

```typescript
interface OrganizationWhitelabel {
  logoUrl?: string | null;
  faviconUrl?: string | null;
}
```

**Plan별 기본 Limits:**

| Plan | projects | monthlyResponses | monthlyMIU |
|------|----------|-----------------|------------|
| free | 3 | 1,500 | 2,000 |
| startup | 3 | 5,000 | 7,500 |
| custom | null | null | null |

### 2.3 API 설계

기존 패턴을 따라 NestJS Controller + Service 구조를 사용한다.
모든 API는 `/api/organizations` 접두사를 사용한다.

| 메서드 | 경로 | 설명 | 인증 | 권한 |
|--------|------|------|------|------|
| POST | `/api/organizations` | Organization 생성 | JWT 필수 | 인증된 사용자 |
| GET | `/api/organizations` | 사용자 소속 조직 목록 조회 | JWT 필수 | 인증된 사용자 |
| GET | `/api/organizations/:id` | Organization 단일 조회 | JWT 필수 | 해당 조직 멤버 |
| PATCH | `/api/organizations/:id` | Organization 수정 | JWT 필수 | Owner 또는 Manager |
| DELETE | `/api/organizations/:id` | Organization 삭제 | JWT 필수 | Owner만 |
| GET | `/api/organizations/:id/monthly-response-count` | 월간 응답 수 조회 | JWT 필수 | 해당 조직 멤버 |

**요청/응답 형식:**

```
POST /api/organizations
Request:  { "name": "My Organization", "id"?: "cuid2_format_id" }
Response: { "id", "name", "billing", "whitelabel", "isAIEnabled", "createdAt", "updatedAt" }

GET /api/organizations?page=1
Response: { "data": Organization[], "meta": { "page", "pageSize", "total" } }

GET /api/organizations/:id
Response: Organization 객체

PATCH /api/organizations/:id
Request:  { "name"?, "billing"?, "whitelabel"?, "isAIEnabled"? }
Response: Organization 객체

DELETE /api/organizations/:id
Response: { "id": "삭제된 Organization ID" }

GET /api/organizations/:id/monthly-response-count
Response: { "count": number }
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 서버 측 (`libs/server/organization/`)

**파일 구조:**

```
libs/server/organization/
├── package.json
├── tsconfig.json
├── tsconfig.lib.json
├── src/
│   ├── index.ts
│   └── lib/
│       ├── organization.module.ts       -- NestJS 모듈
│       ├── organization.controller.ts   -- REST 엔드포인트
│       ├── organization.service.ts      -- 비즈니스 로직
│       ├── dto/
│       │   ├── create-organization.dto.ts
│       │   ├── update-organization.dto.ts
│       │   └── query-organization.dto.ts
│       ├── guards/
│       │   └── org-role.guard.ts        -- 조직 내 역할 기반 가드
│       ├── decorators/
│       │   └── org-roles.decorator.ts   -- 역할 메타데이터 데코레이터
│       └── constants/
│           └── billing.constants.ts     -- Billing Plan 기본값 상수
```

**OrganizationService 주요 메서드:**

```typescript
class OrganizationService {
  // FN-003-01: 생성
  createOrganization(userId: string, dto: CreateOrganizationDto): Promise<Organization>

  // FN-003-02: 조회 (4가지 방식)
  getOrganization(organizationId: string): Promise<Organization | null>
  getOrganizationsByUserId(userId: string, page?: number): Promise<PaginatedResult<Organization>>
  getOrganizationByEnvironmentId(environmentId: string): Promise<Organization | null>
  getOrganizationsWhereUserIsOwner(userId: string): Promise<Organization[]>

  // FN-003-03: 수정
  updateOrganization(organizationId: string, dto: UpdateOrganizationDto): Promise<Organization>

  // FN-003-04: 삭제
  deleteOrganization(organizationId: string): Promise<{ id: string }>

  // FN-003-07: 월간 응답 수 조회
  getMonthlyResponseCount(organizationId: string): Promise<number>
}
```

**OrgRoleGuard 설계:**

```typescript
// 요청에서 :id 파라미터로 organizationId를 추출
// JWT 토큰의 userId와 Membership 테이블을 조회하여 역할 확인
// @OrgRoles('OWNER', 'ADMIN') 데코레이터로 필요 역할 지정
```

#### 2.4.2 클라이언트 측 (`libs/client/organization/`)

**파일 구조:**

```
libs/client/organization/
├── package.json
├── tsconfig.json
├── tsconfig.lib.json
├── src/
│   ├── index.ts
│   └── lib/
│       ├── organization-context.tsx     -- 현재 조직 상태 관리
│       ├── create-organization-form.tsx -- 조직 생성 폼
│       ├── organization-settings.tsx    -- 조직 설정 (일반)
│       ├── billing-settings.tsx         -- Billing 설정
│       ├── whitelabel-settings.tsx      -- Whitelabel 설정
│       ├── delete-organization-dialog.tsx -- 삭제 확인 모달
│       └── organization-switcher.tsx    -- 조직 전환 UI
```

### 2.5 기존 시스템 영향도 분석

| 기존 파일/모듈 | 변경 내용 | 영향도 |
|---------------|----------|--------|
| `packages/db/prisma/schema.prisma` | Organization 모델에 billing, whitelabel, isAIEnabled 필드 추가 | 높음 - DB 마이그레이션 필요 |
| `apps/server/src/app/app.module.ts` | OrganizationModule import 추가 | 낮음 |
| `libs/server/auth/src/lib/server-auth.service.ts` | `createPersonalOrganization()` 메서드에서 billing 기본값 설정 추가 | 중간 |
| `apps/client/src/app/[lng]/page.tsx` | 로그인 후 조직 선택/대시보드 리다이렉트 로직 변경 | 중간 |
| `apps/client/src/app/[lng]/layout.tsx` | OrganizationProvider 추가 | 중간 |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 조직 관련 번역 키 추가 | 낮음 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 조직 관련 번역 키 추가 | 낮음 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|----------|
| T-01 | Prisma 스키마 확장 | Organization 모델에 billing(Json), whitelabel(Json), isAIEnabled(Boolean) 필드 추가 | 없음 | 낮음 | 0.5h |
| T-02 | DB 마이그레이션 실행 | `prisma migrate dev`로 스키마 변경 적용 | T-01 | 낮음 | 0.25h |
| T-03 | Billing 상수 정의 | Plan별 기본 Limits, 타입 정의 | 없음 | 낮음 | 0.5h |
| T-04 | 커스텀 에러 클래스 생성 | DatabaseError, ResourceNotFoundError 예외 필터 | 없음 | 낮음 | 0.5h |
| T-05 | Organization 서버 라이브러리 scaffolding | `libs/server/organization` 패키지 구조 생성 (package.json, tsconfig, index.ts) | 없음 | 낮음 | 0.5h |
| T-06 | Organization DTO 정의 | CreateOrganizationDto, UpdateOrganizationDto, QueryOrganizationDto 작성 | T-03 | 낮음 | 1h |
| T-07 | OrganizationService 구현 - 생성 | createOrganization 메서드 구현 (Billing 기본값, Membership OWNER 자동 생성) | T-02, T-03, T-06 | 중간 | 1.5h |
| T-08 | OrganizationService 구현 - 조회 | getOrganization, getOrganizationsByUserId, getOrganizationsWhereUserIsOwner 메서드 구현 | T-02 | 중간 | 2h |
| T-09 | OrganizationService 구현 - 수정 | updateOrganization 메서드 구현 (부분 업데이트, Billing 스키마 검증) | T-02, T-06 | 중간 | 1.5h |
| T-10 | OrganizationService 구현 - 삭제 | deleteOrganization 메서드 구현 (Cascade 삭제, 감사 로그) | T-02 | 중간 | 1h |
| T-11 | OrgRoleGuard 구현 | 조직 내 역할 기반 접근 제어 가드 (Membership 조회로 역할 확인) | T-02 | 높음 | 2h |
| T-12 | OrganizationController 구현 | REST 엔드포인트 구현 (CRUD + 월간 응답 수) | T-07~T-11 | 중간 | 2h |
| T-13 | OrganizationModule 등록 | NestJS 모듈 정의 및 AppModule에 등록 | T-12 | 낮음 | 0.5h |
| T-14 | Monthly Response Count 구현 | getMonthlyResponseCount 서비스 메서드 (현재는 Project/Survey 모델 없으므로 스텁 + 인터페이스 정의) | T-02 | 중간 | 1h |
| T-15 | Auth Service 수정 | createPersonalOrganization()에 billing 기본값 추가 | T-02, T-03 | 낮음 | 0.5h |
| T-16 | 서버 빌드 검증 | 서버 빌드 성공 확인 | T-13, T-15 | 낮음 | 0.25h |
| T-17 | Organization 클라이언트 라이브러리 scaffolding | `libs/client/organization` 패키지 구조 생성 | 없음 | 낮음 | 0.5h |
| T-18 | Organization Context 구현 | 현재 선택된 조직 상태 관리 (React Context + apiFetch) | T-17, T-13 | 중간 | 2h |
| T-19 | i18n 번역 키 추가 | 조직 관련 ko/en 번역 키 추가 | 없음 | 낮음 | 0.5h |
| T-20 | Organization 생성 폼 구현 | 조직 이름 입력 + 생성 API 호출 UI | T-17, T-18, T-19 | 중간 | 2h |
| T-21 | Organization 목록/전환 UI 구현 | 소속 조직 목록 표시, 조직 전환 드롭다운 | T-18, T-19 | 중간 | 2h |
| T-22 | Organization 설정 페이지 - 일반 | 조직 이름 수정 폼 | T-18, T-19 | 중간 | 1.5h |
| T-23 | Organization 설정 페이지 - Billing | 현재 Plan/Period/Limits 표시, 변경 UI | T-18, T-19 | 높음 | 3h |
| T-24 | Organization 설정 페이지 - Whitelabel | 로고/파비콘 URL 입력 및 미리보기 | T-18, T-19 | 중간 | 1.5h |
| T-25 | Organization 삭제 확인 모달 | 삭제 확인 다이얼로그 (Cascade 삭제 경고) | T-18, T-19 | 중간 | 1h |
| T-26 | 클라이언트 라우트 설정 | organizations 관련 Next.js 페이지 라우트 생성 | T-20~T-25 | 낮음 | 1h |
| T-27 | 로그인 후 리다이렉트 수정 | 대시보드 페이지에서 조직 컨텍스트 연동 | T-18 | 낮음 | 0.5h |
| T-28 | 클라이언트 빌드 검증 | 클라이언트 빌드 성공 확인 | T-26, T-27 | 낮음 | 0.25h |
| T-29 | Multi-Org 제어 로직 구현 | MULTI_ORG_ENABLED 환경변수 기반 조직 생성/탈퇴 제한 로직 | T-07 | 중간 | 1h |
| T-30 | UI에 shadcn/ui Dialog 컴포넌트 추가 | 삭제 확인 모달에 필요한 Dialog 컴포넌트 추가 | 없음 | 낮음 | 0.5h |

**총 예상 시간: 약 33시간 (4~5일)**

### 3.2 구현 순서 및 마일스톤

#### 마일스톤 1: 데이터 레이어 및 기반 구축 (약 3시간)

**목표:** DB 스키마 확장 완료, 기반 구조 준비

1. T-01: Prisma 스키마 확장
2. T-02: DB 마이그레이션 실행
3. T-03: Billing 상수 정의
4. T-04: 커스텀 에러 클래스 생성
5. T-05: Organization 서버 라이브러리 scaffolding

**검증:** `pnpm db:generate` 성공, 새 필드가 Prisma Client 타입에 반영됨

#### 마일스톤 2: 서버 API 핵심 구현 (약 10시간)

**목표:** Organization CRUD API 동작 확인

6. T-06: Organization DTO 정의
7. T-07: OrganizationService - 생성
8. T-08: OrganizationService - 조회
9. T-09: OrganizationService - 수정
10. T-10: OrganizationService - 삭제
11. T-11: OrgRoleGuard 구현
12. T-12: OrganizationController 구현
13. T-13: OrganizationModule 등록
14. T-14: Monthly Response Count 구현 (스텁)
15. T-15: Auth Service 수정
16. T-29: Multi-Org 제어 로직 구현

**검증:** T-16 서버 빌드 성공, cURL/Postman으로 CRUD API 동작 확인

#### 마일스톤 3: 클라이언트 UI 구현 (약 15시간)

**목표:** 조직 관리 UI 전체 동작 확인

17. T-17: 클라이언트 라이브러리 scaffolding
18. T-30: shadcn/ui Dialog 컴포넌트 추가
19. T-19: i18n 번역 키 추가
20. T-18: Organization Context 구현
21. T-20: Organization 생성 폼
22. T-21: Organization 목록/전환 UI
23. T-22: 설정 페이지 - 일반
24. T-23: 설정 페이지 - Billing
25. T-24: 설정 페이지 - Whitelabel
26. T-25: 삭제 확인 모달
27. T-26: 클라이언트 라우트 설정
28. T-27: 로그인 후 리다이렉트 수정

**검증:** T-28 클라이언트 빌드 성공, E2E 시나리오(조직 생성 -> 설정 변경 -> 삭제) 수동 확인

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 내용 요약 |
|-----------|----------|---------------|
| `packages/db/prisma/schema.prisma` | 수정 | Organization 모델에 billing, whitelabel, isAIEnabled 필드 추가 |
| `libs/server/organization/package.json` | 생성 | 패키지 메타데이터 (@inquiry/server-organization) |
| `libs/server/organization/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/organization/tsconfig.lib.json` | 생성 | 라이브러리 빌드용 TypeScript 설정 |
| `libs/server/organization/src/index.ts` | 생성 | 모듈 진입점 (export) |
| `libs/server/organization/src/lib/organization.module.ts` | 생성 | NestJS 모듈 정의 |
| `libs/server/organization/src/lib/organization.controller.ts` | 생성 | REST API 엔드포인트 (CRUD + 월간 응답수) |
| `libs/server/organization/src/lib/organization.service.ts` | 생성 | 비즈니스 로직 (생성, 조회, 수정, 삭제, 월간 응답수) |
| `libs/server/organization/src/lib/dto/create-organization.dto.ts` | 생성 | 조직 생성 입력 DTO |
| `libs/server/organization/src/lib/dto/update-organization.dto.ts` | 생성 | 조직 수정 입력 DTO |
| `libs/server/organization/src/lib/dto/query-organization.dto.ts` | 생성 | 조회 파라미터 DTO (페이지네이션) |
| `libs/server/organization/src/lib/guards/org-role.guard.ts` | 생성 | 조직 역할 기반 접근 제어 가드 |
| `libs/server/organization/src/lib/decorators/org-roles.decorator.ts` | 생성 | @OrgRoles() 메타데이터 데코레이터 |
| `libs/server/organization/src/lib/constants/billing.constants.ts` | 생성 | Plan별 기본 Limits, 페이지네이션 상수 |
| `libs/server/organization/src/lib/types/organization.types.ts` | 생성 | Billing, Whitelabel 타입 인터페이스 |
| `apps/server/src/app/app.module.ts` | 수정 | OrganizationModule import 추가 |
| `libs/server/auth/src/lib/server-auth.service.ts` | 수정 | createPersonalOrganization()에 billing 기본값 추가 |
| `libs/client/organization/package.json` | 생성 | 패키지 메타데이터 (@inquiry/client-organization) |
| `libs/client/organization/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/client/organization/tsconfig.lib.json` | 생성 | 라이브러리 빌드용 TypeScript 설정 |
| `libs/client/organization/src/index.ts` | 생성 | 모듈 진입점 (export) |
| `libs/client/organization/src/lib/organization-context.tsx` | 생성 | OrganizationProvider, useOrganization 훅 |
| `libs/client/organization/src/lib/create-organization-form.tsx` | 생성 | 조직 생성 폼 컴포넌트 |
| `libs/client/organization/src/lib/organization-settings.tsx` | 생성 | 조직 일반 설정 (이름 수정) 컴포넌트 |
| `libs/client/organization/src/lib/billing-settings.tsx` | 생성 | Billing 설정 컴포넌트 |
| `libs/client/organization/src/lib/whitelabel-settings.tsx` | 생성 | Whitelabel 설정 컴포넌트 |
| `libs/client/organization/src/lib/delete-organization-dialog.tsx` | 생성 | 조직 삭제 확인 모달 |
| `libs/client/organization/src/lib/organization-switcher.tsx` | 생성 | 조직 전환 드롭다운 |
| `apps/client/src/app/[lng]/organizations/page.tsx` | 생성 | 조직 목록 페이지 |
| `apps/client/src/app/[lng]/organizations/new/page.tsx` | 생성 | 조직 생성 페이지 |
| `apps/client/src/app/[lng]/organizations/[orgId]/settings/page.tsx` | 생성 | 조직 설정 페이지 |
| `apps/client/src/app/[lng]/organizations/[orgId]/page.tsx` | 생성 | 조직 대시보드 (플레이스홀더) |
| `apps/client/src/app/[lng]/organizations/layout.tsx` | 생성 | 조직 레이아웃 (OrganizationProvider 포함) |
| `apps/client/src/app/[lng]/page.tsx` | 수정 | 로그인 후 조직 선택 리다이렉트 로직 추가 |
| `apps/client/src/app/[lng]/layout.tsx` | 수정 | OrganizationProvider import (또는 organizations 레이아웃에서 처리) |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | 조직 관련 한국어 번역 키 추가 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | 조직 관련 영어 번역 키 추가 |
| `libs/client/ui/src/components/ui/dialog.tsx` | 생성 | shadcn/ui Dialog 컴포넌트 (삭제 확인용) |
| `libs/client/ui/src/components/ui/select.tsx` | 생성 | shadcn/ui Select 컴포넌트 (Plan 선택용) |
| `libs/client/ui/src/components/ui/badge.tsx` | 생성 | shadcn/ui Badge 컴포넌트 (Plan 표시용) |
| `libs/client/ui/src/components/ui/progress.tsx` | 생성 | shadcn/ui Progress 컴포넌트 (사용량 표시용) |
| `libs/client/ui/src/index.ts` | 수정 | 새 UI 컴포넌트 export 추가 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 발생 확률 | 완화 전략 |
|--------|------|----------|----------|
| DB 마이그레이션 시 기존 Organization 레코드 누락 | 높음 | 중간 | 마이그레이션 SQL에 기존 레코드에 대한 DEFAULT 값을 명시적으로 지정한다. `billing` 필드에 `@default()` Prisma 어노테이션을 사용하고, 마이그레이션 후 기존 레코드를 업데이트하는 데이터 마이그레이션 스크립트를 준비한다. |
| Auth Service의 createPersonalOrganization() 변경 시 기존 회원가입 플로우 오류 | 높음 | 낮음 | 변경 범위를 billing 기본값 추가에만 한정한다. 기존 회원가입 E2E 테스트를 수행하여 회귀 확인한다. |
| OrgRoleGuard가 다른 가드와 충돌 | 중간 | 낮음 | JwtAuthGuard를 먼저 실행한 후 OrgRoleGuard를 실행하는 순서를 보장한다. `@UseGuards(JwtAuthGuard, OrgRoleGuard)` 순서로 적용한다. |
| 월간 응답 수 집계 쿼리 성능 | 중간 | 중간 | 현재는 Project/Survey/Response 모델이 없어 스텁으로 구현한다. 모델 추가 시 `createdAt` 인덱스를 활용하고, 대량 데이터에서는 집계 캐시를 고려한다. |
| JSON 필드(billing, whitelabel) 타입 안전성 | 중간 | 중간 | TypeScript 인터페이스와 class-validator를 통한 런타임 검증을 이중으로 적용한다. Service 레이어에서 Zod 또는 수동 검증으로 JSON 구조를 보장한다. |
| Multi-Org 플래그 전환 시 기존 데이터 정합성 | 중간 | 낮음 | Multi-Org 비활성화 시에도 기존에 생성된 다중 Organization을 삭제하지 않고, 새 생성만 차단한다. |
| 클라이언트-서버 간 타입 불일치 | 중간 | 중간 | Organization 관련 TypeScript 타입을 공유 패키지나 양쪽에서 동일하게 정의한다. 장기적으로는 OpenAPI/Swagger 기반 타입 생성을 고려한다. |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 테스트 대상 | 테스트 항목 | 비고 |
|------------|-----------|------|
| OrganizationService.createOrganization | 정상 생성 시 billing 기본값 확인, name trim 처리, cuid2 id 검증, Multi-Org 비활성 시 생성 차단 | PrismaService mock |
| OrganizationService.updateOrganization | 부분 업데이트 동작, Billing 스키마 검증 실패 케이스, 존재하지 않는 Organization 에러 | PrismaService mock |
| OrganizationService.deleteOrganization | Cascade 삭제 확인, 감사 로그 기록 확인 | PrismaService mock |
| CreateOrganizationDto | name 빈 문자열 거부, id cuid2 형식 검증, name trim 동작 | class-validator |
| UpdateOrganizationDto | 부분 필드만 제공 시 통과, billing 스키마 위반 시 거부 | class-validator |
| OrgRoleGuard | OWNER만 허용되는 엔드포인트에 MEMBER가 접근 시 403, Membership 없는 사용자 403 | Membership mock |
| Billing Constants | Plan별 기본 Limits 값 정확성 | 순수 함수 테스트 |

### 5.2 통합 테스트

| 테스트 대상 | 테스트 시나리오 | 비고 |
|------------|---------------|------|
| POST /api/organizations | 인증된 사용자가 조직 생성 -> 201 + Organization 객체 반환, billing 기본값 포함 | TestDB + JWT |
| GET /api/organizations | 사용자 소속 조직 목록 반환, 페이지네이션 동작 확인 | TestDB + JWT |
| GET /api/organizations/:id | 멤버인 조직 조회 성공, 비멤버 조직 조회 403 | TestDB + JWT |
| PATCH /api/organizations/:id | Owner가 이름 수정 성공, Member가 수정 시도 403, 존재하지 않는 조직 404 | TestDB + JWT |
| DELETE /api/organizations/:id | Owner가 삭제 성공 + Membership 연쇄 삭제 확인, Manager가 삭제 시도 403 | TestDB + JWT |
| 회원가입 + 조직 자동 생성 | 회원가입 시 billing 기본값이 포함된 개인 조직이 자동 생성되는지 확인 | TestDB |

### 5.3 E2E 테스트 (수동)

| 시나리오 | 검증 항목 |
|---------|----------|
| 회원가입 -> 로그인 -> 조직 확인 | 회원가입 시 자동 생성된 조직이 목록에 표시되는지 |
| 조직 생성 -> 설정 변경 -> 삭제 | 생성 폼 입력 -> 대시보드 리다이렉트, 이름 변경 저장, Billing Plan 표시, 삭제 모달 확인 -> 삭제 후 목록에서 제거 |
| Multi-Org 비활성 상태 테스트 | 환경변수 변경 후 새 조직 생성 버튼 비활성화 확인 |
| 권한 분리 테스트 | Owner/Manager/Member 각 역할에서 접근 가능한 설정 항목 확인 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 설명 |
|------|------|
| Monthly Response Count | Project, Survey, Response 모델이 아직 없어 스텁으로 구현. FSD-006(프로젝트), FSD-008(설문) 구현 후 실제 집계 쿼리로 교체 필요 |
| Survey Response 알림 구독 (FN-003-09) | Survey 모델이 없어 본 단계에서는 미구현. FSD-006 이후 별도 태스크로 구현 |
| Enterprise License 연동 (FN-003-08) | 환경변수 플래그로 대체 구현. 실제 License Server 연동은 FSD-029에서 처리 |
| Stripe 연동 | stripeCustomerId 필드만 스키마에 포함. 실제 Stripe API 연동은 FSD-029에서 구현 |
| 요청 수준 캐시 | 초기 구현에서는 직접 DB 조회. NestJS Interceptor 기반 캐시는 성능 최적화 단계에서 도입 |
| getOrganizationByEnvironmentId | Environment 모델이 없어 스텁으로 구현. FSD-006 구현 후 실제 관계 조회로 교체 |
| Cascade 삭제 범위 | 현재 Membership, Invite만 Cascade 대상. Project, Team, ApiKey는 해당 모델 추가 시 `onDelete: Cascade` 설정 |
| Billing 변경 제한 | Plan 업그레이드/다운그레이드 비즈니스 로직(프로레이팅 등)은 FSD-029에서 구현 |

### 6.2 잠재적 향후 개선사항

| 항목 | 설명 |
|------|------|
| OpenAPI/Swagger 문서 자동 생성 | NestJS Swagger 모듈 도입으로 API 문서 자동화 |
| 공유 타입 패키지 | 클라이언트-서버 간 Organization 타입을 `packages/shared-types`로 추출 |
| 요청 수준 캐시 Interceptor | `@Cacheable()` 데코레이터 기반 요청 내 중복 쿼리 방지 |
| Redis 기반 Organization 캐시 | 자주 조회되는 Organization 데이터의 Redis 캐시 레이어 추가 |
| 소프트 삭제 | Hard Delete 대신 `deletedAt` 필드 기반 소프트 삭제로 데이터 복구 지원 |
| Billing 사용량 알림 | monthlyResponses/MIU 80%, 100% 도달 시 이메일 알림 |
| Organization Activity Log | 조직 내 활동 로그 대시보드 (AuditLog 필터링) |

---

## 7. i18n 고려사항

### 추가/변경이 필요한 번역 키

**구조: `organization.` 네임스페이스**

```json
{
  "organization": {
    "create": {
      "title": "새 조직 만들기 / Create New Organization",
      "name_label": "조직 이름 / Organization Name",
      "name_placeholder": "조직 이름을 입력하세요 / Enter organization name",
      "name_required": "조직 이름은 필수입니다. / Organization name is required.",
      "submit": "조직 만들기 / Create Organization",
      "creating": "생성 중... / Creating...",
      "success": "조직이 생성되었습니다. / Organization created successfully.",
      "fail": "조직 생성에 실패했습니다. / Failed to create organization."
    },
    "list": {
      "title": "내 조직 / My Organizations",
      "empty": "소속된 조직이 없습니다. / You are not a member of any organization.",
      "create_new": "새 조직 만들기 / Create New Organization"
    },
    "switcher": {
      "label": "조직 전환 / Switch Organization",
      "current": "현재 조직 / Current Organization"
    },
    "settings": {
      "title": "조직 설정 / Organization Settings",
      "general": "일반 / General",
      "name_label": "조직 이름 / Organization Name",
      "save": "저장 / Save",
      "saving": "저장 중... / Saving...",
      "save_success": "설정이 저장되었습니다. / Settings saved successfully.",
      "save_fail": "설정 저장에 실패했습니다. / Failed to save settings."
    },
    "billing": {
      "title": "요금제 / Billing",
      "current_plan": "현재 요금제 / Current Plan",
      "plan_free": "Free",
      "plan_startup": "Startup",
      "plan_custom": "Custom",
      "period_monthly": "월간 / Monthly",
      "period_yearly": "연간 / Yearly",
      "limits": "사용량 제한 / Usage Limits",
      "projects_limit": "프로젝트 / Projects",
      "responses_limit": "월간 응답 / Monthly Responses",
      "miu_limit": "월간 식별 사용자 / Monthly Identified Users",
      "unlimited": "무제한 / Unlimited",
      "usage": "사용량 / Usage",
      "of": "/ / of"
    },
    "whitelabel": {
      "title": "브랜드 설정 / Branding",
      "logo_url": "로고 URL / Logo URL",
      "logo_url_placeholder": "https://example.com/logo.png",
      "favicon_url": "파비콘 URL / Favicon URL",
      "favicon_url_placeholder": "https://example.com/favicon.ico",
      "preview": "미리보기 / Preview"
    },
    "delete": {
      "title": "조직 삭제 / Delete Organization",
      "warning": "이 작업은 되돌릴 수 없습니다. / This action cannot be undone.",
      "cascade_warning": "조직에 속한 모든 프로젝트, 멤버, 초대가 함께 삭제됩니다. / All projects, members, and invitations in this organization will be permanently deleted.",
      "confirm_label": "삭제를 확인하려면 조직 이름을 입력하세요 / Type the organization name to confirm",
      "confirm_button": "조직 삭제 / Delete Organization",
      "deleting": "삭제 중... / Deleting...",
      "success": "조직이 삭제되었습니다. / Organization deleted successfully.",
      "fail": "조직 삭제에 실패했습니다. / Failed to delete organization."
    },
    "multi_org": {
      "disabled_create": "Enterprise 플랜에서만 추가 조직을 생성할 수 있습니다. / Additional organizations can only be created with Enterprise plan.",
      "disabled_leave": "Enterprise 플랜에서만 조직을 탈퇴할 수 있습니다. / You can only leave organizations with Enterprise plan."
    },
    "errors": {
      "not_found": "조직을 찾을 수 없습니다. / Organization not found.",
      "forbidden": "이 작업을 수행할 권한이 없습니다. / You do not have permission to perform this action.",
      "name_too_short": "조직 이름은 최소 1자 이상이어야 합니다. / Organization name must be at least 1 character."
    }
  }
}
```

**참고:** 위 표에서 `/` 기호 좌측은 한국어, 우측은 영어 번역이다. 실제 구현 시 `locales/ko/translation.json`과 `locales/en/translation.json`에 각각 분리하여 저장한다.
