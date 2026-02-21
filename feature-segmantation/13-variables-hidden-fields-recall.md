# 변수 / 히든 필드 / 리콜 — 요구사항 명세서

> **문서번호**: FSD-013 | **FR 범위**: FR-019 ~ FR-021
> **라이선스**: Community

---

## 1. 목적/배경

Formbricks는 설문 내에서 데이터를 동적으로 관리하고 활용하기 위해 세 가지 핵심 메커니즘을 제공한다:

1. **변수(Variables)**: 설문 내부에서 계산 로직으로 값을 누적/변경할 수 있는 텍스트/숫자 변수
2. **히든 필드(Hidden Fields)**: URL 파라미터 또는 SDK를 통해 외부에서 주입되는 비가시적 데이터 필드
3. **리콜(Recall)**: 이전 질문의 응답, 변수값, 히든 필드값을 후속 질문의 텍스트에 동적으로 삽입하는 기능

이 세 가지는 조건부 로직 엔진과 긴밀하게 연동되어 동적 설문 경험을 구현한다.

---

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- Survey 변수(text/number) 정의 및 기본값 관리
- 변수 이름 유효성 검증 규칙
- Hidden Field 생성, 삭제, 유효성 검증
- 금지 ID 목록 및 제한 규칙
- Recall 패턴 (#recall:id/fallback:val#) 파싱 및 치환
- Recall에서 응답값, 변수값, 히든 필드값 해석
- 날짜, 배열 등 특수 값의 포매팅
- 설문 에디터에서의 Recall UI 표시

### Out-of-scope
- 변수의 외부 API 동기화
- Hidden Field 값의 서버 사이드 동적 생성
- Recall의 실시간 미리보기 (에디터에서는 @라벨 형태로 표시)

---

## 3. 사용자/이해관계자

| 역할 | 관심 사항 |
|------|----------|
| 설문 작성자 | 스코어링, 개인화 메시지, 외부 데이터 활용 |
| 마케터 | UTM 파라미터 등 외부 데이터 히든 필드 수집 |
| 데이터 분석가 | 변수 기반 점수 계산 및 응답 분류 |
| 프론트엔드 개발자 | Recall 패턴 파싱 및 렌더링 |

---

## 4. 기능 요구사항

### FR-019: 변수 (Variables)

#### 4.1 변수 타입 정의

변수는 discriminated union 구조로 number와 text 두 가지 타입을 지원한다.

**변수 속성**:

| 속성 | 타입 | 설명 |
|------|------|------|
| id | 문자열 (CUID2) | 변수 고유 식별자 |
| name | 문자열 | 변수 이름 (소문자, 숫자, 밑줄만 허용) |
| type | "number" 또는 "text" | 변수 타입 |
| value | 숫자 또는 문자열 | 기본값 (number: 0, text: 빈 문자열) |

#### 4.2 변수 이름 유효성 규칙

- 허용 패턴: 소문자 알파벳, 숫자, 밑줄만 허용
- 불허: 대문자, 공백, 특수문자, 하이픈 등

#### 4.3 변수 ID 유일성 검증

설문 저장 시 변수 ID의 유일성을 검증한다. 중복 ID가 있으면 "Variable IDs must be unique" 에러가 발생한다.

#### 4.4 변수값 업데이트

변수값은 **조건부 로직의 Calculate 액션**을 통해서만 업데이트된다:

- **숫자 변수**: add, subtract, multiply, divide, assign
- **텍스트 변수**: assign, concat
- 값 소스: static 값, 다른 변수, element 응답값, hidden field 값

(상세 Calculate 로직은 FSD-012 참조)

---

### FR-020: 히든 필드 (Hidden Fields)

#### 4.5 히든 필드 타입 정의

히든 필드는 활성화 여부(enabled)와 필드 ID 목록(fieldIds)으로 구성된다. 각 필드 ID는 금지 ID 목록에 포함되지 않아야 한다.

#### 4.6 금지 ID 목록 (FORBIDDEN_IDS)

시스템 내부적으로 사용되는 예약 ID 목록 (11개):

userId, source, suid, end, start, welcomeCard, hidden, verifiedEmail, multiLanguage, embed, verify

이 ID들은 Hidden Field, Element, Variable의 ID로 사용할 수 없다.

#### 4.7 Hidden Field ID 유효성 검증

ID 검증 처리는 다음 규칙을 적용한다:

**검증 규칙**:

| 규칙 | 에러 메시지 |
|------|------------|
| 빈 문자열 | "Please enter a {type} Id." |
| 기존 ID와 중복 (대소문자 무시) | "{type} ID already exists in questions, hidden fields, or variables" |
| 금지 ID 목록에 포함 | "{type} ID is not allowed." |
| 공백 포함 | "{type} ID cannot contain spaces." |
| 영숫자/하이픈/밑줄 외 문자 | 영문, 숫자, 하이픈, 언더스코어만 허용 |

#### 4.8 Hidden Field 삭제 시 안전 검증

삭제 전 다음을 확인:

1. **로직에서 사용 여부**: 로직에서 사용 중이면 삭제 불가
2. **리콜에서 사용 여부**: Welcome Card, 질문, Ending Card에서 사용 중이면 삭제 불가
3. **쿼터에서 사용 여부**: 쿼터 조건에서 사용 중이면 삭제 불가
4. **Follow-up에서 사용 여부**: Follow-up 액션의 대상 필드에서 사용 중이면 삭제 불가

#### 4.9 Hidden Field 값 설정 방법

- **URL 파라미터**: Link Survey 접속 시 URL query parameter로 전달
- **SDK**: App/Website Survey에서 프로그래밍 방식으로 전달
- 값은 응답 데이터에 저장되어 로직 평가 및 리콜에서 사용 가능

---

### FR-021: 리콜 (Recall)

#### 4.10 리콜 패턴 정의

리콜 정보는 문자열 내에 다음 패턴으로 삽입된다:

#recall:{id}/fallback:{value}#

| 구성 요소 | 설명 | 예시 |
|-----------|------|------|
| {id} | 참조할 element/variable/hiddenField의 ID | abc123, my_hidden_field |
| {value} | 응답값이 없을 때 표시할 대체 텍스트 | 고객님, nbsp (공백) |
| 전체 예시 | - | #recall:abc123/fallback:고객님# |

**ID 허용 패턴**: 영문 대소문자, 숫자, 밑줄, 하이픈만 허용

#### 4.11 리콜 파싱 기능

리콜 파싱을 위한 핵심 기능:

1. **첫 번째 recall ID 추출**: 텍스트에서 첫 번째 recall 참조 ID를 추출
2. **모든 recall ID 추출**: 텍스트에서 모든 recall 참조 ID를 추출
3. **fallback 값 추출**: recall 패턴에서 fallback 값을 추출
4. **전체 recall 정보 추출**: ID와 fallback 값을 포함한 전체 recall 정보 추출

#### 4.12 리콜 값 해석

실제 설문 실행 시 recall 패턴을 응답값으로 치환하는 처리:

**값 해석 우선순위**:
1. **변수(Variables)** 먼저 확인
2. **응답 데이터(Response Data)** 확인
3. 값이 없으면 **fallback 값** 사용

**특수 값 포매팅**:
- **날짜 문자열**: "1st January 2024" 형태로 변환
- **배열 값**: 빈 값 제거 후 쉼표로 연결
- **fallback 내 nbsp**: 공백 문자로 치환

#### 4.13 에디터에서의 리콜 표시

설문 에디터에서 recall 패턴은 사용자 친화적 형태로 변환된다:

- 슬래시 모드: /라벨명\ 형태 (에디터 내부 표시)
- 앳 모드: @라벨명 형태 (에디터 UI 표시)

**라벨 해석 우선순위**:
1. Hidden Field → field ID 그대로 사용
2. Survey Element → 해당 질문의 headline (HTML 태그 제거 후)
3. Variable → 변수의 name 사용

#### 4.14 Recall Item 타입

Recall Item은 다음 속성으로 구성된다:
- id: 참조 대상의 ID
- label: 표시용 라벨
- type: hiddenField, element, variable 중 하나

텍스트 내 모든 recall 참조를 추출하여 목록화할 수 있다.

#### 4.15 Recall 에디터 → 저장 변환

에디터에서 @라벨명 형태의 텍스트를 저장 시 recall 패턴(#recall:id/fallback:val#)으로 역변환한다.

#### 4.16 빈 Fallback 값 검증

headline과 subheader에서 fallback 값이 비어있는 recall 패턴이 있는지 확인하여, 있으면 해당 element를 반환하여 사용자에게 경고한다.

#### 4.17 중첩 리콜 처리

리콜 라벨 자체에 또 다른 리콜 패턴이 포함될 수 있다. 이 경우 중첩된 recall은 "___" 로 대체하여 무한 루프를 방지한다.

#### 4.18 Recall 텍스트 자르기

25자 이상이면 앞 10자 + "..." + 뒤 10자 형태로 축약한다.

---

## 5. 비기능 요구사항

| ID | 요구사항 | 기준 |
|----|---------|------|
| NFR-013-01 | 변수 ID는 CUID2 형식 | CUID2 유효성 검증 |
| NFR-013-02 | 변수 이름 유효성 | 소문자, 숫자, 밑줄만 허용 |
| NFR-013-03 | Hidden Field ID 유효성 | 영문, 숫자, 하이픈, 밑줄만 허용 |
| NFR-013-04 | Recall 패턴 파싱 안전성 | while 루프에서 recall 정보 추출 시 null이면 중단 |
| NFR-013-05 | 중첩 Recall 무한 루프 방지 | 내부 recall을 "___"로 대체 |
| NFR-013-06 | HTML 태그 제거 | 텍스트 내용 추출 기능 사용 |

---

## 6. 정책/제약

| 항목 | 제약 값 |
|------|--------|
| 금지 ID 개수 | 11개 |
| 금지 ID 목록 | userId, source, suid, end, start, welcomeCard, hidden, verifiedEmail, multiLanguage, embed, verify |
| 변수 이름 패턴 | 소문자, 숫자, 밑줄만 허용 |
| 변수 ID 형식 | CUID2 |
| 숫자 변수 기본값 | 0 |
| 텍스트 변수 기본값 | 빈 문자열 |
| Recall ID 패턴 | 영문 대소문자, 숫자, 밑줄, 하이픈 허용 |
| Recall 텍스트 축약 기본 길이 | 25자 |
| Recall 축약 형태 | 앞 10자 + "..." + 뒤 10자 |
| Hidden Field ID 중복 검사 | 대소문자 무시 |

---

## 7. 수용 기준 (Acceptance Criteria)

| AC ID | 기준 | 검증 방법 |
|-------|------|----------|
| AC-019-01 | number 타입 변수 생성 시 기본값 0 | 변수 생성 후 value 확인 |
| AC-019-02 | text 타입 변수 생성 시 기본값 빈 문자열 | 변수 생성 후 value 확인 |
| AC-019-03 | 변수 이름에 대문자 포함 시 검증 실패 | 유효성 검증 에러 확인 |
| AC-019-04 | 변수 ID 중복 시 검증 실패 | "Variable IDs must be unique" 에러 |
| AC-020-01 | 금지 ID에 해당하는 Hidden Field 생성 불가 | "Hidden field id is not allowed" 에러 |
| AC-020-02 | 기존 element/hidden field/variable과 중복 ID 생성 불가 | ID 검증 에러 반환 |
| AC-020-03 | 로직에서 사용 중인 Hidden Field 삭제 불가 | 토스트 에러 메시지 표시 |
| AC-020-04 | 리콜에서 사용 중인 Hidden Field 삭제 불가 | 토스트 에러 메시지 표시 |
| AC-020-05 | 쿼터에서 사용 중인 Hidden Field 삭제 불가 | 토스트 에러 메시지 표시 |
| AC-020-06 | Follow-up에서 사용 중인 Hidden Field 삭제 불가 | 토스트 에러 메시지 표시 |
| AC-021-01 | #recall:id/fallback:val# 패턴이 올바르게 파싱됨 | ID 추출, fallback 값 추출 테스트 |
| AC-021-02 | 변수값 우선, 응답 데이터 차순으로 해석 | 리콜 값 해석 우선순위 테스트 |
| AC-021-03 | 값이 없으면 fallback 값 표시 | fallback 값 치환 확인 |
| AC-021-04 | 날짜 응답값이 포매팅됨 | 날짜 포매팅 적용 확인 |
| AC-021-05 | 배열 응답값이 쉼표로 연결됨 | 쉼표 연결 결과 확인 |
| AC-021-06 | 빈 fallback 값 경고 | 빈 fallback 검증 시 비null 반환 |
| AC-021-07 | 에디터에서 @라벨명 형태로 표시 | 에디터 표시 변환 확인 |
| AC-021-08 | 중첩 recall 무한 루프 방지 | 중첩 패턴 "___"로 대체 확인 |
