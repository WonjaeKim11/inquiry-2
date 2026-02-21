# 프로젝트 & 환경 관리 -- 요구사항 명세서

> **문서번호**: FSD-006 | **FR 범위**: FR-008 ~ FR-009
> **라이선스**: Community

---

## 1. 목적/배경

Formbricks는 멀티 프로젝트, 멀티 환경 구조를 통해 하나의 Organization 아래에서 여러 제품(Project)을 관리하고, 각 제품별로 development/production 환경을 분리하여 설문 데이터와 Action Class를 격리한다. 이 문서는 Project와 Environment의 데이터 모델, CRUD 정책, ActionClass 유형 및 환경별 데이터 격리 메커니즘을 정의한다.

## 2. 범위

### In-scope
- Project 데이터 모델 및 CRUD 작업
- Environment 데이터 모델 및 생성/관리
- ActionClass 유형 (code, noCode) 및 구성
- Project-level 설정 (재접촉 일수, 배치, 오버레이, 설정)
- 환경별 데이터 격리 정책

### Out-of-scope
- Organization 관리 (별도 문서)
- Billing/Subscription 관리
- 사용자 인증/권한 관리

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| Organization Owner/Admin | 프로젝트 생성, 삭제, 설정 변경 |
| Project Member | 프로젝트 내 설문 관리, 환경 전환 |
| SDK 통합 개발자 | Environment ID를 통한 SDK 초기화 |

## 4. 기능 요구사항

### FR-008: Project 데이터 모델 및 관리

#### 4.1 Project 데이터 모델

Project 데이터 모델은 다음 필드로 구성된다:

| 필드 | 타입 | 설명 |
|------|------|------|
| ID | 문자열 (CUID) | 고유 식별자, 자동 생성 |
| 생성일시 | DateTime | 자동 생성 |
| 수정일시 | DateTime | 자동 갱신 |
| 이름 | 문자열 | 프로젝트 이름 |
| Organization ID | 문자열 | 소속 조직 (외래키, Cascade 삭제) |
| 환경 목록 | Environment 배열 | 하위 환경 목록 |
| 스타일링 | JSON | 기본값: 스타일 오버라이드 허용 |
| 설정 | JSON | 프로젝트 설정 (채널, 산업) |
| 재접촉 일수 | 정수 | 기본값: 7 |
| Link 설문 브랜딩 | boolean | 기본값: true |
| In-app 설문 브랜딩 | boolean | 기본값: true |
| 위젯 배치 | enum | 기본값: bottomRight |
| 외부 클릭 닫기 | boolean | 기본값: true |
| 오버레이 | enum | 기본값: none |
| 언어 목록 | Language 배열 | 다국어 설정 |
| 로고 | JSON (선택) | 프로젝트 로고 |
| 프로젝트 팀 | ProjectTeam 배열 | 팀 연결 |
| 커스텀 헤드 스크립트 | 문자열 (선택) | Self-hosted 전용 |

고유 제약조건: (Organization ID, 이름) 조합으로 이름 고유성 보장

#### 4.2 Project 유효성 검증 규칙

Project 유효성 검증 스키마의 주요 규칙:

| 필드 | 규칙 |
|------|------|
| ID | CUID2 형식 |
| 이름 | 공백 제거 후 최소 1자, 빈 값 불허 |
| 재접촉 일수 | 정수, 0~365 범위 |
| In-app 설문 브랜딩 | boolean 필수 |
| Link 설문 브랜딩 | boolean 필수 |
| 외부 클릭 닫기 | boolean |
| 로고 | 선택 (null 허용) |
| 커스텀 헤드 스크립트 | 선택 (null 허용) |

#### 4.3 Project 설정 상세

| 설정 항목 | 타입 | 기본값 | 제약 조건 |
|-----------|------|--------|-----------|
| 이름 | string | (필수) | trim 후 최소 1자, Organization 내 고유 |
| 재접촉 일수 | integer | 7 | 0~365 범위 |
| 위젯 배치 | enum | bottomRight | 5가지: bottomLeft, bottomRight, topLeft, topRight, center |
| 외부 클릭 닫기 | boolean | true | 설문 외부 클릭 시 닫기 여부 |
| 오버레이 | enum | none | 3가지: none, light, dark |
| In-app 설문 브랜딩 | boolean | true | In-app 설문에 Formbricks 브랜딩 표시 |
| Link 설문 브랜딩 | boolean | true | Link 설문에 Formbricks 브랜딩 표시 |
| 커스텀 헤드 스크립트 | string (선택) | null | Self-hosted 전용 커스텀 HTML 스크립트 |

#### 4.4 Project Config

- **채널(channel)**: 프로젝트의 주요 설문 배포 채널 (link, app, website, null)
- **산업(industry)**: 프로젝트의 산업 분류 (eCommerce, saas, other, null)
- 이 값들은 Template 필터링에 사용됨

#### 4.5 Project Mode

- surveys: 일반 설문 모드
- cx: Customer Experience 모드 (CX 전용 기능 활성화)

#### 4.6 Project Styling

- 스타일 오버라이드 허용 여부: 개별 설문에서 프로젝트 스타일을 오버라이드할 수 있는지 여부
- 기본값: 스타일 오버라이드 허용 (true)
- 기본 스타일링 속성으로 brandColor, cardBackgroundColor, cardBorderColor, roundness, background, hideProgressBar, isLogoHidden 등 포함

#### 4.7 Project 수정 입력

수정 가능한 필드 목록:
- 이름, Organization ID, 하이라이트 테두리 색상, 재접촉 일수
- In-app 설문 브랜딩, Link 설문 브랜딩, 설정(config)
- 위젯 배치, 외부 클릭 닫기, 오버레이
- 환경 목록, 스타일링, 로고, 팀 ID 목록, 커스텀 헤드 스크립트

모든 필드는 선택적(optional)으로, 변경하고자 하는 필드만 전달 가능.

#### 4.8 Language 관리

Language 데이터 모델:

| 필드 | 타입 | 설명 |
|------|------|------|
| ID | CUID2 | 고유 식별자 |
| 생성일시 | DateTime | 자동 생성 |
| 수정일시 | DateTime | 자동 갱신 |
| 언어 코드 | 문자열 | 예: en, ko, ja |
| 별칭 | 문자열 (nullable) | 사용자 지정 언어 별칭 |
| Project ID | CUID2 | 소속 프로젝트 |

- 프로젝트 단위로 언어를 등록하여 다국어 설문 지원

### FR-009: Environment 모델 및 격리

#### 4.9 Environment 데이터 모델

Environment 데이터 모델은 다음 필드로 구성된다:

| 필드 | 타입 | 설명 |
|------|------|------|
| ID | 문자열 (CUID) | 고유 식별자 |
| 생성일시 | DateTime | 자동 생성 |
| 수정일시 | DateTime | 자동 갱신 |
| 환경 유형 | enum (production, development) | 환경 종류 |
| Project ID | 문자열 | 소속 프로젝트 (외래키, Cascade 삭제) |
| 앱 셋업 완료 여부 | boolean | 기본값: false |
| 설문 목록 | Survey 배열 | 환경 내 설문 |
| 연락처 목록 | Contact 배열 | 환경 내 연락처 |
| Action Class 목록 | ActionClass 배열 | 환경 내 액션 정의 |
| 속성 키 목록 | ContactAttributeKey 배열 | 환경 내 속성 키 |
| 웹훅 목록 | Webhook 배열 | 환경 내 웹훅 |
| 태그 목록 | Tag 배열 | 환경 내 태그 |
| 세그먼트 목록 | Segment 배열 | 환경 내 세그먼트 |
| 통합 목록 | Integration 배열 | 환경 내 통합 설정 |
| API Key 목록 | ApiKeyEnvironment 배열 | 환경 내 API 키 |

인덱스: Project ID 기반

#### 4.10 Environment 유효성 검증 규칙

| 필드 | 규칙 |
|------|------|
| ID | CUID 형식 |
| 환경 유형 | development 또는 production 만 허용 |
| Project ID | 문자열 필수 |
| 앱 셋업 완료 여부 | boolean |

#### 4.11 환경별 데이터 격리

하나의 Project에는 2개의 Environment가 자동 생성된다:
- **production**: 실 서비스용 데이터
- **development**: 개발/테스트용 데이터

각 Environment에 격리되는 데이터:

| 데이터 종류 | 격리 여부 | 설명 |
|-------------|-----------|------|
| Survey | O | 환경별 독립적인 설문 목록 |
| Contact | O | 환경별 독립적인 사용자 데이터 |
| ActionClass | O | 환경별 독립적인 액션 정의 |
| ContactAttributeKey | O | 환경별 독립적인 속성 키 |
| Webhook | O | 환경별 독립적인 웹훅 설정 |
| Tag | O | 환경별 독립적인 태그 |
| Segment | O | 환경별 독립적인 세그먼트 |
| Integration | O | 환경별 독립적인 통합 설정 |
| API Key | O | 환경별 독립적인 API 키 |

Project가 삭제되면 모든 Environment가 Cascade 삭제됨.

#### 4.12 ActionClass 데이터 모델

ActionClass 데이터 모델은 다음 필드로 구성된다:

| 필드 | 타입 | 설명 |
|------|------|------|
| ID | 문자열 (CUID) | 고유 식별자 |
| 생성일시 | DateTime | 자동 생성 |
| 수정일시 | DateTime | 자동 갱신 |
| 이름 | 문자열 | 액션 이름 |
| 설명 | 문자열 (선택) | 액션 설명 |
| 유형 | enum (code, noCode) | 액션 유형 |
| 키 | 문자열 (선택) | code 유형 시 트리거 키 |
| noCode 설정 | JSON (선택) | noCode 유형 시 설정 |
| Environment ID | 문자열 | 소속 환경 (외래키, Cascade 삭제) |
| 설문 트리거 목록 | SurveyTrigger 배열 | 연결된 설문 트리거 |

고유 제약조건:
- (키, Environment ID) 조합
- (이름, Environment ID) 조합

인덱스: (Environment ID, 생성일시) 기반

#### 4.13 ActionClass 유형

ActionClass 유형은 code와 noCode 2가지이다.

**code 타입**: SDK에서 이벤트 추적 호출로 트리거
- key 필드 필수 (환경 내 고유)

**noCode 타입**: 사용자 행동을 자동 감지
- noCode 설정에 4가지 하위 유형 정의:

| noCode 유형 | 설명 | 추가 설정 |
|------------|------|-----------|
| click | 특정 요소 클릭 감지 | CSS 선택자 또는 내부 HTML 필수 |
| pageView | 특정 페이지 방문 감지 | URL 필터만 사용 |
| exitIntent | 마우스가 뷰포트 상단 벗어남 감지 | URL 필터만 사용 |
| fiftyPercentScroll | 페이지 50% 스크롤 감지 | URL 필터만 사용 |

#### 4.14 URL 필터 규칙

URL 필터에 사용 가능한 7가지 매칭 규칙:
- exactMatch (정확히 일치)
- contains (포함)
- startsWith (시작 문자열 일치)
- endsWith (끝 문자열 일치)
- notMatch (일치하지 않음)
- notContains (포함하지 않음)
- matchesRegex (정규식 매칭)

URL 필터 연결 방식: or 또는 and (기본값: or)

URL 필터 구성:
- type: click, pageView, exitIntent, fiftyPercentScroll 중 하나
- urlFilters: 배열 형태로 각 필터의 값(value)과 규칙(rule) 지정
- urlFiltersConnector: or 또는 and (선택, 기본값 or)
- 필터 값은 공백 제거 후 최소 1자 필수

#### 4.15 ActionClass 생성 입력

유형(type)에 따라 분기 처리:
- code 유형: key 필수
- noCode 유형: noCode 설정 필수

공통 규칙:
- name: 최소 1자, 환경 내 고유
- Environment ID: 필수 (최소 1자)

## 5. 비기능 요구사항

| 항목 | 요구사항 |
|------|----------|
| 데이터 일관성 | Project 삭제 시 Cascade로 Environment, Survey 등 모두 삭제 |
| 고유성 제약 | (Organization ID, 이름) 조합으로 Project 이름 고유성 보장 |
| 고유성 제약 | (키, Environment ID), (이름, Environment ID) 조합으로 ActionClass 고유성 보장 |
| 인덱싱 | Environment는 Project ID로 인덱스, ActionClass는 (Environment ID, 생성일시)로 인덱스 |
| ID 포맷 | Project/ActionClass는 CUID2, Environment는 CUID 사용 |

## 6. 정책/제약

| 정책 | 값 |
|------|-----|
| 재접촉 일수 최솟값 | 0 |
| 재접촉 일수 최댓값 | 365 |
| 재접촉 일수 기본값 | 7 |
| 위젯 배치 기본값 | bottomRight |
| 오버레이 기본값 | none |
| 외부 클릭 닫기 기본값 | true |
| 스타일링 기본값 | 스타일 오버라이드 허용 |
| Project 이름 최소 길이 | 1 (trim 후) |
| ActionClass 이름 최소 길이 | 1 (trim 후) |
| URL 필터 값 최소 길이 | 1 (trim 후) |
| click 유형의 요소 선택자 | CSS 선택자 또는 내부 HTML 중 하나 필수 |

## 7. 수용 기준 (Acceptance Criteria)

1. **AC-008-01**: 새 Project 생성 시 development와 production Environment가 자동 생성된다.
2. **AC-008-02**: 재접촉 일수 값은 0~365 범위의 정수만 허용된다.
3. **AC-008-03**: 동일 Organization 내에서 같은 이름의 Project를 생성할 수 없다.
4. **AC-008-04**: Project 삭제 시 하위 Environment 및 모든 관련 데이터가 Cascade 삭제된다.
5. **AC-008-05**: Project config의 채널은 link, app, website, null 중 하나여야 한다.
6. **AC-008-06**: Project config의 산업은 eCommerce, saas, other, null 중 하나여야 한다.
7. **AC-009-01**: Environment의 유형은 development 또는 production만 허용된다.
8. **AC-009-02**: 한 Environment의 Survey, Contact, ActionClass 등은 다른 Environment에서 접근할 수 없다.
9. **AC-009-03**: code 타입 ActionClass는 환경 내에서 key가 고유해야 한다.
10. **AC-009-04**: noCode 타입 ActionClass의 click 유형은 CSS 선택자 또는 내부 HTML 중 하나 이상 필수이다.
11. **AC-009-05**: ActionClass 이름은 환경 내에서 고유해야 한다.
12. **AC-009-06**: URL 필터의 규칙은 7가지 옵션(exactMatch, contains, startsWith, endsWith, notMatch, notContains, matchesRegex) 중 하나여야 한다.
