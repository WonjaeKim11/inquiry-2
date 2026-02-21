# 설문 생성, 유형 & 라이프사이클 -- 요구사항 명세서

> **문서번호**: FSD-008 | **FR 범위**: FR-011, FR-012, FR-047
> **라이선스**: Community

---

## 1. 목적/배경

Formbricks의 설문(Survey)은 link와 app 두 가지 유형으로 구분되며, draft -> inProgress -> paused/completed의 라이프사이클을 따른다. 템플릿 기반 생성, 엄격한 유효성 검증, Draft 자동 저장, autoComplete 기능 등을 지원한다. 이 문서는 설문의 데이터 모델, 유형, 상태 전이, 유효성 검증 규칙을 정의한다.

## 2. 범위

### In-scope
- 설문 데이터 모델 (전체 스키마)
- 설문 유형: link, app (2가지만)
- 설문 상태: draft, inProgress, paused, completed (4가지)
- Draft 자동 저장 메커니즘
- autoComplete 기능
- 템플릿 기반 생성
- 발행 시 유효성 검증
- 설문 표시 옵션 (표시 옵션, 표시 제한, 표시 확률)

### Out-of-scope
- 개별 질문 유형 상세 (FSD-009에서 다룸)
- 설문 편집기 UI 상세 (FSD-010에서 다룸)
- 응답 수집/분석

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| 설문 작성자 | 설문 생성, 편집, 발행 |
| 시스템 | 자동 저장, 상태 전이, autoComplete 처리 |
| 응답자 | link 또는 app 채널을 통해 설문 응답 |

## 4. 기능 요구사항

### FR-011: 설문 유형

#### 4.1 설문 유형 (SurveyType)

**중요**: 설문 유형은 link와 app 단 2가지만 존재한다. 별도의 email 유형은 없다.

| 유형 | 설명 | 배포 방식 |
|------|------|-----------|
| link | URL 링크로 공유하는 독립 설문 | 고유 URL 생성, 이메일/SNS로 공유 |
| app | 웹 애플리케이션 내 임베드 설문 | JS SDK를 통한 앱 내 표시 |

기본값: app

#### 4.2 설문 상태 (SurveyStatus)

설문 상태는 draft, inProgress, paused, completed 4가지이다.

기본값: draft

#### 4.3 상태 전이 규칙

상태 전이 흐름:
- draft --> (발행) --> inProgress
- inProgress --> (일시정지) --> paused
- paused --> (재개) --> inProgress
- inProgress --> (완료) --> completed

| 현재 상태 | 가능한 전이 | 조건 |
|-----------|-------------|------|
| draft | inProgress | 발행(publish): 유효성 검증 통과 |
| inProgress | paused | 일시정지 |
| inProgress | completed | 수동 완료 또는 autoComplete 도달 |
| paused | inProgress | 재개 |

### FR-012: 설문 데이터 모델

#### 4.4 설문 핵심 필드

설문 데이터 모델의 주요 필드:

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| ID | CUID2 | 자동 생성 | 고유 식별자 |
| 생성일시 | DateTime | 자동 생성 | |
| 수정일시 | DateTime | 자동 갱신 | |
| 이름 | 문자열 | - | 설문 이름 |
| 유형 | link 또는 app | app | 설문 유형 |
| Environment ID | 문자열 | - | 소속 환경 |
| 작성자 ID | 문자열 (nullable) | null | 생성한 사용자 |
| 상태 | draft/inProgress/paused/completed | draft | 설문 상태 |
| 표시 옵션 | displayOption enum | displayOnce | 설문 표시 방식 |
| 자동 닫기 | 정수 (nullable) | null | 자동 닫기 시간 |
| 트리거 | ActionClass 배열 | - | 설문 트리거 액션 |
| 재접촉 일수 | 정수 (nullable) | null | 개별 설문 재접촉 일수 |
| 표시 제한 | 정수 (nullable) | null | 최대 표시 횟수 |
| Welcome Card | 객체 | 비활성화 상태 | 환영 카드 |
| 질문 목록 (deprecated) | 배열 | 빈 배열 | Block으로 대체 중 |
| Block 목록 | 배열 | 빈 배열 | 질문 블록 목록 |
| 종료 카드 목록 | 배열 | 빈 배열 | 종료 카드 |
| Hidden Fields | 객체 | 비활성화 상태 | 숨겨진 필드 |
| 변수 목록 | 배열 | 빈 배열 | 설문 변수 |
| Follow-up 목록 | 배열 | - | 후속 조치 |
| 딜레이 | 정수 | 0 | 표시 딜레이 (초) |
| autoComplete | 정수 (nullable, 최소 1) | null | 자동 완료 응답 수 |
| 프로젝트 오버라이드 | 객체 (nullable) | null | 프로젝트 설정 오버라이드 |
| 스타일링 | 객체 (nullable) | null | 개별 설문 스타일링 |
| 언어 전환 표시 | boolean (nullable) | null | 언어 전환 UI 표시 |
| 설문 종료 메시지 | 객체 (nullable) | null | 설문 종료 시 메시지 |
| 세그먼트 | 객체 (nullable) | null | 타겟 세그먼트 |
| 일회용 설정 | 객체 (nullable) | 비활성화, 암호화 활성화 | 일회용 링크 설정 |
| 이메일 인증 활성화 | boolean | false | |
| reCAPTCHA 설정 | 객체 (nullable) | null | 스팸 방지 설정 |
| 이메일당 1회 응답 제한 | boolean | false | |
| 뒤로가기 버튼 숨기기 | boolean | false | |
| IP 수집 활성화 | boolean | false | |
| PIN | 4자리 문자열 (선택) | null | 설문 접근 제한 PIN |
| 표시 확률 | 숫자 (0.01~100, nullable) | null | 설문 표시 확률 |
| 언어 목록 | 배열 | - | 다국어 설정 |
| 메타데이터 | 객체 | - | SEO 메타데이터 |
| Slug | 문자열 (nullable) | null | 공개 URL 경로 |
| 커스텀 헤드 스크립트 | 문자열 (선택) | null | |
| 커스텀 헤드 스크립트 모드 | add 또는 replace (선택) | null | |

#### 4.5 설문 데이터베이스 모델 (주요 필드)

데이터베이스 레벨의 설문 모델 기본값:

| 필드 | 기본값 |
|------|--------|
| 유형 | app |
| 상태 | draft |
| Welcome Card | 비활성화 상태 |
| 질문 | 빈 배열 |
| Block 목록 | 빈 배열 |
| 종료 카드 | 빈 배열 |
| Hidden Fields | 비활성화 상태 |
| 변수 | 빈 배열 |
| 표시 옵션 | displayOnce |
| 딜레이 | 0 |
| 일회용 설정 | 비활성화, 암호화 활성화 |
| 이메일 인증 | false |
| 이메일당 1회 응답 | false |
| 뒤로가기 버튼 숨기기 | false |
| IP 수집 | false |

#### 4.6 설문 표시 옵션 (Display Options)

4가지 표시 옵션:

| 옵션 | 설명 |
|------|------|
| displayOnce | 한 번만 표시 |
| displayMultiple | 여러 번 표시 |
| respondMultiple | 여러 번 응답 허용 |
| displaySome | 제한된 횟수만 표시 |

displaySome 선택 시 표시 제한(displayLimit) 값으로 최대 표시 횟수 지정.

#### 4.7 autoComplete 기능

- 설정된 응답 수에 도달하면 설문이 자동으로 completed 상태로 전환
- 최솟값: 1 (응답 제한은 0보다 커야 함)
- null: 자동 완료 비활성화

#### 4.8 Welcome Card

Welcome Card의 속성:

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| 활성화 | boolean | - | Welcome Card 활성화 여부 |
| 제목 | 다국어 문자열 (선택) | - | 환영 메시지 제목 |
| 부제목 | 다국어 문자열 (선택) | - | 환영 메시지 본문 |
| 파일 URL | Storage URL (선택) | - | 로고/이미지 |
| 버튼 라벨 | 다국어 문자열 (선택) | - | 다음 버튼 텍스트 |
| 예상 완료 시간 | boolean | true | 예상 완료 시간 표시 |
| 응답 수 표시 | boolean | false | 응답 수 표시 (link 타입만) |
| 비디오 URL | Storage URL (선택) | - | 비디오 삽입 |

- 활성화 시 제목(headline) 필수 (Welcome Card에 제목이 있어야 함)

#### 4.9 Endings (종료 카드)

2가지 유형의 종료 카드:

**1. End Screen (endScreen)**:
- 제목, 부제목, 버튼 라벨, 버튼 링크, 이미지/비디오 URL
- 종료 화면에 메시지 및 CTA 버튼 표시

**2. Redirect to URL (redirectToUrl)**:
- 리다이렉트 URL, 라벨
- 설문 완료 후 지정 URL로 자동 이동

각 ending은 고유한 CUID2 ID를 가짐. 여러 개의 ending을 가질 수 있음.

#### 4.10 Hidden Fields

Hidden Fields 구성:
- 활성화 여부 (boolean)
- 필드 ID 목록 (문자열 배열, 선택)

필드 ID 유효성 검증:
- 금지된 ID 사용 불가 (아래 목록 참조)
- 공백 불허
- 영문, 숫자, 하이픈, 언더스코어만 허용

금지된 ID 목록:
userId, source, suid, end, start, welcomeCard, hidden, verifiedEmail, multiLanguage, embed

#### 4.11 Survey Variables

설문 변수는 number와 text 2가지 유형을 지원:

**number 유형**: ID, 이름, 숫자 값 (기본값: 0)
**text 유형**: ID, 이름, 문자열 값 (기본값: "")

- 변수 이름: 소문자, 숫자, 언더스코어만 허용
- ID와 이름 모두 설문 내 고유해야 함

#### 4.12 Survey Slug

- 소문자, 숫자, 하이픈만 허용
- Link 설문의 공개 URL에 사용

#### 4.13 추가 설정 필드

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| 딜레이 | number | 0 | 설문 표시 딜레이 (초) |
| 재접촉 일수 | number (선택) | null | 개별 설문의 재접촉 일수 (Project 값 오버라이드) |
| PIN | string (선택) | null | 4자리 PIN 코드 (설문 접근 제한) |
| 표시 확률 | number (선택) | null | 설문 표시 확률 (0.01~100) |
| 이메일 인증 활성화 | boolean | false | 이메일 검증 활성화 |
| 이메일당 1회 응답 제한 | boolean | false | 이메일당 1회 응답 제한 |
| 뒤로가기 버튼 숨기기 | boolean | false | 뒤로가기 버튼 숨기기 |
| IP 수집 활성화 | boolean | false | IP 주소 수집 |
| 언어 전환 표시 | boolean (선택) | null | 언어 전환 UI 표시 |

#### 4.14 reCAPTCHA 설정

- 활성화 여부 (boolean)
- threshold: 0.1~0.9, 0.1 단위

#### 4.15 Single Use 설정

- 활성화 여부 (boolean)
- 제목 (선택)
- 부제목 (선택)
- 응답 ID 암호화 여부

일회용 링크 설문에 사용.

#### 4.16 Survey Metadata (Link 설문)

Link 설문의 SEO 메타데이터:
- 제목 (다국어, 선택)
- 설명 (다국어, 선택)
- OG 이미지 URL (선택)

### FR-047: Draft 자동 저장

#### 4.17 Draft 자동 저장 메커니즘

핵심 동작:
- **10초 간격**으로 자동 저장
- **draft 상태에서만** 활성화 (발행 후 비활성화)
- **탭 비활성(화면 숨김) 시** 저장 스킵
- **변경 감지**: 수정일시 필드 제외하고 내용 비교, 변경 없으면 스킵
- **중복 저장 방지**: 자동 저장 중 플래그 및 수동 저장 중 플래그로 동시 저장 차단
- **Ref 기반**: 불필요한 리렌더링 방지를 위해 Ref 사용

#### 4.18 AutoSave Indicator UI

- draft 상태: "Auto save on" 또는 "Progress saved" (3초간 표시)
- 비-draft 상태: "Auto save disabled"

### Template 기반 생성

#### 4.19 Template 스키마

Template 데이터 모델:

| 필드 | 타입 | 설명 |
|------|------|------|
| 이름 | 문자열 | 템플릿 이름 |
| 설명 | 문자열 | 템플릿 설명 |
| 아이콘 | 선택 | 템플릿 아이콘 |
| 역할 | enum (선택) | 필터링용 역할 |
| 채널 | 배열 (선택) | 필터링용 채널 (link, app, website) |
| 산업 | 배열 (선택) | 필터링용 산업 (eCommerce, saas, other) |
| 프리셋 | 객체 | 미리 구성된 설문 데이터 |

- **역할(role)**: 5가지 역할별 필터링 (productManager, customerSuccess, marketing, sales, peopleManager)
- **채널(channels)**: 채널별 필터링 (link, app, website)
- **산업(industries)**: 산업별 필터링 (eCommerce, saas, other)
- **프리셋(preset)**: 미리 구성된 설문 데이터 (Welcome Card, Block 목록, 종료 카드, Hidden Fields)

#### 4.20 XM Template (CX 모드)

CX 모드 전용 템플릿:
- 이름, Block 목록, 종료 카드, 스타일링으로 구성

### 유효성 검증

#### 4.21 설문 유효성 검증 규칙

설문 스키마에 정의된 주요 유효성 검증:

1. **questions/blocks 상호 배타성**: questions 또는 blocks 중 하나만 존재해야 함
   - "설문은 elements가 포함된 questions 또는 blocks 중 하나를 가져야 함"
   - "설문은 questions와 blocks를 동시에 가질 수 없음. 하나의 모델만 사용"

2. **ID 고유성 검증**:
   - Question ID 고유
   - Block ID 고유
   - Ending ID 고유
   - Variable ID 고유
   - Variable name 고유

3. **Welcome Card 다국어 검증**: 활성화 시 제목, 부제목, 버튼 라벨의 다국어 완성도

4. **Question 다국어 검증**: 각 질문의 제목, 부제목 및 유형별 고유 필드 다국어 완성도

5. **Ending Card 다국어 검증**: End Screen의 제목, 부제목, 버튼 라벨 다국어 완성도

6. **순환 로직 검증**: 질문 간 순환 로직 감지

## 5. 비기능 요구사항

| 항목 | 요구사항 |
|------|----------|
| 자동 저장 주기 | 10초 간격 (draft 상태만) |
| 자동 저장 조건 | 탭 활성 + 변경 존재 + 다른 저장 진행 중 아님 |
| 데이터 무결성 | 스키마 기반 + 커스텀 검증으로 발행 전 엄격한 검증 |
| Cascade 삭제 | Environment 삭제 시 모든 Survey Cascade 삭제 |
| 인덱싱 | Survey는 Environment ID 기반 조회 최적화 |

## 6. 정책/제약

| 정책 | 값 |
|------|-----|
| 설문 유형 | link, app (2가지만) |
| 설문 상태 | draft, inProgress, paused, completed |
| 기본 유형 | app |
| 기본 상태 | draft |
| 기본 딜레이 | 0초 |
| autoComplete 최솟값 | 1 |
| PIN 길이 | 정확히 4자리 |
| 표시 확률 범위 | 0.01~100 |
| reCAPTCHA threshold 범위 | 0.1~0.9 (0.1 단위) |
| 자동 저장 간격 | 10,000ms (10초) |
| Welcome Card 기본값 | 비활성화 상태 |
| Hidden Fields 기본값 | 비활성화 상태 |
| 일회용 설정 기본값 | 비활성화, 암호화 활성화 |
| 표시 옵션 기본값 | displayOnce |
| 금지된 ID | userId, source, suid, end, start, welcomeCard, hidden, verifiedEmail, multiLanguage, embed |
| Variable name 패턴 | 소문자, 숫자, 언더스코어만 허용 |
| Slug 패턴 | 소문자, 숫자, 하이픈만 허용 |
| Element ID 패턴 | 영문, 숫자, 하이픈, 언더스코어만 허용 |
| 템플릿 역할 | productManager, customerSuccess, marketing, sales, peopleManager |

## 7. 수용 기준 (Acceptance Criteria)

1. **AC-011-01**: 설문 유형은 link 또는 app만 허용된다.
2. **AC-011-02**: 새 설문은 draft 상태로 생성된다.
3. **AC-011-03**: draft 상태에서만 inProgress로 전환(발행)할 수 있다.
4. **AC-012-01**: draft 상태 설문은 10초 간격으로 자동 저장된다.
5. **AC-012-02**: 탭이 비활성 상태이면 자동 저장이 스킵된다.
6. **AC-012-03**: 변경 사항이 없으면 자동 저장이 스킵된다.
7. **AC-012-04**: autoComplete 값에 도달하면 설문이 자동으로 completed 상태가 된다.
8. **AC-012-05**: PIN은 정확히 4자리여야 한다.
9. **AC-012-06**: 표시 확률은 0.01~100 범위여야 한다.
10. **AC-012-07**: Welcome Card가 활성화되면 제목이 필수이다.
11. **AC-012-08**: Question ID, Block ID, Ending ID, Variable ID는 설문 내에서 고유해야 한다.
12. **AC-012-09**: Hidden Field ID에 금지된 ID를 사용할 수 없다.
13. **AC-012-10**: Variable name은 소문자, 숫자, 언더스코어만 허용된다.
14. **AC-047-01**: 템플릿에서 설문 생성 시 프리셋 데이터 (Welcome Card, Block 목록, 종료 카드, Hidden Fields)가 적용된다.
15. **AC-047-02**: 템플릿은 역할, 채널, 산업으로 필터링할 수 있다.
