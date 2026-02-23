# FSD-003 조직(Organization) 관리 - 서버 사이드 구현

## Overview
Inquiry 설문조사 SaaS 플랫폼의 조직 관리 백엔드를 구현한다.
Organization CRUD API, 역할 기반 접근 제어(OrgRoleGuard), Billing JSON 관리,
Multi-Org 제어 로직을 포함하며, 기존 인증 서비스의 개인 조직 생성 로직에 Billing 기본값을 추가한다.

## Changed Files

### 신규 생성
- `libs/server/organization/package.json` - 조직 서버 라이브러리 패키지 메타데이터
- `libs/server/organization/tsconfig.json` - TypeScript 설정 (composite, references)
- `libs/server/organization/tsconfig.lib.json` - 라이브러리 빌드용 TypeScript 설정
- `libs/server/organization/src/index.ts` - 모듈 진입점 (public exports)
- `libs/server/organization/src/lib/organization.module.ts` - NestJS OrganizationModule 정의
- `libs/server/organization/src/lib/organization.controller.ts` - REST API 엔드포인트 (6개)
- `libs/server/organization/src/lib/organization.service.ts` - 비즈니스 로직 (CRUD + 월간 응답수)
- `libs/server/organization/src/lib/dto/create-organization.dto.ts` - 생성 DTO (Zod 스키마)
- `libs/server/organization/src/lib/dto/update-organization.dto.ts` - 수정 DTO (Zod 스키마, 부분 업데이트)
- `libs/server/organization/src/lib/dto/query-organization.dto.ts` - 조회 파라미터 DTO (페이지네이션)
- `libs/server/organization/src/lib/guards/org-role.guard.ts` - 조직 역할 기반 접근 제어 가드
- `libs/server/organization/src/lib/decorators/org-roles.decorator.ts` - @OrgRoles() 데코레이터
- `libs/server/organization/src/lib/constants/billing.constants.ts` - Plan별 기본값, 페이지네이션 상수
- `libs/server/organization/src/lib/types/organization.types.ts` - Billing/Whitelabel 타입 인터페이스

### 수정
- `packages/db/prisma/schema.prisma` - Organization 모델에 billing, whitelabel, isAIEnabled 필드 추가
- `apps/server/src/app/app.module.ts` - OrganizationModule import 추가
- `apps/server/package.json` - @inquiry/server-organization 의존성 추가
- `apps/server/tsconfig.app.json` - organization 라이브러리 TypeScript reference 추가
- `libs/server/auth/src/lib/server-auth.service.ts` - createPersonalOrganization()에 billing 기본값 추가

## Major Changes

### 1. Prisma 스키마 확장
Organization 모델에 3개 필드 추가:
```prisma
billing     Json     @default("{\"plan\":\"free\",\"period\":\"monthly\",\"periodStart\":null,\"limits\":{\"projects\":3,\"monthlyResponses\":1500,\"monthlyMIU\":2000},\"stripeCustomerId\":null}")
whitelabel  Json     @default("{}")
isAIEnabled Boolean  @default(false)
```

### 2. OrgRoleGuard 동작 흐름
1. 요청 파라미터 `:id`에서 organizationId 추출
2. JWT userId + Membership 테이블 조회로 멤버십 확인
3. `@OrgRoles()` 데코레이터 미지정 시 멤버십만 확인
4. 역할 계층(OWNER:40 > ADMIN:30 > BILLING:20 > MEMBER:10) 비교로 접근 제어

### 3. Billing Deep Merge
조직 수정 시 billing JSON은 기존 값과 병합한다. Plan 변경 시 limits가 명시적으로 제공되지 않으면 해당 Plan의 기본 limits를 자동 적용한다.

### 4. Multi-Org 제어
`MULTI_ORG_ENABLED` 환경변수(기본: true) 기반으로 조직 생성을 제한한다. 비활성화 시 이미 Owner인 조직이 있으면 추가 생성을 차단한다.

## How to use it

### API 엔드포인트
```
POST   /api/organizations                          - 조직 생성 (인증된 사용자)
GET    /api/organizations?page=1&pageSize=10        - 소속 조직 목록 (인증된 사용자)
GET    /api/organizations/:id                       - 단일 조회 (조직 멤버)
PATCH  /api/organizations/:id                       - 수정 (Owner/Admin)
DELETE /api/organizations/:id                       - 삭제 (Owner)
GET    /api/organizations/:id/monthly-response-count - 월간 응답수 (조직 멤버)
```

### 조직 생성 요청 예시
```bash
curl -X POST /api/organizations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Organization"}'
```

### 조직 수정 요청 예시 (부분 업데이트)
```bash
curl -X PATCH /api/organizations/<id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"billing": {"plan": "startup"}, "isAIEnabled": true}'
```

## Related Components/Modules
- `@inquiry/server-auth` - 회원가입 시 개인 조직 자동 생성 (createPersonalOrganization 수정)
- `@inquiry/server-audit-log` - 조직 생성/수정/삭제 감사 로그 기록
- `@inquiry/server-prisma` - Prisma ORM을 통한 DB 접근
- `@inquiry/server-core` - ZodValidationPipe, PaginatedResponse 타입
- `@inquiry/db` - MembershipRole enum 참조

## Precautions
- **Monthly Response Count**: Project/Survey/Response 모델이 아직 없어 스텁(0 반환)으로 구현. FSD-006, FSD-008 이후 실제 쿼리로 교체 필요.
- **getOrganizationByEnvironmentId**: Environment 모델 미존재로 미구현. FSD-006 구현 후 추가.
- **Cascade 삭제 범위**: 현재 Membership, Invite만 Cascade 대상. Project 등은 해당 모델 추가 시 설정.
- **Stripe 연동**: stripeCustomerId 필드만 스키마에 포함. 실제 결제 연동은 FSD-029에서 구현.
- **DB 마이그레이션**: PostgreSQL 미실행 상태이므로 prisma generate만 수행. 실제 배포 시 migrate 필요.
- **요청 수준 캐시**: 초기 구현에서는 직접 DB 조회. 성능 최적화 단계에서 Interceptor 기반 캐시 도입 예정.
