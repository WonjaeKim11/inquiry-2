# 기능 명세서 (Functional Specification)

# 멤버 초대 / RBAC

---

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | 1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-004 멤버 초대 / RBAC 요구사항 명세서 (FR-003, FR-004) |
| 상태 | 초안 |

---

## 2. 개요

### 2.1 목적

Inquiry 플랫폼에서 Organization 멤버를 초대하고, 3계층 역할 기반 접근 제어(RBAC)를 통해 리소스 접근 권한을 관리하기 위한 상세 기능 명세를 정의한다. 본 문서는 요구사항 명세서 FSD-004 (FR-003, FR-004)를 기반으로 하며, 개발/테스트 단계에서 구현 및 검증의 기준이 된다.

### 2.2 범위

**포함 범위:**
- 단일 멤버 초대 (이메일 기반, CSV 일괄 초대 미지원)
- 초대 만료(7일) 및 갱신 정책
- 초대 수락 흐름
- 3계층 RBAC: Organization Role, Team Role, Project Permission
- 권한 검증 미들웨어
- 역할 변경 시 Team 멤버십 자동 승격
- 멤버 삭제 및 조직 탈퇴

**제외 범위:**
- CSV 일괄 초대 (코드에 구현되어 있지 않음)
- 조직 생성/삭제 (FSD-003에서 다룸)
- 감사 로그 상세 (FSD-005에서 다룸, 본 문서에서는 호출 지점만 명시)

### 2.3 대상 사용자

| 역할 | 설명 |
|------|------|
| Organization Owner | 모든 멤버 관리 권한 보유. 역할 변경, 초대 생성/삭제 가능 |
| Organization Manager | 멤버 초대(member 역할 한정), 초대 관리 가능 |
| Team Admin | 자신이 admin인 Team에 member 역할로만 초대 가능 |
| Organization Member | 기본 멤버. 초대 권한 없음 |
| Billing Manager | Cloud 전용. 결제 관리 전용 역할 |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| Organization | Inquiry 최상위 조직 단위. 멤버십, 프로젝트, 빌링을 관리한다 |
| Team | Organization 내 하위 팀 단위. 프로젝트 접근 권한 관리에 사용 |
| Project | Organization 하위 프로젝트(워크스페이스). 별도의 설문, 환경, 설정 보유 |
| Membership | 사용자와 Organization 간의 관계. 역할(role) 정보 포함 |
| TeamUser | 사용자와 Team 간의 관계. 팀 내 역할(admin/contributor) 정보 포함 |
| ProjectTeam | Team과 Project 간의 관계. 프로젝트 권한(read/readWrite/manage) 정보 포함 |
| RBAC | Role-Based Access Control. 역할 기반 접근 제어 |
| Invite | 멤버 초대 레코드. 이메일, 역할, 만료 시간 등을 포함 |
| Role Management License | Enterprise 기능으로, owner 이외 역할 지정 및 Team 할당에 필요한 라이선스 |
| Access Control Feature | Custom Plan에서 활성화되는 RBAC 고급 기능 플래그 |
| Grace Period | Enterprise License 서버 접근 불가 시 기존 라이선스 상태를 유지하는 유예 기간 (3일) |

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
+------------------------------------------------------------+
|                      Organization                           |
|                                                             |
|  Membership (owner / manager / member / billing)            |
|                                                             |
|  +------------------+  +------------------+                 |
|  |     Team A       |  |     Team B       |                 |
|  | (admin/contrib.) |  | (admin/contrib.) |                 |
|  +--------+---------+  +--------+---------+                 |
|           |                      |                          |
|     +-----+------+        +-----+------+                    |
|     | Project 1  |        | Project 2  |                    |
|     | (read/rw/  |        | (read/rw/  |                    |
|     |  manage)   |        |  manage)   |                    |
|     +------------+        +------------+                    |
+------------------------------------------------------------+

[초대 흐름]
Owner/Manager ---(초대 생성)---> Invite 레코드 생성
                                    |
                                    v
                              이메일 발송 (JWT 토큰 포함)
                                    |
                                    v
                              수신자 회원가입/로그인
                                    |
                                    v
                              토큰 검증 --> Membership 생성
                                    |
                                    v
                              TeamUser 생성 (teamIds 기반)
                                    |
                                    v
                              Invite 레코드 삭제
```

### 3.2 주요 기능 목록 (Feature List)

| 기능 ID | 기능명 | 관련 요구사항 | 라이선스 |
|---------|--------|-------------|---------|
| FN-003-01 | 초대 생성 (단일 초대) | FR-003-02 | Community (기본) / Enterprise (역할 지정) |
| FN-003-02 | 초대 만료 정책 | FR-003-03 | Community |
| FN-003-03 | 초대 재발송 | FR-003-04 | Community |
| FN-003-04 | 초대 삭제 | FR-003-05 | Community |
| FN-003-05 | 초대 수락 | FR-003-06 | Community |
| FN-004-01 | 3계층 RBAC 구조 | FR-004-01 | Community (기본) / Enterprise (Team/Project) |
| FN-004-02 | 권한 검증 미들웨어 | FR-004-04 | Community |
| FN-004-03 | 역할 변경 시 Team 멤버십 자동 승격 | FR-004-05 | Enterprise |
| FN-004-04 | 멤버 삭제 | FR-004-06 | Community |
| FN-004-05 | 조직 탈퇴 | FR-004-07 | Community |
| FN-004-06 | Role Management License 검증 | FR-004-09 | Enterprise |

### 3.3 기능 간 관계도

```
FN-003-01 (초대 생성)
    ├── FN-004-02 (권한 검증) -- 초대 권한 확인
    ├── FN-004-06 (License 검증) -- Role Management 필요 여부
    └── FN-003-02 (만료 정책) -- 만료 시간 설정

FN-003-03 (초대 재발송)
    ├── FN-004-02 (권한 검증) -- Owner/Manager 확인
    └── FN-003-02 (만료 정책) -- 만료 시간 갱신

FN-003-05 (초대 수락)
    └── FN-004-01 (RBAC 구조) -- Membership/TeamUser 생성

FN-004-03 (Team 자동 승격)
    └── FN-004-01 (RBAC 구조) -- Team 역할 변경

FN-004-04 (멤버 삭제)
    └── FN-004-02 (권한 검증) -- 삭제 권한 확인
```

---

## 4. 상세 기능 명세

### 4.1 초대 생성 (단일 초대)

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-003-01 |
| 기능명 | 초대 생성 (단일 초대) |
| 관련 요구사항 ID | FR-003-02 |
| 우선순위 | High |
| 기능 설명 | Organization Owner, Manager 또는 Team Admin이 이메일 기반으로 단일 멤버를 초대한다. 초대 시 역할과 Team 할당을 지정할 수 있으며, 초대 이메일이 자동 발송된다 |

#### 4.1.2 선행 조건 (Preconditions)

1. 초대를 생성하는 사용자가 인증된 상태여야 한다
2. 초대를 생성하는 사용자가 대상 Organization의 멤버여야 한다
3. 초대를 생성하는 사용자가 Owner, Manager, 또는 Team Admin 중 하나의 역할이어야 한다
4. 초대 비활성화 환경변수가 비활성 상태여야 한다
5. Role Management가 필요한 경우 (owner 이외 역할 또는 teamIds 포함) Enterprise License가 활성 상태여야 한다

#### 4.1.3 후행 조건 (Postconditions)

1. Invite 레코드가 데이터베이스에 생성된다
2. 만료 시간이 생성 시점 + 7일(604,800,000ms)로 설정된다
3. 초대 이메일이 대상 이메일 주소로 발송된다
4. Audit Log에 초대 생성 이벤트가 기록된다

#### 4.1.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 초대 비활성화 환경변수를 확인한다. 비활성화 상태가 아님을 확인한다 |
| 2 | 시스템 | Self-hosted 환경 여부를 확인하고, billing 역할 초대가 아닌지 검증한다 |
| 3 | 시스템 | 현재 사용자의 Organization Membership을 조회한다 |
| 4 | 시스템 | 권한을 검증한다: Owner/Manager는 Organization 수준 권한 확인, Team Admin은 팀 기반 초대 권한 검증 |
| 5 | 시스템 | Manager인 경우 초대 역할이 member인지 확인한다 |
| 6 | 시스템 | owner 역할이 아니거나 teamIds가 있는 경우 Role Management License(Access Control feature)를 검증한다 |
| 7 | 시스템 | 중복 검증을 수행한다: (a) 동일 이메일/조직 기존 초대 존재 여부, (b) 이미 조직 멤버인 사용자 여부, (c) teamIds 중복 여부, (d) teamIds가 해당 Organization에 존재하는지 여부 |
| 8 | 시스템 | 만료 시간을 현재 시각 + 604,800,000ms (7일)로 설정한다 |
| 9 | 시스템 | Invite 레코드를 생성한다 (UUID 형식 ID) |
| 10 | 시스템 | 초대 이메일을 발송한다 (JWT 토큰 포함) |
| 11 | 시스템 | Audit Log에 초대 생성 이벤트를 기록한다 |

#### 4.1.5 대안 흐름 (Alternative Flow)

**AF-01: Team Admin에 의한 초대**

| 단계 | 주체 | 동작 |
|------|------|------|
| 4a | 시스템 | 현재 사용자가 Owner/Manager가 아니지만 특정 Team의 admin인 경우, Team Admin 초대 경로로 분기한다 |
| 4b | 시스템 | 초대 역할이 member인지 확인한다. member가 아닌 경우 AuthorizationError를 발생시킨다 |
| 4c | 시스템 | teamIds에 하나 이상의 팀이 포함되어 있는지 확인한다. 비어 있으면 AuthorizationError를 발생시킨다 |
| 4d | 시스템 | 지정된 모든 teamIds에 대해 현재 사용자가 admin 역할인지 확인한다. admin이 아닌 팀이 포함된 경우 AuthorizationError를 발생시킨다 |
| 5a | - | 이후 기본 흐름 6단계부터 이어진다 |

#### 4.1.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 에러 유형 | 메시지/처리 |
|---------|------|----------|------------|
| EX-01 | 초대 비활성화 환경변수가 활성 상태 | OperationNotAllowedError | 초대 기능이 비활성화되어 있음을 알린다 |
| EX-02 | Self-hosted 환경에서 billing 역할 초대 시도 | ValidationError | billing 역할은 Cloud 환경에서만 사용 가능함을 알린다 |
| EX-03 | 현재 사용자의 Membership이 존재하지 않음 | AuthorizationError | Organization 멤버가 아님을 알린다 |
| EX-04 | 권한 부족 (Member 또는 Billing 역할이 초대 시도) | AuthorizationError | 초대 권한이 없음을 알린다 |
| EX-05 | Manager가 member 이외 역할로 초대 시도 | AuthorizationError | Manager는 member 역할로만 초대 가능함을 알린다 |
| EX-06 | Role Management License 미보유 상태에서 owner 이외 역할 또는 teamIds 지정 | LicenseError | Enterprise License가 필요함을 알린다 |
| EX-07 | 동일 이메일/조직의 기존 초대 존재 | InvalidInputError | 이미 초대가 존재함을 알린다 |
| EX-08 | 이미 조직 멤버인 사용자 초대 | InvalidInputError | 이미 조직에 속한 멤버임을 알린다 |
| EX-09 | teamIds에 중복 값 존재 | InvalidInputError | 중복된 Team ID가 포함되어 있음을 알린다 |
| EX-10 | teamIds가 해당 Organization에 존재하지 않음 | InvalidInputError | 존재하지 않는 Team ID가 포함되어 있음을 알린다 |

#### 4.1.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-01 | Manager 초대 역할 제한 | 초대 생성자의 역할이 manager인 경우 | 초대 대상 역할은 반드시 member여야 한다 |
| BR-02 | Team Admin 초대 제한 | 초대 생성자가 Team Admin인 경우 | (1) 역할은 member만 가능, (2) 자신이 admin인 팀에만 추가 가능, (3) 하나 이상의 팀을 지정해야 한다 |
| BR-03 | billing 역할 환경 제한 | Self-hosted 환경인 경우 | billing 역할로 초대할 수 없다 |
| BR-04 | 초대 ID 형식 | 항상 | Invite ID는 UUID 형식이다 (cuid가 아님) |
| BR-05 | 초대 비활성화 | 초대 비활성화 환경변수가 true인 경우 | 모든 초대 생성이 차단된다 |
| BR-06 | Role Management License | owner 이외 역할로 초대하거나 teamIds가 포함된 경우 | Access Control feature가 포함된 Enterprise License가 필요하다 |

#### 4.1.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|----------------|
| organizationId | String | O | 유효한 Organization ID. 현재 사용자가 해당 Organization의 멤버여야 한다 |
| email | String | O | 유효한 이메일 형식. 동일 Organization 내 기존 초대 또는 멤버와 중복 불가 |
| name | String | O | 최소 1자 이상 |
| role | OrganizationRole (enum) | O | owner, manager, member, billing 중 하나 |
| teamIds | String[] | O | 유효한 Team ID 배열 (빈 배열 허용). 중복 불가. 해당 Organization에 속한 Team이어야 한다 |

**출력 데이터 (Invite 레코드):**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | 초대 고유 식별자 |
| email | String | 초대 대상 이메일 |
| name | String (nullable) | 초대 대상 이름 |
| organizationId | String | 소속 Organization ID |
| creatorId | String | 초대 생성자 ID |
| acceptorId | String (nullable) | 기존 사용자인 경우 수락자 ID |
| createdAt | DateTime | 초대 생성 시각 |
| expiresAt | DateTime | 만료 시간 (생성 시점 + 7일) |
| role | OrganizationRole | 초대 시 지정한 역할 (기본: member) |
| teamIds | String[] | 수락 시 할당할 Team ID 목록 (기본: 빈 배열) |

#### 4.1.9 화면/UI 요구사항

- 초대 생성 폼: email, name, role, teamIds 입력 필드 제공
- role 선택 시 현재 사용자의 권한에 따라 선택 가능한 역할을 제한하여 표시
- teamIds 선택 시 현재 Organization에 속한 Team 목록을 제공
- Role Management License가 없는 경우 owner 역할만 선택 가능하도록 UI를 제한

#### 4.1.10 비기능 요구사항

- 모든 입력은 Zod 스키마로 검증한다 (NFR-003)
- 초대 생성 후 Audit Log에 이벤트를 기록한다 (NFR-002)
- 인증된 사용자만 Server Action에 접근 가능하다 (NFR-003)

---

### 4.2 초대 만료 정책

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-003-02 |
| 기능명 | 초대 만료 정책 |
| 관련 요구사항 ID | FR-003-03 |
| 우선순위 | High |
| 기능 설명 | 초대의 유효 기간을 7일로 제한하고, 재발송 및 토큰 생성 시 만료 시간을 갱신하는 정책을 정의한다 |

#### 4.2.2 선행 조건 (Preconditions)

1. 유효한 Invite 레코드가 존재해야 한다

#### 4.2.3 후행 조건 (Postconditions)

1. Invite의 expiresAt 필드가 정책에 따라 설정/갱신된다
2. 만료된 초대 토큰은 검증 시 실패한다

#### 4.2.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 초대 생성 시 expiresAt을 현재 시각 + 604,800,000ms (7일)로 설정한다 |
| 2 | 시스템 | 초대 토큰(JWT)을 생성할 때 만료 기간을 7일로 설정한다 |
| 3 | 시스템 | 토큰은 URL 인코딩되어 초대 이메일 링크에 포함된다 |

#### 4.2.5 대안 흐름 (Alternative Flow)

**AF-01: 초대 재발송에 의한 만료 갱신**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1a | 시스템 | 초대 재발송 시 expiresAt을 현재 시각 + 604,800,000ms (7일)로 갱신한다 |
| 2a | 시스템 | 새로운 JWT 토큰을 생성하여 이메일에 포함한다 |

**AF-02: 초대 토큰 재생성에 의한 만료 갱신**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1b | 시스템 | 초대 토큰 생성 시에도 expiresAt을 갱신한다 |

#### 4.2.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 에러 유형 | 메시지/처리 |
|---------|------|----------|------------|
| EX-01 | 만료된 토큰으로 초대 수락 시도 | TokenExpiredError | 초대가 만료되었음을 알리고 재초대를 요청한다 |

#### 4.2.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-01 | 고정 만료 기간 | 항상 | 초대 만료 기간은 7일(604,800,000ms)이다 |
| BR-02 | 만료 갱신 시점 | 재발송 또는 토큰 재생성 시 | 만료 시간은 해당 시점부터 +7일로 갱신된다 |
| BR-03 | 토큰 형식 | 항상 | JWT 형식이며 URL 인코딩되어 전달된다 |

#### 4.2.8 데이터 요구사항

| 필드명 | 타입 | 설명 |
|--------|------|------|
| expiresAt | DateTime | 생성 시점 기준 + 604,800,000ms |
| token | JWT (String) | URL 인코딩된 JWT. 만료 기간 7일 |

---

### 4.3 초대 재발송

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-003-03 |
| 기능명 | 초대 재발송 |
| 관련 요구사항 ID | FR-003-04 |
| 우선순위 | High |
| 기능 설명 | 기존 초대의 만료 시간을 갱신하고 초대 이메일을 재발송한다 |

#### 4.3.2 선행 조건 (Preconditions)

1. 유효한 Invite 레코드가 존재해야 한다
2. 현재 사용자가 해당 Organization의 Owner 또는 Manager여야 한다
3. 초대 비활성화 환경변수가 비활성 상태여야 한다

#### 4.3.3 후행 조건 (Postconditions)

1. Invite의 expiresAt이 현재 시각 + 7일로 갱신된다
2. 초대 이메일이 재발송된다
3. Audit Log에 초대 업데이트 이벤트가 기록된다

#### 4.3.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | 초대 목록에서 재발송 대상 초대를 선택한다 |
| 2 | 시스템 | 초대 비활성화 환경변수를 확인한다 |
| 3 | 시스템 | 현재 사용자의 역할(Owner 또는 Manager)을 검증한다 |
| 4 | 시스템 | Invite의 expiresAt을 현재 시각 + 604,800,000ms로 갱신한다 |
| 5 | 시스템 | 새로운 JWT 토큰이 포함된 초대 이메일을 발송한다 |
| 6 | 시스템 | Audit Log에 초대 업데이트 이벤트를 기록한다 |

#### 4.3.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.3.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 에러 유형 | 메시지/처리 |
|---------|------|----------|------------|
| EX-01 | 초대 비활성화 환경변수 활성 상태 | OperationNotAllowedError | 초대 기능이 비활성화되어 있음을 알린다 |
| EX-02 | Owner/Manager가 아닌 사용자의 재발송 시도 | AuthorizationError | 재발송 권한이 없음을 알린다 |
| EX-03 | 존재하지 않는 Invite ID | NotFoundError | 해당 초대를 찾을 수 없음을 알린다 |

#### 4.3.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-01 | 재발송 권한 | 항상 | Owner 또는 Manager만 재발송 가능하다 |
| BR-02 | 만료 시간 갱신 | 재발송 시 | expiresAt이 현재 시각 + 7일로 자동 갱신된다 |

#### 4.3.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|----------------|
| inviteId | UUID | O | 유효한 Invite ID |
| organizationId | String | O | 유효한 Organization ID |

---

### 4.4 초대 삭제

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-003-04 |
| 기능명 | 초대 삭제 |
| 관련 요구사항 ID | FR-003-05 |
| 우선순위 | High |
| 기능 설명 | 미수락 초대를 삭제(취소)한다 |

#### 4.4.2 선행 조건 (Preconditions)

1. 유효한 Invite 레코드가 존재해야 한다
2. 현재 사용자가 해당 Organization의 Owner 또는 Manager여야 한다

#### 4.4.3 후행 조건 (Postconditions)

1. Invite 레코드가 데이터베이스에서 삭제된다
2. Audit Log에 초대 삭제 이벤트가 기록된다

#### 4.4.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | 초대 목록에서 삭제 대상 초대를 선택한다 |
| 2 | 시스템 | 현재 사용자의 역할(Owner 또는 Manager)을 검증한다 |
| 3 | 시스템 | Invite 레코드를 데이터베이스에서 삭제한다 |
| 4 | 시스템 | Audit Log에 초대 삭제 이벤트를 기록한다 |

#### 4.4.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.4.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 에러 유형 | 메시지/처리 |
|---------|------|----------|------------|
| EX-01 | Owner/Manager가 아닌 사용자의 삭제 시도 | AuthorizationError | 삭제 권한이 없음을 알린다 |
| EX-02 | 존재하지 않는 Invite ID | NotFoundError | 해당 초대를 찾을 수 없음을 알린다 |

#### 4.4.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-01 | 삭제 권한 | 항상 | Owner 또는 Manager만 초대 삭제 가능하다 |

#### 4.4.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|----------------|
| inviteId | UUID | O | 유효한 Invite ID |
| organizationId | String | O | 유효한 Organization ID |

---

### 4.5 초대 수락

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-003-05 |
| 기능명 | 초대 수락 |
| 관련 요구사항 ID | FR-003-06 |
| 우선순위 | High |
| 기능 설명 | 회원가입 시 초대 토큰이 포함된 경우, 토큰을 검증하고 Membership 및 Team Membership을 자동 생성한다 |

#### 4.5.2 선행 조건 (Preconditions)

1. 유효한 (만료되지 않은) 초대 토큰이 존재해야 한다
2. 해당 초대 토큰에 대응하는 Invite 레코드가 데이터베이스에 존재해야 한다

#### 4.5.3 후행 조건 (Postconditions)

1. Membership 레코드가 생성된다 (초대 시 지정된 역할)
2. TeamUser 레코드가 생성된다 (초대 시 지정된 teamIds 기반)
3. Notification Settings가 업데이트된다
4. 초대 생성자에게 수락 알림 이메일이 발송된다
5. Invite 레코드가 삭제된다

#### 4.5.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 초대 토큰(JWT)을 검증한다 (서명, 만료 확인) |
| 2 | 시스템 | 토큰에서 추출한 정보로 Invite 레코드를 조회한다 |
| 3 | 시스템 | Membership 레코드를 생성한다 (organizationId, userId, role = 초대 시 지정된 역할) |
| 4 | 시스템 | 초대 시 지정된 teamIds 각각에 대해 TeamUser 레코드를 생성한다 |
| 5 | 시스템 | 해당 사용자의 Notification Settings를 업데이트한다 |
| 6 | 시스템 | 초대 생성자(creatorId)에게 초대 수락 알림 이메일을 발송한다 |
| 7 | 시스템 | Invite 레코드를 데이터베이스에서 삭제한다 |

#### 4.5.5 대안 흐름 (Alternative Flow)

**AF-01: 기존 사용자가 초대를 수락하는 경우**

| 단계 | 주체 | 동작 |
|------|------|------|
| 2a | 시스템 | Invite 레코드의 acceptorId에 기존 사용자 ID가 설정되어 있는 경우, 해당 사용자로 수락을 처리한다 |
| 3a | - | 이후 기본 흐름 3단계부터 이어진다 |

#### 4.5.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 에러 유형 | 메시지/처리 |
|---------|------|----------|------------|
| EX-01 | 토큰 서명 검증 실패 | AuthenticationError | 유효하지 않은 초대 토큰임을 알린다 |
| EX-02 | 토큰이 만료됨 | TokenExpiredError | 초대가 만료되었음을 알리고 관리자에게 재초대를 요청하도록 안내한다 |
| EX-03 | 토큰에 대응하는 Invite 레코드가 존재하지 않음 | NotFoundError | 이미 수락되었거나 삭제된 초대임을 알린다 |

#### 4.5.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-01 | 수락 후 삭제 | 초대 수락 완료 시 | Invite 레코드가 삭제된다 (일회성 사용) |
| BR-02 | 역할 적용 | 초대 수락 시 | 초대 생성 시 지정된 역할이 Membership에 적용된다 |
| BR-03 | Team 할당 | 초대 수락 시 teamIds가 있는 경우 | 지정된 모든 Team에 TeamUser 레코드가 생성된다 |

#### 4.5.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|----------------|
| token | String (JWT) | O | 유효한 서명, 만료되지 않은 JWT |

**출력 데이터 (Membership):**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| organizationId | String | Organization ID |
| userId | String | 수락한 사용자 ID |
| accepted | Boolean | true (수락 완료) |
| role | OrganizationRole | 초대 시 지정된 역할 |

**출력 데이터 (TeamUser, teamIds 기반):**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| teamId | String | Team ID |
| userId | String | 수락한 사용자 ID |
| role | TeamUserRole | 기본값 (contributor) |

---

### 4.6 3계층 RBAC 구조

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-004-01 |
| 기능명 | 3계층 RBAC 구조 |
| 관련 요구사항 ID | FR-004-01, FR-004-02, FR-004-03 |
| 우선순위 | High |
| 기능 설명 | Organization Role(4종), Team Role(2종), Project Permission(3종)으로 구성된 3계층 역할/권한 체계를 정의하고 관리한다 |

#### 4.6.2 선행 조건 (Preconditions)

1. 사용자가 하나 이상의 Organization에 Membership을 가지고 있어야 한다

#### 4.6.3 후행 조건 (Postconditions)

1. 사용자의 접근 권한은 3계층 구조에 따라 결정된다

#### 4.6.4 기본 흐름 (Basic Flow)

**Layer 1: Organization Role (조직 역할)**

| 역할 | 설명 | 제약 |
|------|------|------|
| owner | 최고 권한. 모든 작업 수행 가능 | 조직당 최소 1명 유지 필요 |
| manager | 멤버 관리, 초대 관리 수행 가능 | member 역할로만 초대/변경 가능 |
| member | 기본 멤버 | Team/Project 권한에 의존 |
| billing | 결제 관리 전용 | Cloud 환경에서만 사용 가능 (Self-hosted 차단) |

**Layer 2: Team Role (팀 역할)**

| 역할 | 가중치 | 설명 |
|------|--------|------|
| contributor | 1 | 팀 기여자. 기본 역할 |
| admin | 2 | 팀 관리자. 팀 멤버 초대 가능 |

**Layer 3: Project Permission (프로젝트 권한)**

| 권한 | 가중치 | 설명 |
|------|--------|------|
| read | 1 | 읽기 전용 |
| readWrite | 2 | 읽기/쓰기 |
| manage | 3 | 전체 관리 |

#### 4.6.5 대안 흐름 (Alternative Flow)

해당 없음. (역할/권한 구조 자체에 대한 정의)

#### 4.6.6 예외 흐름 (Exception Flow)

해당 없음. (역할/권한 구조 자체에 대한 정의)

#### 4.6.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-01 | Owner 최소 인원 | 항상 | 조직당 최소 1명의 Owner가 유지되어야 한다 |
| BR-02 | billing 환경 제한 | Self-hosted 환경 | billing 역할 사용 불가. ValidationError 발생 |
| BR-03 | Team 권한 계층 | 권한 비교 시 | 가중치 기반 비교: contributor(1) < admin(2) |
| BR-04 | Project 권한 계층 | 권한 비교 시 | 가중치 기반 비교: read(1) < readWrite(2) < manage(3) |
| BR-05 | Membership 기본값 | Membership 생성 시 | role = member, accepted = false |
| BR-06 | ProjectTeam 기본값 | ProjectTeam 생성 시 | permission = read |

#### 4.6.8 데이터 요구사항

**Membership 데이터 모델:**

| 필드명 | 타입 | 기본값 | 제약 조건 |
|--------|------|--------|----------|
| organizationId | String | - | FK: Organization.id |
| userId | String | - | FK: User.id |
| accepted | Boolean | false | - |
| role | OrganizationRole | member | enum: owner, manager, member, billing |

- 복합 기본키: (userId, organizationId)
- 인덱스: (organizationId)

**Team 데이터 모델:**

| 필드명 | 타입 | 제약 조건 |
|--------|------|----------|
| id | String (cuid) | PK |
| name | String | - |
| organizationId | String | FK: Organization.id |

- 고유 제약: (organizationId, name) -- Organization 내 팀 이름 고유

**TeamUser 데이터 모델:**

| 필드명 | 타입 | 제약 조건 |
|--------|------|----------|
| teamId | String | FK: Team.id |
| userId | String | FK: User.id |
| role | TeamUserRole | enum: admin, contributor |

- 복합 기본키: (teamId, userId)
- 인덱스: (userId)

**ProjectTeam 데이터 모델:**

| 필드명 | 타입 | 기본값 | 제약 조건 |
|--------|------|--------|----------|
| projectId | String | - | FK: Project.id |
| teamId | String | - | FK: Team.id |
| permission | ProjectTeamPermission | read | enum: read, readWrite, manage |

- 복합 기본키: (projectId, teamId)
- 인덱스: (teamId)

**Invite 데이터 모델:**

| 필드명 | 타입 | 제약 조건 |
|--------|------|----------|
| id | UUID | PK |
| email | String | - |
| name | String (nullable) | - |
| organizationId | String | FK: Organization.id |
| creatorId | String | FK: User.id |
| acceptorId | String (nullable) | FK: User.id |
| createdAt | DateTime | 자동 설정 |
| expiresAt | DateTime | 생성 시점 + 604,800,000ms |
| role | OrganizationRole | 기본: member |
| teamIds | String[] | 기본: 빈 배열 |

- 인덱스: (email, organizationId), (organizationId)

---

### 4.7 권한 검증 미들웨어

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-004-02 |
| 기능명 | 권한 검증 미들웨어 |
| 관련 요구사항 ID | FR-004-04 |
| 우선순위 | High |
| 기능 설명 | 접근 규칙(access rules) 배열을 받아 사용자의 권한을 검증하는 미들웨어. 각 규칙을 OR 조건으로 평가하여 하나라도 통과하면 접근을 허용한다 |

#### 4.7.2 선행 조건 (Preconditions)

1. 사용자가 인증된 상태여야 한다
2. 접근 규칙(access rules) 배열이 정의되어 있어야 한다

#### 4.7.3 후행 조건 (Postconditions)

1. 접근 허용: 하나 이상의 접근 규칙을 충족하면 요청을 처리한다
2. 접근 거부: 모든 접근 규칙을 충족하지 못하면 AuthorizationError를 발생시킨다

#### 4.7.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 접근 규칙 배열을 순회한다 |
| 2 | 시스템 | 각 규칙의 접근 유형에 따라 검증을 수행한다 |
| 3 | 시스템 | 규칙 유형별 검증 로직을 실행한다 (아래 상세 참조) |
| 4 | 시스템 | 하나라도 통과하면 접근을 허용하고 순회를 중단한다 |
| 5 | 시스템 | 모든 규칙 검증 실패 시 AuthorizationError를 발생시킨다 |

**접근 유형별 검증 로직:**

| 접근 유형 | 검증 방식 |
|-----------|-----------|
| Organization 접근 | 사용자의 Organization 역할이 허용된 역할 목록(allowedRoles)에 포함되는지 확인 |
| ProjectTeam 접근 | 사용자의 프로젝트 권한 가중치가 최소 권한(minPermission) 가중치 이상인지 확인 |
| Team 접근 | 사용자의 팀 역할 가중치가 최소 역할(minPermission) 가중치 이상인지 확인 |

#### 4.7.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.7.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 에러 유형 | 메시지/처리 |
|---------|------|----------|------------|
| EX-01 | 모든 접근 규칙 검증 실패 | AuthorizationError | 접근 권한이 없음을 알린다 |
| EX-02 | 사용자 Membership이 존재하지 않음 | AuthorizationError | Organization 멤버가 아님을 알린다 |

#### 4.7.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-01 | OR 조건 평가 | 접근 규칙 배열 순회 시 | 하나라도 통과하면 접근 허용 |
| BR-02 | 가중치 비교 | ProjectTeam/Team 접근 시 | 사용자 권한 가중치 >= 최소 권한 가중치이면 통과 |
| BR-03 | Project 권한 가중치 | 가중치 비교 시 | read=1, readWrite=2, manage=3 |
| BR-04 | Team 역할 가중치 | 가중치 비교 시 | contributor=1, admin=2 |

#### 4.7.8 데이터 요구사항

**입력 데이터 (접근 규칙 구조):**

```
AccessRule = {
  type: "organization" | "projectTeam" | "team",
  // Organization 접근 시:
  organizationId?: String,
  allowedRoles?: OrganizationRole[],
  // ProjectTeam 접근 시:
  projectId?: String,
  minPermission?: ProjectTeamPermission,
  // Team 접근 시:
  teamId?: String,
  minPermission?: TeamUserRole
}
```

---

### 4.8 역할 변경 시 Team 멤버십 자동 승격

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-004-03 |
| 기능명 | 역할 변경 시 Team 멤버십 자동 승격 |
| 관련 요구사항 ID | FR-004-05 |
| 우선순위 | Medium |
| 기능 설명 | Organization 역할이 owner 또는 manager로 변경될 때, 해당 Organization 내 모든 Team Membership의 역할을 admin으로 자동 승격한다 |

#### 4.8.2 선행 조건 (Preconditions)

1. 대상 사용자가 해당 Organization의 멤버여야 한다
2. 역할 변경을 수행하는 사용자가 적절한 권한(Owner)을 가지고 있어야 한다
3. Role Management License가 활성 상태여야 한다

#### 4.8.3 후행 조건 (Postconditions)

1. 대상 사용자의 Organization 역할이 owner 또는 manager로 변경된다
2. 해당 Organization의 모든 Team에서 해당 사용자의 TeamUser 역할이 admin으로 변경된다
3. Audit Log에 멤버십 업데이트 이벤트가 기록된다

#### 4.8.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 역할 변경 요청을 수신한다 (대상 역할: owner 또는 manager) |
| 2 | 시스템 | 대상 사용자의 Membership 역할을 변경한다 |
| 3 | 시스템 | 해당 Organization에 속한 모든 Team에서 대상 사용자의 TeamUser 레코드를 조회한다 |
| 4 | 시스템 | 각 TeamUser 레코드의 role을 admin으로 업데이트한다 |
| 5 | 시스템 | Audit Log에 멤버십 업데이트 이벤트를 기록한다 |

#### 4.8.5 대안 흐름 (Alternative Flow)

**AF-01: member 또는 billing으로 역할 변경**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1a | 시스템 | 대상 역할이 member 또는 billing인 경우, Team 멤버십 자동 승격을 수행하지 않는다 |
| 2a | 시스템 | Membership 역할만 변경한다 |

#### 4.8.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 에러 유형 | 메시지/처리 |
|---------|------|----------|------------|
| EX-01 | Role Management License 미보유 | LicenseError | Enterprise License가 필요함을 알린다 |

#### 4.8.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-01 | 자동 승격 대상 | 역할이 owner 또는 manager로 변경되는 경우 | 모든 Team Membership이 admin으로 자동 승격된다 |
| BR-02 | 비대상 역할 | 역할이 member 또는 billing으로 변경되는 경우 | Team Membership 변경 없음 |

#### 4.8.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|----------------|
| organizationId | String | O | 유효한 Organization ID |
| userId | String | O | 유효한 User ID. 해당 Organization의 멤버여야 한다 |
| newRole | OrganizationRole | O | owner, manager, member, billing 중 하나 |

---

### 4.9 멤버 삭제

#### 4.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-004-04 |
| 기능명 | 멤버 삭제 |
| 관련 요구사항 ID | FR-004-06 |
| 우선순위 | High |
| 기능 설명 | Organization에서 멤버를 삭제한다. 삭제 시 해당 Organization의 모든 TeamUser 레코드도 함께 삭제된다 |

#### 4.9.2 선행 조건 (Preconditions)

1. 삭제를 수행하는 사용자가 해당 Organization의 Owner 또는 Manager여야 한다
2. 삭제 대상 사용자가 해당 Organization의 멤버여야 한다

#### 4.9.3 후행 조건 (Postconditions)

1. 대상 사용자의 Membership 레코드가 삭제된다
2. 해당 Organization의 모든 TeamUser 레코드가 삭제된다
3. 위 두 작업은 데이터베이스 트랜잭션으로 원자적으로 처리된다
4. Audit Log에 멤버십 삭제 이벤트가 기록된다

#### 4.9.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | 멤버 목록에서 삭제 대상을 선택한다 |
| 2 | 시스템 | 현재 사용자의 역할(Owner 또는 Manager)을 검증한다 |
| 3 | 시스템 | 제약 조건을 검증한다 (아래 예외 흐름 참조) |
| 4 | 시스템 | 데이터베이스 트랜잭션을 시작한다 |
| 5 | 시스템 | 대상 사용자의 해당 Organization 내 모든 TeamUser 레코드를 삭제한다 |
| 6 | 시스템 | 대상 사용자의 Membership 레코드를 삭제한다 |
| 7 | 시스템 | 트랜잭션을 커밋한다 |
| 8 | 시스템 | Audit Log에 멤버십 삭제 이벤트를 기록한다 |

#### 4.9.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.9.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 에러 유형 | 메시지/처리 |
|---------|------|----------|------------|
| EX-01 | Owner/Manager가 아닌 사용자의 삭제 시도 | AuthorizationError | 삭제 권한이 없음을 알린다 |
| EX-02 | 자기 자신을 삭제하려는 시도 | OperationNotAllowedError | 자기 자신은 삭제할 수 없음을 알린다 |
| EX-03 | Manager가 Owner를 삭제하려는 시도 | AuthorizationError | Manager는 Owner를 삭제할 수 없음을 알린다 |
| EX-04 | 마지막 Owner를 삭제하려는 시도 | OperationNotAllowedError | 마지막 Owner는 삭제할 수 없음을 알린다. 조직당 최소 1명의 Owner가 유지되어야 한다 |

#### 4.9.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-01 | 삭제 권한 | 항상 | Owner 또는 Manager만 멤버 삭제 가능 |
| BR-02 | 자기 삭제 방지 | 삭제 대상 == 현재 사용자 | OperationNotAllowedError 발생 |
| BR-03 | Manager의 Owner 삭제 제한 | 현재 사용자가 Manager이고 대상이 Owner인 경우 | AuthorizationError 발생 |
| BR-04 | 마지막 Owner 보호 | 대상이 Owner이고 다른 Owner가 없는 경우 | OperationNotAllowedError 발생 |
| BR-05 | 트랜잭션 처리 | 항상 | TeamUser 삭제와 Membership 삭제는 원자적으로 수행 (NFR-001) |

#### 4.9.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|----------------|
| organizationId | String | O | 유효한 Organization ID |
| userId | String | O | 유효한 User ID. 해당 Organization의 멤버여야 한다. 현재 사용자와 다른 ID여야 한다 |

---

### 4.10 조직 탈퇴

#### 4.10.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-004-05 |
| 기능명 | 조직 탈퇴 (Leave Organization) |
| 관련 요구사항 ID | FR-004-07 |
| 우선순위 | Medium |
| 기능 설명 | 멤버가 자발적으로 Organization에서 탈퇴한다 |

#### 4.10.2 선행 조건 (Preconditions)

1. 현재 사용자가 해당 Organization의 멤버여야 한다
2. Multi-Org 기능이 활성화되어 있어야 한다
3. 현재 사용자가 2개 이상의 Organization에 속해 있어야 한다

#### 4.10.3 후행 조건 (Postconditions)

1. 현재 사용자의 Membership 레코드가 삭제된다
2. Audit Log에 조직 탈퇴(멤버십 삭제) 이벤트가 기록된다

#### 4.10.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | 조직 설정에서 탈퇴 액션을 실행한다 |
| 2 | 시스템 | 현재 사용자의 역할이 Owner가 아닌지 확인한다 |
| 3 | 시스템 | Multi-Org 기능이 활성화되어 있는지 확인한다 |
| 4 | 시스템 | 현재 사용자가 2개 이상의 Organization에 속해 있는지 확인한다 |
| 5 | 시스템 | Membership 레코드를 삭제한다 |
| 6 | 시스템 | Audit Log에 조직 탈퇴 이벤트를 기록한다 |

#### 4.10.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.10.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 에러 유형 | 메시지/처리 |
|---------|------|----------|------------|
| EX-01 | Owner가 탈퇴 시도 | OperationNotAllowedError | Owner는 조직 탈퇴가 불가능함을 알린다. 탈퇴 전 역할 변경이 필요하다 |
| EX-02 | Multi-Org가 비활성 상태 | OperationNotAllowedError | Multi-Organization 기능이 비활성화되어 있어 탈퇴가 불가능함을 알린다 |
| EX-03 | 유일한 Organization | ValidationError | 유일한 조직에서는 탈퇴할 수 없음을 알린다 |

#### 4.10.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-01 | Owner 탈퇴 불가 | 현재 역할이 owner인 경우 | OperationNotAllowedError 발생 |
| BR-02 | Multi-Org 필수 | Multi-Org 비활성 시 | 탈퇴 액션 불가 |
| BR-03 | 최소 1개 조직 유지 | 사용자가 1개의 Organization에만 속한 경우 | ValidationError 발생 |
| BR-04 | 모든 역할 호출 가능 | manager, member, billing 역할 | 탈퇴 액션 호출 가능 (Owner 제외) |

#### 4.10.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|----------------|
| organizationId | String | O | 유효한 Organization ID. 현재 사용자가 멤버여야 한다 |

---

### 4.11 Role Management License 검증

#### 4.11.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-004-06 |
| 기능명 | Role Management License 검증 |
| 관련 요구사항 ID | FR-004-09, FR-004-10 |
| 우선순위 | High |
| 기능 설명 | RBAC 고급 기능(역할 지정, Team 할당, 역할 변경) 사용 시 Enterprise License의 Access Control feature 활성화 여부를 검증한다 |

#### 4.11.2 선행 조건 (Preconditions)

1. License 시스템이 초기화되어 있어야 한다

#### 4.11.3 후행 조건 (Postconditions)

1. License가 유효한 경우: 요청된 작업이 수행된다
2. License가 유효하지 않은 경우: LicenseError가 발생한다

#### 4.11.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | Role Management가 필요한 작업인지 판단한다 |
| 2 | 시스템 | License 활성 상태를 확인한다 |
| 3 | 시스템 | Access Control feature 플래그가 활성화되어 있는지 확인한다 |
| 4 | 시스템 | Cloud 환경인 경우, Custom billing plan 여부도 추가 확인한다 |
| 5 | 시스템 | 모든 조건 충족 시 작업을 허용한다 |

**Role Management가 필요한 작업 목록:**

| 작업 | 조건 |
|------|------|
| 초대 생성 | owner 이외의 역할로 초대 시 |
| 초대 생성 | teamIds가 포함된 초대 시 |
| 멤버십 역할 변경 | 역할 변경 시 항상 |
| 초대 역할 변경 | 초대 역할 변경 시 항상 |

#### 4.11.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.11.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 에러 유형 | 메시지/처리 |
|---------|------|----------|------------|
| EX-01 | License 비활성 | LicenseError | Enterprise License가 필요함을 알린다 |
| EX-02 | Access Control feature 비활성 | LicenseError | Access Control feature가 활성화된 플랜이 필요함을 알린다 |
| EX-03 | Cloud 환경에서 Custom plan 미사용 | LicenseError | Custom billing plan이 필요함을 알린다 |

#### 4.11.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-01 | Cloud License 요건 | Cloud 환경 | License 활성 + Access Control feature + Custom billing plan 필요 |
| BR-02 | Self-hosted License 요건 | Self-hosted 환경 | License 활성 + Access Control feature 필요 |
| BR-03 | billing 역할 환경 제한 | Self-hosted 환경 | billing 역할 초대/변경 시 ValidationError 발생 |

#### 4.11.8 데이터 요구사항

해당 기능은 별도의 입력 데이터를 받지 않으며, 시스템 내부 License 상태를 참조한다.

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

| 엔티티 | 설명 | 식별자 |
|--------|------|--------|
| Invite | 멤버 초대 레코드 | id (UUID) |
| Membership | 사용자-Organization 관계 | (userId, organizationId) 복합키 |
| Team | Organization 내 팀 | id (cuid) |
| TeamUser | 사용자-Team 관계 | (teamId, userId) 복합키 |
| ProjectTeam | Team-Project 관계 | (projectId, teamId) 복합키 |

### 5.2 엔티티 간 관계

```
Organization (1) --- (*) Membership (*) --- (1) User
Organization (1) --- (*) Invite
Organization (1) --- (*) Team
Team (1) --- (*) TeamUser (*) --- (1) User
Team (1) --- (*) ProjectTeam (*) --- (1) Project
User (1) --- (*) Invite [creatorId]
```

- Organization : Membership = 1 : N (하나의 Organization에 여러 멤버)
- User : Membership = 1 : N (한 사용자가 여러 Organization에 속할 수 있음)
- Organization : Invite = 1 : N (하나의 Organization에 여러 초대)
- Organization : Team = 1 : N (하나의 Organization에 여러 Team)
- Team : TeamUser = 1 : N (하나의 Team에 여러 멤버)
- User : TeamUser = 1 : N (한 사용자가 여러 Team에 속할 수 있음)
- Team : ProjectTeam = 1 : N (하나의 Team이 여러 Project에 권한 보유 가능)
- Project : ProjectTeam = 1 : N (하나의 Project에 여러 Team이 접근 가능)

### 5.3 데이터 흐름

```
[초대 생성 흐름]
사용자 입력 (email, name, role, teamIds)
    --> 권한 검증
    --> License 검증
    --> 중복 검증
    --> Invite 레코드 생성 (DB)
    --> 이메일 발송

[초대 수락 흐름]
JWT 토큰 검증
    --> Invite 레코드 조회 (DB)
    --> Membership 생성 (DB)
    --> TeamUser 생성 (DB, teamIds 기반)
    --> Notification Settings 업데이트 (DB)
    --> 수락 알림 이메일 발송
    --> Invite 레코드 삭제 (DB)

[멤버 삭제 흐름]
삭제 요청 (organizationId, userId)
    --> 권한 검증
    --> 제약 조건 검증
    --> [트랜잭션 시작]
        --> TeamUser 삭제 (DB)
        --> Membership 삭제 (DB)
    --> [트랜잭션 커밋]

[역할 변경 흐름]
역할 변경 요청 (organizationId, userId, newRole)
    --> 권한 검증
    --> License 검증
    --> Membership 역할 변경 (DB)
    --> [newRole이 owner/manager인 경우]
        --> 해당 Organization TeamUser 역할 admin으로 일괄 변경 (DB)
```

---

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 연동 대상 | 용도 | 연동 방식 |
|-----------|------|-----------|
| 이메일 발송 시스템 | 초대 이메일, 수락 알림 이메일 발송 | 내부 이메일 서비스 호출 |
| License API | Enterprise License 상태 확인 | HTTP API (캐시 적용: Memory 1분, Redis 24시간) |
| Audit Log 시스템 | 감사 이벤트 기록 | 내부 Audit Log 큐잉 |

### 6.2 API 명세

본 기능은 Server Action 기반으로 구현되며, 별도의 REST API 엔드포인트를 노출하지 않는다. 주요 Server Action은 다음과 같다.

| Action | 설명 | 권한 |
|--------|------|------|
| createInvite | 단일 멤버 초대 생성 | Owner, Manager, Team Admin |
| resendInvite | 초대 재발송 | Owner, Manager |
| deleteInvite | 초대 삭제 | Owner, Manager |
| acceptInvite | 초대 수락 (토큰 기반) | 초대 대상자 |
| updateMembershipRole | 멤버십 역할 변경 | Owner (모든 역할), Manager (member로만) |
| deleteMembership | 멤버 삭제 | Owner, Manager |
| leaveOrganization | 조직 탈퇴 | Manager, Member, Billing |

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| 항목 | 목표 |
|------|------|
| 초대 생성 응답 시간 | 2초 이내 (이메일 발송 제외) |
| 권한 검증 응답 시간 | 2초 이내 |
| License 캐시 | Memory 1분, Redis 24시간 TTL |

### 7.2 보안 요구사항

| 항목 | 구현 |
|------|------|
| 인증 | 모든 Server Action은 인증된 세션 필요 |
| 권한 검증 | 접근 규칙 기반 RBAC 미들웨어 적용 |
| 입력 검증 | Zod 스키마 기반 유효성 검증 |
| 초대 토큰 | JWT 형식, 서명 검증, 만료 확인 |
| Rate Limiting | Redis 기반, 엔드포인트별 제한 설정 |

### 7.3 가용성 요구사항

| 항목 | 목표 |
|------|------|
| License Grace Period | 3일 (License 서버 접근 불가 시) |
| 트랜잭션 무결성 | 멤버 삭제 시 TeamUser/Membership 원자적 삭제 |

---

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| 항목 | 제약 |
|------|------|
| Invite ID 형식 | UUID (cuid가 아님) |
| 초대 방식 | 단일 초대만 지원 (CSV 일괄 초대 미지원) |
| JWT 만료 | 7일 고정 |
| 트랜잭션 범위 | 멤버 삭제 시 TeamUser 삭제 + Membership 삭제 |
| 입력 검증 | Zod 스키마 기반 |

### 8.2 비즈니스 제약사항

| 항목 | 제약 |
|------|------|
| billing 역할 | Cloud 환경에서만 사용 가능 |
| Role Management | Enterprise License + Access Control feature 필요 |
| Owner 최소 인원 | 조직당 최소 1명 유지 |
| Manager 역할 제한 | member 역할로만 초대/변경 가능 |
| Team Admin 역할 제한 | member 역할 + 자신의 팀만 초대 가능 |
| Multi-Org 탈퇴 | Multi-Org 활성화 필수 |

### 8.3 가정사항

| 항목 | 가정 |
|------|------|
| 이메일 발송 | 이메일 발송 시스템이 정상 동작함을 가정한다 |
| License 서버 | License 서버가 일시적 장애 시 Grace Period(3일)로 보완됨을 가정한다 |
| 시간 동기화 | 서버 시간이 정확히 동기화되어 있음을 가정한다 (JWT 만료 판정) |
| 데이터베이스 | PostgreSQL이 트랜잭션 ACID를 보장함을 가정한다 |

---

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 요구사항명 | 기능 명세 ID | 기능명 | 상태 |
|------------|-----------|-------------|--------|------|
| FR-003-01 | 초대 데이터 모델 | FN-004-01 (4.6) | 3계층 RBAC 구조 (데이터 모델 섹션) | 반영 완료 |
| FR-003-02 | 초대 생성 (단일 초대) | FN-003-01 (4.1) | 초대 생성 (단일 초대) | 반영 완료 |
| FR-003-03 | 초대 만료 정책 | FN-003-02 (4.2) | 초대 만료 정책 | 반영 완료 |
| FR-003-04 | 초대 재발송 | FN-003-03 (4.3) | 초대 재발송 | 반영 완료 |
| FR-003-05 | 초대 삭제 | FN-003-04 (4.4) | 초대 삭제 | 반영 완료 |
| FR-003-06 | 초대 수락 흐름 | FN-003-05 (4.5) | 초대 수락 | 반영 완료 |
| FR-004-01 | 3계층 역할/권한 구조 | FN-004-01 (4.6) | 3계층 RBAC 구조 | 반영 완료 |
| FR-004-02 | Membership 데이터 모델 | FN-004-01 (4.6) | 3계층 RBAC 구조 (데이터 모델 섹션) | 반영 완료 |
| FR-004-03 | Team 데이터 모델 | FN-004-01 (4.6) | 3계층 RBAC 구조 (데이터 모델 섹션) | 반영 완료 |
| FR-004-04 | 권한 검증 미들웨어 | FN-004-02 (4.7) | 권한 검증 미들웨어 | 반영 완료 |
| FR-004-05 | 역할 변경 시 Team 멤버십 자동 승격 | FN-004-03 (4.8) | 역할 변경 시 Team 멤버십 자동 승격 | 반영 완료 |
| FR-004-06 | 멤버 삭제 | FN-004-04 (4.9) | 멤버 삭제 | 반영 완료 |
| FR-004-07 | 조직 탈퇴 | FN-004-05 (4.10) | 조직 탈퇴 | 반영 완료 |
| FR-004-08 | 역할 변경 권한 매트릭스 | FN-003-01 (4.1), FN-004-04 (4.9), FN-004-05 (4.10) | 초대 생성, 멤버 삭제, 조직 탈퇴 (비즈니스 규칙에 분산 반영) | 반영 완료 |
| FR-004-09 | Role Management License 검증 | FN-004-06 (4.11) | Role Management License 검증 | 반영 완료 |
| FR-004-10 | Billing 역할 제한 | FN-003-01 (4.1), FN-004-06 (4.11) | 초대 생성, License 검증 (예외 흐름/비즈니스 규칙에 반영) | 반영 완료 |
| NFR-001 | 트랜잭션 | FN-004-04 (4.9) | 멤버 삭제 (트랜잭션 처리 명시) | 반영 완료 |
| NFR-002 | Audit Logging | FN-003-01~05, FN-004-03~05 | 전체 기능 (후행 조건에 명시) | 반영 완료 |
| NFR-003 | 입력 검증 | FN-003-01 (4.1) 외 전체 | 전체 기능 (비기능 요구사항에 명시) | 반영 완료 |

### 9.2 역할 변경 권한 매트릭스

| 작업 | Owner | Manager | Member | Billing |
|------|-------|---------|--------|---------|
| 멤버 초대 | 모든 역할로 가능 | member로만 가능 | 불가 (Team Admin인 경우 member로 제한적 가능) | 불가 |
| 역할 변경 | 모든 역할로 가능 | member로만 가능 | 불가 | 불가 |
| 멤버 삭제 | 가능 (자신 제외) | 가능 (Owner 제외, 자신 제외) | 불가 | 불가 |
| 초대 삭제/재발송 | 가능 | 가능 | 불가 | 불가 |
| 조직 탈퇴 | 불가 | 가능 | 가능 | 가능 |

### 9.3 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-02-21 | 1.0 | 초기 작성 - FSD-004 요구사항 명세서 기반 | Claude |
