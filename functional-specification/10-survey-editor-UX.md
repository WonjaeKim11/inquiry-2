# 기능 명세서 (Functional Specification) -- 설문 편집기 UX

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | 1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-010 설문 편집기 UX 요구사항 명세서 (FR-014) |
| 상태 | 초안 |

---

## 2. 개요

### 2.1 목적

본 문서는 Inquiry 설문 편집기 UX의 기능 명세를 정의한다. 요구사항 명세서 FSD-010(FR-014)을 기반으로, 편집기의 레이아웃, 탭 구조, Block 아키텍처, Welcome Card, Ending Card, 드래그 앤 드롭, Element ID 편집, Hidden Fields, Variables, Validation Rules 편집기 등 모든 편집기 구성 요소의 상세 동작을 기술한다.

### 2.2 범위

**포함 범위 (In-scope)**:
- 편집기 전체 레이아웃 및 4개 탭 구조 (Elements, Styling, Settings, Follow-Ups)
- SurveyMenuBar (이름 편집, 저장, 발행, 자동 저장)
- Block 아키텍처 (blocks -> elements + logic)
- Welcome Card 7가지 속성 편집
- Endings 2가지 유형 (endScreen, redirectToUrl)
- 드래그 앤 드롭 재정렬 (Block 및 Element 단위)
- Element ID 편집 및 prefill/startAt 용도
- Block 수준 로직 (Logic/Fallback)
- Hidden Fields 및 Variables 카드
- Validation Rules 편집기
- 실시간 프리뷰

**제외 범위 (Out-of-scope)**:
- 개별 질문 유형의 내부 동작 (FSD-009 참조)
- 서버 측 저장/발행 API
- Styling 뷰의 CSS 속성 상세
- 조건부 로직 엔진의 내부 평가 로직 (FSD-012 참조)
- 변수/히든 필드/리콜의 런타임 처리 (FSD-013 참조)

### 2.3 대상 사용자

| 역할 | 설명 |
|------|------|
| 설문 작성자 | 편집기 UI를 통해 설문을 구성하고 수정하는 주요 사용자 |
| 프리뷰 사용자 | 편집 중 실시간 프리뷰를 통해 설문 결과를 확인하는 사용자 |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| Block | 1개 이상의 Element(질문)를 포함하는 논리적 그룹 단위. 로직은 Block 레벨에서 정의된다. |
| Element | 설문 내 개별 질문 항목. 15가지 유형(openText, multipleChoiceSingle 등)이 존재한다. |
| Welcome Card | 설문 시작 전 표시되는 환영 카드. 활성 Element ID는 "start"이다. |
| Ending Card | 설문 종료 시 표시되는 카드. endScreen 또는 redirectToUrl 유형이다. |
| Block Logic | Block 레벨에서 정의되는 조건부 로직. calculate, requireAnswer, jumpToBlock 3가지 액션을 지원한다. |
| Logic Fallback | Block Logic의 조건이 모두 미충족될 때 이동할 대상 Block ID이다. |
| Recall | 이전 질문의 응답을 후속 질문이나 Ending Card에 동적으로 삽입하는 기능이다. |
| Hidden Field | 설문 URL의 쿼리 파라미터로 전달되며, 응답자에게 보이지 않는 숨겨진 데이터 필드이다. |
| Variable | 설문 내에서 계산 로직으로 값을 누적/변경할 수 있는 텍스트 또는 숫자 변수이다. |
| CX 모드 | Customer Experience 모드. Settings 탭이 숨겨지는 편집기 동작 모드이다. |
| Draft | 설문이 아직 발행되지 않은 초안 상태이다. |
| isDraft | 발행된 설문에서 새로 추가된 Element에 부여되는 플래그이다. |
| CUID | Collision-resistant Unique Identifier. Block 및 Element의 고유 식별자 형식이다. |
| Prefill | URL 파라미터를 통해 특정 질문에 값을 사전 입력하는 기능이다. |
| startAt | URL 파라미터를 통해 특정 질문부터 설문을 시작하게 하는 기능이다. |

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
+------------------------------------------------------------------+
|                       SurveyMenuBar                               |
|  [뒤로가기] [설문 이름 편집] [자동저장 표시기] [Save Draft] [Publish] |
+------------------------------------------------------------------+
|                          |                                        |
|   메인 편집 영역 (2/3)    |        실시간 프리뷰 (1/3)              |
|                          |                                        |
|  +--------------------+  |  +----------------------------------+  |
|  | 탭 바               |  |  |                                  |  |
|  | [Elements][Styling] |  |  |  설문 프리뷰                      |  |
|  | [Settings][Follow-  |  |  |  - 활성 Element 자동 스크롤       |  |
|  |  Ups]               |  |  |  - app: modal / link: fullwidth  |  |
|  +--------------------+  |  |  - 선택 언어 반영                 |  |
|  |                     |  |  |                                  |  |
|  | [다국어 설정 카드]    |  |  +----------------------------------+  |
|  | [Welcome Card]      |  |                                        |
|  | [Block #1]          |  |  * md 미만 화면에서 숨김               |
|  |   - Element #1      |  |                                        |
|  |   - Element #2      |  |                                        |
|  | [Block #2]          |  |                                        |
|  |   - Element #3      |  |                                        |
|  | [+ Element 추가]    |  |                                        |
|  | [Ending Card #1]    |  |                                        |
|  | [Ending Card #2]    |  |                                        |
|  | [+ Ending 추가]     |  |                                        |
|  | [Hidden Fields]     |  |                                        |
|  | [Survey Variables]  |  |                                        |
|  +--------------------+  |                                        |
+------------------------------------------------------------------+
```

### 3.2 주요 기능 목록 (Feature List)

| 기능 ID | 기능명 | 우선순위 | 관련 요구사항 |
|---------|--------|---------|-------------|
| FN-010-01 | 편집기 레이아웃 | 필수 | FR-014 (4.1) |
| FN-010-02 | 편집기 탭 전환 | 필수 | FR-014 (4.2), AC-014-01~03 |
| FN-010-03 | SurveyMenuBar | 필수 | FR-014 (4.3) |
| FN-010-04 | Block 구조 관리 | 필수 | FR-014 (4.4~4.6), AC-014-09~11 |
| FN-010-05 | Block Logic 편집 | 필수 | FR-014 (4.5), AC-014-16~17 |
| FN-010-06 | Elements View | 필수 | FR-014 (4.7) |
| FN-010-07 | 드래그 앤 드롭 | 필수 | FR-014 (4.8), AC-014-08, AC-014-11 |
| FN-010-08 | Welcome Card 편집 | 필수 | FR-014 (4.9), AC-014-04~06 |
| FN-010-09 | Ending Card 관리 | 필수 | FR-014 (4.10~4.13), AC-014-07~08 |
| FN-010-10 | BlockCard 렌더링 | 필수 | FR-014 (4.14~4.15) |
| FN-010-11 | Element ID 편집 | 필수 | FR-014 (4.16), AC-014-12~13 |
| FN-010-12 | Hidden Fields 카드 | 필수 | FR-014 (4.17), AC-014-19 |
| FN-010-13 | Survey Variables 카드 | 필수 | FR-014 (4.18), AC-014-19 |
| FN-010-14 | Validation Rules 편집기 | 필수 | FR-014 (4.19), AC-014-18 |
| FN-010-15 | Settings View | 필수 | FR-014 (4.20) |
| FN-010-16 | Styling View | 선택 | FR-014 (4.21), AC-014-02 |
| FN-010-17 | 실시간 프리뷰 | 필수 | FR-014 (4.22), AC-014-14~15 |

### 3.3 기능 간 관계도

```
FN-010-01 편집기 레이아웃
 ├── FN-010-02 편집기 탭 전환
 │    ├── FN-010-06 Elements View
 │    │    ├── FN-010-08 Welcome Card 편집
 │    │    ├── FN-010-04 Block 구조 관리
 │    │    │    ├── FN-010-05 Block Logic 편집
 │    │    │    ├── FN-010-10 BlockCard 렌더링
 │    │    │    │    ├── FN-010-11 Element ID 편집
 │    │    │    │    └── FN-010-14 Validation Rules 편집기
 │    │    │    └── FN-010-07 드래그 앤 드롭
 │    │    ├── FN-010-09 Ending Card 관리
 │    │    ├── FN-010-12 Hidden Fields 카드
 │    │    └── FN-010-13 Survey Variables 카드
 │    ├── FN-010-16 Styling View
 │    └── FN-010-15 Settings View
 ├── FN-010-03 SurveyMenuBar
 └── FN-010-17 실시간 프리뷰
```

---

## 4. 상세 기능 명세

### 4.1 편집기 레이아웃

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-010-01 |
| 기능명 | 편집기 레이아웃 |
| 관련 요구사항 ID | FR-014 (4.1) |
| 우선순위 | 필수 |
| 기능 설명 | 설문 편집기의 전체 레이아웃을 3개 영역(SurveyMenuBar, 메인 편집 영역, 실시간 프리뷰)으로 구성한다. |

#### 4.1.2 선행 조건 (Preconditions)

- 사용자가 설문 편집 화면에 진입한 상태이다.
- 편집 대상 설문 데이터가 로드된 상태이다.

#### 4.1.3 후행 조건 (Postconditions)

- 3개 영역이 지정된 비율로 렌더링된다.
- 각 영역이 독립적으로 동작한다.

#### 4.1.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 설문 데이터를 로드하고 편집기 레이아웃을 렌더링한다. |
| 2 | 시스템 | 상단에 SurveyMenuBar(전체 너비)를 배치한다. |
| 3 | 시스템 | 하단 좌측에 메인 편집 영역(화면 너비의 2/3)을 배치한다. |
| 4 | 시스템 | 하단 우측에 실시간 프리뷰(화면 너비의 1/3)를 배치한다. |
| 5 | 시스템 | 메인 편집 영역에 기본 탭(Elements)을 활성화하여 표시한다. |

#### 4.1.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-01-01 | 화면 너비가 md(768px) 미만인 경우 | 실시간 프리뷰 패널을 숨기고, 메인 편집 영역을 전체 너비로 표시한다. |

#### 4.1.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-01-01 | 설문 데이터 로드 실패 | 에러 메시지를 표시하고, 설문 목록 화면으로 이동한다. |

#### 4.1.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-01-01 | 메인 편집 영역과 프리뷰 영역의 너비 비율은 2:1(2/3:1/3)이다. |
| BR-01-02 | 프리뷰 패널은 화면 너비 md(768px) 이상에서만 표시된다. |

#### 4.1.8 데이터 요구사항

**입력 데이터**: 설문 객체 전체 (Survey 스키마)

**출력 데이터**: 없음 (UI 렌더링)

#### 4.1.9 화면/UI 요구사항

- SurveyMenuBar: 상단 고정, 전체 너비
- 메인 편집 영역: 좌측, 2/3 너비, 스크롤 가능
- 실시간 프리뷰: 우측, 1/3 너비, 반응형 숨김

#### 4.1.10 비기능 요구사항

- 반응형 디자인: md(768px) 브레이크포인트에서 프리뷰 숨김 처리
- 목록 애니메이션 지원

---

### 4.2 편집기 탭 전환

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-010-02 |
| 기능명 | 편집기 탭 전환 |
| 관련 요구사항 ID | FR-014 (4.2), AC-014-01, AC-014-02, AC-014-03 |
| 우선순위 | 필수 |
| 기능 설명 | 메인 편집 영역 상단에 4개 탭(Elements, Styling, Settings, Follow-Ups)을 배치하고, 탭 클릭 시 해당 뷰로 전환한다. |

#### 4.2.2 선행 조건 (Preconditions)

- 편집기 레이아웃이 렌더링된 상태이다.

#### 4.2.3 후행 조건 (Postconditions)

- 선택된 탭에 해당하는 뷰가 메인 편집 영역에 표시된다.
- 활성 탭이 시각적으로 구분된다.

#### 4.2.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 프로젝트 설정 및 설문 모드를 확인하여 표시할 탭 목록을 결정한다. |
| 2 | 시스템 | 결정된 탭 목록을 렌더링한다. |
| 3 | 사용자 | 원하는 탭을 클릭한다. |
| 4 | 시스템 | 클릭된 탭을 활성 상태로 변경하고 해당 뷰를 표시한다. |

#### 4.2.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-02-01 | CX 모드인 경우 | Settings 탭을 숨긴다. Elements, Styling(조건부), Follow-Ups 탭만 표시한다. |
| AF-02-02 | 프로젝트의 스타일 오버라이드 허용 설정이 false인 경우 | Styling 탭을 숨긴다. |

#### 4.2.6 예외 흐름 (Exception Flow)

없음.

#### 4.2.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-02-01 | Elements 탭은 항상 표시된다. |
| BR-02-02 | Styling 탭은 프로젝트의 스타일 오버라이드 허용 설정이 true일 때만 표시된다. |
| BR-02-03 | Settings 탭은 CX 모드에서 숨겨진다. |
| BR-02-04 | Follow-Ups 탭은 항상 표시되며, Pro 배지가 함께 표시된다. |

#### 4.2.8 데이터 요구사항

**입력 데이터**:

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| isCxMode | boolean | 필수 | CX 모드 여부 |
| isStyleOverrideAllowed | boolean | 필수 | 프로젝트의 스타일 오버라이드 허용 여부 |

**출력 데이터**: 없음 (UI 상태 변경)

#### 4.2.9 화면/UI 요구사항

| 탭 | 아이콘 | 표시 조건 | 부가 표시 |
|----|--------|----------|----------|
| Elements (Questions) | Rows3 | 항상 | 없음 |
| Styling | Paintbrush | isStyleOverrideAllowed === true | 없음 |
| Settings | Settings | isCxMode === false | 없음 |
| Follow-Ups | Mail | 항상 | Pro 배지 |

#### 4.2.10 비기능 요구사항

없음.

---

### 4.3 SurveyMenuBar

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-010-03 |
| 기능명 | SurveyMenuBar |
| 관련 요구사항 ID | FR-014 (4.3) |
| 우선순위 | 필수 |
| 기능 설명 | 편집기 상단에 위치하여 설문 이름 편집, 자동 저장 상태 표시, 저장/발행 기능을 제공한다. |

#### 4.3.2 선행 조건 (Preconditions)

- 편집기가 정상적으로 로드된 상태이다.
- 설문 데이터가 존재한다.

#### 4.3.3 후행 조건 (Postconditions)

- 사용자의 액션(저장, 발행 등)에 따라 설문 상태가 갱신된다.

#### 4.3.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | SurveyMenuBar를 렌더링하고, 현재 설문 이름을 인라인 Input에 표시한다. |
| 2 | 시스템 | 설문 상태(draft/inProgress/paused/completed)에 따라 버튼 레이블을 결정한다. |
| 3 | 시스템 | Draft 상태인 경우 자동 저장 상태 표시기를 렌더링한다. |

**설문 이름 편집 흐름**:

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | 인라인 Input 필드에서 설문 이름을 수정한다. |
| 2 | 시스템 | 변경된 이름을 설문 데이터에 반영한다. |

**Save as Draft 흐름**:

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | "Save as Draft" 버튼을 클릭한다. |
| 2 | 시스템 | 현재 설문 데이터를 Draft 상태로 저장한다. |
| 3 | 시스템 | 자동 저장 상태 표시기를 갱신한다. |

**발행 흐름**:

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | "Publish" 또는 "Update" 버튼을 클릭한다. |
| 2 | 시스템 | 설문 유효성 검증 함수를 호출하여 전체 스키마를 검증한다. |
| 3 | 시스템 | 검증 통과 시 설문을 발행/업데이트한다. |

#### 4.3.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-03-01 | 설문이 이미 발행된 상태(inProgress)인 경우 | "Publish" 대신 "Update" 버튼을 표시한다. |
| AF-03-02 | 사용자가 뒤로가기를 클릭한 경우 | 설문 목록 화면으로 이동한다. |
| AF-03-03 | 사용자가 설정 바로가기를 클릭한 경우 | Settings 탭으로 전환한다. |

#### 4.3.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-03-01 | 발행 시 유효성 검증 실패 | 유효하지 않은 Element 목록을 설정하고, 해당 질문 카드에 빨간색 표시를 렌더링한다. 발행을 중단한다. |

#### 4.3.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-03-01 | Draft 상태에서만 자동 저장 상태 표시기가 활성화된다. |
| BR-03-02 | 발행 시 설문 유효성 검증 함수를 통해 전체 스키마 검증을 수행해야 한다. |
| BR-03-03 | 유효성 검증 실패 시 유효하지 않은 Element 카드에 시각적 오류 표시(빨간색)를 한다. |

#### 4.3.8 데이터 요구사항

**입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|-----------|
| surveyName | string | 필수 | 빈 문자열 불허 |
| surveyStatus | enum(draft, inProgress, paused, completed) | 필수 | 유효한 상태값 |

**출력 데이터**:

| 필드명 | 타입 | 설명 |
|--------|------|------|
| invalidElements | string[] | 유효성 검증 실패한 Element ID 목록 |

#### 4.3.9 화면/UI 요구사항

- 뒤로가기 버튼: 좌측 배치
- 설문 이름: 인라인 편집 가능한 Input 필드
- 자동 저장 표시기: Draft 상태에서만 표시
- Save as Draft 버튼: Draft 상태에서 표시
- Publish/Update 버튼: 우측 배치

#### 4.3.10 비기능 요구사항

- Ref 기반 자동 저장으로 불필요한 리렌더링을 방지한다.

---

### 4.4 Block 구조 관리

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-010-04 |
| 기능명 | Block 구조 관리 |
| 관련 요구사항 ID | FR-014 (4.4, 4.6), AC-014-09, AC-014-10, AC-014-11 |
| 우선순위 | 필수 |
| 기능 설명 | 설문의 Block을 추가, 삭제, 복제, 이동하고, Block 내 Element를 관리하며, Block 이름 자동 넘버링을 수행한다. |

#### 4.4.2 선행 조건 (Preconditions)

- Elements View가 활성화된 상태이다.
- 1개 이상의 Block이 존재한다.

#### 4.4.3 후행 조건 (Postconditions)

- Block 구조 변경이 설문 데이터에 반영된다.
- Block 이름이 자동으로 "Block 1", "Block 2", ... 형식으로 재정렬된다.

#### 4.4.4 기본 흐름 (Basic Flow)

**Block 추가 흐름**:

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | "새 Element 추가" 버튼을 클릭한다. |
| 2 | 시스템 | 새 Block을 생성하고 CUID를 할당한다. |
| 3 | 시스템 | 새 Block을 설문의 Block 목록 끝(또는 지정 인덱스)에 추가한다. |
| 4 | 시스템 | 모든 Block 이름을 "Block 1", "Block 2", ... 형식으로 재정렬한다. |

**Block 삭제 흐름**:

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Block 메뉴에서 "삭제"를 선택한다. |
| 2 | 시스템 | 해당 Block을 설문에서 제거한다. |
| 3 | 시스템 | Block 이름을 자동 재정렬한다. |

**Block 복제 흐름**:

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Block 메뉴에서 "복제"를 선택한다. |
| 2 | 시스템 | 해당 Block의 모든 속성과 Element를 복제하여 새 Block을 생성한다. |
| 3 | 시스템 | 복제된 Block에 새 CUID를 할당한다. |
| 4 | 시스템 | 원본 Block 바로 아래에 복제된 Block을 삽입한다. |
| 5 | 시스템 | Block 이름을 자동 재정렬한다. |

**Block 이동 흐름**:

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Block 메뉴에서 "위로 이동" 또는 "아래로 이동"을 선택한다. |
| 2 | 시스템 | 해당 Block을 지정 방향으로 1칸 이동한다. |
| 3 | 시스템 | Block 이름을 자동 재정렬한다. |

#### 4.4.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-04-01 | Block이 1개만 남은 상태에서 삭제 시도 | Block 내 Element가 1개뿐이면 삭제를 방지하거나 경고를 표시한다. |
| AF-04-02 | 이미 첫 번째 위치인 Block에서 "위로 이동" 선택 | 이동을 수행하지 않는다. |
| AF-04-03 | 이미 마지막 위치인 Block에서 "아래로 이동" 선택 | 이동을 수행하지 않는다. |

#### 4.4.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-04-01 | Block 내 Element가 0개가 되는 경우 | Block 내 최소 1개의 Element가 유지되도록 삭제를 차단한다. |

#### 4.4.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-04-01 | 각 Block은 최소 1개 이상의 Element를 포함해야 한다. |
| BR-04-02 | Block 이름은 추가/삭제/이동/복제 후 자동으로 "Block {N}" 형식으로 재정렬된다. (N은 1부터 순차) |
| BR-04-03 | Block ID는 CUID 형식으로 자동 생성된다. |
| BR-04-04 | Block 내 Element ID는 전체 설문에서 고유해야 한다. |

#### 4.4.8 데이터 요구사항

**Block 데이터 모델**:

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|-----------|
| id | CUID (string) | 필수 | 자동 생성, 고유 |
| name | string | 필수 | 최소 1자, "Block {N}" 형식 자동 부여 |
| elements | Element[] | 필수 | 최소 1개 |
| logic | BlockLogic[] | 선택 | - |
| logicFallback | CUID (string) | 선택 | 유효한 Block ID |
| buttonLabel | LocalizedString | 선택 | 다국어 지원 |
| backButtonLabel | LocalizedString | 선택 | 다국어 지원 |

#### 4.4.9 화면/UI 요구사항

- Block Card는 접기/펼치기가 가능하다.
- Block Header에 드래그 핸들, 접기/펼치기 아이콘, Block 이름, 메뉴 버튼이 표시된다.
- Block 메뉴에는 복제, 삭제, 위로 이동, 아래로 이동 옵션이 포함된다.

#### 4.4.10 비기능 요구사항

없음.

---

### 4.5 Block Logic 편집

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-010-05 |
| 기능명 | Block Logic 편집 |
| 관련 요구사항 ID | FR-014 (4.5), AC-014-16, AC-014-17 |
| 우선순위 | 필수 |
| 기능 설명 | Block 레벨에서 조건부 로직을 정의한다. 조건(ConditionGroup)과 액션(calculate, requireAnswer, jumpToBlock)을 설정할 수 있으며, 로직 Fallback을 지정할 수 있다. |

#### 4.5.2 선행 조건 (Preconditions)

- Block Card가 펼쳐진 상태이다.
- Block 설정 영역이 표시되어 있다.

#### 4.5.3 후행 조건 (Postconditions)

- 정의된 로직이 Block 데이터에 저장된다.

#### 4.5.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Block 설정 영역에서 조건부 로직 편집 영역을 연다. |
| 2 | 사용자 | 새 로직 항목을 추가한다. |
| 3 | 사용자 | 조건(ConditionGroup)을 설정한다 (피연산자, 연산자, 비교값). |
| 4 | 사용자 | 액션 유형을 선택한다 (calculate / requireAnswer / jumpToBlock). |
| 5 | 시스템 | 선택된 액션 유형에 맞는 Target 입력 필드를 표시한다. |
| 6 | 사용자 | Target 값을 설정한다. |
| 7 | 시스템 | 로직을 Block 데이터에 저장한다. |

**Fallback 설정 흐름**:

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | 로직 Fallback 드롭다운에서 대상 Block을 선택한다. |
| 2 | 시스템 | 선택된 Block ID를 logicFallback 값으로 저장한다. |

#### 4.5.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-05-01 | 로직 항목 복제 | 기존 로직 항목의 조건과 액션을 복제하여 새 항목을 추가한다. |
| AF-05-02 | 로직 항목 삭제 | 선택된 로직 항목을 제거한다. |

#### 4.5.6 예외 흐름 (Exception Flow)

없음.

#### 4.5.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-05-01 | Block Logic은 3가지 Action 유형만 지원한다: calculate, requireAnswer, jumpToBlock. |
| BR-05-02 | calculate 액션의 Target은 변수 ID + 연산자 + 값으로 구성된다. |
| BR-05-03 | requireAnswer 액션의 Target은 Element ID이다. |
| BR-05-04 | jumpToBlock 액션의 Target은 Block ID(CUID)이다. |
| BR-05-05 | 조건은 ConditionGroup 구조(중첩 가능한 AND/OR)를 사용한다. |
| BR-05-06 | Fallback은 로직 조건이 모두 미충족될 때 이동할 Block ID를 지정한다. |

#### 4.5.8 데이터 요구사항

**Block Logic 데이터 모델**:

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| id | string | 필수 | 로직 고유 식별자 |
| conditions | ConditionGroup | 필수 | 조건 그룹 |
| actions | BlockLogicAction[] | 필수 | 액션 배열 |

**BlockLogicAction 데이터 모델**:

| Action 유형 | Target 구성 | 설명 |
|-------------|-----------|------|
| calculate | variableId (string) + operator (enum) + value (number/string) | 변수 값 계산 |
| requireAnswer | elementId (string) | 특정 Element 필수 응답 설정 |
| jumpToBlock | blockId (CUID string) | 다른 Block으로 이동 |

#### 4.5.9 화면/UI 요구사항

- 로직 편집 영역은 Block 설정 섹션 내에 위치한다.
- 각 로직 항목에 조건과 액션을 시각적으로 구성할 수 있는 UI를 제공한다.
- Fallback은 드롭다운으로 대상 Block을 선택한다.

#### 4.5.10 비기능 요구사항

없음.

---

### 4.6 Elements View

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-010-06 |
| 기능명 | Elements View |
| 관련 요구사항 ID | FR-014 (4.7) |
| 우선순위 | 필수 |
| 기능 설명 | Elements 탭에서 표시되는 메인 편집 뷰. 다국어 설정 카드, Welcome Card, Block 목록, Ending Card, Hidden Fields, Survey Variables를 상위->하위 순서로 배치한다. |

#### 4.6.2 선행 조건 (Preconditions)

- Elements 탭이 활성화된 상태이다.

#### 4.6.3 후행 조건 (Postconditions)

- 설문의 모든 구성 요소가 편집 가능한 상태로 렌더링된다.

#### 4.6.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | Elements View를 상위->하위 순서로 렌더링한다. |
| 2 | 시스템 | 다국어 설정 카드를 최상단에 배치한다. |
| 3 | 시스템 | Welcome Card 편집 영역을 배치한다. |
| 4 | 시스템 | Block 목록을 드래그 앤 드롭 컨텍스트 내에 배치한다. |
| 5 | 시스템 | 각 Block Card 내부에 Element 목록과 Element 추가 버튼을 렌더링한다. |
| 6 | 시스템 | Block 목록 하단에 "새 Element 추가" 버튼(새 Block 추가)을 배치한다. |
| 7 | 시스템 | Ending Card 목록을 배치한다. |
| 8 | 시스템 | Ending Card 추가 버튼을 배치한다. |
| 9 | 시스템 | Hidden Fields 카드를 배치한다. |
| 10 | 시스템 | Survey Variables 카드를 배치한다. |

#### 4.6.5 대안 흐름 (Alternative Flow)

없음.

#### 4.6.6 예외 흐름 (Exception Flow)

없음.

#### 4.6.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-06-01 | Elements View의 구성 요소 배치 순서는 고정이다: 다국어 설정 > Welcome Card > Block 목록 > Ending Cards > Hidden Fields > Survey Variables. |

#### 4.6.8 데이터 요구사항

없음 (하위 컴포넌트에서 개별 정의).

#### 4.6.9 화면/UI 요구사항

- 모든 카드는 수직 스크롤 가능한 단일 컬럼으로 배치된다.
- Block 목록 영역은 드래그 앤 드롭 컨텍스트로 감싸진다.

#### 4.6.10 비기능 요구사항

없음.

---

### 4.7 드래그 앤 드롭

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-010-07 |
| 기능명 | 드래그 앤 드롭 |
| 관련 요구사항 ID | FR-014 (4.8), AC-014-08, AC-014-11 |
| 우선순위 | 필수 |
| 기능 설명 | Block 간 순서 변경, Block 내 Element 순서 변경, Ending Card 순서 변경을 드래그 앤 드롭으로 수행한다. |

#### 4.7.2 선행 조건 (Preconditions)

- Elements View가 활성화된 상태이다.
- 2개 이상의 Block 또는 Element가 존재한다.

#### 4.7.3 후행 조건 (Postconditions)

- 드래그 앤 드롭으로 변경된 순서가 설문 데이터에 반영된다.
- Block 이름이 자동으로 재정렬된다 (Block 이동 시).

#### 4.7.4 기본 흐름 (Basic Flow)

**Block 드래그 앤 드롭 흐름**:

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Block Card의 드래그 핸들을 포인터로 잡는다. |
| 2 | 시스템 | 포인터 센서가 드래그 시작을 감지한다. |
| 3 | 사용자 | Block을 원하는 위치로 드래그한다. |
| 4 | 시스템 | 가장 가까운 코너 기반으로 드롭 타겟을 결정하고, 수직 리스트 정렬 전략에 따라 시각적 피드백을 표시한다. |
| 5 | 사용자 | Block을 드롭한다. |
| 6 | 시스템 | Block 순서를 업데이트하고, Block 이름을 자동 재정렬한다. |

**Element 드래그 앤 드롭 흐름**:

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Element의 드래그 핸들을 포인터로 잡는다. |
| 2 | 시스템 | 포인터 센서가 드래그 시작을 감지한다. |
| 3 | 사용자 | Element를 Block 내 원하는 위치로 드래그한다. |
| 4 | 시스템 | 드롭 위치를 결정하고 시각적 피드백을 표시한다. |
| 5 | 사용자 | Element를 드롭한다. |
| 6 | 시스템 | Element 순서를 업데이트한다. |

**Ending Card 드래그 앤 드롭 흐름**:

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Ending Card의 드래그 핸들을 포인터로 잡는다. |
| 2~5 | (Block 드래그 앤 드롭과 동일한 절차) | |
| 6 | 시스템 | Ending Card 순서를 업데이트한다. |

#### 4.7.5 대안 흐름 (Alternative Flow)

없음.

#### 4.7.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-07-01 | 드래그 중 유효하지 않은 위치에 드롭 | 드래그된 항목을 원래 위치로 복원한다. |

#### 4.7.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-07-01 | 드래그 감지는 포인터 센서를 사용한다. |
| BR-07-02 | 드롭 타겟 결정은 가장 가까운 코너(closestCorners) 알고리즘을 사용한다. |
| BR-07-03 | 정렬 전략은 수직 리스트 정렬(verticalListSortingStrategy)을 사용한다. |
| BR-07-04 | Block 드래그 앤 드롭 후 Block 이름이 자동으로 재정렬된다. |

#### 4.7.8 데이터 요구사항

없음 (기존 Block/Element/Ending 데이터의 순서 인덱스만 변경).

#### 4.7.9 화면/UI 요구사항

- 각 드래그 가능한 항목에 드래그 핸들 아이콘을 표시한다.
- 드래그 중 시각적 피드백(예: 드롭 위치 표시선)을 제공한다.

#### 4.7.10 비기능 요구사항

- 드래그 앤 드롭 시 부드러운 애니메이션을 제공한다.

---

### 4.8 Welcome Card 편집

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-010-08 |
| 기능명 | Welcome Card 편집 |
| 관련 요구사항 ID | FR-014 (4.9), AC-014-04, AC-014-05, AC-014-06 |
| 우선순위 | 필수 |
| 기능 설명 | 설문 시작 전 표시되는 Welcome Card의 7가지 속성을 편집한다. |

#### 4.8.2 선행 조건 (Preconditions)

- Elements View가 활성화된 상태이다.

#### 4.8.3 후행 조건 (Postconditions)

- Welcome Card 설정이 설문 데이터에 반영된다.
- 실시간 프리뷰에 변경사항이 즉시 반영된다.

#### 4.8.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Welcome Card 영역을 클릭하여 편집 모드로 진입한다. |
| 2 | 시스템 | 활성 Element ID를 "start"로 설정한다. |
| 3 | 시스템 | 7가지 속성 편집 폼을 표시한다. |
| 4 | 사용자 | 원하는 속성을 편집한다. |
| 5 | 시스템 | 변경사항을 설문 데이터에 반영하고 프리뷰를 업데이트한다. |

#### 4.8.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-08-01 | 활성화 Switch를 OFF로 변경 | Welcome Card를 비활성화하고 편집 폼을 숨긴다. |
| AF-08-02 | 설문 유형이 link가 아닌 경우 | "응답 수 표시" 토글을 UI에서 숨긴다. |

#### 4.8.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-08-01 | Welcome Card가 활성화된 상태에서 제목(headline)이 비어 있는 경우 | 발행 시 유효성 검증에서 실패하고, Welcome Card에 오류 표시를 한다. |
| EF-08-02 | 버튼 라벨이 48자를 초과하는 경우 | 48자까지만 입력을 허용하고, 초과 입력을 차단한다. |

#### 4.8.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-08-01 | Welcome Card가 활성화되면 제목(headline)은 필수 입력이다. |
| BR-08-02 | 버튼 라벨의 최대 길이는 48자이다. |
| BR-08-03 | "응답 수 표시" 토글은 설문 유형이 link일 때만 UI에 표시된다. |
| BR-08-04 | 파일 URL에 허용되는 확장자는 png, jpeg, jpg, webp, heic이다. |
| BR-08-05 | 비디오 URL 삽입이 가능하다. |
| BR-08-06 | Welcome Card의 활성 Element ID는 "start"이다. |

#### 4.8.8 데이터 요구사항

**입력 데이터 (Welcome Card 속성)**:

| # | 필드명 | 타입 | 필수 | UI 컴포넌트 | 유효성 검증 |
|---|--------|------|------|-------------|-----------|
| 1 | enabled | boolean | 필수 | Switch | - |
| 2 | headline | LocalizedString | 조건부 (enabled=true일 때 필수) | 텍스트 입력 | 빈 문자열 불허 (활성화 시) |
| 3 | subtitle | LocalizedString | 선택 | 텍스트 입력 | - |
| 4 | fileUrl | string | 선택 | 파일 입력 | 확장자: png, jpeg, jpg, webp, heic |
| 5 | buttonLabel | LocalizedString | 선택 | 텍스트 입력 | 최대 48자 |
| 6 | showResponseCount | boolean | 선택 | Switch | link 타입에서만 표시 |
| 7 | timeToFinish | boolean | 선택 | Switch | - |

#### 4.8.9 화면/UI 요구사항

- Switch 토글로 Welcome Card 전체 활성화/비활성화
- 활성화 시 7가지 속성 편집 폼 표시
- 파일 입력: 이미지 또는 비디오 업로드 지원
- link 타입이 아닌 경우 "응답 수 표시" 토글을 렌더링하지 않음

#### 4.8.10 비기능 요구사항

없음.

---

### 4.9 Ending Card 관리

#### 4.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-010-09 |
| 기능명 | Ending Card 관리 |
| 관련 요구사항 ID | FR-014 (4.10~4.13), AC-014-07, AC-014-08, AC-014-20 |
| 우선순위 | 필수 |
| 기능 설명 | 설문 종료 시 표시되는 Ending Card를 2가지 유형(endScreen, redirectToUrl)으로 관리한다. 추가, 삭제, 유형 전환, 드래그 앤 드롭 재정렬을 지원한다. |

#### 4.9.2 선행 조건 (Preconditions)

- Elements View가 활성화된 상태이다.

#### 4.9.3 후행 조건 (Postconditions)

- Ending Card 변경사항이 설문 데이터에 반영된다.

#### 4.9.4 기본 흐름 (Basic Flow)

**Ending Card 추가 흐름**:

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | "Ending Card 추가" 버튼을 클릭한다. |
| 2 | 시스템 | 새 Ending Card를 기본 유형(endScreen)으로 생성한다. |
| 3 | 시스템 | Ending Card 목록 끝에 추가한다. |

**endScreen 유형 편집 흐름**:

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Ending Card를 클릭하여 편집 모드로 진입한다. |
| 2 | 시스템 | endScreen 편집 폼을 표시한다 (제목, 부제목, 버튼 라벨, 버튼 링크, 이미지). |
| 3 | 사용자 | 원하는 필드를 편집한다. |
| 4 | 시스템 | 변경사항을 설문 데이터에 반영한다. |

**redirectToUrl 유형 편집 흐름**:

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Ending Card를 클릭하여 편집 모드로 진입한다. |
| 2 | 시스템 | redirectToUrl 편집 폼을 표시한다 (URL, 라벨). |
| 3 | 사용자 | 리다이렉트 URL과 라벨을 입력한다. |
| 4 | 시스템 | 변경사항을 설문 데이터에 반영한다. |

**유형 전환 흐름**:

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | OptionsSwitch를 클릭하여 유형을 전환한다 (endScreen <-> redirectToUrl). |
| 2 | 시스템 | 선택된 유형에 맞는 편집 폼으로 전환한다. |

#### 4.9.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-09-01 | endScreen에서 CTA 표시 Switch를 OFF로 변경 | CTA 버튼 관련 필드(버튼 라벨, 버튼 링크)를 숨긴다. |
| AF-09-02 | redirectToUrl URL 필드에 Recall 구문 사용 | Recall 파싱을 수행하여 이전 응답 값을 URL에 삽입할 수 있도록 한다. |

#### 4.9.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-09-01 | Ending Card 삭제 시 | 확인 모달을 표시한다. 사용자가 확인하면 삭제를 수행한다. |
| EF-09-02 | Logic에서 사용 중인 Ending Card 삭제 시 | 경고 토스트를 표시한다. ("이 Ending Card는 Logic에서 사용 중입니다.") |
| EF-09-03 | Quota에서 사용 중인 Ending Card 삭제 시 | 경고 토스트를 표시한다. ("이 Ending Card는 Quota에서 사용 중입니다.") |

#### 4.9.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-09-01 | Ending Card는 endScreen과 redirectToUrl 2가지 유형만 지원한다. |
| BR-09-02 | 유형 전환은 OptionsSwitch로 수행한다. |
| BR-09-03 | 여러 개의 Ending Card를 추가할 수 있다. |
| BR-09-04 | Ending Card는 드래그 앤 드롭으로 재정렬 가능하다. |
| BR-09-05 | Ending Card 삭제 시 확인 모달이 표시된다. |
| BR-09-06 | Logic 또는 Quota에서 사용 중인 Ending Card 삭제 시 경고 토스트가 표시된다. |
| BR-09-07 | Recall 기능으로 이전 질문 응답을 Ending Card의 텍스트 및 URL에 삽입할 수 있다. |
| BR-09-08 | redirectToUrl의 URL 플레이스홀더는 "https://formbricks.com"이다. |

#### 4.9.8 데이터 요구사항

**endScreen 유형 데이터**:

| 필드명 | 타입 | 필수 | UI 컴포넌트 | 유효성 검증 |
|--------|------|------|-------------|-----------|
| type | "endScreen" (constant) | 필수 | OptionsSwitch | - |
| headline | LocalizedString | 선택 | 텍스트 입력 | - |
| subtitle | LocalizedString | 선택 | 텍스트 입력 | - |
| buttonLabel | LocalizedString | 선택 | 텍스트 입력 | - |
| buttonLink | string (URL) | 선택 | URL 입력 | 유효한 URL 형식 |
| imageUrl | string | 선택 | 파일 입력 | - |
| showButton | boolean | 선택 | Switch | - |

**redirectToUrl 유형 데이터**:

| 필드명 | 타입 | 필수 | UI 컴포넌트 | 유효성 검증 |
|--------|------|------|-------------|-----------|
| type | "redirectToUrl" (constant) | 필수 | OptionsSwitch | - |
| url | string (URL) | 필수 | URL 입력 (Recall 지원) | 유효한 URL 형식 |
| label | string | 선택 | 텍스트 입력 | 내부 관리용 |

#### 4.9.9 화면/UI 요구사항

- OptionsSwitch: endScreen과 redirectToUrl 유형 전환 컨트롤
- endScreen: 제목, 부제목, CTA 버튼(토글), 이미지 업로드
- redirectToUrl: URL 입력(Recall 지원), 라벨 입력
- Ending Card 추가 버튼: Ending Card 목록 하단에 배치
- 각 Ending Card에 삭제 버튼 및 드래그 핸들

#### 4.9.10 비기능 요구사항

- 삭제 전 확인 모달 표시 (UX 안전장치)
- Logic/Quota 참조 시 경고 토스트 표시

---

### 4.10 BlockCard 렌더링

#### 4.10.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-010-10 |
| 기능명 | BlockCard 렌더링 |
| 관련 요구사항 ID | FR-014 (4.14, 4.15) |
| 우선순위 | 필수 |
| 기능 설명 | 각 Block을 카드 형태로 렌더링한다. Block Header(접기/펼치기), Block Body(Element 목록), Block 설정(Logic, Labels), Block 메뉴를 포함하며, Element 유형에 따라 해당 폼 컴포넌트를 렌더링한다. |

#### 4.10.2 선행 조건 (Preconditions)

- Block 데이터가 존재한다.
- Elements View가 활성화된 상태이다.

#### 4.10.3 후행 조건 (Postconditions)

- Block 내 모든 Element가 유형별 폼 컴포넌트로 렌더링된다.

#### 4.10.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | Block Header를 렌더링한다 (드래그 핸들, 접기/펼치기 아이콘, Block 이름, 메뉴 버튼). |
| 2 | 시스템 | Block Body 내부에 Element 목록을 렌더링한다. |
| 3 | 시스템 | 각 Element의 type에 따라 해당 폼 컴포넌트를 선택하여 렌더링한다. |
| 4 | 시스템 | 각 Element에 편집 카드 메뉴(복제, 삭제, 이동 등)를 표시한다. |
| 5 | 시스템 | 각 Element에 고급 설정(Element ID 편집, Validation Rules Editor)을 접기/펼치기로 제공한다. |
| 6 | 시스템 | Block 내 Element 목록 사이에 "Element 추가" 버튼을 배치한다. |
| 7 | 시스템 | Block 설정 영역에 버튼 라벨/뒤로가기 버튼 라벨 편집, 조건부 로직 편집, Fallback 설정을 배치한다. |

#### 4.10.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-10-01 | Block Header의 접기/펼치기 아이콘 클릭 | Block Body를 접거나 펼친다. |
| AF-10-02 | Block 내 "Element 추가" 버튼 클릭 | 해당 Block에 새 Element를 추가한다. |

#### 4.10.6 예외 흐름 (Exception Flow)

없음.

#### 4.10.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-10-01 | Element 유형별 폼 컴포넌트 매핑은 아래와 같다. |

**Element Type-Form 컴포넌트 매핑**:

| Element Type | Form 컴포넌트 |
|-------------|---------------|
| openText | OpenElementForm |
| multipleChoiceSingle | MultipleChoiceElementForm |
| multipleChoiceMulti | MultipleChoiceElementForm |
| nps | NPSElementForm |
| cta | CTAElementForm |
| rating | RatingElementForm |
| consent | ConsentElementForm |
| pictureSelection | PictureSelectionForm |
| date | DateElementForm |
| fileUpload | FileUploadElementForm |
| cal | CalElementForm |
| matrix | MatrixElementForm |
| address | AddressElementForm |
| ranking | RankingElementForm |
| contactInfo | ContactInfoElementForm |

#### 4.10.8 데이터 요구사항

없음 (Block 데이터 모델은 FN-010-04에서 정의).

#### 4.10.9 화면/UI 요구사항

- Block Header: 접기/펼치기 가능, 드래그 핸들, Block 이름, 메뉴(더보기) 버튼
- Block Body: Element 목록, 각 Element에 편집 카드 메뉴와 고급 설정
- Block 설정: 버튼 라벨, 뒤로가기 버튼 라벨, 로직 편집, Fallback 설정
- 접기/펼치기 컴포넌트에 aria-expanded 상태 반영

#### 4.10.10 비기능 요구사항

- 접기/펼치기 컴포넌트에 aria-expanded 속성을 반영하여 접근성을 보장한다.

---

### 4.11 Element ID 편집

#### 4.11.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-010-11 |
| 기능명 | Element ID 편집 |
| 관련 요구사항 ID | FR-014 (4.16), AC-014-12, AC-014-13 |
| 우선순위 | 필수 |
| 기능 설명 | Element의 고유 ID를 편집한다. 변경된 ID는 prefill 및 startAt URL 파라미터로 활용할 수 있다. 유효성 검증(금지 ID, 패턴, 중복)을 수행한다. |

#### 4.11.2 선행 조건 (Preconditions)

- Element의 고급 설정이 펼쳐진 상태이다.
- 설문이 draft 상태이거나, 해당 Element가 isDraft=true인 상태이다.

#### 4.11.3 후행 조건 (Postconditions)

- 변경된 Element ID가 설문 데이터에 반영된다.
- 해당 Element를 참조하는 Logic, Recall 등이 새 ID를 사용한다.

#### 4.11.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Element 고급 설정에서 현재 Element ID를 확인한다. |
| 2 | 사용자 | ID 입력 필드에 새 ID를 입력한다. |
| 3 | 사용자 | "저장" 버튼을 클릭한다. |
| 4 | 시스템 | 유효성 검증을 수행한다 (아래 6가지 규칙). |
| 5 | 시스템 | 검증 통과 시 Element ID를 변경하고 설문 데이터를 업데이트한다. |

#### 4.11.5 대안 흐름 (Alternative Flow)

없음.

#### 4.11.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-11-01 | 금지된 ID를 입력한 경우 | 오류 메시지를 표시하고 변경을 거부한다. |
| EF-11-02 | 공백이 포함된 경우 | 오류 메시지를 표시하고 변경을 거부한다. |
| EF-11-03 | 영문/숫자/하이픈/언더스코어 외의 문자가 포함된 경우 | 오류 메시지를 표시하고 변경을 거부한다. |
| EF-11-04 | 다른 Element ID와 중복된 경우 | 오류 메시지를 표시하고 변경을 거부한다. |
| EF-11-05 | Ending Card ID와 중복된 경우 | 오류 메시지를 표시하고 변경을 거부한다. |
| EF-11-06 | Hidden Field ID와 중복된 경우 | 오류 메시지를 표시하고 변경을 거부한다. |
| EF-11-07 | 발행된 설문에서 isDraft=false인 Element의 ID 편집 시도 | ID 편집 필드를 비활성화하고 편집을 차단한다. |

#### 4.11.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-11-01 | Element ID는 영문(a-z, A-Z), 숫자(0-9), 하이픈(-), 언더스코어(_)만 허용한다. |
| BR-11-02 | Element ID에 공백을 포함할 수 없다. |
| BR-11-03 | 금지된 ID 목록에 해당하는 값은 사용할 수 없다. |
| BR-11-04 | 동일 설문 내 다른 Element ID와 중복될 수 없다. |
| BR-11-05 | 동일 설문 내 Ending Card ID와 중복될 수 없다. |
| BR-11-06 | 동일 설문 내 Hidden Field ID와 중복될 수 없다. |
| BR-11-07 | Draft 상태 설문: 모든 Element의 ID를 편집할 수 있다. |
| BR-11-08 | 발행된 설문: isDraft=true인 새로 추가된 Element만 ID를 편집할 수 있다. |

#### 4.11.8 데이터 요구사항

**입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|-----------|
| elementId | string | 필수 | 패턴: /^[a-zA-Z0-9_-]+$/, 금지 ID 제외, 중복 불허 |

**활용 사례**:

| URL 파라미터 | 용도 | 예시 |
|-------------|------|------|
| startAt | 해당 질문부터 설문 시작 | ?startAt=customQuestionId |
| {elementId} | 해당 질문에 값 사전 입력(prefill) | ?customQuestionId=value |

#### 4.11.9 화면/UI 요구사항

- Element 고급 설정 내에 ID 편집 필드와 "저장" 버튼을 배치한다.
- 발행된 설문에서 isDraft=false인 Element의 ID 편집 필드를 비활성화(disabled)한다.
- 유효성 검증 실패 시 필드 하단에 오류 메시지를 표시한다.

#### 4.11.10 비기능 요구사항

없음.

---

### 4.12 Hidden Fields 카드

#### 4.12.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-010-12 |
| 기능명 | Hidden Fields 카드 |
| 관련 요구사항 ID | FR-014 (4.17), AC-014-19 |
| 우선순위 | 필수 |
| 기능 설명 | 설문에 Hidden Field를 추가하고 관리한다. Hidden Field는 URL 파라미터로 전달되며 응답자에게 보이지 않는 데이터 필드이다. |

#### 4.12.2 선행 조건 (Preconditions)

- Elements View가 활성화된 상태이다.

#### 4.12.3 후행 조건 (Postconditions)

- Hidden Field 설정이 설문 데이터에 반영된다.

#### 4.12.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Hidden Fields 카드의 활성화 토글을 ON으로 설정한다. |
| 2 | 시스템 | Hidden Field 관리 UI를 표시한다. |
| 3 | 사용자 | 새 Field ID를 입력하고 추가한다. |
| 4 | 시스템 | ID 유효성 검증을 수행한다 (금지 ID, 패턴, 중복). |
| 5 | 시스템 | 검증 통과 시 Hidden Field를 추가한다. |

#### 4.12.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-12-01 | 활성화 토글을 OFF로 변경 | Hidden Fields를 비활성화하고 관리 UI를 숨긴다. |
| AF-12-02 | 기존 Hidden Field 삭제 | 해당 Field를 목록에서 제거한다. |

#### 4.12.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-12-01 | 금지 ID 또는 유효하지 않은 패턴의 ID 입력 | 오류 메시지를 표시하고 추가를 거부한다. |
| EF-12-02 | 기존 Element ID 또는 다른 Hidden Field ID와 중복 | 오류 메시지를 표시하고 추가를 거부한다. |

#### 4.12.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-12-01 | Hidden Field ID는 금지 ID 목록에 해당하지 않아야 한다. |
| BR-12-02 | Hidden Field ID는 Element ID, Ending Card ID, 다른 Hidden Field ID와 중복되지 않아야 한다. |
| BR-12-03 | Hidden Field ID는 유효한 패턴(영문/숫자/하이픈/언더스코어)을 준수해야 한다. |

#### 4.12.8 데이터 요구사항

**입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|-----------|
| fieldId | string | 필수 | 패턴: /^[a-zA-Z0-9_-]+$/, 금지 ID 제외, 중복 불허 |

#### 4.12.9 화면/UI 요구사항

- 활성화/비활성화 토글
- Field ID 입력 필드 + 추가 버튼
- 추가된 Field 목록 (각 항목에 삭제 버튼)
- 유효성 검증 실패 시 인라인 오류 메시지

#### 4.12.10 비기능 요구사항

없음.

---

### 4.13 Survey Variables 카드

#### 4.13.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-010-13 |
| 기능명 | Survey Variables 카드 |
| 관련 요구사항 ID | FR-014 (4.18), AC-014-19 |
| 우선순위 | 필수 |
| 기능 설명 | 설문 내에서 사용할 변수(number 또는 text 유형)를 추가, 편집, 삭제한다. |

#### 4.13.2 선행 조건 (Preconditions)

- Elements View가 활성화된 상태이다.

#### 4.13.3 후행 조건 (Postconditions)

- 변수 설정이 설문 데이터에 반영된다.

#### 4.13.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | "변수 추가" 버튼을 클릭한다. |
| 2 | 시스템 | 새 변수 항목을 생성한다. |
| 3 | 사용자 | 변수 유형(number 또는 text)을 선택한다. |
| 4 | 사용자 | 변수 이름을 입력한다. |
| 5 | 사용자 | 변수 기본값을 입력한다. |
| 6 | 시스템 | 변수를 설문 데이터에 저장한다. |

#### 4.13.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-13-01 | 기존 변수 이름/값 편집 | 해당 변수의 이름 또는 값을 업데이트한다. |

#### 4.13.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-13-01 | Logic에서 사용 중인 변수 삭제 시도 | 경고 토스트를 표시한다. ("이 변수는 Logic에서 사용 중입니다.") |

#### 4.13.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-13-01 | 변수 유형은 number와 text 2가지만 지원한다. |
| BR-13-02 | 변수 이름은 고유해야 하며, 유효한 패턴을 준수해야 한다. |
| BR-13-03 | Logic에서 사용 중인 변수를 삭제하려 하면 경고를 표시한다. |

#### 4.13.8 데이터 요구사항

**입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|-----------|
| name | string | 필수 | 고유, 유효한 패턴 |
| type | enum("number", "text") | 필수 | - |
| value | number 또는 string | 선택 | 유형에 따른 타입 검증 |

#### 4.13.9 화면/UI 요구사항

- 변수 추가 버튼
- 각 변수 행: 유형 선택(드롭다운), 이름 입력, 값 입력, 삭제 버튼
- Logic 참조 경고 토스트

#### 4.13.10 비기능 요구사항

없음.

---

### 4.14 Validation Rules 편집기

#### 4.14.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-010-14 |
| 기능명 | Validation Rules 편집기 |
| 관련 요구사항 ID | FR-014 (4.19), AC-014-18 |
| 우선순위 | 필수 |
| 기능 설명 | Element별로 적용 가능한 유효성 검증 규칙을 편집한다. Element 유형에 따라 적용 가능한 규칙만 선택할 수 있다. |

#### 4.14.2 선행 조건 (Preconditions)

- Element의 고급 설정이 펼쳐진 상태이다.

#### 4.14.3 후행 조건 (Postconditions)

- Validation Rules가 Element 데이터에 반영된다.

#### 4.14.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Validation Rules 편집 영역을 연다. |
| 2 | 시스템 | 해당 Element 유형에 적용 가능한 규칙 유형 목록을 표시한다. |
| 3 | 사용자 | 규칙 유형을 선택한다. |
| 4 | 시스템 | 선택된 규칙에 맞는 파라미터 입력 필드를 표시한다. |
| 5 | 사용자 | 규칙 파라미터 값을 입력한다. |
| 6 | 시스템 | 규칙을 Element 데이터에 저장한다. |

#### 4.14.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-14-01 | 여러 규칙 추가 시 | AND/OR 로직 선택을 통해 규칙 간 관계를 설정한다. |
| AF-14-02 | Address/ContactInfo 유형 Element | 대상 필드 선택(필드 선택 컴포넌트)을 추가로 표시한다. |

#### 4.14.6 예외 흐름 (Exception Flow)

없음.

#### 4.14.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-14-01 | Element 유형에 맞는 validation 규칙만 선택 가능하다. |
| BR-14-02 | 여러 규칙 적용 시 AND/OR 로직 방식을 선택할 수 있다. |

#### 4.14.8 데이터 요구사항

**Validation Rules 편집기 UI 컴포넌트**:

| 컴포넌트 | 역할 |
|---------|------|
| 개별 규칙 행 | 각 validation rule 표시 및 편집 |
| 규칙 유형 선택 | 적용할 validation rule 유형 선택 |
| 규칙 값 입력 | 규칙 파라미터 값 입력 |
| 필드 선택 | Address/ContactInfo의 대상 필드 선택 |
| AND/OR 로직 선택 | validation logic 방식 선택 |
| 입력 유형 선택 | 입력 유형 선택 |
| 단위 선택 | 단위 선택 |

#### 4.14.9 화면/UI 요구사항

- 규칙 목록: 행 단위로 규칙을 표시
- 규칙 추가/삭제 버튼
- 규칙 유형 드롭다운 (Element 유형별 필터링)
- 파라미터 값 입력 필드
- AND/OR 로직 선택 토글
- Address/ContactInfo: 필드 선택 드롭다운 추가

#### 4.14.10 비기능 요구사항

없음.

---

### 4.15 Settings View

#### 4.15.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-010-15 |
| 기능명 | Settings View |
| 관련 요구사항 ID | FR-014 (4.20) |
| 우선순위 | 필수 |
| 기능 설명 | 설문 설정을 편집하는 뷰. 배포 방식, 트리거, 응답 옵션, 재접촉, 배치, 타겟팅 설정 카드를 포함한다. |

#### 4.15.2 선행 조건 (Preconditions)

- Settings 탭이 활성화된 상태이다.
- CX 모드가 아닌 상태이다 (BR-02-03).

#### 4.15.3 후행 조건 (Postconditions)

- 설문 설정이 설문 데이터에 반영된다.

#### 4.15.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | Settings View의 6개 하위 카드를 렌더링한다. |
| 2 | 사용자 | 원하는 설정 카드를 선택하여 설정을 변경한다. |
| 3 | 시스템 | 변경사항을 설문 데이터에 반영한다. |

#### 4.15.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-15-01 | 설문 유형이 link인 경우 | 트리거 설정 카드를 비활성화하거나 숨긴다. |
| AF-15-02 | 설문 유형이 app인 경우 | 트리거 설정 카드를 활성화하여 표시한다. |

#### 4.15.6 예외 흐름 (Exception Flow)

없음.

#### 4.15.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-15-01 | CX 모드에서 Settings 탭은 표시되지 않는다. |
| BR-15-02 | 트리거 설정 카드는 app 타입 설문에서만 활성화된다. |

#### 4.15.8 데이터 요구사항

**Settings View 하위 카드 목록**:

| 카드 | 설명 |
|------|------|
| 배포 방식 설정 카드 | 설문 배포 방식 설정 (link/app 전환) |
| 트리거 설정 카드 | 트리거 설정 (app 타입일 때) |
| 응답 옵션 카드 | 응답 옵션 (autoComplete, 표시 옵션 등) |
| 재접촉 설정 카드 | 재접촉 설정 |
| 설문 배치 설정 카드 | 위젯 배치 설정 (프로젝트 오버라이드) |
| 타겟팅 설정 카드 | 타겟팅/세그먼트 설정 |

#### 4.15.9 화면/UI 요구사항

- 6개 하위 카드가 수직으로 배치된다.
- 각 카드는 독립적으로 접기/펼치기가 가능하다.

#### 4.15.10 비기능 요구사항

없음.

---

### 4.16 Styling View

#### 4.16.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-010-16 |
| 기능명 | Styling View |
| 관련 요구사항 ID | FR-014 (4.21), AC-014-02 |
| 우선순위 | 선택 |
| 기능 설명 | 설문의 시각적 스타일을 커스터마이징하는 뷰. 폼 스타일, 로고, 배경(애니메이션/색상/이미지) 설정을 포함한다. |

#### 4.16.2 선행 조건 (Preconditions)

- Styling 탭이 활성화된 상태이다.
- 프로젝트의 스타일 오버라이드 허용 설정이 true이다.

#### 4.16.3 후행 조건 (Postconditions)

- 스타일 설정이 설문 데이터에 반영된다.
- 실시간 프리뷰에 스타일 변경이 반영된다.

#### 4.16.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | Styling View의 하위 설정 영역을 렌더링한다. |
| 2 | 사용자 | 폼 스타일, 로고, 배경 등 원하는 설정을 변경한다. |
| 3 | 시스템 | 변경사항을 설문 데이터에 반영하고 프리뷰를 업데이트한다. |

#### 4.16.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-16-01 | 배경 유형으로 이미지 배경 선택 | Unsplash 이미지 검색 통합을 통해 이미지를 선택할 수 있다. |

#### 4.16.6 예외 흐름 (Exception Flow)

없음.

#### 4.16.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-16-01 | Styling 탭은 프로젝트의 스타일 오버라이드 허용 설정이 true일 때만 표시된다. |
| BR-16-02 | 배경 유형은 애니메이션 배경, 색상 배경, 이미지 배경 3가지이다. |

#### 4.16.8 데이터 요구사항

**Styling View 설정 항목**:

| 설정 영역 | 설명 |
|----------|------|
| 폼 스타일 설정 | 설문 폼 스타일 커스터마이징 |
| 로고 설정 카드 | 설문에 표시할 로고 설정 |
| 배경 설정 | 배경 유형 및 세부 설정 |

#### 4.16.9 화면/UI 요구사항

- 폼 스타일 설정 영역
- 로고 업로드 및 설정
- 배경 유형 선택: 애니메이션 / 색상 / 이미지
- 이미지 배경 선택 시 Unsplash 검색 통합

#### 4.16.10 비기능 요구사항

없음.

---

### 4.17 실시간 프리뷰

#### 4.17.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-010-17 |
| 기능명 | 실시간 프리뷰 |
| 관련 요구사항 ID | FR-014 (4.22), AC-014-14, AC-014-15 |
| 우선순위 | 필수 |
| 기능 설명 | 편집기 우측에 설문 프리뷰를 실시간으로 표시한다. 활성 Element에 맞춰 자동 스크롤하며, 설문 유형에 따라 modal 또는 fullwidth 모드로 표시한다. |

#### 4.17.2 선행 조건 (Preconditions)

- 편집기 레이아웃이 렌더링된 상태이다.
- 화면 너비가 md(768px) 이상이다.

#### 4.17.3 후행 조건 (Postconditions)

- 편집 중인 설문의 현재 상태가 프리뷰에 반영된다.

#### 4.17.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 설문 데이터를 기반으로 프리뷰를 렌더링한다. |
| 2 | 시스템 | 설문 유형에 따라 프리뷰 모드를 결정한다 (app: modal, link: fullwidth). |
| 3 | 사용자 | 편집기에서 Element를 선택하거나 수정한다. |
| 4 | 시스템 | 활성 Element에 맞춰 프리뷰를 자동 스크롤한다. |
| 5 | 시스템 | 편집 내용을 실시간으로 프리뷰에 반영한다. |

#### 4.17.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-17-01 | 다국어 설정에서 언어를 변경한 경우 | 선택된 언어로 프리뷰를 표시한다. |

#### 4.17.6 예외 흐름 (Exception Flow)

없음.

#### 4.17.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-17-01 | app 타입 설문은 modal 모드로 프리뷰를 표시한다. |
| BR-17-02 | link 타입 설문은 fullwidth 모드로 프리뷰를 표시한다. |
| BR-17-03 | 프리뷰는 활성 Element에 맞춰 자동 스크롤한다. |
| BR-17-04 | 선택된 언어로 프리뷰가 표시된다. |
| BR-17-05 | 스팸 방지 설정 및 공개 도메인 정보가 프리뷰에 반영된다. |

#### 4.17.8 데이터 요구사항

**입력 데이터**:

| 필드명 | 타입 | 설명 |
|--------|------|------|
| survey | Survey | 편집 중인 전체 설문 데이터 |
| activeElementId | string | 현재 활성화된 Element ID |
| selectedLanguage | string | 프리뷰에 표시할 언어 코드 |
| surveyType | enum("app", "link") | 설문 유형 |

#### 4.17.9 화면/UI 요구사항

- 편집기 우측 1/3 영역에 배치
- app 타입: modal 형태 프리뷰
- link 타입: fullwidth 형태 프리뷰
- md(768px) 미만 화면에서 숨김

#### 4.17.10 비기능 요구사항

- 프리뷰는 편집기의 변경사항을 실시간으로 반영해야 한다.
- 불필요한 리렌더링을 방지하기 위해 Ref 기반 자동 저장 메커니즘을 사용한다.

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

| 엔티티 | 설명 | 주요 필드 |
|--------|------|----------|
| Survey | 설문 전체 데이터 | id, name, status, type, blocks, endings, welcomeCard, hiddenFields, variables |
| Block | 질문 그룹 | id, name, elements, logic, logicFallback, buttonLabel, backButtonLabel |
| Element | 개별 질문 | id, type, headline, required, isDraft, validationRules |
| BlockLogic | 조건부 로직 | id, conditions, actions |
| BlockLogicAction | 로직 액션 | type (calculate/requireAnswer/jumpToBlock), target |
| WelcomeCard | 환영 카드 | enabled, headline, subtitle, fileUrl, buttonLabel, timeToFinish, showResponseCount |
| EndingCard | 종료 카드 | id, type (endScreen/redirectToUrl), headline, subtitle, buttonLabel, buttonLink, url, label, imageUrl |
| HiddenField | 숨겨진 필드 | fieldId |
| Variable | 설문 변수 | name, type (number/text), value |

### 5.2 엔티티 간 관계

```
Survey (1)
 ├── WelcomeCard (1)
 ├── Block (1..N)
 │    ├── Element (1..N)
 │    │    └── ValidationRule (0..N)
 │    └── BlockLogic (0..N)
 │         └── BlockLogicAction (1..N)
 ├── EndingCard (1..N)
 ├── HiddenField (0..N)
 └── Variable (0..N)
```

### 5.3 데이터 흐름

```
[사용자 편집 입력]
     |
     v
[편집기 UI 컴포넌트]
     |
     v
[설문 상태(State) 업데이트]
     |
     +---> [실시간 프리뷰 반영]
     |
     +---> [자동 저장 (Draft 상태)]
     |
     +---> [유효성 검증 (발행 시)]
              |
              v
         [서버 저장/발행 API]
```

---

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 연동 대상 | 용도 | 방향 |
|----------|------|------|
| Unsplash API | 배경 이미지 검색 (Styling View) | 조회 |
| 파일 업로드 서비스 | Welcome Card/Ending Card 이미지 업로드 | 업로드 |

### 6.2 API 명세

본 문서의 범위에서 서버 측 API 상세는 제외한다. 편집기는 설문 저장/발행 API를 호출하지만, 해당 API의 상세 명세는 별도 문서에서 관리한다.

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| 항목 | 요구사항 |
|------|----------|
| 자동 저장 | Ref 기반 자동 저장으로 불필요한 리렌더링을 방지한다. |
| 애니메이션 | 목록 변경 시 부드러운 애니메이션을 제공한다. |

### 7.2 보안 요구사항

본 문서 범위 내 별도 보안 요구사항은 없다. 전체 시스템 보안 요구사항은 NFR-003을 참조한다.

### 7.3 가용성 요구사항

| 항목 | 요구사항 |
|------|----------|
| 반응형 | 프리뷰 패널은 md(768px) 이상에서만 표시한다. 모바일 환경에서는 편집 영역만 전체 너비로 표시한다. |
| 접근성 | 접기/펼치기 컴포넌트에 aria-expanded 상태를 반영한다. |
| UX 안전장치 | 삭제 전 확인 모달을 표시한다. Logic에서 사용 중인 항목 삭제 시 경고 토스트를 표시한다. |

---

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| 항목 | 제약 |
|------|------|
| 드래그 앤 드롭 전략 | 수직 리스트 정렬, 가장 가까운 코너 기반 드롭 타겟 결정 |
| Block ID 형식 | CUID |
| Element ID 패턴 | 영문, 숫자, 하이픈, 언더스코어만 허용 |
| 프리뷰 표시 조건 | 화면 너비 md(768px) 이상 |

### 8.2 비즈니스 제약사항

| 항목 | 제약 |
|------|------|
| Welcome Card 버튼 라벨 최대 길이 | 48자 |
| Block 내 최소 Element 수 | 1개 |
| Block 이름 자동 포맷 | "Block {N}" |
| Ending Card 유형 수 | 2가지 (endScreen, redirectToUrl) |
| 편집기 탭 수 | 4개 (Elements, Styling, Settings, Follow-Ups) |
| 프리뷰 패널 너비 비율 | 1/3 |
| 메인 편집 패널 너비 비율 | 2/3 |
| app 타입 프리뷰 모드 | modal |
| link 타입 프리뷰 모드 | fullwidth |
| Element ID 편집 가능 조건 | draft 상태 또는 isDraft=true인 Element |
| Welcome Card 활성 ID | "start" |
| 응답 수 표시 조건 | 설문 유형이 link일 때 |
| Welcome Card 이미지 허용 확장자 | png, jpeg, jpg, webp, heic |
| Redirect URL 플레이스홀더 | "https://formbricks.com" |

### 8.3 가정사항

| 항목 | 가정 |
|------|------|
| 브라우저 환경 | 사용자는 최신 브라우저(Chrome, Firefox, Safari, Edge)를 사용한다. |
| 편집 권한 | 편집기에 접근하는 사용자는 해당 설문의 편집 권한을 보유하고 있다. |
| 네트워크 | 자동 저장 및 발행을 위해 네트워크 연결이 유지된다. |
| 질문 유형 | 15가지 Element 유형의 내부 동작은 FSD-009에 정의되어 있다. |
| 조건부 로직 | Block Logic의 조건 평가 엔진 상세는 FSD-012에 정의되어 있다. |

---

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 요구사항 설명 | 기능 ID | 기능명 | 검증 기준 (AC) |
|------------|-------------|---------|--------|---------------|
| FR-014 (4.1) | 편집기 전체 레이아웃 | FN-010-01 | 편집기 레이아웃 | - |
| FR-014 (4.2) | 편집기 탭 구조 | FN-010-02 | 편집기 탭 전환 | AC-014-01, AC-014-02, AC-014-03 |
| FR-014 (4.3) | SurveyMenuBar | FN-010-03 | SurveyMenuBar | - |
| FR-014 (4.4) | Block 구조 | FN-010-04 | Block 구조 관리 | AC-014-09, AC-014-10 |
| FR-014 (4.5) | Block Logic | FN-010-05 | Block Logic 편집 | AC-014-16, AC-014-17 |
| FR-014 (4.6) | Block 연산 | FN-010-04 | Block 구조 관리 | AC-014-11 |
| FR-014 (4.7) | ElementsView 구성 | FN-010-06 | Elements View | - |
| FR-014 (4.8) | 드래그 앤 드롭 | FN-010-07 | 드래그 앤 드롭 | AC-014-08, AC-014-11 |
| FR-014 (4.9) | Welcome Card 속성 | FN-010-08 | Welcome Card 편집 | AC-014-04, AC-014-05, AC-014-06 |
| FR-014 (4.10) | Ending Card 유형 | FN-010-09 | Ending Card 관리 | AC-014-07 |
| FR-014 (4.11) | End Screen 폼 | FN-010-09 | Ending Card 관리 | - |
| FR-014 (4.12) | Redirect to URL 폼 | FN-010-09 | Ending Card 관리 | - |
| FR-014 (4.13) | Ending Card 관리 | FN-010-09 | Ending Card 관리 | AC-014-08 |
| FR-014 (4.14) | BlockCard 구성 | FN-010-10 | BlockCard 렌더링 | - |
| FR-014 (4.15) | 유형별 Element Form | FN-010-10 | BlockCard 렌더링 | - |
| FR-014 (4.16) | Element ID 편집 | FN-010-11 | Element ID 편집 | AC-014-12, AC-014-13 |
| FR-014 (4.17) | HiddenFieldsCard | FN-010-12 | Hidden Fields 카드 | AC-014-19 |
| FR-014 (4.18) | SurveyVariablesCard | FN-010-13 | Survey Variables 카드 | AC-014-19 |
| FR-014 (4.19) | ValidationRulesEditor | FN-010-14 | Validation Rules 편집기 | AC-014-18 |
| FR-014 (4.20) | Settings View | FN-010-15 | Settings View | - |
| FR-014 (4.21) | Styling View | FN-010-16 | Styling View | AC-014-02 |
| FR-014 (4.22) | 실시간 프리뷰 | FN-010-17 | 실시간 프리뷰 | AC-014-14, AC-014-15 |

### 9.2 수용 기준 추적 매트릭스

| 수용 기준 ID | 수용 기준 설명 | 기능 ID | 검증 방법 |
|-------------|-------------|---------|----------|
| AC-014-01 | 편집기는 4개 탭으로 구성 | FN-010-02 | 탭 4개(Elements, Styling, Settings, Follow-Ups) 존재 확인 |
| AC-014-02 | Styling 탭 조건부 표시 | FN-010-02 | 스타일 오버라이드 허용=true 시 표시, false 시 숨김 확인 |
| AC-014-03 | CX 모드에서 Settings 숨김 | FN-010-02 | CX 모드에서 Settings 탭 미표시 확인 |
| AC-014-04 | Welcome Card 버튼 라벨 48자 제한 | FN-010-08 | 49자 입력 시 차단 확인 |
| AC-014-05 | Welcome Card 활성화 시 제목 필수 | FN-010-08 | 제목 미입력 + 활성화 상태에서 발행 시 유효성 오류 확인 |
| AC-014-06 | 응답 수 토글 link 타입만 | FN-010-08 | link 타입: 토글 표시, app 타입: 토글 미표시 확인 |
| AC-014-07 | Ending Card 유형 전환 | FN-010-09 | OptionsSwitch로 endScreen <-> redirectToUrl 전환 확인 |
| AC-014-08 | Ending Card 드래그 앤 드롭 | FN-010-07, FN-010-09 | Ending Card 순서 변경 동작 확인 |
| AC-014-09 | Block 최소 1개 Element | FN-010-04 | Block 내 유일한 Element 삭제 시 차단 확인 |
| AC-014-10 | Block 이름 자동 재정렬 | FN-010-04 | 삭제/이동/복제 후 "Block 1", "Block 2", ... 순서 확인 |
| AC-014-11 | Block 드래그 앤 드롭 | FN-010-07 | Block 간 순서 변경 동작 확인 |
| AC-014-12 | Element ID 편집 조건 | FN-010-11 | draft 상태: 편집 가능, 발행 후: isDraft=true만 편집 가능 확인 |
| AC-014-13 | Element ID 유효성 검증 | FN-010-11 | 금지 ID, 중복, 패턴 검증 동작 확인 |
| AC-014-14 | 프리뷰 자동 업데이트 | FN-010-17 | 활성 Element 변경 시 프리뷰 스크롤 동작 확인 |
| AC-014-15 | 프리뷰 모드 구분 | FN-010-17 | app: modal, link: fullwidth 표시 확인 |
| AC-014-16 | Block Logic 3가지 Action | FN-010-05 | calculate, requireAnswer, jumpToBlock 선택/동작 확인 |
| AC-014-17 | 참조 항목 삭제 경고 | FN-010-05, FN-010-09, FN-010-13 | Logic 참조 중 삭제 시 경고 토스트 표시 확인 |
| AC-014-18 | Validation Rules 유형별 필터링 | FN-010-14 | Element 유형에 맞는 규칙만 표시 확인 |
| AC-014-19 | Hidden Field/Variable 유효성 | FN-010-12, FN-010-13 | 고유성 및 패턴 검증 동작 확인 |
| AC-014-20 | Recall 기능 | FN-010-09 | Ending Card에 이전 응답 삽입 동작 확인 |

### 9.3 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-02-21 | 1.0 | 초기 작성 - FSD-010 요구사항 명세서 기반 | Claude |
