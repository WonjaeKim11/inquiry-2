# 통합 구현 실행 계획서 (Master Implementation Execution Plan)

> **작성일**: 2026-02-22 (최종 수정: 2026-02-22 - @coltorapps/builder 도입 반영)
> **프로젝트**: Inquiry - 설문조사 SaaS 플랫폼
> **기술 스택**: NestJS (서버) + Next.js 16 / React 19 (클라이언트) + Prisma + PostgreSQL (모노레포)
> **설문 빌더 코어**: `@coltorapps/builder` + `@coltorapps/builder-react` (headless, type-safe 동적 폼 빌더)
> **기준 문서**: `functional-specification-implementation-order.md`, `feature-implement-plan/*.md` (31개)
>
> ⚠️ **변경 이력**: FSD-008, 009, 010, 021 계획서가 `@coltorapps/builder` 기반으로 재작성됨

---

## 1. 현재 상태 (As-Is)

### 1.1 구현 완료 항목
- 이메일/비밀번호 인증 (회원가입, 로그인, 비밀번호 재설정)
- Google/GitHub OAuth 소셜 로그인
- JWT 세션 관리 (Access Token + Refresh Token)
- 이메일 인증 (Brevo 연동)
- Cloudflare Turnstile 서버 검증
- Rate Limiting 기본 모듈
- Audit Log 기본 모듈 (기본 로깅만)
- i18n 기반 (react-i18next, ko/en)
- shadcn/ui 컴포넌트 라이브러리

### 1.2 기존 프로젝트 구조
```
apps/
├── server/          # NestJS 백엔드
├── client/          # Next.js 16 프론트엔드
packages/
├── db/              # Prisma + PostgreSQL
libs/
├── server/
│   ├── auth/        # 인증 서비스 (658줄)
│   ├── prisma/      # Prisma 클라이언트
│   ├── email/       # 이메일 서비스 (Brevo)
│   ├── rate-limit/  # Rate Limiting
│   └── audit-log/   # 감사 로그 (기본)
├── client/
│   ├── auth/        # 인증 폼/컴포넌트
│   ├── core/        # AuthContext, API 유틸리티
│   └── ui/          # shadcn/ui 컴포넌트
```

### 1.3 기존 DB 모델
`User`, `Account`, `RefreshToken`, `Organization`, `Membership`, `Invite`, `AuditLog`

### 1.4 핵심 아키텍처 결정: @coltorapps/builder 도입

설문 빌더의 핵심 도메인(질문 유형 정의, 편집기 상태관리, 응답 수집)에 `@coltorapps/builder`를 채택합니다.

**도입 범위와 영향:**

| 영역 | 기존 접근 | @coltorapps/builder 기반 |
|------|----------|------------------------|
| 질문 유형 정의 (FSD-009) | Zod discriminated union | `createEntity()` + `createAttribute()` |
| 설문 데이터 구조 (FSD-008) | `blocks: Json` 중첩 배열 | `schema: Json` flat entity map `{ entities: {}, root: [] }` |
| 편집기 상태관리 (FSD-010) | Context + useReducer (40+ 액션) | `useBuilderStore` 내장 CRUD |
| 응답 수집 (FSD-021) | 커스텀 폼 상태관리 | `useInterpreterStore` 내장 값 관리/검증 |
| DnD | @dnd-kit + 커스텀 핸들러 | @dnd-kit + Builder Store 네이티브 통합 |
| 검증 | 커스텀 Zod 스키마 + class-validator | Attribute Zod → Entity 교차 → Schema 비즈니스 규칙 |

**하이브리드 설계 결정:**
- **Builder Schema에 포함**: Block(컨테이너) + 15가지 Element Entity
- **별도 JSON 필드 유지**: WelcomeCard, Ending, HiddenFields, Variables (Builder 계층과 무관한 독립 데이터)

**공유 패키지**: `packages/survey-builder/` — `surveyBuilder` 인스턴스 + 16 Entity + ~40 Attribute (서버/클라이언트 양쪽에서 공유)

**신규 의존성**: `@coltorapps/builder`, `@coltorapps/builder-react`, `zod`, `@dnd-kit/core`, `@dnd-kit/sortable`

---

## 2. 구현 단계 총괄

| 단계 | 이름 | FSD 수 | 예상 시간 | 핵심 산출물 |
|------|------|--------|----------|------------|
| 1단계 | 공통 기준/게이팅 | 4 | ~220h | Redis, 라이선스, 감사로그, 다국어 인프라 |
| 2단계 | 인증/테넌시 코어 | 5 | ~175h | 2FA/SSO, 조직, RBAC, 프로젝트/환경 |
| 3단계 | API 베이스라인 | 1 | ~80h | REST API, API Key, Rate Limiting |
| 4단계 | 설문 도메인 코어 | 5 | ~306h | **@coltorapps/builder 기반** Survey CRUD, Entity 정의, 로직, 변수, 쿼터 |
| 5단계 | 설문 UX 확장 | 3 | ~270h | 스타일링, 다국어 설문, **Builder Store 기반 에디터** |
| 6단계 | 연락처/세그먼트 | 2 | ~148h | Contact 관리, 세그먼트 필터 |
| 7단계 | 배포/노출 채널 | 6 | ~475h | SDK, 링크, 임베드, 타겟팅 |
| 8단계 | 응답 처리/분석 | 5 | ~325h | **Interpreter Store 기반** 응답 관리, 파이프라인, 웹훅, 분석 |
| **합계** | | **31** | **~2,000h** | |

> **참고**: 예상 시간은 각 구현 계획서의 WBS 합산 기준이며, 병렬 작업 및 선행 작업 재사용으로 실제 소요 시간은 줄어들 수 있습니다.
> **변경**: @coltorapps/builder 도입으로 4/5/8단계 합계 ~40h 증가 (기존 ~1,960h → ~2,000h). 공유 패키지 구축 비용이 증가하나, 편집기/응답 커스텀 코드 감소로 장기적으로 상쇄됨.

---

## 3. 1단계: 공통 기준/게이팅 (~220h)

> **목표**: 전역 NFR, 라이선스 플래그, 감사 로그, i18n 기반을 먼저 고정하여 이후 모든 기능의 인프라 기반 확보

### 3.1 구현 순서

| 순번 | FSD | 기능명 | 계획서 | 예상 시간 | 태스크 수 |
|------|-----|--------|--------|----------|----------|
| 1 | 099 | 비기능/인터페이스 부록 | [99-non-functional-interface-appendix-plan.md](./99-non-functional-interface-appendix-plan.md) | ~70h | 37 |
| 2 | 029 | 구독/빌링/브랜딩 | [29-subscription-billing-branding-plan.md](./29-subscription-billing-branding-plan.md) | ~68.5h | 35+ |
| 3 | 005 | 감사 로그 | [05-audit-log-plan.md](./05-audit-log-plan.md) | ~23.25h | 18 |
| 4 | 030 | 관리자 UI 다국어 | [30-admin-UI-multilingual-plan.md](./30-admin-UI-multilingual-plan.md) | ~55h | 18 |

### 3.2 핵심 산출물
- **Redis 공통 모듈** (`libs/server/redis/`) - Rate Limiting, 캐싱, Grace Period 공유
- **표준 에러 응답 필터** (GlobalExceptionFilter) - `{ error: { code, message, details } }`
- **Pino 구조화 로거** + Sentry 에러 추적
- **License/Feature Flag 시스템** (`libs/server/license/`) - Enterprise 기능 게이팅
- **Stripe 빌링 연동** (`libs/server/billing/`) - Checkout, Webhook, 멱등성
- **감사 로그 리팩토링** - Zod 검증, PII Redaction, Pino JSON 출력
- **15개 로케일 지원** (en-US, ko-KR 포함) - 동적 번역 로딩, ICU 플러그인

### 3.3 공유 인프라 (이후 단계에서 재사용)
```
libs/server/redis/         → Rate Limiting, 세션, 캐시
libs/server/license/       → Enterprise Feature Flag
libs/server/logger/        → Pino 구조화 로깅
libs/server/core/          → GlobalExceptionFilter, 표준 DTO
packages/shared-i18n/      → 서버/클라이언트 공유 로케일 상수
```

### 3.4 병렬 작업 가능 영역
- FSD-099(인프라)와 FSD-029(빌링)의 Redis 모듈은 동일 모듈이므로 **순차 진행**
- FSD-005(감사 로그)는 FSD-099의 Pino 로거 완성 후 시작
- FSD-030(다국어)은 FSD-099 완성 후 독립 진행 가능

### 3.5 단계 완료 기준
- [ ] Redis 연결 + Rate Limiting 동작 확인
- [ ] License Flag로 Enterprise 기능 게이팅 확인
- [ ] 감사 로그 Pino JSON 출력 + PII Redaction 확인
- [ ] 15개 로케일 동적 전환 확인 (URL + UI)
- [ ] Stripe Checkout -> Webhook 결제 흐름 E2E 확인

---

## 4. 2단계: 인증/테넌시 코어 (~175h)

> **목표**: User/Organization/Environment 컨텍스트를 완성하여 이후 모든 기능의 테넌시 기반 확보

### 4.1 구현 순서

| 순번 | FSD | 기능명 | 계획서 | 예상 시간 | 태스크 수 |
|------|-----|--------|--------|----------|----------|
| 1 | 001 | 회원가입/로그인/세션 (Gap) | [01-signup-login-session-plan.md](./01-signup-login-session-plan.md) | ~10h | 13 |
| 2 | 002 | 2FA/SSO | [02-2FA-SSO-plan.md](./02-2FA-SSO-plan.md) | ~60h | 40+ |
| 3 | 003 | 조직 관리 | [03-organization-management-plan.md](./03-organization-management-plan.md) | ~28h | 30 |
| 4 | 004 | 멤버 초대/RBAC | [04-member-invite-RBAC-plan.md](./04-member-invite-RBAC-plan.md) | ~35h | 38 |
| 5 | 006 | 프로젝트/환경 | [06-project-environment-plan.md](./06-project-environment-plan.md) | ~37.75h | 33 |

### 4.2 핵심 산출물
- **FSD-001 Gap 항목 보정**: Turnstile 클라이언트 위젯, 비밀번호 찾기 링크, inviteToken/userLocale 전달
- **2FA 시스템**: TOTP (otpauth), 백업 코드, AES-256-GCM 암호화 (`libs/server/crypto/`)
- **SSO 전략**: Azure AD, OpenID Connect, SAML (BoxyHQ) Passport 전략 추가
- **조직 CRUD**: billing/whitelabel JSON, 다중 조직 전환 UI
- **RBAC 가드**: `@AccessRules()` 데코레이터 + OrgRoleGuard (OWNER, ADMIN, BILLING, MEMBER)
- **멤버 초대**: JWT 기반 초대 토큰, 역할 지정 초대, 초대 수락/거절
- **프로젝트/환경 모델**: Project, Environment, ActionClass, Language 모델 + CRUD API

### 4.3 DB 스키마 변경
```prisma
// 새 모델
model Project { ... }
model Environment { ... }
model ActionClass { ... }
model Language { ... }

// User 확장
model User {
  twoFactorSecret    String?     // AES-256-GCM 암호화
  twoFactorEnabled   Boolean     @default(false)
  backupCodes        String[]    // bcrypt 해시
  notificationSettings Json?
}

// Membership 변경
model Membership {
  @@id([userId, organizationId])  // 복합 PK로 변경
  role  MembershipRole            // BILLING 역할 추가
}
```

### 4.4 병렬 작업 가능 영역
- FSD-001(Gap 보정)과 FSD-002(2FA/SSO)는 **병렬 진행 가능** (다른 파일 대상)
- FSD-003(조직)과 FSD-004(RBAC)는 **순차** (RBAC가 조직 모델에 의존)
- FSD-006(프로젝트/환경)은 FSD-003 이후 시작

### 4.5 단계 완료 기준
- [ ] 2FA TOTP 등록/검증/백업 코드 복구 E2E
- [ ] SSO 로그인(Azure AD 또는 OpenID) 동작 확인
- [ ] 조직 생성/전환/설정 UI 동작
- [ ] 멤버 초대 이메일 -> 수락 -> 역할 확인 E2E
- [ ] 프로젝트 생성 시 production/development 환경 자동 생성 확인

---

## 5. 3단계: API 베이스라인 (~80h)

> **목표**: SDK, Headless, 외부 통합의 공통 진입점 확보

### 5.1 구현 순서

| 순번 | FSD | 기능명 | 계획서 | 예상 시간 | 태스크 수 |
|------|-----|--------|--------|----------|----------|
| 1 | 024 | REST API / Headless | [24-REST-API-headless-plan.md](./24-REST-API-headless-plan.md) | ~80h | 52 |

### 5.2 핵심 산출물
- **Client API v1** (`/api/v1/client/`) - 환경 Sync, 설문 조회, 응답 제출, Display 기록
- **Management API v1** (`/api/v1/management/`) - 설문/응답/연락처 CRUD
- **API Key 인증** - `x-api-key` 헤더, `fbk_` 접두사, bcrypt 해시 저장
- **namespace별 Rate Limiting** - Client API(environmentId 기반), Management API(apiKeyId 기반)
- **표준 에러 처리** - `{ error: { code, message, details } }` 통일

### 5.3 새 NestJS 모듈
```
libs/server/common/          → 공통 가드, 데코레이터, 필터
libs/server/api-key/         → API Key CRUD, 인증 가드
libs/server/client-api/      → Client API v1 컨트롤러
libs/server/management-api/  → Management API v1 컨트롤러
```

### 5.4 단계 완료 기준
- [ ] API Key 생성/조회/삭제 API 동작
- [ ] Client API Sync 엔드포인트 응답 확인
- [ ] Rate Limiting (환경변수 기반) 동작 확인
- [ ] 표준 에러 응답 포맷 확인

---

## 6. 4단계: 설문 도메인 코어 (~306h) ⚠️ builder 반영

> **목표**: @coltorapps/builder 기반 설문 CRUD, Entity 정의, 조건부 로직, 변수, 쿼터 등 핵심 도메인 안정화

### 6.1 구현 순서

| 순번 | FSD | 기능명 | 계획서 | 예상 시간 | 태스크 수 | builder 영향 |
|------|-----|--------|--------|----------|----------|-------------|
| 1 | 008 | 설문 생성/유형/생명주기 | [08-survey-creation-type-lifecycle-plan.md](./08-survey-creation-type-lifecycle-plan.md) | **~76h** | **42** | ⚠️ 재작성 |
| 2 | 009 | 질문 유형 카탈로그 | [09-question-type-catalog-plan.md](./09-question-type-catalog-plan.md) | **~40h** | **34** | ⚠️ 재작성 |
| 3 | 012 | 조건부 로직 엔진 | [12-conditional-logic-engine-plan.md](./12-conditional-logic-engine-plan.md) | ~72h | 27 | 변경 없음 |
| 4 | 013 | 변수/히든 필드/리콜 | [13-variables-hidden-fields-recall-plan.md](./13-variables-hidden-fields-recall-plan.md) | ~52.5h | 28 | 변경 없음 |
| 5 | 014 | 쿼터 관리 | [14-quota-management-plan.md](./14-quota-management-plan.md) | ~65.5h | 35 | 변경 없음 |

### 6.2 핵심 산출물
- **`packages/survey-builder/`** — `createBuilder()` 기반 surveyBuilder 정의 (서버/클라이언트 공유)
  - 16개 Entity (Block 1 + Element 15): `createEntity()` + `parentRequired`/`childrenAllowed` 계층 정의
  - ~40개 원자적 Attribute: `createAttribute()` + Zod `validate` 메서드 내장
  - `generateEntityId()` / `validateEntityId()`: CUID2 기반 ID 생성, 금지 ID 10개 검증
  - `validateSchema()`: 스키마 수준 비즈니스 규칙 (순환 로직, ID 유일성 등)
- **Survey 모델**: `schema Json` flat entity map + 상태 전이 매트릭스 (draft → inProgress → paused → completed)
- **하이브리드 데이터 모델**: Block/Element은 builder schema에, WelcomeCard/Ending/HiddenFields/Variables는 별도 JSON 필드
- **검증 이중화**: 자동 저장 시 `validateSchemaShape()` (구조만), 발행 시 `validateSchema()` (전체) + 비즈니스 규칙
- **조건부 로직 엔진** — 31개 연산자, 클라이언트 전용 순수 함수 (builder 외부 도메인 로직)
- **Recall 엔진** — 정규식 파싱 → 값 해석 → 포매팅 → 치환
- **쿼터 시스템** — 서버 사이드 DB 트랜잭션 내 평가

### 6.3 공유 패키지 (핵심) ⚠️ 변경됨
```
packages/survey-builder/     → @coltorapps/builder 기반 Entity/Attribute/Builder 정의 (기존 shared-types + survey-schema 대체)
packages/shared/src/prefill/ → 프리필 파서 (7단계에서 사용)
packages/shared/src/segment/ → 세그먼트 평가 (6단계에서 사용)
```

> **변경**: 기존 `packages/shared-types/`와 `packages/survey-schema/`가 `packages/survey-builder/`로 통합됨.
> Entity/Attribute 정의가 타입과 런타임 검증을 모두 포함하므로 별도 분리 불필요.

### 6.4 병렬 작업 가능 영역
- **FSD-008이 최우선 + FSD-009와 긴밀 연계**: FSD-008에서 Survey 모델 + `packages/survey-builder/` 패키지 초기 구축, FSD-009에서 15가지 Entity 상세 정의
- FSD-008 Phase 1~2 (Prisma + 패키지 설정) 완료 후 FSD-009 **병렬 시작 가능**
- FSD-012(로직 엔진)은 FSD-008의 Block Entity 구조 확정 후 시작
- FSD-013(변수/리콜)은 FSD-009 이후 시작 권장
- FSD-014(쿼터)는 FSD-012 로직 엔진 이후 시작

### 6.5 단계 완료 기준
- [ ] `packages/survey-builder/` 빌드 성공 + 서버/클라이언트 양쪽 import 확인
- [ ] 설문 CRUD + 상태 전이 API 동작 (schema flat entity map 구조)
- [ ] 15가지 Entity `createEntity()` 정의 완료 + Attribute Zod 검증 통과
- [ ] `validateSchema()` 스키마 수준 검증 (순환 로직, ID 유일성) 동작
- [ ] 조건부 로직 평가 단위 테스트 (280+ 케이스)
- [ ] Recall 치환 동작 확인
- [ ] 쿼터 평가 + 스크리닝 동작 확인

---

## 7. 5단계: 설문 UX 확장 (~270h) ⚠️ builder 반영

> **목표**: 코어 모델 확정 후 Builder Store 기반 편집기 UX를 구축

### 7.1 구현 순서

| 순번 | FSD | 기능명 | 계획서 | 예상 시간 | 태스크 수 | builder 영향 |
|------|-----|--------|--------|----------|----------|-------------|
| 1 | 011 | 스타일링/테마/배경 | [11-styling-theme-background-plan.md](./11-styling-theme-background-plan.md) | ~96h | 37 | 변경 없음 |
| 2 | 015 | 다국어 설문 | [15-multilingual-survey-plan.md](./15-multilingual-survey-plan.md) | ~52.5h | 29 | 변경 없음 |
| 3 | 010 | 설문 에디터 UX | [10-survey-editor-UX-plan.md](./10-survey-editor-UX-plan.md) | **~120h** | **63** | ⚠️ 재작성 |

### 7.2 핵심 산출물
- **스타일 해석 엔진** (`resolveStyling`) - 5단계 우선순위 해석
- **스타일링 에디터** - 7개 카테고리 섹션 + Unsplash 배경 + ColorPicker
- **TI18nString 타입** - `Record<string, string>` 하위 호환성
- **설문 에디터 — 3계층 상태관리** (기존 Context+useReducer 대체):

| 계층 | 담당 | 도구 |
|------|------|------|
| **Builder Store** (`useBuilderStore`) | Block/Element CRUD, 속성 편집, 순서 변경 | `@coltorapps/builder-react` 내장 |
| **SurveyMetaContext** (경량 reducer) | WelcomeCard, Endings, HiddenFields, Variables | React Context + useReducer |
| **EditorUIContext** | activeTab, activeElementId, autoSaveStatus 등 | React Context |

- **BuilderEntities + createEntityComponent**: Entity 타입별 컴포넌트 자동 매핑 (15가지 Element Component)
- **BuilderCanvas**: DndContext + SortableContext + BuilderEntities 통합
- **Schema 변환 유틸리티**: API 중첩 구조 ↔ Builder flat entity map 양방향 변환
- **자동 저장**: Builder Store 이벤트 구독 + debounce 10초 (기존 Ref 기반 폴링 대체)
- **실시간 미리보기**: `useInterpreterStore` 기반 프리뷰 렌더링

### 7.3 병렬 작업 가능 영역
- FSD-011(스타일링)과 FSD-015(다국어)는 **병렬 진행 가능**
- FSD-010(에디터 UX) 마일스톤 1~3(Builder 패키지 + Context + 레이아웃)은 FSD-011/015와 **병렬 시작 가능**
- FSD-010 마일스톤 5(15가지 Entity Component)는 FSD-009 Entity 정의 완료 후 진행

### 7.4 단계 완료 기준
- [ ] `useBuilderStore` 기반 Block/Element addEntity/deleteEntity/cloneEntity 동작
- [ ] `BuilderEntities` 컴포넌트로 15가지 Entity 자동 렌더링 확인
- [ ] DnD로 Block/Element 순서 변경 → `builderStore.setData()` 동작 확인
- [ ] Builder Store 이벤트 구독 → 자동 저장 트리거 확인
- [ ] `useInterpreterStore` 기반 실시간 미리보기 동작
- [ ] 스타일링 편집 → 미리보기 반영 확인
- [ ] 다국어 설문 생성 + 언어 전환 확인

---

## 8. 6단계: 연락처/세그먼트 (~148h)

> **목표**: 세그먼트 평가가 연락처/속성 데이터에 의존하므로 연락처를 먼저 구축

### 8.1 구현 순서

| 순번 | FSD | 기능명 | 계획서 | 예상 시간 | 태스크 수 |
|------|-----|--------|--------|----------|----------|
| 1 | 026 | 연락처 관리 | [26-contact-management-plan.md](./26-contact-management-plan.md) | ~91h | 42+ |
| 2 | 027 | 세그먼트/필터 | [27-segment-filter-plan.md](./27-segment-filter-plan.md) | ~57h | 24 |

### 8.2 핵심 산출물
- **Contact 모델** + ContactAttributeKey/Value (EAV 패턴)
- **CSV Import** - 파일 업로드, 타입 감지, 중복 전략
- **세그먼트 모델** - 재귀적 FilterItem 트리 (JSON 배열)
- **세그먼트 평가 엔진** - DFS 기반 순환 참조 탐지
- **필터 편집기 UI** - 조건 그룹 중첩 + 연산자 선택

### 8.3 단계 완료 기준
- [ ] Contact CRUD + CSV Import 동작
- [ ] 세그먼트 생성/편집/필터 적용 확인
- [ ] Survey-Segment 연결 확인

---

## 9. 7단계: 배포/노출 채널 (~475h)

> **목표**: SDK/식별/링크/접근제어 기반 위에 타겟팅 로직을 얹는 순서

### 9.1 구현 순서

| 순번 | FSD | 기능명 | 계획서 | 예상 시간 | 태스크 수 |
|------|-----|--------|--------|----------|----------|
| 1 | 007 | SDK/위젯/GTM | [07-SDK-widget-GTM-plan.md](./07-SDK-widget-GTM-plan.md) | ~120h | 35 |
| 2 | 020 | 사용자 식별/스팸 방지 | [20-user-identification-spam-prevention-plan.md](./20-user-identification-spam-prevention-plan.md) | ~84h | 32 |
| 3 | 016 | 링크 공유/임베드 | [16-link-share-embed-plan.md](./16-link-share-embed-plan.md) | ~60h | 36 |
| 4 | 018 | 접근 제어/프리필 | [18-access-control-prefill-plan.md](./18-access-control-prefill-plan.md) | ~40h | 25 |
| 5 | 017 | Single-use/개인 링크 | [17-single-use-personal-link-plan.md](./17-single-use-personal-link-plan.md) | ~71h | 40+ |
| 6 | 019 | 타겟팅/트리거/재노출 | [19-targeting-trigger-reexposure-plan.md](./19-targeting-trigger-reexposure-plan.md) | ~79h | 36 |

### 9.2 핵심 산출물
- **JS SDK** (`packages/js-sdk`) - UMD+ESM 빌드, Shadow DOM, No-Code Action 감지
- **설문 UI 패키지** (`packages/surveys`) - Shadow DOM 내 설문 렌더링
- **reCAPTCHA 통합** - 클라이언트 + 서버 검증
- **Link Survey 페이지** (`/s/[surveyId]`, `/p/[slug]`) - 3단계 렌더링 파이프라인
- **Share Modal** - 10개 탭 (URL, QR, 이메일, 임베드 등)
- **접근 제어** - PIN, 이메일 인증 게이트
- **암호화 서비스** - AES-256-GCM (Single-use ID, Personal Link JWT)
- **타겟팅 엔진** - 5단계 필터링 파이프라인, TimerManager

### 9.3 병렬 작업 가능 영역
- FSD-007(SDK)이 **최우선** (FSD-020이 의존)
- FSD-016(링크 공유)과 FSD-020(사용자 식별)은 FSD-007 이후 **병렬 진행 가능**
- FSD-018(접근 제어)과 FSD-017(개인 링크)은 FSD-016 이후 **병렬 진행 가능**
- FSD-019(타겟팅)는 모든 채널 완성 후 **마지막 진행**

### 9.4 단계 완료 기준
- [ ] SDK 설치 → 설문 노출 E2E
- [ ] 링크 공유 → 설문 응답 제출 E2E
- [ ] PIN/이메일 인증 게이트 동작
- [ ] Single-use 링크 1회 사용 제한 확인
- [ ] 타겟팅 조건 설정 → SDK에서 조건부 노출 확인

---

## 10. 8단계: 응답 처리/자동화/분석 (~325h) ⚠️ builder 반영

> **목표**: Interpreter Store 기반 응답 수집이 선행되어야 파이프라인, 알림, 분석이 완성 가능

### 10.1 구현 순서

| 순번 | FSD | 기능명 | 계획서 | 예상 시간 | 태스크 수 | builder 영향 |
|------|-----|--------|--------|----------|----------|-------------|
| 1 | 021 | 응답 관리/부분 응답 | [21-response-management-partial-response-plan.md](./21-response-management-partial-response-plan.md) | **~90h** | **41** | ⚠️ 재작성 |
| 2 | 022 | 응답 파이프라인/후속 이메일 | [22-response-pipeline-follow-up-email-plan.md](./22-response-pipeline-follow-up-email-plan.md) | ~48h | 33 | 변경 없음 |
| 3 | 023 | 웹훅/커넥터 | [23-webhook-connector-plan.md](./23-webhook-connector-plan.md) | ~89h | 20 | 변경 없음 |
| 4 | 028 | 응답 알림 | [28-response-notification-plan.md](./28-response-notification-plan.md) | ~25h | 25 | 변경 없음 |
| 5 | 025 | 분석/요약/내보내기 | [25-analytics-summary-export-plan.md](./25-analytics-summary-export-plan.md) | ~73h | 28 | 변경 없음 |

### 10.2 핵심 산출물
- **응답 수집 런타임** — `useInterpreterStore(surveyBuilder, schema)` 기반:
  - 값 관리: `setEntityValue`/`resetEntityValue`/`clearEntityValue` 내장
  - 부분 응답 복원: `initialData: { entitiesValues: savedData }` 한 줄로 처리
  - 이중 검증: 클라이언트 `validateEntitiesValues()` + 서버 `validateEntitiesValues()` (finished=true 시)
  - 조건부 스킵: `shouldBeProcessed` false인 Entity 응답 자동 제외
- **응답 데이터 구조** — `{ [entityId]: value }` flat map (builder entitiesValues와 동일)
- **Response 모델** + 카드 뷰/테이블 뷰 + 22가지 필터 연산자
- **응답 파이프라인** (`libs/server/pipeline/`) - EventEmitter2 기반 이벤트 디커플링
- **Standard Webhooks** - HMAC-SHA256 서명, 멱등성 처리
- **네이티브 통합** - Slack, Google Sheets, Notion, Airtable OAuth
- **응답 알림** - 이메일 알림, 설문별 구독 토글
- **분석 대시보드** - 14+ 질문 유형별 Summary 컴포넌트, NPS/CSAT 계산
- **CSV/XLSX 내보내기** - 클라이언트 사이드 변환 + 다운로드

### 10.3 병렬 작업 가능 영역
- FSD-021(응답 관리)이 **최우선** (나머지 모두 의존)
  - FSD-021의 Milestone 1(survey-builder 패키지 + Entity 정의)은 4단계 FSD-008/009와 공유 → 이미 완성된 상태일 수 있음
- FSD-022(파이프라인)와 FSD-023(웹훅)은 **병렬 진행 가능** (이벤트 인터페이스 사전 합의)
- FSD-028(알림)은 FSD-022 이후 시작
- FSD-025(분석)는 FSD-021 이후 독립 진행 가능

### 10.4 단계 완료 기준
- [ ] `useInterpreterStore` 기반 응답 수집 + 부분 응답 복원 동작
- [ ] `validateEntitiesValues()` 서버 이중 검증 동작 (잘못된 데이터 → entitiesErrors 반환)
- [ ] 응답 제출 → 응답 목록 조회 E2E
- [ ] 파이프라인 트리거 → 후속 이메일 발송 확인
- [ ] 웹훅 발송 + Standard Webhooks 서명 검증
- [ ] 응답 알림 이메일 수신 확인
- [ ] 분석 대시보드 + CSV/XLSX 내보내기 확인

---

## 11. 단계별 E2E 검증 시나리오

각 단계 완료 시 아래 시나리오를 누적 실행하여 회귀 방지:

### 11.1 기본 플로우 (1~2단계 이후)
```
가입 → 이메일 인증 → 로그인 → 2FA 설정 → 조직 생성 → 멤버 초대 → 프로젝트/환경 생성
```

### 11.2 설문 생성 플로우 (3~5단계 이후)
```
API Key 생성 → 설문 생성 → 질문 추가 → 로직 설정 → 스타일링 → 다국어 → 발행
```

### 11.3 설문 배포 플로우 (6~7단계 이후)
```
SDK 설치 → 사용자 식별 → 세그먼트 타겟팅 → 설문 노출 → PIN/이메일 게이트 → 응답 제출
```

### 11.4 응답 처리 플로우 (8단계 이후)
```
응답 제출 → 파이프라인 트리거 → 웹훅 발송 → 알림 이메일 → 분석 대시보드 → CSV 내보내기
```

---

## 12. 신규 생성 모듈 총괄

### 12.1 서버 라이브러리 (`libs/server/`)

| 모듈 | 생성 단계 | 주요 역할 |
|------|----------|----------|
| `redis` | 1단계 | @Global() ioredis 클라이언트 래퍼 |
| `core` | 1단계 | GlobalExceptionFilter, 표준 DTO |
| `logger` | 1단계 | Pino 구조화 로거 |
| `license` | 1단계 | Enterprise Feature Flag |
| `billing` | 1단계 | Stripe 결제, 요금제 관리 |
| `branding` | 1단계 | 설문 브랜딩, Whitelabel |
| `crypto` | 2단계 | AES-256-GCM 암복호화 |
| `organization` | 2단계 | 조직 CRUD |
| `invite` | 2단계 | 초대 관리 |
| `member` | 2단계 | 멤버 관리 |
| `rbac` | 2단계 | 역할 기반 접근 제어 |
| `project` | 2단계 | 프로젝트/환경/ActionClass/Language |
| `common` | 3단계 | 공통 가드/데코레이터/필터 |
| `api-key` | 3단계 | API Key CRUD, 인증 가드 |
| `client-api` | 3단계 | Client API v1 컨트롤러 |
| `management-api` | 3단계 | Management API v1 컨트롤러 |
| `survey` | 4단계 | 설문 CRUD, 검증, 템플릿 |
| `quota` | 4단계 | 쿼터 규칙 + 평가 |
| `multilingual` | 5단계 | 다국어 검증/리소스 |
| `contact` | 6단계 | Contact CRUD, CSV Import |
| `recaptcha` | 7단계 | reCAPTCHA 서버 검증 |
| `link-survey` | 7단계 | Link Survey 접근 제어 |
| `single-use` | 7단계 | Single-use ID 생성/검증 |
| `personal-link` | 7단계 | JWT 토큰 생성/검증 |
| `response` | 8단계 | 응답 CRUD, 필터 엔진 |
| `tag` | 8단계 | 태그 CRUD |
| `pipeline` | 8단계 | 응답 파이프라인 오케스트레이터 |
| `webhook` | 8단계 | 웹훅 CRUD, Standard Webhooks |
| `webhook-dispatch` | 8단계 | 웹훅 발송, HMAC-SHA256 |
| `follow-up` | 8단계 | Follow-Up 평가/발송 |
| `integration` | 8단계 | Slack/Sheets/Notion/Airtable |
| `notification` | 8단계 | 응답 알림 |
| `analytics` | 8단계 | 분석/요약/내보내기 |

### 12.2 클라이언트 라이브러리 (`libs/client/`)

| 모듈 | 생성 단계 | 주요 역할 |
|------|----------|----------|
| `organization` | 2단계 | 조직 컨텍스트, 전환 UI |
| `project` | 2단계 | 프로젝트 컨텍스트, 설정 UI |
| `survey` | 4단계 | 설문 API 클라이언트, 훅 |
| `survey-editor` | 5단계 | **Builder Store 기반 에디터** (useBuilderStore + BuilderEntities + DnD 통합) |
| `styling` | 5단계 | 스타일링 편집기 UI |
| `multilingual` | 5단계 | 다국어 편집기 UI |
| `quota` | 4단계 | 쿼터 편집기 UI |
| `contact` | 6단계 | 연락처 관리 UI |
| `link-survey` | 7단계 | Link Survey 페이지 |
| `share` | 7단계 | Share Modal 탭 컴포넌트 |
| `response` | 8단계 | 응답 목록/필터 UI |
| `analytics` | 8단계 | 분석 대시보드 UI |
| `notification` | 8단계 | 알림 설정 UI |

### 12.3 공유 패키지 (`packages/`) ⚠️ builder 반영

| 패키지 | 생성 단계 | 주요 역할 | builder 영향 |
|--------|----------|----------|-------------|
| `shared-i18n` | 1단계 | 서버/클라이언트 공유 로케일 상수 | 변경 없음 |
| **`survey-builder`** | **4단계** | **@coltorapps/builder 기반 surveyBuilder 인스턴스 + 16 Entity + ~40 Attribute + Zod 검증 (서버/클라이언트 공유)** | ⚠️ **신규** (기존 shared-types + survey-schema 통합 대체) |
| `shared` | 4단계 | 세그먼트/프리필/Recall 공유 유틸리티 | 변경 없음 |
| `logic-engine` | 4단계 | 조건부 로직 평가 공유 엔진 | 변경 없음 |
| `js-sdk` | 7단계 | @inquiry/js-sdk NPM 패키지 | 변경 없음 |
| `surveys` | 7단계 | @inquiry/surveys 설문 UI 렌더링 | 변경 없음 |

> **변경**: `packages/shared-types/`와 `packages/survey-schema/`가 `packages/survey-builder/`로 통합됨.
> `@coltorapps/builder`의 Entity/Attribute 시스템이 TypeScript 타입 추론과 Zod 런타임 검증을 모두 제공하므로 별도 분리 불필요.

---

## 13. Prisma 스키마 변경 총괄

### 13.1 단계별 신규 모델

| 단계 | 신규 모델 |
|------|----------|
| 1단계 | StripeEvent |
| 2단계 | Project, Environment, ActionClass, Language |
| 3단계 | ApiKey, ApiKeyEnvironmentPermission |
| 4단계 | Survey (완전 모델), Quota, ResponseQuota |
| 6단계 | Contact, ContactAttributeKey, ContactAttributeValue, PersonalizedLink, Segment |
| 7단계 | Display, SurveyTrigger |
| 8단계 | Response (완전 모델), Tag, ResponseTag, Webhook, Integration, FollowUpResult |

### 13.2 기존 모델 확장

| 모델 | 추가 필드 | 단계 |
|------|----------|------|
| User | `twoFactorSecret`, `twoFactorEnabled`, `backupCodes`, `notificationSettings` | 2단계 |
| Organization | `billing`(Json), `whitelabel`(Json), `isAIEnabled` | 2단계 |
| Membership | 복합 PK, `BILLING` 역할 추가 | 2단계 |

---

## 14. 리스크 총괄

### 14.1 프로젝트 수준 리스크

| 리스크 | 영향 | 확률 | 완화 전략 |
|--------|------|------|----------|
| Redis 인프라 의존성 | 높 | 중 | `RATE_LIMIT_DISABLED` 환경변수 + 인메모리 폴백 |
| 선행 모델 미구현 시 후속 기능 지연 | 높 | 중 | 스텁 인터페이스 + Contract-First 개발 |
| Stripe API 외부 의존성 | 중 | 낮 | Stripe Test Mode + Mock 서버 |
| 15개 로케일 번역 품질 | 중 | 높 | 기계 번역 초안 + 사후 검수 |
| class-validator → Zod 마이그레이션 혼재 | 중 | 높 | 신규 코드만 Zod, 기존 코드 점진적 전환 |
| SDK Shadow DOM 브라우저 호환성 | 중 | 낮 | 주요 브라우저 E2E 테스트 |
| **@coltorapps/builder 라이브러리 의존성** | **중** | **낮** | **라이브러리가 headless + 순수 함수 기반이므로 대체 용이. Entity/Attribute 정의는 순수 TypeScript이므로 락인 위험 낮음. 버전 고정 + 핵심 API 래핑** |
| **Builder flat entity map ↔ API 구조 변환 비용** | **중** | **중** | **Schema 변환 유틸리티를 단일 파일로 중앙화. 양방향 변환 + 단위 테스트로 데이터 무결성 보장** |
| **Builder Store + SurveyMetaContext 상태 동기화** | **중** | **중** | **Builder Store(Block/Element)와 MetaContext(WelcomeCard/Ending 등)의 자동 저장 타이밍을 단일 useAutoSave 훅으로 통합. debounce 10초로 일관성 유지** |

### 14.2 단계별 크리티컬 패스

1단계 → 2단계: **Redis 모듈 + License 시스템**이 2단계의 Enterprise 기능 전제
4단계 → 5단계: **`packages/survey-builder/` (Entity/Attribute 정의)**가 에디터 UI 전제 ⚠️ builder 관련
4단계 내부: **FSD-008 Phase 1~2 (Prisma + survey-builder 패키지 초기)**가 FSD-009 Entity 상세 정의 전제
6단계 → 7단계: **Contact 모델 + Segment**가 타겟팅 전제
7단계 → 8단계: **Response 스텁**이 응답 처리 전제 (조기 정의 필요)
8단계 내부: **FSD-021의 survey-builder 패키지**는 4단계에서 이미 완성 → 재사용

---

## 15. 실행 권장 방식

### 15.1 개발 사이클
1. 각 단계 시작 시 해당 단계의 **Prisma 스키마 변경을 일괄 적용**
2. 서버 API를 먼저 완성하고, 클라이언트 UI를 이후 구현
3. 각 마일스톤 완료 시 **빌드 검증** (`pnpm build`)
4. 단계 완료 시 **E2E 시나리오 실행** (누적)

### 15.2 빌드/커밋 정책
- 마일스톤 단위로 커밋 (1 마일스톤 = 1~2 커밋)
- 빌드 성공 후 즉시 커밋 (CLAUDE.md 정책)
- 커밋 메시지 한국어 작성

### 15.3 테스트 정책
- 서버: 각 Service에 대한 단위 테스트 + 주요 API 통합 테스트
- 클라이언트: 핵심 훅/유틸리티 단위 테스트 + 주요 플로우 E2E
- 커버리지 목표: 서버 80%+, 클라이언트 핵심 경로 70%+

---

## 부록 A: 구현 계획서 전체 목록

| # | 파일명 | 단계 |
|---|--------|------|
| 01 | [01-signup-login-session-plan.md](./01-signup-login-session-plan.md) | 2단계 |
| 02 | [02-2FA-SSO-plan.md](./02-2FA-SSO-plan.md) | 2단계 |
| 03 | [03-organization-management-plan.md](./03-organization-management-plan.md) | 2단계 |
| 04 | [04-member-invite-RBAC-plan.md](./04-member-invite-RBAC-plan.md) | 2단계 |
| 05 | [05-audit-log-plan.md](./05-audit-log-plan.md) | 1단계 |
| 06 | [06-project-environment-plan.md](./06-project-environment-plan.md) | 2단계 |
| 07 | [07-SDK-widget-GTM-plan.md](./07-SDK-widget-GTM-plan.md) | 7단계 |
| 08 | [08-survey-creation-type-lifecycle-plan.md](./08-survey-creation-type-lifecycle-plan.md) | 4단계 |
| 09 | [09-question-type-catalog-plan.md](./09-question-type-catalog-plan.md) | 4단계 |
| 10 | [10-survey-editor-UX-plan.md](./10-survey-editor-UX-plan.md) | 5단계 |
| 11 | [11-styling-theme-background-plan.md](./11-styling-theme-background-plan.md) | 5단계 |
| 12 | [12-conditional-logic-engine-plan.md](./12-conditional-logic-engine-plan.md) | 4단계 |
| 13 | [13-variables-hidden-fields-recall-plan.md](./13-variables-hidden-fields-recall-plan.md) | 4단계 |
| 14 | [14-quota-management-plan.md](./14-quota-management-plan.md) | 4단계 |
| 15 | [15-multilingual-survey-plan.md](./15-multilingual-survey-plan.md) | 5단계 |
| 16 | [16-link-share-embed-plan.md](./16-link-share-embed-plan.md) | 7단계 |
| 17 | [17-single-use-personal-link-plan.md](./17-single-use-personal-link-plan.md) | 7단계 |
| 18 | [18-access-control-prefill-plan.md](./18-access-control-prefill-plan.md) | 7단계 |
| 19 | [19-targeting-trigger-reexposure-plan.md](./19-targeting-trigger-reexposure-plan.md) | 7단계 |
| 20 | [20-user-identification-spam-prevention-plan.md](./20-user-identification-spam-prevention-plan.md) | 7단계 |
| 21 | [21-response-management-partial-response-plan.md](./21-response-management-partial-response-plan.md) | 8단계 |
| 22 | [22-response-pipeline-follow-up-email-plan.md](./22-response-pipeline-follow-up-email-plan.md) | 8단계 |
| 23 | [23-webhook-connector-plan.md](./23-webhook-connector-plan.md) | 8단계 |
| 24 | [24-REST-API-headless-plan.md](./24-REST-API-headless-plan.md) | 3단계 |
| 25 | [25-analytics-summary-export-plan.md](./25-analytics-summary-export-plan.md) | 8단계 |
| 26 | [26-contact-management-plan.md](./26-contact-management-plan.md) | 6단계 |
| 27 | [27-segment-filter-plan.md](./27-segment-filter-plan.md) | 6단계 |
| 28 | [28-response-notification-plan.md](./28-response-notification-plan.md) | 8단계 |
| 29 | [29-subscription-billing-branding-plan.md](./29-subscription-billing-branding-plan.md) | 1단계 |
| 30 | [30-admin-UI-multilingual-plan.md](./30-admin-UI-multilingual-plan.md) | 1단계 |
| 99 | [99-non-functional-interface-appendix-plan.md](./99-non-functional-interface-appendix-plan.md) | 1단계 |
