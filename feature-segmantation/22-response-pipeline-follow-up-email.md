# 응답 파이프라인 및 후속 메일 -- 요구사항 명세서

> **문서번호**: FSD-022 | **FR 범위**: FR-033 ~ FR-034
> **라이선스**: Follow-Up Email은 Enterprise (Cloud: Custom plan), 파이프라인은 Community

---

## 1. 목적/배경

응답(Response)이 생성/갱신/완료될 때 자동으로 후속 작업을 수행하는 파이프라인 시스템이다. 파이프라인은 웹훅 발송, 외부 통합(Google Sheets, Slack 등) 연동, 알림 이메일 발송, 후속 이메일(Follow-Up Email) 발송, autoComplete 처리 등을 담당한다. Follow-Up Email은 응답자 또는 팀 멤버에게 맞춤 이메일을 자동 발송하는 유료 기능이다.

---

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- 응답 파이프라인 3가지 트리거 이벤트
- 웹훅 발송 (Standard Webhooks 프로토콜)
- 외부 통합 처리 (Google Sheets, Slack, Airtable, Notion)
- 응답 완료 알림 이메일
- Follow-Up Email 시스템 (트리거, 수신자, 본문, 첨부 데이터)
- autoComplete 기능
- Rate Limiting

### Out-of-scope
- 웹훅 설정 UI/관리 (FSD-023 참조)
- REST API 인증 체계 (FSD-024 참조)

---

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| System (내부) | 파이프라인 트리거 및 처리 |
| Survey Owner | Follow-Up Email 설정 |
| Team Member | Follow-Up Email 수신자로 지정 가능 |
| Respondent | Follow-Up Email 수신 대상 |
| External Service | 웹훅/통합 엔드포인트 |

---

## 4. 기능 요구사항

### FR-033: 응답 파이프라인

#### 4.1 파이프라인 트리거 이벤트

3가지 이벤트 타입:

| 이벤트 | 발생 시점 | 파이프라인 동작 |
|--------|----------|---------------|
| 응답 생성(responseCreated) | 첫 번째 응답 데이터 수신 시 | 웹훅 발송 + 텔레메트리 이벤트 |
| 응답 업데이트(responseUpdated) | 부분 응답 업데이트 시 | 웹훅 발송 |
| 응답 완료(responseFinished) | 응답 완료 (finished = true) 시 | 웹훅 + 통합 + 알림 이메일 + Follow-Up + autoComplete |

#### 4.2 파이프라인 호출 메커니즘

클라이언트 API에서 응답 생성/업데이트 후 내부 파이프라인 API를 호출한다.

- 파이프라인은 내부 인증 시크릿 헤더로 내부 인증
- 인증 실패 시 미인증 응답 반환

#### 4.3 파이프라인 실행 순서 (응답 완료 이벤트)

1. 웹훅 Promise 생성 (모든 매칭 웹훅에 대해)
2. 통합(Integration) 처리 (Google Sheets, Slack, Airtable, Notion)
3. 알림 이메일 수신자 조회 (owner/manager + 관련 팀 멤버)
4. Follow-Up Email 발송 (설문에 Follow-Up 설정이 존재하는 경우)
5. 알림 이메일 발송 Promise 생성
6. autoComplete 처리 (응답 수가 목표 응답 수 이상이면 설문 상태를 "completed"로 변경)
7. 웹훅 + 이메일 Promise 일괄 실행

#### 4.4 웹훅 발송 상세

웹훅 매칭 조건:
- 해당 Environment에 속한 웹훅
- 이벤트 타입이 웹훅의 트리거 목록에 포함
- 웹훅이 특정 설문을 구독하거나, 모든 설문을 구독(surveyIds가 빈 배열)

웹훅 페이로드 구조:

| 필드 | 설명 |
|------|------|
| webhookId | 웹훅 ID |
| event | 이벤트 타입 (예: responseFinished) |
| data.id | 응답 ID |
| data.data | 응답 데이터 |
| data.survey.title | 설문 제목 |
| data.survey.type | 설문 유형 |
| data.survey.status | 설문 상태 |
| data.survey.createdAt | 설문 생성 시간 |
| data.survey.updatedAt | 설문 수정 시간 |

Standard Webhooks 헤더:
- webhook-id: UUID v7
- webhook-timestamp: Unix timestamp (초)
- webhook-signature: v1,{HMAC-SHA256 base64} (secret이 설정된 경우)

타임아웃: **5초**

#### 4.5 autoComplete 기능

- 설문에 목표 응답 수(autoComplete) 필드를 설정
- 응답 완료 이벤트 시 현재 응답 수와 비교
- 목표 도달 시 설문 상태를 "completed"로 자동 변경
- Audit Log 기록 (userType: "system")

#### 4.6 통합 처리

응답 완료 이벤트에서만 실행. 지원 통합:

| 통합 | 데이터 전달 방식 |
|------|----------------|
| Google Sheets | 스프레드시트에 행 추가 |
| Slack | 채널에 메시지 전송 |
| Airtable | 테이블에 레코드 추가 |
| Notion | 데이터베이스에 페이지 추가 |

각 통합은 변수 포함, 메타데이터 포함, 히든 필드 포함, 응답 생성 시간 포함 옵션을 지원한다.

### FR-034: Follow-Up Email 시스템

#### 4.7 Follow-Up Email 권한

- **Cloud**: Custom plan에서만 사용 가능 (유료 기능)
- **Self-hosted**: 모든 플랜에서 사용 가능
- 미허용 시 잠금 아이콘과 업그레이드 안내 표시

#### 4.8 Follow-Up 트리거 유형

2가지 트리거 유형:

| 트리거 | 동작 |
|--------|------|
| Response | 모든 응답 완료 시 발송 |
| Endings | 특정 종료 화면(Ending)에 도달한 경우에만 발송 |

Endings 트리거 시 대상 종료 화면 ID 배열을 지정하며, 응답의 종료 화면 ID가 목록에 포함되어야 발송한다. 목록에 포함되지 않으면 해당 Follow-Up은 "skipped" 상태로 처리된다.

#### 4.9 이메일 수신자 소스 (5가지)

| 소스 타입 | 아이콘 | 설명 |
|-----------|--------|------|
| 인증된 이메일 | MailIcon | 이메일 인증 질문의 인증된 이메일 |
| OpenText 질문 | Element Icon | 이메일 입력 타입의 OpenText 질문 응답 |
| ContactInfo 질문 | Element Icon | ContactInfo 질문의 이메일 필드 |
| 히든 필드 | EyeOffIcon | Hidden Field에 전달된 이메일 값 |
| 팀 멤버 | UserIcon | 팀 멤버 이메일 (직접 지정) |

수신자 결정 로직:
1. 수신자(to) 값이 직접 이메일 주소인지 확인
2. 이메일이면 바로 발송
3. 아니면 응답 데이터에서 해당 키의 이메일 추출
4. 문자열이면 이메일 검증 후 발송
5. 배열이면 3번째 인덱스에서 이메일 추출 (ContactInfo 형식)

#### 4.10 Follow-Up Email 속성

| 속성 | 설명 |
|------|------|
| to | 수신자 (이메일 또는 질문 ID) |
| from | 발신자 (시스템 이메일) |
| replyTo | 회신 주소 (복수 가능) |
| subject | 제목 |
| body | HTML 본문 |
| attachResponseData | 응답 데이터 첨부 여부 |
| includeVariables | 변수 포함 여부 |
| includeHiddenFields | 히든 필드 포함 여부 |

#### 4.11 이메일 본문 처리

- **Recall 태그 파싱**: 본문에 포함된 recall 태그를 응답 데이터로 치환
- **HTML Sanitization**: 허용된 태그만 유지
  - 허용 태그: p, span, b, strong, i, em, a, br
  - 허용 속성: href, rel, target, dir, class
  - 허용 URL 스킴: http, https
- **Storage URL 해석**: 이미지/파일 URL을 절대 경로로 변환
- **법적 고지 포함**: Privacy URL, Terms URL, Imprint URL/Address

#### 4.12 Follow-Up 결과 추적

각 Follow-Up의 처리 결과는 다음 상태 중 하나로 기록:
- **success**: 성공적으로 발송됨
- **error**: 오류 발생 (에러 메시지 포함)
- **skipped**: 조건 불일치로 건너뜀

에러 코드:

| 코드 | 설명 |
|------|------|
| validation_error | 입력 값 유효성 검증 실패 |
| organization_not_found | 조직을 찾을 수 없음 |
| survey_not_found | 설문을 찾을 수 없음 |
| response_not_found | 응답을 찾을 수 없음 |
| response_survey_mismatch | 응답과 설문 불일치 |
| follow_up_not_allowed | 조직 플랜에서 허용되지 않음 |
| rate_limit_exceeded | Rate Limit 초과 |
| unexpected_error | 예기치 않은 오류 |

#### 4.13 Rate Limiting

- 조직(Organization) ID 기준으로 Rate Limit 적용
- **시간당 50건** 제한
- 초과 시 Rate Limit 초과 에러 반환

#### 4.14 Follow-Up Modal UI

이메일 본문 HTML은 보안을 위해 허용된 태그/속성만 유지하며 sanitization 처리된다.
- 허용 태그: p, span, b, strong, i, em, a, br
- 허용 속성: href, rel, dir, class, target
- URL은 http 또는 https 스킴만 허용

설정 가능한 필드:
- Follow-Up 이름
- 트리거 타입 (response / endings)
- 종료 화면 선택 (endings 트리거 시)
- 수신자 선택 (5가지 소스)
- 회신 주소 (복수 이메일)
- 제목 및 본문 (Rich Text Editor)
- 응답 데이터 첨부 옵션 (변수, 히든 필드 포함 여부)

---

## 5. 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| **타임아웃** | 웹훅 호출 5초 타임아웃 |
| **에러 격리** | 개별 웹훅/이메일 실패가 전체 파이프라인을 중단시키지 않음 |
| **Rate Limit** | Follow-Up: 조직당 시간당 50건 |
| **보안** | 파이프라인 내부 API는 내부 인증 시크릿으로 인증 |
| **HTML 보안** | Follow-Up 이메일 본문에 HTML sanitization 적용 |
| **감사 로그** | autoComplete에 의한 설문 상태 변경은 Audit Log 기록 |

---

## 6. 정책/제약

| 항목 | 값 |
|------|-----|
| 파이프라인 트리거 이벤트 수 | 3개 |
| 웹훅 타임아웃 | 5,000ms (5초) |
| Follow-Up Rate Limit | 50건/시간/조직 |
| Follow-Up 이메일 허용 태그 | 7개 (p, span, b, strong, i, em, a, br) |
| Cloud Follow-Up 플랜 요구사항 | Custom plan |
| Self-hosted Follow-Up | 항상 허용 |
| Follow-Up 수신자 소스 타입 | 5가지 |
| 지원 통합 수 | 4개 (Google Sheets, Slack, Airtable, Notion) |
| 알림 이메일 대상 | owner, manager, 팀 멤버 (알림 설정 ON) |
| Webhook 서명 형식 | v1,{HMAC-SHA256 base64} |

---

## 7. 수용 기준 (Acceptance Criteria)

### AC-033-01: 파이프라인 트리거
- [ ] 응답 생성 이벤트 시 매칭된 모든 웹훅에 페이로드가 전송된다
- [ ] 응답 업데이트 이벤트 시 매칭된 모든 웹훅에 페이로드가 전송된다
- [ ] 응답 완료 이벤트 시 웹훅, 통합, 알림 이메일, Follow-Up이 모두 처리된다
- [ ] 파이프라인 API는 내부 인증 시크릿 없이는 접근할 수 없다

### AC-033-02: autoComplete
- [ ] 설문의 목표 응답 수가 설정되어 있고 응답 수가 해당 값 이상일 때 설문 상태가 "completed"로 변경된다
- [ ] autoComplete에 의한 상태 변경이 Audit Log에 기록된다

### AC-033-03: 에러 처리
- [ ] 개별 웹훅 실패가 다른 웹훅 발송에 영향을 주지 않는다
- [ ] 웹훅 5초 타임아웃 후 에러가 로깅된다
- [ ] 통합 처리 실패가 파이프라인 전체를 중단시키지 않는다

### AC-034-01: Follow-Up Email 설정
- [ ] "response" 트리거와 "endings" 트리거를 선택할 수 있다
- [ ] "endings" 트리거 시 최소 1개 이상의 종료 화면을 선택해야 한다
- [ ] 5가지 수신자 소스(인증된 이메일, OpenText, ContactInfo, 히든 필드, 팀 멤버)에서 선택할 수 있다
- [ ] 복수 회신 주소를 입력할 수 있다
- [ ] 본문에 Rich Text Editor를 사용할 수 있다
- [ ] 응답 데이터 첨부를 활성화하고, 변수/히든 필드 포함 여부를 설정할 수 있다

### AC-034-02: Follow-Up Email 발송
- [ ] 응답 완료 시 해당 설문의 모든 Follow-Up이 평가된다
- [ ] Endings 트리거의 경우 응답의 종료 화면 ID가 설정된 대상 종료 화면 ID 목록에 포함될 때만 발송된다
- [ ] 수신자 이메일이 유효하지 않으면 해당 Follow-Up은 "error" 상태로 기록된다
- [ ] 조직 플랜이 허용하지 않으면 Follow-Up 미허용 에러가 반환된다
- [ ] Rate Limit(시간당 50건) 초과 시 Rate Limit 초과 에러가 반환된다

### AC-034-03: Follow-Up 권한
- [ ] Cloud 환경에서 Custom plan이 아니면 Follow-Up 설정 화면에 잠금 아이콘과 업그레이드 안내가 표시된다
- [ ] Self-hosted 환경에서는 모든 플랜에서 Follow-Up을 사용할 수 있다
