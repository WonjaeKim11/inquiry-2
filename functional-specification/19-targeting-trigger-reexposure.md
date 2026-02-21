# 기능 명세서 (Functional Specification)

# 19. 타게팅, 트리거 및 재노출

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | 1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-019 (타게팅, 트리거 및 재노출 요구사항 명세서) |
| FR 범위 | FR-029 ~ FR-030 |
| 라이선스 | Community |
| 상태 | 초안 |

---

## 2. 개요

### 2.1 목적

App Survey(인앱 설문)에서 설문이 **"언제"(트리거)**, **"누구에게"(타게팅)**, **"몇 번"(재노출 제어)** 표시되는지를 제어하는 전체 메커니즘에 대한 상세 기능 명세를 정의한다. 이 문서는 ActionClass 기반 트리거 시스템, Segment 기반 타게팅, 표시 옵션/재접촉 대기일 기반 재노출 제어 로직의 구현 요구사항을 체계적으로 기술한다.

### 2.2 범위

**In-scope:**
- ActionClass 트리거 (code / noCode)
- NoCode 이벤트 유형 4가지 (click, pageView, exitIntent, fiftyPercentScroll)
- Segment 필터 4가지 (attribute, person, segment, device)
- 표시 옵션 4가지 (displayOnce, displayMultiple, respondMultiple, displaySome)
- 재접촉 대기일 설정 (프로젝트/설문 수준)
- 자동 닫기 (autoClose)
- 표시 지연 (delay)
- 확률 기반 표시 (displayPercentage)
- 최대 표시 횟수 제한 (displayLimit)
- 설문 위젯 렌더링 및 상태 관리

**Out-of-scope:**
- Link Survey 배포 (FSD-016)
- 사용자 식별 (FSD-020)
- 응답 데이터 처리 및 저장

### 2.3 대상 사용자

| 역할 | 설명 |
|------|------|
| Survey Creator | 트리거, 타게팅, 재노출 규칙을 설정하는 사용자 |
| End User | 웹 앱에서 특정 행동 시 인앱 설문을 보게 되는 사용자 |
| Product Manager | 사용자 세그먼트별로 타게팅된 설문의 응답을 분석하는 담당자 |
| Developer | Code Action을 구현하고 SDK를 통합하는 개발자 |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| ActionClass | 설문 트리거의 기본 단위. code 타입과 noCode 타입으로 구분된다. |
| Code Action | 개발자가 SDK의 `track()` 메서드를 호출하여 명시적으로 발생시키는 트리거 |
| NoCode Action | 사용자의 UI 상호작용(클릭, 페이지 뷰 등)을 자동 감지하여 발생하는 트리거 |
| Segment | 특정 조건(속성, 디바이스 등)을 기반으로 사용자를 분류하는 그룹 |
| Segment 필터 | Segment에 속하는 사용자를 결정하는 조건식 (attribute, person, segment, device) |
| 표시 옵션 (displayOption) | 설문이 사용자에게 몇 번 표시될 수 있는지를 결정하는 규칙 |
| 재접촉 대기일 (recontactDays) | 마지막 설문 표시 이후 다음 설문을 표시하기까지 대기해야 하는 일수 |
| 표시 기록 (display record) | 설문이 사용자에게 표시된 기록 |
| 응답 기록 (response record) | 사용자가 설문에 응답한 기록 |
| CSPRNG | Cryptographically Secure Pseudo-Random Number Generator. 보안 난수 생성기 |
| displayLimit | displaySome 옵션에서 최대 표시 횟수를 제한하는 값 |
| autoClose | 설문이 표시된 후 사용자 상호작용 없이 자동으로 닫히기까지의 시간(초) |
| delay | 트리거 발생 후 설문이 실제로 표시되기까지 지연되는 시간(초) |
| displayPercentage | 트리거 발생 시 설문이 표시될 확률(%) |
| Hidden Fields | 설문 URL 또는 SDK를 통해 전달되는 숨겨진 데이터 필드 |

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
[End User Browser]
    |
    v
[SDK (Client)]
    |-- 이벤트 감지 (click, pageView, exitIntent, scroll)
    |-- Code Action track() 호출
    |-- 설문 필터링 (로컬)
    |-- 위젯 렌더링
    |
    v
[서버 API]
    |-- ActionClass 관리
    |-- Segment 평가 (서버에서 미리 수행)
    |-- 설문 목록 + Segment ID 배열 전달
    |
    v
[데이터베이스]
    |-- ActionClass
    |-- Segment / Segment Filter
    |-- Survey (displayOption, recontactDays, triggers 등)
    |-- Display Record / Response Record
```

### 3.2 주요 기능 목록 (Feature List)

| 기능 ID | 기능명 | 관련 FR | 우선순위 |
|---------|--------|---------|---------|
| FN-019-01 | ActionClass 타입 정의 및 관리 | FR-029-01 | 필수 |
| FN-019-02 | NoCode 이벤트 구성 | FR-029-02 | 필수 |
| FN-019-03 | Click 이벤트 평가 | FR-029-03 | 필수 |
| FN-019-04 | 설문 트리거 및 확률 기반 표시 | FR-029-04 | 필수 |
| FN-019-05 | 위젯 렌더링 및 상태 관리 | FR-029-05 | 필수 |
| FN-019-06 | 표시 옵션 (displayOption) 제어 | FR-030-01 | 필수 |
| FN-019-07 | 재접촉 대기일 설정 | FR-030-02 | 필수 |
| FN-019-08 | Segment 기반 필터링 | FR-030-03 | 필수 |
| FN-019-09 | Segment 필터 타입 및 연산자 | FR-030-04 | 필수 |
| FN-019-10 | 자동 닫기 (autoClose) | FR-030-05 | 필수 |
| FN-019-11 | 표시 지연 (delay) | FR-030-06 | 필수 |
| FN-019-12 | 확률 기반 표시 (displayPercentage) | FR-030-07 | 필수 |
| FN-019-13 | 프로젝트 수준 설문 오버라이드 | FR-030-08 | 필수 |

### 3.3 기능 간 관계도

```
이벤트 발생 (Code Action / NoCode Action)
    |
    v
[FN-019-01/02/03] 트리거 매칭
    |
    v
[FN-019-08/09] Segment 기반 타게팅 필터링
    |
    v
[FN-019-06] 표시 옵션 검사 (displayOption)
    |
    v
[FN-019-07] 재접촉 대기일 검사 (recontactDays)
    |
    v
[FN-019-12] 확률 기반 표시 검사 (displayPercentage)
    |
    v
[FN-019-04] 설문 트리거 결정
    |
    v
[FN-019-11] 표시 지연 대기 (delay)
    |
    v
[FN-019-05/13] 위젯 렌더링 (오버라이드 적용)
    |
    v
[FN-019-10] 자동 닫기 타이머 시작 (autoClose)
```

---

## 4. 상세 기능 명세

### 4.1 ActionClass 타입 정의 및 관리

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-019-01 |
| 기능명 | ActionClass 타입 정의 및 관리 |
| 관련 요구사항 ID | FR-029-01 |
| 우선순위 | 필수 |
| 기능 설명 | 설문 트리거의 기본 단위인 ActionClass를 정의하고 관리한다. ActionClass는 code 타입과 noCode 타입으로 구분되며, 각각 다른 트리거 방식을 갖는다. |

#### 4.1.2 선행 조건 (Preconditions)

- 환경(Environment)이 생성되어 있어야 한다.
- Survey Creator가 해당 프로젝트에 대한 편집 권한을 보유해야 한다.

#### 4.1.3 후행 조건 (Postconditions)

- ActionClass가 생성되어 데이터베이스에 저장된다.
- 생성된 ActionClass는 설문의 트리거로 연결할 수 있는 상태가 된다.

#### 4.1.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Survey Creator | 설문 에디터에서 트리거 설정 화면에 진입한다. |
| 2 | 시스템 | 현재 환경에 등록된 ActionClass 목록을 조회하여 표시한다. |
| 3 | Survey Creator | 새 ActionClass를 생성하거나 기존 ActionClass를 선택한다. |
| 4 | Survey Creator | code 타입인 경우 action key를 입력한다. noCode 타입인 경우 이벤트 유형 및 조건을 설정한다. |
| 5 | 시스템 | 입력된 정보를 검증하고 ActionClass를 저장한다. |
| 6 | 시스템 | 생성된 ActionClass를 설문의 트리거로 연결한다. |

#### 4.1.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-01-01 | 단계 3 | 기존 ActionClass를 선택한 경우 | 단계 4를 건너뛰고 단계 6으로 이동한다. |
| AF-01-02 | 단계 4 | code 타입 선택 시 | action key 입력 필드만 표시한다. SDK에서 `track("action-key")` 호출 방식 안내를 표시한다. |

#### 4.1.6 예외 흐름 (Exception Flow)

| ID | 조건 | 처리 |
|----|------|------|
| EX-01-01 | action key가 동일 환경 내에서 중복인 경우 | 오류 메시지를 표시하고 저장을 거부한다. |
| EX-01-02 | noCode 타입의 click 이벤트에서 CSS selector와 innerHTML 모두 미입력 시 | 검증 오류를 표시한다. "CSS selector 또는 innerHTML 중 최소 1개를 입력해야 합니다." |

#### 4.1.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-01-01 | ActionClass 타입 제한 | 타입 필드 | "code" 또는 "noCode" 2가지만 허용한다. |
| BR-01-02 | code 타입 필수 필드 | 타입이 code인 경우 | key(action key) 필드가 필수이다. |
| BR-01-03 | noCode 타입 필수 필드 | 타입이 noCode인 경우 | noCodeConfig가 필수이다. |
| BR-01-04 | Link Survey 제한 | 설문 타입이 Link Survey인 경우 | 트리거 설정 카드를 표시하지 않는다. |

#### 4.1.8 데이터 요구사항

**ActionClass 엔티티:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 | 설명 |
|--------|------|------|-----------------|------|
| id | string (UUID) | Y | 자동 생성 | 고유 식별자 |
| name | string | Y | 1자 이상 | 액션 이름 |
| description | string | N | - | 액션 설명 |
| type | enum | Y | "code" 또는 "noCode" | 액션 타입 |
| key | string | 조건부 | type이 "code"인 경우 필수, 환경 내 고유 | code action 식별자 |
| noCodeConfig | object | 조건부 | type이 "noCode"인 경우 필수 | NoCode 설정 객체 |
| environmentId | string (UUID) | Y | 유효한 환경 ID | 소속 환경 |
| createdAt | datetime | Y | 자동 생성 | 생성 일시 |
| updatedAt | datetime | Y | 자동 갱신 | 수정 일시 |

**noCodeConfig 객체:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 | 설명 |
|--------|------|------|-----------------|------|
| type | enum | Y | "click", "pageView", "exitIntent", "fiftyPercentScroll" | 이벤트 유형 |
| elementSelector | object | 조건부 | type이 "click"인 경우 | 클릭 대상 요소 설정 |
| urlFilters | array | N | - | URL 필터 배열 |

#### 4.1.9 화면/UI 요구사항

- 설문 에디터 내 "트리거" 설정 카드에서 ActionClass 목록을 드롭다운으로 제공한다.
- code 타입 선택 시 action key 입력 필드와 SDK 사용 가이드를 표시한다.
- noCode 타입 선택 시 이벤트 유형 선택 및 조건 입력 UI를 표시한다.
- Link Survey인 경우 트리거 설정 카드를 숨긴다.

#### 4.1.10 비기능 요구사항

- 해당 없음 (일반적인 CRUD 작업)

---

### 4.2 NoCode 이벤트 구성

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-019-02 |
| 기능명 | NoCode 이벤트 구성 |
| 관련 요구사항 ID | FR-029-02 |
| 우선순위 | 필수 |
| 기능 설명 | NoCode 이벤트는 4가지 유형(click, pageView, exitIntent, fiftyPercentScroll)으로 분류되며, 각 유형에 맞는 조건을 설정하고 URL 필터를 구성한다. |

#### 4.2.2 선행 조건 (Preconditions)

- ActionClass가 noCode 타입으로 생성 중이거나 이미 생성되어 있어야 한다.

#### 4.2.3 후행 조건 (Postconditions)

- noCodeConfig 객체가 완성되어 ActionClass에 저장된다.
- SDK가 해당 설정을 기반으로 이벤트를 감지할 수 있는 상태가 된다.

#### 4.2.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Survey Creator | NoCode 이벤트 유형을 선택한다 (click, pageView, exitIntent, fiftyPercentScroll). |
| 2 | 시스템 | 선택된 유형에 따라 추가 설정 필드를 표시한다. |
| 3 | Survey Creator | click 유형인 경우 CSS selector 또는 innerHTML을 입력한다. |
| 4 | Survey Creator | URL 필터를 설정한다 (선택사항). |
| 5 | Survey Creator | URL 필터 연결자(and/or)를 선택한다. |
| 6 | 시스템 | 입력된 설정을 검증하고 저장한다. |

#### 4.2.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-02-01 | 단계 1 | pageView, exitIntent, fiftyPercentScroll 선택 시 | 단계 3을 건너뛰고 단계 4로 이동한다 (CSS selector/innerHTML 불필요). |
| AF-02-02 | 단계 4 | URL 필터를 설정하지 않는 경우 | 단계 5를 건너뛴다. 모든 URL에서 이벤트가 발생한다. |

#### 4.2.6 예외 흐름 (Exception Flow)

| ID | 조건 | 처리 |
|----|------|------|
| EX-02-01 | click 유형에서 CSS selector와 innerHTML 모두 미입력 | "CSS selector 또는 innerHTML 중 최소 1개를 입력해야 합니다." 오류 표시 |
| EX-02-02 | matchesRegex 규칙에서 유효하지 않은 정규식 패턴 입력 | "유효하지 않은 정규식 패턴입니다." 오류 표시 |

#### 4.2.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-02-01 | NoCode 이벤트 유형 제한 | type 필드 | "click", "pageView", "exitIntent", "fiftyPercentScroll" 4가지만 허용 |
| BR-02-02 | click 요소 선택 최소 조건 | type이 "click"인 경우 | CSS selector 또는 innerHTML 중 최소 1개 필수 |
| BR-02-03 | URL 필터 연결자 기본값 | 연결자 미지정 시 | "or"를 기본값으로 사용 |
| BR-02-04 | URL 필터 매칭 규칙 | urlFilters 배열 | 7가지 규칙(exactMatch, contains, startsWith, endsWith, notMatch, notContains, matchesRegex)만 허용 |

#### 4.2.8 데이터 요구사항

**NoCode 이벤트 유형별 설정:**

| 유형 | 필수 설정 | 선택 설정 |
|------|----------|----------|
| click | CSS selector 또는 innerHTML (최소 1개) | URL 필터 |
| pageView | 없음 | URL 필터 |
| exitIntent | 없음 | URL 필터 |
| fiftyPercentScroll | 없음 | URL 필터 |

**URL 필터 객체:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 | 설명 |
|--------|------|------|-----------------|------|
| rule | enum | Y | 7가지 규칙 중 하나 | 매칭 규칙 |
| value | string | Y | 1자 이상, matchesRegex인 경우 유효한 정규식 | 매칭 대상 값 |

**URL 필터 연결자:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 | 설명 |
|--------|------|------|-----------------|------|
| connector | enum | N | "and" 또는 "or" | 필터 연결자, 기본값 "or" |

**URL 필터 매칭 규칙 상세:**

| 규칙 | 매칭 로직 |
|------|----------|
| exactMatch | `currentUrl === filterValue` |
| contains | `currentUrl.includes(filterValue)` |
| startsWith | `currentUrl.startsWith(filterValue)` |
| endsWith | `currentUrl.endsWith(filterValue)` |
| notMatch | `currentUrl !== filterValue` |
| notContains | `!currentUrl.includes(filterValue)` |
| matchesRegex | `new RegExp(filterValue).test(currentUrl)` |

#### 4.2.9 화면/UI 요구사항

- NoCode 이벤트 유형 선택 드롭다운 제공
- click 유형 선택 시 CSS selector 입력 필드와 innerHTML 입력 필드를 표시
- URL 필터 추가/삭제 인터페이스 제공
- URL 필터별 규칙 선택 드롭다운과 값 입력 필드 제공
- 필터 연결자(and/or) 토글 제공

#### 4.2.10 비기능 요구사항

- 해당 없음

---

### 4.3 Click 이벤트 평가

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-019-03 |
| 기능명 | Click 이벤트 평가 |
| 관련 요구사항 ID | FR-029-03 |
| 우선순위 | 필수 |
| 기능 설명 | SDK 클라이언트에서 사용자의 클릭 이벤트를 감지하고, 등록된 NoCode click 액션의 조건(CSS selector, innerHTML, URL 필터)과 비교하여 매칭 여부를 평가한다. |

#### 4.3.2 선행 조건 (Preconditions)

- SDK가 초기화되어 서버로부터 설문 목록 및 ActionClass 정보를 수신한 상태여야 한다.
- click 타입의 NoCode ActionClass가 1개 이상 등록되어 있어야 한다.
- End User가 웹 페이지에서 클릭 동작을 수행해야 한다.

#### 4.3.3 후행 조건 (Postconditions)

- 모든 조건이 충족되면 해당 ActionClass에 연결된 설문의 트리거 프로세스가 시작된다.
- 조건이 충족되지 않으면 아무 동작도 수행하지 않는다.

#### 4.3.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | End User | 웹 페이지에서 요소를 클릭한다. |
| 2 | SDK | 클릭 이벤트를 캡처하고, 등록된 NoCode ActionClass 중 type이 "click"인 목록을 순회한다. |
| 3 | SDK | 각 ActionClass의 noCodeConfig에 대해 평가를 시작한다. |
| 4 | SDK | innerHTML이 설정된 경우, 클릭된 요소의 innerHTML과 설정된 값을 비교한다. 불일치 시 해당 ActionClass를 건너뛴다. |
| 5 | SDK | CSS selector가 설정된 경우, 점(`.`) 또는 해시(`#`) 기준으로 selector를 분리하여 각각 클릭된 요소와 매칭한다. 불일치 시 해당 ActionClass를 건너뛴다. |
| 6 | SDK | URL 필터가 설정된 경우, 현재 URL을 필터 연결자(and/or)에 따라 URL 매칭을 수행한다. 불일치 시 해당 ActionClass를 건너뛴다. |
| 7 | SDK | 모든 조건이 충족되면 해당 ActionClass의 이벤트를 발생시킨다. |

#### 4.3.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-03-01 | 단계 4 | innerHTML이 설정되지 않은 경우 | innerHTML 비교를 건너뛰고 단계 5로 진행한다. |
| AF-03-02 | 단계 5 | CSS selector가 설정되지 않은 경우 | CSS selector 비교를 건너뛰고 단계 6으로 진행한다. |
| AF-03-03 | 단계 6 | URL 필터가 설정되지 않은 경우 | URL 매칭을 건너뛰고 단계 7로 진행한다. |

#### 4.3.6 예외 흐름 (Exception Flow)

| ID | 조건 | 처리 |
|----|------|------|
| EX-03-01 | CSS selector 파싱 실패 | 해당 ActionClass의 평가를 건너뛰고 다음 ActionClass를 평가한다. 오류를 콘솔에 로깅한다. |
| EX-03-02 | matchesRegex 패턴 실행 중 오류 | 해당 URL 필터를 불일치로 처리하고 평가를 계속한다. |

#### 4.3.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-03-01 | CSS selector 분리 규칙 | CSS selector 문자열 | 점(`.`) 또는 해시(`#`) 기준으로 분리하여 각각 개별적으로 매칭한다. |
| BR-03-02 | 조건 조합 방식 | innerHTML + CSS selector + URL 필터 | 모든 설정된 조건이 AND로 결합된다 (전부 충족해야 이벤트 발생). |
| BR-03-03 | URL 필터 "or" 연결 | 연결자가 "or" | 필터 중 하나라도 일치하면 통과한다. |
| BR-03-04 | URL 필터 "and" 연결 | 연결자가 "and" | 모든 필터가 일치해야 통과한다. |

#### 4.3.8 데이터 요구사항

**입력 데이터:**

| 데이터 | 소스 | 설명 |
|--------|------|------|
| 클릭 이벤트 객체 | 브라우저 DOM | 클릭된 요소의 innerHTML, className, id 등 |
| 현재 URL | `window.location` | 현재 페이지의 URL |
| noCodeConfig | 서버에서 가져온 ActionClass | 매칭 조건 |

**출력 데이터:**

| 데이터 | 설명 |
|--------|------|
| 매칭된 ActionClass ID | 조건이 모두 충족된 ActionClass의 ID |

#### 4.3.9 화면/UI 요구사항

- 해당 없음 (SDK 내부 로직)

#### 4.3.10 비기능 요구사항

- 클릭 이벤트 평가는 클라이언트에서 동기적으로 수행한다 (네트워크 호출 없음).
- 다수의 ActionClass가 등록된 경우에도 브라우저 메인 스레드를 블로킹하지 않아야 한다.

---

### 4.4 설문 트리거 및 확률 기반 표시

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-019-04 |
| 기능명 | 설문 트리거 및 확률 기반 표시 |
| 관련 요구사항 ID | FR-029-04 |
| 우선순위 | 필수 |
| 기능 설명 | 이벤트가 발생하여 설문이 트리거 대상이 된 후, 확률 기반 표시(displayPercentage) 검사를 수행하고 Hidden Fields를 처리한 뒤 위젯 렌더링을 요청한다. |

#### 4.4.2 선행 조건 (Preconditions)

- 이벤트가 발생하여 설문 필터링을 통과한 설문이 1개 이상 존재해야 한다.
- 설문의 displayOption, recontactDays, Segment 필터 등 모든 사전 검사를 통과한 상태여야 한다.

#### 4.4.3 후행 조건 (Postconditions)

- 확률 검사를 통과한 경우: 위젯 렌더링 프로세스가 시작된다.
- 확률 검사를 통과하지 못한 경우: 설문이 표시되지 않는다.

#### 4.4.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | SDK | 트리거 대상 설문의 displayPercentage 설정을 확인한다. |
| 2 | SDK | displayPercentage가 null이 아닌 경우, CSPRNG 기반 보안 난수를 생성한다 (0.00 ~ 100.00 범위). |
| 3 | SDK | 생성된 난수가 displayPercentage 이하인지 판정한다. |
| 4 | SDK | 판정을 통과한 경우, Hidden Fields를 처리한다. |
| 5 | SDK | 위젯 렌더링을 요청한다. |

#### 4.4.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-04-01 | 단계 1 | displayPercentage가 null인 경우 | 확률 검사를 건너뛰고 단계 4로 진행한다 (항상 표시). |
| AF-04-02 | 단계 3 | 난수가 displayPercentage를 초과한 경우 | 설문을 표시하지 않고 프로세스를 종료한다. |

#### 4.4.6 예외 흐름 (Exception Flow)

| ID | 조건 | 처리 |
|----|------|------|
| EX-04-01 | CSPRNG 사용 불가 환경 | 대체 난수 생성 방식을 사용하되, 보안 수준이 낮음을 로깅한다. |

#### 4.4.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-04-01 | 보안 난수 사용 | 확률 판정 시 | 반드시 CSPRNG 기반 난수를 사용한다. |
| BR-04-02 | 확률 정밀도 | 난수 생성 | 소수점 2자리 정밀도 (0.01 ~ 100.00%). |
| BR-04-03 | displayPercentage null | displayPercentage가 null | 확률 검사를 수행하지 않고 항상 표시한다. |
| BR-04-04 | displayPercentage 하한 보정 | 값이 0.01% 미만인 경우 | 0.01%로 보정한다. |
| BR-04-05 | displayPercentage 상한 보정 | 값이 100%를 초과하는 경우 | 100%로 보정한다. |

#### 4.4.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 | 설명 |
|--------|------|------|-----------------|------|
| displayPercentage | number 또는 null | N | null이 아닌 경우 0.01 ~ 100, 소수점 2자리 | 표시 확률 (%) |

**출력 데이터:**

| 데이터 | 설명 |
|--------|------|
| 표시 여부 (boolean) | 확률 검사 통과 여부 |

#### 4.4.9 화면/UI 요구사항

**에디터 UI:**
- displayPercentage 활성화 토글 제공
- 활성화 시 퍼센트 입력 필드 표시 (기본값: 50%)
- 입력 범위: 0.01 ~ 100, 소수점 2자리까지 허용

#### 4.4.10 비기능 요구사항

- NFR-029-02: CSPRNG 기반 보안 난수를 사용해야 한다.

---

### 4.5 위젯 렌더링 및 상태 관리

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-019-05 |
| 기능명 | 위젯 렌더링 및 상태 관리 |
| 관련 요구사항 ID | FR-029-05 |
| 우선순위 | 필수 |
| 기능 설명 | 설문 트리거가 확정된 후, 위젯을 DOM에 렌더링하고 설문 실행 상태(싱글톤)를 관리한다. 프로젝트 설정 오버라이드를 적용하고, delay 설정에 따라 지연 렌더링을 수행한다. |

#### 4.5.2 선행 조건 (Preconditions)

- 설문 트리거 및 확률 기반 표시 검사를 통과한 설문이 있어야 한다.
- 현재 다른 설문이 표시 중이지 않아야 한다 (싱글톤 제약).

#### 4.5.3 후행 조건 (Postconditions)

- 설문 위젯이 DOM에 렌더링된다.
- 설문 실행 상태가 활성(active)으로 설정된다.
- 표시 기록(display record)이 생성된다.

#### 4.5.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | SDK | 현재 설문 실행 상태를 확인한다. 이미 설문이 표시 중이면 새 설문을 스킵한다. |
| 2 | SDK | 설문 실행 상태를 활성(active)으로 설정한다. |
| 3 | SDK | 프로젝트 설정 오버라이드를 적용한다 (브랜드 색상, 강조 테두리 색상, 위치, 클릭 외부 닫기, 오버레이). |
| 4 | SDK | reCAPTCHA가 활성화된 경우 스크립트를 사전 로딩한다. |
| 5 | SDK | delay 설정을 확인한다. delay > 0이면 해당 시간(초 -> 밀리초 변환)만큼 대기한다. |
| 6 | SDK | 설문 위젯을 DOM에 렌더링한다. |
| 7 | SDK | 표시 기록(display record)을 생성하여 표시 기록 배열에 추가한다. |
| 8 | SDK | 설문 필터링을 재실행한다 (다른 설문의 표시 조건 갱신). |

#### 4.5.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-05-01 | 단계 1 | 다른 설문이 이미 표시 중인 경우 | "A survey is already running" 메시지를 로깅하고 프로세스를 종료한다. |
| AF-05-02 | 단계 5 | delay가 0이거나 미설정인 경우 | 대기 없이 즉시 단계 6으로 진행한다. |

#### 4.5.6 예외 흐름 (Exception Flow)

| ID | 조건 | 처리 |
|----|------|------|
| EX-05-01 | delay 대기 중 설문이 닫힌 경우 | 지연 타이머를 정리(clear)하고 렌더링을 취소한다. |
| EX-05-02 | DOM 렌더링 실패 | 설문 실행 상태를 비활성으로 복원하고 오류를 로깅한다. |

#### 4.5.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-05-01 | 싱글톤 제약 | 항상 | 동시에 최대 1개의 설문만 표시할 수 있다. |
| BR-05-02 | delay 단위 변환 | delay 값 적용 시 | 초 단위를 밀리초 단위로 변환한다 (delay * 1000). |
| BR-05-03 | 오버라이드 우선순위 | 설문 오버라이드 vs 프로젝트 설정 | 설문 오버라이드 > 프로젝트 설정 |
| BR-05-04 | 설문 닫기 시 정리 | 설문 닫기 동작 | DOM에서 위젯 제거 + 실행 상태 비활성 + 설문 필터링 재실행 |
| BR-05-05 | 응답 기록 생성 시 | 사용자가 설문에 응답 | 응답 기록을 배열에 추가하고 설문 필터링을 재실행한다. |

#### 4.5.8 데이터 요구사항

**설문 실행 상태:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| isRunning | boolean | 현재 설문 표시 여부 (싱글톤) |
| activeSurveyId | string 또는 null | 현재 표시 중인 설문 ID |

**표시 기록:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| surveyId | string (UUID) | 표시된 설문 ID |
| createdAt | datetime | 표시 일시 |

**응답 기록:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| surveyId | string (UUID) | 응답한 설문 ID |
| createdAt | datetime | 응답 일시 |

#### 4.5.9 화면/UI 요구사항

- 설문 위젯은 프로젝트 설정 또는 설문 오버라이드에 따라 위치(placement)가 결정된다.
- 오버레이 활성화 시 반투명 배경 오버레이를 표시한다.
- 클릭 외부 닫기가 활성화된 경우 오버레이 또는 위젯 외부 클릭 시 설문을 닫는다.

#### 4.5.10 비기능 요구사항

- NFR-029-01: 동시 설문 표시 최대 1개 (싱글톤 제어).
- NFR-029-03: 지연 타이머 스택 관리. 설문 닫기 시 모든 관련 타이머를 정리한다.

---

### 4.6 표시 옵션 (displayOption) 제어

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-019-06 |
| 기능명 | 표시 옵션 (displayOption) 제어 |
| 관련 요구사항 ID | FR-030-01 |
| 우선순위 | 필수 |
| 기능 설명 | 설문의 표시 옵션(displayOnce, displayMultiple, displaySome, respondMultiple)에 따라 해당 설문이 사용자에게 표시될 수 있는지 여부를 판정한다. |

#### 4.6.2 선행 조건 (Preconditions)

- 설문에 displayOption이 설정되어 있어야 한다.
- 사용자의 해당 설문에 대한 표시 기록(displays)과 응답 기록(responses)을 조회할 수 있어야 한다.

#### 4.6.3 후행 조건 (Postconditions)

- 표시 가능 판정: 설문이 다음 필터링 단계로 진행된다.
- 표시 불가 판정: 설문이 필터링에서 제외된다.

#### 4.6.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | SDK | 설문의 displayOption 값을 확인한다. |
| 2 | SDK | 해당 설문에 대한 사용자의 표시 기록 수와 응답 기록 수를 조회한다. |
| 3 | SDK | displayOption에 따른 조건을 평가한다 (아래 비즈니스 규칙 참조). |
| 4 | SDK | 조건 충족 시 설문을 표시 대상으로 유지한다. 미충족 시 필터링에서 제외한다. |

#### 4.6.5 대안 흐름 (Alternative Flow)

- 해당 없음 (모든 분기는 비즈니스 규칙에서 처리)

#### 4.6.6 예외 흐름 (Exception Flow)

| ID | 조건 | 처리 |
|----|------|------|
| EX-06-01 | displayOption 값이 정의되지 않은 경우 | 설문을 표시하지 않고 오류를 로깅한다. |

#### 4.6.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | displayOption | 표시 조건 | 동작 |
|---------|-------------|----------|------|
| BR-06-01 | displayOnce | 해당 설문의 표시 기록이 0건 | 한 번 표시된 후에는 응답 여부와 관계없이 다시 표시하지 않는다. |
| BR-06-02 | displayMultiple | 해당 설문의 응답 기록이 0건 | 응답하기 전까지 트리거마다 반복 표시한다. 응답하면 더 이상 표시하지 않는다. |
| BR-06-03 | displaySome | 표시 횟수 < displayLimit AND 응답 기록이 0건 | displayLimit 횟수까지 표시한다. 응답하면 중지한다. |
| BR-06-04 | respondMultiple | 항상 true | 응답 여부와 관계없이 항상 표시한다. (예: 피드백 박스) |

#### 4.6.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 | 설명 |
|--------|------|------|-----------------|------|
| displayOption | enum | Y | "displayOnce", "displayMultiple", "displaySome", "respondMultiple" | 표시 옵션 |
| displayLimit | integer | 조건부 | displayOption이 "displaySome"인 경우 필수, 최소값 1 | 최대 표시 횟수 |
| displays | array | Y | - | 사용자의 해당 설문 표시 기록 배열 |
| responses | array | Y | - | 사용자의 해당 설문 응답 기록 배열 |

**출력 데이터:**

| 데이터 | 타입 | 설명 |
|--------|------|------|
| isEligible | boolean | 표시 가능 여부 |

**판정 로직 의사코드:**

```
function checkDisplayOption(survey, displays, responses):
  switch (survey.displayOption):
    case "displayOnce":
      return displays.length === 0
    case "displayMultiple":
      return responses.length === 0
    case "displaySome":
      return displays.length < survey.displayLimit AND responses.length === 0
    case "respondMultiple":
      return true
    default:
      log.error("Unknown displayOption")
      return false
```

#### 4.6.9 화면/UI 요구사항

**에디터 UI - 표시 옵션 설정:**
- 4가지 표시 옵션을 라디오 버튼 또는 드롭다운으로 제공한다.
- displaySome 선택 시 최대 표시 횟수(displayLimit) 입력 필드를 표시한다.
- displayLimit의 최소값은 1이다.

#### 4.6.10 비기능 요구사항

- NFR-030-01: 표시 옵션 필터링은 클라이언트에서 동기적으로 수행한다 (네트워크 호출 없음).

---

### 4.7 재접촉 대기일 설정

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-019-07 |
| 기능명 | 재접촉 대기일 설정 |
| 관련 요구사항 ID | FR-030-02 |
| 우선순위 | 필수 |
| 기능 설명 | 마지막 설문 표시 이후 경과한 일수를 기준으로 설문 표시 여부를 결정한다. 설문 수준과 프로젝트 수준의 재접촉 대기일을 지원하며, 설문 수준이 우선한다. |

#### 4.7.2 선행 조건 (Preconditions)

- 프로젝트 수준의 재접촉 대기일 설정이 존재해야 한다.
- 사용자의 마지막 설문 표시 일시를 조회할 수 있어야 한다.

#### 4.7.3 후행 조건 (Postconditions)

- 대기일 조건 충족: 설문이 표시 대상으로 유지된다.
- 대기일 조건 미충족: 설문이 필터링에서 제외된다.

#### 4.7.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | SDK | 설문의 recontactDays 설정을 확인한다. |
| 2 | SDK | recontactDays가 null이 아닌 경우, 해당 값을 사용한다. null인 경우 프로젝트의 recontactDays를 사용한다. |
| 3 | SDK | 적용할 recontactDays가 결정되면, 사용자의 마지막 설문 표시 일시를 조회한다. |
| 4 | SDK | 현재 시간과 마지막 표시 일시의 차이를 일 단위로 계산한다 (절대값 기반, 소수점 이하 버림). |
| 5 | SDK | 경과 일수가 recontactDays 이상이면 표시 대상으로 유지한다. 미만이면 필터링에서 제외한다. |

#### 4.7.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-07-01 | 단계 2 | 설문 recontactDays가 0인 경우 (ignore) | 재접촉 대기일 검사를 건너뛰고 항상 표시 대상으로 유지한다. |
| AF-07-02 | 단계 2 | 설문 recontactDays가 null이고 프로젝트 recontactDays도 미설정인 경우 | 재접촉 대기일 검사를 건너뛰고 항상 표시 대상으로 유지한다. |
| AF-07-03 | 단계 3 | 표시 기록이 없는 경우 (마지막 표시 일시 없음) | 재접촉 대기일 검사를 건너뛰고 표시 대상으로 유지한다. |

#### 4.7.6 예외 흐름 (Exception Flow)

| ID | 조건 | 처리 |
|----|------|------|
| EX-07-01 | 날짜 계산 오류 (잘못된 일시 형식 등) | 보수적으로 처리하여 설문을 표시하지 않고 오류를 로깅한다. |

#### 4.7.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-07-01 | 우선순위 | 설문 recontactDays vs 프로젝트 recontactDays | 설문 수준의 recontactDays가 null이 아닌 경우 우선 적용한다. |
| BR-07-02 | null 의미 | 설문 recontactDays = null | 프로젝트 설정의 recontactDays를 사용한다 (respect). |
| BR-07-03 | 0 의미 | 설문 recontactDays = 0 | 글로벌 대기 시간을 무시한다 (ignore). 즉시 표시 가능하다. |
| BR-07-04 | 날짜 차이 계산 | 경과 일수 산출 | 절대값 기반 일 단위 계산, 소수점 이하 버림 (Math.floor). |
| BR-07-05 | 유효 범위 | 설문 recontactDays 값 (0 제외) | 1 ~ 365일. |

**에디터 UI 옵션 매핑:**

| 옵션 ID | 설명 | recontactDays 값 |
|---------|------|-----------------|
| respect | 글로벌 대기 시간 존중 | null |
| ignore | 글로벌 대기 시간 무시 | 0 |
| overwrite | 커스텀 대기 시간 | 1 ~ 365 (일 단위) |

**판정 로직 의사코드:**

```
function checkRecontactDays(survey, project, lastDisplayAt):
  // recontactDays 결정
  let days = survey.recontactDays
  if (days === null):
    days = project.recontactDays
  if (days === null || days === undefined):
    return true  // 둘 다 미설정 -> 항상 표시
  if (days === 0):
    return true  // ignore -> 항상 표시

  // 마지막 표시 기록이 없으면 표시 가능
  if (lastDisplayAt === null):
    return true

  // 경과 일수 계산
  let diffMs = Math.abs(now - lastDisplayAt)
  let diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  return diffDays >= days
```

#### 4.7.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 | 설명 |
|--------|------|------|-----------------|------|
| survey.recontactDays | integer 또는 null | N | null 또는 0 ~ 365 | 설문 수준 재접촉 대기일 |
| project.recontactDays | integer 또는 null | N | null 또는 0 ~ 365 | 프로젝트 수준 재접촉 대기일 |
| lastDisplayAt | datetime 또는 null | N | - | 마지막 설문 표시 일시 |

**출력 데이터:**

| 데이터 | 타입 | 설명 |
|--------|------|------|
| isEligible | boolean | 재접촉 대기일 조건 충족 여부 |

#### 4.7.9 화면/UI 요구사항

**에디터 UI - 재접촉 대기일 설정:**
- 3가지 옵션(respect, ignore, overwrite)을 라디오 버튼으로 제공한다.
- overwrite 선택 시 일 수 입력 필드를 표시한다 (1 ~ 365 범위).
- 프로젝트 설정 화면에서 기본 재접촉 대기일을 설정할 수 있다.

#### 4.7.10 비기능 요구사항

- NFR-030-02: 날짜 계산은 일 단위(소수점 이하 버림)로 수행한다.

---

### 4.8 Segment 기반 필터링

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-019-08 |
| 기능명 | Segment 기반 필터링 |
| 관련 요구사항 ID | FR-030-03 |
| 우선순위 | 필수 |
| 기능 설명 | 사용자의 식별 상태와 Segment 소속 여부에 따라 설문 표시 대상을 필터링한다. Segment 평가는 서버에서 수행되며, 클라이언트에는 Segment ID 배열로 전달된다. |

#### 4.8.2 선행 조건 (Preconditions)

- SDK가 서버로부터 설문 목록과 사용자의 Segment ID 배열을 수신한 상태여야 한다.
- 각 설문에 연결된 Segment 정보가 포함되어 있어야 한다.

#### 4.8.3 후행 조건 (Postconditions)

- 사용자가 속한 Segment에 연결된 설문만 표시 대상으로 유지된다.
- Segment 조건에 맞지 않는 설문은 필터링에서 제외된다.

#### 4.8.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | SDK | 사용자의 식별 상태를 확인한다. |
| 2 | SDK | 설문에 Segment 필터가 설정되어 있는지 확인한다. |
| 3 | SDK | 식별된 사용자인 경우, 사용자가 속한 Segment ID 배열과 설문에 연결된 Segment를 비교한다. |
| 4 | SDK | 사용자가 해당 Segment에 속한 경우 설문을 표시 대상으로 유지한다. |

#### 4.8.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-08-01 | 단계 1 | 미식별 사용자인 경우 | Segment 필터가 있는 설문을 모두 제외한다. Segment 필터가 없는 설문만 표시 대상으로 유지한다. |
| AF-08-02 | 단계 2 | 설문에 Segment 필터가 없는 경우 | Segment 검사를 건너뛰고 표시 대상으로 유지한다. |
| AF-08-03 | 단계 3 | 식별된 사용자이지만 어떤 Segment에도 속하지 않는 경우 | Segment 필터가 있는 모든 설문을 제외한다. |

#### 4.8.6 예외 흐름 (Exception Flow)

| ID | 조건 | 처리 |
|----|------|------|
| EX-08-01 | Segment ID 배열 조회 실패 | 보수적으로 처리하여 Segment 필터가 있는 설문을 제외한다. |

#### 4.8.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-08-01 | 미식별 사용자 제한 | 사용자가 미식별 상태 | Segment 필터가 있는 설문은 표시하지 않는다. |
| BR-08-02 | Segment 미소속 | 식별 사용자이나 Segment에 소속되지 않음 | Segment 필터가 있는 모든 설문을 표시하지 않는다. |
| BR-08-03 | Segment 소속 확인 | 식별 사용자 + Segment 소속 | 사용자가 속한 Segment에 연결된 설문만 표시한다. |
| BR-08-04 | Segment 평가 위치 | 서버 | Segment 평가는 서버에서 수행하여 Segment ID 배열로 클라이언트에 전달한다. |

#### 4.8.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| isIdentified | boolean | Y | 사용자 식별 상태 |
| userSegmentIds | array of string (UUID) | N | 사용자가 속한 Segment ID 배열 |
| survey.segmentId | string (UUID) 또는 null | N | 설문에 연결된 Segment ID |

**판정 로직 의사코드:**

```
function checkSegment(user, survey):
  // Segment 필터가 없는 설문은 항상 통과
  if (survey.segmentId === null):
    return true

  // 미식별 사용자는 Segment 필터가 있는 설문 제외
  if (!user.isIdentified):
    return false

  // 식별 사용자이지만 Segment 미소속
  if (user.segmentIds.length === 0):
    return false

  // Segment 소속 확인
  return user.segmentIds.includes(survey.segmentId)
```

#### 4.8.9 화면/UI 요구사항

- 해당 없음 (SDK 내부 필터링 로직)

#### 4.8.10 비기능 요구사항

- NFR-030-03: Segment 평가는 서버에서 미리 수행하여 Segment ID 배열로 전달한다.
- NFR-030-01: 클라이언트에서의 Segment 필터링은 동기적으로 수행한다 (네트워크 호출 없음).

---

### 4.9 Segment 필터 타입 및 연산자

#### 4.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-019-09 |
| 기능명 | Segment 필터 타입 및 연산자 |
| 관련 요구사항 ID | FR-030-04 |
| 우선순위 | 필수 |
| 기능 설명 | Segment를 구성하는 4가지 필터 유형(attribute, person, segment, device)과 각 유형에 적용 가능한 연산자를 정의한다. 필터들은 "and" 또는 "or" 연결자로 결합된다. |

#### 4.9.2 선행 조건 (Preconditions)

- Segment 관리 화면에 접근 가능해야 한다.

#### 4.9.3 후행 조건 (Postconditions)

- Segment 필터가 설정되어 서버에서 사용자 평가에 사용된다.

#### 4.9.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Survey Creator | Segment 관리 화면에서 필터를 추가한다. |
| 2 | 시스템 | 필터 유형(attribute, person, segment, device)을 선택할 수 있는 UI를 제공한다. |
| 3 | Survey Creator | 필터 유형을 선택하고 조건(연산자, 값)을 설정한다. |
| 4 | Survey Creator | 추가 필터가 필요한 경우 연결자(and/or)를 선택하고 필터를 추가한다. |
| 5 | 시스템 | 설정된 필터를 저장하고, 서버에서 사용자 평가에 사용할 수 있도록 한다. |

#### 4.9.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-09-01 | 단계 4 | 추가 필터 없음 | 단계 5로 진행한다. |

#### 4.9.6 예외 흐름 (Exception Flow)

| ID | 조건 | 처리 |
|----|------|------|
| EX-09-01 | 참조된 Segment가 삭제된 경우 (segment 필터) | 해당 필터 조건을 무효화하고 관리자에게 알림을 표시한다. |

#### 4.9.7 비즈니스 규칙 (Business Rules)

**필터 유형별 정의:**

| 규칙 ID | 필터 유형 | 설명 | 기준 |
|---------|----------|------|------|
| BR-09-01 | Attribute 필터 | Contact 속성 기반 | 속성 키와 값으로 비교 |
| BR-09-02 | Person 필터 | Contact 기본 속성 기반 | 식별자와 값으로 비교 |
| BR-09-03 | Segment 필터 | 다른 세그먼트 포함/미포함 | 세그먼트 ID 기준 |
| BR-09-04 | Device 필터 | 디바이스 유형 기반 | 디바이스 유형으로 비교 |

**연산자 분류:**

| 규칙 ID | 카테고리 | 연산자 |
|---------|----------|--------|
| BR-09-05 | Base Operators | lessThan, lessEqual, greaterThan, greaterEqual, equals, notEquals |
| BR-09-06 | String Operators | contains, doesNotContain, startsWith, endsWith |
| BR-09-07 | Date Operators | isOlderThan, isNewerThan, isBefore, isAfter, isBetween, isSameDay, isSet, isNotSet |
| BR-09-08 | Segment Operators | userIsIn, userIsNotIn |
| BR-09-09 | Device Operators | equals, notEquals |
| BR-09-10 | Person Operators | equals, notEquals, isSet, isNotSet, contains, doesNotContain, startsWith, endsWith |

**필터 연결 규칙:**

| 규칙 ID | 규칙 | 설명 |
|---------|------|------|
| BR-09-11 | 첫 번째 필터 연결자 | 첫 번째 필터의 연결자는 null (시작점)이다. |
| BR-09-12 | 후속 필터 연결자 | 두 번째 필터부터 "and" 또는 "or" 연결자를 반드시 지정해야 한다. |

#### 4.9.8 데이터 요구사항

**Segment 필터 객체:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 | 설명 |
|--------|------|------|-----------------|------|
| id | string (UUID) | Y | 자동 생성 | 필터 고유 ID |
| type | enum | Y | "attribute", "person", "segment", "device" | 필터 유형 |
| operator | enum | Y | 해당 유형에 허용된 연산자 중 하나 | 비교 연산자 |
| value | any | 조건부 | 연산자에 따라 다름 | 비교 대상 값 |
| connector | enum 또는 null | Y | "and", "or", null(첫 번째 필터) | 필터 연결자 |
| qualifier | string | 조건부 | attribute/person 필터 시 필수 | 속성 키 또는 식별자 |

#### 4.9.9 화면/UI 요구사항

- Segment 에디터에서 필터 추가/삭제/편집 UI를 제공한다.
- 필터 유형별로 사용 가능한 연산자 드롭다운을 동적으로 변경한다.
- 필터 간 연결자(and/or)를 시각적으로 표시한다.

#### 4.9.10 비기능 요구사항

- NFR-030-03: Segment 평가는 서버에서 수행한다.

---

### 4.10 자동 닫기 (autoClose)

#### 4.10.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-019-10 |
| 기능명 | 자동 닫기 (autoClose) |
| 관련 요구사항 ID | FR-030-05 |
| 우선순위 | 필수 |
| 기능 설명 | 설문이 표시된 후 설정된 시간(초) 동안 사용자 상호작용이 없으면 자동으로 설문을 닫는다. |

#### 4.10.2 선행 조건 (Preconditions)

- 설문 위젯이 DOM에 렌더링된 상태여야 한다.
- 설문에 autoClose가 활성화(null이 아닌 값)되어 있어야 한다.

#### 4.10.3 후행 조건 (Postconditions)

- autoClose 시간이 경과한 경우: 설문이 자동으로 닫히고 설문 실행 상태가 비활성으로 전환된다.
- 사용자가 상호작용한 경우: autoClose 타이머가 취소되고 설문이 유지된다.

#### 4.10.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | SDK | 설문 렌더링 완료 후 autoClose 값을 확인한다. |
| 2 | SDK | autoClose가 null이 아닌 경우, 해당 시간(초)의 타이머를 시작한다. |
| 3 | SDK | 타이머 만료 시 설문을 자동으로 닫는다 (DOM 제거 + 실행 상태 비활성 + 필터링 재실행). |

#### 4.10.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-10-01 | 단계 1 | autoClose가 null인 경우 | 자동 닫기를 적용하지 않는다. |
| AF-10-02 | 단계 2-3 사이 | 사용자가 설문과 상호작용한 경우 | autoClose 타이머를 취소한다. |

#### 4.10.6 예외 흐름 (Exception Flow)

| ID | 조건 | 처리 |
|----|------|------|
| EX-10-01 | 타이머 실행 중 페이지 이동 | 타이머를 정리(clear)한다. |

#### 4.10.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-10-01 | 기본값 | autoClose 활성화 시 | 10초 |
| BR-10-02 | 비활성화 | autoClose = null | 자동 닫기를 수행하지 않는다. |
| BR-10-03 | 최소값 | autoClose 설정 시 | 1초 (1 미만의 값은 허용하지 않는다). |
| BR-10-04 | 사용자 상호작용 | 사용자가 설문과 상호작용 시작 | autoClose 타이머를 취소한다. |

#### 4.10.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 | 설명 |
|--------|------|------|-----------------|------|
| autoClose | integer 또는 null | N | null 또는 1 이상의 정수 | 자동 닫기 시간 (초) |

#### 4.10.9 화면/UI 요구사항

- 에디터에서 autoClose 활성화 토글을 제공한다.
- 활성화 시 시간(초) 입력 필드를 표시한다 (기본값: 10초, 최소값: 1초).

#### 4.10.10 비기능 요구사항

- NFR-029-03: autoClose 타이머는 설문 닫기 시 반드시 정리되어야 한다.

---

### 4.11 표시 지연 (delay)

#### 4.11.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-019-11 |
| 기능명 | 표시 지연 (delay) |
| 관련 요구사항 ID | FR-030-06 |
| 우선순위 | 필수 |
| 기능 설명 | 트리거 발생 후 설문이 실제로 화면에 표시되기까지 지연 시간을 설정한다. |

#### 4.11.2 선행 조건 (Preconditions)

- 설문 트리거가 발생하여 위젯 렌더링 단계에 진입한 상태여야 한다.

#### 4.11.3 후행 조건 (Postconditions)

- delay 시간 경과 후 설문 위젯이 렌더링된다.
- delay가 0인 경우 즉시 렌더링된다.

#### 4.11.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | SDK | 설문의 delay 값을 확인한다. |
| 2 | SDK | delay > 0인 경우, delay 초를 밀리초로 변환한다 (delay * 1000). |
| 3 | SDK | 변환된 밀리초만큼 대기한다. |
| 4 | SDK | 대기 완료 후 설문 위젯을 렌더링한다. |

#### 4.11.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-11-01 | 단계 1 | delay가 0이거나 미설정인 경우 | 대기 없이 즉시 렌더링한다. |

#### 4.11.6 예외 흐름 (Exception Flow)

| ID | 조건 | 처리 |
|----|------|------|
| EX-11-01 | delay 대기 중 다른 설문이 트리거된 경우 | 싱글톤 제약에 의해 새 설문은 스킵된다. 기존 지연 대기가 계속 진행된다. |
| EX-11-02 | delay 대기 중 페이지 이동 | 지연 타이머를 정리(clear)하고 렌더링을 취소한다. |

#### 4.11.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-11-01 | 기본값 | delay 활성화 시 | 5초 |
| BR-11-02 | 비활성화 | delay = 0 | 즉시 표시 (지연 없음). |
| BR-11-03 | 단위 변환 | delay 적용 시 | 초 -> 밀리초 변환 (delay * 1000). |

#### 4.11.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 | 설명 |
|--------|------|------|-----------------|------|
| delay | number | N | 0 이상의 정수 | 표시 지연 시간 (초), 기본값 0 |

#### 4.11.9 화면/UI 요구사항

- 에디터에서 delay 활성화 토글을 제공한다.
- 활성화 시 시간(초) 입력 필드를 표시한다 (기본값: 5초).

#### 4.11.10 비기능 요구사항

- NFR-029-03: delay 타이머는 설문 닫기 또는 페이지 이동 시 반드시 정리되어야 한다.

---

### 4.12 확률 기반 표시 (displayPercentage)

#### 4.12.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-019-12 |
| 기능명 | 확률 기반 표시 (displayPercentage) |
| 관련 요구사항 ID | FR-030-07 |
| 우선순위 | 필수 |
| 기능 설명 | 설문 트리거 시 설정된 확률(%)에 따라 설문 표시 여부를 결정한다. 보안 난수 생성기(CSPRNG)를 사용하여 공정한 확률 판정을 수행한다. |

#### 4.12.2 선행 조건 (Preconditions)

- 설문에 displayPercentage가 설정되어 있어야 한다 (null이 아닌 경우).

#### 4.12.3 후행 조건 (Postconditions)

- 확률 판정 통과: 설문이 표시된다.
- 확률 판정 실패: 설문이 표시되지 않는다.

#### 4.12.4 기본 흐름 (Basic Flow)

FN-019-04 (설문 트리거 및 확률 기반 표시)의 기본 흐름에서 상세 기술함. 본 항목은 설정 및 검증 규칙에 초점을 둔다.

#### 4.12.5 대안 흐름 (Alternative Flow)

- FN-019-04 참조

#### 4.12.6 예외 흐름 (Exception Flow)

- FN-019-04 참조

#### 4.12.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-12-01 | 기본값 | displayPercentage 활성화 시 | 50% |
| BR-12-02 | 비활성화 | displayPercentage = null | 확률 검사 없이 항상 표시한다. |
| BR-12-03 | 입력 범위 | displayPercentage 값 | 0.01 ~ 100, 소수점 2자리. |
| BR-12-04 | 하한 보정 | 값 < 0.01 | 0.01%로 보정한다. |
| BR-12-05 | 상한 보정 | 값 > 100 | 100%로 보정한다. |
| BR-12-06 | 난수 생성 | 확률 판정 시 | CSPRNG 기반 보안 난수를 사용한다. |

#### 4.12.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 | 설명 |
|--------|------|------|-----------------|------|
| displayPercentage | number 또는 null | N | null 또는 0.01 ~ 100, 소수점 2자리 | 표시 확률 (%) |

#### 4.12.9 화면/UI 요구사항

- FN-019-04의 화면/UI 요구사항 참조

#### 4.12.10 비기능 요구사항

- NFR-029-02: CSPRNG 기반 보안 난수를 사용해야 한다.

---

### 4.13 프로젝트 수준 설문 오버라이드

#### 4.13.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-019-13 |
| 기능명 | 프로젝트 수준 설문 오버라이드 |
| 관련 요구사항 ID | FR-030-08 |
| 우선순위 | 필수 |
| 기능 설명 | 개별 설문에서 프로젝트 수준의 기본 설정을 오버라이드할 수 있다. 오버라이드 가능한 항목은 브랜드 색상, 강조 테두리 색상, 위치(placement), 클릭 외부 닫기, 오버레이이다. |

#### 4.13.2 선행 조건 (Preconditions)

- 프로젝트 수준의 기본 설정이 존재해야 한다.

#### 4.13.3 후행 조건 (Postconditions)

- 설문별 오버라이드 설정이 저장되어 위젯 렌더링 시 적용된다.

#### 4.13.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Survey Creator | 설문 에디터에서 오버라이드 항목을 설정한다. |
| 2 | 시스템 | 설정된 오버라이드 값을 설문 데이터에 저장한다. |
| 3 | SDK | 위젯 렌더링 시 설문 오버라이드 값이 있으면 프로젝트 설정 대신 적용한다. |

#### 4.13.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-13-01 | 단계 3 | 설문에 오버라이드가 설정되지 않은 경우 | 프로젝트 기본 설정을 사용한다. |

#### 4.13.6 예외 흐름 (Exception Flow)

- 해당 없음

#### 4.13.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-13-01 | 오버라이드 우선순위 | 설문 오버라이드 vs 프로젝트 설정 | 설문 오버라이드 > 프로젝트 설정 |

**오버라이드 가능 항목:**

| 항목 | 타입 | 설명 |
|------|------|------|
| 브랜드 색상 | string (hex color) | 설문 위젯의 기본 색상 |
| 강조 테두리 색상 | string (hex color) | 설문 위젯의 강조 테두리 색상 |
| 위치 (placement) | enum | 설문 위젯의 화면 내 위치 |
| 클릭 외부 닫기 | boolean | 위젯 외부 클릭 시 설문 닫기 여부 |
| 오버레이 | boolean | 반투명 배경 오버레이 표시 여부 |

#### 4.13.8 데이터 요구사항

**설문 오버라이드 객체:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 | 설명 |
|--------|------|------|-----------------|------|
| brandColor | string 또는 null | N | 유효한 hex color 코드 | 브랜드 색상 오버라이드 |
| highlightBorderColor | string 또는 null | N | 유효한 hex color 코드 | 강조 테두리 색상 오버라이드 |
| placement | enum 또는 null | N | 유효한 placement 값 | 위치 오버라이드 |
| clickOutsideClose | boolean 또는 null | N | - | 클릭 외부 닫기 오버라이드 |
| overlay | boolean 또는 null | N | - | 오버레이 오버라이드 |

#### 4.13.9 화면/UI 요구사항

- 설문 에디터 내 "디자인/외형" 설정 섹션에서 오버라이드 항목을 제공한다.
- 각 항목에 "프로젝트 설정 사용" / "커스텀 설정" 토글을 제공한다.

#### 4.13.10 비기능 요구사항

- 해당 없음

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

| 엔티티 | 설명 |
|--------|------|
| ActionClass | 설문 트리거의 기본 단위 (code / noCode) |
| Survey | 설문 데이터 (displayOption, recontactDays, autoClose, delay, displayPercentage, displayLimit 포함) |
| Segment | 사용자 분류 그룹 |
| SegmentFilter | Segment를 구성하는 필터 조건 (attribute, person, segment, device) |
| DisplayRecord | 설문 표시 기록 |
| ResponseRecord | 설문 응답 기록 |
| Project | 프로젝트 설정 (기본 recontactDays, 브랜드 설정 등) |
| Environment | ActionClass가 소속된 환경 |

### 5.2 엔티티 간 관계

```
Project (1) --- (*) Environment
Environment (1) --- (*) ActionClass
Survey (*) --- (*) ActionClass  (트리거 연결)
Survey (*) --- (0..1) Segment  (타게팅)
Segment (1) --- (*) SegmentFilter
Survey (1) --- (*) DisplayRecord
Survey (1) --- (*) ResponseRecord
Project (1) --- (*) Survey
```

### 5.3 데이터 흐름

```
[서버]
  1. ActionClass 목록 조회
  2. Survey 목록 조회 (displayOption, recontactDays, autoClose, delay, displayPercentage 포함)
  3. 사용자 Segment 평가 -> Segment ID 배열 생성
  4. DisplayRecord / ResponseRecord 조회
  5. 위 데이터를 SDK에 전달

[SDK (클라이언트)]
  1. 이벤트 감지 (Code Action / NoCode Action)
  2. ActionClass 매칭
  3. 설문 필터링:
     a. Segment 기반 필터링
     b. displayOption 필터링
     c. recontactDays 필터링
  4. 확률 기반 표시 (displayPercentage)
  5. 지연 대기 (delay)
  6. 위젯 렌더링 (오버라이드 적용)
  7. 자동 닫기 (autoClose)
  8. 표시/응답 기록 갱신 -> 필터링 재실행
```

---

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 연동 대상 | 방향 | 설명 |
|----------|------|------|
| SDK <-> 서버 API | 양방향 | 설문 목록, ActionClass, Segment ID 배열, DisplayRecord/ResponseRecord 동기화 |
| reCAPTCHA | SDK -> 외부 | reCAPTCHA 활성화 시 스크립트 사전 로딩 및 검증 |

### 6.2 API 명세 (해당 시)

**SDK 제공 메서드:**

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| track | `track(actionKey: string): void` | Code Action을 트리거한다. actionKey에 해당하는 ActionClass가 있으면 연결된 설문을 평가한다. |

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| ID | 항목 | 기준 |
|----|------|------|
| NFR-029-01 | 동시 설문 표시 | 최대 1개 (싱글톤 제어) |
| NFR-030-01 | 필터링 성능 | 클라이언트에서 동기적으로 수행 (네트워크 호출 없음) |

### 7.2 보안 요구사항

| ID | 항목 | 기준 |
|----|------|------|
| NFR-029-02 | 난수 보안성 | CSPRNG 기반 보안 난수 사용 |

### 7.3 가용성 요구사항

| ID | 항목 | 기준 |
|----|------|------|
| NFR-029-03 | 메모리 관리 | 지연 타이머 스택 관리, 설문 닫기 시 정리 |
| NFR-030-02 | 날짜 계산 정밀도 | 일 단위 (소수점 이하 버림) |
| NFR-030-03 | Segment 평가 | 서버에서 미리 평가하여 Segment ID 배열로 전달 |

---

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| 항목 | 설명 |
|------|------|
| 싱글톤 설문 표시 | 동시에 1개의 설문만 표시할 수 있다. |
| 클라이언트 필터링 | 설문 필터링(displayOption, recontactDays)은 클라이언트에서 동기적으로 수행한다. |
| CSPRNG 의존 | 확률 기반 표시에 브라우저의 `crypto.getRandomValues()` API를 사용한다. |
| Segment 서버 평가 | Segment 필터 평가는 서버에서만 수행한다. 클라이언트에서는 평가 결과(Segment ID 배열)만 사용한다. |

### 8.2 비즈니스 제약사항

| 항목 | 값 |
|------|------|
| autoClose 기본값 | 10초 |
| autoClose 최소값 | 1초 |
| delay 기본값 | 5초 |
| displayPercentage 기본값 | 50% |
| displayPercentage 범위 | 0.01 ~ 100 (소수점 2자리) |
| 재접촉 대기일 범위 | 1 ~ 365일 |
| displayLimit 최소값 | 1 |
| URL 필터 규칙 | 7가지 |
| NoCode 이벤트 유형 | 4가지 |
| Segment 필터 유형 | 4가지 |
| 표시 옵션 유형 | 4가지 |
| 동시 설문 수 | 1개 |
| Link Survey | 트리거/재노출 설정 카드 모두 숨김 |

### 8.3 가정사항

| 항목 | 설명 |
|------|------|
| SDK 초기화 | SDK가 정상적으로 초기화되어 서버로부터 설문 및 ActionClass 데이터를 수신한 상태를 가정한다. |
| 브라우저 지원 | CSPRNG(`crypto.getRandomValues()`)를 지원하는 모던 브라우저 환경을 가정한다. |
| 서버 동기화 | 표시 기록 및 응답 기록이 서버와 정상적으로 동기화되는 것을 가정한다. |
| 사용자 식별 | 사용자 식별 메커니즘은 FSD-020에서 별도로 정의되며, 본 명세에서는 식별 결과(식별/미식별)만 사용한다. |

---

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 요구사항 설명 | 기능 ID | 기능명 | 수용 기준 |
|------------|-------------|---------|--------|----------|
| FR-029-01 | ActionClass 타입 정의 | FN-019-01 | ActionClass 타입 정의 및 관리 | AC-029-01 |
| FR-029-02 | NoCode 이벤트 구성 | FN-019-02 | NoCode 이벤트 구성 | AC-029-02, AC-029-03, AC-029-04, AC-030-14, AC-030-15 |
| FR-029-03 | Click 이벤트 평가 | FN-019-03 | Click 이벤트 평가 | AC-029-02 |
| FR-029-04 | 설문 트리거 및 위젯 렌더링 | FN-019-04 | 설문 트리거 및 확률 기반 표시 | AC-029-05 |
| FR-029-05 | 위젯 렌더링 상세 | FN-019-05 | 위젯 렌더링 및 상태 관리 | AC-029-06, AC-029-07 |
| FR-030-01 | 표시 옵션 4가지 유형 | FN-019-06 | 표시 옵션 (displayOption) 제어 | AC-030-01, AC-030-02, AC-030-03, AC-030-04, AC-030-05, AC-030-06 |
| FR-030-02 | 재접촉 대기일 설정 | FN-019-07 | 재접촉 대기일 설정 | AC-030-07, AC-030-08, AC-030-09, AC-030-10 |
| FR-030-03 | Segment 기반 필터링 | FN-019-08 | Segment 기반 필터링 | AC-030-11, AC-030-12, AC-030-13 |
| FR-030-04 | Segment 필터 타입 정의 | FN-019-09 | Segment 필터 타입 및 연산자 | AC-030-11, AC-030-12, AC-030-13 |
| FR-030-05 | 자동 닫기 (autoClose) | FN-019-10 | 자동 닫기 (autoClose) | - |
| FR-030-06 | 표시 지연 (delay) | FN-019-11 | 표시 지연 (delay) | AC-029-06 |
| FR-030-07 | 확률 기반 표시 (displayPercentage) | FN-019-12 | 확률 기반 표시 (displayPercentage) | AC-029-05 |
| FR-030-08 | 프로젝트 수준 설문 오버라이드 | FN-019-13 | 프로젝트 수준 설문 오버라이드 | - |

### 9.2 수용 기준 매트릭스

| AC-ID | 시나리오 | 기대 결과 | 관련 기능 |
|-------|----------|----------|----------|
| AC-029-01 | Code Action `track("purchase")` 호출 | 해당 ActionClass에 연결된 설문이 트리거됨 | FN-019-01, FN-019-04 |
| AC-029-02 | NoCode click 이벤트 (CSS selector 일치) | 설문이 표시됨 | FN-019-02, FN-019-03 |
| AC-029-03 | NoCode pageView 이벤트 (URL 필터 일치) | 설문이 표시됨 | FN-019-02 |
| AC-029-04 | NoCode exitIntent 이벤트 | 마우스 화면 이탈 시 설문 표시 | FN-019-02 |
| AC-029-05 | displayPercentage 50% 설정 | 약 50%의 트리거에서만 설문 표시 | FN-019-04, FN-019-12 |
| AC-029-06 | delay 5초 설정 | 트리거 후 5초 대기 후 설문 표시 | FN-019-05, FN-019-11 |
| AC-029-07 | 다른 설문이 이미 표시 중 | 새 설문 스킵 ("A survey is already running") | FN-019-05 |
| AC-030-01 | displayOnce 설정 + 1회 표시 후 | 다시 표시되지 않음 | FN-019-06 |
| AC-030-02 | displayMultiple + 미응답 상태 | 트리거마다 반복 표시 | FN-019-06 |
| AC-030-03 | displayMultiple + 응답 완료 | 더 이상 표시되지 않음 | FN-019-06 |
| AC-030-04 | displaySome (limit=3) + 2회 표시 | 1회 더 표시 가능 | FN-019-06 |
| AC-030-05 | displaySome (limit=3) + 3회 표시 | 더 이상 표시되지 않음 | FN-019-06 |
| AC-030-06 | respondMultiple 설정 | 응답 후에도 계속 표시 | FN-019-06 |
| AC-030-07 | 재접촉 대기일 = 7 + 마지막 표시 3일 전 | 설문 미표시 | FN-019-07 |
| AC-030-08 | 재접촉 대기일 = 7 + 마지막 표시 8일 전 | 설문 표시 | FN-019-07 |
| AC-030-09 | 재접촉 대기일 = null (respect) | 프로젝트 설정의 재접촉 대기일 사용 | FN-019-07 |
| AC-030-10 | 재접촉 대기일 = 0 (ignore) | 대기 시간 없이 즉시 표시 가능 | FN-019-07 |
| AC-030-11 | 미식별 사용자 + Segment 필터가 있는 설문 | 해당 설문 미표시 | FN-019-08 |
| AC-030-12 | 식별된 사용자 + 해당 Segment 미소속 | 해당 설문 미표시 | FN-019-08 |
| AC-030-13 | 식별된 사용자 + Segment 소속 | 해당 설문 표시 대상 | FN-019-08 |
| AC-030-14 | URL 필터 "and" 연결 + 일부만 일치 | 이벤트 미발생 | FN-019-02, FN-019-03 |
| AC-030-15 | URL 필터 "or" 연결 + 일부 일치 | 이벤트 발생 | FN-019-02, FN-019-03 |

### 9.3 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-02-21 | 초안 작성 | - |
