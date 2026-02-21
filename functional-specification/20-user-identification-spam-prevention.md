# 기능 명세서 (Functional Specification)

## 사용자 식별 및 스팸 방지

---

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | v1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-020 사용자 식별 및 스팸 방지 요구사항 명세서 (FR-031 ~ FR-032) |
| 상태 | 초안 |

---

## 2. 개요

### 2.1 목적

본 문서는 Inquiry SDK의 사용자 식별(User Identification) 기능과 reCAPTCHA v3 기반 스팸 방지(Spam Prevention) 기능에 대한 상세 기능 명세를 정의한다. 요구사항 명세서 FSD-020(FR-031 ~ FR-032)을 기반으로, 각 기능의 동작 흐름, 데이터 요구사항, 비즈니스 규칙, 예외 처리를 개발 및 테스트 가능한 수준으로 기술한다.

### 2.2 범위

**포함 범위 (In-scope)**

- SDK 공개 API: setup, setUserId, setAttributes, setAttribute, setEmail, setLanguage, logout, track, registerRouteChange, setNonce
- Debounce 기반 배치 업데이트 큐 메커니즘
- 사용자 상태 관리 (userId, contactId, segments, displays, responses, lastDisplayAt)
- 상태 만료 및 갱신 로직
- 에러 상태 관리 및 자동 복구
- reCAPTCHA v3 클라이언트 스크립트 로딩 및 토큰 획득
- reCAPTCHA 서버 검증 (Google siteverify API)
- 설문별 reCAPTCHA threshold 설정 및 검증 흐름

**제외 범위 (Out-of-scope)**

- Contact CRUD API (별도 모듈에서 정의)
- Segment 서버 평가 로직 (별도 모듈에서 정의)
- SDK 빌드/번들링 설정
- Mobile SDK(React Native/iOS/Android)에서의 reCAPTCHA 동작

### 2.3 대상 사용자

| 역할 | 설명 |
|------|------|
| Frontend Developer | SDK를 웹 애플리케이션에 통합하고, 사용자 식별 코드(setUserId, setAttributes 등)를 구현하는 개발자 |
| Survey Creator | Inquiry 대시보드에서 reCAPTCHA 스팸 방지 설정을 활성화하고 threshold를 조정하는 설문 관리자 |
| End User | SDK가 임베드된 웹 애플리케이션을 사용하며, 식별되어 맞춤형 설문을 수신하거나 reCAPTCHA 검증을 통과하는 최종 사용자 |
| Security Admin | reCAPTCHA Site Key/Secret Key 환경 변수를 관리하고 스팸 방지 정책을 설정하는 보안 관리자 |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| SDK | Inquiry JavaScript SDK (@formbricks/js). 웹 애플리케이션에 임베드되어 사용자 행동 데이터를 수집하고 설문을 표시하는 클라이언트 라이브러리 |
| Contact | Inquiry 시스템 내에서 식별된 사용자 엔티티. userId를 통해 생성/연결됨 |
| Attribute | 사용자에게 부여되는 속성 (예: name, email, plan). Segment 기반 타게팅의 기초 데이터 |
| Segment | 속성 조건을 기반으로 정의된 사용자 그룹 |
| Debounce | 연속적인 함수 호출을 지정된 시간(500ms) 동안 지연시키고, 마지막 호출만 실행하는 기법 |
| tearDown | 사용자 상태를 기본값(미식별 상태)으로 초기화하고, 표시 중인 설문을 제거하는 정리 동작 |
| reCAPTCHA v3 | Google이 제공하는 봇 탐지 서비스. 사용자 상호작용 없이 점수(0.0~1.0) 기반으로 봇 여부를 판단 |
| threshold | reCAPTCHA score의 통과 기준값. score가 threshold 이상이면 정상 사용자로 판단 |
| CSP (Content Security Policy) | 웹 보안 정책. inline script/style 실행을 제한하며, nonce를 통해 특정 inline 요소를 허용 |
| nonce | CSP에서 inline style/script를 허용하기 위한 1회성 토큰 |
| ISO 8601 | 날짜/시간 표현 국제 표준 형식 (예: 2024-01-01T00:00:00Z) |

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
+---------------------------+       +-------------------------+       +--------------------+
|   웹 애플리케이션 (Host)    |       |    Inquiry Server    |       |   Google reCAPTCHA |
|                           |       |                         |       |      Service       |
|  +---------------------+  |       |  +-------------------+  |       |                    |
|  | Inquiry SDK      |  | HTTP  |  | Client API        |  |       |  siteverify API    |
|  |                     |--------->|  | - 사용자 식별      |  |       |                    |
|  | - setup()           |  |       |  | - 상태 fetch      |  | HTTP  |                    |
|  | - setUserId()       |  |       |  | - 업데이트 처리    |--------->|  토큰 검증 + score |
|  | - setAttributes()   |  |       |  +-------------------+  |       |  반환              |
|  | - logout()          |  |       |                         |       +--------------------+
|  | - track()           |  |       |  +-------------------+  |
|  +---------------------+  |       |  | Response API      |  |
|                           |       |  | - reCAPTCHA 검증   |  |
|  +---------------------+  |       |  | - 응답 저장        |  |
|  | reCAPTCHA Client     |  |       |  +-------------------+  |
|  | - 토큰 획득          |  |       |                         |
|  +---------------------+  |       |  +-------------------+  |
+---------------------------+       |  | 라이선스 관리      |  |
                                    |  | - Enterprise 확인  |  |
                                    |  +-------------------+  |
                                    +-------------------------+
```

### 3.2 주요 기능 목록 (Feature List)

| 기능 ID | 기능명 | 우선순위 | 관련 요구사항 |
|---------|--------|----------|-------------|
| FN-031-01 | SDK 공개 API | H | FR-031-01 |
| FN-031-02 | setUserId 처리 | H | FR-031-02 |
| FN-031-03 | logout 처리 | H | FR-031-03 |
| FN-031-04 | setAttributes 처리 | H | FR-031-04 |
| FN-031-05 | 업데이트 큐 (Debounce 배치) | H | FR-031-05 |
| FN-031-06 | 사용자 상태 관리 | H | FR-031-06 |
| FN-031-07 | SDK 초기화 흐름 | H | FR-031-07 |
| FN-031-08 | setNonce (CSP 지원) | M | FR-031-08 |
| FN-032-01 | reCAPTCHA 설정 관리 | M | FR-032-01 |
| FN-032-02 | reCAPTCHA 클라이언트 스크립트 로딩 | M | FR-032-02 |
| FN-032-03 | reCAPTCHA 토큰 실행 | M | FR-032-03 |
| FN-032-04 | reCAPTCHA 서버 검증 | M | FR-032-04 |
| FN-032-05 | 응답 제출 시 reCAPTCHA 검증 흐름 | M | FR-032-05 |
| FN-032-06 | 스팸 방지 활성화 조건 관리 | M | FR-032-06 |

### 3.3 기능 간 관계도

```
FN-031-07 SDK 초기화
    |
    +--> FN-031-06 사용자 상태 관리 (상태 로드/만료 관리)
    |
    +--> FN-031-01 SDK 공개 API
             |
             +--> FN-031-02 setUserId --> FN-031-05 업데이트 큐
             |                                  |
             +--> FN-031-04 setAttributes ----->+
             |                                  |
             +--> FN-031-03 logout              +--> 서버 업데이트 전송
             |
             +--> FN-031-08 setNonce

FN-032-06 활성화 조건 확인
    |
    +--> FN-032-01 reCAPTCHA 설정 관리
    |
    +--> FN-032-02 스크립트 로딩
             |
             +--> FN-032-03 토큰 실행
                      |
                      +--> FN-032-05 응답 제출 시 검증 흐름
                               |
                               +--> FN-032-04 서버 검증
```

---

## 4. 상세 기능 명세

### 4.1 SDK 공개 API

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-031-01 |
| 기능명 | SDK 공개 API |
| 관련 요구사항 ID | FR-031-01 |
| 우선순위 | H |
| 기능 설명 | Inquiry SDK가 호스트 애플리케이션에 제공하는 공개 메서드 인터페이스를 정의한다. 초기화, 사용자 식별, 이벤트 추적, 보안 관련 메서드를 포함한다. |

#### 4.1.2 선행 조건 (Preconditions)

- Inquiry SDK 스크립트가 웹 페이지에 로드되어 있어야 한다.
- `formbricks` 전역 객체가 접근 가능해야 한다.

#### 4.1.3 후행 조건 (Postconditions)

- 각 메서드 호출 결과에 따라 SDK 내부 상태가 갱신된다.
- 필요 시 서버와의 통신이 수행된다.

#### 4.1.4 기본 흐름 (Basic Flow)

SDK는 다음 공개 메서드를 카테고리별로 제공한다.

**1. 초기화 메서드**

| 단계 | 메서드 | 동작 |
|------|--------|------|
| 1 | `setup(config)` | SDK를 초기화한다. 환경 설정(appUrl, environmentId)을 입력받아 환경 상태를 fetch하고 이벤트 리스너를 등록한다. |
| 2 | `init(config)` | 레거시 호환용 메서드. 내부적으로 `setup(config)`을 호출한다. |

**2. 사용자 식별 메서드**

| 단계 | 메서드 | 동작 |
|------|--------|------|
| 1 | `setUserId(userId)` | 사용자 ID를 설정한다. 업데이트 큐에 userId를 추가하고 업데이트 처리를 호출한다. |
| 2 | `setAttributes(attrs)` | 복수 속성을 설정한다. 업데이트 큐에 속성 객체를 추가하고 업데이트 처리를 호출한다. |
| 3 | `setAttribute(key, value)` | 단일 속성을 설정한다. 내부적으로 `setAttributes({ [key]: value })`를 호출한다. |
| 4 | `setEmail(email)` | 이메일을 설정한다. 내부적으로 `setAttributes({ email })`를 호출한다. |
| 5 | `setLanguage(lang)` | 언어를 설정한다. 내부적으로 `setAttributes({ language: lang })`를 호출한다. |
| 6 | `logout()` | 사용자 상태를 완전 초기화(tearDown)하고 미식별 상태로 전환한다. |

**3. 이벤트 메서드**

| 단계 | 메서드 | 동작 |
|------|--------|------|
| 1 | `track(actionName)` | 지정한 Code Action을 트리거한다. |
| 2 | `registerRouteChange()` | 페이지 URL 변경을 감지하여 관련 처리를 수행한다. |

**4. 보안 메서드**

| 단계 | 메서드 | 동작 |
|------|--------|------|
| 1 | `setNonce(nonce)` | CSP 환경에서 inline style 허용을 위한 nonce 값을 설정한다. |

#### 4.1.5 대안 흐름 (Alternative Flow)

- AF-01: `init()` 호출 시, 내부적으로 `setup()`으로 자동 변환하여 실행한다. 별도의 에러나 경고 없이 동일하게 동작한다.
- AF-02: `setAttribute(key, value)` 호출 시, `setAttributes({ [key]: value })`로 래핑하여 단일 속성을 처리한다.
- AF-03: `setEmail(email)` 호출 시, `setAttributes({ email })`로 래핑하여 처리한다.

#### 4.1.6 예외 흐름 (Exception Flow)

- EF-01: SDK가 초기화되지 않은 상태에서 식별/이벤트 메서드를 호출하면, 해당 호출은 무시되거나 에러 로그를 출력한다.
- EF-02: SDK가 에러 상태(10분간 유지)인 경우, 모든 메서드 호출이 차단된다. 단, 디버그 모드에서는 에러 상태를 무시한다.

#### 4.1.7 비즈니스 규칙 (Business Rules)

- BR-01: 모든 사용자 식별 관련 기능은 Enterprise 라이선스가 필요하다.
- BR-02: `init()`은 `setup()`과 완전히 동일한 동작을 보장해야 한다(레거시 호환).
- BR-03: `setEmail`, `setAttribute`, `setLanguage`는 모두 `setAttributes`의 래핑 메서드이며, 동일한 업데이트 큐 메커니즘을 사용한다.

#### 4.1.8 데이터 요구사항

**입력 데이터**

| 메서드 | 파라미터 | 타입 | 필수 | 유효성 검증 |
|--------|---------|------|------|------------|
| setup | config.appUrl | string | Y | 유효한 URL 형식 |
| setup | config.environmentId | string | Y | 비어있지 않은 문자열 |
| setUserId | userId | string | Y | 비어있지 않은 문자열 |
| setAttributes | attrs | object | Y | key-value 쌍의 객체. value는 string, number, Date 타입 허용 |
| setAttribute | key | string | Y | 비어있지 않은 문자열 |
| setAttribute | value | string / number / Date | Y | - |
| setEmail | email | string | Y | 이메일 형식 문자열 |
| setLanguage | lang | string | Y | 언어 코드 문자열 |
| track | actionName | string | Y | 비어있지 않은 문자열 |
| setNonce | nonce | string | Y | 비어있지 않은 문자열 |

**출력 데이터**

- 각 메서드는 명시적 반환값이 없다(void). 내부 상태 변경 및 서버 통신을 통해 결과가 반영된다.

#### 4.1.9 화면/UI 요구사항

- 해당 없음. SDK API는 프로그래밍 인터페이스이며 UI 요소를 포함하지 않는다.

#### 4.1.10 비기능 요구사항

- NFR-031-05: `init()` -> `setup()` 자동 변환 및 `apiHost` -> `appUrl` 마이그레이션이 정상 동작해야 한다(레거시 호환).

---

### 4.2 setUserId 처리

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-031-02 |
| 기능명 | setUserId 처리 |
| 관련 요구사항 ID | FR-031-02 |
| 우선순위 | H |
| 기능 설명 | 사용자 ID를 설정하여 Contact를 생성/연결하고, 식별된 사용자 기반으로 세그먼트 타게팅을 수행할 수 있도록 한다. 동일 userId 재설정, 다른 userId로의 전환, 상태 정리(tearDown) 동작을 포함한다. |

#### 4.2.2 선행 조건 (Preconditions)

- SDK가 `setup()`을 통해 정상 초기화된 상태여야 한다.
- SDK가 에러 상태가 아니어야 한다(디버그 모드 예외).
- Enterprise 라이선스가 활성화되어 있어야 한다.

#### 4.2.3 후행 조건 (Postconditions)

- 사용자 상태의 userId 필드가 설정된 값으로 갱신된다.
- 서버에 userId가 전송되어 Contact가 생성/연결된다.
- 설문 필터링이 새로운 사용자 상태를 기반으로 재실행된다.

#### 4.2.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | Host App | `formbricks.setUserId("user123")`을 호출한다. |
| 2 | SDK | 현재 설정된 userId와 전달된 userId를 비교한다. |
| 3 | SDK | userId가 기존에 없는 경우(미식별 상태), 업데이트 큐에 userId를 추가한다. |
| 4 | SDK | 업데이트 처리(FN-031-05)를 호출한다. |
| 5 | 업데이트 큐 | Debounce(500ms) 후 서버에 userId를 전송한다. |
| 6 | Server | Contact를 생성하거나 기존 Contact와 연결한다. |
| 7 | Server | 업데이트된 사용자 상태(contactId, segments, displays, responses)를 반환한다. |
| 8 | SDK | 사용자 상태를 갱신하고 설문 필터링을 재실행한다. |

#### 4.2.5 대안 흐름 (Alternative Flow)

- AF-01 (동일 userId 재설정): 단계 2에서 현재 설정된 userId와 전달된 userId가 동일하면, 아무 작업도 수행하지 않는다(no-op). 네트워크 요청이 발생하지 않는다.
- AF-02 (다른 userId로 전환): 단계 2에서 이미 다른 userId가 설정되어 있으면, 다음을 수행한다.
  1. 상태 정리(tearDown)를 실행한다.
  2. 새로운 userId로 단계 3~8을 수행한다.

**상태 정리(tearDown) 상세 동작:**

| 단계 | 동작 |
|------|------|
| T-1 | 사용자 상태를 기본값(미식별 상태)으로 리셋한다. (userId: null, contactId: null, segments: [], displays: [], responses: [], lastDisplayAt: null) |
| T-2 | 설문 필터링을 재실행한다. |
| T-3 | DOM에서 현재 표시 중인 설문 위젯을 제거한다. |

#### 4.2.6 예외 흐름 (Exception Flow)

- EF-01: SDK가 초기화되지 않은 상태에서 호출 시, 에러 로그를 출력하고 동작을 중단한다.
- EF-02: 서버 통신 실패 시, 에러 상태로 전환하고 10분간 재시도를 차단한다.
- EF-03: userId가 빈 문자열이거나 null인 경우, 에러 로그를 출력하고 동작을 중단한다.

#### 4.2.7 비즈니스 규칙 (Business Rules)

- BR-01: 동일 userId로 `setUserId`를 재호출하면 네트워크 요청 없이 무시(no-op)해야 한다.
- BR-02: 다른 userId로 전환 시 반드시 이전 사용자의 상태 정리(tearDown)를 먼저 수행해야 한다.
- BR-03: tearDown 시 DOM에 표시 중인 설문 위젯을 즉시 제거해야 한다.

#### 4.2.8 데이터 요구사항

**입력 데이터**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| userId | string | Y | 비어있지 않은 문자열. null/undefined 불가. |

**출력 데이터**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| contactId | string | 서버에서 반환된 Contact ID |
| segments | string[] | 사용자가 속한 세그먼트 목록 |
| displays | object[] | 설문 표시 기록 ({surveyId, createdAt}) |
| responses | string[] | 응답한 설문 ID 배열 |

#### 4.2.9 화면/UI 요구사항

- 해당 없음. 프로그래밍 API이며 UI 요소 없음.

#### 4.2.10 비기능 요구사항

- NFR-031-01: 동일 userId 재호출 시 불필요한 네트워크 요청이 발생하지 않아야 한다.

---

### 4.3 logout 처리

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-031-03 |
| 기능명 | logout 처리 |
| 관련 요구사항 ID | FR-031-03 |
| 우선순위 | H |
| 기능 설명 | 현재 식별된 사용자의 상태를 완전히 초기화하고, 표시 중인 설문을 닫으며, 미식별 사용자 상태로 전환한다. |

#### 4.3.2 선행 조건 (Preconditions)

- SDK가 `setup()`을 통해 정상 초기화된 상태여야 한다.

#### 4.3.3 후행 조건 (Postconditions)

- 사용자 상태가 미식별 상태의 기본값으로 초기화된다.
- 표시 중이던 설문이 DOM에서 제거된다.
- 이후 setUserId 호출 전까지 미식별 사용자로 동작한다.

#### 4.3.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | Host App | `formbricks.logout()`을 호출한다. |
| 2 | SDK | 상태 정리(tearDown)를 호출한다. |
| 3 | SDK | 사용자 상태를 기본값으로 리셋한다. (userId: null, contactId: null, segments: [], displays: [], responses: [], lastDisplayAt: null) |
| 4 | SDK | 현재 표시 중인 설문을 닫는다 (DOM에서 위젯 제거). |
| 5 | SDK | 설문 필터링을 미식별 상태 기준으로 재실행한다. |

#### 4.3.5 대안 흐름 (Alternative Flow)

- AF-01: 이미 미식별 상태(userId가 null)에서 logout을 호출한 경우에도, tearDown을 동일하게 수행한다(멱등성 보장).

#### 4.3.6 예외 흐름 (Exception Flow)

- EF-01: SDK가 초기화되지 않은 상태에서 호출 시, 에러 로그를 출력하고 동작을 중단한다.

#### 4.3.7 비즈니스 규칙 (Business Rules)

- BR-01: logout 호출은 서버에 별도 요청을 보내지 않고, 클라이언트 측 상태만 초기화한다.
- BR-02: logout 후 표시 중이던 설문은 즉시 닫혀야 한다.
- BR-03: logout은 멱등성을 가져야 한다. 이미 미식별 상태에서 호출해도 에러가 발생하지 않는다.

#### 4.3.8 데이터 요구사항

**입력 데이터**

- 없음. logout은 파라미터를 받지 않는다.

**출력 데이터**

- 없음. 내부 상태 변경만 수행한다.

#### 4.3.9 화면/UI 요구사항

- 표시 중인 설문 위젯이 DOM에서 제거된다.

#### 4.3.10 비기능 요구사항

- 해당 없음.

---

### 4.4 setAttributes 처리

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-031-04 |
| 기능명 | setAttributes 처리 |
| 관련 요구사항 ID | FR-031-04 |
| 우선순위 | H |
| 기능 설명 | 사용자에게 복수의 속성(key-value)을 설정한다. 속성 값의 JavaScript 타입에 따라 Attribute 타입이 자동 결정되며, Date 타입은 ISO 8601 문자열로 변환된다. |

#### 4.4.2 선행 조건 (Preconditions)

- SDK가 `setup()`을 통해 정상 초기화된 상태여야 한다.
- language 속성을 제외한 모든 속성 설정은 userId가 사전에 설정되어 있어야 한다.

#### 4.4.3 후행 조건 (Postconditions)

- 업데이트 큐에 속성이 추가되고, Debounce 후 서버에 전송된다.
- 서버에서 Contact의 속성이 갱신된다.

#### 4.4.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | Host App | `formbricks.setAttributes({ name: "John", age: 30 })`을 호출한다. |
| 2 | SDK | 전달된 속성 객체의 각 값에 대해 타입 변환을 수행한다. |
| 3 | SDK | Date 타입 값을 ISO 8601 문자열로 변환한다. |
| 4 | SDK | number 타입 값은 변환 없이 그대로 유지한다. |
| 5 | SDK | string 타입 값은 변환 없이 그대로 유지한다. |
| 6 | SDK | 변환된 속성을 업데이트 큐에 추가한다. |
| 7 | SDK | 업데이트 처리(FN-031-05)를 호출한다. |

**Attribute 타입 결정 규칙:**

| JavaScript 값 타입 | 저장되는 Attribute 타입 | 변환 동작 | 예시 |
|-------------------|----------------------|----------|------|
| string | string | 변환 없음 | `{ name: "John" }` |
| number | number | 변환 없음 | `{ age: 30 }` |
| Date (객체) | date | ISO 8601 문자열로 변환 | `{ birthdate: new Date() }` -> `"2024-01-01T00:00:00.000Z"` |
| ISO 8601 형식의 string | date | 변환 없음 (서버에서 date로 인식) | `{ signup: "2024-01-01T00:00:00Z" }` |

#### 4.4.5 대안 흐름 (Alternative Flow)

- AF-01 (`setLanguage` 호출): `setAttributes({ language: "de" })`로 래핑 처리된다. userId가 없어도 로컬 config에 language를 설정한다 (서버 전송 없음).
- AF-02 (`setEmail` 호출): `setAttributes({ email: "user@example.com" })`로 래핑 처리된다.
- AF-03 (`setAttribute(key, value)` 호출): `setAttributes({ [key]: value })`로 래핑 처리된다.

#### 4.4.6 예외 흐름 (Exception Flow)

- EF-01: userId가 설정되지 않은 상태에서 language 이외의 속성을 설정하려 할 경우, 에러 로그 "Can't set attributes without a userId!"를 출력하고 서버 전송을 수행하지 않는다.
- EF-02: 속성 값이 허용되지 않는 타입(예: boolean, array, object)인 경우의 동작은 SDK 구현에 따르며, 에러 로그를 출력한다.

#### 4.4.7 비즈니스 규칙 (Business Rules)

- BR-01: userId가 없는 상태에서 설정 가능한 속성은 `language`만 해당된다.
- BR-02: language만 포함되고 userId가 없는 경우, 로컬 설정에만 적용하고 서버에 전송하지 않는다.
- BR-03: 여러 번 연속으로 setAttributes를 호출하면, 업데이트 큐에서 속성이 하나의 객체로 병합된다.
- BR-04: Date 타입 값은 반드시 ISO 8601 문자열로 변환된 후 전송해야 한다.

#### 4.4.8 데이터 요구사항

**입력 데이터**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| attrs | Record<string, string \| number \| Date> | Y | key는 비어있지 않은 문자열. value는 string, number, Date 중 하나. |

**출력 데이터**

- 없음. 업데이트 큐를 통해 비동기로 서버에 전송된다.

#### 4.4.9 화면/UI 요구사항

- 해당 없음.

#### 4.4.10 비기능 요구사항

- NFR-031-01: 연속 호출 시 Debounce 500ms로 배치 처리하여 네트워크 요청을 최소화한다.

---

### 4.5 업데이트 큐 (Debounce 배치 업데이트)

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-031-05 |
| 기능명 | 업데이트 큐 (Debounce 배치 업데이트) |
| 관련 요구사항 ID | FR-031-05 |
| 우선순위 | H |
| 기능 설명 | SDK에서 발생하는 userId 설정 및 속성 업데이트를 큐에 수집하고, 500ms Debounce를 적용하여 하나의 네트워크 요청으로 배치 전송한다. 싱글톤 패턴으로 구현되어 SDK 전체에서 하나의 큐만 존재한다. |

#### 4.5.2 선행 조건 (Preconditions)

- SDK가 정상 초기화된 상태여야 한다.
- 업데이트 큐 인스턴스가 생성되어 있어야 한다(싱글톤).

#### 4.5.3 후행 조건 (Postconditions)

- 큐에 쌓인 업데이트가 단일 네트워크 요청으로 서버에 전송된다.
- 전송 완료 후 큐가 초기화된다.

#### 4.5.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | SDK 메서드 | 업데이트 큐에 userId 또는 속성을 추가한다. |
| 2 | 업데이트 큐 | 큐에 추가된 업데이트가 있는지 확인한다. 없으면 반환한다. |
| 3 | 업데이트 큐 | 기존 Debounce 타이머가 존재하면 취소한다. |
| 4 | 업데이트 큐 | 새로운 Debounce 타이머를 500ms로 설정한다. |
| 5 | 업데이트 큐 | 500ms 경과 후, userId가 설정되어 있는지 확인한다. |
| 6 | 업데이트 큐 | userId가 있으면 큐에 쌓인 모든 업데이트를 하나의 요청으로 서버에 전송한다. |
| 7 | Server | 업데이트를 처리하고 결과를 반환한다. |
| 8 | 업데이트 큐 | 큐를 초기화한다. |

#### 4.5.5 대안 흐름 (Alternative Flow)

- AF-01 (language만 포함, userId 없음): 단계 5에서 userId가 없고 큐에 language만 포함되어 있는 경우, 로컬 config에만 language를 적용한다. 서버 전송은 수행하지 않는다. 큐를 초기화한다.
- AF-02 (연속 호출 병합): 단계 1에서 속성 업데이트가 여러 번 호출되면, 큐 내에서 속성 객체가 하나로 병합된다. 동일 key에 대해 마지막 값이 적용된다.

#### 4.5.6 예외 흐름 (Exception Flow)

- EF-01: 단계 5에서 userId가 없고 language 이외의 속성이 포함된 경우, 에러 로그 "Can't set attributes without a userId!"를 출력한다. 해당 업데이트는 서버에 전송하지 않는다. 큐를 초기화한다.
- EF-02: 단계 6에서 서버 통신 실패 시, SDK를 에러 상태로 전환한다.

#### 4.5.7 비즈니스 규칙 (Business Rules)

- BR-01: Debounce 시간은 500ms로 고정한다.
- BR-02: 업데이트 큐는 싱글톤 패턴으로 구현하여, SDK 전체에서 하나의 큐 인스턴스만 존재해야 한다.
- BR-03: userId가 없으면 language를 제외한 속성은 서버에 전송하지 않는다.
- BR-04: 여러 속성 설정 호출이 Debounce 기간(500ms) 내에 발생하면, 하나의 객체로 병합하여 단일 요청으로 전송한다.
- BR-05: 업데이트 전송 완료 후 큐는 반드시 초기화해야 한다.

#### 4.5.8 데이터 요구사항

**큐 내부 데이터 구조**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| userId | string \| null | 설정할 사용자 ID |
| attributes | Record<string, string \| number> | 병합된 속성 객체 |

**서버 전송 데이터 (출력)**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| userId | string | 사용자 ID |
| attributes | Record<string, string \| number> | 속성 객체 (Date는 ISO 문자열로 변환된 상태) |

#### 4.5.9 화면/UI 요구사항

- 해당 없음.

#### 4.5.10 비기능 요구사항

- NFR-031-01: Debounce 500ms를 통해 네트워크 요청을 최소화한다. 예를 들어 `setUserId` -> `setAttributes` 연속 호출(100ms 이내)이 하나의 요청으로 배치 전송되어야 한다.

---

### 4.6 사용자 상태 관리

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-031-06 |
| 기능명 | 사용자 상태 관리 |
| 관련 요구사항 ID | FR-031-06 |
| 우선순위 | H |
| 기능 설명 | SDK가 관리하는 사용자 상태의 구조를 정의하고, 상태의 로딩, 갱신, 만료, 영속화(로컬 스토리지) 메커니즘을 명세한다. |

#### 4.6.2 선행 조건 (Preconditions)

- SDK가 정상 초기화된 상태여야 한다.
- 브라우저 로컬 스토리지 접근이 가능해야 한다.

#### 4.6.3 후행 조건 (Postconditions)

- 사용자 상태가 로컬 스토리지에 영속화된다.
- 상태 만료 시 서버에서 최신 상태를 fetch하여 갱신된다.

#### 4.6.4 기본 흐름 (Basic Flow)

**상태 로드:**

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | SDK | 로컬 스토리지("formbricks-js" 키)에서 기존 상태를 로드한다. |
| 2 | SDK | 상태의 만료 시각을 확인한다. |
| 3 | SDK | 만료되지 않았으면 로컬 상태를 그대로 사용한다. |
| 4 | SDK | 만료되었으면 서버에서 최신 상태를 fetch한다. |
| 5 | SDK | 새로운 상태를 로컬 스토리지에 저장한다. |

**상태 갱신 (주기적):**

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | SDK | 60초마다 상태 갱신 타이머가 실행된다. |
| 2 | SDK | 사용자 활동이 감지되면 만료 시각을 현재 시점 + 30분으로 연장한다. |
| 3 | SDK | 갱신된 만료 시각을 로컬 스토리지에 저장한다. |

#### 4.6.5 대안 흐름 (Alternative Flow)

- AF-01: 로컬 스토리지에 기존 상태가 없는 경우(최초 방문), 미식별 사용자의 기본 상태로 초기화한다.
- AF-02: 로컬 스토리지 접근이 불가능한 환경에서는 인메모리 상태만 사용한다.

#### 4.6.6 예외 흐름 (Exception Flow)

- EF-01: 로컬 스토리지에 저장된 상태 데이터가 손상된 경우, 기본 상태로 초기화하고 서버에서 상태를 다시 fetch한다.
- EF-02: 서버에서 상태 fetch 실패 시, SDK를 에러 상태로 전환한다.

#### 4.6.7 비즈니스 규칙 (Business Rules)

- BR-01: 상태 만료 시간은 활동 시점으로부터 30분이다.
- BR-02: 상태 갱신 주기는 60초이다.
- BR-03: 로컬 스토리지 키는 "formbricks-js"를 사용한다.
- BR-04: 미식별 사용자의 기본 상태는 아래 구조를 따른다.

#### 4.6.8 데이터 요구사항

**사용자 상태 구조 (미식별 사용자 기본값)**

| 필드명 | 타입 | 기본값 | 설명 |
|--------|------|--------|------|
| expiresAt | string \| null | null | 상태 만료 시각 (ISO 8601) |
| userId | string \| null | null | 사용자 ID (미식별 시 null) |
| contactId | string \| null | null | Inquiry Contact ID |
| segments | string[] | [] | 사용자가 속한 세그먼트 ID 배열 |
| displays | object[] | [] | 설문 표시 기록 배열 |
| displays[].surveyId | string | - | 표시된 설문 ID |
| displays[].createdAt | string | - | 표시 시각 (ISO 8601) |
| responses | string[] | [] | 응답한 설문 ID 배열 |
| lastDisplayAt | string \| null | null | 마지막 설문 표시 시각 (ISO 8601) |

#### 4.6.9 화면/UI 요구사항

- 해당 없음.

#### 4.6.10 비기능 요구사항

- NFR-031-03: 사용자 활동 시 상태 유효 기간이 30분 연장된다. 갱신 주기는 60초이다.
- NFR-031-04: 상태는 로컬 스토리지("formbricks-js" 키)에 영속화된다.

---

### 4.7 SDK 초기화 흐름

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-031-07 |
| 기능명 | SDK 초기화 흐름 |
| 관련 요구사항 ID | FR-031-07 |
| 우선순위 | H |
| 기능 설명 | SDK의 setup() 메서드 호출 시 실행되는 전체 초기화 과정을 정의한다. 디버그 모드 확인, 레거시 마이그레이션, 상태 로드, 환경 fetch, 이벤트 리스너 등록 등을 순차적으로 수행한다. |

#### 4.7.2 선행 조건 (Preconditions)

- Inquiry SDK 스크립트가 페이지에 로드되어 있어야 한다.
- 유효한 appUrl과 environmentId가 제공되어야 한다.

#### 4.7.3 후행 조건 (Postconditions)

- SDK가 정상 초기화 상태가 된다.
- 환경 설정이 로드되고 설문 필터링이 완료된다.
- 이벤트 리스너가 등록된다.

#### 4.7.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | SDK | 현재 URL에 `formbricksDebug=true` 파라미터가 포함되어 있는지 확인한다. 포함되어 있으면 디버그 모드를 활성화한다. |
| 2 | SDK | 로컬 스토리지 마이그레이션을 수행한다. 레거시 형식(apiHost 등)의 데이터를 신규 형식(appUrl 등)으로 변환한다. |
| 3 | SDK | 로컬 스토리지에서 기존 설정을 확인하고 만료 여부를 검사한다. |
| 4 | SDK | 설정이 만료된 경우, 서버에서 환경 상태(environment state)를 fetch한다. |
| 5 | SDK | 설정이 만료되고 userId가 있는 경우, 서버에서 사용자 상태(user state)를 추가로 fetch한다. |
| 6 | SDK | 사용 가능한 설문 목록에 대해 설문 필터링을 실행한다. |
| 7 | SDK | 이벤트 리스너(액션 트리거, 페이지 변경 등)를 등록한다. |
| 8 | SDK | 다음 이벤트 루프에서 페이지 URL 변경 체크를 실행한다. |

#### 4.7.5 대안 흐름 (Alternative Flow)

- AF-01 (기존 설정 유효): 단계 3에서 기존 설정이 만료되지 않은 경우, 단계 4~5를 건너뛰고 로컬 상태를 그대로 사용하여 단계 6으로 진행한다.
- AF-02 (디버그 모드): 단계 1에서 디버그 모드가 활성화되면, 상세 디버그 로그가 콘솔에 출력된다. 에러 상태를 무시하고 초기화를 진행한다.
- AF-03 (레거시 init 호출): `init(config)` 호출 시 `setup(config)`으로 자동 변환하여 동일한 흐름을 실행한다.

#### 4.7.6 예외 흐름 (Exception Flow)

- EF-01 (에러 상태 존재): SDK가 이미 에러 상태이고 에러 발생 후 10분이 경과하지 않은 경우, 재초기화를 차단한다. 단, 디버그 모드에서는 에러 상태를 무시하고 초기화를 진행한다.
- EF-02 (환경 상태 fetch 실패): 서버에서 환경 상태를 가져오지 못하면, SDK를 에러 상태로 전환한다. 에러 상태는 10분간 유지되며, 이후 자동 복구가 가능하다.
- EF-03 (사용자 상태 fetch 실패): 사용자 상태 fetch 실패 시, SDK를 에러 상태로 전환한다.

#### 4.7.7 비즈니스 규칙 (Business Rules)

- BR-01: 에러 발생 시 10분간 에러 상태를 유지하고, 해당 기간 동안 재초기화를 차단한다.
- BR-02: 10분 경과 후 자동으로 에러 상태가 해제되어 재초기화가 가능하다.
- BR-03: 디버그 모드(URL에 `formbricksDebug=true`)에서는 에러 상태를 무시하고, 상세 디버그 로그를 콘솔에 출력한다.
- BR-04: 레거시 마이그레이션은 `apiHost` -> `appUrl` 등의 필드명 변환을 포함한다.
- BR-05: 페이지 URL 변경 체크는 메인 초기화 프로세스를 차단하지 않도록 다음 이벤트 루프에서 실행한다.

#### 4.7.8 데이터 요구사항

**입력 데이터 (setup config)**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| appUrl | string | Y | 유효한 URL 형식 |
| environmentId | string | Y | 비어있지 않은 문자열 |

**레거시 마이그레이션 매핑**

| 레거시 필드 | 신규 필드 |
|------------|----------|
| apiHost | appUrl |

#### 4.7.9 화면/UI 요구사항

- 해당 없음.

#### 4.7.10 비기능 요구사항

- NFR-031-02: 에러 발생 시 10분간 재시도를 차단하고, 이후 자동 복구가 가능해야 한다.
- NFR-031-05: 레거시 호환 (init -> setup 자동 변환, apiHost -> appUrl 마이그레이션)이 정상 동작해야 한다.

---

### 4.8 setNonce (CSP 지원)

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-031-08 |
| 기능명 | setNonce (CSP 지원) |
| 관련 요구사항 ID | FR-031-08 |
| 우선순위 | M |
| 기능 설명 | Content Security Policy(CSP) 환경에서 Inquiry SDK의 inline style이 정상 동작하도록 nonce 값을 설정하는 기능이다. |

#### 4.8.2 선행 조건 (Preconditions)

- 호스트 애플리케이션이 CSP를 적용하고 있으며, inline style에 대한 nonce 기반 허용 정책을 사용한다.
- SDK 스크립트가 로드되어 있어야 한다.

#### 4.8.3 후행 조건 (Postconditions)

- SDK가 생성하는 모든 inline style 요소에 해당 nonce가 적용된다.

#### 4.8.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | Host App | `formbricks.setNonce("abc123")`을 호출한다. |
| 2 | SDK | surveys 패키지가 아직 로드되지 않은 경우, 전역 변수에 nonce 값을 저장한다. |
| 3 | SDK | surveys 패키지가 로드되면 저장된 nonce를 적용한다. |

#### 4.8.5 대안 흐름 (Alternative Flow)

- AF-01 (surveys 패키지 이미 로드 완료): 단계 2에서 surveys 패키지가 이미 로드된 경우, 전역 변수 저장 없이 즉시 nonce를 적용한다.

#### 4.8.6 예외 흐름 (Exception Flow)

- EF-01: nonce 값이 빈 문자열이거나 null인 경우, 에러 로그를 출력하고 동작을 중단한다.

#### 4.8.7 비즈니스 규칙 (Business Rules)

- BR-01: nonce는 CSP 정책에서 발급된 유효한 토큰이어야 한다.
- BR-02: nonce는 페이지 로드마다 새로 발급되는 1회성 값이므로, 매 페이지 로드 시 setNonce를 호출해야 한다.

#### 4.8.8 데이터 요구사항

**입력 데이터**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| nonce | string | Y | 비어있지 않은 문자열 |

**출력 데이터**

- 없음. SDK 내부 설정에 nonce가 저장된다.

#### 4.8.9 화면/UI 요구사항

- SDK가 생성하는 설문 위젯의 inline style 요소에 `nonce` 속성이 추가된다.

#### 4.8.10 비기능 요구사항

- 해당 없음.

---

### 4.9 reCAPTCHA 설정 관리

#### 4.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-032-01 |
| 기능명 | reCAPTCHA 설정 관리 |
| 관련 요구사항 ID | FR-032-01 |
| 우선순위 | M |
| 기능 설명 | 설문별 reCAPTCHA v3 스팸 방지 설정(활성화/비활성화, threshold)을 관리한다. |

#### 4.9.2 선행 조건 (Preconditions)

- Survey Creator가 Inquiry 대시보드에 로그인되어 있어야 한다.
- Organization에 Enterprise 라이선스가 활성화되어 있어야 한다.

#### 4.9.3 후행 조건 (Postconditions)

- 설문에 reCAPTCHA 설정이 저장된다.
- 해당 설문의 응답 제출 시 reCAPTCHA 검증이 적용/미적용된다.

#### 4.9.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | Survey Creator | Survey Editor -> Settings -> Response Options -> Spam protection 섹션으로 이동한다. |
| 2 | Survey Creator | Spam protection 토글을 ON으로 설정한다. |
| 3 | Survey Creator | threshold 값을 설정한다 (0.1 ~ 0.9, 0.1 단위). |
| 4 | System | 설문의 reCAPTCHA 설정을 저장한다. |

#### 4.9.5 대안 흐름 (Alternative Flow)

- AF-01 (비활성화): 단계 2에서 Spam protection 토글을 OFF로 설정하면, 해당 설문의 응답 제출 시 reCAPTCHA 검증을 수행하지 않는다.
- AF-02 (threshold 미설정): threshold를 null로 설정하면, reCAPTCHA가 활성화되어 있어도 검증을 수행하지 않는다.

#### 4.9.6 예외 흐름 (Exception Flow)

- EF-01: Enterprise 라이선스가 없는 상태에서 설정을 시도하면, 기능이 비활성화되어 있음을 안내한다.

#### 4.9.7 비즈니스 규칙 (Business Rules)

- BR-01: threshold 값은 0.1 이상 0.9 이하이며, 0.1 단위로만 설정 가능하다.
- BR-02: threshold가 높을수록 봇 차단율이 증가하지만, 정상 사용자가 차단될 위험도 증가한다.
- BR-03: threshold 값이 null이면 reCAPTCHA 검증을 수행하지 않는다.
- BR-04: reCAPTCHA 설정은 설문별로 독립적으로 관리된다.

#### 4.9.8 데이터 요구사항

**reCAPTCHA 설정 데이터**

| 필드명 | 타입 | 필수 | 유효성 검증 | 기본값 |
|--------|------|------|------------|--------|
| enabled | boolean | Y | true 또는 false | false |
| threshold | number \| null | N | 0.1 ~ 0.9 범위, 0.1 단위. null 허용. | null |

#### 4.9.9 화면/UI 요구사항

- Survey Editor -> Settings -> Response Options 내에 Spam protection 토글과 threshold 슬라이더/입력 필드가 제공된다.
- threshold 설정 시 설명 텍스트: "높을수록 엄격 (봇 차단율 증가, 정상 사용자 차단 위험 증가)"

#### 4.9.10 비기능 요구사항

- 해당 없음.

---

### 4.10 reCAPTCHA 클라이언트 스크립트 로딩

#### 4.10.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-032-02 |
| 기능명 | reCAPTCHA 클라이언트 스크립트 로딩 |
| 관련 요구사항 ID | FR-032-02 |
| 우선순위 | M |
| 기능 설명 | Google reCAPTCHA v3 클라이언트 스크립트를 비동기로 동적 로딩한다. 이미 로딩된 경우 중복 로딩을 방지한다. |

#### 4.10.2 선행 조건 (Preconditions)

- reCAPTCHA Site Key 환경 변수가 설정되어 있어야 한다.
- 설문에서 reCAPTCHA가 활성화(enabled=true)되어 있어야 한다.

#### 4.10.3 후행 조건 (Postconditions)

- Google reCAPTCHA v3 스크립트가 DOM에 로드되고, reCAPTCHA API가 사용 가능한 상태가 된다.

#### 4.10.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | SDK/위젯 | reCAPTCHA 스크립트 로딩을 요청한다. |
| 2 | SDK | 고유 ID를 기준으로 DOM에 해당 스크립트가 이미 로드되어 있는지 확인한다. |
| 3 | SDK | 로드되어 있지 않으면, Google reCAPTCHA v3 스크립트를 비동기로 DOM에 삽입한다. (URL: `https://www.google.com/recaptcha/api.js?render={siteKey}`) |
| 4 | Browser | 스크립트 로딩이 완료된다. |
| 5 | SDK | 로딩 완료를 감지하고 성공을 반환한다. |

#### 4.10.5 대안 흐름 (Alternative Flow)

- AF-01 (이미 로드됨): 단계 2에서 스크립트가 이미 로드되어 있으면, 단계 3~4를 건너뛰고 즉시 완료(성공)를 반환한다.

#### 4.10.6 예외 흐름 (Exception Flow)

- EF-01: Site Key가 설정되어 있지 않은 경우, 에러를 반환한다. 스크립트 로딩을 시도하지 않는다.
- EF-02: 스크립트 로딩 실패(네트워크 오류, CDN 장애 등) 시, 에러를 반환한다.

#### 4.10.7 비즈니스 규칙 (Business Rules)

- BR-01: 스크립트 중복 로딩을 방지하기 위해 고유 ID로 DOM에서 기존 스크립트 존재 여부를 확인한다.
- BR-02: reCAPTCHA Site Key가 설정되고 설문에서 활성화된 경우에만 스크립트를 사전 로딩한다.

#### 4.10.8 데이터 요구사항

**입력 데이터**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| siteKey | string | Y | 비어있지 않은 유효한 reCAPTCHA Site Key |

**출력 데이터**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| result | success \| error | 스크립트 로딩 결과 |

#### 4.10.9 화면/UI 요구사항

- 해당 없음. 스크립트 로딩은 백그라운드에서 수행되며, 사용자에게 별도 UI를 제공하지 않는다.

#### 4.10.10 비기능 요구사항

- NFR-032-03: 고유 ID 기반으로 동일 스크립트의 재로딩을 방지한다.

---

### 4.11 reCAPTCHA 토큰 실행

#### 4.11.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-032-03 |
| 기능명 | reCAPTCHA 토큰 실행 |
| 관련 요구사항 ID | FR-032-03 |
| 우선순위 | M |
| 기능 설명 | Google reCAPTCHA v3 API를 호출하여 토큰을 획득한다. 획득된 토큰은 응답 제출 시 서버로 전송되어 검증에 사용된다. |

#### 4.11.2 선행 조건 (Preconditions)

- reCAPTCHA 클라이언트 스크립트가 정상 로딩된 상태여야 한다(FN-032-02 완료).
- reCAPTCHA Site Key가 설정되어 있어야 한다.
- reCAPTCHA API(window.grecaptcha)가 ready 상태여야 한다.

#### 4.11.3 후행 조건 (Postconditions)

- reCAPTCHA 토큰 문자열이 반환되거나, 실패 시 null이 반환된다.

#### 4.11.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | SDK/위젯 | reCAPTCHA 토큰 실행을 요청한다. |
| 2 | SDK | Site Key가 설정되어 있는지 확인한다. |
| 3 | SDK | reCAPTCHA 스크립트가 로드되어 있는지 확인한다. (미로드 시 로딩 실행) |
| 4 | SDK | reCAPTCHA API가 준비(ready) 상태인지 확인한다. |
| 5 | SDK | `grecaptcha.execute(siteKey, { action: "submit_response" })`를 호출한다. |
| 6 | Google API | 사용자 행동을 분석하고 토큰을 생성하여 반환한다. |
| 7 | SDK | 토큰을 반환한다. |

#### 4.11.5 대안 흐름 (Alternative Flow)

- 해당 없음.

#### 4.11.6 예외 흐름 (Exception Flow)

- EF-01: Site Key가 없는 경우, null을 반환한다.
- EF-02: reCAPTCHA API가 준비되지 않은 경우, null을 반환한다.
- EF-03: `grecaptcha.execute` 호출 중 에러 발생 시, null을 반환한다.

#### 4.11.7 비즈니스 규칙 (Business Rules)

- BR-01: reCAPTCHA action은 "submit_response"로 고정한다.
- BR-02: 토큰 획득 실패 시 에러를 던지지 않고 null을 반환한다. 서버 측에서 토큰 누락을 별도 처리한다.

#### 4.11.8 데이터 요구사항

**입력 데이터**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| siteKey | string | Y | 비어있지 않은 유효한 reCAPTCHA Site Key |

**출력 데이터**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| token | string \| null | reCAPTCHA 토큰. 실패 시 null. |

#### 4.11.9 화면/UI 요구사항

- reCAPTCHA v3는 사용자 상호작용이 필요 없다. 별도 UI 요소(체크박스 등)가 표시되지 않는다.
- 위젯 렌더링 시 토큰 획득 콜백이 전달된다.

#### 4.11.10 비기능 요구사항

- 해당 없음.

---

### 4.12 reCAPTCHA 서버 검증

#### 4.12.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-032-04 |
| 기능명 | reCAPTCHA 서버 검증 |
| 관련 요구사항 ID | FR-032-04 |
| 우선순위 | M |
| 기능 설명 | 클라이언트에서 전달받은 reCAPTCHA 토큰을 Google siteverify API로 검증하고, 반환된 score를 설문의 threshold와 비교하여 통과/실패를 판정한다. |

#### 4.12.2 선행 조건 (Preconditions)

- reCAPTCHA Secret Key 환경 변수가 서버에 설정되어 있어야 한다.
- 클라이언트에서 유효한 reCAPTCHA 토큰이 전달되어야 한다.

#### 4.12.3 후행 조건 (Postconditions)

- 검증 통과 시: 응답 처리가 정상 진행된다.
- 검증 실패 시: 응답이 거부되고 에러 응답이 반환된다.

#### 4.12.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | Server | reCAPTCHA Secret Key가 설정되어 있는지 확인한다. |
| 2 | Server | Google siteverify API를 호출한다. (`POST https://www.google.com/recaptcha/api/siteverify`, 파라미터: secret, response) |
| 3 | Server | API 호출에 5,000ms 타임아웃을 적용한다. |
| 4 | Google API | 토큰을 검증하고 결과(success, score, action 등)를 반환한다. |
| 5 | Server | 응답의 `success` 필드가 `true`인지 확인한다. |
| 6 | Server | 응답의 `score`가 설문의 threshold 이상인지 비교한다. |
| 7 | Server | 모든 조건을 통과하면 검증 성공을 반환한다. |

#### 4.12.5 대안 흐름 (Alternative Flow)

- AF-01 (reCAPTCHA 키 미설정): 단계 1에서 Secret Key가 설정되어 있지 않으면, 검증을 스킵하고 통과 처리한다 (Graceful Degradation).

#### 4.12.6 예외 흐름 (Exception Flow)

- EF-01: Google API 호출 시 5,000ms 타임아웃이 발생하면, 검증 실패로 처리한다.
- EF-02: Google API 응답의 `success` 필드가 `false`이면, 검증 실패로 처리한다.
- EF-03: `score`가 threshold 미만이면, 검증 실패로 처리한다.
- EF-04: Google API 호출 중 네트워크 에러가 발생하면, 검증 실패로 처리한다.

#### 4.12.7 비즈니스 규칙 (Business Rules)

- BR-01: reCAPTCHA 키가 미설정된 경우 검증을 스킵하고 통과 처리한다(차단하지 않음).
- BR-02: score가 threshold 이상이면 통과, 미만이면 실패로 판정한다.
- BR-03: 서버 검증 시 5,000ms 타임아웃을 적용한다.
- BR-04: 검증 API는 Google reCAPTCHA siteverify API (`https://www.google.com/recaptcha/api/siteverify`)를 사용한다.

#### 4.12.8 데이터 요구사항

**입력 데이터 (Google API 호출)**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| secret | string | Y | reCAPTCHA Secret Key |
| response | string | Y | 클라이언트에서 전달받은 reCAPTCHA 토큰 |

**Google API 응답 데이터**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| success | boolean | 토큰 검증 성공 여부 |
| score | number | 0.0 ~ 1.0 범위의 점수 (1.0에 가까울수록 정상 사용자) |
| action | string | 토큰 생성 시 지정된 action 이름 |
| challenge_ts | string | 챌린지 로드 시각 (ISO 8601) |
| hostname | string | 토큰이 생성된 호스트명 |
| error-codes | string[] | 에러 코드 배열 (실패 시) |

**검증 결과 (출력)**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| passed | boolean | 검증 통과 여부 |

#### 4.12.9 화면/UI 요구사항

- 해당 없음. 서버 측 처리이며 UI 요소가 없다.

#### 4.12.10 비기능 요구사항

- NFR-032-01: 서버 검증 시 5,000ms 타임아웃을 적용한다.
- NFR-032-02: reCAPTCHA 키 미설정 시 검증을 스킵한다(Graceful Degradation).

---

### 4.13 응답 제출 시 reCAPTCHA 검증 흐름

#### 4.13.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-032-05 |
| 기능명 | 응답 제출 시 reCAPTCHA 검증 흐름 |
| 관련 요구사항 ID | FR-032-05 |
| 우선순위 | M |
| 기능 설명 | 설문 응답 제출 시 reCAPTCHA 검증의 전체 End-to-End 흐름을 정의한다. 클라이언트 토큰 획득, 서버 전송, 서버 검증, 결과 처리를 포함한다. |

#### 4.13.2 선행 조건 (Preconditions)

- 설문에 reCAPTCHA가 활성화(enabled=true)되어 있어야 한다.
- reCAPTCHA Site Key가 클라이언트에 설정되어 있어야 한다.
- 사용자가 설문 응답을 완료하고 제출을 시도해야 한다.

#### 4.13.3 후행 조건 (Postconditions)

- 검증 통과: 응답이 정상적으로 저장된다.
- 검증 실패: 응답이 거부되고 에러 응답(400 Bad Request)이 반환된다.

#### 4.13.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | End User | 설문 응답을 완료하고 제출 버튼을 클릭한다. |
| 2 | Client SDK/위젯 | 설문에 reCAPTCHA가 활성화되어 있는지 확인한다. |
| 3 | Client SDK/위젯 | Google reCAPTCHA API를 통해 토큰을 획득한다 (FN-032-03). |
| 4 | Client SDK/위젯 | 응답 데이터와 함께 reCAPTCHA 토큰을 서버로 전송한다. |
| 5 | Server | 설문의 reCAPTCHA 활성화 여부를 확인한다. |
| 6 | Server | reCAPTCHA 토큰이 요청에 포함되어 있는지 확인한다. |
| 7 | Server | Enterprise 라이선스가 활성화되어 있는지 확인한다. |
| 8 | Server | Google siteverify API로 토큰과 threshold를 검증한다 (FN-032-04). |
| 9 | Server | 검증 통과 시 응답을 정상 저장하고 성공 응답을 반환한다. |

#### 4.13.5 대안 흐름 (Alternative Flow)

- AF-01 (reCAPTCHA 비활성화): 단계 2에서 설문에 reCAPTCHA가 비활성화되어 있으면, reCAPTCHA 관련 처리를 건너뛰고 바로 응답을 저장한다.
- AF-02 (reCAPTCHA 키 미설정): 단계 5에서 서버의 reCAPTCHA 키가 미설정이면, 검증을 스킵하고 응답을 정상 처리한다.

#### 4.13.6 예외 흐름 (Exception Flow)

- EF-01 (토큰 누락): 단계 6에서 reCAPTCHA 토큰이 요청에 포함되어 있지 않으면, `400 Bad Request`와 함께 에러 메시지 "Missing recaptcha token"을 반환한다.
- EF-02 (검증 실패): 단계 8에서 reCAPTCHA 검증이 실패하면(score < threshold), `400 Bad Request`와 함께 에러 메시지 "reCAPTCHA verification failed"를 반환한다. 에러 코드: `recaptcha_verification_failed`.
- EF-03 (Enterprise 라이선스 없음): 단계 7에서 Enterprise 라이선스가 없는 경우, 서버에 스팸 방지 미활성 로그를 기록하지만 검증 자체는 수행한다.

#### 4.13.7 비즈니스 규칙 (Business Rules)

- BR-01: 스팸 방지가 활성화되려면 4가지 조건이 모두 충족되어야 한다 (FN-032-06 참조).
- BR-02: 토큰 누락 시 즉시 400 에러를 반환하며, Google API 호출을 수행하지 않는다.
- BR-03: 검증 실패 시 응답 데이터를 저장하지 않는다.
- BR-04: Enterprise 라이선스가 없어도 reCAPTCHA 검증 자체는 수행한다 (로그만 기록).

#### 4.13.8 데이터 요구사항

**입력 데이터 (응답 제출 요청)**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| responseData | object | Y | 설문 응답 데이터 |
| recaptchaToken | string | 조건부 (reCAPTCHA 활성 시) | 비어있지 않은 문자열 |

**출력 데이터 (성공)**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| responseId | string | 저장된 응답 ID |

**출력 데이터 (실패)**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| status | number | 400 |
| error | string | 에러 메시지 ("Missing recaptcha token" 또는 "reCAPTCHA verification failed") |
| code | string | 에러 코드 ("recaptcha_verification_failed") |

#### 4.13.9 화면/UI 요구사항

- 검증 실패 시 사용자에게 적절한 에러 메시지를 표시한다.
- reCAPTCHA v3는 사용자 상호작용이 필요 없으므로, 별도 검증 UI(체크박스 등)는 표시하지 않는다.

#### 4.13.10 비기능 요구사항

- NFR-032-01: 서버 검증 시 5,000ms 타임아웃을 적용한다.
- NFR-032-02: reCAPTCHA 키 미설정 시 Graceful Degradation(검증 스킵).

---

### 4.14 스팸 방지 활성화 조건 관리

#### 4.14.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-032-06 |
| 기능명 | 스팸 방지 활성화 조건 관리 |
| 관련 요구사항 ID | FR-032-06 |
| 우선순위 | M |
| 기능 설명 | reCAPTCHA 스팸 방지 기능이 실제로 활성화되기 위해 충족해야 하는 4가지 조건을 정의하고 관리한다. |

#### 4.14.2 선행 조건 (Preconditions)

- 시스템 환경 변수에 접근 가능해야 한다.
- 설문 설정 및 Organization 라이선스 정보에 접근 가능해야 한다.

#### 4.14.3 후행 조건 (Postconditions)

- 4가지 조건이 모두 충족되면 스팸 방지가 활성화된 상태로 판정된다.
- 하나라도 미충족 시 스팸 방지가 비활성화된 상태로 판정된다.

#### 4.14.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | Server | reCAPTCHA Site Key 환경 변수가 설정되어 있는지 확인한다. |
| 2 | Server | reCAPTCHA Secret Key 환경 변수가 설정되어 있는지 확인한다. |
| 3 | Server | 해당 설문의 reCAPTCHA 활성화 설정(enabled)이 true인지 확인한다. |
| 4 | Server | Organization의 Enterprise 라이선스가 활성화되어 있는지 확인한다. |
| 5 | Server | 4가지 조건이 모두 충족되면 스팸 방지를 활성 상태로 판정한다. |

#### 4.14.5 대안 흐름 (Alternative Flow)

- 해당 없음.

#### 4.14.6 예외 흐름 (Exception Flow)

- EF-01: 4가지 조건 중 하나라도 미충족 시, 스팸 방지를 비활성 상태로 판정한다. 구체적으로:
  - Site Key 미설정: 클라이언트에서 토큰 획득 불가, 검증 스킵
  - Secret Key 미설정: 서버에서 검증 스킵 (통과 처리)
  - 설문 reCAPTCHA 비활성화: 해당 설문의 검증 비수행
  - Enterprise 라이선스 없음: 서버에 미활성 로그 기록, 검증은 수행

#### 4.14.7 비즈니스 규칙 (Business Rules)

- BR-01: 스팸 방지 활성화를 위한 필수 4가지 조건:
  1. reCAPTCHA Site Key 환경 변수 설정
  2. reCAPTCHA Secret Key 환경 변수 설정
  3. 설문의 reCAPTCHA 활성화 설정 (enabled = true)
  4. Organization의 Enterprise 라이선스 활성
- BR-02: 4가지 조건은 AND 조건이다. 모두 충족되어야 스팸 방지가 완전히 활성화된다.

#### 4.14.8 데이터 요구사항

**활성화 조건 데이터**

| 조건 | 데이터 소스 | 타입 | 확인 방법 |
|------|-----------|------|----------|
| reCAPTCHA Site Key | 환경 변수 | string | 비어있지 않은 문자열 존재 여부 |
| reCAPTCHA Secret Key | 환경 변수 | string | 비어있지 않은 문자열 존재 여부 |
| 설문 reCAPTCHA 활성화 | 설문 설정 | boolean | enabled === true |
| Enterprise 라이선스 | Organization 설정 | boolean | 라이선스 활성 여부 |

#### 4.14.9 화면/UI 요구사항

- 해당 없음. 서버 측 내부 로직이다.

#### 4.14.10 비기능 요구사항

- 해당 없음.

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

**SDK 사용자 상태 (Client-side)**

| 필드명 | 타입 | 설명 | 비고 |
|--------|------|------|------|
| expiresAt | string \| null | 상태 만료 시각 (ISO 8601) | 활동 시 현재+30분으로 갱신 |
| userId | string \| null | 사용자 ID | 미식별 시 null |
| contactId | string \| null | Inquiry Contact ID | 서버에서 반환 |
| segments | string[] | 사용자 세그먼트 ID 배열 | 서버에서 반환 |
| displays | DisplayRecord[] | 설문 표시 기록 | surveyId, createdAt 포함 |
| responses | string[] | 응답한 설문 ID 배열 | |
| lastDisplayAt | string \| null | 마지막 설문 표시 시각 | ISO 8601 |

**업데이트 큐 (Client-side)**

| 필드명 | 타입 | 설명 | 비고 |
|--------|------|------|------|
| userId | string \| null | 설정할 사용자 ID | |
| attributes | Record<string, string \| number> | 속성 객체 | 병합됨 |
| timer | Timeout \| null | Debounce 타이머 | 500ms |

**reCAPTCHA 설정 (Server-side, 설문별)**

| 필드명 | 타입 | 설명 | 비고 |
|--------|------|------|------|
| enabled | boolean | reCAPTCHA 활성화 여부 | 기본값 false |
| threshold | number \| null | score 통과 기준값 | 0.1~0.9, 0.1 단위 |

### 5.2 엔티티 간 관계

```
Organization (1) ----< (N) Project
     |                       |
     +-- Enterprise License  +-- Environment (Dev/Prod)
                                    |
                                    +----< (N) Survey
                                    |           |
                                    |           +-- reCAPTCHA 설정 (enabled, threshold)
                                    |           |
                                    |           +----< (N) Response
                                    |
                                    +----< (N) Contact
                                                |
                                                +-- userId
                                                +-- attributes
                                                +-- segments
```

### 5.3 데이터 흐름

**사용자 식별 데이터 흐름:**

1. Host App -> SDK: setUserId / setAttributes 호출
2. SDK -> 업데이트 큐: 업데이트 추가 (Debounce 500ms)
3. 업데이트 큐 -> Server: 배치 업데이트 전송 (HTTP)
4. Server -> 업데이트 큐: 갱신된 사용자 상태 반환
5. SDK -> 로컬 스토리지: 상태 영속화

**reCAPTCHA 데이터 흐름:**

1. 사용자 -> 위젯: 설문 응답 제출
2. SDK -> Google reCAPTCHA API: 토큰 요청 (클라이언트)
3. Google -> SDK: 토큰 반환
4. SDK -> Server: 응답 데이터 + reCAPTCHA 토큰 전송
5. Server -> Google siteverify API: 토큰 검증 요청 (서버)
6. Google -> Server: score 반환
7. Server: score vs threshold 비교 -> 통과/실패 판정

---

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 연동 대상 | 방향 | 프로토콜 | 용도 | 인증 |
|----------|------|---------|------|------|
| Inquiry Server (Client API) | SDK -> Server | HTTPS (REST) | 사용자 식별, 상태 fetch, 업데이트 전송 | 무인증 (environmentId 기반) |
| Google reCAPTCHA v3 (Client) | SDK -> Google CDN | HTTPS | 스크립트 로딩, 토큰 획득 | Site Key |
| Google reCAPTCHA v3 (Server) | Server -> Google API | HTTPS (POST) | 토큰 검증 (siteverify) | Secret Key |

### 6.2 API 명세

**6.2.1 사용자 업데이트 API (Client -> Server)**

| 항목 | 내용 |
|------|------|
| Endpoint | `POST /api/v1/client/{environmentId}/user` |
| 인증 | 없음 (environmentId로 환경 식별) |
| Content-Type | application/json |

Request Body:
```json
{
  "userId": "user123",
  "attributes": {
    "name": "John",
    "age": 30,
    "language": "ko"
  }
}
```

Response (200 OK):
```json
{
  "contactId": "contact_abc",
  "segments": ["segment_1", "segment_2"],
  "displays": [{ "surveyId": "survey_1", "createdAt": "2024-01-01T00:00:00Z" }],
  "responses": ["survey_2"],
  "lastDisplayAt": "2024-01-01T00:00:00Z"
}
```

**6.2.2 Google reCAPTCHA siteverify API (Server -> Google)**

| 항목 | 내용 |
|------|------|
| Endpoint | `POST https://www.google.com/recaptcha/api/siteverify` |
| Content-Type | application/x-www-form-urlencoded |
| 타임아웃 | 5,000ms |

Request Parameters:
```
secret={SECRET_KEY}&response={TOKEN}
```

Response:
```json
{
  "success": true,
  "score": 0.9,
  "action": "submit_response",
  "challenge_ts": "2024-01-01T00:00:00Z",
  "hostname": "example.com"
}
```

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| ID | 항목 | 기준 |
|----|------|------|
| NFR-031-01 | 네트워크 요청 최소화 | 업데이트 큐 Debounce 500ms로 배치 처리. setUserId -> setAttributes 연속 호출(100ms 이내) 시 하나의 네트워크 요청으로 처리 |
| NFR-032-01 | reCAPTCHA 서버 검증 타임아웃 | Google siteverify API 호출 시 5,000ms 타임아웃 적용 |

### 7.2 보안 요구사항

| ID | 항목 | 기준 |
|----|------|------|
| NFR-SEC-01 | CSP 지원 | setNonce를 통해 Content Security Policy 환경에서 inline style을 안전하게 허용 |
| NFR-SEC-02 | reCAPTCHA Secret Key 보호 | Secret Key는 서버 측 환경 변수에만 저장하며, 클라이언트에 노출하지 않음 |
| NFR-SEC-03 | Enterprise 라이선스 검증 | 사용자 식별 및 reCAPTCHA 기능은 Enterprise 라이선스가 필요 |

### 7.3 가용성 요구사항

| ID | 항목 | 기준 |
|----|------|------|
| NFR-031-02 | 에러 상태 회복 | 에러 발생 시 10분간 재시도 차단, 이후 자동 복구 가능 |
| NFR-031-03 | 사용자 상태 유효 기간 | 활동 시 30분 연장 (60초마다 갱신 체크) |
| NFR-032-02 | Graceful Degradation | reCAPTCHA 키 미설정 시 검증 스킵 (정상 사용자 차단 방지) |
| NFR-032-03 | 스크립트 중복 로딩 방지 | 고유 ID 기반으로 동일 reCAPTCHA 스크립트 재로딩 방지 |

---

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| 항목 | 내용 |
|------|------|
| Debounce 시간 고정 | Debounce 지연 시간은 500ms로 고정되며, 동적 조정이 불가능하다. |
| 로컬 스토리지 의존 | 사용자 상태 영속화가 로컬 스토리지에 의존하므로, 시크릿/프라이빗 브라우징 모드에서는 세션 단위로 초기화될 수 있다. |
| reCAPTCHA v3 한정 | 스팸 방지는 reCAPTCHA v3만 지원한다. v2(체크박스) 또는 다른 CAPTCHA 서비스는 지원하지 않는다. |
| Mobile SDK 제한 | reCAPTCHA 기반 스팸 방지는 Mobile SDK(React Native/iOS/Android)에서 동작 제한이 있을 수 있다. |
| Google API 의존 | reCAPTCHA 검증은 Google 외부 서비스에 의존한다. Google 서비스 장애 시 검증이 불가능하다. |

### 8.2 비즈니스 제약사항

| 항목 | 내용 |
|------|------|
| Enterprise 라이선스 | 사용자 식별(setUserId/setAttributes)과 reCAPTCHA 스팸 방지 모두 Enterprise 라이선스가 필요하다. |
| reCAPTCHA threshold 범위 | threshold는 0.1 ~ 0.9 범위, 0.1 단위로만 설정 가능하다. |
| userId 없이 설정 가능한 속성 | userId 없이 설정 가능한 속성은 language만 해당한다. 다른 속성은 userId가 필수이다. |

### 8.3 가정사항

| 항목 | 내용 |
|------|------|
| 브라우저 환경 | SDK는 표준 웹 브라우저 환경(로컬 스토리지, DOM API 접근 가능)에서 실행된다고 가정한다. |
| 네트워크 연결 | SDK 초기화 및 업데이트 전송 시 네트워크 연결이 가능하다고 가정한다. |
| Google reCAPTCHA 가용성 | Google reCAPTCHA CDN 및 siteverify API가 정상 운영 상태라고 가정한다. |
| Server 시간 동기화 | 클라이언트와 서버 간 시간 차이가 상태 만료 판정에 유의미한 영향을 미치지 않는다고 가정한다. |

---

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 요구사항명 | 기능 ID | 기능명 | 수용 기준 ID |
|------------|----------|---------|--------|-------------|
| FR-031-01 | SDK 공개 API | FN-031-01 | SDK 공개 API | AC-031-01, AC-031-12 |
| FR-031-02 | setUserId 구현 | FN-031-02 | setUserId 처리 | AC-031-02, AC-031-03, AC-031-04 |
| FR-031-03 | logout 구현 | FN-031-03 | logout 처리 | AC-031-09 |
| FR-031-04 | setAttributes 구현 | FN-031-04 | setAttributes 처리 | AC-031-05, AC-031-06, AC-031-07 |
| FR-031-05 | 업데이트 큐 | FN-031-05 | 업데이트 큐 (Debounce 배치) | AC-031-08 |
| FR-031-06 | 사용자 상태 구조 | FN-031-06 | 사용자 상태 관리 | - |
| FR-031-07 | SDK 초기화 흐름 | FN-031-07 | SDK 초기화 흐름 | AC-031-01, AC-031-10, AC-031-11 |
| FR-031-08 | setNonce (CSP 지원) | FN-031-08 | setNonce (CSP 지원) | AC-031-12 |
| FR-032-01 | reCAPTCHA 설정 구조 | FN-032-01 | reCAPTCHA 설정 관리 | AC-032-06 |
| FR-032-02 | reCAPTCHA 스크립트 로딩 | FN-032-02 | reCAPTCHA 클라이언트 스크립트 로딩 | AC-032-09 |
| FR-032-03 | reCAPTCHA 토큰 실행 | FN-032-03 | reCAPTCHA 토큰 실행 | AC-032-01 |
| FR-032-04 | reCAPTCHA 서버 검증 | FN-032-04 | reCAPTCHA 서버 검증 | AC-032-02, AC-032-03, AC-032-05, AC-032-07 |
| FR-032-05 | 응답 제출 시 reCAPTCHA 검증 | FN-032-05 | 응답 제출 시 reCAPTCHA 검증 흐름 | AC-032-01, AC-032-02, AC-032-03, AC-032-04 |
| FR-032-06 | 스팸 방지 활성화 조건 | FN-032-06 | 스팸 방지 활성화 조건 관리 | AC-032-05, AC-032-08 |

### 9.2 수용 기준 매핑

| AC-ID | 시나리오 | 기대 결과 | 매핑 기능 ID |
|-------|----------|----------|-------------|
| AC-031-01 | SDK setup 호출 (appUrl, environmentId) | SDK 초기화, 환경 상태 fetch, 이벤트 리스너 등록 | FN-031-07 |
| AC-031-02 | setUserId("user123") 호출 | Contact 생성/연결, 사용자 상태 업데이트 | FN-031-02 |
| AC-031-03 | 동일 userId로 setUserId 재호출 | no-op (네트워크 요청 없음) | FN-031-02 |
| AC-031-04 | 다른 userId로 setUserId 호출 | 이전 사용자 상태 정리(tearDown), 새 사용자 상태 설정 | FN-031-02 |
| AC-031-05 | setAttributes({ name: "John", age: 30 }) 호출 | 서버에 name(string), age(number) 속성 전송 | FN-031-04 |
| AC-031-06 | userId 없이 setAttributes 호출 | 에러 로그 ("Can't set attributes without a userId!") | FN-031-04, FN-031-05 |
| AC-031-07 | userId 없이 setLanguage("de") 호출 | 로컬 config에 language 설정 (서버 전송 없음) | FN-031-04, FN-031-05 |
| AC-031-08 | setUserId -> setAttributes 연속 호출 (100ms 내) | 하나의 네트워크 요청으로 배치 전송 (debounce 500ms) | FN-031-05 |
| AC-031-09 | logout() 호출 | 사용자 상태 초기화, 표시 중인 설문 닫기, 미식별 상태 전환 | FN-031-03 |
| AC-031-10 | SDK 에러 발생 | 10분간 에러 상태, 이후 재초기화 가능 | FN-031-07 |
| AC-031-11 | URL에 formbricksDebug=true 파라미터 | 디버그 로그 활성화, 에러 상태 무시 | FN-031-07 |
| AC-031-12 | setNonce("abc123") 호출 | CSP nonce가 inline style에 적용됨 | FN-031-08 |
| AC-032-01 | reCAPTCHA 활성 설문 응답 제출 | Google reCAPTCHA 토큰이 서버로 전송됨 | FN-032-03, FN-032-05 |
| AC-032-02 | reCAPTCHA score >= threshold | 응답 정상 저장 | FN-032-04, FN-032-05 |
| AC-032-03 | reCAPTCHA score < threshold | 400 Bad Request ("reCAPTCHA verification failed") | FN-032-04, FN-032-05 |
| AC-032-04 | reCAPTCHA 토큰 누락 | 400 Bad Request ("Missing recaptcha token") | FN-032-05 |
| AC-032-05 | reCAPTCHA 키 미설정 | 검증 스킵 (응답 허용) | FN-032-04, FN-032-06 |
| AC-032-06 | reCAPTCHA threshold 0.5 설정 | score 0.5 이상만 통과 | FN-032-01, FN-032-04 |
| AC-032-07 | Google API 5초 타임아웃 | 검증 실패 처리 (응답 거부) | FN-032-04 |
| AC-032-08 | Enterprise 라이선스 없이 reCAPTCHA 활성화 | 서버에서 스팸 방지 미활성 로그, 하지만 검증은 수행 | FN-032-05, FN-032-06 |
| AC-032-09 | reCAPTCHA 스크립트 중복 로딩 시도 | 기존 스크립트 재사용 (중복 로딩 방지) | FN-032-02 |

### 9.3 정책/제약 요약

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
| Date 변환 | ISO 8601 문자열로 변환 |
| 미식별 사용자 기본 상태 | userId null, 빈 segments/displays/responses |
| 라이선스 요구사항 | Enterprise (두 기능 모두) |

### 9.4 변경 이력

| 버전 | 일자 | 작성자 | 변경 유형 | 변경 내용 |
|------|------|-------|---------|---------|
| v1.0 | 2026-02-21 | - | 신규 | FSD-020 기반 기능 명세서 최초 작성 |
