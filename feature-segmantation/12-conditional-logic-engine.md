# 조건부 로직 엔진 — 요구사항 명세서

> **문서번호**: FSD-012 | **FR 범위**: FR-018
> **라이선스**: Community

---

## 1. 목적/배경

Formbricks의 조건부 로직 엔진은 설문 응답 흐름을 동적으로 제어하는 핵심 기능이다. Block(블록) 단위로 로직을 정의하며, 응답 데이터, 변수(Variable), 히든 필드(Hidden Field)를 기반으로 조건을 평가하고 3가지 액션(calculate, requireAnswer, jumpToBlock)을 수행한다.

로직 시스템은 중첩 가능한 AND/OR 조건 그룹(Condition Group) 구조를 사용하며, 31개의 비교 연산자와 7개의 변수 계산 연산자를 지원한다. Block 레벨에서 로직을 정의하므로 Question(질문) 레벨이 아닌 블록 전체의 흐름을 제어할 수 있다.

---

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- 31개 조건 비교 연산자
- 7개 변수 계산 연산자 (텍스트 2 + 숫자 5)
- 3가지 액션 타입: calculate, requireAnswer, jumpToBlock
- 중첩 AND/OR 조건 그룹
- Block 레벨 로직 정의 및 로직 미일치 시 fallback
- Element, Variable, Hidden Field 를 좌측/우측 피연산자로 사용
- 로직 평가 엔진 (로직 평가 처리, 액션 수행 처리)
- 로직 아이템 복제, 조건 추가/삭제/업데이트
- 순환 로직(Cyclic Logic) 검증

### Out-of-scope
- Question 레벨 로직 (deprecated, v1 API 호환용으로만 유지)
- 외부 API 호출 기반 조건부 로직
- 타이머/시간 기반 자동 분기

---

## 3. 사용자/이해관계자

| 역할 | 관심 사항 |
|------|----------|
| 설문 작성자 | 응답에 따른 동적 분기 설정 |
| 데이터 분석가 | 변수 계산을 통한 스코어링/가중치 부여 |
| 프론트엔드 개발자 | 로직 평가 엔진 구현 및 유지보수 |
| API 사용자 | v1 → v2 마이그레이션 (question → element 타입 변경) |

---

## 4. 기능 요구사항

### FR-018: 조건부 로직 시스템

#### 4.1 조건 연산자 (31개)

조건 연산자 구조에 정의된 전체 연산자:

**문자열/일반 비교 (12개)**
| 연산자 | 설명 | 우측 피연산자 필요 |
|--------|------|-------------------|
| equals | 값이 같음 | Yes |
| doesNotEqual | 값이 다름 | Yes |
| contains | 포함 | Yes |
| doesNotContain | 포함하지 않음 | Yes |
| startsWith | ~로 시작 | Yes |
| doesNotStartWith | ~로 시작하지 않음 | Yes |
| endsWith | ~로 끝남 | Yes |
| doesNotEndWith | ~로 끝나지 않음 | Yes |
| isEmpty | 빈 값 | No |
| isNotEmpty | 빈 값이 아님 | No |
| isSet | 값이 설정됨 | No |
| isNotSet | 값이 설정되지 않음 | No |

**숫자 비교 (4개)**
| 연산자 | 설명 | 우측 피연산자 필요 |
|--------|------|-------------------|
| isGreaterThan | 초과 | Yes |
| isLessThan | 미만 | Yes |
| isGreaterThanOrEqual | 이상 | Yes |
| isLessThanOrEqual | 이하 | Yes |

**다중 선택 비교 (5개)**
| 연산자 | 설명 | 우측 피연산자 필요 |
|--------|------|-------------------|
| equalsOneOf | 값이 목록 중 하나와 같음 | Yes |
| includesAllOf | 모든 항목 포함 | Yes |
| includesOneOf | 하나 이상 포함 | Yes |
| doesNotIncludeOneOf | 하나도 포함하지 않음 | Yes |
| doesNotIncludeAllOf | 모든 항목 미포함 | Yes |

**상태 확인 (8개)**
| 연산자 | 설명 | 우측 피연산자 필요 |
|--------|------|-------------------|
| isSubmitted | 제출됨 | No |
| isSkipped | 건너뜀 | No |
| isClicked | 클릭됨 (CTA) | No |
| isNotClicked | 클릭되지 않음 | No |
| isAccepted | 동의함 (Consent) | No |
| isBooked | 예약됨 (Cal) | No |
| isPartiallySubmitted | 부분 제출 (Matrix 등) | No |
| isCompletelySubmitted | 완전 제출 (Matrix 등) | No |

**날짜 비교 (2개)**
| 연산자 | 설명 | 우측 피연산자 필요 |
|--------|------|-------------------|
| isBefore | 이전 날짜 | Yes |
| isAfter | 이후 날짜 | Yes |

**기타 (1개)**
| 연산자 | 설명 | 우측 피연산자 필요 |
|--------|------|-------------------|
| isAnyOf | 여러 값 중 하나 | Yes |

**우측 피연산자가 불필요한 연산자 목록**:
isSubmitted, isSkipped, isClicked, isNotClicked, isAccepted, isBooked, isPartiallySubmitted, isCompletelySubmitted, isSet, isNotSet, isEmpty, isNotEmpty

#### 4.2 변수 계산 연산자 (7개)

**텍스트 변수 연산자 (2개)**

| 연산자 | 설명 |
|--------|------|
| assign | 값 할당 |
| concat | 문자열 연결 |

**숫자 변수 연산자 (5개)**

| 연산자 | 설명 | 제약 |
|--------|------|------|
| add | 더하기 | - |
| subtract | 빼기 | - |
| multiply | 곱하기 | - |
| divide | 나누기 | 0으로 나누기 금지 (유효성 검증) |
| assign | 값 할당 | - |

#### 4.3 동적 필드 타입 (피연산자 타입)

피연산자로 사용할 수 있는 동적 필드 타입은 다음과 같다:

- **element**: 설문 질문 요소의 응답값 참조 (메타 필드로 Matrix row 등 추가 정보 전달)
- **variable**: 설문 변수값 참조 (CUID2 형식 ID 필수)
- **hiddenField**: 히든 필드값 참조
- **Deprecated**: question 타입 (v1 API 호환용)

#### 4.4 우측 피연산자

- static: 고정 값 (문자열, 숫자, 문자열 배열)
- dynamic: element, variable, hiddenField 중 하나로 동적 참조

#### 4.5 조건 그룹 (Condition Group) - 중첩 AND/OR

- 재귀적 구조로 무한 중첩 가능
- connector: "and" (모든 조건 충족) 또는 "or" (하나 이상 충족)
- 조건 내부에 단일 조건 또는 하위 조건 그룹 포함 가능

#### 4.6 단일 조건 (Single Condition)

**검증 규칙**:
1. 우측 피연산자 불필요 연산자에 해당하는 연산자는 우측 피연산자가 없어야 함
2. 그 외 연산자는 우측 피연산자 필수
3. static 타입의 우측 피연산자 값이 빈 문자열이면 안 됨

#### 4.7 Block 레벨 로직

- 각 Block은 여러 로직 아이템을 가질 수 있음
- 각 로직 아이템은 조건 그룹(conditions)과 액션 배열(actions)로 구성
- Block ID는 CUID 형식
- Block 이름은 필수 (최소 1자)
- Block 내 최소 1개의 요소(element) 필수
- logicFallback: 모든 로직 조건이 불일치할 때 이동할 Block ID

#### 4.8 3가지 액션 타입

**1. Calculate (변수 계산)**
- 대상 변수 ID를 지정하여 값을 계산
- 텍스트 변수: assign, concat 연산
- 숫자 변수: add, subtract, multiply, divide, assign 연산
- 값 소스: static 값 또는 동적 필드 참조 (element, variable, hiddenField)
- 0으로 나누기 방지 검증: divide 연산에서 static 값이 0이면 검증 실패

**2. RequireAnswer (필수 응답 설정)**
- 특정 Element ID를 대상으로 필수 응답 설정

**3. JumpToBlock (블록 이동)**
- 특정 Block ID로 이동

#### 4.9 로직 평가 엔진

로직 평가 처리는 설문 데이터, 응답 데이터, 변수 데이터, 조건 그룹, 선택 언어를 입력으로 받아 boolean 결과를 반환한다.

- 조건 그룹 내 조건들을 재귀적으로 평가
- OR connector: 하나라도 true이면 전체 true
- AND connector: 모두 true여야 전체 true

**좌측 피연산자 값 추출 특수 처리**:
- openText + inputType=number: 문자열을 숫자로 변환, NaN이면 undefined
- multipleChoiceSingle/Multi: 응답 라벨 → Choice ID로 변환 (언어별 라벨 비교)
- matrix: 메타 정보의 row로 특정 행의 응답값 추출, Column 라벨 → Column 인덱스로 변환
- variable (number 타입): 숫자 변환, fallback 0
- variable (text 타입): fallback 빈 문자열

**특수 연산자 평가 로직**:
- equals with Date: 타임스탬프 비교
- equals with MultiChoiceMulti: 배열 내 포함 여부 검사
- isSubmitted: 문자열이면 비어있지 않음, 배열이면 length > 0, 숫자면 null 아님
- isSkipped: 빈 값, null, undefined, 빈 배열, 빈 객체
- isBooked: "booked" 또는 비어있지 않은 값
- isPartiallySubmitted: 객체의 값 중 빈 문자열 포함
- isCompletelySubmitted: 객체의 모든 값이 비어있지 않음

#### 4.10 액션 수행 처리

액션 수행 처리는 설문 정보, 액션 배열, 응답 데이터, 계산 결과를 입력으로 받아 다음을 반환한다:
- jumpTarget: 이동할 블록 ID (또는 없음)
- requiredElementIds: 필수 응답 요소 ID 목록
- calculations: 변수 계산 결과

액션 처리 방식:
- calculate: 변수 계산을 수행하여 결과를 저장
- requireAnswer: 필수 응답 요소 ID를 목록에 추가
- jumpToBlock: 이동 대상을 설정 (첫 번째 jumpToBlock만 적용)

**중요 규칙**: jumpToBlock 액션이 여러 개인 경우 **첫 번째만** 적용된다.

#### 4.11 로직 유틸리티 기능

| 기능 | 설명 |
|------|------|
| 로직 아이템 복제 | 로직 아이템 전체 복제 (새 ID 생성) |
| 조건 추가 | 특정 조건 아래에 새 조건 추가 |
| 그룹 connector 토글 | 그룹의 AND↔OR 토글 |
| 조건 삭제 | 조건 삭제 + 빈 그룹 정리 |
| 조건 복제 | 단일 조건 복제 |
| 그룹 생성 | 단일 조건을 그룹으로 감싸기 |
| 조건 업데이트 | 조건 업데이트 |
| 액션 본문 갱신 | 액션 objective 변경 시 기본 본문 생성 |

---

## 5. 비기능 요구사항

| ID | 요구사항 | 기준 |
|----|---------|------|
| NFR-012-01 | 조건 평가 시 에러 발생 시 false 반환 | 예외 처리로 안전 처리 |
| NFR-012-02 | 순환 로직 검출 | 순환 로직 검증 기능으로 검증 |
| NFR-012-03 | Element ID 유일성 | Block 내 Element ID 중복 불가 (유효성 검증) |
| NFR-012-04 | 로직에서 참조하는 히든 필드 존재 검증 | 설문 저장 시 validation |
| NFR-012-05 | 0으로 나누기 방지 | Calculate 액션에서 divide + static 0 검증 |

---

## 6. 정책/제약

| 항목 | 제약 값 |
|------|--------|
| 조건 비교 연산자 수 | 31개 |
| 텍스트 변수 계산 연산자 | 2개 (assign, concat) |
| 숫자 변수 계산 연산자 | 5개 (add, subtract, multiply, divide, assign) |
| 액션 타입 | 3개 (calculate, requireAnswer, jumpToBlock) |
| Connector 타입 | 2개 (and, or) |
| Block 최소 요소 수 | 1개 |
| Block 이름 | 필수 (최소 1자) |
| Variable ID 형식 | CUID2 |
| 다중 jumpToBlock | 첫 번째만 적용 |
| 우측 피연산자 static 값 | 빈 문자열 불가 |

---

## 7. 수용 기준 (Acceptance Criteria)

| AC ID | 기준 | 검증 방법 |
|-------|------|----------|
| AC-018-01 | 31개 모든 연산자가 정상 평가됨 | 각 연산자별 단위 테스트 |
| AC-018-02 | AND 조건 그룹에서 모든 조건 충족 시에만 true | 로직 평가 테스트 |
| AC-018-03 | OR 조건 그룹에서 하나라도 충족 시 true | 로직 평가 테스트 |
| AC-018-04 | 중첩 조건 그룹 (AND 안에 OR 등) 정상 평가 | 재귀 평가 테스트 |
| AC-018-05 | Calculate 액션으로 변수값 정상 업데이트 | 변수 계산 테스트 |
| AC-018-06 | JumpToBlock 액션으로 올바른 블록으로 이동 | 액션 수행 반환값 확인 |
| AC-018-07 | RequireAnswer 액션으로 필수 응답 설정 | 필수 응답 요소 ID 배열 확인 |
| AC-018-08 | 0으로 나누기 시 undefined 반환 | Calculate divide by zero 테스트 |
| AC-018-09 | logicFallback 설정 시 미일치 조건에서 fallback 블록으로 이동 | 설문 실행 흐름 테스트 |
| AC-018-10 | 우측 피연산자 없는 연산자에 우측 피연산자 제공 시 검증 실패 | 유효성 검증 테스트 |
| AC-018-11 | 순환 로직 감지 시 경고/에러 | 순환 로직 검출 결과 확인 |
| AC-018-12 | MultiChoice 질문의 응답값을 Choice ID로 변환하여 비교 | 언어 코드별 라벨 매칭 테스트 |
| AC-018-13 | Matrix 질문의 특정 행 응답값 추출 | 메타 정보의 row 기반 값 추출 테스트 |
| AC-018-14 | Deprecated question 타입이 v1 API에서 정상 동작 | Deprecated 필드 검증 |
