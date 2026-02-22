# Feature Implementation Planner - Agent Memory

## 프로젝트 구조
- 모노레포: apps/server (NestJS 11), apps/client (Next.js 16 + React 19), packages/db (Prisma + PostgreSQL)
- 서버 모듈: libs/server/ (auth, prisma, email, rate-limit, audit-log)
- 클라이언트 라이브러리: libs/client/ (auth, core, ui - shadcn/ui)
- i18n: apps/client/src/app/i18n/locales/ (ko/en), react-i18next
- Nx 모노레포 기반 라이브러리 생성: `nx g @nx/nest:library`, `nx g @nx/react:library`

## DB 모델 (현재)
- User, Account, RefreshToken, Organization, Membership, Invite, AuditLog
- Project, Environment, Survey 는 FSD-008 구현 시 추가 예정

## 핵심 설계 결정 (FSD-008)
- @coltorapps/builder 기반 설문 빌더 도입
- Survey 모델의 `schema Json` 필드에 builder flat entity map 저장
- Block + 질문 유형 = builder Entity / Welcome Card, Ending, Variables, Hidden Fields = 별도 JSON 필드
- 서버/클라이언트 공유: packages/survey-builder-config (surveyBuilder 정의)
- 서버 검증: validateSchema() (발행 시) + validateSchemaShape() (자동 저장 시)
- CUID2를 entity ID로 사용 (generateEntityId/validateEntityId)

## 패턴 및 규칙
- CLAUDE.md: 코드 주석 필수, 문서화 code-history/ 디렉토리에 저장
- 빌드 성공 후 즉시 커밋 (사용자 확인 불요), 커밋 메시지 한국어
- 모든 UI 문자열은 i18next로 관리 (하드코딩 금지)
- 구현 계획 저장 경로: feature-implement-plan/ 디렉토리

## FS-009 (질문 유형 카탈로그) 결정 사항
- 패키지명: packages/survey-builder (@inquiry/survey-builder)
- 15가지 Element Entity + 1 Block Entity = 16 Entity
- Attribute 원자적 설계: 공통 6개 + 유형별 고유 Attribute (총 ~40개)
- Validation Engine: builder 외부 로직으로 별도 모듈 (24가지 Rule, and/or 결합)
- Shuffle 유틸리티: builder 외부 도메인 로직으로 별도 유틸
- 교차 검증: Entity 내 attributesExtensions (charLimit, dismissible)

## FS-010 (설문 편집기 UX) 결정 사항 (2026-02-22 재작성)
- 3계층 상태관리: Builder Store (Entity CRUD) + SurveyMetaContext (비-Entity) + EditorUIContext (UI)
- WelcomeCard/Endings/HiddenFields/Variables = Builder Schema 외부 (SurveyMetaContext)
- 이유: 단일 인스턴스(WelcomeCard), 메타데이터(HiddenFields/Variables), 독립 배치(Endings)
- Schema 변환: surveyToBuilderData / builderDataToSurvey (schema-converter.ts)
- 자동 저장: Builder Store 이벤트 구독 + debounce 10초 (기존 Ref 폴링 대체)
- DnD: Block=root 순서변경(setData root), Element=children 순서변경(setData children)
- 프리뷰: useInterpreterStore로 Builder Schema 실시간 해석
- 편집기 라이브러리: libs/client/survey-editor/
- 기존 계획 대비 삭제: survey-editor.reducer.ts, block-utils.ts, element-utils.ts

## 참고 문서
- builder 스킬: .claude/skills/builder/ (36개 규칙, 8개 카테고리)
- 구현 순서: functional-specification-implementation-order.md
