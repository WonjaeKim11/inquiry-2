# FSD-008 설문 생성/유형/라이프사이클

## Overview

4단계 첫 번째 기능으로 **설문 도메인 코어**를 구현했다. 3단계(FSD-024 REST API/Headless)에서 확립된 Client API v1, Management API v1, API Key 인증 시스템 위에 설문조사(Survey)의 생성, 유형 관리, 상태 전이(라이프사이클), 발행 검증 기능을 추가했다.

`@coltorapps/builder` 기반의 headless form builder를 공유 패키지로 구성하여 서버/클라이언트 간 스키마 정의를 일원화하고, JWT 인증 기반의 Survey CRUD API, 자동 저장, 템플릿 시스템, 15개 로케일 i18n을 포함한 완전한 설문 관리 기능을 구현했다.

## Changed Files

### 신규 패키지/라이브러리

| 경로 | 역할 |
|------|------|
| `packages/survey-builder-config/` | `@coltorapps/builder` 기반 surveyBuilder 공유 정의 (서버/클라이언트) |
| `packages/survey-builder-config/src/lib/survey-builder.ts` | surveyBuilder 생성: 엔티티 관계, CUID2 ID 생성/검증, 스키마 검증 |
| `packages/survey-builder-config/src/lib/entities/` | Block(컨테이너), OpenText(자유텍스트) 엔티티 정의 |
| `packages/survey-builder-config/src/lib/attributes/` | headline, required, description, placeholder 속성 정의 |
| `packages/survey-builder-config/src/lib/types.ts` | WelcomeCard, SurveyEnding, HiddenFields, SurveyVariable 타입 + Zod 스키마 |
| `libs/server/survey/` | NestJS Survey 모듈: CRUD + 상태 전이 + 발행 검증 |
| `libs/server/survey/src/lib/survey.controller.ts` | JWT 인증 컨트롤러 (12개 엔드포인트) |
| `libs/server/survey/src/lib/services/survey.service.ts` | Survey CRUD + 상태 전이 + 환경 접근 권한 검증 |
| `libs/server/survey/src/lib/services/survey-validation.service.ts` | Builder 구조 검증 + 비즈니스 규칙 검증 |
| `libs/server/survey/src/lib/services/survey-template.service.ts` | NPS, CSAT, CES 내장 템플릿 |
| `libs/server/survey/src/lib/dto/` | create-survey, update-survey, survey-query Zod DTO |
| `libs/server/survey/src/lib/constants/` | 상태 전이 매트릭스, hidden field 금지 ID |
| `libs/client/survey/` | 클라이언트 Survey 라이브러리 |
| `libs/client/survey/src/lib/api.ts` | apiFetch 기반 Survey API 클라이언트 |
| `libs/client/survey/src/lib/hooks/` | use-surveys, use-survey, use-auto-save, use-survey-builder-store, use-survey-templates |
| `libs/client/survey/src/lib/survey-list.tsx` | 설문 카드 리스트 컴포넌트 |
| `libs/client/survey/src/lib/create-survey-dialog.tsx` | 설문 생성 다이얼로그 |
| `libs/client/survey/src/lib/delete-survey-dialog.tsx` | 설문 삭제 확인 다이얼로그 |
| `libs/client/survey/src/lib/survey-status-badge.tsx` | 상태 배지 컴포넌트 |

### 신규 페이지

| 경로 | 역할 |
|------|------|
| `apps/client/.../surveys/page.tsx` | 설문 목록 페이지 |
| `apps/client/.../surveys/new/page.tsx` | 새 설문 생성 페이지 |
| `apps/client/.../surveys/[surveyId]/edit/page.tsx` | 설문 편집기 페이지 |

### 수정 파일

| 경로 | 변경 내용 |
|------|-----------|
| `packages/db/prisma/schema.prisma` | SurveyType, SurveyDisplayOption enum 추가, Survey 모델 30+ 필드 확장, User→Survey 관계 |
| `packages/db/prisma/migrations/` | 기존 마이그레이션 정리 + init + expand_survey_model 마이그레이션 |
| `libs/server/management-api/.../management-survey.service.ts` | questions → schema 필드 변경, 확장 필드 select |
| `libs/server/management-api/.../dto/` | create/update survey DTO에 schema + 확장 필드 추가 |
| `libs/server/management-api/.../management-api.module.ts` | SurveyModule import |
| `libs/server/client-api/.../client-environment.service.ts` | questions → schema select 변경 |
| `apps/server/src/app/app.module.ts` | SurveyModule import 추가 |
| `apps/client/.../environments/[envId]/page.tsx` | 환경 대시보드에 Surveys 네비게이션 추가 |
| `apps/client/src/app/i18n/locales/*/translation.json` | 15개 로케일에 survey.* 번역 키 추가 |
| `tsconfig.json` | survey-builder-config, client-survey, server-survey 참조 추가 |
| `package.json` | @coltorapps/builder, @dnd-kit, deep-equal 의존성 추가 |

## Major Changes

### 1. Survey Builder 공유 패키지 (`packages/survey-builder-config/`)

`@coltorapps/builder`를 사용하여 설문 스키마를 서버/클라이언트가 동일하게 해석할 수 있도록 공유 빌더를 정의:

```typescript
// survey-builder.ts
export const surveyBuilder = createBuilder({
  entities: [blockEntity, openTextEntity],
  entitiesExtensions: {
    block: { childrenAllowed: ['openText'] },
    openText: { parentRequired: true, allowedParents: ['block'] },
  },
  generateEntityId: () => createId(),   // CUID2
  validateSchema(schema) {
    // 최소 1개 블록 + 1개 질문 필수
  },
});
```

### 2. DB 스키마 확장

Survey 모델을 스텁에서 완전한 모델로 확장:
- `questions Json` → `schema Json` (builder flat entity map)
- `SurveyType` enum: `link | app`
- `SurveyDisplayOption` enum: `displayOnce | displayMultiple | respondMultiple | displaySome`
- 30+ 신규 필드: welcomeCard, endings, hiddenFields, variables, displayOption, delay, autoClose, autoComplete, pin, slug, styling 등
- `creatorId` → User 관계 추가

### 3. 서버 Survey 모듈

JWT 인증 기반 12개 API 엔드포인트:

```
GET    /environments/:envId/surveys          — 목록 (페이지네이션, 필터)
POST   /environments/:envId/surveys          — 생성
POST   /environments/:envId/surveys/from-template — 템플릿 기반 생성
GET    /surveys/templates                     — 템플릿 목록
GET    /surveys/:surveyId                     — 상세
PATCH  /surveys/:surveyId                     — 수정 (자동 저장)
DELETE /surveys/:surveyId                     — 삭제
POST   /surveys/:surveyId/publish             — 발행
POST   /surveys/:surveyId/pause               — 일시정지
POST   /surveys/:surveyId/resume              — 재개
POST   /surveys/:surveyId/complete            — 완료
```

**상태 전이 매트릭스**:
```
DRAFT → [IN_PROGRESS]       (publish: validateSchema 필수)
IN_PROGRESS → [PAUSED, COMPLETED]
PAUSED → [IN_PROGRESS]      (resume)
COMPLETED → []              (전이 불가)
```

**발행 검증 2단계**:
1. Builder 구조 검증 (`validateSchemaShape` + `validateSchema`)
2. 비즈니스 규칙: ending ≥ 1, welcomeCard headline 필수, PIN 4자리, hidden field 금지 ID 등

### 4. 클라이언트 라이브러리

- **API 클라이언트**: apiFetch 기반 CRUD/상태전이/템플릿 API 함수
- **자동 저장**: 10초 디바운스, Page Visibility API 연동, deep-equal 변경 감지
- **Builder Store**: `@coltorapps/builder-react` 래퍼
- **컴포넌트**: SurveyList, CreateSurveyDialog, DeleteSurveyDialog, SurveyStatusBadge

### 5. i18n (15개 로케일)

`survey.*` 네임스페이스로 번역 키 추가: title, create, list, status, actions, editor, display_option, delete, template, errors, welcome_card, ending, hidden_fields, variables, settings, validation

## How to use it

### 설문 CRUD API

```bash
# 설문 생성
curl -X POST http://localhost:3000/api/environments/{envId}/surveys \
  -H "Authorization: Bearer {jwt}" \
  -H "Content-Type: application/json" \
  -d '{"name": "고객 만족도 조사", "type": "link"}'

# 설문 목록 (페이지네이션 + 필터)
curl http://localhost:3000/api/environments/{envId}/surveys?page=1&limit=10&status=DRAFT

# 설문 수정 (자동 저장)
curl -X PATCH http://localhost:3000/api/surveys/{surveyId} \
  -H "Authorization: Bearer {jwt}" \
  -H "Content-Type: application/json" \
  -d '{"schema": {"root": ["blockId"], "entities": {...}}}'

# 설문 발행 (DRAFT → IN_PROGRESS)
curl -X POST http://localhost:3000/api/surveys/{surveyId}/publish \
  -H "Authorization: Bearer {jwt}"

# 템플릿 기반 생성
curl -X POST http://localhost:3000/api/environments/{envId}/surveys/from-template \
  -H "Authorization: Bearer {jwt}" \
  -H "Content-Type: application/json" \
  -d '{"templateId": "nps", "name": "NPS 조사"}'
```

### 클라이언트 UI 라우트

```
/{lng}/projects/{projectId}/environments/{envId}/surveys          → 설문 목록
/{lng}/projects/{projectId}/environments/{envId}/surveys/new      → 새 설문 생성
/{lng}/projects/{projectId}/environments/{envId}/surveys/{id}/edit → 편집기
```

### Management API (API Key 인증)

```bash
# 기존 Management API도 schema 필드 사용
curl http://localhost:3000/v1/management/environments/{envId}/surveys \
  -H "x-api-key: {apiKey}"
```

## Related Components/Modules

- **FSD-024 REST API**: Client API v1, Management API v1에 설문 필드 확장
- **FSD-006 프로젝트/환경**: 환경 대시보드에 Surveys 네비게이션 연결
- **@coltorapps/builder**: 설문 스키마의 엔티티/속성 정의 프레임워크
- **AuditLogService**: survey.created, survey.updated, survey.deleted, survey.published 등 감사 로그
- **ServerPrismaService**: Survey CRUD 데이터 액세스
- **@inquiry/client-core**: apiFetch, useAuth 등 공유 유틸리티

## Precautions

- **향후 엔티티 확장**: 현재 openText만 구현됨. multipleChoice, rating, scale 등 질문 유형은 별도 마일스톤에서 추가 예정
- **빌더 UI**: 편집기 페이지는 기본 구조만 포함. 드래그앤드롭 빌더 UI는 추후 @coltorapps/builder-react + @dnd-kit으로 확장
- **자동 저장**: deep-equal 기반 변경 감지로 불필요한 API 호출 방지. 네트워크 에러 시 재시도 로직은 미구현
- **발행 검증**: builder 스키마 구조 + 비즈니스 규칙 2단계 검증. 추후 커스텀 검증 규칙 확장 가능
- **마이그레이션**: 기존 init/expand 마이그레이션이 정리됨. 프로덕션 배포 시 마이그레이션 순서 확인 필요
