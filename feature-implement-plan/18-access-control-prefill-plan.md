# 기능 구현 계획: 접근 제어 및 데이터 프리필 (FS-018)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 설명 | 우선순위 |
|---------|--------|------|---------|
| FN-018-01 | PIN 보호 | 4자리 숫자 PIN으로 Link Survey 접근을 제한. OTP 스타일 UI, 자동 검증, 2초 초기화 | 높음 |
| FN-018-02 | 이메일 인증 | JWT 기반 이메일 인증 플로우. 단일 이메일 응답 제한, "Just Curious?" 미리보기, fishy 상태 처리 | 높음 |
| FN-018-03 | Survey Close Message | 설문 비활성 상태별(paused/completed/link invalid/response submitted/link expired) 커스텀 메시지와 아이콘 표시 | 중간 |
| FN-018-04 | 데이터 프리필 | URL 파라미터 기반 Element별 값 사전 입력. 7가지 Element 타입별 검증/변환, 오류 격리, 라벨+Option ID 이중 매칭 | 높음 |
| FN-018-05 | startAt 파라미터 | 특정 Element ID 또는 "start"(Welcome Card)부터 설문 시작. 무효 시 URL에서 자동 제거 | 중간 |
| FN-018-06 | skipPrefilled 파라미터 | "true" 문자열 시 프리필된 질문 자동 건너뛰기. 기본값 false | 중간 |
| FN-018-07 | source 파라미터 | Hidden Fields를 통한 유입 경로 추적. source 키가 Hidden Fields에 정의된 경우에만 동작 | 중간 |
| FN-018-08 | 인증된 이메일 Hidden Field 주입 | 이메일 인증 성공 시 verifiedEmail 키로 Hidden Fields에 자동 추가 | 중간 |

### 1.2 비기능 요구사항

| NFR ID | 항목 | 요구사항 |
|--------|------|---------|
| NFR-01 | PIN UX 반응성 | 4자리 입력 완료 즉시 검증 요청. 에러 시 정확히 2000ms 후 자동 초기화 |
| NFR-02 | iframe 호환성 | iframe 내에서 OTP 입력 필드의 autofocus 비활성화 |
| NFR-03 | JWT 보안 | 이메일 인증 토큰 변조 방지를 위한 JWT 서명 |
| NFR-04 | Rate Limiting | 이메일 인증 발송에 IP 기반 Rate Limiting 적용 |
| NFR-05 | 프리필 오류 격리 | 하나의 프리필 실패가 다른 프리필에 영향을 미치지 않음 |
| NFR-06 | 하위 호환성 | 라벨 기반 프리필과 Option ID 기반 프리필 모두 지원 |
| NFR-07 | URL 정합성 | 유효하지 않은 startAt은 URL에서 자동 제거 (replaceState) |

### 1.3 명세서 내 모호한 점 및 해석

| 항목 | 모호한 점 | 해석/결정 |
|------|----------|----------|
| Survey 모델 필드 존재 여부 | FS-018에서 사용하는 `pin`, `isVerifyEmailEnabled`, `surveyClosedMessage` 등의 필드가 이미 FS-008 Survey 모델에 정의됨 | FS-008 계획의 Survey Prisma 모델에 해당 필드가 이미 포함되어 있음 (`pin String?`, `isVerifyEmailEnabled Boolean`, `isSingleResponsePerEmailEnabled Boolean`, `surveyClosedMessage Json?`). 새로운 Prisma 변경 없이 활용 |
| PIN 검증 API의 위치 | PIN 검증이 별도 엔드포인트인지 기존 Survey 조회 API의 확장인지 불분명 | PIN 검증을 위한 전용 서버 엔드포인트(`POST /link-surveys/:id/verify-pin`)를 신규 생성. 기존 Survey CRUD API와 분리하여 인증 없이 접근 가능한 공개 API로 설계 |
| 이메일 인증 JWT 토큰의 만료 시간 | 명세서에 JWT 토큰 만료 시간이 명시되지 않음 | 24시간 만료로 설정. 기존 이메일 검증 메일(libs/server/email)과 동일한 만료 정책 적용 |
| 이메일 인증 발송 Rate Limit 수치 | IP 기반 Rate Limiting이라고만 명시, 구체적 수치 미정의 | 기존 rate-limit 데코레이터 패턴을 참고하여 시간당 10회로 설정 (`SurveyEmailVerifyRateLimit`) |
| 프리필과 설문 렌더링의 연결점 | 프리필 처리가 서버에서 수행되는지 클라이언트에서 수행되는지 불명확. 명세의 PERF-02에서 "클라이언트 측에서 설문 로딩 시 1회 수행"이라 명시 | 프리필 파싱/검증은 전적으로 클라이언트 사이드에서 수행. 서버는 프리필 로직에 관여하지 않음. Link Survey 페이지 로드 시 URL 파라미터를 파싱하여 프리필 데이터를 생성 |
| Link Survey 페이지 경로 | `/s/{surveyId}` 경로가 FS-016(Link Share/Embed)에서 정의됨. FS-018은 해당 페이지 내의 동작에 집중 | `/s/{surveyId}` 라우트는 FS-016 구현 시 생성. FS-018은 해당 페이지 내에서 사용되는 접근 제어 레이어와 프리필 처리 로직을 라이브러리로 제공 |
| "Just Curious?" 미리보기 상세 동작 | 질문 목록만 표시한다고 하나, 어떤 형태로 표시하는지 미정의 | 설문의 모든 Element headline을 리스트 형태로 표시. 실제 입력 UI는 비활성화. 간단한 질문 제목 나열 |
| source 파라미터와 Hidden Fields | source가 일반적인 Hidden Fields URL 파라미터 처리와 동일한 흐름인지 | source는 Hidden Fields URL 파라미터 처리의 특수 케이스가 아닌 동일한 흐름. Hidden Fields에 "source" 키가 정의되어 있으면 일반 Hidden Field 파라미터와 동일하게 매핑됨. 별도 로직 불필요 |

### 1.4 암묵적 요구사항

| 항목 | 설명 |
|------|------|
| Link Survey 전용 서버 모듈 | PIN 검증, 이메일 인증 발송/확인 등 Link Survey 응답자 대상 API는 인증(JWT) 없이 공개 접근 가능해야 함. 기존 Survey CRUD 모듈과 분리된 전용 모듈 필요 |
| OTP Input shadcn/ui 컴포넌트 추가 | PIN 입력을 위한 OTP 스타일 Input 컴포넌트가 현재 UI 라이브러리에 없음. shadcn/ui의 `input-otp` 컴포넌트 추가 필요 |
| 설문 인증 이메일 템플릿 | 기존 EmailService에 설문 인증 전용 이메일 발송 메서드 추가 필요 (설문 이름, 인증 링크 포함) |
| Link Survey 상태 판별 유틸 | 설문 상태(paused/completed/link invalid 등)를 판별하고 적절한 메시지/아이콘을 매핑하는 유틸리티 |
| 프리필 값 타입 변환 유틸 | URL 문자열 -> 각 Element 타입에 맞는 응답 객체로 변환하는 순수 함수. 클라이언트 전용 |
| 예약 파라미터 상수 정의 | `startAt`, `embed`, `preview`, `lang`, `suId`, `verify`, `skipPrefilled` 등 시스템 예약 파라미터를 상수로 관리 |
| Response 모델 스텁 | 이메일 중복 응답 확인(isSingleResponsePerEmailEnabled)을 위해 최소한의 Response 모델이 필요. FSD-021에서 완성 |
| i18n 번역 키 | PIN 입력, 이메일 인증, Close Message, 에러 메시지 등 10+ 사용자 대면 문자열의 번역 키 필요 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

FS-018은 크게 두 가지 관심사로 분리된다:

1. **접근 제어 레이어** (서버 + 클라이언트): PIN 검증, 이메일 인증, Survey 상태 확인
2. **프리필 처리 엔진** (클라이언트 전용): URL 파라미터 파싱, Element 타입별 검증/변환, startAt/skipPrefilled 처리

```
[서버 라이브러리]
libs/server/link-survey/
├── src/
│   ├── index.ts                              # 퍼블릭 API 엑스포트
│   └── lib/
│       ├── link-survey.module.ts             # NestJS 모듈
│       ├── link-survey.controller.ts         # 공개 API 컨트롤러 (인증 불필요)
│       ├── link-survey.service.ts            # PIN 검증, 이메일 인증 비즈니스 로직
│       ├── dto/
│       │   ├── verify-pin.dto.ts             # PIN 검증 요청 DTO
│       │   └── send-verification-email.dto.ts # 이메일 인증 발송 DTO
│       └── constants/
│           └── survey-close-status.ts        # 비활성 상태 상수

[클라이언트 라이브러리]
libs/client/link-survey/
├── src/
│   ├── index.ts
│   └── lib/
│       ├── components/
│       │   ├── pin-gate.tsx                  # PIN 입력 게이트 컴포넌트
│       │   ├── email-verification-gate.tsx   # 이메일 인증 게이트 컴포넌트
│       │   ├── survey-closed-message.tsx     # Close Message 표시 컴포넌트
│       │   └── question-preview-list.tsx     # "Just Curious?" 질문 미리보기
│       ├── hooks/
│       │   ├── use-pin-verification.ts       # PIN 검증 상태 관리
│       │   ├── use-email-verification.ts     # 이메일 인증 상태 관리
│       │   └── use-survey-access.ts          # 통합 접근 제어 훅
│       ├── api/
│       │   └── link-survey-api.ts            # 공개 API 클라이언트
│       ├── schemas/
│       │   └── link-survey.schemas.ts        # zod 스키마
│       └── types/
│           └── link-survey.types.ts          # 타입 정의

[공유 패키지: 프리필 처리 엔진]
packages/shared/
├── src/
│   ├── prefill/
│   │   ├── index.ts
│   │   ├── prefill-parser.ts                 # URL 파라미터 -> 프리필 데이터 변환
│   │   ├── prefill-validators.ts             # Element 타입별 검증 규칙
│   │   ├── prefill-converters.ts             # 검증된 값 -> 응답 형식 변환
│   │   └── prefill-constants.ts              # 예약 파라미터 목록
│   └── survey-status/
│       ├── survey-close-status.ts            # 비활성 상태 타입/상수
│       └── survey-close-message.ts           # 상태별 기본 메시지 매핑
```

**데이터 흐름:**

```
[Link Survey 페이지 접근]
         |
         v
[1. Survey 상태 확인] ─── 비활성 ──> [SurveyClosedMessage 컴포넌트]
         |
         v (활성)
[2. PIN 확인] ─── 설정됨 ──> [PinGate] ──> POST /link-surveys/:id/verify-pin
         |                                          |
         v (미설정 or 통과)                          v (성공)
[3. 이메일 인증 확인]                      [설문 데이터 반환]
         |                                          |
         ├── 인증 필요 ──> [EmailVerificationGate]   |
         |                   ├── 이메일 발송 API     |
         |                   └── JWT verify 파라미터 |
         v (통과)                                    |
[4. URL 파라미터 파싱] <────────────────────────────-+
         |
         ├── prefill 파라미터 ──> [PrefillParser] ──> [PrefillData]
         ├── startAt ──────────> [시작 위치 결정]
         ├── skipPrefilled ────> [스킵 모드 결정]
         └── hiddenFields ─────> [Hidden Field 매핑]
                                    (source, verifiedEmail 포함)
         |
         v
[5. 설문 렌더링 with 프리필 데이터]
```

### 2.2 데이터 모델

**FS-008에서 이미 정의된 Survey 필드 (변경 없음):**

```prisma
model Survey {
  // ... 기존 필드

  // FS-018 관련 (이미 존재)
  pin                              String?          // 정확히 4자리 숫자
  isVerifyEmailEnabled             Boolean          @default(false)
  isSingleResponsePerEmailEnabled  Boolean          @default(false)
  surveyClosedMessage              Json?            // { heading?: string, subheading?: string }
  hiddenFields                     Json             @default("{\"enabled\": false}")  // { enabled: boolean, fieldIds: string[] }
}
```

**Response 스텁 모델 (이메일 중복 확인용, 최소 정의):**

FS-021에서 완전한 모델이 정의될 예정이므로, 이메일 중복 체크에 필요한 최소 필드만 포함한다. 단, FS-008 계획에서 이미 Response 관련 스텁이 필요하다고 기술되어 있으므로, 해당 스텁 모델에 `verifiedEmail` 필드를 포함시킨다.

```prisma
/// 설문 응답 (최소 스텁 - FS-021에서 완성)
model Response {
  id              String   @id @default(cuid())
  surveyId        String
  finished        Boolean  @default(false)
  data            Json     @default("{}")
  meta            Json?
  // FS-018: 이메일 인증 관련
  verifiedEmail   String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  survey Survey @relation(fields: [surveyId], references: [id], onDelete: Cascade)

  @@index([surveyId])
  @@index([surveyId, verifiedEmail])
  @@map("responses")
}
```

**핵심 타입 정의 (packages/shared):**

```typescript
// packages/shared/src/prefill/prefill.types.ts

/** 시스템 예약 URL 파라미터 */
export const RESERVED_PARAMS = [
  'startAt', 'embed', 'preview', 'lang', 'suId',
  'verify', 'skipPrefilled',
] as const;

/** 프리필 검증 결과 타입 */
export type PrefillValidationResult =
  | { valid: false; elementType: string; reason: string }
  | { valid: true; value: unknown }
  | { valid: true; value: string; matchedOptionId: string }          // SingleChoice
  | { valid: true; value: string[]; matchedOptionIds: string[] }     // MultiChoice
  | { valid: true; value: number[]; selectedIndices: number[] };     // PictureSelection

/** 이메일 인증 상태 */
export type EmailVerificationStatus = 'not-verified' | 'verified' | 'fishy';

/** Survey Close 상태 */
export type SurveyCloseReason =
  | 'paused'
  | 'completed'
  | 'link-invalid'
  | 'response-submitted'
  | 'link-expired';

/** Survey Close Message 데이터 */
export interface SurveyCloseMessageData {
  heading: string | null;
  subheading: string | null;
}
```

### 2.3 API 설계

FS-018의 API는 인증(JWT) 없이 접근 가능한 공개 API로, 기존 인증 기반 Survey CRUD API와 별개의 컨트롤러에서 제공한다.

#### 2.3.1 PIN 검증 API

| 항목 | 내용 |
|------|------|
| 엔드포인트 | `POST /link-surveys/:surveyId/verify-pin` |
| 인증 | 불필요 (공개 API) |
| Rate Limiting | 적용하지 않음 (BR-01-04: 재시도 제한 없음) |

**요청:**
```json
{
  "pin": "1234"
}
```

**성공 응답 (200):**
```json
{
  "data": { /* Survey 전체 데이터 */ }
}
```

**실패 응답 (403):**
```json
{
  "error": {
    "code": "INVALID_PIN",
    "message": "Invalid PIN"
  }
}
```

**설문 미존재 (404):**
```json
{
  "error": {
    "code": "SURVEY_NOT_FOUND",
    "message": "Survey not found"
  }
}
```

#### 2.3.2 이메일 인증 발송 API

| 항목 | 내용 |
|------|------|
| 엔드포인트 | `POST /link-surveys/:surveyId/send-verification-email` |
| 인증 | 불필요 (공개 API) |
| Rate Limiting | IP 기반, 시간당 10회 (`SurveyEmailVerifyRateLimit`) |

**요청:**
```json
{
  "email": "user@example.com",
  "surveyName": "Customer Satisfaction Survey",
  "suId": "optional-single-use-id",
  "locale": "ko"
}
```

**성공 응답 (200):**
```json
{
  "message": "Verification email sent"
}
```

**중복 응답 에러 (409):**
```json
{
  "error": {
    "code": "RESPONSE_ALREADY_RECEIVED",
    "message": "Response already received for this email"
  }
}
```

#### 2.3.3 이메일 인증 확인 API

| 항목 | 내용 |
|------|------|
| 엔드포인트 | `GET /link-surveys/:surveyId/verify-email?token={jwt}` |
| 인증 | 불필요 (공개 API) |

**성공 응답 (200):**
```json
{
  "verificationStatus": "verified",
  "verifiedEmail": "user@example.com"
}
```

**실패 응답 (200, fishy 상태):**
```json
{
  "verificationStatus": "fishy"
}
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 서버: LinkSurveyService

```typescript
@Injectable()
export class LinkSurveyService {
  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * PIN 검증 후 설문 데이터를 반환한다.
   * PIN 미설정 설문에서 호출 시 NotFoundException을 던진다.
   */
  async verifyPin(surveyId: string, pin: string): Promise<Survey> { ... }

  /**
   * 설문 인증 이메일을 발송한다.
   * isSingleResponsePerEmailEnabled 시 기존 응답 여부를 확인한다.
   */
  async sendVerificationEmail(dto: SendVerificationEmailDto): Promise<void> { ... }

  /**
   * JWT 토큰을 검증하고 이메일을 추출한다.
   * 토큰 무효 시 "fishy" 상태를 반환한다.
   */
  async verifyEmailToken(token: string): Promise<{
    status: EmailVerificationStatus;
    email?: string;
  }> { ... }
}
```

#### 2.4.2 클라이언트: PrefillParser (공유 패키지)

```typescript
// packages/shared/src/prefill/prefill-parser.ts

/**
 * URL 쿼리 파라미터를 파싱하여 프리필 데이터를 생성한다.
 * 오류 격리: 개별 파라미터 파싱 실패가 다른 파라미터에 영향 없음.
 *
 * @param searchParams - URL SearchParams 객체
 * @param elements - 설문 내 Element 배열
 * @param hiddenFields - 설문의 Hidden Fields 설정
 * @returns { prefillData, hiddenFieldData, startAt, skipPrefilled }
 */
export function parsePrefillParams(
  searchParams: URLSearchParams,
  elements: SurveyElement[],
  hiddenFields: HiddenFieldsConfig,
): PrefillResult { ... }

/**
 * Element 타입별 프리필 값을 검증한다.
 * @returns 검증 결과 (유효/무효 + 변환된 값)
 */
export function validatePrefillValue(
  value: string,
  element: SurveyElement,
): PrefillValidationResult { ... }
```

#### 2.4.3 클라이언트: 접근 제어 통합 훅

```typescript
// libs/client/link-survey/src/lib/hooks/use-survey-access.ts

/**
 * Link Survey 접근 제어를 통합 관리하는 훅.
 * PIN -> 이메일 인증 -> 설문 상태 순으로 게이트를 처리한다.
 */
export function useSurveyAccess(survey: SurveyData) {
  // 1. Survey 상태 확인 (paused, completed 등)
  // 2. PIN 게이트
  // 3. 이메일 인증 게이트
  // 4. 모든 게이트 통과 후 프리필 데이터 파싱
  return {
    accessState: 'pin-required' | 'email-required' | 'closed' | 'accessible',
    pinGateProps: { ... },
    emailGateProps: { ... },
    closedMessageProps: { ... },
    prefillData: { ... },
    verifiedEmail: string | null,
  };
}
```

### 2.5 기존 시스템 영향 분석

| 영향 대상 | 변경 유형 | 설명 |
|----------|-----------|------|
| `libs/server/email/` | 수정 | `sendSurveyVerificationEmail()` 메서드 추가. 설문 이름, 인증 링크 포함 |
| `libs/server/rate-limit/` | 수정 | `SurveyEmailVerifyRateLimit()` 데코레이터 추가 (시간당 10회) |
| `packages/shared/` | 수정 | `prefill/`, `survey-status/` 디렉토리 추가 |
| `apps/server/` | 수정 | LinkSurveyModule을 AppModule에 등록 |
| `apps/client/` | 수정 | Link Survey 페이지에서 접근 제어 컴포넌트 사용 (FS-016 페이지에 통합) |
| `libs/client/ui/` | 수정 | `input-otp` shadcn/ui 컴포넌트 추가 |
| `packages/db/` | 수정 | Response 스텁 모델 추가 (이메일 중복 확인용) |
| i18n JSON | 수정 | ko/en 번역 파일에 link-survey 네임스페이스 추가 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|----------|
| T-01 | Response 스텁 모델 추가 | Prisma 스키마에 최소 Response 모델 정의 + 마이그레이션 | FS-008(Survey 모델) | 낮음 | 1h |
| T-02 | 예약 파라미터 상수 정의 | `packages/shared`에 RESERVED_PARAMS, 프리필 관련 타입 정의 | - | 낮음 | 0.5h |
| T-03 | Survey Close 상태/메시지 유틸 | 비활성 상태 타입, 상태별 기본 메시지 매핑 함수 | T-02 | 낮음 | 1h |
| T-04 | 프리필 검증 규칙 구현 | 7가지 Element 타입별 검증 함수 (validatePrefillValue) | T-02, FS-009(Element 타입) | 높음 | 4h |
| T-05 | 프리필 파서 구현 | parsePrefillParams 함수: URL 파싱, 예약 파라미터 필터링, Hidden Fields 매핑 | T-04 | 중간 | 2h |
| T-06 | startAt 처리 로직 | startAt 값 파싱, Element 존재 확인, URL 정리(replaceState) | T-02 | 낮음 | 1h |
| T-07 | skipPrefilled 처리 로직 | skipPrefilled 파싱, 프리필된 Element 건너뛰기 인덱스 계산 | T-05 | 낮음 | 0.5h |
| T-08 | LinkSurvey 서버 모듈 생성 | NestJS 모듈, 컨트롤러, 서비스 스캐폴딩 | FS-008(Survey 모델) | 중간 | 1h |
| T-09 | PIN 검증 API 구현 | VerifyPinDto, 서비스 로직, 에러 처리 | T-08, T-01 | 중간 | 2h |
| T-10 | 이메일 인증 발송 API 구현 | SendVerificationEmailDto, JWT 토큰 생성, 이메일 발송, 중복 응답 확인 | T-08, T-01 | 높음 | 3h |
| T-11 | 이메일 인증 확인 API 구현 | JWT 토큰 검증, 이메일 추출, fishy 상태 처리 | T-10 | 중간 | 1.5h |
| T-12 | SurveyEmailVerifyRateLimit 데코레이터 | rate-limit 라이브러리에 신규 데코레이터 추가 | - | 낮음 | 0.5h |
| T-13 | 설문 인증 이메일 템플릿 | EmailService에 sendSurveyVerificationEmail() 추가 | - | 낮음 | 1h |
| T-14 | OTP Input 컴포넌트 추가 | shadcn/ui input-otp 컴포넌트를 UI 라이브러리에 추가 | - | 낮음 | 0.5h |
| T-15 | PinGate 컴포넌트 구현 | OTP 입력 UI, 자동 검증, 2초 에러 초기화, iframe autofocus 감지 | T-09, T-14 | 중간 | 3h |
| T-16 | EmailVerificationGate 컴포넌트 구현 | 이메일 입력/발송, 발송 완료 화면, "Just Curious?" 미리보기, fishy 에러 화면 | T-10, T-11 | 높음 | 4h |
| T-17 | SurveyClosedMessage 컴포넌트 구현 | 상태별 아이콘/메시지 표시, 커스텀 Close Message 지원 | T-03 | 중간 | 2h |
| T-18 | QuestionPreviewList 컴포넌트 | "Just Curious?" 질문 목록 미리보기 | - | 낮음 | 1h |
| T-19 | useSurveyAccess 통합 훅 | PIN/이메일/상태 게이트 통합, 프리필 데이터 통합 | T-15, T-16, T-17, T-05, T-06, T-07 | 높음 | 3h |
| T-20 | link-survey API 클라이언트 | apiFetch 기반 공개 API 호출 함수 | T-09, T-10, T-11 | 낮음 | 1h |
| T-21 | i18n 번역 키 추가 | ko/en 번역 파일에 link-survey 관련 키 추가 | T-15, T-16, T-17 | 낮음 | 1h |
| T-22 | verifiedEmail Hidden Field 주입 로직 | 이메일 인증 성공 시 hiddenFieldData에 verifiedEmail 자동 추가 | T-19 | 낮음 | 0.5h |
| T-23 | 단위 테스트: 프리필 검증/파서 | 7가지 Element 타입별 검증 + 통합 파서 테스트 | T-04, T-05 | 중간 | 3h |
| T-24 | 단위 테스트: 서버 API | PIN 검증, 이메일 인증 발송/확인 API 테스트 | T-09, T-10, T-11 | 중간 | 2h |
| T-25 | 통합 테스트 | 전체 접근 제어 플로우 E2E 검증 | T-19 | 중간 | 2h |

### 3.2 구현 순서 및 마일스톤

```
Phase 1: 공유 기반 (T-02, T-03)
    |
    v
Phase 2: 프리필 엔진 (T-04, T-05, T-06, T-07)
    |
    +---> [Milestone 1: 프리필 파싱/검증 단위 테스트 통과]
    |
Phase 3: 서버 API (T-01, T-08, T-12, T-13, T-09, T-10, T-11)
    |
    +---> [Milestone 2: 서버 API 단위 테스트 통과]
    |
Phase 4: 클라이언트 UI (T-14, T-15, T-16, T-17, T-18, T-20, T-21)
    |
    +---> [Milestone 3: 개별 게이트 컴포넌트 렌더링 확인]
    |
Phase 5: 통합 (T-19, T-22, T-23, T-24, T-25)
    |
    +---> [Milestone 4: 전체 접근 제어 플로우 E2E 통과]
```

**Milestone 상세:**

| 마일스톤 | 검증 기준 | 예상 완료 |
|----------|----------|----------|
| M1: 프리필 엔진 | 7가지 Element 타입별 프리필 검증 테스트 통과. 예약 파라미터 필터링, Hidden Fields 매핑 정상 동작 | Phase 2 완료 |
| M2: 서버 API | PIN 검증 성공/실패 테스트 통과. 이메일 인증 발송 + 토큰 검증 + fishy 테스트 통과. Rate Limiting 동작 확인 | Phase 3 완료 |
| M3: 클라이언트 컴포넌트 | PinGate OTP 4자리 자동 검증 + 2초 초기화 확인. EmailVerificationGate 이메일 입력/발송/fishy 화면 확인. SurveyClosedMessage 5종 상태별 아이콘/메시지 확인 | Phase 4 완료 |
| M4: 통합 | 전체 접근 제어 순서(상태확인 -> PIN -> 이메일) 동작 확인. 프리필 데이터가 설문 렌더링에 반영 확인. verifiedEmail Hidden Field 주입 확인 | Phase 5 완료 |

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|-----------|----------|
| `packages/db/prisma/schema.prisma` | 수정 | Response 스텁 모델 추가 (Survey 관계 포함) |
| `packages/shared/src/prefill/index.ts` | 생성 | 프리필 모듈 엑스포트 |
| `packages/shared/src/prefill/prefill-constants.ts` | 생성 | RESERVED_PARAMS, 예약 파라미터 상수 |
| `packages/shared/src/prefill/prefill.types.ts` | 생성 | PrefillValidationResult, PrefillResult 등 타입 |
| `packages/shared/src/prefill/prefill-parser.ts` | 생성 | parsePrefillParams() 메인 파서 함수 |
| `packages/shared/src/prefill/prefill-validators.ts` | 생성 | 7가지 Element 타입별 검증 함수 |
| `packages/shared/src/prefill/prefill-converters.ts` | 생성 | 검증된 값 -> 응답 형식 변환 유틸 |
| `packages/shared/src/survey-status/survey-close-status.ts` | 생성 | SurveyCloseReason 타입, 상태별 아이콘/메시지 매핑 |
| `packages/shared/src/survey-status/index.ts` | 생성 | 모듈 엑스포트 |
| `libs/server/link-survey/src/index.ts` | 생성 | 서버 라이브러리 퍼블릭 API |
| `libs/server/link-survey/src/lib/link-survey.module.ts` | 생성 | NestJS 모듈 (JwtModule, EmailModule, PrismaModule import) |
| `libs/server/link-survey/src/lib/link-survey.controller.ts` | 생성 | 3개 공개 API 엔드포인트 |
| `libs/server/link-survey/src/lib/link-survey.service.ts` | 생성 | PIN 검증, 이메일 인증 발송/확인 비즈니스 로직 |
| `libs/server/link-survey/src/lib/dto/verify-pin.dto.ts` | 생성 | PIN 검증 요청 DTO (class-validator) |
| `libs/server/link-survey/src/lib/dto/send-verification-email.dto.ts` | 생성 | 이메일 인증 발송 DTO (class-validator) |
| `libs/server/link-survey/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/server/link-survey/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/link-survey/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `libs/server/email/src/lib/email.service.ts` | 수정 | `sendSurveyVerificationEmail()` 메서드 추가 |
| `libs/server/rate-limit/src/lib/rate-limit.decorators.ts` | 수정 | `SurveyEmailVerifyRateLimit()` 데코레이터 추가 |
| `libs/server/rate-limit/src/index.ts` | 수정 | 신규 데코레이터 엑스포트 |
| `libs/client/link-survey/src/index.ts` | 생성 | 클라이언트 라이브러리 퍼블릭 API |
| `libs/client/link-survey/src/lib/components/pin-gate.tsx` | 생성 | PIN OTP 입력 게이트 컴포넌트 |
| `libs/client/link-survey/src/lib/components/email-verification-gate.tsx` | 생성 | 이메일 인증 게이트 컴포넌트 |
| `libs/client/link-survey/src/lib/components/survey-closed-message.tsx` | 생성 | Survey Close Message 컴포넌트 |
| `libs/client/link-survey/src/lib/components/question-preview-list.tsx` | 생성 | "Just Curious?" 질문 미리보기 컴포넌트 |
| `libs/client/link-survey/src/lib/hooks/use-pin-verification.ts` | 생성 | PIN 검증 상태 관리 훅 |
| `libs/client/link-survey/src/lib/hooks/use-email-verification.ts` | 생성 | 이메일 인증 상태 관리 훅 |
| `libs/client/link-survey/src/lib/hooks/use-survey-access.ts` | 생성 | 통합 접근 제어 훅 |
| `libs/client/link-survey/src/lib/api/link-survey-api.ts` | 생성 | 공개 API 클라이언트 함수 |
| `libs/client/link-survey/src/lib/schemas/link-survey.schemas.ts` | 생성 | zod 검증 스키마 (pin, email) |
| `libs/client/link-survey/src/lib/types/link-survey.types.ts` | 생성 | 클라이언트 타입 정의 |
| `libs/client/link-survey/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/client/link-survey/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/client/link-survey/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `libs/client/ui/src/components/ui/input-otp.tsx` | 생성 | shadcn/ui OTP Input 컴포넌트 |
| `libs/client/ui/src/index.ts` | 수정 | input-otp 엑스포트 추가 |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | link-survey 네임스페이스 번역 키 추가 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | link-survey 네임스페이스 번역 키 추가 |
| `apps/server/src/app.module.ts` | 수정 | LinkSurveyModule import 추가 |
| `tsconfig.base.json` | 수정 | 신규 라이브러리 path alias 추가 (`@inquiry/server-link-survey`, `@inquiry/client-link-survey`) |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 발생 확률 | 완화 전략 |
|--------|------|-----------|----------|
| FS-008(Survey 모델) 미완성 시 서버 API 구현 불가 | 높음 | 중간 | 프리필 엔진(클라이언트 전용)을 먼저 구현. 서버 API는 Survey 모델 완성 후 착수. Survey 모델 인터페이스를 미리 정의하여 Mock 기반 개발 가능 |
| FS-009(Element 타입) 미완성 시 프리필 검증 구현 불가 | 높음 | 중간 | `packages/shared-types`의 Element 타입 정의를 프리필 검증과 동시에 개발. 최소 7가지 타입(OpenText, MultipleChoiceSingle/Multi, NPS, Rating, Consent, PictureSelection)의 인터페이스만 우선 확정 |
| FS-021(Response 모델) 미완성 시 이메일 중복 확인 불가 | 중간 | 높음 | Response 스텁 모델을 최소 정의. verifiedEmail, surveyId 인덱스만 포함. FS-021 구현 시 확장 |
| PIN 검증에서 timing attack 취약점 | 낮음 | 낮음 | 4자리 PIN은 brute-force 가능성이 낮으나, constant-time comparison 사용을 권장. 명세상 재시도 제한이 없으므로 향후 Rate Limiting 추가 고려 |
| 이메일 발송 시스템 장애 시 인증 불가 | 중간 | 낮음 | EmailService의 기존 graceful degradation(no-op 모드) 패턴 활용. 발송 실패 시 사용자에게 재시도 안내 메시지 표시 |
| 프리필 파라미터 수가 많을 때 URL 길이 제한 | 낮음 | 낮음 | 브라우저 URL 길이 제한(약 2000자)에 대한 문서화. CRM 시스템 연동 가이드에 권장 URL 길이 안내 |
| OTP 컴포넌트 의존성 패키지 호환성 | 낮음 | 낮음 | shadcn/ui의 `input-otp`는 `input-otp` npm 패키지에 의존. React 19 호환성 확인 후 도입 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

**프리필 엔진 (packages/shared):**

| 테스트 대상 | 테스트 케이스 | 우선순위 |
|------------|-------------|---------|
| `validatePrefillValue` - OpenText | 임의 문자열 유효, 필수 필드 빈 값 무효 | 높음 |
| `validatePrefillValue` - MultipleChoiceSingle | Option ID 매칭, 라벨 매칭, "other" 값, 매칭 실패 | 높음 |
| `validatePrefillValue` - MultipleChoiceMulti | 쉼표 구분 복수 매칭, other 1개 허용, other 2개 이상 무효 | 높음 |
| `validatePrefillValue` - NPS | 0~10 범위 유효, 11 무효, 소수점 무효, 문자열 무효 | 높음 |
| `validatePrefillValue` - Rating | 1~range 범위 유효, 0 무효, range 초과 무효 | 높음 |
| `validatePrefillValue` - Consent | "accepted" 유효, "dismissed" 유효(비필수), "dismissed" 무효(필수), 기타 문자열 무효 | 높음 |
| `validatePrefillValue` - PictureSelection | 1-based 인덱스, 복수 선택 비허용 시 첫 값만, 범위 초과 무효 | 높음 |
| `parsePrefillParams` | 예약 파라미터 필터링, 알 수 없는 파라미터 무시, Hidden Fields 매핑, 오류 격리 | 높음 |
| `parsePrefillParams` - startAt | "start" -> Welcome Card, Element ID -> 인덱스, 무효 ID -> null | 중간 |
| `parsePrefillParams` - skipPrefilled | "true" -> true, 기타 값 -> false, 미지정 -> false | 중간 |

**서버 API (libs/server/link-survey):**

| 테스트 대상 | 테스트 케이스 | 우선순위 |
|------------|-------------|---------|
| `verifyPin` | 올바른 PIN -> 설문 데이터 반환 | 높음 |
| `verifyPin` | 잘못된 PIN -> INVALID_PIN 에러 | 높음 |
| `verifyPin` | 존재하지 않는 설문 -> SURVEY_NOT_FOUND | 높음 |
| `verifyPin` | PIN 미설정 설문 -> 에러 반환 | 중간 |
| `sendVerificationEmail` | 정상 발송 | 높음 |
| `sendVerificationEmail` | 중복 응답 시 RESPONSE_ALREADY_RECEIVED | 높음 |
| `verifyEmailToken` | 유효 토큰 -> verified + 이메일 반환 | 높음 |
| `verifyEmailToken` | 만료/변조 토큰 -> fishy 반환 | 높음 |
| DTO 검증 | pin: 4자리 숫자만 허용, 3자리/5자리/문자열 거부 | 중간 |
| DTO 검증 | email: RFC 5322 형식 검증 | 중간 |

### 5.2 통합 테스트

| 시나리오 | 검증 포인트 |
|----------|------------|
| PIN 보호 설문 접근 플로우 | PIN 입력 화면 -> 올바른 PIN -> 설문 데이터 수신 -> 렌더링 |
| 이메일 인증 플로우 | 이메일 입력 -> 발송 API -> JWT 토큰 -> 인증 확인 API -> 설문 접근 |
| 프리필 통합 | URL 파라미터 -> 파싱 -> Element에 프리필 값 반영 -> skipPrefilled 동작 |
| Close Message 표시 | paused 설문 접근 -> 일시정지 메시지/아이콘 표시 |
| 중복 이메일 차단 | 이미 응답한 이메일 -> 이메일 발송 API -> 409 에러 -> 에러 메시지 표시 |
| verifiedEmail 주입 | 이메일 인증 성공 -> hiddenFieldData에 verifiedEmail 포함 확인 |

### 5.3 E2E 테스트 (해당 시)

FS-016(Link Survey 페이지)과 FS-021(응답 관리)이 구현된 후에 E2E 테스트를 추가한다.

| 시나리오 | 설명 |
|----------|------|
| 전체 접근 제어 파이프라인 | Link Survey URL 접근 -> PIN 입력 -> 이메일 인증 -> 프리필 데이터 -> 설문 응답 제출 |
| Close Message E2E | 설문 상태 변경(paused) -> Link Survey 접근 -> Close Message 표시 확인 |
| 프리필 E2E | ?q1=answer&nps=9&startAt=q2&skipPrefilled=true -> 올바른 프리필 + 시작 위치 확인 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 제약 | 설명 |
|------|------|
| PIN brute-force | PIN 재시도 제한이 없으므로(BR-01-04) 4자리 숫자(10,000 조합)는 자동화된 공격에 취약. 명세서 요구사항을 준수하되 문서에 보안 권고 포함 |
| FS-016 의존 | Link Survey 페이지(`/s/{surveyId}`)는 FS-016에서 구현. FS-018은 해당 페이지 내에 주입될 라이브러리를 제공하는 역할 |
| FS-021 의존 | 이메일 중복 응답 확인은 Response 모델이 완성되어야 완전히 동작. 스텁 모델로 기본 동작 확인 가능 |
| FS-009 의존 | 프리필 검증은 Element 타입 정의에 의존. Element 타입 인터페이스가 확정되어야 정확한 검증 규칙 구현 가능 |
| iframe autofocus 감지 | `window.self !== window.top`으로 iframe 여부를 감지하나, CSP 제한이 있는 환경에서는 정확도가 떨어질 수 있음 |

### 6.2 향후 개선 가능성

| 항목 | 설명 |
|------|------|
| PIN Rate Limiting 추가 | 보안 강화를 위해 IP 기반 PIN 검증 Rate Limiting 도입 가능 |
| 이메일 인증 토큰 일회용 처리 | 현재 JWT 토큰은 만료까지 재사용 가능. DB에 사용 여부를 기록하여 일회용으로 전환 가능 |
| 프리필 지원 Element 확장 | 현재 7가지 타입만 지원. Date, Address, ContactInfo 등으로 확장 가능 |
| 프리필 URL 빌더 UI | Survey Creator가 GUI로 프리필 URL을 조합할 수 있는 도우미 UI |
| reCAPTCHA 연동 | FS-020에서 reCAPTCHA 기반 스팸 방지를 별도 구현. 이메일 인증과 결합하여 보안 강화 가능 |
| 이메일 인증 재발송 쿨다운 | 동일 이메일에 대한 재발송 간격 제한 (예: 60초) 추가 가능 |

---

## 7. i18n 고려사항 (클라이언트 UI 변경)

FS-018에서 추가/수정이 필요한 번역 키 목록:

**네임스페이스: `linkSurvey`**

| 키 | ko (한국어) | en (English) | 사용 위치 |
|----|-------------|--------------|----------|
| `linkSurvey.pin.title` | "PIN 코드를 입력하세요" | "Enter the PIN code" | PinGate |
| `linkSurvey.pin.error` | "잘못된 PIN입니다" | "Invalid PIN" | PinGate |
| `linkSurvey.email.title` | "이메일을 인증해주세요" | "Verify your email" | EmailVerificationGate |
| `linkSurvey.email.placeholder` | "이메일 주소 입력" | "Enter your email" | EmailVerificationGate |
| `linkSurvey.email.verifyButton` | "인증하기" | "Verify" | EmailVerificationGate |
| `linkSurvey.email.sentMessage` | "{{email}}로 인증 메일을 보냈습니다" | "Survey sent to {{email}}" | EmailVerificationGate |
| `linkSurvey.email.justCurious` | "궁금하신가요?" | "Just Curious?" | EmailVerificationGate |
| `linkSurvey.email.fishy` | "비정상적인 접근입니다" | "This looks fishy" | EmailVerificationGate |
| `linkSurvey.email.fishyRetry` | "다시 시도해주세요" | "Please try again" | EmailVerificationGate |
| `linkSurvey.email.alreadyResponded` | "이미 응답이 제출되었습니다" | "Response already received" | EmailVerificationGate |
| `linkSurvey.email.rateLimited` | "잠시 후 다시 시도해주세요" | "Please try again later" | EmailVerificationGate |
| `linkSurvey.closed.paused` | "설문이 일시정지되었습니다." | "Survey paused." | SurveyClosedMessage |
| `linkSurvey.closed.completed` | "설문이 완료되었습니다." | "Survey completed." | SurveyClosedMessage |
| `linkSurvey.closed.linkInvalid` | "유효하지 않은 링크입니다." | "This link is invalid." | SurveyClosedMessage |
| `linkSurvey.closed.responseSubmitted` | "이미 응답이 제출되었습니다." | "Response already submitted." | SurveyClosedMessage |
| `linkSurvey.closed.linkExpired` | "링크가 만료되었습니다." | "This link has expired." | SurveyClosedMessage |
| `linkSurvey.preview.title` | "질문 미리보기" | "Question Preview" | QuestionPreviewList |
| `linkSurvey.surveyNotFound` | "설문을 찾을 수 없습니다" | "Survey not found" | 에러 화면 |
