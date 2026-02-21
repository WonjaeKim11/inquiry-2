# 기능 명세서: 웹훅 및 커넥터

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | 1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-023 (웹훅 및 커넥터 요구사항 명세서), FR-040 ~ FR-041 |
| 상태 | 초안 |

---

## 2. 개요

### 2.1 목적

본 문서는 Inquiry 플랫폼의 웹훅 시스템 및 외부 서비스 커넥터 기능에 대한 상세 기능 명세를 정의한다. 요구사항 명세서 FSD-023(FR-040 ~ FR-041)을 기반으로 웹훅 CRUD, Standard Webhooks 프로토콜 구현, 네이티브 통합(Google Sheets, Slack, Airtable, Notion), 웹훅 기반 자동화 커넥터(Zapier, n8n, Make, ActivePieces)의 구현 세부 사항을 기술한다.

### 2.2 범위

**포함 범위:**
- 웹훅 CRUD (생성, 조회, 수정, 삭제)
- Standard Webhooks 프로토콜 구현 (HMAC-SHA256 서명)
- 웹훅 소스 5가지 타입 관리
- 웹훅 트리거 3가지 이벤트 처리
- 엔드포인트 테스트 기능
- Discord 웹훅 차단
- URL 유효성 검증
- 네이티브 통합 4가지 (Google Sheets, Slack, Airtable, Notion)
- 웹훅 기반 자동화 커넥터 4가지 (Zapier, n8n, Make, ActivePieces)
- 웹훅 시크릿 관리

**제외 범위:**
- 각 통합의 상세 데이터 매핑 설정 UI (통합별 별도 설정 UI)
- Follow-Up Email (FSD-022 참조)
- 응답 파이프라인 전체 흐름 (FSD-022 참조)

### 2.3 대상 사용자

| 역할 | 설명 |
|------|------|
| Integration Admin | 웹훅 생성/관리 및 외부 서비스 통합 설정을 수행하는 관리자 |
| External System | 웹훅 페이로드를 수신하여 처리하는 외부 시스템 |
| 자동화 플랫폼 (Zapier/n8n/Make/ActivePieces) | 웹훅 소스로서 자동 등록 및 이벤트 수신을 수행하는 외부 자동화 플랫폼 |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| Webhook | 설문 이벤트 발생 시 외부 URL로 HTTP POST 요청을 보내는 기능 |
| Standard Webhooks | 웹훅 전송의 표준 사양 (https://www.standardwebhooks.com/). webhook-id, webhook-timestamp, webhook-signature 헤더를 포함하는 프로토콜 |
| HMAC-SHA256 | Hash-based Message Authentication Code. SHA-256 해시 함수를 사용하는 메시지 인증 코드 알고리즘 |
| Webhook Secret | 웹훅 페이로드 서명에 사용되는 비밀 키. "whsec_" 접두사 + base64 인코딩된 32바이트 랜덤 값 |
| Webhook Source | 웹훅의 생성 주체를 구분하는 타입 (user, zapier, make, n8n, activepieces) |
| Trigger Event | 웹훅 발송을 유발하는 이벤트 (responseCreated, responseUpdated, responseFinished) |
| Native Integration | Inquiry에서 직접 지원하는 외부 서비스 연동 (Google Sheets, Slack, Airtable, Notion) |
| Automation Connector | 웹훅 기반으로 Inquiry와 연동하는 자동화 플랫폼 (Zapier, n8n, Make, ActivePieces) |
| Environment | 프로젝트 내 production과 development 두 환경. 데이터가 완전히 격리된다 |
| Pipeline | 설문 이벤트 발생 시 웹훅, 이메일, 통합 처리를 수행하는 내부 파이프라인 |
| CUID | Collision-resistant Unique Identifier. 충돌 저항성이 있는 고유 식별자 |
| UUID v7 | 시간 기반 정렬이 가능한 UUID 버전 7 |

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
+------------------+       +---------------------+       +-------------------+
|  Inquiry UI   |       |  Inquiry Server  |       |  External System  |
|  (Integration    |------>|  (Webhook Engine)   |------>|  (Webhook         |
|   Admin)         |       |                     |       |   Consumer)       |
+------------------+       +----------+----------+       +-------------------+
                                      |
                                      | Standard Webhooks Protocol
                                      | (HMAC-SHA256 서명)
                                      |
              +-----------------------+-----------------------+
              |                       |                       |
    +---------v---------+   +---------v---------+   +---------v---------+
    | Native Integration|   | Automation        |   | User-defined      |
    | (Google Sheets,   |   | Connector         |   | Webhook           |
    |  Slack, Airtable, |   | (Zapier, n8n,     |   | (Custom URL)      |
    |  Notion)          |   |  Make, ActivePieces|   |                   |
    +-------------------+   +-------------------+   +-------------------+
```

### 3.2 주요 기능 목록 (Feature List)

| 기능 ID | 기능명 | 관련 요구사항 | 우선순위 |
|---------|--------|-------------|---------|
| FN-040-01 | 웹훅 생성 | FR-040 (4.5, 4.6) | 높음 |
| FN-040-02 | 웹훅 조회 | FR-040 (4.10) | 높음 |
| FN-040-03 | 웹훅 수정 | FR-040 (4.10) | 높음 |
| FN-040-04 | 웹훅 삭제 | FR-040 (4.10) | 높음 |
| FN-040-05 | Standard Webhooks 프로토콜 구현 | FR-040 (4.4) | 높음 |
| FN-040-06 | 엔드포인트 테스트 | FR-040 (4.9) | 중간 |
| FN-040-07 | Discord 웹훅 차단 | FR-040 (4.7) | 중간 |
| FN-040-08 | URL 유효성 검증 | FR-040 (4.8) | 높음 |
| FN-040-09 | 설문 선택 (All/Specific) | FR-040 (4.11) | 높음 |
| FN-041-01 | Google Sheets 통합 | FR-041 (4.12) | 중간 |
| FN-041-02 | Slack 통합 | FR-041 (4.12) | 중간 |
| FN-041-03 | Airtable 통합 | FR-041 (4.12) | 중간 |
| FN-041-04 | Notion 통합 | FR-041 (4.12, 4.13) | 중간 |
| FN-041-05 | 자동화 커넥터 관리 | FR-041 (4.14) | 중간 |

### 3.3 기능 간 관계도

```
[웹훅 생성 FN-040-01]
    ├── [URL 유효성 검증 FN-040-08] -- 생성 시 URL 검증 수행
    ├── [Discord 웹훅 차단 FN-040-07] -- 생성 시 Discord URL 차단 검사
    ├── [설문 선택 FN-040-09] -- 대상 설문 설정
    └── [Standard Webhooks 프로토콜 FN-040-05] -- 시크릿 자동 생성

[웹훅 수정 FN-040-03]
    ├── [URL 유효성 검증 FN-040-08]
    ├── [Discord 웹훅 차단 FN-040-07]
    └── [설문 선택 FN-040-09]

[엔드포인트 테스트 FN-040-06]
    ├── [URL 유효성 검증 FN-040-08]
    ├── [Discord 웹훅 차단 FN-040-07]
    └── [Standard Webhooks 프로토콜 FN-040-05] -- 임시 시크릿으로 서명

[네이티브 통합 FN-041-01~04]
    └── 응답 완료 이벤트(responseFinished) 트리거에 의존

[자동화 커넥터 FN-041-05]
    └── [웹훅 CRUD FN-040-01~04] -- 웹훅 자동 등록/관리
```

---

## 4. 상세 기능 명세

### 4.1 웹훅 생성

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-040-01 |
| 기능명 | 웹훅 생성 |
| 관련 요구사항 ID | FR-040 (4.5, 4.6) |
| 우선순위 | 높음 |
| 기능 설명 | Integration Admin이 외부 시스템으로 설문 이벤트를 전달하기 위한 웹훅을 생성한다. 생성 시 URL 유효성 검증, Discord 차단 검사를 수행하고 시크릿을 자동 생성한다. |

#### 4.1.2 선행 조건 (Preconditions)

- 사용자가 Integration Admin 권한으로 로그인된 상태여야 한다.
- 사용자가 유효한 Environment에 소속되어 있어야 한다.

#### 4.1.3 후행 조건 (Postconditions)

- 데이터베이스에 새 웹훅 레코드가 생성된다.
- 생성된 웹훅의 시크릿은 "whsec_" 접두사 + base64(32바이트 랜덤) 형식으로 저장된다.
- 생성 성공 모달에서 시크릿이 1회 표시된다.
- 이후 시크릿은 조회할 수 없다.

#### 4.1.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | Integration Admin | 웹훅 관리 화면에서 "Add Webhook" 버튼을 클릭한다. |
| 2 | 시스템 | 웹훅 생성 폼을 표시한다. 폼에는 name, url, triggers(체크박스), surveyIds(설문 선택) 필드가 포함된다. |
| 3 | Integration Admin | name(선택), url(필수), triggers(필수, 체크박스), 설문 범위(All Surveys 또는 Specific Surveys)를 입력/선택한다. |
| 4 | 시스템 | URL 유효성 검증을 수행한다 (FN-040-08 참조). |
| 5 | 시스템 | Discord 웹훅 차단 검사를 수행한다 (FN-040-07 참조). |
| 6 | 시스템 | 웹훅 시크릿을 자동 생성한다: "whsec_" + base64(crypto.randomBytes(32)). |
| 7 | 시스템 | source를 "user"로 설정하고, 웹훅 레코드를 데이터베이스에 저장한다. |
| 8 | 시스템 | 생성 성공 모달을 표시한다. 모달에는 다음이 포함된다: (a) 시크릿 값을 읽기 전용 입력 필드에 표시, (b) "Copy" 버튼, (c) 경고 메시지: "지금 복사하지 않으면 다시 확인할 수 없습니다", (d) Standard Webhooks 문서 링크. |
| 9 | Integration Admin | 시크릿을 복사하고 모달을 닫는다. |
| 10 | 시스템 | 웹훅 목록에 새로 생성된 웹훅을 표시한다. |

#### 4.1.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-01 | 단계 3 | name을 입력하지 않은 경우 | name은 선택 필드이므로 빈 값으로 진행한다. |
| AF-02 | 단계 3 | "All Surveys"를 선택한 경우 | surveyIds를 빈 배열([])로 설정하여 해당 Environment의 모든 설문 이벤트를 수신하도록 한다. |
| AF-03 | 단계 3 | "Specific Surveys"를 선택한 경우 | 개별 설문 목록을 표시하고, 사용자가 선택한 설문의 ID를 surveyIds 배열에 포함한다. |

#### 4.1.6 예외 흐름 (Exception Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| EF-01 | 단계 4 | URL이 비어있는 경우 | 에러 메시지 "Please enter a URL"을 표시하고 폼 제출을 차단한다. |
| EF-02 | 단계 4 | URL이 HTTPS가 아닌 경우 | URL 유효성 검증 실패 에러를 표시하고 폼 제출을 차단한다. |
| EF-03 | 단계 4 | URL에 연속 슬래시가 포함된 경우 (프로토콜 제외) | URL 유효성 검증 실패 에러를 표시한다. |
| EF-04 | 단계 4 | 유효하지 않은 도메인 형식인 경우 (TLD 2자 미만) | URL 유효성 검증 실패 에러를 표시한다. |
| EF-05 | 단계 5 | Discord 웹훅 URL인 경우 | 에러 메시지 "Discord webhooks are currently not supported."를 표시하고 폼 제출을 차단한다. |
| EF-06 | 단계 7 | 데이터베이스 저장 실패 | 서버 에러를 반환하고 사용자에게 재시도 안내를 표시한다. |

#### 4.1.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-040-01 | 사용자가 UI에서 생성하는 웹훅의 source는 항상 "user"로 고정된다. |
| BR-040-02 | 웹훅 시크릿은 생성 시에만 1회 노출되며, 이후에는 조회할 수 없다. |
| BR-040-03 | 시크릿 형식은 "whsec_" 접두사 + base64 인코딩된 32바이트(256비트) 랜덤 값이다. |
| BR-040-04 | 웹훅 ID는 CUID 형식으로 자동 생성된다. |

#### 4.1.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| name | string | 선택 | 없음 |
| url | string | 필수 | HTTPS 프로토콜 필수, 연속 슬래시 금지(프로토콜 제외), TLD 2자 이상, Discord URL 차단 |
| triggers | string[] | 필수 | "responseCreated", "responseUpdated", "responseFinished" 중 1개 이상 선택 |
| surveyIds | string[] | 필수 | 빈 배열(All Surveys) 또는 유효한 설문 ID 배열(Specific Surveys) |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | string (CUID) | 생성된 웹훅의 고유 식별자 |
| name | string \| null | 웹훅 이름 |
| createdAt | datetime | 생성 시간 |
| updatedAt | datetime | 수정 시간 |
| url | string | 엔드포인트 URL |
| source | string | "user" 고정 |
| environmentId | string | 소속 Environment ID |
| triggers | string[] | 구독 이벤트 배열 |
| surveyIds | string[] | 대상 설문 ID 배열 |
| secret | string | 생성 시에만 반환. "whsec_" 접두사 형식 |

#### 4.1.9 화면/UI 요구사항

- 웹훅 생성 폼: name 입력 필드, url 입력 필드, triggers 체크박스 그룹(3개), 설문 선택 라디오(All Surveys / Specific Surveys) + 설문 목록
- 생성 성공 모달: 시크릿 값 읽기 전용 필드, Copy 버튼, 경고 메시지 텍스트, Standard Webhooks 문서 링크

#### 4.1.10 비기능 요구사항

- 시크릿 생성에 사용되는 랜덤 바이트는 암호학적으로 안전한 난수 생성기(CSPRNG)를 사용해야 한다.
- 시크릿은 생성 응답 이후 서버에서 평문으로 조회할 수 없어야 한다.

---

### 4.2 웹훅 조회

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-040-02 |
| 기능명 | 웹훅 조회 |
| 관련 요구사항 ID | FR-040 (4.10) |
| 우선순위 | 높음 |
| 기능 설명 | Environment 단위로 등록된 모든 웹훅 목록을 조회한다. 결과는 생성 시간 역순으로 정렬된다. |

#### 4.2.2 선행 조건 (Preconditions)

- 사용자가 Integration Admin 권한으로 로그인된 상태여야 한다.
- 사용자가 유효한 Environment에 소속되어 있어야 한다.

#### 4.2.3 후행 조건 (Postconditions)

- 해당 Environment에 속한 모든 웹훅 목록이 반환된다.
- 시크릿 필드는 반환되지 않는다.

#### 4.2.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | Integration Admin | 웹훅 관리 화면에 진입한다. |
| 2 | 시스템 | 현재 Environment ID를 기준으로 데이터베이스에서 웹훅 목록을 조회한다. |
| 3 | 시스템 | 조회 결과를 createdAt 역순(최신 우선)으로 정렬하여 반환한다. |
| 4 | 시스템 | 웹훅 목록을 화면에 표시한다. 각 항목에 name, url, source, triggers, surveyIds 정보를 포함한다. |

#### 4.2.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-01 | 단계 3 | 등록된 웹훅이 없는 경우 | 빈 목록을 표시하고 웹훅 생성 안내 메시지를 보여준다. |

#### 4.2.6 예외 흐름 (Exception Flow)

해당 없음.

#### 4.2.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-040-05 | 웹훅 조회 시 secret 필드는 응답에 포함되지 않는다. |
| BR-040-06 | 조회 범위는 environmentId 기준으로 격리된다. |
| BR-040-07 | 정렬 기준은 createdAt 역순(DESC)이다. |

#### 4.2.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| environmentId | string | 필수 | 유효한 Environment ID |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| webhooks | Webhook[] | 웹훅 배열 (secret 필드 제외) |

#### 4.2.9 화면/UI 요구사항

- 웹훅 목록 테이블/카드: 각 웹훅의 name, url, source, triggers 표시
- 각 항목에 수정/삭제 액션 버튼 포함

#### 4.2.10 비기능 요구사항

- 웹훅 목록 조회는 environmentId 기준 인덱스를 사용하여 조회해야 한다.

---

### 4.3 웹훅 수정

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-040-03 |
| 기능명 | 웹훅 수정 |
| 관련 요구사항 ID | FR-040 (4.10) |
| 우선순위 | 높음 |
| 기능 설명 | 기존 웹훅의 name, url, triggers, surveyIds를 수정한다. source와 secret은 변경할 수 없다. |

#### 4.3.2 선행 조건 (Preconditions)

- 사용자가 Integration Admin 권한으로 로그인된 상태여야 한다.
- 수정 대상 웹훅이 존재해야 한다.

#### 4.3.3 후행 조건 (Postconditions)

- 데이터베이스에서 해당 웹훅 레코드의 name, url, triggers, surveyIds가 변경된다.
- updatedAt 필드가 현재 시간으로 갱신된다.
- source와 secret은 변경되지 않는다.

#### 4.3.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | Integration Admin | 웹훅 목록에서 수정 대상 웹훅의 편집 버튼을 클릭한다. |
| 2 | 시스템 | 해당 웹훅의 현재 설정을 폼에 표시한다. source와 secret 필드는 수정 불가 상태로 표시된다. |
| 3 | Integration Admin | name, url, triggers, surveyIds 중 변경할 항목을 수정한다. |
| 4 | 시스템 | url이 변경된 경우 URL 유효성 검증을 수행한다 (FN-040-08 참조). |
| 5 | 시스템 | url이 변경된 경우 Discord 웹훅 차단 검사를 수행한다 (FN-040-07 참조). |
| 6 | 시스템 | 웹훅 레코드를 데이터베이스에 갱신한다. |
| 7 | 시스템 | 수정 성공 메시지를 표시하고 웹훅 목록을 갱신한다. |

#### 4.3.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.3.6 예외 흐름 (Exception Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| EF-01 | 단계 4 | URL 유효성 검증 실패 | FN-040-01의 예외 흐름 EF-01~EF-04와 동일하게 처리한다. |
| EF-02 | 단계 5 | Discord 웹훅 URL인 경우 | FN-040-01의 예외 흐름 EF-05와 동일하게 처리한다. |
| EF-03 | 단계 6 | 대상 웹훅이 존재하지 않는 경우 | 리소스 미존재 에러를 반환한다. |

#### 4.3.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-040-08 | source 필드는 웹훅 수정 시 변경할 수 없다. |
| BR-040-09 | secret 필드는 웹훅 수정 시 변경할 수 없다. |

#### 4.3.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| webhookId | string | 필수 | 존재하는 웹훅의 ID |
| name | string | 선택 | 없음 |
| url | string | 선택 | FN-040-01과 동일한 URL 검증 규칙 |
| triggers | string[] | 선택 | "responseCreated", "responseUpdated", "responseFinished" 중 1개 이상 |
| surveyIds | string[] | 선택 | 빈 배열 또는 유효한 설문 ID 배열 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| webhook | Webhook | 수정된 웹훅 객체 (secret 제외) |

#### 4.3.9 화면/UI 요구사항

- 수정 폼: name, url, triggers, surveyIds 편집 가능. source, secret 필드는 읽기 전용.

#### 4.3.10 비기능 요구사항

해당 없음.

---

### 4.4 웹훅 삭제

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-040-04 |
| 기능명 | 웹훅 삭제 |
| 관련 요구사항 ID | FR-040 (4.10) |
| 우선순위 | 높음 |
| 기능 설명 | 기존 웹훅을 ID로 식별하여 삭제한다. |

#### 4.4.2 선행 조건 (Preconditions)

- 사용자가 Integration Admin 권한으로 로그인된 상태여야 한다.
- 삭제 대상 웹훅이 존재해야 한다.

#### 4.4.3 후행 조건 (Postconditions)

- 데이터베이스에서 해당 웹훅 레코드가 삭제된다.
- 해당 웹훅으로의 이벤트 전송이 중단된다.

#### 4.4.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | Integration Admin | 웹훅 목록에서 삭제 대상 웹훅의 삭제 버튼을 클릭한다. |
| 2 | 시스템 | 삭제 확인 대화상자를 표시한다. |
| 3 | Integration Admin | 삭제를 확인한다. |
| 4 | 시스템 | 데이터베이스에서 해당 웹훅 레코드를 삭제한다. |
| 5 | 시스템 | 삭제 성공 메시지를 표시하고 웹훅 목록을 갱신한다. |

#### 4.4.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-01 | 단계 3 | 사용자가 삭제를 취소한 경우 | 대화상자를 닫고 웹훅 목록으로 복귀한다. |

#### 4.4.6 예외 흐름 (Exception Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| EF-01 | 단계 4 | 대상 웹훅이 존재하지 않는 경우 | 리소스 미존재 에러를 반환한다. |

#### 4.4.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-040-10 | 존재하지 않는 웹훅을 삭제 시도하면 리소스 미존재 에러를 반환한다. |

#### 4.4.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| webhookId | string | 필수 | 존재하는 웹훅의 ID |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| success | boolean | 삭제 성공 여부 |

#### 4.4.9 화면/UI 요구사항

- 삭제 확인 대화상자: 삭제 경고 메시지, 확인/취소 버튼

#### 4.4.10 비기능 요구사항

해당 없음.

---

### 4.5 Standard Webhooks 프로토콜 구현

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-040-05 |
| 기능명 | Standard Webhooks 프로토콜 구현 |
| 관련 요구사항 ID | FR-040 (4.4) |
| 우선순위 | 높음 |
| 기능 설명 | 웹훅 발송 시 Standard Webhooks 사양을 준수하는 HTTP 헤더와 HMAC-SHA256 서명을 생성한다. |

#### 4.5.2 선행 조건 (Preconditions)

- 트리거 이벤트가 발생하여 웹훅 발송이 필요한 상태여야 한다.
- 대상 웹훅 레코드에 url이 유효하게 설정되어 있어야 한다.

#### 4.5.3 후행 조건 (Postconditions)

- Standard Webhooks 사양을 준수하는 HTTP POST 요청이 대상 URL로 전송된다.
- 시크릿이 존재하는 웹훅의 경우 webhook-signature 헤더에 유효한 HMAC-SHA256 서명이 포함된다.

#### 4.5.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | 설문 이벤트(responseCreated/responseUpdated/responseFinished) 발생을 감지한다. |
| 2 | 시스템 | 해당 이벤트를 구독한 웹훅 목록을 조회한다 (surveyIds 필터 적용). |
| 3 | 시스템 | 각 웹훅에 대해 다음을 수행한다: |
| 3-1 | 시스템 | UUID v7 형식의 webhook-id를 생성한다. |
| 3-2 | 시스템 | 현재 시간의 Unix timestamp(초 단위)를 webhook-timestamp로 설정한다. |
| 3-3 | 시스템 | 페이로드 body를 JSON 문자열로 직렬화한다. |
| 3-4 | 시스템 | 웹훅에 secret이 존재하면 서명을 생성한다: (a) 서명 대상 문자열 구성: "{webhook-id}.{webhook-timestamp}.{body}", (b) 시크릿에서 "whsec_" 접두사를 제거하고 base64 디코딩하여 키를 추출, (c) HMAC-SHA256으로 서명 생성, (d) 서명 결과를 base64 인코딩하여 "v1,{base64 서명값}" 형식으로 구성. |
| 3-5 | 시스템 | HTTP POST 요청을 전송한다. 헤더 구성: content-type: application/json, webhook-id: {UUID v7}, webhook-timestamp: {Unix timestamp}, webhook-signature: v1,{base64 HMAC} (secret 존재 시). |
| 4 | 시스템 | 5초 타임아웃 내에 응답을 대기한다. |

#### 4.5.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-01 | 단계 3-4 | 웹훅에 secret이 없는 경우 | webhook-signature 헤더를 포함하지 않는다. |
| AF-02 | 단계 2 | surveyIds가 빈 배열인 웹훅 | 해당 Environment의 모든 설문 이벤트를 수신 대상으로 포함한다. |

#### 4.5.6 예외 흐름 (Exception Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| EF-01 | 단계 4 | 5초 타임아웃 초과 | 해당 웹훅 전송을 실패로 처리한다. 다른 웹훅에는 영향을 주지 않는다. |
| EF-02 | 단계 4 | 네트워크 에러 발생 | 해당 웹훅 전송을 실패로 처리한다. 다른 웹훅에는 영향을 주지 않는다. |

#### 4.5.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-040-11 | 서명 대상 문자열 형식: "{webhook-id}.{webhook-timestamp}.{body}" (마침표로 구분) |
| BR-040-12 | 서명 알고리즘: HMAC-SHA256 |
| BR-040-13 | 서명 결과 형식: "v1,{base64 서명값}" |
| BR-040-14 | webhook-id 형식: UUID v7 |
| BR-040-15 | webhook-timestamp 형식: Unix timestamp (초 단위) |
| BR-040-16 | 웹훅 전송 타임아웃: 5,000ms (5초) |
| BR-040-17 | 개별 웹훅 전송 실패가 다른 웹훅 전송에 영향을 주지 않는다. |

#### 4.5.8 데이터 요구사항

**HTTP 요청 헤더:**

| 헤더명 | 타입 | 필수 여부 | 값 형식 |
|--------|------|----------|--------|
| content-type | string | 필수 | "application/json" |
| webhook-id | string | 필수 | UUID v7 |
| webhook-timestamp | string | 필수 | Unix timestamp (초) |
| webhook-signature | string | 조건부 (secret 존재 시) | "v1,{base64 HMAC-SHA256}" |

**페이로드 구조:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| webhookId | string | 웹훅 ID |
| event | string | 이벤트 타입 (responseCreated / responseUpdated / responseFinished) |
| data | object | 응답 데이터 |

#### 4.5.9 화면/UI 요구사항

해당 없음 (서버 사이드 처리).

#### 4.5.10 비기능 요구사항

- 웹훅 전송은 비동기로 처리되며, 개별 전송 실패가 응답 파이프라인의 다른 처리에 영향을 미치지 않아야 한다.
- 타임아웃은 5,000ms로 설정하여 hanging을 방지해야 한다.

---

### 4.6 엔드포인트 테스트

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-040-06 |
| 기능명 | 엔드포인트 테스트 |
| 관련 요구사항 ID | FR-040 (4.9) |
| 우선순위 | 중간 |
| 기능 설명 | 웹훅 엔드포인트의 도달 가능성을 테스트하기 위해 테스트 페이로드를 전송하고 응답을 확인한다. |

#### 4.6.2 선행 조건 (Preconditions)

- 사용자가 Integration Admin 권한으로 로그인된 상태여야 한다.
- 테스트 대상 URL이 입력되어 있어야 한다.

#### 4.6.3 후행 조건 (Postconditions)

- 테스트 결과(성공/실패)가 UI에 표시된다.
- 데이터베이스에 어떠한 변경도 발생하지 않는다.

#### 4.6.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | Integration Admin | 웹훅 폼에서 "Test Endpoint" 버튼을 클릭한다. |
| 2 | 시스템 | 입력된 URL에 대해 URL 유효성 검증을 수행한다 (FN-040-08 참조). |
| 3 | 시스템 | Discord 웹훅 차단 검사를 수행한다 (FN-040-07 참조). |
| 4 | 시스템 | 임시 시크릿을 생성한다. |
| 5 | 시스템 | Standard Webhooks 형식에 따라 테스트 페이로드를 구성한다. 이벤트 타입은 "testEndpoint"로 설정한다. |
| 6 | 시스템 | 임시 시크릿으로 서명을 생성하여 요청 헤더에 포함한다 (webhook-id, webhook-timestamp, webhook-signature). |
| 7 | 시스템 | HTTP POST 요청을 대상 URL로 전송한다. 타임아웃은 5초로 설정한다. |
| 8 | 시스템 | 응답 코드가 2xx인 경우 성공으로 판단하고, URL 입력 필드에 녹색 테두리를 표시한다. |

#### 4.6.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.6.6 예외 흐름 (Exception Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| EF-01 | 단계 2 | URL 유효성 검증 실패 | 해당 에러 메시지를 표시한다. |
| EF-02 | 단계 3 | Discord 웹훅 URL인 경우 | "Discord webhooks are currently not supported." 에러를 표시한다. |
| EF-03 | 단계 7 | 5초 타임아웃 초과 | 타임아웃 에러를 표시한다. |
| EF-04 | 단계 8 | 응답 코드가 2xx가 아닌 경우 | 실패로 표시하고 에러 메시지를 보여준다. 에러 메시지는 1,000자로 제한한다. |
| EF-05 | 단계 7 | 네트워크 에러 | 연결 실패 에러를 표시한다. 에러 메시지는 1,000자로 제한한다. |

#### 4.6.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-040-18 | 엔드포인트 테스트 타임아웃은 5,000ms(5초)이다. |
| BR-040-19 | 테스트 페이로드의 이벤트 타입은 "testEndpoint"이다. |
| BR-040-20 | 2xx 범위의 HTTP 응답 코드만 성공으로 판단한다. |
| BR-040-21 | 에러 메시지는 최대 1,000자로 제한한다. |

#### 4.6.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| url | string | 필수 | FN-040-01과 동일한 URL 검증 + Discord 차단 |

**테스트 페이로드:**

| 필드명 | 타입 | 값 |
|--------|------|-----|
| event | string | "testEndpoint" |

#### 4.6.9 화면/UI 요구사항

- "Test Endpoint" 버튼: 웹훅 URL 입력 필드 옆에 배치
- 테스트 성공 시: URL 입력 필드에 녹색 테두리 표시
- 테스트 실패 시: 에러 메시지 표시 (1,000자 이내)

#### 4.6.10 비기능 요구사항

- 테스트 요청은 5초 타임아웃을 엄격하게 적용해야 한다.

---

### 4.7 Discord 웹훅 차단

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-040-07 |
| 기능명 | Discord 웹훅 차단 |
| 관련 요구사항 ID | FR-040 (4.7) |
| 우선순위 | 중간 |
| 기능 설명 | Discord 웹훅 URL 패턴을 감지하여 웹훅 생성 및 엔드포인트 테스트를 차단한다. |

#### 4.7.2 선행 조건 (Preconditions)

- URL이 입력된 상태여야 한다.

#### 4.7.3 후행 조건 (Postconditions)

- Discord 웹훅 URL인 경우 해당 작업(생성/테스트)이 차단된다.
- Discord가 아닌 URL은 통과된다.

#### 4.7.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | 입력된 URL을 Discord 웹훅 패턴과 비교한다. |
| 2 | 시스템 | 패턴 불일치 시 검증을 통과시킨다. |

#### 4.7.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.7.6 예외 흐름 (Exception Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| EF-01 | 단계 1 | URL이 `https://discord.com/api/webhooks/{id}/{token}` 패턴과 일치 | 에러 메시지 "Discord webhooks are currently not supported."를 반환하고 작업을 차단한다. |

#### 4.7.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-040-22 | 차단 대상 패턴: `https://discord.com/api/webhooks/{id}/{token}` 형태의 URL |
| BR-040-23 | 차단은 웹훅 생성과 엔드포인트 테스트 모두에 적용된다. |
| BR-040-24 | 에러 메시지: "Discord webhooks are currently not supported." |

#### 4.7.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| url | string | 필수 | Discord 패턴 매칭 |

#### 4.7.9 화면/UI 요구사항

해당 없음 (검증 로직으로서 에러 메시지만 반환).

#### 4.7.10 비기능 요구사항

해당 없음.

---

### 4.8 URL 유효성 검증

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-040-08 |
| 기능명 | URL 유효성 검증 |
| 관련 요구사항 ID | FR-040 (4.8) |
| 우선순위 | 높음 |
| 기능 설명 | 웹훅 엔드포인트 URL의 형식을 검증한다. |

#### 4.8.2 선행 조건 (Preconditions)

- URL 입력 필드에 값이 존재해야 한다.

#### 4.8.3 후행 조건 (Postconditions)

- 유효한 URL인 경우 검증을 통과한다.
- 유효하지 않은 URL인 경우 구체적인 에러 메시지를 반환한다.

#### 4.8.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | URL이 비어있는지 검사한다. |
| 2 | 시스템 | URL이 HTTPS 프로토콜을 사용하는지 검사한다. |
| 3 | 시스템 | URL에 프로토콜 부분(`https://`) 이후 연속 슬래시(`//`)가 포함되어 있는지 검사한다. |
| 4 | 시스템 | 도메인의 TLD(Top-Level Domain)가 2자 이상인지 검사한다 (예: `.com`, `.io` 등). |
| 5 | 시스템 | 모든 검증을 통과하면 유효한 URL로 판단한다. |

#### 4.8.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.8.6 예외 흐름 (Exception Flow)

| ID | 분기 지점 | 조건 | 에러 메시지 |
|----|----------|------|-----------|
| EF-01 | 단계 1 | URL이 비어있음 | "Please enter a URL" |
| EF-02 | 단계 2 | HTTPS 프로토콜이 아님 | URL 형식 에러 |
| EF-03 | 단계 3 | 프로토콜 이후 연속 슬래시 존재 | URL 형식 에러 |
| EF-04 | 단계 4 | TLD가 2자 미만 | 도메인 형식 에러 |

#### 4.8.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-040-25 | HTTPS 프로토콜만 허용한다. HTTP는 거부한다. |
| BR-040-26 | 프로토콜 부분(`https://`)을 제외한 URL 경로에서 연속 슬래시(`//`)가 존재하면 거부한다. |
| BR-040-27 | 도메인의 TLD는 2자 이상이어야 한다 (예: formbricks.com은 유효, formbricks.c는 무효). |

#### 4.8.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| url | string | 필수 | 위 비즈니스 규칙 참조 |

#### 4.8.9 화면/UI 요구사항

- 검증 실패 시 URL 입력 필드 아래에 에러 메시지를 표시한다.

#### 4.8.10 비기능 요구사항

해당 없음.

---

### 4.9 설문 선택

#### 4.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-040-09 |
| 기능명 | 설문 선택 (All/Specific) |
| 관련 요구사항 ID | FR-040 (4.11) |
| 우선순위 | 높음 |
| 기능 설명 | 웹훅 생성/수정 시 이벤트를 수신할 설문의 범위를 설정한다. |

#### 4.9.2 선행 조건 (Preconditions)

- 웹훅 생성 또는 수정 폼이 열린 상태여야 한다.
- 해당 Environment에 1개 이상의 설문이 존재해야 한다 (Specific Surveys 선택 시).

#### 4.9.3 후행 조건 (Postconditions)

- surveyIds 값이 설정된다: 빈 배열(All Surveys) 또는 선택된 설문 ID 배열(Specific Surveys).

#### 4.9.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | 설문 선택 옵션을 표시한다: "All Surveys" (기본값), "Specific Surveys". |
| 2-A | Integration Admin | "All Surveys"를 선택한 경우: surveyIds를 빈 배열([])로 설정한다. |
| 2-B | Integration Admin | "Specific Surveys"를 선택한 경우: 현재 Environment의 설문 목록을 표시하고 개별 선택을 허용한다. |
| 3 | 시스템 | 선택 결과를 surveyIds 필드에 반영한다. |

#### 4.9.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.9.6 예외 흐름 (Exception Flow)

해당 없음.

#### 4.9.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-040-28 | "All Surveys" 선택 시 surveyIds는 빈 배열([])로 설정되며, 해당 Environment의 모든 설문 이벤트를 수신한다. |
| BR-040-29 | "Specific Surveys" 선택 시 surveyIds에 포함된 설문 ID에 해당하는 이벤트만 수신한다. |

#### 4.9.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| selectionType | enum | 필수 | "all" 또는 "specific" |
| surveyIds | string[] | 조건부 (specific 선택 시) | 유효한 설문 ID 배열 |

#### 4.9.9 화면/UI 요구사항

- 라디오 버튼 또는 토글: "All Surveys" / "Specific Surveys"
- "Specific Surveys" 선택 시 설문 목록을 체크박스 리스트로 표시

#### 4.9.10 비기능 요구사항

해당 없음.

---

### 4.10 Google Sheets 통합

#### 4.10.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-041-01 |
| 기능명 | Google Sheets 통합 |
| 관련 요구사항 ID | FR-041 (4.12) |
| 우선순위 | 중간 |
| 기능 설명 | 설문 응답 완료(responseFinished) 시 Google Sheets 스프레드시트에 행을 자동 추가한다. |

#### 4.10.2 선행 조건 (Preconditions)

- Google Sheets OAuth 2.0 인증이 완료된 상태여야 한다.
- 대상 스프레드시트가 지정되어 있어야 한다.
- 통합이 활성화된 상태여야 한다.

#### 4.10.3 후행 조건 (Postconditions)

- 설문 응답 데이터가 대상 스프레드시트에 새 행으로 추가된다.

#### 4.10.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | responseFinished 이벤트를 감지한다. |
| 2 | 시스템 | Google Sheets 통합이 활성화된 설문인지 확인한다. |
| 3 | 시스템 | 데이터 처리 옵션에 따라 포함할 데이터를 구성한다: 포함할 질문 ID 목록의 응답 값, 설문 변수 (옵션), 응답 메타데이터 (옵션), 히든 필드 (옵션), 응답 생성 시간 (옵션). |
| 4 | 시스템 | 메타데이터 포함 시 문자열 변환: Source, URL, Browser, OS, Device, Country, Action, IP Address 각 항목을 줄바꿈으로 구분하여 하나의 문자열로 결합한다. |
| 5 | 시스템 | Google Sheets API를 호출하여 스프레드시트에 행을 추가한다. |

#### 4.10.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-01 | 단계 2 | 해당 설문에 Google Sheets 통합이 설정되지 않은 경우 | 처리를 건너뛴다. |

#### 4.10.6 예외 흐름 (Exception Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| EF-01 | 단계 5 | Google Sheets API 호출 실패 | 에러를 로깅하고 다른 통합 처리에 영향 없이 진행한다. |
| EF-02 | 단계 2 | OAuth 토큰 만료 | 토큰 갱신을 시도하고, 실패 시 에러를 로깅한다. |

#### 4.10.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-041-01 | Google Sheets 통합은 responseFinished 이벤트에서만 트리거된다. |
| BR-041-02 | 인증 방식은 OAuth 2.0이다. |
| BR-041-03 | 메타데이터 문자열 변환 시 각 항목(Source, URL, Browser, OS, Device, Country, Action, IP Address)을 줄바꿈(`\n`)으로 구분한다. |

#### 4.10.8 데이터 요구사항

**데이터 처리 옵션:**

| 옵션 | 타입 | 필수 여부 | 설명 |
|------|------|----------|------|
| includeVariables | boolean | 선택 | 설문 변수 포함 여부 |
| includeMetadata | boolean | 선택 | 응답 메타데이터 포함 여부 |
| includeHiddenFields | boolean | 선택 | 히든 필드 포함 여부 |
| includeCreatedAt | boolean | 선택 | 응답 생성 시간 포함 여부 |
| questionIds | string[] | 선택 | 포함할 질문 ID 목록 |

**메타데이터 항목:**

| 항목 | 설명 |
|------|------|
| Source | 응답 소스 |
| URL | 응답 URL |
| Browser | 브라우저 정보 |
| OS | 운영체제 정보 |
| Device | 디바이스 정보 |
| Country | 국가 정보 |
| Action | 액션 정보 |
| IP Address | IP 주소 |

#### 4.10.9 화면/UI 요구사항

- 통합 설정 화면에서 Google 계정 연결 버튼 (OAuth 2.0 플로우)
- 대상 스프레드시트 선택 UI
- 데이터 포함 옵션 체크박스

#### 4.10.10 비기능 요구사항

- Google Sheets API 호출 실패가 다른 통합 처리에 영향을 미치지 않아야 한다.

---

### 4.11 Slack 통합

#### 4.11.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-041-02 |
| 기능명 | Slack 통합 |
| 관련 요구사항 ID | FR-041 (4.12) |
| 우선순위 | 중간 |
| 기능 설명 | 설문 응답 완료(responseFinished) 시 Slack 채널에 메시지를 자동 전송한다. |

#### 4.11.2 선행 조건 (Preconditions)

- Slack OAuth 2.0 인증이 완료된 상태여야 한다.
- 대상 Slack 채널이 지정되어 있어야 한다.
- 통합이 활성화된 상태여야 한다.

#### 4.11.3 후행 조건 (Postconditions)

- 설문 응답 데이터가 대상 Slack 채널에 메시지로 전송된다.

#### 4.11.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | responseFinished 이벤트를 감지한다. |
| 2 | 시스템 | Slack 통합이 활성화된 설문인지 확인한다. |
| 3 | 시스템 | 데이터 처리 옵션에 따라 포함할 데이터를 구성한다 (FN-041-01과 동일한 옵션). |
| 4 | 시스템 | 메타데이터 포함 시 문자열 변환을 수행한다 (FN-041-01과 동일). |
| 5 | 시스템 | Slack API를 호출하여 대상 채널에 메시지를 전송한다. |

#### 4.11.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-01 | 단계 2 | 해당 설문에 Slack 통합이 설정되지 않은 경우 | 처리를 건너뛴다. |

#### 4.11.6 예외 흐름 (Exception Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| EF-01 | 단계 5 | Slack API 호출 실패 | 에러를 로깅하고 다른 통합 처리에 영향 없이 진행한다. |
| EF-02 | 단계 2 | OAuth 토큰 만료 | 토큰 갱신을 시도하고, 실패 시 에러를 로깅한다. |

#### 4.11.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-041-04 | Slack 통합은 responseFinished 이벤트에서만 트리거된다. |
| BR-041-05 | 인증 방식은 OAuth 2.0이다. |

#### 4.11.8 데이터 요구사항

FN-041-01(Google Sheets 통합)과 동일한 데이터 처리 옵션 및 메타데이터 구조를 따른다.

#### 4.11.9 화면/UI 요구사항

- 통합 설정 화면에서 Slack 워크스페이스 연결 버튼 (OAuth 2.0 플로우)
- 대상 채널 선택 UI
- 데이터 포함 옵션 체크박스

#### 4.11.10 비기능 요구사항

- Slack API 호출 실패가 다른 통합 처리에 영향을 미치지 않아야 한다.

---

### 4.12 Airtable 통합

#### 4.12.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-041-03 |
| 기능명 | Airtable 통합 |
| 관련 요구사항 ID | FR-041 (4.12) |
| 우선순위 | 중간 |
| 기능 설명 | 설문 응답 완료(responseFinished) 시 Airtable 테이블에 레코드를 자동 추가한다. |

#### 4.12.2 선행 조건 (Preconditions)

- Airtable OAuth 2.0 인증이 완료된 상태여야 한다.
- 대상 Base와 테이블이 지정되어 있어야 한다.
- 통합이 활성화된 상태여야 한다.

#### 4.12.3 후행 조건 (Postconditions)

- 설문 응답 데이터가 대상 Airtable 테이블에 새 레코드로 추가된다.

#### 4.12.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | responseFinished 이벤트를 감지한다. |
| 2 | 시스템 | Airtable 통합이 활성화된 설문인지 확인한다. |
| 3 | 시스템 | 데이터 처리 옵션에 따라 포함할 데이터를 구성한다 (FN-041-01과 동일한 옵션). |
| 4 | 시스템 | 메타데이터 포함 시 문자열 변환을 수행한다 (FN-041-01과 동일). |
| 5 | 시스템 | Airtable API를 호출하여 대상 테이블에 레코드를 추가한다. |

#### 4.12.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-01 | 단계 2 | 해당 설문에 Airtable 통합이 설정되지 않은 경우 | 처리를 건너뛴다. |

#### 4.12.6 예외 흐름 (Exception Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| EF-01 | 단계 5 | Airtable API 호출 실패 | 에러를 로깅하고 다른 통합 처리에 영향 없이 진행한다. |
| EF-02 | 단계 2 | OAuth 토큰 만료 | 토큰 갱신을 시도하고, 실패 시 에러를 로깅한다. |

#### 4.12.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-041-06 | Airtable 통합은 responseFinished 이벤트에서만 트리거된다. |
| BR-041-07 | 인증 방식은 OAuth 2.0이다. |

#### 4.12.8 데이터 요구사항

FN-041-01(Google Sheets 통합)과 동일한 데이터 처리 옵션 및 메타데이터 구조를 따른다.

#### 4.12.9 화면/UI 요구사항

- 통합 설정 화면에서 Airtable 계정 연결 버튼 (OAuth 2.0 플로우)
- 대상 Base 및 테이블 선택 UI
- 데이터 포함 옵션 체크박스

#### 4.12.10 비기능 요구사항

- Airtable API 호출 실패가 다른 통합 처리에 영향을 미치지 않아야 한다.

---

### 4.13 Notion 통합

#### 4.13.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-041-04 |
| 기능명 | Notion 통합 |
| 관련 요구사항 ID | FR-041 (4.12, 4.13) |
| 우선순위 | 중간 |
| 기능 설명 | 설문 응답 완료(responseFinished) 시 Notion 데이터베이스에 페이지를 자동 추가한다. Notion API의 컬럼 타입에 따른 특수 값 변환 로직을 포함한다. |

#### 4.13.2 선행 조건 (Preconditions)

- Notion OAuth 2.0 인증이 완료된 상태여야 한다.
- 대상 Notion 데이터베이스가 지정되어 있어야 한다.
- 통합이 활성화된 상태여야 한다.

#### 4.13.3 후행 조건 (Postconditions)

- 설문 응답 데이터가 대상 Notion 데이터베이스에 새 페이지로 추가된다.
- 데이터베이스 컬럼 타입에 맞게 값이 변환되어 저장된다.

#### 4.13.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | responseFinished 이벤트를 감지한다. |
| 2 | 시스템 | Notion 통합이 활성화된 설문인지 확인한다. |
| 3 | 시스템 | 데이터 처리 옵션에 따라 포함할 데이터를 구성한다 (FN-041-01과 동일한 옵션). |
| 4 | 시스템 | 메타데이터 포함 시 문자열 변환을 수행한다 (FN-041-01과 동일). |
| 5 | 시스템 | Notion 데이터베이스의 각 컬럼 타입을 확인하고 값 변환을 수행한다 (4.13.7 비즈니스 규칙 참조). |
| 6 | 시스템 | Notion API를 호출하여 데이터베이스에 페이지를 추가한다. |

#### 4.13.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-01 | 단계 2 | 해당 설문에 Notion 통합이 설정되지 않은 경우 | 처리를 건너뛴다. |

#### 4.13.6 예외 흐름 (Exception Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| EF-01 | 단계 6 | Notion API 호출 실패 | 에러를 로깅하고 다른 통합 처리에 영향 없이 진행한다. |
| EF-02 | 단계 2 | OAuth 토큰 만료 | 토큰 갱신을 시도하고, 실패 시 에러를 로깅한다. |
| EF-03 | 단계 5 | 값 변환 실패 (예: number 타입에 숫자가 아닌 값) | 해당 필드를 빈 값으로 처리하고 로깅한다. |

#### 4.13.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-041-08 | Notion 통합은 responseFinished 이벤트에서만 트리거된다. |
| BR-041-09 | 인증 방식은 OAuth 2.0이다. |
| BR-041-10 | Notion 컬럼 타입별 값 변환 규칙 (아래 표 참조). |
| BR-041-11 | Rich Text 컨텐츠는 Notion API의 최대 길이 제한을 적용한다. |

**Notion 타입별 값 변환 규칙:**

| Notion 타입 | 변환 방식 | 설명 |
|------------|----------|------|
| select | 이름(name) 형태로 변환 | 쉼표(,)를 제거한 후 이름 값으로 매핑 |
| multi_select | 복수 이름 목록으로 변환 | 여러 이름 값의 배열로 매핑 |
| title | 텍스트 컨텐츠 형태로 변환 | 문자열을 title 속성의 text content로 매핑 |
| rich_text | 텍스트 컨텐츠 형태로 변환 | 문자열을 rich_text 속성의 text content로 매핑. 최대 길이 제한 적용 |
| checkbox | boolean으로 변환 | 값이 "accepted" 또는 "clicked"인 경우 true, 그 외 false |
| date | 시작일(start) 형태로 변환 | 날짜 문자열을 date 속성의 start 값으로 매핑 |
| number | 정수로 파싱 | parseInt()로 정수 변환 |

#### 4.13.8 데이터 요구사항

FN-041-01(Google Sheets 통합)과 동일한 데이터 처리 옵션 및 메타데이터 구조를 따르되, Notion 타입별 값 변환 규칙이 추가로 적용된다.

#### 4.13.9 화면/UI 요구사항

- 통합 설정 화면에서 Notion 워크스페이스 연결 버튼 (OAuth 2.0 플로우)
- 대상 데이터베이스 선택 UI
- 데이터 포함 옵션 체크박스

#### 4.13.10 비기능 요구사항

- Notion API 호출 실패가 다른 통합 처리에 영향을 미치지 않아야 한다.

---

### 4.14 자동화 커넥터 관리

#### 4.14.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-041-05 |
| 기능명 | 자동화 커넥터 관리 |
| 관련 요구사항 ID | FR-041 (4.14) |
| 우선순위 | 중간 |
| 기능 설명 | Zapier, n8n, Make, ActivePieces 자동화 플랫폼이 각자의 API를 통해 Inquiry에 웹훅을 자동 등록하고, source 필드로 구분하여 관리한다. |

#### 4.14.2 선행 조건 (Preconditions)

- 자동화 플랫폼(Zapier/n8n/Make/ActivePieces)이 Inquiry API에 접근할 수 있어야 한다.
- 유효한 API 인증이 완료된 상태여야 한다.

#### 4.14.3 후행 조건 (Postconditions)

- 자동화 플랫폼에서 생성한 웹훅이 해당 source 타입으로 데이터베이스에 저장된다.
- 해당 웹훅이 구독한 이벤트 발생 시 자동화 플랫폼으로 페이로드가 전송된다.

#### 4.14.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 자동화 플랫폼 | Inquiry API를 통해 웹훅 등록 요청을 전송한다. source 필드에 자신의 플랫폼 식별자(zapier/n8n/make/activepieces)를 포함한다. |
| 2 | 시스템 | source 필드를 검증하고 웹훅을 생성한다. |
| 3 | 시스템 | 생성된 웹훅 정보(시크릿 포함)를 자동화 플랫폼에 반환한다. |
| 4 | 시스템 | 해당 웹훅이 구독한 이벤트 발생 시 Standard Webhooks 프로토콜에 따라 페이로드를 전송한다. |

#### 4.14.5 대안 흐름 (Alternative Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| AF-01 | 단계 1 | 자동화 플랫폼이 웹훅 삭제를 요청한 경우 | 해당 웹훅을 삭제한다. |
| AF-02 | 단계 1 | 자동화 플랫폼이 웹훅 수정을 요청한 경우 | 허용된 필드(name, url, triggers, surveyIds)를 수정한다. |

#### 4.14.6 예외 흐름 (Exception Flow)

| ID | 분기 지점 | 조건 | 동작 |
|----|----------|------|------|
| EF-01 | 단계 1 | 유효하지 않은 source 값 | 요청을 거부하고 에러를 반환한다. |
| EF-02 | 단계 2 | API 인증 실패 | 401 Unauthorized를 반환한다. |

#### 4.14.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-041-12 | 자동화 플랫폼별 source 값: Zapier="zapier", n8n="n8n", Make="make", ActivePieces="activepieces" |
| BR-041-13 | 자동화 플랫폼에서 생성된 웹훅도 Standard Webhooks 프로토콜을 따른다. |
| BR-041-14 | 자동화 플랫폼에서 생성된 웹훅은 UI의 웹훅 목록에서 source 필드로 구분하여 표시된다. |

#### 4.14.8 데이터 요구사항

**입력 데이터 (웹훅 자동 등록):**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| url | string | 필수 | FN-040-08과 동일한 URL 검증 |
| source | string | 필수 | "zapier", "n8n", "make", "activepieces" 중 하나 |
| triggers | string[] | 필수 | 유효한 트리거 이벤트 배열 |
| surveyIds | string[] | 선택 | 빈 배열 또는 유효한 설문 ID 배열 |
| name | string | 선택 | 없음 |

#### 4.14.9 화면/UI 요구사항

- 웹훅 목록에서 source 필드에 자동화 플랫폼 이름/아이콘을 표시한다.
- 자동화 플랫폼에서 생성된 웹훅은 UI에서 source 변경이 불가하다.

#### 4.14.10 비기능 요구사항

- 자동화 플랫폼의 웹훅 등록/삭제 API는 Management API의 Rate Limiting(100회/분)을 따른다.

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

#### Webhook

| 필드명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| id | string (CUID) | 필수 | 자동 생성 | 고유 식별자 |
| name | string \| null | 선택 | null | 웹훅 이름 |
| createdAt | datetime | 필수 | 자동 생성 (현재 시간) | 생성 시간 |
| updatedAt | datetime | 필수 | 자동 갱신 (현재 시간) | 수정 시간 |
| url | string | 필수 | - | 엔드포인트 URL (HTTPS 필수) |
| source | enum | 필수 | "user" | 소스 타입: user, zapier, make, n8n, activepieces |
| environmentId | string | 필수 | - | 소속 Environment ID (FK) |
| triggers | string[] | 필수 | - | 구독 이벤트 배열 |
| surveyIds | string[] | 필수 | [] | 대상 설문 ID 배열. 빈 배열이면 모든 설문 |
| secret | string \| null | 선택 | 자동 생성 | 서명 시크릿. "whsec_" 접두사 + base64(32bytes) |

#### WebhookSource (Enum)

| 값 | 설명 |
|-----|------|
| user | 사용자가 직접 생성 |
| zapier | Zapier에서 자동 생성 |
| make | Make(Integromat)에서 자동 생성 |
| n8n | n8n에서 자동 생성 |
| activepieces | ActivePieces에서 자동 생성 |

#### WebhookTrigger (Enum)

| 값 | 설명 |
|-----|------|
| responseCreated | 응답 생성 시 |
| responseUpdated | 응답 업데이트 시 |
| responseFinished | 응답 완료 시 |

### 5.2 엔티티 간 관계

```
Environment (1) ---- (*) Webhook
    |                       |
    |                       |--- source: WebhookSource
    |                       |--- triggers: WebhookTrigger[]
    |                       |--- surveyIds: Survey.id[]
    |
    +---- (*) Survey
    +---- (*) Integration (Google Sheets, Slack, Airtable, Notion)
```

- **Environment - Webhook**: 1:N 관계. 하나의 Environment에 여러 웹훅이 등록될 수 있다.
- **Webhook - Survey**: N:M 관계. surveyIds를 통해 다대다로 연결된다. surveyIds가 빈 배열이면 해당 Environment의 모든 설문과 연결된다.

### 5.3 데이터 흐름

```
[설문 응답 이벤트 발생]
        |
        v
[Pipeline: 이벤트 감지]
        |
        +--> [Webhook 목록 조회 (environmentId + triggers + surveyIds 필터)]
        |         |
        |         +--> [각 Webhook에 대해]
        |                   |
        |                   +--> [Standard Webhooks 페이로드 구성]
        |                   +--> [HMAC-SHA256 서명 생성 (secret 존재 시)]
        |                   +--> [HTTP POST 전송 (5초 타임아웃)]
        |
        +--> [네이티브 통합 처리 (responseFinished만)]
                  |
                  +--> [Google Sheets: 행 추가]
                  +--> [Slack: 메시지 전송]
                  +--> [Airtable: 레코드 추가]
                  +--> [Notion: 페이지 추가 (타입별 변환)]
```

---

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 외부 시스템 | 연동 방식 | 인증 | 설명 |
|------------|----------|------|------|
| Custom Webhook Consumer | HTTP POST (Standard Webhooks) | HMAC-SHA256 서명 | 사용자 정의 엔드포인트 |
| Google Sheets | Google Sheets API | OAuth 2.0 | 스프레드시트 행 추가 |
| Slack | Slack API | OAuth 2.0 | 채널 메시지 전송 |
| Airtable | Airtable API | OAuth 2.0 | 테이블 레코드 추가 |
| Notion | Notion API | OAuth 2.0 | 데이터베이스 페이지 추가 |
| Zapier | Inquiry Management API | API Key | 웹훅 자동 등록 (source: zapier) |
| n8n | Inquiry Management API | API Key | 웹훅 자동 등록 (source: n8n) |
| Make | Inquiry Management API | API Key | 웹훅 자동 등록 (source: make) |
| ActivePieces | Inquiry Management API | API Key | 웹훅 자동 등록 (source: activepieces) |

### 6.2 API 명세

#### 6.2.1 웹훅 생성 API

| 항목 | 내용 |
|------|------|
| Method | POST |
| Path | /api/v1/management/webhooks |
| Auth | API Key (Bearer) |
| Rate Limit | 100회/분 |

**Request Body:**

```json
{
  "url": "https://example.com/webhook",
  "name": "My Webhook",
  "triggers": ["responseCreated", "responseFinished"],
  "surveyIds": [],
  "source": "user"
}
```

**Response (201):**

```json
{
  "id": "clxyz...",
  "name": "My Webhook",
  "url": "https://example.com/webhook",
  "source": "user",
  "environmentId": "env_...",
  "triggers": ["responseCreated", "responseFinished"],
  "surveyIds": [],
  "createdAt": "2026-02-21T00:00:00.000Z",
  "updatedAt": "2026-02-21T00:00:00.000Z",
  "secret": "whsec_base64encodedvalue..."
}
```

#### 6.2.2 웹훅 목록 조회 API

| 항목 | 내용 |
|------|------|
| Method | GET |
| Path | /api/v1/management/webhooks |
| Auth | API Key (Bearer) |
| Rate Limit | 100회/분 |

**Response (200):**

```json
[
  {
    "id": "clxyz...",
    "name": "My Webhook",
    "url": "https://example.com/webhook",
    "source": "user",
    "environmentId": "env_...",
    "triggers": ["responseCreated", "responseFinished"],
    "surveyIds": [],
    "createdAt": "2026-02-21T00:00:00.000Z",
    "updatedAt": "2026-02-21T00:00:00.000Z"
  }
]
```

> 주의: secret 필드는 목록 조회 시 포함되지 않는다.

#### 6.2.3 웹훅 수정 API

| 항목 | 내용 |
|------|------|
| Method | PATCH |
| Path | /api/v1/management/webhooks/{webhookId} |
| Auth | API Key (Bearer) |
| Rate Limit | 100회/분 |

**Request Body (부분 업데이트):**

```json
{
  "name": "Updated Name",
  "url": "https://new-endpoint.com/webhook",
  "triggers": ["responseFinished"],
  "surveyIds": ["survey_id_1", "survey_id_2"]
}
```

> 주의: source, secret 필드는 수정 불가.

#### 6.2.4 웹훅 삭제 API

| 항목 | 내용 |
|------|------|
| Method | DELETE |
| Path | /api/v1/management/webhooks/{webhookId} |
| Auth | API Key (Bearer) |
| Rate Limit | 100회/분 |

**Response (200):**

```json
{
  "success": true
}
```

#### 6.2.5 엔드포인트 테스트 API

| 항목 | 내용 |
|------|------|
| Method | POST |
| Path | /api/v1/management/webhooks/test |
| Auth | API Key (Bearer) |
| Rate Limit | 100회/분 |

**Request Body:**

```json
{
  "url": "https://example.com/webhook"
}
```

**Response (200 - 성공):**

```json
{
  "success": true
}
```

**Response (400 - 실패):**

```json
{
  "success": false,
  "error": "Timeout: endpoint did not respond within 5 seconds"
}
```

#### 6.2.6 웹훅 페이로드 형식 (이벤트 발송)

**HTTP Headers:**

```
content-type: application/json
webhook-id: 0192abc0-def0-7abc-0123-456789abcdef
webhook-timestamp: 1708473600
webhook-signature: v1,K5oZfzN95Z3r2cgJxMH3ueKWfE0eMJ2YGMbMV4FkEjE=
```

**Body (responseFinished 예시):**

```json
{
  "webhookId": "clxyz...",
  "event": "responseFinished",
  "data": {
    "id": "response_...",
    "surveyId": "survey_...",
    "finished": true,
    "data": {
      "questionId1": "answer1",
      "questionId2": "answer2"
    },
    "meta": {
      "source": "link",
      "url": "https://example.com/survey/...",
      "browser": "Chrome",
      "os": "macOS",
      "device": "desktop",
      "country": "KR",
      "action": "",
      "ip": "127.0.0.1"
    },
    "createdAt": "2026-02-21T00:00:00.000Z",
    "updatedAt": "2026-02-21T00:00:00.000Z"
  }
}
```

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| 항목 | 요구사항 | 근거 |
|------|---------|------|
| 웹훅 전송 타임아웃 | 5,000ms (5초) | Pipeline 외부 호출 제한 시간 (NFR-001 참조) |
| 엔드포인트 테스트 타임아웃 | 5,000ms (5초) | hanging 방지 |
| 웹훅 목록 조회 | environmentId 인덱스 활용 | 조회 성능 보장 |

### 7.2 보안 요구사항

| 항목 | 요구사항 |
|------|---------|
| 페이로드 무결성 | HMAC-SHA256 서명으로 페이로드 무결성 보장 |
| 시크릿 보호 | 시크릿은 생성 시 1회만 노출. 이후 조회 불가 |
| 전송 프로토콜 | HTTPS 프로토콜 필수 (HTTP 거부) |
| Discord 차단 | Discord 웹훅 URL 차단 (호환성 문제) |
| 시크릿 엔트로피 | 256비트 (32바이트 CSPRNG) |
| 네이티브 통합 인증 | OAuth 2.0 프로토콜 사용 |

### 7.3 가용성 요구사항

| 항목 | 요구사항 |
|------|---------|
| 웹훅 독립성 | 개별 웹훅 전송 실패가 다른 웹훅 전송에 영향 없음 |
| 통합 독립성 | 개별 네이티브 통합 실패가 다른 통합에 영향 없음 |
| 자동화 커넥터 가용성 | 자동화 플랫폼의 웹훅 등록/삭제가 시스템 가용성에 영향 없음 |

---

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| 항목 | 제약 |
|------|------|
| 웹훅 소스 타입 | 5개로 고정 (user, zapier, make, n8n, activepieces) |
| 트리거 이벤트 | 3개로 고정 (responseCreated, responseUpdated, responseFinished) |
| 시크릿 형식 | "whsec_" 접두사 + base64(32 bytes), 변경 불가 |
| 서명 알고리즘 | HMAC-SHA256 고정 |
| 서명 형식 | "v1,{base64 서명값}" 고정 |
| 웹훅 ID 형식 | CUID (레코드 ID), UUID v7 (메시지 ID) |
| 타임아웃 | 5,000ms 고정 (웹훅 전송, 엔드포인트 테스트 모두) |
| URL 프로토콜 | HTTPS만 허용 |
| 에러 메시지 길이 | 1,000자 이내 |
| Notion Rich Text | Notion API 최대 길이 제한 적용 |
| 네이티브 통합 트리거 | responseFinished 이벤트에서만 동작 |
| 라이선스 | Community (OSS) - 웹훅 및 통합 기능은 Community 라이선스에 포함 |

### 8.2 비즈니스 제약사항

| 항목 | 제약 |
|------|------|
| Discord 차단 | Discord 웹훅은 호환성 문제로 인해 차단한다 |
| 시크릿 노출 정책 | 시크릿은 생성 시 1회만 노출하며, 보안을 위해 이후 조회를 차단한다 |

### 8.3 가정사항

| 항목 | 가정 |
|------|------|
| 네트워크 | 외부 웹훅 엔드포인트가 인터넷을 통해 접근 가능하다고 가정한다 |
| OAuth 2.0 | 네이티브 통합의 OAuth 2.0 인증 플로우가 각 서비스 제공자에 의해 정상 운영된다고 가정한다 |
| 자동화 플랫폼 | 자동화 플랫폼(Zapier, n8n, Make, ActivePieces)이 Inquiry API 스펙에 맞는 요청을 전송한다고 가정한다 |
| Standard Webhooks | 웹훅 소비자가 Standard Webhooks 사양에 따라 서명을 검증할 수 있다고 가정한다 |

---

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 요구사항 설명 | 기능 ID | 기능명 | 수용 기준 |
|------------|-------------|---------|--------|----------|
| FR-040 (4.1) | 웹훅 데이터 모델 | FN-040-01~04 | 웹훅 CRUD | - |
| FR-040 (4.2) | 웹훅 소스 5가지 | FN-040-01, FN-041-05 | 웹훅 생성, 자동화 커넥터 | AC-041-02 |
| FR-040 (4.3) | 웹훅 트리거 이벤트 3가지 | FN-040-01, FN-040-05 | 웹훅 생성, Standard Webhooks | AC-040-01 |
| FR-040 (4.4) | Standard Webhooks 프로토콜 | FN-040-05 | Standard Webhooks 프로토콜 구현 | AC-040-02 |
| FR-040 (4.5) | 웹훅 생성 | FN-040-01 | 웹훅 생성 | AC-040-01 |
| FR-040 (4.6) | 웹훅 생성 성공 모달 | FN-040-01 | 웹훅 생성 | AC-040-01 |
| FR-040 (4.7) | Discord 웹훅 차단 | FN-040-07 | Discord 웹훅 차단 | AC-040-03 |
| FR-040 (4.8) | URL 유효성 검증 | FN-040-08 | URL 유효성 검증 | AC-040-04 |
| FR-040 (4.9) | 엔드포인트 테스트 | FN-040-06 | 엔드포인트 테스트 | AC-040-03 |
| FR-040 (4.10) | 웹훅 수정 및 삭제 | FN-040-02, FN-040-03, FN-040-04 | 웹훅 조회/수정/삭제 | AC-040-01 |
| FR-040 (4.11) | 설문 선택 | FN-040-09 | 설문 선택 | AC-040-01 |
| FR-041 (4.12) | 네이티브 통합 4가지 | FN-041-01~04 | Google Sheets/Slack/Airtable/Notion | AC-041-01 |
| FR-041 (4.13) | Notion 특수 처리 | FN-041-04 | Notion 통합 | AC-041-01 |
| FR-041 (4.14) | 자동화 커넥터 4가지 | FN-041-05 | 자동화 커넥터 관리 | AC-041-02 |

### 9.2 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-02-21 | 1.0 | 초기 작성 - FSD-023 요구사항 명세서 기반 | Claude |
