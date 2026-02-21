# 기능 명세서: REST API 및 Headless 모드

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | 1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-024 (feature-segmantation/24-REST-API-headless.md) |
| FR 범위 | FR-039, FR-043 |
| 라이선스 | Community |
| 상태 | 초안 |

---

## 2. 개요

### 2.1 목적

Inquiry 플랫폼의 REST API 체계(Client API, Management API, v2 Beta API)와 Headless 모드의 상세 기능을 정의한다. 본 문서는 FSD-024 요구사항 명세서를 기반으로, 각 API 계층의 인증/인가, 엔드포인트별 동작 흐름, 에러 처리, Rate Limiting, API Key 관리 및 Headless 모드 Client API 활용 흐름을 개발 및 테스트 가능한 수준으로 기술한다.

### 2.2 범위

**포함 범위**:
- Client API 엔드포인트 및 인증 체계 (v1, v2)
- Management API 엔드포인트 및 인증 체계 (v1, v2)
- API Key 관리 (생성, 권한 설정, 해싱)
- API Key 권한 레벨 3단계 (read, write, manage)
- Headless 모드 개념 및 Client API 활용 흐름
- Rate Limiting
- v2 Beta API 구조

**제외 범위**:
- JavaScript SDK 내부 구현
- 개별 API 엔드포인트의 비즈니스 로직 상세 (설문 생성/수정 로직 등)
- 웹훅 API 상세 (FSD-023 참조)

### 2.3 대상 사용자

| 역할 | 설명 |
|------|------|
| Frontend Developer | Client API를 통해 설문 표시 및 응답 제출 |
| Backend Developer | Management API로 설문/응답을 프로그래밍 방식으로 관리 |
| API Key Admin | Organization 레벨에서 API Key 생성 및 권한 관리 |
| Headless UI Developer | Inquiry 기본 UI 없이 커스텀 설문 UI를 구축하여 Client API 활용 |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| Client API | 인증 없이 environmentId 기반으로 접근하는 공개 API 계층. 설문 표시, 응답 제출 등 최종 사용자 대상 기능 제공 |
| Management API | x-api-key 헤더 인증 기반으로 접근하는 관리 API 계층. 설문/응답/연락처 등의 CRUD 기능 제공 |
| Headless 모드 | Inquiry 기본 설문 UI를 사용하지 않고 Client API만을 직접 호출하여 커스텀 UI로 설문을 구현하는 방식 |
| API Key | Management API 인증에 사용하는 비밀 키. Organization 단위로 생성되며 Environment별 권한 할당 가능 |
| Environment | Inquiry 프로젝트 내의 격리된 실행 환경 (예: development, production). CUID2 형식의 고유 ID로 식별 |
| environmentId | Environment를 식별하는 CUID2 형식의 고유 식별자 |
| CUID2 | Collision-resistant Unique Identifier v2. URL-safe한 고유 식별자 생성 알고리즘 |
| Rate Limiting | 특정 시간 단위 내 API 호출 횟수를 제한하는 보호 메커니즘 |
| Display | 설문이 사용자에게 표시(노출)되는 이벤트 |
| TTC | Time To Complete. 설문 응답 완료까지 소요된 시간 |
| bcrypt | 단방향 해시 함수. API Key 저장 시 사용 (cost factor: 12) |
| namespace | Rate Limiting 적용 단위. API Key 또는 environmentId 기반으로 구분 |

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
+------------------+       +------------------+       +------------------+
|   브라우저/앱     |       |  Headless 클라이언트 |       |  외부 백엔드 서버  |
|  (JS SDK 포함)   |       |  (커스텀 UI)       |       |  (자동화 스크립트)  |
+--------+---------+       +--------+---------+       +--------+---------+
         |                          |                          |
         | Client API               | Client API               | Management API
         | (인증 불필요)             | (인증 불필요)             | (x-api-key)
         |                          |                          |
+--------v--------------------------v--------------------------v---------+
|                        Inquiry API Gateway                          |
|                                                                        |
|  +-------------------+  +--------------------+  +-------------------+  |
|  |   Rate Limiter    |  |   Auth Middleware   |  |   Route Handler   |  |
|  | (100 req/min/ns)  |  | (API Key 검증)     |  |  (v1/v2 라우팅)   |  |
|  +-------------------+  +--------------------+  +-------------------+  |
|                                                                        |
|  +---------------------------+  +---------------------------+          |
|  |      Client API (v1/v2)   |  |   Management API (v1/v2)  |          |
|  |  /api/v{ver}/client/{id}/ |  |  /api/v{ver}/management/  |          |
|  +---------------------------+  +---------------------------+          |
|                                                                        |
+----------------------------+-------------------------------------------+
                             |
                    +--------v---------+
                    |    데이터베이스     |
                    |   (PostgreSQL)    |
                    +------------------+
```

### 3.2 주요 기능 목록 (Feature List)

| 기능 ID | 기능명 | 관련 요구사항 | 우선순위 |
|---------|--------|-------------|---------|
| FN-024-01 | Client API v1 엔드포인트 | FR-039, AC-039-01 | 필수 |
| FN-024-02 | Management API v1 엔드포인트 | FR-039, AC-039-02 | 필수 |
| FN-024-03 | API Key 인증 처리 | FR-039, AC-039-02 | 필수 |
| FN-024-04 | API Key 권한 레벨 관리 | FR-039, AC-039-03 | 필수 |
| FN-024-05 | API Key 생성 및 관리 | FR-039, AC-039-03 | 필수 |
| FN-024-06 | Rate Limiting | FR-039, AC-039-04 | 필수 |
| FN-024-07 | v2 Beta API | FR-039, AC-039-05 | 높음 |
| FN-024-08 | Headless 모드 | FR-043, AC-043-01 | 필수 |
| FN-024-09 | API 에러 처리 | FR-039 | 필수 |

### 3.3 기능 간 관계도

```
FN-024-05 (API Key 생성/관리)
    |
    v
FN-024-04 (API Key 권한 레벨 관리) -----> FN-024-03 (API Key 인증 처리)
                                                |
                                                v
FN-024-06 (Rate Limiting) ------------> FN-024-02 (Management API v1)
    |                                          |
    |                                          v
    +---------------------------------> FN-024-01 (Client API v1)
    |                                          |
    |                                          v
    +---------------------------------> FN-024-07 (v2 Beta API)
                                               |
FN-024-09 (API 에러 처리) <--- 모든 API 기능에서 참조
                                               |
FN-024-08 (Headless 모드) --- Client API v1 활용 ---> FN-024-01
```

---

## 4. 상세 기능 명세

### 4.1 Client API v1 엔드포인트

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-024-01 |
| 기능명 | Client API v1 엔드포인트 |
| 관련 요구사항 ID | FR-039, AC-039-01 |
| 우선순위 | 필수 |
| 기능 설명 | 인증 없이 environmentId 기반으로 접근 가능한 공개 API. JS SDK 및 Headless 모드에서 설문 표시, 응답 제출, 파일 업로드 등 최종 사용자 대면 기능을 제공한다. |

#### 4.1.2 선행 조건 (Preconditions)

- 유효한 environmentId가 존재해야 한다 (CUID2 형식).
- 해당 environmentId에 연결된 프로젝트 및 설문 데이터가 데이터베이스에 존재해야 한다.
- 서버의 CORS 설정이 요청 도메인을 허용해야 한다 (브라우저 직접 호출 시).

#### 4.1.3 후행 조건 (Postconditions)

- 요청 성공 시 해당 리소스가 조회/생성/수정되고, 적절한 HTTP 상태 코드와 함께 JSON 응답이 반환된다.
- 요청 실패 시 에러 코드와 메시지가 포함된 JSON 에러 응답이 반환된다.
- Rate Limit 카운터가 1 증가한다.

#### 4.1.4 기본 흐름 (Basic Flow)

**4.1.4.1 Environment 상태 조회**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 클라이언트 | GET /api/v1/client/{environmentId}/environment 요청 전송 |
| 2 | 시스템 | Rate Limit 확인 (namespace별 분당 100건) |
| 3 | 시스템 | environmentId의 CUID2 형식 유효성 검증 |
| 4 | 시스템 | environmentId로 데이터베이스에서 Environment 조회 |
| 5 | 시스템 | 해당 Environment의 활성 설문 목록, 설문 설정, 트리거 조건 등을 수집 |
| 6 | 시스템 | 200 OK와 함께 Environment 상태 JSON 반환 |

**4.1.4.2 Display 이벤트 기록**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 클라이언트 | POST /api/v1/client/{environmentId}/displays 요청 전송 (surveyId 포함) |
| 2 | 시스템 | Rate Limit 확인 |
| 3 | 시스템 | environmentId 유효성 검증 |
| 4 | 시스템 | 요청 바디 유효성 검증 (surveyId 필수) |
| 5 | 시스템 | Display 이벤트 레코드 생성 (노출 추적) |
| 6 | 시스템 | 201 Created와 함께 생성된 display 정보 반환 |

**4.1.4.3 응답 생성**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 클라이언트 | POST /api/v1/client/{environmentId}/responses 요청 전송 |
| 2 | 시스템 | Rate Limit 확인 |
| 3 | 시스템 | environmentId 유효성 검증 |
| 4 | 시스템 | 요청 바디 유효성 검증 (surveyId 필수, data 필수) |
| 5 | 시스템 | environmentId 기반 데이터 스코핑 적용 |
| 6 | 시스템 | 새 응답 레코드 생성 (Response ID는 CUID2 형식) |
| 7 | 시스템 | 201 Created와 함께 생성된 응답 정보 (responseId 포함) 반환 |

**4.1.4.4 응답 업데이트**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 클라이언트 | PUT /api/v1/client/{environmentId}/responses/{responseId} 요청 전송 |
| 2 | 시스템 | Rate Limit 확인 |
| 3 | 시스템 | environmentId 및 responseId 유효성 검증 |
| 4 | 시스템 | 해당 응답이 environmentId 스코프 내에 존재하는지 확인 |
| 5 | 시스템 | 요청 바디 유효성 검증 |
| 6 | 시스템 | 응답 레코드 업데이트 (부분 응답 데이터 병합) |
| 7 | 시스템 | finished 플래그 확인 후 완료 처리 로직 실행 (finished=true인 경우) |
| 8 | 시스템 | 200 OK와 함께 업데이트된 응답 정보 반환 |

**4.1.4.5 파일 업로드**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 클라이언트 | POST /api/v1/client/{environmentId}/storage 요청 전송 (multipart/form-data) |
| 2 | 시스템 | Rate Limit 확인 |
| 3 | 시스템 | environmentId 유효성 검증 |
| 4 | 시스템 | 파일 크기 및 타입 유효성 검증 |
| 5 | 시스템 | 파일 저장 처리 |
| 6 | 시스템 | 201 Created와 함께 파일 URL/ID 반환 |

**4.1.4.6 사용자 식별**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 클라이언트 | POST /api/v1/client/{environmentId}/user 요청 전송 (userId 포함) |
| 2 | 시스템 | Rate Limit 확인 |
| 3 | 시스템 | environmentId 유효성 검증 |
| 4 | 시스템 | 요청 바디 유효성 검증 |
| 5 | 시스템 | 사용자 식별 정보 저장/업데이트 |
| 6 | 시스템 | 200 OK와 함께 사용자 정보 반환 |

#### 4.1.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-01-01 | 응답 생성 시 userId가 제공된 경우 | 응답 레코드에 userId를 연결하여 식별된 사용자의 응답으로 기록 |
| AF-01-02 | 응답 생성 시 finished=true로 전송된 경우 | 단일 요청으로 응답 생성과 동시에 완료 처리 |
| AF-01-03 | 응답 업데이트 시 endingId가 포함된 경우 | 설문 종료 화면 ID를 기록하여 사용자가 어떤 종료 경로를 경험했는지 추적 |

#### 4.1.6 예외 흐름 (Exception Flow)

| ID | 조건 | HTTP 상태 | 에러 응답 |
|----|------|----------|----------|
| EX-01-01 | 유효하지 않은 environmentId (CUID2 형식 불일치) | 400 | InvalidInputError |
| EX-01-02 | 존재하지 않는 environmentId | 400 | ResourceNotFoundError |
| EX-01-03 | 응답 생성 시 필수 필드 누락 (surveyId, data) | 400 | InvalidInputError |
| EX-01-04 | 응답 업데이트 시 존재하지 않는 responseId | 400 | ResourceNotFoundError |
| EX-01-05 | 응답 업데이트 시 environmentId 스코프 외 responseId | 400 | ResourceNotFoundError |
| EX-01-06 | Rate Limit 초과 | 429 | Too Many Requests |
| EX-01-07 | 서버 내부 오류 | 500 | Internal Server Error |

#### 4.1.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-01-01 | Client API는 어떠한 인증도 요구하지 않는다. environmentId만으로 접근을 허용한다. |
| BR-01-02 | 모든 데이터 접근은 environmentId 기반으로 자동 스코핑된다. 다른 Environment의 데이터에 접근할 수 없다. |
| BR-01-03 | Response ID는 CUID2 형식으로 자동 생성된다. |
| BR-01-04 | 응답의 finished 플래그가 true로 설정되면 해당 응답은 완료 상태로 전환되며, 이후 업데이트가 제한될 수 있다. |
| BR-01-05 | Client API는 CORS를 통해 브라우저에서 직접 호출이 가능해야 한다. |

#### 4.1.8 데이터 요구사항

**응답 생성 (POST /client/{envId}/responses) 입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|----------------|
| surveyId | string | 필수 | CUID2 형식. 해당 environmentId에 속한 설문이어야 함 |
| data | object | 필수 | key-value 형태의 응답 데이터. key는 질문 ID |
| userId | string | 선택 | 사용자 식별자 |
| finished | boolean | 선택 | 기본값 false. true인 경우 즉시 완료 처리 |
| variables | object | 선택 | 설문 변수 데이터 |
| ttc | object | 선택 | Time To Complete 데이터 |
| meta | object | 선택 | 메타데이터 (browser, os, device 등) |

**응답 업데이트 (PUT /client/{envId}/responses/{responseId}) 입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|----------------|
| data | object | 선택 | 기존 응답 데이터에 병합 |
| finished | boolean | 선택 | true로 설정 시 응답 완료 처리 |
| language | string | 선택 | 응답 언어 코드 |
| variables | object | 선택 | 설문 변수 데이터 |
| ttc | object | 선택 | Time To Complete 데이터 |
| meta | object | 선택 | 메타데이터 |
| hiddenFields | object | 선택 | 히든 필드 key-value 데이터 |
| displayId | string | 선택 | 연결할 Display ID (CUID2 형식) |
| endingId | string | 선택 | 설문 종료 화면 ID |

**출력 데이터 (공통 응답 구조):**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | string | 응답 ID (CUID2) |
| surveyId | string | 설문 ID |
| finished | boolean | 완료 여부 |
| data | object | 응답 데이터 |
| createdAt | string (ISO 8601) | 생성 일시 |
| updatedAt | string (ISO 8601) | 수정 일시 |

#### 4.1.9 화면/UI 요구사항

해당 없음. Client API는 백엔드 API 엔드포인트로, UI는 호출 측에서 구현한다.

#### 4.1.10 비기능 요구사항

- **성능**: Rate Limit 분당 100건 (namespace별)
- **보안**: CORS 설정을 통해 허용된 도메인에서만 브라우저 직접 호출 가능
- **보안**: environmentId 기반 데이터 격리

---

### 4.2 Management API v1 엔드포인트

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-024-02 |
| 기능명 | Management API v1 엔드포인트 |
| 관련 요구사항 ID | FR-039, AC-039-02 |
| 우선순위 | 필수 |
| 기능 설명 | x-api-key 헤더 인증 기반으로 접근하는 관리 API. 설문, 응답, 연락처, Action Class, 파일 등의 리소스를 프로그래밍 방식으로 CRUD 관리한다. |

#### 4.2.2 선행 조건 (Preconditions)

- 유효한 API Key가 발급되어 있어야 한다.
- API Key에 해당 Environment에 대한 적절한 권한(read/write/manage)이 할당되어 있어야 한다.
- 요청 헤더에 x-api-key가 포함되어 있어야 한다.

#### 4.2.3 후행 조건 (Postconditions)

- 요청 성공 시 해당 리소스가 조회/생성/수정/삭제되고, 적절한 HTTP 상태 코드와 JSON 응답이 반환된다.
- 요청 실패 시 에러 코드와 메시지가 포함된 JSON 에러 응답이 반환된다.
- Rate Limit 카운터가 1 증가한다.

#### 4.2.4 기본 흐름 (Basic Flow)

**4.2.4.1 Management API 공통 인증 흐름**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 클라이언트 | Management API 엔드포인트에 x-api-key 헤더를 포함한 요청 전송 |
| 2 | 시스템 | Rate Limit 확인 (namespace별 분당 100건) |
| 3 | 시스템 | x-api-key 헤더에서 API Key 값 추출 |
| 4 | 시스템 | API Key를 bcrypt로 비교하여 검증 |
| 5 | 시스템 | 유효한 경우, 인증 객체 생성 (type, environmentPermissions, apiKeyId, organizationId, organizationAccess) |
| 6 | 시스템 | 요청 대상 리소스의 Environment에 대한 권한 확인 |
| 7 | 시스템 | 권한 충분 시 해당 엔드포인트 핸들러 실행 |
| 8 | 시스템 | 적절한 HTTP 상태 코드와 JSON 응답 반환 |

**4.2.4.2 설문 목록 조회 (GET /management/surveys)**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 인증 흐름 수행 (4.2.4.1) |
| 2 | 시스템 | API Key의 Environment 권한 중 read 이상 권한 확인 |
| 3 | 시스템 | 권한이 있는 Environment에 속한 설문 목록 조회 |
| 4 | 시스템 | 200 OK와 함께 설문 목록 JSON 반환 |

**4.2.4.3 설문 생성 (POST /management/surveys)**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 인증 흐름 수행 (4.2.4.1) |
| 2 | 시스템 | API Key의 대상 Environment에 대한 write 이상 권한 확인 |
| 3 | 시스템 | 요청 바디 유효성 검증 |
| 4 | 시스템 | 새 설문 레코드 생성 |
| 5 | 시스템 | 201 Created와 함께 생성된 설문 정보 반환 |

**4.2.4.4 개별 설문 CRUD (GET/PUT/DELETE /management/surveys/{surveyId})**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 인증 흐름 수행 (4.2.4.1) |
| 2 | 시스템 | surveyId로 설문 조회 및 소속 Environment 확인 |
| 3 | 시스템 | 해당 Environment에 대한 권한 확인 (GET: read 이상, PUT: write 이상, DELETE: manage) |
| 4 | 시스템 | 권한 충분 시 요청된 작업 수행 (조회/수정/삭제) |
| 5 | 시스템 | 적절한 HTTP 상태 코드와 JSON 응답 반환 |

#### 4.2.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-02-01 | API Key에 여러 Environment 권한이 있는 경우 | 목록 조회 시 모든 권한 있는 Environment의 데이터를 통합하여 반환 |
| AF-02-02 | 설문 일회성 링크 ID 요청 (GET /management/surveys/{surveyId}/singleUseIds) | surveyId에 대해 일회성 사용 가능한 고유 링크 ID 배치를 생성하여 반환 |

#### 4.2.6 예외 흐름 (Exception Flow)

| ID | 조건 | HTTP 상태 | 에러 응답 |
|----|------|----------|----------|
| EX-02-01 | x-api-key 헤더 누락 | 401 | NotAuthenticated |
| EX-02-02 | 유효하지 않은 API Key (bcrypt 불일치) | 401 | NotAuthenticated |
| EX-02-03 | read 권한으로 쓰기 작업 시도 | 403 | Unauthorized |
| EX-02-04 | write 권한으로 관리 작업 시도 (삭제 등) | 403 | Unauthorized |
| EX-02-05 | 해당 Environment에 대한 권한 없음 | 403 | Unauthorized |
| EX-02-06 | 존재하지 않는 리소스 ID | 400 | ResourceNotFoundError |
| EX-02-07 | 유효하지 않은 입력 데이터 | 400 | InvalidInputError |
| EX-02-08 | 데이터베이스 오류 | 400 | DatabaseError |
| EX-02-09 | Rate Limit 초과 | 429 | Too Many Requests |
| EX-02-10 | 서버 내부 오류 | 500 | Internal Server Error |

#### 4.2.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-02-01 | Management API의 모든 요청은 x-api-key 헤더를 통한 인증이 필수이다. |
| BR-02-02 | API Key의 권한 레벨에 따라 접근 가능한 작업이 결정된다: read(읽기 전용), write(읽기+쓰기), manage(읽기+쓰기+관리). |
| BR-02-03 | 각 요청은 API Key에 할당된 Environment 권한 범위 내에서만 데이터에 접근할 수 있다. |
| BR-02-04 | GET 요청은 read 이상, POST/PUT 요청은 write 이상, DELETE 요청은 manage 권한을 요구한다. |
| BR-02-05 | API Key 검증은 bcrypt 비교로 수행하며, 해시 매칭에 실패하면 401을 반환한다. |

#### 4.2.8 데이터 요구사항

**인증 객체 구조:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| type | string | 고정값 "apiKey" |
| environmentPermissions | array | 환경별 권한 목록 |
| environmentPermissions[].environmentId | string | 환경 ID (CUID2) |
| environmentPermissions[].environmentType | string | 환경 유형 (development/production) |
| environmentPermissions[].permission | string | 권한 레벨 (read/write/manage) |
| environmentPermissions[].projectId | string | 프로젝트 ID |
| environmentPermissions[].projectName | string | 프로젝트 이름 |
| apiKeyId | string | API Key ID |
| organizationId | string | 조직 ID |
| organizationAccess | object | 조직 접근 권한 정보 |

**Management API 엔드포인트 전체 목록:**

| 엔드포인트 | 메서드 | 최소 권한 | 설명 |
|-----------|--------|----------|------|
| /management/me | GET | read | 현재 API Key 정보 조회 |
| /management/surveys | GET | read | 설문 목록 조회 |
| /management/surveys | POST | write | 설문 생성 |
| /management/surveys/{surveyId} | GET | read | 개별 설문 조회 |
| /management/surveys/{surveyId} | PUT | write | 설문 수정 |
| /management/surveys/{surveyId} | DELETE | manage | 설문 삭제 |
| /management/surveys/{surveyId}/singleUseIds | GET | read | 일회성 링크 ID 생성 |
| /management/responses | GET | read | 응답 목록 조회 |
| /management/responses/{responseId} | GET | read | 개별 응답 조회 |
| /management/responses/{responseId} | PUT | write | 응답 수정 |
| /management/responses/{responseId} | DELETE | manage | 응답 삭제 |
| /management/contacts | GET | read | 연락처 목록 조회 |
| /management/contacts | POST | write | 연락처 생성 |
| /management/contacts/{contactId} | GET | read | 개별 연락처 조회 |
| /management/contacts/{contactId} | DELETE | manage | 연락처 삭제 |
| /management/contact-attributes | POST | write | 연락처 속성 관리 |
| /management/contact-attribute-keys | GET | read | 연락처 속성 키 목록 |
| /management/contact-attribute-keys/{id} | PUT | write | 속성 키 수정 |
| /management/action-classes | GET | read | Action Class 목록 |
| /management/action-classes | POST | write | Action Class 생성 |
| /management/action-classes/{id} | PUT | write | Action Class 수정 |
| /management/action-classes/{id} | DELETE | manage | Action Class 삭제 |
| /management/storage | POST | write | 파일 업로드 |

#### 4.2.9 화면/UI 요구사항

해당 없음. Management API는 백엔드 API 엔드포인트이다.

#### 4.2.10 비기능 요구사항

- **성능**: Rate Limit 분당 100건 (namespace별)
- **보안**: x-api-key 헤더 기반 인증 필수
- **보안**: API Key는 bcrypt 해시로 저장되어 원본 복원 불가

---

### 4.3 API Key 인증 처리

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-024-03 |
| 기능명 | API Key 인증 처리 |
| 관련 요구사항 ID | FR-039, AC-039-02 |
| 우선순위 | 필수 |
| 기능 설명 | Management API 요청에 포함된 x-api-key 헤더의 API Key를 추출하고 bcrypt 비교로 검증하여, 유효한 경우 인증 객체(환경별 권한 포함)를 생성하는 미들웨어 기능. |

#### 4.3.2 선행 조건 (Preconditions)

- 데이터베이스에 API Key 해시 레코드가 존재해야 한다.
- 요청에 x-api-key 헤더가 포함되어 있어야 한다.

#### 4.3.3 후행 조건 (Postconditions)

- 인증 성공 시: 인증 객체가 생성되어 후속 미들웨어/핸들러에 전달된다.
- 인증 실패 시: 401 NotAuthenticated 에러가 반환되고 요청이 종료된다.

#### 4.3.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 요청 헤더에서 x-api-key 값을 추출 |
| 2 | 시스템 | API Key 형식 확인 (v2인 경우 "fbk_" 접두사 확인) |
| 3 | 시스템 | 데이터베이스에서 모든 API Key 해시 레코드를 후보로 조회 (또는 접두사/ID 기반 조회 최적화) |
| 4 | 시스템 | 제출된 API Key 값을 저장된 bcrypt 해시와 비교 |
| 5 | 시스템 | 일치하는 API Key 레코드 발견 시, 해당 키에 연결된 환경별 권한(environmentPermissions), apiKeyId, organizationId, organizationAccess 정보를 조회 |
| 6 | 시스템 | 인증 객체 생성: { type: "apiKey", environmentPermissions, apiKeyId, organizationId, organizationAccess } |
| 7 | 시스템 | 인증 객체를 요청 컨텍스트에 설정하고 다음 미들웨어/핸들러로 전달 |

#### 4.3.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-03-01 | v1 형식 API Key (접두사 없음) | v1 형식 검증 로직으로 분기 (레거시 호환) |
| AF-03-02 | v2 형식 API Key ("fbk_" 접두사) | "fbk_" 접두사 제거 후 base64url 디코딩하여 시크릿 추출, bcrypt 비교 |

#### 4.3.6 예외 흐름 (Exception Flow)

| ID | 조건 | HTTP 상태 | 에러 응답 |
|----|------|----------|----------|
| EX-03-01 | x-api-key 헤더 누락 | 401 | NotAuthenticated: "API Key가 제공되지 않았습니다" |
| EX-03-02 | x-api-key 값이 빈 문자열 | 401 | NotAuthenticated: "API Key가 제공되지 않았습니다" |
| EX-03-03 | bcrypt 비교 결과 일치하는 키 없음 | 401 | NotAuthenticated: "유효하지 않은 API Key입니다" |
| EX-03-04 | 데이터베이스 조회 오류 | 500 | Internal Server Error |

#### 4.3.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-03-01 | API Key 검증은 반드시 bcrypt 비교로 수행해야 한다. 평문 비교를 사용해서는 안 된다. |
| BR-03-02 | 인증 실패 시 구체적인 실패 원인(키 없음/키 불일치)을 외부에 노출하지 않는 것을 권장한다. |
| BR-03-03 | 인증 객체에는 해당 API Key가 접근 가능한 모든 Environment의 권한 정보가 포함되어야 한다. |

#### 4.3.8 데이터 요구사항

**입력:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|----------------|
| x-api-key (헤더) | string | 필수 | 비어있지 않은 문자열. v2 형식인 경우 "fbk_" 접두사 필수 |

**출력 (인증 객체):**

4.2.8 인증 객체 구조 참조.

#### 4.3.9 화면/UI 요구사항

해당 없음.

#### 4.3.10 비기능 요구사항

- **성능**: bcrypt 비교는 CPU 집약적이므로, API Key 조회 시 인덱스 최적화 또는 접두사 기반 필터링으로 비교 대상을 최소화해야 한다.
- **보안**: API Key 원본은 로그에 기록하지 않아야 한다.

---

### 4.4 API Key 권한 레벨 관리

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-024-04 |
| 기능명 | API Key 권한 레벨 관리 |
| 관련 요구사항 ID | FR-039, AC-039-02, AC-039-03 |
| 우선순위 | 필수 |
| 기능 설명 | API Key에 대해 3단계 권한 레벨(read, write, manage)을 정의하고, Environment별로 개별 권한을 할당하여 Management API 접근을 세밀하게 제어하는 기능. |

#### 4.4.2 선행 조건 (Preconditions)

- API Key가 생성되어 있어야 한다.
- 권한을 할당할 대상 Environment가 존재해야 한다.

#### 4.4.3 후행 조건 (Postconditions)

- API Key와 Environment 조합에 대해 권한 레벨이 설정된다.
- 해당 API Key로 이후 요청 시 설정된 권한에 따라 접근이 제어된다.

#### 4.4.4 기본 흐름 (Basic Flow)

**권한 확인 흐름 (Management API 요청 시):**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 인증 객체에서 environmentPermissions 배열 추출 |
| 2 | 시스템 | 요청 대상 리소스의 environmentId 식별 |
| 3 | 시스템 | environmentPermissions에서 해당 environmentId에 대한 권한 레벨 조회 |
| 4 | 시스템 | 요청된 작업(read/write/manage)에 필요한 최소 권한 레벨 확인 |
| 5 | 시스템 | 할당된 권한 >= 필요 권한인 경우 접근 허용 |

#### 4.4.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-04-01 | organizationAccess 권한으로 조직 전체 작업 수행 시 | Environment 개별 권한 대신 조직 접근 권한 기반으로 접근 결정 |

#### 4.4.6 예외 흐름 (Exception Flow)

| ID | 조건 | HTTP 상태 | 에러 응답 |
|----|------|----------|----------|
| EX-04-01 | read 권한으로 write 작업 시도 | 403 | Unauthorized |
| EX-04-02 | write 권한으로 manage 작업 시도 | 403 | Unauthorized |
| EX-04-03 | 해당 Environment에 대한 권한이 없는 경우 | 403 | Unauthorized |

#### 4.4.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-04-01 | 권한 레벨은 3단계이며 계층적이다: read < write < manage. 상위 권한은 하위 권한을 포함한다. |
| BR-04-02 | read: 읽기 전용 (GET 요청만 허용) |
| BR-04-03 | write: 읽기 + 쓰기 (GET, POST, PUT 요청 허용) |
| BR-04-04 | manage: 읽기 + 쓰기 + 관리 (GET, POST, PUT, DELETE 요청 모두 허용) |
| BR-04-05 | 각 Environment에 대해 독립적으로 권한 레벨을 설정할 수 있다. |
| BR-04-06 | API Key ID와 Environment ID 조합은 유니크 제약을 가진다 (동일 API Key에 동일 Environment 중복 할당 불가). |

#### 4.4.8 데이터 요구사항

**권한 레벨 열거형:**

| 값 | 허용 HTTP 메서드 | 설명 |
|----|----------------|------|
| read | GET | 읽기 전용 |
| write | GET, POST, PUT | 읽기 + 쓰기 |
| manage | GET, POST, PUT, DELETE | 읽기 + 쓰기 + 관리 |

**Environment 권한 할당 레코드:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|----------------|
| apiKeyId | string | 필수 | 유효한 API Key ID |
| environmentId | string | 필수 | 유효한 Environment ID (CUID2) |
| permission | enum | 필수 | "read", "write", "manage" 중 하나 |

**유니크 제약**: (apiKeyId, environmentId) 복합 키

#### 4.4.9 화면/UI 요구사항

해당 없음.

#### 4.4.10 비기능 요구사항

해당 없음.

---

### 4.5 API Key 생성 및 관리

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-024-05 |
| 기능명 | API Key 생성 및 관리 |
| 관련 요구사항 ID | FR-039, AC-039-03 |
| 우선순위 | 필수 |
| 기능 설명 | Organization 단위로 API Key를 생성하고, 생성 시 환경별 권한을 설정한다. API Key는 "fbk_" 접두사 + base64url 인코딩된 시크릿 형식(v2)으로 생성되며, bcrypt(cost: 12)로 해시하여 데이터베이스에 저장한다. |

#### 4.5.2 선행 조건 (Preconditions)

- API Key를 생성할 Organization이 존재해야 한다.
- 생성 요청자가 해당 Organization에 대한 관리 권한을 가지고 있어야 한다.
- 권한을 할당할 Environment가 존재해야 한다 (선택).

#### 4.5.3 후행 조건 (Postconditions)

- 새 API Key 레코드가 데이터베이스에 생성된다 (해시값 저장).
- 지정된 Environment별 권한이 할당된다.
- 생성된 API Key 원본이 1회 반환된다 (이후 재조회 불가).

#### 4.5.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 관리자 | API Key 생성 요청 (라벨, 환경별 권한 목록, 조직 접근 권한 지정) |
| 2 | 시스템 | 요청자의 Organization 관리 권한 확인 |
| 3 | 시스템 | 라벨 유효성 검증 (비어있지 않은 문자열) |
| 4 | 시스템 | 시크릿 생성: 암호학적으로 안전한 랜덤 바이트열 생성 |
| 5 | 시스템 | 시크릿을 base64url로 인코딩하여 키 본문 생성 |
| 6 | 시스템 | "fbk_" 접두사를 붙여 최종 API Key 문자열 생성 |
| 7 | 시스템 | 시크릿을 bcrypt (cost factor: 12)로 해시 |
| 8 | 시스템 | 데이터베이스에 API Key 레코드 저장 (해시값, 라벨, organizationId) |
| 9 | 시스템 | 지정된 환경별 권한 레코드 생성 (apiKeyId + environmentId + permission) |
| 10 | 시스템 | 생성된 API Key 원본 문자열을 1회 반환 (이후 조회 불가) |

#### 4.5.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-05-01 | 환경별 권한을 지정하지 않은 경우 | API Key는 생성되지만 어떤 Environment에도 접근 권한이 없는 상태. 이후 별도로 권한 할당 필요 |

#### 4.5.6 예외 흐름 (Exception Flow)

| ID | 조건 | HTTP 상태 | 에러 응답 |
|----|------|----------|----------|
| EX-05-01 | 라벨 미입력 | 400 | InvalidInputError: "라벨은 필수입니다" |
| EX-05-02 | 동일 Environment에 대한 중복 권한 할당 시도 | 400 | InvalidInputError: "동일 Environment에 중복 권한을 할당할 수 없습니다" |
| EX-05-03 | 존재하지 않는 Environment ID 지정 | 400 | ResourceNotFoundError |
| EX-05-04 | Organization 관리 권한 없음 | 403 | Unauthorized |

#### 4.5.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-05-01 | API Key는 Organization 단위로 생성된다. |
| BR-05-02 | API Key v2 형식: "fbk_" + base64url 인코딩된 시크릿. |
| BR-05-03 | 시크릿 부분에는 영문(a-z, A-Z), 숫자(0-9), 하이픈(-), 언더스코어(_)만 허용된다. |
| BR-05-04 | API Key는 bcrypt (cost factor: 12)로 해시하여 데이터베이스에 저장한다. 원본은 저장하지 않는다. |
| BR-05-05 | 생성된 API Key 원본은 생성 시 1회만 사용자에게 표시된다. 이후 재조회할 수 없다. |
| BR-05-06 | 동일 API Key에 동일 Environment를 중복 할당할 수 없다 (유니크 제약). |
| BR-05-07 | 라벨은 필수 입력값이다. |

#### 4.5.8 데이터 요구사항

**API Key 생성 입력:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|----------------|
| label | string | 필수 | 비어있지 않은 문자열 |
| environmentPermissions | array | 선택 | 각 항목에 environmentId(CUID2)와 permission(read/write/manage) 포함 |
| organizationAccess | object | 선택 | 조직 접근 권한 설정 |

**API Key 데이터베이스 레코드:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | string | API Key ID (자동 생성) |
| hashedKey | string | bcrypt 해시값 |
| label | string | 사용자 지정 라벨 |
| organizationId | string | 소속 Organization ID |
| createdAt | datetime | 생성 일시 |
| lastUsedAt | datetime | 마지막 사용 일시 (선택) |

**API Key v2 형식 규격:**

| 항목 | 규격 |
|------|------|
| 접두사 | "fbk_" (고정 4자) |
| 시크릿 | base64url 인코딩된 랜덤 바이트열 |
| 허용 문자 | [a-zA-Z0-9\-_] |
| 해시 알고리즘 | bcrypt |
| bcrypt cost factor | 12 |

#### 4.5.9 화면/UI 요구사항

해당 없음 (API Key 관리 UI는 별도 기능 명세에서 다룸).

#### 4.5.10 비기능 요구사항

- **보안**: API Key 원본은 생성 시 1회만 반환하며, 서버 측에 평문으로 저장하지 않는다.
- **보안**: bcrypt cost factor 12는 현재 시점에서 보안과 성능의 균형을 고려한 값이다.

---

### 4.6 Rate Limiting

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-024-06 |
| 기능명 | Rate Limiting |
| 관련 요구사항 ID | FR-039, AC-039-04 |
| 우선순위 | 필수 |
| 기능 설명 | 모든 API 엔드포인트에 대해 namespace별 분당 요청 수를 제한하여 서버 과부하를 방지하고 공정한 API 사용을 보장하는 기능. |

#### 4.6.2 선행 조건 (Preconditions)

- Rate Limiting 미들웨어가 API Gateway에 적용되어 있어야 한다.
- namespace 식별이 가능해야 한다 (API Key 또는 environmentId 또는 IP 기반).

#### 4.6.3 후행 조건 (Postconditions)

- 제한 내 요청: 정상적으로 다음 처리 단계로 전달된다.
- 제한 초과 요청: 429 Too Many Requests 응답이 반환된다.

#### 4.6.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 수신된 요청에서 namespace 식별 (API Key, environmentId, 또는 IP) |
| 2 | 시스템 | 해당 namespace의 현재 1분 윈도우 내 요청 카운트 조회 |
| 3 | 시스템 | 카운트 < 100인 경우, 카운트를 1 증가시키고 요청을 다음 처리 단계로 전달 |
| 4 | 시스템 | 응답 헤더에 Rate Limit 정보 포함 (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset) |

#### 4.6.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.6.6 예외 흐름 (Exception Flow)

| ID | 조건 | HTTP 상태 | 에러 응답 |
|----|------|----------|----------|
| EX-06-01 | 분당 100건 초과 | 429 | Too Many Requests. Retry-After 헤더에 재시도 가능 시점 포함 |

#### 4.6.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-06-01 | Rate Limit는 모든 API 계층에 동일하게 분당 100건으로 적용된다. |
| BR-06-02 | Rate Limit는 namespace 단위로 적용된다. 서로 다른 namespace 간에는 독립적이다. |
| BR-06-03 | Rate Limit 윈도우는 1분(60초) 단위로 갱신된다. |

#### 4.6.8 데이터 요구사항

**Rate Limit 적용 현황:**

| API 계층 | Rate Limit | 단위 |
|---------|-----------|------|
| v1 Management API | 100 requests | 분당/namespace별 |
| v2 Management API | 100 requests | 분당/namespace별 |
| Client API | 100 requests | 분당/namespace별 |

**Rate Limit 응답 헤더:**

| 헤더명 | 타입 | 설명 |
|--------|------|------|
| X-RateLimit-Limit | integer | 윈도우 내 최대 허용 요청 수 (100) |
| X-RateLimit-Remaining | integer | 윈도우 내 남은 요청 수 |
| X-RateLimit-Reset | integer (unix timestamp) | 윈도우 리셋 시점 |

#### 4.6.9 화면/UI 요구사항

해당 없음.

#### 4.6.10 비기능 요구사항

- **성능**: Rate Limit 확인은 각 요청의 처리 시간에 최소한의 오버헤드만 추가해야 한다.

---

### 4.7 v2 Beta API

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-024-07 |
| 기능명 | v2 Beta API |
| 관련 요구사항 ID | FR-039, AC-039-05 |
| 우선순위 | 높음 |
| 기능 설명 | v1 API와 병행 운영되는 Beta 버전 API. v1의 모든 기능을 포함하면서 팀 관리, 조직 사용자, 프로젝트-팀 매핑, 연락처 일괄 생성, reCAPTCHA 검증 등 추가 엔드포인트를 제공한다. |

#### 4.7.2 선행 조건 (Preconditions)

- v1 API 인프라가 정상 동작하고 있어야 한다.
- v2 라우팅이 API Gateway에 설정되어 있어야 한다.
- Management API 엔드포인트는 v1과 동일한 x-api-key 인증 체계를 사용한다.

#### 4.7.3 후행 조건 (Postconditions)

- v1 API 동작에 영향을 주지 않으면서 v2 엔드포인트가 정상 동작한다.

#### 4.7.4 기본 흐름 (Basic Flow)

**4.7.4.1 Health Check (GET /api/v2/health)**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 클라이언트 | GET /api/v2/health 요청 전송 |
| 2 | 시스템 | 서버 상태 및 의존 서비스 상태 확인 |
| 3 | 시스템 | 200 OK와 함께 상태 정보 반환 |

**4.7.4.2 팀 관리 (CRUD)**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 클라이언트 | /api/v2/organizations/{orgId}/teams에 요청 전송 (x-api-key 인증) |
| 2 | 시스템 | 인증 및 조직 접근 권한 확인 |
| 3 | 시스템 | 요청 메서드에 따라 팀 목록 조회(GET), 팀 생성(POST), 팀 수정(PUT), 팀 삭제(DELETE) 수행 |
| 4 | 시스템 | 적절한 HTTP 상태 코드와 JSON 응답 반환 |

**4.7.4.3 연락처 일괄 생성 (POST /api/v2/management/contacts/bulk)**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 클라이언트 | POST /api/v2/management/contacts/bulk 요청 전송 (연락처 배열 포함) |
| 2 | 시스템 | 인증 및 write 이상 권한 확인 |
| 3 | 시스템 | 배열 내 각 연락처 데이터 유효성 검증 |
| 4 | 시스템 | 일괄 삽입 처리 |
| 5 | 시스템 | 201 Created와 함께 생성 결과 반환 |

#### 4.7.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-07-01 | v2 Client API에서 reCAPTCHA 검증 요청 | /v2/client/{envId}/responses/lib/recaptcha 엔드포인트를 통해 reCAPTCHA 토큰 검증 후 결과 반환 |
| AF-07-02 | v2 Client API에서 조직 정보 조회 | /v2/client/{envId}/responses/lib/organization 엔드포인트를 통해 조직 정보 반환 |

#### 4.7.6 예외 흐름 (Exception Flow)

| ID | 조건 | HTTP 상태 | 에러 응답 |
|----|------|----------|----------|
| EX-07-01 | v2 엔드포인트에 v1 인증 형식으로 요청 | 인증 체계 동일하므로 정상 처리 또는 형식 불일치 시 401 |
| EX-07-02 | Beta 기능 비활성화 상태에서 v2 전용 엔드포인트 호출 | 404 Not Found |

#### 4.7.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-07-01 | v2 API는 Beta 상태로, 하위 호환성이 보장되지 않을 수 있다. |
| BR-07-02 | v2 Management API는 v1과 동일한 x-api-key 인증 체계를 사용한다. |
| BR-07-03 | v1과 v2 API는 병행 운영되며, v1 API 동작에 영향을 주지 않는다. |
| BR-07-04 | v2 Rate Limit도 v1과 동일하게 분당 100건이 적용된다. |

#### 4.7.8 데이터 요구사항

**v2 전용 엔드포인트 목록:**

| 엔드포인트 | 메서드 | 인증 | 설명 |
|-----------|--------|------|------|
| /v2/health | GET | 불필요 | API 상태 확인 |
| /v2/me | GET | x-api-key | 현재 사용자/API Key 정보 |
| /v2/roles | GET | x-api-key | 역할 목록 조회 |
| /v2/organizations/{orgId}/teams | GET, POST | x-api-key | 팀 관리 |
| /v2/organizations/{orgId}/teams/{teamId} | GET, PUT, DELETE | x-api-key | 개별 팀 CRUD |
| /v2/organizations/{orgId}/users | GET | x-api-key | 조직 사용자 목록 |
| /v2/organizations/{orgId}/project-teams | GET | x-api-key | 프로젝트-팀 매핑 |
| /v2/management/contacts/bulk | POST | x-api-key | 연락처 일괄 생성 |
| /v2/management/surveys/{id}/contact-links/... | GET | x-api-key | 설문 연락처 링크 |
| /v2/management/webhooks/ | GET, POST | x-api-key | 웹훅 관리 |
| /v2/management/webhooks/{webhookId} | GET, PUT, DELETE | x-api-key | 개별 웹훅 CRUD |
| /v2/client/{envId}/responses/lib/recaptcha | POST | 불필요 | reCAPTCHA 검증 |
| /v2/client/{envId}/responses/lib/organization | GET | 불필요 | 조직 정보 조회 |

#### 4.7.9 화면/UI 요구사항

해당 없음.

#### 4.7.10 비기능 요구사항

- **호환성**: v1과 v2 병행 운영. v1 동작에 영향 없어야 한다.
- **성능**: v2 Rate Limit 분당 100건 (namespace별).

---

### 4.8 Headless 모드

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-024-08 |
| 기능명 | Headless 모드 |
| 관련 요구사항 ID | FR-043, AC-043-01 |
| 우선순위 | 필수 |
| 기능 설명 | Inquiry 기본 설문 UI를 사용하지 않고, 개발자가 커스텀 UI를 구축하여 Client API를 직접 호출하는 방식. Environment 상태 조회부터 응답 생성/업데이트/완료, 파일 업로드까지의 전체 설문 흐름을 Client API만으로 처리한다. |

#### 4.8.2 선행 조건 (Preconditions)

- 유효한 environmentId가 존재해야 한다.
- 해당 Environment에 활성 설문이 최소 1개 이상 존재해야 한다.
- Client API 엔드포인트가 정상 동작해야 한다 (FN-024-01 의존).
- CORS가 커스텀 UI 호스팅 도메인을 허용해야 한다.

#### 4.8.3 후행 조건 (Postconditions)

- 커스텀 UI를 통해 수집된 설문 응답이 Inquiry 기본 UI를 통해 수집된 응답과 동일한 데이터 구조로 저장된다.
- Display 이벤트가 정상 기록되어 설문 노출 통계가 정확하게 반영된다.

#### 4.8.4 기본 흐름 (Basic Flow)

**Headless 모드 전체 설문 흐름:**

| 단계 | 주체 | 동작 | API 호출 |
|------|------|------|---------|
| 1 | 커스텀 UI | Environment 상태 조회하여 활성 설문 목록 및 설정 획득 | GET /api/v1/client/{environmentId}/environment |
| 2 | 커스텀 UI | 응답 데이터에서 설문 목록, 트리거 조건, 설문 설정을 파싱하여 커스텀 UI에 렌더링 | - |
| 3 | 커스텀 UI | 설문 표시 시 Display 이벤트 기록 | POST /api/v1/client/{environmentId}/displays |
| 4 | 사용자 | 첫 번째 질문에 응답 |  - |
| 5 | 커스텀 UI | 새 응답 생성 (첫 질문 응답 데이터 포함) | POST /api/v1/client/{environmentId}/responses |
| 6 | 커스텀 UI | 응답 결과에서 responseId 추출 및 저장 | - |
| 7 | 사용자 | 후속 질문에 응답 | - |
| 8 | 커스텀 UI | 부분 응답 업데이트 (추가 응답 데이터 전송) | PUT /api/v1/client/{environmentId}/responses/{responseId} |
| 9 | - | (필요 시 단계 7~8 반복) | - |
| 10 | 사용자 | 마지막 질문 응답 완료 | - |
| 11 | 커스텀 UI | 최종 응답 업데이트 (finished=true) | PUT /api/v1/client/{environmentId}/responses/{responseId} |

#### 4.8.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-08-01 | 파일 업로드 질문이 포함된 설문 | 사용자 파일 선택 시 POST /api/v1/client/{environmentId}/storage로 파일 업로드 후, 반환된 파일 URL/ID를 응답 데이터에 포함하여 응답 생성/업데이트 |
| AF-08-02 | 식별된 사용자인 경우 | 응답 생성 시 userId를 포함하여 사용자 추적 가능. 또는 사전에 POST /api/v1/client/{environmentId}/user로 사용자 식별 수행 |
| AF-08-03 | 단일 질문 설문 (한 번에 완료) | 응답 생성 시 finished=true를 포함하여 단일 요청으로 응답 생성과 완료를 동시 처리 |
| AF-08-04 | 히든 필드 포함 | 응답 업데이트 시 hiddenFields 객체에 URL 파라미터나 사전 정의된 값을 key-value로 전달 |
| AF-08-05 | 메타데이터 직접 전달 | 커스텀 UI에서 browser, OS, device 등의 meta 정보를 직접 수집하여 응답 생성/업데이트 시 meta 필드에 포함 |

#### 4.8.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EX-08-01 | Environment에 활성 설문이 없는 경우 | 단계 1에서 빈 설문 목록이 반환됨. 커스텀 UI에서 적절히 처리 (빈 상태 표시 등) |
| EX-08-02 | 응답 생성 후 네트워크 오류로 responseId 분실 | 커스텀 UI에서 재시도 로직 구현 필요. 새 응답을 다시 생성하거나 사용자에게 알림 |
| EX-08-03 | 이미 완료된 응답(finished=true)에 대한 업데이트 시도 | Client API에서 해당 응답 상태 확인 후 에러 반환 가능 |
| EX-08-04 | Rate Limit 초과 | 429 응답 수신 시 커스텀 UI에서 Retry-After 헤더를 참조하여 재시도 |

#### 4.8.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-08-01 | Headless 모드는 별도의 서버 설정이 불필요하다. 기존 Client API를 그대로 활용한다. |
| BR-08-02 | Headless 모드로 수집된 응답은 기본 UI로 수집된 응답과 동일한 데이터 구조를 가진다. |
| BR-08-03 | 커스텀 UI에서 Display 이벤트를 기록해야 설문 노출 통계가 정확하게 반영된다. |
| BR-08-04 | 커스텀 UI는 meta 정보(browser, OS, device)를 직접 수집하여 응답에 포함시킬 수 있다. |
| BR-08-05 | 히든 필드 값은 커스텀 UI에서 직접 수집/조합하여 응답에 포함시킬 수 있다. |

#### 4.8.8 데이터 요구사항

Headless 모드는 Client API(FN-024-01)의 데이터 요구사항과 동일하다. 4.1.8절 참조.

**추가 고려 사항 -- meta 객체 구조:**

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| browser | string | 선택 | 브라우저 이름/버전 (예: "Chrome 120") |
| os | string | 선택 | 운영체제 (예: "Windows 11") |
| device | string | 선택 | 기기 유형 (예: "desktop", "mobile", "tablet") |
| url | string | 선택 | 설문 응답 시점의 페이지 URL |

#### 4.8.9 화면/UI 요구사항

Inquiry 서버 측 UI 요구사항은 없다. Headless 모드의 UI는 개발자가 커스텀으로 구축한다.

**활용 시나리오:**
- 브랜드 맞춤 설문 UI 구축
- 네이티브 모바일 앱에서 설문 표시
- 기존 웹 프레임워크(Vue, Angular 등)에서 설문 통합
- 특수한 UX 요구사항이 있는 경우

#### 4.8.10 비기능 요구사항

- **호환성**: Client API를 지원하는 모든 HTTP 클라이언트에서 사용 가능해야 한다.
- **보안**: Client API의 보안 요구사항(CORS, environmentId 스코핑)이 동일하게 적용된다.

---

### 4.9 API 에러 처리

#### 4.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-024-09 |
| 기능명 | API 에러 처리 |
| 관련 요구사항 ID | FR-039 |
| 우선순위 | 필수 |
| 기능 설명 | 모든 API 엔드포인트에서 발생하는 에러를 표준화된 형식으로 처리하여 일관된 에러 응답을 반환하는 기능. |

#### 4.9.2 선행 조건 (Preconditions)

- 에러 핸들러 미들웨어가 API Gateway에 적용되어 있어야 한다.

#### 4.9.3 후행 조건 (Postconditions)

- 모든 에러 상황에서 표준화된 JSON 에러 응답이 반환된다.

#### 4.9.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | API 처리 중 에러 발생 |
| 2 | 시스템 | 에러 타입 식별 |
| 3 | 시스템 | 에러 타입에 매핑된 HTTP 상태 코드 결정 |
| 4 | 시스템 | 표준 에러 응답 JSON 생성 |
| 5 | 시스템 | HTTP 상태 코드와 함께 에러 응답 반환 |

#### 4.9.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.9.6 예외 흐름 (Exception Flow)

해당 없음 (본 기능 자체가 예외 처리 기능).

#### 4.9.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-09-01 | 모든 에러 응답은 동일한 JSON 구조를 사용해야 한다. |
| BR-09-02 | 보안상 민감한 내부 정보(스택 트레이스, DB 쿼리 등)는 에러 응답에 포함하지 않는다. |

#### 4.9.8 데이터 요구사항

**에러 타입-HTTP 상태 코드 매핑:**

| 에러 타입 | HTTP 상태 코드 | 설명 |
|----------|--------------|------|
| NotAuthenticated | 401 | 인증되지 않은 요청 |
| Unauthorized | 403 | 권한 부족 |
| DatabaseError | 400 | 데이터베이스 처리 오류 |
| InvalidInputError | 400 | 유효하지 않은 입력 데이터 |
| ResourceNotFoundError | 400 | 리소스를 찾을 수 없음 |
| TooManyRequests | 429 | Rate Limit 초과 |
| InternalServerError | 500 | 서버 내부 오류 |

**표준 에러 응답 JSON 구조:**

```json
{
  "error": {
    "code": "<에러_타입>",
    "message": "<에러_메시지>",
    "details": {}
  }
}
```

#### 4.9.9 화면/UI 요구사항

해당 없음.

#### 4.9.10 비기능 요구사항

- **보안**: 에러 응답에 서버 내부 정보를 노출하지 않는다.
- **일관성**: 모든 API 계층(Client, Management, v1, v2)에서 동일한 에러 응답 형식을 사용한다.

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

| 엔티티 | 설명 | 주요 필드 |
|--------|------|----------|
| ApiKey | Management API 인증용 키 | id, hashedKey, label, organizationId, createdAt, lastUsedAt |
| ApiKeyEnvironmentPermission | API Key의 Environment별 권한 | apiKeyId, environmentId, permission |
| Environment | 프로젝트 내 격리된 실행 환경 | id (CUID2), type, projectId |
| Organization | 조직 | id, name |
| Survey | 설문 | id, environmentId, status, questions, ... |
| Response | 설문 응답 | id (CUID2), surveyId, data, finished, meta, createdAt, updatedAt |
| Display | 설문 노출 이벤트 | id, surveyId, responseId, createdAt |
| Contact | 연락처 | id, environmentId, attributes |
| ActionClass | 사용자 행동 분류 | id, environmentId, name, type |

### 5.2 엔티티 간 관계

```
Organization (1) ----< (N) ApiKey
ApiKey (1) ----< (N) ApiKeyEnvironmentPermission
Environment (1) ----< (N) ApiKeyEnvironmentPermission
Organization (1) ----< (N) Project
Project (1) ----< (N) Environment
Environment (1) ----< (N) Survey
Survey (1) ----< (N) Response
Survey (1) ----< (N) Display
Response (0..1) ---- (0..1) Display
Environment (1) ----< (N) Contact
Environment (1) ----< (N) ActionClass
```

### 5.3 데이터 흐름

**Client API 데이터 흐름:**
```
클라이언트 --[environmentId]--> Environment 조회 --> 설문 목록 반환
클라이언트 --[surveyId, data]--> Response 생성 --> responseId 반환
클라이언트 --[responseId, data]--> Response 업데이트 --> 완료 처리
```

**Management API 데이터 흐름:**
```
클라이언트 --[x-api-key]--> ApiKey 검증 --> 인증 객체 생성
인증 객체 --[environmentPermissions]--> 권한 확인 --> 리소스 CRUD
```

---

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 연동 대상 | 프로토콜 | 설명 |
|----------|---------|------|
| JavaScript SDK | HTTP/HTTPS | Client API를 통해 설문 표시/응답 제출 |
| 커스텀 UI (Headless) | HTTP/HTTPS | Client API를 직접 호출하여 설문 흐름 처리 |
| 외부 백엔드 서버 | HTTP/HTTPS | Management API를 통해 설문/응답/연락처 관리 |
| reCAPTCHA (v2 API) | HTTP/HTTPS | v2 Client API를 통한 봇 방지 검증 |

### 6.2 API 명세

**기본 경로 구조:**

| 버전 | 경로 패턴 | 인증 |
|------|----------|------|
| v1 Client | /api/v1/client/{environmentId}/* | 불필요 |
| v1 Management | /api/v1/management/* | x-api-key |
| v2 Client | /api/v2/client/{environmentId}/* | 불필요 |
| v2 Management | /api/v2/management/* | x-api-key |
| v2 Organization | /api/v2/organizations/* | x-api-key |
| v2 기타 | /api/v2/health, /api/v2/me, /api/v2/roles | 일부 불필요 |

**공통 요청 헤더:**

| 헤더 | 필수 여부 | 설명 |
|------|----------|------|
| Content-Type | 필수 (POST/PUT) | application/json |
| x-api-key | Management API 필수 | API Key 값 |
| Accept | 선택 | application/json |

**공통 응답 형식:**

성공 시:
```json
{
  "data": { ... }
}
```

실패 시:
```json
{
  "error": {
    "code": "<에러_타입>",
    "message": "<에러_메시지>",
    "details": {}
  }
}
```

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| 항목 | 요구사항 |
|------|---------|
| Rate Limiting | 모든 API 계층(v1 Management, v2 Management, Client)에 분당 100건 namespace별 제한 |
| API Key 검증 | bcrypt 비교 성능을 고려하여 인덱스 최적화 또는 접두사 기반 필터링으로 비교 대상 최소화 |

### 7.2 보안 요구사항

| 항목 | 요구사항 |
|------|---------|
| API Key 저장 | bcrypt (cost factor: 12)로 해시하여 저장. 원본 평문 저장 금지 |
| API Key 형식 | v2 형식: "fbk_" 접두사 + base64url 인코딩된 시크릿 |
| 데이터 격리 | Client API는 environmentId 기반 스코핑으로 다른 Environment의 데이터에 접근 불가 |
| CORS | Client API는 허용된 도메인에서만 브라우저 직접 호출 가능 |
| 에러 응답 | 서버 내부 정보(스택 트레이스, DB 쿼리 등)를 에러 응답에 포함 금지 |
| API Key 노출 방지 | API Key 원본은 생성 시 1회만 반환. 로그에 기록 금지 |

### 7.3 가용성 요구사항

| 항목 | 요구사항 |
|------|---------|
| v1/v2 병행 | v1과 v2 API가 독립적으로 동작하여 한쪽 장애가 다른 쪽에 영향을 주지 않아야 함 |
| Health Check | /api/v2/health 엔드포인트를 통해 API 서버 상태를 모니터링할 수 있어야 함 |

---

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| 항목 | 내용 |
|------|------|
| ID 형식 | environmentId, responseId 등 주요 ID는 CUID2 형식 |
| 해시 알고리즘 | API Key 해싱은 bcrypt (cost factor: 12)로 고정 |
| API Key 접두사 | v2 형식은 "fbk_"로 고정 |
| Rate Limit | 분당 100건으로 고정 (동적 조정 불가) |

### 8.2 비즈니스 제약사항

| 항목 | 내용 |
|------|------|
| API Key 권한 레벨 | 3개(read, write, manage)로 고정. 커스텀 권한 정의 불가 |
| API Key 소속 | Organization 단위로만 생성 가능 |
| v2 API 상태 | Beta로, 하위 호환성 미보장 |
| 라이선스 | Community 라이선스 범위 기능 |

### 8.3 가정사항

| 항목 | 내용 |
|------|------|
| 데이터베이스 | PostgreSQL이 사용되며 Prisma ORM으로 접근 |
| 인프라 | Inquiry API 서버가 정상 운영 중이며, 적절한 네트워크 설정(방화벽, 리버스 프록시 등)이 완료되어 있다고 가정 |
| CORS | CORS 정책은 운영 환경에 맞게 별도 설정되어 있다고 가정 |
| 웹훅 | 웹훅 관련 상세 기능은 FSD-023에서 정의되며, 본 명세에서는 엔드포인트 경로만 기술 |

---

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 수용 기준 ID | 기능 ID | 기능명 | 상태 |
|------------|------------|---------|--------|------|
| FR-039 | AC-039-01 | FN-024-01 | Client API v1 엔드포인트 | 정의 완료 |
| FR-039 | AC-039-02 | FN-024-02 | Management API v1 엔드포인트 | 정의 완료 |
| FR-039 | AC-039-02 | FN-024-03 | API Key 인증 처리 | 정의 완료 |
| FR-039 | AC-039-02, AC-039-03 | FN-024-04 | API Key 권한 레벨 관리 | 정의 완료 |
| FR-039 | AC-039-03 | FN-024-05 | API Key 생성 및 관리 | 정의 완료 |
| FR-039 | AC-039-04 | FN-024-06 | Rate Limiting | 정의 완료 |
| FR-039 | AC-039-05 | FN-024-07 | v2 Beta API | 정의 완료 |
| FR-043 | AC-043-01 | FN-024-08 | Headless 모드 | 정의 완료 |
| FR-039 | - | FN-024-09 | API 에러 처리 | 정의 완료 |

### 9.2 수용 기준 커버리지

| 수용 기준 | 관련 기능 명세 절 | 커버리지 |
|----------|-----------------|---------|
| AC-039-01: environmentId만으로 Client API 접근 | 4.1 (BR-01-01) | 충족 |
| AC-039-01: POST /responses로 새 응답 생성 | 4.1.4.3 | 충족 |
| AC-039-01: PUT /responses/{id}로 부분 응답 업데이트 | 4.1.4.4 | 충족 |
| AC-039-01: finished=true로 응답 완료 처리 | 4.1.4.4 단계 7 | 충족 |
| AC-039-01: 유효하지 않은 environmentId 에러 반환 | 4.1.6 (EX-01-01, EX-01-02) | 충족 |
| AC-039-02: x-api-key 없이 Management API 호출 시 401 | 4.2.6 (EX-02-01) | 충족 |
| AC-039-02: 유효한 API Key로 인증 객체 생성 | 4.3.4 | 충족 |
| AC-039-02: read 권한으로 쓰기 시 403 | 4.4.6 (EX-04-01) | 충족 |
| AC-039-02: write 권한으로 관리 시 403 | 4.4.6 (EX-04-02) | 충족 |
| AC-039-02: manage 권한으로 모든 작업 가능 | 4.4.7 (BR-04-04) | 충족 |
| AC-039-03: Organization 단위 API Key 생성 | 4.5.7 (BR-05-01) | 충족 |
| AC-039-03: 환경별 권한 설정 | 4.5.4 단계 9 | 충족 |
| AC-039-03: "fbk_" 접두사 형식 | 4.5.7 (BR-05-02) | 충족 |
| AC-039-03: bcrypt 해시 저장 | 4.5.7 (BR-05-04) | 충족 |
| AC-039-03: 동일 Environment 중복 할당 불가 | 4.5.7 (BR-05-06) | 충족 |
| AC-039-04: Management API 분당 100건 제한 | 4.6.7 (BR-06-01) | 충족 |
| AC-039-04: Client API 분당 100건 제한 | 4.6.7 (BR-06-01) | 충족 |
| AC-039-04: Rate Limit 초과 시 에러 응답 | 4.6.6 (EX-06-01) | 충족 |
| AC-039-05: /api/v2/health 상태 반환 | 4.7.4.1 | 충족 |
| AC-039-05: v2 Management 동일 인증 체계 | 4.7.7 (BR-07-02) | 충족 |
| AC-039-05: v2 전용 엔드포인트 접근 | 4.7.8 | 충족 |
| AC-043-01: Client API로 설문 데이터 조회 | 4.8.4 단계 1 | 충족 |
| AC-043-01: Client API로 응답 생성/업데이트/완료 | 4.8.4 단계 5, 8, 11 | 충족 |
| AC-043-01: meta 정보 직접 전달 | 4.8.5 (AF-08-05) | 충족 |
| AC-043-01: 히든 필드 값 포함 | 4.8.5 (AF-08-04) | 충족 |
| AC-043-01: 파일 업로드 처리 | 4.8.5 (AF-08-01) | 충족 |

### 9.3 변경 이력

| 버전 | 일자 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-02-21 | 최초 작성 | - |
