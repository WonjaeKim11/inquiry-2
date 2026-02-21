# 기능 명세서 (Functional Specification)

# 링크 공유 및 임베드

---

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | v1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-016 (링크 공유 및 임베드 요구사항 명세서), FR-024 |
| 상태 | 초안 |

---

## 2. 개요

### 2.1 목적

Inquiry Link Survey의 공유 및 임베드 기능에 대한 상세 동작을 정의한다. Share Modal을 통한 다양한 배포 채널 관리, 링크 설문 페이지의 렌더링 파이프라인, 임베드 모드, Pretty URL, OG Meta Tags 생성, 스타일링 결정 로직, 다국어 지원, 커스텀 스크립트 주입 등의 기능을 포함한다.

### 2.2 범위

**포함 범위:**
- Share Modal 10개 탭 구성 및 동작
- 링크 설문 페이지 3단계 렌더링 파이프라인
- embed 파라미터 기반 임베드 모드
- Pretty URL (/p/{slug}) -- Self-hosted only
- OG Meta Tags 자동 생성 및 링크 프리뷰
- iframe 완료 이벤트 (formbricksSurveyCompleted)
- lang 파라미터 기반 다국어 지원
- 설문 스타일링 결정 로직
- 커스텀 스크립트 주입 -- Self-hosted only
- Viewport 설정

**제외 범위:**
- Single-use 링크 (FSD-017)
- PIN/이메일 검증 (FSD-018)
- SDK 기반 인앱 설문 배포
- 응답 데이터 저장 및 분석

### 2.3 대상 사용자

| 역할 | 설명 |
|------|------|
| Survey Creator | 설문 생성 후 배포 채널을 선택하고 링크를 공유하는 사용자 |
| Survey Respondent | 링크를 통해 설문에 접근하여 응답하는 최종 사용자 |
| Website Owner | 자사 웹사이트에 설문을 iframe으로 임베드하는 사용자 |
| Organization Admin | Pretty URL, Custom HTML 등 고급 설정을 관리하는 관리자 |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| Link Survey | 고유 URL을 통해 배포되는 설문 타입. /s/{surveyId} 경로로 접근 |
| Share Modal | 설문 배포 채널을 통합 관리하는 모달 UI 컴포넌트 |
| embed 파라미터 | URL 쿼리 파라미터 (?embed=true)로 임베드 모드를 활성화하는 플래그 |
| Pretty URL | /p/{slug} 형태의 사용자 정의 URL. Self-hosted 환경 전용 |
| OG Meta Tags | Open Graph 프로토콜 기반 메타데이터. 소셜 미디어 등에서 링크 프리뷰에 사용 |
| Single-use Link | 1회 응답만 허용하는 고유 링크. suId 파라미터로 식별 |
| Slug | Pretty URL에 사용되는 사용자 정의 경로 문자열 |
| fullSizeCards | 설문 카드가 화면 전체를 차지하도록 하는 렌더링 옵션 |
| Card Arrangement | 설문 카드의 배치 방식. "straight" 또는 "casual" 옵션 |
| Welcome Card | 설문 시작 시 표시되는 인트로 카드 |
| Link Metadata | 설문에 커스텀으로 설정된 제목, 설명, OG 이미지 정보 |
| Whitelabel | 조직 브랜딩을 적용하는 기능 (favicon 등) |

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
[Survey Creator]
       |
       v
  [Share Modal]
       |
       +---> Anonymous Links --- 설문 URL 복사/공유
       +---> Personal Links ---- Contact 기반 개인화 링크 (Enterprise)
       +---> Website Embed ----- iframe 임베드 코드 생성
       +---> Email ------------- 이메일 발송
       +---> Social Media ------ 소셜 미디어 공유
       +---> QR Code ----------- QR 코드 생성/다운로드
       +---> Dynamic Popup ----- 동적 팝업 설정
       +---> Link Settings ----- OG Image, 메타데이터 설정
       +---> Pretty URL -------- /p/{slug} 설정 (Self-hosted)
       +---> Custom HTML ------- 커스텀 스크립트 주입 (Self-hosted)
       |
       v
  [Survey Respondent] ---> /s/{surveyId} 또는 /p/{slug}
       |
       v
  [렌더링 파이프라인]
       |
       +---> Stage 1: Survey 조회 (캐싱)
       +---> Stage 2: Environment, Locale, Single-use 병렬 조회
       +---> Stage 3: Multi-language Permission 확인
       |
       v
  [설문 페이지 렌더링]
       |
       +---> 일반 모드: 배경 + 로고 + 설문 + 푸터
       +---> 임베드 모드: 설문만 렌더링 (embed=true)
       |
       v
  [설문 완료]
       |
       +---> iframe인 경우: formbricksSurveyCompleted 메시지 전송
```

### 3.2 주요 기능 목록 (Feature List)

| 기능 ID | 기능명 | 우선순위 | 라이선스 |
|---------|--------|---------|---------|
| FN-016-01 | Share Modal 탭 구성 | 높음 | Community |
| FN-016-02 | 링크 설문 페이지 렌더링 파이프라인 | 높음 | Community |
| FN-016-03 | 임베드 모드 (embed=true) | 높음 | Community |
| FN-016-04 | iframe 완료 이벤트 | 높음 | Community |
| FN-016-05 | Pretty URL (/p/{slug}) | 중간 | Self-hosted Only |
| FN-016-06 | OG Meta Tags 생성 | 중간 | Community |
| FN-016-07 | 스타일링 결정 로직 | 중간 | Community |
| FN-016-08 | 언어 코드 결정 | 중간 | Community |
| FN-016-09 | 커스텀 스크립트 주입 | 낮음 | Self-hosted Only |
| FN-016-10 | Viewport 설정 | 높음 | Community |

### 3.3 기능 간 관계도

```
FN-016-01 (Share Modal)
    |
    +---> FN-016-05 (Pretty URL) --- Pretty URL 탭
    +---> FN-016-09 (커스텀 스크립트) --- Custom HTML 탭
    +---> FN-016-03 (임베드 모드) --- Website Embed 탭에서 코드 생성
    |
FN-016-02 (렌더링 파이프라인)
    |
    +---> FN-016-06 (OG Meta Tags) --- Stage 1에서 Survey 데이터 공유
    +---> FN-016-07 (스타일링 결정) --- Stage 2 이후 스타일 적용
    +---> FN-016-08 (언어 코드 결정) --- Stage 2에서 Locale 결정
    +---> FN-016-10 (Viewport 설정) --- 페이지 메타데이터 설정
    +---> FN-016-03 (임베드 모드) --- embed 파라미터에 따른 렌더링 분기
    +---> FN-016-09 (커스텀 스크립트) --- Self-hosted 시 스크립트 주입
    |
FN-016-04 (iframe 완료 이벤트)
    |
    +---> FN-016-03 (임베드 모드) --- iframe 내 설문 완료 시 이벤트 발화
```

---

## 4. 상세 기능 명세

### 4.1 Share Modal 탭 구성

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-016-01 |
| 기능명 | Share Modal 탭 구성 |
| 관련 요구사항 ID | FR-024-01 |
| 우선순위 | 높음 |
| 기능 설명 | Link Survey 타입의 설문에 대해 다양한 배포 채널을 통합 관리하는 Share Modal을 제공한다. 환경(Cloud/Self-hosted)과 설문 설정(Single-use 여부)에 따라 탭의 표시/비활성화 상태가 결정된다. |

#### 4.1.2 선행 조건 (Preconditions)

- 사용자가 해당 프로젝트에 대한 접근 권한을 보유하고 있어야 한다.
- 설문 타입이 "link"이어야 한다.
- 설문이 draft 상태가 아닌 활성(published) 상태여야 한다.

#### 4.1.3 후행 조건 (Postconditions)

- Share Modal이 열리며 해당 환경 및 설문 설정에 맞는 탭이 표시된다.
- 사용자는 각 탭에서 해당 배포 채널의 공유 기능을 사용할 수 있다.

#### 4.1.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Survey Creator | 설문 관리 화면에서 "Share" 버튼을 클릭한다 |
| 2 | 시스템 | 현재 환경(Cloud/Self-hosted) 및 설문 설정(Single-use 여부)을 확인한다 |
| 3 | 시스템 | 환경에 따른 탭 필터링을 수행한다 (Cloud 환경이면 Pretty URL, Custom HTML 탭 제외) |
| 4 | 시스템 | Single-use 활성 여부에 따른 탭 비활성화를 수행한다 |
| 5 | 시스템 | 필터링된 탭 목록으로 Share Modal을 렌더링한다 |
| 6 | Survey Creator | 원하는 탭을 선택하여 해당 배포 채널의 기능을 사용한다 |

#### 4.1.5 대안 흐름 (Alternative Flow)

**AF-01: Inquiry Cloud 환경**
- 단계 3에서 Pretty URL 탭과 Custom HTML 탭이 탭 목록에서 제외된다.
- 나머지 8개 탭만 표시된다.

**AF-02: Single-use 링크 활성 상태**
- 단계 4에서 Personal Links, Website Embed, Email, Social Media, QR Code 탭이 비활성화된다.
- 비활성화된 탭은 시각적으로 비활성 상태를 표시하며 클릭 시 동작하지 않는다.

#### 4.1.6 예외 흐름 (Exception Flow)

**EX-01: 설문 타입이 link가 아닌 경우**
- Share Modal 대신 해당 설문 타입에 적합한 배포 UI를 표시한다.

**EX-02: 사용자 권한 부족**
- Share 버튼이 비활성화되거나 권한 부족 메시지를 표시한다.

#### 4.1.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-01-01 | 환경 == Cloud | Pretty URL, Custom HTML 탭 제외 |
| BR-01-02 | Single-use == true | Personal Links, Website Embed, Email, Social Media, QR Code 탭 비활성화 |
| BR-01-03 | 환경 == Self-hosted AND Single-use == false | 10개 탭 모두 표시 |

#### 4.1.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| surveyId | string (UUID) | Y | 유효한 설문 ID |
| surveyType | enum | Y | "link" 타입만 허용 |
| isSingleUse | boolean | Y | - |
| environment | enum | Y | "cloud" 또는 "self-hosted" |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| visibleTabs | Tab[] | 표시할 탭 목록 |
| disabledTabs | Tab[] | 비활성화할 탭 목록 |

#### 4.1.9 화면/UI 요구사항

- Share Modal은 모달 형태로 화면 중앙에 표시된다.
- 탭 내비게이션은 모달 상단에 위치하며, 탭 간 전환이 가능해야 한다.
- 공유 방식 탭 7개 (Anonymous Links, Personal Links, Website Embed, Email, Social Media, QR Code, Dynamic Popup)와 설정 탭 3개 (Link Settings, Pretty URL, Custom HTML)가 구분되어야 한다.
- 비활성화된 탭은 시각적으로 비활성 상태(grayed out 등)를 표현해야 한다.

#### 4.1.10 비기능 요구사항

- Share Modal은 열릴 때 200ms 이내에 렌더링되어야 한다.

---

### 4.2 링크 설문 페이지 렌더링 파이프라인

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-016-02 |
| 기능명 | 링크 설문 페이지 렌더링 파이프라인 |
| 관련 요구사항 ID | FR-024-02 |
| 우선순위 | 높음 |
| 기능 설명 | 링크 설문 페이지 접근 시 최적화된 3단계 데이터 페칭 전략을 통해 설문 페이지를 렌더링한다. 요청 수준 캐싱을 활용하여 동일 요청 내 중복 쿼리를 제거하고, 200-600ms 수준의 응답 시간을 달성한다. |

#### 4.2.2 선행 조건 (Preconditions)

- 유효한 설문 URL (/s/{surveyId} 또는 /p/{slug})로 접근해야 한다.
- 설문이 존재하고 "link" 타입이어야 한다.
- 설문 상태가 draft가 아니어야 한다.

#### 4.2.3 후행 조건 (Postconditions)

- 설문 페이지가 렌더링되어 응답자에게 표시된다.
- OG Meta Tags가 HTML head에 포함된다.
- 설문 스타일링 및 언어가 적용된다.

#### 4.2.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Respondent | /s/{surveyId} 또는 /p/{slug} URL로 접근한다 |
| 2 | 시스템 | URL 파라미터를 파싱한다 (suId, verify, lang, embed, preview) |
| 3 | 시스템 | **Stage 1**: Survey 데이터를 조회한다 (요청 수준 캐싱 적용) |
| 4 | 시스템 | Survey 데이터가 유효한지 검증한다 (존재 여부, 타입, 상태) |
| 5 | 시스템 | **Stage 2**: 다음 3개 쿼리를 병렬로 실행한다: (a) Environment Context 조회, (b) Locale 결정, (c) Single-use Response 조회 |
| 6 | 시스템 | **Stage 3**: Stage 2의 billing 정보를 기반으로 Multi-language Permission을 확인한다 |
| 7 | 시스템 | 스타일링 결정 로직을 적용한다 (FN-016-07 참조) |
| 8 | 시스템 | embed 파라미터에 따라 렌더링 모드를 결정한다 (FN-016-03 참조) |
| 9 | 시스템 | OG Meta Tags를 생성하여 HTML head에 삽입한다 (FN-016-06 참조) |
| 10 | 시스템 | 설문 페이지를 렌더링하여 응답자에게 반환한다 |

#### 4.2.5 대안 흐름 (Alternative Flow)

**AF-01: Pretty URL (/p/{slug})로 접근**
- 단계 1에서 /p/{slug} 경로를 감지하고 slug를 기반으로 해당 surveyId를 조회한다.
- 이후 단계 3부터 동일하게 진행한다.

**AF-02: preview=true 파라미터**
- 미리보기 모드로 렌더링한다.
- 커스텀 스크립트 주입이 비활성화된다.
- 미리보기 배너가 표시된다 (임베드 모드가 아닌 경우).

**AF-03: lang 파라미터 지정**
- 단계 5(b)에서 lang 파라미터 값으로 Locale을 결정한다 (FN-016-08 참조).

#### 4.2.6 예외 흐름 (Exception Flow)

**EX-01: 설문이 존재하지 않는 경우**
- 단계 4에서 설문을 찾을 수 없으면 404 Not Found 페이지를 반환한다.

**EX-02: 설문이 draft 상태인 경우**
- 단계 4에서 설문 상태가 draft이면 404 Not Found 페이지를 반환한다.

**EX-03: 설문 타입이 link가 아닌 경우 (예: app 타입)**
- 단계 4에서 설문 타입이 link가 아니면 404 Not Found 페이지를 반환한다.

**EX-04: Pretty URL slug가 매칭되지 않는 경우**
- AF-01의 slug 조회에서 매칭되는 설문이 없으면 404 Not Found 페이지를 반환한다.

#### 4.2.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-02-01 | 설문 상태 == draft | 404 반환 |
| BR-02-02 | 설문 타입 != link | 404 반환 |
| BR-02-03 | Survey 조회 결과 없음 | 404 반환 |
| BR-02-04 | Stage 1 Survey 조회 | 요청 수준 캐싱 적용 (메타데이터 생성과 컴포넌트 간 중복 제거) |
| BR-02-05 | Stage 2 쿼리 | Environment, Locale, Single-use를 병렬 실행 |
| BR-02-06 | Stage 3 실행 | Stage 2의 billing 정보 의존, 순차 실행 |

#### 4.2.8 데이터 요구사항

**입력 데이터 (URL 파라미터):**

| 필드명 | 타입 | 필수 | 유효성 검증 | 설명 |
|--------|------|------|------------|------|
| surveyId | string (UUID) | Y (URL path) | 유효한 UUID 형식 | 설문 식별자 |
| suId | string | N | - | Single-use ID |
| verify | string | N | - | 이메일 인증 토큰 |
| lang | string | N | ISO 639-1 언어 코드 | 언어 코드 |
| embed | string ("true") | N | "true" 값만 유효 | 임베드 모드 플래그 |
| preview | string ("true") | N | "true" 값만 유효 | 미리보기 모드 플래그 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| HTML 페이지 | text/html | 렌더링된 설문 페이지 (OG Meta 포함) |

#### 4.2.9 화면/UI 요구사항

- 일반 모드: MediaBackground + ClientLogo + 설문 카드 + LegalFooter + 미리보기 배너(preview 시)
- 임베드 모드: 설문 카드만 렌더링 (FN-016-03 참조)
- Card Arrangement: "straight" 또는 "casual" 옵션에 따라 카드 배치
- 최대 너비 기반 설문 카드로 모바일/데스크톱 반응형 대응

#### 4.2.10 비기능 요구사항

- 페이지 로딩 시간: 200-600ms (3단계 최적화 파이프라인 적용)
- 요청 수준 캐싱을 통한 동일 요청 내 Survey 조회 중복 제거

---

### 4.3 임베드 모드 (embed=true)

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-016-03 |
| 기능명 | 임베드 모드 |
| 관련 요구사항 ID | FR-024-03 |
| 우선순위 | 높음 |
| 기능 설명 | URL에 embed=true 파라미터가 포함된 경우 배경, 로고, 법적 고지 푸터, 미리보기 배너를 모두 제거하고 설문 컨텐츠만 렌더링한다. iframe 내 임베드에 최적화된 모드이다. |

#### 4.3.2 선행 조건 (Preconditions)

- URL 쿼리 파라미터에 embed=true가 포함되어야 한다.
- 설문이 유효하고 접근 가능한 상태여야 한다.

#### 4.3.3 후행 조건 (Postconditions)

- 설문 카드만 렌더링된다 (배경, 로고, 푸터 미표시).
- fullSizeCards 옵션이 true로 설정된다.
- iframe 내 Autofocus가 비활성화된다.

#### 4.3.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | URL 쿼리 파라미터에서 embed 값을 파싱한다 |
| 2 | 시스템 | embed == "true"이면 임베드 모드를 활성화한다 |
| 3 | 시스템 | MediaBackground 컴포넌트를 렌더링하지 않는다 |
| 4 | 시스템 | ClientLogo 컴포넌트를 렌더링하지 않는다 |
| 5 | 시스템 | LegalFooter 컴포넌트를 렌더링하지 않는다 |
| 6 | 시스템 | 미리보기 배너를 렌더링하지 않는다 |
| 7 | 시스템 | fullSizeCards를 true로 설정하여 설문 카드를 렌더링한다 |
| 8 | 시스템 | Autofocus를 비활성화한다 (iframe 내 포커스 이슈 방지) |

#### 4.3.5 대안 흐름 (Alternative Flow)

**AF-01: embed 파라미터가 없거나 "true"가 아닌 경우**
- 일반 모드로 렌더링한다 (배경 + 로고 + 설문 + 푸터 모두 표시).
- fullSizeCards는 false로 설정된다.

#### 4.3.6 예외 흐름 (Exception Flow)

해당 없음. embed 파라미터는 단순 플래그이므로 별도의 예외 상황이 발생하지 않는다.

#### 4.3.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-03-01 | embed == "true" | MediaBackground, ClientLogo, LegalFooter, 미리보기 배너 비표시 |
| BR-03-02 | embed == "true" | fullSizeCards = true |
| BR-03-03 | embed == "true" | Autofocus 비활성화 |
| BR-03-04 | embed != "true" 또는 미지정 | 일반 모드 렌더링 (fullSizeCards = false) |

#### 4.3.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 | 설명 |
|--------|------|------|------------|------|
| embed | string | N | "true" 값만 임베드 모드 활성화 | URL 쿼리 파라미터 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| isEmbed | boolean | 임베드 모드 활성화 여부 |
| fullSizeCards | boolean | 전체 크기 카드 사용 여부 |

#### 4.3.9 화면/UI 요구사항

**임베드 모드 vs 일반 모드 렌더링 요소 비교:**

| UI 요소 | 일반 모드 | 임베드 모드 |
|---------|----------|------------|
| MediaBackground | 표시 | 미표시 |
| ClientLogo | 표시 | 미표시 |
| LegalFooter | 표시 | 미표시 |
| 미리보기 배너 | 표시 (preview 시) | 미표시 |
| fullSizeCards | false | true |
| Autofocus | 활성화 | 비활성화 |

#### 4.3.10 비기능 요구사항

- 임베드 모드는 비렌더링 요소를 제거하므로 일반 모드 대비 더 빠른 렌더링이 기대된다.

---

### 4.4 iframe 완료 이벤트

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-016-04 |
| 기능명 | iframe 완료 이벤트 |
| 관련 요구사항 ID | FR-024-04 |
| 우선순위 | 높음 |
| 기능 설명 | 설문 완료 시 부모 윈도우에 postMessage API를 통해 완료 이벤트를 전송한다. 이를 통해 임베드한 웹사이트에서 설문 완료를 감지하고 후속 동작을 수행할 수 있다. |

#### 4.4.2 선행 조건 (Preconditions)

- 설문이 iframe 내에서 실행 중이어야 한다.
- 응답자가 설문에 대한 응답을 완료해야 한다.

#### 4.4.3 후행 조건 (Postconditions)

- 부모 윈도우에 "formbricksSurveyCompleted" 메시지가 전달된다.

#### 4.4.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Respondent | 설문의 마지막 질문에 응답하고 제출한다 |
| 2 | 시스템 | 응답 데이터 전송이 완료되었는지 확인한다 |
| 3 | 시스템 | 설문 종료 상태가 충족되었는지 확인한다 |
| 4 | 시스템 | 두 조건이 모두 충족되면 window.parent.postMessage("formbricksSurveyCompleted", "*")를 호출한다 |
| 5 | 부모 윈도우 | message 이벤트를 수신하고 후속 동작을 수행한다 |

#### 4.4.5 대안 흐름 (Alternative Flow)

**AF-01: iframe이 아닌 일반 브라우저에서 접근한 경우**
- postMessage 호출은 동일하게 수행되나 수신 대상이 없으므로 무시된다.
- 설문 완료 후 일반적인 완료 화면이 표시된다.

#### 4.4.6 예외 흐름 (Exception Flow)

**EX-01: 응답 전송은 완료되었으나 설문 종료 상태가 충족되지 않은 경우**
- 이벤트를 발화하지 않는다.
- 설문 종료 상태가 충족될 때까지 대기한다.

**EX-02: 설문 종료 상태는 충족되었으나 응답 전송이 완료되지 않은 경우**
- 이벤트를 발화하지 않는다.
- 응답 전송이 완료될 때까지 대기한다.

#### 4.4.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-04-01 | 응답 전송 완료 AND 설문 종료 상태 충족 | "formbricksSurveyCompleted" 메시지 전송 |
| BR-04-02 | 응답 전송 미완료 OR 설문 종료 상태 미충족 | 메시지 전송하지 않음 |
| BR-04-03 | Target Origin | 와일드카드("*") 사용 (부모 윈도우 origin 불확실) |

#### 4.4.8 데이터 요구사항

**출력 데이터 (postMessage):**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| message | string | "formbricksSurveyCompleted" 고정 문자열 |
| targetOrigin | string | "*" (와일드카드) |

#### 4.4.9 화면/UI 요구사항

해당 없음. 이 기능은 백그라운드 이벤트 전송이다.

#### 4.4.10 비기능 요구사항

- targetOrigin에 와일드카드("*")를 사용하므로 민감한 데이터를 메시지에 포함하지 않아야 한다.
- 이벤트명 문자열만 전달하며 응답 데이터는 포함하지 않는다.

---

### 4.5 Pretty URL (/p/{slug})

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-016-05 |
| 기능명 | Pretty URL |
| 관련 요구사항 ID | FR-024-05 |
| 우선순위 | 중간 |
| 기능 설명 | Self-hosted 환경에서 사용자 정의 URL 슬러그를 통해 /p/{slug} 형태의 사용자 친화적 URL을 제공한다. Organization owner/manager 또는 projectTeam readWrite 이상 권한을 가진 사용자만 설정할 수 있다. |

#### 4.5.2 선행 조건 (Preconditions)

- 환경이 Self-hosted여야 한다 (Inquiry Cloud에서는 사용 불가).
- 사용자가 Organization owner/manager 또는 projectTeam readWrite 이상 권한을 보유해야 한다.
- 설문이 link 타입이어야 한다.

#### 4.5.3 후행 조건 (Postconditions)

- slug가 설문에 매핑되어 저장된다.
- {publicDomain}/p/{slug} 경로로 설문에 접근할 수 있다.

#### 4.5.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Organization Admin | Share Modal에서 Pretty URL 탭을 선택한다 |
| 2 | 시스템 | 현재 설문에 설정된 slug가 있으면 표시한다 |
| 3 | Organization Admin | 원하는 slug 값을 입력한다 |
| 4 | 시스템 | slug 유효성을 검증한다 (소문자 알파벳, 숫자, 하이픈만 허용) |
| 5 | 시스템 | slug 중복 여부를 확인한다 |
| 6 | 시스템 | slug를 설문에 매핑하여 저장한다 |
| 7 | 시스템 | Pretty URL ({publicDomain}/p/{slug})을 표시한다 |

#### 4.5.5 대안 흐름 (Alternative Flow)

**AF-01: 기존 slug 변경**
- 단계 2에서 기존 slug가 표시된 상태에서 사용자가 새 값을 입력한다.
- 기존 slug는 해제되고 새 slug가 매핑된다.
- 기존 Pretty URL은 더 이상 유효하지 않게 된다.

**AF-02: slug 삭제**
- 사용자가 slug 값을 빈 값으로 설정하거나 삭제 버튼을 클릭한다.
- 설문의 slug 매핑이 해제된다.
- 기본 URL (/s/{surveyId})로만 접근 가능하다.

#### 4.5.6 예외 흐름 (Exception Flow)

**EX-01: 유효하지 않은 slug 입력**
- 단계 4에서 소문자 알파벳, 숫자, 하이픈 이외의 문자(대문자, 특수문자, 공백 등)가 포함된 경우 유효성 검증 실패 메시지를 표시한다.
- slug 저장이 진행되지 않는다.

**EX-02: 중복된 slug**
- 단계 5에서 이미 다른 설문에 사용 중인 slug인 경우 중복 오류 메시지를 표시한다.
- slug 저장이 진행되지 않는다.

**EX-03: Cloud 환경에서 접근 시도**
- Share Modal에 Pretty URL 탭 자체가 표시되지 않는다 (FN-016-01의 BR-01-01).

**EX-04: 권한 부족**
- Organization owner/manager 또는 projectTeam readWrite 미만의 권한인 경우 slug 수정이 차단된다.

#### 4.5.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-05-01 | slug 문자 구성 | 소문자 알파벳(a-z), 숫자(0-9), 하이픈(-)만 허용 |
| BR-05-02 | 환경 == Cloud | Pretty URL 기능 사용 불가 |
| BR-05-03 | 권한 < owner/manager AND 권한 < readWrite | slug 수정 차단 |
| BR-05-04 | slug 중복 | 동일 slug가 이미 존재하면 저장 거부 |
| BR-05-05 | URL 패턴 | {publicDomain}/p/{slug} |

#### 4.5.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 | 설명 |
|--------|------|------|------------|------|
| slug | string | Y | 정규식: `^[a-z0-9-]+$` | 사용자 정의 URL 슬러그 |
| surveyId | string (UUID) | Y | 유효한 설문 ID | 매핑 대상 설문 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| prettyUrl | string | 완성된 Pretty URL ({publicDomain}/p/{slug}) |

#### 4.5.9 화면/UI 요구사항

- Pretty URL 탭에 slug 입력 필드를 제공한다.
- 입력 필드 옆에 완성된 URL 미리보기를 표시한다.
- 유효성 검증 실패 시 인라인 오류 메시지를 표시한다.
- 저장 성공 시 확인 메시지를 표시한다.

#### 4.5.10 비기능 요구사항

- slug 유효성 검증은 클라이언트 측에서 실시간으로 수행한다.
- slug 중복 확인은 서버 측에서 수행한다.

---

### 4.6 OG Meta Tags 생성

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-016-06 |
| 기능명 | OG Meta Tags 생성 |
| 관련 요구사항 ID | FR-024-06 |
| 우선순위 | 중간 |
| 기능 설명 | 링크 설문 페이지에 Open Graph 메타데이터를 자동 생성하여 소셜 미디어, 메신저 등에서 링크 프리뷰를 제공한다. 커스텀 Link Metadata, Welcome Card, Survey name 순으로 우선순위를 적용한다. |

#### 4.6.2 선행 조건 (Preconditions)

- 설문이 존재하고 link 타입이며 draft 상태가 아니어야 한다.
- 렌더링 파이프라인의 Stage 1에서 Survey 데이터가 조회되어야 한다.

#### 4.6.3 후행 조건 (Postconditions)

- HTML head에 Open Graph 및 Twitter Card 메타 태그가 포함된다.
- 검색 엔진 인덱싱은 비활성화된다 (noindex).

#### 4.6.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | Survey 데이터에서 커스텀 Link Metadata(제목, 설명, OG 이미지)를 확인한다 |
| 2 | 시스템 | 커스텀 Link Metadata가 존재하면 해당 값을 사용한다 |
| 3 | 시스템 | OG Meta Tags를 생성한다: og:title, og:description, og:url, og:image, og:locale, og:type |
| 4 | 시스템 | Twitter Card 태그를 생성한다: twitter:card = summary_large_image |
| 5 | 시스템 | SEO 태그를 설정한다: robots = noindex, follow / googlebot = noimageindex |
| 6 | 시스템 | 생성된 메타 태그를 HTML head에 삽입한다 |

#### 4.6.5 대안 흐름 (Alternative Flow)

**AF-01: 커스텀 Link Metadata가 설정되지 않은 경우**
- 단계 2에서 커스텀 메타데이터가 없으면 Welcome Card의 headline을 제목으로 사용한다.
- Welcome Card도 없으면 Survey name을 제목으로 사용한다.

**AF-02: OG 이미지가 설정되지 않은 경우**
- 기본 OG 이미지 API (/api/v1/client/og)를 통해 동적으로 이미지를 생성한다.

#### 4.6.6 예외 흐름 (Exception Flow)

해당 없음. 메타데이터 생성은 항상 fallback 값이 존재한다.

#### 4.6.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-06-01 | 메타데이터 우선순위 | 1순위: 커스텀 Link Metadata > 2순위: Welcome Card headline > 3순위: Survey name |
| BR-06-02 | SEO 설정 | robots: noindex, follow |
| BR-06-03 | Google Bot | noimageindex 설정 |
| BR-06-04 | Twitter Card | summary_large_image 형식 |
| BR-06-05 | OG 이미지 API | /api/v1/client/og 경로 |

#### 4.6.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| survey.linkMetadata.title | string | N | 커스텀 OG 제목 |
| survey.linkMetadata.description | string | N | 커스텀 OG 설명 |
| survey.linkMetadata.ogImage | string (URL) | N | 커스텀 OG 이미지 URL |
| survey.welcomeCard.headline | string | N | Welcome Card 헤드라인 |
| survey.name | string | Y | 설문 이름 |

**출력 데이터 (HTML Meta Tags):**

| 메타 태그 | 타입 | 설명 |
|----------|------|------|
| og:title | string | 설문 제목 |
| og:description | string | 설문 설명 |
| og:url | string (URL) | 설문 URL |
| og:image | string (URL) | OG 이미지 URL |
| og:locale | string | 언어 코드 |
| og:type | string | 콘텐츠 타입 |
| twitter:card | string | "summary_large_image" |
| robots | string | "noindex, follow" |
| googlebot | string | "noimageindex" |

#### 4.6.9 화면/UI 요구사항

해당 없음. 메타 태그는 HTML head 영역에 삽입되며 화면에 직접 표시되지 않는다.

#### 4.6.10 비기능 요구사항

- OG 이미지 API (/api/v1/client/og)의 응답 시간이 전체 페이지 로딩에 영향을 주지 않도록 비동기 로딩을 적용한다.

---

### 4.7 스타일링 결정 로직

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-016-07 |
| 기능명 | 스타일링 결정 로직 |
| 관련 요구사항 ID | FR-024-07 |
| 우선순위 | 중간 |
| 기능 설명 | 링크 설문 페이지의 스타일(테마, 색상, 배경 등)을 프로젝트 설정과 설문별 오버라이드 설정에 따라 결정한다. |

#### 4.7.2 선행 조건 (Preconditions)

- 렌더링 파이프라인의 Stage 2가 완료되어 프로젝트 스타일 정보가 로드되어야 한다.

#### 4.7.3 후행 조건 (Postconditions)

- 결정된 스타일이 설문 페이지에 적용된다.

#### 4.7.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 프로젝트 설정에서 스타일 오버라이드 허용 여부를 확인한다 |
| 2 | 시스템 | 오버라이드가 허용되지 않은 경우 프로젝트 스타일을 적용한다 |
| 3 | 시스템 | 결정된 스타일을 설문 컴포넌트에 적용한다 |

#### 4.7.5 대안 흐름 (Alternative Flow)

**AF-01: 설문별 스타일 오버라이드가 활성화된 경우**
- 단계 1에서 프로젝트 설정이 스타일 오버라이드를 허용하고, 설문에 별도 스타일이 설정되어 있으면 설문별 스타일을 적용한다.

**AF-02: 설문별 스타일이 없고 오버라이드가 허용된 경우**
- 프로젝트 기본 스타일을 적용한다.

#### 4.7.6 예외 흐름 (Exception Flow)

해당 없음. 항상 프로젝트 기본 스타일이 fallback으로 존재한다.

#### 4.7.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-07-01 | 프로젝트 스타일 오버라이드 비허용 | 프로젝트 스타일 강제 적용 |
| BR-07-02 | 오버라이드 허용 AND 설문별 스타일 존재 | 설문별 스타일 적용 |
| BR-07-03 | 오버라이드 허용 AND 설문별 스타일 미존재 | 프로젝트 기본 스타일 적용 |

**스타일링 우선순위 (높은 순):**
1. 프로젝트 스타일 (오버라이드 비허용 시)
2. 설문별 스타일 (오버라이드 허용 AND 설문별 스타일 존재 시)
3. 프로젝트 기본 스타일 (fallback)

#### 4.7.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| project.styling | object | Y | 프로젝트 스타일 설정 |
| project.styling.allowOverride | boolean | Y | 스타일 오버라이드 허용 여부 |
| survey.styling | object | N | 설문별 스타일 설정 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| resolvedStyling | object | 최종 적용할 스타일 객체 |

#### 4.7.9 화면/UI 요구사항

해당 없음. 스타일링 결정 로직은 내부 처리이며 결과가 설문 UI에 반영된다.

#### 4.7.10 비기능 요구사항

해당 없음.

---

### 4.8 언어 코드 결정

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-016-08 |
| 기능명 | 언어 코드 결정 |
| 관련 요구사항 ID | FR-024-08 |
| 우선순위 | 중간 |
| 기능 설명 | URL의 lang 파라미터와 설문의 다국어 설정을 기반으로 설문 표시 언어를 결정한다. |

#### 4.8.2 선행 조건 (Preconditions)

- 렌더링 파이프라인 Stage 2에서 Locale 정보가 조회되어야 한다.
- 설문의 다국어 설정이 로드되어야 한다.

#### 4.8.3 후행 조건 (Postconditions)

- 결정된 언어 코드로 설문이 렌더링된다.

#### 4.8.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | URL 쿼리 파라미터에서 lang 값을 파싱한다 |
| 2 | 시스템 | lang 파라미터가 존재하는지 확인한다 |
| 3 | 시스템 | 다국어가 허용되는지 확인한다 (Multi-language Permission) |
| 4 | 시스템 | lang 값이 설문의 언어 코드 목록 또는 별칭과 일치하는 언어를 검색한다 |
| 5 | 시스템 | 일치하는 언어가 활성 상태인지 확인한다 |
| 6 | 시스템 | 활성 상태이면 해당 언어 코드를 반환한다 |

#### 4.8.5 대안 흐름 (Alternative Flow)

**AF-01: lang 파라미터가 없는 경우**
- 기본 언어("default")를 사용한다.

**AF-02: 다국어가 허용되지 않는 경우**
- lang 파라미터가 있더라도 기본 언어("default")를 사용한다.

**AF-03: 일치하는 언어가 없는 경우**
- lang 값이 설문의 어떤 언어 코드 또는 별칭과도 일치하지 않으면 기본 언어("default")를 사용한다.

**AF-04: 일치하는 언어가 기본 언어인 경우**
- 기본 언어("default")를 그대로 사용한다.

**AF-05: 일치하는 언어가 비활성 상태인 경우**
- 기본 언어("default")를 사용한다.

#### 4.8.6 예외 흐름 (Exception Flow)

해당 없음. 기본 언어("default")가 항상 fallback으로 존재한다.

#### 4.8.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-08-01 | lang 미지정 | 기본 언어("default") 사용 |
| BR-08-02 | 다국어 미허용 | 기본 언어("default") 사용 |
| BR-08-03 | lang 값 일치하는 언어 없음 | 기본 언어("default") 사용 |
| BR-08-04 | 일치 언어가 기본 언어 | 기본 언어("default") 사용 |
| BR-08-05 | 일치 언어가 비활성 | 기본 언어("default") 사용 |
| BR-08-06 | 일치 언어가 활성 | 해당 언어 코드 반환 |

**언어 결정 플로우차트:**
```
lang 파라미터 존재?
  |-- 아니오 --> "default" 반환
  |-- 예 --> 다국어 허용?
                |-- 아니오 --> "default" 반환
                |-- 예 --> 언어 코드/별칭 일치 검색
                            |-- 일치 없음 --> "default" 반환
                            |-- 일치 있음 --> 기본 언어?
                                              |-- 예 --> "default" 반환
                                              |-- 아니오 --> 활성 상태?
                                                            |-- 아니오 --> "default" 반환
                                                            |-- 예 --> 해당 언어 코드 반환
```

#### 4.8.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 | 설명 |
|--------|------|------|------------|------|
| lang | string | N | ISO 639-1 형식 | URL lang 파라미터 |
| survey.languages | Language[] | Y | - | 설문 지원 언어 목록 |
| multiLanguagePermission | boolean | Y | - | 다국어 기능 허용 여부 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| languageCode | string | 결정된 언어 코드 ("default" 또는 특정 언어 코드) |

#### 4.8.9 화면/UI 요구사항

해당 없음. 언어 결정은 내부 로직이며 결과가 설문 텍스트에 반영된다.

#### 4.8.10 비기능 요구사항

해당 없음.

---

### 4.9 커스텀 스크립트 주입

#### 4.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-016-09 |
| 기능명 | 커스텀 스크립트 주입 |
| 관련 요구사항 ID | FR-024-09 |
| 우선순위 | 낮음 |
| 기능 설명 | Self-hosted 환경에서 프로젝트 수준 및 설문 수준의 커스텀 HTML/스크립트를 링크 설문 페이지에 주입한다. "add" 모드는 프로젝트 스크립트에 추가하고, "replace" 모드는 프로젝트 스크립트를 대체한다. |

#### 4.9.2 선행 조건 (Preconditions)

- 환경이 Self-hosted여야 한다.
- 미리보기 모드(preview=true)가 아니어야 한다.
- 프로젝트 또는 설문에 커스텀 스크립트가 설정되어 있어야 한다.

#### 4.9.3 후행 조건 (Postconditions)

- 결정된 커스텀 스크립트가 설문 페이지 HTML에 주입된다.

#### 4.9.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 환경이 Self-hosted인지 확인한다 |
| 2 | 시스템 | 미리보기 모드가 아닌지 확인한다 |
| 3 | 시스템 | 프로젝트 수준 커스텀 스크립트를 조회한다 |
| 4 | 시스템 | 설문 수준 커스텀 스크립트를 조회한다 |
| 5 | 시스템 | 설문 수준 스크립트의 모드를 확인한다 ("add" 또는 "replace") |
| 6 | 시스템 | 모드가 "add"이면 프로젝트 스크립트 + 설문 스크립트를 합친다 |
| 7 | 시스템 | 합쳐진 스크립트를 페이지 HTML에 주입한다 |

#### 4.9.5 대안 흐름 (Alternative Flow)

**AF-01: 설문 스크립트 모드가 "replace"인 경우**
- 단계 6에서 프로젝트 스크립트를 무시하고 설문 스크립트만 주입한다.

**AF-02: 설문 수준 스크립트가 없는 경우**
- 프로젝트 수준 스크립트만 주입한다.

**AF-03: 프로젝트 수준 스크립트도 없는 경우**
- 스크립트를 주입하지 않는다.

#### 4.9.6 예외 흐름 (Exception Flow)

**EX-01: Cloud 환경**
- 단계 1에서 Cloud 환경임을 감지하면 스크립트 주입을 수행하지 않는다.

**EX-02: 미리보기 모드 (preview=true)**
- 단계 2에서 미리보기 모드임을 감지하면 스크립트 주입을 수행하지 않는다.

#### 4.9.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-09-01 | 환경 == Cloud | 스크립트 주입 비활성화 |
| BR-09-02 | preview == true | 스크립트 주입 비활성화 |
| BR-09-03 | 설문 스크립트 모드 == "add" | 프로젝트 스크립트 + 설문 스크립트 합산 주입 |
| BR-09-04 | 설문 스크립트 모드 == "replace" | 설문 스크립트만 주입 (프로젝트 스크립트 대체) |

#### 4.9.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 | 설명 |
|--------|------|------|------------|------|
| project.customScript | string (HTML) | N | - | 프로젝트 수준 커스텀 스크립트 |
| survey.customScript.content | string (HTML) | N | - | 설문 수준 커스텀 스크립트 |
| survey.customScript.mode | enum | N | "add" 또는 "replace" | 스크립트 모드 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| injectedScript | string (HTML) | 최종 주입할 HTML/스크립트 |

#### 4.9.9 화면/UI 요구사항

**Share Modal - Custom HTML 탭:**
- 프로젝트 수준 스크립트 편집 영역
- 설문 수준 스크립트 편집 영역
- 스크립트 모드 선택 (Add / Replace)

#### 4.9.10 비기능 요구사항

- 주입된 스크립트에 의한 XSS 공격 가능성이 있으므로 Self-hosted 환경에서만 허용한다.
- Cloud 환경에서는 이 기능을 완전히 비활성화하여 보안 위험을 차단한다.

---

### 4.10 Viewport 설정

#### 4.10.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-016-10 |
| 기능명 | Viewport 설정 |
| 관련 요구사항 ID | FR-024-10 |
| 우선순위 | 높음 |
| 기능 설명 | 링크 설문 페이지의 viewport 메타 태그를 설정하여 모바일 기기에서의 레이아웃 및 사용자 확대/축소를 제어한다. |

#### 4.10.2 선행 조건 (Preconditions)

- 링크 설문 페이지가 렌더링되어야 한다.

#### 4.10.3 후행 조건 (Postconditions)

- viewport 메타 태그가 HTML head에 설정된다.

#### 4.10.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | HTML head에 viewport 메타 태그를 삽입한다 |
| 2 | 시스템 | width=device-width를 설정한다 |
| 3 | 시스템 | initial-scale=1.0을 설정한다 |
| 4 | 시스템 | maximum-scale=1.0을 설정한다 |
| 5 | 시스템 | user-scalable=no를 설정한다 |
| 6 | 시스템 | viewport-fit=contain을 설정한다 |

#### 4.10.5 대안 흐름 (Alternative Flow)

해당 없음. viewport 설정은 모든 링크 설문 페이지에 동일하게 적용된다.

#### 4.10.6 예외 흐름 (Exception Flow)

해당 없음.

#### 4.10.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| BR-10-01 | 모든 링크 설문 페이지 | 사용자 확대/축소 비활성화 (설문 레이아웃 보호) |
| BR-10-02 | 모든 링크 설문 페이지 | viewport-fit=contain (안전 영역 내 콘텐츠 배치) |

#### 4.10.8 데이터 요구사항

**출력 데이터 (HTML Meta Tag):**

| 속성 | 값 | 설명 |
|------|------|------|
| width | device-width | 기기 너비 사용 |
| initial-scale | 1.0 | 초기 배율 |
| maximum-scale | 1.0 | 최대 배율 |
| user-scalable | no | 사용자 확대/축소 비활성화 |
| viewport-fit | contain | 뷰포트 적합 모드 |

#### 4.10.9 화면/UI 요구사항

해당 없음. viewport 설정은 메타 태그로 적용된다.

#### 4.10.10 비기능 요구사항

- NFR-024-04: 모바일 확대 비활성화를 통해 설문 레이아웃을 보호한다.

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

| 엔티티 | 설명 | 주요 필드 |
|--------|------|----------|
| Survey | 설문 정보 | id, name, type, status, styling, welcomeCard, linkMetadata, languages, customScript |
| Project | 프로젝트 정보 | id, styling, customScript |
| Organization | 조직 정보 | id, whitelabel (favicon 등) |
| Environment | 환경 정보 | id, type (cloud/self-hosted) |
| SurveySlug | Pretty URL 매핑 | id, slug, surveyId |

### 5.2 엔티티 간 관계

```
Organization (1) --- (N) Project
Project (1) --- (N) Survey
Survey (1) --- (0..1) SurveySlug
Survey (1) --- (N) Language
Project (1) --- (1) Environment
```

### 5.3 데이터 흐름

```
[URL 접근]
    |
    v
[URL 파라미터 파싱] --> surveyId, suId, verify, lang, embed, preview
    |
    v
[Stage 1: Survey 조회] --> Survey (캐싱)
    |
    +---> [OG Meta Tags 생성] --> HTML head
    |
    v
[Stage 2: 병렬 조회]
    +---> Environment Context --> 환경, Project, Organization 정보
    +---> Locale 결정 --> 언어 코드
    +---> Single-use Response --> 기존 응답 여부
    |
    v
[Stage 3: Multi-language Permission] --> 다국어 허용 여부
    |
    v
[스타일링 결정] --> resolvedStyling
    |
    v
[페이지 렌더링] --> HTML 응답
```

---

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 연동 대상 | 방향 | 설명 |
|----------|------|------|
| 소셜 미디어 플랫폼 | Outbound | OG Meta Tags를 통한 링크 프리뷰 제공 |
| iframe 부모 윈도우 | Outbound | postMessage를 통한 설문 완료 이벤트 전송 |
| 이메일 서비스 | Outbound | Share Modal의 Email 탭을 통한 설문 링크 발송 |

### 6.2 API 명세

**OG 이미지 생성 API:**

| 항목 | 내용 |
|------|------|
| 엔드포인트 | GET /api/v1/client/og |
| 설명 | 설문의 OG 이미지를 동적으로 생성하여 반환 |
| 응답 타입 | image/* |

**Pretty URL slug 업데이트 API:**

| 항목 | 내용 |
|------|------|
| 엔드포인트 | PUT /api/v1/surveys/{surveyId}/slug |
| 설명 | 설문의 Pretty URL slug를 설정/변경 |
| 요청 본문 | `{ "slug": "my-survey" }` |
| 유효성 검증 | slug: `^[a-z0-9-]+$`, 중복 불허 |
| 권한 | Organization owner/manager 또는 projectTeam readWrite 이상 |
| 성공 응답 | `{ "prettyUrl": "{publicDomain}/p/{slug}" }` |
| 오류 응답 | 400 (유효하지 않은 slug), 409 (slug 중복), 403 (권한 부족) |

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| ID | 항목 | 기준 |
|----|------|------|
| NFR-016-01 | 페이지 로딩 성능 | 3단계 최적화 파이프라인으로 200-600ms 수준의 응답 시간 달성 |
| NFR-016-02 | 캐싱 | 요청 수준 캐싱을 활용하여 동일 요청 내 Survey 조회 중복 제거 |
| NFR-016-03 | 병렬 처리 | Stage 2 쿼리의 병렬 실행으로 최적화 전 대비 50-60% 지연 감소 |

### 7.2 보안 요구사항

| ID | 항목 | 기준 |
|----|------|------|
| NFR-016-04 | iframe postMessage | targetOrigin 와일드카드("*") 사용. 메시지에 민감 데이터 미포함 |
| NFR-016-05 | 커스텀 스크립트 | Self-hosted 환경에서만 허용. Cloud 환경에서 완전 비활성화 |
| NFR-016-06 | SEO 보호 | 검색 엔진 인덱싱 비활성화 (noindex), Google Bot 이미지 인덱싱 비활성화 |

### 7.3 가용성 요구사항

| ID | 항목 | 기준 |
|----|------|------|
| NFR-016-07 | 반응형 디자인 | 최대 너비 기반 설문 카드로 모바일/데스크톱 대응 |
| NFR-016-08 | 접근성 | 모바일 확대 비활성화 (설문 레이아웃 보호 목적) |

---

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| 항목 | 내용 |
|------|------|
| 설문 URL 패턴 | /s/{surveyId} (고정) |
| Pretty URL 패턴 | /p/{slug} (Self-hosted only) |
| OG 이미지 API | /api/v1/client/og (고정 경로) |
| Card Arrangement | "straight" 또는 "casual" 2가지 옵션만 지원 |
| iframe 완료 이벤트명 | "formbricksSurveyCompleted" (고정) |
| Slug 유효성 | 소문자 알파벳, 숫자, 하이픈만 허용 (정규식: `^[a-z0-9-]+$`) |
| Viewport | 사용자 확대/축소 비활성화 |
| Autofocus | iframe 내에서 비활성화 |

### 8.2 비즈니스 제약사항

| 항목 | 내용 |
|------|------|
| Pretty URL | Inquiry Cloud에서는 사용 불가 (Self-hosted only) |
| Custom HTML | Inquiry Cloud에서는 사용 불가 (Self-hosted only) |
| 설문 접근 제한 | draft 상태 또는 link 타입이 아닌 설문에 접근 시 404 반환 |
| Slug 수정 권한 | Organization owner/manager 또는 projectTeam readWrite 이상 |
| 커스텀 스크립트 모드 | "add" (프로젝트에 추가) 또는 "replace" (프로젝트 대체) 2가지만 지원 |
| Single-use 제한 | Single-use 활성 시 Personal Links, Website Embed, Email, Social Media, QR Code 탭 비활성화 |

### 8.3 가정사항

| 항목 | 내용 |
|------|------|
| 브라우저 호환성 | postMessage API를 지원하는 모던 브라우저를 대상으로 한다 |
| iframe 부모 윈도우 | targetOrigin을 와일드카드("*")로 사용하므로 부모 윈도우의 origin을 사전에 알 수 없다고 가정한다 |
| 네트워크 환경 | 200-600ms 응답 시간은 일반적인 네트워크 환경에서의 서버 처리 시간 기준이다 |
| Whitelabel | Organization에 whitelabel favicon이 설정된 경우 링크 설문에 자동 적용된다고 가정한다 |

---

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 기능 명세 ID | 기능명 | 수용 기준 ID |
|------------|-------------|--------|-------------|
| FR-024-01 | FN-016-01 | Share Modal 탭 구성 | AC-024-03, AC-024-06, AC-024-11 |
| FR-024-02 | FN-016-02 | 링크 설문 페이지 렌더링 파이프라인 | AC-024-01, AC-024-09, AC-024-10 |
| FR-024-03 | FN-016-03 | 임베드 모드 | AC-024-02 |
| FR-024-04 | FN-016-04 | iframe 완료 이벤트 | AC-024-07 |
| FR-024-05 | FN-016-05 | Pretty URL | AC-024-05, AC-024-06, AC-024-13 |
| FR-024-06 | FN-016-06 | OG Meta Tags 생성 | AC-024-01, AC-024-12 |
| FR-024-07 | FN-016-07 | 스타일링 결정 로직 | - |
| FR-024-08 | FN-016-08 | 언어 코드 결정 | AC-024-08 |
| FR-024-09 | FN-016-09 | 커스텀 스크립트 주입 | - |
| FR-024-10 | FN-016-10 | Viewport 설정 | - |

**수용 기준 매핑:**

| AC-ID | 시나리오 | 관련 기능 명세 |
|-------|----------|--------------|
| AC-024-01 | Link Survey URL 접근 시 정상 렌더링 및 OG 메타데이터 포함 | FN-016-02, FN-016-06 |
| AC-024-02 | embed=true 시 배경/로고/푸터 없이 설문만 표시 | FN-016-03 |
| AC-024-03 | Share Modal Anonymous Links 탭에서 URL 표시 및 복사 | FN-016-01 |
| AC-024-04 | Share Modal QR Code 탭에서 QR 코드 생성 | FN-016-01 |
| AC-024-05 | Pretty URL로 설문 접근 가능 (Self-hosted) | FN-016-05 |
| AC-024-06 | Cloud 환경에서 Pretty URL 탭 미표시 | FN-016-01, FN-016-05 |
| AC-024-07 | iframe 내 설문 완료 시 formbricksSurveyCompleted 메시지 전달 | FN-016-04 |
| AC-024-08 | lang=de 전달 시 독일어 설문 표시 | FN-016-08 |
| AC-024-09 | Draft 상태 설문 접근 시 404 | FN-016-02 |
| AC-024-10 | App 타입 설문 링크 접근 시 404 | FN-016-02 |
| AC-024-11 | Single-use 활성 시 관련 탭 비활성화 | FN-016-01 |
| AC-024-12 | 커스텀 Link Metadata가 OG 태그에 반영 | FN-016-06 |
| AC-024-13 | 대문자/특수문자 slug 입력 시 검증 실패 | FN-016-05 |
| AC-024-14 | Whitelabel favicon 적용 | FN-016-02 |

### 9.2 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| v1.0 | 2026-02-21 | - | 초안 작성 (FSD-016 기반) |
