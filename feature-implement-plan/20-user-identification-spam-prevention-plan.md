# 기능 구현 계획: 사용자 식별 및 스팸 방지 (FS-020)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

본 명세서(FS-020)는 Inquiry SDK의 **사용자 식별(User Identification)** 기능과 **reCAPTCHA v3 기반 스팸 방지(Spam Prevention)** 기능에 대한 상세 기능 명세를 정의한다. 구현 순서상 7단계("배포/노출 채널")의 두 번째 항목이며, FS-007(SDK/위젯/GTM)이 제공하는 SDK 코어 런타임 위에 구축된다.

**사용자 식별 기능 (FR-031 계열, 8개):**

| 기능 ID | 기능명 | 우선순위 | 의존 대상 |
|---------|--------|---------|----------|
| FN-031-01 | SDK 공개 API | H | FS-007 SDK 코어 |
| FN-031-02 | setUserId 처리 | H | FN-031-01, FN-031-05 |
| FN-031-03 | logout 처리 | H | FN-031-01, FN-031-06 |
| FN-031-04 | setAttributes 처리 | H | FN-031-01, FN-031-05 |
| FN-031-05 | 업데이트 큐 (Debounce 배치) | H | FN-031-06 |
| FN-031-06 | 사용자 상태 관리 | H | FS-007 LocalStorage 모듈 |
| FN-031-07 | SDK 초기화 흐름 | H | FS-007 초기화 인프라 |
| FN-031-08 | setNonce (CSP 지원) | M | FS-007 위젯 시스템 |

**스팸 방지 기능 (FR-032 계열, 6개):**

| 기능 ID | 기능명 | 우선순위 | 의존 대상 |
|---------|--------|---------|----------|
| FN-032-01 | reCAPTCHA 설정 관리 | M | FS-008 Survey 모델, FS-029 Enterprise 라이선스 |
| FN-032-02 | reCAPTCHA 클라이언트 스크립트 로딩 | M | FS-007 SDK 코어 |
| FN-032-03 | reCAPTCHA 토큰 실행 | M | FN-032-02 |
| FN-032-04 | reCAPTCHA 서버 검증 | M | FS-024 Client API |
| FN-032-05 | 응답 제출 시 reCAPTCHA 검증 흐름 | M | FN-032-03, FN-032-04 |
| FN-032-06 | 스팸 방지 활성화 조건 관리 | M | FS-029 Enterprise 라이선스 |

### 1.2 비기능 요구사항

| ID | 항목 | 요구사항 | 현재 상태 |
|----|------|---------|----------|
| NFR-031-01 | 네트워크 최소화 | Debounce 500ms로 배치 처리. setUserId -> setAttributes 100ms 이내 연속 호출 시 단일 요청 | FS-007에 기반 구조 존재 |
| NFR-031-02 | 에러 복구 | 에러 발생 시 10분간 재시도 차단, 이후 자동 복구 | FS-007 에러 핸들러 존재 |
| NFR-031-03 | 상태 유효 기간 | 활동 시 30분 연장, 60초마다 갱신 체크 | FS-007 LocalStorage 모듈 기반 |
| NFR-031-04 | 상태 영속화 | LocalStorage "formbricks-js" 키 사용 | FS-007에서 구현 완료 예정 |
| NFR-031-05 | 레거시 호환 | init -> setup 자동 변환, apiHost -> appUrl 마이그레이션 | FS-007 마이그레이션 모듈 |
| NFR-032-01 | 서버 검증 타임아웃 | Google siteverify API 5,000ms 타임아웃 | 미구현 |
| NFR-032-02 | Graceful Degradation | reCAPTCHA 키 미설정 시 검증 스킵 | 미구현 |
| NFR-032-03 | 스크립트 중복 방지 | 고유 ID 기반 reCAPTCHA 스크립트 재로딩 방지 | 미구현 |
| NFR-SEC-01 | CSP 지원 | setNonce를 통한 inline style 허용 | FS-007 Shadow DOM에서 일부 지원 |
| NFR-SEC-02 | Secret Key 보호 | reCAPTCHA Secret Key는 서버 환경변수에만 저장 | 미구현 |
| NFR-SEC-03 | Enterprise 라이선스 | 사용자 식별 + reCAPTCHA 모두 Enterprise 필요 | FS-029에서 플래그 정의됨 |

### 1.3 명세서 내 모호한 부분 및 해석

| 번호 | 모호한 부분 | 제안 해석 |
|------|-----------|----------|
| 1 | 사용자 식별 기능의 Enterprise 라이선스 게이팅 범위 - setUserId, setAttributes는 라이선스 필요하지만 setup/logout은? | `setup()`과 `logout()`은 SDK 기본 동작이므로 라이선스 없이도 동작한다. `setUserId`, `setAttributes`(language 제외), 서버 업데이트 전송만 Enterprise 라이선스가 필요하다. |
| 2 | 업데이트 큐의 서버 엔드포인트 경로가 명세에 `POST /api/v1/client/{environmentId}/user`로 정의되었으나, FS-024에서는 별도 경로가 정의될 수 있음 | FS-024 Client API의 `/user` 엔드포인트를 사용한다. FS-007 SDK 코어의 `api-client.ts`에서 이미 정의된 패턴을 따른다. |
| 3 | reCAPTCHA 설정이 Survey 모델의 `recaptcha` Json 필드 내부 구조인지, 별도 테이블인지 불명확 | FS-008 구현 계획에서 이미 Survey 모델에 `recaptcha Json?` 필드가 정의되어 있다. `{ enabled: boolean, threshold: number | null }` 구조의 JSON 객체로 저장한다. 별도 DB 테이블은 불필요하다. |
| 4 | "Enterprise 라이선스가 없어도 reCAPTCHA 검증 자체는 수행" (EF-03, BR-04)과 "Enterprise 라이선스가 활성화 조건의 4번째" (BR-01) 사이의 모순 | Enterprise 라이선스가 없어도 서버 측 reCAPTCHA 검증(토큰 확인)은 수행하되, 서버에 "라이선스 미활성" 로그를 기록한다. 즉, 라이선스는 클라이언트 UI 제어(설정 패널 접근)와 감사 목적에 사용되며, 검증 실행 자체를 차단하지는 않는다. |
| 5 | setAttributes의 userId 없이 language만 설정하는 경우의 서버 전송 여부 | language 속성만 포함되고 userId가 없으면 로컬 config에만 적용하고 서버에 전송하지 않는다. SDK 내부에서 설문 필터링 시 language를 참조한다. |
| 6 | reCAPTCHA threshold가 null인 경우의 동작 - "검증을 수행하지 않는다" vs "토큰만 수집하고 검증 없이 통과" | threshold가 null이면 reCAPTCHA가 enabled=true여도 서버에서 score 비교를 수행하지 않고 응답을 허용한다. 클라이언트에서도 토큰 획득을 시도하지 않는다. |
| 7 | FS-007에서 이미 `packages/js-sdk`에 사용자 식별 관련 퍼블릭 API(setUserId, setAttributes, logout)를 스켈레톤으로 정의함 | FS-007은 API 시그니처와 기본 흐름만 정의하고, FS-020이 사용자 식별의 실제 구현(Debounce 큐, 상태 관리, 서버 동기화)을 담당한다. FS-007의 기존 코드를 확장하는 방식으로 구현한다. |

### 1.4 암묵적 요구사항

| 번호 | 암묵적 요구사항 | 도출 근거 |
|------|--------------|----------|
| 1 | **SDK 업데이트 큐 모듈 신규 구현** | FS-007에서 setUserId/setAttributes의 API 시그니처만 정의했으나, Debounce 배치 큐는 미구현. `packages/js-sdk/src/user/update-queue.ts` 신규 생성 필요 |
| 2 | **SDK 사용자 상태 관리 모듈 확장** | FS-007의 `user-state.ts`가 기본 구조만 가지고 있으므로, 만료/갱신/영속화 로직을 FS-020에서 완성 |
| 3 | **서버 reCAPTCHA 검증 서비스** | `libs/server/recaptcha/` NestJS 모듈 생성이 필요. Google siteverify API 호출, 타임아웃 처리, Graceful Degradation |
| 4 | **환경변수 추가** | `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY` (FS-099에서 이미 정의), `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (클라이언트 노출용) |
| 5 | **Survey Editor UI 확장** | Settings -> Response Options에 Spam protection 토글 및 threshold 입력 UI 추가 |
| 6 | **Client API 사용자 업데이트 엔드포인트** | `POST /api/v1/client/{environmentId}/user` 엔드포인트가 FS-024에서 스텁으로 존재할 경우, Contact 생성/업데이트 로직을 완성해야 함 |
| 7 | **응답 제출 API 확장** | 기존 응답 제출 엔드포인트에 `recaptchaToken` 필드 추가 및 검증 파이프라인 통합 |
| 8 | **i18n 번역 키 추가** | reCAPTCHA 설정 UI의 라벨, 에러 메시지 관련 ko/en 번역 키 |
| 9 | **SDK reCAPTCHA 모듈** | `packages/js-sdk/src/recaptcha/` 디렉토리에 스크립트 로딩, 토큰 실행, 설정 관리 모듈 |
| 10 | **FS-026 Contact 모듈 연동** | setUserId 시 서버에서 Contact 생성/연결이 발생하므로, FS-026의 Contact 서비스와 연동 필요 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

FS-020은 두 개의 독립 도메인(사용자 식별, 스팸 방지)을 다루며, 각각 클라이언트(SDK)와 서버 양쪽에 구현이 필요하다.

```
[클라이언트 - SDK 확장]
packages/js-sdk/
├── src/
│   ├── user/                              # [신규] 사용자 식별 도메인
│   │   ├── update-queue.ts               # Debounce 배치 업데이트 큐 (싱글톤)
│   │   ├── user-state-manager.ts         # 사용자 상태 로드/갱신/만료/영속화
│   │   ├── user-api.ts                   # 사용자 업데이트 서버 API 호출
│   │   ├── set-user-id.ts               # setUserId 처리 로직
│   │   ├── set-attributes.ts            # setAttributes/setAttribute/setEmail/setLanguage 처리
│   │   └── teardown.ts                  # logout/tearDown 처리 (FS-007 teardown 확장)
│   ├── recaptcha/                        # [신규] reCAPTCHA 클라이언트 도메인
│   │   ├── recaptcha-loader.ts          # Google reCAPTCHA v3 스크립트 동적 로딩
│   │   ├── recaptcha-token.ts           # 토큰 실행 (grecaptcha.execute)
│   │   └── recaptcha-config.ts          # reCAPTCHA 설정 관리 (siteKey, enabled 등)
│   ├── types/
│   │   ├── user.ts                      # [수정] UserState 타입 확장
│   │   └── recaptcha.ts                 # [신규] reCAPTCHA 관련 타입
│   └── index.ts                         # [수정] 퍼블릭 API 확장

[클라이언트 - 대시보드 UI 확장]
libs/client/survey/                       # [수정] 기존 설문 편집 라이브러리
  └── src/lib/
      └── settings/
          └── spam-protection-section.tsx # [신규] reCAPTCHA 설정 UI 섹션

[서버 - reCAPTCHA 검증 모듈]
libs/server/recaptcha/                    # [신규] reCAPTCHA 서버 모듈
├── src/
│   ├── index.ts                         # 퍼블릭 API
│   └── lib/
│       ├── recaptcha.module.ts          # NestJS 모듈
│       ├── recaptcha.service.ts         # Google siteverify API 호출 + 검증 로직
│       ├── recaptcha.guard.ts           # reCAPTCHA 검증 Guard (응답 API에 적용)
│       ├── dto/
│       │   └── recaptcha-verify.dto.ts  # 검증 요청 DTO
│       ├── constants/
│       │   └── recaptcha.constants.ts   # 상수 (타임아웃, action명 등)
│       └── interfaces/
│           └── recaptcha.types.ts       # Google API 응답 타입 등

[서버 - Client API 확장]
libs/server/client-api/                   # [수정] FS-024 Client API 모듈
  └── src/lib/
      └── controllers/
          └── client-user.controller.ts  # [수정] 사용자 업데이트 엔드포인트 완성
```

**모듈 의존 관계:**

```
RecaptchaModule
  ├─ imports ─> ConfigModule (RECAPTCHA_SECRET_KEY)
  └─ exports ─> RecaptchaService, RecaptchaGuard

ClientApiModule (FS-024)
  ├─ imports ─> ContactModule (FS-026, Contact 생성/업데이트)
  ├─ imports ─> RecaptchaModule (reCAPTCHA 검증)
  ├─ imports ─> LicenseModule (FS-029, Enterprise 확인)
  └─ imports ─> ServerPrismaModule

packages/js-sdk (사용자 식별)
  ├─ depends ─> FS-007 SDK 코어 (config, storage, logger, api-client, error-handler)
  ├─ depends ─> FS-024 Client API (POST /user 엔드포인트)
  └─ depends ─> FS-026 Contact 모델 (서버 사이드)

packages/js-sdk (reCAPTCHA)
  ├─ depends ─> FS-007 SDK 코어 (config, environment-state)
  └─ depends ─> Google reCAPTCHA v3 CDN
```

### 2.2 데이터 모델

**Prisma 스키마 변경: 없음.** FS-020 자체로는 DB 스키마 변경이 불필요하다. reCAPTCHA 설정은 FS-008에서 이미 정의된 Survey 모델의 `recaptcha Json?` 필드에 저장된다. 사용자 식별 데이터는 FS-026의 Contact 모델에 저장된다.

**Survey.recaptcha 필드 JSON 구조:**

```typescript
interface SurveyRecaptchaConfig {
  enabled: boolean;    // 기본값: false
  threshold: number | null;  // 0.1 ~ 0.9, 0.1 단위. 기본값: null
}
```

**SDK UserState (클라이언트 사이드, FS-007에서 정의된 구조 확장):**

```typescript
interface UserState {
  expiresAt: number | null;       // Unix timestamp (ms). 활동 시 현재+30분
  userId: string | null;          // 사용자 ID. 미식별 시 null
  contactId: string | null;       // Inquiry Contact ID. 서버에서 반환
  segments: string[];             // 사용자가 속한 세그먼트 ID 배열
  displays: Array<{
    surveyId: string;
    createdAt: number;            // Unix timestamp
  }>;
  responses: string[];            // 응답한 설문 ID 배열
  lastDisplayAt: number | null;   // 마지막 설문 표시 시각 (Unix timestamp)
  language: string | undefined;   // SDK 로컬 언어 설정
}
```

**업데이트 큐 내부 데이터 구조:**

```typescript
interface UpdateQueueData {
  userId: string | null;
  attributes: Record<string, string | number>;
}
```

**서버 업데이트 요청/응답:**

```typescript
// Request: POST /api/v1/client/{environmentId}/user
interface UserUpdateRequest {
  userId: string;
  attributes?: Record<string, string | number>;
}

// Response: 200 OK
interface UserUpdateResponse {
  contactId: string;
  segments: string[];
  displays: Array<{ surveyId: string; createdAt: string }>; // ISO 8601
  responses: string[];
  lastDisplayAt: string | null;
}
```

**Google reCAPTCHA siteverify 응답:**

```typescript
interface RecaptchaSiteverifyResponse {
  success: boolean;
  score: number;          // 0.0 ~ 1.0
  action: string;
  challenge_ts: string;   // ISO 8601
  hostname: string;
  'error-codes'?: string[];
}
```

### 2.3 API 설계

#### 2.3.1 SDK -> 서버: 사용자 업데이트 (FS-024 Client API 확장)

| 항목 | 내용 |
|------|------|
| Method | POST |
| Path | `/api/v1/client/{environmentId}/user` |
| 인증 | 없음 (environmentId로 환경 식별) |
| Content-Type | application/json |

Request Body:
```json
{
  "userId": "user123",
  "attributes": {
    "name": "John",
    "age": 30,
    "language": "ko"
  }
}
```

Response (200 OK):
```json
{
  "contactId": "contact_abc",
  "segments": ["segment_1", "segment_2"],
  "displays": [{ "surveyId": "survey_1", "createdAt": "2024-01-01T00:00:00Z" }],
  "responses": ["survey_2"],
  "lastDisplayAt": "2024-01-01T00:00:00Z"
}
```

#### 2.3.2 서버 -> Google: reCAPTCHA 검증

| 항목 | 내용 |
|------|------|
| Method | POST |
| Path | `https://www.google.com/recaptcha/api/siteverify` |
| Content-Type | application/x-www-form-urlencoded |
| 타임아웃 | 5,000ms |

Request: `secret={SECRET_KEY}&response={TOKEN}`

Response: RecaptchaSiteverifyResponse (위 타입 참조)

#### 2.3.3 응답 제출 API 확장

기존 응답 제출 엔드포인트(`POST /api/v1/client/{environmentId}/responses`)의 요청 본문에 `recaptchaToken` 필드 추가:

```json
{
  "surveyId": "survey_abc",
  "data": { ... },
  "recaptchaToken": "03AGdBq..." // 조건부: reCAPTCHA 활성 시 필수
}
```

에러 응답:
- 토큰 누락: `400 { error: "Missing recaptcha token" }`
- 검증 실패: `400 { error: "reCAPTCHA verification failed", code: "recaptcha_verification_failed" }`

### 2.4 주요 컴포넌트 설계

#### 2.4.1 Debounce 업데이트 큐 (`user/update-queue.ts`)

```typescript
// 싱글톤 패턴: SDK 전체에서 하나의 큐 인스턴스만 존재
const DEBOUNCE_DELAY = 500; // ms, 고정값

class UpdateQueue {
  private data: UpdateQueueData = { userId: null, attributes: {} };
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** 큐에 userId를 추가한다 */
  setUserId(userId: string): void {
    this.data.userId = userId;
    this.scheduleFlush();
  }

  /** 큐에 속성을 추가(병합)한다. 동일 key는 마지막 값이 적용 */
  addAttributes(attrs: Record<string, string | number>): void {
    this.data.attributes = { ...this.data.attributes, ...attrs };
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), DEBOUNCE_DELAY);
  }

  private async flush(): Promise<void> {
    const { userId, attributes } = this.data;
    this.reset();

    // userId 없고 language만 포함된 경우 -> 로컬 config에만 적용
    if (!userId) {
      if ('language' in attributes && Object.keys(attributes).length === 1) {
        setLocalLanguage(attributes.language as string);
        return;
      }
      // userId 없이 language 외 속성 -> 에러 로그
      if (Object.keys(attributes).length > 0) {
        logger.error("Can't set attributes without a userId!");
        return;
      }
      return; // 빈 큐
    }

    // 서버 전송
    try {
      const response = await updateUser(environmentId, { userId, attributes });
      updateUserState(response);
      runSurveyFiltering();
    } catch (error) {
      setErrorState();
    }
  }

  private reset(): void {
    this.data = { userId: null, attributes: {} };
    this.timer = null;
  }
}
```

#### 2.4.2 setUserId 처리 (`user/set-user-id.ts`)

```
setUserId(userId)
  |
  +-> SDK 초기화 확인 -> 미초기화 시 에러 로그, 중단
  |
  +-> 에러 상태 확인 -> 에러 시 차단 (디버그 모드 제외)
  |
  +-> userId 빈 문자열/null 확인 -> 에러 로그, 중단
  |
  +-> 현재 userId와 비교
  |     |
  |     +-> 동일 userId: no-op (네트워크 요청 없음)
  |     |
  |     +-> 다른 userId 이미 설정: tearDown() 후 새 userId 설정
  |     |
  |     +-> 미식별 상태: 새 userId 설정
  |
  +-> updateQueue.setUserId(userId)
```

#### 2.4.3 사용자 상태 관리 (`user/user-state-manager.ts`)

```typescript
const STATE_EXPIRY_MS = 30 * 60 * 1000; // 30분
const REFRESH_INTERVAL_MS = 60 * 1000;   // 60초

/** 상태 로드: LocalStorage -> 만료 확인 -> 서버 fetch (필요 시) */
function loadUserState(): UserState {
  const cached = getFromStorage<UserState>('userState');
  if (cached && !isExpired(cached.expiresAt)) {
    return cached; // 캐시 유효
  }
  // 캐시 없거나 만료 -> 미식별 기본 상태
  return getDefaultUserState();
}

/** 상태 갱신 타이머: 60초마다 만료 시각을 현재+30분으로 연장 */
function startRefreshTimer(): void {
  setInterval(() => {
    if (isUserActive()) {
      extendExpiry(Date.now() + STATE_EXPIRY_MS);
      persistToStorage();
    }
  }, REFRESH_INTERVAL_MS);
}

/** 미식별 사용자 기본 상태 */
function getDefaultUserState(): UserState {
  return {
    expiresAt: null,
    userId: null,
    contactId: null,
    segments: [],
    displays: [],
    responses: [],
    lastDisplayAt: null,
    language: undefined,
  };
}
```

#### 2.4.4 reCAPTCHA 스크립트 로더 (`recaptcha/recaptcha-loader.ts`)

```typescript
const RECAPTCHA_SCRIPT_ID = 'formbricks-recaptcha-script';
const RECAPTCHA_SCRIPT_URL = 'https://www.google.com/recaptcha/api.js';

/** reCAPTCHA v3 스크립트를 비동기로 DOM에 삽입 */
async function loadRecaptchaScript(siteKey: string): Promise<void> {
  // 이미 로드되었는지 확인 (고유 ID 기반)
  if (document.getElementById(RECAPTCHA_SCRIPT_ID)) return;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = RECAPTCHA_SCRIPT_ID;
    script.src = `${RECAPTCHA_SCRIPT_URL}?render=${siteKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
    document.head.appendChild(script);
  });
}
```

#### 2.4.5 reCAPTCHA 토큰 실행 (`recaptcha/recaptcha-token.ts`)

```typescript
const RECAPTCHA_ACTION = 'submit_response'; // 고정

/** reCAPTCHA 토큰을 획득. 실패 시 null 반환 (에러를 던지지 않음) */
async function executeRecaptcha(siteKey: string): Promise<string | null> {
  if (!siteKey) return null;

  try {
    // 스크립트 미로드 시 로딩 시도
    if (!document.getElementById(RECAPTCHA_SCRIPT_ID)) {
      await loadRecaptchaScript(siteKey);
    }

    // API ready 대기
    if (!window.grecaptcha) return null;

    return new Promise((resolve) => {
      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(siteKey, { action: RECAPTCHA_ACTION })
          .then((token: string) => resolve(token))
          .catch(() => resolve(null));
      });
    });
  } catch {
    return null;
  }
}
```

#### 2.4.6 reCAPTCHA 서버 검증 서비스 (`libs/server/recaptcha/`)

```typescript
@Injectable()
export class RecaptchaService {
  private readonly TIMEOUT_MS = 5000;
  private readonly secretKey: string | undefined;

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('RECAPTCHA_SECRET_KEY');
  }

  /** reCAPTCHA 토큰을 Google siteverify API로 검증 */
  async verify(token: string, threshold: number): Promise<{ passed: boolean }> {
    // Secret Key 미설정 -> Graceful Degradation (검증 스킵, 통과)
    if (!this.secretKey) {
      return { passed: true };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${this.secretKey}&response=${token}`,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data: RecaptchaSiteverifyResponse = await response.json();

      if (!data.success) return { passed: false };
      if (data.score < threshold) return { passed: false };

      return { passed: true };
    } catch {
      // 타임아웃 또는 네트워크 에러 -> 검증 실패
      return { passed: false };
    }
  }

  /** reCAPTCHA 키 설정 여부 확인 */
  isConfigured(): boolean {
    return !!this.secretKey;
  }
}
```

#### 2.4.7 reCAPTCHA 설정 UI (`libs/client/survey/.../spam-protection-section.tsx`)

Survey Editor의 Settings -> Response Options 내에 배치되는 Spam protection 설정 섹션:

```
+-----------------------------------------------+
| Spam protection                                |
| ┌─────────────────────────────────────────────┐|
| │ [Toggle: ON/OFF]                            ||
| │                                             ||
| │ Threshold (0.1 ~ 0.9)                       ||
| │ ┌──────────────────┐                        ||
| │ │ [Slider / Input] │ 0.5                    ||
| │ └──────────────────┘                        ||
| │ 높을수록 엄격 (봇 차단율 증가,               ||
| │ 정상 사용자 차단 위험 증가)                    ||
| └─────────────────────────────────────────────┘|
+-----------------------------------------------+
```

- Enterprise 라이선스가 없으면 비활성화 상태로 표시하고, 업그레이드 안내를 표시한다.

### 2.5 기존 시스템에 대한 영향 분석

| 영향 대상 | 영향 내용 | 영향 수준 |
|----------|---------|----------|
| `packages/js-sdk/` (FS-007) | `user/`, `recaptcha/` 디렉토리 추가, `index.ts` 퍼블릭 API 확장 | 중간 (확장) |
| `packages/js-sdk/src/index.ts` | setup, setUserId, setAttributes, setAttribute, setEmail, setLanguage, logout, setNonce API 구현체 연결 | 중간 (수정) |
| `packages/js-sdk/src/core/initialize.ts` | 초기화 흐름에 사용자 상태 로드, 갱신 타이머 등록 추가 | 중간 (수정) |
| `packages/js-sdk/src/error/teardown.ts` (FS-007) | tearDown 로직에 사용자 상태 리셋 + 설문 위젯 제거 통합 | 중간 (수정) |
| `packages/surveys/` (FS-007) | 설문 응답 제출 시 reCAPTCHA 토큰 획득 콜백 통합 | 중간 (수정) |
| `libs/server/client-api/` (FS-024) | 사용자 업데이트 엔드포인트 로직 완성, 응답 제출에 reCAPTCHA 검증 통합 | 높음 (확장) |
| `libs/server/contact/` (FS-026) | SDK identify 요청 처리 시 Contact 생성/업데이트 로직 연동 | 중간 (연동) |
| `.env.example` | RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY 환경변수 (FS-099에서 이미 정의) | 낮음 (확인) |
| Survey Editor UI (FS-010) | Settings -> Response Options에 Spam protection 섹션 추가 | 중간 (확장) |
| `apps/client/public/locales/` | reCAPTCHA 설정 관련 i18n 번역 키 추가 | 낮음 (추가) |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존 | 복잡도 | 예상 시간 |
|-----|--------|------|------|--------|----------|
| **A. SDK 사용자 식별 (클라이언트)** | | | | | |
| T-01 | 사용자 상태 타입 정의 | UserState, UpdateQueueData, UserUpdateRequest/Response 타입 정의. FS-007의 `types/user.ts` 확장 | 없음 | 낮음 | 1h |
| T-02 | 사용자 상태 관리자 | loadUserState, extendExpiry, persistToStorage, 60초 갱신 타이머, 30분 만료 관리 | T-01 | 중간 | 3h |
| T-03 | 사용자 업데이트 API 호출 | `POST /user` 서버 통신 함수. FS-007 api-client 활용 | T-01 | 낮음 | 1h |
| T-04 | Debounce 업데이트 큐 | 싱글톤 패턴, 500ms Debounce, 속성 병합, userId 없이 language만 설정하는 분기 처리 | T-02, T-03 | 높음 | 4h |
| T-05 | setUserId 처리 | 동일 userId no-op, 다른 userId tearDown, 미식별->식별 전환 로직 | T-04 | 중간 | 2h |
| T-06 | setAttributes 처리 | setAttributes, setAttribute, setEmail, setLanguage 래핑 메서드. Date -> ISO 8601 변환 | T-04 | 중간 | 2h |
| T-07 | tearDown 확장 | FS-007의 teardown.ts 확장: 사용자 상태 리셋, 설문 위젯 제거, 설문 필터링 재실행 | T-02 | 낮음 | 1h |
| T-08 | logout 처리 | tearDown 호출 래핑. 멱등성 보장 (미식별 상태에서도 에러 없이 동작) | T-07 | 낮음 | 0.5h |
| T-09 | setNonce 구현 | nonce 값 저장/적용. surveys 패키지 미로드 시 전역 변수에 저장, 로드 후 적용 | 없음 | 낮음 | 1h |
| T-10 | SDK 초기화 흐름 확장 | FS-007 initialize.ts 수정: 사용자 상태 로드, userId 존재 시 서버 fetch, 갱신 타이머 등록, 레거시 마이그레이션 | T-02, T-05 | 높음 | 3h |
| T-11 | 퍼블릭 API 연결 | index.ts에 setup, setUserId, setAttributes, setAttribute, setEmail, setLanguage, logout, setNonce 엑스포트 | T-05~T-10 | 낮음 | 1h |
| **B. reCAPTCHA 클라이언트 (SDK)** | | | | | |
| T-12 | reCAPTCHA 타입 정의 | RecaptchaConfig, grecaptcha 글로벌 타입, RecaptchaSiteverifyResponse | 없음 | 낮음 | 0.5h |
| T-13 | reCAPTCHA 스크립트 로더 | 비동기 동적 로딩, 고유 ID 기반 중복 방지, 에러 처리 | T-12 | 중간 | 2h |
| T-14 | reCAPTCHA 토큰 실행 | grecaptcha.execute 래퍼, action "submit_response" 고정, 실패 시 null 반환 | T-13 | 중간 | 2h |
| T-15 | reCAPTCHA 설정 관리 | EnvironmentState에서 siteKey 읽기, Survey에서 enabled/threshold 읽기, 사전 로딩 트리거 | T-14 | 낮음 | 1h |
| T-16 | 설문 응답 제출 통합 | surveys 패키지의 응답 제출 흐름에 reCAPTCHA 토큰 획득 및 전송 로직 통합 | T-14, T-15 | 중간 | 3h |
| **C. reCAPTCHA 서버 (NestJS)** | | | | | |
| T-17 | RecaptchaModule 스캐폴딩 | NestJS 모듈, 서비스, 상수, 타입 파일 생성. Nx 라이브러리 초기화 | 없음 | 낮음 | 1h |
| T-18 | RecaptchaService 구현 | Google siteverify API 호출, 5초 타임아웃, score 비교, Graceful Degradation | T-17 | 중간 | 3h |
| T-19 | RecaptchaGuard 구현 | 응답 제출 컨트롤러에 적용하는 Guard. 설문 reCAPTCHA 활성 확인, 토큰 검증 위임, 에러 응답 반환 | T-18 | 중간 | 2h |
| T-20 | 스팸 방지 활성화 조건 검증 | 4가지 조건 AND 체크: Site Key + Secret Key + Survey enabled + Enterprise 라이선스 | T-18 | 낮음 | 1h |
| T-21 | 응답 제출 API 통합 | 기존 응답 제출 엔드포인트에 RecaptchaGuard 적용, recaptchaToken 필드 추가 | T-19, T-20 | 중간 | 2h |
| **D. Client API 사용자 업데이트 엔드포인트 완성** | | | | | |
| T-22 | 사용자 업데이트 DTO | UserUpdateDto (userId, attributes), class-validator 데코레이터 | 없음 | 낮음 | 1h |
| T-23 | 사용자 업데이트 컨트롤러/서비스 | Contact 생성/연결, 속성 업데이트, 세그먼트/표시/응답 데이터 조회 및 반환. FS-026 ContactService 연동 | T-22 | 높음 | 4h |
| **E. 대시보드 UI (reCAPTCHA 설정)** | | | | | |
| T-24 | Spam protection UI 섹션 | Toggle + Threshold 슬라이더/입력. Enterprise 라이선스 비활성 시 업그레이드 안내 | 없음 | 중간 | 3h |
| T-25 | zod 스키마 및 API 연결 | recaptcha 설정용 zod 스키마, Survey 저장 시 recaptcha 필드 포함 | T-24 | 낮음 | 1h |
| T-26 | i18n 번역 키 추가 | ko/en 번역 키: spam_protection 관련 라벨, 설명, 에러 메시지 | T-24 | 낮음 | 0.5h |
| **F. 테스트** | | | | | |
| T-27 | 단위 테스트: 업데이트 큐 | Debounce 동작, 속성 병합, userId 없이 language 설정, 에러 상태 전환 | T-04 | 중간 | 3h |
| T-28 | 단위 테스트: setUserId/setAttributes | 동일 userId no-op, 다른 userId tearDown, Date 변환, userId 없이 에러 | T-05, T-06 | 중간 | 2h |
| T-29 | 단위 테스트: reCAPTCHA 클라이언트 | 스크립트 로딩(중복 방지 포함), 토큰 실행(성공/실패), siteKey 미설정 | T-13, T-14 | 중간 | 2h |
| T-30 | 단위 테스트: RecaptchaService | Google API 모킹, 타임아웃 검증, Graceful Degradation, score 비교 | T-18 | 중간 | 2h |
| T-31 | 통합 테스트: 사용자 식별 E2E | setUserId -> 서버 업데이트 -> 상태 반영 -> logout -> 상태 초기화 전체 흐름 | T-11 | 높음 | 3h |
| T-32 | 통합 테스트: reCAPTCHA E2E | 응답 제출 -> 토큰 첨부 -> 서버 검증 -> 통과/실패 전체 흐름 | T-16, T-21 | 높음 | 3h |

### 3.2 구현 순서 및 마일스톤

#### 마일스톤 1: SDK 사용자 식별 코어 (T-01 ~ T-04)
**목표**: 사용자 상태 관리 인프라와 Debounce 업데이트 큐 완성
**검증**: 업데이트 큐 단위 테스트 통과. setUserId -> setAttributes 500ms 이내 호출 시 단일 요청으로 병합되는 것을 확인
**예상 소요**: 1.5일

#### 마일스톤 2: SDK 사용자 식별 API (T-05 ~ T-11)
**목표**: setUserId, setAttributes, logout 등 퍼블릭 API 완성, SDK 초기화 흐름 확장
**검증**: UMD 번들에서 `formbricks.setUserId("user123")` 호출 시 Mock 서버로 요청 전송 확인. logout 후 상태 초기화 확인
**예상 소요**: 2일

#### 마일스톤 3: 서버 사용자 업데이트 엔드포인트 (T-22 ~ T-23)
**목표**: Client API의 POST /user 엔드포인트 로직 완성. Contact 생성/연결, 상태 반환
**검증**: HTTP 클라이언트로 POST /user 요청 시 Contact 생성 및 올바른 응답 확인
**예상 소요**: 1일

#### 마일스톤 4: reCAPTCHA 서버 검증 (T-17 ~ T-21)
**목표**: RecaptchaModule 완성, 응답 제출 API에 reCAPTCHA 검증 통합
**검증**: Mock reCAPTCHA 토큰으로 응답 제출 시 검증 통과/실패 확인. Secret Key 미설정 시 Graceful Degradation 확인
**예상 소요**: 1.5일

#### 마일스톤 5: reCAPTCHA 클라이언트 (T-12 ~ T-16)
**목표**: SDK에서 reCAPTCHA 스크립트 로딩, 토큰 획득, 응답 제출 통합 완성
**검증**: reCAPTCHA 활성 설문 응답 제출 시 토큰이 서버로 전송되는 것을 확인
**예상 소요**: 1.5일

#### 마일스톤 6: 대시보드 UI (T-24 ~ T-26)
**목표**: Survey Editor에 Spam protection 설정 섹션 추가
**검증**: Toggle ON/OFF, threshold 조정 시 Survey.recaptcha 필드 정상 저장. Enterprise 라이선스 없을 때 비활성 표시
**예상 소요**: 1일

#### 마일스톤 7: 테스트 완성 (T-27 ~ T-32)
**목표**: 단위/통합 테스트 커버리지 확보
**검증**: 전체 테스트 스위트 통과
**예상 소요**: 2일

**총 예상 소요: 약 10.5일 (2주)**

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 내용 요약 |
|----------|---------|--------------|
| **SDK 사용자 식별** | | |
| `packages/js-sdk/src/types/user.ts` | 수정 | UserState 확장, UpdateQueueData, UserUpdateRequest/Response 타입 추가 |
| `packages/js-sdk/src/user/update-queue.ts` | 생성 | Debounce 배치 업데이트 큐 (싱글톤). 500ms Debounce, 속성 병합, language 분기 |
| `packages/js-sdk/src/user/user-state-manager.ts` | 생성 | 사용자 상태 로드/갱신/만료/영속화. 30분 만료, 60초 갱신 타이머 |
| `packages/js-sdk/src/user/user-api.ts` | 생성 | POST /user 서버 통신 함수 (api-client 래퍼) |
| `packages/js-sdk/src/user/set-user-id.ts` | 생성 | setUserId 처리 로직 (no-op, tearDown, 신규 설정) |
| `packages/js-sdk/src/user/set-attributes.ts` | 생성 | setAttributes, setAttribute, setEmail, setLanguage, Date->ISO 변환 |
| `packages/js-sdk/src/user/teardown.ts` | 생성 | tearDown 사용자 상태 전용 리셋 (FS-007 teardown에서 호출) |
| `packages/js-sdk/src/core/initialize.ts` | 수정 | 초기화 흐름에 사용자 상태 로드, userId 존재 시 서버 fetch, 갱신 타이머 등록 추가 |
| `packages/js-sdk/src/error/teardown.ts` | 수정 | 기존 tearDown에 사용자 상태 리셋 통합 |
| `packages/js-sdk/src/index.ts` | 수정 | setup, setUserId, setAttributes, setAttribute, setEmail, setLanguage, logout, setNonce 퍼블릭 API |
| **SDK reCAPTCHA** | | |
| `packages/js-sdk/src/types/recaptcha.ts` | 생성 | RecaptchaConfig, grecaptcha Window 확장 타입 |
| `packages/js-sdk/src/recaptcha/recaptcha-loader.ts` | 생성 | Google reCAPTCHA v3 스크립트 비동기 로딩 |
| `packages/js-sdk/src/recaptcha/recaptcha-token.ts` | 생성 | grecaptcha.execute 래퍼, action "submit_response" |
| `packages/js-sdk/src/recaptcha/recaptcha-config.ts` | 생성 | siteKey 읽기, 활성화 판단, 사전 로딩 트리거 |
| `packages/surveys/src/render-survey.ts` | 수정 | 응답 제출 시 reCAPTCHA 토큰 획득 콜백 통합 |
| **서버 RecaptchaModule** | | |
| `libs/server/recaptcha/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 |
| `libs/server/recaptcha/src/lib/recaptcha.module.ts` | 생성 | NestJS 모듈 (ConfigModule import) |
| `libs/server/recaptcha/src/lib/recaptcha.service.ts` | 생성 | Google siteverify API 호출, 5초 타임아웃, Graceful Degradation |
| `libs/server/recaptcha/src/lib/recaptcha.guard.ts` | 생성 | 응답 제출 Guard (활성화 조건 4가지 체크 + 토큰 검증) |
| `libs/server/recaptcha/src/lib/dto/recaptcha-verify.dto.ts` | 생성 | 검증 요청 DTO |
| `libs/server/recaptcha/src/lib/constants/recaptcha.constants.ts` | 생성 | 타임아웃, 액션명, 에러 메시지 상수 |
| `libs/server/recaptcha/src/lib/interfaces/recaptcha.types.ts` | 생성 | RecaptchaSiteverifyResponse, RecaptchaVerifyResult 타입 |
| `libs/server/recaptcha/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/server/recaptcha/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/recaptcha/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| **서버 Client API 확장** | | |
| `libs/server/client-api/src/lib/dto/user-update.dto.ts` | 생성 | UserUpdateDto (userId, attributes) class-validator |
| `libs/server/client-api/src/lib/controllers/client-user.controller.ts` | 수정 | POST /user 엔드포인트 로직 완성 (Contact 연동) |
| `libs/server/client-api/src/lib/controllers/client-response.controller.ts` | 수정 | 응답 제출에 RecaptchaGuard 적용, recaptchaToken 필드 추가 |
| `apps/server/src/app/app.module.ts` | 수정 | RecaptchaModule import 추가 |
| **대시보드 UI** | | |
| `libs/client/survey/src/lib/settings/spam-protection-section.tsx` | 생성 | Spam protection Toggle + Threshold 슬라이더 + Enterprise 게이팅 |
| `libs/client/survey/src/lib/schemas/recaptcha.schema.ts` | 생성 | recaptcha zod 스키마 (enabled, threshold 0.1~0.9) |
| `apps/client/public/locales/ko/survey.json` | 수정 | reCAPTCHA 설정 관련 한국어 번역 키 추가 |
| `apps/client/public/locales/en/survey.json` | 수정 | reCAPTCHA 설정 관련 영어 번역 키 추가 |
| **테스트** | | |
| `packages/js-sdk/__tests__/user/update-queue.test.ts` | 생성 | 업데이트 큐 단위 테스트 |
| `packages/js-sdk/__tests__/user/set-user-id.test.ts` | 생성 | setUserId 단위 테스트 |
| `packages/js-sdk/__tests__/user/set-attributes.test.ts` | 생성 | setAttributes 단위 테스트 |
| `packages/js-sdk/__tests__/recaptcha/recaptcha-loader.test.ts` | 생성 | reCAPTCHA 스크립트 로딩 테스트 |
| `packages/js-sdk/__tests__/recaptcha/recaptcha-token.test.ts` | 생성 | 토큰 실행 테스트 |
| `libs/server/recaptcha/__tests__/recaptcha.service.spec.ts` | 생성 | RecaptchaService 단위 테스트 |
| `libs/server/recaptcha/__tests__/recaptcha.guard.spec.ts` | 생성 | RecaptchaGuard 단위 테스트 |
| `libs/server/client-api/__tests__/client-user.integration.spec.ts` | 생성 | 사용자 업데이트 통합 테스트 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 발생 확률 | 완화 전략 |
|--------|------|----------|----------|
| **FS-007(SDK 코어)이 미완성 상태** | 사용자 식별 모듈이 의존하는 config, storage, api-client, error-handler가 없으면 개발 불가 | 높음 | FS-007의 마일스톤 1~3(패키지 기반, 코어 상태, 초기화)을 최소 완료 후 FS-020 착수. 병행 개발 시 FS-007 인터페이스를 먼저 확정하고 Mock 구현으로 진행 |
| **FS-024 Client API의 /user 엔드포인트 미구현** | SDK에서 서버 통신이 불가하여 사용자 식별 플로우 테스트 불가 | 높음 | T-22~T-23에서 직접 엔드포인트를 구현한다. FS-024에 스텁만 존재할 경우 이를 확장. 병행 개발 시 Mock 서버 사용 |
| **FS-026 Contact 모듈 미구현** | setUserId 시 서버에서 Contact 생성/연결이 불가 | 중간 | Contact 생성/조회의 최소 서비스 인터페이스만 정의하고 스텁으로 구현. FS-026 완료 시 실제 로직으로 교체 |
| **Google reCAPTCHA API 가용성** | 개발/테스트 환경에서 Google API에 접근 불가할 경우 reCAPTCHA 테스트 불가 | 낮음 | 단위 테스트에서는 HTTP 요청을 모킹. 통합 테스트용으로 Google reCAPTCHA 테스트 키 사용 (Google이 제공하는 테스트 key는 항상 score 1.0 반환) |
| **Debounce 타이밍 이슈** | 브라우저 환경에서 setTimeout 정확도가 보장되지 않아 테스트가 불안정할 수 있음 | 중간 | 테스트에서 `vi.useFakeTimers()` (Vitest) 또는 `jest.useFakeTimers()`를 사용하여 타이머를 제어. 프로덕션에서는 500ms가 정확하지 않아도 Debounce 의미론 자체는 유지됨 |
| **reCAPTCHA v3 score 기준의 모호성** | 0.5 threshold에서 정상 사용자가 차단되는 사례가 발생할 수 있음 | 중간 | 기본 threshold를 설정하지 않고(null), Survey Creator가 명시적으로 설정하도록 유도. UI에 "높을수록 엄격" 안내 표시. 검증 실패 시 로깅으로 모니터링 가능하도록 구현 |
| **CSP(Content Security Policy) 환경에서 reCAPTCHA 스크립트 차단** | 호스트 앱의 CSP가 google.com 도메인을 허용하지 않으면 스크립트 로딩 실패 | 낮음 | 스크립트 로딩 실패 시 에러를 로깅하고 토큰을 null로 반환. 서버에서 토큰 누락 처리 (400 에러). 문서에 CSP 허용 도메인 안내 추가 |
| **Enterprise 라이선스 시스템(FS-029) 미완성** | 라이선스 검증 가드가 동작하지 않아 모든 사용자에게 기능이 노출될 수 있음 | 높음 | FS-029 완료 전까지 환경변수 `CONTACTS_ENABLED=true` 또는 `SPAM_PROTECTION_ENABLED=true`로 스텁 게이팅. FS-029 완료 시 `@RequireFeature('contacts')`, `@RequireFeature('spamProtection')` 데코레이터로 교체 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

**SDK 사용자 식별:**

| 테스트 대상 | 테스트 시나리오 | 우선순위 |
|------------|--------------|---------|
| UpdateQueue | Debounce 500ms 후 flush 호출 | 높음 |
| UpdateQueue | 연속 호출 시 속성 병합 (마지막 값 적용) | 높음 |
| UpdateQueue | userId 없이 language 설정 -> 로컬만 적용, 서버 미전송 | 높음 |
| UpdateQueue | userId 없이 language 외 속성 -> 에러 로그 | 높음 |
| UpdateQueue | flush 후 큐 초기화 확인 | 중간 |
| setUserId | 동일 userId 재호출 -> no-op (네트워크 없음) | 높음 |
| setUserId | 다른 userId 전환 -> tearDown 후 새 설정 | 높음 |
| setUserId | 빈 문자열/null -> 에러 로그, 중단 | 중간 |
| setUserId | SDK 미초기화 상태 -> 에러 로그, 중단 | 중간 |
| setAttributes | Date 타입 -> ISO 8601 변환 | 높음 |
| setAttributes | number 타입 -> 변환 없이 유지 | 중간 |
| setAttributes | 래핑 메서드(setEmail, setLanguage) 동작 | 중간 |
| UserStateManager | 30분 만료 확인 | 중간 |
| UserStateManager | 60초 갱신 타이머 동작 | 중간 |
| UserStateManager | 손상된 LocalStorage 데이터 -> 기본 상태 초기화 | 중간 |
| tearDown | 상태 리셋 후 미식별 기본값 확인 | 높음 |
| logout | 멱등성 (미식별 상태에서 호출해도 에러 없음) | 중간 |

**reCAPTCHA 클라이언트:**

| 테스트 대상 | 테스트 시나리오 | 우선순위 |
|------------|--------------|---------|
| RecaptchaLoader | 스크립트 정상 로딩 | 높음 |
| RecaptchaLoader | 이미 로드된 스크립트 -> 중복 로딩 방지 | 높음 |
| RecaptchaLoader | siteKey 미설정 -> 에러 반환 | 중간 |
| RecaptchaLoader | 스크립트 로딩 실패 -> 에러 반환 | 중간 |
| RecaptchaToken | 토큰 정상 획득 | 높음 |
| RecaptchaToken | grecaptcha 미준비 -> null 반환 | 중간 |
| RecaptchaToken | execute 에러 -> null 반환 (에러 throw 안 함) | 중간 |

**reCAPTCHA 서버:**

| 테스트 대상 | 테스트 시나리오 | 우선순위 |
|------------|--------------|---------|
| RecaptchaService.verify | score >= threshold -> passed: true | 높음 |
| RecaptchaService.verify | score < threshold -> passed: false | 높음 |
| RecaptchaService.verify | Google API success: false -> passed: false | 높음 |
| RecaptchaService.verify | Secret Key 미설정 -> passed: true (Graceful Degradation) | 높음 |
| RecaptchaService.verify | 5초 타임아웃 -> passed: false | 중간 |
| RecaptchaService.verify | 네트워크 에러 -> passed: false | 중간 |
| RecaptchaGuard | reCAPTCHA 비활성 설문 -> 검증 스킵 | 높음 |
| RecaptchaGuard | 토큰 누락 -> 400 "Missing recaptcha token" | 높음 |
| RecaptchaGuard | 검증 실패 -> 400 "reCAPTCHA verification failed" | 높음 |
| RecaptchaGuard | threshold null -> 검증 스킵 | 중간 |

### 5.2 통합 테스트

| 테스트 시나리오 | 범위 | 우선순위 |
|--------------|------|---------|
| SDK setUserId -> 서버 Contact 생성 -> 사용자 상태 반환 -> LocalStorage 저장 | SDK + Client API | 높음 |
| SDK setUserId -> setAttributes (100ms 이내) -> 단일 요청으로 배치 전송 | SDK Debounce | 높음 |
| SDK 다른 userId 전환 -> tearDown -> 새 Contact 연결 | SDK + Client API | 높음 |
| reCAPTCHA 활성 설문 응답 -> 토큰 획득 -> 서버 검증 -> 응답 저장 | 전체 E2E | 높음 |
| reCAPTCHA 활성 설문 -> 토큰 누락 -> 400 에러 | SDK + Server | 중간 |
| reCAPTCHA Secret Key 미설정 -> 검증 스킵 -> 응답 저장 | Server Graceful Degradation | 중간 |
| Enterprise 라이선스 없이 reCAPTCHA 활성화 -> 서버 로그 + 검증 수행 | Server License Check | 중간 |

### 5.3 E2E 테스트 (향후)

| 시나리오 | 설명 |
|---------|------|
| 사용자 식별 전체 흐름 | 웹 페이지에서 SDK 초기화 -> setUserId -> setAttributes -> 설문 표시 -> logout 확인 |
| reCAPTCHA 보호 설문 응답 | 설문 설정에서 reCAPTCHA 활성화 -> 설문 응답 -> 봇 score 기반 통과/차단 |
| 멀티 사용자 전환 | User A 로그인 -> 설문 A 표시 -> logout -> User B 로그인 -> 설문 B 표시 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 설명 |
|------|------|
| Debounce 시간 고정 | 500ms로 고정되어 동적 조정 불가. 네트워크 상태에 따른 적응형 Debounce 미지원 |
| LocalStorage 의존 | 시크릿/프라이빗 브라우징 모드에서 세션 단위로 초기화될 수 있음. 인메모리 폴백은 있으나 영속성 없음 |
| reCAPTCHA v3 한정 | v2(체크박스), hCaptcha, Cloudflare Turnstile 등 다른 CAPTCHA 서비스 미지원 |
| Mobile SDK 제한 | reCAPTCHA 기반 스팸 방지는 웹 브라우저 환경에서만 동작. React Native/iOS/Android 미지원 |
| Google API 의존 | reCAPTCHA 검증이 Google 외부 서비스에 의존. Google 서비스 장애 시 검증 실패 (Graceful Degradation 아닌 차단) |
| Enterprise 라이선스 스텁 | FS-029 완료 전까지 라이선스 게이팅이 환경변수 기반 스텁으로 동작 |
| Contact 모듈 스텁 | FS-026 완료 전까지 setUserId의 Contact 생성이 스텁으로 동작 |

### 6.2 향후 개선 가능 사항

| 항목 | 설명 |
|------|------|
| 적응형 Debounce | 네트워크 응답 시간에 따라 Debounce 시간을 동적 조정 (300ms~1000ms) |
| 오프라인 큐 | 네트워크 연결이 끊긴 상태에서 업데이트를 로컬에 저장하고 연결 복구 시 자동 전송 |
| reCAPTCHA Enterprise | Google reCAPTCHA Enterprise API로 업그레이드하여 더 정밀한 봇 탐지 지원 |
| 대체 CAPTCHA 지원 | hCaptcha, Cloudflare Turnstile 등 대체 CAPTCHA 서비스 플러그인 아키텍처 |
| 서버 사이드 속성 검증 | setAttributes 값의 서버 측 타입 검증 강화 (허용되지 않는 타입 거부) |
| 상태 동기화 이벤트 | 여러 브라우저 탭 간 LocalStorage 변경 감지 및 상태 동기화 |
| reCAPTCHA 분석 대시보드 | reCAPTCHA score 분포, 차단율, 통과율 시각화 |
| 점진적 봇 탐지 | reCAPTCHA score + 사용자 행동 패턴(마우스 움직임, 응답 시간) 복합 분석 |

---

## 7. i18n 고려사항

### 7.1 추가/수정 필요한 번역 키

**한국어 (`apps/client/public/locales/ko/survey.json`):**

```json
{
  "spam_protection_title": "스팸 방지",
  "spam_protection_description": "reCAPTCHA v3를 사용하여 봇 응답을 차단합니다.",
  "spam_protection_enabled": "스팸 방지 활성화",
  "spam_protection_threshold": "Threshold (0.1 ~ 0.9)",
  "spam_protection_threshold_description": "높을수록 엄격합니다. 봇 차단율이 증가하지만 정상 사용자가 차단될 위험도 증가합니다.",
  "spam_protection_enterprise_required": "이 기능을 사용하려면 Enterprise 라이선스가 필요합니다.",
  "spam_protection_threshold_validation": "Threshold는 0.1에서 0.9 사이(0.1 단위)여야 합니다.",
  "spam_protection_recaptcha_failed": "스팸 방지 검증에 실패했습니다. 다시 시도해 주세요.",
  "spam_protection_token_missing": "스팸 방지 토큰이 누락되었습니다."
}
```

**영어 (`apps/client/public/locales/en/survey.json`):**

```json
{
  "spam_protection_title": "Spam Protection",
  "spam_protection_description": "Block bot responses using reCAPTCHA v3.",
  "spam_protection_enabled": "Enable Spam Protection",
  "spam_protection_threshold": "Threshold (0.1 - 0.9)",
  "spam_protection_threshold_description": "Higher is stricter. Increases bot blocking rate but also increases the risk of blocking legitimate users.",
  "spam_protection_enterprise_required": "Enterprise license is required to use this feature.",
  "spam_protection_threshold_validation": "Threshold must be between 0.1 and 0.9 (in 0.1 increments).",
  "spam_protection_recaptcha_failed": "Spam protection verification failed. Please try again.",
  "spam_protection_token_missing": "Spam protection token is missing."
}
```

### 7.2 참고: FS-008에서 이미 정의된 번역 키

FS-008 구현 계획에서 이미 다음 키가 정의되어 있으므로, 중복되지 않도록 확인 필요:

- `recaptcha_title`, `recaptcha_enabled`, `recaptcha_threshold`, `recaptcha_threshold_range`

명세서의 UI 설명과 일치하도록, 기존 키와 신규 키 간 네이밍 통일이 필요하다. **기존 FS-008 키의 prefix `recaptcha_`를 `spam_protection_`으로 통일하거나, FS-008의 기존 키를 그대로 사용하는 것을 팀과 협의해야 한다.** 본 계획에서는 `spam_protection_` prefix를 제안하며, FS-008 계획서의 키와 병합 시 조정한다.
