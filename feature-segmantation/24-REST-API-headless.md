# REST API 및 Headless 모드 -- 요구사항 명세서

> **문서번호**: FSD-024 | **FR 범위**: FR-039, FR-043
> **라이선스**: Community

---

## 1. 목적/배경

Formbricks는 두 가지 API 계층을 제공한다. **Client API**는 인증 없이 environmentId 기반으로 설문 표시 및 응답 제출을 처리하며, JavaScript SDK와 임베디드 설문에 사용된다. **Management API**는 x-api-key 헤더로 인증하여 설문, 응답, 연락처 등을 프로그래밍 방식으로 관리한다. **Headless 모드**는 Formbricks의 기본 UI 없이 Client API를 사용하여 커스텀 UI로 응답을 제출하는 방식이다.

---

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- Client API 엔드포인트 및 인증 체계
- Management API 엔드포인트 및 인증 체계
- v2 Beta API 구조
- API Key 관리 (생성, 권한 설정)
- API Key 권한 레벨 3가지 (read, write, manage)
- Headless 모드 개념 및 Client API 활용
- Rate Limiting

### Out-of-scope
- JavaScript SDK 내부 구현
- 개별 API 엔드포인트의 비즈니스 로직 상세
- 웹훅 API (FSD-023 참조)

---

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| Frontend Developer | Client API를 통해 설문 표시/응답 제출 |
| Backend Developer | Management API로 설문/응답 프로그래밍 관리 |
| API Key Admin | API Key 생성 및 권한 관리 (Organization 레벨) |
| Headless UI Developer | 커스텀 설문 UI 구축 시 Client API 활용 |

---

## 4. 기능 요구사항

### FR-039: REST API 체계

#### 4.1 API 아키텍처 개요

API는 다음과 같은 경로 구조로 구성된다:

| 경로 | 설명 |
|------|------|
| /api/v1/client/{environmentId}/ | Client API (인증 불필요) |
| /api/v1/management/ | Management API (x-api-key 인증) |
| /api/v1/webhooks/ | Webhook API (x-api-key 인증) |
| /api/v1/integrations/ | Integration OAuth 콜백 |
| /api/v2/client/{environmentId}/ | v2 Client API (Beta) |
| /api/v2/management/ | v2 Management API (Beta) |
| /api/v2/me/ | v2 사용자 정보 API |
| /api/v2/health/ | v2 Health Check |
| /api/v2/organizations/ | v2 Organization API |
| /api/v2/roles/ | v2 Role API |

#### 4.2 Client API (인증 불필요)

**엔드포인트 목록**:

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| /client/{envId}/environment | GET | Environment 상태 조회 (설문 목록, 설정 등) |
| /client/{envId}/displays | POST | Display 이벤트 기록 |
| /client/{envId}/responses | POST | 새 응답 생성 |
| /client/{envId}/responses/{responseId} | PUT | 응답 업데이트 (부분 응답) |
| /client/{envId}/storage | POST | 파일 업로드 |
| /client/{envId}/user | POST | 사용자 식별 |

인증 방식:
- **인증 불필요**: environmentId만으로 접근 가능
- environmentId는 CUID2 형식의 고유 식별자
- 응답 데이터 스코핑은 environmentId 기반으로 자동 적용

v2 Client API 추가 엔드포인트:

| 엔드포인트 | 설명 |
|-----------|------|
| /v2/client/{envId}/responses/lib/recaptcha | reCAPTCHA 검증 |
| /v2/client/{envId}/responses/lib/organization | 조직 정보 조회 |

#### 4.3 Management API (x-api-key 인증)

**인증 처리**:

요청 헤더에서 x-api-key 값을 추출하여 API Key를 검증한다. 유효한 API Key인 경우 다음 정보를 포함한 인증 객체를 생성한다:

| 필드 | 설명 |
|------|------|
| type | 인증 타입 ("apiKey") |
| environmentPermissions | 환경별 권한 목록 (환경 ID, 환경 유형, 권한, 프로젝트 ID, 프로젝트 이름) |
| apiKeyId | API Key ID |
| organizationId | 조직 ID |
| organizationAccess | 조직 접근 권한 |

**Management API 엔드포인트**:

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| /management/me | GET | 현재 API Key 정보 |
| /management/surveys | GET, POST | 설문 목록 조회/생성 |
| /management/surveys/{surveyId} | GET, PUT, DELETE | 개별 설문 CRUD |
| /management/surveys/{surveyId}/singleUseIds | GET | 일회성 링크 ID 생성 |
| /management/responses | GET | 응답 목록 조회 |
| /management/responses/{responseId} | GET, PUT, DELETE | 개별 응답 CRUD |
| /management/contacts | GET, POST | 연락처 목록 조회/생성 |
| /management/contacts/{contactId} | GET, DELETE | 개별 연락처 조회/삭제 |
| /management/contact-attributes | POST | 연락처 속성 관리 |
| /management/contact-attribute-keys | GET | 연락처 속성 키 목록 |
| /management/contact-attribute-keys/{id} | PUT | 속성 키 수정 |
| /management/action-classes | GET, POST | Action Class 목록 |
| /management/action-classes/{id} | PUT, DELETE | Action Class 수정/삭제 |
| /management/storage | POST | 파일 업로드 |

**에러 처리**:

| 에러 | HTTP 상태 |
|------|----------|
| NotAuthenticated | 401 |
| Unauthorized | 403 |
| DatabaseError | 400 |
| InvalidInputError | 400 |
| ResourceNotFoundError | 400 |
| 기타 | 500 |

#### 4.4 API Key 권한 레벨 (3단계)

| 권한 | 설명 |
|------|------|
| read | 읽기 전용 |
| write | 읽기 + 쓰기 |
| manage | 읽기 + 쓰기 + 관리 |

**Environment별 권한 할당**:

- API Key는 Organization 단위로 생성
- 각 Environment에 대해 개별 권한 레벨 설정 가능
- API Key ID + Environment ID 조합은 유니크 제약

**API Key 생성 시 입력**:
- 라벨 (필수)
- 환경별 권한 목록 (선택)
- 조직 접근 권한

**API Key v2 형식**:
- 접두사: "fbk_" + base64url 인코딩된 시크릿
- API Key는 bcrypt로 해시하여 데이터베이스에 저장
- 검증 시 bcrypt 비교
- 시크릿 부분에는 영문, 숫자, 하이픈, 언더스코어만 허용

#### 4.5 v2 API (Beta)

v2 API는 v1과 병행하여 베타로 제공되며, 추가 엔드포인트를 포함:

**v2 전용 엔드포인트**:

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| /v2/health | GET | API 상태 확인 |
| /v2/me | GET | 현재 사용자/API Key 정보 |
| /v2/roles | GET | 역할 목록 조회 |
| /v2/organizations/{orgId}/teams | GET, POST | 팀 관리 |
| /v2/organizations/{orgId}/teams/{teamId} | GET, PUT, DELETE | 개별 팀 CRUD |
| /v2/organizations/{orgId}/users | GET | 조직 사용자 목록 |
| /v2/organizations/{orgId}/project-teams | GET | 프로젝트-팀 매핑 |
| /v2/management/contacts/bulk | POST | 연락처 일괄 생성 |
| /v2/management/surveys/{id}/contact-links/... | GET | 설문 연락처 링크 |
| /v2/management/webhooks/ | GET, POST | 웹훅 관리 |
| /v2/management/webhooks/{webhookId} | GET, PUT, DELETE | 개별 웹훅 CRUD |

#### 4.6 Rate Limiting

| API | Rate Limit | 단위 |
|-----|-----------|------|
| v1 Management API | 100 requests/분 | namespace별 |
| v2 Management API | 100 requests/분 | namespace별 |
| Client API | 100 requests/분 | namespace별 |

### FR-043: Headless 모드

#### 4.7 Headless 모드 개요

Headless 모드는 Formbricks의 기본 설문 UI를 사용하지 않고, 개발자가 커스텀 UI를 구축하여 Client API를 직접 호출하는 방식이다.

**활용 시나리오**:
- 브랜드 맞춤 설문 UI 구축
- 네이티브 모바일 앱에서 설문 표시
- 기존 웹 프레임워크(Vue, Angular 등)에서 설문 통합
- 특수한 UX 요구사항이 있는 경우

#### 4.8 Headless 모드 Client API 활용 흐름

1. **Environment 상태 조회**: GET /api/v1/client/{environmentId}/environment
   - 활성 설문 목록, 설문 설정, 트리거 조건 등을 가져옴

2. **Display 이벤트 기록**: POST /api/v1/client/{environmentId}/displays
   - 설문 표시 시 display 이벤트를 기록 (노출 추적)

3. **응답 생성**: POST /api/v1/client/{environmentId}/responses
   - 새 응답 생성 (첫 질문 응답 시)
   - 응답 생성 입력 데이터에는 environmentId, surveyId, userId(선택), 완료 여부, 응답 데이터, 변수(선택), TTC(선택), 메타데이터(선택)가 포함됨

4. **응답 업데이트**: PUT /api/v1/client/{environmentId}/responses/{responseId}
   - 부분 응답 업데이트 (추가 질문 응답 시)
   - 응답 업데이트 데이터에는 완료 여부, 응답 데이터, 언어(선택), 변수(선택), TTC(선택), 메타데이터(선택), 히든 필드(선택), displayId(선택), endingId(선택)가 포함됨
   - finished = true로 응답 완료 처리

5. **파일 업로드**: POST /api/v1/client/{environmentId}/storage
   - 파일 업로드 질문의 파일 처리

---

## 5. 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| **보안** | API Key는 bcrypt 해시로 저장 |
| **보안** | API Key v2 형식은 "fbk_" 접두사 + base64url 인코딩 |
| **보안** | Client API는 environmentId 기반 스코핑으로 데이터 격리 |
| **성능** | 모든 API에 분당 100건 Rate Limit 적용 |
| **호환성** | v1과 v2 API 병행 운영 |
| **접근성** | Client API는 CORS를 통해 브라우저에서 직접 호출 가능 |

---

## 6. 정책/제약

| 항목 | 값 |
|------|-----|
| API Key 권한 레벨 | 3개 (read, write, manage) |
| API Key v2 접두사 | "fbk_" |
| API Key 해싱 | bcrypt (cost: 12) |
| Client API 인증 | 불필요 (environmentId만) |
| Management API 인증 | x-api-key 헤더 |
| Rate Limit - v1 | 100 req/min |
| Rate Limit - v2 | 100 req/min |
| Rate Limit - Client | 100 req/min |
| Environment 권한 유니크 | API Key ID + Environment ID 조합 |
| v2 API 상태 | Beta |
| Response ID 형식 | CUID2 |
| Management API 엔드포인트 수 | 15+ |
| Client API 엔드포인트 수 | 6개 |

---

## 7. 수용 기준 (Acceptance Criteria)

### AC-039-01: Client API
- [ ] environmentId만으로 Client API에 접근할 수 있다 (인증 불필요)
- [ ] POST /client/{envId}/responses로 새 응답을 생성할 수 있다
- [ ] PUT /client/{envId}/responses/{responseId}로 부분 응답을 업데이트할 수 있다
- [ ] finished = true로 응답을 완료 처리할 수 있다
- [ ] 유효하지 않은 environmentId로 요청 시 에러가 반환된다

### AC-039-02: Management API 인증
- [ ] x-api-key 헤더 없이 Management API 호출 시 401 응답이 반환된다
- [ ] 유효한 API Key로 인증하면 환경별 권한 정보가 포함된 인증 객체가 생성된다
- [ ] read 권한 API Key로 쓰기 작업 시 403 응답이 반환된다
- [ ] write 권한 API Key로 관리 작업 시 403 응답이 반환된다
- [ ] manage 권한 API Key로 모든 작업이 가능하다

### AC-039-03: API Key 관리
- [ ] Organization 단위로 API Key를 생성할 수 있다
- [ ] API Key에 환경별 권한(read/write/manage)을 설정할 수 있다
- [ ] 생성된 API Key는 "fbk_" 접두사 형식이다
- [ ] API Key는 bcrypt 해시로 안전하게 저장된다
- [ ] 동일 API Key에 동일 Environment를 중복 할당할 수 없다

### AC-039-04: Rate Limiting
- [ ] Management API는 분당 100건의 요청 제한이 적용된다
- [ ] Client API는 분당 100건의 요청 제한이 적용된다
- [ ] Rate Limit 초과 시 적절한 에러 응답이 반환된다

### AC-039-05: v2 API
- [ ] /api/v2/health 엔드포인트가 API 상태를 반환한다
- [ ] v2 Management API가 v1과 동일한 인증 체계를 사용한다
- [ ] v2 전용 엔드포인트(teams, organizations, roles 등)에 접근할 수 있다

### AC-043-01: Headless 모드
- [ ] Client API만으로 설문 데이터를 가져올 수 있다
- [ ] Client API만으로 응답을 생성/업데이트/완료할 수 있다
- [ ] 커스텀 UI에서 meta 정보(browser, OS, device)를 직접 전달할 수 있다
- [ ] 히든 필드 값을 응답에 포함시킬 수 있다
- [ ] 파일 업로드를 Client API를 통해 처리할 수 있다
