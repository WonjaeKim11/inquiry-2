# 감사 로그(Audit Log) -- 요구사항 명세서

> **문서번호**: FSD-005 | **FR 범위**: FR-007
> **라이선스**: Enterprise

---

## 1. 목적/배경

Formbricks 플랫폼의 감사 로그(Audit Log) 시스템에 대한 요구사항을 정의한다. 감사 로그는 보안 및 컴플라이언스 목적으로 시스템 내 주요 이벤트(인증, 데이터 변경, 관리 작업 등)를 구조화된 형식으로 기록한다. Enterprise License의 감사 로그 Feature Flag와 감사 로그 활성화 환경변수에 의해 활성화되며, 감사 로그 래퍼 패턴을 통해 Server Action에 비침투적으로 적용된다.

---

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- Audit Log Event Schema 정의
- 감사 로그 기록 서비스
- 감사 로그 래퍼 패턴
- Background 및 Blocking 모드 이벤트 기록
- 20+ 이벤트 Action 타입
- 20+ Target 타입
- IP 주소 기록 정책
- PII Redaction

### Out-of-scope
- 감사 로그 조회/검색 UI
- 감사 로그 저장소 (외부 로깅 시스템)
- 감사 로그 보존 정책 (Retention)

---

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| 보안 관리자 | 감사 로그를 검토하여 보안 이벤트를 모니터링 |
| 컴플라이언스 담당자 | 규정 준수를 위한 활동 추적 |
| 시스템 관리자 | 감사 로그 활성화/비활성화, IP 기록 설정 관리 |
| Enterprise 사용자 | 감사 대상이 되는 시스템 사용자 |

---

## 4. 기능 요구사항

### FR-007-01: Audit Log Event Schema

감사 로그 이벤트는 다음 필드로 구성된다:

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| actor.id | String | O | 행위자 ID (사용자 ID 또는 "unknown") |
| actor.type | "user" / "api" / "system" | O | 행위자 유형 |
| action | Audit Action (25종) | O | 수행된 작업 |
| target.id | String / undefined | O | 대상 리소스 ID |
| target.type | Audit Target (21종) | O | 대상 리소스 유형 |
| status | "success" / "failure" | O | 작업 결과 |
| timestamp | ISO 8601 datetime | O | 이벤트 발생 시각 |
| organizationId | String | O | 소속 Organization ID |
| ipAddress | String | X | 클라이언트 IP (설정에 따라 기록/미기록) |
| changes | Key-Value 구조 | X | 변경 내용 (diff) |
| eventId | String | X | 실패 이벤트의 고유 ID |
| apiUrl | String (URL) | X | API 요청 URL |

### FR-007-02: Actor 유형

| Actor | 설명 |
|-------|------|
| user | 인증된 사용자에 의한 작업 |
| api | API Key를 통한 작업 |
| system | 시스템 자동 작업 |

### FR-007-03: Audit Action (25종)

**카테고리별 분류:**

| 카테고리 | Action 목록 |
|----------|------------|
| CRUD 작업 | created, updated, deleted, merged, createdUpdated, createdFromCSV, bulkCreated |
| 인증 | signedIn, authenticationAttempted, authenticationSucceeded, passwordVerified, userSignedOut, passwordReset |
| 2FA | twoFactorVerified, twoFactorAttempted, twoFactorRequired |
| 이메일 | verificationEmailSent, emailVerified, emailVerificationAttempted |
| 토큰 | jwtTokenCreated |
| 구독 | subscriptionAccessed, subscriptionUpdated |
| Survey | copiedToOtherEnvironment |
| Response | addedToResponse, removedFromResponse |

### FR-007-04: Audit Target (21종)

**카테고리별 분류:**

| 카테고리 | Target 목록 |
|----------|------------|
| 인증/계정 | user, twoFactorAuth, apiKey |
| 조직/멤버 | organization, membership, invite, team, projectTeam |
| Survey | survey, segment, actionClass, response, tag, quota |
| 프로젝트 | project, language |
| 연동 | webhook, integration |
| 데이터 | contact, contactAttributeKey, file |

### FR-007-05: 감사 로그 기록 서비스

**핵심 특성:**
- 유효성 검사 스키마로 이벤트 유효성 검사 후 기록
- 구조화된 로거를 통해 출력
- **감사 로그 실패가 애플리케이션을 중단시키지 않음** (실패 시 에러 로깅만 수행)
- 실패 시에도 원래 작업은 정상 완료

### FR-007-06: 감사 로그 래퍼 패턴 (withAuditLogging)

**설계 특성:**
1. **비침투적 래핑**: Server Action을 감싸서 성공/실패를 감지하고 자동으로 감사 로그 기록
2. **Background 실행**: 비동기 즉시 실행 방식을 사용하여 메인 요청을 차단하지 않음
3. **감사 로그 활성화 검사**: 비활성화 시 래퍼가 동작하되 로그만 건너뜀
4. **에러 투명성**: 원래 에러를 그대로 재throw

**Target ID 해석 로직:**
- 각 Target 유형에 대해 감사 로그 컨텍스트에서 적절한 ID를 추출
- 지원 대상: segment, survey, organization, tag, webhook, user, project, language, invite, membership, actionClass, contact, apiKey, response, integration, quota
- 미매핑 대상은 "unknown"으로 기록

**Organization ID 해석 순서:**
1. 감사 로그 컨텍스트에 명시적으로 설정된 경우
2. 입력 파라미터에 포함된 경우
3. Environment ID로부터 역추적
4. "unknown"

### FR-007-07: 변경 기록 생성 및 로깅

**변경 기록 (changes) 생성 로직:**

| 시나리오 | 입력 | changes 내용 |
|----------|------|-------------|
| 생성 (created) | 새 객체만 | 새 객체 전체 (PII 제거됨) |
| 업데이트 (updated) | 이전 객체 + 새 객체 | diff 결과 (PII 제거됨) |
| 삭제 (deleted) | 이전 객체만 | 이전 객체 전체 (PII 제거됨) |
| 없음 | 둘 다 없음 | changes 필드 생략 |

### FR-007-08: 이벤트 기록 모드 (3가지)

| 모드 | 실행 방식 | 사용 케이스 |
|------|-----------|------------|
| 감사 로그 래퍼 | Background (비동기 즉시 실행) | Server Action 래핑 |
| Background 이벤트 큐 | Background (비동기 즉시 실행) | 독립적인 이벤트 기록 |
| Blocking 이벤트 큐 | Blocking (await) | API Route 등 Edge Runtime |

### FR-007-09: IP 주소 기록 정책

- IP 주소 기록 활성화 환경변수가 설정된 경우에만 실제 IP 기록
- 비활성 시 "unknown" 문자열로 대체
- 요청 헤더에서 클라이언트 IP 추출

### FR-007-10: License 활성화 조건

**이중 조건:**
1. 감사 로그 활성화 환경변수가 "1"로 설정
2. Enterprise License의 감사 로그 Feature Flag가 true

두 조건 모두 충족해야 감사 로그가 활성화된다. 다만, 감사 로그 래퍼에서는 환경변수만 체크하고 License는 이벤트 빌드/로깅 단계에서 체크하는 이중 검사 구조를 가진다.

### FR-007-11: 미확인 데이터 처리

"unknown" 상수가 다음 경우에 사용된다:
- Actor ID를 확인할 수 없을 때
- Organization ID를 확인할 수 없을 때
- Target ID를 확인할 수 없을 때
- IP 주소 기록이 비활성화되었을 때

### FR-007-12: PII Redaction

변경 데이터(changes)는 PII 제거 함수를 통해 개인식별정보(PII)가 자동으로 제거된 후 기록된다. 이는 감사 로그에 민감한 개인정보가 저장되는 것을 방지한다.

---

## 5. 비기능 요구사항

### NFR-001: 비차단 기록 (Non-blocking Logging)

Server Action에서의 감사 로그 기록은 비동기 즉시 실행 방식을 사용하여 메인 요청 스레드를 차단하지 않는다. 이를 통해 감사 로그 기록이 사용자 응답 시간에 영향을 미치지 않는다.

### NFR-002: 장애 격리 (Fault Isolation)

감사 로그 기록 실패가 애플리케이션의 정상 동작을 중단시키지 않는다. 모든 로그 기록은 에러 처리로 감싸져 있으며, 실패 시 에러 로그만 남긴다.

### NFR-003: 데이터 무결성

모든 감사 로그 이벤트는 기록 전 유효성 검사 스키마로 검증을 수행한다. 유효하지 않은 이벤트는 기록되지 않고 에러가 로깅된다.

### NFR-004: 보안

- IP 주소는 IP 기록 설정에 의해 선택적으로 기록 (GDPR 등 규정 준수)
- PII는 자동 제거 함수로 삭제
- 비밀번호, 토큰 등 민감 데이터는 changes에 포함되지 않음

---

## 6. 정책/제약

| 항목 | 값 |
|------|----|
| 감사 로그 활성화 조건 | 환경변수 "1" 설정 필요 |
| IP 주소 기록 조건 | 별도 환경변수 "1" 설정 필요 |
| 미확인 데이터 상수 | "unknown" |
| License Feature Flag | 감사 로그 플래그 (Enterprise) |
| Audit Action 수 | 25종 |
| Audit Target 수 | 21종 |
| Actor 유형 수 | 3종 (user, api, system) |
| Status 유형 수 | 2종 (success, failure) |
| Background 실행 방식 | 비동기 즉시 실행 (setImmediate) |
| 래퍼의 기본 행위자 유형 | user (고정) |
| eventId 포함 조건 | status가 failure인 경우 |
| 이벤트 검증 | 유효성 검사 스키마 기반 |
| 로그 출력 | 구조화된 감사 로거 |

### 감사 로그 래퍼 사용 현황 (확인된 사례)

| Server Action | 이벤트 종류 | 대상 |
|---------------|-------------|------|
| 사용자 생성 | created | user |
| 비밀번호 재설정 | updated | user |
| 초대 삭제 | deleted | invite |
| 초대 토큰 생성 | updated | invite |
| 멤버십 삭제 | deleted | membership |
| 초대 재발송 | updated | invite |
| 멤버 초대 | created | invite |
| 조직 탈퇴 | deleted | membership |
| 초대 수정 | updated | invite |
| 멤버십 수정 | updated | membership |

---

## 7. 수용 기준 (Acceptance Criteria)

### AC-007-01: 감사 로그 활성화
- [ ] 감사 로그 환경변수 + Enterprise License 감사 로그 Feature Flag 모두 true일 때만 감사 로그 기록
- [ ] 어느 하나라도 false이면 감사 로그 비활성화
- [ ] 감사 로그 래퍼는 환경변수가 false여도 원래 함수를 정상 실행

### AC-007-02: 이벤트 구조
- [ ] 모든 감사 이벤트가 이벤트 스키마 유효성 검사를 통과해야 기록됨
- [ ] actor, action, target, status, timestamp, organizationId 필수 필드 포함
- [ ] timestamp는 ISO 8601 형식
- [ ] 유효하지 않은 이벤트는 기록되지 않고 에러 로깅

### AC-007-03: 변경 기록
- [ ] 생성 시: 새 객체가 changes에 기록
- [ ] 업데이트 시: 이전 객체와 새 객체의 diff가 changes에 기록
- [ ] 삭제 시: 이전 객체가 changes에 기록
- [ ] 모든 changes는 PII redaction 적용

### AC-007-04: IP 주소
- [ ] IP 기록 활성화 시 실제 클라이언트 IP 기록
- [ ] 미설정 시 "unknown" 문자열로 대체

### AC-007-05: 비차단 동작
- [ ] Server Action의 감사 로그는 비동기 Background 실행
- [ ] 감사 로그 기록 실패가 원래 Server Action의 결과에 영향을 미치지 않음
- [ ] 감사 로그 기록 실패 시 에러 로깅

### AC-007-06: 에러 처리
- [ ] 감사 로그 기록 실패가 원래 비즈니스 로직의 성공/실패를 변경하지 않음
- [ ] 원래 작업이 실패한 경우 status="failure"로 기록 후 원래 에러를 재throw
- [ ] 실패 이벤트에는 eventId가 포함될 수 있음

### AC-007-07: Target 해석
- [ ] 21종의 Target Type에 대해 적절한 targetId가 감사 로그 컨텍스트에서 추출됨
- [ ] targetId가 없으면 "unknown"으로 기록
- [ ] organizationId가 없으면 environmentId에서 역추적 시도, 실패 시 "unknown"
