# 06. 프로젝트 & 환경 관리 기능 명세서

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | v1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-006 (FR-008 ~ FR-009), REQ-FB-2026-001 |
| 상태 | 초안 |

---

## 2. 개요

### 2.1 목적

본 문서는 Inquiry 시스템의 프로젝트(Project) 및 환경(Environment) 관리 기능에 대한 상세 기능 명세를 정의한다. Organization 하위에서 멀티 프로젝트를 운영하고, 각 프로젝트별로 development/production 환경을 분리하여 설문 데이터와 ActionClass를 격리하는 메커니즘을 구체적으로 기술한다.

### 2.2 범위

**포함 범위:**
- Project 데이터 모델 정의 및 CRUD 작업
- Environment 데이터 모델 정의 및 자동 생성/관리
- ActionClass 유형(code, noCode) 및 구성
- Project-level 설정(재접촉 일수, 위젯 배치, 오버레이, 스타일링 등)
- 환경별 데이터 격리 정책
- Language(다국어) 관리

**제외 범위:**
- Organization 관리 (별도 문서 FSD-003 참조)
- Billing/Subscription 관리 (별도 문서 FSD-029 참조)
- 사용자 인증/권한 관리 (별도 문서 FSD-001, FSD-004 참조)

### 2.3 대상 사용자

| 역할 | 설명 | 주요 활동 |
|------|------|-----------|
| Organization Owner/Admin | 조직 소유자 또는 관리자 | 프로젝트 생성, 삭제, 설정 변경 |
| Project Member | 프로젝트 구성원 | 프로젝트 내 설문 관리, 환경 전환 |
| SDK 통합 개발자 | 외부 개발자 | Environment ID를 통한 SDK 초기화, ActionClass 정의 |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| Project | Organization 하위에 속하는 제품 단위. 하나의 프로젝트는 복수의 환경을 포함한다. |
| Environment | Project 하위의 실행 환경. production과 development 2개가 자동 생성된다. |
| ActionClass | 사용자 행동을 정의하는 클래스. 설문 트리거의 기준이 된다. |
| code 타입 | SDK에서 명시적 이벤트 추적 호출로 트리거되는 ActionClass 유형 |
| noCode 타입 | 사용자 행동(클릭, 페이지뷰 등)을 자동 감지하여 트리거되는 ActionClass 유형 |
| CUID / CUID2 | Collision-resistant Unique Identifier. 충돌 방지 고유 식별자 생성 알고리즘 |
| 재접촉 일수 | 동일 사용자에게 설문을 다시 노출하기까지의 최소 대기 일수 |
| Cascade 삭제 | 상위 엔티티 삭제 시 하위 엔티티가 자동으로 함께 삭제되는 정책 |
| URL 필터 | noCode ActionClass에서 특정 URL 조건에 따라 트리거 여부를 결정하는 필터 |
| 위젯 배치 | In-app 설문 위젯이 화면에 표시되는 위치 |

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
Organization
└── Project (1:N)
    ├── Environment: production (1:1)
    │   ├── Survey[]
    │   ├── Contact[]
    │   ├── ActionClass[]
    │   ├── ContactAttributeKey[]
    │   ├── Webhook[]
    │   ├── Tag[]
    │   ├── Segment[]
    │   ├── Integration[]
    │   └── ApiKey[]
    ├── Environment: development (1:1)
    │   ├── Survey[]
    │   ├── Contact[]
    │   ├── ActionClass[]
    │   ├── ContactAttributeKey[]
    │   ├── Webhook[]
    │   ├── Tag[]
    │   ├── Segment[]
    │   ├── Integration[]
    │   └── ApiKey[]
    ├── Language[] (Project-level)
    ├── ProjectTeam[] (Project-level)
    └── Styling / Config / Settings (Project-level)
```

### 3.2 주요 기능 목록 (Feature List)

| 기능 ID | 기능명 | 관련 요구사항 | 우선순위 |
|---------|--------|--------------|----------|
| FN-006-01 | Project 생성 | FR-008, AC-008-01, AC-008-03 | 높음 |
| FN-006-02 | Project 조회 | FR-008 | 높음 |
| FN-006-03 | Project 수정 | FR-008, AC-008-02, AC-008-05, AC-008-06 | 높음 |
| FN-006-04 | Project 삭제 | FR-008, AC-008-04 | 높음 |
| FN-006-05 | Environment 자동 생성 | FR-009, AC-008-01, AC-009-01 | 높음 |
| FN-006-06 | Environment 조회 및 전환 | FR-009, AC-009-02 | 높음 |
| FN-006-07 | 환경별 데이터 격리 | FR-009, AC-009-02 | 높음 |
| FN-006-08 | ActionClass 생성 (code 타입) | FR-009, AC-009-03, AC-009-05 | 높음 |
| FN-006-09 | ActionClass 생성 (noCode 타입) | FR-009, AC-009-04, AC-009-05, AC-009-06 | 높음 |
| FN-006-10 | ActionClass 조회/수정/삭제 | FR-009 | 중간 |
| FN-006-11 | Language 관리 | FR-008 | 중간 |
| FN-006-12 | Project Styling 관리 | FR-008 | 중간 |

### 3.3 기능 간 관계도

```
[FN-006-01 Project 생성]
    ├──triggers──> [FN-006-05 Environment 자동 생성]
    └──validates──> 이름 고유성 검증 (Organization 범위)

[FN-006-05 Environment 자동 생성]
    └──enables──> [FN-006-07 환경별 데이터 격리]

[FN-006-04 Project 삭제]
    └──cascades──> Environment 삭제 → 하위 모든 데이터 삭제

[FN-006-08 ActionClass 생성 (code)]
    └──depends on──> [FN-006-06 Environment 조회]

[FN-006-09 ActionClass 생성 (noCode)]
    └──depends on──> [FN-006-06 Environment 조회]
```

---

## 4. 상세 기능 명세

### 4.1 Project 생성

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-006-01 |
| 기능명 | Project 생성 |
| 관련 요구사항 ID | FR-008, AC-008-01, AC-008-03 |
| 우선순위 | 높음 |
| 기능 설명 | Organization 하위에 새 프로젝트를 생성하고, 기본 설정을 초기화하며, production/development 환경을 자동 생성한다. |

#### 4.1.2 선행 조건 (Preconditions)

1. 사용자가 인증된 상태여야 한다.
2. 사용자가 대상 Organization에 대해 Owner 또는 Admin 권한을 보유해야 한다.
3. 대상 Organization이 존재해야 한다.

#### 4.1.3 후행 조건 (Postconditions)

1. 새 Project 레코드가 생성된다 (CUID2 형식의 ID 자동 발급).
2. production Environment가 자동 생성된다.
3. development Environment가 자동 생성된다.
4. 생성일시, 수정일시가 자동 기록된다.
5. 기본 설정값(재접촉 일수 7, 위젯 배치 bottomRight, 오버레이 none 등)이 적용된다.

#### 4.1.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | 프로젝트 생성 요청을 제출한다 (이름 필수, Organization ID 지정). |
| 2 | 시스템 | 입력값 유효성을 검증한다 (이름: trim 후 최소 1자). |
| 3 | 시스템 | 동일 Organization 내 같은 이름의 Project 존재 여부를 확인한다. |
| 4 | 시스템 | 중복이 없으면 Project 레코드를 생성한다 (CUID2 ID 자동 발급). |
| 5 | 시스템 | 기본 설정값을 적용한다 (재접촉 일수: 7, 위젯 배치: bottomRight, 오버레이: none, 외부 클릭 닫기: true, In-app 설문 브랜딩: true, Link 설문 브랜딩: true, 스타일 오버라이드 허용: true). |
| 6 | 시스템 | production Environment를 자동 생성한다 (CUID ID 발급, 앱 셋업 완료: false). |
| 7 | 시스템 | development Environment를 자동 생성한다 (CUID ID 발급, 앱 셋업 완료: false). |
| 8 | 시스템 | 생성된 Project 정보(환경 포함)를 반환한다. |

#### 4.1.5 대안 흐름 (Alternative Flow)

| ID | 분기 조건 | 동작 |
|----|----------|------|
| AF-01-01 | 사용자가 선택적 설정값(채널, 산업, 스타일링 등)을 함께 제출한 경우 | 기본값 대신 사용자가 제출한 값으로 Project를 생성한다. 기본 흐름 5단계에서 분기하여, 입력된 설정값을 검증 후 적용한다. |

#### 4.1.6 예외 흐름 (Exception Flow)

| ID | 예외 조건 | 시스템 동작 |
|----|----------|------------|
| EX-01-01 | 이름이 비어있거나 trim 후 0자인 경우 | 유효성 검증 에러를 반환한다. "프로젝트 이름은 최소 1자 이상이어야 합니다." |
| EX-01-02 | 동일 Organization 내 같은 이름의 Project가 이미 존재하는 경우 | 중복 에러를 반환한다. "동일 조직 내에 같은 이름의 프로젝트가 이미 존재합니다." |
| EX-01-03 | Organization ID가 유효하지 않거나 존재하지 않는 경우 | 참조 에러를 반환한다. |
| EX-01-04 | 사용자에게 프로젝트 생성 권한이 없는 경우 | 권한 에러를 반환한다. |

#### 4.1.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-01-01 | Project 이름은 trim 처리 후 최소 1자 이상이어야 한다. |
| BR-01-02 | (Organization ID, 이름) 조합은 고유해야 한다. |
| BR-01-03 | Project 생성 시 production, development 2개의 Environment가 반드시 자동 생성된다. |
| BR-01-04 | Project ID는 CUID2 형식으로 자동 생성된다. |
| BR-01-05 | Environment ID는 CUID 형식으로 자동 생성된다. |

#### 4.1.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 규칙 |
|--------|------|------|--------|-----------------|
| 이름 | string | Y | - | trim 후 최소 1자, Organization 내 고유 |
| Organization ID | string (CUID2) | Y | - | 존재하는 Organization 참조 |
| 재접촉 일수 | integer | N | 7 | 0 이상 365 이하 정수 |
| 위젯 배치 | enum | N | bottomRight | bottomLeft, bottomRight, topLeft, topRight, center 중 하나 |
| 외부 클릭 닫기 | boolean | N | true | - |
| 오버레이 | enum | N | none | none, light, dark 중 하나 |
| In-app 설문 브랜딩 | boolean | N | true | - |
| Link 설문 브랜딩 | boolean | N | true | - |
| 스타일링 | JSON | N | { allowStyleOverride: true } | 스타일링 스키마 준수 |
| 설정(config) | JSON | N | null | 채널: link/app/website/null, 산업: eCommerce/saas/other/null |
| 로고 | JSON | N | null | null 허용 |
| 커스텀 헤드 스크립트 | string | N | null | null 허용, Self-hosted 전용 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| Project 객체 | JSON | 생성된 Project의 전체 정보 (ID, 이름, 설정, 환경 목록 포함) |
| Environment 목록 | JSON[] | 자동 생성된 production/development Environment 정보 |

#### 4.1.9 화면/UI 요구사항

- 프로젝트 생성 폼에서 이름 입력 필드는 필수로 표시한다.
- 설정 항목(채널, 산업 등)은 선택적으로 입력할 수 있도록 한다.
- 생성 완료 후 새로 생성된 프로젝트의 대시보드로 이동한다.

#### 4.1.10 비기능 요구사항

- Project 생성과 Environment 2개 생성은 하나의 트랜잭션으로 처리하여 원자성을 보장한다.
- (Organization ID, 이름) 고유 제약조건은 데이터베이스 레벨에서 적용한다.

---

### 4.2 Project 조회

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-006-02 |
| 기능명 | Project 조회 |
| 관련 요구사항 ID | FR-008 |
| 우선순위 | 높음 |
| 기능 설명 | Project의 상세 정보(설정, 환경 목록, 스타일링 등)를 조회한다. |

#### 4.2.2 선행 조건 (Preconditions)

1. 사용자가 인증된 상태여야 한다.
2. 사용자가 해당 Project가 속한 Organization의 구성원이어야 한다.

#### 4.2.3 후행 조건 (Postconditions)

1. 요청된 Project의 정보가 반환된다.

#### 4.2.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | Project ID를 지정하여 조회를 요청한다. |
| 2 | 시스템 | 사용자의 접근 권한을 확인한다. |
| 3 | 시스템 | Project 정보를 조회하여 반환한다 (환경 목록, 설정, 스타일링, 언어 목록 포함). |

#### 4.2.5 대안 흐름 (Alternative Flow)

| ID | 분기 조건 | 동작 |
|----|----------|------|
| AF-02-01 | Organization ID 기반으로 해당 Organization의 전체 Project 목록 조회를 요청한 경우 | Organization에 속한 모든 Project의 목록을 반환한다. |

#### 4.2.6 예외 흐름 (Exception Flow)

| ID | 예외 조건 | 시스템 동작 |
|----|----------|------------|
| EX-02-01 | 존재하지 않는 Project ID인 경우 | 404 Not Found 에러를 반환한다. |
| EX-02-02 | 사용자에게 조회 권한이 없는 경우 | 403 Forbidden 에러를 반환한다. |

#### 4.2.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-02-01 | 사용자는 자신이 속한 Organization의 Project만 조회할 수 있다. |

#### 4.2.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| Project ID | string (CUID2) | Y | CUID2 형식 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| Project 객체 | JSON | Project의 전체 정보 (ID, 이름, 설정, 환경 목록, 스타일링, 언어 목록, 팀 목록 등) |

---

### 4.3 Project 수정

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-006-03 |
| 기능명 | Project 수정 |
| 관련 요구사항 ID | FR-008, AC-008-02, AC-008-05, AC-008-06 |
| 우선순위 | 높음 |
| 기능 설명 | Project의 설정값(이름, 재접촉 일수, 위젯 배치, 스타일링 등)을 수정한다. 모든 필드는 선택적(partial update)으로 변경 가능하다. |

#### 4.3.2 선행 조건 (Preconditions)

1. 사용자가 인증된 상태여야 한다.
2. 사용자가 해당 Project가 속한 Organization에 대해 Owner 또는 Admin 권한을 보유해야 한다.
3. 대상 Project가 존재해야 한다.

#### 4.3.3 후행 조건 (Postconditions)

1. 변경된 필드의 값이 갱신된다.
2. 수정일시(updatedAt)가 자동 갱신된다.

#### 4.3.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | Project ID와 수정할 필드를 포함한 수정 요청을 제출한다. |
| 2 | 시스템 | 입력값 유효성을 검증한다. |
| 3 | 시스템 | 이름 변경 시, 동일 Organization 내 이름 중복 여부를 확인한다. |
| 4 | 시스템 | 유효성 검증을 통과하면 해당 필드를 갱신한다. |
| 5 | 시스템 | 수정일시를 자동 갱신한다. |
| 6 | 시스템 | 갱신된 Project 정보를 반환한다. |

#### 4.3.5 대안 흐름 (Alternative Flow)

| ID | 분기 조건 | 동작 |
|----|----------|------|
| AF-03-01 | 이름 변경 없이 다른 설정만 수정하는 경우 | 이름 중복 검증 단계(3단계)를 건너뛴다. |

#### 4.3.6 예외 흐름 (Exception Flow)

| ID | 예외 조건 | 시스템 동작 |
|----|----------|------------|
| EX-03-01 | 재접촉 일수가 0 미만 또는 365 초과인 경우 | 유효성 검증 에러를 반환한다. "재접촉 일수는 0~365 범위의 정수여야 합니다." |
| EX-03-02 | config.channel이 허용값(link, app, website, null) 외의 값인 경우 | 유효성 검증 에러를 반환한다. |
| EX-03-03 | config.industry가 허용값(eCommerce, saas, other, null) 외의 값인 경우 | 유효성 검증 에러를 반환한다. |
| EX-03-04 | 변경된 이름이 동일 Organization 내 다른 Project와 중복되는 경우 | 중복 에러를 반환한다. |
| EX-03-05 | 이름이 trim 후 빈 문자열인 경우 | 유효성 검증 에러를 반환한다. |
| EX-03-06 | 위젯 배치 값이 허용된 5가지 값 외인 경우 | 유효성 검증 에러를 반환한다. |
| EX-03-07 | 오버레이 값이 허용된 3가지 값 외인 경우 | 유효성 검증 에러를 반환한다. |

#### 4.3.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-03-01 | 수정 요청 시 모든 필드는 선택적(optional)이다. 전달된 필드만 갱신한다. |
| BR-03-02 | 재접촉 일수는 0 이상 365 이하의 정수만 허용한다. |
| BR-03-03 | config.channel은 link, app, website, null 중 하나여야 한다. |
| BR-03-04 | config.industry는 eCommerce, saas, other, null 중 하나여야 한다. |
| BR-03-05 | 위젯 배치는 bottomLeft, bottomRight, topLeft, topRight, center 중 하나여야 한다. |
| BR-03-06 | 오버레이는 none, light, dark 중 하나여야 한다. |
| BR-03-07 | 커스텀 헤드 스크립트는 Self-hosted 환경에서만 유효하다. |

#### 4.3.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| Project ID | string (CUID2) | Y | 존재하는 Project 참조 |
| 이름 | string | N | trim 후 최소 1자, Organization 내 고유 |
| Organization ID | string | N | 존재하는 Organization 참조 |
| 재접촉 일수 | integer | N | 0 이상 365 이하 정수 |
| In-app 설문 브랜딩 | boolean | N | - |
| Link 설문 브랜딩 | boolean | N | - |
| 위젯 배치 | enum | N | bottomLeft/bottomRight/topLeft/topRight/center |
| 외부 클릭 닫기 | boolean | N | - |
| 오버레이 | enum | N | none/light/dark |
| 스타일링 | JSON | N | 스타일링 스키마 준수 |
| 설정(config) | JSON | N | channel/industry 허용값 준수 |
| 로고 | JSON | N | null 허용 |
| 팀 ID 목록 | string[] | N | 존재하는 Team 참조 |
| 커스텀 헤드 스크립트 | string | N | null 허용 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| Project 객체 | JSON | 수정된 Project의 전체 정보 |

---

### 4.4 Project 삭제

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-006-04 |
| 기능명 | Project 삭제 |
| 관련 요구사항 ID | FR-008, AC-008-04 |
| 우선순위 | 높음 |
| 기능 설명 | Project를 삭제하고, 하위 Environment 및 모든 관련 데이터를 Cascade 삭제한다. |

#### 4.4.2 선행 조건 (Preconditions)

1. 사용자가 인증된 상태여야 한다.
2. 사용자가 해당 Organization에 대해 Owner 권한을 보유해야 한다.
3. 대상 Project가 존재해야 한다.

#### 4.4.3 후행 조건 (Postconditions)

1. Project 레코드가 삭제된다.
2. 하위 production Environment가 삭제된다.
3. 하위 development Environment가 삭제된다.
4. 각 Environment 하위의 Survey, Contact, ActionClass, ContactAttributeKey, Webhook, Tag, Segment, Integration, ApiKey가 모두 삭제된다.
5. Project에 연결된 Language, ProjectTeam 데이터가 삭제된다.

#### 4.4.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | Project 삭제를 요청한다 (Project ID 지정). |
| 2 | 시스템 | 사용자의 삭제 권한을 확인한다. |
| 3 | 시스템 | 삭제 확인 메시지를 표시한다 (복구 불가 경고 포함). |
| 4 | 사용자 | 삭제를 확인한다. |
| 5 | 시스템 | Project와 하위 모든 데이터를 Cascade 삭제한다. |
| 6 | 시스템 | 삭제 완료 결과를 반환한다. |

#### 4.4.5 대안 흐름 (Alternative Flow)

| ID | 분기 조건 | 동작 |
|----|----------|------|
| AF-04-01 | 사용자가 삭제 확인 단계에서 취소를 선택한 경우 | 삭제를 중단하고 이전 화면으로 복귀한다. |

#### 4.4.6 예외 흐름 (Exception Flow)

| ID | 예외 조건 | 시스템 동작 |
|----|----------|------------|
| EX-04-01 | 존재하지 않는 Project ID인 경우 | 404 Not Found 에러를 반환한다. |
| EX-04-02 | 사용자에게 삭제 권한이 없는 경우 | 403 Forbidden 에러를 반환한다. |

#### 4.4.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-04-01 | Project 삭제 시 하위 모든 Environment와 Environment에 속한 모든 데이터가 Cascade 삭제된다. |
| BR-04-02 | 삭제된 데이터는 복구할 수 없다. |

#### 4.4.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| Project ID | string (CUID2) | Y | 존재하는 Project 참조 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| 삭제 결과 | boolean | 삭제 성공 여부 |

#### 4.4.9 비기능 요구사항

- Cascade 삭제는 데이터베이스 레벨의 외래키 ON DELETE CASCADE로 처리하여 데이터 일관성을 보장한다.

---

### 4.5 Environment 자동 생성

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-006-05 |
| 기능명 | Environment 자동 생성 |
| 관련 요구사항 ID | FR-009, AC-008-01, AC-009-01 |
| 우선순위 | 높음 |
| 기능 설명 | Project 생성 시 production과 development 2개의 Environment를 자동 생성한다. 사용자가 직접 Environment를 추가하거나 삭제하는 기능은 제공하지 않는다. |

#### 4.5.2 선행 조건 (Preconditions)

1. Project 생성 트랜잭션이 진행 중이어야 한다.

#### 4.5.3 후행 조건 (Postconditions)

1. production 유형의 Environment 1개가 생성된다.
2. development 유형의 Environment 1개가 생성된다.
3. 각 Environment의 앱 셋업 완료 여부는 false로 초기화된다.

#### 4.5.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | Project 생성 프로세스의 일부로 실행된다. |
| 2 | 시스템 | production 유형의 Environment를 생성한다 (CUID ID 발급, 앱 셋업 완료: false). |
| 3 | 시스템 | development 유형의 Environment를 생성한다 (CUID ID 발급, 앱 셋업 완료: false). |
| 4 | 시스템 | 생성된 Environment를 Project에 연결한다. |

#### 4.5.5 대안 흐름 (Alternative Flow)

해당 없음. Environment 자동 생성은 항상 고정된 흐름으로 실행된다.

#### 4.5.6 예외 흐름 (Exception Flow)

| ID | 예외 조건 | 시스템 동작 |
|----|----------|------------|
| EX-05-01 | Environment 생성 중 데이터베이스 오류가 발생한 경우 | Project 생성 트랜잭션 전체를 롤백한다. |

#### 4.5.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-05-01 | 모든 Project는 정확히 2개의 Environment(production, development)를 가진다. |
| BR-05-02 | Environment는 사용자가 수동으로 생성하거나 삭제할 수 없다. |
| BR-05-03 | Environment 유형은 production 또는 development만 허용된다. |
| BR-05-04 | Environment ID는 CUID 형식으로 자동 생성된다 (Project의 CUID2와 구분). |

#### 4.5.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| Project ID | string (CUID2) | Y | 방금 생성된 Project 참조 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| Environment[] | JSON[] | 생성된 2개의 Environment 정보 (ID, 유형, 앱 셋업 완료 여부) |

---

### 4.6 Environment 조회 및 전환

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-006-06 |
| 기능명 | Environment 조회 및 전환 |
| 관련 요구사항 ID | FR-009, AC-009-02 |
| 우선순위 | 높음 |
| 기능 설명 | Project 내 Environment 정보를 조회하고, production과 development 간 전환을 수행한다. |

#### 4.6.2 선행 조건 (Preconditions)

1. 사용자가 인증된 상태여야 한다.
2. 사용자가 해당 Project에 접근 권한을 보유해야 한다.
3. 대상 Project가 존재해야 한다.

#### 4.6.3 후행 조건 (Postconditions)

1. 선택된 Environment에 해당하는 데이터(Survey, Contact, ActionClass 등)가 로드된다.

#### 4.6.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | 현재 Project의 Environment 목록을 확인한다. |
| 2 | 시스템 | Project에 속한 Environment 목록(production, development)을 반환한다. |
| 3 | 사용자 | 원하는 Environment를 선택한다. |
| 4 | 시스템 | 선택된 Environment의 데이터(Survey, Contact, ActionClass 등)를 로드하여 표시한다. |

#### 4.6.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.6.6 예외 흐름 (Exception Flow)

| ID | 예외 조건 | 시스템 동작 |
|----|----------|------------|
| EX-06-01 | Environment ID가 유효하지 않은 경우 | 404 Not Found 에러를 반환한다. |

#### 4.6.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-06-01 | Environment 전환 시 이전 Environment의 데이터는 표시되지 않으며, 선택된 Environment의 데이터만 표시된다. |
| BR-06-02 | SDK 통합 개발자는 Environment ID를 통해 특정 환경에 연결한다. |

#### 4.6.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| Environment ID | string (CUID) | Y | CUID 형식, 존재하는 Environment 참조 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| Environment 객체 | JSON | Environment 상세 정보 (유형, 앱 셋업 완료 여부, 하위 데이터 목록) |

---

### 4.7 환경별 데이터 격리

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-006-07 |
| 기능명 | 환경별 데이터 격리 |
| 관련 요구사항 ID | FR-009, AC-009-02 |
| 우선순위 | 높음 |
| 기능 설명 | production과 development Environment 간 데이터를 완전히 격리하여, 한 환경의 데이터가 다른 환경에서 접근되지 않도록 보장한다. |

#### 4.7.2 선행 조건 (Preconditions)

1. Project에 production과 development Environment가 생성되어 있어야 한다.

#### 4.7.3 후행 조건 (Postconditions)

1. 각 Environment에 속한 데이터는 해당 Environment 내에서만 접근 가능하다.

#### 4.7.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | 모든 데이터 생성/조회/수정/삭제 작업 시 Environment ID를 기준으로 데이터를 필터링한다. |
| 2 | 시스템 | SDK 요청 시 제공된 Environment ID에 해당하는 데이터만 반환한다. |
| 3 | 시스템 | API 요청 시 API Key와 연결된 Environment의 데이터만 접근을 허용한다. |

#### 4.7.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.7.6 예외 흐름 (Exception Flow)

| ID | 예외 조건 | 시스템 동작 |
|----|----------|------------|
| EX-07-01 | 다른 Environment의 데이터에 접근을 시도하는 경우 | 접근을 차단하고 에러를 반환한다. |

#### 4.7.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-07-01 | 다음 데이터 종류는 Environment별로 완전히 격리된다: Survey, Contact, ActionClass, ContactAttributeKey, Webhook, Tag, Segment, Integration, ApiKey |
| BR-07-02 | 한 Environment의 데이터는 다른 Environment에서 조회, 수정, 삭제할 수 없다. |
| BR-07-03 | Project-level 데이터(이름, 설정, 스타일링, Language, ProjectTeam)는 환경 간 공유된다. |

#### 4.7.8 데이터 요구사항

**격리 대상 데이터 매트릭스:**

| 데이터 종류 | 격리 여부 | 격리 기준 키 |
|-------------|-----------|-------------|
| Survey | 격리됨 | Environment ID |
| Contact | 격리됨 | Environment ID |
| ActionClass | 격리됨 | Environment ID |
| ContactAttributeKey | 격리됨 | Environment ID |
| Webhook | 격리됨 | Environment ID |
| Tag | 격리됨 | Environment ID |
| Segment | 격리됨 | Environment ID |
| Integration | 격리됨 | Environment ID |
| ApiKey | 격리됨 | Environment ID |

---

### 4.8 ActionClass 생성 (code 타입)

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-006-08 |
| 기능명 | ActionClass 생성 (code 타입) |
| 관련 요구사항 ID | FR-009, AC-009-03, AC-009-05 |
| 우선순위 | 높음 |
| 기능 설명 | SDK에서 명시적 이벤트 추적 호출로 트리거되는 code 타입의 ActionClass를 생성한다. |

#### 4.8.2 선행 조건 (Preconditions)

1. 사용자가 인증된 상태여야 한다.
2. 대상 Environment가 존재해야 한다.
3. 사용자가 해당 Project에 대한 편집 권한을 보유해야 한다.

#### 4.8.3 후행 조건 (Postconditions)

1. code 타입의 ActionClass 레코드가 생성된다 (CUID2 형식의 ID 자동 발급).
2. 생성일시, 수정일시가 자동 기록된다.

#### 4.8.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | code 타입 ActionClass 생성을 요청한다 (이름, key, Environment ID 필수). |
| 2 | 시스템 | 입력값 유효성을 검증한다 (이름: trim 후 최소 1자, key 필수). |
| 3 | 시스템 | 동일 Environment 내에서 이름 중복 여부를 확인한다. |
| 4 | 시스템 | 동일 Environment 내에서 key 중복 여부를 확인한다. |
| 5 | 시스템 | 중복이 없으면 ActionClass 레코드를 생성한다 (type: code). |
| 6 | 시스템 | 생성된 ActionClass 정보를 반환한다. |

#### 4.8.5 대안 흐름 (Alternative Flow)

| ID | 분기 조건 | 동작 |
|----|----------|------|
| AF-08-01 | 선택적 필드(설명)를 함께 제출한 경우 | 설명 필드를 포함하여 ActionClass를 생성한다. |

#### 4.8.6 예외 흐름 (Exception Flow)

| ID | 예외 조건 | 시스템 동작 |
|----|----------|------------|
| EX-08-01 | 이름이 trim 후 빈 문자열인 경우 | 유효성 검증 에러를 반환한다. |
| EX-08-02 | key가 제공되지 않은 경우 | 유효성 검증 에러를 반환한다. "code 타입 ActionClass는 key가 필수입니다." |
| EX-08-03 | 동일 Environment 내에 같은 이름이 이미 존재하는 경우 | 중복 에러를 반환한다. |
| EX-08-04 | 동일 Environment 내에 같은 key가 이미 존재하는 경우 | 중복 에러를 반환한다. |
| EX-08-05 | Environment ID가 유효하지 않거나 존재하지 않는 경우 | 참조 에러를 반환한다. |

#### 4.8.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-08-01 | code 타입 ActionClass는 key 필드가 필수이다. |
| BR-08-02 | key는 환경 내에서 고유해야 한다 (고유 제약: key + Environment ID). |
| BR-08-03 | 이름은 환경 내에서 고유해야 한다 (고유 제약: 이름 + Environment ID). |
| BR-08-04 | ActionClass ID는 CUID2 형식으로 자동 생성된다. |

#### 4.8.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| 이름 | string | Y | trim 후 최소 1자, Environment 내 고유 |
| 유형 | enum | Y | "code" 고정 |
| key | string | Y | Environment 내 고유 |
| Environment ID | string (CUID) | Y | 최소 1자, 존재하는 Environment 참조 |
| 설명 | string | N | - |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| ActionClass 객체 | JSON | 생성된 ActionClass 전체 정보 (ID, 이름, 유형, key, Environment ID, 생성일시 등) |

---

### 4.9 ActionClass 생성 (noCode 타입)

#### 4.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-006-09 |
| 기능명 | ActionClass 생성 (noCode 타입) |
| 관련 요구사항 ID | FR-009, AC-009-04, AC-009-05, AC-009-06 |
| 우선순위 | 높음 |
| 기능 설명 | 사용자 행동(클릭, 페이지뷰, 이탈 의도, 50% 스크롤)을 자동 감지하여 트리거되는 noCode 타입의 ActionClass를 생성한다. |

#### 4.9.2 선행 조건 (Preconditions)

1. 사용자가 인증된 상태여야 한다.
2. 대상 Environment가 존재해야 한다.
3. 사용자가 해당 Project에 대한 편집 권한을 보유해야 한다.

#### 4.9.3 후행 조건 (Postconditions)

1. noCode 타입의 ActionClass 레코드가 생성된다 (CUID2 형식의 ID 자동 발급).
2. noCode 설정(하위 유형, URL 필터 등)이 저장된다.
3. 생성일시, 수정일시가 자동 기록된다.

#### 4.9.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | noCode 타입 ActionClass 생성을 요청한다 (이름, noCode 설정, Environment ID 필수). |
| 2 | 시스템 | 입력값 유효성을 검증한다 (이름: trim 후 최소 1자, noCode 설정 필수). |
| 3 | 시스템 | noCode 설정의 하위 유형(click, pageView, exitIntent, fiftyPercentScroll)을 검증한다. |
| 4 | 시스템 | click 유형인 경우, CSS 선택자 또는 내부 HTML 중 하나 이상이 제공되었는지 확인한다. |
| 5 | 시스템 | URL 필터가 제공된 경우, 각 필터의 규칙(rule)이 7가지 허용값 중 하나인지 확인한다. |
| 6 | 시스템 | URL 필터 값(value)이 trim 후 최소 1자인지 확인한다. |
| 7 | 시스템 | 동일 Environment 내에서 이름 중복 여부를 확인한다. |
| 8 | 시스템 | 중복이 없으면 ActionClass 레코드를 생성한다 (type: noCode). |
| 9 | 시스템 | 생성된 ActionClass 정보를 반환한다. |

#### 4.9.5 대안 흐름 (Alternative Flow)

| ID | 분기 조건 | 동작 |
|----|----------|------|
| AF-09-01 | pageView, exitIntent, fiftyPercentScroll 유형의 경우 | CSS 선택자/내부 HTML 검증 단계(4단계)를 건너뛰고, URL 필터 검증만 수행한다. |
| AF-09-02 | URL 필터가 제공되지 않은 경우 | URL 필터 검증 단계(5~6단계)를 건너뛴다. |
| AF-09-03 | urlFiltersConnector가 제공되지 않은 경우 | 기본값 "or"를 적용한다. |

#### 4.9.6 예외 흐름 (Exception Flow)

| ID | 예외 조건 | 시스템 동작 |
|----|----------|------------|
| EX-09-01 | noCode 설정이 제공되지 않은 경우 | 유효성 검증 에러를 반환한다. "noCode 타입 ActionClass는 noCode 설정이 필수입니다." |
| EX-09-02 | click 유형에서 CSS 선택자와 내부 HTML이 모두 없는 경우 | 유효성 검증 에러를 반환한다. "click 유형은 CSS 선택자 또는 내부 HTML 중 하나 이상이 필요합니다." |
| EX-09-03 | URL 필터 규칙이 허용된 7가지 값 외인 경우 | 유효성 검증 에러를 반환한다. |
| EX-09-04 | URL 필터 값이 trim 후 빈 문자열인 경우 | 유효성 검증 에러를 반환한다. |
| EX-09-05 | 동일 Environment 내에 같은 이름이 이미 존재하는 경우 | 중복 에러를 반환한다. |
| EX-09-06 | noCode 하위 유형이 허용값(click, pageView, exitIntent, fiftyPercentScroll) 외인 경우 | 유효성 검증 에러를 반환한다. |

#### 4.9.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-09-01 | noCode 타입 ActionClass는 noCode 설정이 필수이다. |
| BR-09-02 | noCode 하위 유형은 click, pageView, exitIntent, fiftyPercentScroll 중 하나여야 한다. |
| BR-09-03 | click 유형은 CSS 선택자 또는 내부 HTML 중 하나 이상이 반드시 제공되어야 한다. |
| BR-09-04 | URL 필터 규칙은 exactMatch, contains, startsWith, endsWith, notMatch, notContains, matchesRegex 중 하나여야 한다. |
| BR-09-05 | URL 필터 연결 방식(urlFiltersConnector)은 or 또는 and이며, 기본값은 or이다. |
| BR-09-06 | URL 필터 값(value)은 trim 후 최소 1자 이상이어야 한다. |
| BR-09-07 | 이름은 환경 내에서 고유해야 한다. |

#### 4.9.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| 이름 | string | Y | trim 후 최소 1자, Environment 내 고유 |
| 유형 | enum | Y | "noCode" 고정 |
| noCode 설정 | JSON | Y | 하위 유형, URL 필터 포함 |
| noCode.type | enum | Y | click/pageView/exitIntent/fiftyPercentScroll |
| noCode.urlFilters | JSON[] | N | 각 항목에 value(trim 후 최소 1자)와 rule(7가지 중 하나) 포함 |
| noCode.urlFiltersConnector | enum | N | or/and, 기본값: or |
| noCode.cssSelector | string | 조건부 | click 유형 시 cssSelector 또는 innerHtml 중 하나 필수 |
| noCode.innerHtml | string | 조건부 | click 유형 시 cssSelector 또는 innerHtml 중 하나 필수 |
| Environment ID | string (CUID) | Y | 최소 1자, 존재하는 Environment 참조 |
| 설명 | string | N | - |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| ActionClass 객체 | JSON | 생성된 ActionClass 전체 정보 (ID, 이름, 유형, noCode 설정, Environment ID 등) |

---

### 4.10 ActionClass 조회/수정/삭제

#### 4.10.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-006-10 |
| 기능명 | ActionClass 조회/수정/삭제 |
| 관련 요구사항 ID | FR-009 |
| 우선순위 | 중간 |
| 기능 설명 | 환경 내 ActionClass를 조회, 수정, 삭제한다. 조회 시 해당 Environment에 속한 ActionClass만 반환된다. |

#### 4.10.2 선행 조건 (Preconditions)

1. 사용자가 인증된 상태여야 한다.
2. 대상 Environment가 존재해야 한다.

#### 4.10.3 후행 조건 (Postconditions)

- 조회: ActionClass 목록 또는 상세 정보가 반환된다.
- 수정: 변경된 필드가 갱신되고 수정일시가 갱신된다.
- 삭제: ActionClass 레코드와 연결된 SurveyTrigger가 삭제된다.

#### 4.10.4 기본 흐름 (Basic Flow)

**조회:**

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | Environment ID를 지정하여 ActionClass 목록 조회를 요청한다. |
| 2 | 시스템 | 해당 Environment에 속한 ActionClass 목록을 생성일시 기준으로 정렬하여 반환한다. |

**수정:**

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | ActionClass ID와 수정할 필드를 포함한 수정 요청을 제출한다. |
| 2 | 시스템 | 입력값 유효성을 검증한다 (이름, key 고유성 등). |
| 3 | 시스템 | 유효성 검증을 통과하면 해당 필드를 갱신한다. |
| 4 | 시스템 | 수정일시를 자동 갱신한다. |

**삭제:**

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | ActionClass 삭제를 요청한다 (ActionClass ID 지정). |
| 2 | 시스템 | ActionClass 레코드와 연결된 SurveyTrigger를 삭제한다. |
| 3 | 시스템 | ActionClass 레코드를 삭제한다. |

#### 4.10.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.10.6 예외 흐름 (Exception Flow)

| ID | 예외 조건 | 시스템 동작 |
|----|----------|------------|
| EX-10-01 | 존재하지 않는 ActionClass ID인 경우 | 404 Not Found 에러를 반환한다. |
| EX-10-02 | 수정 시 이름이 환경 내에서 중복되는 경우 | 중복 에러를 반환한다. |
| EX-10-03 | 수정 시 key가 환경 내에서 중복되는 경우 (code 타입) | 중복 에러를 반환한다. |

#### 4.10.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-10-01 | ActionClass 조회 시 인덱스 (Environment ID, 생성일시)를 활용하여 정렬된 결과를 반환한다. |
| BR-10-02 | ActionClass 삭제 시 연결된 SurveyTrigger도 함께 삭제된다. |

#### 4.10.8 데이터 요구사항

**조회 입력:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| Environment ID | string (CUID) | Y | 존재하는 Environment 참조 |

**조회 출력:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| ActionClass[] | JSON[] | Environment에 속한 ActionClass 목록 (생성일시 기준 정렬) |

---

### 4.11 Language 관리

#### 4.11.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-006-11 |
| 기능명 | Language 관리 |
| 관련 요구사항 ID | FR-008 |
| 우선순위 | 중간 |
| 기능 설명 | Project 단위로 언어를 등록/수정/삭제하여 다국어 설문을 지원한다. Language는 Project-level 데이터로 모든 Environment에서 공유된다. |

#### 4.11.2 선행 조건 (Preconditions)

1. 사용자가 인증된 상태여야 한다.
2. 대상 Project가 존재해야 한다.

#### 4.11.3 후행 조건 (Postconditions)

- 등록: 새 Language 레코드가 생성된다.
- 수정: Language의 별칭이 갱신된다.
- 삭제: Language 레코드가 삭제된다.

#### 4.11.4 기본 흐름 (Basic Flow)

**등록:**

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | 언어 코드와 선택적 별칭을 포함한 등록 요청을 제출한다. |
| 2 | 시스템 | Language 레코드를 생성한다 (CUID2 ID 자동 발급). |
| 3 | 시스템 | 생성된 Language 정보를 반환한다. |

#### 4.11.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.11.6 예외 흐름 (Exception Flow)

| ID | 예외 조건 | 시스템 동작 |
|----|----------|------------|
| EX-11-01 | 동일 Project 내에 같은 언어 코드가 이미 존재하는 경우 | 중복 에러를 반환한다. |

#### 4.11.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-11-01 | Language는 Project-level 데이터로 Environment 간 공유된다. |
| BR-11-02 | Language ID는 CUID2 형식으로 자동 생성된다. |

#### 4.11.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| 언어 코드 | string | Y | 표준 언어 코드 형식 (예: en, ko, ja) |
| 별칭 | string | N | nullable |
| Project ID | string (CUID2) | Y | 존재하는 Project 참조 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| Language 객체 | JSON | 생성/수정된 Language 정보 (ID, 언어 코드, 별칭, Project ID 등) |

---

### 4.12 Project Styling 관리

#### 4.12.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-006-12 |
| 기능명 | Project Styling 관리 |
| 관련 요구사항 ID | FR-008 |
| 우선순위 | 중간 |
| 기능 설명 | Project-level 스타일링 설정을 관리한다. 스타일 오버라이드 허용 여부와 기본 스타일링 속성을 설정한다. |

#### 4.12.2 선행 조건 (Preconditions)

1. 사용자가 인증된 상태여야 한다.
2. 대상 Project가 존재해야 한다.

#### 4.12.3 후행 조건 (Postconditions)

1. Project의 스타일링 설정이 갱신된다.

#### 4.12.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | Project 스타일링 설정 수정을 요청한다. |
| 2 | 시스템 | 입력값 유효성을 검증한다. |
| 3 | 시스템 | 스타일링 설정을 갱신한다. |
| 4 | 시스템 | 갱신된 스타일링 정보를 반환한다. |

#### 4.12.5 대안 흐름 (Alternative Flow)

| ID | 분기 조건 | 동작 |
|----|----------|------|
| AF-12-01 | 스타일 오버라이드를 비허용(false)으로 설정하는 경우 | 이후 해당 Project의 개별 설문에서 프로젝트 스타일을 오버라이드할 수 없게 된다. |

#### 4.12.6 예외 흐름 (Exception Flow)

해당 없음.

#### 4.12.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-12-01 | 스타일 오버라이드 허용 여부의 기본값은 true이다. |
| BR-12-02 | 기본 스타일링 속성: brandColor, cardBackgroundColor, cardBorderColor, roundness, background, hideProgressBar, isLogoHidden |
| BR-12-03 | 스타일 오버라이드가 비허용인 경우, 개별 설문은 Project-level 스타일링을 그대로 사용해야 한다. |

#### 4.12.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| allowStyleOverride | boolean | N | 스타일 오버라이드 허용 여부 (기본값: true) |
| brandColor | string | N | 브랜드 색상 |
| cardBackgroundColor | string | N | 카드 배경 색상 |
| cardBorderColor | string | N | 카드 테두리 색상 |
| roundness | number | N | 둥글기 정도 |
| background | JSON | N | 배경 설정 |
| hideProgressBar | boolean | N | 진행률 바 숨김 여부 |
| isLogoHidden | boolean | N | 로고 숨김 여부 |

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

#### 5.1.1 Project

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| id | CUID2 | Y | 자동 생성 | 고유 식별자 |
| createdAt | DateTime | Y | 자동 생성 | 생성일시 |
| updatedAt | DateTime | Y | 자동 갱신 | 수정일시 |
| name | string | Y | - | 프로젝트 이름 |
| organizationId | CUID2 | Y | - | 소속 조직 ID (FK) |
| config | JSON | N | null | 설정 (channel, industry) |
| mode | enum | N | surveys | 프로젝트 모드 (surveys, cx) |
| recontactDays | integer | Y | 7 | 재접촉 일수 (0~365) |
| inAppSurveyBranding | boolean | Y | true | In-app 설문 브랜딩 표시 여부 |
| linkSurveyBranding | boolean | Y | true | Link 설문 브랜딩 표시 여부 |
| placement | enum | Y | bottomRight | 위젯 배치 위치 |
| clickOutsideClose | boolean | Y | true | 외부 클릭 닫기 여부 |
| darkOverlay | enum | Y | none | 오버레이 설정 |
| styling | JSON | Y | { allowStyleOverride: true } | 스타일링 설정 |
| logo | JSON | N | null | 프로젝트 로고 |
| customHeadScript | string | N | null | 커스텀 헤드 스크립트 (Self-hosted 전용) |

**고유 제약조건:** (organizationId, name) 복합 유니크

#### 5.1.2 Environment

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| id | CUID | Y | 자동 생성 | 고유 식별자 |
| createdAt | DateTime | Y | 자동 생성 | 생성일시 |
| updatedAt | DateTime | Y | 자동 갱신 | 수정일시 |
| type | enum | Y | - | 환경 유형 (production, development) |
| projectId | CUID2 | Y | - | 소속 프로젝트 ID (FK, Cascade 삭제) |
| appSetupCompleted | boolean | Y | false | 앱 셋업 완료 여부 |

**인덱스:** projectId

#### 5.1.3 ActionClass

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| id | CUID2 | Y | 자동 생성 | 고유 식별자 |
| createdAt | DateTime | Y | 자동 생성 | 생성일시 |
| updatedAt | DateTime | Y | 자동 갱신 | 수정일시 |
| name | string | Y | - | 액션 이름 |
| description | string | N | null | 액션 설명 |
| type | enum | Y | - | 유형 (code, noCode) |
| key | string | N | null | code 유형 시 트리거 키 |
| noCodeConfig | JSON | N | null | noCode 유형 시 설정 |
| environmentId | CUID | Y | - | 소속 환경 ID (FK, Cascade 삭제) |

**고유 제약조건:**
- (key, environmentId) 복합 유니크
- (name, environmentId) 복합 유니크

**인덱스:** (environmentId, createdAt)

#### 5.1.4 Language

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| id | CUID2 | Y | 자동 생성 | 고유 식별자 |
| createdAt | DateTime | Y | 자동 생성 | 생성일시 |
| updatedAt | DateTime | Y | 자동 갱신 | 수정일시 |
| code | string | Y | - | 언어 코드 (en, ko 등) |
| alias | string | N | null | 사용자 지정 별칭 |
| projectId | CUID2 | Y | - | 소속 프로젝트 ID (FK) |

### 5.2 엔티티 간 관계

```
Organization (1) ──── (N) Project
Project (1) ──── (2) Environment [production, development]
Project (1) ──── (N) Language
Project (1) ──── (N) ProjectTeam
Environment (1) ──── (N) ActionClass
Environment (1) ──── (N) Survey
Environment (1) ──── (N) Contact
Environment (1) ──── (N) ContactAttributeKey
Environment (1) ──── (N) Webhook
Environment (1) ──── (N) Tag
Environment (1) ──── (N) Segment
Environment (1) ──── (N) Integration
Environment (1) ──── (N) ApiKeyEnvironment
ActionClass (1) ──── (N) SurveyTrigger
```

### 5.3 데이터 흐름

```
[Project 생성 요청]
  │
  ├──> Project 레코드 생성
  │     ├──> Environment(production) 생성
  │     └──> Environment(development) 생성
  │
  └──> 기본 설정 적용

[Environment 내 데이터 CRUD]
  │
  ├──> Environment ID 기반 필터링
  │     └──> 격리된 데이터에만 접근 허용
  │
  └──> ActionClass 생성 시
        ├──> code 타입: key + environmentId 고유성 검증
        └──> noCode 타입: noCode 설정 + URL 필터 검증

[Project 삭제]
  │
  └──> Cascade 삭제
        ├──> Environment(production) 삭제 → 하위 모든 데이터 삭제
        └──> Environment(development) 삭제 → 하위 모든 데이터 삭제
```

---

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 연동 대상 | 연동 방식 | 설명 |
|-----------|----------|------|
| SDK (JavaScript/React) | Environment ID | SDK는 Environment ID를 통해 초기화되며, 해당 환경의 ActionClass와 Survey를 로드한다. |
| API Key | Environment-scoped | API Key는 특정 Environment에 귀속되어 해당 환경의 데이터만 접근 가능하다. |

### 6.2 API 명세

#### 6.2.1 Project API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | /api/projects | Project 생성 |
| GET | /api/projects/:projectId | Project 상세 조회 |
| GET | /api/organizations/:orgId/projects | Organization 내 Project 목록 조회 |
| PUT | /api/projects/:projectId | Project 수정 |
| DELETE | /api/projects/:projectId | Project 삭제 |

#### 6.2.2 Environment API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | /api/projects/:projectId/environments | Project 내 Environment 목록 조회 |
| GET | /api/environments/:environmentId | Environment 상세 조회 |

#### 6.2.3 ActionClass API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | /api/environments/:environmentId/action-classes | ActionClass 생성 |
| GET | /api/environments/:environmentId/action-classes | ActionClass 목록 조회 |
| GET | /api/action-classes/:actionClassId | ActionClass 상세 조회 |
| PUT | /api/action-classes/:actionClassId | ActionClass 수정 |
| DELETE | /api/action-classes/:actionClassId | ActionClass 삭제 |

#### 6.2.4 Language API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | /api/projects/:projectId/languages | Language 등록 |
| GET | /api/projects/:projectId/languages | Language 목록 조회 |
| PUT | /api/languages/:languageId | Language 수정 |
| DELETE | /api/languages/:languageId | Language 삭제 |

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| 항목 | 요구사항 |
|------|----------|
| 인덱싱 | Environment는 projectId 기반 인덱스 적용하여 조회 성능을 확보한다. |
| 인덱싱 | ActionClass는 (environmentId, createdAt) 복합 인덱스를 적용하여 환경별 시간순 조회를 최적화한다. |

### 7.2 보안 요구사항

| 항목 | 요구사항 |
|------|----------|
| 데이터 격리 | Environment 간 데이터 접근은 환경 ID 기반으로 엄격하게 격리되어야 한다. |
| 권한 검증 | Project CRUD 작업 시 사용자의 Organization 내 역할을 검증해야 한다. |
| API Key 범위 | API Key는 특정 Environment에 귀속되어 해당 환경의 데이터만 접근 가능하다. |

### 7.3 가용성 요구사항

| 항목 | 요구사항 |
|------|----------|
| 데이터 일관성 | Project 생성 시 2개의 Environment 자동 생성은 하나의 트랜잭션으로 처리되어 원자성을 보장한다. |
| Cascade 삭제 | Project 삭제 시 하위 모든 데이터가 빠짐없이 삭제되어 고아 데이터(orphaned data)가 발생하지 않아야 한다. |

---

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| 항목 | 내용 |
|------|------|
| ID 포맷 | Project, ActionClass, Language는 CUID2, Environment는 CUID 형식을 사용한다. |
| Cascade 삭제 | 데이터베이스 레벨의 외래키 ON DELETE CASCADE 정책으로 구현한다. |
| 커스텀 헤드 스크립트 | Self-hosted 환경에서만 사용 가능하며, SaaS(Cloud) 환경에서는 무시된다. |

### 8.2 비즈니스 제약사항

| 항목 | 내용 |
|------|------|
| Environment 수 | Project당 정확히 2개의 Environment(production, development)만 존재한다. 사용자가 추가/삭제할 수 없다. |
| 재접촉 일수 범위 | 0일(재접촉 제한 없음)부터 365일(최대 1년 차단)까지만 허용한다. |
| Project 이름 고유성 | Organization 범위에서만 고유성이 보장된다. 다른 Organization에서는 동일 이름 사용이 가능하다. |

### 8.3 가정사항

| 항목 | 내용 |
|------|------|
| Organization 존재 | Project 생성 시 참조하는 Organization이 이미 존재한다고 가정한다. |
| 인증/권한 시스템 | 별도의 인증/권한 시스템이 구현되어 있으며, 본 기능은 해당 시스템의 결과를 활용한다. |
| SDK 호환성 | SDK가 Environment ID를 통해 올바른 환경에 연결할 수 있는 인프라가 갖추어져 있다고 가정한다. |

---

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 요구사항 설명 | 기능 ID | 기능명 | 검증 방법 |
|------------|-------------|---------|--------|----------|
| FR-008 | Project 데이터 모델 및 관리 | FN-006-01 | Project 생성 | Project 생성 후 기본값 확인 |
| FR-008 | Project 데이터 모델 및 관리 | FN-006-02 | Project 조회 | 조회 결과에 전체 정보 포함 확인 |
| FR-008 | Project 데이터 모델 및 관리 | FN-006-03 | Project 수정 | 부분 수정 후 갱신 확인 |
| FR-008 | Project 데이터 모델 및 관리 | FN-006-04 | Project 삭제 | 삭제 후 Cascade 삭제 확인 |
| FR-008 | Project 데이터 모델 및 관리 | FN-006-11 | Language 관리 | 언어 등록/수정/삭제 확인 |
| FR-008 | Project 데이터 모델 및 관리 | FN-006-12 | Project Styling 관리 | 스타일링 설정 변경 확인 |
| FR-009 | Environment 모델 및 격리 | FN-006-05 | Environment 자동 생성 | Project 생성 시 2개 환경 생성 확인 |
| FR-009 | Environment 모델 및 격리 | FN-006-06 | Environment 조회 및 전환 | 환경 전환 시 데이터 분리 확인 |
| FR-009 | Environment 모델 및 격리 | FN-006-07 | 환경별 데이터 격리 | 타 환경 데이터 접근 불가 확인 |
| FR-009 | Environment 모델 및 격리 | FN-006-08 | ActionClass 생성 (code) | code 타입 생성 및 key 고유성 확인 |
| FR-009 | Environment 모델 및 격리 | FN-006-09 | ActionClass 생성 (noCode) | noCode 타입 생성 및 설정 검증 확인 |
| FR-009 | Environment 모델 및 격리 | FN-006-10 | ActionClass 조회/수정/삭제 | CRUD 동작 확인 |
| AC-008-01 | Project 생성 시 Environment 자동 생성 | FN-006-01, FN-006-05 | Project 생성, Environment 자동 생성 | 생성 후 production/development 존재 확인 |
| AC-008-02 | 재접촉 일수 범위 검증 | FN-006-03 | Project 수정 | 범위 외 값 입력 시 에러 반환 확인 |
| AC-008-03 | Organization 내 Project 이름 고유성 | FN-006-01 | Project 생성 | 동일 이름 생성 시 에러 반환 확인 |
| AC-008-04 | Project 삭제 시 Cascade 삭제 | FN-006-04 | Project 삭제 | 하위 데이터 전체 삭제 확인 |
| AC-008-05 | Project config.channel 허용값 | FN-006-03 | Project 수정 | 허용값 외 입력 시 에러 반환 확인 |
| AC-008-06 | Project config.industry 허용값 | FN-006-03 | Project 수정 | 허용값 외 입력 시 에러 반환 확인 |
| AC-009-01 | Environment 유형 제한 | FN-006-05 | Environment 자동 생성 | production/development만 생성됨 확인 |
| AC-009-02 | 환경 간 데이터 격리 | FN-006-07 | 환경별 데이터 격리 | 타 환경 데이터 접근 불가 확인 |
| AC-009-03 | code ActionClass key 고유성 | FN-006-08 | ActionClass 생성 (code) | 동일 key 생성 시 에러 반환 확인 |
| AC-009-04 | click 유형 필수 설정 | FN-006-09 | ActionClass 생성 (noCode) | cssSelector/innerHtml 미제공 시 에러 확인 |
| AC-009-05 | ActionClass 이름 고유성 | FN-006-08, FN-006-09 | ActionClass 생성 | 동일 이름 생성 시 에러 반환 확인 |
| AC-009-06 | URL 필터 규칙 허용값 | FN-006-09 | ActionClass 생성 (noCode) | 허용값 외 규칙 입력 시 에러 반환 확인 |

### 9.2 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| v1.0 | 2026-02-21 | 최초 작성 | - |
