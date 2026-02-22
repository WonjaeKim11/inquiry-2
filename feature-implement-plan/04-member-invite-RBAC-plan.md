# 기능 구현 계획: 멤버 초대 / RBAC

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 우선순위 | 설명 |
|---------|--------|---------|------|
| FN-003-01 | 초대 생성 (단일 초대) | High | Owner, Manager, Team Admin이 이메일 기반 단일 멤버 초대. 역할/Team 할당 지정 |
| FN-003-02 | 초대 만료 정책 | High | 7일(604,800,000ms) 만료, 재발송/토큰 재생성 시 갱신 |
| FN-003-03 | 초대 재발송 | High | 만료 시간 갱신 + 이메일 재발송 (Owner/Manager만) |
| FN-003-04 | 초대 삭제 | High | 미수락 초대 취소/삭제 (Owner/Manager만) |
| FN-003-05 | 초대 수락 | High | JWT 토큰 검증 -> Membership + TeamUser 자동 생성 -> Invite 삭제 |
| FN-004-01 | 3계층 RBAC 구조 | High | Organization Role(4종), Team Role(2종), Project Permission(3종) |
| FN-004-02 | 권한 검증 미들웨어 | High | 접근 규칙 배열 OR 평가, 가중치 기반 비교 |
| FN-004-03 | 역할 변경 시 Team 자동 승격 | Medium | owner/manager 승격 시 모든 TeamUser를 admin으로 변경 |
| FN-004-04 | 멤버 삭제 | High | Membership + TeamUser 트랜잭션 삭제, 마지막 Owner 보호 |
| FN-004-05 | 조직 탈퇴 | Medium | 자발적 탈퇴, Owner 불가, Multi-Org 활성 + 2개 이상 조직 필요 |
| FN-004-06 | Role Management License 검증 | High | Enterprise License + Access Control feature 필요 여부 판단 |

### 1.2 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 성능 | 초대 생성 응답 2초 이내 (이메일 발송 제외), 권한 검증 2초 이내 |
| 보안 | 모든 Server Action 인증 필수, 접근 규칙 기반 RBAC, Zod/class-validator 입력 검증 |
| 초대 토큰 | JWT 형식, 서명+만료 검증, 7일 TTL |
| 가용성 | License Grace Period 3일, 멤버 삭제 트랜잭션 무결성 |
| Rate Limiting | 엔드포인트별 제한 설정 |
| 감사 추적 | 모든 주요 작업에 Audit Log 기록 (fire-and-forget) |

### 1.3 명세서 내 모호성 및 해석

| 항목 | 모호성 | 해석/결정 |
|------|--------|----------|
| Zod vs class-validator | 명세서는 Zod를 명시하나 현재 서버는 class-validator 사용 | **서버 DTO는 class-validator를 유지**하고, 클라이언트 폼 검증에서 Zod 스키마를 사용한다. 기존 코드베이스 패턴을 따른다. |
| MembershipRole enum | 명세서는 owner/manager/member/billing 4종을 명시하나 현재 Prisma 스키마는 OWNER/ADMIN/MEMBER 3종 | **ADMIN을 MANAGER로 이름 변경하고 BILLING을 추가**한다. 기존 ADMIN -> MANAGER 마이그레이션 포함. 명세서의 billing 역할은 Cloud 전용이므로 환경변수 체크 로직 추가. |
| Server Action vs REST API | 명세서는 "Server Action 기반"을 명시 | 현재 아키텍처는 NestJS REST API + Next.js 클라이언트의 분리형이므로 **NestJS Controller 기반 REST API로 구현**한다. "Server Action"은 명세서 용어이며, 실제 구현은 기존 패턴(Controller+Service)을 따른다. |
| Team/Project/TeamUser 모델 | 아직 DB에 없음 | **본 계획에서 Team, TeamUser 스키마를 추가**한다. Project, ProjectTeam은 FSD-006(프로젝트/환경)에서 구현하고, 본 계획에서는 스키마 정의만 포함한다. |
| License 시스템 | 아직 미구현 | **환경변수 기반 stub으로 구현**한다. `ROLE_MANAGEMENT_ENABLED` 환경변수로 Enterprise 기능 활성화를 제어한다. 실제 License Server 연동은 FS-029에서 구현. |
| Invite ID 형식 | 명세서는 UUID를 명시하나 현재 Invite 모델은 cuid 사용 | **UUID로 변경**한다. `@id @default(uuid())` 적용. |
| Invite 토큰 방식 | 현재는 랜덤 문자열 토큰, 명세서는 JWT | **JWT 기반으로 변경**한다. 초대 생성 시 JWT를 생성하여 이메일 링크에 포함. 별도 `token` 컬럼은 제거하고 JWT의 `inviteId` 클레임으로 Invite를 식별한다. |
| Notification Settings 업데이트 | 초대 수락 시 필요하나 모델 미존재 | **현재 단계에서 스킵**. Survey/Notification 모델이 추가될 때 구현한다. |
| 수락 알림 이메일 | 초대 생성자에게 발송 | EmailService에 `sendInviteAcceptedNotification` 메서드를 추가한다. |
| Multi-Org 기능 활성화 | 조직 탈퇴 선행 조건 | 기존 `MULTI_ORG_ENABLED` 환경변수를 재사용한다. |

### 1.4 암시적 요구사항

| 항목 | 설명 |
|------|------|
| Prisma 스키마 변경 | MembershipRole 확장(MANAGER, BILLING 추가), Team/TeamUser 모델 추가, Invite 모델 변경 (UUID, JWT 기반), ProjectTeam 스키마 정의 |
| 서버 라이브러리 생성 | `libs/server/member` (멤버 관리 모듈), `libs/server/invite` (초대 모듈), `libs/server/rbac` (RBAC Guard/미들웨어) |
| 클라이언트 라이브러리 확장 | 초대 관리 UI, 멤버 목록/관리 UI, 역할 변경 UI |
| 환경변수 추가 | `INVITE_DISABLED`, `ROLE_MANAGEMENT_ENABLED`, `IS_SELF_HOSTED`, `JWT_INVITE_SECRET` |
| 이메일 템플릿 추가 | 초대 이메일, 초대 수락 알림 이메일 |
| 에러 클래스 정의 | `OperationNotAllowedError`, `LicenseError`, `InvalidInputError` 커스텀 예외 |
| 기존 회원가입 플로우 수정 | `processInviteToken()`을 JWT 기반으로 변경, TeamUser 생성 로직 추가 |
| Rate Limit 데코레이터 추가 | 초대 생성, 초대 수락 등 엔드포인트별 Rate Limit |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
[클라이언트 (Next.js 16)]
  ├── libs/client/member/              -- 멤버/초대 관리 컴포넌트, 훅
  │   ├── invite-member-form.tsx       -- 초대 생성 폼 (email, name, role, teams)
  │   ├── invite-list.tsx              -- 초대 목록 (재발송, 삭제)
  │   ├── member-list.tsx              -- 멤버 목록 (역할 변경, 삭제)
  │   ├── role-badge.tsx               -- 역할 표시 배지
  │   └── leave-organization-dialog.tsx -- 조직 탈퇴 확인 모달
  ├── apps/client/src/app/[lng]/organizations/[orgId]/
  │   ├── members/page.tsx             -- 멤버 관리 페이지
  │   └── settings/page.tsx            -- 조직 설정 (탈퇴 포함)

[서버 (NestJS)]
  ├── libs/server/invite/              -- 초대 모듈
  │   ├── invite.module.ts
  │   ├── invite.controller.ts         -- POST create, POST resend, DELETE, POST accept
  │   ├── invite.service.ts            -- 초대 비즈니스 로직
  │   └── dto/                         -- 입력 DTO
  ├── libs/server/member/              -- 멤버 관리 모듈
  │   ├── member.module.ts
  │   ├── member.controller.ts         -- GET list, PATCH role, DELETE, POST leave
  │   ├── member.service.ts            -- 멤버 비즈니스 로직
  │   └── dto/                         -- 입력 DTO
  ├── libs/server/rbac/                -- RBAC 가드/미들웨어
  │   ├── rbac.module.ts
  │   ├── guards/
  │   │   ├── rbac.guard.ts            -- 접근 규칙 기반 권한 검증
  │   │   └── org-membership.guard.ts  -- Organization 멤버 확인
  │   ├── decorators/
  │   │   └── access-rules.decorator.ts
  │   ├── types/
  │   │   └── access-rule.types.ts     -- AccessRule 타입 정의
  │   └── services/
  │       └── license.service.ts       -- License 검증 (stub)

[데이터베이스 (PostgreSQL + Prisma)]
  └── packages/db/prisma/schema.prisma -- MembershipRole 확장, Team/TeamUser 추가, Invite 변경
```

**데이터 흐름:**

```
[초대 생성]
Client --> POST /api/invites
  --> JwtAuthGuard --> RbacGuard (Owner/Manager/TeamAdmin 확인)
  --> InviteService.createInvite()
    --> 권한 검증 --> License 검증 --> 중복 검증
    --> Invite 레코드 생성 (DB)
    --> JWT 토큰 생성 --> 이메일 발송 (fire-and-forget)
    --> AuditLog 기록 (fire-and-forget)

[초대 수락]
Client --> POST /api/invites/accept
  --> InviteService.acceptInvite()
    --> JWT 검증 --> Invite 조회
    --> 트랜잭션: Membership 생성 + TeamUser 생성 + Invite 삭제
    --> 수락 알림 이메일 발송 (fire-and-forget)

[멤버 삭제]
Client --> DELETE /api/organizations/:orgId/members/:userId
  --> JwtAuthGuard --> RbacGuard (Owner/Manager)
  --> MemberService.deleteMember()
    --> 제약 조건 검증 (자기 삭제, 마지막 Owner, Manager→Owner 삭제 방지)
    --> 트랜잭션: TeamUser 삭제 + Membership 삭제
    --> AuditLog 기록 (fire-and-forget)
```

### 2.2 데이터 모델

**현재 MembershipRole:**

```prisma
enum MembershipRole {
  OWNER
  ADMIN    // 명세서의 "manager"에 해당
  MEMBER
}
```

**변경 후 스키마:**

```prisma
/// 조직 내 멤버 역할 (명세서 4종)
enum MembershipRole {
  OWNER
  MANAGER    // 기존 ADMIN에서 이름 변경
  MEMBER
  BILLING    // 신규 추가 (Cloud 전용)
}

/// 팀 내 사용자 역할
enum TeamUserRole {
  CONTRIBUTOR  // 가중치 1
  ADMIN        // 가중치 2
}

/// 프로젝트-팀 권한 (Project 모델은 FS-006에서 추가)
enum ProjectTeamPermission {
  READ        // 가중치 1
  READ_WRITE  // 가중치 2
  MANAGE      // 가중치 3
}

/// 조직 멤버십 (변경: accepted 필드 추가)
model Membership {
  userId         String
  organizationId String
  accepted       Boolean        @default(false)
  role           MembershipRole @default(MEMBER)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@id([userId, organizationId])
  @@index([organizationId])
  @@map("memberships")
}

/// 팀
model Team {
  id             String   @id @default(cuid())
  name           String
  organizationId String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  teamUsers    TeamUser[]

  @@unique([organizationId, name])
  @@map("teams")
}

/// 팀 사용자
model TeamUser {
  teamId  String
  userId  String
  role    TeamUserRole @default(CONTRIBUTOR)
  createdAt DateTime   @default(now())

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([teamId, userId])
  @@index([userId])
  @@map("team_users")
}

/// 조직 초대 (변경: UUID, JWT 기반, teamIds 추가)
model Invite {
  id             String         @id @default(uuid())
  email          String
  name           String?
  organizationId String
  creatorId      String
  acceptorId     String?
  role           MembershipRole @default(MEMBER)
  teamIds        String[]       @default([])
  expiresAt      DateTime
  createdAt      DateTime       @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  creator      User         @relation("InviteCreator", fields: [creatorId], references: [id], onDelete: Cascade)
  acceptor     User?        @relation("InviteAcceptor", fields: [acceptorId], references: [id])

  @@index([email, organizationId])
  @@index([organizationId])
  @@map("invites")
}
```

**주요 변경 사항 정리:**

1. `MembershipRole`: `ADMIN` -> `MANAGER` 이름 변경, `BILLING` 추가
2. `Membership`: `id` 단일 PK -> `(userId, organizationId)` 복합 PK로 변경, `accepted` 필드 추가
3. `Invite`: `id`를 UUID로 변경, `token` 컬럼 제거 (JWT로 대체), `name`, `creatorId`, `acceptorId`, `teamIds` 추가
4. `Team`, `TeamUser`: 신규 모델 추가
5. `TeamUserRole`, `ProjectTeamPermission`: 신규 enum 추가
6. `User` 모델: `invitesCreated`, `invitesAccepted`, `teamUsers` relation 추가
7. `Organization` 모델: `teams` relation 추가

### 2.3 API 설계

모든 API는 NestJS Controller 기반 REST API로 구현한다.

**초대 관련 API (`/api/invites`):**

| 메서드 | 경로 | 설명 | 인증 | 권한 |
|--------|------|------|------|------|
| POST | `/api/invites` | 초대 생성 | JWT 필수 | Owner, Manager, Team Admin |
| GET | `/api/invites?organizationId=xxx` | 초대 목록 조회 | JWT 필수 | Owner, Manager |
| POST | `/api/invites/:inviteId/resend` | 초대 재발송 | JWT 필수 | Owner, Manager |
| DELETE | `/api/invites/:inviteId?organizationId=xxx` | 초대 삭제 | JWT 필수 | Owner, Manager |
| POST | `/api/invites/accept` | 초대 수락 (토큰 기반) | 인증 불필요 (토큰 자체가 인증) | 초대 대상자 |

**멤버 관련 API (`/api/organizations/:orgId/members`):**

| 메서드 | 경로 | 설명 | 인증 | 권한 |
|--------|------|------|------|------|
| GET | `/api/organizations/:orgId/members` | 멤버 목록 조회 | JWT 필수 | 해당 조직 멤버 |
| PATCH | `/api/organizations/:orgId/members/:userId/role` | 멤버 역할 변경 | JWT 필수 | Owner (모든 역할), Manager (member만) |
| DELETE | `/api/organizations/:orgId/members/:userId` | 멤버 삭제 | JWT 필수 | Owner, Manager |
| POST | `/api/organizations/:orgId/leave` | 조직 탈퇴 | JWT 필수 | Manager, Member, Billing (Owner 제외) |

**요청/응답 형식:**

```
POST /api/invites
Request:  { "organizationId": "xxx", "email": "user@example.com", "name": "홍길동", "role": "MEMBER", "teamIds": [] }
Response: { "id": "uuid", "email", "name", "role", "teamIds", "expiresAt", "createdAt" }

POST /api/invites/accept
Request:  { "token": "jwt-token" }
Response: { "organizationId", "organizationName", "role" }

PATCH /api/organizations/:orgId/members/:userId/role
Request:  { "role": "MANAGER" }
Response: { "userId", "organizationId", "role", "accepted" }

DELETE /api/organizations/:orgId/members/:userId
Response: { "success": true }

POST /api/organizations/:orgId/leave
Response: { "success": true }
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 RBAC Guard (`libs/server/rbac/`)

```typescript
// access-rule.types.ts
type AccessRule =
  | { type: 'organization'; organizationId: string; allowedRoles: MembershipRole[] }
  | { type: 'team'; teamId: string; minPermission: TeamUserRole }
  | { type: 'projectTeam'; projectId: string; minPermission: ProjectTeamPermission };

// rbac.guard.ts -- OR 조건으로 접근 규칙 배열을 평가
// 가중치 상수:
//   TeamUserRole: CONTRIBUTOR=1, ADMIN=2
//   ProjectTeamPermission: READ=1, READ_WRITE=2, MANAGE=3
```

**RbacGuard 동작 방식:**
1. `@AccessRules()` 데코레이터로 접근 규칙 배열을 메타데이터에 설정
2. Guard에서 메타데이터를 읽어 각 규칙을 순회
3. Organization 규칙: Membership 조회 -> `role`이 `allowedRoles`에 포함되는지 확인
4. Team 규칙: TeamUser 조회 -> `role` 가중치가 `minPermission` 가중치 이상인지 확인
5. 하나라도 통과하면 접근 허용 (OR 조건)

#### 2.4.2 InviteService (`libs/server/invite/`)

```typescript
class InviteService {
  // FN-003-01: 초대 생성
  createInvite(userId: string, dto: CreateInviteDto): Promise<Invite>

  // FN-003-03: 초대 재발송
  resendInvite(userId: string, inviteId: string, organizationId: string): Promise<void>

  // FN-003-04: 초대 삭제
  deleteInvite(userId: string, inviteId: string, organizationId: string): Promise<void>

  // FN-003-05: 초대 수락
  acceptInvite(token: string, userId?: string): Promise<AcceptInviteResult>

  // 초대 목록 조회
  getInvitesByOrganization(organizationId: string): Promise<Invite[]>

  // 초대 JWT 생성 (7일 TTL)
  private generateInviteToken(inviteId: string, email: string, organizationId: string): string
}
```

#### 2.4.3 MemberService (`libs/server/member/`)

```typescript
class MemberService {
  // 멤버 목록 조회
  getMembers(organizationId: string): Promise<MemberWithUser[]>

  // FN-004-03/04: 역할 변경 (+ Team 자동 승격)
  updateMemberRole(
    currentUserId: string, organizationId: string, targetUserId: string, newRole: MembershipRole
  ): Promise<Membership>

  // FN-004-04: 멤버 삭제
  deleteMember(currentUserId: string, organizationId: string, targetUserId: string): Promise<void>

  // FN-004-05: 조직 탈퇴
  leaveOrganization(userId: string, organizationId: string): Promise<void>
}
```

#### 2.4.4 LicenseService (`libs/server/rbac/`)

```typescript
class LicenseService {
  // Role Management License 검증 (stub)
  // 환경변수 ROLE_MANAGEMENT_ENABLED로 제어
  isRoleManagementEnabled(): boolean

  // 향후 License Server 연동 시 확장 예정
  validateAccessControlFeature(organizationId: string): Promise<boolean>
}
```

### 2.5 기존 시스템 영향도 분석

| 기존 파일/모듈 | 변경 내용 | 영향도 |
|---------------|----------|--------|
| `packages/db/prisma/schema.prisma` | MembershipRole 확장, Membership PK 변경, Invite 모델 변경, Team/TeamUser 추가 | **높음** - DB 마이그레이션 필요, 기존 데이터 마이그레이션 |
| `libs/server/auth/src/lib/server-auth.service.ts` | `processInviteToken()` JWT 기반 변경, TeamUser 생성 로직 추가, `createPersonalOrganization()`에 `accepted: true` 추가 | **높음** - 회원가입 플로우 직접 영향 |
| `libs/server/auth/src/lib/dto/signup.dto.ts` | `inviteToken` 필드 유지 (JWT 문자열로 변경) | **낮음** |
| `apps/server/src/app/app.module.ts` | InviteModule, MemberModule, RbacModule import 추가 | **낮음** |
| `libs/server/email/src/lib/email.service.ts` | `sendInviteEmail()`, `sendInviteAcceptedNotification()` 메서드 추가 | **중간** |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 초대/멤버/RBAC 관련 번역 키 추가 | **낮음** |
| `apps/client/src/app/i18n/locales/en/translation.json` | 초대/멤버/RBAC 관련 번역 키 추가 | **낮음** |
| `.env.example` | `INVITE_DISABLED`, `ROLE_MANAGEMENT_ENABLED`, `IS_SELF_HOSTED`, `JWT_INVITE_SECRET` 추가 | **낮음** |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|----------|
| T-01 | Prisma 스키마 변경 - enum | MembershipRole(MANAGER/BILLING 추가), TeamUserRole, ProjectTeamPermission enum 추가 | 없음 | 중간 | 0.5h |
| T-02 | Prisma 스키마 변경 - Membership | 복합 PK 변경, accepted 필드 추가, 기존 id 컬럼 제거 | T-01 | 높음 | 1h |
| T-03 | Prisma 스키마 변경 - Invite | UUID ID, token 제거, name/creatorId/acceptorId/teamIds 추가 | T-01 | 중간 | 0.5h |
| T-04 | Prisma 스키마 변경 - Team/TeamUser | Team, TeamUser 모델 추가, User/Organization relation 확장 | T-01 | 중간 | 0.5h |
| T-05 | DB 마이그레이션 실행 | 스키마 변경 적용, ADMIN->MANAGER 데이터 마이그레이션, 기존 Membership accepted=true 설정 | T-01~T-04 | 높음 | 1h |
| T-06 | 환경변수 추가 | `.env.example`에 INVITE_DISABLED, ROLE_MANAGEMENT_ENABLED, IS_SELF_HOSTED, JWT_INVITE_SECRET 추가 | 없음 | 낮음 | 0.25h |
| T-07 | 커스텀 에러 클래스 정의 | OperationNotAllowedError, LicenseError, InvalidInputError 예외 클래스 | 없음 | 낮음 | 0.5h |
| T-08 | RBAC 서버 라이브러리 생성 | `libs/server/rbac` scaffolding (package.json, tsconfig, index.ts) | 없음 | 낮음 | 0.5h |
| T-09 | AccessRule 타입 정의 | AccessRule union 타입, 가중치 상수, 타입 유틸리티 | T-08 | 낮음 | 0.5h |
| T-10 | RbacGuard 구현 | 접근 규칙 배열 OR 평가 가드, @AccessRules() 데코레이터 | T-05, T-08, T-09 | 높음 | 2h |
| T-11 | LicenseService 구현 (stub) | 환경변수 기반 Role Management License 검증 | T-08 | 낮음 | 0.5h |
| T-12 | RbacModule 등록 | NestJS 모듈 정의, @Global()로 등록 | T-10, T-11 | 낮음 | 0.25h |
| T-13 | Invite 서버 라이브러리 생성 | `libs/server/invite` scaffolding | 없음 | 낮음 | 0.5h |
| T-14 | Invite DTO 정의 | CreateInviteDto, AcceptInviteDto 작성 (class-validator) | T-13 | 낮음 | 0.5h |
| T-15 | InviteService 구현 - 초대 생성 | 권한/License/중복 검증 -> Invite 생성 -> JWT 토큰 -> 이메일 | T-05, T-10, T-11, T-14 | 높음 | 3h |
| T-16 | InviteService 구현 - 재발송/삭제 | 만료 갱신 + 이메일 재발송, Invite 삭제 | T-15 | 중간 | 1h |
| T-17 | InviteService 구현 - 초대 수락 | JWT 검증 -> Membership + TeamUser 생성 -> Invite 삭제 (트랜잭션) | T-15 | 높음 | 2h |
| T-18 | InviteController 구현 | REST 엔드포인트 (create, list, resend, delete, accept) | T-15~T-17 | 중간 | 1.5h |
| T-19 | InviteModule 등록 | NestJS 모듈 정의, AppModule에 등록 | T-18 | 낮음 | 0.25h |
| T-20 | EmailService 확장 | sendInviteEmail(), sendInviteAcceptedNotification() 추가 | 없음 | 중간 | 1h |
| T-21 | Rate Limit 데코레이터 추가 | InviteCreateRateLimit, InviteAcceptRateLimit | 없음 | 낮음 | 0.25h |
| T-22 | Member 서버 라이브러리 생성 | `libs/server/member` scaffolding | 없음 | 낮음 | 0.5h |
| T-23 | Member DTO 정의 | UpdateMemberRoleDto 작성 | T-22 | 낮음 | 0.25h |
| T-24 | MemberService 구현 - 목록/역할 변경 | 멤버 목록, 역할 변경 (+ Team 자동 승격), License 검증 | T-05, T-10, T-11, T-23 | 높음 | 2.5h |
| T-25 | MemberService 구현 - 삭제/탈퇴 | 멤버 삭제 (트랜잭션), 조직 탈퇴 (Multi-Org/Owner 검증) | T-24 | 중간 | 2h |
| T-26 | MemberController 구현 | REST 엔드포인트 (list, updateRole, delete, leave) | T-24, T-25 | 중간 | 1.5h |
| T-27 | MemberModule 등록 | NestJS 모듈 정의, AppModule에 등록 | T-26 | 낮음 | 0.25h |
| T-28 | Auth Service 수정 | processInviteToken() JWT 기반 변경, TeamUser 생성, accepted 플래그 | T-05, T-17 | 높음 | 1.5h |
| T-29 | 서버 빌드 검증 | 서버 빌드 성공 확인 | T-19, T-27, T-28 | 낮음 | 0.25h |
| T-30 | Member 클라이언트 라이브러리 생성 | `libs/client/member` scaffolding | 없음 | 낮음 | 0.5h |
| T-31 | i18n 번역 키 추가 | 초대/멤버/RBAC 관련 ko/en 번역 키 | 없음 | 낮음 | 0.5h |
| T-32 | 초대 생성 폼 구현 | email, name, role, teams 선택 UI (역할 권한에 따라 제한) | T-30, T-31 | 중간 | 2h |
| T-33 | 초대 목록 UI 구현 | 초대 목록 테이블, 재발송/삭제 버튼 | T-30, T-31 | 중간 | 1.5h |
| T-34 | 멤버 목록 UI 구현 | 멤버 목록 테이블, 역할 배지, 역할 변경 드롭다운, 삭제 버튼 | T-30, T-31 | 중간 | 2h |
| T-35 | 조직 탈퇴 UI 구현 | 탈퇴 확인 모달, 조직 설정 페이지에 배치 | T-30, T-31 | 낮음 | 1h |
| T-36 | 멤버 관리 페이지 라우트 | `[lng]/organizations/[orgId]/members/page.tsx` | T-32~T-35 | 낮음 | 0.5h |
| T-37 | 초대 수락 페이지 | `[lng]/invite/accept/page.tsx` (토큰 파라미터 처리) | T-31 | 중간 | 1h |
| T-38 | 클라이언트 빌드 검증 | 클라이언트 빌드 성공 확인 | T-36, T-37 | 낮음 | 0.25h |

**총 예상 시간: 약 35시간 (5~6일)**

### 3.2 구현 순서 및 마일스톤

#### 마일스톤 1: 데이터 레이어 및 인프라 구축 (약 5시간)

**목표:** DB 스키마 변경 완료, 에러 클래스/환경변수/RBAC 기반 구조 준비

1. T-01: Prisma 스키마 변경 - enum
2. T-02: Prisma 스키마 변경 - Membership
3. T-03: Prisma 스키마 변경 - Invite
4. T-04: Prisma 스키마 변경 - Team/TeamUser
5. T-05: DB 마이그레이션 실행
6. T-06: 환경변수 추가
7. T-07: 커스텀 에러 클래스 정의

**검증:** `pnpm prisma generate` 성공, 새 모델/enum이 Prisma Client 타입에 반영됨, 기존 데이터 무결성 유지

#### 마일스톤 2: RBAC 가드 및 License (약 4시간)

**목표:** 권한 검증 미들웨어 동작 확인

8. T-08: RBAC 서버 라이브러리 생성
9. T-09: AccessRule 타입 정의
10. T-10: RbacGuard 구현
11. T-11: LicenseService 구현 (stub)
12. T-12: RbacModule 등록

**검증:** RbacGuard 단위 테스트 통과, 접근 규칙 OR 평가 동작 확인

#### 마일스톤 3: 초대 API 구현 (약 10시간)

**목표:** 초대 생성/재발송/삭제/수락 API 동작 확인

13. T-13: Invite 서버 라이브러리 생성
14. T-14: Invite DTO 정의
15. T-15: InviteService - 초대 생성
16. T-16: InviteService - 재발송/삭제
17. T-17: InviteService - 초대 수락
18. T-18: InviteController 구현
19. T-19: InviteModule 등록
20. T-20: EmailService 확장
21. T-21: Rate Limit 데코레이터 추가
22. T-28: Auth Service 수정

**검증:** T-29 서버 빌드 성공, cURL로 초대 생성 -> 이메일 -> 수락 플로우 확인

#### 마일스톤 4: 멤버 관리 API 구현 (약 7시간)

**목표:** 멤버 목록/역할 변경/삭제/탈퇴 API 동작 확인

23. T-22: Member 서버 라이브러리 생성
24. T-23: Member DTO 정의
25. T-24: MemberService - 목록/역할 변경
26. T-25: MemberService - 삭제/탈퇴
27. T-26: MemberController 구현
28. T-27: MemberModule 등록

**검증:** T-29 서버 빌드 성공, 역할 변경 시 Team 자동 승격 확인, 마지막 Owner 삭제 방지 확인

#### 마일스톤 5: 클라이언트 UI 구현 (약 9시간)

**목표:** 멤버/초대 관리 UI 전체 동작 확인

29. T-30: 클라이언트 라이브러리 생성
30. T-31: i18n 번역 키 추가
31. T-32: 초대 생성 폼
32. T-33: 초대 목록 UI
33. T-34: 멤버 목록 UI
34. T-35: 조직 탈퇴 UI
35. T-36: 멤버 관리 페이지 라우트
36. T-37: 초대 수락 페이지

**검증:** T-38 클라이언트 빌드 성공, E2E 시나리오 수동 확인

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 내용 요약 |
|-----------|----------|---------------|
| `packages/db/prisma/schema.prisma` | 수정 | MembershipRole 확장, Membership PK 변경, Invite 재설계, Team/TeamUser 추가, enum 추가 |
| `.env.example` | 수정 | INVITE_DISABLED, ROLE_MANAGEMENT_ENABLED, IS_SELF_HOSTED, JWT_INVITE_SECRET 추가 |
| **libs/server/rbac/** | | |
| `libs/server/rbac/package.json` | 생성 | @inquiry/server-rbac 패키지 |
| `libs/server/rbac/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/rbac/tsconfig.lib.json` | 생성 | 라이브러리 빌드용 설정 |
| `libs/server/rbac/src/index.ts` | 생성 | 모듈 진입점 |
| `libs/server/rbac/src/lib/rbac.module.ts` | 생성 | @Global() NestJS 모듈 |
| `libs/server/rbac/src/lib/guards/rbac.guard.ts` | 생성 | 접근 규칙 OR 평가 가드 |
| `libs/server/rbac/src/lib/guards/org-membership.guard.ts` | 생성 | Organization 멤버 확인 가드 |
| `libs/server/rbac/src/lib/decorators/access-rules.decorator.ts` | 생성 | @AccessRules() 메타데이터 데코레이터 |
| `libs/server/rbac/src/lib/types/access-rule.types.ts` | 생성 | AccessRule union 타입, 가중치 상수 |
| `libs/server/rbac/src/lib/services/license.service.ts` | 생성 | License 검증 stub |
| **libs/server/invite/** | | |
| `libs/server/invite/package.json` | 생성 | @inquiry/server-invite 패키지 |
| `libs/server/invite/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/invite/tsconfig.lib.json` | 생성 | 라이브러리 빌드용 설정 |
| `libs/server/invite/src/index.ts` | 생성 | 모듈 진입점 |
| `libs/server/invite/src/lib/invite.module.ts` | 생성 | NestJS 모듈 |
| `libs/server/invite/src/lib/invite.controller.ts` | 생성 | 초대 REST API (create, list, resend, delete, accept) |
| `libs/server/invite/src/lib/invite.service.ts` | 생성 | 초대 비즈니스 로직 |
| `libs/server/invite/src/lib/dto/create-invite.dto.ts` | 생성 | 초대 생성 입력 DTO |
| `libs/server/invite/src/lib/dto/accept-invite.dto.ts` | 생성 | 초대 수락 입력 DTO |
| **libs/server/member/** | | |
| `libs/server/member/package.json` | 생성 | @inquiry/server-member 패키지 |
| `libs/server/member/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/member/tsconfig.lib.json` | 생성 | 라이브러리 빌드용 설정 |
| `libs/server/member/src/index.ts` | 생성 | 모듈 진입점 |
| `libs/server/member/src/lib/member.module.ts` | 생성 | NestJS 모듈 |
| `libs/server/member/src/lib/member.controller.ts` | 생성 | 멤버 관리 REST API (list, updateRole, delete, leave) |
| `libs/server/member/src/lib/member.service.ts` | 생성 | 멤버 비즈니스 로직 |
| `libs/server/member/src/lib/dto/update-member-role.dto.ts` | 생성 | 역할 변경 입력 DTO |
| **기존 서버 모듈 수정** | | |
| `apps/server/src/app/app.module.ts` | 수정 | InviteModule, MemberModule, RbacModule import 추가 |
| `libs/server/auth/src/lib/server-auth.service.ts` | 수정 | processInviteToken() JWT 기반 변경, TeamUser 생성, accepted 플래그 |
| `libs/server/email/src/lib/email.service.ts` | 수정 | sendInviteEmail(), sendInviteAcceptedNotification() 추가 |
| `libs/server/rate-limit/src/lib/rate-limit.decorators.ts` | 수정 | InviteCreateRateLimit, InviteAcceptRateLimit 추가 |
| `libs/server/rate-limit/src/index.ts` | 수정 | 새 데코레이터 export 추가 |
| **클라이언트** | | |
| `libs/client/member/package.json` | 생성 | @inquiry/client-member 패키지 |
| `libs/client/member/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/client/member/tsconfig.lib.json` | 생성 | 라이브러리 빌드용 설정 |
| `libs/client/member/src/index.ts` | 생성 | 모듈 진입점 |
| `libs/client/member/src/lib/invite-member-form.tsx` | 생성 | 초대 생성 폼 컴포넌트 |
| `libs/client/member/src/lib/invite-list.tsx` | 생성 | 초대 목록 컴포넌트 |
| `libs/client/member/src/lib/member-list.tsx` | 생성 | 멤버 목록 컴포넌트 |
| `libs/client/member/src/lib/role-badge.tsx` | 생성 | 역할 표시 배지 컴포넌트 |
| `libs/client/member/src/lib/leave-organization-dialog.tsx` | 생성 | 조직 탈퇴 모달 |
| `apps/client/src/app/[lng]/organizations/[orgId]/members/page.tsx` | 생성 | 멤버 관리 페이지 |
| `apps/client/src/app/[lng]/invite/accept/page.tsx` | 생성 | 초대 수락 페이지 |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | 초대/멤버/RBAC 번역 키 추가 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | 초대/멤버/RBAC 번역 키 추가 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 발생 확률 | 완화 전략 |
|--------|------|----------|----------|
| Membership PK 변경 (id -> 복합키) 시 기존 데이터/참조 깨짐 | 높음 | 중간 | 현재 Membership을 참조하는 외래키가 없으므로 영향이 제한적이다. 마이그레이션 시 기존 id 컬럼 제거 전 데이터 검증을 수행한다. Membership을 참조하는 코드(auth service의 createPersonalOrganization 등)를 일괄 검색하여 수정한다. |
| MembershipRole enum 변경 (ADMIN->MANAGER) 시 기존 데이터 불일치 | 높음 | 높음 | Prisma 마이그레이션 SQL에 `ALTER TYPE ... RENAME VALUE` 또는 데이터 업데이트 쿼리를 포함한다. 마이그레이션 전 기존 ADMIN 역할 데이터를 MANAGER로 변환하는 스크립트를 준비한다. |
| Invite 모델 변경 (token 제거, UUID 전환) 시 기존 초대 무효화 | 중간 | 높음 | 현재 운영 중인 미수락 초대가 있다면 마이그레이션 시 삭제된다. 개발 단계이므로 기존 Invite 데이터를 truncate하고 새 스키마를 적용한다. |
| RbacGuard 복잡도로 인한 권한 우회 버그 | 높음 | 중간 | 접근 규칙 평가 로직에 대한 철저한 단위 테스트를 작성한다. 특히 OR 조건 평가, 가중치 비교, 빈 규칙 배열 처리를 테스트한다. |
| 초대 JWT와 인증 JWT 혼용 가능성 | 높음 | 낮음 | 초대 JWT에 `purpose: 'invite'` 클레임을 추가하고, 별도 시크릿(`JWT_INVITE_SECRET`)을 사용한다. 검증 시 purpose를 반드시 확인한다. |
| Team Admin 초대 로직의 복잡한 조건 분기 | 중간 | 중간 | Team Admin 초대를 별도 private 메서드로 분리하여 단일 책임 원칙을 적용한다. 각 조건(역할 제한, 팀 admin 여부, teamIds 필수)에 대한 개별 테스트를 작성한다. |
| processInviteToken() 변경 시 기존 회원가입 플로우 회귀 | 높음 | 중간 | 초대 없는 일반 회원가입 경로는 변경하지 않는다. 초대 토큰 처리 부분만 JWT 기반으로 교체하고, 기존 가입 -> 조직 자동 생성 경로를 별도 테스트한다. |
| 멤버 삭제 트랜잭션 실패 시 데이터 불일치 | 높음 | 낮음 | Prisma `$transaction()` 배열 방식을 사용하여 원자적 처리를 보장한다. 트랜잭션 실패 시 롤백이 자동으로 적용된다. |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 테스트 대상 | 테스트 항목 | 비고 |
|------------|-----------|------|
| RbacGuard | (1) Organization 규칙: 허용 역할 통과/차단, (2) Team 규칙: 가중치 비교, (3) OR 조건: 첫 번째 규칙 실패 + 두 번째 통과 시 접근 허용, (4) 빈 규칙 배열 시 차단, (5) Membership 없는 사용자 차단 | Mock Prisma |
| InviteService.createInvite | (1) Owner가 모든 역할로 초대 성공, (2) Manager가 member 외 역할 초대 시 에러, (3) Team Admin이 자신의 팀에만 초대 성공, (4) 중복 이메일/조직 초대 시 에러, (5) 이미 멤버인 사용자 초대 시 에러, (6) INVITE_DISABLED=true 시 차단, (7) Self-hosted에서 billing 초대 시 에러, (8) License 미보유 시 owner 외 역할 초대 차단 | Mock Prisma, Mock Email |
| InviteService.acceptInvite | (1) 유효한 JWT로 수락 성공 + Membership/TeamUser 생성, (2) 만료 JWT 시 에러, (3) 서명 위조 JWT 시 에러, (4) 이미 삭제된 Invite 시 에러, (5) teamIds에 따른 TeamUser 일괄 생성 | Mock Prisma, Mock JWT |
| MemberService.updateMemberRole | (1) Owner가 역할 변경 성공, (2) Manager가 member 외 역할로 변경 시 에러, (3) owner/manager 변경 시 TeamUser admin 자동 승격, (4) License 미보유 시 역할 변경 차단 | Mock Prisma |
| MemberService.deleteMember | (1) 자기 삭제 시 에러, (2) 마지막 Owner 삭제 시 에러, (3) Manager가 Owner 삭제 시 에러, (4) 정상 삭제 시 TeamUser+Membership 트랜잭션 | Mock Prisma |
| MemberService.leaveOrganization | (1) Owner 탈퇴 시 에러, (2) 유일 조직 탈퇴 시 에러, (3) Multi-Org 비활성 시 에러, (4) 정상 탈퇴 성공 | Mock Prisma, Mock Config |
| LicenseService | (1) ROLE_MANAGEMENT_ENABLED=true 시 true 반환, (2) 미설정 시 false 반환 | Mock Config |
| CreateInviteDto | (1) 유효한 이메일 통과, (2) 잘못된 이메일 거부, (3) name 빈 문자열 거부, (4) role enum 외 값 거부, (5) teamIds 배열 검증 | class-validator |

### 5.2 통합 테스트

| 테스트 대상 | 테스트 시나리오 | 비고 |
|------------|---------------|------|
| POST /api/invites | Owner가 초대 생성 -> 201 + Invite 반환, Invite DB 레코드 확인, 이메일 발송 확인 | TestDB + JWT |
| POST /api/invites (Manager) | Manager가 member 역할 초대 성공, owner 역할 초대 시 403 | TestDB + JWT |
| POST /api/invites/accept | JWT 토큰으로 수락 -> Membership 생성 확인, Invite 삭제 확인 | TestDB |
| DELETE /api/invites/:id | Owner가 초대 삭제 -> Invite DB 레코드 삭제 확인 | TestDB + JWT |
| GET /api/organizations/:orgId/members | 멤버 목록 반환 + 역할 정보 포함 | TestDB + JWT |
| PATCH .../members/:userId/role | Owner가 역할 변경 -> DB 반영 확인, TeamUser 자동 승격 확인 | TestDB + JWT |
| DELETE .../members/:userId | 멤버 삭제 -> Membership + TeamUser 삭제 확인 (트랜잭션) | TestDB + JWT |
| POST .../leave | 비Owner가 탈퇴 성공, Owner 탈퇴 시 403 | TestDB + JWT |
| 회원가입 + 초대 수락 | inviteToken 포함 회원가입 -> Membership 자동 생성 확인 | TestDB |

### 5.3 E2E 테스트 (수동)

| 시나리오 | 검증 항목 |
|---------|----------|
| 초대 생성 -> 이메일 수신 -> 수락 -> 멤버 확인 | Owner가 초대 생성, 이메일 링크 클릭, 신규 가입 후 조직 멤버로 추가됨 |
| 초대 재발송 | 만료 시간 갱신 확인, 새 이메일 수신 확인 |
| 초대 삭제 | 삭제 후 목록에서 제거, 이전 토큰으로 수락 시 에러 |
| 역할 변경 + Team 승격 | Owner가 member -> manager 변경, 해당 사용자의 Team 역할이 admin으로 변경됨 |
| 멤버 삭제 | 삭제 후 목록에서 제거, 삭제된 사용자가 해당 조직에 접근 불가 |
| 마지막 Owner 보호 | 유일 Owner를 삭제/역할 변경 시도 시 에러 메시지 확인 |
| 조직 탈퇴 | 비Owner가 탈퇴 성공, 조직 목록에서 제거됨, Owner 탈퇴 시 에러 |
| 권한 분리 | Owner/Manager/Member 각 역할에서 초대/삭제/역할변경 가능 여부 확인 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 설명 |
|------|------|
| License System | 환경변수 stub으로 구현. 실제 License Server 연동 및 Grace Period는 FS-029에서 구현 |
| Project/ProjectTeam | 스키마 enum만 정의. 실제 모델과 ProjectTeam 권한 검증은 FS-006에서 구현 |
| Notification Settings | 초대 수락 시 업데이트 로직은 Survey/Notification 모델 추가 후 구현 |
| Redis 기반 Rate Limiting | 현재 메모리 기반 Throttler 사용. Redis 기반 전환은 FS-099에서 구현 |
| CSV 일괄 초대 | 명세서 제외 범위. 향후 확장 시 InviteService에 bulkCreate 메서드 추가 |
| 초대 수락 시 기존 사용자 처리 | acceptorId가 설정된 기존 사용자의 경우, 별도 수락 UI 없이 자동 처리. 향후 "초대 알림 + 수락/거부 UI" 확장 가능 |
| Team 관리 CRUD | 본 계획은 Team 스키마와 TeamUser 생성까지만 다룸. Team 생성/수정/삭제 API는 별도 명세서에서 구현 |

### 6.2 잠재적 향후 개선사항

| 항목 | 설명 |
|------|------|
| 초대 링크 미리보기 | 초대 이메일의 링크 클릭 시 조직 정보를 보여주는 랜딩 페이지 |
| CSV 일괄 초대 | 대량 멤버 초대를 위한 CSV 업로드 기능 |
| 초대 대시보드 | 초대 현황 (대기 중, 수락, 만료) 통계 대시보드 |
| 역할 커스터마이징 | 기본 4종 역할 외 커스텀 역할 정의 기능 |
| RBAC 캐시 | Membership/TeamUser 조회 결과 캐시로 권한 검증 성능 최적화 |
| 초대 횟수 제한 | 조직별/일별 초대 생성 횟수 제한 (abuse 방지) |
| 멤버 삭제 시 리소스 이관 | 삭제되는 멤버가 소유한 설문/프로젝트를 다른 멤버에게 이관 |

---

## 7. i18n 고려사항

### 추가/변경이 필요한 번역 키

**구조: `member.` 네임스페이스 하위**

```json
// ko/translation.json 에 추가할 키 목록
{
  "member": {
    "invite": {
      "title": "멤버 초대",
      "email_label": "이메일",
      "email_placeholder": "초대할 이메일 주소",
      "name_label": "이름",
      "name_placeholder": "초대 대상자 이름",
      "role_label": "역할",
      "team_label": "팀 할당",
      "team_placeholder": "팀을 선택하세요",
      "submit": "초대 보내기",
      "sending": "초대 발송 중...",
      "success": "초대가 발송되었습니다.",
      "fail": "초대 발송에 실패했습니다.",
      "disabled": "초대 기능이 비활성화되어 있습니다.",
      "duplicate_email": "이미 초대가 발송된 이메일입니다.",
      "already_member": "이미 조직에 속한 멤버입니다.",
      "duplicate_team": "중복된 팀이 선택되었습니다.",
      "team_not_found": "존재하지 않는 팀이 포함되어 있습니다.",
      "license_required": "이 기능을 사용하려면 Enterprise 라이선스가 필요합니다.",
      "billing_cloud_only": "Billing 역할은 Cloud 환경에서만 사용 가능합니다.",
      "manager_member_only": "Manager는 Member 역할로만 초대할 수 있습니다."
    },
    "invite_list": {
      "title": "대기 중인 초대",
      "empty": "대기 중인 초대가 없습니다.",
      "resend": "재발송",
      "resend_success": "초대가 재발송되었습니다.",
      "delete": "삭제",
      "delete_confirm": "이 초대를 삭제하시겠습니까?",
      "delete_success": "초대가 삭제되었습니다.",
      "expires_at": "만료: {{date}}"
    },
    "accept": {
      "title": "초대 수락",
      "processing": "초대 처리 중...",
      "success": "{{organization}} 조직에 참여했습니다.",
      "expired": "초대가 만료되었습니다. 관리자에게 재초대를 요청해주세요.",
      "invalid": "유효하지 않은 초대 링크입니다.",
      "not_found": "이미 수락되었거나 삭제된 초대입니다.",
      "go_to_org": "조직으로 이동"
    },
    "list": {
      "title": "멤버 관리",
      "search_placeholder": "이름 또는 이메일로 검색",
      "empty": "멤버가 없습니다.",
      "role_change": "역할 변경",
      "remove": "멤버 삭제",
      "remove_confirm": "{{name}}님을 조직에서 삭제하시겠습니까?",
      "remove_success": "멤버가 삭제되었습니다.",
      "remove_fail": "멤버 삭제에 실패했습니다.",
      "cannot_remove_self": "자기 자신은 삭제할 수 없습니다.",
      "cannot_remove_owner": "Manager는 Owner를 삭제할 수 없습니다.",
      "last_owner": "마지막 Owner는 삭제할 수 없습니다."
    },
    "role": {
      "owner": "Owner",
      "manager": "Manager",
      "member": "Member",
      "billing": "Billing",
      "change_success": "역할이 변경되었습니다.",
      "change_fail": "역할 변경에 실패했습니다."
    },
    "leave": {
      "title": "조직 탈퇴",
      "description": "이 조직을 탈퇴하면 모든 접근 권한을 잃게 됩니다.",
      "confirm": "정말 탈퇴하시겠습니까?",
      "submit": "조직 탈퇴",
      "leaving": "탈퇴 처리 중...",
      "success": "조직에서 탈퇴했습니다.",
      "fail": "조직 탈퇴에 실패했습니다.",
      "owner_cannot_leave": "Owner는 조직을 탈퇴할 수 없습니다. 먼저 역할을 변경해주세요.",
      "only_org": "유일한 조직에서는 탈퇴할 수 없습니다.",
      "multi_org_disabled": "Multi-Organization 기능이 비활성화되어 있어 탈퇴가 불가능합니다."
    }
  }
}
```

```json
// en/translation.json 에 추가할 키 목록
{
  "member": {
    "invite": {
      "title": "Invite Member",
      "email_label": "Email",
      "email_placeholder": "Email address to invite",
      "name_label": "Name",
      "name_placeholder": "Invitee name",
      "role_label": "Role",
      "team_label": "Team Assignment",
      "team_placeholder": "Select teams",
      "submit": "Send Invitation",
      "sending": "Sending invitation...",
      "success": "Invitation has been sent.",
      "fail": "Failed to send invitation.",
      "disabled": "Invitation feature is disabled.",
      "duplicate_email": "An invitation has already been sent to this email.",
      "already_member": "This user is already a member of the organization.",
      "duplicate_team": "Duplicate team selected.",
      "team_not_found": "Selected team does not exist.",
      "license_required": "Enterprise license is required to use this feature.",
      "billing_cloud_only": "Billing role is only available in Cloud environment.",
      "manager_member_only": "Managers can only invite with the Member role."
    },
    "invite_list": {
      "title": "Pending Invitations",
      "empty": "No pending invitations.",
      "resend": "Resend",
      "resend_success": "Invitation has been resent.",
      "delete": "Delete",
      "delete_confirm": "Are you sure you want to delete this invitation?",
      "delete_success": "Invitation has been deleted.",
      "expires_at": "Expires: {{date}}"
    },
    "accept": {
      "title": "Accept Invitation",
      "processing": "Processing invitation...",
      "success": "You have joined {{organization}}.",
      "expired": "This invitation has expired. Please ask the admin for a new invitation.",
      "invalid": "Invalid invitation link.",
      "not_found": "This invitation has already been accepted or deleted.",
      "go_to_org": "Go to Organization"
    },
    "list": {
      "title": "Member Management",
      "search_placeholder": "Search by name or email",
      "empty": "No members.",
      "role_change": "Change Role",
      "remove": "Remove Member",
      "remove_confirm": "Are you sure you want to remove {{name}} from this organization?",
      "remove_success": "Member has been removed.",
      "remove_fail": "Failed to remove member.",
      "cannot_remove_self": "You cannot remove yourself.",
      "cannot_remove_owner": "Managers cannot remove Owners.",
      "last_owner": "Cannot remove the last Owner."
    },
    "role": {
      "owner": "Owner",
      "manager": "Manager",
      "member": "Member",
      "billing": "Billing",
      "change_success": "Role has been changed.",
      "change_fail": "Failed to change role."
    },
    "leave": {
      "title": "Leave Organization",
      "description": "You will lose all access to this organization upon leaving.",
      "confirm": "Are you sure you want to leave?",
      "submit": "Leave Organization",
      "leaving": "Processing...",
      "success": "You have left the organization.",
      "fail": "Failed to leave organization.",
      "owner_cannot_leave": "Owners cannot leave the organization. Please change your role first.",
      "only_org": "You cannot leave your only organization.",
      "multi_org_disabled": "Multi-Organization feature is disabled. Leaving is not available."
    }
  }
}
```
