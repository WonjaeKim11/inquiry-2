# 기능 명세서 (Functional Specification) - 세그먼트 필터

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | 1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-027 (feature-segmantation/27-segment-filter.md) |
| FR 범위 | FR-045 (Segments) |
| 상태 | 초안 |
| 라이선스 요구 | Enterprise (contacts feature flag 필수) |

---

## 2. 개요

### 2.1 목적

세그먼트(Segment) 필터 기능의 상세 동작, 데이터 모델, 비즈니스 규칙, 인터페이스를 정의한다. 개발자가 이 문서만으로 구현할 수 있는 수준의 명세를 제공한다.

### 2.2 범위

**포함 범위 (In-scope)**:
- 세그먼트 CRUD (생성, 조회, 수정, 삭제, 복제)
- 4가지 필터 유형: Attribute, Person, Segment, Device
- 재귀적 AND/OR 논리 트리 구조
- 20개 이상의 연산자 (기본 6종, 문자열 4종, 존재 2종, 날짜 8종, 세그먼트 2종)
- 순환 참조 방지
- Private/Public 세그먼트 구분
- DB 쿼리 변환 (필터 -> SQL)
- 런타임 세그먼트 평가 (SDK 측)
- 필터 조작 유틸리티
- 날짜 유틸리티

**제외 범위 (Out-of-scope)**:
- 세그먼트 기반 자동 알림
- 세그먼트 통계/분석 대시보드
- 세그먼트 내보내기

### 2.3 대상 사용자

| 역할 | 설명 |
|------|------|
| Organization Owner/Manager | 세그먼트를 생성하고 관리하는 관리자 |
| Survey Creator | 설문 대상으로 세그먼트를 지정하는 설문 작성자 |
| SDK Runtime | 사용자 데이터를 기반으로 실시간 세그먼트 소속 여부를 평가하는 시스템 컴포넌트 |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| Segment(세그먼트) | 연락처(Contact)를 속성, 행동, 디바이스 등의 조건에 따라 그룹화한 논리적 집합 |
| Filter(필터) | 세그먼트 소속 여부를 판단하기 위한 개별 조건 |
| Filter Tree(필터 트리) | AND/OR 논리 커넥터로 연결된 재귀적 필터 그룹 구조 |
| Connector(커넥터) | 필터 간 논리 연결자. `and`, `or`, 또는 `null` (그룹 첫 번째 필터) |
| Leaf Node(리프 노드) | 필터 트리의 말단 노드. 실제 조건 평가가 이루어지는 단일 필터 |
| Resource(리소스) | 필터 항목의 내용. 단일 필터(리프 노드) 또는 하위 필터 그룹 |
| Private Segment | 특정 설문에 전용으로 연결된 비공개 세그먼트. `isPrivate=true` |
| Public Segment | 여러 설문에서 재사용 가능한 공개 세그먼트. `isPrivate=false` |
| Contact(연락처) | 시스템에 등록된 사용자 정보. 세그먼트 필터의 평가 대상 |
| Contact Attribute(연락처 속성) | 연락처에 부여된 키-값 쌍의 사용자 정의 속성 |
| Upsert | 레코드가 존재하면 갱신(Update)하고, 없으면 생성(Insert)하는 복합 연산 |
| Short-circuit Evaluation | 논리 연산에서 결과가 확정되면 나머지 조건을 평가하지 않는 최적화 기법 |
| RTM | Requirements Traceability Matrix. 요구사항 추적 매트릭스 |

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
+-------------------+       +-------------------+       +-------------------+
|   Admin UI        |       |   Server (API)    |       |   Database        |
|   (클라이언트)     | ----> |   세그먼트 CRUD   | ----> |   Segment 테이블  |
|   필터 편집기      |       |   필터 검증       |       |   Contact 테이블  |
+-------------------+       |   쿼리 변환       |       +-------------------+
                            +-------------------+
                                    ^
                                    |
                            +-------------------+
                            |   SDK Runtime     |
                            |   실시간 평가     |
                            +-------------------+
```

- **Admin UI**: 세그먼트를 생성/편집하는 프론트엔드. 필터 트리를 시각적으로 조작할 수 있는 UI를 제공한다.
- **Server (API)**: 세그먼트 CRUD, 필터 유효성 검증, 순환 참조 탐지, DB 쿼리 변환을 담당한다.
- **Database**: 세그먼트 정보와 필터 조건을 JSON 형태로 저장한다.
- **SDK Runtime**: 사용자 요청 시 실시간으로 세그먼트 소속 여부를 평가한다.

### 3.2 주요 기능 목록 (Feature List)

| 기능 ID | 기능명 | 관련 요구사항 | 우선순위 |
|---------|--------|--------------|---------|
| FN-027-01 | 세그먼트 데이터 모델 | FR-045-S01 | 필수 |
| FN-027-02 | Attribute 필터 | FR-045-S02 | 필수 |
| FN-027-03 | Person 필터 | FR-045-S02 | 필수 |
| FN-027-04 | Segment 필터 | FR-045-S02 | 필수 |
| FN-027-05 | Device 필터 | FR-045-S02 | 필수 |
| FN-027-06 | 연산자 체계 | FR-045-S03 | 필수 |
| FN-027-07 | 재귀적 필터 트리 | FR-045-S04 | 필수 |
| FN-027-08 | 순환 참조 방지 | FR-045-S05 | 필수 |
| FN-027-09 | Private/Public 세그먼트 관리 | FR-045-S06 | 필수 |
| FN-027-10 | 세그먼트 CRUD | FR-045-S07 | 필수 |
| FN-027-11 | DB 쿼리 변환 | FR-045-S08 | 필수 |
| FN-027-12 | 필터 조작 유틸리티 | FR-045-S09 | 필수 |
| FN-027-13 | 날짜 유틸리티 | FR-045-S10 | 필수 |

### 3.3 기능 간 관계도

```
FN-027-01 (데이터 모델)
    |
    +-- FN-027-09 (Private/Public 관리)
    |       |
    |       +-- FN-027-10 (CRUD)
    |
    +-- FN-027-07 (필터 트리)
            |
            +-- FN-027-02 (Attribute 필터)
            |       |
            |       +-- FN-027-06 (연산자 체계)
            |
            +-- FN-027-03 (Person 필터)
            |       |
            |       +-- FN-027-06 (연산자 체계)
            |
            +-- FN-027-04 (Segment 필터)
            |       |
            |       +-- FN-027-08 (순환 참조 방지)
            |
            +-- FN-027-05 (Device 필터)
            |
            +-- FN-027-11 (DB 쿼리 변환)
            |
            +-- FN-027-12 (필터 조작 유틸리티)
            |
            +-- FN-027-13 (날짜 유틸리티)
```

---

## 4. 상세 기능 명세

### 4.1 세그먼트 데이터 모델

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-027-01 |
| 기능명 | 세그먼트 데이터 모델 |
| 관련 요구사항 ID | FR-045-S01 |
| 우선순위 | 필수 |
| 기능 설명 | 세그먼트의 핵심 데이터 구조를 정의한다. 세그먼트는 필터 조건을 JSON 형태로 보유하며, 환경(Environment)에 소속되고 설문(Survey)과 연결된다. |

#### 4.1.2 선행 조건 (Preconditions)

- 환경(Environment)이 이미 생성되어 있어야 한다.
- Enterprise 라이선스가 활성화되어 있어야 한다.
- contacts feature flag가 활성화되어 있어야 한다.

#### 4.1.3 후행 조건 (Postconditions)

- 세그먼트 레코드가 데이터베이스에 저장된다.
- 환경 ID + 제목 유니크 제약이 적용된다.

#### 4.1.4 데이터 요구사항

**엔티티 필드 정의:**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 규칙 | 설명 |
|--------|------|------|--------|-------------|------|
| id | string (UUID/CUID) | Y | 자동 생성 | 고유 식별자 형식 | 세그먼트 고유 식별자 |
| createdAt | datetime | Y | 현재 시각 | ISO 8601 형식 | 생성 시각 |
| updatedAt | datetime | Y | 현재 시각 | ISO 8601 형식 | 마지막 수정 시각 |
| title | string | Y | - | 빈 문자열 불가. 환경 ID와 결합하여 유니크 | 세그먼트 이름 |
| description | string | N | null 또는 빈 문자열 | - | 세그먼트 설명 |
| isPrivate | boolean | Y | true | - | Private 세그먼트 여부 |
| filters | JSON array | Y | [] (빈 배열) | 유효한 필터 트리 구조 | 필터 조건 |
| environmentId | string | Y | - | 유효한 환경 ID 참조 | 소속 환경 식별자 |
| surveys | relation (1:N) | - | - | - | 이 세그먼트를 사용하는 설문 목록 |

**유니크 제약:**

| 제약명 | 구성 필드 | 설명 |
|--------|----------|------|
| segment_environment_title_unique | environmentId + title | 동일 환경 내에서 세그먼트 이름 중복 방지 |

---

### 4.2 Attribute 필터 (속성 필터)

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-027-02 |
| 기능명 | Attribute 필터 |
| 관련 요구사항 ID | FR-045-S02 |
| 우선순위 | 필수 |
| 기능 설명 | 연락처 속성(Contact Attribute)의 값을 기준으로 필터링한다. 속성 키를 지정하고, 해당 속성의 데이터 타입에 맞는 연산자로 조건을 평가한다. |

#### 4.2.2 선행 조건 (Preconditions)

- 세그먼트가 생성되어 있어야 한다.
- 필터에서 참조하는 속성 키가 정의되어 있어야 한다.

#### 4.2.3 후행 조건 (Postconditions)

- 필터 조건에 따라 연락처가 세그먼트에 포함되거나 제외된다.

#### 4.2.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | 필터 유형으로 "attribute"를 선택한다 |
| 2 | 시스템 | 사용 가능한 연락처 속성 키 목록을 표시한다 |
| 3 | 사용자 | 속성 키를 선택한다 |
| 4 | 시스템 | 선택된 속성의 데이터 타입에 따라 사용 가능한 연산자 목록을 표시한다 |
| 5 | 사용자 | 연산자를 선택하고 비교 값을 입력한다 |
| 6 | 시스템 | 필터를 세그먼트의 필터 트리에 추가한다 |

#### 4.2.5 대안 흐름 (Alternative Flow)

- **AF-02-01**: 사용자가 isSet 또는 isNotSet 연산자를 선택한 경우, 비교 값 입력을 요구하지 않는다.

#### 4.2.6 예외 흐름 (Exception Flow)

- **EF-02-01**: 존재하지 않는 속성 키를 지정한 경우, 유효성 검증 에러를 반환한다.
- **EF-02-02**: 속성 데이터 타입과 호환되지 않는 연산자를 사용한 경우, 유효성 검증 에러를 반환한다.

#### 4.2.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-02-01 | 속성 타입별 연산자 제한 | string 타입 속성 | equals, notEquals, isSet, isNotSet, contains, doesNotContain, startsWith, endsWith만 사용 가능 |
| BR-02-02 | 속성 타입별 연산자 제한 | number 타입 속성 | equals, notEquals, lessThan, lessEqual, greaterThan, greaterEqual, isSet, isNotSet만 사용 가능 |
| BR-02-03 | 속성 타입별 연산자 제한 | date 타입 속성 | isOlderThan, isNewerThan, isBefore, isAfter, isBetween, isSameDay, isSet, isNotSet만 사용 가능 |

#### 4.2.8 데이터 요구사항

**필터 데이터 구조:**

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| type | string (enum) | Y | 값: `"attribute"` |
| attributeKey | string | Y | 연락처 속성 키 이름 |
| operator | string (enum) | Y | 데이터 타입에 따른 연산자 |
| value | string / number / object | 조건부 | 비교 값. isSet/isNotSet일 때는 불필요 |

---

### 4.3 Person 필터 (사용자 식별자 필터)

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-027-03 |
| 기능명 | Person 필터 |
| 관련 요구사항 ID | FR-045-S02 |
| 우선순위 | 필수 |
| 기능 설명 | 사용자 식별자(userId) 기반으로 연락처를 필터링한다. 현재 userId 필드만 지원한다. |

#### 4.3.2 선행 조건 (Preconditions)

- 세그먼트가 생성되어 있어야 한다.

#### 4.3.3 후행 조건 (Postconditions)

- 필터 조건에 따라 userId가 일치/불일치하는 연락처가 세그먼트에 포함되거나 제외된다.

#### 4.3.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | 필터 유형으로 "person"을 선택한다 |
| 2 | 시스템 | 사용 가능한 필드 목록(현재 userId만)을 표시한다 |
| 3 | 사용자 | 문자열 연산자를 선택하고 비교 값을 입력한다 |
| 4 | 시스템 | 필터를 세그먼트의 필터 트리에 추가한다 |

#### 4.3.5 대안 흐름 (Alternative Flow)

- **AF-03-01**: 사용자가 isSet/isNotSet 연산자를 선택한 경우, 비교 값 입력을 요구하지 않는다.

#### 4.3.6 예외 흐름 (Exception Flow)

- **EF-03-01**: userId 이외의 필드를 지정한 경우, 유효성 검증 에러를 반환한다.

#### 4.3.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-03-01 | 지원 필드 제한 | Person 필터 | 현재 userId 필드만 지원 |
| BR-03-02 | 연산자 제한 | Person 필터 (userId는 string) | 문자열 타입 연산자만 사용 가능: equals, notEquals, isSet, isNotSet, contains, doesNotContain, startsWith, endsWith |

#### 4.3.8 데이터 요구사항

**필터 데이터 구조:**

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| type | string (enum) | Y | 값: `"person"` |
| personIdentifier | string | Y | 값: `"userId"` (현재 유일) |
| operator | string (enum) | Y | 문자열 타입 연산자 |
| value | string | 조건부 | 비교 값. isSet/isNotSet일 때는 불필요 |

---

### 4.4 Segment 필터 (세그먼트 포함/제외 필터)

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-027-04 |
| 기능명 | Segment 필터 |
| 관련 요구사항 ID | FR-045-S02, FR-045-S05 |
| 우선순위 | 필수 |
| 기능 설명 | 다른 세그먼트에 포함/미포함 여부로 연락처를 필터링한다. 순환 참조를 방지하기 위해 참조 관계를 재귀적으로 검증한다. |

#### 4.4.2 선행 조건 (Preconditions)

- 세그먼트가 생성되어 있어야 한다.
- 참조 대상 세그먼트가 이미 존재해야 한다.

#### 4.4.3 후행 조건 (Postconditions)

- 참조된 세그먼트의 평가 결과에 따라 연락처가 포함/제외된다.
- 순환 참조가 발생하지 않는다.

#### 4.4.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | 필터 유형으로 "segment"를 선택한다 |
| 2 | 시스템 | 현재 환경 내 사용 가능한 세그먼트 목록을 표시한다 (자기 자신 제외) |
| 3 | 사용자 | 참조할 세그먼트를 선택한다 |
| 4 | 사용자 | `userIsIn` 또는 `userIsNotIn` 연산자를 선택한다 |
| 5 | 시스템 | 순환 참조 검증을 수행한다 |
| 6 | 시스템 | 검증 통과 시 필터를 세그먼트의 필터 트리에 추가한다 |

#### 4.4.5 대안 흐름 (Alternative Flow)

- 없음

#### 4.4.6 예외 흐름 (Exception Flow)

- **EF-04-01**: 직접 순환 참조 감지 (자기 자신을 참조하는 경우). "재귀적 세그먼트 필터는 허용되지 않습니다" 에러를 반환한다.
- **EF-04-02**: 간접 순환 참조 감지 (A -> B -> A 등). "재귀적 세그먼트 필터는 허용되지 않습니다" 에러를 반환한다.
- **EF-04-03**: 참조 대상 세그먼트가 삭제된 경우, 유효성 검증 에러를 반환한다.

#### 4.4.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-04-01 | 순환 참조 금지 | 세그먼트 필터 저장/수정 시 | 직접 및 간접 순환 참조를 재귀적으로 탐지하고, 발견 시 에러 반환 |
| BR-04-02 | 전용 연산자 | Segment 필터 | userIsIn, userIsNotIn만 사용 가능 |

#### 4.4.8 데이터 요구사항

**필터 데이터 구조:**

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| type | string (enum) | Y | 값: `"segment"` |
| segmentId | string | Y | 참조 대상 세그먼트 ID |
| operator | string (enum) | Y | `userIsIn` 또는 `userIsNotIn` |

---

### 4.5 Device 필터 (디바이스 유형 필터)

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-027-05 |
| 기능명 | Device 필터 |
| 관련 요구사항 ID | FR-045-S02 |
| 우선순위 | 필수 |
| 기능 설명 | 사용자의 디바이스 유형(phone 또는 desktop)을 기준으로 필터링한다. |

#### 4.5.2 선행 조건 (Preconditions)

- 세그먼트가 생성되어 있어야 한다.
- SDK 런타임에서 디바이스 유형 정보가 제공되어야 한다.

#### 4.5.3 후행 조건 (Postconditions)

- 디바이스 유형 조건에 따라 연락처가 세그먼트에 포함되거나 제외된다.

#### 4.5.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | 필터 유형으로 "device"를 선택한다 |
| 2 | 시스템 | 디바이스 유형 선택지(phone, desktop)를 표시한다 |
| 3 | 사용자 | 디바이스 유형을 선택한다 |
| 4 | 사용자 | `equals` 또는 `notEquals` 연산자를 선택한다 |
| 5 | 시스템 | 필터를 세그먼트의 필터 트리에 추가한다 |

#### 4.5.5 대안 흐름 (Alternative Flow)

- 없음

#### 4.5.6 예외 흐름 (Exception Flow)

- **EF-05-01**: phone, desktop 이외의 디바이스 유형이 지정된 경우, 유효성 검증 에러를 반환한다.

#### 4.5.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-05-01 | 디바이스 유형 제한 | Device 필터 | `phone` 또는 `desktop`만 허용 |
| BR-05-02 | 연산자 제한 | Device 필터 | `equals`, `notEquals`만 사용 가능 |

#### 4.5.8 데이터 요구사항

**필터 데이터 구조:**

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| type | string (enum) | Y | 값: `"device"` |
| deviceType | string (enum) | Y | `"phone"` 또는 `"desktop"` |
| operator | string (enum) | Y | `equals` 또는 `notEquals` |

---

### 4.6 연산자 체계

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-027-06 |
| 기능명 | 연산자 체계 |
| 관련 요구사항 ID | FR-045-S03 |
| 우선순위 | 필수 |
| 기능 설명 | 필터 조건 평가에 사용되는 모든 연산자를 정의한다. 연산자는 데이터 타입에 따라 분류되며, 각 필터 유형에서 사용 가능한 연산자가 제한된다. |

#### 4.6.2 비즈니스 규칙 (Business Rules)

**기본 연산자 (6종):**

| 연산자 | 설명 | 평가 로직 | 적용 타입 |
|--------|------|-----------|----------|
| equals | 같음 | `contactValue === filterValue` | string, number |
| notEquals | 같지 않음 | `contactValue !== filterValue` | string, number |
| lessThan | 미만 | `contactValue < filterValue` | number |
| lessEqual | 이하 | `contactValue <= filterValue` | number |
| greaterThan | 초과 | `contactValue > filterValue` | number |
| greaterEqual | 이상 | `contactValue >= filterValue` | number |

**문자열 연산자 (4종):**

| 연산자 | 설명 | 평가 로직 |
|--------|------|-----------|
| contains | 포함 | `contactValue.includes(filterValue)` |
| doesNotContain | 미포함 | `!contactValue.includes(filterValue)` |
| startsWith | 시작 문자열 | `contactValue.startsWith(filterValue)` |
| endsWith | 끝 문자열 | `contactValue.endsWith(filterValue)` |

**존재 연산자 (2종):**

| 연산자 | 설명 | 평가 로직 |
|--------|------|-----------|
| isSet | 값이 설정됨 | 값이 `undefined`, `null`, 빈 문자열이 아님 |
| isNotSet | 값이 미설정 | 값이 `undefined`, `null`, 또는 빈 문자열 |

**날짜 전용 연산자 (8종):**

| 연산자 | 설명 | 값 형식 | 평가 로직 |
|--------|------|---------|-----------|
| isOlderThan | N 단위 이전 | `{ value: number, unit: TimeUnit }` | `contactDate < (now - N unit)` |
| isNewerThan | N 단위 이내 | `{ value: number, unit: TimeUnit }` | `contactDate > (now - N unit)` |
| isBefore | 특정 날짜 이전 | ISO 8601 문자열 | `contactDate < filterDate` |
| isAfter | 특정 날짜 이후 | ISO 8601 문자열 | `contactDate > filterDate` |
| isBetween | 두 날짜 사이 | `{ start: ISO8601, end: ISO8601 }` | `start <= contactDate <= end` (양쪽 포함) |
| isSameDay | 같은 날 | ISO 8601 문자열 | UTC 기준 동일 날짜 여부 확인 |
| isSet | 날짜 설정됨 | - | 날짜 값이 존재하고 유효함 |
| isNotSet | 날짜 미설정 | - | 날짜 값이 없거나 유효하지 않음 |

**시간 단위 (TimeUnit):**

| 값 | 설명 |
|-----|------|
| days | 일 |
| weeks | 주 |
| months | 월 |
| years | 년 |

**세그먼트 연산자 (2종):**

| 연산자 | 설명 | 평가 로직 |
|--------|------|-----------|
| userIsIn | 해당 세그먼트에 포함 | 참조 세그먼트의 필터를 평가하여 true 반환 시 포함 |
| userIsNotIn | 해당 세그먼트에 미포함 | 참조 세그먼트의 필터를 평가하여 false 반환 시 포함 |

#### 4.6.3 데이터 요구사항

**타입별 사용 가능 연산자 매트릭스:**

| 데이터 타입 | equals | notEquals | lessThan | lessEqual | greaterThan | greaterEqual | contains | doesNotContain | startsWith | endsWith | isSet | isNotSet | isOlderThan | isNewerThan | isBefore | isAfter | isBetween | isSameDay |
|------------|--------|-----------|----------|-----------|-------------|--------------|----------|----------------|------------|----------|-------|----------|-------------|-------------|----------|---------|-----------|-----------|
| string | O | O | - | - | - | - | O | O | O | O | O | O | - | - | - | - | - | - |
| number | O | O | O | O | O | O | - | - | - | - | O | O | - | - | - | - | - | - |
| date | - | - | - | - | - | - | - | - | - | - | O | O | O | O | O | O | O | O |

---

### 4.7 재귀적 필터 트리

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-027-07 |
| 기능명 | 재귀적 필터 트리 구조 |
| 관련 요구사항 ID | FR-045-S04 |
| 우선순위 | 필수 |
| 기능 설명 | 필터를 재귀적 AND/OR 트리 구조로 표현하고 평가한다. 중첩 그룹을 지원하여 복잡한 조건 조합이 가능하다. |

#### 4.7.2 선행 조건 (Preconditions)

- 세그먼트에 하나 이상의 필터가 정의되어 있어야 한다. (빈 필터 배열은 true로 평가됨)

#### 4.7.3 후행 조건 (Postconditions)

- 필터 트리 평가 결과로 boolean 값(포함 여부)이 반환된다.

#### 4.7.4 기본 흐름 (Basic Flow) - 필터 트리 평가

| 단계 | 동작 |
|------|------|
| 1 | 필터 배열이 비어있는지 확인한다. 비어있으면 `true`를 반환한다. |
| 2 | 필터 배열을 순회하며 각 필터를 평가한다. |
| 3 | 각 필터 항목에 대해 리소스 유형을 확인한다. 리프 노드이면 해당 필터 유형의 평가 함수를 호출한다. 하위 그룹이면 재귀적으로 평가한다. |
| 4 | AND 커넥터로 연결된 필터들을 연속 평가한다. 하나라도 false이면 해당 AND 블록 전체를 false로 처리한다 (short-circuit). |
| 5 | OR 커넥터로 연결된 필터들을 이후 평가한다. 하나라도 true이면 최종 결과를 true로 반환한다. |
| 6 | 중간 결과를 배열에 저장하여 최종 OR 평가를 수행한다. |

#### 4.7.5 대안 흐름 (Alternative Flow)

- **AF-07-01**: 빈 필터 배열 (`filters: []`). 모든 연락처를 포함한다 (true 반환).

#### 4.7.6 예외 흐름 (Exception Flow)

- **EF-07-01**: 그룹의 첫 번째 필터의 커넥터가 null이 아닌 경우, 유효성 검증 에러를 반환한다.
- **EF-07-02**: 알 수 없는 필터 유형이 포함된 경우, 유효성 검증 에러를 반환한다.

#### 4.7.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-07-01 | 첫 번째 커넥터 null 강제 | 각 그룹(최상위 포함)의 첫 번째 필터 | 커넥터 값이 반드시 null이어야 함 |
| BR-07-02 | 빈 필터 = 전체 포함 | `filters` 배열이 비어있는 경우 | true를 반환하여 모든 연락처 포함 |
| BR-07-03 | AND 우선 평가 | AND 커넥터 | AND로 연결된 필터들을 먼저 연속 평가 (short-circuit) |
| BR-07-04 | OR 후속 평가 | OR 커넥터 | AND 블록 결과들을 OR로 최종 평가 |
| BR-07-05 | 재귀적 검증 | 중첩 그룹 | 모든 하위 그룹에 대해 동일한 검증 규칙을 재귀적으로 적용 |

#### 4.7.8 데이터 요구사항

**필터 항목 (Filter Item) 구조:**

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| id | string | Y | 필터 항목의 고유 식별자 |
| connector | string (enum) / null | Y | `"and"`, `"or"`, 또는 `null`. 그룹 첫 번째 항목은 반드시 null |
| resource | FilterResource | Y | 단일 필터(리프 노드) 또는 하위 필터 그룹 |

**FilterResource 유형:**

- **리프 노드**: Attribute/Person/Segment/Device 필터 중 하나
- **그룹 노드**: Filter Item의 배열 (재귀 구조)

**필터 트리 예시 (JSON):**

```json
[
  {
    "id": "filter-1",
    "connector": null,
    "resource": {
      "type": "attribute",
      "attributeKey": "plan",
      "operator": "equals",
      "value": "enterprise"
    }
  },
  {
    "id": "filter-2",
    "connector": "and",
    "resource": {
      "type": "person",
      "personIdentifier": "userId",
      "operator": "isSet"
    }
  },
  {
    "id": "filter-3",
    "connector": "or",
    "resource": [
      {
        "id": "filter-3-1",
        "connector": null,
        "resource": {
          "type": "device",
          "deviceType": "phone",
          "operator": "equals"
        }
      },
      {
        "id": "filter-3-2",
        "connector": "and",
        "resource": {
          "type": "attribute",
          "attributeKey": "country",
          "operator": "equals",
          "value": "KR"
        }
      }
    ]
  }
]
```

위 예시의 평가 로직: `(plan == "enterprise" AND userId is set) OR (device == phone AND country == "KR")`

---

### 4.8 순환 참조 방지

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-027-08 |
| 기능명 | 순환 참조 방지 |
| 관련 요구사항 ID | FR-045-S05 |
| 우선순위 | 필수 |
| 기능 설명 | 세그먼트 필터에서 다른 세그먼트를 참조할 때, 직접 또는 간접적인 순환 참조를 재귀적으로 탐지하여 무한 루프를 방지한다. |

#### 4.8.2 선행 조건 (Preconditions)

- 세그먼트 필터에 Segment 유형의 필터가 포함되어 있어야 한다.

#### 4.8.3 후행 조건 (Postconditions)

- 순환 참조가 없는 경우: 필터 저장/수정이 정상 완료된다.
- 순환 참조가 있는 경우: 에러가 반환되고 필터 저장/수정이 거부된다.

#### 4.8.4 기본 흐름 (Basic Flow) - 순환 참조 탐지 알고리즘

| 단계 | 동작 |
|------|------|
| 1 | 현재 세그먼트의 필터 트리를 순회한다. |
| 2 | Segment 유형 필터를 발견하면 참조된 세그먼트 ID를 추출한다. |
| 3 | 참조된 세그먼트 ID가 현재 세그먼트 ID와 동일한지 확인한다. 동일하면 순환 참조로 판정한다. |
| 4 | 동일하지 않으면 참조된 세그먼트의 필터 트리를 조회하여 단계 1부터 재귀적으로 탐지를 수행한다. |
| 5 | 모든 경로에서 순환이 발견되지 않으면 검증을 통과한다. |

#### 4.8.5 예외 흐름 (Exception Flow)

- **EF-08-01**: 직접 순환 참조 발견 (세그먼트 A가 자기 자신을 참조). "재귀적 세그먼트 필터는 허용되지 않습니다" 에러를 반환한다.
- **EF-08-02**: 간접 순환 참조 발견 (A -> B -> A, 또는 A -> B -> C -> A 등). "재귀적 세그먼트 필터는 허용되지 않습니다" 에러를 반환한다.

#### 4.8.6 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-08-01 | 직접 순환 금지 | segmentId == currentSegmentId | 에러 반환 |
| BR-08-02 | 간접 순환 금지 | 참조 체인에서 currentSegmentId 재등장 | 에러 반환 |
| BR-08-03 | 재귀적 탐지 | 모든 깊이의 참조를 탐색 | 순환이 발견될 때까지 또는 모든 경로 검증 완료까지 탐색 |

---

### 4.9 Private/Public 세그먼트 관리

#### 4.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-027-09 |
| 기능명 | Private/Public 세그먼트 관리 |
| 관련 요구사항 ID | FR-045-S06 |
| 우선순위 | 필수 |
| 기능 설명 | 세그먼트를 Private(설문 전용) 또는 Public(재사용 가능) 두 가지 가시성으로 구분하여 관리한다. |

#### 4.9.2 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | Private | Public |
|---------|------|---------|--------|
| BR-09-01 | isPrivate 값 | true | false |
| BR-09-02 | 제목 생성 방식 | surveyId 값으로 자동 생성 | 사용자가 직접 지정 |
| BR-09-03 | 재사용 범위 | 해당 설문에서만 사용 가능 | 여러 설문에서 공유 가능 |
| BR-09-04 | 생성 방식 | 설문 생성 시 자동 (upsert) | 사용자가 명시적으로 생성 |
| BR-09-05 | 삭제 정책 | 설문 삭제 시 함께 삭제 | 연결된 설문이 없을 때만 삭제 가능 |
| BR-09-06 | Upsert 처리 | 환경 ID + 제목(surveyId) 유니크 제약을 활용하여 중복 생성 방지 | 해당 없음 |

#### 4.9.3 기본 흐름 (Basic Flow) - Private 세그먼트 생성

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | 설문 생성 또는 세그먼트 설정 시 해당 설문의 surveyId를 제목으로 사용하여 세그먼트를 생성한다. |
| 2 | 시스템 | 환경 ID + surveyId 조합으로 기존 세그먼트를 조회한다. |
| 3a | 시스템 | 기존 세그먼트가 없으면 새로 생성한다 (isPrivate=true). |
| 3b | 시스템 | 기존 세그먼트가 있으면 필터를 갱신한다 (upsert). |

#### 4.9.4 기본 흐름 (Basic Flow) - Public 세그먼트 생성

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | 세그먼트 관리 화면에서 새 세그먼트 생성을 요청한다. |
| 2 | 사용자 | 세그먼트 제목, 설명, 필터 조건을 입력한다. |
| 3 | 시스템 | isPrivate=false로 세그먼트를 생성한다. |
| 4 | 시스템 | 환경 ID + 제목 유니크 제약을 검증한다. |

#### 4.9.5 예외 흐름 (Exception Flow)

- **EF-09-01**: 동일 환경에 동일 제목의 세그먼트가 이미 존재하는 경우 (Public 생성 시), 중복 에러를 반환한다.

---

### 4.10 세그먼트 CRUD

#### 4.10.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-027-10 |
| 기능명 | 세그먼트 CRUD |
| 관련 요구사항 ID | FR-045-S07 |
| 우선순위 | 필수 |
| 기능 설명 | 세그먼트의 생성(Create), 조회(Read), 수정(Update), 삭제(Delete), 복제(Clone), 리셋(Reset) 기능을 제공한다. |

#### 4.10.2 선행 조건 (Preconditions)

- 사용자가 Organization Owner 또는 Manager 권한을 보유해야 한다.
- Enterprise 라이선스 및 contacts feature flag가 활성화되어 있어야 한다.

#### 4.10.3 기본 흐름 - 생성 (Create)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | 세그먼트 생성을 요청한다 (제목, 설명, 필터, isPrivate 지정). |
| 2 | 시스템 | 입력값 유효성을 검증한다 (제목 필수, 필터 구조 유효성, 순환 참조 검사). |
| 3 | 시스템 | 환경 ID + 제목 유니크 제약을 확인한다. |
| 4 | 시스템 | 세그먼트를 데이터베이스에 저장한다. |
| 5 | 시스템 | 생성된 세그먼트 정보를 반환한다. |

#### 4.10.4 기본 흐름 - 조회 (Read)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자/시스템 | 세그먼트 ID 또는 환경 ID 기준으로 조회를 요청한다. |
| 2 | 시스템 | 단일 세그먼트 조회 또는 환경 내 전체 세그먼트 목록을 반환한다. |

#### 4.10.5 기본 흐름 - 수정 (Update)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | 세그먼트 수정을 요청한다 (제목, 설명, 필터 변경). |
| 2 | 시스템 | 입력값 유효성을 검증한다 (필터 구조, 순환 참조 검사). |
| 3 | 시스템 | 환경 ID + 제목 유니크 제약을 확인한다 (제목 변경 시). |
| 4 | 시스템 | updatedAt을 현재 시각으로 갱신하고 저장한다. |
| 5 | 시스템 | 수정된 세그먼트 정보를 반환한다. |

#### 4.10.6 기본 흐름 - 삭제 (Delete)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | 세그먼트 삭제를 요청한다. |
| 2 | 시스템 | 해당 세그먼트에 연결된 설문이 있는지 확인한다. |
| 3a | 시스템 | 연결된 설문이 없으면 세그먼트를 삭제한다. |
| 3b | 시스템 | 연결된 설문이 있으면 에러를 반환한다. |

#### 4.10.7 기본 흐름 - 복제 (Clone)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | 세그먼트 복제를 요청한다. |
| 2 | 시스템 | 원본 세그먼트의 모든 속성을 복사한다. |
| 3 | 시스템 | 제목을 `"Copy of {원본 제목} ({번호})"` 형식으로 자동 생성한다. 번호는 동일 패턴의 기존 복제본 수에 따라 증가한다. |
| 4 | 시스템 | 새로운 ID를 부여하고 세그먼트를 생성한다. |
| 5 | 시스템 | 복제된 세그먼트 정보를 반환한다. |

#### 4.10.8 기본 흐름 - 리셋 (Reset)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 사용자 | 설문의 세그먼트 필터 리셋을 요청한다. |
| 2 | 시스템 | 해당 세그먼트의 필터를 빈 배열 `[]`로 초기화한다. |
| 3 | 시스템 | 리셋된 세그먼트 정보를 반환한다. |

#### 4.10.9 예외 흐름 (Exception Flow)

- **EF-10-01**: 삭제 시 연결된 설문이 존재하는 경우. "설문에 연결된 세그먼트는 삭제할 수 없습니다" 에러를 반환한다.
- **EF-10-02**: 생성/수정 시 환경 ID + 제목 유니크 제약 위반. 중복 세그먼트 에러를 반환한다.
- **EF-10-03**: 존재하지 않는 세그먼트 ID로 조회/수정/삭제를 시도한 경우. "세그먼트를 찾을 수 없습니다" 에러를 반환한다.

#### 4.10.10 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-10-01 | 삭제 제한 | 연결된 설문이 1개 이상 존재 | 삭제 불가, 에러 반환 |
| BR-10-02 | 복제 제목 형식 | 세그먼트 복제 시 | `"Copy of {원본 제목} ({번호})"` 자동 생성 |
| BR-10-03 | 리셋 동작 | 필터 리셋 요청 시 | 필터를 빈 배열 `[]`로 초기화 |
| BR-10-04 | Private upsert | Private 세그먼트 생성 시 | 환경 ID + title 기준으로 upsert 처리 |

---

### 4.11 DB 쿼리 변환

#### 4.11.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-027-11 |
| 기능명 | DB 쿼리 변환 |
| 관련 요구사항 ID | FR-045-S08 |
| 우선순위 | 필수 |
| 기능 설명 | 세그먼트 필터 트리를 데이터베이스 쿼리 조건으로 변환하여 연락처 조회에 사용한다. |

#### 4.11.2 선행 조건 (Preconditions)

- 유효한 필터 트리가 존재해야 한다.

#### 4.11.3 후행 조건 (Postconditions)

- 필터 트리에 해당하는 DB 쿼리 조건이 생성된다.

#### 4.11.4 비즈니스 규칙 (Business Rules) - 변환 규칙

**숫자 비교 변환:**

| 필터 연산자 | SQL 연산자 |
|------------|-----------|
| equals | `=` |
| notEquals | `!=` |
| lessThan | `<` |
| lessEqual | `<=` |
| greaterThan | `>` |
| greaterEqual | `>=` |

**문자열 비교 변환:**

| 필터 연산자 | DB 변환 방식 |
|------------|-------------|
| equals | 정확 일치 |
| notEquals | 불일치 |
| contains | 부분 문자열 포함 검색 |
| doesNotContain | 부분 문자열 미포함 검색 |
| startsWith | 시작 문자열 일치 |
| endsWith | 끝 문자열 일치 |

**날짜 비교 변환:**

| 규칙 ID | 규칙 | 설명 |
|---------|------|------|
| BR-11-01 | 하위 호환성 | 날짜 전용 컬럼과 문자열(ISO) 값 양쪽 모두를 OR 조건으로 처리 (마이그레이션 호환) |
| BR-11-02 | 상대 날짜 계산 | isOlderThan/isNewerThan은 현재 시각 기준으로 시간 단위를 계산하여 절대 날짜로 변환 후 비교 |
| BR-11-03 | 범위 검색 | isBetween은 시작/종료 날짜를 각각 하루 시작(00:00:00.000)/하루 끝(23:59:59.999)으로 변환하여 범위 검색 |
| BR-11-04 | 같은 날 검색 | isSameDay는 해당 날짜의 하루 시작~하루 끝 범위로 변환하여 검색 |

**논리 커넥터 변환:**

| 필터 커넥터 | SQL 변환 |
|------------|---------|
| and | `AND` |
| or | `OR` |
| 중첩 그룹 | 괄호 `()` 로 감싸서 변환 |

---

### 4.12 필터 조작 유틸리티

#### 4.12.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-027-12 |
| 기능명 | 필터 조작 유틸리티 |
| 관련 요구사항 ID | FR-045-S09 |
| 우선순위 | 필수 |
| 기능 설명 | 필터 트리를 프로그래밍 방식으로 조작할 수 있는 유틸리티 함수 모음을 제공한다. UI에서 필터 편집 시 사용된다. |

#### 4.12.2 유틸리티 함수 목록

| 함수명 | 입력 | 출력 | 설명 |
|--------|------|------|------|
| addFilterBelow | (filters, targetFilterId, newFilter) | 수정된 필터 배열 | 특정 필터 아래(다음 위치)에 새 필터를 추가한다 |
| createGroupFromFilter | (filters, targetFilterId) | 수정된 필터 배열 | 특정 필터를 하위 그룹으로 래핑한다 |
| moveFilter | (filters, filterIdToMove, direction) | 수정된 필터 배열 | 필터의 순서를 위(up) 또는 아래(down)로 변경한다 |
| deleteFilter | (filters, filterIdToDelete) | 수정된 필터 배열 | 필터를 삭제하고, 삭제 후 빈 그룹이 되면 해당 그룹도 자동 정리한다 |
| addFilterToGroup | (filters, groupId, newFilter) | 수정된 필터 배열 | 그룹 내에 새 필터를 추가한다 |
| toggleConnector | (filters, filterId, newConnector) | 수정된 필터 배열 | 필터 또는 그룹의 커넥터를 AND/OR로 전환한다 |
| changeOperator | (filters, filterId, newOperator) | 수정된 필터 배열 | 필터의 연산자를 변경한다 |
| changeFilterValue | (filters, filterId, newValue) | 수정된 필터 배열 | 필터의 비교 값을 변경한다 |
| changeAttributeKey | (filters, filterId, newAttributeKey) | 수정된 필터 배열 | Attribute 필터의 속성 키를 변경한다 |
| changeSegmentReference | (filters, filterId, newSegmentId) | 수정된 필터 배열 | Segment 필터의 참조 대상 세그먼트를 변경한다 |
| changeDeviceType | (filters, filterId, newDeviceType) | 수정된 필터 배열 | Device 필터의 디바이스 유형을 변경한다 |
| isAdvancedSegment | (filters) | boolean | attribute/person 외 필터(segment, device)가 포함되어 있는지 확인한다 |
| isAttributeKeyUsed | (filters, attributeKey) | boolean | 특정 속성 키가 필터 트리에서 사용 중인지 재귀적으로 검색한다 |

#### 4.12.3 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-12-01 | 빈 그룹 자동 정리 | 필터 삭제 후 그룹이 비어있게 된 경우 | 해당 빈 그룹을 자동으로 제거 |
| BR-12-02 | 첫 번째 커넥터 보정 | 필터 삭제/이동으로 첫 번째 위치가 변경된 경우 | 새로운 첫 번째 필터의 커넥터를 null로 자동 설정 |
| BR-12-03 | 고급 세그먼트 판별 | 필터에 segment 또는 device 유형이 포함됨 | isAdvancedSegment가 true를 반환 |

---

### 4.13 날짜 유틸리티

#### 4.13.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-027-13 |
| 기능명 | 날짜 유틸리티 |
| 관련 요구사항 ID | FR-045-S10 |
| 우선순위 | 필수 |
| 기능 설명 | 날짜 연산자 평가 및 DB 쿼리 변환에 필요한 날짜 관련 유틸리티 함수를 제공한다. 모든 날짜 처리는 UTC 기준으로 수행한다. |

#### 4.13.2 유틸리티 함수 목록

| 함수명 | 입력 | 출력 | 설명 |
|--------|------|------|------|
| subtractTimeUnit | (date, value, unit) | Date | 주어진 날짜에서 지정된 시간 단위만큼 뺀다 |
| addTimeUnit | (date, value, unit) | Date | 주어진 날짜에 지정된 시간 단위만큼 더한다 |
| startOfDay | (date) | Date | UTC 기준 하루의 시작 시각 (00:00:00.000)을 반환한다 |
| endOfDay | (date) | Date | UTC 기준 하루의 끝 시각 (23:59:59.999)을 반환한다 |
| isSameDay | (date1, date2) | boolean | UTC 기준으로 두 날짜가 같은 날인지 확인한다 |
| toUTCDateString | (dateString) | string | `YYYY-MM-DD` 형식의 문자열을 UTC midnight ISO 문자열로 변환한다 |

#### 4.13.3 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-13-01 | UTC 기준 처리 | 모든 날짜 연산 | UTC 시간대를 기준으로 수행 |
| BR-13-02 | 시간 단위 지원 | subtractTimeUnit, addTimeUnit | days, weeks, months, years 4종만 지원 |
| BR-13-03 | 하루 경계 | startOfDay | T00:00:00.000Z |
| BR-13-04 | 하루 경계 | endOfDay | T23:59:59.999Z |

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

#### Segment (세그먼트)

| 필드명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| id | string (UUID/CUID) | Y | 자동 생성 | 고유 식별자 |
| createdAt | datetime | Y | 현재 시각 | 생성 시각 |
| updatedAt | datetime | Y | 현재 시각 | 수정 시각 |
| title | string | Y | - | 세그먼트 이름 |
| description | string | N | null | 세그먼트 설명 |
| isPrivate | boolean | Y | true | Private 여부 |
| filters | JSON (FilterItem[]) | Y | [] | 필터 트리 |
| environmentId | string (FK) | Y | - | 소속 환경 ID |

#### FilterItem (필터 항목)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| id | string | Y | 필터 항목 고유 ID |
| connector | "and" / "or" / null | Y | 논리 커넥터 |
| resource | FilterResource | Y | 리프 노드 또는 하위 그룹 |

#### AttributeFilter (속성 필터 리소스)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| type | "attribute" | Y | 필터 유형 |
| attributeKey | string | Y | 속성 키 |
| operator | OperatorEnum | Y | 연산자 |
| value | string / number / object | 조건부 | 비교 값 |

#### PersonFilter (사용자 필터 리소스)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| type | "person" | Y | 필터 유형 |
| personIdentifier | "userId" | Y | 식별자 필드명 |
| operator | StringOperatorEnum | Y | 문자열 연산자 |
| value | string | 조건부 | 비교 값 |

#### SegmentFilter (세그먼트 참조 필터 리소스)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| type | "segment" | Y | 필터 유형 |
| segmentId | string | Y | 참조 세그먼트 ID |
| operator | "userIsIn" / "userIsNotIn" | Y | 세그먼트 연산자 |

#### DeviceFilter (디바이스 필터 리소스)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| type | "device" | Y | 필터 유형 |
| deviceType | "phone" / "desktop" | Y | 디바이스 유형 |
| operator | "equals" / "notEquals" | Y | 디바이스 연산자 |

### 5.2 엔티티 간 관계

```
Environment (1) ──── (N) Segment
Segment     (N) ──── (N) Survey
Segment     (1) ──── (N) FilterItem
Segment     (1) ───> (0..N) Segment  [참조 관계, 순환 금지]
```

- **Environment - Segment**: 하나의 환경에 여러 세그먼트가 소속된다 (1:N).
- **Segment - Survey**: 하나의 세그먼트는 여러 설문에 연결될 수 있고, 하나의 설문은 여러 세그먼트를 가질 수 있다 (N:N).
- **Segment - FilterItem**: 세그먼트는 필터 항목의 트리 구조를 JSON으로 보유한다.
- **Segment - Segment**: Segment 필터를 통해 다른 세그먼트를 참조할 수 있다. 순환 참조는 금지된다.

### 5.3 데이터 흐름

```
[Admin UI]
    |
    | 1. 세그먼트 생성/수정 요청 (title, description, filters)
    v
[Server API]
    |
    | 2. 필터 유효성 검증 + 순환 참조 검사
    | 3. 유니크 제약 확인
    | 4. DB 저장
    v
[Database]
    |
    | 5. 세그먼트 + 필터(JSON) 저장
    v
[SDK Runtime]
    |
    | 6. 사용자 요청 시 세그먼트 필터 조회
    | 7. 필터 트리 평가 (연락처 데이터 기반)
    | 8. 포함 여부 boolean 반환
    v
[설문 표시 여부 결정]
```

---

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 연동 대상 | 방향 | 설명 |
|----------|------|------|
| SDK Runtime | Server -> SDK | 세그먼트 필터 조건 전달, SDK에서 실시간 평가 수행 |
| Survey Module | 양방향 | 설문과 세그먼트의 연결/해제 관리 |
| Contact Module | Server -> Contact | 필터 조건에 따른 연락처 조회 |
| Environment Module | 참조 | 세그먼트가 소속되는 환경 정보 |

### 6.2 API 명세

#### 6.2.1 세그먼트 생성

| 항목 | 내용 |
|------|------|
| 엔드포인트 | POST /segments |
| 권한 | Organization Owner/Manager |
| 요청 본문 | `{ title: string, description?: string, isPrivate: boolean, filters: FilterItem[], environmentId: string }` |
| 성공 응답 | 201 Created, 생성된 Segment 객체 |
| 에러 응답 | 400: 유효성 검증 실패, 409: 유니크 제약 위반 |

#### 6.2.2 세그먼트 목록 조회

| 항목 | 내용 |
|------|------|
| 엔드포인트 | GET /segments?environmentId={environmentId} |
| 권한 | Organization Owner/Manager, Survey Creator |
| 성공 응답 | 200 OK, Segment 배열 |

#### 6.2.3 세그먼트 단건 조회

| 항목 | 내용 |
|------|------|
| 엔드포인트 | GET /segments/{segmentId} |
| 권한 | Organization Owner/Manager, Survey Creator |
| 성공 응답 | 200 OK, Segment 객체 |
| 에러 응답 | 404: 세그먼트를 찾을 수 없음 |

#### 6.2.4 세그먼트 수정

| 항목 | 내용 |
|------|------|
| 엔드포인트 | PUT /segments/{segmentId} |
| 권한 | Organization Owner/Manager |
| 요청 본문 | `{ title?: string, description?: string, filters?: FilterItem[] }` |
| 성공 응답 | 200 OK, 수정된 Segment 객체 |
| 에러 응답 | 400: 유효성 검증 실패/순환 참조 감지, 404: 세그먼트를 찾을 수 없음, 409: 유니크 제약 위반 |

#### 6.2.5 세그먼트 삭제

| 항목 | 내용 |
|------|------|
| 엔드포인트 | DELETE /segments/{segmentId} |
| 권한 | Organization Owner/Manager |
| 성공 응답 | 204 No Content |
| 에러 응답 | 404: 세그먼트를 찾을 수 없음, 409: 연결된 설문이 존재하여 삭제 불가 |

#### 6.2.6 세그먼트 복제

| 항목 | 내용 |
|------|------|
| 엔드포인트 | POST /segments/{segmentId}/clone |
| 권한 | Organization Owner/Manager |
| 성공 응답 | 201 Created, 복제된 Segment 객체 |
| 에러 응답 | 404: 원본 세그먼트를 찾을 수 없음 |

#### 6.2.7 세그먼트 리셋

| 항목 | 내용 |
|------|------|
| 엔드포인트 | POST /segments/{segmentId}/reset |
| 권한 | Organization Owner/Manager |
| 성공 응답 | 200 OK, 리셋된 Segment 객체 (filters: []) |
| 에러 응답 | 404: 세그먼트를 찾을 수 없음 |

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| ID | 항목 | 내용 |
|----|------|------|
| NFR-S01 | 실시간 평가 | 세그먼트 평가는 SDK 요청 시 실시간으로 수행되어야 한다. 최대 허용 지연 시간 내에 응답해야 한다. |
| NFR-S04 | 캐싱 | 요청 단위 중복 제거 캐싱을 적용하여 동일 요청 내에서 동일 세그먼트를 중복 조회하지 않는다. |

### 7.2 보안 요구사항

| ID | 항목 | 내용 |
|----|------|------|
| NFR-SEC-01 | 라이선스 검증 | Enterprise 라이선스 및 contacts feature flag가 활성화되지 않은 환경에서는 세그먼트 기능에 접근할 수 없다. |
| NFR-SEC-02 | 권한 검증 | 세그먼트 CRUD는 Organization Owner/Manager 권한을 가진 사용자만 수행할 수 있다. |

### 7.3 가용성 요구사항

| ID | 항목 | 내용 |
|----|------|------|
| NFR-S02 | 무한 루프 방지 | 순환 참조 탐지로 세그먼트 필터의 무한 루프 실행을 차단한다. |
| NFR-S03 | 데이터 무결성 | 환경 ID + 제목 유니크 제약으로 세그먼트 이름 중복을 방지한다. |
| NFR-S05 | 하위 호환성 | 날짜 필터 DB 쿼리에서 날짜 전용 컬럼과 문자열(ISO) 값 모두를 OR 조건으로 지원하여 마이그레이션 과도기의 호환성을 보장한다. |

---

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| 항목 | 내용 |
|------|------|
| 필터 유형 | 4종으로 고정 (attribute, person, segment, device) |
| 디바이스 유형 | 2종으로 고정 (phone, desktop) |
| 논리 커넥터 | 3종으로 고정 (and, or, null) |
| 시간 단위 | 4종으로 고정 (days, weeks, months, years) |
| 필터 저장 형식 | JSON 배열 |
| 날짜 처리 기준 | UTC |
| Person 필터 필드 | 현재 userId만 지원 |

### 8.2 비즈니스 제약사항

| 항목 | 내용 |
|------|------|
| 라이선스 | Enterprise 라이선스 필수 |
| Feature flag | contacts feature flag 활성화 필수 |
| 세그먼트 이름 유니크 | 동일 환경 내에서 세그먼트 이름 중복 불가 |
| Public 세그먼트 삭제 | 연결된 설문이 없을 때만 가능 |

### 8.3 가정사항

| 항목 | 내용 |
|------|------|
| 환경 사전 존재 | 세그먼트 생성 시 유효한 환경이 이미 존재한다고 가정한다 |
| SDK 디바이스 정보 | SDK 런타임에서 사용자의 디바이스 유형 정보를 정확하게 제공한다고 가정한다 |
| 연락처 속성 정의 | 필터에서 참조하는 연락처 속성 키가 시스템에 정의되어 있다고 가정한다 |
| 시간 동기화 | 서버와 데이터베이스의 시간이 UTC 기준으로 동기화되어 있다고 가정한다 |

---

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 요구사항 설명 | 기능 명세 ID | 수용 기준 ID |
|------------|-------------|-------------|-------------|
| FR-045-S01 | Segment 데이터 모델 | FN-027-01 | AC-027-13, AC-027-16 |
| FR-045-S02 (Attribute) | Attribute 필터 | FN-027-02 | AC-027-01, AC-027-02, AC-027-03, AC-027-14, AC-027-15 |
| FR-045-S02 (Person) | Person 필터 | FN-027-03 | AC-027-14, AC-027-15 |
| FR-045-S02 (Segment) | Segment 필터 | FN-027-04 | AC-027-10, AC-027-11, AC-027-17 |
| FR-045-S02 (Device) | Device 필터 | FN-027-05 | AC-027-18 |
| FR-045-S03 | 연산자 체계 | FN-027-06 | AC-027-01 ~ AC-027-06, AC-027-14, AC-027-15 |
| FR-045-S04 | 재귀적 필터 트리 | FN-027-07 | AC-027-07, AC-027-08, AC-027-09, AC-027-16 |
| FR-045-S05 | 순환 참조 방지 | FN-027-08 | AC-027-10, AC-027-11 |
| FR-045-S06 | Private/Public 세그먼트 | FN-027-09 | AC-027-13 |
| FR-045-S07 | 세그먼트 CRUD 제약 | FN-027-10 | AC-027-12, AC-027-13 |
| FR-045-S08 | DB 쿼리 변환 | FN-027-11 | AC-027-01 ~ AC-027-06 |
| FR-045-S09 | 필터 조작 유틸리티 | FN-027-12 | - |
| FR-045-S10 | 날짜 유틸리티 | FN-027-13 | AC-027-04, AC-027-05, AC-027-06 |

### 9.2 수용 기준 매핑

| AC-ID | 기준 | 관련 기능 명세 |
|-------|------|--------------|
| AC-027-01 | Attribute 필터 equals 연산자 문자열 정확 일치 | FN-027-02, FN-027-06, FN-027-11 |
| AC-027-02 | contains 연산자 부분 문자열 매칭 | FN-027-02, FN-027-06, FN-027-11 |
| AC-027-03 | lessThan/greaterThan 숫자 비교 정확성 | FN-027-02, FN-027-06, FN-027-11 |
| AC-027-04 | isOlderThan/isNewerThan 상대 날짜 계산 정확성 | FN-027-06, FN-027-13 |
| AC-027-05 | isBetween 시작/종료 날짜 포함 범위 검색 | FN-027-06, FN-027-11, FN-027-13 |
| AC-027-06 | isSameDay UTC 기준 동일 날짜 반환 | FN-027-06, FN-027-13 |
| AC-027-07 | AND 조건 모두 충족 필요 | FN-027-07 |
| AC-027-08 | OR 조건 하나 충족 시 포함 | FN-027-07 |
| AC-027-09 | 중첩 그룹 올바른 평가 | FN-027-07 |
| AC-027-10 | 직접 순환 참조 에러 | FN-027-04, FN-027-08 |
| AC-027-11 | 간접 순환 참조 에러 | FN-027-04, FN-027-08 |
| AC-027-12 | 설문 연결 세그먼트 삭제 에러 | FN-027-10 |
| AC-027-13 | Private 세그먼트 upsert 중복 방지 | FN-027-01, FN-027-09, FN-027-10 |
| AC-027-14 | isSet 연산자 속성 존재 및 비어있지 않음 확인 | FN-027-06 |
| AC-027-15 | isNotSet 연산자 속성 없음/null/empty 확인 | FN-027-06 |
| AC-027-16 | 빈 필터 세그먼트 모든 연락처 포함 | FN-027-01, FN-027-07 |
| AC-027-17 | userIsIn/userIsNotIn 세그먼트 멤버십 필터링 | FN-027-04 |
| AC-027-18 | Device 필터 phone/desktop 구분 | FN-027-05 |

### 9.3 변경 이력

| 버전 | 일자 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2026-02-21 | - | 초안 작성. FSD-027 기반 기능 명세서 최초 작성 |
