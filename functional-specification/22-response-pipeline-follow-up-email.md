# 기능 명세서: 응답 파이프라인 및 후속 메일

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | 1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-022 (요구사항 명세서) / FR-033 ~ FR-034 |
| 상태 | 초안 |

---

## 2. 개요

### 2.1 목적

응답(Response)의 생성, 갱신, 완료 시점에 자동으로 후속 작업을 수행하는 파이프라인 시스템을 정의한다. 파이프라인은 웹훅 발송, 외부 통합 연동, 알림 이메일, Follow-Up Email 발송, autoComplete 처리를 일관된 흐름으로 실행한다.

### 2.2 범위

**포함 (In-scope)**
- 응답 파이프라인 3가지 트리거 이벤트 처리
- 웹훅 발송 (Standard Webhooks 프로토콜)
- 외부 통합 처리 (Google Sheets, Slack, Airtable, Notion)
- 응답 완료 알림 이메일 발송
- Follow-Up Email 시스템 (트리거, 수신자, 본문, 첨부 데이터)
- autoComplete 기능
- Rate Limiting

**제외 (Out-of-scope)**
- 웹훅 설정 UI/관리 (FSD-023 참조)
- REST API 인증 체계 (FSD-024 참조)

### 2.3 대상 사용자

| 역할 | 설명 |
|------|------|
| System (내부) | 파이프라인 트리거 및 처리를 수행하는 내부 시스템 |
| Survey Owner | Follow-Up Email을 설정하는 설문 소유자 |
| Team Member | Follow-Up Email 수신자로 지정 가능한 팀 멤버 |
| Respondent | Follow-Up Email 수신 대상인 설문 응답자 |
| External Service | 웹훅/통합 엔드포인트를 제공하는 외부 서비스 |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| Response | 설문에 대한 응답자의 답변 데이터 |
| Pipeline | 응답 이벤트 발생 시 순차/병렬로 실행되는 후속 작업의 흐름 |
| Webhook | 이벤트 발생 시 외부 URL로 HTTP POST 요청을 보내는 메커니즘 |
| Follow-Up Email | 응답 완료 후 응답자 또는 팀 멤버에게 자동 발송하는 맞춤 이메일 |
| autoComplete | 목표 응답 수 도달 시 설문을 자동으로 완료 상태로 전환하는 기능 |
| Integration | Google Sheets, Slack, Airtable, Notion 등 외부 서비스와의 데이터 연동 |
| Recall Tag | 이메일 본문 내에서 응답 데이터를 동적으로 치환하기 위한 태그 |
| Standard Webhooks | 웹훅 서명 검증 등 표준화된 웹훅 프로토콜 (webhook-id, webhook-timestamp, webhook-signature 헤더 포함) |
| Ending | 설문의 종료 화면. 조건에 따라 다른 종료 화면을 표시할 수 있음 |
| Hidden Field | 설문 URL 파라미터 등을 통해 전달되는 숨겨진 필드 값 |
| HTML Sanitization | 허용되지 않은 HTML 태그/속성을 제거하여 보안을 확보하는 처리 |
| Rate Limit | 일정 시간 내 요청 횟수를 제한하는 정책 |

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
[Client API] -- 응답 생성/업데이트/완료 -->
    [Pipeline API (내부 인증)]
        |
        +-- [Webhook Dispatcher]     --> [External Webhook Endpoints]
        +-- [Integration Handler]    --> [Google Sheets / Slack / Airtable / Notion]
        +-- [Notification Mailer]    --> [Survey Owner / Manager / Team Members]
        +-- [Follow-Up Mailer]       --> [Respondent / Team Members]
        +-- [AutoComplete Handler]   --> [Survey Status Update + Audit Log]
```

### 3.2 주요 기능 목록 (Feature List)

| 기능 ID | 기능명 | 관련 요구사항 | 우선순위 |
|---------|--------|-------------|---------|
| FN-022-01 | 파이프라인 트리거 처리 | FR-033 | 높음 |
| FN-022-02 | 파이프라인 내부 인증 | FR-033 | 높음 |
| FN-022-03 | 웹훅 발송 | FR-033 | 높음 |
| FN-022-04 | 외부 통합 처리 | FR-033 | 높음 |
| FN-022-05 | 알림 이메일 발송 | FR-033 | 중간 |
| FN-022-06 | autoComplete | FR-033 | 중간 |
| FN-022-07 | Follow-Up Email 권한 관리 | FR-034 | 높음 |
| FN-022-08 | Follow-Up Email 설정 | FR-034 | 높음 |
| FN-022-09 | Follow-Up Email 발송 | FR-034 | 높음 |
| FN-022-10 | Follow-Up 결과 추적 | FR-034 | 중간 |
| FN-022-11 | Follow-Up Rate Limiting | FR-034 | 높음 |

### 3.3 기능 간 관계도

```
[FN-022-01 파이프라인 트리거]
    |-- 인증 --> [FN-022-02 내부 인증]
    |
    |-- responseCreated / responseUpdated -->
    |       [FN-022-03 웹훅 발송]
    |
    |-- responseFinished -->
            [FN-022-03 웹훅 발송]
            [FN-022-04 외부 통합 처리]
            [FN-022-05 알림 이메일 발송]
            [FN-022-09 Follow-Up Email 발송]
                |-- 권한 확인 --> [FN-022-07 권한 관리]
                |-- 설정 참조 --> [FN-022-08 설정]
                |-- 결과 기록 --> [FN-022-10 결과 추적]
                |-- 제한 확인 --> [FN-022-11 Rate Limiting]
            [FN-022-06 autoComplete]
```

---

## 4. 상세 기능 명세

### 4.1 파이프라인 트리거 처리 [FN-022-01]

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-022-01 |
| 기능명 | 파이프라인 트리거 처리 |
| 관련 요구사항 ID | FR-033, AC-033-01 |
| 우선순위 | 높음 |
| 기능 설명 | 응답의 생성, 업데이트, 완료 이벤트에 따라 적절한 파이프라인 작업을 트리거한다 |

#### 4.1.2 선행 조건

- Client API에서 응답 생성/업데이트/완료 처리가 완료되었다
- 파이프라인 API가 정상 동작 중이다
- 내부 인증 시크릿이 설정되어 있다

#### 4.1.3 후행 조건

- 이벤트 타입에 맞는 파이프라인 작업이 모두 실행 완료되었다
- 개별 작업의 실패가 전체 파이프라인을 중단시키지 않았다

#### 4.1.4 기본 흐름

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Client API | 응답 생성/업데이트/완료 처리 후 파이프라인 API를 호출한다 |
| 2 | Pipeline API | 내부 인증 시크릿 헤더를 검증한다 (FN-022-02 참조) |
| 3 | Pipeline API | 이벤트 타입을 판별한다 (responseCreated / responseUpdated / responseFinished) |
| 4a | Pipeline API | **responseCreated**: 웹훅 발송(FN-022-03) + 텔레메트리 이벤트 기록 |
| 4b | Pipeline API | **responseUpdated**: 웹훅 발송(FN-022-03) |
| 4c | Pipeline API | **responseFinished**: 아래 순서로 실행 |
| 4c-1 | Pipeline API | 웹훅 Promise 생성 (모든 매칭 웹훅에 대해) |
| 4c-2 | Pipeline API | 통합(Integration) 처리 실행 (FN-022-04) |
| 4c-3 | Pipeline API | 알림 이메일 수신자 조회 (owner/manager + 알림 설정된 팀 멤버) |
| 4c-4 | Pipeline API | Follow-Up Email 발송 실행 (FN-022-09) |
| 4c-5 | Pipeline API | 알림 이메일 발송 Promise 생성 (FN-022-05) |
| 4c-6 | Pipeline API | autoComplete 처리 실행 (FN-022-06) |
| 4c-7 | Pipeline API | 웹훅 Promise + 알림 이메일 Promise 일괄 실행 |

#### 4.1.5 대안 흐름

- 해당 없음. 이벤트 타입에 따라 4a/4b/4c 중 하나가 실행된다.

#### 4.1.6 예외 흐름

| 조건 | 처리 |
|------|------|
| 내부 인증 실패 | 미인증 응답(401 Unauthorized) 반환. 파이프라인 미실행 |
| 알 수 없는 이벤트 타입 | 로그 기록 후 무시. 파이프라인 미실행 |
| 개별 웹훅 발송 실패 | 에러 로깅. 다른 웹훅/작업에 영향 없음 |
| 통합 처리 실패 | 에러 로깅. 전체 파이프라인 중단 없음 |
| 이메일 발송 실패 | 에러 로깅. 전체 파이프라인 중단 없음 |

#### 4.1.7 비즈니스 규칙

| 규칙 ID | 규칙 |
|---------|------|
| BR-01-01 | responseCreated 이벤트는 첫 번째 응답 데이터 수신 시 1회만 발생한다 |
| BR-01-02 | responseUpdated 이벤트는 부분 응답 업데이트 시마다 발생한다 |
| BR-01-03 | responseFinished 이벤트는 응답의 finished 필드가 true로 변경될 때 발생한다 |
| BR-01-04 | 통합, Follow-Up, autoComplete는 responseFinished 이벤트에서만 실행된다 |
| BR-01-05 | 개별 작업의 실패는 다른 작업의 실행에 영향을 주지 않는다 (에러 격리) |

#### 4.1.8 데이터 요구사항

**입력 데이터**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| eventType | string (enum) | Y | "responseCreated" / "responseUpdated" / "responseFinished" 중 하나 |
| responseId | string | Y | 유효한 응답 ID |
| surveyId | string | Y | 유효한 설문 ID |
| environmentId | string | Y | 유효한 환경 ID |
| internalSecret | string (header) | Y | 설정된 내부 인증 시크릿과 일치해야 함 |

**출력 데이터**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| status | string | 파이프라인 실행 결과 ("ok" / "unauthorized") |

#### 4.1.9 비기능 요구사항

- 개별 작업 실패가 전체 파이프라인을 중단시키지 않아야 한다 (에러 격리)
- 웹훅과 알림 이메일은 Promise 기반 병렬 실행으로 처리한다

---

### 4.2 파이프라인 내부 인증 [FN-022-02]

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-022-02 |
| 기능명 | 파이프라인 내부 인증 |
| 관련 요구사항 ID | FR-033, AC-033-01 |
| 우선순위 | 높음 |
| 기능 설명 | 파이프라인 API 호출 시 내부 인증 시크릿 헤더를 검증하여 내부 시스템만 접근을 허용한다 |

#### 4.2.2 선행 조건

- 내부 인증 시크릿이 환경 변수에 설정되어 있다

#### 4.2.3 후행 조건

- 인증 성공 시 파이프라인 처리가 진행된다
- 인증 실패 시 미인증 응답이 반환된다

#### 4.2.4 기본 흐름

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Client API | HTTP 요청 헤더에 내부 인증 시크릿을 포함하여 파이프라인 API를 호출한다 |
| 2 | Pipeline API | 요청 헤더에서 내부 인증 시크릿을 추출한다 |
| 3 | Pipeline API | 추출한 시크릿을 환경 변수에 설정된 시크릿과 비교한다 |
| 4 | Pipeline API | 일치하면 파이프라인 처리를 진행한다 |

#### 4.2.5 대안 흐름

- 해당 없음

#### 4.2.6 예외 흐름

| 조건 | 처리 |
|------|------|
| 인증 헤더 누락 | 401 Unauthorized 반환 |
| 시크릿 불일치 | 401 Unauthorized 반환 |

#### 4.2.7 비즈니스 규칙

| 규칙 ID | 규칙 |
|---------|------|
| BR-02-01 | 파이프라인 API는 내부 인증 시크릿 없이는 접근할 수 없다 |
| BR-02-02 | 시크릿 비교는 타이밍 공격 방지를 위해 상수 시간 비교를 사용해야 한다 |

#### 4.2.8 데이터 요구사항

**입력 데이터**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| x-internal-secret (헤더) | string | Y | 빈 문자열 불가. 환경 변수의 시크릿과 일치해야 함 |

---

### 4.3 웹훅 발송 [FN-022-03]

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-022-03 |
| 기능명 | 웹훅 발송 |
| 관련 요구사항 ID | FR-033, AC-033-01, AC-033-03 |
| 우선순위 | 높음 |
| 기능 설명 | 응답 이벤트 발생 시 매칭 조건에 부합하는 모든 웹훅 엔드포인트에 Standard Webhooks 프로토콜로 페이로드를 전송한다 |

#### 4.3.2 선행 조건

- 해당 Environment에 1개 이상의 웹훅이 등록되어 있다
- 웹훅의 트리거 목록에 현재 이벤트 타입이 포함되어 있다

#### 4.3.3 후행 조건

- 매칭된 모든 웹훅에 대해 HTTP POST 요청이 발송되었다
- 각 웹훅 호출 결과(성공/실패)가 로깅되었다

#### 4.3.4 기본 흐름

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Pipeline | 해당 Environment에 속한 모든 웹훅을 조회한다 |
| 2 | Pipeline | 현재 이벤트 타입이 트리거 목록에 포함된 웹훅만 필터링한다 |
| 3 | Pipeline | 필터링된 웹훅 중 해당 설문을 구독하거나 모든 설문을 구독(surveyIds가 빈 배열)하는 웹훅만 최종 선택한다 |
| 4 | Pipeline | 각 웹훅에 대해 페이로드를 구성한다 |
| 5 | Pipeline | Standard Webhooks 헤더를 생성한다 (webhook-id, webhook-timestamp, webhook-signature) |
| 6 | Pipeline | 각 웹훅 URL로 HTTP POST 요청을 발송한다 (5초 타임아웃) |

#### 4.3.5 대안 흐름

| 조건 | 처리 |
|------|------|
| 매칭되는 웹훅이 없음 | 웹훅 발송을 건너뛰고 다음 파이프라인 작업으로 진행한다 |
| 웹훅에 secret이 설정되지 않음 | webhook-signature 헤더를 포함하지 않고 발송한다 |

#### 4.3.6 예외 흐름

| 조건 | 처리 |
|------|------|
| 웹훅 호출 5초 타임아웃 | 에러를 로깅한다. 다른 웹훅 발송에 영향 없음 |
| 웹훅 엔드포인트 응답 오류 (4xx/5xx) | 에러를 로깅한다. 다른 웹훅 발송에 영향 없음 |
| 네트워크 연결 실패 | 에러를 로깅한다. 다른 웹훅 발송에 영향 없음 |

#### 4.3.7 비즈니스 규칙

| 규칙 ID | 규칙 |
|---------|------|
| BR-03-01 | surveyIds가 빈 배열인 웹훅은 해당 Environment의 모든 설문에 대해 트리거된다 |
| BR-03-02 | 웹훅 호출 타임아웃은 5,000ms(5초)이다 |
| BR-03-03 | 개별 웹훅 실패가 다른 웹훅 발송에 영향을 주지 않는다 |
| BR-03-04 | webhook-signature는 웹훅에 secret이 설정된 경우에만 생성한다 |

#### 4.3.8 데이터 요구사항

**웹훅 매칭 조건**

| 조건 | 설명 |
|------|------|
| environmentId 일치 | 웹훅이 해당 Environment에 속해야 함 |
| triggers 포함 | 웹훅의 트리거 배열에 현재 이벤트 타입이 포함되어야 함 |
| surveyIds 매칭 | surveyIds가 빈 배열(전체 구독)이거나 해당 설문 ID를 포함해야 함 |

**웹훅 페이로드 구조**

| 필드 | 타입 | 설명 |
|------|------|------|
| webhookId | string | 웹훅 고유 ID |
| event | string | 이벤트 타입 (예: "responseFinished") |
| data.id | string | 응답 ID |
| data.data | object | 응답 데이터 (질문별 답변) |
| data.survey.title | string | 설문 제목 |
| data.survey.type | string | 설문 유형 |
| data.survey.status | string | 설문 상태 |
| data.survey.createdAt | datetime | 설문 생성 시간 |
| data.survey.updatedAt | datetime | 설문 수정 시간 |

**Standard Webhooks 헤더**

| 헤더 | 타입 | 설명 |
|------|------|------|
| webhook-id | string | UUID v7 형식의 고유 식별자 |
| webhook-timestamp | number | Unix timestamp (초 단위) |
| webhook-signature | string | `v1,{HMAC-SHA256 base64}` 형식. secret이 설정된 웹훅에만 포함 |

---

### 4.4 외부 통합 처리 [FN-022-04]

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-022-04 |
| 기능명 | 외부 통합 처리 |
| 관련 요구사항 ID | FR-033, AC-033-03 |
| 우선순위 | 높음 |
| 기능 설명 | 응답 완료 이벤트 시 설정된 외부 통합(Google Sheets, Slack, Airtable, Notion)으로 응답 데이터를 전달한다 |

#### 4.4.2 선행 조건

- 이벤트 타입이 responseFinished이다
- 해당 설문에 1개 이상의 통합이 설정되어 있다
- 통합 서비스의 인증 정보가 유효하다

#### 4.4.3 후행 조건

- 설정된 모든 통합에 응답 데이터가 전달되었다
- 각 통합 처리 결과(성공/실패)가 로깅되었다

#### 4.4.4 기본 흐름

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Pipeline | 해당 설문에 설정된 통합 목록을 조회한다 |
| 2 | Pipeline | 각 통합에 대해 응답 데이터를 해당 서비스 형식으로 변환한다 |
| 3 | Pipeline | 통합별 옵션(변수 포함, 메타데이터 포함, 히든 필드 포함, 응답 생성 시간 포함)을 적용한다 |
| 4 | Pipeline | 변환된 데이터를 외부 서비스에 전달한다 |

**통합별 데이터 전달 방식**

| 통합 | 동작 |
|------|------|
| Google Sheets | 스프레드시트에 새 행(row)을 추가한다 |
| Slack | 설정된 채널에 메시지를 전송한다 |
| Airtable | 설정된 테이블에 새 레코드를 추가한다 |
| Notion | 설정된 데이터베이스에 새 페이지를 추가한다 |

#### 4.4.5 대안 흐름

| 조건 | 처리 |
|------|------|
| 설정된 통합이 없음 | 통합 처리를 건너뛰고 다음 파이프라인 작업으로 진행한다 |

#### 4.4.6 예외 흐름

| 조건 | 처리 |
|------|------|
| 외부 서비스 인증 실패 | 에러를 로깅한다. 전체 파이프라인 중단 없음 |
| 외부 서비스 응답 오류 | 에러를 로깅한다. 전체 파이프라인 중단 없음 |
| 네트워크 연결 실패 | 에러를 로깅한다. 전체 파이프라인 중단 없음 |

#### 4.4.7 비즈니스 규칙

| 규칙 ID | 규칙 |
|---------|------|
| BR-04-01 | 통합 처리는 responseFinished 이벤트에서만 실행된다 |
| BR-04-02 | 개별 통합 처리 실패가 전체 파이프라인을 중단시키지 않는다 |
| BR-04-03 | 각 통합은 변수 포함, 메타데이터 포함, 히든 필드 포함, 응답 생성 시간 포함 옵션을 독립적으로 설정할 수 있다 |

#### 4.4.8 데이터 요구사항

**통합 옵션**

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| includeVariables | boolean | false | 설문 변수를 데이터에 포함할지 여부 |
| includeMetadata | boolean | false | 응답 메타데이터를 포함할지 여부 |
| includeHiddenFields | boolean | false | 히든 필드 값을 포함할지 여부 |
| includeCreatedAt | boolean | false | 응답 생성 시간을 포함할지 여부 |

---

### 4.5 알림 이메일 발송 [FN-022-05]

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-022-05 |
| 기능명 | 알림 이메일 발송 |
| 관련 요구사항 ID | FR-033 |
| 우선순위 | 중간 |
| 기능 설명 | 응답 완료 시 설문 소유자, 관리자, 알림 설정이 활성화된 팀 멤버에게 알림 이메일을 발송한다 |

#### 4.5.2 선행 조건

- 이벤트 타입이 responseFinished이다
- 알림 이메일 수신 대상이 1명 이상 존재한다

#### 4.5.3 후행 조건

- 모든 수신 대상에게 알림 이메일 발송이 시도되었다

#### 4.5.4 기본 흐름

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Pipeline | 설문의 소유자(owner)와 관리자(manager)를 조회한다 |
| 2 | Pipeline | 해당 설문에 대해 알림 설정이 활성화된 팀 멤버를 조회한다 |
| 3 | Pipeline | 중복을 제거하여 수신자 목록을 확정한다 |
| 4 | Pipeline | 각 수신자에게 알림 이메일 발송 Promise를 생성한다 |
| 5 | Pipeline | 웹훅 Promise와 함께 일괄 실행한다 |

#### 4.5.5 대안 흐름

| 조건 | 처리 |
|------|------|
| 알림 수신 대상이 없음 | 알림 이메일 발송을 건너뛴다 |

#### 4.5.6 예외 흐름

| 조건 | 처리 |
|------|------|
| 이메일 발송 실패 | 에러를 로깅한다. 전체 파이프라인 중단 없음 |

#### 4.5.7 비즈니스 규칙

| 규칙 ID | 규칙 |
|---------|------|
| BR-05-01 | 알림 이메일은 responseFinished 이벤트에서만 발송된다 |
| BR-05-02 | 수신 대상은 설문의 owner, manager, 그리고 해당 설문에 대해 알림 설정이 ON인 팀 멤버이다 |

#### 4.5.8 데이터 요구사항

**수신자 조회 조건**

| 대상 | 조건 |
|------|------|
| Survey Owner | 설문 생성자. 항상 포함 |
| Manager | 설문 관리자. 항상 포함 |
| Team Member | 해당 설문에 대해 알림 설정이 ON인 팀 멤버 |

---

### 4.6 autoComplete [FN-022-06]

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-022-06 |
| 기능명 | autoComplete |
| 관련 요구사항 ID | FR-033, AC-033-02 |
| 우선순위 | 중간 |
| 기능 설명 | 설문에 목표 응답 수가 설정된 경우, 현재 응답 수가 목표에 도달하면 설문 상태를 자동으로 "completed"로 변경한다 |

#### 4.6.2 선행 조건

- 이벤트 타입이 responseFinished이다
- 해당 설문에 autoComplete 필드(목표 응답 수)가 설정되어 있다

#### 4.6.3 후행 조건

- 목표 응답 수에 도달한 경우 설문 상태가 "completed"로 변경되었다
- 상태 변경이 Audit Log에 기록되었다

#### 4.6.4 기본 흐름

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Pipeline | 설문의 autoComplete 필드(목표 응답 수)를 조회한다 |
| 2 | Pipeline | 현재 완료된 응답 수를 조회한다 |
| 3 | Pipeline | 현재 응답 수가 목표 응답 수 이상인지 비교한다 |
| 4 | Pipeline | 목표 도달 시 설문 상태를 "completed"로 변경한다 |
| 5 | Pipeline | Audit Log에 상태 변경을 기록한다 (userType: "system") |

#### 4.6.5 대안 흐름

| 조건 | 처리 |
|------|------|
| autoComplete 필드가 설정되지 않음 | autoComplete 처리를 건너뛴다 |
| 현재 응답 수가 목표 미만 | autoComplete 처리를 건너뛴다 |

#### 4.6.6 예외 흐름

| 조건 | 처리 |
|------|------|
| 설문 상태 변경 실패 | 에러를 로깅한다. 전체 파이프라인 중단 없음 |

#### 4.6.7 비즈니스 규칙

| 규칙 ID | 규칙 |
|---------|------|
| BR-06-01 | 현재 응답 수 >= 목표 응답 수 일 때 설문 상태를 "completed"로 변경한다 |
| BR-06-02 | autoComplete에 의한 상태 변경은 Audit Log에 userType "system"으로 기록한다 |
| BR-06-03 | autoComplete는 responseFinished 이벤트에서만 실행된다 |

#### 4.6.8 데이터 요구사항

**입력 데이터**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| survey.autoComplete | number (nullable) | N | null이면 autoComplete 비활성. 양의 정수여야 함 |

**Audit Log 데이터**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| action | string | "surveyStatusChanged" |
| userType | string | "system" |
| surveyId | string | 대상 설문 ID |
| oldStatus | string | 변경 전 상태 |
| newStatus | string | "completed" |

---

### 4.7 Follow-Up Email 권한 관리 [FN-022-07]

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-022-07 |
| 기능명 | Follow-Up Email 권한 관리 |
| 관련 요구사항 ID | FR-034, AC-034-03 |
| 우선순위 | 높음 |
| 기능 설명 | 환경(Cloud/Self-hosted)과 플랜에 따라 Follow-Up Email 기능의 사용 가능 여부를 제어한다 |

#### 4.7.2 선행 조건

- 조직의 플랜 정보가 확인 가능하다
- 배포 환경(Cloud/Self-hosted)이 식별 가능하다

#### 4.7.3 후행 조건

- 권한이 있는 경우: Follow-Up Email 설정 및 발송이 허용된다
- 권한이 없는 경우: UI에 잠금 아이콘과 업그레이드 안내가 표시된다

#### 4.7.4 기본 흐름

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | System | 현재 배포 환경을 확인한다 (Cloud / Self-hosted) |
| 2a | System | **Self-hosted**: Follow-Up Email 기능을 허용한다 |
| 2b | System | **Cloud**: 조직의 플랜을 확인한다 |
| 3 | System | **Cloud + Custom plan**: Follow-Up Email 기능을 허용한다 |
| 4 | System | **Cloud + Custom plan 미만**: Follow-Up Email 기능을 차단한다 |

#### 4.7.5 대안 흐름

- 해당 없음. 환경과 플랜 조합에 따라 허용/차단이 결정된다.

#### 4.7.6 예외 흐름

| 조건 | 처리 |
|------|------|
| 플랜 정보 조회 실패 | Follow-Up Email 기능을 차단한다 (안전한 기본값) |

#### 4.7.7 비즈니스 규칙

| 규칙 ID | 규칙 |
|---------|------|
| BR-07-01 | Cloud 환경에서는 Custom plan에서만 Follow-Up Email을 사용할 수 있다 |
| BR-07-02 | Self-hosted 환경에서는 모든 플랜에서 Follow-Up Email을 사용할 수 있다 |
| BR-07-03 | 권한이 없는 경우 UI에 잠금 아이콘과 업그레이드 안내를 표시한다 |

#### 4.7.8 데이터 요구사항

**권한 판단 입력**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| deploymentType | string (enum) | "cloud" / "self-hosted" |
| organizationPlan | string | 조직의 현재 플랜 (예: "free", "startup", "scale", "custom") |

**권한 판단 출력**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| isFollowUpAllowed | boolean | Follow-Up Email 사용 가능 여부 |

#### 4.7.9 화면/UI 요구사항

| 조건 | UI 표시 |
|------|---------|
| 권한 있음 | Follow-Up Email 설정 UI를 정상적으로 표시한다 |
| 권한 없음 | 잠금 아이콘을 표시하고 업그레이드 안내 메시지를 노출한다 |

---

### 4.8 Follow-Up Email 설정 [FN-022-08]

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-022-08 |
| 기능명 | Follow-Up Email 설정 |
| 관련 요구사항 ID | FR-034, AC-034-01 |
| 우선순위 | 높음 |
| 기능 설명 | Survey Owner가 Follow-Up Email의 트리거, 수신자, 제목, 본문, 첨부 옵션 등을 설정하는 기능이다 |

#### 4.8.2 선행 조건

- 사용자가 Survey Owner 또는 동등한 권한을 가지고 있다
- Follow-Up Email 사용 권한이 있다 (FN-022-07)
- 설문이 존재한다

#### 4.8.3 후행 조건

- Follow-Up Email 설정이 설문에 저장되었다
- 설정된 Follow-Up은 응답 완료 시 파이프라인에서 평가된다

#### 4.8.4 기본 흐름

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Survey Owner | Follow-Up 설정 모달을 연다 |
| 2 | Survey Owner | Follow-Up 이름을 입력한다 |
| 3 | Survey Owner | 트리거 타입을 선택한다 ("response" 또는 "endings") |
| 4 | Survey Owner | (endings 트리거인 경우) 대상 종료 화면을 1개 이상 선택한다 |
| 5 | Survey Owner | 수신자를 5가지 소스 중에서 선택한다 |
| 6 | Survey Owner | 회신 주소를 입력한다 (0개 이상) |
| 7 | Survey Owner | 이메일 제목을 입력한다 |
| 8 | Survey Owner | Rich Text Editor를 사용하여 이메일 본문을 작성한다 |
| 9 | Survey Owner | (선택) 응답 데이터 첨부를 활성화하고, 변수/히든 필드 포함 여부를 설정한다 |
| 10 | System | 입력 데이터를 유효성 검증한다 |
| 11 | System | Follow-Up 설정을 설문에 저장한다 |

#### 4.8.5 대안 흐름

| 조건 | 처리 |
|------|------|
| 트리거 타입이 "response" | 종료 화면 선택 단계(4)를 건너뛴다 |
| 응답 데이터 첨부를 비활성화 | 변수/히든 필드 포함 여부 옵션을 숨긴다 |

#### 4.8.6 예외 흐름

| 조건 | 처리 |
|------|------|
| "endings" 트리거인데 종료 화면 미선택 | 유효성 검증 실패. 최소 1개의 종료 화면을 선택하라는 오류 메시지를 표시한다 |
| 수신자 미선택 | 유효성 검증 실패. 수신자를 선택하라는 오류 메시지를 표시한다 |
| 제목 미입력 | 유효성 검증 실패. 제목을 입력하라는 오류 메시지를 표시한다 |

#### 4.8.7 비즈니스 규칙

| 규칙 ID | 규칙 |
|---------|------|
| BR-08-01 | 트리거 타입은 "response" 또는 "endings" 중 하나여야 한다 |
| BR-08-02 | "endings" 트리거 시 최소 1개 이상의 종료 화면을 선택해야 한다 |
| BR-08-03 | 회신 주소는 0개 이상 복수 입력 가능하다 |
| BR-08-04 | 이메일 본문에는 recall 태그를 포함할 수 있다 |

#### 4.8.8 데이터 요구사항

**Follow-Up Email 설정 데이터**

| 필드명 | 타입 | 필수 | 유효성 검증 |
|--------|------|------|------------|
| name | string | Y | 빈 문자열 불가 |
| trigger | string (enum) | Y | "response" / "endings" 중 하나 |
| endingIds | string[] | 조건부 (trigger=endings) | trigger가 "endings"이면 1개 이상 필요. 유효한 Ending ID여야 함 |
| to | string | Y | 이메일 주소 또는 유효한 질문 ID / 히든 필드 키 |
| from | string | Y | 시스템 이메일 주소 (자동 설정) |
| replyTo | string[] | N | 각 항목이 유효한 이메일 주소여야 함 |
| subject | string | Y | 빈 문자열 불가 |
| body | string (HTML) | Y | HTML 형식. Sanitization 적용됨 |
| attachResponseData | boolean | N | 기본값: false |
| includeVariables | boolean | N | 기본값: false. attachResponseData가 true일 때만 유효 |
| includeHiddenFields | boolean | N | 기본값: false. attachResponseData가 true일 때만 유효 |

**수신자 소스 타입 (5가지)**

| 소스 타입 | 식별 방법 | UI 아이콘 |
|-----------|----------|-----------|
| 인증된 이메일 | 이메일 인증 질문의 인증된 이메일 주소 | MailIcon |
| OpenText 질문 | 이메일 입력 타입의 OpenText 질문 ID | Element Icon |
| ContactInfo 질문 | ContactInfo 질문의 이메일 필드 ID | Element Icon |
| 히든 필드 | Hidden Field 키 | EyeOffIcon |
| 팀 멤버 | 팀 멤버 이메일 주소 (직접 지정) | UserIcon |

#### 4.8.9 화면/UI 요구사항

**Follow-Up 설정 모달 구성 요소**

| 영역 | 설명 |
|------|------|
| Follow-Up 이름 | 텍스트 입력 필드 |
| 트리거 타입 | "response" / "endings" 선택 드롭다운 또는 라디오 버튼 |
| 종료 화면 선택 | endings 트리거 시 표시. 복수 선택 가능한 종료 화면 목록 |
| 수신자 선택 | 5가지 소스 타입에서 선택. 각 소스 타입별 아이콘 표시 |
| 회신 주소 | 복수 이메일 입력 가능한 태그 입력 필드 |
| 제목 | 텍스트 입력 필드. Recall 태그 삽입 지원 |
| 본문 | Rich Text Editor. Recall 태그 삽입 지원 |
| 응답 데이터 첨부 | 토글 스위치. 활성화 시 변수/히든 필드 포함 체크박스 표시 |

---

### 4.9 Follow-Up Email 발송 [FN-022-09]

#### 4.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-022-09 |
| 기능명 | Follow-Up Email 발송 |
| 관련 요구사항 ID | FR-034, AC-034-02 |
| 우선순위 | 높음 |
| 기능 설명 | 응답 완료 시 해당 설문에 설정된 모든 Follow-Up Email을 평가하고, 조건에 부합하는 경우 이메일을 발송한다 |

#### 4.9.2 선행 조건

- 이벤트 타입이 responseFinished이다
- 해당 설문에 1개 이상의 Follow-Up 설정이 존재한다
- 조직의 Follow-Up Email 사용 권한이 있다 (FN-022-07)

#### 4.9.3 후행 조건

- 조건에 부합하는 모든 Follow-Up Email이 발송되었다
- 각 Follow-Up의 처리 결과가 기록되었다 (FN-022-10)

#### 4.9.4 기본 흐름

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Pipeline | 설문의 Follow-Up 설정 목록을 조회한다 |
| 2 | Pipeline | 조직의 Follow-Up Email 사용 권한을 확인한다 (FN-022-07) |
| 3 | Pipeline | Rate Limit을 확인한다 (FN-022-11) |
| 4 | Pipeline | 각 Follow-Up에 대해 트리거 조건을 평가한다 |
| 5 | Pipeline | 수신자 이메일 주소를 결정한다 (수신자 결정 로직 참조) |
| 6 | Pipeline | 이메일 본문의 Recall 태그를 응답 데이터로 치환한다 |
| 7 | Pipeline | 이메일 본문에 HTML Sanitization을 적용한다 |
| 8 | Pipeline | Storage URL을 절대 경로로 변환한다 |
| 9 | Pipeline | 법적 고지 정보를 이메일에 포함한다 (Privacy URL, Terms URL, Imprint URL/Address) |
| 10 | Pipeline | (attachResponseData가 true인 경우) 응답 데이터를 이메일에 첨부한다 |
| 11 | Pipeline | 이메일을 발송한다 |
| 12 | Pipeline | 처리 결과를 "success"로 기록한다 |

**수신자 결정 로직**

| 단계 | 조건 | 동작 |
|------|------|------|
| 1 | to 값이 직접 이메일 주소인가? | 해당 이메일로 바로 발송 |
| 2 | to 값이 이메일이 아닌 경우 | 응답 데이터에서 해당 키의 값을 추출 |
| 3 | 추출된 값이 문자열인 경우 | 이메일 형식 유효성 검증 후 발송 |
| 4 | 추출된 값이 배열인 경우 | 배열의 3번째 인덱스(index 2)에서 이메일을 추출 (ContactInfo 형식) |

#### 4.9.5 대안 흐름

| 조건 | 처리 |
|------|------|
| Follow-Up 설정이 없음 | Follow-Up 처리를 건너뛴다 |
| 트리거 타입이 "response" | 모든 응답 완료에 대해 발송한다 |
| 트리거 타입이 "endings" + 응답의 종료 화면 ID가 대상 목록에 포함 | 해당 Follow-Up을 발송한다 |
| 트리거 타입이 "endings" + 응답의 종료 화면 ID가 대상 목록에 미포함 | 해당 Follow-Up을 "skipped"로 기록한다 |

#### 4.9.6 예외 흐름

| 조건 | 처리 | 결과 상태 |
|------|------|----------|
| 조직의 Follow-Up 사용 권한 없음 | "follow_up_not_allowed" 에러 반환 | error |
| Rate Limit 초과 | "rate_limit_exceeded" 에러 반환 | error |
| 수신자 이메일 유효성 검증 실패 | "validation_error" 에러 기록 | error |
| 응답 데이터에서 이메일을 추출할 수 없음 | "validation_error" 에러 기록 | error |
| 조직 조회 실패 | "organization_not_found" 에러 기록 | error |
| 설문 조회 실패 | "survey_not_found" 에러 기록 | error |
| 응답 조회 실패 | "response_not_found" 에러 기록 | error |
| 응답과 설문 ID 불일치 | "response_survey_mismatch" 에러 기록 | error |
| 예기치 않은 오류 | "unexpected_error" 에러 기록 | error |

#### 4.9.7 비즈니스 규칙

| 규칙 ID | 규칙 |
|---------|------|
| BR-09-01 | Follow-Up Email은 responseFinished 이벤트에서만 실행된다 |
| BR-09-02 | "endings" 트리거의 Follow-Up은 응답의 종료 화면 ID가 설정된 대상 종료 화면 ID 목록에 포함될 때만 발송한다 |
| BR-09-03 | 종료 화면 ID가 대상 목록에 미포함인 경우 해당 Follow-Up은 "skipped" 상태로 기록한다 |
| BR-09-04 | 수신자(to) 값이 직접 이메일 주소인 경우 바로 발송하고, 그렇지 않으면 응답 데이터에서 이메일을 추출한다 |
| BR-09-05 | ContactInfo 질문의 경우 배열의 3번째 인덱스(index 2)에서 이메일을 추출한다 |
| BR-09-06 | 이메일 본문의 recall 태그는 해당 응답의 데이터로 치환한다 |
| BR-09-07 | 법적 고지(Privacy URL, Terms URL, Imprint URL/Address)를 이메일에 포함해야 한다 |

#### 4.9.8 데이터 요구사항

**이메일 본문 처리 규칙**

| 처리 | 상세 |
|------|------|
| Recall 태그 파싱 | 본문 내 recall 태그를 응답 데이터 값으로 치환 |
| HTML Sanitization | 허용 태그: p, span, b, strong, i, em, a, br |
| 허용 속성 | href, rel, target, dir, class |
| 허용 URL 스킴 | http, https |
| Storage URL 변환 | 이미지/파일의 상대 경로를 절대 경로로 변환 |

**법적 고지 포함 항목**

| 항목 | 설명 |
|------|------|
| Privacy URL | 개인정보 처리방침 링크 |
| Terms URL | 이용약관 링크 |
| Imprint URL/Address | 법적 고지 URL 또는 주소 |

#### 4.9.9 화면/UI 요구사항

- 해당 없음 (백엔드 자동 처리)

---

### 4.10 Follow-Up 결과 추적 [FN-022-10]

#### 4.10.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-022-10 |
| 기능명 | Follow-Up 결과 추적 |
| 관련 요구사항 ID | FR-034 |
| 우선순위 | 중간 |
| 기능 설명 | 각 Follow-Up Email의 처리 결과를 상태(success/error/skipped)로 기록하고, 에러 발생 시 에러 코드와 메시지를 함께 저장한다 |

#### 4.10.2 선행 조건

- Follow-Up Email 발송 처리가 완료되었다 (FN-022-09)

#### 4.10.3 후행 조건

- 각 Follow-Up의 처리 결과가 영구 저장되었다

#### 4.10.4 기본 흐름

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Pipeline | Follow-Up Email 처리 결과를 수집한다 |
| 2 | Pipeline | 결과 상태를 판별한다 (success / error / skipped) |
| 3 | Pipeline | (error인 경우) 에러 코드와 메시지를 포함하여 저장한다 |
| 4 | Pipeline | 결과를 데이터베이스에 기록한다 |

#### 4.10.5 대안 흐름

- 해당 없음

#### 4.10.6 예외 흐름

| 조건 | 처리 |
|------|------|
| 결과 저장 실패 | 에러를 로깅한다. 이메일 발송 자체에는 영향 없음 |

#### 4.10.7 비즈니스 규칙

| 규칙 ID | 규칙 |
|---------|------|
| BR-10-01 | 모든 Follow-Up 처리 결과는 success, error, skipped 중 하나의 상태로 기록해야 한다 |
| BR-10-02 | error 상태 시 에러 코드를 반드시 포함해야 한다 |

#### 4.10.8 데이터 요구사항

**결과 상태 정의**

| 상태 | 설명 |
|------|------|
| success | 이메일이 성공적으로 발송됨 |
| error | 오류 발생으로 발송 실패 |
| skipped | 트리거 조건 불일치로 발송 건너뜀 |

**에러 코드 목록**

| 코드 | 설명 |
|------|------|
| validation_error | 입력 값 유효성 검증 실패 |
| organization_not_found | 조직을 찾을 수 없음 |
| survey_not_found | 설문을 찾을 수 없음 |
| response_not_found | 응답을 찾을 수 없음 |
| response_survey_mismatch | 응답과 설문 ID 불일치 |
| follow_up_not_allowed | 조직 플랜에서 Follow-Up 미허용 |
| rate_limit_exceeded | Rate Limit 초과 |
| unexpected_error | 예기치 않은 오류 |

---

### 4.11 Follow-Up Rate Limiting [FN-022-11]

#### 4.11.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-022-11 |
| 기능명 | Follow-Up Rate Limiting |
| 관련 요구사항 ID | FR-034, AC-034-02 |
| 우선순위 | 높음 |
| 기능 설명 | 조직(Organization) 단위로 Follow-Up Email 발송 횟수를 시간당 50건으로 제한한다 |

#### 4.11.2 선행 조건

- 조직 ID가 식별 가능하다
- Follow-Up Email 발송 요청이 수신되었다

#### 4.11.3 후행 조건

- Rate Limit 이내: Follow-Up Email 발송이 허용된다
- Rate Limit 초과: "rate_limit_exceeded" 에러가 반환된다

#### 4.11.4 기본 흐름

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | Pipeline | 조직 ID를 기반으로 현재 시간 윈도우(1시간) 내 발송 횟수를 조회한다 |
| 2 | Pipeline | 발송 횟수가 50건 미만인지 확인한다 |
| 3 | Pipeline | 50건 미만이면 Follow-Up 발송을 허용하고 카운터를 증가시킨다 |

#### 4.11.5 대안 흐름

- 해당 없음

#### 4.11.6 예외 흐름

| 조건 | 처리 |
|------|------|
| Rate Limit 초과 (시간당 50건 이상) | "rate_limit_exceeded" 에러를 반환한다. 해당 Follow-Up은 "error" 상태로 기록된다 |

#### 4.11.7 비즈니스 규칙

| 규칙 ID | 규칙 |
|---------|------|
| BR-11-01 | Rate Limit은 조직(Organization) ID 기준으로 적용한다 |
| BR-11-02 | 제한은 시간당 50건이다 |
| BR-11-03 | 시간 윈도우는 슬라이딩 윈도우 또는 고정 윈도우 방식으로 구현할 수 있다 |

#### 4.11.8 데이터 요구사항

**Rate Limit 설정**

| 항목 | 값 |
|------|-----|
| 기준 단위 | 조직(Organization) ID |
| 시간 윈도우 | 1시간 |
| 최대 허용 건수 | 50건 |

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

| 엔티티 | 설명 | 주요 필드 |
|--------|------|----------|
| Survey | 설문 | id, title, type, status, autoComplete, followUps, environmentId |
| Response | 응답 | id, surveyId, data, finished, endingId, createdAt |
| Webhook | 웹훅 | id, environmentId, url, triggers[], surveyIds[], secret |
| Integration | 통합 | id, surveyId, type, config, options |
| FollowUp | Follow-Up 설정 | id, surveyId, name, trigger, endingIds[], to, from, replyTo[], subject, body, attachResponseData, includeVariables, includeHiddenFields |
| FollowUpResult | Follow-Up 결과 | id, followUpId, responseId, status, errorCode, errorMessage |
| Organization | 조직 | id, plan, deploymentType |
| Environment | 환경 | id, organizationId |
| AuditLog | 감사 로그 | id, action, userType, entityId, data, createdAt |

### 5.2 엔티티 간 관계

```
Organization (1) --- (*) Environment
Environment  (1) --- (*) Survey
Environment  (1) --- (*) Webhook
Survey       (1) --- (*) Response
Survey       (1) --- (*) Integration
Survey       (1) --- (*) FollowUp
FollowUp     (1) --- (*) FollowUpResult
Response     (1) --- (*) FollowUpResult
```

### 5.3 데이터 흐름

```
[Response 생성/업데이트/완료]
    |
    v
[Pipeline API]
    |
    +---> [Webhook] ---> 외부 엔드포인트로 HTTP POST
    |
    +---> [Integration] ---> 외부 서비스로 데이터 전달
    |
    +---> [알림 이메일] ---> Owner/Manager/Team Member에게 이메일
    |
    +---> [Follow-Up] ---> Respondent/Team Member에게 이메일
    |         |
    |         +---> [FollowUpResult] 결과 저장
    |
    +---> [autoComplete] ---> Survey 상태 변경 + AuditLog 기록
```

---

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 대상 시스템 | 연동 방식 | 프로토콜 | 방향 |
|------------|----------|---------|------|
| Webhook Endpoints | HTTP POST | Standard Webhooks (HTTPS) | 아웃바운드 |
| Google Sheets | Google Sheets API | HTTPS (OAuth 2.0) | 아웃바운드 |
| Slack | Slack API | HTTPS (Bot Token) | 아웃바운드 |
| Airtable | Airtable API | HTTPS (API Key/Token) | 아웃바운드 |
| Notion | Notion API | HTTPS (Integration Token) | 아웃바운드 |
| Email Service | SMTP / Email API | SMTP/HTTPS | 아웃바운드 |

### 6.2 내부 API 명세

**파이프라인 트리거 API**

| 항목 | 값 |
|------|-----|
| 엔드포인트 | POST /api/pipeline |
| 인증 | 내부 시크릿 헤더 |
| Content-Type | application/json |

**요청 바디**

```json
{
  "eventType": "responseCreated | responseUpdated | responseFinished",
  "responseId": "string",
  "surveyId": "string",
  "environmentId": "string"
}
```

**응답**

| 상태 코드 | 설명 |
|----------|------|
| 200 | 파이프라인 실행 완료 |
| 401 | 내부 인증 실패 |

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 웹훅 호출 타임아웃 | 5,000ms (5초) |
| 파이프라인 실행 | 웹훅/이메일은 Promise 기반 병렬 실행으로 처리하여 전체 파이프라인 지연을 최소화한다 |

### 7.2 보안 요구사항

| 항목 | 요구사항 |
|------|---------|
| 파이프라인 API 인증 | 내부 인증 시크릿 헤더로 인증. 외부 접근 차단 |
| 시크릿 비교 | 타이밍 공격 방지를 위한 상수 시간 비교 권장 |
| 웹훅 서명 | Standard Webhooks 프로토콜. HMAC-SHA256 서명 (v1,{base64}) |
| HTML Sanitization | Follow-Up 이메일 본문에 대해 허용 태그/속성만 유지 |
| 허용 태그 | p, span, b, strong, i, em, a, br (7개) |
| 허용 속성 | href, rel, target, dir, class |
| 허용 URL 스킴 | http, https |

### 7.3 가용성 요구사항

| 항목 | 요구사항 |
|------|---------|
| 에러 격리 | 개별 웹훅/이메일/통합 실패가 전체 파이프라인을 중단시키지 않아야 한다 |
| Rate Limiting | Follow-Up Email: 조직당 시간당 50건 제한으로 시스템 과부하를 방지한다 |
| 감사 로그 | autoComplete에 의한 설문 상태 변경은 Audit Log에 기록한다 |

---

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| 항목 | 내용 |
|------|------|
| 웹훅 타임아웃 | 5,000ms (5초) 고정 |
| HTML 허용 태그 | 7개로 제한 (p, span, b, strong, i, em, a, br) |
| Follow-Up Rate Limit | 조직당 시간당 50건 고정 |
| ContactInfo 이메일 위치 | 배열의 3번째 인덱스(index 2) 고정 |

### 8.2 비즈니스 제약사항

| 항목 | 내용 |
|------|------|
| Follow-Up 라이선스 | Cloud: Custom plan 전용. Self-hosted: 제한 없음 |
| 지원 통합 | Google Sheets, Slack, Airtable, Notion (4개) |
| 파이프라인 트리거 이벤트 | responseCreated, responseUpdated, responseFinished (3개) |

### 8.3 가정사항

| 항목 | 내용 |
|------|------|
| 이메일 서비스 | 외부 이메일 발송 서비스(SMTP 또는 이메일 API)가 정상 동작한다고 가정한다 |
| 외부 통합 | Google Sheets, Slack, Airtable, Notion API가 정상 동작하고 인증 정보가 유효하다고 가정한다 |
| 내부 시크릿 | 파이프라인 내부 인증 시크릿이 환경 변수에 안전하게 설정되어 있다고 가정한다 |
| 감사 로그 | Audit Log 시스템이 이미 구축되어 있다고 가정한다 (FSD-005 참조) |

---

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 요구사항 설명 | 기능 ID | 기능명 | 수용 기준 |
|------------|-------------|---------|--------|----------|
| FR-033 | 응답 파이프라인 | FN-022-01 | 파이프라인 트리거 처리 | AC-033-01 |
| FR-033 | 응답 파이프라인 | FN-022-02 | 파이프라인 내부 인증 | AC-033-01 |
| FR-033 | 응답 파이프라인 | FN-022-03 | 웹훅 발송 | AC-033-01, AC-033-03 |
| FR-033 | 응답 파이프라인 | FN-022-04 | 외부 통합 처리 | AC-033-03 |
| FR-033 | 응답 파이프라인 | FN-022-05 | 알림 이메일 발송 | AC-033-01 |
| FR-033 | 응답 파이프라인 | FN-022-06 | autoComplete | AC-033-02 |
| FR-034 | Follow-Up Email 시스템 | FN-022-07 | Follow-Up Email 권한 관리 | AC-034-03 |
| FR-034 | Follow-Up Email 시스템 | FN-022-08 | Follow-Up Email 설정 | AC-034-01 |
| FR-034 | Follow-Up Email 시스템 | FN-022-09 | Follow-Up Email 발송 | AC-034-02 |
| FR-034 | Follow-Up Email 시스템 | FN-022-10 | Follow-Up 결과 추적 | AC-034-02 |
| FR-034 | Follow-Up Email 시스템 | FN-022-11 | Follow-Up Rate Limiting | AC-034-02 |

### 9.2 수용 기준 커버리지 매트릭스

| 수용 기준 | 검증 대상 기능 | 커버 여부 |
|----------|--------------|----------|
| AC-033-01: 파이프라인 트리거 | FN-022-01, FN-022-02, FN-022-03, FN-022-05 | 커버됨 |
| AC-033-02: autoComplete | FN-022-06 | 커버됨 |
| AC-033-03: 에러 처리 | FN-022-03, FN-022-04 | 커버됨 |
| AC-034-01: Follow-Up Email 설정 | FN-022-08 | 커버됨 |
| AC-034-02: Follow-Up Email 발송 | FN-022-09, FN-022-10, FN-022-11 | 커버됨 |
| AC-034-03: Follow-Up 권한 | FN-022-07 | 커버됨 |

### 9.3 변경 이력

| 버전 | 일자 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2026-02-21 | System | 초안 작성 |
