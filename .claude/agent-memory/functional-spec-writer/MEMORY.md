# Functional Spec Writer Memory

## Project Structure
- 요구사항 명세서 경로: `feature-segmantation/` (디렉토리명에 오타 있음, segmentation이 아닌 segmantation)
- 기능 명세서 경로: `functional-specification/`
- 비기능 요구사항/용어 정의: `feature-segmantation/99-non-functional-interface-appendix.md`
- 요구사항 명세서 인덱스/목차: `feature-segmantation/README.md` (30개 문서 + 부록, FR 매핑 포함)
- 기존 기능 명세서 예시: `functional-specification/00-infrastructure-setup.md` (git commit 1c60191, 현재 삭제 상태)

## Document Conventions
- 요구사항 명세서 문서번호: FSD-NNN (예: FSD-003)
- 기능 요구사항 범위: FR-NNN (예: FR-002)
- 상세 기능 요구사항 ID: FR-NNN-YY (예: FR-002-05)
- 기능 명세서 기능 ID: FN-NNN-YY (예: FN-003-01)
- 비즈니스 규칙 ID: BR-NN-NN (기능 번호-규칙 번호)
- 수용 기준 ID: AC-NNN-NN
- 비기능 요구사항: NFR-NNN

## Spec Writing Patterns
- 각 기능은 10개 하위 섹션: 기능 개요, 선행 조건, 후행 조건, 기본 흐름, 대안 흐름, 예외 흐름, 비즈니스 규칙, 데이터 요구사항, 화면/UI 요구사항, 비기능 요구사항
- RTM(요구사항 추적 매트릭스)에서 FR -> FN -> AC 매핑 필수
- 비기능 요구사항은 99번 부록 문서에서 NFR 번호를 참조
- Enterprise License 기능은 Feature Flag 조건을 명시해야 함
- 흐름(Flow)은 테이블 형태(단계/주체/동작)로 기술
- 에러 클래스: DatabaseError, ResourceNotFoundError 사용
- 캐시: 요청 수준(request-level) 캐시가 기본 전략, Next.js unstable_cache() 사용 금지

## Formbricks Domain Terms
- Organization: 최상위 테넌트, 모든 데이터 스코핑 기준
- Billing Plans: free, startup, custom (3종)
- MIU: Monthly Identified Users
- Multi-Org: Enterprise License Feature Flag로 제어
- Environment: production / development (Project 하위)

## Tech Stack References
- Zod: 런타임 유효성 검증 스키마
- Pino: 구조화된 로거
- Enterprise License: Feature Flag 기반 기능 활성화
- Prisma ORM + PostgreSQL

## Cross-references Between FSD Documents
- FSD-001: 회원가입/로그인/세션 (Community) -- 2FA/SSO는 이 Credentials Provider 흐름에 연계
- FSD-002: 2FA/SSO (Enterprise) -- FR-005(2FA), FR-006(SSO)
- FSD-003: Organization 관리
- FSD-004: RBAC/멤버 권한

## Domain Knowledge - Auth/License
- Enterprise License Feature Flag 기반 기능 제어 패턴
- License 캐싱: Memory 1분, Redis 24시간, Grace Period 3일
- 인증 라이브러리: next-auth 4.24.12 (patched)
- 암호화: AES 대칭 암호화 (환경변수 ENCRYPTION_KEY)
- 배포: Cloud vs Self-hosted (다른 Feature Flag 규칙, 특히 SAML은 Cloud에서 항상 비활성)

## Completed Specs
- 02-2FA-SSO.md: 2026-02-21 작성 (FSD-002 / FR-005, FR-006 기반, 8개 기능 명세)
- 03-organization-management.md: 2026-02-21 작성 (FSD-003 / FR-002 기반, 9개 기능 명세)
- 04-member-invite-RBAC.md: 2026-02-21 작성 (FSD-004 / FR-003, FR-004 기반, 11개 기능 명세)
- 30-admin-UI-multilingual.md: 2026-02-21 작성 (FSD-030 / FR-049 기반, 11개 기능 명세)
- 12-conditional-logic-engine.md: 2026-02-21 작성 (FSD-012 / FR-018 기반, 11개 기능 명세)
- 11-styling-theme-background.md: 2026-02-21 작성 (FSD-011 / FR-015~FR-017 기반, 11개 기능 명세)
- 21-response-management-partial-response.md: 2026-02-21 작성 (FSD-021 / FR-035, FR-036 기반, 9개 기능 명세)
- 07-SDK-widget-GTM.md: 2026-02-21 작성 (FSD-007 / FR-010, FR-042 기반, 10개 기능 명세)
- 13-variables-hidden-fields-recall.md: 2026-02-21 작성 (FSD-013 / FR-019~FR-021 기반, 15개 기능 명세)
- 24-REST-API-headless.md: 2026-02-21 작성 (FSD-024 / FR-039, FR-043 기반, 9개 기능 명세)
- 26-contact-management.md: 2026-02-21 작성 (FSD-026 / FR-045 기반, 8개 기능 명세)
- 20-user-identification-spam-prevention.md: 2026-02-21 작성 (FSD-020 / FR-031~FR-032 기반, 14개 기능 명세)
- 10-survey-editor-UX.md: 2026-02-21 작성 (FSD-010 / FR-014 기반, 17개 기능 명세)
- 08-survey-creation-type-lifecycle.md: 2026-02-21 작성 (FSD-008 / FR-011, FR-012, FR-047 기반, 13개 기능 명세)
- 99-non-functional-interface-appendix.md: 2026-02-21 작성 (FSD-099 / NFR-001~010, IFR-001~011, 제약사항, 용어사전, 플랜 매트릭스)

## Domain Knowledge - Styling
- 계층적 스타일링: 시스템 기본값 -> Project -> Survey (오버라이드 시)
- 모든 스타일링 기능은 Community 라이선스 (Enterprise 제한 없음)
- 배경/로고 설정은 Link Survey에서만 가능 (App Survey 불가)
- Legacy 마이그레이션: v4.6 -> v4.7 필드 분리 패턴
- Suggest Colors: Brand Color에서 색상 혼합 비율로 팔레트 자동 생성
