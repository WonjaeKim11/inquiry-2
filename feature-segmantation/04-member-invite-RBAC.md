# 멤버 초대 / RBAC -- 요구사항 명세서

> **문서번호**: FSD-004 | **FR 범위**: FR-003, FR-004
> **라이선스**: Community (기본 초대) / Enterprise (Role Management, Access Control)

---

## 1. 목적/배경

Formbricks 플랫폼의 멤버 초대 및 역할 기반 접근 제어(RBAC) 시스템에 대한 요구사항을 정의한다. Organization 수준의 4가지 역할(owner, manager, member, billing), Team 수준의 2가지 역할(admin, contributor), Project 수준의 3가지 권한(read, readWrite, manage)으로 구성된 3계층 RBAC 구조를 지원한다. 멤버 초대는 **단일 초대 방식만 지원**하며 (CSV 일괄 초대 미지원), 7일 만료 정책이 적용된다.

---

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- 단일 멤버 초대 (이메일 기반)
- 초대 만료 및 갱신 정책
- 초대 수락 흐름
- 3계층 RBAC: Organization Role, Team Role, Project Permission
- 권한 검증 미들웨어
- 역할 변경 시 Team 멤버십 자동 승격
- 멤버 삭제/탈퇴

### Out-of-scope
- CSV 일괄 초대 (코드에 구현되어 있지 않음)
- 조직 생성/삭제 (FSD-003에서 다룸)
- 감사 로그 (FSD-005에서 다룸)

---

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| Organization Owner | 모든 멤버 관리 권한, 역할 변경, 초대 생성/삭제 |
| Organization Manager | 멤버 초대(member 역할만), 초대 관리 |
| Team Admin | 자신의 Team에 member 역할로만 초대 가능 |
| Organization Member | 기본 멤버, 초대 권한 없음 |
| Billing Manager | Cloud 전용, 결제 관리 전용 역할 |

---

## 4. 기능 요구사항

### FR-003: 멤버 초대

#### FR-003-01: 초대 데이터 모델

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID | 고유 식별자 (UUID 형식, cuid가 아닌 UUID) |
| email | String | 초대 대상 이메일 |
| name | String (nullable) | 초대 대상 이름 (선택) |
| organizationId | String | 소속 Organization ID |
| creatorId | String | 초대 생성자 ID |
| acceptorId | String (nullable) | 기존 사용자인 경우 수락자 ID |
| createdAt | DateTime | 초대 생성 시각 |
| expiresAt | DateTime | 만료 시간 (생성 시점 + 7일) |
| role | OrganizationRole | 초대 시 지정할 역할 (기본: member) |
| teamIds | String 배열 | 수락 시 할당할 Team ID 목록 (기본: 빈 배열) |

- 인덱스: (email, organizationId), (organizationId)

#### FR-003-02: 초대 생성 (단일 초대)

**입력 항목:**

| 필드 | 필수 | 설명 |
|------|------|------|
| organizationId | O | 대상 Organization ID |
| email | O | 초대 대상 이메일 |
| name | O | 초대 대상 이름 (최소 1자) |
| role | O | Organization 역할 |
| teamIds | O | 할당할 Team ID 목록 |

**처리 흐름:**
1. 초대 비활성화 환경변수 확인
2. Self-hosted 환경에서 billing 역할 초대 차단
3. 현재 사용자 멤버십 조회
4. 권한 검증:
   - Owner/Manager: Organization 수준 권한 확인
   - Team Admin: Team Admin 초대 권한 검증
5. Manager는 member 역할로만 초대 가능
6. owner 역할이 아니거나 teamIds가 있는 경우 Role Management 라이선스 검증
7. 중복 검증:
   - 동일 이메일/조직의 기존 초대 존재 시 InvalidInputError
   - 이미 조직 멤버인 사용자 초대 시 InvalidInputError
   - teamIds 중복 검증
   - teamIds가 해당 Organization에 존재하는지 검증
8. 만료 시간 설정: 현재 시각 + 7일
9. 초대 레코드 생성
10. 초대 이메일 발송
11. Audit Log 기록 (초대 생성 이벤트)

**Team Admin의 초대 제한 사항:**
- Team Admin은 member 역할로만 초대 가능
- Team Admin은 자신이 admin인 팀에만 사용자 추가 가능
- Team Admin은 반드시 하나 이상의 팀에 사용자를 추가해야 함

#### FR-003-03: 초대 만료 정책

**만료 시간:** 7일 (생성 시점 기준, 604,800,000ms)

**만료 갱신:**
- 초대 재발송(resend) 시 자동으로 만료 시간 갱신 (+7일)
- 초대 토큰 생성 시에도 만료 갱신 수행

**초대 토큰:**
- JWT 형식, 만료 기간 7일
- URL 인코딩되어 전달

#### FR-003-04: 초대 재발송

- Owner/Manager만 재발송 가능
- 만료 시간 자동 갱신
- 재발송 후 초대 이메일 발송
- 초대 비활성화 설정 시 재발송 차단

#### FR-003-05: 초대 삭제

- Owner/Manager만 삭제 가능
- Audit Log 기록 (초대 삭제 이벤트)

#### FR-003-06: 초대 수락 흐름

회원가입 시 초대 토큰이 포함된 경우:

1. 초대 토큰 검증
2. Invite 레코드 조회
3. Membership 생성 (초대 시 지정된 역할)
4. Team Membership 생성 (초대 시 지정된 teamIds)
5. Notification Settings 업데이트
6. 초대 수락 알림 이메일 발송 (초대 생성자에게)
7. Invite 레코드 삭제

---

### FR-004: RBAC (역할 기반 접근 제어)

#### FR-004-01: 3계층 역할/권한 구조

**Layer 1: Organization Role (조직 역할)**

| 역할 | 설명 | 제약 |
|------|------|------|
| owner | 최고 권한, 모든 작업 가능 | 조직당 최소 1명 유지 필요 |
| manager | 멤버 관리, 초대 관리 | member 역할로만 초대/변경 가능 |
| member | 기본 멤버 | Team/Project 권한에 의존 |
| billing | 결제 관리 전용 | **Cloud 환경 전용** (Self-hosted 차단) |

**Layer 2: Team Role (팀 역할)**

| 역할 | 설명 |
|------|------|
| admin | 팀 관리, 팀 멤버 초대 가능 |
| contributor | 팀 기여자, 기본 역할 |

**Layer 3: Project Permission (프로젝트 권한)**

| 권한 | 가중치 | 설명 |
|------|--------|------|
| read | 1 | 읽기 전용 |
| readWrite | 2 | 읽기/쓰기 |
| manage | 3 | 전체 관리 |

#### FR-004-02: Membership 데이터 모델

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| organizationId | String | - | Organization ID |
| userId | String | - | 사용자 ID |
| accepted | Boolean | false | 수락 여부 |
| role | OrganizationRole | member | 조직 역할 |

- 복합 기본키: (userId, organizationId)
- 인덱스: (organizationId)

#### FR-004-03: Team 데이터 모델

**Team:**

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (cuid) | 고유 식별자 |
| name | String | 팀 이름 |
| organizationId | String | 소속 Organization ID |

- 고유 제약: (organizationId, name) -- Organization 내 팀 이름 고유

**TeamUser:**

| 필드 | 타입 | 설명 |
|------|------|------|
| teamId | String | Team ID |
| userId | String | 사용자 ID |
| role | TeamUserRole | admin 또는 contributor |

- 복합 기본키: (teamId, userId)
- 인덱스: (userId)

**ProjectTeam:**

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| projectId | String | - | Project ID |
| teamId | String | - | Team ID |
| permission | ProjectTeamPermission | read | 프로젝트 권한 |

- 복합 기본키: (projectId, teamId)
- 인덱스: (teamId)

#### FR-004-04: 권한 검증 미들웨어

**권한 접근 유형:**

| 접근 유형 | 검증 방식 |
|-----------|-----------|
| Organization 접근 | 사용자 역할이 허용된 역할 목록에 포함되는지 확인 |
| ProjectTeam 접근 | 사용자의 프로젝트 권한이 최소 권한(minPermission) 이상인지 확인 |
| Team 접근 | 사용자의 팀 역할이 최소 역할(minPermission) 이상인지 확인 |

**권한 가중치:**

| 프로젝트 권한 | 가중치 |
|---------------|--------|
| read | 1 |
| readWrite | 2 |
| manage | 3 |

| 팀 역할 | 가중치 |
|---------|--------|
| contributor | 1 |
| admin | 2 |

**검증 로직:**
- 접근 규칙 배열의 각 항목을 순회하며 OR 조건으로 평가
- 하나라도 통과하면 성공 반환
- 모두 실패하면 AuthorizationError 발생

#### FR-004-05: 역할 변경 시 Team 멤버십 자동 승격

**자동 승격 규칙:**
- Organization 역할이 owner 또는 manager로 변경되면
- 해당 Organization의 모든 Team Membership 역할을 admin으로 자동 승격

#### FR-004-06: 멤버 삭제

**제약 조건:**
1. Owner/Manager만 멤버 삭제 가능
2. 자기 자신은 삭제 불가 (OperationNotAllowedError)
3. Manager는 Owner를 삭제할 수 없음
4. 마지막 Owner는 삭제 불가
5. 멤버 삭제 시 해당 Organization의 모든 TeamUser도 함께 삭제 (트랜잭션 처리)

#### FR-004-07: 조직 탈퇴 (Leave Organization)

**제약 조건:**
1. 모든 역할의 멤버가 탈퇴 액션 호출 가능
2. Owner는 탈퇴 불가 (OperationNotAllowedError)
3. Multi-Org가 비활성인 경우 탈퇴 불가
4. 유일한 Organization이면 탈퇴 불가 (ValidationError)

#### FR-004-08: 역할 변경 권한 매트릭스

| 작업 | Owner | Manager | Member | Billing |
|------|-------|---------|--------|---------|
| 멤버 초대 | 모든 역할로 | member로만 | 불가 (Team Admin인 경우 제한적 가능) | 불가 |
| 역할 변경 | 모든 역할로 | member로만 | 불가 | 불가 |
| 멤버 삭제 | 가능 (자신 제외) | 가능 (Owner 제외, 자신 제외) | 불가 | 불가 |
| 초대 삭제/재발송 | 가능 | 가능 | 불가 | 불가 |
| 조직 탈퇴 | 불가 | 가능 | 가능 | 가능 |

#### FR-004-09: Role Management License 검증

- Access Control Feature는 Custom Plan Feature Permission
- Cloud: License 활성 + Access Control feature + custom billing plan 필요
- Self-hosted: License 활성 + Access Control feature 필요

**Role Management가 필요한 경우:**
- owner 이외의 역할로 초대 시
- teamIds가 포함된 초대 시
- 멤버십 역할 변경 시
- 초대 역할 변경 시

#### FR-004-10: Billing 역할 제한

- billing 역할은 **Formbricks Cloud 전용**
- Self-hosted 환경에서 billing 역할 초대/변경 시 ValidationError

---

## 5. 비기능 요구사항

### NFR-001: 트랜잭션

멤버 삭제 시 TeamUser 삭제와 Membership 삭제를 데이터베이스 트랜잭션으로 원자적으로 처리한다.

### NFR-002: Audit Logging

모든 초대/멤버십 변경 작업에 감사 로그 래퍼가 적용된다:
- 초대 생성: 생성 이벤트 / 초대 대상
- 초대 삭제: 삭제 이벤트 / 초대 대상
- 초대 업데이트/재발송: 업데이트 이벤트 / 초대 대상
- 멤버십 삭제: 삭제 이벤트 / 멤버십 대상
- 멤버십 업데이트: 업데이트 이벤트 / 멤버십 대상
- 조직 탈퇴: 삭제 이벤트 / 멤버십 대상

### NFR-003: 입력 검증

모든 Server Action은 유효성 검사 스키마로 입력을 검증하며, 인증된 사용자만 접근 가능하다.

---

## 6. 정책/제약

| 항목 | 값 |
|------|----|
| 초대 만료 기간 | 7일 (604,800,000ms) |
| 초대 ID 형식 | UUID |
| Membership 기본 역할 | member |
| Membership 기본 accepted | false |
| ProjectTeam 기본 권한 | read |
| Organization 역할 수 | 4 (owner, manager, member, billing) |
| Team 역할 수 | 2 (admin, contributor) |
| Project 권한 수 | 3 (read, readWrite, manage) |
| billing 역할 사용 환경 | Cloud 전용 |
| Team 이름 고유성 | Organization 내 고유 |
| Owner/Manager로 역할 변경 시 | Team 멤버십 admin 자동 승격 |
| Manager 초대 제한 | member 역할로만 |
| Team Admin 초대 제한 | member 역할 + 자신의 팀만 |
| 초대 비활성화 | 환경변수 기반 설정 |

---

## 7. 수용 기준 (Acceptance Criteria)

### AC-003: 멤버 초대
- [ ] Owner/Manager가 이메일, 이름, 역할, teamIds를 지정하여 단일 멤버 초대 가능
- [ ] CSV 일괄 초대 기능은 존재하지 않음 (단일 초대만 지원)
- [ ] 동일 이메일/조직에 중복 초대 시 InvalidInputError
- [ ] 이미 조직 멤버인 사용자 초대 시 InvalidInputError
- [ ] 초대 만료 시간: 생성 시점 + 7일
- [ ] 초대 재발송 시 만료 시간 자동 갱신 (+ 7일)
- [ ] Manager는 member 역할로만 초대 가능
- [ ] Team Admin은 member 역할 + 자신이 admin인 팀에만 초대 가능
- [ ] Self-hosted 환경에서 billing 역할 초대 차단
- [ ] 초대 비활성화 설정 시 초대/재발송 차단
- [ ] 초대 생성 후 이메일 발송

### AC-004: RBAC
- [ ] Organization 역할 4종: owner, manager, member, billing
- [ ] Team 역할 2종: admin, contributor
- [ ] Project 권한 3종: read, readWrite, manage
- [ ] 권한 검증 미들웨어가 access 배열을 OR 조건으로 평가
- [ ] Organization owner/manager로 역할 변경 시 Team 멤버십이 admin으로 자동 승격
- [ ] 마지막 Owner는 삭제 불가
- [ ] Owner는 조직 탈퇴 불가
- [ ] Manager는 Owner를 삭제할 수 없음
- [ ] Multi-Org 비활성 시 조직 탈퇴 불가
- [ ] 역할 변경에 Role Management License(Access Control feature) 필요
- [ ] 멤버 삭제 시 해당 Organization의 TeamUser도 함께 삭제
