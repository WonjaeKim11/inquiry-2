# 세그먼트(Segment) 필터 — 요구사항 명세서

> **문서번호**: FSD-027 | **FR 범위**: FR-045 (Segments)
> **라이선스**: Enterprise (contacts feature flag 필수)

---

## 1. 목적/배경

세그먼트(Segment)는 연락처(Contact)를 속성, 행동, 디바이스 등의 조건에 따라 그룹화하는 기능이다. 설문의 타겟 대상을 정의하거나, 개인화된 설문 링크를 세그먼트 단위로 생성할 때 사용된다. 세그먼트 필터는 재귀적 AND/OR 트리 구조를 지원하며, 4가지 필터 유형과 다양한 연산자를 제공한다.

세그먼트는 설문에 직접 연결되며, Private(설문 전용) 또는 Public(재사용 가능) 두 가지 가시성을 가진다.

---

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- 세그먼트 CRUD (생성, 조회, 수정, 삭제, 복제)
- 4가지 필터 유형: Attribute, Person, Segment, Device
- 재귀적 AND/OR 논리 트리 구조
- 20+ 연산자 (일반 + 날짜 전용)
- 순환 참조 방지
- Private/Public 세그먼트 구분
- DB 쿼리 변환 (필터 -> SQL)
- 런타임 세그먼트 평가 (SDK 측)

### Out-of-scope
- 세그먼트 기반 자동 알림
- 세그먼트 통계/분석 대시보드
- 세그먼트 내보내기

---

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| Organization Owner/Manager | 세그먼트 생성 및 관리 |
| Survey Creator | 설문 대상으로 세그먼트 지정 |
| SDK Runtime | 사용자 데이터 기반 실시간 세그먼트 평가 |

---

## 4. 기능 요구사항

### FR-045-S01: Segment 데이터 모델

세그먼트(Segment) 데이터 모델은 다음과 같은 속성을 가진다:

| 필드 | 설명 |
|------|------|
| ID | 고유 식별자 (자동 생성) |
| 생성일 | 세그먼트 생성 시각 |
| 수정일 | 마지막 수정 시각 |
| 제목 | 세그먼트 이름 |
| 설명 | 세그먼트 설명 (선택) |
| 비공개 여부 | Private 세그먼트인지 여부 (기본: true) |
| 필터 | JSON 형태의 필터 조건 (기본: 빈 배열) |
| 환경 ID | 소속 환경 식별자 |
| 연결된 설문 목록 | 이 세그먼트를 사용하는 설문들 |

환경 ID와 제목 조합으로 유니크 제약이 설정된다.

### FR-045-S02: 필터 유형 (4종)

#### 1. Attribute 필터 (속성 필터)

연락처 속성(Contact Attribute) 기반 필터링.

- 필터 유형: attribute
- 속성 키 이름을 지정하여 해당 속성 값을 기준으로 필터링
- 모든 연산자 사용 가능

#### 2. Person 필터 (사용자 식별자 필터)

사용자 식별자(userId) 기반 필터링.

- 필터 유형: person
- 현재 userId만 지원
- 문자열 타입 연산자 사용 가능

#### 3. Segment 필터 (세그먼트 포함/제외 필터)

다른 세그먼트 포함/제외 필터링.

- 필터 유형: segment
- 참조할 세그먼트 ID를 지정
- "사용자가 해당 세그먼트에 포함" 또는 "미포함" 연산자 사용

#### 4. Device 필터 (디바이스 유형 필터)

디바이스 유형 기반 필터링.

- 필터 유형: device
- 디바이스 유형: phone 또는 desktop
- equals(같음) 또는 notEquals(같지 않음) 연산자 사용

### FR-045-S03: 연산자 체계

#### 기본 연산자 (6종)

| 연산자 | 설명 | 적용 대상 |
|--------|------|-----------|
| equals | 같음 | 모든 타입 |
| notEquals | 같지 않음 | 모든 타입 |
| lessThan | 미만 | number |
| lessEqual | 이하 | number |
| greaterThan | 초과 | number |
| greaterEqual | 이상 | number |

#### 문자열 연산자 (4종)

| 연산자 | 설명 |
|--------|------|
| contains | 포함 |
| doesNotContain | 미포함 |
| startsWith | 시작 문자열 |
| endsWith | 끝 문자열 |

#### 존재 연산자

| 연산자 | 설명 |
|--------|------|
| isSet | 값이 설정됨 (not undefined/null/empty) |
| isNotSet | 값이 미설정 (undefined/null/empty) |

#### 날짜 전용 연산자 (8종)

| 연산자 | 설명 | 값 형식 |
|--------|------|---------|
| isOlderThan | N 단위 이전 | 수량 + 시간 단위 |
| isNewerThan | N 단위 이내 | 수량 + 시간 단위 |
| isBefore | 특정 날짜 이전 | ISO 8601 문자열 |
| isAfter | 특정 날짜 이후 | ISO 8601 문자열 |
| isBetween | 두 날짜 사이 | 시작 날짜, 종료 날짜 쌍 |
| isSameDay | 같은 날 | ISO 8601 문자열 |
| isSet | 날짜 설정됨 | - |
| isNotSet | 날짜 미설정 | - |

#### 시간 단위

지원하는 시간 단위: days(일), weeks(주), months(월), years(년)

#### 세그먼트 연산자 (2종)

| 연산자 | 설명 |
|--------|------|
| userIsIn | 해당 세그먼트에 포함 |
| userIsNotIn | 해당 세그먼트에 미포함 |

#### 타입별 사용 가능 연산자

| 속성 데이터 타입 | 사용 가능 연산자 |
|-----------------|-----------------|
| string | equals, notEquals, isSet, isNotSet, contains, doesNotContain, startsWith, endsWith |
| number | equals, notEquals, lessThan, lessEqual, greaterThan, greaterEqual, isSet, isNotSet |
| date | isOlderThan, isNewerThan, isBefore, isAfter, isBetween, isSameDay, isSet, isNotSet |

### FR-045-S04: 재귀적 필터 트리 구조

필터는 재귀적 AND/OR 트리 구조로 표현된다. 각 필터 항목은 다음 요소로 구성된다:

- **ID**: 고유 식별자
- **커넥터**: and, or, 또는 null (그룹의 첫 번째 필터는 반드시 null)
- **리소스**: 단일 필터(리프 노드) 또는 하위 필터 그룹

**제약 조건**:
- 각 그룹의 첫 번째 필터의 커넥터는 반드시 null이어야 함
- 재귀적으로 검증 수행

**평가 알고리즘**:
1. 필터가 비어있으면 true 반환
2. 각 필터를 순회하며 유형별 평가 함수 호출
3. AND 조건을 먼저 연속 평가 (short-circuit)
4. OR 조건을 이후 평가
5. 중간 결과를 배열에 저장하여 최종 결과 산출

### FR-045-S05: 순환 참조 방지

Segment 필터 내에서 자기 자신을 참조하는 순환 구조를 재귀적으로 탐지한다.

- 필터 트리를 순회하며 세그먼트 유형의 필터를 발견하면, 해당 참조 세그먼트 ID가 현재 세그먼트 ID와 동일한지 확인
- 직접 순환뿐만 아니라 간접 순환(A -> B -> A)도 재귀적으로 탐지
- 순환 참조 발견 시 "재귀적 세그먼트 필터는 허용되지 않습니다" 에러 반환

### FR-045-S06: Private vs Public 세그먼트

| 속성 | Private | Public |
|------|---------|--------|
| 비공개 여부 | true | false |
| 제목 | surveyId (자동 생성) | 사용자 지정 |
| 재사용 | 해당 설문에서만 | 여러 설문에서 공유 |
| 생성 방식 | 설문 생성 시 자동 (upsert) | 명시적 생성 |
| 삭제 | 설문과 함께 | 연결된 설문 없을 때만 가능 |

Private 세그먼트는 환경 ID + 제목 유니크 제약을 활용하여 upsert 방식으로 처리된다.

### FR-045-S07: 세그먼트 CRUD 제약

**삭제 제한**: 연결된 설문이 있으면 삭제 불가. "설문에 연결된 세그먼트는 삭제할 수 없습니다" 에러 반환.

**복제**: "Copy of {원본 제목} ({번호})" 형식으로 제목 자동 생성

**리셋**: 설문의 세그먼트 필터를 빈 배열로 초기화

### FR-045-S08: DB 쿼리 변환

세그먼트 필터를 DB 쿼리 조건으로 변환하여 연락처 조회에 사용.

- 숫자 비교: SQL 연산자로 변환 (greaterThan -> >, 등)
- 날짜 비교: 날짜 전용 컬럼과 문자열(ISO) 값 양쪽 모두 OR 조건으로 처리 (마이그레이션 호환)
- 문자열 비교: contains, startsWith, endsWith 등 DB 문자열 필터로 변환

### FR-045-S09: 필터 조작 유틸리티

| 기능 | 설명 |
|------|------|
| 필터 아래 추가 | 특정 필터 아래에 새 필터 추가 |
| 그룹 생성 | 필터를 하위 그룹으로 래핑 |
| 필터 이동 | 필터 순서 변경 (위/아래) |
| 필터 삭제 | 필터 삭제 (빈 그룹 자동 정리) |
| 그룹 내 추가 | 그룹 내에 필터 추가 |
| 커넥터 전환 | AND/OR 전환 (그룹 또는 개별 필터) |
| 연산자 변경 | 필터의 연산자 변경 |
| 필터 값 변경 | 필터의 비교 값 변경 |
| 속성 키 변경 | 필터에 사용하는 속성 키 변경 |
| 참조 세그먼트 변경 | 세그먼트 필터의 참조 대상 변경 |
| 디바이스 유형 변경 | 디바이스 필터의 유형 변경 |
| 고급 세그먼트 판별 | attribute/person 외 필터가 포함되어 있는지 확인 |
| 속성 키 사용 여부 검색 | 특정 속성 키가 필터에서 사용 중인지 재귀 검색 |

### FR-045-S10: 날짜 유틸리티

| 기능 | 설명 |
|------|------|
| 시간 단위 빼기 | 날짜에서 시간 단위 빼기 |
| 시간 단위 더하기 | 날짜에 시간 단위 더하기 |
| 하루 시작 | UTC 기준 하루 시작 (00:00:00.000) |
| 하루 끝 | UTC 기준 하루 끝 (23:59:59.999) |
| 같은 날 확인 | UTC 기준 같은 날인지 확인 |
| UTC 날짜 문자열 변환 | YYYY-MM-DD -> UTC midnight ISO 문자열 |

---

## 5. 비기능 요구사항

| ID | 항목 | 내용 |
|----|------|------|
| NFR-S01 | 성능 | 세그먼트 평가는 실시간(SDK 요청 시) 수행, 최대 지연 허용 |
| NFR-S02 | 무한 루프 방지 | 순환 참조 탐지로 세그먼트 필터 무한 루프 차단 |
| NFR-S03 | 데이터 무결성 | 환경 ID + 제목 유니크 제약으로 세그먼트 이름 중복 방지 |
| NFR-S04 | 캐싱 | 요청 단위 중복 제거 캐싱으로 동일 요청 내 세그먼트 조회 중복 제거 |
| NFR-S05 | 하위 호환성 | 날짜 필터 DB 쿼리에서 날짜 전용 컬럼과 문자열(ISO) 값 모두 지원 |

---

## 6. 정책/제약

| 항목 | 값 |
|------|-----|
| 필터 유형 수 | 4종 (attribute, person, segment, device) |
| 기본 연산자 | 6종 (equals, notEquals, lessThan, lessEqual, greaterThan, greaterEqual) |
| 문자열 연산자 | 4종 (contains, doesNotContain, startsWith, endsWith) |
| 날짜 연산자 | 8종 (isOlderThan, isNewerThan, isBefore, isAfter, isBetween, isSameDay, isSet, isNotSet) |
| 세그먼트 연산자 | 2종 (userIsIn, userIsNotIn) |
| 디바이스 연산자 | 2종 (equals, notEquals) |
| 시간 단위 | 4종 (days, weeks, months, years) |
| 논리 커넥터 | and, or, null |
| 세그먼트 이름 유니크 | 환경 ID + 제목 |
| 디바이스 유형 | phone, desktop |
| 필터 값 타입 | 문자열, 숫자, 상대 날짜 값, 날짜 범위 쌍 |

---

## 7. 수용 기준 (Acceptance Criteria)

| AC-ID | 기준 |
|-------|------|
| AC-027-01 | Attribute 필터에서 equals 연산자로 문자열 속성 비교 시 정확히 일치하는 연락처만 반환된다 |
| AC-027-02 | contains 연산자 사용 시 부분 문자열 매칭이 동작한다 |
| AC-027-03 | lessThan/greaterThan 연산자는 number 타입 속성에 대해 올바른 비교를 수행한다 |
| AC-027-04 | isOlderThan/isNewerThan 연산자는 상대적 날짜 계산이 정확하다 |
| AC-027-05 | isBetween 연산자는 시작/종료 날짜를 포함하여 범위 내 연락처를 반환한다 |
| AC-027-06 | isSameDay 연산자는 UTC 기준 같은 날의 연락처를 반환한다 |
| AC-027-07 | AND 조건으로 연결된 필터들이 모두 충족되어야 세그먼트에 포함된다 |
| AC-027-08 | OR 조건으로 연결된 필터들 중 하나라도 충족되면 세그먼트에 포함된다 |
| AC-027-09 | 중첩된 그룹(AND 내 OR, OR 내 AND)이 올바르게 평가된다 |
| AC-027-10 | Segment 필터에서 자기 자신을 참조하면 유효하지 않은 입력 에러가 발생한다 |
| AC-027-11 | 간접 순환 참조(A -> B -> A)도 탐지되어 에러가 발생한다 |
| AC-027-12 | 설문에 연결된 세그먼트 삭제 시도 시 허용되지 않는 작업 에러가 발생한다 |
| AC-027-13 | Private 세그먼트는 동일 title에 대해 upsert로 중복 생성을 방지한다 |
| AC-027-14 | isSet 연산자는 속성이 존재하고 비어있지 않은 경우 true를 반환한다 |
| AC-027-15 | isNotSet 연산자는 속성이 없거나 null/empty인 경우 true를 반환한다 |
| AC-027-16 | 빈 필터(filters: [])의 세그먼트는 모든 연락처를 포함한다 (true 반환) |
| AC-027-17 | userIsIn/userIsNotIn 연산자로 다른 세그먼트의 멤버십을 필터링할 수 있다 |
| AC-027-18 | Device 필터로 phone/desktop 사용자를 구분할 수 있다 |
