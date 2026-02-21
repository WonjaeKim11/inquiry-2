# 웹훅 및 커넥터 -- 요구사항 명세서

> **문서번호**: FSD-023 | **FR 범위**: FR-040 ~ FR-041
> **라이선스**: Community

---

## 1. 목적/배경

Formbricks는 Standard Webhooks 프로토콜을 준수하는 웹훅 시스템과 네이티브 통합(Google Sheets, Slack, Airtable, Notion) 및 웹훅 기반 자동화 플랫폼 커넥터(Zapier, n8n, Make, ActivePieces)를 제공한다. 응답 이벤트 발생 시 외부 시스템에 실시간으로 데이터를 전달하여 워크플로 자동화를 지원한다.

---

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- 웹훅 CRUD (생성, 조회, 수정, 삭제)
- Standard Webhooks 프로토콜 구현 (HMAC-SHA256 서명)
- 웹훅 소스 5가지 타입
- 웹훅 트리거 3가지 이벤트
- 엔드포인트 테스트 기능
- Discord 웹훅 차단
- URL 유효성 검증
- 네이티브 통합 4가지 (Google Sheets, Slack, Airtable, Notion)
- 웹훅 기반 자동화 커넥터 4가지 (Zapier, n8n, Make, ActivePieces)
- 웹훅 시크릿 관리

### Out-of-scope
- 각 통합의 상세 데이터 매핑 설정 (통합별 별도 설정 UI)
- Follow-Up Email (FSD-022 참조)
- 응답 파이프라인 전체 흐름 (FSD-022 참조)

---

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| Integration Admin | 웹훅 생성/관리, 통합 설정 |
| External System | 웹훅 페이로드 수신 및 처리 |
| Zapier/n8n/Make/ActivePieces | 웹훅 소스로 자동 등록 |

---

## 4. 기능 요구사항

### FR-040: 웹훅 시스템

#### 4.1 웹훅 데이터 모델

웹훅 데이터는 다음 필드로 구성된다:

| 필드 | 설명 |
|------|------|
| id | 고유 식별자 (CUID) |
| name | 웹훅 이름 (선택) |
| createdAt | 생성 시간 |
| updatedAt | 수정 시간 |
| url | 엔드포인트 URL |
| source | 소스 타입 (기본값: user) |
| environmentId | 소속 Environment |
| triggers | 구독 이벤트 배열 |
| surveyIds | 대상 설문 ID 배열 |
| secret | 서명 시크릿 (선택) |

#### 4.2 웹훅 소스 -- 5가지

| 소스 | 설명 |
|------|------|
| user | 사용자가 직접 생성 |
| zapier | Zapier에서 자동 생성 |
| make | Make(Integromat)에서 자동 생성 |
| n8n | n8n에서 자동 생성 |
| activepieces | ActivePieces에서 자동 생성 |

사용자가 UI에서 생성하는 웹훅은 source가 "user"로 고정된다.

#### 4.3 웹훅 트리거 이벤트 -- 3가지

| 이벤트 | 설명 |
|--------|------|
| responseCreated | 응답 생성 시 |
| responseUpdated | 응답 업데이트 시 |
| responseFinished | 응답 완료 시 |

UI에서 체크박스로 선택 가능.

#### 4.4 Standard Webhooks 프로토콜 구현

**시크릿 생성**:
- 형식: "whsec_" 접두사 + base64 인코딩된 32바이트 랜덤 값
- 256비트 엔트로피
- 웹훅 생성 시 자동으로 시크릿 생성 및 저장

**서명 생성**:
- 서명 대상 문자열: "{webhook-id}.{webhook-timestamp}.{body}"
- HMAC-SHA256 알고리즘으로 서명 생성
- 결과 형식: "v1,{base64 서명값}"

**웹훅 HTTP 헤더**:

| 헤더 | 값 | 설명 |
|------|-----|------|
| content-type | application/json | 컨텐트 타입 |
| webhook-id | UUID v7 | 고유 메시지 식별자 |
| webhook-timestamp | Unix timestamp (초) | 메시지 생성 시간 |
| webhook-signature | v1,{base64_HMAC} | HMAC-SHA256 서명 (secret 존재 시) |

#### 4.5 웹훅 생성

웹훅 생성 시 처리 과정:
- Discord 웹훅 URL 차단 검사
- 시크릿 자동 생성 ("whsec_" 접두사)
- 생성 후 시크릿을 포함한 응답 반환 (이후 조회 불가)

#### 4.6 웹훅 생성 성공 모달

생성 성공 시 시크릿을 표시하는 모달:
- 시크릿 값을 읽기 전용 입력 필드에 표시
- "Copy" 버튼으로 클립보드 복사
- 경고 메시지: "지금 복사하지 않으면 다시 확인할 수 없습니다"
- Standard Webhooks 문서 링크 제공

#### 4.7 Discord 웹훅 차단

- 차단 패턴: https://discord.com/api/webhooks/{id}/{token} 형태의 URL
- 생성 시와 엔드포인트 테스트 시 모두 차단
- 에러 메시지: "Discord webhooks are currently not supported."

#### 4.8 URL 유효성 검증

검증 규칙:
- URL이 비어있으면 "Please enter a URL"
- HTTPS 프로토콜 필수
- 연속 슬래시(//) 금지 (프로토콜 제외)
- 유효한 도메인 형식 필요 (TLD 2자 이상, 예: formbricks.com)

#### 4.9 엔드포인트 테스트

- 타임아웃: **5초**
- 테스트 페이로드: 이벤트 타입 "testEndpoint"
- 임시 시크릿으로 서명 생성하여 Standard Webhooks 형식 준수
- 2xx 응답 코드만 성공으로 판단
- 에러 메시지는 1,000자로 제한

#### 4.10 웹훅 수정 및 삭제

- **수정**: name, url, triggers, surveyIds 변경 가능. source, secret은 변경 불가
- **삭제**: 웹훅 ID로 삭제. 존재하지 않으면 리소스 미존재 에러
- **조회**: Environment 단위로 모든 웹훅 조회, 생성 시간 역순 정렬

#### 4.11 설문 선택

웹훅 생성/수정 시 설문 선택 옵션:
- **All Surveys**: surveyIds를 빈 배열로 설정 -- 해당 Environment의 모든 설문 이벤트 수신
- **Specific Surveys**: 개별 설문 선택 -- surveyIds 배열에 포함된 설문만 수신

### FR-041: 네이티브 통합 및 자동화 커넥터

#### 4.12 네이티브 통합 (4가지)

| 통합 | 인증 방식 | 데이터 처리 |
|------|----------|------------|
| Google Sheets | OAuth 2.0 | 스프레드시트 행 추가 |
| Slack | OAuth 2.0 | 채널 메시지 전송 |
| Airtable | OAuth 2.0 | 테이블 레코드 추가 |
| Notion | OAuth 2.0 | 데이터베이스 페이지 추가 |

각 통합은 응답 완료 이벤트(responseFinished)에서만 트리거된다.

각 통합의 데이터 처리 옵션:
- 설문 변수 포함
- 응답 메타데이터 포함 (Source, URL, Browser, OS, Device, Country, Action, IP)
- 히든 필드 포함
- 응답 생성 시간 포함
- 포함할 질문 ID 목록

메타데이터 문자열 변환 형식:
- Source, URL, Browser, OS, Device, Country, Action, IP Address 각 항목을 줄바꿈으로 구분하여 하나의 문자열로 결합

#### 4.13 Notion 특수 처리

Notion API의 컬럼 타입에 따른 값 변환:

| Notion 타입 | 변환 방식 |
|------------|----------|
| select | 이름 형태로 변환 (쉼표 제거) |
| multi_select | 복수 이름 목록으로 변환 |
| title / rich_text | 텍스트 컨텐츠 형태로 변환 |
| checkbox | "accepted" 또는 "clicked" 시 true |
| date | 시작일 형태로 변환 |
| number | 정수로 파싱 |

- Rich Text 최대 길이 제한 적용

#### 4.14 웹훅 기반 자동화 커넥터 (4가지)

| 커넥터 | 소스 타입 | 설명 |
|--------|----------|------|
| Zapier | zapier | Zapier에서 웹훅을 자동 등록 |
| n8n | n8n | n8n에서 웹훅을 자동 등록 |
| Make | make | Make(Integromat)에서 웹훅을 자동 등록 |
| ActivePieces | activepieces | ActivePieces에서 웹훅을 자동 등록 |

이들 커넥터는 각자의 플랫폼 API를 통해 Formbricks에 웹훅을 등록하며, source 필드로 구분된다.

---

## 5. 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| **보안** | HMAC-SHA256 서명으로 웹훅 페이로드 무결성 보장 |
| **보안** | 시크릿은 생성 시에만 노출, 이후 조회 불가 |
| **보안** | HTTPS 프로토콜 필수 |
| **보안** | Discord 웹훅 차단 (호환성 문제) |
| **신뢰성** | 5초 타임아웃으로 hanging 방지 |
| **신뢰성** | 개별 웹훅 실패가 다른 웹훅에 영향 없음 |
| **확장성** | 웹훅 소스별 구분으로 자동화 플랫폼 연동 지원 |

---

## 6. 정책/제약

| 항목 | 값 |
|------|-----|
| 웹훅 소스 타입 | 5개 (user, zapier, make, n8n, activepieces) |
| 트리거 이벤트 | 3개 (responseCreated, responseUpdated, responseFinished) |
| 시크릿 형식 | "whsec_" 접두사 + base64(32 bytes) |
| 시크릿 엔트로피 | 256 bits (32 bytes) |
| 서명 알고리즘 | HMAC-SHA256 |
| 서명 형식 | v1,{base64 서명값} |
| 웹훅 ID 형식 | UUID v7 |
| 엔드포인트 테스트 타임아웃 | 5,000ms (5초) |
| 파이프라인 웹훅 타임아웃 | 5,000ms (5초) |
| URL 프로토콜 | HTTPS만 허용 |
| Discord 차단 패턴 | https://discord.com/api/webhooks/{id}/{token} |
| 에러 메시지 최대 길이 | 1,000자 |
| 네이티브 통합 수 | 4개 |
| Notion Rich Text 제한 | 최대 길이 제한 적용 |
| 통합 트리거 | 응답 완료 이벤트(responseFinished)에서만 |
| 웹훅 인덱스 | environmentId 기준 |

---

## 7. 수용 기준 (Acceptance Criteria)

### AC-040-01: 웹훅 CRUD
- [ ] 웹훅 생성 시 name, url, triggers, surveyIds를 설정할 수 있다
- [ ] 생성 시 "whsec_" 접두사의 시크릿이 자동 생성된다
- [ ] 생성 성공 모달에서 시크릿을 복사할 수 있다
- [ ] 웹훅 수정 시 name, url, triggers, surveyIds를 변경할 수 있다
- [ ] 웹훅을 삭제할 수 있다
- [ ] Environment 단위로 웹훅 목록을 조회할 수 있다

### AC-040-02: Standard Webhooks 준수
- [ ] webhook-id 헤더에 UUID v7 값이 포함된다
- [ ] webhook-timestamp 헤더에 Unix timestamp(초)가 포함된다
- [ ] webhook-signature 헤더에 v1,{HMAC-SHA256} 형식의 서명이 포함된다
- [ ] 서명 대상 문자열이 {webhook-id}.{webhook-timestamp}.{body} 형식이다

### AC-040-03: 엔드포인트 테스트
- [ ] "Test Endpoint" 클릭 시 테스트 페이로드가 전송된다
- [ ] 2xx 응답 시 성공으로 표시된다 (녹색 테두리)
- [ ] 5초 내 응답이 없으면 타임아웃 에러가 표시된다
- [ ] Discord 웹훅 URL 입력 시 에러 메시지가 표시된다

### AC-040-04: URL 검증
- [ ] HTTPS 프로토콜이 아닌 URL은 거부된다
- [ ] 유효한 도메인 형식이 아닌 URL은 거부된다
- [ ] 빈 URL 입력 시 에러 메시지가 표시된다

### AC-041-01: 네이티브 통합
- [ ] Google Sheets 통합이 응답 완료 시 스프레드시트에 행을 추가한다
- [ ] Slack 통합이 응답 완료 시 채널에 메시지를 전송한다
- [ ] Airtable 통합이 응답 완료 시 레코드를 추가한다
- [ ] Notion 통합이 응답 완료 시 페이지를 생성한다
- [ ] 각 통합에서 변수, 메타데이터, 히든 필드, 생성 시간 포함 옵션이 동작한다

### AC-041-02: 자동화 커넥터
- [ ] Zapier, n8n, Make, ActivePieces 소스의 웹훅이 올바른 source 값으로 구분된다
- [ ] 자동화 플랫폼에서 생성된 웹훅이 정상적으로 이벤트를 수신한다
