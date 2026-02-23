# FSD-006 프로젝트(Project) & 환경(Environment) 서버 사이드 구현

## Overview
프로젝트(Project)와 환경(Environment) 관리를 위한 NestJS 서버 사이드 모듈을 구현했다.
프로젝트는 조직(Organization) 내에서 설문조사/CX를 관리하는 기본 단위이며, 각 프로젝트는 생성 시 production/development 2개의 환경을 트랜잭션으로 자동 생성한다.
추가로 ActionClass(사용자 행동 정의)와 Language(다국어 설정) 관리 기능도 함께 구현하여 프로젝트의 핵심 하위 리소스를 완성했다.

## Changed Files

### Prisma 스키마
- `packages/db/prisma/schema.prisma` - Project, Environment, ActionClass, Language 4개 모델과 관련 enum(ProjectMode, WidgetPlacement, DarkOverlay, EnvironmentType, ActionClassType) 추가. Organization 모델에 projects 관계 추가.

### 감사 로그 타입 확장
- `libs/server/audit-log/src/lib/audit-log.types.ts` - project.created/updated/deleted, actionClass.created/deleted, language.created/deleted 감사 액션과 project, actionClass, language 대상 타입 추가

### NestJS 프로젝트 모듈 (`libs/server/project/`)
- `libs/server/project/package.json` - 워크스페이스 패키지 정의
- `libs/server/project/tsconfig.json` - TypeScript 프로젝트 참조 설정
- `libs/server/project/tsconfig.lib.json` - 라이브러리 빌드 설정
- `libs/server/project/src/index.ts` - 공개 API barrel export

#### Enums
- `libs/server/project/src/lib/enums/project.enums.ts` - 프로젝트 관련 상수 및 타입 정의 (모드, 배치, 오버레이, 환경 유형, 액션 타입 등)

#### DTOs (Zod 스키마)
- `libs/server/project/src/lib/dto/create-project.dto.ts` - 프로젝트 생성 검증 스키마
- `libs/server/project/src/lib/dto/update-project.dto.ts` - 프로젝트 수정 검증 스키마
- `libs/server/project/src/lib/dto/create-action-class.dto.ts` - ActionClass 생성 검증 스키마 (code/noCode 타입별 필수 필드 검증 포함)
- `libs/server/project/src/lib/dto/update-action-class.dto.ts` - ActionClass 수정 검증 스키마
- `libs/server/project/src/lib/dto/create-language.dto.ts` - Language 생성 검증 스키마 (ISO 639-1 코드 검증)
- `libs/server/project/src/lib/dto/update-language.dto.ts` - Language 수정 검증 스키마

#### Services
- `libs/server/project/src/lib/services/project.service.ts` - 프로젝트 CRUD, 트랜잭션 기반 Environment 자동 생성, 조직 역할 기반 권한 검증
- `libs/server/project/src/lib/services/environment.service.ts` - 환경 조회, 조직 멤버십 검증
- `libs/server/project/src/lib/services/action-class.service.ts` - ActionClass CRUD, code/noCode 타입별 검증
- `libs/server/project/src/lib/services/language.service.ts` - Language CRUD, 프로젝트 내 코드 고유성 검증

#### Controllers
- `libs/server/project/src/lib/controllers/project.controller.ts` - Project REST API 엔드포인트
- `libs/server/project/src/lib/controllers/environment.controller.ts` - Environment REST API 엔드포인트
- `libs/server/project/src/lib/controllers/action-class.controller.ts` - ActionClass REST API 엔드포인트
- `libs/server/project/src/lib/controllers/language.controller.ts` - Language REST API 엔드포인트

#### Module
- `libs/server/project/src/lib/project.module.ts` - NestJS 모듈 정의 (4개 컨트롤러, 4개 서비스)

### AppModule 통합
- `apps/server/src/app/app.module.ts` - ProjectModule import 추가
- `apps/server/package.json` - @inquiry/server-project 의존성 추가
- `apps/server/tsconfig.app.json` - 프로젝트 라이브러리 tsconfig 참조 추가

## Major Changes

### 1. Prisma 스키마 확장

4개의 새 모델과 5개의 enum을 추가했다.

```prisma
model Project {
  id                 String          @id @default(cuid(2))
  name               String
  organizationId     String
  mode               ProjectMode     @default(surveys)
  placement          WidgetPlacement @default(bottomRight)
  // ... 위젯/브랜딩/스타일링 설정 필드
  environments Environment[]
  languages    Language[]
  @@unique([organizationId, name])  // 조직 내 프로젝트 이름 고유
}
```

Project -> Environment -> ActionClass 계층 구조이며, 모두 onDelete: Cascade로 연결된다.

### 2. 트랜잭션 기반 프로젝트 생성

프로젝트 생성 시 `$transaction`을 사용하여 production/development 2개 Environment를 원자적으로 생성한다.

```typescript
const project = await this.prisma.$transaction(async (tx) => {
  const newProject = await tx.project.create({
    data: {
      name: dto.name,
      organizationId: dto.organizationId,
      environments: {
        createMany: {
          data: [{ type: 'production' }, { type: 'development' }],
        },
      },
    },
    include: { environments: true },
  });
  return newProject;
});
```

### 3. 서비스 레벨 권한 검증

Organization의 OrgRoleGuard는 라우트 파라미터에서 `:id`로 organizationId를 추출하는 방식이므로, Project API에서는 서비스 레벨에서 직접 Membership 테이블을 조회하여 권한을 검증한다.

```typescript
private async validateOrgRole(userId, organizationId, requiredRoles) {
  const membership = await this.prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  // 역할 계층: OWNER(40) > ADMIN(30) > BILLING(20) > MEMBER(10)
  const userLevel = ROLE_HIERARCHY[membership.role];
  const hasRole = requiredRoles.some(role => userLevel >= ROLE_HIERARCHY[role]);
}
```

### 4. ActionClass code/noCode 타입 분기

Zod 스키마에서 `.refine()`을 사용하여 타입에 따른 필수 필드를 검증한다.

```typescript
.refine(data => {
  if (data.type === 'code') return !!data.key;
  if (data.type === 'noCode') return !!data.noCodeConfig;
  return true;
}, { message: 'code 타입은 key 필수, noCode 타입은 noCodeConfig 필수' });
```

### 5. customHeadScript Self-hosted 제어

`IS_SELF_HOSTED` 환경변수를 ConfigService로 조회하여, Self-hosted 환경에서만 customHeadScript 필드 변경을 허용한다.

## How to use it

### Project API

```bash
# 프로젝트 생성 (production/development 환경 자동 생성)
POST /api/projects
{
  "name": "My Survey Project",
  "organizationId": "clu1234...",
  "recontactDays": 14,
  "placement": "bottomRight"
}

# 조직별 프로젝트 목록 조회
GET /api/organizations/:orgId/projects

# 프로젝트 상세 조회
GET /api/projects/:projectId

# 프로젝트 수정
PATCH /api/projects/:projectId
{ "name": "Updated Name", "darkOverlay": "light" }

# 프로젝트 삭제 (OWNER만)
DELETE /api/projects/:projectId
```

### Environment API

```bash
# 프로젝트 환경 목록 조회
GET /api/projects/:projectId/environments

# 환경 상세 조회
GET /api/environments/:environmentId
```

### ActionClass API

```bash
# code 타입 ActionClass 생성
POST /api/environments/:environmentId/action-classes
{ "name": "Button Click", "type": "code", "key": "btn_click" }

# noCode 타입 ActionClass 생성
POST /api/environments/:environmentId/action-classes
{
  "name": "Page View",
  "type": "noCode",
  "noCodeConfig": {
    "type": "pageView",
    "urlFilters": [{ "value": "/pricing", "rule": "contains" }]
  }
}

# 목록/상세 조회
GET /api/environments/:environmentId/action-classes
GET /api/action-classes/:actionClassId

# 수정 (type 변경 불가)
PATCH /api/action-classes/:actionClassId
{ "name": "Updated Name" }

# 삭제
DELETE /api/action-classes/:actionClassId
```

### Language API

```bash
# 언어 등록
POST /api/projects/:projectId/languages
{ "code": "ko", "alias": "Korean" }

# 목록 조회
GET /api/projects/:projectId/languages

# 수정
PATCH /api/languages/:languageId
{ "alias": "한국어" }

# 삭제
DELETE /api/languages/:languageId
```

## Related Components/Modules

- **Organization 모듈** (`libs/server/organization/`) - 프로젝트의 상위 개념. Project는 Organization에 속하며, 조직 멤버십 기반으로 접근 권한을 관리
- **Audit Log 모듈** (`libs/server/audit-log/`) - 프로젝트/ActionClass/Language 생성/삭제 시 감사 로그 기록
- **Prisma 모듈** (`libs/server/prisma/`) - 데이터베이스 접근 계층
- **Core 모듈** (`libs/server/core/`) - ZodValidationPipe 제공
- **License 모듈** (`libs/server/license/`) - 향후 프로젝트 수 제한 등에 활용 예정

## Precautions

- PostgreSQL이 미실행 상태이므로 `prisma generate`만 실행하고 DB 마이그레이션은 스킵했다. 실제 배포 시 `prisma migrate`를 별도로 실행해야 한다.
- `customHeadScript` 필드는 XSS 위험이 있으므로 `IS_SELF_HOSTED=true` 환경에서만 변경 가능하도록 제한했다. 향후 입력값 sanitize 로직 추가를 고려해야 한다.
- 현재 프로젝트 목록 조회에 페이지네이션이 적용되지 않았다. 대규모 조직에서는 향후 페이지네이션 추가가 필요하다.
- ActionClass의 type 필드는 생성 후 변경할 수 없도록 설계되었다. 타입 변경이 필요한 경우 삭제 후 재생성해야 한다.
- Environment는 Project 생성 시 자동으로 2개가 만들어지며, 별도 생성/삭제 API는 제공하지 않는다.
