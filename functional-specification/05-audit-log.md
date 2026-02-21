# 기능 명세서: 감사 로그 (Audit Log)

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | 1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-005 (감사 로그 요구사항 명세서), FR-007 |
| 상태 | 초안 |

---

## 2. 개요

### 2.1 목적

Inquiry 플랫폼에서 보안 및 컴플라이언스 목적으로 시스템 내 주요 이벤트(인증, 데이터 변경, 관리 작업 등)를 구조화된 형식으로 기록하는 감사 로그(Audit Log) 시스템의 기능 명세를 정의한다.

### 2.2 범위

**In-scope:**
- Audit Log Event Schema 정의 및 유효성 검증
- 감사 로그 기록 서비스 (로깅, 에러 처리)
- 감사 로그 래퍼 패턴 (withAuditLogging)
- Background 및 Blocking 모드 이벤트 기록
- 25종 Audit Action, 21종 Audit Target, 3종 Actor 유형
- IP 주소 기록 정책
- PII Redaction (개인식별정보 자동 제거)
- 이중 활성화 조건 (환경변수 + Enterprise License Feature Flag)

**Out-of-scope:**
- 감사 로그 조회/검색 UI
- 감사 로그 외부 저장소 연동 (외부 로깅 시스템)
- 감사 로그 보존 정책 (Retention Policy)

### 2.3 대상 사용자

| 역할 | 설명 |
|------|------|
| 보안 관리자 | 감사 로그를 검토하여 보안 이벤트를 모니터링하는 담당자 |
| 컴플라이언스 담당자 | 규정 준수를 위한 활동 추적을 수행하는 담당자 |
| 시스템 관리자 | 감사 로그 활성화/비활성화, IP 기록 설정을 관리하는 관리자 |
| Enterprise 사용자 | 감사 대상이 되는 시스템 사용자 (인증, CRUD 등의 행위 주체) |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| Audit Log | 보안 및 컴플라이언스 목적으로 시스템 내 주요 이벤트를 구조화된 형식으로 기록한 로그 |
| Actor | 감사 이벤트의 행위 주체. user(인증된 사용자), api(API Key), system(시스템 자동) 3종 |
| Action | 감사 이벤트에서 수행된 작업의 유형. CRUD, 인증, 2FA, 이메일, 토큰, 구독, Survey, Response 카테고리의 25종 |
| Target | 감사 이벤트의 대상 리소스 유형. 인증/계정, 조직/멤버, Survey, 프로젝트, 연동, 데이터 카테고리의 21종 |
| PII Redaction | 개인식별정보(Personally Identifiable Information)를 감사 로그에 기록하기 전 자동으로 제거하는 처리 |
| withAuditLogging | Server Action을 감사 로그로 래핑하는 고차 함수 패턴 |
| Background 실행 | 비동기 즉시 실행(setImmediate) 방식으로 메인 요청 스레드를 차단하지 않는 실행 모드 |
| Blocking 실행 | await를 사용하여 감사 로그 기록 완료를 대기하는 실행 모드 |
| Feature Flag | Enterprise License에서 특정 기능의 활성화 여부를 제어하는 플래그 |
| 감사 로그 컨텍스트 | 감사 로그 래퍼가 Server Action에 전달하는 메타데이터 객체 (Target ID, Organization ID 등) |
| 구조화된 로거 | JSON 형식 등 구조화된 포맷으로 로그를 출력하는 로깅 시스템 (Pino 기반) |
| 유효성 검사 스키마 | 감사 로그 이벤트의 필수 필드와 타입을 검증하기 위한 Zod 기반 스키마 |

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
+---------------------+      +-------------------------+      +---------------------+
|   Server Action     |      |   withAuditLogging      |      |   Audit Log Service |
|   (비즈니스 로직)    | ---> |   (래퍼 패턴)            | ---> |   (이벤트 기록)      |
+---------------------+      +-------------------------+      +---------------------+
                                       |                              |
                                       v                              v
                              +------------------+          +-------------------+
                              |  활성화 조건 검사  |          | 유효성 검사 스키마  |
                              |  (환경변수 체크)   |          | (Zod Schema)      |
                              +------------------+          +-------------------+
                                                                      |
                                                                      v
                                                            +-------------------+
                                                            |  PII Redaction    |
                                                            +-------------------+
                                                                      |
                                                                      v
                                                            +-------------------+
                                                            |  구조화된 로거     |
                                                            |  (Pino 기반)      |
                                                            +-------------------+
```

### 3.2 주요 기능 목록 (Feature List)

| 기능 ID | 기능명 | 관련 요구사항 | 우선순위 |
|---------|--------|-------------|---------|
| FN-001 | Audit Log Event Schema 정의 | FR-007-01, FR-007-02, FR-007-03, FR-007-04 | 필수 |
| FN-002 | 감사 로그 기록 서비스 | FR-007-05 | 필수 |
| FN-003 | 감사 로그 래퍼 패턴 (withAuditLogging) | FR-007-06 | 필수 |
| FN-004 | 변경 기록 생성 | FR-007-07 | 필수 |
| FN-005 | 이벤트 기록 모드 (Background/Blocking) | FR-007-08 | 필수 |
| FN-006 | IP 주소 기록 정책 | FR-007-09 | 필수 |
| FN-007 | License 활성화 조건 (이중 검사) | FR-007-10 | 필수 |
| FN-008 | 미확인 데이터 처리 | FR-007-11 | 필수 |
| FN-009 | PII Redaction | FR-007-12 | 필수 |

### 3.3 기능 간 관계도

```
FN-007 (License 활성화 조건)
  |
  +---> FN-003 (래퍼 패턴) --- 환경변수 체크
  |         |
  |         +---> FN-002 (기록 서비스) --- License Feature Flag 체크
  |                   |
  |                   +---> FN-001 (Event Schema) --- 이벤트 구조 검증
  |                   |
  |                   +---> FN-004 (변경 기록 생성) --- diff/changes 생성
  |                   |         |
  |                   |         +---> FN-009 (PII Redaction) --- 개인정보 제거
  |                   |
  |                   +---> FN-006 (IP 주소 기록) --- IP 기록 여부 결정
  |                   |
  |                   +---> FN-008 (미확인 데이터) --- "unknown" 대체
  |
  +---> FN-005 (이벤트 기록 모드) --- Background/Blocking 선택
```

---

## 4. 상세 기능 명세

### 4.1 Audit Log Event Schema 정의

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-001 |
| 기능명 | Audit Log Event Schema 정의 |
| 관련 요구사항 ID | FR-007-01, FR-007-02, FR-007-03, FR-007-04 |
| 우선순위 | 필수 |
| 기능 설명 | 감사 로그 이벤트의 데이터 구조를 정의한다. Actor, Action, Target, Status 등 필수/선택 필드를 포함하며, Zod 스키마로 런타임 유효성 검증을 수행한다. |

#### 4.1.2 선행 조건 (Preconditions)

- 없음 (스키마 정의는 독립적)

#### 4.1.3 후행 조건 (Postconditions)

- 감사 로그 이벤트 생성 시 스키마에 따라 유효성이 검증된다.
- 유효하지 않은 이벤트는 기록되지 않고 에러가 로깅된다.

#### 4.1.4 기본 흐름 (Basic Flow)

1. 시스템이 감사 로그 이벤트 객체를 생성한다.
2. 이벤트 객체의 필수 필드(actor, action, target, status, timestamp, organizationId)가 채워진다.
3. 선택 필드(ipAddress, changes, eventId, apiUrl)는 해당하는 경우에만 채워진다.
4. 유효성 검사 스키마(Zod)를 통해 이벤트 객체를 검증한다.
5. 검증 통과 시 이벤트 객체가 기록 서비스로 전달된다.

#### 4.1.5 대안 흐름 (Alternative Flow)

- 없음

#### 4.1.6 예외 흐름 (Exception Flow)

1. 유효성 검사 실패 시:
   - 이벤트 객체가 기록되지 않는다.
   - 에러 내용이 로깅된다.
   - 원래 비즈니스 로직에는 영향을 미치지 않는다.

#### 4.1.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-001-01 | status가 "failure"인 경우 | eventId 필드가 포함될 수 있다 |
| BR-001-02 | Actor ID를 확인할 수 없는 경우 | actor.id에 "unknown" 문자열을 사용한다 |
| BR-001-03 | timestamp 생성 시 | ISO 8601 형식(예: "2026-02-21T10:30:00.000Z")으로 기록한다 |
| BR-001-04 | actor.type이 래퍼를 통해 기록되는 경우 | 항상 "user"로 고정된다 |

#### 4.1.8 데이터 요구사항

**입력 데이터 (이벤트 스키마 필드):**

| 필드 | 타입 | 필수 | 유효성 검증 규칙 |
|------|------|------|----------------|
| actor.id | String | O | 비어 있지 않은 문자열. 확인 불가 시 "unknown" |
| actor.type | Enum("user", "api", "system") | O | 3가지 값 중 하나 |
| action | Enum(25종) | O | 아래 Action 목록 참조 |
| target.id | String / undefined | O | Target 유형에 따라 해당 리소스 ID. 확인 불가 시 "unknown" |
| target.type | Enum(21종) | O | 아래 Target 목록 참조 |
| status | Enum("success", "failure") | O | 2가지 값 중 하나 |
| timestamp | String (ISO 8601) | O | ISO 8601 datetime 형식 |
| organizationId | String | O | 비어 있지 않은 문자열. 확인 불가 시 "unknown" |
| ipAddress | String | X | IP 기록 활성화 시 클라이언트 IP. 비활성 시 "unknown" |
| changes | Object (Key-Value) | X | 변경 내용 diff. PII Redaction 적용 후 기록 |
| eventId | String | X | status가 "failure"인 경우의 고유 ID |
| apiUrl | String (URL) | X | API 요청 URL |

**Action 목록 (25종):**

| 카테고리 | Action 값 |
|----------|----------|
| CRUD 작업 | `created`, `updated`, `deleted`, `merged`, `createdUpdated`, `createdFromCSV`, `bulkCreated` |
| 인증 | `signedIn`, `authenticationAttempted`, `authenticationSucceeded`, `passwordVerified`, `userSignedOut`, `passwordReset` |
| 2FA | `twoFactorVerified`, `twoFactorAttempted`, `twoFactorRequired` |
| 이메일 | `verificationEmailSent`, `emailVerified`, `emailVerificationAttempted` |
| 토큰 | `jwtTokenCreated` |
| 구독 | `subscriptionAccessed`, `subscriptionUpdated` |
| Survey | `copiedToOtherEnvironment` |
| Response | `addedToResponse`, `removedFromResponse` |

**Target 목록 (21종):**

| 카테고리 | Target 값 |
|----------|----------|
| 인증/계정 | `user`, `twoFactorAuth`, `apiKey` |
| 조직/멤버 | `organization`, `membership`, `invite`, `team`, `projectTeam` |
| Survey | `survey`, `segment`, `actionClass`, `response`, `tag`, `quota` |
| 프로젝트 | `project`, `language` |
| 연동 | `webhook`, `integration` |
| 데이터 | `contact`, `contactAttributeKey`, `file` |

**출력 데이터:**

- 검증 완료된 감사 로그 이벤트 객체 (기록 서비스로 전달)

#### 4.1.9 화면/UI 요구사항

- 해당 없음 (감사 로그 조회 UI는 Out-of-scope)

#### 4.1.10 비기능 요구사항

- 유효성 검사 스키마는 Zod 기반으로 구현하여 런타임 타입 안전성을 보장한다.

---

### 4.2 감사 로그 기록 서비스

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-002 |
| 기능명 | 감사 로그 기록 서비스 |
| 관련 요구사항 ID | FR-007-05 |
| 우선순위 | 필수 |
| 기능 설명 | 감사 로그 이벤트를 유효성 검사 스키마로 검증한 후 구조화된 로거(Pino)를 통해 출력하는 서비스. 감사 로그 기록 실패가 애플리케이션 동작을 중단시키지 않는다. |

#### 4.2.2 선행 조건 (Preconditions)

1. Enterprise License의 감사 로그 Feature Flag가 true이다.
2. 감사 로그 활성화 환경변수가 "1"로 설정되어 있다.
3. 감사 로그 이벤트 객체가 생성되어 전달된 상태이다.

#### 4.2.3 후행 조건 (Postconditions)

- 유효한 이벤트는 구조화된 로거를 통해 출력된다.
- 유효하지 않은 이벤트는 에러 로그가 출력된다.
- 어떤 경우에도 원래 비즈니스 로직의 결과는 변경되지 않는다.

#### 4.2.4 기본 흐름 (Basic Flow)

1. 기록 서비스가 감사 로그 이벤트 객체를 수신한다.
2. Enterprise License의 감사 로그 Feature Flag 활성화 여부를 확인한다.
3. Feature Flag가 true인 경우, 유효성 검사 스키마로 이벤트 객체를 검증한다.
4. 검증 통과 시, 구조화된 감사 로거(Pino)를 통해 이벤트를 출력한다.
5. 기록 완료 후 종료한다.

#### 4.2.5 대안 흐름 (Alternative Flow)

1. **Feature Flag 비활성 시:**
   - 이벤트 기록을 건너뛴다.
   - 원래 비즈니스 로직에 영향 없이 종료한다.

#### 4.2.6 예외 흐름 (Exception Flow)

1. **유효성 검사 실패 시:**
   - 이벤트를 기록하지 않는다.
   - 검증 실패 내용을 에러 로그로 출력한다.
   - 원래 비즈니스 로직에 영향을 미치지 않는다.

2. **로거 출력 실패 시:**
   - 에러를 catch하여 에러 로그만 남긴다.
   - 원래 비즈니스 로직에 영향을 미치지 않는다.

#### 4.2.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-002-01 | 감사 로그 기록 중 예외 발생 | 에러 로그만 출력하고 원래 작업은 정상 완료 |
| BR-002-02 | Enterprise License Feature Flag가 false | 이벤트 기록을 건너뜀 |
| BR-002-03 | 이벤트 유효성 검사 실패 | 이벤트 미기록, 에러 로그 출력 |

#### 4.2.8 데이터 요구사항

**입력 데이터:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| event | AuditLogEvent | O | FN-001에서 정의한 이벤트 스키마를 따르는 객체 |

**출력 데이터:**

| 출력 | 형식 | 설명 |
|------|------|------|
| 감사 로그 | 구조화된 JSON (Pino) | 감사 로거를 통해 출력되는 구조화된 로그 |

#### 4.2.9 화면/UI 요구사항

- 해당 없음

#### 4.2.10 비기능 요구사항

- **장애 격리**: 감사 로그 기록 실패가 애플리케이션 정상 동작을 중단시키지 않는다 (NFR-002).
- **데이터 무결성**: 모든 이벤트는 유효성 검사 스키마로 검증 후 기록된다 (NFR-003).

---

### 4.3 감사 로그 래퍼 패턴 (withAuditLogging)

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-003 |
| 기능명 | 감사 로그 래퍼 패턴 (withAuditLogging) |
| 관련 요구사항 ID | FR-007-06 |
| 우선순위 | 필수 |
| 기능 설명 | Server Action을 비침투적으로 감싸서 성공/실패를 감지하고 자동으로 감사 로그를 기록하는 고차 함수(Higher-Order Function) 패턴. Background 비동기 실행으로 메인 요청을 차단하지 않으며, 원래 에러를 투명하게 전달한다. |

#### 4.3.2 선행 조건 (Preconditions)

1. 래핑 대상 Server Action이 존재한다.
2. 감사 로그 컨텍스트(action, target.type 등)가 래퍼에 전달된다.

#### 4.3.3 후행 조건 (Postconditions)

- 원래 Server Action의 결과(성공/실패)가 변경 없이 호출자에게 반환된다.
- 감사 로그 활성화 상태인 경우, Background로 감사 로그가 기록된다.
- 감사 로그 비활성화 상태인 경우, 원래 Server Action만 실행된다.

#### 4.3.4 기본 흐름 (Basic Flow)

1. `withAuditLogging` 래퍼가 Server Action과 감사 로그 설정(action, target.type 등)을 인자로 받는다.
2. 래퍼가 감사 로그 활성화 환경변수를 확인한다.
3. 원래 Server Action을 실행한다.
4. Server Action이 성공적으로 완료된다.
5. 환경변수가 활성("1") 상태인 경우:
   a. Target ID를 감사 로그 컨텍스트에서 추출한다 (4.3.7 Target ID 해석 로직 참조).
   b. Organization ID를 해석한다 (4.3.7 Organization ID 해석 순서 참조).
   c. 변경 기록(changes)을 생성한다 (FN-004 참조).
   d. 감사 로그 이벤트 객체를 구성한다 (status="success").
   e. Background(비동기 즉시 실행)로 감사 로그 기록 서비스(FN-002)를 호출한다.
6. Server Action의 결과를 호출자에게 반환한다.

#### 4.3.5 대안 흐름 (Alternative Flow)

1. **환경변수 비활성 시:**
   - 래퍼가 원래 Server Action만 실행한다.
   - 감사 로그 기록을 건너뛴다.
   - Server Action의 결과를 그대로 반환한다.

#### 4.3.6 예외 흐름 (Exception Flow)

1. **Server Action 실패 시:**
   - 원래 에러를 캡처한다.
   - 환경변수가 활성 상태인 경우, status="failure"로 감사 로그를 Background 기록한다.
   - 실패 이벤트에는 eventId가 포함될 수 있다.
   - 원래 에러를 그대로 re-throw한다 (에러 투명성).

2. **감사 로그 기록 자체 실패 시:**
   - 에러 로그만 출력한다.
   - 원래 Server Action의 결과에는 영향을 미치지 않는다.

#### 4.3.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-003-01 | 래퍼를 통한 기록 시 | actor.type은 항상 "user"로 고정된다 |
| BR-003-02 | 환경변수가 "1"이 아닌 경우 | 래퍼는 동작하되 감사 로그 기록만 건너뛴다. 원래 함수는 정상 실행된다 |
| BR-003-03 | 원래 Server Action이 에러를 throw한 경우 | status="failure"로 기록 후 원래 에러를 재throw한다 |
| BR-003-04 | 감사 로그 기록이 실패한 경우 | 에러 로그만 출력하고 원래 결과를 변경하지 않는다 |

**Target ID 해석 로직:**

감사 로그 컨텍스트에서 target.type에 해당하는 ID를 추출한다.

| Target Type | 추출 소스 필드 |
|-------------|---------------|
| segment | context.segmentId |
| survey | context.surveyId |
| organization | context.organizationId |
| tag | context.tagId |
| webhook | context.webhookId |
| user | context.userId |
| project | context.projectId |
| language | context.languageId |
| invite | context.inviteId |
| membership | context.membershipId |
| actionClass | context.actionClassId |
| contact | context.contactId |
| apiKey | context.apiKeyId |
| response | context.responseId |
| integration | context.integrationId |
| quota | context.quotaId |
| (미매핑 대상) | "unknown" |

**Organization ID 해석 순서:**

| 우선순위 | 소스 | 설명 |
|---------|------|------|
| 1 | context.organizationId | 감사 로그 컨텍스트에 명시적으로 설정된 경우 |
| 2 | input.organizationId | 입력 파라미터에 포함된 경우 |
| 3 | Environment ID 역추적 | Environment ID로부터 소속 Organization을 DB 조회 |
| 4 | "unknown" | 위 모든 방법으로 확인 불가 시 |

#### 4.3.8 데이터 요구사항

**입력 데이터:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| serverAction | Function | O | 래핑 대상 Server Action 함수 |
| action | Enum(25종) | O | 수행 작업 유형 |
| target.type | Enum(21종) | O | 대상 리소스 유형 |
| context | Object | X | Target ID, Organization ID 등을 포함하는 메타데이터 |

**출력 데이터:**

- 원래 Server Action의 반환값 (변경 없이 그대로 전달)

#### 4.3.9 화면/UI 요구사항

- 해당 없음

#### 4.3.10 비기능 요구사항

- **비차단 기록**: Background(비동기 즉시 실행) 방식으로 메인 요청 스레드를 차단하지 않는다 (NFR-001).
- **에러 투명성**: 원래 Server Action의 에러를 변경하지 않고 그대로 전달한다.

---

### 4.4 변경 기록 생성

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-004 |
| 기능명 | 변경 기록 생성 |
| 관련 요구사항 ID | FR-007-07 |
| 우선순위 | 필수 |
| 기능 설명 | 감사 로그 이벤트의 changes 필드를 생성한다. 작업 유형(생성/수정/삭제)에 따라 새 객체, diff, 이전 객체를 기록하며, 모든 변경 데이터는 PII Redaction을 거친 후 기록된다. |

#### 4.4.2 선행 조건 (Preconditions)

1. 감사 로그 이벤트의 action 유형이 결정된 상태이다.
2. 해당되는 경우, 이전 객체(before) 또는 새 객체(after)가 제공된다.

#### 4.4.3 후행 조건 (Postconditions)

- changes 필드가 PII Redaction이 적용된 상태로 생성된다.
- 이전/새 객체가 모두 없는 경우 changes 필드는 생략된다.

#### 4.4.4 기본 흐름 (Basic Flow)

1. 작업 유형과 제공된 데이터(이전 객체, 새 객체)를 확인한다.
2. 작업 유형에 따라 changes 내용을 결정한다:
   - **생성(created)**: 새 객체 전체를 changes로 사용한다.
   - **업데이트(updated)**: 이전 객체와 새 객체의 diff를 계산하여 changes로 사용한다.
   - **삭제(deleted)**: 이전 객체 전체를 changes로 사용한다.
3. PII Redaction 함수를 적용하여 개인식별정보를 제거한다.
4. Redaction 완료된 changes를 감사 로그 이벤트에 포함한다.

#### 4.4.5 대안 흐름 (Alternative Flow)

1. **이전 객체와 새 객체가 모두 없는 경우:**
   - changes 필드를 생략한다.

#### 4.4.6 예외 흐름 (Exception Flow)

- 없음 (변경 기록 생성 실패는 감사 로그 기록 서비스의 에러 처리에 의해 포괄됨)

#### 4.4.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-004-01 | action이 created이고 새 객체만 존재 | 새 객체 전체를 changes에 기록 (PII 제거) |
| BR-004-02 | action이 updated이고 이전+새 객체 모두 존재 | 두 객체의 diff를 changes에 기록 (PII 제거) |
| BR-004-03 | action이 deleted이고 이전 객체만 존재 | 이전 객체 전체를 changes에 기록 (PII 제거) |
| BR-004-04 | 이전 객체와 새 객체 모두 없음 | changes 필드를 생략 |

#### 4.4.8 데이터 요구사항

**입력 데이터:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| action | Enum(25종) | O | 수행된 작업 유형 |
| previousObject | Object | X | 변경 전 객체 (업데이트, 삭제 시) |
| newObject | Object | X | 변경 후 객체 (생성, 업데이트 시) |

**출력 데이터:**

| 필드 | 타입 | 설명 |
|------|------|------|
| changes | Object (Key-Value) / undefined | PII가 제거된 변경 내용. 해당 사항 없으면 undefined |

#### 4.4.9 화면/UI 요구사항

- 해당 없음

#### 4.4.10 비기능 요구사항

- 모든 changes 데이터는 PII Redaction이 반드시 적용되어야 한다 (NFR-004).

---

### 4.5 이벤트 기록 모드 (Background/Blocking)

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-005 |
| 기능명 | 이벤트 기록 모드 |
| 관련 요구사항 ID | FR-007-08 |
| 우선순위 | 필수 |
| 기능 설명 | 감사 로그 이벤트를 기록하는 3가지 모드를 제공한다. 감사 로그 래퍼, Background 이벤트 큐, Blocking 이벤트 큐로 구분되며, 사용 컨텍스트에 따라 적절한 모드가 선택된다. |

#### 4.5.2 선행 조건 (Preconditions)

1. 감사 로그 활성화 조건(환경변수 + Feature Flag)이 충족된 상태이다.
2. 기록할 감사 로그 이벤트가 준비된 상태이다.

#### 4.5.3 후행 조건 (Postconditions)

- Background 모드: 감사 로그가 비동기로 기록되며, 호출자는 기록 완료를 대기하지 않는다.
- Blocking 모드: 감사 로그 기록이 완료될 때까지 호출자가 대기한다.

#### 4.5.4 기본 흐름 (Basic Flow)

**모드 1: 감사 로그 래퍼 (Background)**
1. Server Action이 withAuditLogging 래퍼를 통해 호출된다.
2. Server Action 실행 완료 후, 비동기 즉시 실행(setImmediate)으로 감사 로그를 기록한다.
3. 메인 요청은 감사 로그 기록 완료를 대기하지 않고 응답을 반환한다.

**모드 2: Background 이벤트 큐 (Background)**
1. 독립적인 이벤트 기록이 필요한 코드에서 Background 이벤트 큐를 호출한다.
2. 비동기 즉시 실행(setImmediate)으로 감사 로그를 기록한다.
3. 호출자는 기록 완료를 대기하지 않는다.

**모드 3: Blocking 이벤트 큐 (Blocking)**
1. API Route 등 Edge Runtime에서 Blocking 이벤트 큐를 호출한다.
2. await를 사용하여 감사 로그 기록 완료를 대기한다.
3. 기록 완료 후 다음 로직을 실행한다.

#### 4.5.5 대안 흐름 (Alternative Flow)

- 없음

#### 4.5.6 예외 흐름 (Exception Flow)

1. **Background 모드 기록 실패 시:**
   - 에러 로그만 출력한다.
   - 메인 요청에 영향을 미치지 않는다.

2. **Blocking 모드 기록 실패 시:**
   - 에러 로그를 출력한다.
   - 에러를 catch하여 원래 비즈니스 로직에 영향을 미치지 않도록 한다.

#### 4.5.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-005-01 | Server Action 래핑 | Background(비동기 즉시 실행) 모드를 사용한다 |
| BR-005-02 | 독립적인 이벤트 기록 | Background 이벤트 큐를 사용한다 |
| BR-005-03 | API Route 등 Edge Runtime | Blocking 이벤트 큐(await)를 사용한다 |
| BR-005-04 | Background 실행 방식 | setImmediate를 사용한다 |

#### 4.5.8 데이터 요구사항

**입력 데이터:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| event | AuditLogEvent | O | 기록할 감사 로그 이벤트 |
| mode | Enum("wrapper", "background", "blocking") | O (암묵적) | 호출 방식에 의해 결정됨 |

**출력 데이터:**

- Background 모드: 없음 (fire-and-forget)
- Blocking 모드: void (기록 완료 시 resolve)

#### 4.5.9 화면/UI 요구사항

- 해당 없음

#### 4.5.10 비기능 요구사항

- **비차단 기록**: Server Action에서의 감사 로그 기록은 비동기 즉시 실행 방식을 사용하여 사용자 응답 시간에 영향을 미치지 않는다 (NFR-001).

---

### 4.6 IP 주소 기록 정책

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-006 |
| 기능명 | IP 주소 기록 정책 |
| 관련 요구사항 ID | FR-007-09 |
| 우선순위 | 필수 |
| 기능 설명 | 감사 로그 이벤트에 클라이언트 IP 주소를 기록할지 여부를 IP 기록 활성화 환경변수에 따라 결정한다. GDPR 등 규정 준수를 위해 선택적으로 비활성화할 수 있다. |

#### 4.6.2 선행 조건 (Preconditions)

1. 감사 로그 이벤트 생성 중이다.
2. HTTP 요청 헤더에 접근 가능하다.

#### 4.6.3 후행 조건 (Postconditions)

- IP 기록 활성 시: 감사 로그 이벤트의 ipAddress 필드에 실제 클라이언트 IP가 기록된다.
- IP 기록 비활성 시: ipAddress 필드에 "unknown" 문자열이 기록된다.

#### 4.6.4 기본 흐름 (Basic Flow)

1. IP 기록 활성화 환경변수의 값을 확인한다.
2. 환경변수가 "1"로 설정된 경우:
   a. HTTP 요청 헤더에서 클라이언트 IP 주소를 추출한다.
   b. 추출된 IP 주소를 감사 로그 이벤트의 ipAddress 필드에 설정한다.

#### 4.6.5 대안 흐름 (Alternative Flow)

1. **환경변수가 "1"이 아니거나 미설정인 경우:**
   - ipAddress 필드에 "unknown" 문자열을 설정한다.

#### 4.6.6 예외 흐름 (Exception Flow)

1. **요청 헤더에서 IP 추출 실패 시:**
   - ipAddress 필드에 "unknown" 문자열을 설정한다.

#### 4.6.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-006-01 | IP 기록 환경변수가 "1" | 요청 헤더에서 클라이언트 IP를 추출하여 기록한다 |
| BR-006-02 | IP 기록 환경변수가 "1"이 아니거나 미설정 | "unknown" 문자열로 대체한다 |
| BR-006-03 | IP 추출 실패 | "unknown" 문자열로 대체한다 |

#### 4.6.8 데이터 요구사항

**입력 데이터:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| IP 기록 환경변수 | String | X | "1" 설정 시 IP 기록 활성화 |
| HTTP 요청 헤더 | Object | X | 클라이언트 IP 추출 소스 |

**출력 데이터:**

| 필드 | 타입 | 설명 |
|------|------|------|
| ipAddress | String | 실제 클라이언트 IP 또는 "unknown" |

#### 4.6.9 화면/UI 요구사항

- 해당 없음

#### 4.6.10 비기능 요구사항

- **보안**: IP 주소 기록은 GDPR 등 데이터 보호 규정 준수를 위해 선택적으로 비활성화할 수 있다 (NFR-004).

---

### 4.7 License 활성화 조건 (이중 검사)

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-007 |
| 기능명 | License 활성화 조건 (이중 검사) |
| 관련 요구사항 ID | FR-007-10 |
| 우선순위 | 필수 |
| 기능 설명 | 감사 로그 활성화 환경변수와 Enterprise License의 감사 로그 Feature Flag 두 조건을 모두 충족해야 감사 로그가 활성화되는 이중 검사 구조. 래퍼 레벨에서는 환경변수만 확인하고, 기록 서비스 레벨에서는 Feature Flag를 추가로 확인하는 계층적 검사를 수행한다. |

#### 4.7.2 선행 조건 (Preconditions)

1. Enterprise License가 시스템에 설정되어 있다.
2. 감사 로그 관련 환경변수가 구성되어 있다.

#### 4.7.3 후행 조건 (Postconditions)

- 두 조건 모두 충족: 감사 로그가 정상 기록된다.
- 어느 하나라도 미충족: 감사 로그 기록이 건너뛰어진다.
- 어떤 경우에도 원래 비즈니스 로직은 정상 실행된다.

#### 4.7.4 기본 흐름 (Basic Flow)

1. **래퍼 레벨 (1차 검사):**
   a. 감사 로그 활성화 환경변수가 "1"인지 확인한다.
   b. "1"이 아닌 경우, 감사 로그 기록을 건너뛴다.
   c. "1"인 경우, 감사 로그 이벤트 생성을 진행한다.

2. **기록 서비스 레벨 (2차 검사):**
   a. Enterprise License의 감사 로그 Feature Flag가 true인지 확인한다.
   b. true가 아닌 경우, 이벤트 기록을 건너뛴다.
   c. true인 경우, 이벤트를 유효성 검사 후 기록한다.

#### 4.7.5 대안 흐름 (Alternative Flow)

- 없음 (비활성화 케이스는 기본 흐름의 분기로 처리)

#### 4.7.6 예외 흐름 (Exception Flow)

1. **License 확인 실패 시:**
   - 감사 로그 기록을 건너뛴다.
   - 원래 비즈니스 로직에 영향을 미치지 않는다.

#### 4.7.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-007-01 | 환경변수 "1" + Feature Flag true | 감사 로그 활성화 (이벤트 기록) |
| BR-007-02 | 환경변수 "1"이 아님 | 래퍼 레벨에서 감사 로그 건너뜀 |
| BR-007-03 | Feature Flag false | 기록 서비스 레벨에서 이벤트 기록 건너뜀 |
| BR-007-04 | 어느 조건이든 미충족 시 | 원래 Server Action/비즈니스 로직은 정상 실행 |

#### 4.7.8 데이터 요구사항

**입력 데이터:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| 감사 로그 환경변수 | String | O | "1"로 설정 시 활성화 |
| Enterprise License Feature Flag (auditLogs) | Boolean | O | true 시 활성화 |

**출력 데이터:**

| 필드 | 타입 | 설명 |
|------|------|------|
| isEnabled | Boolean | 감사 로그 활성화 여부 (두 조건 모두 충족 시 true) |

#### 4.7.9 화면/UI 요구사항

- 해당 없음

#### 4.7.10 비기능 요구사항

- License 확인은 Memory Cache (1분 TTL) + Redis Cache (24시간 TTL)를 활용하여 성능 영향을 최소화한다.

---

### 4.8 미확인 데이터 처리

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-008 |
| 기능명 | 미확인 데이터 처리 |
| 관련 요구사항 ID | FR-007-11 |
| 우선순위 | 필수 |
| 기능 설명 | 감사 로그 이벤트의 필수 필드(Actor ID, Organization ID, Target ID, IP Address)를 확인할 수 없는 경우 "unknown" 상수 문자열로 대체하여 이벤트 기록의 연속성을 보장한다. |

#### 4.8.2 선행 조건 (Preconditions)

1. 감사 로그 이벤트 생성 과정에서 특정 필드의 값을 확인할 수 없는 상황이 발생한다.

#### 4.8.3 후행 조건 (Postconditions)

- 확인 불가 필드에 "unknown" 문자열이 설정되어 이벤트가 유효한 상태로 기록된다.

#### 4.8.4 기본 흐름 (Basic Flow)

1. 감사 로그 이벤트의 각 필드 값을 해석한다.
2. 해석에 실패한 필드에 "unknown" 상수를 대입한다.
3. 이벤트 기록을 계속 진행한다.

#### 4.8.5 대안 흐름 (Alternative Flow)

- 없음

#### 4.8.6 예외 흐름 (Exception Flow)

- 없음 (미확인 데이터 처리 자체가 예외 상황에 대한 폴백 메커니즘)

#### 4.8.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-008-01 | Actor ID를 확인할 수 없을 때 | actor.id = "unknown" |
| BR-008-02 | Organization ID를 확인할 수 없을 때 | organizationId = "unknown" |
| BR-008-03 | Target ID를 확인할 수 없을 때 | target.id = "unknown" |
| BR-008-04 | IP 주소 기록이 비활성화되었을 때 | ipAddress = "unknown" |
| BR-008-05 | 미매핑된 Target 유형의 ID 해석 시 | target.id = "unknown" |

#### 4.8.8 데이터 요구사항

**상수 정의:**

| 상수명 | 값 | 용도 |
|--------|-----|------|
| UNKNOWN | "unknown" | 확인 불가 필드의 기본값 |

#### 4.8.9 화면/UI 요구사항

- 해당 없음

#### 4.8.10 비기능 요구사항

- "unknown" 상수는 시스템 전체에서 단일 정의로 관리하여 일관성을 보장한다.

---

### 4.9 PII Redaction

#### 4.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-009 |
| 기능명 | PII Redaction |
| 관련 요구사항 ID | FR-007-12 |
| 우선순위 | 필수 |
| 기능 설명 | 감사 로그의 변경 데이터(changes)에서 개인식별정보(PII)를 자동으로 제거하는 기능. 비밀번호, 토큰 등 민감 데이터가 감사 로그에 저장되는 것을 방지한다. |

#### 4.9.2 선행 조건 (Preconditions)

1. 변경 기록(changes)이 생성된 상태이다.

#### 4.9.3 후행 조건 (Postconditions)

- changes 데이터에서 PII가 제거된 상태로 감사 로그에 기록된다.
- 비밀번호, 토큰 등 민감 데이터가 포함되지 않는다.

#### 4.9.4 기본 흐름 (Basic Flow)

1. 변경 기록 생성 함수가 changes 데이터를 PII Redaction 함수에 전달한다.
2. PII Redaction 함수가 데이터를 순회하며 PII에 해당하는 필드를 식별한다.
3. 식별된 PII 필드의 값을 제거하거나 마스킹한다.
4. Redaction이 완료된 데이터를 반환한다.

#### 4.9.5 대안 흐름 (Alternative Flow)

1. **changes가 없는 경우:**
   - PII Redaction을 수행하지 않는다.

#### 4.9.6 예외 흐름 (Exception Flow)

- 없음 (PII Redaction 실패는 감사 로그 기록 서비스의 에러 처리에 의해 포괄됨)

#### 4.9.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-009-01 | changes 데이터가 존재하는 경우 | PII Redaction 함수를 반드시 적용한다 |
| BR-009-02 | 비밀번호 필드 | 값을 제거한다 |
| BR-009-03 | 토큰 필드 | 값을 제거한다 |
| BR-009-04 | 기타 민감 개인정보 필드 | 값을 제거한다 |

#### 4.9.8 데이터 요구사항

**입력 데이터:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| data | Object | O | PII Redaction을 적용할 변경 데이터 |

**출력 데이터:**

| 필드 | 타입 | 설명 |
|------|------|------|
| redactedData | Object | PII가 제거된 변경 데이터 |

#### 4.9.9 화면/UI 요구사항

- 해당 없음

#### 4.9.10 비기능 요구사항

- **보안**: 비밀번호, 토큰 등 민감 데이터가 감사 로그에 절대 포함되지 않아야 한다 (NFR-004).
- **GDPR 준수**: PII Redaction은 개인정보 보호 규정을 준수하기 위한 필수 기능이다.

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

#### AuditLogEvent

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| actor | Actor | O | 행위 주체 |
| action | AuditAction | O | 수행된 작업 |
| target | Target | O | 대상 리소스 |
| status | AuditStatus | O | 작업 결과 |
| timestamp | String (ISO 8601) | O | 이벤트 발생 시각 |
| organizationId | String | O | 소속 Organization ID |
| ipAddress | String | X | 클라이언트 IP |
| changes | Object | X | 변경 내용 |
| eventId | String | X | 실패 이벤트 고유 ID |
| apiUrl | String | X | API 요청 URL |

#### Actor

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | String | O | 행위자 ID |
| type | "user" / "api" / "system" | O | 행위자 유형 |

#### Target

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | String / undefined | O | 대상 리소스 ID |
| type | AuditTarget (21종) | O | 대상 리소스 유형 |

### 5.2 엔티티 간 관계

```
AuditLogEvent
  |-- Actor (1:1, 내포)
  |-- Target (1:1, 내포)
  |-- Organization (N:1, organizationId로 참조)
  |-- Changes (1:0..1, 선택적 내포)
```

### 5.3 데이터 흐름

```
[Server Action 실행]
       |
       v
[withAuditLogging 래퍼]
       |
       +--- 성공/실패 감지
       |
       v
[이벤트 데이터 수집]
  |-- Actor ID: 세션에서 추출
  |-- Target ID: 컨텍스트에서 추출 (FN-003 Target ID 해석 로직)
  |-- Organization ID: 컨텍스트/입력/Environment 역추적 (FN-003 Org ID 해석 순서)
  |-- IP Address: 환경변수 확인 후 헤더에서 추출 (FN-006)
  |-- Changes: 이전/새 객체에서 생성 (FN-004)
       |
       v
[PII Redaction] (FN-009)
       |
       v
[유효성 검사 스키마 검증] (FN-001)
       |
       v
[구조화된 로거 출력] (FN-002)
```

---

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 연동 대상 | 연동 방식 | 설명 |
|----------|----------|------|
| Enterprise License 서버 | API 호출 (캐시 적용) | 감사 로그 Feature Flag 확인 |
| 구조화된 로거 (Pino) | 내부 라이브러리 호출 | 감사 로그 이벤트 출력 |

### 6.2 API 명세

해당 없음 (감사 로그 시스템은 내부 서비스로, 외부 API를 노출하지 않음. 감사 로그 조회 API는 Out-of-scope.)

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| 항목 | 요구사항 | 관련 NFR |
|------|---------|---------|
| 비차단 기록 | Server Action에서의 감사 로그 기록은 비동기 즉시 실행(setImmediate) 방식을 사용하여 메인 요청 스레드를 차단하지 않는다. 사용자 응답 시간에 영향을 미치지 않아야 한다. | NFR-001 |
| Background 실행 | 감사 로그 래퍼 및 Background 이벤트 큐는 fire-and-forget 패턴으로 동작한다. | NFR-001 |

### 7.2 보안 요구사항

| 항목 | 요구사항 | 관련 NFR |
|------|---------|---------|
| IP 주소 선택적 기록 | IP 주소는 환경변수에 의해 선택적으로 기록된다 (GDPR 등 규정 준수). | NFR-004 |
| PII 자동 제거 | 모든 changes 데이터는 PII Redaction 함수를 통해 개인식별정보가 제거된 후 기록된다. | NFR-004 |
| 민감 데이터 배제 | 비밀번호, 토큰 등 민감 데이터는 changes에 포함되지 않는다. | NFR-004 |

### 7.3 가용성 요구사항

| 항목 | 요구사항 | 관련 NFR |
|------|---------|---------|
| 장애 격리 | 감사 로그 기록 실패가 애플리케이션의 정상 동작을 중단시키지 않는다. 모든 로그 기록은 try-catch로 감싸져 있으며, 실패 시 에러 로그만 남긴다. | NFR-002 |
| 데이터 무결성 | 모든 감사 로그 이벤트는 기록 전 Zod 스키마로 유효성 검증을 수행한다. 유효하지 않은 이벤트는 기록되지 않고 에러가 로깅된다. | NFR-003 |

---

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| 항목 | 제약 |
|------|------|
| License 종속성 | Enterprise License가 필요하며, auditLogs Feature Flag가 true여야 한다 |
| 환경변수 종속성 | 감사 로그 활성화 환경변수가 "1"로 설정되어야 한다 |
| Background 실행 | setImmediate 기반으로, Node.js 런타임에서만 동작한다 |
| 유효성 검증 | Zod 스키마 기반으로, 런타임 검증에 Zod 라이브러리가 필요하다 |
| 로거 | Pino 기반 구조화된 로거가 설정되어 있어야 한다 |

### 8.2 비즈니스 제약사항

| 항목 | 제약 |
|------|------|
| 라이선스 | Enterprise License 전용 기능이다 |
| 래퍼 Actor 유형 | withAuditLogging 래퍼의 actor.type은 "user"로 고정된다 |
| 감사 로그 조회 | 감사 로그 조회/검색 UI는 본 명세 범위에 포함되지 않는다 |
| 보존 정책 | 감사 로그 보존 기간(Retention) 정책은 본 명세 범위에 포함되지 않는다 |

### 8.3 가정사항

| 항목 | 가정 |
|------|------|
| 세션 정보 | 인증된 사용자의 세션에서 Actor ID를 추출할 수 있다고 가정한다 |
| Environment-Organization 매핑 | Environment ID로부터 Organization ID를 역추적하는 DB 조회가 가능하다고 가정한다 |
| 로거 가용성 | Pino 기반 구조화된 로거가 항상 사용 가능하다고 가정한다 |
| PII 필드 정의 | PII Redaction 대상 필드 목록이 별도로 정의/관리된다고 가정한다 |

---

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 요구사항 설명 | 기능 ID | 기능명 | 수용 기준 |
|------------|-------------|---------|--------|----------|
| FR-007-01 | Audit Log Event Schema | FN-001 | Audit Log Event Schema 정의 | AC-007-02 |
| FR-007-02 | Actor 유형 | FN-001 | Audit Log Event Schema 정의 | AC-007-02 |
| FR-007-03 | Audit Action (25종) | FN-001 | Audit Log Event Schema 정의 | AC-007-02 |
| FR-007-04 | Audit Target (21종) | FN-001 | Audit Log Event Schema 정의 | AC-007-07 |
| FR-007-05 | 감사 로그 기록 서비스 | FN-002 | 감사 로그 기록 서비스 | AC-007-05, AC-007-06 |
| FR-007-06 | 감사 로그 래퍼 패턴 | FN-003 | 감사 로그 래퍼 패턴 (withAuditLogging) | AC-007-01, AC-007-05, AC-007-06, AC-007-07 |
| FR-007-07 | 변경 기록 생성 및 로깅 | FN-004 | 변경 기록 생성 | AC-007-03 |
| FR-007-08 | 이벤트 기록 모드 | FN-005 | 이벤트 기록 모드 (Background/Blocking) | AC-007-05 |
| FR-007-09 | IP 주소 기록 정책 | FN-006 | IP 주소 기록 정책 | AC-007-04 |
| FR-007-10 | License 활성화 조건 | FN-007 | License 활성화 조건 (이중 검사) | AC-007-01 |
| FR-007-11 | 미확인 데이터 처리 | FN-008 | 미확인 데이터 처리 | AC-007-07 |
| FR-007-12 | PII Redaction | FN-009 | PII Redaction | AC-007-03 |
| NFR-001 | 비차단 기록 | FN-005 | 이벤트 기록 모드 (Background/Blocking) | AC-007-05 |
| NFR-002 | 장애 격리 | FN-002 | 감사 로그 기록 서비스 | AC-007-06 |
| NFR-003 | 데이터 무결성 | FN-002 | 감사 로그 기록 서비스 | AC-007-02 |
| NFR-004 | 보안 | FN-006, FN-009 | IP 주소 기록 정책, PII Redaction | AC-007-03, AC-007-04 |

### 9.2 감사 로그 래퍼 사용 현황 (확인된 사례)

| Server Action | Action | Target | 설명 |
|---------------|--------|--------|------|
| 사용자 생성 | created | user | 새 사용자 계정 생성 |
| 비밀번호 재설정 | updated | user | 사용자 비밀번호 변경 |
| 초대 삭제 | deleted | invite | 멤버 초대 삭제 |
| 초대 토큰 생성 | updated | invite | 초대 토큰 갱신 |
| 멤버십 삭제 | deleted | membership | 멤버 제거 |
| 초대 재발송 | updated | invite | 초대 이메일 재발송 |
| 멤버 초대 | created | invite | 새 멤버 초대 생성 |
| 조직 탈퇴 | deleted | membership | 멤버 자발적 탈퇴 |
| 초대 수정 | updated | invite | 초대 역할/설정 변경 |
| 멤버십 수정 | updated | membership | 멤버 역할 변경 |

### 9.3 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-02-21 | 1.0 | 초기 작성 - FSD-005 요구사항 명세서 기반 | Claude |
