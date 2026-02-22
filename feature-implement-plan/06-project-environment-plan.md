# 기능 구현 계획: 프로젝트(Project) & 환경(Environment) 관리

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 우선순위 | 설명 |
|---------|--------|---------|------|
| FN-006-01 | Project 생성 | 높음 | Organization 하위에 프로젝트 생성, 기본 설정 초기화, production/development 환경 자동 생성 |
| FN-006-02 | Project 조회 | 높음 | 단일 조회 + Organization별 목록 조회 |
| FN-006-03 | Project 수정 | 높음 | Partial Update (이름, 재접촉 일수, 위젯 배치, 스타일링 등) |
| FN-006-04 | Project 삭제 | 높음 | Cascade 삭제 (하위 Environment 및 모든 데이터) |
| FN-006-05 | Environment 자동 생성 | 높음 | Project 생성 트랜잭션 내에서 production/development 2개 자동 생성 |
| FN-006-06 | Environment 조회 및 전환 | 높음 | 환경 목록 조회, production/development 간 전환 |
| FN-006-07 | 환경별 데이터 격리 | 높음 | Environment ID 기반 데이터 필터링으로 완전한 격리 보장 |
| FN-006-08 | ActionClass 생성 (code) | 높음 | SDK 이벤트 트리거용 ActionClass, key 필수 |
| FN-006-09 | ActionClass 생성 (noCode) | 높음 | 사용자 행동 자동 감지용 ActionClass, noCodeConfig 필수 |
| FN-006-10 | ActionClass 조회/수정/삭제 | 중간 | Environment 범위 내 CRUD, SurveyTrigger 연쇄 삭제 |
| FN-006-11 | Language 관리 | 중간 | Project-level 언어 등록/수정/삭제 (Environment 간 공유) |
| FN-006-12 | Project Styling 관리 | 중간 | 브랜드 색상, 카드 스타일, 오버라이드 허용 여부 관리 |

### 1.2 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 트랜잭션 원자성 | Project 생성 + Environment 2개 생성을 단일 트랜잭션으로 처리 |
| Cascade 삭제 | DB 레벨 `ON DELETE CASCADE`로 데이터 일관성 보장 |
| 인덱싱 | Environment: `projectId` 인덱스, ActionClass: `(environmentId, createdAt)` 복합 인덱스 |
| 데이터 격리 | Environment ID 기반 엄격한 격리 (Survey, Contact, ActionClass 등 9종) |
| 권한 검증 | Project CRUD 시 Organization 내 역할 검증 (생성/수정: OWNER/ADMIN, 삭제: OWNER, 조회: 멤버) |
| ID 형식 분리 | Project/ActionClass/Language: CUID2, Environment: CUID |
| 고유 제약조건 | Project: `(organizationId, name)`, ActionClass: `(key, environmentId)` + `(name, environmentId)` |

### 1.3 명세서 내 모호성 및 해석

| 항목 | 모호성 | 해석/결정 |
|------|--------|----------|
| Project ID 형식 | 명세서는 CUID2를 요구하지만, 현재 Prisma 스키마의 `@default(cuid())`는 CUID v1 생성 | Prisma 7.x에서는 `@default(cuid())` 외에 `@default(cuid(2))`를 지원한다. Project, ActionClass, Language는 `@default(cuid(2))`를, Environment는 `@default(cuid())`를 사용한다. |
| Environment ID의 CUID 형식 | 명세서에서 Environment는 CUID(v1)를 사용한다고 명시 | 기존 User, Organization 등이 `@default(cuid())`를 사용하는 것과 동일하게 CUID v1을 사용한다. 명세서의 의도(Project ID와 Environment ID를 시각적으로 구분)를 반영한다. |
| OrgRoleGuard 재사용 | Organization 관리 구현 계획(03)에서 OrgRoleGuard를 정의했으나 아직 구현되지 않음 | 본 구현에서 `libs/server/organization`에 OrgRoleGuard가 이미 구현되어 있다고 가정한다. 미구현 상태라면 본 구현과 함께 선행 구현한다. |
| Project mode 필드 | 명세서에 mode(surveys/cx) 필드가 데이터 모델에 존재하나, 기능 흐름에서는 언급 없음 | 스키마에 포함하되, 기본값 `surveys`로 설정하고 현재는 UI에서 노출하지 않는다. |
| customHeadScript | Self-hosted 환경에서만 유효하다고 명시 | 환경변수 `IS_SELF_HOSTED` 플래그로 제어한다. Cloud 환경에서는 이 필드가 제출되어도 무시한다. |
| ProjectTeam | 데이터 모델 관계도에 언급되나 상세 스키마 미정의 | Team 모델이 아직 없으므로, Project 스키마에 teams 관계만 선언하고 실제 구현은 Team 기능(별도 명세) 시 처리한다. 현재는 생략한다. |
| ActionClass 수정 시 type 변경 가능 여부 | 명세서에 명시 없음 | type(code/noCode) 변경은 허용하지 않는다. 변경이 필요하면 기존 삭제 후 재생성하는 방식을 사용한다. |
| Language 코드 형식 검증 | "표준 언어 코드 형식"이라고만 명시 | ISO 639-1 2글자 코드(en, ko, ja 등) + 선택적 지역 코드(en-US) 패턴을 정규식으로 검증한다. |

### 1.4 암시적 요구사항

| 항목 | 설명 |
|------|------|
| Prisma 스키마 확장 | Project, Environment, ActionClass, Language 4개 모델 추가, Organization에 projects 관계 추가 |
| 서버 라이브러리 생성 | `libs/server/project` NestJS 모듈 생성 (ProjectModule, EnvironmentModule, ActionClassModule, LanguageModule) |
| 클라이언트 라이브러리 생성 | `libs/client/project` 컴포넌트/훅 라이브러리 생성 |
| DTO 정의 | Project/ActionClass/Language 관련 Create/Update DTO 클래스 생성 (class-validator) |
| 클라이언트 zod 스키마 | 클라이언트 측 폼 검증용 zod 스키마 정의 (서버 DTO 규칙과 동기화) |
| 서버 Enum 정의 | EnvironmentType, WidgetPlacement, DarkOverlay, ActionClassType, NoCodeType, UrlFilterRule, ProjectMode 등 |
| DB 마이그레이션 | Prisma 스키마 변경 후 마이그레이션 실행 |
| 페이지 라우트 | `apps/client/src/app/[lng]/projects/` 하위 페이지 라우트 생성 |
| cuid2 패키지 설치 | Prisma `@default(cuid(2))` 사용을 위해 별도 패키지가 필요한지 확인 (Prisma 7.x 내장 여부) |
| OrgRoleGuard 선행 구현 확인 | Organization 관리 모듈의 OrgRoleGuard가 구현되어 있어야 Project 권한 검증 가능 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
[클라이언트 (Next.js 16)]
  apps/client/src/app/[lng]/
    ├── projects/
    │   ├── new/page.tsx                -- 프로젝트 생성 페이지
    │   └── [projectId]/
    │       ├── page.tsx                -- 프로젝트 대시보드
    │       ├── settings/page.tsx       -- 프로젝트 설정 (일반/스타일링/언어)
    │       └── environments/
    │           └── [envId]/
    │               ├── page.tsx        -- 환경 대시보드
    │               └── action-classes/
    │                   ├── page.tsx    -- ActionClass 목록
    │                   └── new/page.tsx -- ActionClass 생성
  libs/client/project/
    ├── project-context.tsx             -- 현재 프로젝트/환경 상태 관리
    ├── create-project-form.tsx         -- 프로젝트 생성 폼
    ├── project-settings.tsx            -- 프로젝트 설정 컴포넌트
    ├── project-styling-form.tsx        -- 스타일링 설정 폼
    ├── environment-switcher.tsx        -- 환경 전환 UI
    ├── action-class-form.tsx           -- ActionClass 생성/수정 폼
    ├── action-class-list.tsx           -- ActionClass 목록
    ├── language-manager.tsx            -- 언어 관리 UI
    └── delete-project-dialog.tsx       -- 삭제 확인 모달

[서버 (NestJS 11)]
  libs/server/project/
    ├── project.module.ts               -- Project 모듈 (Environment, ActionClass, Language 포함)
    ├── controllers/
    │   ├── project.controller.ts       -- /api/projects 엔드포인트
    │   ├── environment.controller.ts   -- /api/projects/:id/environments 엔드포인트
    │   ├── action-class.controller.ts  -- /api/environments/:id/action-classes 엔드포인트
    │   └── language.controller.ts      -- /api/projects/:id/languages 엔드포인트
    ├── services/
    │   ├── project.service.ts          -- Project 비즈니스 로직
    │   ├── environment.service.ts      -- Environment 비즈니스 로직
    │   ├── action-class.service.ts     -- ActionClass 비즈니스 로직
    │   └── language.service.ts         -- Language 비즈니스 로직
    ├── dto/
    │   ├── create-project.dto.ts
    │   ├── update-project.dto.ts
    │   ├── create-action-class.dto.ts
    │   ├── update-action-class.dto.ts
    │   ├── create-language.dto.ts
    │   └── update-language.dto.ts
    └── enums/
        └── project.enums.ts            -- Enum 정의

[데이터베이스 (PostgreSQL + Prisma 7)]
  packages/db/prisma/schema.prisma      -- Project, Environment, ActionClass, Language 모델 추가
```

**데이터 흐름:**

```
[Client] -- apiFetch --> [NestJS Controller]
                            |
                            v
                    [JwtAuthGuard + OrgRoleGuard]
                            |
                            v
                    [Project/Environment/ActionClass/Language Service]
                            |
                            v
                    [ServerPrismaService (Prisma ORM)]
                            |
                    [$transaction 사용 - Project+Environment 생성]
                            |
                            v
                    [PostgreSQL - Project/Environment/ActionClass/Language Tables]
```

### 2.2 데이터 모델

**신규 Prisma 스키마 추가:**

```prisma
/// 프로젝트 모드
enum ProjectMode {
  surveys
  cx
}

/// 위젯 배치 위치
enum WidgetPlacement {
  bottomLeft
  bottomRight
  topLeft
  topRight
  center
}

/// 오버레이 설정
enum DarkOverlay {
  none
  light
  dark
}

/// 환경 유형
enum EnvironmentType {
  production
  development
}

/// ActionClass 유형
enum ActionClassType {
  code
  noCode
}

/// Organization 하위의 제품 단위. 복수의 Environment를 포함한다.
model Project {
  id                 String          @id @default(cuid(2))
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt
  name               String
  organizationId     String
  config             Json?           // { channel: "link"|"app"|"website"|null, industry: "eCommerce"|"saas"|"other"|null }
  mode               ProjectMode     @default(surveys)
  recontactDays      Int             @default(7)
  inAppSurveyBranding Boolean        @default(true)
  linkSurveyBranding Boolean         @default(true)
  placement          WidgetPlacement @default(bottomRight)
  clickOutsideClose  Boolean         @default(true)
  darkOverlay        DarkOverlay     @default(none)
  styling            Json            @default("{\"allowStyleOverride\":true}")
  logo               Json?
  customHeadScript   String?

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  environments Environment[]
  languages    Language[]

  @@unique([organizationId, name])
  @@map("projects")
}

/// Project 하위의 실행 환경. production과 development 2개가 자동 생성된다.
model Environment {
  id                String          @id @default(cuid())
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  type              EnvironmentType
  projectId         String
  appSetupCompleted Boolean         @default(false)

  project       Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  actionClasses ActionClass[]

  @@index([projectId])
  @@map("environments")
}

/// 사용자 행동을 정의하는 클래스. 설문 트리거의 기준이 된다.
model ActionClass {
  id            String          @id @default(cuid(2))
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  name          String
  description   String?
  type          ActionClassType
  key           String?         // code 유형 시 트리거 키 (필수)
  noCodeConfig  Json?           // noCode 유형 시 설정 (필수)
  environmentId String

  environment Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)

  @@unique([key, environmentId])
  @@unique([name, environmentId])
  @@index([environmentId, createdAt])
  @@map("action_classes")
}

/// Project 단위 다국어 설정. 모든 Environment에서 공유된다.
model Language {
  id        String   @id @default(cuid(2))
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  code      String   // ISO 639-1 언어 코드 (예: en, ko, ja)
  alias     String?  // 사용자 지정 별칭
  projectId String

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, code])
  @@map("languages")
}
```

**기존 Organization 모델 변경:**

```prisma
model Organization {
  // ... 기존 필드 유지
  projects Project[]  // 신규 관계 추가
}
```

**noCodeConfig JSON 구조 (TypeScript 타입):**

```typescript
interface NoCodeConfig {
  type: 'click' | 'pageView' | 'exitIntent' | 'fiftyPercentScroll';
  urlFilters?: UrlFilter[];
  urlFiltersConnector?: 'or' | 'and'; // 기본값: 'or'
  cssSelector?: string;   // click 유형 전용
  innerHtml?: string;     // click 유형 전용
}

interface UrlFilter {
  value: string;  // trim 후 최소 1자
  rule: 'exactMatch' | 'contains' | 'startsWith' | 'endsWith' | 'notMatch' | 'notContains' | 'matchesRegex';
}
```

**Project Styling JSON 구조 (TypeScript 타입):**

```typescript
interface ProjectStyling {
  allowStyleOverride: boolean;  // 기본값: true
  brandColor?: string;
  cardBackgroundColor?: string;
  cardBorderColor?: string;
  roundness?: number;
  background?: Record<string, unknown>;
  hideProgressBar?: boolean;
  isLogoHidden?: boolean;
}
```

### 2.3 API 설계

기존 패턴을 따라 NestJS Controller + Service 구조를 사용한다.

#### 2.3.1 Project API

| 메서드 | 경로 | 설명 | 인증 | 권한 |
|--------|------|------|------|------|
| POST | `/api/projects` | Project 생성 | JWT 필수 | OWNER/ADMIN |
| GET | `/api/projects/:projectId` | Project 상세 조회 | JWT 필수 | 조직 멤버 |
| GET | `/api/organizations/:orgId/projects` | Organization 내 Project 목록 | JWT 필수 | 조직 멤버 |
| PATCH | `/api/projects/:projectId` | Project 수정 | JWT 필수 | OWNER/ADMIN |
| DELETE | `/api/projects/:projectId` | Project 삭제 | JWT 필수 | OWNER |

**요청/응답 예시:**

```
POST /api/projects
Request:
{
  "name": "My Product",
  "organizationId": "cuid2_org_id",
  "recontactDays": 7,       // optional
  "placement": "bottomRight" // optional
}
Response (201):
{
  "id": "cuid2_project_id",
  "name": "My Product",
  "organizationId": "cuid2_org_id",
  "recontactDays": 7,
  "placement": "bottomRight",
  "darkOverlay": "none",
  "clickOutsideClose": true,
  "inAppSurveyBranding": true,
  "linkSurveyBranding": true,
  "styling": { "allowStyleOverride": true },
  "config": null,
  "logo": null,
  "environments": [
    { "id": "cuid_env_1", "type": "production", "appSetupCompleted": false },
    { "id": "cuid_env_2", "type": "development", "appSetupCompleted": false }
  ],
  "createdAt": "2026-02-22T...",
  "updatedAt": "2026-02-22T..."
}

PATCH /api/projects/:projectId
Request:
{
  "name": "Updated Name",     // optional
  "recontactDays": 14,        // optional
  "styling": {                 // optional
    "allowStyleOverride": true,
    "brandColor": "#FF5733"
  }
}
Response (200): 수정된 Project 전체 객체

DELETE /api/projects/:projectId
Response (200): { "id": "삭제된 Project ID" }
```

#### 2.3.2 Environment API

| 메서드 | 경로 | 설명 | 인증 | 권한 |
|--------|------|------|------|------|
| GET | `/api/projects/:projectId/environments` | Environment 목록 조회 | JWT 필수 | 조직 멤버 |
| GET | `/api/environments/:environmentId` | Environment 상세 조회 | JWT 필수 | 조직 멤버 |

#### 2.3.3 ActionClass API

| 메서드 | 경로 | 설명 | 인증 | 권한 |
|--------|------|------|------|------|
| POST | `/api/environments/:environmentId/action-classes` | ActionClass 생성 | JWT 필수 | OWNER/ADMIN/MEMBER |
| GET | `/api/environments/:environmentId/action-classes` | ActionClass 목록 조회 | JWT 필수 | 조직 멤버 |
| GET | `/api/action-classes/:actionClassId` | ActionClass 상세 조회 | JWT 필수 | 조직 멤버 |
| PATCH | `/api/action-classes/:actionClassId` | ActionClass 수정 | JWT 필수 | OWNER/ADMIN/MEMBER |
| DELETE | `/api/action-classes/:actionClassId` | ActionClass 삭제 | JWT 필수 | OWNER/ADMIN |

**ActionClass 생성 요청 예시 (code 타입):**

```json
{
  "name": "Button Click",
  "type": "code",
  "key": "button_click_cta",
  "description": "CTA 버튼 클릭 이벤트"
}
```

**ActionClass 생성 요청 예시 (noCode 타입):**

```json
{
  "name": "Pricing Page View",
  "type": "noCode",
  "noCodeConfig": {
    "type": "pageView",
    "urlFilters": [
      { "value": "/pricing", "rule": "contains" }
    ],
    "urlFiltersConnector": "or"
  }
}
```

#### 2.3.4 Language API

| 메서드 | 경로 | 설명 | 인증 | 권한 |
|--------|------|------|------|------|
| POST | `/api/projects/:projectId/languages` | Language 등록 | JWT 필수 | OWNER/ADMIN |
| GET | `/api/projects/:projectId/languages` | Language 목록 조회 | JWT 필수 | 조직 멤버 |
| PATCH | `/api/languages/:languageId` | Language 수정 | JWT 필수 | OWNER/ADMIN |
| DELETE | `/api/languages/:languageId` | Language 삭제 | JWT 필수 | OWNER/ADMIN |

### 2.4 주요 컴포넌트 설계

#### 2.4.1 서버 측 (`libs/server/project/`)

**ProjectService 주요 메서드:**

```typescript
class ProjectService {
  /**
   * Project 생성 + Environment 2개 자동 생성 (단일 트랜잭션).
   * Organization 내 이름 고유성 검증 후, Project 레코드와 함께
   * production/development Environment를 원자적으로 생성한다.
   */
  createProject(userId: string, dto: CreateProjectDto): Promise<ProjectWithEnvironments>

  /** Project ID로 상세 정보 조회 (환경 목록, 언어 목록 포함) */
  getProject(projectId: string): Promise<ProjectWithRelations | null>

  /** Organization ID로 해당 조직의 전체 Project 목록 조회 */
  getProjectsByOrganizationId(organizationId: string): Promise<Project[]>

  /**
   * Project 부분 수정 (Partial Update).
   * 이름 변경 시 동일 Organization 내 중복 검증 수행.
   */
  updateProject(projectId: string, dto: UpdateProjectDto): Promise<Project>

  /** Project 삭제 (DB Cascade로 하위 데이터 자동 삭제) */
  deleteProject(projectId: string): Promise<{ id: string }>
}
```

**EnvironmentService 주요 메서드:**

```typescript
class EnvironmentService {
  /** Project에 속한 Environment 목록 조회 */
  getEnvironmentsByProjectId(projectId: string): Promise<Environment[]>

  /** Environment ID로 상세 정보 조회 */
  getEnvironment(environmentId: string): Promise<Environment | null>

  /**
   * Environment ID로부터 소속 Organization ID를 역추적.
   * 권한 검증에 사용한다.
   */
  getOrganizationIdByEnvironmentId(environmentId: string): Promise<string | null>
}
```

**ActionClassService 주요 메서드:**

```typescript
class ActionClassService {
  /**
   * ActionClass 생성.
   * code 타입: key 필수, (key, environmentId) 고유성 검증
   * noCode 타입: noCodeConfig 필수, click 유형 시 cssSelector/innerHtml 검증
   */
  createActionClass(environmentId: string, dto: CreateActionClassDto): Promise<ActionClass>

  /** Environment에 속한 ActionClass 목록 (createdAt 정렬) */
  getActionClassesByEnvironmentId(environmentId: string): Promise<ActionClass[]>

  /** ActionClass ID로 상세 조회 */
  getActionClass(actionClassId: string): Promise<ActionClass | null>

  /** ActionClass 부분 수정 (type 변경 불가) */
  updateActionClass(actionClassId: string, dto: UpdateActionClassDto): Promise<ActionClass>

  /** ActionClass 삭제 (연결된 SurveyTrigger 연쇄 삭제) */
  deleteActionClass(actionClassId: string): Promise<{ id: string }>
}
```

**LanguageService 주요 메서드:**

```typescript
class LanguageService {
  /** Language 등록. (projectId, code) 고유성 검증 */
  createLanguage(projectId: string, dto: CreateLanguageDto): Promise<Language>

  /** Project에 속한 Language 목록 조회 */
  getLanguagesByProjectId(projectId: string): Promise<Language[]>

  /** Language 별칭 수정 */
  updateLanguage(languageId: string, dto: UpdateLanguageDto): Promise<Language>

  /** Language 삭제 */
  deleteLanguage(languageId: string): Promise<{ id: string }>
}
```

#### 2.4.2 권한 검증 전략

Project와 관련된 API는 Organization의 역할을 기반으로 권한을 검증한다. 이를 위해 요청 경로에서 Organization ID를 역추적하는 방식이 필요하다.

```
Project API:
  projectId -> Project.organizationId -> Membership(userId, organizationId) -> role 검증

Environment API:
  environmentId -> Environment.projectId -> Project.organizationId -> Membership -> role 검증

ActionClass API:
  actionClassId -> ActionClass.environmentId -> Environment.projectId -> Project.organizationId -> Membership -> role 검증
```

이를 위해 기존 `OrgRoleGuard`를 확장하여 다양한 경로 파라미터에서 Organization ID를 추출할 수 있도록 한다. 또는 각 컨트롤러에서 서비스 레이어를 통해 Organization 소속 여부를 직접 검증하는 방식을 사용한다.

**결정:** 서비스 레이어에서 `getOrganizationIdBy*` 헬퍼를 제공하고, 가드에서 이를 활용하는 방식으로 구현한다. 이는 기존 OrgRoleGuard 패턴을 확장하는 방식이다.

#### 2.4.3 클라이언트 측 (`libs/client/project/`)

```
libs/client/project/
├── package.json
├── tsconfig.json
├── tsconfig.lib.json
├── src/
│   ├── index.ts
│   └── lib/
│       ├── project-context.tsx         -- ProjectProvider, useProject 훅
│       ├── create-project-form.tsx     -- 프로젝트 생성 폼
│       ├── project-settings.tsx        -- 프로젝트 일반 설정 (이름, 재접촉 일수, 위젯 배치 등)
│       ├── project-styling-form.tsx    -- 스타일링 설정 폼
│       ├── environment-switcher.tsx    -- production/development 전환 토글
│       ├── action-class-form.tsx       -- ActionClass 생성/수정 폼 (code/noCode 분기)
│       ├── action-class-list.tsx       -- ActionClass 목록 (테이블)
│       ├── language-manager.tsx        -- 언어 등록/수정/삭제 UI
│       ├── delete-project-dialog.tsx   -- 프로젝트 삭제 확인 모달
│       ├── schemas/
│       │   ├── project.schema.ts       -- zod 스키마 (폼 검증)
│       │   ├── action-class.schema.ts
│       │   └── language.schema.ts
│       └── types/
│           └── project.types.ts        -- 타입 정의
```

### 2.5 기존 시스템 영향도 분석

| 기존 파일/모듈 | 변경 내용 | 영향도 |
|---------------|----------|--------|
| `packages/db/prisma/schema.prisma` | Project, Environment, ActionClass, Language 모델 추가 + Organization에 projects 관계 추가 + 6개 Enum 추가 | 높음 - DB 마이그레이션 필요 |
| `apps/server/src/app/app.module.ts` | ProjectModule import 추가 | 낮음 |
| `apps/server/package.json` | `@inquiry/server-project` 워크스페이스 의존성 추가 | 낮음 |
| `apps/client/src/app/[lng]/layout.tsx` | ProjectProvider 추가 (또는 projects 레이아웃에서 처리) | 중간 |
| `apps/client/src/app/i18n/locales/ko/translation.json` | project 관련 번역 키 추가 | 낮음 |
| `apps/client/src/app/i18n/locales/en/translation.json` | project 관련 번역 키 추가 | 낮음 |
| `tsconfig.base.json` 또는 패키지 설정 | `@inquiry/server-project`, `@inquiry/client-project` 경로 별칭 추가 | 낮음 |
| `libs/server/organization/` (OrgRoleGuard) | Environment/ActionClass 경로 파라미터에서도 Organization ID를 역추적할 수 있도록 확장 | 중간 |
| `libs/client/ui/` | Select, Switch, Tabs 등 추가 shadcn/ui 컴포넌트 필요 시 추가 | 낮음 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|----------|
| T-01 | Prisma 스키마 추가 | Project, Environment, ActionClass, Language 모델 + Enum 추가, Organization에 projects 관계 추가 | 없음 | 중간 | 1.5h |
| T-02 | DB 마이그레이션 실행 | `prisma migrate dev`로 스키마 변경 적용 및 Prisma Client 재생성 | T-01 | 낮음 | 0.25h |
| T-03 | 서버 라이브러리 scaffolding | `libs/server/project` 패키지 구조 생성 (package.json, tsconfig, index.ts, 모듈 파일) | 없음 | 낮음 | 0.5h |
| T-04 | Enum 및 타입 정의 | 서버 측 Enum 상수, TypeScript 타입 인터페이스 (NoCodeConfig, ProjectStyling, ProjectConfig 등) | T-01 | 낮음 | 0.5h |
| T-05 | Project DTO 정의 | CreateProjectDto, UpdateProjectDto (class-validator + class-transformer) | T-04 | 중간 | 1h |
| T-06 | ActionClass DTO 정의 | CreateActionClassDto, UpdateActionClassDto (code/noCode 분기 검증 포함) | T-04 | 높음 | 1.5h |
| T-07 | Language DTO 정의 | CreateLanguageDto, UpdateLanguageDto | T-04 | 낮음 | 0.5h |
| T-08 | ProjectService 구현 | 생성 (트랜잭션 포함), 조회, 수정, 삭제 비즈니스 로직 | T-02, T-05 | 높음 | 3h |
| T-09 | EnvironmentService 구현 | 환경 목록 조회, 상세 조회, Organization ID 역추적 헬퍼 | T-02 | 중간 | 1h |
| T-10 | ActionClassService 구현 | 생성 (code/noCode 분기), 조회, 수정, 삭제, 고유성 검증 | T-02, T-06 | 높음 | 2.5h |
| T-11 | LanguageService 구현 | 등록, 목록 조회, 수정, 삭제, 코드 고유성 검증 | T-02, T-07 | 중간 | 1h |
| T-12 | OrgRoleGuard 확장 | 기존 OrgRoleGuard를 확장하여 projectId, environmentId, actionClassId, languageId 파라미터에서 Organization ID 역추적 지원 | T-09 | 높음 | 2h |
| T-13 | ProjectController 구현 | Project CRUD REST 엔드포인트 5개 | T-08, T-12 | 중간 | 1.5h |
| T-14 | EnvironmentController 구현 | Environment 조회 REST 엔드포인트 2개 | T-09, T-12 | 낮음 | 0.5h |
| T-15 | ActionClassController 구현 | ActionClass CRUD REST 엔드포인트 5개 | T-10, T-12 | 중간 | 1.5h |
| T-16 | LanguageController 구현 | Language CRUD REST 엔드포인트 4개 | T-11, T-12 | 낮음 | 0.5h |
| T-17 | ProjectModule 등록 | NestJS 모듈 정의 및 AppModule에 등록 | T-13~T-16 | 낮음 | 0.5h |
| T-18 | 서버 빌드 검증 | 서버 빌드 성공 확인 | T-17 | 낮음 | 0.25h |
| T-19 | 클라이언트 라이브러리 scaffolding | `libs/client/project` 패키지 구조 생성 | 없음 | 낮음 | 0.5h |
| T-20 | 클라이언트 타입 및 zod 스키마 정의 | Project, Environment, ActionClass, Language 타입 + zod 폼 검증 스키마 | T-19 | 중간 | 1.5h |
| T-21 | i18n 번역 키 추가 | project 네임스페이스의 ko/en 번역 키 추가 | 없음 | 낮음 | 1h |
| T-22 | shadcn/ui 컴포넌트 추가 | Dialog, Select, Switch, Tabs, Badge, Tooltip 등 필요한 UI 컴포넌트 추가 | 없음 | 낮음 | 0.5h |
| T-23 | Project Context 구현 | ProjectProvider, useProject 훅 (현재 프로젝트/환경 상태 관리) | T-19, T-17 | 중간 | 2h |
| T-24 | Project 생성 폼 구현 | 이름 입력 + 선택적 설정 (채널, 산업) + 생성 API 호출 | T-20, T-21, T-22, T-23 | 중간 | 2h |
| T-25 | Project 설정 페이지 - 일반 | 이름, 재접촉 일수, 위젯 배치, 오버레이, 외부 클릭 닫기, 브랜딩 설정 수정 폼 | T-23, T-21 | 중간 | 2.5h |
| T-26 | Project Styling 설정 폼 구현 | 브랜드 색상, 카드 배경/테두리, 둥글기, 진행률 바, 로고 숨김 등 | T-23, T-21 | 높음 | 2.5h |
| T-27 | Environment 전환 UI 구현 | production/development 전환 토글/드롭다운 | T-23, T-21 | 중간 | 1h |
| T-28 | ActionClass 목록 UI 구현 | Environment별 ActionClass 테이블 (타입 아이콘, 이름, key, 생성일 등) | T-23, T-21 | 중간 | 1.5h |
| T-29 | ActionClass 생성/수정 폼 구현 | code/noCode 타입 분기, noCode 하위 유형 선택, URL 필터 동적 추가/삭제 | T-20, T-21, T-22 | 높음 | 3h |
| T-30 | Language 관리 UI 구현 | 언어 등록/수정/삭제 (언어 코드 선택 + 별칭 입력) | T-23, T-21 | 중간 | 1.5h |
| T-31 | Project 삭제 확인 모달 구현 | Cascade 삭제 경고 + 프로젝트 이름 입력 확인 | T-22, T-21 | 중간 | 1h |
| T-32 | 클라이언트 라우트 설정 | projects 관련 Next.js 페이지 라우트 생성 | T-24~T-31 | 낮음 | 1h |
| T-33 | 클라이언트 빌드 검증 | 클라이언트 빌드 성공 확인 | T-32 | 낮음 | 0.25h |

**총 예상 시간: 약 37.75시간 (5~6일)**

### 3.2 구현 순서 및 마일스톤

#### 마일스톤 1: 데이터 레이어 및 기반 구축 (약 3.25시간)

**목표:** DB 스키마 완성, 서버 라이브러리 구조 준비

1. T-01: Prisma 스키마 추가
2. T-02: DB 마이그레이션 실행
3. T-03: 서버 라이브러리 scaffolding
4. T-04: Enum 및 타입 정의

**검증:** `pnpm db:generate` 성공, 새 모델이 Prisma Client 타입에 반영됨, 서버 라이브러리 패키지 인식 확인

#### 마일스톤 2: 서버 DTO 및 서비스 레이어 (약 9.5시간)

**목표:** 핵심 비즈니스 로직 완성

5. T-05: Project DTO 정의
6. T-06: ActionClass DTO 정의
7. T-07: Language DTO 정의
8. T-08: ProjectService 구현 (트랜잭션 포함)
9. T-09: EnvironmentService 구현
10. T-10: ActionClassService 구현
11. T-11: LanguageService 구현

**검증:** 서비스 레이어 단위 테스트 통과 (Prisma mock)

#### 마일스톤 3: 서버 API 엔드포인트 완성 (약 6.25시간)

**목표:** 모든 REST API 동작 확인

12. T-12: OrgRoleGuard 확장
13. T-13: ProjectController 구현
14. T-14: EnvironmentController 구현
15. T-15: ActionClassController 구현
16. T-16: LanguageController 구현
17. T-17: ProjectModule 등록
18. T-18: 서버 빌드 검증

**검증:** T-18 서버 빌드 성공, cURL/Postman으로 모든 API 엔드포인트 동작 확인

#### 마일스톤 4: 클라이언트 기반 구축 (약 5.5시간)

**목표:** 클라이언트 라이브러리 및 상태 관리 준비

19. T-19: 클라이언트 라이브러리 scaffolding
20. T-20: 클라이언트 타입 및 zod 스키마 정의
21. T-21: i18n 번역 키 추가
22. T-22: shadcn/ui 컴포넌트 추가
23. T-23: Project Context 구현

**검증:** 클라이언트 빌드 성공, ProjectProvider 마운트 확인

#### 마일스톤 5: 클라이언트 UI 구현 (약 13.25시간)

**목표:** 프로젝트/환경/ActionClass/Language 관련 전체 UI 동작

24. T-24: Project 생성 폼
25. T-25: Project 설정 페이지 - 일반
26. T-26: Project Styling 설정 폼
27. T-27: Environment 전환 UI
28. T-28: ActionClass 목록 UI
29. T-29: ActionClass 생성/수정 폼
30. T-30: Language 관리 UI
31. T-31: Project 삭제 확인 모달
32. T-32: 클라이언트 라우트 설정
33. T-33: 클라이언트 빌드 검증

**검증:** T-33 클라이언트 빌드 성공, E2E 시나리오(프로젝트 생성 -> 환경 전환 -> ActionClass 생성 -> 설정 변경 -> 삭제) 수동 확인

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 내용 요약 |
|-----------|----------|---------------|
| **데이터 레이어** | | |
| `packages/db/prisma/schema.prisma` | 수정 | Project, Environment, ActionClass, Language 모델 + 6개 Enum 추가, Organization에 projects 관계 추가 |
| **서버 라이브러리 - 구조** | | |
| `libs/server/project/package.json` | 생성 | 패키지 메타데이터 (@inquiry/server-project) |
| `libs/server/project/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/project/tsconfig.lib.json` | 생성 | 라이브러리 빌드용 TypeScript 설정 |
| `libs/server/project/src/index.ts` | 생성 | 모듈 진입점 (export) |
| **서버 라이브러리 - Enum/타입** | | |
| `libs/server/project/src/lib/enums/project.enums.ts` | 생성 | 서버 Enum 상수 (NoCodeType, UrlFilterRule 등) |
| `libs/server/project/src/lib/types/project.types.ts` | 생성 | NoCodeConfig, ProjectStyling, ProjectConfig 인터페이스 |
| **서버 라이브러리 - DTO** | | |
| `libs/server/project/src/lib/dto/create-project.dto.ts` | 생성 | Project 생성 입력 DTO |
| `libs/server/project/src/lib/dto/update-project.dto.ts` | 생성 | Project 수정 입력 DTO (Partial) |
| `libs/server/project/src/lib/dto/create-action-class.dto.ts` | 생성 | ActionClass 생성 DTO (code/noCode 분기) |
| `libs/server/project/src/lib/dto/update-action-class.dto.ts` | 생성 | ActionClass 수정 DTO |
| `libs/server/project/src/lib/dto/create-language.dto.ts` | 생성 | Language 등록 DTO |
| `libs/server/project/src/lib/dto/update-language.dto.ts` | 생성 | Language 수정 DTO |
| **서버 라이브러리 - 서비스** | | |
| `libs/server/project/src/lib/services/project.service.ts` | 생성 | Project CRUD 비즈니스 로직 |
| `libs/server/project/src/lib/services/environment.service.ts` | 생성 | Environment 조회, Organization ID 역추적 |
| `libs/server/project/src/lib/services/action-class.service.ts` | 생성 | ActionClass CRUD, code/noCode 검증 |
| `libs/server/project/src/lib/services/language.service.ts` | 생성 | Language CRUD |
| **서버 라이브러리 - 컨트롤러** | | |
| `libs/server/project/src/lib/controllers/project.controller.ts` | 생성 | `/api/projects` 엔드포인트 |
| `libs/server/project/src/lib/controllers/environment.controller.ts` | 생성 | `/api/projects/:id/environments`, `/api/environments/:id` 엔드포인트 |
| `libs/server/project/src/lib/controllers/action-class.controller.ts` | 생성 | `/api/environments/:id/action-classes`, `/api/action-classes/:id` 엔드포인트 |
| `libs/server/project/src/lib/controllers/language.controller.ts` | 생성 | `/api/projects/:id/languages`, `/api/languages/:id` 엔드포인트 |
| **서버 라이브러리 - 모듈** | | |
| `libs/server/project/src/lib/project.module.ts` | 생성 | NestJS 모듈 정의 |
| **서버 앱 수정** | | |
| `apps/server/src/app/app.module.ts` | 수정 | ProjectModule import 추가 |
| `apps/server/package.json` | 수정 | @inquiry/server-project 워크스페이스 의존성 추가 |
| **OrgRoleGuard 확장** | | |
| `libs/server/organization/src/lib/guards/org-role.guard.ts` | 수정 | projectId, environmentId, actionClassId, languageId 파라미터에서 Organization ID 역추적 로직 추가 |
| **클라이언트 라이브러리 - 구조** | | |
| `libs/client/project/package.json` | 생성 | 패키지 메타데이터 (@inquiry/client-project) |
| `libs/client/project/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/client/project/tsconfig.lib.json` | 생성 | 라이브러리 빌드용 TypeScript 설정 |
| `libs/client/project/src/index.ts` | 생성 | 모듈 진입점 (export) |
| **클라이언트 라이브러리 - 타입/스키마** | | |
| `libs/client/project/src/lib/types/project.types.ts` | 생성 | 클라이언트 타입 정의 |
| `libs/client/project/src/lib/schemas/project.schema.ts` | 생성 | Project 폼 zod 스키마 |
| `libs/client/project/src/lib/schemas/action-class.schema.ts` | 생성 | ActionClass 폼 zod 스키마 |
| `libs/client/project/src/lib/schemas/language.schema.ts` | 생성 | Language 폼 zod 스키마 |
| **클라이언트 라이브러리 - 컴포넌트** | | |
| `libs/client/project/src/lib/project-context.tsx` | 생성 | ProjectProvider, useProject 훅 |
| `libs/client/project/src/lib/create-project-form.tsx` | 생성 | 프로젝트 생성 폼 |
| `libs/client/project/src/lib/project-settings.tsx` | 생성 | 프로젝트 일반 설정 |
| `libs/client/project/src/lib/project-styling-form.tsx` | 생성 | 스타일링 설정 폼 |
| `libs/client/project/src/lib/environment-switcher.tsx` | 생성 | 환경 전환 UI |
| `libs/client/project/src/lib/action-class-form.tsx` | 생성 | ActionClass 생성/수정 폼 |
| `libs/client/project/src/lib/action-class-list.tsx` | 생성 | ActionClass 목록 |
| `libs/client/project/src/lib/language-manager.tsx` | 생성 | 언어 관리 UI |
| `libs/client/project/src/lib/delete-project-dialog.tsx` | 생성 | 삭제 확인 모달 |
| **클라이언트 페이지 라우트** | | |
| `apps/client/src/app/[lng]/projects/page.tsx` | 생성 | 프로젝트 목록 페이지 (리다이렉트용) |
| `apps/client/src/app/[lng]/projects/new/page.tsx` | 생성 | 프로젝트 생성 페이지 |
| `apps/client/src/app/[lng]/projects/[projectId]/page.tsx` | 생성 | 프로젝트 대시보드 |
| `apps/client/src/app/[lng]/projects/[projectId]/settings/page.tsx` | 생성 | 프로젝트 설정 페이지 |
| `apps/client/src/app/[lng]/projects/[projectId]/environments/[envId]/page.tsx` | 생성 | 환경 대시보드 |
| `apps/client/src/app/[lng]/projects/[projectId]/environments/[envId]/action-classes/page.tsx` | 생성 | ActionClass 목록 페이지 |
| `apps/client/src/app/[lng]/projects/[projectId]/environments/[envId]/action-classes/new/page.tsx` | 생성 | ActionClass 생성 페이지 |
| `apps/client/src/app/[lng]/projects/layout.tsx` | 생성 | Projects 레이아웃 |
| **shadcn/ui 컴포넌트** | | |
| `libs/client/ui/src/components/ui/dialog.tsx` | 생성 | Dialog 컴포넌트 (삭제 확인용) |
| `libs/client/ui/src/components/ui/select.tsx` | 생성 | Select 컴포넌트 (언어 선택, 위젯 배치 등) |
| `libs/client/ui/src/components/ui/switch.tsx` | 생성 | Switch 컴포넌트 (토글 설정) |
| `libs/client/ui/src/components/ui/tabs.tsx` | 생성 | Tabs 컴포넌트 (설정 페이지 탭) |
| `libs/client/ui/src/components/ui/badge.tsx` | 생성 | Badge 컴포넌트 (환경 라벨) |
| `libs/client/ui/src/components/ui/tooltip.tsx` | 생성 | Tooltip 컴포넌트 (도움말) |
| `libs/client/ui/src/components/ui/textarea.tsx` | 생성 | Textarea 컴포넌트 (ActionClass 설명) |
| `libs/client/ui/src/index.ts` | 수정 | 새 UI 컴포넌트 export 추가 |
| **i18n** | | |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | project 네임스페이스 번역 키 추가 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | project 네임스페이스 번역 키 추가 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 발생 확률 | 완화 전략 |
|--------|------|----------|----------|
| OrgRoleGuard 미구현 (Organization 관리 미완성) | 높음 | 중간 | Organization 관리 구현이 선행되지 않았을 경우, 본 구현에서 최소한의 OrgRoleGuard를 직접 구현한다. 기존 JwtAuthGuard + Membership 조회 조합으로 대체 가능하다. |
| Prisma `@default(cuid(2))` 미지원 | 중간 | 낮음 | Prisma 7.x에서 cuid(2)를 지원하는지 사전 검증한다. 미지원 시 `@default(cuid())`로 통일하고, CUID2가 반드시 필요한 곳에서는 애플리케이션 레벨에서 `@paralleldrive/cuid2` 패키지로 생성한다. |
| Project 생성 트랜잭션 실패 시 부분 생성 | 높음 | 낮음 | `prisma.$transaction()` 내에서 Project + Environment 2개를 생성한다. 트랜잭션 실패 시 전체 롤백되어 부분 생성이 방지된다. |
| ActionClass noCodeConfig JSON 검증 누락 | 중간 | 중간 | class-validator의 `@ValidateNested()` + `@Type()`으로 중첩 DTO를 검증한다. 추가로 서비스 레이어에서 비즈니스 규칙 검증(click 유형의 cssSelector/innerHtml 필수 등)을 수행한다. |
| Environment ID를 통한 Organization ID 역추적 성능 | 중간 | 낮음 | Environment -> Project -> Organization 3단 JOIN이 필요하다. 인덱스가 이미 설정되어 있어 성능 이슈는 없을 것으로 예상되나, 부하 테스트 시 확인한다. |
| Cascade 삭제 시 대량 데이터 영향 | 중간 | 낮음 | DB 레벨 `ON DELETE CASCADE`를 사용하므로 애플리케이션 타임아웃 없이 처리된다. 그러나 대량의 Survey/Contact 데이터가 있는 Project 삭제 시 DB 부하가 발생할 수 있다. 향후 필요 시 배치 삭제나 소프트 삭제로 전환한다. |
| ActionClass의 (key, environmentId) unique 제약 중 key=null 허용 | 중간 | 중간 | PostgreSQL에서 NULL은 유니크 제약에서 제외된다. noCode 타입의 key=null 레코드가 여러 개 존재 가능하므로, 유니크 제약이 code 타입에만 실질적으로 적용된다. 이는 명세서 의도와 일치한다. |
| 클라이언트-서버 타입 불일치 | 중간 | 중간 | 클라이언트 zod 스키마와 서버 class-validator DTO의 검증 규칙을 수동 동기화한다. 장기적으로는 공유 타입 패키지 또는 OpenAPI codegen 도입을 고려한다. |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 테스트 대상 | 테스트 항목 | 비고 |
|------------|-----------|------|
| **ProjectService.createProject** | 정상 생성 시 Project + Environment 2개 반환, 기본값(recontactDays=7, placement=bottomRight 등) 확인, 트랜잭션 원자성 검증, 이름 trim 처리, 동일 Organization 이름 중복 시 에러 | PrismaService mock + $transaction mock |
| **ProjectService.updateProject** | 부분 업데이트 동작, 이름 중복 검증(이름 변경 시만), recontactDays 범위(0~365) 초과 시 에러, config.channel/industry 허용값 검증 | PrismaService mock |
| **ProjectService.deleteProject** | 삭제 성공, 존재하지 않는 Project 404, 감사 로그 기록 확인 | PrismaService mock |
| **ActionClassService.createActionClass** | code 타입: key 필수 검증, key 고유성 검증, 이름 고유성 검증 / noCode 타입: noCodeConfig 필수 검증, click 유형 cssSelector/innerHtml 필수 검증, URL 필터 규칙 검증(7가지 허용값), URL 필터 value trim 후 빈 문자열 거부 | PrismaService mock |
| **ActionClassService.updateActionClass** | 부분 수정 동작, type 변경 시도 거부, 이름/key 고유성 재검증 | PrismaService mock |
| **LanguageService.createLanguage** | 정상 등록, 동일 Project 내 같은 코드 중복 시 에러 | PrismaService mock |
| **CreateProjectDto** | name 빈 문자열 거부, name trim 동작, recontactDays 범위 검증, placement/darkOverlay enum 검증 | class-validator |
| **CreateActionClassDto** | code 타입 key 필수, noCode 타입 noCodeConfig 필수, noCode.type enum 검증 | class-validator |
| **OrgRoleGuard (확장부분)** | projectId로 Organization ID 역추적 성공, environmentId로 역추적 성공, actionClassId로 역추적 성공, 존재하지 않는 리소스 시 403 반환 | Service mock |

### 5.2 통합 테스트

| 테스트 대상 | 테스트 시나리오 | 비고 |
|------------|---------------|------|
| POST /api/projects | 인증된 OWNER/ADMIN이 프로젝트 생성 -> 201, environments 2개 포함 확인, MEMBER가 생성 시도 -> 403 | TestDB + JWT |
| GET /api/projects/:id | 조직 멤버 조회 성공, 비멤버 조회 -> 403, 존재하지 않는 ID -> 404 | TestDB + JWT |
| GET /api/organizations/:orgId/projects | 조직 내 프로젝트 목록 반환, 빈 목록 반환 | TestDB + JWT |
| PATCH /api/projects/:id | OWNER/ADMIN 수정 성공, 이름 중복 -> 409, MEMBER 수정 시도 -> 403 | TestDB + JWT |
| DELETE /api/projects/:id | OWNER 삭제 성공 + Cascade 확인 (Environment, ActionClass 등 삭제됨), ADMIN 삭제 -> 403 | TestDB + JWT |
| POST /api/environments/:envId/action-classes | code 타입 생성 성공, noCode 타입 생성 성공 (pageView + urlFilter), click 유형 cssSelector 미제공 -> 400, key 중복 -> 409 | TestDB + JWT |
| GET /api/environments/:envId/action-classes | 해당 환경의 ActionClass만 반환, createdAt 기준 정렬, 다른 환경 데이터 미포함 (격리 검증) | TestDB + JWT |
| POST /api/projects/:projectId/languages | 정상 등록, 동일 코드 중복 -> 409 | TestDB + JWT |
| 환경별 데이터 격리 검증 | production 환경에 ActionClass 생성 -> development 환경에서 조회 시 미포함 확인 | TestDB + JWT |

### 5.3 E2E 테스트 (수동)

| 시나리오 | 검증 항목 |
|---------|----------|
| 프로젝트 생성 플로우 | 생성 폼 입력 -> 생성 완료 -> 프로젝트 대시보드 리다이렉트 -> production/development 환경 존재 확인 |
| 프로젝트 설정 변경 | 이름 변경 -> 저장 -> 새 이름 반영, 재접촉 일수/위젯 배치 변경, 스타일링 색상 변경 |
| 환경 전환 | production에서 development로 전환 -> 데이터(ActionClass)가 격리되어 표시됨 확인 |
| ActionClass 생성 (code) | code 타입 선택 -> 이름/key 입력 -> 생성 -> 목록에 표시 |
| ActionClass 생성 (noCode) | noCode 타입 선택 -> pageView 유형 + URL 필터 추가 -> 생성 -> 목록에 표시 |
| ActionClass 생성 (noCode - click) | click 유형 선택 -> CSS 선택자 입력 -> 생성 성공 / CSS 선택자+innerHtml 모두 미입력 -> 에러 표시 |
| 언어 관리 | 한국어(ko) 등록 -> 목록에 표시 -> 별칭 수정 -> 삭제 |
| 프로젝트 삭제 | 삭제 모달 열기 -> 경고 메시지 확인 -> 프로젝트 이름 입력 -> 삭제 완료 -> 목록에서 제거됨 |
| 권한 분리 | OWNER: 프로젝트 삭제 가능, ADMIN: 수정 가능/삭제 불가, MEMBER: 조회만 가능 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 설명 |
|------|------|
| Survey/Contact/Tag 등 하위 모델 미구현 | Environment에 격리되어야 할 9종 데이터 중 ActionClass만 본 단계에서 구현한다. Survey, Contact, ContactAttributeKey, Webhook, Tag, Segment, Integration, ApiKey는 해당 기능 명세 구현 시 Environment 관계를 추가한다. |
| SurveyTrigger 연쇄 삭제 | Survey 모델이 없으므로 ActionClass 삭제 시 SurveyTrigger 연쇄 삭제는 스텁으로 남긴다. Survey 구현(FSD-008) 시 활성화한다. |
| ProjectTeam | Team 모델이 없으므로 Project-Team 관계는 현재 구현에서 제외한다. Team 기능 구현 시 추가한다. |
| customHeadScript Self-hosted 제한 | `IS_SELF_HOSTED` 환경변수를 통한 제어를 구현하지만, Self-hosted 배포 인프라 자체는 현재 범위 밖이다. |
| SDK 연동 | Environment ID를 통한 SDK 초기화는 SDK 기능(FSD-007) 구현 시 처리한다. 현재는 Environment ID 발급까지만 지원한다. |
| API Key Environment 귀속 | API Key 모델이 없으므로 현재 미구현. REST API 기능(FSD-024) 구현 시 Environment와의 관계를 설정한다. |
| 프로젝트 수 제한 | Organization Billing의 projects 제한은 Organization 관리(FSD-003) + 구독(FSD-029) 구현 후 적용한다. 현재는 무제한 생성 가능. |
| 데이터 모드 (surveys/cx) | mode 필드는 스키마에 존재하나, 현재 UI에서 노출하지 않고 기본값(surveys)만 사용한다. |

### 6.2 잠재적 향후 개선사항

| 항목 | 설명 |
|------|------|
| 프로젝트 검색/필터 | Organization 내 프로젝트가 많아질 경우 이름 검색, 생성일 필터 기능 추가 |
| 프로젝트 복제 | 기존 프로젝트의 설정/ActionClass를 복제하여 새 프로젝트 생성 |
| 환경 간 데이터 복사 | development -> production으로 ActionClass 등을 복사하는 기능 |
| 환경 변수 관리 | 환경별 커스텀 변수(feature flag 등) 관리 기능 |
| ActionClass 일괄 가져오기/내보내기 | JSON/CSV 형식으로 ActionClass 정의를 일괄 관리 |
| 프로젝트 아카이브 | 삭제 대신 비활성화(아카이브) 기능으로 데이터 보존 |
| OpenAPI/Swagger 자동 문서 | NestJS Swagger 모듈 도입으로 Project API 문서 자동 생성 |
| 공유 타입 패키지 | `packages/shared-types`에 Project 관련 타입을 추출하여 클라이언트-서버 간 동기화 |

---

## 7. i18n 고려사항

### 추가/변경이 필요한 번역 키

**구조: `project.` 네임스페이스**

아래에서 `/` 기호 좌측은 한국어(ko), 우측은 영어(en) 번역이다.

```json
{
  "project": {
    "create": {
      "title": "새 프로젝트 만들기 / Create New Project",
      "name_label": "프로젝트 이름 / Project Name",
      "name_placeholder": "프로젝트 이름을 입력하세요 / Enter project name",
      "name_required": "프로젝트 이름은 최소 1자 이상이어야 합니다. / Project name must be at least 1 character.",
      "name_duplicate": "동일 조직 내에 같은 이름의 프로젝트가 이미 존재합니다. / A project with the same name already exists in this organization.",
      "channel_label": "채널 / Channel",
      "channel_link": "Link / Link",
      "channel_app": "App / App",
      "channel_website": "Website / Website",
      "industry_label": "산업 / Industry",
      "industry_ecommerce": "이커머스 / eCommerce",
      "industry_saas": "SaaS / SaaS",
      "industry_other": "기타 / Other",
      "submit": "프로젝트 만들기 / Create Project",
      "creating": "생성 중... / Creating...",
      "success": "프로젝트가 생성되었습니다. / Project created successfully.",
      "fail": "프로젝트 생성에 실패했습니다. / Failed to create project."
    },
    "settings": {
      "title": "프로젝트 설정 / Project Settings",
      "general": "일반 / General",
      "styling": "스타일링 / Styling",
      "languages": "언어 / Languages",
      "danger_zone": "위험 구역 / Danger Zone",
      "name_label": "프로젝트 이름 / Project Name",
      "recontact_days_label": "재접촉 일수 / Recontact Days",
      "recontact_days_description": "동일 사용자에게 설문을 다시 노출하기까지의 최소 대기 일수 (0~365) / Minimum number of days before showing a survey to the same user again (0-365)",
      "recontact_days_error": "재접촉 일수는 0~365 범위의 정수여야 합니다. / Recontact days must be an integer between 0 and 365.",
      "placement_label": "위젯 배치 / Widget Placement",
      "placement_bottomLeft": "좌측 하단 / Bottom Left",
      "placement_bottomRight": "우측 하단 / Bottom Right",
      "placement_topLeft": "좌측 상단 / Top Left",
      "placement_topRight": "우측 상단 / Top Right",
      "placement_center": "중앙 / Center",
      "overlay_label": "오버레이 / Overlay",
      "overlay_none": "없음 / None",
      "overlay_light": "밝게 / Light",
      "overlay_dark": "어둡게 / Dark",
      "click_outside_close_label": "외부 클릭으로 닫기 / Close on Outside Click",
      "inapp_branding_label": "In-app 설문 브랜딩 / In-app Survey Branding",
      "link_branding_label": "Link 설문 브랜딩 / Link Survey Branding",
      "save": "저장 / Save",
      "saving": "저장 중... / Saving...",
      "save_success": "설정이 저장되었습니다. / Settings saved successfully.",
      "save_fail": "설정 저장에 실패했습니다. / Failed to save settings."
    },
    "styling": {
      "allow_override_label": "스타일 오버라이드 허용 / Allow Style Override",
      "allow_override_description": "개별 설문에서 프로젝트 스타일을 재정의할 수 있습니다. / Individual surveys can override project styles.",
      "brand_color": "브랜드 색상 / Brand Color",
      "card_bg_color": "카드 배경 색상 / Card Background Color",
      "card_border_color": "카드 테두리 색상 / Card Border Color",
      "roundness": "둥글기 / Roundness",
      "hide_progress_bar": "진행률 바 숨기기 / Hide Progress Bar",
      "hide_logo": "로고 숨기기 / Hide Logo"
    },
    "environment": {
      "production": "Production / Production",
      "development": "Development / Development",
      "switch_label": "환경 전환 / Switch Environment",
      "app_setup_incomplete": "앱 셋업이 완료되지 않았습니다. / App setup is not complete.",
      "app_setup_complete": "앱 셋업 완료 / App setup complete"
    },
    "action_class": {
      "title": "액션 클래스 / Action Classes",
      "create": "액션 클래스 생성 / Create Action Class",
      "name_label": "이름 / Name",
      "name_placeholder": "액션 이름을 입력하세요 / Enter action name",
      "description_label": "설명 / Description",
      "description_placeholder": "액션 설명을 입력하세요 (선택) / Enter action description (optional)",
      "type_label": "유형 / Type",
      "type_code": "Code / Code",
      "type_nocode": "No Code / No Code",
      "key_label": "키 / Key",
      "key_placeholder": "SDK에서 사용할 이벤트 키 / Event key for SDK",
      "key_required": "code 타입 액션 클래스는 키가 필수입니다. / Key is required for code type action class.",
      "nocode_type_label": "트리거 유형 / Trigger Type",
      "nocode_click": "클릭 / Click",
      "nocode_pageview": "페이지뷰 / Page View",
      "nocode_exit_intent": "이탈 의도 / Exit Intent",
      "nocode_scroll": "50% 스크롤 / 50% Scroll",
      "css_selector_label": "CSS 선택자 / CSS Selector",
      "inner_html_label": "내부 HTML / Inner HTML",
      "click_required": "클릭 유형은 CSS 선택자 또는 내부 HTML 중 하나 이상이 필요합니다. / Click type requires at least one of CSS selector or inner HTML.",
      "url_filters_label": "URL 필터 / URL Filters",
      "url_filter_add": "URL 필터 추가 / Add URL Filter",
      "url_filter_value": "값 / Value",
      "url_filter_rule": "규칙 / Rule",
      "url_filter_connector": "필터 연결 / Filter Connector",
      "url_filter_or": "또는 (OR) / OR",
      "url_filter_and": "그리고 (AND) / AND",
      "url_filter_exact_match": "정확히 일치 / Exact Match",
      "url_filter_contains": "포함 / Contains",
      "url_filter_starts_with": "시작 / Starts With",
      "url_filter_ends_with": "끝 / Ends With",
      "url_filter_not_match": "불일치 / Not Match",
      "url_filter_not_contains": "미포함 / Not Contains",
      "url_filter_regex": "정규식 일치 / Matches Regex",
      "save": "저장 / Save",
      "saving": "저장 중... / Saving...",
      "create_success": "액션 클래스가 생성되었습니다. / Action class created successfully.",
      "create_fail": "액션 클래스 생성에 실패했습니다. / Failed to create action class.",
      "update_success": "액션 클래스가 수정되었습니다. / Action class updated successfully.",
      "delete_confirm": "이 액션 클래스를 삭제하시겠습니까? / Are you sure you want to delete this action class?",
      "delete_warning": "연결된 설문 트리거도 함께 삭제됩니다. / Associated survey triggers will also be deleted.",
      "delete_success": "액션 클래스가 삭제되었습니다. / Action class deleted successfully.",
      "name_duplicate": "동일 환경 내에 같은 이름의 액션 클래스가 이미 존재합니다. / An action class with the same name already exists in this environment.",
      "key_duplicate": "동일 환경 내에 같은 키의 액션 클래스가 이미 존재합니다. / An action class with the same key already exists in this environment.",
      "empty": "아직 액션 클래스가 없습니다. / No action classes yet."
    },
    "language": {
      "title": "언어 관리 / Language Management",
      "add": "언어 추가 / Add Language",
      "code_label": "언어 코드 / Language Code",
      "code_placeholder": "예: ko, en, ja / e.g., ko, en, ja",
      "alias_label": "별칭 / Alias",
      "alias_placeholder": "별칭 (선택) / Alias (optional)",
      "add_success": "언어가 추가되었습니다. / Language added successfully.",
      "add_fail": "언어 추가에 실패했습니다. / Failed to add language.",
      "update_success": "언어가 수정되었습니다. / Language updated successfully.",
      "delete_confirm": "이 언어를 삭제하시겠습니까? / Are you sure you want to delete this language?",
      "delete_success": "언어가 삭제되었습니다. / Language deleted successfully.",
      "code_duplicate": "동일 프로젝트 내에 같은 언어 코드가 이미 존재합니다. / A language with the same code already exists in this project.",
      "empty": "아직 등록된 언어가 없습니다. / No languages registered yet."
    },
    "delete": {
      "title": "프로젝트 삭제 / Delete Project",
      "warning": "이 작업은 되돌릴 수 없습니다. / This action cannot be undone.",
      "cascade_warning": "하위 모든 환경(production/development)과 설문, 연락처, 액션 클래스 등 모든 데이터가 영구 삭제됩니다. / All environments (production/development) and their associated data including surveys, contacts, and action classes will be permanently deleted.",
      "confirm_label": "삭제를 확인하려면 프로젝트 이름을 입력하세요 / Type the project name to confirm",
      "confirm_button": "프로젝트 삭제 / Delete Project",
      "deleting": "삭제 중... / Deleting...",
      "success": "프로젝트가 삭제되었습니다. / Project deleted successfully.",
      "fail": "프로젝트 삭제에 실패했습니다. / Failed to delete project."
    },
    "errors": {
      "not_found": "프로젝트를 찾을 수 없습니다. / Project not found.",
      "forbidden": "이 작업을 수행할 권한이 없습니다. / You do not have permission to perform this action.",
      "env_not_found": "환경을 찾을 수 없습니다. / Environment not found."
    }
  }
}
```
