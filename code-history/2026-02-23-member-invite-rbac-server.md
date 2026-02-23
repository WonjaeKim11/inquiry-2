# FSD-004 멤버 초대/RBAC 서버 사이드 구현

## Overview
Inquiry 설문조사 SaaS 플랫폼의 멤버 초대 시스템 및 RBAC(역할 기반 접근 제어) 백엔드를 구현한다. 조직 내 멤버를 이메일로 초대하고, 역할 기반으로 접근 권한을 제어하며, 멤버 관리(목록 조회, 역할 변경, 삭제, 탈퇴)를 지원한다.

주요 구현 사항:
- Prisma 스키마에 Team, TeamUser 모델과 TeamUserRole, ProjectTeamPermission enum 추가
- Invite 모델을 UUID ID + JWT 기반 토큰 + 팀 할당 지원으로 확장
- RBAC 가드 라이브러리: 접근 규칙 배열을 OR 조건으로 평가하는 범용 가드
- 초대 라이브러리: JWT 토큰 기반 초대 생성/재발송/삭제/수락 CRUD
- 멤버 라이브러리: 멤버 목록 조회, 역할 변경(팀 자동 승격 포함), 멤버 삭제, 조직 탈퇴

## Changed Files

### Prisma 스키마
- `packages/db/prisma/schema.prisma` (수정): TeamUserRole, ProjectTeamPermission enum 추가; Team, TeamUser 모델 추가; Invite 모델에 name, creatorId, acceptorId, teamIds 필드 추가 및 UUID ID로 변경; User 모델에 teamUsers, invitesCreated, invitesAccepted 관계 추가; Organization 모델에 teams 관계 추가

### RBAC 라이브러리 (libs/server/rbac/)
- `libs/server/rbac/package.json` (생성): @inquiry/server-rbac 패키지 정의
- `libs/server/rbac/tsconfig.json` (생성): TypeScript 참조 설정
- `libs/server/rbac/tsconfig.lib.json` (생성): 라이브러리 빌드 설정
- `libs/server/rbac/src/index.ts` (생성): 모듈 공개 API 진입점
- `libs/server/rbac/src/lib/rbac.module.ts` (생성): @Global() NestJS 모듈
- `libs/server/rbac/src/lib/guards/rbac.guard.ts` (생성): 접근 규칙 OR 평가 가드 (Organization, Team, ProjectTeam 규칙 지원)
- `libs/server/rbac/src/lib/decorators/access-rules.decorator.ts` (생성): @AccessRules() 메타데이터 데코레이터
- `libs/server/rbac/src/lib/types/access-rule.types.ts` (생성): AccessRule union 타입, 가중치 상수 (TEAM_ROLE_WEIGHT, PROJECT_PERMISSION_WEIGHT)

### 초대 라이브러리 (libs/server/invite/)
- `libs/server/invite/package.json` (생성): @inquiry/server-invite 패키지 정의
- `libs/server/invite/tsconfig.json` (생성): TypeScript 참조 설정
- `libs/server/invite/tsconfig.lib.json` (생성): 라이브러리 빌드 설정
- `libs/server/invite/src/index.ts` (생성): 모듈 공개 API 진입점
- `libs/server/invite/src/lib/invite.module.ts` (생성): NestJS 모듈 (JwtModule 포함)
- `libs/server/invite/src/lib/invite.service.ts` (생성): 초대 CRUD 비즈니스 로직 (JWT 토큰 생성/검증, 트랜잭션 처리)
- `libs/server/invite/src/lib/invite.controller.ts` (생성): REST API 엔드포인트 (create, list, resend, delete, accept)
- `libs/server/invite/src/lib/dto/create-invite.dto.ts` (생성): 초대 생성 Zod DTO
- `libs/server/invite/src/lib/dto/accept-invite.dto.ts` (생성): 초대 수락 Zod DTO

### 멤버 라이브러리 (libs/server/member/)
- `libs/server/member/package.json` (생성): @inquiry/server-member 패키지 정의
- `libs/server/member/tsconfig.json` (생성): TypeScript 참조 설정
- `libs/server/member/tsconfig.lib.json` (생성): 라이브러리 빌드 설정
- `libs/server/member/src/index.ts` (생성): 모듈 공개 API 진입점
- `libs/server/member/src/lib/member.module.ts` (생성): NestJS 모듈 (MemberController + OrganizationLeaveController)
- `libs/server/member/src/lib/member.service.ts` (생성): 멤버 관리 비즈니스 로직 (역할 변경, 팀 자동 승격, 삭제, 탈퇴)
- `libs/server/member/src/lib/member.controller.ts` (생성): 멤버 CRUD 컨트롤러 + 조직 탈퇴 컨트롤러
- `libs/server/member/src/lib/dto/update-member-role.dto.ts` (생성): 역할 변경 Zod DTO

### 기존 모듈 수정
- `apps/server/src/app/app.module.ts` (수정): RbacModule, InviteModule, MemberModule import 추가
- `apps/server/package.json` (수정): @inquiry/server-rbac, server-invite, server-member 워크스페이스 의존성 추가
- `apps/server/tsconfig.app.json` (수정): 신규 라이브러리 tsconfig 참조 추가
- `libs/server/email/src/lib/email.service.ts` (수정): sendInviteEmail(), sendInviteAcceptedNotification() 메서드 추가
- `libs/server/auth/src/lib/server-auth.service.ts` (수정): processInviteToken()을 JWT 기반으로 변경, TeamUser 생성 로직 추가
- `libs/server/rate-limit/src/lib/rate-limit.decorators.ts` (수정): InviteCreateRateLimit, InviteAcceptRateLimit 데코레이터 추가
- `.env.example` (수정): JWT_INVITE_SECRET, INVITE_DISABLED, ROLE_MANAGEMENT_ENABLED, IS_SELF_HOSTED 환경변수 추가

## Major Changes

### 1. RBAC 가드 시스템
기존 OrgRoleGuard는 조직 역할만 확인하는 단일 목적 가드였다. 새로운 RbacGuard는 접근 규칙 배열을 OR 조건으로 평가하는 범용 가드로, 조직/팀/프로젝트 수준의 접근 규칙을 지원한다.

```typescript
// 사용 예시: Owner/Admin 또는 팀 Admin이면 접근 가능
@AccessRules(
  { type: 'organization', allowedRoles: ['OWNER', 'ADMIN'] },
  { type: 'team', minPermission: 'ADMIN' }
)
```

가드는 각 규칙을 순회하며 하나라도 통과하면 접근을 허용한다. organizationId는 요청 파라미터, 쿼리, 또는 바디에서 추출한다.

### 2. JWT 기반 초대 토큰
초대 토큰을 기존 랜덤 문자열에서 JWT로 변경했다. `purpose: 'invite'` 클레임과 별도 시크릿(`JWT_INVITE_SECRET`)으로 인증 JWT와 구분한다.

```typescript
// JWT 페이로드: { sub: inviteId, email, organizationId, purpose: 'invite' }
// 만료: 7일, 서명: JWT_INVITE_SECRET (없으면 JWT_ACCESS_SECRET fallback)
```

### 3. 초대 수락 트랜잭션
초대 수락 시 Membership 생성 + TeamUser 생성 + Invite 삭제를 단일 트랜잭션으로 처리하여 데이터 일관성을 보장한다.

### 4. 역할 변경 시 팀 자동 승격
멤버가 OWNER/ADMIN으로 승격되면, 해당 조직의 모든 팀에서 해당 사용자의 TeamUser 역할을 자동으로 ADMIN으로 변경한다.

### 5. Auth Service 수정
processInviteToken()에서 JWT 검증을 시도하고, 실패 시 기존 token 필드로 fallback 조회하여 하위 호환성을 유지한다. TeamUser 생성 로직도 추가했다.

## How to use it

### 초대 생성
```
POST /api/invites
Authorization: Bearer <jwt-access-token>
{
  "organizationId": "org-id",
  "email": "user@example.com",
  "name": "홍길동",
  "role": "MEMBER",
  "teamIds": ["team-id-1"]
}
Response: { "id", "email", "name", "role", "teamIds", "expiresAt", "createdAt" }
```

### 초대 목록 조회
```
GET /api/invites?organizationId=org-id
Authorization: Bearer <jwt-access-token>
```

### 초대 재발송/삭제
```
POST /api/invites/:inviteId/resend?organizationId=org-id
DELETE /api/invites/:inviteId?organizationId=org-id
```

### 초대 수락
```
POST /api/invites/accept
{ "token": "<jwt-invite-token>" }
Response: { "organizationId", "organizationName", "role" }
```

### 멤버 목록 조회
```
GET /api/organizations/:orgId/members
Authorization: Bearer <jwt-access-token>
```

### 멤버 역할 변경
```
PATCH /api/organizations/:orgId/members/:userId/role
Authorization: Bearer <jwt-access-token>
{ "role": "ADMIN" }
```

### 멤버 삭제
```
DELETE /api/organizations/:orgId/members/:userId
Authorization: Bearer <jwt-access-token>
```

### 조직 탈퇴
```
POST /api/organizations/:orgId/leave
Authorization: Bearer <jwt-access-token>
```

### 환경변수
```
JWT_INVITE_SECRET=your-invite-secret     # 초대 JWT 서명 키 (선택, 미설정 시 JWT_ACCESS_SECRET 사용)
INVITE_DISABLED=false                     # 초대 기능 비활성화 (기본: false)
ROLE_MANAGEMENT_ENABLED=false            # 역할 관리 기능 활성화 (기본: false)
IS_SELF_HOSTED=false                     # Self-hosted 환경 (기본: false, Billing 역할 제한)
```

## Related Components/Modules
- `libs/server/organization/`: 기존 조직 관리 모듈. OrgRoleGuard는 그대로 유지되며, 새 RbacGuard와 공존
- `libs/server/auth/`: 회원가입 시 초대 토큰 처리 (processInviteToken). JWT 기반으로 업데이트
- `libs/server/email/`: 초대 이메일, 수락 알림 이메일 발송
- `libs/server/audit-log/`: 모든 주요 작업에 감사 로그 기록
- `libs/server/rate-limit/`: 초대 생성/수락 Rate Limit 데코레이터 추가
- `packages/db/`: Prisma 스키마 변경 (Team, TeamUser, Invite 확장)

## Precautions
- PostgreSQL이 미실행 상태이므로 `prisma generate`만 수행하고 DB 마이그레이션은 실행하지 않았다. 실제 배포 시 마이그레이션 필요
- MembershipRole은 ADMIN을 그대로 유지 (계획서의 ADMIN->MANAGER 변경은 적용하지 않음). Spec의 "manager" = 코드의 "ADMIN"
- Membership 모델의 단일 PK(id)를 유지하고 복합 PK로 변경하지 않음 (@@unique([userId, organizationId]) 활용)
- License 시스템은 환경변수 기반 stub으로 구현. ROLE_MANAGEMENT_ENABLED로 Enterprise 기능 활성화 제어
- ProjectTeam 접근 규칙은 타입 정의만 포함하고, 실제 구현은 FSD-006에서 진행 예정
- Team CRUD API(생성/수정/삭제)는 별도 명세서에서 구현 예정. 현재는 스키마와 TeamUser 연동만 포함
