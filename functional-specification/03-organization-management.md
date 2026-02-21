# 기능 명세서 (Functional Specification) -- 조직(Organization) 관리

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | v1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-003 `feature-segmantation/03-organization-management.md` (FR-002) |
| 상태 | 초안 |

---

## 2. 개요

### 2.1 목적

Inquiry 플랫폼의 최상위 테넌트(tenant) 단위인 Organization의 생성, 조회, 수정, 삭제 및 관련 Billing/Whitelabel 관리 기능에 대한 상세 기능 명세를 정의한다. 이 문서는 요구사항 명세서 FSD-003을 기반으로, 개발팀이 구현 가능한 수준의 세부 사항을 기술한다.

### 2.2 범위

**포함:**
- Organization CRUD (생성, 조회, 수정, 삭제)
- Organization Billing 모델 (Plan, Limits, Period)
- Organization Whitelabel 설정
- Multi-Org License 제어
- Organization 기반 멀티테넌시 구조
- Monthly Response/MIU 카운팅

**제외:**
- 멤버 초대 및 RBAC (FSD-004 / 별도 기능 명세서에서 다룸)
- Stripe 결제 연동 세부사항 (FSD-029에서 다룸)
- Project CRUD (FSD-006에서 다룸)

### 2.3 대상 사용자

| 역할 | 설명 |
|------|------|
| Organization Owner | 조직 생성, 수정, 삭제 권한을 가진 사용자 |
| Organization Manager | 조직 설정 관리 권한을 가진 사용자 |
| Organization Member | 조직에 소속된 일반 사용자 |
| Billing Manager | Cloud 환경에서 결제 관리를 담당하는 사용자 |
| 시스템 관리자 | Self-hosted 환경에서 조직을 관리하는 운영자 |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| Organization | 플랫폼의 최상위 테넌트 단위. 모든 데이터(Project, Survey, Response 등)의 스코핑 기준 |
| Billing Plan | 조직에 적용되는 요금제 (free, startup, custom) |
| Billing Period | 과금 주기 (monthly 또는 yearly) |
| MIU (Monthly Identified Users) | 월간 식별 사용자 수. Billing Limit 산정의 기준 지표 |
| Whitelabel | 조직 브랜드 커스터마이징 설정 (로고, 파비콘) |
| Multi-Org | Enterprise License에 의해 제어되는 다중 조직 지원 기능 |
| Cascade 삭제 | 상위 엔티티 삭제 시 연관된 하위 엔티티를 연쇄적으로 삭제하는 방식 |
| cuid / cuid2 | 충돌 방지 고유 식별자 생성 알고리즘 |
| Tenant | 멀티테넌트 아키텍처에서 데이터 격리의 단위 |
| Feature Flag | 특정 기능의 활성화/비활성화를 제어하는 설정 값 |

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
Organization (최상위 테넌트)
├── Membership (사용자-조직 연결)
├── Invite (초대)
├── Team (팀)
├── ApiKey (API 키)
├── Billing (요금제 정보 - JSON 내장)
├── Whitelabel (브랜드 설정 - JSON 내장)
└── Project
    └── Environment (production / development)
        ├── Survey
        ├── Contact
        ├── ActionClass
        └── 기타 하위 리소스
```

### 3.2 주요 기능 목록 (Feature List)

| 기능 ID | 기능명 | 우선순위 | 관련 요구사항 |
|---------|--------|---------|-------------|
| FN-003-01 | Organization 생성 | 필수 | FR-002-05 |
| FN-003-02 | Organization 조회 | 필수 | FR-002-06 |
| FN-003-03 | Organization 수정 | 필수 | FR-002-07 |
| FN-003-04 | Organization 삭제 | 필수 | FR-002-08 |
| FN-003-05 | Billing 모델 관리 | 필수 | FR-002-03 |
| FN-003-06 | Whitelabel 설정 | 선택 | FR-002-04 |
| FN-003-07 | Monthly Response Count 조회 | 필수 | FR-002-09 |
| FN-003-08 | Multi-Org License 제어 | 조건부 필수 | FR-002-10 |
| FN-003-09 | Survey Response 알림 구독 | 필수 | FR-002-11 |

### 3.3 기능 간 관계도

```
[Organization 생성 (FN-003-01)]
    ├─→ Billing 기본값 설정 (FN-003-05)
    ├─→ Whitelabel 기본값 설정 (FN-003-06)
    └─→ Multi-Org License 검증 (FN-003-08)

[Organization 조회 (FN-003-02)]
    └─→ Monthly Response Count 조회 (FN-003-07)

[Organization 수정 (FN-003-03)]
    ├─→ Billing 모델 변경 (FN-003-05)
    └─→ Whitelabel 변경 (FN-003-06)

[Organization 삭제 (FN-003-04)]
    └─→ Cascade 삭제 (Membership, Project, Invite, Team, ApiKey)
```

---

## 4. 상세 기능 명세

### 4.1 Organization 생성

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-003-01 |
| 기능명 | Organization 생성 |
| 관련 요구사항 ID | FR-002-01, FR-002-02, FR-002-05 |
| 우선순위 | 필수 |
| 기능 설명 | 새로운 Organization을 생성하고 기본 Billing/Whitelabel 설정을 초기화한다 |

#### 4.1.2 선행 조건 (Preconditions)

1. 요청 사용자가 인증된 상태여야 한다.
2. Multi-Org가 비활성화된 경우, 기존 Organization이 없는 상태에서만 생성이 허용된다 (회원가입 시 자동 생성 시나리오 제외).
3. Multi-Org가 활성화된 경우, 인증된 사용자가 자유롭게 Organization을 생성할 수 있다.

#### 4.1.3 후행 조건 (Postconditions)

1. 새로운 Organization 레코드가 데이터베이스에 저장된다.
2. cuid 형식의 고유 ID가 자동 생성된다 (또는 요청에 포함된 cuid2 형식 ID가 사용된다).
3. Billing 정보가 기본값으로 초기화된다: plan=free, period=monthly, limits={projects: 3, responses: 1500, miu: 2000}.
4. Whitelabel 정보가 빈 객체(`{}`)로 초기화된다.
5. isAIEnabled가 `false`로 설정된다.
6. 과금 시작일(periodStart)이 생성 시점으로 설정된다.
7. Stripe 고객 ID가 `null`로 설정된다.

#### 4.1.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Organization 생성 요청을 전송한다 (name 필수 입력) |
| 2 | 시스템 | 입력 데이터를 유효성 검사 스키마로 검증한다 |
| 3 | 시스템 | name 필드를 trim 처리하고 최소 1자 이상인지 확인한다 |
| 4 | 시스템 | (선택적 id가 제공된 경우) id가 cuid2 형식인지 검증한다 |
| 5 | 시스템 | Organization 레코드를 데이터베이스에 생성한다 |
| 6 | 시스템 | Billing 기본값을 설정한다: plan=free, period=monthly, periodStart=현재시각, limits={projects: 3, monthlyResponses: 1500, monthlyMIU: 2000}, stripeCustomerId=null |
| 7 | 시스템 | Whitelabel을 빈 객체로, isAIEnabled를 false로 설정한다 |
| 8 | 시스템 | 생성된 Organization 객체를 반환한다 |

#### 4.1.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-01-01 | 요청에 id가 포함된 경우 | cuid2 형식 검증 후 해당 id를 Organization ID로 사용한다 |
| AF-01-02 | 요청에 id가 포함되지 않은 경우 | 시스템이 cuid()로 ID를 자동 생성한다 |

#### 4.1.6 예외 흐름 (Exception Flow)

| ID | 조건 | 에러 | 처리 |
|----|------|------|------|
| EX-01-01 | name이 빈 문자열이거나 trim 후 0자인 경우 | 입력 유효성 검증 에러 | 유효성 검증 실패 메시지를 반환한다 |
| EX-01-02 | 제공된 id가 cuid2 형식이 아닌 경우 | 입력 유효성 검증 에러 | 유효성 검증 실패 메시지를 반환한다 |
| EX-01-03 | 데이터베이스 생성 실패 | DatabaseError | DatabaseError를 발생시킨다 |
| EX-01-04 | Multi-Org 비활성 상태에서 추가 Organization 생성 시도 | 비즈니스 규칙 위반 | Organization 생성 불가 메시지를 반환한다 |

#### 4.1.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-01-01 | Multi-Org Feature Flag가 false인 경우 | 회원가입 시 새 Organization을 자동 생성하지 않는다. SSO 신규 사용자는 기존 Organization에 할당한다 |
| BR-01-02 | 모든 신규 Organization | 기본 Billing Plan은 free, Period는 monthly로 설정한다 |
| BR-01-03 | Organization 이름 | trim 처리 후 최소 1자 이상이어야 한다 |

#### 4.1.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|------------------|
| id | String | 아니오 | cuid2 형식 |
| name | String | 예 | trim 후 최소 1자 이상 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | String | 생성된 Organization의 cuid 형식 고유 식별자 |
| createdAt | DateTime | 생성 일시 |
| updatedAt | DateTime | 수정 일시 (생성 시 createdAt과 동일) |
| name | String | 조직 이름 |
| billing | JSON | 기본 Billing 정보 객체 |
| whitelabel | JSON | 빈 객체 `{}` |
| isAIEnabled | Boolean | `false` |

#### 4.1.9 화면/UI 요구사항

- Organization 생성 폼에서 name 필드는 필수 입력으로 표시한다.
- 생성 성공 시 생성된 Organization의 대시보드로 리디렉트한다.

#### 4.1.10 비기능 요구사항

- 입력 파라미터는 유효성 검사 스키마를 통해 서비스 레이어 진입 전에 검증한다 (NFR-002).

---

### 4.2 Organization 조회

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-003-02 |
| 기능명 | Organization 조회 |
| 관련 요구사항 ID | FR-002-06 |
| 우선순위 | 필수 |
| 기능 설명 | 다양한 조건으로 Organization 정보를 조회한다 |

#### 4.2.2 선행 조건 (Preconditions)

1. 요청 사용자가 인증된 상태여야 한다.
2. 해당 Organization에 대한 조회 권한이 있어야 한다 (Membership 기반).

#### 4.2.3 후행 조건 (Postconditions)

1. 조회 결과가 반환된다. 결과가 없을 경우 null 또는 빈 배열이 반환된다.

#### 4.2.4 기본 흐름 (Basic Flow)

**흐름 A: ID로 단일 조회**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Organization ID를 포함한 조회 요청을 전송한다 |
| 2 | 시스템 | 입력 파라미터를 유효성 검사 스키마로 검증한다 |
| 3 | 시스템 | 요청 수준 캐시를 확인한다 |
| 4a | 시스템 | (캐시 히트) 캐시된 결과를 반환한다 |
| 4b | 시스템 | (캐시 미스) 데이터베이스에서 Organization을 조회한다 |
| 5 | 시스템 | 조회 결과를 요청 수준 캐시에 저장한다 |
| 6 | 시스템 | Organization 객체 또는 null을 반환한다 |

**흐름 B: 사용자 소속 조직 목록 조회**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | 사용자 ID와 페이지네이션 파라미터를 포함한 조회 요청을 전송한다 |
| 2 | 시스템 | 입력 파라미터를 유효성 검사 스키마로 검증한다 |
| 3 | 시스템 | 요청 수준 캐시를 확인한다 |
| 4 | 시스템 | Membership 테이블을 통해 사용자가 소속된 Organization 목록을 조회한다 |
| 5 | 시스템 | 페이지네이션 처리된 결과를 반환한다 |

**흐름 C: Environment ID 경유 조직 조회**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | Environment ID를 포함한 조회 요청을 수신한다 |
| 2 | 시스템 | Environment -> Project -> Organization 관계를 역추적하여 상위 Organization을 조회한다 |
| 3 | 시스템 | Organization 객체 또는 null을 반환한다 |

**흐름 D: 유일한 Owner인 조직 조회**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 사용자 ID를 포함한 조회 요청을 수신한다 |
| 2 | 시스템 | 해당 사용자가 유일한 Owner인 Organization 목록을 조회한다 |
| 3 | 시스템 | Organization 배열을 반환한다 |

#### 4.2.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-02-01 | 요청 수준 캐시에 동일 요청 결과가 있는 경우 | 데이터베이스 쿼리 없이 캐시된 결과를 즉시 반환한다 |

#### 4.2.6 예외 흐름 (Exception Flow)

| ID | 조건 | 에러 | 처리 |
|----|------|------|------|
| EX-02-01 | 데이터베이스 조회 실패 | DatabaseError | DatabaseError를 발생시킨다 |
| EX-02-02 | 유효하지 않은 ID 형식 | 입력 유효성 검증 에러 | 유효성 검증 실패 메시지를 반환한다 |

#### 4.2.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-02-01 | 모든 조회 요청 | 요청 수준(request-level) 캐시를 적용하여 동일 요청 내에서 중복 DB 쿼리를 방지한다 |
| BR-02-02 | 사용자 소속 조직 목록 조회 | 페이지네이션을 적용한다. 기본 페이지 크기는 시스템 상수에 의해 결정된다 |
| BR-02-03 | 유일한 Owner인 조직 조회 | 해당 사용자가 Owner 역할이고, 다른 Owner가 없는 조직만 반환한다 |

#### 4.2.8 데이터 요구사항

**입력 데이터 (조회 방식별):**

| 조회 방식 | 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|-----------|--------|------|------|------------------|
| ID로 단일 조회 | organizationId | String | 예 | cuid 형식 |
| 사용자 소속 목록 | userId | String | 예 | cuid 형식 |
| 사용자 소속 목록 | page | Number | 아니오 | 양의 정수, 기본값 시스템 상수 |
| Environment 경유 | environmentId | String | 예 | cuid 형식 |
| 유일한 Owner | userId | String | 예 | cuid 형식 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | String | Organization 고유 식별자 |
| createdAt | DateTime | 생성 일시 |
| updatedAt | DateTime | 최종 수정 일시 |
| name | String | 조직 이름 |
| billing | JSON | Billing 정보 (plan, period, limits, stripeCustomerId, periodStart) |
| whitelabel | JSON | Whitelabel 설정 (logoUrl, faviconUrl) |
| isAIEnabled | Boolean | AI 기능 활성화 여부 |
| memberships | 관계 배열 | 소속 멤버십 목록 (조회 시 포함 여부는 호출 컨텍스트에 따름) |
| projects | 관계 배열 | 소속 프로젝트 목록 (조회 시 포함 여부는 호출 컨텍스트에 따름) |

#### 4.2.9 화면/UI 요구사항

- 사용자 소속 조직 목록은 페이지네이션 UI와 함께 표시한다.
- 조직 전환 인터페이스에서 소속 조직 목록을 사용한다.

#### 4.2.10 비기능 요구사항

- 모든 조회 함수는 요청 수준 캐시를 적용한다 (NFR-001).
- 입력 파라미터는 유효성 검사 유틸리티로 검증한다 (NFR-002).

---

### 4.3 Organization 수정

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-003-03 |
| 기능명 | Organization 수정 |
| 관련 요구사항 ID | FR-002-02, FR-002-07 |
| 우선순위 | 필수 |
| 기능 설명 | 기존 Organization의 이름, Billing, Whitelabel, AI 기능 활성화 설정을 수정한다 |

#### 4.3.2 선행 조건 (Preconditions)

1. 요청 사용자가 인증된 상태여야 한다.
2. 대상 Organization이 데이터베이스에 존재해야 한다.
3. 요청 사용자가 해당 Organization에 대한 수정 권한(Owner 또는 Manager 역할)을 보유해야 한다.

#### 4.3.3 후행 조건 (Postconditions)

1. Organization의 수정된 필드가 데이터베이스에 반영된다.
2. updatedAt 타임스탬프가 자동으로 갱신된다.
3. 관련 캐시(memberships, projects, environments)가 무효화된다.

#### 4.3.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Organization ID와 수정할 필드를 포함한 수정 요청을 전송한다 |
| 2 | 시스템 | 입력 데이터를 유효성 검사 스키마(Organization 수정 입력)로 검증한다 |
| 3 | 시스템 | 대상 Organization이 존재하는지 확인한다 |
| 4 | 시스템 | Organization 레코드를 업데이트한다 |
| 5 | 시스템 | 업데이트 시 memberships, projects, environments 데이터를 함께 조회한다 |
| 6 | 시스템 | 조회된 관련 데이터에 대한 캐시를 무효화한다 |
| 7 | 시스템 | 수정된 Organization 객체를 반환한다 |

#### 4.3.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-03-01 | name만 수정하는 경우 | name 필드만 업데이트하고 나머지 필드는 기존 값을 유지한다 |
| AF-03-02 | billing만 수정하는 경우 | billing JSON 필드만 업데이트한다 |
| AF-03-03 | whitelabel만 수정하는 경우 | whitelabel JSON 필드만 업데이트한다 |
| AF-03-04 | isAIEnabled만 수정하는 경우 | isAIEnabled 필드만 업데이트한다 |

#### 4.3.6 예외 흐름 (Exception Flow)

| ID | 조건 | 에러 | 처리 |
|----|------|------|------|
| EX-03-01 | 대상 Organization이 존재하지 않는 경우 (DB P2025 에러 코드) | ResourceNotFoundError | ResourceNotFoundError를 발생시킨다 |
| EX-03-02 | 입력 데이터가 유효성 검사를 통과하지 못하는 경우 | 입력 유효성 검증 에러 | 유효성 검증 실패 메시지를 반환한다 |
| EX-03-03 | 데이터베이스 업데이트 실패 | DatabaseError | DatabaseError를 발생시킨다 |

#### 4.3.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-03-01 | Organization 수정 시 | 관련 memberships, projects, environments에 대한 캐시를 무효화해야 한다 |
| BR-03-02 | name 수정 시 | trim 후 최소 1자 이상이어야 한다 |
| BR-03-03 | billing 수정 시 | Billing 스키마 유효성 검증을 통과해야 한다 |

#### 4.3.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|------------------|
| organizationId | String | 예 | cuid 형식 (경로 파라미터) |
| name | String | 아니오 | trim 후 최소 1자 이상 |
| whitelabel | JSON | 아니오 | Whitelabel 스키마 준수 (logoUrl: nullable string, faviconUrl: nullable string) |
| billing | JSON | 아니오 | Billing 스키마 준수 |
| isAIEnabled | Boolean | 아니오 | true 또는 false |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | String | Organization 고유 식별자 |
| updatedAt | DateTime | 갱신된 수정 일시 |
| name | String | (수정된 경우) 변경된 조직 이름 |
| billing | JSON | (수정된 경우) 변경된 Billing 정보 |
| whitelabel | JSON | (수정된 경우) 변경된 Whitelabel 설정 |
| isAIEnabled | Boolean | (수정된 경우) 변경된 AI 기능 활성화 여부 |

#### 4.3.9 화면/UI 요구사항

- Organization 설정 페이지에서 각 필드를 개별적으로 수정할 수 있는 폼을 제공한다.
- 수정 성공 시 성공 알림을 표시하고, 실패 시 에러 메시지를 표시한다.

#### 4.3.10 비기능 요구사항

- 업데이트 후 캐시 무효화를 반드시 수행한다.
- 입력 파라미터는 유효성 검사 유틸리티로 검증한다 (NFR-002).

---

### 4.4 Organization 삭제

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-003-04 |
| 기능명 | Organization 삭제 |
| 관련 요구사항 ID | FR-002-08 |
| 우선순위 | 필수 |
| 기능 설명 | Organization과 모든 관련 데이터를 Cascade 방식으로 삭제한다 |

#### 4.4.2 선행 조건 (Preconditions)

1. 요청 사용자가 인증된 상태여야 한다.
2. 요청 사용자가 해당 Organization의 Owner 역할이어야 한다.
3. 대상 Organization이 데이터베이스에 존재해야 한다.

#### 4.4.3 후행 조건 (Postconditions)

1. Organization 레코드가 데이터베이스에서 삭제된다.
2. 관련 Membership, Project, Invite, Team, ApiKey가 모두 Cascade 삭제된다.
3. Project 하위의 Environment, Survey 등 모든 하위 리소스도 연쇄 삭제된다.
4. 관련 캐시(memberships의 userId, projects의 id, environments의 id)가 무효화된다.

#### 4.4.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Organization 삭제 요청을 전송한다 (Organization ID 포함) |
| 2 | 시스템 | 입력 파라미터를 유효성 검사 스키마로 검증한다 |
| 3 | 시스템 | 삭제 전, 대상 Organization의 memberships(userId), projects(id), projects.environments(id) 데이터를 조회한다 |
| 4 | 시스템 | Organization 레코드를 삭제한다 (Cascade 삭제 적용) |
| 5 | 시스템 | 단계 3에서 조회한 관련 데이터에 대한 캐시를 무효화한다 |
| 6 | 시스템 | 삭제 완료 응답을 반환한다 |

#### 4.4.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.4.6 예외 흐름 (Exception Flow)

| ID | 조건 | 에러 | 처리 |
|----|------|------|------|
| EX-04-01 | 대상 Organization이 존재하지 않는 경우 | DatabaseError | DatabaseError를 발생시킨다 |
| EX-04-02 | 데이터베이스 삭제 작업 실패 | DatabaseError | DatabaseError를 발생시킨다 |

#### 4.4.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-04-01 | Organization 삭제 시 | Membership, Project, Invite, Team, ApiKey를 Cascade 방식으로 연쇄 삭제한다 |
| BR-04-02 | Organization 삭제 전 | 캐시 무효화를 위해 memberships의 userId, projects의 id, environments의 id를 먼저 조회해야 한다 |

#### 4.4.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|------------------|
| organizationId | String | 예 | cuid 형식 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | String | 삭제된 Organization의 고유 식별자 |

#### 4.4.9 화면/UI 요구사항

- 삭제 전 확인 모달(dialog)을 표시하여 사용자에게 되돌릴 수 없음을 경고한다.
- Cascade 삭제 대상(Project, 멤버, 초대 등)이 함께 삭제됨을 안내한다.

#### 4.4.10 비기능 요구사항

- 삭제 전 캐시 무효화 대상 데이터를 반드시 조회해야 한다.
- Cascade 삭제는 데이터베이스 트랜잭션 내에서 수행되어야 한다.

---

### 4.5 Billing 모델 관리

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-003-05 |
| 기능명 | Billing 모델 관리 |
| 관련 요구사항 ID | FR-002-03 |
| 우선순위 | 필수 |
| 기능 설명 | Organization의 요금제(Plan), 과금 주기(Period), 사용량 제한(Limits)을 관리한다 |

#### 4.5.2 선행 조건 (Preconditions)

1. 대상 Organization이 존재해야 한다.
2. Billing 변경 권한을 가진 사용자(Owner 또는 Billing Manager)여야 한다.

#### 4.5.3 후행 조건 (Postconditions)

1. Organization의 billing JSON 필드가 갱신된다.
2. 변경된 Plan에 따른 Limits가 적용된다.

#### 4.5.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자/시스템 | Billing 변경 요청을 전송한다 |
| 2 | 시스템 | Billing 스키마로 입력 데이터를 검증한다 |
| 3 | 시스템 | Plan 종류에 따른 Limits 기본값을 적용한다 |
| 4 | 시스템 | Organization의 billing 필드를 업데이트한다 |
| 5 | 시스템 | 변경된 Billing 정보를 반환한다 |

#### 4.5.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-05-01 | Custom Plan으로 변경 시 | 모든 Limits를 null(무제한)로 설정한다 |

#### 4.5.6 예외 흐름 (Exception Flow)

| ID | 조건 | 에러 | 처리 |
|----|------|------|------|
| EX-05-01 | 유효하지 않은 Plan 값 | 입력 유효성 검증 에러 | free, startup, custom 중 하나여야 함을 알린다 |
| EX-05-02 | 유효하지 않은 Period 값 | 입력 유효성 검증 에러 | monthly, yearly 중 하나여야 함을 알린다 |

#### 4.5.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-05-01 | Free Plan | projects=3, monthlyResponses=1,500, monthlyMIU=2,000 |
| BR-05-02 | Startup Plan | projects=3, monthlyResponses=5,000, monthlyMIU=7,500 |
| BR-05-03 | Custom Plan | 모든 제한 null (무제한) |
| BR-05-04 | Limits 값이 null인 경우 | 해당 항목은 무제한으로 처리한다 |
| BR-05-05 | Organization Projects Limit (Cloud) | License 활성 시 billing limits 적용, 비활성 시 3개 고정 |
| BR-05-06 | Organization Projects Limit (Self-hosted) | License 활성 + projects feature 설정 시 해당 값, 아니면 3개 고정 |

#### 4.5.8 데이터 요구사항

**Billing JSON 구조:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 | 기본값 |
|--------|------|------|------------------|--------|
| plan | Enum(free, startup, custom) | 예 | 열거형 값 중 하나 | free |
| period | Enum(monthly, yearly) | 예 | 열거형 값 중 하나 | monthly |
| periodStart | DateTime | 예 | 유효한 DateTime | 생성 시점 |
| limits.projects | Number 또는 null | 예 | 양의 정수 또는 null(무제한) | 3 |
| limits.monthlyResponses | Number 또는 null | 예 | 양의 정수 또는 null(무제한) | 1500 |
| limits.monthlyMIU | Number 또는 null | 예 | 양의 정수 또는 null(무제한) | 2000 |
| stripeCustomerId | String 또는 null | 아니오 | Stripe 고객 ID 형식 또는 null | null |

**Stripe 가격 Lookup Keys:**

| Key | 설명 |
|-----|------|
| STARTUP_MAY25_MONTHLY | Startup 요금제 월간 가격 |
| STARTUP_MAY25_YEARLY | Startup 요금제 연간 가격 |

**Stripe 프로젝트 이름 매핑:**

| 내부명 | 표시 이름 |
|--------|-----------|
| STARTUP | Inquiry Startup |
| CUSTOM | Inquiry Custom |

#### 4.5.9 화면/UI 요구사항

- Billing 관리 페이지에서 현재 Plan, Period, Limits를 표시한다.
- Plan 업그레이드/다운그레이드 옵션을 제공한다.

#### 4.5.10 비기능 요구사항

- Billing 변경은 감사 추적이 가능해야 한다.

---

### 4.6 Whitelabel 설정

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-003-06 |
| 기능명 | Whitelabel 설정 |
| 관련 요구사항 ID | FR-002-04 |
| 우선순위 | 선택 |
| 기능 설명 | Organization의 로고 URL과 파비콘 URL을 설정한다 |

#### 4.6.2 선행 조건 (Preconditions)

1. 대상 Organization이 존재해야 한다.
2. 요청 사용자가 수정 권한(Owner 또는 Manager)을 보유해야 한다.

#### 4.6.3 후행 조건 (Postconditions)

1. Organization의 whitelabel JSON 필드가 갱신된다.

#### 4.6.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Whitelabel 설정 변경 요청을 전송한다 (logoUrl, faviconUrl 포함) |
| 2 | 시스템 | 입력 데이터를 Whitelabel 스키마로 검증한다 |
| 3 | 시스템 | Organization의 whitelabel 필드를 업데이트한다 |
| 4 | 시스템 | 변경된 Whitelabel 정보를 반환한다 |

#### 4.6.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-06-01 | logoUrl 또는 faviconUrl을 null로 설정하는 경우 | 해당 필드를 null로 저장하여 기본값(또는 미설정)으로 복원한다 |

#### 4.6.6 예외 흐름 (Exception Flow)

| ID | 조건 | 에러 | 처리 |
|----|------|------|------|
| EX-06-01 | 대상 Organization이 존재하지 않는 경우 | ResourceNotFoundError | ResourceNotFoundError를 발생시킨다 |

#### 4.6.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-06-01 | 초기 생성 시 | whitelabel은 빈 객체(`{}`)로 설정된다 |
| BR-06-02 | logoUrl/faviconUrl | nullable이다. null 또는 미설정이 가능하다 |

#### 4.6.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|------------------|
| logoUrl | String 또는 null | 아니오 | 유효한 URL 형식 또는 null |
| faviconUrl | String 또는 null | 아니오 | 유효한 URL 형식 또는 null |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| logoUrl | String 또는 null | 설정된 로고 URL |
| faviconUrl | String 또는 null | 설정된 파비콘 URL |

#### 4.6.9 화면/UI 요구사항

- Whitelabel 설정 페이지에서 로고와 파비콘 URL을 입력/미리보기할 수 있는 인터페이스를 제공한다.

#### 4.6.10 비기능 요구사항

해당 없음.

---

### 4.7 Monthly Response Count 조회

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-003-07 |
| 기능명 | Monthly Response Count 조회 |
| 관련 요구사항 ID | FR-002-09 |
| 우선순위 | 필수 |
| 기능 설명 | Billing Period 시작일 기준으로 해당 기간의 전체 설문 응답 수를 집계한다 |

#### 4.7.2 선행 조건 (Preconditions)

1. 대상 Organization이 존재해야 한다.
2. Organization에 billing.periodStart가 설정되어 있어야 한다.

#### 4.7.3 후행 조건 (Postconditions)

1. 집계된 월간 응답 수가 반환된다.

#### 4.7.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | Organization ID를 포함한 월간 응답 수 조회 요청을 수신한다 |
| 2 | 시스템 | 해당 Organization의 billing.periodStart를 기준으로 조회 기간을 산정한다 |
| 3 | 시스템 | Organization > Project > Environment > Survey > Response 경로를 탐색하여 해당 기간의 모든 Response 수를 집계한다 |
| 4 | 시스템 | 집계된 응답 수를 반환한다 |

#### 4.7.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-07-01 | Organization에 Project가 없는 경우 | 응답 수 0을 반환한다 |
| AF-07-02 | 조회 기간 내 Response가 없는 경우 | 응답 수 0을 반환한다 |

#### 4.7.6 예외 흐름 (Exception Flow)

| ID | 조건 | 에러 | 처리 |
|----|------|------|------|
| EX-07-01 | 데이터베이스 집계 쿼리 실패 | DatabaseError | DatabaseError를 발생시킨다 |

#### 4.7.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-07-01 | 집계 기간 | billing.periodStart부터 현재까지(또는 해당 billing period 종료일까지) |
| BR-07-02 | 집계 범위 | Organization의 모든 Project > 모든 Environment > 모든 Survey > 모든 Response를 합산한다 |
| BR-07-03 | Billing Limit 초과 판단 | 집계된 응답 수가 billing.limits.monthlyResponses를 초과하면 제한 적용 (null인 경우 무제한) |

#### 4.7.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|------------------|
| organizationId | String | 예 | cuid 형식 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| count | Number | Billing Period 내 전체 응답 수 |

#### 4.7.9 화면/UI 요구사항

- Billing 대시보드에서 현재 월간 응답 사용량과 제한(Limit)을 시각적으로 표시한다 (예: 프로그레스 바).

#### 4.7.10 비기능 요구사항

- 집계 쿼리는 대량 데이터에서도 효율적으로 수행되어야 한다.

---

### 4.8 Multi-Org License 제어

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-003-08 |
| 기능명 | Multi-Org License 제어 |
| 관련 요구사항 ID | FR-002-10 |
| 우선순위 | 조건부 필수 (Enterprise License 보유 시) |
| 기능 설명 | Enterprise License의 Multi-Org Feature Flag에 따라 다중 조직 기능을 제어한다 |

#### 4.8.2 선행 조건 (Preconditions)

1. Enterprise License가 시스템에 등록되어 있어야 한다.
2. Multi-Org Feature Flag 값이 확인 가능해야 한다.

#### 4.8.3 후행 조건 (Postconditions)

1. Multi-Org Feature Flag 값에 따라 시스템 동작이 결정된다.

#### 4.8.4 기본 흐름 (Basic Flow)

**Multi-Org 활성화 상태 (Feature Flag = true):**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | Enterprise License의 Multi-Org Feature Flag를 확인한다 |
| 2 | 시스템 | Flag가 true이면 Multi-Organization 기능을 활성화한다 |
| 3 | 사용자 | 새로운 Organization을 자유롭게 생성할 수 있다 |
| 4 | 사용자 | 여러 Organization에 소속될 수 있다 |
| 5 | 사용자 | 조직을 탈퇴할 수 있다 |

#### 4.8.5 대안 흐름 (Alternative Flow)

**Multi-Org 비활성화 상태 (Feature Flag = false 또는 Enterprise License 미보유):**

| ID | 조건 | 동작 |
|----|------|------|
| AF-08-01 | 회원가입 시 | 새 Organization을 자동 생성하지 않는다 |
| AF-08-02 | SSO 신규 사용자 | 기존 Organization에 자동 할당한다 |
| AF-08-03 | 조직 탈퇴 시도 | 조직 탈퇴를 불허한다 |

#### 4.8.6 예외 흐름 (Exception Flow)

| ID | 조건 | 에러 | 처리 |
|----|------|------|------|
| EX-08-01 | Multi-Org 비활성 상태에서 새 Organization 생성 시도 | 비즈니스 규칙 위반 | Multi-Org 기능이 비활성화되어 있음을 알리는 메시지를 반환한다 |
| EX-08-02 | Multi-Org 비활성 상태에서 조직 탈퇴 시도 | 비즈니스 규칙 위반 | 조직 탈퇴가 불가능함을 알리는 메시지를 반환한다 |

#### 4.8.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-08-01 | Enterprise License의 Multi-Org Feature Flag = true | 다중 Organization 생성, 소속, 탈퇴가 허용된다 |
| BR-08-02 | Multi-Org Feature Flag = false | 회원가입 시 새 Organization 자동 생성이 비활성화된다 |
| BR-08-03 | Multi-Org Feature Flag = false | SSO 신규 사용자는 기존 Organization에 할당된다 |
| BR-08-04 | Multi-Org Feature Flag = false | 조직 탈퇴가 불가능하다 |
| BR-08-05 | Self-hosted 환경 | 일반적으로 단일 Organization으로 운영된다 |

#### 4.8.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|------------------|
| (라이선스 시스템에서 내부적으로 확인) | - | - | Enterprise License의 Multi-Org Feature Flag |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| isMultiOrgEnabled | Boolean | Multi-Org 기능 활성화 여부 |

#### 4.8.9 화면/UI 요구사항

- Multi-Org가 비활성화된 경우, 새 조직 생성 버튼을 비활성화하거나 숨긴다.
- 조직 탈퇴 옵션을 비활성화하고 Enterprise 업그레이드 안내를 표시한다.

#### 4.8.10 비기능 요구사항

- License 확인은 Memory Cache (TTL 1분)와 Redis Cache (TTL 24시간)를 활용한다.

---

### 4.9 Survey Response 알림 구독

#### 4.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-003-09 |
| 기능명 | Survey Response 알림 구독 |
| 관련 요구사항 ID | FR-002-11 |
| 우선순위 | 필수 |
| 기능 설명 | Survey 생성 시 해당 Survey에 대한 응답 알림을 자동 구독 설정한다 |

#### 4.9.2 선행 조건 (Preconditions)

1. Survey가 생성되었거나 생성되는 중이어야 한다.
2. Survey 생성자가 해당 Organization의 멤버여야 한다.

#### 4.9.3 후행 조건 (Postconditions)

1. Survey 생성자의 알림 설정에 해당 Survey에 대한 알림이 활성화된다.
2. 단, 해당 Organization의 알림을 구독 해제한 상태인 경우 알림이 활성화되지 않는다.

#### 4.9.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Survey를 생성한다 |
| 2 | 시스템 | Survey 생성자의 Organization 알림 구독 상태를 확인한다 |
| 3a | 시스템 | (알림 구독 중인 경우) 해당 Survey에 대한 응답 알림을 자동 활성화한다 |
| 3b | 시스템 | (알림 구독 해제 상태인 경우) 알림을 활성화하지 않는다 |

#### 4.9.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-09-01 | Organization 알림을 구독 해제한 경우 | 해당 Survey에 대한 알림을 자동 활성화하지 않는다 |

#### 4.9.6 예외 흐름 (Exception Flow)

해당 없음. 알림 구독은 Survey 생성의 부수 효과로 처리되며, 실패 시 Survey 생성 자체에 영향을 주지 않는다.

#### 4.9.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-09-01 | Survey 생성 시 | 생성자의 알림 설정에 해당 Survey에 대한 알림을 자동 활성화한다 |
| BR-09-02 | Organization 알림 구독 해제 상태 | 해당 Organization의 알림을 구독 해제한 사용자에게는 알림을 활성화하지 않는다 |

#### 4.9.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|------------------|
| surveyId | String | 예 | 생성된 Survey의 ID |
| userId | String | 예 | Survey 생성자의 사용자 ID |
| organizationId | String | 예 | 해당 Organization ID |

**출력 데이터:**

없음 (부수 효과로 처리).

#### 4.9.9 화면/UI 요구사항

- 알림 설정 페이지에서 Organization 단위 및 Survey 단위의 알림 구독/해제를 관리할 수 있는 인터페이스를 제공한다.

#### 4.9.10 비기능 요구사항

- 알림 구독 처리는 Survey 생성 트랜잭션과 별도로 비동기 처리가 가능하다.

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

#### Organization

| 필드 | 타입 | 제약 조건 | 기본값 | 설명 |
|------|------|-----------|--------|------|
| id | String | PK, cuid() | cuid() 자동 생성 | 고유 식별자 |
| createdAt | DateTime | NOT NULL | 생성 시각 | 생성일 |
| updatedAt | DateTime | NOT NULL, 자동 갱신 | 수정 시각 | 수정일 |
| name | String | NOT NULL, 최소 1자 (trim 후) | - | 조직 이름 |
| billing | JSON | NOT NULL | 기본 Billing 객체 | Billing Plan, Limits, Period 정보 |
| whitelabel | JSON | NOT NULL | `{}` | Whitelabel 설정 |
| isAIEnabled | Boolean | NOT NULL | false | AI 기능 활성화 여부 |

#### Billing (JSON 내장 구조)

| 필드 | 타입 | 제약 조건 | 기본값 | 설명 |
|------|------|-----------|--------|------|
| plan | Enum(free, startup, custom) | 필수 | free | 요금제 종류 |
| period | Enum(monthly, yearly) | 필수 | monthly | 과금 주기 |
| periodStart | DateTime | 필수 | 생성 시점 | 과금 시작일 |
| limits.projects | Number 또는 null | 필수 | 3 | 프로젝트 제한 수 (null=무제한) |
| limits.monthlyResponses | Number 또는 null | 필수 | 1500 | 월간 응답 제한 (null=무제한) |
| limits.monthlyMIU | Number 또는 null | 필수 | 2000 | 월간 식별 사용자 제한 (null=무제한) |
| stripeCustomerId | String 또는 null | 선택 | null | Stripe 고객 ID |

#### Whitelabel (JSON 내장 구조)

| 필드 | 타입 | 제약 조건 | 기본값 | 설명 |
|------|------|-----------|--------|------|
| logoUrl | String 또는 null | 선택 | null | Organization 로고 URL |
| faviconUrl | String 또는 null | 선택 | null | 파비콘 URL |

### 5.2 엔티티 간 관계

| 관계 | 카디널리티 | 설명 |
|------|-----------|------|
| Organization - Membership | 1:N | 하나의 Organization은 여러 Membership을 가진다 |
| Organization - Project | 1:N | 하나의 Organization은 여러 Project를 가진다 |
| Organization - Invite | 1:N | 하나의 Organization은 여러 Invite를 가진다 |
| Organization - Team | 1:N | 하나의 Organization은 여러 Team을 가진다 |
| Organization - ApiKey | 1:N | 하나의 Organization은 여러 ApiKey를 가진다 |
| Project - Environment | 1:N | 하나의 Project는 여러 Environment를 가진다 (production, development) |
| Environment - Survey | 1:N | 하나의 Environment는 여러 Survey를 가진다 |
| Survey - Response | 1:N | 하나의 Survey는 여러 Response를 가진다 |

### 5.3 데이터 흐름

```
[Organization 생성]
  → billing 기본값 설정 (free plan)
  → whitelabel 빈 객체 설정
  → isAIEnabled = false

[Organization 수정]
  → DB 업데이트
  → 관련 캐시 무효화 (memberships, projects, environments)

[Organization 삭제]
  → 관련 데이터 ID 조회 (캐시 무효화 목적)
  → Cascade 삭제 (Membership, Project, Invite, Team, ApiKey)
  → 캐시 무효화

[Monthly Response Count]
  → Organization.projects[].environments[].surveys[].responses
  → periodStart 기준 필터링
  → COUNT 집계
```

---

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 외부 시스템 | 연동 목적 | 연동 방식 | 관련 기능 |
|------------|-----------|-----------|-----------|
| Stripe | 결제/구독 관리 | Stripe API (stripeCustomerId 기반) | FN-003-05 (Billing 모델 관리) |
| License Server | Enterprise License 검증 | API 호출 (Memory/Redis 캐시 적용) | FN-003-08 (Multi-Org License 제어) |

### 6.2 API 명세 (서비스 함수 레벨)

#### 6.2.1 createOrganization

| 항목 | 내용 |
|------|------|
| 함수명 | createOrganization |
| 입력 | `{ id?: string (cuid2), name: string }` |
| 출력 | `Organization` 객체 |
| 에러 | DatabaseError, 입력 유효성 검증 에러 |

#### 6.2.2 getOrganization

| 항목 | 내용 |
|------|------|
| 함수명 | getOrganization |
| 입력 | `organizationId: string` |
| 출력 | `Organization` 객체 또는 `null` |
| 캐시 | 요청 수준 캐시 적용 |
| 에러 | DatabaseError |

#### 6.2.3 getOrganizationsByUserId

| 항목 | 내용 |
|------|------|
| 함수명 | getOrganizationsByUserId |
| 입력 | `userId: string, page?: number` |
| 출력 | `Organization[]` (페이지네이션 적용) |
| 캐시 | 요청 수준 캐시 적용 |
| 에러 | DatabaseError |

#### 6.2.4 getOrganizationByEnvironmentId

| 항목 | 내용 |
|------|------|
| 함수명 | getOrganizationByEnvironmentId |
| 입력 | `environmentId: string` |
| 출력 | `Organization` 객체 또는 `null` |
| 캐시 | 요청 수준 캐시 적용 |
| 에러 | DatabaseError |

#### 6.2.5 getOrganizationsWhereUserIsOwner

| 항목 | 내용 |
|------|------|
| 함수명 | getOrganizationsWhereUserIsOwner |
| 입력 | `userId: string` |
| 출력 | `Organization[]` |
| 캐시 | 요청 수준 캐시 적용 |
| 에러 | DatabaseError |

#### 6.2.6 updateOrganization

| 항목 | 내용 |
|------|------|
| 함수명 | updateOrganization |
| 입력 | `organizationId: string, data: { name?, whitelabel?, billing?, isAIEnabled? }` |
| 출력 | `Organization` 객체 |
| 에러 | ResourceNotFoundError (P2025), DatabaseError |

#### 6.2.7 deleteOrganization

| 항목 | 내용 |
|------|------|
| 함수명 | deleteOrganization |
| 입력 | `organizationId: string` |
| 출력 | `Organization` 객체 (삭제된 데이터) |
| 에러 | DatabaseError |

#### 6.2.8 getMonthlyOrganizationResponseCount

| 항목 | 내용 |
|------|------|
| 함수명 | getMonthlyOrganizationResponseCount |
| 입력 | `organizationId: string` |
| 출력 | `number` (응답 수) |
| 에러 | DatabaseError |

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| 항목 | 목표 | 근거 |
|------|------|------|
| Organization 조회 API 응답 시간 | 평균 2초 이내 | NFR-001 (시스템 공통) |
| 요청 수준 캐시 | 동일 요청 내 중복 DB 쿼리 방지 | NFR-001 |
| Monthly Response Count 집계 | 합리적인 시간 내 완료 (Organization 규모에 따라 변동) | 대량 데이터 집계 쿼리 최적화 필요 |
| 페이지네이션 | 기본 페이지 크기는 시스템 상수에 의해 결정 | NFR-001 |

### 7.2 보안 요구사항

| 항목 | 구현 |
|------|------|
| 인증 | 모든 Organization 관련 API는 인증된 사용자만 접근 가능 |
| 권한 | Organization 수정은 Owner/Manager, 삭제는 Owner만 가능 |
| 입력 검증 | 모든 서비스 함수에서 입력 파라미터를 유효성 검사 스키마로 검증 (NFR-002) |
| 데이터 격리 | Organization 단위 멀티테넌시로 데이터가 격리됨 (NFR-004) |

### 7.3 가용성 요구사항

| 항목 | 목표 |
|------|------|
| Uptime SLA | 99.9% (Custom 플랜) |
| 에러 복구 | 데이터베이스 에러 시 적절한 에러 클래스(DatabaseError, ResourceNotFoundError)로 분류하여 처리 (NFR-003) |

---

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| 항목 | 설명 |
|------|------|
| Organization ID 형식 | cuid() 형식으로 생성. 입력 시 cuid2 형식 검증 |
| Organization 이름 | trim 후 최소 1자 이상 |
| Billing JSON 구조 | 정해진 스키마(plan, period, periodStart, limits, stripeCustomerId)를 따라야 함 |
| Whitelabel JSON 구조 | logoUrl과 faviconUrl 필드만 허용 |
| Cascade 삭제 | 데이터베이스 레벨에서 CASCADE 삭제 지원 필요 |
| 캐시 무효화 | Organization 수정/삭제 시 관련 엔티티의 캐시를 수동으로 무효화해야 함 |
| Next.js unstable_cache() | 사용 금지 (프로젝트 정책) |

### 8.2 비즈니스 제약사항

| 항목 | 설명 |
|------|------|
| Free Plan 제한 | projects=3, monthlyResponses=1,500, monthlyMIU=2,000 |
| Startup Plan 제한 | projects=3, monthlyResponses=5,000, monthlyMIU=7,500 |
| Custom Plan | 모든 제한 해제 (null=무제한) |
| AI 기능 | 기본 비활성화 (isAIEnabled=false) |
| Multi-Org | Enterprise License의 Feature Flag에 의해 제어됨 |
| Self-hosted 환경 | 일반적으로 단일 Organization으로 운영 |

### 8.3 가정사항

| 항목 | 설명 |
|------|------|
| 데이터베이스 | PostgreSQL을 사용하며 Prisma ORM을 통해 접근한다 |
| 캐시 전략 | 요청 수준 캐시는 서버 함수 중복 제거(request-level deduplication)를 통해 구현된다 |
| License 시스템 | Enterprise License 검증 시스템이 별도로 존재하며, Memory Cache (1분 TTL)와 Redis Cache (24시간 TTL)가 적용된다 |
| Stripe 연동 | Stripe API 연동은 별도 모듈(FSD-029)에서 관리되며, Organization에서는 stripeCustomerId만 참조한다 |
| RBAC | 역할 기반 접근 제어는 FSD-004에서 정의되며, 본 문서에서는 권한이 있다고 가정한다 |

---

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 요구사항명 | 기능 ID | 기능명 | 상태 |
|------------|-----------|---------|--------|------|
| FR-002-01 | Organization 데이터 모델 | FN-003-01 ~ FN-003-04 | Organization CRUD 전체 | 명세 완료 |
| FR-002-02 | Organization 타입 정의 | FN-003-01, FN-003-03 | Organization 생성, 수정 | 명세 완료 |
| FR-002-03 | Billing 모델 | FN-003-05 | Billing 모델 관리 | 명세 완료 |
| FR-002-04 | Whitelabel 설정 | FN-003-06 | Whitelabel 설정 | 명세 완료 |
| FR-002-05 | Organization 생성 | FN-003-01 | Organization 생성 | 명세 완료 |
| FR-002-06 | Organization 조회 | FN-003-02 | Organization 조회 | 명세 완료 |
| FR-002-07 | Organization 수정 | FN-003-03 | Organization 수정 | 명세 완료 |
| FR-002-08 | Organization 삭제 | FN-003-04 | Organization 삭제 | 명세 완료 |
| FR-002-09 | Monthly Response Count 조회 | FN-003-07 | Monthly Response Count 조회 | 명세 완료 |
| FR-002-10 | Multi-Org License | FN-003-08 | Multi-Org License 제어 | 명세 완료 |
| FR-002-11 | Survey Response 알림 구독 | FN-003-09 | Survey Response 알림 구독 | 명세 완료 |

| 수용 기준 ID | 수용 기준명 | 관련 기능 ID | 커버리지 |
|-------------|-----------|-------------|---------|
| AC-002-01 | Organization 생성 | FN-003-01 | 기본 흐름 4.1.4, 비즈니스 규칙 4.1.7 |
| AC-002-02 | Organization 조회 | FN-003-02 | 기본 흐름 4.2.4 (흐름 A~D) |
| AC-002-03 | Organization 수정 | FN-003-03 | 기본 흐름 4.3.4, 예외 흐름 4.3.6 |
| AC-002-04 | Organization 삭제 | FN-003-04 | 기본 흐름 4.4.4, 비즈니스 규칙 4.4.7 |
| AC-002-05 | Billing Limits | FN-003-05, FN-003-07 | 비즈니스 규칙 4.5.7, 기본 흐름 4.7.4 |
| AC-002-06 | Multi-Org | FN-003-08 | 기본 흐름 4.8.4, 대안 흐름 4.8.5, 비즈니스 규칙 4.8.7 |

### 9.2 변경 이력

| 버전 | 일자 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| v1.0 | 2026-02-21 | AI 분석 | FSD-003 요구사항 명세서 기반 최초 작성 |
