# 설문 편집기 UX -- 요구사항 명세서

> **문서번호**: FSD-010 | **FR 범위**: FR-014
> **라이선스**: Community

---

## 1. 목적/배경

Formbricks 설문 편집기는 Block 아키텍처 기반의 시각적 설문 작성 도구이다. 편집기는 Welcome Card, Blocks(질문 그룹), Endings(종료 카드)의 3단 구조로 구성되며, 드래그 앤 드롭, 실시간 프리뷰, 다국어 편집, 조건부 로직 설정, Validation Rules 편집 등을 지원한다. 이 문서는 편집기의 구조, UI 컴포넌트, 상호작용 패턴, 제약 조건을 정의한다.

## 2. 범위

### In-scope
- Block 아키텍처: blocks -> elements + logic
- 편집기 탭 구조 (Elements, Styling, Settings, Follow-Ups)
- Welcome Card 7가지 속성
- Endings 2가지 유형 (endScreen, redirectToUrl)
- 드래그 앤 드롭 재정렬 (Block 단위)
- Question ID(Element ID) 편집 및 prefill/startAt 용도
- Block 수준 로직 (Logic/Fallback)
- Hidden Fields 및 Variables 카드

### Out-of-scope
- 개별 질문 유형의 내부 동작 (FSD-009 참조)
- 서버 측 저장/발행 API
- Styling 뷰의 CSS 속성 상세

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| 설문 작성자 | 편집기 UI를 통해 설문 구성 및 수정 |
| 프리뷰 사용자 | 실시간 프리뷰로 설문 결과 확인 |

## 4. 기능 요구사항

### FR-014: 설문 편집기

#### 4.1 편집기 전체 레이아웃

편집기 레이아웃 구성:

| 영역 | 위치 | 크기 비율 | 설명 |
|------|------|-----------|------|
| SurveyMenuBar | 상단 | 전체 너비 | 이름 편집, 저장/발행, 자동 저장 표시기 |
| 메인 편집 영역 | 좌측 | 2/3 | 탭 기반 뷰 전환 (Elements/Styling/Settings/FollowUps) |
| 실시간 프리뷰 | 우측 | 1/3 | 설문 프리뷰 (모바일 화면에서는 숨김) |

#### 4.2 편집기 탭 (4개)

편집기 탭 구조:

| 탭 | 아이콘 | 설명 | 조건부 표시 |
|----|--------|------|-------------|
| Elements (Questions) | Rows3 | 질문/블록 편집 | 항상 표시 |
| Styling | Paintbrush | 스타일 커스터마이징 | 프로젝트의 스타일 오버라이드 허용 설정이 true일 때만 |
| Settings | Settings | 설문 설정 | CX 모드에서 숨김 |
| Follow-ups | Mail | 후속 조치 이메일 | 항상 표시 (Pro 배지) |

CX 모드에서는 Settings 탭이 숨겨지고, Styling 탭은 프로젝트의 스타일 오버라이드 허용 설정에 따라 표시.

#### 4.3 SurveyMenuBar

주요 기능:
- **설문 이름 편집**: 인라인 Input 필드
- **자동 저장 표시기**: Draft 상태 시 자동 저장 상태 표시
- **Save as Draft 버튼**: Draft 상태 유지하며 저장
- **Publish/Update 버튼**: 설문 발행 또는 업데이트
- **뒤로가기**: 설문 목록으로 이동
- **설정 바로가기**: Settings 탭으로 이동

발행 시 유효성 검증:
- 설문 유효성 검증 함수 호출로 스키마 검증
- 실패 시 유효하지 않은 Element 목록 설정 -- 해당 질문 카드에 빨간 표시

### Block 아키텍처

#### 4.4 Block 구조

Block 데이터 모델:

| 필드 | 타입 | 설명 |
|------|------|------|
| ID | CUID | 고유 식별자 |
| 이름 | 문자열 (최소 1자) | Block 이름 (예: "Block 1") |
| Element 목록 | Element 배열 (최소 1개) | 포함된 질문 목록 |
| 로직 | Block Logic 배열 (선택) | 조건부 로직 |
| 로직 Fallback | Block ID (선택) | 조건 미충족 시 이동할 Block |
| 버튼 라벨 | 다국어 문자열 (선택) | 다음 버튼 텍스트 |
| 뒤로가기 버튼 라벨 | 다국어 문자열 (선택) | 이전 버튼 텍스트 |

Block 특성:
- 각 Block은 1개 이상의 Element(질문)를 포함
- Block 내 Element ID는 고유해야 함 (검증 수행)
- Block 이름은 자동 넘버링 ("Block 1", "Block 2", ...)
- Logic은 Block 레벨에서 정의 (Element 레벨이 아님)
- 로직 Fallback: 조건 미충족 시 이동할 Block ID

#### 4.5 Block Logic

Block Logic은 조건과 액션으로 구성:

| 필드 | 설명 |
|------|------|
| ID | 고유 식별자 |
| 조건 | 조건 그룹 (ConditionGroup) |
| 액션 | Block Logic Action 배열 |

Block Logic Action 유형:

| Action 유형 | 설명 | Target |
|-------------|------|--------|
| calculate | 변수 값 계산 | 변수 ID + 연산자 + 값 |
| requireAnswer | 특정 Element 필수 응답 설정 | Element ID |
| jumpToBlock | 다른 Block으로 이동 | Block ID (CUID) |

#### 4.6 Block 연산

Block 관리에 사용되는 주요 연산:

| 연산 | 설명 |
|------|------|
| Block 추가 | 새 Block을 설문에 추가 (선택적으로 인덱스 지정) |
| Block 삭제 | 지정 Block 삭제 |
| Block 복제 | 지정 Block을 복제하여 추가 |
| Block 이동 | 지정 Block을 위/아래로 이동 |
| Block 이름 재정렬 | 모든 Block 이름을 "Block 1", "Block 2", ... 형식으로 재정렬 |
| Element 위치 찾기 | 특정 Element의 Block 위치 조회 |
| Block 내 Element 추가 | 지정 Block에 Element 추가 |
| Block 내 Element 삭제 | 지정 Block에서 Element 삭제 |
| Block 내 Element 이동 | Block 내에서 Element 순서 변경 |
| Block 내 Element 수정 | Element 속성 업데이트 |
| Element ID 고유성 검증 | 전체 Block에서 Element ID 중복 검사 |

### Elements View

#### 4.7 ElementsView 구성

Elements View의 상위->하위 구조:

1. **다국어 설정 카드** - 다국어 설정
2. **Welcome Card 편집** - 환영 카드 편집
3. **Block 목록** (드래그 앤 드롭 컨텍스트)
   - Block Card #1
     - Element #1 (질문 폼)
     - Element 추가 버튼
     - Element #2
     - Block 설정 (Logic, Labels)
   - Block Card #2
   - ...
   - 새 Element 추가 버튼 (새 블록 추가)
4. **Ending Card #1** - 종료 카드
5. **Ending Card #2** - 종료 카드
6. **Ending Card 추가 버튼**
7. **Hidden Fields 카드**
8. **Survey Variables 카드**

#### 4.8 드래그 앤 드롭

- **Block 단위 정렬**: Block 간 드래그 앤 드롭으로 순서 변경
- **Element 단위 이동**: Block 내 Element 순서 변경
- **포인터 기반 드래그 감지**: 포인터 센서 사용
- **가장 가까운 코너 기반 드롭 타겟 결정**: 드롭 위치 판단
- **수직 리스트 정렬 전략**: 수직 방향 정렬
- Ending Card도 드래그 앤 드롭 재정렬 가능

### Welcome Card

#### 4.9 Welcome Card 속성 (7가지)

| # | 속성 | UI 컴포넌트 | 설명 |
|---|------|-------------|------|
| 1 | 활성화 | Switch | Welcome Card 활성화/비활성화 |
| 2 | 제목 | 텍스트 입력 | 제목 (활성화 시 필수) |
| 3 | 부제목 | 텍스트 입력 | 부제목/환영 메시지 |
| 4 | 파일 URL | 파일 입력 | 회사 로고/이미지 (png, jpeg, jpg, webp, heic) |
| 5 | 버튼 라벨 | 텍스트 입력 | 다음 버튼 라벨 (최대 48자) |
| 6 | 예상 완료 시간 | Switch | 예상 완료 시간 표시 토글 |
| 7 | 응답 수 표시 | Switch | 응답 수 표시 토글 (link 타입만) |

Welcome Card 제약 조건:
- 활성화 시 제목(headline) 필수
- 버튼 라벨 최대 길이: **48자**
- 응답 수 표시는 link 타입 설문에서만 UI에 표시
- 파일 URL 허용 확장자: png, jpeg, jpg, webp, heic
- 비디오 URL 지원 (비디오 삽입 가능)

Welcome Card는 편집기에서 활성 Element ID가 "start"일 때 활성화.

### Endings

#### 4.10 Ending Card 2가지 유형

2가지 유형의 종료 카드:
- **Ending Card** (endScreen): 종료 화면에 메시지 및 CTA 표시
- **Redirect to URL** (redirectToUrl): 지정 URL로 리다이렉트

OptionsSwitch로 유형 전환 (endScreen <-> redirectToUrl).

#### 4.11 End Screen (endScreen) 폼

| 필드 | UI 컴포넌트 | 설명 |
|------|-------------|------|
| 제목 | 텍스트 입력 | 종료 화면 제목 |
| 부제목 | 텍스트 입력 | 종료 화면 부제목 |
| 버튼 라벨 | 텍스트 입력 | CTA 버튼 라벨 |
| 버튼 링크 | URL 입력 | CTA 버튼 링크 URL |
| 이미지 | 파일 입력 | 이미지/비디오 |

- CTA 표시를 토글(Switch)로 활성화/비활성화 가능
- Recall 지원 (이전 질문 응답을 Ending Card에 표시)

#### 4.12 Redirect to URL (redirectToUrl) 폼

| 필드 | UI 컴포넌트 | 설명 |
|------|-------------|------|
| URL | URL 입력 (Recall 지원) | 리다이렉트 URL |
| 라벨 | 텍스트 입력 | 라벨 (내부 관리용) |

- Recall 지원: URL 내에 이전 응답 값 삽입 가능
- URL 플레이스홀더: "https://formbricks.com"

#### 4.13 Ending Card 관리

- 여러 개의 Ending Card 추가 가능
- 드래그 앤 드롭으로 Ending Card 재정렬
- Ending Card 삭제 시 확인 모달 표시
- Logic에서 사용 중인 Ending Card 삭제 시 경고 토스트
- Quota에서 사용 중인 Ending Card 삭제 시 경고 토스트

### Block Card

#### 4.14 BlockCard 구성

BlockCard 레이아웃 구조:

1. **Block Header** (접기/펼치기 가능)
   - 드래그 핸들
   - 접기/펼치기 아이콘
   - Block 이름 표시
   - Block 메뉴 (더보기)
2. **Block Body** (접기/펼치기 Content)
   - Element #1 (질문 폼 - 유형별 렌더링)
     - 편집 카드 메뉴 (복제, 삭제, 이동 등)
     - 유형별 Form 컴포넌트
     - 고급 설정
       - Element ID 편집
       - Validation Rules Editor
     - Element 추가 버튼
   - Element #2
   - ...
3. **Block 설정**
   - 버튼 라벨 / 뒤로가기 버튼 라벨
   - 조건부 로직 편집
   - 로직 Fallback 설정
4. **Block 메뉴**
   - Block 복제
   - Block 삭제
   - Block 이동 (위/아래)

#### 4.15 유형별 Element Form 컴포넌트

BlockCard는 Element의 유형에 따라 해당 폼 컴포넌트를 렌더링:

| Element Type | Form 컴포넌트 |
|-------------|---------------|
| openText | OpenElementForm |
| multipleChoiceSingle/Multi | MultipleChoiceElementForm |
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

### Question ID (Element ID) 편집

#### 4.16 Element ID 편집

Element ID 편집 기능:
- 현재 ID 편집 + 저장 버튼
- 유효성 검증 수행
- draft 상태가 아닌 설문에서 기존 Element(isDraft=false)는 ID 편집 불가

ID 변경 유효성 검증:
1. 금지된 ID 검증
2. 공백 불허
3. 영문/숫자/하이픈/언더스코어만 허용
4. 다른 Element ID와 중복 불허
5. Ending Card ID와 중복 불허
6. Hidden Field ID와 중복 불허

**prefill/startAt 활용**:
- 사용자가 설정한 Element ID를 URL 파라미터로 사용 가능
- 예: ?startAt=customQuestionId -- 해당 질문부터 시작
- 예: ?customQuestionId=value -- 해당 질문에 값 사전 입력 (prefill)

Element ID 편집 제한:
- draft 상태의 설문: 모든 Element ID 편집 가능
- 발행된 설문: 새로 추가된 Element (isDraft=true)만 편집 가능

### Hidden Fields & Variables

#### 4.17 HiddenFieldsCard

- Hidden Fields 활성화/비활성화 토글
- Field ID 추가/삭제
- ID 유효성 검증 (금지 ID, 패턴, 중복)

#### 4.18 SurveyVariablesCard

- 변수 추가 (number 또는 text 유형)
- 변수 이름/값 편집
- 변수 삭제
- Logic에서 사용 중인 변수 삭제 시 경고

### Validation Rules 편집기

#### 4.19 ValidationRulesEditor

Validation Rules 편집기 관련 UI 컴포넌트:
- 개별 규칙 행: 각 validation rule 표시 및 편집
- 규칙 유형 선택: 적용할 validation rule 유형 선택
- 규칙 값 입력: 규칙 파라미터 값 입력
- 필드 선택: Address/ContactInfo의 대상 필드 선택
- AND/OR 로직 선택: validation logic 방식 선택
- 입력 유형 선택: 입력 유형 선택
- 단위 선택: 단위 선택

### 기타 편집기 컴포넌트

#### 4.20 Settings View

Settings 탭의 하위 카드:
- **배포 방식 설정 카드**: 설문 배포 방식 설정 (link/app 전환)
- **트리거 설정 카드**: 트리거 설정 (app 타입일 때)
- **응답 옵션 카드**: 응답 옵션 (autoComplete, 표시 옵션 등)
- **재접촉 설정 카드**: 재접촉 설정
- **설문 배치 설정 카드**: 위젯 배치 설정 (프로젝트 오버라이드)
- **타겟팅 설정 카드**: 타겟팅/세그먼트 설정

#### 4.21 Styling View

- 폼 스타일 설정
- 로고 설정 카드
- 배경 설정: 애니메이션 배경, 색상 배경, 이미지 배경
- Unsplash 이미지 검색 통합

#### 4.22 실시간 프리뷰

프리뷰 기능:
- 활성 Element에 맞춰 프리뷰 자동 스크롤
- app 타입은 modal 프리뷰, link 타입은 fullwidth 프리뷰
- 선택된 언어로 프리뷰 표시
- 스팸 방지 설정 및 공개 도메인 정보 반영

## 5. 비기능 요구사항

| 항목 | 요구사항 |
|------|----------|
| 반응형 | 프리뷰 패널은 md 이상에서만 표시 (모바일 숨김) |
| 성능 | Ref 기반 자동 저장으로 불필요한 리렌더링 방지 |
| 애니메이션 | 목록 애니메이션 지원 |
| 접근성 | 접기/펼치기 컴포넌트에 aria-expanded 상태 반영 |
| UX | 삭제 전 확인 모달, Logic에서 사용 중인 항목 삭제 시 경고 |

## 6. 정책/제약

| 정책 | 값 |
|------|-----|
| Welcome Card 버튼 라벨 최대 길이 | 48자 |
| Block 내 최소 Element 수 | 1개 |
| Block 이름 자동 포맷 | "Block {N}" |
| Ending Card 유형 수 | 2가지 (endScreen, redirectToUrl) |
| 편집기 탭 수 | 4개 (Elements, Styling, Settings, Follow-Ups) |
| 프리뷰 패널 너비 | 1/3 |
| 메인 편집 패널 너비 | 2/3 |
| app 타입 프리뷰 모드 | modal |
| link 타입 프리뷰 모드 | fullwidth |
| Element ID 편집 가능 조건 | draft 상태 또는 isDraft=true인 Element |
| Welcome Card 활성 ID | "start" |
| 응답 수 표시 조건 | 설문 유형이 link일 때 |
| Welcome Card 이미지 허용 확장자 | png, jpeg, jpg, webp, heic |
| Redirect URL 플레이스홀더 | "https://formbricks.com" |
| 드래그 앤 드롭 전략 | 수직 리스트 정렬, 가장 가까운 코너 기반 |

## 7. 수용 기준 (Acceptance Criteria)

1. **AC-014-01**: 편집기는 Elements, Styling, Settings, Follow-Ups 4개 탭으로 구성된다.
2. **AC-014-02**: Styling 탭은 프로젝트의 스타일 오버라이드 허용이 true일 때만 표시된다.
3. **AC-014-03**: CX 모드에서는 Settings 탭이 숨겨진다.
4. **AC-014-04**: Welcome Card의 버튼 라벨은 최대 48자까지 입력 가능하다.
5. **AC-014-05**: Welcome Card가 활성화되면 제목이 필수이다.
6. **AC-014-06**: 응답 수 표시 토글은 link 타입 설문에서만 표시된다.
7. **AC-014-07**: Ending Card는 endScreen 또는 redirectToUrl 유형으로 전환 가능하다.
8. **AC-014-08**: Ending Card는 드래그 앤 드롭으로 재정렬 가능하다.
9. **AC-014-09**: Block은 최소 1개의 Element를 포함해야 한다.
10. **AC-014-10**: Block 이름은 삭제/이동/복제 후 자동으로 "Block 1", "Block 2", ... 형식으로 재정렬된다.
11. **AC-014-11**: Block 단위로 드래그 앤 드롭 재정렬이 가능하다.
12. **AC-014-12**: Element ID는 draft 상태의 설문에서만 편집 가능하다 (발행 후에는 새로 추가된 Element만).
13. **AC-014-13**: Element ID 변경 시 금지 ID, 중복, 패턴 검증이 수행된다.
14. **AC-014-14**: 실시간 프리뷰는 활성 요소에 맞춰 자동 업데이트된다.
15. **AC-014-15**: app 타입 설문은 modal 프리뷰, link 타입 설문은 fullwidth 프리뷰로 표시된다.
16. **AC-014-16**: Block Logic은 calculate, requireAnswer, jumpToBlock 3가지 Action을 지원한다.
17. **AC-014-17**: Logic에서 사용 중인 Block/Element/Ending 삭제 시 경고가 표시된다.
18. **AC-014-18**: Validation Rules Editor는 Element 유형에 맞는 규칙만 선택 가능하다.
19. **AC-014-19**: Hidden Field ID와 Variable name은 고유성 및 패턴 검증을 통과해야 한다.
20. **AC-014-20**: Recall 기능으로 이전 질문 응답을 Ending Card URL/텍스트에 삽입할 수 있다.
