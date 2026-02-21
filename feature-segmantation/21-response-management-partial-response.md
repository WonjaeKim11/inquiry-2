# 응답 관리 및 부분 응답 -- 요구사항 명세서

> **문서번호**: FSD-021 | **FR 범위**: FR-035 ~ FR-036
> **라이선스**: Community

---

## 1. 목적/배경

Formbricks 설문에 수집된 개별 응답(Response)을 카드 형태 및 테이블 형태로 조회하고, 필터링/태깅/삭제를 수행하는 기능이다. 사용자는 완료된 응답뿐 아니라 **부분 응답**(Partial Response)도 실시간으로 확인할 수 있으며, 각 질문별 상호작용 시간(TTC: Time-to-Complete)을 추적한다.

---

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- 응답 카드 뷰 렌더링
- 응답 테이블 뷰 렌더링
- 응답 필터 조건 (22가지 filter condition + 추가 criteria)
- 응답 태그(Tag) 관리 (생성, 연결, 삭제)
- 응답 메타데이터 표시 (source, URL, browser, OS, device, country, action, IP)
- 부분 응답 표시 및 질문별 스킵/중단 상태 시각화
- 응답 상태 (finished / in-progress) 표시
- 응답 삭제 (5분 제한 규칙 포함)
- 질문별 TTC(Time-to-Complete) 추적

### Out-of-scope
- 응답 분석/요약(Summary) 기능 (FSD-025 참조)
- 응답 내보내기(Export) 기능 (FSD-025 참조)
- 웹훅/후속 메일 파이프라인 (FSD-022, FSD-023 참조)

---

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| Survey Manager | 응답 목록 조회, 필터링, 태깅, 삭제 수행 |
| Project Member (Read) | 읽기 전용으로 응답 확인 |
| Anonymous Respondent | 설문 응답 제출 (부분 응답 포함) |
| Contact (인증 사용자) | userId 기반 식별 가능한 응답 제출 |

---

## 4. 기능 요구사항

### FR-035: 응답 조회 및 관리

#### 4.1 응답 데이터 구조

응답(Response) 데이터는 다음 필드로 구성된다:

| 필드 | 설명 |
|------|------|
| id | 응답 고유 식별자 (CUID2) |
| createdAt | 생성 시간 |
| updatedAt | 수정 시간 |
| surveyId | 설문 ID |
| displayId | Display 이벤트 ID |
| contact | 연락처 정보 (nullable) |
| contactAttributes | 연락처 속성 |
| finished | 완료 여부 (boolean) |
| endingId | 종료 화면 ID |
| data | 질문별 응답 데이터 |
| variables | 변수 데이터 |
| ttc | 질문별 소요 시간 (ms) |
| tags | 태그 배열 |
| meta | 메타데이터 |
| singleUseId | 일회성 링크 ID |
| language | 응답 언어 |

#### 4.2 응답 데이터 값 타입

지원 값 형식:
- 문자열 -- 텍스트, 단일 선택 등
- 숫자 -- NPS, Rating 등
- 문자열 배열 -- 복수 선택, 파일 업로드 URL 등
- 키-값 매핑 -- Matrix 질문 등
- 미정의 -- 미응답

#### 4.3 응답 메타데이터

응답 메타데이터는 다음 필드로 구성된다:

| 필드 | 설명 |
|------|------|
| source | 응답 출처 |
| url | 페이지 URL |
| browser | 브라우저 이름 |
| os | 운영체제 |
| device | 디바이스 유형 |
| country | 국가 |
| action | 트리거 액션 |
| ipAddress | IP 주소 |

메타데이터 UI 표시 로직:
- 디바이스 값에 "mobile" 또는 "phone"이 포함되면 스마트폰 아이콘 표시, 그 외 모니터 아이콘 표시
- 디바이스 정보가 없으면 "PC / Generic device"로 표시
- Contact Attributes, UserAgent, Language 중 하나 이상 존재할 때만 메타데이터 영역 렌더링

#### 4.4 응답 카드 뷰 구조

응답 카드는 3개의 하위 영역으로 구성:

| 영역 | 주요 기능 |
|------|----------|
| 헤더 | 연락처 아바타/이름, 응답 시간, 삭제 버튼 |
| 바디 | 질문별 응답, 스킵/중단 표시, 변수, 히든 필드 |
| 풋터 | 태그 관리, 메타데이터 아이콘 |

#### 4.5 응답 카드 헤더

- **연락처 식별**: 연락처 ID가 존재하면 연락처 아바타 + 이름 표시. 없으면 "Anonymous" 표시
- **userId 배지**: 연락처의 userId가 존재하면 ID 배지로 표시
- **삭제 규칙**:
  - 완료된 응답(finished = true)은 즉시 삭제 가능
  - 미완료 응답(finished = false)은 마지막 업데이트 시간 기준 **5분 경과** 후 삭제 가능
  - 5분 미경과 시 삭제 버튼 비활성화, 툴팁으로 "This response is in progress" 표시
- **시간 표시**: 상대 시간 표시 (locale 적용)

#### 4.6 응답 테이블 뷰

응답 테이블 뷰의 주요 기능:

- TanStack Table 기반 테이블 렌더링
- Drag-and-drop 열 순서 변경
- 열 가시성(visibility) 설정
- 행 선택(row selection) 기능
- 무한 스크롤 기반 페이지네이션
- 선택된 행 일괄 삭제/다운로드

테이블에 표시되는 데이터 필드:

| 필드 | 설명 |
|------|------|
| responseId | 응답 ID |
| singleUseId | 일회성 링크 ID |
| createdAt | 생성 시간 |
| status | 상태 |
| verifiedEmail | 인증된 이메일 |
| tags | 태그 |
| language | 언어 |
| responseData | 질문별 응답 데이터 |
| variables | 변수 |
| person | 연락처 정보 |
| contactAttributes | 연락처 속성 |
| meta | 메타데이터 |
| quotas | 쿼터 |

### FR-036: 응답 필터링 시스템

#### 4.7 필터 조건

22가지 필터 연산자를 지원:

| 연산자 | 설명 |
|--------|------|
| accepted | CTA/Consent 수락 |
| clicked | CTA 클릭 |
| submitted | 제출됨 |
| skipped | 스킵됨 |
| equals | 같음 (문자열 또는 숫자) |
| notEquals | 같지 않음 |
| lessThan | 미만 (숫자) |
| lessEqual | 이하 (숫자) |
| greaterThan | 초과 (숫자) |
| greaterEqual | 이상 (숫자) |
| includesAll | 모두 포함 (문자열 배열) |
| includesOne | 하나 이상 포함 (문자열/숫자 배열) |
| uploaded | 업로드됨 |
| notUploaded | 미업로드 |
| booked | Cal 예약됨 |
| isCompletelySubmitted | 완전 제출 |
| isPartiallySubmitted | 부분 제출 |
| isEmpty | 비어있음 |
| isNotEmpty | 비어있지 않음 |
| isAnyOf | 임의 값 중 하나 |
| contains | 포함 (문자열) |
| doesNotContain | 미포함 |
| startsWith | 시작 문자열 |
| doesNotStartWith | 비시작 문자열 |
| endsWith | 종료 문자열 |
| doesNotEndWith | 비종료 문자열 |

#### 4.8 필터 기준

응답 필터 기준은 다음 항목으로 구성된다:

| 기준 | 설명 |
|------|------|
| 완료 상태 | 완료 여부로 필터링 |
| 응답 ID | 특정 응답 ID로 필터링 |
| 날짜 범위 | 최소/최대 날짜 범위 필터 |
| 연락처 속성 | 연락처 속성 기반 필터 |
| 질문 응답 데이터 | 22가지 연산자를 사용한 질문 응답 필터 |
| 태그 | 적용된 태그 / 미적용 태그 필터 |
| 기타 | filledOut(응답 채움 여부), matrix(행-열 값 매핑) |
| 메타데이터 | 8가지 텍스트 연산자로 메타데이터 필터 |
| 쿼터 | screenedIn, screenedOut, screenedOutNotInQuota |

Meta 필터에서 지원하는 텍스트 연산자:
- equals, notEquals, contains, doesNotContain, startsWith, doesNotStartWith, endsWith, doesNotEndWith

#### 4.9 태그 관리 시스템

태그 관리 기능:

- **태그 생성**: Environment 단위로 태그 생성, 이름 중복 체크 (중복 시 에러)
- **태그 연결**: 응답에 태그 연결
- **태그 삭제**: 응답에서 태그 제거
- **태그 검색**: 기존 태그 검색 및 선택
- **하이라이트**: 새로 추가된 태그는 2초간 하이라이트 표시
- **읽기 전용**: 읽기 전용 모드에서 태그 추가/삭제 UI 숨김
- **로딩 제어**: 태그 작업 중에는 추가 태그 작업 차단

#### 4.10 부분 응답 (Partial Response) 처리

**표시 상태 구분:**

| 상태 | 조건 | 시각적 표현 |
|------|------|------------|
| Completed | finished = true | 체크 아이콘 + "Completed" 배지 |
| Skipped | 중간 질문이 건너뛰어짐 | "skipped" 상태 표시 |
| Aborted | 마지막에 미응답 (미완료) | "aborted" 상태 표시 |

**스킵 질문 그룹화 로직**:

- 완료된 응답: 순방향으로 질문을 순회하며 연속 미응답을 그룹으로 묶음. 응답이 있는 질문을 만나면 그룹을 종료하고 새 그룹을 시작
- 미완료 응답: 역방향으로 질문을 순회하며 마지막부터 미응답 그룹을 생성

**유효 값 판별 기준:**

다음 중 하나에 해당하면 유효한 응답 값으로 판별:
- 빈 문자열이 아닌 문자열
- 1개 이상의 항목이 있는 배열
- 숫자 타입
- 1개 이상의 항목이 있는 객체

#### 4.11 질문별 TTC (Time-to-Complete) 추적

- 각 질문 ID를 키로, 소요 시간(ms)을 값으로 저장
- "_total" 키로 전체 소요 시간 합산
- Summary 페이지에서 평균 TTC 계산에 활용

#### 4.12 응답 입력/업데이트

**신규 응답 생성 시 필요한 데이터:**

| 필드 | 설명 |
|------|------|
| environmentId | 환경 ID (CUID2) |
| surveyId | 설문 ID (CUID2) |
| userId | 사용자 ID (선택) |
| finished | 완료 여부 |
| data | 질문별 응답 데이터 |
| variables | 변수 데이터 (선택) |
| ttc | 질문별 소요 시간 (선택) |
| meta | 메타데이터 (source, url, userAgent, country, action, ipAddress) (선택) |

**응답 업데이트 시 필요한 데이터:**

| 필드 | 설명 |
|------|------|
| finished | 완료 여부 |
| data | 질문별 응답 데이터 |
| variables | 변수 데이터 (선택) |
| ttc | 질문별 소요 시간 (선택) |
| meta | url, source, action (선택) |
| hiddenFields | 히든 필드 값 (선택) |
| displayId | Display 이벤트 ID (선택) |
| endingId | 종료 화면 ID (선택) |

---

## 5. 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| **성능** | 응답 목록 페이지네이션 기반 로딩 (기본 10건) |
| **실시간성** | 부분 응답은 마지막 업데이트 시간 기준으로 실시간 상태 반영 |
| **접근 제어** | 읽기 전용 플래그로 읽기 전용 사용자 태그/삭제 차단 |
| **데이터 보호** | Contact 개인정보는 외부 추적 도구에서 제외 처리 |
| **Quota 연동** | 응답 삭제 시 Quota 차감 옵션 제공 |

---

## 6. 정책/제약

| 항목 | 값 |
|------|-----|
| 미완료 응답 삭제 대기 시간 | 5분 |
| 기본 페이지 크기 | 10건 |
| 응답 ID 형식 | CUID2 |
| 태그 이름 중복 | Environment 단위 유니크 |
| 태그 하이라이트 시간 | 2초 |
| 필터 연산자 수 | 22 + 추가 criteria |
| 지원 메타데이터 필드 | 8개 (source, url, browser, os, device, country, action, ipAddress) |

---

## 7. 수용 기준 (Acceptance Criteria)

### AC-035-01: 응답 카드 표시
- [ ] 완료된 응답에 "Completed" 배지와 체크 아이콘이 표시된다
- [ ] 미완료(부분) 응답은 스킵/중단된 질문이 그룹화되어 시각적으로 구분된다
- [ ] 연락처가 있는 응답은 아바타와 이름이 표시되고, 없으면 "Anonymous"로 표시된다
- [ ] userId가 있으면 ID 배지가 표시된다

### AC-035-02: 응답 삭제
- [ ] 완료된 응답은 즉시 삭제 가능하다
- [ ] 미완료 응답은 마지막 업데이트 후 5분 이내에는 삭제가 불가능하다
- [ ] 5분 미경과 시 삭제 버튼이 비활성화되고 툴팁이 표시된다
- [ ] Quota가 있는 응답 삭제 시 Quota 차감 옵션이 제공된다

### AC-035-03: 메타데이터 표시
- [ ] 디바이스 유형에 따라 적절한 아이콘(모바일/데스크톱)이 표시된다
- [ ] Browser, OS, Device, URL, Action, Source, Country, IP Address가 툴팁으로 표시된다
- [ ] 연락처 속성이 있을 경우 Tag 아이콘과 함께 툴팁으로 표시된다
- [ ] 언어 정보가 있으면 언어 아이콘과 함께 표시된다

### AC-036-01: 필터링
- [ ] 22가지 필터 조건이 모두 동작한다
- [ ] 날짜 범위(min/max) 필터가 적용된다
- [ ] 태그 기반 필터(applied/notApplied)가 적용된다
- [ ] 메타데이터 필드별 텍스트 검색 필터가 적용된다
- [ ] Quota 관련 필터(screenedIn/Out)가 적용된다
- [ ] 다중 필터 조건을 AND로 조합할 수 있다

### AC-036-02: 태그 관리
- [ ] 새 태그를 생성하고 응답에 연결할 수 있다
- [ ] 중복 태그 이름 시 에러 메시지가 표시된다
- [ ] 기존 태그를 검색하여 응답에 추가할 수 있다
- [ ] 응답에서 태그를 제거할 수 있다
- [ ] 읽기 전용 사용자에게는 태그 편집 UI가 숨겨진다

### AC-036-03: 응답 테이블 뷰
- [ ] 열 순서를 드래그앤드롭으로 변경할 수 있다
- [ ] 열 가시성을 설정할 수 있다
- [ ] 행을 선택하여 일괄 삭제 또는 다운로드할 수 있다
- [ ] 무한 스크롤로 추가 데이터를 로딩할 수 있다
