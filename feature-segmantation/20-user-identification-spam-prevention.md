# 사용자 식별 및 스팸 방지 — 요구사항 명세서

> **문서번호**: FSD-020 | **FR 범위**: FR-031 ~ FR-032
> **라이선스**: Enterprise (사용자 식별, reCAPTCHA 스팸 방지 모두)

---

## 1. 목적/배경

Formbricks SDK는 웹 애플리케이션에 임베드되어 사용자의 행동 데이터를 수집하고, 적절한 설문을 표시한다. 사용자 식별(setUserId)을 통해 Contact를 생성/연결하고, 속성(setAttributes)을 설정하여 Segment 기반 타게팅의 기초 데이터를 제공한다. reCAPTCHA v3 스팸 방지는 봇에 의한 가짜 응답을 차단하며, 설문별로 활성화/비활성화 및 임계값을 설정할 수 있다. 두 기능 모두 Enterprise 라이선스가 필요하다.

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- SDK 공개 API: setup, setUserId, setAttributes, setAttribute, setEmail, setLanguage, logout, track, registerRouteChange, setNonce
- Debounce 기반 배치 업데이트 큐
- 사용자 상태 관리 (userId, contactId, segments, displays, responses, lastDisplayAt)
- reCAPTCHA v3 클라이언트 스크립트 로딩 및 토큰 획득
- reCAPTCHA 서버 검증 (Google API)
- 설문별 reCAPTCHA threshold 설정

### Out-of-scope
- Contact CRUD API (별도 모듈)
- Segment 서버 평가 로직
- SDK 빌드/번들링

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| Frontend Developer | SDK를 웹 앱에 통합하고 사용자 식별 코드를 구현 |
| Survey Creator | reCAPTCHA 스팸 방지 설정 및 threshold 조정 |
| End User | 식별되어 맞춤형 설문을 받거나, reCAPTCHA 검증을 통과하는 사용자 |
| Security Admin | reCAPTCHA 키 관리 및 스팸 방지 정책 설정 |

## 4. 기능 요구사항

### FR-031: 사용자 식별

#### FR-031-01: SDK 공개 API

SDK는 다음과 같은 공개 메서드를 제공한다:

**초기화:**
- setup: SDK 초기화 (환경 설정 입력)
- init: 레거시 호환용 (setup으로 자동 변환)

**사용자 식별:**
- setUserId: 사용자 ID 설정
- setEmail: 이메일 설정 (내부적으로 속성 설정으로 처리)
- setAttribute: 단일 속성 설정 (내부적으로 속성 설정으로 처리)
- setAttributes: 복수 속성 설정
- setLanguage: 언어 설정 (내부적으로 속성 설정으로 처리)
- logout: 사용자 상태 초기화

**이벤트:**
- track: Code Action 트리거
- registerRouteChange: 페이지 URL 변경 감지

**보안:**
- setNonce: CSP nonce 설정

**주요 메서드 상세:**

| 메서드 | 내부 동작 | 명령 유형 |
|--------|----------|-----------|
| setup | 환경 상태 fetch, 설문 필터링, 이벤트 리스너 등록 | 초기화 |
| setUserId | 업데이트 큐에 userId 추가, 업데이트 처리 호출 | 사용자 액션 |
| setAttributes | 업데이트 큐에 attributes 추가, 업데이트 처리 호출 | 사용자 액션 |
| setLanguage | 속성 설정({language}) 래핑 | 사용자 액션 |
| setEmail | 속성 설정({email}) 래핑 | 사용자 액션 |
| setAttribute | 속성 설정({key: value}) 래핑 | 사용자 액션 |
| logout | 사용자 상태 초기화, 설문 닫기 | 일반 액션 |
| track | Code Action 트리거 | 일반 액션 |
| registerRouteChange | 페이지 URL 변경 감지 | 일반 액션 |

#### FR-031-02: setUserId 구현

setUserId 처리 로직:
1. 현재 설정된 userId와 동일하면 → 아무 작업도 하지 않음 (no-op)
2. 이미 다른 userId가 설정되어 있으면 → 이전 사용자 상태 정리 (tearDown) 수행
3. 업데이트 큐에 userId 추가 후 업데이트 처리

**상태 정리(tearDown) 동작:**
- 사용자 상태를 기본값(미식별 상태)으로 리셋
- 설문 필터링 재실행
- DOM에서 표시 중인 설문 위젯 제거

#### FR-031-03: logout 구현

- 상태 정리(tearDown) 호출로 사용자 상태 완전 초기화
- 기존 표시 중인 설문 닫기
- 미식별 사용자 상태로 전환

#### FR-031-04: setAttributes 구현

속성 설정 처리:
1. Date 타입 값은 ISO 문자열로 변환
2. number 타입 값은 그대로 유지
3. 업데이트 큐에 속성 추가 후 업데이트 처리

**Attribute 타입 결정:**

| JavaScript 값 타입 | Attribute 타입 | 예시 |
|-------------------|---------------|------|
| string | string | 속성 설정({ name: "John" }) |
| number | number | 속성 설정({ age: 30 }) |
| Date | date (ISO string) | 속성 설정({ birthdate: new Date() }) |
| ISO 8601 string | date | 속성 설정({ signup: "2024-01-01T00:00:00Z" }) |

#### FR-031-05: 업데이트 큐 (Debounce 배치 업데이트)

업데이트 큐는 싱글톤 패턴으로 구현되며, debounce 방식으로 연속 호출을 배치 처리한다.

**핵심 동작:**
- **Debounce 500ms**: 연속 호출을 하나로 묶어 네트워크 요청 최소화
- **userId 필수**: 속성 설정은 userId가 설정되어야 서버에 전송 (language 제외)
- **language 예외**: userId 없이도 로컬 설정에 언어 설정 가능
- **병합**: 여러 속성 설정 호출이 하나의 객체로 병합

업데이트 처리 과정:
1. 업데이트가 없으면 반환
2. 기존 debounce 타이머가 있으면 취소
3. 500ms 후 실행:
   - language만 포함되고 userId가 없는 경우 → 로컬 설정에만 적용 (서버 전송 없음)
   - userId 없이 다른 속성 설정 시 → 에러 로그 출력
   - userId가 있으면 → 서버에 업데이트 전송
4. 업데이트 완료 후 큐 초기화

#### FR-031-06: 사용자 상태 구조

미식별 사용자의 기본 상태:
- 만료 시각: null
- userId: null (미식별)
- contactId: null
- segments: 빈 배열
- displays: 빈 배열 (설문 표시 기록, {surveyId, createdAt} 형태)
- responses: 빈 배열 (응답한 설문 ID 배열)
- lastDisplayAt: null (마지막 설문 표시 시각)

**상태 만료 관리:**
- 60초마다 상태 갱신
- 활동 시 만료 시각을 현재 시점 + 30분으로 연장

#### FR-031-07: SDK 초기화 흐름

SDK 초기화 과정:
1. 디버그 모드 확인 (URL에 formbricksDebug=true 파라미터 포함 여부)
2. 로컬 스토리지 마이그레이션 (레거시 형식 → 신규 형식)
3. 기존 설정 확인 및 만료 검사
4. 환경 상태 fetch (만료된 경우)
5. 사용자 상태 fetch (만료된 경우 + userId가 있을 때)
6. 설문 필터링 실행
7. 이벤트 리스너 등록
8. 페이지 URL 변경 체크 (다음 이벤트 루프에서 실행)

**에러 상태 관리:**
- 에러 발생 시 10분간 에러 상태 유지
- 에러 상태 동안 재초기화 차단
- 10분 경과 후 자동 복구 가능

#### FR-031-08: setNonce (CSP 지원)

Content Security Policy (CSP) 환경에서 inline style을 허용하기 위한 nonce 설정 기능이다.

- surveys 패키지 로드 전: 전역 변수에 nonce 저장
- surveys 패키지 로드 후: 즉시 적용

### FR-032: reCAPTCHA v3 스팸 방지

#### FR-032-01: reCAPTCHA 설정 구조

reCAPTCHA 설정 속성:
- enabled: 활성화/비활성화 (boolean)
- threshold: 0.1 ~ 0.9 (0.1 단위)
- null 허용 (미설정 시)

높을수록 엄격 (봇 차단율 증가, 정상 사용자 차단 위험 증가)

#### FR-032-02: reCAPTCHA 클라이언트 스크립트 로딩

스크립트 로딩 과정:
1. 이미 로드된 경우 → 즉시 완료
2. Site key가 없는 경우 → 에러 반환
3. Google reCAPTCHA v3 스크립트를 비동기로 동적 로딩
4. 로딩 완료 시 → 성공
5. 로딩 실패 시 → 에러 반환

#### FR-032-03: reCAPTCHA 토큰 실행

토큰 실행 과정:
1. Site key가 없으면 null 반환
2. 스크립트 로딩 확인
3. reCAPTCHA API가 준비되면 토큰 실행 (기본 action: "submit_response")
4. 토큰 반환 또는 실패 시 null 반환

**위젯에서의 reCAPTCHA 통합:**
- reCAPTCHA Site Key가 설정되고 설문에서 활성화된 경우에만 스팸 방지 활성
- 활성화 시 스크립트를 사전 로딩
- 위젯 렌더링 시 토큰 획득 콜백을 전달

#### FR-032-04: reCAPTCHA 서버 검증

서버 검증 과정:
1. reCAPTCHA 키가 미설정된 경우 → 검증 스킵 (통과 처리)
2. Google siteverify API 호출 (5초 타임아웃)
3. 응답의 success 필드 확인
4. score가 threshold 미만이면 실패
5. 모든 조건 통과 시 성공

#### FR-032-05: 응답 제출 시 reCAPTCHA 검증 흐름

응답 제출 시 reCAPTCHA 검증 과정:
1. 설문에 reCAPTCHA가 활성화되어 있는지 확인
2. 토큰 누락 시 → "Missing recaptcha token" 에러 반환
3. Enterprise 라이선스 확인
4. Google API로 토큰 + threshold 검증
5. 검증 실패 시 → "reCAPTCHA verification failed" 에러 반환
6. 모든 검증 통과 시 → 정상 처리

**reCAPTCHA 검증 흐름 요약:**

1. 클라이언트에서 Google reCAPTCHA API를 통해 토큰 획득
2. 응답 제출 시 토큰을 서버로 전송
3. 서버에서 Google siteverify API로 토큰 검증
4. Google이 반환한 score를 설문의 threshold와 비교
5. score가 threshold 이상이면 통과, 미만이면 거부

#### FR-032-06: 스팸 방지 활성화 조건

스팸 방지가 활성화되려면 다음 4가지 조건이 모두 충족되어야 한다:

1. reCAPTCHA Site Key 환경 변수 설정
2. reCAPTCHA Secret Key 환경 변수 설정
3. 설문의 reCAPTCHA 활성화 설정 (enabled = true)
4. Organization의 Enterprise 라이선스 활성

## 5. 비기능 요구사항

| ID | 항목 | 기준 |
|----|------|------|
| NFR-031-01 | 네트워크 요청 최소화 | 업데이트 큐 debounce 500ms로 배치 처리 |
| NFR-031-02 | 에러 상태 회복 | 에러 발생 시 10분간 재시도 차단, 이후 자동 복구 |
| NFR-031-03 | 사용자 상태 유효 기간 | 활동 시 30분 연장 (60초마다 갱신) |
| NFR-031-04 | 로컬 스토리지 | "formbricks-js" 키로 상태 영속화 |
| NFR-031-05 | 레거시 호환 | init() → setup() 자동 변환, apiHost → appUrl 마이그레이션 |
| NFR-032-01 | reCAPTCHA 타임아웃 | 서버 검증 시 5초 타임아웃 |
| NFR-032-02 | Graceful Degradation | reCAPTCHA 키 미설정 시 검증 스킵 (차단하지 않음) |
| NFR-032-03 | 스크립트 중복 로딩 방지 | 고유 ID로 동일 스크립트 재로딩 방지 |

## 6. 정책/제약

| 항목 | 값 |
|------|------|
| Debounce 지연 | 500ms |
| 에러 상태 지속 시간 | 10분 |
| 사용자 상태 만료 | 30분 (활동 시 연장) |
| 상태 갱신 주기 | 60초 |
| reCAPTCHA version | v3 |
| reCAPTCHA action | "submit_response" |
| threshold 범위 | 0.1 ~ 0.9 (step 0.1) |
| 서버 검증 타임아웃 | 5,000ms |
| 검증 API | Google reCAPTCHA siteverify API |
| 에러 코드 | "recaptcha_verification_failed" |
| 로컬 스토리지 키 | "formbricks-js" |
| userId 없이 설정 가능한 attribute | language만 |
| Attribute 값 타입 | string, number, Date |
| Date 변환 | ISO 문자열로 변환 |
| 미식별 사용자 기본 상태 | userId null, 빈 segments/displays/responses |
| 라이선스 요구사항 | Enterprise (두 기능 모두) |

## 7. 수용 기준 (Acceptance Criteria)

| AC-ID | 시나리오 | 기대 결과 |
|-------|----------|----------|
| AC-031-01 | SDK setup 호출 (appUrl, environmentId) | SDK 초기화, 환경 상태 fetch, 이벤트 리스너 등록 |
| AC-031-02 | setUserId("user123") 호출 | Contact 생성/연결, 사용자 상태 업데이트 |
| AC-031-03 | 동일 userId로 setUserId 재호출 | no-op (네트워크 요청 없음) |
| AC-031-04 | 다른 userId로 setUserId 호출 | 이전 사용자 상태 정리(tearDown), 새 사용자 상태 설정 |
| AC-031-05 | setAttributes({ name: "John", age: 30 }) 호출 | 서버에 name(string), age(number) 속성 전송 |
| AC-031-06 | userId 없이 setAttributes 호출 | 에러 로그 ("Can't set attributes without a userId!") |
| AC-031-07 | userId 없이 setLanguage("de") 호출 | 로컬 config에 language 설정 (서버 전송 없음) |
| AC-031-08 | setUserId → setAttributes 연속 호출 (100ms 내) | 하나의 네트워크 요청으로 배치 전송 (debounce 500ms) |
| AC-031-09 | logout() 호출 | 사용자 상태 초기화, 표시 중인 설문 닫기, 미식별 상태 전환 |
| AC-031-10 | SDK 에러 발생 | 10분간 에러 상태, 이후 재초기화 가능 |
| AC-031-11 | URL에 formbricksDebug=true 파라미터 | 디버그 로그 활성화, 에러 상태 무시 |
| AC-031-12 | setNonce("abc123") 호출 | CSP nonce가 inline style에 적용됨 |
| AC-032-01 | reCAPTCHA 활성 설문 응답 제출 | Google reCAPTCHA 토큰이 서버로 전송됨 |
| AC-032-02 | reCAPTCHA score >= threshold | 응답 정상 저장 |
| AC-032-03 | reCAPTCHA score < threshold | 400 Bad Request ("reCAPTCHA verification failed") |
| AC-032-04 | reCAPTCHA 토큰 누락 | 400 Bad Request ("Missing recaptcha token") |
| AC-032-05 | reCAPTCHA 키 미설정 | 검증 스킵 (응답 허용) |
| AC-032-06 | reCAPTCHA threshold 0.5 설정 | score 0.5 이상만 통과 |
| AC-032-07 | Google API 5초 타임아웃 | 검증 실패 처리 (응답 거부) |
| AC-032-08 | Enterprise 라이선스 없이 reCAPTCHA 활성화 | 서버에서 스팸 방지 미활성 로그, 하지만 검증은 수행 |
| AC-032-09 | reCAPTCHA 스크립트 중복 로딩 시도 | 기존 스크립트 재사용 (중복 로딩 방지) |
