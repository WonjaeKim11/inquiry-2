# 기능 명세서 (Functional Specification)

# 08. 설문 생성, 유형 & 라이프사이클

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | v1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-008 (`feature-segmantation/08-survey-creation-type-lifecycle.md`) |
| FR 범위 | FR-011, FR-012, FR-047 |
| 라이선스 | Community |
| 상태 | 초안 |

---

## 2. 개요

### 2.1 목적

Inquiry 기반 설문(Survey)의 생성, 유형 분류, 상태 관리(라이프사이클)에 대한 상세 기능 명세를 정의한다. 설문의 데이터 모델, 유형별 특성, 상태 전이 규칙, 유효성 검증 로직, Draft 자동 저장 메커니즘, 템플릿 기반 생성 흐름을 구체적으로 기술하여 개발 및 테스트의 기준 문서로 활용한다.

### 2.2 범위

**In-scope:**
- 설문 데이터 모델 (전체 스키마 및 필드 정의)
- 설문 유형: link, app (2가지)
- 설문 상태: draft, inProgress, paused, completed (4가지)
- 상태 전이 규칙 및 조건
- Draft 자동 저장 메커니즘
- autoComplete 기능
- 템플릿 기반 설문 생성
- 발행 시 유효성 검증
- 설문 표시 옵션 (displayOption, displayLimit, displayPercentage)

**Out-of-scope:**
- 개별 질문 유형 상세 (FSD-009 참조)
- 설문 편집기 UI 상세 (FSD-010 참조)
- 응답 수집 및 분석 (FSD-021, FSD-025 참조)

### 2.3 대상 사용자

| 역할 | 설명 | 주요 상호작용 |
|------|------|--------------|
| 설문 작성자 | 설문 생성, 편집, 발행을 수행하는 사용자 | 설문 CRUD, 상태 전이, 템플릿 선택 |
| 시스템 | 자동 저장, 상태 전이, autoComplete를 처리하는 백엔드 | 자동 저장 실행, autoComplete 판정, 상태 전이 |
| 응답자 | link 또는 app 채널을 통해 설문에 응답하는 사용자 | 설문 응답 제출 |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| Survey (설문) | 질문 블록, Welcome Card, 종료 카드 등으로 구성된 데이터 수집 단위 |
| SurveyType (설문 유형) | 설문의 배포 방식 분류. link 또는 app |
| SurveyStatus (설문 상태) | 설문의 라이프사이클 단계. draft, inProgress, paused, completed |
| Draft | 설문이 아직 발행되지 않은 편집 중 상태 |
| Publish (발행) | draft 상태의 설문을 유효성 검증 후 inProgress로 전환하는 행위 |
| autoComplete | 설정된 응답 수에 도달하면 자동으로 completed 상태로 전환하는 기능 |
| Block | 질문(Question)을 포함하는 컨테이너 단위 (questions 필드의 대체) |
| Welcome Card | 설문 시작 전 표시되는 환영 화면 |
| Ending | 설문 완료 후 표시되는 종료 화면 또는 리다이렉트 설정 |
| Hidden Fields | 응답자에게 보이지 않지만 URL 파라미터 등으로 값이 전달되는 필드 |
| Template (템플릿) | 미리 구성된 설문 프리셋으로 새 설문 생성 시 초기 데이터로 활용 |
| displayOption | 설문이 응답자에게 표시되는 방식을 결정하는 옵션 |
| CUID2 | 충돌 방지 고유 식별자 생성 알고리즘 |
| Environment | 설문이 속한 실행 환경 (개발/프로덕션) |

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
+------------------+      +-------------------+      +------------------+
|   설문 작성자     |----->|   설문 편집기 UI   |----->|   설문 API 서버   |
| (Survey Creator) |      | (Survey Editor)   |      | (Survey Service) |
+------------------+      +-------------------+      +------------------+
                                   |                         |
                                   | 자동 저장 (10초)         | CRUD / 상태 전이
                                   v                         v
                          +-------------------+      +------------------+
                          | Draft Auto-Save   |      |   Database       |
                          | (클라이언트 타이머)|      |   (PostgreSQL)   |
                          +-------------------+      +------------------+
                                                             |
                          +-------------------+              |
                          |   Template Store  |--------------+
                          | (프리셋 데이터)    |
                          +-------------------+

+------------------+      +-------------------+
|   응답자          |----->| Link Survey URL   | (link 유형)
| (Respondent)     |      +-------------------+
|                  |----->| App SDK Widget    | (app 유형)
+------------------+      +-------------------+
```

### 3.2 주요 기능 목록 (Feature List)

| 기능 ID | 기능명 | 관련 FR | 우선순위 |
|---------|--------|---------|---------|
| FN-008-01 | 설문 유형 관리 | FR-011 | 필수 |
| FN-008-02 | 설문 상태 관리 (라이프사이클) | FR-011 | 필수 |
| FN-008-03 | 설문 데이터 모델 관리 | FR-012 | 필수 |
| FN-008-04 | 설문 표시 옵션 관리 | FR-012 | 필수 |
| FN-008-05 | autoComplete 기능 | FR-012 | 필수 |
| FN-008-06 | Welcome Card 관리 | FR-012 | 필수 |
| FN-008-07 | Ending (종료 카드) 관리 | FR-012 | 필수 |
| FN-008-08 | Hidden Fields 관리 | FR-012 | 필수 |
| FN-008-09 | Survey Variables 관리 | FR-012 | 필수 |
| FN-008-10 | Draft 자동 저장 | FR-047 | 필수 |
| FN-008-11 | 템플릿 기반 설문 생성 | FR-011 | 필수 |
| FN-008-12 | 발행 시 유효성 검증 | FR-012 | 필수 |
| FN-008-13 | 추가 설정 필드 관리 | FR-012 | 보통 |

### 3.3 기능 간 관계도

```
FN-008-11 (템플릿 생성) ──> FN-008-03 (데이터 모델) ──> FN-008-01 (유형)
                                    |                        |
                                    v                        v
                             FN-008-06 (Welcome Card)  FN-008-02 (상태 관리)
                             FN-008-07 (Endings)             |
                             FN-008-08 (Hidden Fields)       v
                             FN-008-09 (Variables)     FN-008-12 (유효성 검증)
                             FN-008-04 (표시 옵션)           |
                             FN-008-05 (autoComplete)        v
                             FN-008-13 (추가 설정)     FN-008-10 (자동 저장)
```

---

## 4. 상세 기능 명세

### 4.1 설문 유형 관리

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-008-01 |
| 기능명 | 설문 유형 관리 |
| 관련 요구사항 ID | FR-011, AC-011-01 |
| 우선순위 | 필수 |
| 기능 설명 | 설문의 배포 유형을 link 또는 app으로 분류하고 관리한다. 설문 생성 시 유형을 지정하며, 유형에 따라 배포 방식이 결정된다. |

#### 4.1.2 선행 조건 (Preconditions)

- 사용자가 설문 생성 권한이 있는 Environment에 접근한 상태이다.
- Environment ID가 유효하다.

#### 4.1.3 후행 조건 (Postconditions)

- 설문에 link 또는 app 유형이 할당된다.
- link 유형: 고유 URL이 생성되어 이메일/SNS 등으로 공유 가능하다.
- app 유형: JS SDK를 통해 웹 애플리케이션 내에서 표시 가능하다.

#### 4.1.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 설문 작성자 | 새 설문 생성을 요청한다. |
| 2 | 시스템 | 설문 유형 선택 화면을 표시한다 (link / app). |
| 3 | 설문 작성자 | 설문 유형을 선택한다. |
| 4 | 시스템 | 선택된 유형으로 설문을 생성한다. 유형을 지정하지 않으면 기본값 `app`을 적용한다. |
| 5 | 시스템 | 설문을 draft 상태로 초기화한다. |

#### 4.1.5 대안 흐름 (Alternative Flow)

- **AF-01: 템플릿에서 유형 결정** -- 템플릿 기반 생성 시, 템플릿의 채널(channels) 정보에 따라 유형이 사전 결정될 수 있다. 사용자는 이를 변경할 수 있다.

#### 4.1.6 예외 흐름 (Exception Flow)

- **EF-01: 유효하지 않은 유형 입력** -- link, app 이외의 값이 전달되면 시스템이 유효성 검증 오류를 반환한다. 설문은 생성되지 않는다.

#### 4.1.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-01-01 | 설문 유형은 link, app 2가지만 허용한다. | 설문 생성/수정 시 | link, app 외 값 거부 |
| BR-01-02 | 설문 유형의 기본값은 app이다. | 유형 미지정 시 | app으로 설정 |
| BR-01-03 | email 유형은 존재하지 않는다. | - | link 유형으로 대체하여 이메일 공유 |

#### 4.1.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| type | enum("link", "app") | 아니오 | 허용값: "link", "app". 미입력 시 기본값 "app" 적용 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| type | "link" 또는 "app" | 설정된 설문 유형 |

#### 4.1.9 화면/UI 요구사항

- 설문 생성 시 link / app 유형 선택 UI를 제공한다.
- 유형별 아이콘 또는 설명 텍스트로 차이점을 안내한다.

#### 4.1.10 비기능 요구사항

- 해당 없음.

---

### 4.2 설문 상태 관리 (라이프사이클)

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-008-02 |
| 기능명 | 설문 상태 관리 (라이프사이클) |
| 관련 요구사항 ID | FR-011, AC-011-02, AC-011-03 |
| 우선순위 | 필수 |
| 기능 설명 | 설문의 라이프사이클을 draft -> inProgress -> paused/completed 흐름으로 관리한다. 각 상태 전이에는 정해진 조건이 필요하며, 허용되지 않은 상태 전이는 차단된다. |

#### 4.2.2 선행 조건 (Preconditions)

- 설문이 존재하며 유효한 상태값을 가진다.
- 상태 전이를 요청하는 사용자가 해당 설문의 편집 권한을 보유한다.

#### 4.2.3 후행 조건 (Postconditions)

- 설문의 상태가 요청된 상태로 변경된다.
- 수정일시(updatedAt)가 갱신된다.
- 상태 전이에 따른 부수 효과가 적용된다 (예: draft -> inProgress 전환 시 자동 저장 비활성화).

#### 4.2.4 기본 흐름 (Basic Flow)

**흐름 A: 발행 (draft -> inProgress)**

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 설문 작성자 | 설문 발행(Publish)을 요청한다. |
| 2 | 시스템 | 설문의 현재 상태가 draft인지 확인한다. |
| 3 | 시스템 | 유효성 검증을 수행한다 (FN-008-12 참조). |
| 4 | 시스템 | 검증 통과 시 상태를 inProgress로 변경한다. |
| 5 | 시스템 | 자동 저장을 비활성화한다. |

**흐름 B: 일시정지 (inProgress -> paused)**

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 설문 작성자 | 설문 일시정지를 요청한다. |
| 2 | 시스템 | 현재 상태가 inProgress인지 확인한다. |
| 3 | 시스템 | 상태를 paused로 변경한다. |

**흐름 C: 재개 (paused -> inProgress)**

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 설문 작성자 | 설문 재개를 요청한다. |
| 2 | 시스템 | 현재 상태가 paused인지 확인한다. |
| 3 | 시스템 | 상태를 inProgress로 변경한다. |

**흐름 D: 완료 (inProgress -> completed)**

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 설문 작성자 또는 시스템 | 설문 완료를 요청하거나, autoComplete 조건이 충족된다. |
| 2 | 시스템 | 현재 상태가 inProgress인지 확인한다. |
| 3 | 시스템 | 상태를 completed로 변경한다. |

#### 4.2.5 대안 흐름 (Alternative Flow)

- **AF-02: autoComplete에 의한 자동 완료** -- 설문의 응답 수가 autoComplete 설정값에 도달하면, 시스템이 자동으로 inProgress -> completed 전이를 수행한다. 별도의 사용자 개입이 필요 없다.

#### 4.2.6 예외 흐름 (Exception Flow)

- **EF-02: 허용되지 않은 상태 전이 요청** -- 예를 들어 draft에서 직접 completed로 전이하려는 경우, 시스템이 오류를 반환한다. 상태는 변경되지 않는다.
- **EF-03: 발행 시 유효성 검증 실패** -- draft -> inProgress 전환 시 유효성 검증에 실패하면 상태 전이가 차단된다. 시스템은 구체적인 검증 실패 사유를 반환한다.

#### 4.2.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-02-01 | 새 설문은 반드시 draft 상태로 생성된다. | 설문 생성 시 | status = "draft" |
| BR-02-02 | draft -> inProgress 전이는 유효성 검증 통과가 필수이다. | 발행 요청 시 | 검증 실패 시 전이 차단 |
| BR-02-03 | completed 상태에서는 다른 상태로 전이할 수 없다. | completed 상태 | 모든 전이 요청 거부 |
| BR-02-04 | paused 상태에서는 inProgress로만 전이할 수 있다. | paused 상태 | inProgress 외 전이 거부 |

**허용 상태 전이 매트릭스:**

| 현재 상태 \ 목표 상태 | draft | inProgress | paused | completed |
|-----------------------|-------|------------|--------|-----------|
| draft | - | 허용 (검증 필수) | 불가 | 불가 |
| inProgress | 불가 | - | 허용 | 허용 |
| paused | 불가 | 허용 | - | 불가 |
| completed | 불가 | 불가 | 불가 | - |

#### 4.2.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| status | enum("draft", "inProgress", "paused", "completed") | 예 | 허용값 4가지. 상태 전이 매트릭스 준수 필수 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| status | enum | 변경된 설문 상태 |
| updatedAt | DateTime | 상태 변경 시각 |

#### 4.2.9 화면/UI 요구사항

- 현재 상태에 따라 가능한 상태 전이 버튼만 활성화한다.
- draft: "발행" 버튼 표시.
- inProgress: "일시정지", "완료" 버튼 표시.
- paused: "재개" 버튼 표시.
- completed: 상태 전이 버튼 비활성화.

#### 4.2.10 비기능 요구사항

- 해당 없음.

---

### 4.3 설문 데이터 모델 관리

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-008-03 |
| 기능명 | 설문 데이터 모델 관리 |
| 관련 요구사항 ID | FR-012, AC-012-01 ~ AC-012-10 |
| 우선순위 | 필수 |
| 기능 설명 | 설문의 전체 데이터 스키마를 정의하고 관리한다. 설문의 생성, 조회, 수정, 삭제(CRUD) 시 이 데이터 모델을 기준으로 처리한다. |

#### 4.3.2 선행 조건 (Preconditions)

- 유효한 Environment ID가 존재한다.
- 설문 생성 시 최소한 설문 이름(name)이 제공된다.

#### 4.3.3 후행 조건 (Postconditions)

- 설문 레코드가 데이터베이스에 생성/수정/삭제된다.
- CUID2 기반 고유 ID가 자동 할당된다.
- 생성일시/수정일시가 자동으로 기록된다.

#### 4.3.4 기본 흐름 (Basic Flow)

**설문 생성:**

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 설문 작성자 | 설문 생성을 요청한다 (이름, 유형 등 입력). |
| 2 | 시스템 | CUID2 기반 고유 ID를 생성한다. |
| 3 | 시스템 | 입력되지 않은 필드에 기본값을 적용한다 (4.3.8 참조). |
| 4 | 시스템 | 스키마 유효성 검증을 수행한다. |
| 5 | 시스템 | 설문을 데이터베이스에 저장한다 (status = draft). |
| 6 | 시스템 | 생성된 설문 데이터를 반환한다. |

#### 4.3.5 대안 흐름 (Alternative Flow)

- **AF-03: 템플릿 기반 생성** -- 프리셋 데이터(Welcome Card, Block 목록, 종료 카드, Hidden Fields)가 자동으로 채워진 상태에서 생성된다. 사용자는 이후 개별 필드를 수정할 수 있다.

#### 4.3.6 예외 흐름 (Exception Flow)

- **EF-04: 필수 필드 누락** -- Environment ID 등 필수 필드가 없으면 생성을 거부하고 오류를 반환한다.
- **EF-05: 스키마 유효성 검증 실패** -- 데이터 타입 불일치, 범위 초과 등의 오류 시 구체적 사유를 반환한다.

#### 4.3.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-03-01 | questions 또는 blocks 중 하나만 존재해야 한다. | 설문 저장 시 | 양쪽 모두 존재하면 오류 반환 |
| BR-03-02 | Question ID는 설문 내에서 고유해야 한다. | 설문 저장 시 | 중복 ID 발견 시 오류 반환 |
| BR-03-03 | Block ID는 설문 내에서 고유해야 한다. | 설문 저장 시 | 중복 ID 발견 시 오류 반환 |
| BR-03-04 | Ending ID는 설문 내에서 고유해야 한다. | 설문 저장 시 | 중복 ID 발견 시 오류 반환 |
| BR-03-05 | Variable ID는 설문 내에서 고유해야 한다. | 설문 저장 시 | 중복 ID 발견 시 오류 반환 |
| BR-03-06 | Variable name은 설문 내에서 고유해야 한다. | 설문 저장 시 | 중복 이름 발견 시 오류 반환 |
| BR-03-07 | Environment 삭제 시 해당 Environment의 모든 설문이 Cascade 삭제된다. | Environment 삭제 시 | 연관 설문 전체 삭제 |

#### 4.3.8 데이터 요구사항

**설문 핵심 필드 (전체 스키마):**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 |
|--------|------|------|--------|------------|
| id | CUID2 (string) | 자동 | 자동 생성 | CUID2 형식 |
| createdAt | DateTime | 자동 | 자동 생성 | - |
| updatedAt | DateTime | 자동 | 자동 갱신 | - |
| name | string | 예 | - | 빈 문자열 불가 |
| type | enum("link", "app") | 아니오 | "app" | 허용값 2가지 |
| environmentId | string | 예 | - | 유효한 Environment 참조 |
| creatorId | string (nullable) | 아니오 | null | 유효한 사용자 참조 또는 null |
| status | enum("draft", "inProgress", "paused", "completed") | 아니오 | "draft" | 허용값 4가지 |
| displayOption | enum("displayOnce", "displayMultiple", "respondMultiple", "displaySome") | 아니오 | "displayOnce" | 허용값 4가지 |
| autoClose | integer (nullable) | 아니오 | null | null 또는 양의 정수 |
| triggers | ActionClass[] | 아니오 | - | ActionClass 배열 |
| recontactDays | integer (nullable) | 아니오 | null | null 또는 0 이상 정수 |
| displayLimit | integer (nullable) | 아니오 | null | null 또는 양의 정수 |
| welcomeCard | object | 아니오 | { enabled: false } | Welcome Card 스키마 준수 |
| questions (deprecated) | array | 아니오 | [] | Block으로 대체 중 |
| blocks | array | 아니오 | [] | Block 스키마 배열 |
| endings | array | 아니오 | [] | Ending 스키마 배열 |
| hiddenFields | object | 아니오 | { enabled: false } | Hidden Fields 스키마 준수 |
| variables | array | 아니오 | [] | Variable 스키마 배열 |
| followUps | array | 아니오 | - | Follow-up 스키마 배열 |
| delay | integer | 아니오 | 0 | 0 이상 정수 (초 단위) |
| autoComplete | integer (nullable) | 아니오 | null | null 또는 1 이상 정수 |
| projectOverwrites | object (nullable) | 아니오 | null | 프로젝트 설정 오버라이드 스키마 |
| styling | object (nullable) | 아니오 | null | 스타일링 스키마 |
| showLanguageSwitch | boolean (nullable) | 아니오 | null | true, false, 또는 null |
| surveyClosedMessage | object (nullable) | 아니오 | null | 종료 메시지 스키마 |
| segment | object (nullable) | 아니오 | null | 세그먼트 스키마 |
| singleUse | object (nullable) | 아니오 | { enabled: false, isEncrypted: true } | SingleUse 스키마 |
| isVerifyEmailEnabled | boolean | 아니오 | false | true/false |
| recaptcha | object (nullable) | 아니오 | null | reCAPTCHA 스키마 |
| isSingleResponsePerEmailEnabled | boolean | 아니오 | false | true/false |
| isBackButtonHidden | boolean | 아니오 | false | true/false |
| isIpCollectionEnabled | boolean | 아니오 | false | true/false |
| pin | string (nullable) | 아니오 | null | null 또는 정확히 4자리 문자열 |
| displayPercentage | number (nullable) | 아니오 | null | null 또는 0.01 ~ 100 |
| languages | array | 아니오 | - | 다국어 설정 배열 |
| surveyMetadata | object | 아니오 | - | SEO 메타데이터 스키마 |
| slug | string (nullable) | 아니오 | null | null 또는 소문자/숫자/하이픈만 허용 |
| customHeadScript | string (nullable) | 아니오 | null | HTML 스크립트 |
| customHeadScriptMode | enum("add", "replace") (nullable) | 아니오 | null | 허용값 2가지 또는 null |

#### 4.3.9 화면/UI 요구사항

- 설문 편집기에서 위 필드들을 섹션별로 그룹화하여 표시한다 (FSD-010에서 상세 정의).

#### 4.3.10 비기능 요구사항

- Survey는 Environment ID 기반으로 데이터베이스 인덱싱하여 조회를 최적화한다.
- 스키마 기반 유효성 검증과 커스텀 검증을 병행하여 데이터 무결성을 보장한다.

---

### 4.4 설문 표시 옵션 관리

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-008-04 |
| 기능명 | 설문 표시 옵션 관리 |
| 관련 요구사항 ID | FR-012 |
| 우선순위 | 필수 |
| 기능 설명 | 설문이 응답자에게 표시되는 방식을 제어한다. 4가지 표시 옵션과 표시 제한, 표시 확률을 설정할 수 있다. |

#### 4.4.2 선행 조건 (Preconditions)

- 설문이 존재한다.

#### 4.4.3 후행 조건 (Postconditions)

- 설문의 표시 옵션이 설정/변경된다.
- displaySome 선택 시 displayLimit 값이 함께 저장된다.

#### 4.4.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 설문 작성자 | 설문 편집 화면에서 표시 옵션을 선택한다. |
| 2 | 시스템 | 선택된 옵션이 4가지 허용값 중 하나인지 검증한다. |
| 3 | 시스템 | displaySome 선택 시 displayLimit 입력 필드를 표시한다. |
| 4 | 설문 작성자 | displayLimit 값을 입력한다 (displaySome인 경우). |
| 5 | 시스템 | 설정을 저장한다. |

#### 4.4.5 대안 흐름 (Alternative Flow)

- **AF-04: 표시 확률 설정** -- 설문 작성자가 displayPercentage 값을 설정하면, 설문이 해당 확률로만 표시된다. 예를 들어 50으로 설정하면 조건 충족 시 50% 확률로 표시한다.

#### 4.4.6 예외 흐름 (Exception Flow)

- **EF-06: displaySome 선택 시 displayLimit 미입력** -- displaySome을 선택했으나 displayLimit을 지정하지 않으면 유효성 검증 경고를 표시한다.

#### 4.4.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-04-01 | 표시 옵션 기본값은 displayOnce이다. | 미설정 시 | displayOnce 적용 |
| BR-04-02 | displaySome 선택 시 displayLimit 값이 필수이다. | displaySome 선택 | displayLimit 미입력 시 경고 |
| BR-04-03 | 표시 확률은 0.01 ~ 100 범위이다. | displayPercentage 설정 시 | 범위 밖 값 거부 |

#### 4.4.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| displayOption | enum("displayOnce", "displayMultiple", "respondMultiple", "displaySome") | 아니오 | 허용값 4가지 |
| displayLimit | integer (nullable) | 조건부 (displaySome 시 필수) | 양의 정수 |
| displayPercentage | number (nullable) | 아니오 | null 또는 0.01 ~ 100 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| displayOption | enum | 설정된 표시 옵션 |
| displayLimit | integer 또는 null | 최대 표시 횟수 (displaySome인 경우) |
| displayPercentage | number 또는 null | 설문 표시 확률 |

**표시 옵션 상세:**

| 옵션 | 동작 설명 |
|------|----------|
| displayOnce | 응답자에게 해당 설문을 1회만 표시한다. 응답 여부와 무관하게 1회 표시 후 다시 노출하지 않는다. |
| displayMultiple | 응답자에게 여러 번 표시한다. 단, 응답은 1회만 허용한다. |
| respondMultiple | 응답자에게 여러 번 표시하고, 여러 번 응답도 허용한다. |
| displaySome | displayLimit에 지정된 횟수만큼만 표시한다. |

#### 4.4.9 화면/UI 요구사항

- 4가지 표시 옵션을 라디오 버튼 또는 드롭다운으로 선택할 수 있다.
- displaySome 선택 시 displayLimit 입력 필드가 동적으로 표시된다.

#### 4.4.10 비기능 요구사항

- 해당 없음.

---

### 4.5 autoComplete 기능

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-008-05 |
| 기능명 | autoComplete 기능 |
| 관련 요구사항 ID | FR-012, AC-012-04 |
| 우선순위 | 필수 |
| 기능 설명 | 설정된 응답 수에 도달하면 설문을 자동으로 completed 상태로 전환한다. |

#### 4.5.2 선행 조건 (Preconditions)

- 설문이 inProgress 상태이다.
- autoComplete 값이 1 이상의 정수로 설정되어 있다 (null이 아님).

#### 4.5.3 후행 조건 (Postconditions)

- 설문의 응답 수가 autoComplete 값에 도달하면 상태가 completed로 변경된다.
- 이후 해당 설문에 대한 새로운 응답 수집이 중단된다.

#### 4.5.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 응답자 | 설문 응답을 제출한다. |
| 2 | 시스템 | 해당 설문의 누적 응답 수를 확인한다. |
| 3 | 시스템 | 누적 응답 수가 autoComplete 값 이상인지 판정한다. |
| 4 | 시스템 | 조건 충족 시 설문 상태를 completed로 전환한다. |

#### 4.5.5 대안 흐름 (Alternative Flow)

- **AF-05: autoComplete 미설정** -- autoComplete가 null이면 자동 완료 기능이 비활성화된다. 설문은 수동 완료만 가능하다.

#### 4.5.6 예외 흐름 (Exception Flow)

- **EF-07: 이미 completed 상태** -- 설문이 이미 completed 상태이면 autoComplete 판정을 수행하지 않는다.

#### 4.5.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-05-01 | autoComplete 최솟값은 1이다. | autoComplete 설정 시 | 0 이하 값 거부 |
| BR-05-02 | autoComplete가 null이면 자동 완료가 비활성화된다. | null 설정 시 | 자동 완료 미수행 |
| BR-05-03 | 응답 수 >= autoComplete 값이면 즉시 completed로 전환한다. | 응답 제출 시 | status = "completed" |

#### 4.5.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| autoComplete | integer (nullable) | 아니오 | null 또는 1 이상 정수 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| autoComplete | integer 또는 null | 자동 완료 응답 수 기준값 |
| status | enum | autoComplete 도달 시 "completed"로 변경 |

#### 4.5.9 화면/UI 요구사항

- autoComplete 설정 입력 필드를 제공한다. 숫자만 입력 가능하다.
- 비활성화 시 필드를 비우거나 토글로 끌 수 있다.

#### 4.5.10 비기능 요구사항

- 해당 없음.

---

### 4.6 Welcome Card 관리

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-008-06 |
| 기능명 | Welcome Card 관리 |
| 관련 요구사항 ID | FR-012, AC-012-07 |
| 우선순위 | 필수 |
| 기능 설명 | 설문 시작 전 표시되는 Welcome Card를 관리한다. 제목, 부제목, 이미지, 비디오 등의 콘텐츠를 포함하며, 다국어를 지원한다. |

#### 4.6.2 선행 조건 (Preconditions)

- 설문이 존재한다.

#### 4.6.3 후행 조건 (Postconditions)

- Welcome Card 설정이 설문에 저장된다.
- 활성화 시 응답자에게 설문 시작 전 Welcome Card가 표시된다.

#### 4.6.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 설문 작성자 | Welcome Card 활성화를 토글한다. |
| 2 | 시스템 | Welcome Card 편집 영역을 표시한다. |
| 3 | 설문 작성자 | 제목(필수), 부제목, 이미지/비디오, 버튼 라벨 등을 입력한다. |
| 4 | 시스템 | 입력값의 유효성을 검증한다. |
| 5 | 시스템 | Welcome Card 설정을 저장한다. |

#### 4.6.5 대안 흐름 (Alternative Flow)

- **AF-06: Welcome Card 비활성화** -- 비활성화 시 응답자에게 Welcome Card가 표시되지 않는다. 설문이 첫 번째 질문 또는 블록부터 시작된다.

#### 4.6.6 예외 흐름 (Exception Flow)

- **EF-08: 활성화 시 제목 미입력** -- Welcome Card가 활성화(enabled: true)되었지만 제목(headline)이 비어 있으면 유효성 검증 오류를 반환한다.

#### 4.6.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-06-01 | Welcome Card 기본값은 비활성화 상태이다. | 설문 생성 시 | enabled: false |
| BR-06-02 | Welcome Card 활성화 시 제목(headline)이 필수이다. | enabled: true | 제목 없으면 유효성 검증 실패 |
| BR-06-03 | 응답 수 표시(showResponseCount)는 link 유형 설문에서만 사용 가능하다. | app 유형 | 무시 또는 경고 |
| BR-06-04 | 다국어 설문의 경우 제목, 부제목, 버튼 라벨의 다국어 완성도를 검증한다. | 발행 시 | 미완성 번역 시 경고 |

#### 4.6.8 데이터 요구사항

**Welcome Card 스키마:**

| 필드명 | 타입 | 필수 | 기본값 | 유효성 검증 |
|--------|------|------|--------|------------|
| enabled | boolean | 예 | false | true/false |
| headline | i18nString (nullable) | 조건부 (enabled=true 시 필수) | - | 다국어 문자열 |
| html | i18nString (nullable) | 아니오 | - | 다국어 문자열 (부제목) |
| fileUrl | string (nullable) | 아니오 | - | 유효한 Storage URL |
| buttonLabel | i18nString (nullable) | 아니오 | - | 다국어 문자열 |
| timeToFinish | boolean | 아니오 | true | true/false |
| showResponseCount | boolean | 아니오 | false | true/false (link 유형만) |
| videoUrl | string (nullable) | 아니오 | - | 유효한 Storage URL |

#### 4.6.9 화면/UI 요구사항

- Welcome Card 활성화/비활성화 토글 스위치를 제공한다.
- 활성화 시 제목, 부제목, 이미지 업로드, 비디오 URL 입력, 버튼 라벨 입력 영역을 표시한다.
- 미리보기에서 Welcome Card 렌더링 결과를 확인할 수 있다.

#### 4.6.10 비기능 요구사항

- 해당 없음.

---

### 4.7 Ending (종료 카드) 관리

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-008-07 |
| 기능명 | Ending (종료 카드) 관리 |
| 관련 요구사항 ID | FR-012 |
| 우선순위 | 필수 |
| 기능 설명 | 설문 완료 후 표시되는 종료 카드를 관리한다. End Screen 또는 Redirect to URL 2가지 유형을 지원하며, 하나의 설문에 여러 개의 종료 카드를 설정할 수 있다. |

#### 4.7.2 선행 조건 (Preconditions)

- 설문이 존재한다.

#### 4.7.3 후행 조건 (Postconditions)

- 종료 카드가 설문의 endings 배열에 추가/수정/삭제된다.
- 각 종료 카드에 고유 CUID2 ID가 할당된다.

#### 4.7.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 설문 작성자 | 종료 카드 추가를 요청한다. |
| 2 | 시스템 | 종료 카드 유형 선택 화면을 표시한다 (End Screen / Redirect to URL). |
| 3 | 설문 작성자 | 유형을 선택하고 내용을 입력한다. |
| 4 | 시스템 | CUID2 ID를 생성하고, Ending ID 고유성을 검증한다. |
| 5 | 시스템 | 종료 카드를 endings 배열에 추가하고 저장한다. |

#### 4.7.5 대안 흐름 (Alternative Flow)

- **AF-07: 여러 종료 카드 설정** -- 조건부 로직(FSD-012)과 연계하여 응답 결과에 따라 다른 종료 카드로 분기할 수 있다.

#### 4.7.6 예외 흐름 (Exception Flow)

- **EF-09: Ending ID 중복** -- 동일한 ID를 가진 종료 카드가 이미 존재하면 오류를 반환한다.
- **EF-10: Redirect URL 미입력** -- redirectToUrl 유형에서 URL이 비어 있으면 유효성 검증 오류를 반환한다.

#### 4.7.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-07-01 | 각 ending은 고유 CUID2 ID를 가진다. | ending 생성 시 | ID 자동 생성 |
| BR-07-02 | Ending ID는 설문 내에서 고유해야 한다. | 설문 저장 시 | 중복 시 오류 |
| BR-07-03 | endScreen 유형은 제목, 부제목, 버튼 라벨/링크, 이미지/비디오를 포함할 수 있다. | endScreen 편집 시 | 해당 필드 표시 |
| BR-07-04 | redirectToUrl 유형은 리다이렉트 URL과 라벨을 포함한다. | redirectToUrl 편집 시 | 해당 필드 표시 |
| BR-07-05 | 다국어 설문의 경우 End Screen의 제목, 부제목, 버튼 라벨 다국어 완성도를 검증한다. | 발행 시 | 미완성 번역 시 경고 |

#### 4.7.8 데이터 요구사항

**End Screen 스키마:**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| id | CUID2 (string) | 자동 | 설문 내 고유 |
| type | "endScreen" | 예 | 고정값 |
| headline | i18nString (nullable) | 아니오 | 다국어 문자열 |
| subheader | i18nString (nullable) | 아니오 | 다국어 문자열 |
| buttonLabel | i18nString (nullable) | 아니오 | 다국어 문자열 |
| buttonLink | string (nullable) | 아니오 | 유효한 URL |
| imageUrl | string (nullable) | 아니오 | 유효한 Storage URL |
| videoUrl | string (nullable) | 아니오 | 유효한 Storage URL |

**Redirect to URL 스키마:**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| id | CUID2 (string) | 자동 | 설문 내 고유 |
| type | "redirectToUrl" | 예 | 고정값 |
| url | string | 예 | 유효한 URL |
| label | string (nullable) | 아니오 | - |

#### 4.7.9 화면/UI 요구사항

- 종료 카드 추가/삭제/순서 변경 UI를 제공한다.
- End Screen: 제목, 부제목, CTA 버튼, 이미지/비디오 편집 영역.
- Redirect to URL: URL 입력 필드 및 라벨 입력 필드.

#### 4.7.10 비기능 요구사항

- 해당 없음.

---

### 4.8 Hidden Fields 관리

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-008-08 |
| 기능명 | Hidden Fields 관리 |
| 관련 요구사항 ID | FR-012, AC-012-09 |
| 우선순위 | 필수 |
| 기능 설명 | 응답자에게 보이지 않는 Hidden Fields를 관리한다. URL 파라미터 등을 통해 값을 전달받아 응답 데이터에 포함시킨다. |

#### 4.8.2 선행 조건 (Preconditions)

- 설문이 존재한다.

#### 4.8.3 후행 조건 (Postconditions)

- Hidden Fields 설정이 설문에 저장된다.
- 응답 수집 시 Hidden Fields 값이 응답 데이터에 포함된다.

#### 4.8.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 설문 작성자 | Hidden Fields를 활성화한다. |
| 2 | 시스템 | Hidden Fields 편집 영역을 표시한다. |
| 3 | 설문 작성자 | 필드 ID를 입력하여 Hidden Field를 추가한다. |
| 4 | 시스템 | 필드 ID의 유효성을 검증한다 (금지 ID, 형식 검사). |
| 5 | 시스템 | Hidden Fields 설정을 저장한다. |

#### 4.8.5 대안 흐름 (Alternative Flow)

- **AF-08: Hidden Fields 비활성화** -- 비활성화 시 모든 Hidden Field가 무시되고 응답 데이터에 포함되지 않는다.

#### 4.8.6 예외 흐름 (Exception Flow)

- **EF-11: 금지된 ID 사용** -- 금지 목록에 포함된 ID를 입력하면 유효성 검증 오류를 반환한다.
- **EF-12: 잘못된 형식의 ID** -- 공백이 포함되거나, 영문/숫자/하이픈/언더스코어 이외의 문자가 포함된 ID는 거부한다.

#### 4.8.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-08-01 | Hidden Fields 기본값은 비활성화 상태이다. | 설문 생성 시 | enabled: false |
| BR-08-02 | 금지된 ID는 사용할 수 없다. | 필드 ID 입력 시 | 금지 ID 입력 거부 |
| BR-08-03 | 필드 ID에 공백을 포함할 수 없다. | 필드 ID 입력 시 | 공백 포함 시 거부 |
| BR-08-04 | 필드 ID는 영문, 숫자, 하이픈, 언더스코어만 허용한다. | 필드 ID 입력 시 | 패턴: `^[a-zA-Z0-9\-_]+$` |

**금지된 ID 목록:**

`userId`, `source`, `suid`, `end`, `start`, `welcomeCard`, `hidden`, `verifiedEmail`, `multiLanguage`, `embed`

#### 4.8.8 데이터 요구사항

**Hidden Fields 스키마:**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| enabled | boolean | 예 | true/false |
| fieldIds | string[] (nullable) | 아니오 | 각 ID: `^[a-zA-Z0-9\-_]+$`, 금지 ID 제외 |

#### 4.8.9 화면/UI 요구사항

- Hidden Fields 활성화/비활성화 토글을 제공한다.
- 활성화 시 필드 ID 목록을 추가/삭제할 수 있는 편집 UI를 표시한다.
- 금지된 ID 입력 시 즉시 오류 메시지를 표시한다.

#### 4.8.10 비기능 요구사항

- 해당 없음.

---

### 4.9 Survey Variables 관리

#### 4.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-008-09 |
| 기능명 | Survey Variables 관리 |
| 관련 요구사항 ID | FR-012, AC-012-10 |
| 우선순위 | 필수 |
| 기능 설명 | 설문 내에서 사용하는 변수를 정의하고 관리한다. number와 text 2가지 유형을 지원하며, 변수는 조건부 로직이나 Recall에서 참조할 수 있다. |

#### 4.9.2 선행 조건 (Preconditions)

- 설문이 존재한다.

#### 4.9.3 후행 조건 (Postconditions)

- 변수가 설문의 variables 배열에 추가/수정/삭제된다.
- 변수의 ID와 name이 설문 내에서 고유하게 유지된다.

#### 4.9.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 설문 작성자 | 새 변수 추가를 요청한다. |
| 2 | 시스템 | 변수 유형 선택 화면을 표시한다 (number / text). |
| 3 | 설문 작성자 | 유형을 선택하고, 변수 이름과 초기값을 입력한다. |
| 4 | 시스템 | 변수 이름의 유효성을 검증한다 (패턴, 고유성). |
| 5 | 시스템 | 변수 ID를 자동 생성하고 고유성을 검증한다. |
| 6 | 시스템 | 변수를 variables 배열에 추가하고 저장한다. |

#### 4.9.5 대안 흐름 (Alternative Flow)

- **AF-09: 변수 수정** -- 기존 변수의 이름 또는 값을 수정한다. 이름 변경 시 고유성을 재검증한다.
- **AF-10: 변수 삭제** -- 변수를 삭제한다. 해당 변수를 참조하는 로직이 있으면 참조를 정리해야 함을 사용자에게 알린다.

#### 4.9.6 예외 흐름 (Exception Flow)

- **EF-13: 변수 이름 중복** -- 동일 이름의 변수가 이미 존재하면 오류를 반환한다.
- **EF-14: 변수 이름 형식 오류** -- 소문자, 숫자, 언더스코어 이외의 문자가 포함된 이름은 거부한다.
- **EF-15: 변수 ID 중복** -- 동일 ID의 변수가 이미 존재하면 오류를 반환한다.

#### 4.9.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-09-01 | 변수 유형은 number와 text 2가지만 허용한다. | 변수 생성 시 | 그 외 유형 거부 |
| BR-09-02 | number 유형의 기본값은 0이다. | number 변수 생성 시 | value = 0 |
| BR-09-03 | text 유형의 기본값은 빈 문자열("")이다. | text 변수 생성 시 | value = "" |
| BR-09-04 | 변수 이름은 소문자, 숫자, 언더스코어만 허용한다. | 이름 입력 시 | 패턴: `^[a-z0-9_]+$` |
| BR-09-05 | 변수 ID와 name 모두 설문 내에서 고유해야 한다. | 변수 저장 시 | 중복 시 오류 |

#### 4.9.8 데이터 요구사항

**Number Variable 스키마:**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| id | string | 자동 | 설문 내 고유 |
| name | string | 예 | `^[a-z0-9_]+$`, 설문 내 고유 |
| type | "number" | 예 | 고정값 |
| value | number | 아니오 | 기본값: 0 |

**Text Variable 스키마:**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| id | string | 자동 | 설문 내 고유 |
| name | string | 예 | `^[a-z0-9_]+$`, 설문 내 고유 |
| type | "text" | 예 | 고정값 |
| value | string | 아니오 | 기본값: "" |

#### 4.9.9 화면/UI 요구사항

- 변수 목록을 표시하고 추가/수정/삭제 UI를 제공한다.
- 변수 이름 입력 시 허용 패턴을 실시간으로 검증하여 피드백한다.

#### 4.9.10 비기능 요구사항

- 해당 없음.

---

### 4.10 Draft 자동 저장

#### 4.10.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-008-10 |
| 기능명 | Draft 자동 저장 |
| 관련 요구사항 ID | FR-047, AC-012-01, AC-012-02, AC-012-03 |
| 우선순위 | 필수 |
| 기능 설명 | draft 상태의 설문을 10초 간격으로 자동 저장한다. 변경 감지, 탭 활성화 확인, 중복 저장 방지 로직을 포함한다. |

#### 4.10.2 선행 조건 (Preconditions)

- 설문이 draft 상태이다.
- 설문 편집기가 열려 있다.
- 브라우저 탭이 활성화 상태이다.

#### 4.10.3 후행 조건 (Postconditions)

- 변경된 설문 데이터가 서버에 저장된다.
- AutoSave Indicator에 저장 상태가 표시된다.

#### 4.10.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | 10초 타이머를 시작한다. |
| 2 | 시스템 | 타이머 만료 시 자동 저장 조건을 확인한다. |
| 3 | 시스템 | 조건 1: 설문 상태가 draft인지 확인한다. |
| 4 | 시스템 | 조건 2: 브라우저 탭이 활성(visible) 상태인지 확인한다. |
| 5 | 시스템 | 조건 3: 변경 사항이 있는지 확인한다 (updatedAt 필드 제외 비교). |
| 6 | 시스템 | 조건 4: 자동 저장 중 플래그 또는 수동 저장 중 플래그가 false인지 확인한다. |
| 7 | 시스템 | 모든 조건 충족 시 자동 저장 중 플래그를 true로 설정한다. |
| 8 | 시스템 | 설문 데이터를 서버에 저장한다. |
| 9 | 시스템 | 저장 완료 후 자동 저장 중 플래그를 false로 해제한다. |
| 10 | 시스템 | AutoSave Indicator에 "Progress saved"를 3초간 표시한다. |
| 11 | 시스템 | 1단계로 돌아가 타이머를 재시작한다. |

#### 4.10.5 대안 흐름 (Alternative Flow)

- **AF-11: 변경 사항 없음** -- 5단계에서 변경 사항이 없으면 저장을 스킵하고 타이머만 재시작한다.
- **AF-12: 탭 비활성 상태** -- 4단계에서 탭이 비활성이면 저장을 스킵하고 타이머만 재시작한다.
- **AF-13: 다른 저장 진행 중** -- 6단계에서 다른 저장이 진행 중이면 저장을 스킵하고 타이머만 재시작한다.
- **AF-14: 발행 후 비활성화** -- 설문이 draft에서 inProgress로 전환되면 자동 저장 타이머를 중지한다.

#### 4.10.6 예외 흐름 (Exception Flow)

- **EF-16: 네트워크 오류** -- 자동 저장 중 네트워크 오류 발생 시, 자동 저장 중 플래그를 해제하고 다음 주기에 재시도한다.

#### 4.10.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-10-01 | 자동 저장 간격은 10,000ms(10초)이다. | draft 상태 | 10초마다 저장 시도 |
| BR-10-02 | draft 상태에서만 자동 저장이 활성화된다. | 비-draft 상태 | 자동 저장 비활성화 |
| BR-10-03 | 탭이 비활성(hidden) 상태이면 저장을 스킵한다. | 탭 비활성 시 | 저장 스킵 |
| BR-10-04 | 변경 감지 시 updatedAt 필드는 비교에서 제외한다. | 변경 비교 시 | updatedAt 무시 |
| BR-10-05 | 자동 저장 중 플래그와 수동 저장 중 플래그로 동시 저장을 차단한다. | 저장 시도 시 | 다른 저장 진행 중이면 스킵 |
| BR-10-06 | 불필요한 리렌더링 방지를 위해 Ref 기반으로 구현한다. | 구현 시 | React Ref 사용 |

#### 4.10.8 데이터 요구사항

**입력 데이터:**

- 현재 편집 중인 설문의 전체 데이터

**출력 데이터:**

- 저장 성공/실패 여부
- 저장된 설문의 updatedAt 값

#### 4.10.9 화면/UI 요구사항

**AutoSave Indicator:**

| 상태 | 표시 텍스트 | 동작 |
|------|-----------|------|
| draft 상태 (대기 중) | "Auto save on" | 상시 표시 |
| draft 상태 (저장 완료 직후) | "Progress saved" | 3초간 표시 후 "Auto save on"으로 복귀 |
| 비-draft 상태 | "Auto save disabled" | 상시 표시 |

#### 4.10.10 비기능 요구사항

| 항목 | 요구사항 |
|------|----------|
| 저장 주기 | 10,000ms (10초) |
| 저장 조건 | 탭 활성 AND 변경 존재 AND 다른 저장 미진행 AND draft 상태 |
| 렌더링 최적화 | Ref 기반 구현으로 불필요한 리렌더링 방지 |

---

### 4.11 템플릿 기반 설문 생성

#### 4.11.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-008-11 |
| 기능명 | 템플릿 기반 설문 생성 |
| 관련 요구사항 ID | FR-011, AC-047-01, AC-047-02 |
| 우선순위 | 필수 |
| 기능 설명 | 미리 구성된 템플릿을 선택하여 설문을 생성한다. 템플릿은 역할, 채널, 산업별로 필터링할 수 있으며, 프리셋 데이터를 적용하여 설문의 초기 구성을 자동화한다. |

#### 4.11.2 선행 조건 (Preconditions)

- 사용자가 설문 생성 권한이 있는 Environment에 접근한 상태이다.
- 템플릿 스토어에 1개 이상의 템플릿이 존재한다.

#### 4.11.3 후행 조건 (Postconditions)

- 템플릿의 프리셋 데이터(Welcome Card, Block 목록, 종료 카드, Hidden Fields)가 적용된 새 설문이 draft 상태로 생성된다.
- 생성된 설문은 이후 자유롭게 편집할 수 있다.

#### 4.11.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 설문 작성자 | "새 설문 생성" 화면에서 "템플릿에서 시작"을 선택한다. |
| 2 | 시스템 | 템플릿 목록을 표시한다. |
| 3 | 설문 작성자 | 역할, 채널, 산업 필터를 적용한다 (선택사항). |
| 4 | 시스템 | 필터 조건에 맞는 템플릿 목록을 표시한다. |
| 5 | 설문 작성자 | 원하는 템플릿을 선택한다. |
| 6 | 시스템 | 템플릿의 프리셋 데이터를 적용하여 새 설문을 생성한다. |
| 7 | 시스템 | 설문을 draft 상태로 초기화한다. |
| 8 | 시스템 | 설문 편집기로 이동한다. |

#### 4.11.5 대안 흐름 (Alternative Flow)

- **AF-15: XM Template (CX 모드) 사용** -- CX 모드 전용 템플릿을 선택하면, 이름/Block 목록/종료 카드/스타일링으로 구성된 프리셋이 적용된다.
- **AF-16: Scratch에서 생성** -- 템플릿 없이 빈 설문을 생성한다. 기본값만 적용된 상태에서 시작한다.

#### 4.11.6 예외 흐름 (Exception Flow)

- **EF-17: 템플릿 로드 실패** -- 템플릿 데이터를 로드할 수 없는 경우 오류 메시지를 표시하고 빈 설문 생성을 대안으로 제안한다.

#### 4.11.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-11-01 | 템플릿의 프리셋 데이터는 Welcome Card, Block 목록, 종료 카드, Hidden Fields를 포함한다. | 템플릿 기반 생성 시 | 해당 필드 자동 채움 |
| BR-11-02 | 템플릿은 역할(role)로 필터링할 수 있다. | 필터 적용 시 | 5가지 역할 필터: productManager, customerSuccess, marketing, sales, peopleManager |
| BR-11-03 | 템플릿은 채널(channels)로 필터링할 수 있다. | 필터 적용 시 | 3가지 채널 필터: link, app, website |
| BR-11-04 | 템플릿은 산업(industries)으로 필터링할 수 있다. | 필터 적용 시 | 3가지 산업 필터: eCommerce, saas, other |

#### 4.11.8 데이터 요구사항

**Template 스키마:**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| name | string | 예 | 빈 문자열 불가 |
| description | string | 예 | 빈 문자열 불가 |
| icon | any (nullable) | 아니오 | - |
| role | enum("productManager", "customerSuccess", "marketing", "sales", "peopleManager") (nullable) | 아니오 | 허용값 5가지 또는 null |
| channels | array of enum("link", "app", "website") (nullable) | 아니오 | 허용값 3가지의 배열 |
| industries | array of enum("eCommerce", "saas", "other") (nullable) | 아니오 | 허용값 3가지의 배열 |
| preset | object | 예 | Welcome Card, Block 목록, 종료 카드, Hidden Fields 포함 |

**XM Template 스키마:**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| name | string | 예 | 빈 문자열 불가 |
| blocks | array | 예 | Block 스키마 배열 |
| endings | array | 예 | Ending 스키마 배열 |
| styling | object (nullable) | 아니오 | 스타일링 스키마 |

#### 4.11.9 화면/UI 요구사항

- 템플릿 갤러리 형태로 카드 목록을 표시한다. 각 카드에 이름, 설명, 아이콘을 포함한다.
- 역할/채널/산업 필터 UI를 상단에 제공한다.
- 템플릿 선택 시 미리보기를 제공한다.

#### 4.11.10 비기능 요구사항

- 해당 없음.

---

### 4.12 발행 시 유효성 검증

#### 4.12.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-008-12 |
| 기능명 | 발행 시 유효성 검증 |
| 관련 요구사항 ID | FR-012, AC-012-05 ~ AC-012-10 |
| 우선순위 | 필수 |
| 기능 설명 | 설문을 draft -> inProgress로 전환(발행)하기 전 수행하는 유효성 검증 로직이다. 스키마 기반 검증과 커스텀 비즈니스 규칙 검증을 모두 포함한다. |

#### 4.12.2 선행 조건 (Preconditions)

- 설문이 draft 상태이다.
- 발행 요청이 접수되었다.

#### 4.12.3 후행 조건 (Postconditions)

- 모든 검증 통과 시 설문 상태가 inProgress로 전환된다.
- 검증 실패 시 구체적 오류 목록이 반환되고 상태는 draft로 유지된다.

#### 4.12.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | questions/blocks 상호 배타성을 검증한다. |
| 2 | 시스템 | ID 고유성을 검증한다 (Question ID, Block ID, Ending ID, Variable ID, Variable name). |
| 3 | 시스템 | Welcome Card 유효성을 검증한다 (활성화 시 제목 필수). |
| 4 | 시스템 | 다국어 완성도를 검증한다 (Welcome Card, Question, Ending Card). |
| 5 | 시스템 | 순환 로직을 검증한다 (질문 간 순환 참조 감지). |
| 6 | 시스템 | Hidden Fields 유효성을 검증한다 (금지 ID, 형식). |
| 7 | 시스템 | Variable 유효성을 검증한다 (이름 패턴, 고유성). |
| 8 | 시스템 | PIN 유효성을 검증한다 (설정 시 정확히 4자리). |
| 9 | 시스템 | autoComplete 유효성을 검증한다 (설정 시 1 이상). |
| 10 | 시스템 | 표시 확률 유효성을 검증한다 (설정 시 0.01 ~ 100). |
| 11 | 시스템 | reCAPTCHA 유효성을 검증한다 (설정 시 threshold 0.1 ~ 0.9). |
| 12 | 시스템 | Slug 유효성을 검증한다 (설정 시 소문자/숫자/하이픈 패턴). |
| 13 | 시스템 | 모든 검증 통과 시 상태를 inProgress로 변경한다. |

#### 4.12.5 대안 흐름 (Alternative Flow)

- 해당 없음. 모든 검증은 순차적으로 수행되며, 일부 검증 실패 시에도 나머지 검증을 계속 수행하여 전체 오류 목록을 반환할 수 있다.

#### 4.12.6 예외 흐름 (Exception Flow)

- **EF-18: 1개 이상 검증 실패** -- 검증 실패 항목 목록을 사용자에게 반환한다. 설문 상태는 draft로 유지된다.

#### 4.12.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 검증 내용 | 실패 시 메시지 (예시) |
|---------|------|----------|---------------------|
| BR-12-01 | questions/blocks 상호 배타성 | questions 또는 blocks 중 하나만 존재 | "설문은 questions 또는 blocks 중 하나만 가져야 합니다" |
| BR-12-02 | Question ID 고유성 | 설문 내 모든 Question ID가 고유 | "중복된 Question ID가 있습니다: {id}" |
| BR-12-03 | Block ID 고유성 | 설문 내 모든 Block ID가 고유 | "중복된 Block ID가 있습니다: {id}" |
| BR-12-04 | Ending ID 고유성 | 설문 내 모든 Ending ID가 고유 | "중복된 Ending ID가 있습니다: {id}" |
| BR-12-05 | Variable ID 고유성 | 설문 내 모든 Variable ID가 고유 | "중복된 Variable ID가 있습니다: {id}" |
| BR-12-06 | Variable name 고유성 | 설문 내 모든 Variable name이 고유 | "중복된 Variable 이름이 있습니다: {name}" |
| BR-12-07 | Welcome Card 제목 필수 | 활성화 시 headline 존재 | "Welcome Card가 활성화되었으나 제목이 없습니다" |
| BR-12-08 | 다국어 완성도 | 각 다국어 필드의 번역 완성 | "다국어 번역이 완료되지 않은 필드가 있습니다" |
| BR-12-09 | 순환 로직 금지 | 질문 간 순환 참조 없음 | "질문 간 순환 로직이 감지되었습니다" |
| BR-12-10 | PIN 형식 | 정확히 4자리 문자열 | "PIN은 정확히 4자리여야 합니다" |
| BR-12-11 | autoComplete 범위 | 1 이상 정수 | "자동 완료 응답 수는 1 이상이어야 합니다" |
| BR-12-12 | 표시 확률 범위 | 0.01 ~ 100 | "표시 확률은 0.01에서 100 사이여야 합니다" |
| BR-12-13 | reCAPTCHA threshold 범위 | 0.1 ~ 0.9, 0.1 단위 | "reCAPTCHA threshold는 0.1에서 0.9 사이(0.1 단위)여야 합니다" |
| BR-12-14 | Slug 형식 | 소문자, 숫자, 하이픈만 허용 | "Slug는 소문자, 숫자, 하이픈만 허용됩니다" |
| BR-12-15 | Hidden Field ID 금지 목록 | 금지 ID 사용 불가 | "금지된 Hidden Field ID입니다: {id}" |
| BR-12-16 | Hidden Field ID 형식 | 영문, 숫자, 하이픈, 언더스코어만 허용 | "Hidden Field ID 형식이 올바르지 않습니다" |
| BR-12-17 | Variable name 형식 | 소문자, 숫자, 언더스코어만 허용 | "Variable 이름은 소문자, 숫자, 언더스코어만 허용됩니다" |

#### 4.12.8 데이터 요구사항

**입력 데이터:**

- 발행 대상 설문의 전체 데이터

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| isValid | boolean | 전체 검증 통과 여부 |
| errors | array of { ruleId, message, field } | 검증 실패 항목 목록 (실패 시) |

#### 4.12.9 화면/UI 요구사항

- 발행 버튼 클릭 시 검증을 수행하고, 실패 시 오류 목록을 모달 또는 알림으로 표시한다.
- 오류 항목 클릭 시 해당 필드로 스크롤/포커스를 이동한다.

#### 4.12.10 비기능 요구사항

- 스키마 기반 검증과 커스텀 검증을 병행하여 데이터 무결성을 보장한다.

---

### 4.13 추가 설정 필드 관리

#### 4.13.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-008-13 |
| 기능명 | 추가 설정 필드 관리 |
| 관련 요구사항 ID | FR-012 |
| 우선순위 | 보통 |
| 기능 설명 | 설문의 부가 설정 필드들(딜레이, 재접촉 일수, PIN, reCAPTCHA, Single Use, Metadata, Slug 등)을 관리한다. |

#### 4.13.2 선행 조건 (Preconditions)

- 설문이 존재한다.

#### 4.13.3 후행 조건 (Postconditions)

- 각 설정 필드의 값이 설문에 저장된다.

#### 4.13.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 설문 작성자 | 설문 설정 섹션에서 원하는 설정을 변경한다. |
| 2 | 시스템 | 입력값의 유효성을 검증한다. |
| 3 | 시스템 | 설정을 저장한다. |

#### 4.13.5 대안 흐름 (Alternative Flow)

- 해당 없음.

#### 4.13.6 예외 흐름 (Exception Flow)

- **EF-19: PIN 길이 오류** -- PIN이 4자리가 아닌 경우 오류를 반환한다.
- **EF-20: reCAPTCHA threshold 범위 오류** -- 0.1~0.9 범위를 벗어나면 오류를 반환한다.
- **EF-21: Slug 형식 오류** -- 소문자/숫자/하이픈 이외의 문자가 포함되면 오류를 반환한다.

#### 4.13.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-13-01 | 딜레이 기본값은 0초이다. | 미설정 시 | delay = 0 |
| BR-13-02 | 재접촉 일수는 프로젝트 설정을 오버라이드한다. | 설정 시 | 프로젝트 값 대신 설문 개별 값 사용 |
| BR-13-03 | PIN은 정확히 4자리 문자열이어야 한다. | PIN 설정 시 | 4자리 아닌 값 거부 |
| BR-13-04 | reCAPTCHA threshold는 0.1~0.9 범위, 0.1 단위이다. | reCAPTCHA 설정 시 | 범위/단위 위반 시 거부 |
| BR-13-05 | Single Use 기본값은 비활성화, 암호화는 활성화이다. | 설문 생성 시 | enabled: false, isEncrypted: true |
| BR-13-06 | Slug는 소문자, 숫자, 하이픈만 허용한다. | Slug 설정 시 | 패턴: `^[a-z0-9\-]+$` |

#### 4.13.8 데이터 요구사항

**설정 필드 상세:**

| 필드명 | 타입 | 기본값 | 유효성 검증 |
|--------|------|--------|------------|
| delay | integer | 0 | 0 이상 정수 (초 단위) |
| recontactDays | integer (nullable) | null | null 또는 0 이상 정수 |
| pin | string (nullable) | null | null 또는 정확히 4자리 (`^\d{4}$`) |
| displayPercentage | number (nullable) | null | null 또는 0.01 ~ 100 |
| isVerifyEmailEnabled | boolean | false | true/false |
| isSingleResponsePerEmailEnabled | boolean | false | true/false |
| isBackButtonHidden | boolean | false | true/false |
| isIpCollectionEnabled | boolean | false | true/false |
| showLanguageSwitch | boolean (nullable) | null | true/false/null |

**reCAPTCHA 스키마:**

| 필드명 | 타입 | 유효성 검증 |
|--------|------|------------|
| enabled | boolean | true/false |
| threshold | number | 0.1 ~ 0.9 (0.1 단위). 허용값: 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9 |

**Single Use 스키마:**

| 필드명 | 타입 | 기본값 | 유효성 검증 |
|--------|------|--------|------------|
| enabled | boolean | false | true/false |
| heading | string (nullable) | - | 일회용 링크 만료 시 표시 제목 |
| subheading | string (nullable) | - | 일회용 링크 만료 시 표시 부제목 |
| isEncrypted | boolean | true | 응답 ID 암호화 여부 |

**Survey Metadata 스키마 (link 유형):**

| 필드명 | 타입 | 유효성 검증 |
|--------|------|------------|
| title | i18nString (nullable) | 다국어 문자열 |
| description | i18nString (nullable) | 다국어 문자열 |
| ogImageUrl | string (nullable) | 유효한 URL |

#### 4.13.9 화면/UI 요구사항

- 설문 설정 패널에서 각 설정을 섹션별로 그룹화하여 표시한다.
- PIN, reCAPTCHA 등 보안 관련 설정은 별도 섹션으로 분리한다.
- Metadata 설정은 link 유형 설문에서만 표시한다.

#### 4.13.10 비기능 요구사항

- 해당 없음.

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

| 엔티티 | 설명 | 주요 식별자 |
|--------|------|------------|
| Survey | 설문 데이터의 최상위 엔티티 | id (CUID2) |
| WelcomeCard | 설문 시작 전 환영 화면 설정 | Survey에 내장 (1:1) |
| Ending | 설문 종료 후 화면/리다이렉트 설정 | id (CUID2) |
| HiddenFields | 숨겨진 필드 설정 | Survey에 내장 (1:1) |
| Variable | 설문 내 변수 | id (string) |
| Block | 질문 블록 | id (string) |
| Template | 설문 생성을 위한 프리셋 | name (string) |
| Environment | 설문이 속한 실행 환경 | id (string) |

### 5.2 엔티티 간 관계

```
Environment (1) ──── (N) Survey
                           |
                           ├── (1) WelcomeCard
                           ├── (N) Block
                           ├── (N) Ending
                           ├── (1) HiddenFields
                           ├── (N) Variable
                           └── (N) Trigger (ActionClass)

Template ─── (preset) ──> Survey 초기 데이터
```

- **Environment : Survey** -- 1:N 관계. 하나의 Environment에 여러 설문이 속한다. Environment 삭제 시 Cascade 삭제.
- **Survey : WelcomeCard** -- 1:1 관계 (내장 객체).
- **Survey : Block** -- 1:N 관계. 하나의 설문에 여러 블록이 포함된다.
- **Survey : Ending** -- 1:N 관계. 하나의 설문에 여러 종료 카드가 포함된다.
- **Survey : HiddenFields** -- 1:1 관계 (내장 객체).
- **Survey : Variable** -- 1:N 관계. 하나의 설문에 여러 변수가 포함된다.

### 5.3 데이터 흐름

```
1. 설문 생성
   Template (선택적) --> 설문 초기 데이터 --> Survey 레코드 생성 (DB)

2. 설문 편집 (Draft)
   사용자 편집 --> 자동 저장 (10초) --> Survey 레코드 갱신 (DB)

3. 설문 발행
   발행 요청 --> 유효성 검증 --> 상태 전이 (draft -> inProgress)

4. 설문 운영
   응답 수집 --> autoComplete 판정 --> 상태 전이 (inProgress -> completed)
```

---

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 연동 대상 | 연동 방식 | 설명 |
|----------|----------|------|
| JS SDK | SDK API | app 유형 설문을 웹 앱 내에서 표시 |
| 이메일/SNS | URL 공유 | link 유형 설문의 URL 공유 |
| reCAPTCHA | Google reCAPTCHA API | 스팸 방지 검증 (FSD-020에서 상세) |

### 6.2 API 명세

**Survey CRUD API (개요):**

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| /surveys | POST | 설문 생성 |
| /surveys/{id} | GET | 설문 조회 |
| /surveys/{id} | PUT | 설문 수정 (자동 저장 포함) |
| /surveys/{id} | DELETE | 설문 삭제 |
| /surveys/{id}/publish | POST | 설문 발행 (draft -> inProgress) |
| /surveys/{id}/pause | POST | 설문 일시정지 (inProgress -> paused) |
| /surveys/{id}/resume | POST | 설문 재개 (paused -> inProgress) |
| /surveys/{id}/complete | POST | 설문 완료 (inProgress -> completed) |

> 참고: API 상세 명세(요청/응답 스키마, 인증 등)는 FSD-024 (REST API) 문서를 참조한다.

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| 항목 | 요구사항 |
|------|----------|
| 자동 저장 주기 | 10,000ms (10초) 간격으로 draft 설문을 자동 저장한다 |
| 자동 저장 조건 | 탭 활성 AND 변경 존재 AND 다른 저장 미진행 AND draft 상태 |
| 클라이언트 렌더링 | Ref 기반 구현으로 자동 저장 시 불필요한 리렌더링을 방지한다 |
| DB 인덱싱 | Survey는 Environment ID 기반으로 인덱싱하여 조회 성능을 최적화한다 |

### 7.2 보안 요구사항

| 항목 | 요구사항 |
|------|----------|
| PIN 접근 제한 | 4자리 PIN 코드를 설정하여 설문 접근을 제한할 수 있다 |
| reCAPTCHA | Google reCAPTCHA를 통해 봇/스팸 응답을 차단할 수 있다 |
| Single Use 암호화 | 일회용 링크의 응답 ID를 암호화하여 보안을 강화한다 |
| 이메일 인증 | 이메일 검증을 활성화하여 인증된 사용자만 응답할 수 있도록 한다 |

### 7.3 가용성 요구사항

| 항목 | 요구사항 |
|------|----------|
| Cascade 삭제 | Environment 삭제 시 해당 Environment의 모든 Survey를 Cascade 삭제하여 데이터 정합성을 유지한다 |
| 데이터 무결성 | 스키마 기반 검증 + 커스텀 비즈니스 규칙 검증으로 발행 전 엄격한 데이터 무결성을 보장한다 |

---

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| 제약 | 설명 |
|------|------|
| 설문 유형 | link, app 2가지만 지원. email 유형은 존재하지 않음 |
| 설문 상태 | draft, inProgress, paused, completed 4가지만 지원 |
| questions/blocks 상호 배타성 | 하나의 설문에 questions와 blocks를 동시에 가질 수 없음 |
| questions 필드 deprecated | Block으로 대체 중이므로 신규 개발은 blocks 사용 |
| 자동 저장 간격 | 10초 고정. 사용자 설정 불가 |
| PIN 형식 | 정확히 4자리. 길이 변경 불가 |
| Slug 형식 | 소문자, 숫자, 하이픈만 허용 |

### 8.2 비즈니스 제약사항

| 제약 | 설명 |
|------|------|
| autoComplete 최솟값 | 1 이상. 0 설정 불가 |
| 표시 확률 범위 | 0.01 ~ 100 |
| reCAPTCHA threshold | 0.1 ~ 0.9, 0.1 단위 |
| 금지된 Hidden Field ID | 10개의 예약어 사용 불가 |
| Variable name 패턴 | 소문자, 숫자, 언더스코어만 허용 |

### 8.3 가정사항

| 가정 | 설명 |
|------|------|
| Environment 존재 | 설문 생성 시 유효한 Environment가 이미 존재한다고 가정 |
| 브라우저 Page Visibility API | 자동 저장의 탭 활성화 감지는 브라우저의 Page Visibility API를 사용할 수 있다고 가정 |
| CUID2 충돌 없음 | CUID2로 생성된 ID는 실질적으로 충돌하지 않는다고 가정 |
| 템플릿 사전 등록 | 템플릿은 시스템에 사전 등록되어 있다고 가정 (런타임 등록 아님) |

---

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 요구사항명 | 기능 ID | 기능명 | 수용 기준 |
|------------|----------|---------|--------|----------|
| FR-011 | 설문 유형 | FN-008-01 | 설문 유형 관리 | AC-011-01 |
| FR-011 | 설문 상태 | FN-008-02 | 설문 상태 관리 | AC-011-02, AC-011-03 |
| FR-011 | 템플릿 기반 생성 | FN-008-11 | 템플릿 기반 설문 생성 | AC-047-01, AC-047-02 |
| FR-012 | 설문 데이터 모델 | FN-008-03 | 설문 데이터 모델 관리 | AC-012-01 ~ AC-012-10 |
| FR-012 | 표시 옵션 | FN-008-04 | 설문 표시 옵션 관리 | AC-012-06 |
| FR-012 | autoComplete | FN-008-05 | autoComplete 기능 | AC-012-04 |
| FR-012 | Welcome Card | FN-008-06 | Welcome Card 관리 | AC-012-07 |
| FR-012 | Endings | FN-008-07 | Ending 관리 | AC-012-08 |
| FR-012 | Hidden Fields | FN-008-08 | Hidden Fields 관리 | AC-012-09 |
| FR-012 | Variables | FN-008-09 | Survey Variables 관리 | AC-012-10 |
| FR-012 | 유효성 검증 | FN-008-12 | 발행 시 유효성 검증 | AC-012-05 ~ AC-012-10 |
| FR-012 | 추가 설정 | FN-008-13 | 추가 설정 필드 관리 | AC-012-05, AC-012-06 |
| FR-047 | Draft 자동 저장 | FN-008-10 | Draft 자동 저장 | AC-012-01 ~ AC-012-03 |

### 9.2 수용 기준 커버리지

| 수용 기준 ID | 내용 | 관련 기능 ID | 커버 여부 |
|-------------|------|-------------|----------|
| AC-011-01 | 설문 유형은 link 또는 app만 허용된다 | FN-008-01 | 커버 |
| AC-011-02 | 새 설문은 draft 상태로 생성된다 | FN-008-02 | 커버 |
| AC-011-03 | draft 상태에서만 inProgress로 전환할 수 있다 | FN-008-02 | 커버 |
| AC-012-01 | draft 상태 설문은 10초 간격으로 자동 저장된다 | FN-008-10 | 커버 |
| AC-012-02 | 탭이 비활성 상태이면 자동 저장이 스킵된다 | FN-008-10 | 커버 |
| AC-012-03 | 변경 사항이 없으면 자동 저장이 스킵된다 | FN-008-10 | 커버 |
| AC-012-04 | autoComplete 값에 도달하면 자동으로 completed 상태가 된다 | FN-008-05 | 커버 |
| AC-012-05 | PIN은 정확히 4자리여야 한다 | FN-008-12, FN-008-13 | 커버 |
| AC-012-06 | 표시 확률은 0.01~100 범위여야 한다 | FN-008-04, FN-008-12 | 커버 |
| AC-012-07 | Welcome Card가 활성화되면 제목이 필수이다 | FN-008-06, FN-008-12 | 커버 |
| AC-012-08 | Question/Block/Ending/Variable ID는 설문 내에서 고유해야 한다 | FN-008-03, FN-008-12 | 커버 |
| AC-012-09 | Hidden Field ID에 금지된 ID를 사용할 수 없다 | FN-008-08, FN-008-12 | 커버 |
| AC-012-10 | Variable name은 소문자, 숫자, 언더스코어만 허용된다 | FN-008-09, FN-008-12 | 커버 |
| AC-047-01 | 템플릿에서 설문 생성 시 프리셋 데이터가 적용된다 | FN-008-11 | 커버 |
| AC-047-02 | 템플릿은 역할, 채널, 산업으로 필터링할 수 있다 | FN-008-11 | 커버 |

### 9.3 변경 이력

| 버전 | 일자 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| v1.0 | 2026-02-21 | AI 분석 | FSD-008 기반 최초 작성 |
