# 타게팅, 트리거 및 재노출 — 요구사항 명세서

> **문서번호**: FSD-019 | **FR 범위**: FR-029 ~ FR-030
> **라이선스**: Community

---

## 1. 목적/배경

App Survey(인앱 설문)는 사용자의 행동(action)에 반응하여 적시에 설문을 표시하는 것이 핵심이다. 이를 위해 Formbricks는 ActionClass 기반 트리거 시스템, Segment 기반 타게팅, 그리고 표시 옵션/재접촉 대기일 기반 재노출 제어 로직을 제공한다. SDK는 클라이언트에서 이벤트를 감지하고, 서버에서 가져온 설문 목록을 필터링하여 적합한 설문만 표시한다. 이 문서는 설문이 "언제", "누구에게", "몇 번" 표시되는지를 제어하는 전체 메커니즘을 다룬다.

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
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

### Out-of-scope
- Link Survey 배포 (FSD-016에서 다룸)
- 사용자 식별 (FSD-020에서 다룸)
- 응답 데이터 처리 및 저장

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| Survey Creator | 트리거, 타게팅, 재노출 규칙을 설정하는 사용자 |
| End User | 웹 앱에서 특정 행동 시 인앱 설문을 보게 되는 사용자 |
| Product Manager | 사용자 세그먼트별로 타게팅된 설문의 응답을 분석하는 담당자 |
| Developer | Code Action을 구현하고 SDK를 통합하는 개발자 |

## 4. 기능 요구사항

### FR-029: 트리거 시스템

#### FR-029-01: ActionClass 타입 정의

ActionClass는 설문 트리거의 기본 단위로, 다음 속성을 포함한다:
- 고유 ID, 이름, 설명
- 타입 (code 또는 noCode)
- 키 (code action의 식별자)
- NoCode 설정 (noCode 타입인 경우)
- 환경 ID, 생성/수정 일시

**ActionClass 유형:**

| 유형 | 설명 | 설정 방법 |
|------|------|----------|
| code | 개발자가 SDK track() 메서드로 명시적 트리거 | SDK에서 track("action-key") 호출 |
| noCode | UI 상호작용 자동 감지 | 에디터에서 CSS selector / innerHTML / URL 설정 |

#### FR-029-02: NoCode 이벤트 구성

NoCode 이벤트는 4가지 유형으로 분류되며, 각각 URL 필터를 설정할 수 있다.

**NoCode 이벤트 유형:**

| 유형 | 설명 | 추가 설정 |
|------|------|----------|
| click | 특정 요소 클릭 | CSS selector 또는 innerHTML (최소 1개 필수) |
| pageView | 페이지 방문 | URL 필터만 |
| exitIntent | 마우스 화면 이탈 | URL 필터만 |
| fiftyPercentScroll | 페이지 50% 스크롤 | URL 필터만 |

**URL 필터 매칭 규칙 (7가지):**

| 규칙 | 설명 |
|------|------|
| exactMatch | URL이 값과 정확히 일치 |
| contains | URL에 값이 포함됨 |
| startsWith | URL이 값으로 시작 |
| endsWith | URL이 값으로 끝남 |
| notMatch | URL이 값과 일치하지 않음 |
| notContains | URL에 값이 포함되지 않음 |
| matchesRegex | URL이 정규식 패턴에 일치 |

**URL 필터 연결자:**
- "or" (기본값): 하나라도 일치하면 통과
- "and": 모든 필터가 일치해야 통과

#### FR-029-03: Click 이벤트 평가

Click 이벤트 평가 과정:
1. NoCode 설정의 타입이 click인지 확인
2. innerHTML이 설정된 경우 대상 요소의 innerHTML과 비교
3. CSS selector가 설정된 경우, 점(.) 또는 해시(#) 기준으로 분리하여 각각 매칭
4. URL 필터가 설정된 경우 연결자(or/and)에 따라 URL 매칭 수행
5. 모든 조건이 충족되면 이벤트 발생

#### FR-029-04: 설문 트리거 및 위젯 렌더링

**설문 트리거 과정:**
1. 확률 기반 표시 검사: displayPercentage가 설정된 경우 보안 난수를 생성하여 확률 판정
2. Hidden Fields 처리
3. 위젯 렌더링 요청

**확률 기반 표시:**
- 보안 난수 생성기(CSPRNG) 기반 난수 사용
- 소수점 2자리 정밀도 (0.01 ~ 100.00%)

#### FR-029-05: 위젯 렌더링 상세

위젯 렌더링 과정:
1. 이미 설문이 표시 중이면 스킵 (동시 1개 제한)
2. 설문 실행 상태를 활성으로 설정
3. 프로젝트 설정 오버라이드 적용 (클릭 외부 닫기, 오버레이, 위치 등)
4. reCAPTCHA 활성화된 경우 스크립트 사전 로딩
5. delay 설정에 따라 대기 후 설문 렌더링 (초 단위를 밀리초로 변환)

**핵심 상태 관리:**
- 설문 실행 상태: 동시에 하나의 설문만 표시 (싱글톤)
- 표시 기록 생성: 표시 기록 배열에 추가 → 설문 필터링 재실행
- 응답 기록 생성: 응답 기록 배열에 추가 → 설문 필터링 재실행
- 설문 닫기: DOM에서 위젯 제거 + 실행 상태 비활성 + 설문 필터링 재실행

### FR-030: 재노출 제어

#### FR-030-01: 표시 옵션 (displayOption) 4가지 유형

| 표시 옵션 | 조건 | 동작 |
|-----------|------|------|
| displayOnce | 해당 설문의 표시 기록이 0건 | 한 번 표시되면 다시 표시하지 않음 (응답 여부 무관) |
| displayMultiple | 해당 설문의 응답 기록이 0건 | 응답하기 전까지 반복 표시 |
| displaySome | 표시 횟수가 최대 표시 제한 미만이고 응답 기록이 0건 | N번까지 표시, 응답하면 중지 |
| respondMultiple | 항상 true | 항상 표시 (응답 여부 무관) — 예: 피드백 박스 |

#### FR-030-02: 재접촉 대기일 (recontactDays) 설정

재접촉 대기일은 마지막 설문 표시 이후 경과한 일수를 기준으로 설문 표시 여부를 결정한다.

**우선순위:**
1. 설문 수준의 재접촉 대기일 (null이 아닌 경우 우선 적용)
2. 프로젝트 수준의 재접촉 대기일
3. 둘 다 설정되지 않은 경우 → 항상 표시

**날짜 차이 계산:** 절대값 기반 일 단위 계산 (소수점 이하 버림)

**에디터 UI에서의 재접촉 대기일 옵션:**

| 옵션 ID | 설명 | 재접촉 대기일 값 |
|---------|------|-----------------|
| respect | 글로벌 대기 시간 존중 | null (프로젝트 설정 사용) |
| ignore | 글로벌 대기 시간 무시 | 0 |
| overwrite | 커스텀 대기 시간 | 1 ~ 365 (일 단위) |

#### FR-030-03: Segment 기반 필터링

Segment 기반 설문 필터링 로직:
1. 미식별 사용자 → Segment 필터가 있는 설문은 제외
2. 식별된 사용자이지만 소속 Segment가 없음 → 모든 설문 제외
3. 식별된 사용자 → 사용자가 속한 Segment에 연결된 설문만 표시

#### FR-030-04: Segment 필터 타입 정의

Segment 필터는 4가지 유형으로 분류된다:

| 필터 유형 | 설명 | 기준 |
|-----------|------|------|
| Attribute 필터 | Contact 속성 기반 | 속성 키와 값으로 비교 |
| Person 필터 | Contact 기본 속성 기반 | 식별자와 값으로 비교 |
| Segment 필터 | 다른 세그먼트 포함/미포함 | 세그먼트 ID 기준 |
| Device 필터 | 디바이스 유형 기반 | 디바이스 유형으로 비교 |

**Segment 연산자 분류:**

| 카테고리 | 연산자 |
|----------|--------|
| Base Operators | lessThan, lessEqual, greaterThan, greaterEqual, equals, notEquals |
| String Operators | contains, doesNotContain, startsWith, endsWith |
| Date Operators | isOlderThan, isNewerThan, isBefore, isAfter, isBetween, isSameDay, isSet, isNotSet |
| Segment Operators | userIsIn, userIsNotIn |
| Device Operators | equals, notEquals |
| Person Operators | equals, notEquals, isSet, isNotSet, contains, doesNotContain, startsWith, endsWith |

**Segment 필터 연결:**
- "and" 또는 "or" 연결자 사용
- 첫 번째 필터의 연결자는 null (시작점)

#### FR-030-05: 자동 닫기 (autoClose)

- 기본값: 10초 (활성화 시)
- null: 비활성화
- 최소값: 1초
- 설문이 표시된 후 사용자 상호작용 없으면 자동으로 닫힘

#### FR-030-06: 표시 지연 (delay)

- 기본값: 5초 (활성화 시)
- 0: 비활성화 (즉시 표시)
- 트리거 발생 후 delay 시간만큼 대기 후 설문 표시
- 초 단위 설정, 밀리초 단위로 변환하여 적용

#### FR-030-07: 확률 기반 표시 (displayPercentage)

- 기본값: 50% (활성화 시)
- null: 비활성화 (항상 표시)
- 입력 범위: 0.01 ~ 100, 소수점 2자리
- 0.01% 미만 → 0.01%로 보정
- 100% 초과 → 100%로 보정

#### FR-030-08: 프로젝트 수준 설문 오버라이드

설문별로 프로젝트 설정을 오버라이드할 수 있는 항목:
- 브랜드 색상
- 강조 테두리 색상
- 위치 (placement)
- 클릭 외부 닫기
- 오버레이

우선순위: 설문 오버라이드 > 프로젝트 설정

## 5. 비기능 요구사항

| ID | 항목 | 기준 |
|----|------|------|
| NFR-029-01 | 동시 설문 표시 | 최대 1개 (싱글톤 제어) |
| NFR-029-02 | 난수 보안성 | CSPRNG 기반 보안 난수 사용 |
| NFR-029-03 | 메모리 관리 | 지연 타이머 스택 관리, 설문 닫기 시 정리 |
| NFR-030-01 | 필터링 성능 | 클라이언트에서 동기적으로 수행 (네트워크 호출 없음) |
| NFR-030-02 | 날짜 계산 정밀도 | 일 단위 (소수점 이하 버림) |
| NFR-030-03 | Segment 평가 | 서버에서 미리 평가하여 Segment ID 배열로 전달 |

## 6. 정책/제약

| 항목 | 값 |
|------|------|
| autoClose 기본값 | 10초 |
| delay 기본값 | 5초 |
| displayPercentage 기본값 | 50% |
| displayPercentage 범위 | 0.01 ~ 100 |
| 재접촉 대기일 범위 | 1 ~ 365일 |
| 최대 표시 횟수 최소값 | 1 |
| 재접촉 대기일 null 의미 | 프로젝트 설정 사용 |
| 재접촉 대기일 0 의미 | 글로벌 대기 시간 무시 |
| URL 필터 규칙 수 | 7가지 |
| Click 요소 선택 | CSS selector + innerHTML (최소 1개) |
| NoCode 이벤트 유형 | 4가지 (click, pageView, exitIntent, fiftyPercentScroll) |
| Segment 필터 유형 | 4가지 (attribute, person, segment, device) |
| Segment 연결자 | "and" / "or" / null (첫 번째) |
| 표시 옵션 유형 | 4가지 (displayOnce, displayMultiple, respondMultiple, displaySome) |
| 동시 설문 수 | 1개 |
| Link Survey에서 표시 | 트리거/재노출 설정 카드 모두 숨김 |

## 7. 수용 기준 (Acceptance Criteria)

| AC-ID | 시나리오 | 기대 결과 |
|-------|----------|----------|
| AC-029-01 | Code Action track("purchase") 호출 | 해당 ActionClass에 연결된 설문이 트리거됨 |
| AC-029-02 | NoCode click 이벤트 (CSS selector 일치) | 설문이 표시됨 |
| AC-029-03 | NoCode pageView 이벤트 (URL 필터 일치) | 설문이 표시됨 |
| AC-029-04 | NoCode exitIntent 이벤트 | 마우스 화면 이탈 시 설문 표시 |
| AC-029-05 | displayPercentage 50% 설정 | 약 50%의 트리거에서만 설문 표시 |
| AC-029-06 | delay 5초 설정 | 트리거 후 5초 대기 후 설문 표시 |
| AC-029-07 | 다른 설문이 이미 표시 중 | 새 설문 스킵 ("A survey is already running") |
| AC-030-01 | displayOnce 설정 + 1회 표시 후 | 다시 표시되지 않음 |
| AC-030-02 | displayMultiple + 미응답 상태 | 트리거마다 반복 표시 |
| AC-030-03 | displayMultiple + 응답 완료 | 더 이상 표시되지 않음 |
| AC-030-04 | displaySome (limit=3) + 2회 표시 | 1회 더 표시 가능 |
| AC-030-05 | displaySome (limit=3) + 3회 표시 | 더 이상 표시되지 않음 |
| AC-030-06 | respondMultiple 설정 | 응답 후에도 계속 표시 |
| AC-030-07 | 재접촉 대기일 = 7 + 마지막 표시 3일 전 | 설문 미표시 |
| AC-030-08 | 재접촉 대기일 = 7 + 마지막 표시 8일 전 | 설문 표시 |
| AC-030-09 | 재접촉 대기일 = null (respect) | 프로젝트 설정의 재접촉 대기일 사용 |
| AC-030-10 | 재접촉 대기일 = 0 (ignore) | 대기 시간 없이 즉시 표시 가능 |
| AC-030-11 | 미식별 사용자 + Segment 필터가 있는 설문 | 해당 설문 미표시 |
| AC-030-12 | 식별된 사용자 + 해당 Segment 미소속 | 해당 설문 미표시 |
| AC-030-13 | 식별된 사용자 + Segment 소속 | 해당 설문 표시 대상 |
| AC-030-14 | URL 필터 "and" 연결 + 일부만 일치 | 이벤트 미발생 |
| AC-030-15 | URL 필터 "or" 연결 + 일부 일치 | 이벤트 발생 |
