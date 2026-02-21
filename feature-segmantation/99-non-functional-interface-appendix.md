# 비기능 요구사항 / 인터페이스 요구사항 / 부록 — 요구사항 명세서

> **문서번호**: FSD-099

---

## 1. 비기능 요구사항 (NFR-001 ~ NFR-010)

### NFR-001: 성능 (Performance)

| 항목 | 목표 | 근거 |
|------|------|------|
| 설문 로딩 | 2초 이내 | UMD 번들 사전 빌드, CDN 제공 |
| API 응답 시간 | 평균 2초 이내 | 요청 단위 중복 제거 + Redis 캐싱 |
| 페이지네이션 | 커서 기반 또는 offset 기반 | 페이지당 30건(기본), 설문 12건, 응답 25건 |
| License 캐시 | Memory 1분, Redis 24시간 | 라이선스 체크 API 호출 최소화 |
| Webhook Timeout | 5초 | Pipeline 외부 호출 제한 시간 |

**캐싱 전략**:
- **요청 단위 캐시**: 서버 함수 중복 제거 (연락처, 세그먼트 조회 등)
- **Redis 캐시**: 비용이 높은 데이터 조회 결과 캐싱
- **Memory Cache**: License 체크 결과 프로세스 내 캐시 (1분 TTL)
- Next.js unstable_cache() 사용 금지 (프로젝트 정책)

### NFR-002: 가용성 (Availability)

| 항목 | 목표 | 근거 |
|------|------|------|
| Uptime SLA | 99.9% (Custom 플랜) | Cloud Custom 플랜 명세 |
| License Grace Period | 3일 | 라이선스 서버 접근 불가 시 유예 기간 |
| License 이전 결과 TTL | 4일 | Grace Period용 이전 결과 보존 |
| API Retry | 최대 3회, 지수 백오프 | 재시도 최대 횟수 3회, 초기 지연 1초 |
| Retry 대상 | 429, 502, 503, 504 | License API fetch 재시도 조건 |

### NFR-003: 보안 (Security)

| 항목 | 구현 |
|------|------|
| TLS | HTTPS 강제 |
| RBAC | 4단계 역할 (owner, manager, member, billing) |
| 2FA | TOTP 기반 2단계 인증 |
| SSO | Google, GitHub, Azure AD, OIDC |
| SAML | BoxyHQ SAML (Self-hosted 전용) |
| 암호화 | 암호화 키 환경변수 사용 |
| 비밀번호 정책 | 최소 8자, 대문자 1개+, 숫자 1개+ |
| API 인증 | API Key, Session 기반 |
| Webhook 서명 | Standard Webhooks 서명 방식 |
| Rate Limiting | Redis 기반, 엔드포인트별 설정 |
| License Key 보호 | 해시 후 캐시 키 사용 |

#### Rate Limiting 상세 설정

**인증 관련**:

| 엔드포인트 | 제한 |
|-----------|------|
| 로그인 | 10회/15분 |
| 회원가입 | 30회/시간 |
| 비밀번호 찾기 | 5회/시간 |
| 이메일 인증 | 10회/시간 |

**API 관련**:

| 엔드포인트 | 제한 |
|-----------|------|
| Management API v1 | 100회/분 |
| API v2 | 100회/분 |
| Client API | 100회/분 |

**액션 관련**:

| 엔드포인트 | 제한 |
|-----------|------|
| 이메일 업데이트 | 3회/시간 |
| 설문 후속 처리 | 50회/시간 |
| 링크 설문 이메일 발송 | 10회/시간 |
| 라이선스 재확인 | 5회/분 |

**스토리지 관련**:

| 엔드포인트 | 제한 |
|-----------|------|
| 업로드 | 5회/분 |
| 삭제 | 5회/분 |

- Rate limiting 환경변수를 통해 비활성화 가능
- Redis가 필요하며, Redis URL 환경변수로 설정

### NFR-004: GDPR 준수 (Compliance)

| 항목 | 구현 |
|------|------|
| 데이터 삭제 | 연락처 hard delete 지원 |
| 데이터 범위 | Organization/Environment 단위 데이터 격리 |
| 동의 관리 | 설문 내 동의 수집 가능 |
| 데이터 호스팅 | Frankfurt, EU (Cloud) |
| 개인정보 URL | 개인정보 처리 방침 URL 환경변수로 설정 |
| 이용약관 URL | 이용약관 URL 환경변수로 설정 |

### NFR-005: 브라우저 호환성

| 항목 | 지원 |
|------|------|
| 관리자 UI | 주요 최신 브라우저 (Chrome, Firefox, Safari, Edge) |
| 설문 런타임 | Shadow DOM 기반, 호스트 페이지 스타일 격리 |
| E2E 테스트 | Chromium (Playwright) |

### NFR-006: 확장성 (Scalability)

| 항목 | 값 |
|------|-----|
| 환경당 최대 속성 키 | 150개 |
| CSV 최대 레코드 | 10,000건 |
| API Bulk 최대 | 250건 |
| 병렬 처리 | 데이터 조회 및 이메일 발송에 병렬 처리 적용 |

### NFR-007: 유지보수성 (Maintainability)

| 항목 | 구현 |
|------|------|
| 코드 품질 | ESLint + SonarQube |
| 포맷팅 | Prettier (110자, 더블쿼트, 세미콜론) |
| 타입 안전성 | TypeScript strict, Zod 런타임 검증 |
| 테스트 | Vitest (단위) + Playwright (E2E) |
| 모노레포 | pnpm + Turborepo |
| 커밋 규칙 | Conventional Commits (fix:, feat:, chore:) |

### NFR-008: 로깅 및 모니터링

| 항목 | 구현 |
|------|------|
| 로거 | Pino 기반 로깅 라이브러리 |
| 에러 추적 | Sentry |
| 감사 로그 | 감사 이벤트 큐잉 (Enterprise) |
| 텔레메트리 | 익명 사용 통계 |

### NFR-009: 국제화 (Internationalization)

| 항목 | 값 |
|------|-----|
| 관리자 UI 언어 | 14개 (FSD-030 참조) |
| 메시지 포맷 | ICU Message Format |
| 폴백 | en-US |
| 번역 라이브러리 | react-i18next + i18next |

### NFR-010: 데이터 무결성

| 항목 | 구현 |
|------|------|
| 입력 검증 | Zod 스키마 기반 검증 유틸리티 |
| DB 제약 | Unique constraint, Foreign key, Index |
| Cascade 삭제 | 관련 레코드 자동 정리 |
| 트랜잭션 | DB 트랜잭션 (세그먼트 리셋 등) |

---

## 2. 인터페이스 요구사항 (IFR-001 ~ IFR-011)

### IFR-001: Client API

| 항목 | 상세 |
|------|------|
| 엔드포인트 | /api/v1/client/{environmentId}/..., /api/v2/client/{environmentId}/... |
| 인증 | Environment ID 기반 (공개 접근) |
| Rate Limit | 100회/분 |
| 용도 | SDK에서 설문 데이터 조회, 응답 제출, 사용자 식별 |

### IFR-002: Management API

| 항목 | 상세 |
|------|------|
| 엔드포인트 | /api/v1/management/..., /api/v2/management/... |
| 인증 | API Key (Bearer token) |
| Rate Limit | 100회/분 |
| 용도 | 설문, 응답, 연락처, 속성 키 CRUD |

### IFR-003: Webhook

| 항목 | 상세 |
|------|------|
| 트리거 | responseCreated, responseUpdated, responseFinished |
| 소스 | user, zapier, make, n8n, activepieces |
| 서명 | Standard Webhooks 방식 (webhook-id, webhook-timestamp, webhook-signature) |
| 비밀 키 | 선택적 |
| Timeout | 5초 |
| 필터 | 특정 설문 ID 또는 전체 설문 |

Standard Webhooks 헤더 구성:
- content-type: application/json
- webhook-id: UUID v7 기반 고유 메시지 ID
- webhook-timestamp: Unix timestamp (초)
- webhook-signature: HMAC 기반 서명 (비밀 키 설정 시)

### IFR-004: JavaScript SDK

| 항목 | 상세 |
|------|------|
| 패키지 | @formbricks/js, @formbricks/js-core |
| 배포 | UMD + ESM 번들 |
| 기능 | 설문 표시, 사용자 식별, 속성 설정, 이벤트 트리거 |

### IFR-005: GTM (Google Tag Manager)

설문 SDK를 GTM 컨테이너를 통해 삽입 가능.

### IFR-006: Email Embed

이메일 내 설문의 첫 번째 질문을 임베드하여 응답률 향상.

### IFR-007: Export

응답 데이터를 CSV/Excel 형식으로 내보내기 지원.

### IFR-008: SSO 통합

| 프로바이더 | 활성화 조건 |
|-----------|------------|
| Google | Client ID + Client Secret 설정 |
| GitHub | ID + Secret 설정 |
| Azure AD | Client ID + Client Secret + Tenant ID 설정 |
| OIDC | Client ID + Client Secret + Issuer 설정 |
| SAML | SAML DB URL 설정 (Self-hosted 전용) |

- Auth 라이브러리: next-auth 4.24.12 (패치 버전)
- SAML: BoxyHQ SAML 라이브러리
- SAML 설정: Tenant formbricks.com, Product formbricks, Audience https://saml.formbricks.com

### IFR-009: reCAPTCHA

| 항목 | 상세 |
|------|------|
| 활성화 조건 | reCAPTCHA Site Key + Secret Key 설정 + 스팸 보호 license flag |
| 용도 | 설문 응답 스팸 방지 |
| Cloud 제한 | Custom 플랜 전용 |

추가로 Turnstile(Cloudflare) 대안 지원.

### IFR-010: Stripe 결제

| 항목 | 상세 |
|------|------|
| API Version | 2024-06-20 |
| Webhook Events | checkout.session.completed, invoice.finalized, customer.subscription.deleted |
| 체험 기간 | 15일 |
| 프로모션 코드 | 지원 |
| 자동 세금 | 활성 |
| 세금 ID 수집 | 활성 |

### IFR-011: Standard Webhooks

Formbricks는 Standard Webhooks (https://www.standardwebhooks.com/) 사양을 따라 Webhook을 발송한다.

| 헤더 | 설명 |
|------|------|
| webhook-id | UUID v7 기반 고유 메시지 ID |
| webhook-timestamp | Unix timestamp (초) |
| webhook-signature | HMAC 기반 서명 (비밀 키 설정 시) |

---

## 3. 제약 사항

### 3.1 기술 제약

| 항목 | 제약 |
|------|------|
| Node.js | >= 20 (권장: 22.1.0) |
| pnpm | 10.28.2 |
| PostgreSQL | Prisma ORM 통한 접근 |
| Redis | Rate Limiting, 캐싱에 필수 |
| Next.js | 16 (App Router) |
| React | 19 |
| TypeScript | Strict mode |
| DB 제약 | skip/offset과 응답 count 동시 사용 금지 |

### 3.2 법적 제약

| 항목 | 제약 |
|------|------|
| 오픈소스 라이선스 | AGPLv3 (Community Edition) |
| Enterprise 기능 | 별도 상용 라이선스 필요 |
| GDPR | EU 데이터 보호 규정 준수 |
| Data Hosting | Cloud: Frankfurt, EU |

### 3.3 비용 제약

| 항목 | 제약 |
|------|------|
| Free 플랜 | 월 1,500 응답, 2,000 MIU, 3 프로젝트 |
| Startup 플랜 | 월 $49 / 연 $490 |
| Custom 플랜 | 별도 협의 |
| Self-hosted | Enterprise License 비용 별도 |

### 3.4 운영 제약

| 항목 | 제약 |
|------|------|
| Docker | PostgreSQL + Redis 컨테이너 필요 |
| 환경변수 | 환경변수 설정 파일 참조, 필수 변수 다수 |
| 빌드 | Turborepo 의존성 그래프 기반 |
| 배포 | Vercel 또는 Docker 기반 |

---

## 4. 용어 정의

| 용어 | 정의 |
|------|------|
| **Organization** | Formbricks의 최상위 조직 단위. 멤버십, 프로젝트, 빌링을 관리한다. Cloud에서는 여러 Organization을 지원하고, Self-hosted에서는 단일 Organization이 기본이다. |
| **Project** | Organization 하위의 프로젝트(워크스페이스). 각 프로젝트는 별도의 설문, 환경, 설정을 가진다. Organization ID와 이름 조합으로 유니크 제약이 설정된다. |
| **Environment** | 프로젝트 내 production과 development 두 환경을 제공. 데이터가 완전히 격리되며, 알림은 production 환경에서만 발송된다. |
| **Survey** | 사용자에게 표시되는 설문. link(독립 URL) 또는 app(인앱 임베드) 유형. 상태는 draft, inProgress, paused, completed. |
| **Response** | 설문에 대한 응답 데이터. finished 필드로 완료 여부 구분. |
| **Contact** | 설문 대상이 되는 사용자/고객. Environment 단위로 격리되며 속성(Attribute)을 가진다. Enterprise 기능. |
| **Contact Attribute** | 연락처에 연결된 속성 값. string, number, date 데이터 타입 지원. 문자열, 숫자, 날짜 세 컬럼에 저장. |
| **Contact Attribute Key** | 속성의 정의(스키마). default(시스템 정의, 수정 불가)와 custom(사용자 정의) 두 유형. |
| **Segment** | 속성, 행동, 디바이스 조건으로 연락처를 그룹화하는 필터 집합. Private(설문 전용)과 Public(재사용 가능) 구분. |
| **Hidden Field** | 설문 URL의 쿼리 파라미터로 전달되는 숨겨진 필드. 응답 데이터에 포함되지만 응답자에게 보이지 않는다. |
| **Variable** | 설문 내에서 사용되는 동적 변수. 계산, 조건 분기 등에 활용. |
| **Recall** | 이전 질문의 응답을 다음 질문에서 참조하는 기능. @{questionId} 구문 사용. |
| **Webhook** | 설문 이벤트 발생 시 외부 URL로 HTTP POST 요청을 보내는 기능. Standard Webhooks 사양 준수. |
| **MTU (Monthly Tracked Users)** | 월간 추적 사용자 수. 요금제 제한에 사용되는 지표 (현재 코드에서는 MIU로 표현). |
| **MIU (Monthly Identified Users)** | 월간 식별된 사용자 수. SDK를 통해 identify된 고유 사용자 수. |
| **Welcome Card** | 설문 시작 전 표시되는 환영 카드. 설문 소개, 설명 등을 포함. |
| **Pretty URL** | 설문의 사람이 읽기 쉬운 URL 경로. 기본 ID 대신 커스텀 경로 사용. |
| **Standard Webhooks** | Webhook 전송의 표준 사양. webhook-id, webhook-timestamp, webhook-signature 헤더 포함. |
| **Placement** | 인앱 설문 위젯의 화면 배치 위치. bottomLeft, bottomRight, topLeft, topRight, center. |
| **Overlay** | 인앱 설문 표시 시 배경 오버레이 스타일. none, light, dark. |
| **Follow-up** | 설문 응답 완료 후 자동으로 발송되는 후속 이메일. Enterprise 기능. |
| **Action Class** | 사용자 행동을 정의하는 클래스. 설문 트리거 조건에 사용. |
| **Display** | 설문이 사용자에게 표시된 기록. 동일 설문의 재표시 제어에 사용. |
| **displayOptions** | 설문 표시 옵션. displayOnce(1회), displayMultiple(무제한), displaySome(제한 횟수). |
| **Recontact Days** | 동일 사용자에게 다시 설문을 표시하기까지의 대기 일수. 기본값 7일. |
| **Tag** | 응답에 붙이는 라벨. 분류 및 필터링에 사용. |
| **Team** | Organization 내 하위 팀 단위. 프로젝트 접근 권한 관리에 사용. |
| **API Key** | Management API 인증에 사용되는 키. Environment 단위로 발급. |
| **Pipeline** | 설문 이벤트(응답 생성/완료 등) 발생 시 Webhook, 이메일, 통합 처리를 수행하는 내부 파이프라인. |
| **Grace Period** | Enterprise License 서버 접근 불가 시 기존 라이선스 상태를 유지하는 유예 기간 (3일). |
| **Whitelabel** | Formbricks 브랜딩을 제거하고 자사 브랜드로 대체하는 기능. 설문 로고, 이메일 로고, 파비콘 커스터마이징 포함. |

---

## 5. 부록 A: 기능-플랜 매트릭스

### 5.1 Community vs Enterprise 기능 매트릭스

| 기능 | Community (OSS) | Enterprise (Licensed) |
|------|:-----------:|:-----------:|
| 무제한 설문 생성 | O | O |
| Link / App 설문 | O | O |
| 응답 수집 | O | O |
| Hidden Fields | O | O |
| Logic Jumps | O | O |
| API & Webhooks | O | O |
| 모든 통합 | O | O |
| 관리자 UI 다국어 (14개) | O | O |
| 기본 역할 (owner, manager, member) | O | O |
| 연락처 관리 | X | O (contacts) |
| 세그먼트 필터 | X | O (contacts) |
| 2단계 인증 | X | O (twoFactorAuth) |
| SSO (Google/GitHub/Azure/OIDC) | X | O (sso) |
| SAML SSO | X | O (sso + saml) |
| 브랜딩 제거 | X | O (removeBranding) |
| Whitelabel (이메일/파비콘) | X | O (whitelabel) |
| 다국어 설문 | X | O (multiLanguageSurveys) |
| Team Access Roles | X | O (accessControl) |
| 다중 Organization | X | O (isMultiOrgEnabled) |
| 스팸 보호 (reCAPTCHA) | X | O (spamProtection) |
| AI 기능 | X | O (ai) |
| 감사 로그 | X | O (auditLogs) |
| 사용량 할당 제어 | X | O (quotas) |
| 프로젝트 수 제한 해제 | X | O (projects) |

### 5.2 Cloud 플랜별 기능 매트릭스

| 기능 | Free | Startup | Custom |
|------|:----:|:-------:|:------:|
| 월 응답 | 1,500 | 5,000 | 협의 |
| 월 MIU | 2,000 | 7,500 | 협의 |
| 프로젝트(워크스페이스) | 3 | 3 | 협의 |
| 팀 멤버 | 무제한 | 무제한 | 무제한 |
| 브랜딩 제거 | X | O | O |
| 속성 기반 타겟팅 | X | O | O |
| 큰 파일 업로드 | X | O | O |
| 다국어 설문 | X | X | O |
| Team Access Roles | X | X | O |
| Email Follow-ups | X | X | O |
| 사용량 할당 제어 | X | X | O |
| 스팸 보호 | X | X | O |
| Uptime SLA 99% | X | X | O |
| Premium Support | X | X | O |
| SAML SSO | X | X | X (Cloud 미지원) |

### 5.3 Self-hosted 전용 기능

| 기능 | 설명 |
|------|------|
| SAML SSO | SSO + SAML flag 조합으로 활성화 |
| Custom Head Scripts | Link 설문에 커스텀 HTML 스크립트 삽입 |
| 무제한 응답 | 라이선스 제한 외 소프트웨어 제한 없음 |
| 데이터 주권 | 자체 인프라에서 데이터 관리 |

---

## 6. 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-02-21 | 1.0 | 초기 작성 - 코드베이스 분석 기반 | Claude |
