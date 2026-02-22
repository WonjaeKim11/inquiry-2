# Feature Implementation Planner - Agent Memory

## 프로젝트 구조
- 모노레포: pnpm workspace + Nx
- `apps/client/` - Next.js 16 (App Router, `[lng]` 동적 라우트)
- `apps/server/` - NestJS 11
- `packages/db/` - Prisma 7 (PrismaPg adapter) + PostgreSQL
- `libs/server/` - auth, prisma, email, rate-limit, audit-log
- `libs/client/` - auth, core, ui (shadcn/ui)

## 인증 아키텍처
- NestJS Passport 기반 (Local, JWT, Google, GitHub 전략)
- JWT Access Token (메모리 저장) + Refresh Token (HTTP-only Cookie, DB 저장)
- Rate Limiting: `@nestjs/throttler` + CustomThrottlerGuard (IP 기반)
- Brevo/Turnstile: 환경변수 미설정 시 no-op (graceful degradation)
- Audit Log: fire-and-forget 패턴

## 코드 패턴
- 서버 DTO: class-validator + class-transformer 데코레이터
- 클라이언트 검증: zod 스키마 (서버 DTO와 규칙 동기화)
- i18n: react-i18next, ko/en 2개 언어, 중첩 JSON, `accept-language` 미들웨어
- UI: shadcn/ui (`@inquiry/client-ui`)
- API 호출: `apiFetch` 래퍼 (자동 401 retry)
- @Global() 데코레이터로 글로벌 모듈 (EmailModule, AuditLogModule)

## 명세서와 실제 아키텍처 차이점
- 명세서: Next-Auth 4.24.12 / 실제: NestJS Passport + 커스텀 JWT
- 명세서: Zod 검증 / 실제: class-validator (점진 마이그레이션 전략)
- 명세서: RBAC owner/manager/member/billing / 실제: OWNER/ADMIN/MEMBER

## FS-099 횡단 관심사 핵심 정리
- Redis: Rate Limiting + 캐싱 + License Grace Period 공통 인프라 (현재 미도입)
- 환경변수: 20+ 신규 필요 (Redis, Sentry, Stripe, SSO, reCAPTCHA 등)
- 에러 응답: 표준 포맷 필요 (현재 통일 안 됨)
- unstable_cache() 사용 금지, Prisma skip/offset + count 동시 사용 금지

## 기술 스택 상세
- NestJS 11, Next.js 16, React 19, Prisma 7, TS 5.9
- pnpm 10.28.2 + Nx 22.5, tsconfig Project References

## DB 모델 현황
- 구현됨: User, Account, RefreshToken, Organization, Membership, Invite, AuditLog
- 미구현: Environment, Project, Survey, Team, ApiKey 등
- MembershipRole: OWNER, ADMIN, MEMBER (BILLING 추가 필요)

## 인프라 현황
- docker-compose: PostgreSQL 17-alpine만 (Redis 미포함)
- .env.example: DB, JWT, OAuth, SMTP, Turnstile, Brevo만 정의됨

## 작성 완료된 구현 계획
- 전체 목록: `feature-implement-plan/` 디렉토리 (01~30, 99)
- 최신: FS-023 웹훅 및 커넥터: `feature-implement-plan/23-webhook-connector-plan.md`
- FS별 상세 아키텍처 결정: `feature-plans-detail.md` 참조

## 주요 FS별 핵심 아키텍처 (간략 인덱스)
- FS-006: Environment ID 격리, Project+Env $transaction 생성, ON DELETE CASCADE
- FS-008: Survey 30+필드, singleUse Json?, blocks Json, libs/server/survey/
- FS-009: Element = discriminatedUnion 15종, packages/survey-schema
- FS-011: Project.styling+Survey.styling Json, 5단계 우선순위 순수 함수
- FS-012: 로직 엔진 = 클라이언트 전용 순수 함수, packages/logic-engine
- FS-013: variables/hiddenFields = Survey Json 필드, Recall 패턴, packages/shared
- FS-014: Quota 별도 테이블, Enterprise, libs/server/quota/
- FS-015: Survey.languages Json, TI18nString, libs/server/multilingual
- FS-017: Single-use(stateless CUID2+AES) + Personal Link(JWT+AES 이중), ENCRYPTION_KEY
- FS-020: SDK user+reCAPTCHA 확장, libs/server/recaptcha/
- FS-024: 4개 라이브러리, API Key bcrypt, /api/v1/ + /api/v2/
- FS-026: Contact + AttributeKey + AttributeValue + PersonalizedLink(HMAC)
- FS-027: Segment 모델, DFS 순환 참조 탐지
- FS-022: Pipeline(3 모듈), FollowUp JSON in Survey, FollowUpResult 별도 테이블, InternalSecretGuard, DB Rate Limit
- FS-028: User.notificationSettings Json?, CronSecretGuard, Promise.allSettled, libs/server/notification/
- FS-023: Webhook(CRUD+Standard Webhooks 서명+발송엔진), Integration(4종 OAuth Provider), EventEmitter2, 5초 타임아웃
- FS-025: DB 변경 없음(조회 전용), libs/server/analytics/ + libs/client/analytics/, Cursor 페이지네이션, SVG 차트, xlsx 패키지
- FS-029: License + Billing + FeatureGating + Branding, Redis, @RequireFeature

## 설문 도메인 아키텍처 패턴 (@coltorapps/builder 기반)
- @coltorapps/builder 기반 설문 빌더 도입 (2026-02-22 결정)
- Survey 모델의 `schema Json` 필드에 builder flat entity map 저장 (`{ entities: {...}, root: [...] }`)
- Block + 질문 유형(15종) = builder Entity / Welcome Card, Ending, Variables, Hidden Fields = 별도 JSON 필드
- 서버/클라이언트 공유: `packages/survey-builder/` (surveyBuilder 정의, createBuilder)
- 서버 검증 이중 체계: validateSchema() (발행) + validateSchemaShape() (자동 저장, 동기)
- CUID2를 entity ID로 사용 (generateEntityId/validateEntityId)
- DnD: @dnd-kit + builderStore.setData() immutable 업데이트
- 클라이언트 편집기: `libs/client/survey-editor/` (3계층 상태: BuilderStore + SurveyMetaContext + EditorUIContext)
- 클라이언트 API: `libs/client/survey/`
- useBuilderStore(surveyBuilder, { initialData }) + BuilderEntities + createEntityComponent
- Schema 변환: Survey API 중첩 구조 <-> Builder flat entities (schema-converter.ts)
- 프리뷰: useInterpreterStore로 실시간 렌더링
- 참조: `.claude/skills/builder/` (36개 규칙, 8개 카테고리), `builder-patterns.md`
- 서버: `libs/server/survey/`

## CLAUDE.md 빌드/커밋 정책
- 코드 수정 후 반드시 빌드, 성공 시 즉시 커밋
- 커밋 메시지 한국어, Co-Authored-By 미포함

## 구현 순서 (functional-specification-implementation-order.md)
- 1단계: NFR(FS-099), 구독(FS-029), 감사로그(FS-005), i18n(FS-030)
- 2단계: 인증/테넌시 코어
- 이후: API > 설문 코어 > UX > 연락처 > 배포 > 응답 처리

## 구현 계획 작성 패턴
- 서버 라이브러리: `libs/server/[domain]/` 구조 (module, controller, service, dto, guards)
- 클라이언트 라이브러리: `libs/client/[domain]/` 구조 (context, components, schemas, types)
- DTO는 class-validator, 클라이언트 폼은 zod 스키마
- OrgRoleGuard 패턴으로 Organization 역할 기반 권한 검증
- AuditLogService.log() fire-and-forget 감사 로그
- 파일 변경 계획에 shadcn/ui 컴포넌트 추가 항목 포함

## 상세 참조 파일
- `feature-plans-detail.md` - FS별 상세 아키텍처 결정 사항
- `fs-021-response-management.md` - FS-021 응답 관리 상세
