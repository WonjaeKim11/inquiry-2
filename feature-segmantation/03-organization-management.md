# 조직(Organization) 관리 -- 요구사항 명세서

> **문서번호**: FSD-003 | **FR 범위**: FR-002
> **라이선스**: Community (기본) / Enterprise (Multi-Org)

---

## 1. 목적/배경

Formbricks 플랫폼의 최상위 테넌트(tenant) 단위인 Organization 관리에 대한 요구사항을 정의한다. Organization은 모든 데이터(Project, Survey, Response 등)의 스코핑 기준이 되며, Billing 정보와 Whitelabel 설정을 포함한다. Self-hosted 환경에서는 일반적으로 단일 Organization으로 운영되고, Cloud 환경이나 Enterprise License의 Multi-Org Feature Flag가 활성화된 경우 Multi-Organization을 지원한다.

---

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- Organization CRUD (생성, 조회, 수정, 삭제)
- Organization Billing 모델 (Plan, Limits, Period)
- Organization Whitelabel 설정
- Multi-Org License 제어
- Organization 기반 멀티테넌시 구조
- Monthly Response/MIU 카운팅

### Out-of-scope
- 멤버 초대 및 RBAC (FSD-004에서 다룸)
- Stripe 결제 연동 세부사항
- Project CRUD (별도 명세)

---

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| Organization Owner | 조직 생성, 수정, 삭제 권한을 가진 사용자 |
| Organization Manager | 조직 설정 관리 권한을 가진 사용자 |
| Organization Member | 조직에 소속된 일반 사용자 |
| Billing Manager | Cloud 환경에서 결제 관리를 담당하는 사용자 |
| 시스템 관리자 | Self-hosted 환경에서 조직을 관리하는 운영자 |

---

## 4. 기능 요구사항

### FR-002-01: Organization 데이터 모델

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| id | String | cuid() | 고유 식별자 |
| createdAt | DateTime | 생성 시각 | 생성일 |
| updatedAt | DateTime | 수정 시 자동 갱신 | 수정일 |
| name | String | - | 조직 이름 (필수) |
| memberships | 관계 | - | 조직-사용자 멤버십 목록 |
| projects | 관계 | - | 소속 프로젝트 목록 |
| billing | JSON | 생성 시 설정 | Billing Plan, Limits, Period 정보 |
| whitelabel | JSON | 빈 객체 | Whitelabel 설정 (logoUrl, faviconUrl) |
| invites | 관계 | - | 초대 목록 |
| isAIEnabled | Boolean | false | AI 기능 활성화 여부 |
| teams | 관계 | - | 팀 목록 |
| apiKeys | 관계 | - | API 키 목록 |

### FR-002-02: Organization 타입 정의

**Organization 유효성 검사 규칙:**
- id: cuid2 형식
- name: 필수, trim 후 최소 1자
- whitelabel: 선택적
- billing: 필수 (Billing 스키마 적용)
- isAIEnabled: Boolean (기본 false)

**Organization 생성 입력:**
- id: 선택적 (cuid2 형식)
- name: 필수

**Organization 수정 입력:**
- name: 조직 이름
- whitelabel: 선택적
- billing: 선택적
- isAIEnabled: 선택적

### FR-002-03: Billing 모델

**Billing Plan 종류:**

| Plan | 설명 |
|------|------|
| free | 무료 요금제 |
| startup | 스타트업 요금제 |
| custom | 커스텀/엔터프라이즈 요금제 |

**Billing Period:** monthly 또는 yearly

**Billing Plan별 제한:**

| Plan | Projects | Responses/월 | MIU/월 |
|------|----------|-------------|--------|
| Free | 3 | 1,500 | 2,000 |
| Startup | 3 | 5,000 | 7,500 |
| Custom | 무제한 | 무제한 | 무제한 |

**Billing 기본값:**
- 프로젝트 제한: null이면 무제한
- 월간 응답 제한: null이면 무제한
- 월간 식별 사용자(MIU) 제한: null이면 무제한
- Stripe 고객 ID: nullable
- 기본 Plan: free
- 기본 Period: monthly
- 기본 Limits: 프로젝트 3, 월간 응답 1500, MIU 2000

### FR-002-04: Whitelabel 설정

- 로고 URL: Organization 로고 URL (nullable)
- 파비콘 URL: Favicon URL (null 또는 미설정 가능)

### FR-002-05: Organization 생성

**생성 시 기본값:**
- Plan: free
- Period: monthly
- Limits: 프로젝트 3, 월간 응답 1500, MIU 2000
- Stripe 고객 ID: null
- 과금 시작일: 생성 시점

### FR-002-06: Organization 조회

| 조회 방식 | 설명 | 캐시 |
|-----------|------|------|
| ID로 단일 조회 | 조직 ID로 조회 | 요청 수준 캐시 적용 |
| 사용자 소속 조직 목록 | 사용자 ID + 페이지네이션 | 요청 수준 캐시 적용 |
| Environment 경유 조직 조회 | Environment ID를 통해 상위 조직 조회 | 요청 수준 캐시 적용 |
| 유일한 Owner인 조직 조회 | 사용자가 유일한 Owner인 조직 목록 | 요청 수준 캐시 적용 |

### FR-002-07: Organization 수정

- 존재하지 않는 Organization 업데이트 시 리소스 미발견 에러 발생
- 업데이트 시 memberships, projects, environments 데이터도 함께 조회 (캐시 무효화 목적)

### FR-002-08: Organization 삭제

- Cascade 삭제: Organization 삭제 시 관련 Membership, Project, Invite, Team, ApiKey 모두 삭제
- 삭제 전 memberships의 userId, projects의 id 및 environments의 id 조회 (캐시 무효화 목적)

### FR-002-09: Monthly Response Count 조회

- Billing Period 시작일 기준으로 해당 기간의 전체 Response 수 집계
- Organization의 모든 Project > Environment > Survey > Response를 대상으로 합산

### FR-002-10: Multi-Org License

- Enterprise License의 Multi-Org Feature Flag가 true여야 Multi-Organization 기능 활성화
- Multi-Org가 비활성화된 경우:
  - 회원가입 시 새 Organization 자동 생성 안 됨
  - SSO 신규 사용자는 기존 Organization에 할당
  - 조직 탈퇴 불가

### FR-002-11: Survey Response 알림 구독

- Survey 생성자의 알림 설정에 해당 Survey에 대한 알림 활성화 추가
- 해당 Organization의 알림을 구독 해제한 경우 구독하지 않음

---

## 5. 비기능 요구사항

### NFR-001: 캐싱

모든 조회 함수는 요청 수준(request-level) 캐시를 적용한다. 이는 동일 요청 내에서 중복 DB 쿼리를 방지한다.

### NFR-002: 입력 검증

모든 서비스 함수는 입력 검증 유틸리티를 사용하여 입력 파라미터를 유효성 검사 스키마로 검증한다.

### NFR-003: 에러 처리

| 에러 유형 | 조건 | 에러 클래스 |
|-----------|------|-------------|
| DB 조회 실패 | 데이터베이스 에러 | DatabaseError |
| 리소스 미존재 | 조회 결과 없음 | ResourceNotFoundError |
| 업데이트 대상 미존재 | 데이터베이스 P2025 에러 코드 | ResourceNotFoundError |

### NFR-004: 멀티테넌시

Organization은 시스템의 최상위 테넌트로, 모든 하위 데이터는 Organization에 의해 스코핑된다:

- Organization
  - Membership (사용자-조직 연결)
  - Invite (초대)
  - Team (팀)
  - ApiKey (API 키)
  - Project
    - Environment (production / development)
      - Survey
      - Contact
      - ActionClass
      - 기타 하위 리소스

---

## 6. 정책/제약

| 항목 | 값 |
|------|----|
| Organization ID 형식 | cuid() |
| Organization 이름 최소 길이 | 1자 (trim 후) |
| 기본 Billing Plan | free |
| 기본 Billing Period | monthly |
| Free Plan Projects 제한 | 3 |
| Free Plan Responses/월 제한 | 1,500 |
| Free Plan MIU/월 제한 | 2,000 |
| Startup Plan Projects 제한 | 3 |
| Startup Plan Responses/월 제한 | 5,000 |
| Startup Plan MIU/월 제한 | 7,500 |
| Custom Plan 제한 | 모두 무제한 (null) |
| AI 기능 기본값 | false |
| Whitelabel 기본값 | 빈 객체 |
| Multi-Org Feature Flag | Enterprise License에 의해 제어 |
| Pagination 기본 크기 | 시스템 상수에 의해 결정 |

### Stripe 가격 Lookup Keys

| Key | 설명 |
|-----|------|
| STARTUP_MAY25_MONTHLY | Startup 요금제 월간 가격 |
| STARTUP_MAY25_YEARLY | Startup 요금제 연간 가격 |

### Stripe 프로젝트 이름

| 내부명 | 표시 이름 |
|--------|-----------|
| STARTUP | Formbricks Startup |
| CUSTOM | Formbricks Custom |

### Organization Projects Limit 결정 로직

- Cloud: License 활성 시 billing limits 적용, 비활성 시 3개 고정
- Self-hosted: License 활성 + projects feature 설정 시 해당 값, 아니면 3개 고정

---

## 7. 수용 기준 (Acceptance Criteria)

### AC-002-01: Organization 생성
- [ ] 유효한 이름(1자 이상)으로 Organization 생성 가능
- [ ] 생성 시 기본 Billing: plan=free, period=monthly, limits=FREE 기본값
- [ ] 생성 시 AI 기능 비활성화, Whitelabel 빈 객체
- [ ] 생성된 Organization의 ID는 cuid 형식

### AC-002-02: Organization 조회
- [ ] ID로 단일 Organization 조회 가능
- [ ] 사용자 ID로 소속 Organization 목록 조회 가능 (페이지네이션 지원)
- [ ] Environment ID를 통해 상위 Organization 조회 가능
- [ ] 사용자가 유일한 Owner인 Organization 목록 조회 가능

### AC-002-03: Organization 수정
- [ ] 이름, whitelabel, billing, AI 기능 활성화 필드 수정 가능
- [ ] 존재하지 않는 Organization 수정 시 ResourceNotFoundError

### AC-002-04: Organization 삭제
- [ ] Organization 삭제 시 관련 Membership, Project, Invite, Team 모두 Cascade 삭제
- [ ] 존재하지 않는 Organization 삭제 시 DatabaseError

### AC-002-05: Billing Limits
- [ ] Free Plan: projects=3, responses=1500/월, miu=2000/월
- [ ] Startup Plan: projects=3, responses=5000/월, miu=7500/월
- [ ] Custom Plan: 모든 제한 해제 (null=무제한)
- [ ] Monthly Response Count가 Billing Period 시작일 기준으로 정확히 집계

### AC-002-06: Multi-Org
- [ ] Enterprise License의 Multi-Org Feature Flag가 false이면 새 Organization 생성 불가 (회원가입 시)
- [ ] Multi-Org 비활성 시 조직 탈퇴 불가
- [ ] Multi-Org 활성 시 사용자가 여러 Organization에 소속 가능
