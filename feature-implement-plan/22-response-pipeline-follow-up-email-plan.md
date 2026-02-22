# 기능 구현 계획: 응답 파이프라인 및 후속 메일 (FS-022)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 우선순위 | 설명 |
|---------|--------|---------|------|
| FN-022-01 | 파이프라인 트리거 처리 | 높음 | 응답 생성/업데이트/완료 이벤트에 따라 웹훅, 통합, 알림, Follow-Up, autoComplete를 일관된 흐름으로 실행 |
| FN-022-02 | 파이프라인 내부 인증 | 높음 | 내부 시크릿 헤더 기반 인증. 타이밍 공격 방지를 위한 상수 시간 비교 |
| FN-022-03 | 웹훅 발송 | 높음 | Standard Webhooks 프로토콜로 매칭 웹훅에 HTTP POST 전송 (5초 타임아웃) |
| FN-022-04 | 외부 통합 처리 | 높음 | responseFinished 시 Google Sheets, Slack, Airtable, Notion으로 데이터 전달 |
| FN-022-05 | 알림 이메일 발송 | 중간 | 설문 Owner/Manager/알림 ON 팀 멤버에게 응답 완료 알림 발송 |
| FN-022-06 | autoComplete | 중간 | 목표 응답 수 도달 시 설문 상태 "completed" 전환 + Audit Log 기록 |
| FN-022-07 | Follow-Up Email 권한 관리 | 높음 | Cloud: Custom plan 전용, Self-hosted: 무제한 |
| FN-022-08 | Follow-Up Email 설정 | 높음 | 트리거/수신자/제목/본문/첨부 옵션 설정 모달 UI |
| FN-022-09 | Follow-Up Email 발송 | 높음 | 트리거 조건 평가 -> 수신자 결정 -> Recall 태그 치환 -> HTML Sanitization -> 발송 |
| FN-022-10 | Follow-Up 결과 추적 | 중간 | success/error/skipped 상태 + 에러 코드 기록 |
| FN-022-11 | Follow-Up Rate Limiting | 높음 | 조직당 시간당 50건 제한 |

### 1.2 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 에러 격리 | 개별 웹훅/이메일/통합 실패가 전체 파이프라인을 중단시키지 않아야 한다 |
| 병렬 실행 | 웹훅과 알림 이메일은 Promise 기반 병렬 실행 (Promise.allSettled) |
| 성능 | 웹훅 호출 타임아웃 5초, 파이프라인 전체 지연 최소화 |
| 보안 | 내부 인증 시크릿(상수 시간 비교), 웹훅 서명(HMAC-SHA256), HTML Sanitization(7개 허용 태그) |
| Rate Limiting | Follow-Up Email 조직당 시간당 50건 |
| 감사 로그 | autoComplete에 의한 상태 변경을 Audit Log에 기록 |

### 1.3 명세서 내 모호성 및 해석

| 항목 | 모호성 | 해석/결정 |
|------|--------|----------|
| 내부 인증 시크릿 환경변수명 | 명세서에서 구체적인 환경변수명이 미정의. FS-028에서 "CRON_SECRET"이라고 언급 | 환경변수 `PIPELINE_SECRET`으로 정의한다. FS-028의 CRON_SECRET과 동일한 시크릿을 공유하며, 헤더명은 `x-pipeline-secret`으로 설정한다 |
| Follow-Up 설정 저장 위치 | "설문에 저장"이라 명시하나, Survey 모델의 JSON 필드 vs 별도 테이블 불명확 | Follow-Up 설정은 Survey.followUps JSON 필드에 배열로 저장한다. 명세서의 FollowUp 엔티티 정의를 따르되, 별도 테이블 대신 JSON으로 관리하여 설문 CRUD와 원자적으로 처리한다. FollowUpResult는 별도 테이블로 분리한다 |
| FollowUpResult 저장 위치 | 명세서에서 별도 엔티티로 정의하나 FK 구조가 불명확 (followUpId가 JSON 내부 ID를 참조) | FollowUpResult는 별도 Prisma 모델로 생성한다. followUpId는 Survey.followUps 배열 내 개별 Follow-Up의 UUID를 저장하며, responseId + followUpId 조합으로 유니크 제약을 건다 |
| Integration 모델 | FS-022에서 Integration을 참조하지만 별도 DB 모델 정의가 불완전 (FS-023에서 상세 정의 예정) | Integration 모델은 FS-023 구현 시 생성한다. 본 계획에서는 IntegrationHandler 인터페이스만 정의하고, 실제 통합 로직은 스텁으로 처리한다 |
| Webhook 모델 | FS-022에서 웹훅을 참조하나 CRUD는 FS-023 범위 | Webhook Prisma 모델은 FS-023 구현 시 생성하되, 본 계획에서 파이프라인이 필요로 하는 최소 스키마를 스텁으로 정의한다 |
| 알림 이메일 수신자 조회 | "owner/manager + 알림 설정된 팀 멤버"인데 구체적인 조회 방식 미정의 | FS-028의 NotificationSettings(User.notificationSettings JSON 필드)를 참조하여 수신자를 결정한다. FS-028 미구현 시 스텁으로 처리한다 |
| Follow-Up Rate Limit 구현 방식 | "슬라이딩 윈도우 또는 고정 윈도우" 선택 가능 | Redis 미도입 상황에서는 DB 기반 고정 윈도우로 구현한다. FollowUpResult 테이블에서 최근 1시간 내 success 상태 레코드 수를 카운트한다. Redis 도입(FS-099) 후 슬라이딩 윈도우로 마이그레이션한다 |
| 파이프라인 호출 방식 | Client API에서 파이프라인 API를 "호출"한다고만 명시 | 동일 NestJS 서버 내 모듈 간 직접 서비스 호출(DI)로 구현한다. 별도 HTTP 호출이 아닌 `PipelineService.trigger()` 직접 호출 방식이다. 내부 인증은 Controller 레벨에서만 적용하며, 서비스 간 호출 시에는 생략한다 |
| from 필드 | "시스템 이메일 주소 (자동 설정)"이라 명시 | 환경변수 `EMAIL_FROM`의 값을 사용한다. 기존 EmailService의 emailFrom과 동일 |

### 1.4 암시적 요구사항

| 항목 | 설명 |
|------|------|
| Prisma 스키마 확장 | FollowUpResult 모델 신규 생성. Survey 모델에 followUps(Json), autoComplete(Int?) 필드 추가. Webhook/Integration 모델 스텁 생성 |
| 서버 라이브러리 생성 | `libs/server/pipeline/` NestJS 모듈 (PipelineModule, PipelineService, PipelineController) |
| Follow-Up 서버 라이브러리 | `libs/server/follow-up/` NestJS 모듈 (FollowUpModule, FollowUpService, FollowUpEmailService, FollowUpRateLimitService) |
| 웹훅 디스패처 라이브러리 | `libs/server/webhook-dispatch/` (WebhookDispatchService - 발송 전용, CRUD는 FS-023) |
| 클라이언트 라이브러리 생성 | `libs/client/follow-up/` (Follow-Up 설정 모달 UI, hooks, api, zod schemas) |
| HTML Sanitization 라이브러리 | `sanitize-html` 또는 `dompurify` npm 패키지 설치 필요 (서버 사이드) |
| Standard Webhooks 라이브러리 | `standardwebhooks` npm 패키지 또는 직접 HMAC-SHA256 서명 구현 |
| uuid v7 생성 | `uuidv7` 패키지 또는 직접 구현 (webhook-id 헤더용) |
| 환경변수 추가 | PIPELINE_SECRET, IS_CLOUD_INSTANCE (FS-029에서 정의), EMAIL_FROM (기존) |
| i18n 번역 키 | Follow-Up 설정 모달의 모든 라벨, 에러 메시지, 플레이스홀더 번역 |
| Rich Text Editor | Follow-Up 이메일 본문 편집용 에디터 (tiptap 또는 react-quill 등) |
| DB 마이그레이션 | FollowUpResult 테이블 생성, Survey 모델 확장 마이그레이션 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
[응답자 (Browser/SDK)]
    |
    POST /api/environments/:envId/responses      -- 응답 생성
    PUT /api/responses/:responseId                -- 응답 업데이트/완료
    |
    v
[libs/server/response/]  (FS-021에서 구현)
    |
    responseService.create/update/finish()
    |
    v (서비스 간 직접 호출)
[libs/server/pipeline/]
    ├── pipeline.module.ts
    ├── pipeline.controller.ts       -- 내부 인증 POST /api/pipeline (외부 호출용)
    ├── pipeline.service.ts          -- 이벤트별 파이프라인 오케스트레이션
    ├── pipeline.guard.ts            -- InternalSecretGuard (상수 시간 비교)
    ├── dto/
    │   └── trigger-pipeline.dto.ts  -- 이벤트 타입, responseId, surveyId, environmentId
    └── types/
        └── pipeline.types.ts        -- PipelineEventType enum

[libs/server/webhook-dispatch/]
    ├── webhook-dispatch.module.ts
    ├── webhook-dispatch.service.ts  -- 웹훅 매칭, 페이로드 구성, Standard Webhooks 서명, HTTP 발송
    └── types/
        └── webhook.types.ts         -- 웹훅 페이로드 타입 정의

[libs/server/follow-up/]
    ├── follow-up.module.ts
    ├── follow-up.service.ts         -- Follow-Up 평가/발송 오케스트레이션
    ├── follow-up-email.service.ts   -- 이메일 본문 처리 (Recall 태그, Sanitization, Storage URL)
    ├── follow-up-rate-limit.service.ts -- 조직당 시간당 50건 제한
    ├── follow-up.controller.ts      -- Follow-Up 설정 CRUD API
    ├── dto/
    │   ├── create-follow-up.dto.ts
    │   └── update-follow-up.dto.ts
    └── types/
        └── follow-up.types.ts       -- Follow-Up 설정/결과 타입

[libs/client/follow-up/]
    ├── components/
    │   ├── follow-up-modal.tsx       -- Follow-Up 설정 모달
    │   ├── follow-up-list.tsx        -- Follow-Up 목록 (설문 설정 내)
    │   ├── follow-up-trigger-select.tsx -- 트리거 타입 선택
    │   ├── follow-up-recipient-select.tsx -- 수신자 5가지 소스 선택
    │   ├── follow-up-body-editor.tsx -- Rich Text Editor + Recall 태그
    │   └── follow-up-upgrade-prompt.tsx -- 권한 없음 시 업그레이드 안내
    ├── hooks/
    │   └── use-follow-up.ts          -- Follow-Up CRUD hooks
    ├── api/
    │   └── follow-up-api.ts          -- API 호출 래퍼
    ├── schemas/
    │   └── follow-up.schema.ts       -- zod 유효성 검증 스키마
    └── types/
        └── follow-up.types.ts
```

**모듈 의존 관계**:

```
PipelineModule
    ├── WebhookDispatchModule      -- 웹훅 발송
    ├── FollowUpModule             -- Follow-Up 평가/발송
    ├── EmailModule (@Global)      -- 알림 이메일 발송
    ├── AuditLogModule (@Global)   -- autoComplete Audit Log
    └── ServerPrismaModule (@Global) -- DB 접근

FollowUpModule
    ├── EmailModule (@Global)      -- Follow-Up 이메일 발송
    └── ServerPrismaModule (@Global) -- Follow-Up 결과 저장, Rate Limit 조회

WebhookDispatchModule
    └── ServerPrismaModule (@Global) -- Webhook 조회
```

### 2.2 데이터 모델

#### 2.2.1 Prisma 스키마 변경

```prisma
// === 신규 모델 ===

/// Follow-Up Email 발송 결과 추적
model FollowUpResult {
  id          String   @id @default(cuid())
  surveyId    String   // 설문 ID
  responseId  String   // 응답 ID
  followUpId  String   // Survey.followUps 배열 내 개별 Follow-Up의 ID (UUID)
  status      String   // "success" | "error" | "skipped"
  errorCode   String?  // 에러 시 코드 (validation_error, rate_limit_exceeded 등)
  errorMessage String? // 에러 시 상세 메시지
  createdAt   DateTime @default(now())

  survey   Survey   @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  response Response @relation(fields: [responseId], references: [id], onDelete: Cascade)

  @@unique([responseId, followUpId])
  @@index([surveyId])
  @@index([surveyId, status, createdAt])  // Rate Limit 카운트용
  @@map("follow_up_results")
}

/// 웹훅 (FS-023에서 완성, 여기서는 파이프라인에 필요한 최소 스텁)
enum WebhookSource {
  user
  zapier
  make
  n8n
  activepieces
}

model Webhook {
  id            String        @id @default(cuid())
  name          String?
  url           String
  source        WebhookSource @default(user)
  environmentId String
  triggers      String[]      // ["responseCreated", "responseUpdated", "responseFinished"]
  surveyIds     String[]      // 빈 배열이면 모든 설문
  secret        String?       // "whsec_" + base64(32bytes)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  environment Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)

  @@index([environmentId])
  @@map("webhooks")
}

/// 외부 통합 (FS-023에서 완성, 여기서는 스텁)
enum IntegrationType {
  googleSheets
  slack
  airtable
  notion
}

model Integration {
  id        String          @id @default(cuid())
  surveyId  String
  type      IntegrationType
  config    Json            // 통합별 설정 (OAuth 토큰, spreadsheetId 등)
  options   Json?           // { includeVariables, includeMetadata, includeHiddenFields, includeCreatedAt }
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  survey Survey @relation(fields: [surveyId], references: [id], onDelete: Cascade)

  @@index([surveyId])
  @@map("integrations")
}

// === 기존 모델 확장 (FS-008 Survey 스텁에 추가) ===

model Survey {
  // ... 기존 필드 (FS-008에서 정의)
  autoComplete  Int?    // 목표 응답 수. null이면 비활성
  followUps     Json?   // FollowUpConfig[] 배열 (JSON)
  // ... 기존 관계
  followUpResults FollowUpResult[]
  webhooks        Webhook[]         // Environment 경유 (직접 참조 아님)
  integrations    Integration[]
}

// === 기존 모델 확장 (FS-021 Response에 추가) ===

model Response {
  // ... 기존 필드
  endingId        String?          // 종료 화면 ID (Follow-Up endings 트리거에 필요)
  // ... 기존 관계
  followUpResults FollowUpResult[]
}

// === Organization 확장 (FS-029에서 정의, 여기서 참조만) ===
// Organization.billing.plan 으로 Follow-Up 권한 판단
// IS_CLOUD_INSTANCE 환경변수로 배포 환경 판단
```

#### 2.2.2 Follow-Up 설정 JSON 구조 (Survey.followUps)

```typescript
interface FollowUpConfig {
  id: string;                    // UUID v4 (클라이언트에서 생성)
  name: string;                  // Follow-Up 이름
  trigger: 'response' | 'endings'; // 트리거 타입
  endingIds: string[];           // endings 트리거 시 대상 종료 화면 ID 배열
  to: string;                    // 수신자 (이메일 주소, 질문 ID, 히든 필드 키)
  replyTo: string[];             // 회신 주소 배열
  subject: string;               // 이메일 제목
  body: string;                  // 이메일 본문 (HTML)
  attachResponseData: boolean;   // 응답 데이터 첨부 여부
  includeVariables: boolean;     // 변수 포함 여부
  includeHiddenFields: boolean;  // 히든 필드 포함 여부
  enabled: boolean;              // 활성화 여부
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

### 2.3 API 설계

#### 2.3.1 파이프라인 트리거 API (내부용)

| 항목 | 값 |
|------|-----|
| 엔드포인트 | `POST /api/pipeline/trigger` |
| 인증 | `x-pipeline-secret` 헤더 |
| Content-Type | application/json |

**요청 바디**:
```json
{
  "eventType": "responseCreated | responseUpdated | responseFinished",
  "responseId": "string",
  "surveyId": "string",
  "environmentId": "string"
}
```

**응답**:
- 200: `{ "status": "ok" }`
- 401: `{ "statusCode": 401, "message": "Unauthorized" }`

#### 2.3.2 Follow-Up 설정 CRUD API

| 메서드 | 엔드포인트 | 인증 | 설명 |
|--------|-----------|------|------|
| GET | `/api/surveys/:surveyId/follow-ups` | JWT (OWNER/ADMIN) | Follow-Up 목록 조회 |
| POST | `/api/surveys/:surveyId/follow-ups` | JWT (OWNER/ADMIN) | Follow-Up 생성 |
| PUT | `/api/surveys/:surveyId/follow-ups/:followUpId` | JWT (OWNER/ADMIN) | Follow-Up 수정 |
| DELETE | `/api/surveys/:surveyId/follow-ups/:followUpId` | JWT (OWNER/ADMIN) | Follow-Up 삭제 |

**POST/PUT 요청 바디**:
```json
{
  "name": "string",
  "trigger": "response | endings",
  "endingIds": ["string"],
  "to": "string",
  "replyTo": ["string"],
  "subject": "string",
  "body": "string (HTML)",
  "attachResponseData": false,
  "includeVariables": false,
  "includeHiddenFields": false
}
```

**GET 응답**:
```json
{
  "followUps": [
    {
      "id": "string",
      "name": "string",
      "trigger": "response",
      "endingIds": [],
      "to": "string",
      "replyTo": [],
      "subject": "string",
      "body": "string",
      "attachResponseData": false,
      "includeVariables": false,
      "includeHiddenFields": false,
      "enabled": true,
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    }
  ]
}
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 PipelineService (오케스트레이터)

```typescript
@Injectable()
export class PipelineService {
  async trigger(input: PipelineTriggerInput): Promise<void> {
    const { eventType, responseId, surveyId, environmentId } = input;

    switch (eventType) {
      case 'responseCreated':
        // 웹훅 발송만
        await this.handleResponseCreated(input);
        break;
      case 'responseUpdated':
        // 웹훅 발송만
        await this.handleResponseUpdated(input);
        break;
      case 'responseFinished':
        // 웹훅 + 통합 + 알림 이메일 + Follow-Up + autoComplete
        await this.handleResponseFinished(input);
        break;
    }
  }

  private async handleResponseFinished(input: PipelineTriggerInput): Promise<void> {
    // 1. 웹훅 Promise 생성 (아직 실행하지 않음)
    const webhookPromises = this.webhookDispatchService.createDispatchPromises(input);

    // 2. 통합 처리 (순차)
    await this.handleIntegrations(input).catch(err => this.logger.error(...));

    // 3. Follow-Up Email 발송
    await this.followUpService.processFollowUps(input).catch(err => this.logger.error(...));

    // 4. 알림 이메일 수신자 조회 + Promise 생성
    const notificationPromises = this.createNotificationPromises(input);

    // 5. autoComplete 처리
    await this.handleAutoComplete(input).catch(err => this.logger.error(...));

    // 6. 웹훅 + 알림 이메일 병렬 실행
    await Promise.allSettled([...webhookPromises, ...notificationPromises]);
  }
}
```

#### 2.4.2 WebhookDispatchService

```typescript
@Injectable()
export class WebhookDispatchService {
  // 웹훅 매칭 -> 페이로드 구성 -> Standard Webhooks 헤더 생성 -> HTTP POST
  createDispatchPromises(input: PipelineTriggerInput): Promise<void>[] {
    // 1. environmentId + triggers 포함 + surveyIds 매칭 웹훅 조회
    // 2. 각 웹훅에 대해 발송 Promise 생성
    // - 페이로드: { webhookId, event, data: { id, data, survey: { title, type, status, ... } } }
    // - 헤더: webhook-id (UUID v7), webhook-timestamp (Unix seconds), webhook-signature (v1,{HMAC-SHA256 base64})
    // - 5초 타임아웃, 개별 에러 격리
  }

  // HMAC-SHA256 서명 생성
  private generateSignature(secret: string, payload: string, timestamp: number): string {
    // timingSafeEqual 대신 서명 생성이므로 일반 HMAC
    // "v1," + base64(HMAC-SHA256(whsec에서 base64 디코딩한 키, "${webhookId}.${timestamp}.${payload}"))
  }
}
```

#### 2.4.3 FollowUpService

```typescript
@Injectable()
export class FollowUpService {
  async processFollowUps(input: PipelineTriggerInput): Promise<void> {
    // 1. Survey.followUps 조회
    // 2. 권한 확인 (FN-022-07: Cloud+Custom 또는 Self-hosted)
    // 3. Rate Limit 확인 (FN-022-11: 조직당 시간당 50건)
    // 4. 각 Follow-Up에 대해:
    //    a. 트리거 조건 평가 (response -> 항상, endings -> endingId 매칭)
    //    b. 수신자 이메일 결정 (직접 이메일 / 응답 데이터 추출)
    //    c. 이메일 본문 처리 (Recall 태그, Sanitization, Storage URL)
    //    d. 법적 고지 추가
    //    e. 응답 데이터 첨부 (옵션)
    //    f. 이메일 발송
    //    g. FollowUpResult 저장
  }
}
```

#### 2.4.4 InternalSecretGuard

```typescript
@Injectable()
export class InternalSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secret = request.headers['x-pipeline-secret'];
    const expectedSecret = this.configService.get<string>('PIPELINE_SECRET');

    if (!secret || !expectedSecret) return false;

    // 타이밍 공격 방지: 상수 시간 비교
    return crypto.timingSafeEqual(
      Buffer.from(secret),
      Buffer.from(expectedSecret),
    );
  }
}
```

### 2.5 기존 시스템 영향 분석

| 대상 | 영향 | 상세 |
|------|------|------|
| `apps/server/src/app/app.module.ts` | 수정 | PipelineModule, FollowUpModule, WebhookDispatchModule import 추가 |
| `packages/db/prisma/schema.prisma` | 수정 | FollowUpResult, Webhook(스텁), Integration(스텁) 모델 추가. Survey 확장 |
| `libs/server/email/` | 참조 | 기존 EmailService 확장 (sendFollowUpEmail, sendNotificationEmail 메서드 추가) |
| `libs/server/audit-log/` | 참조 | 기존 AuditLogService.log() 사용 (autoComplete 상태 변경 기록) |
| `libs/server/response/` | 수정 | ResponseService에서 파이프라인 트리거 호출 추가 (FS-021 연동) |
| `.env.example` | 수정 | PIPELINE_SECRET 환경변수 추가 |
| `docker-compose.yml` | 변경 없음 | Redis 미사용 (DB 기반 Rate Limit) |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|----------|
| 1 | Prisma 스키마 확장 | FollowUpResult 모델, Webhook/Integration 스텁, Survey 확장(followUps, autoComplete) | FS-008(Survey), FS-021(Response) | 중 | 2h |
| 2 | DB 마이그레이션 실행 | prisma migrate dev 실행 및 검증 | T1 | 하 | 0.5h |
| 3 | PipelineModule 생성 | module, service, controller, guard, dto, types 파일 생성 (Nx library) | - | 중 | 1h |
| 4 | InternalSecretGuard 구현 | x-pipeline-secret 헤더 검증, crypto.timingSafeEqual 상수 시간 비교 | T3 | 하 | 0.5h |
| 5 | PipelineController 구현 | POST /api/pipeline/trigger 엔드포인트, InternalSecretGuard 적용 | T3, T4 | 하 | 0.5h |
| 6 | PipelineService 기본 프레임 | 이벤트 타입별 분기 오케스트레이션 (스텁 핸들러) | T3 | 중 | 1h |
| 7 | WebhookDispatchModule 생성 | module, service, types 파일 생성 (Nx library) | - | 하 | 0.5h |
| 8 | WebhookDispatchService 구현 | 웹훅 매칭, 페이로드 구성, Standard Webhooks 서명, HTTP POST 발송 | T7, T1 | 상 | 4h |
| 9 | PipelineService 웹훅 통합 | responseCreated/Updated/Finished에서 WebhookDispatchService 호출 | T6, T8 | 중 | 1h |
| 10 | autoComplete 로직 구현 | 목표 응답 수 비교, Survey 상태 변경, AuditLog 기록 | T6, T1 | 중 | 1.5h |
| 11 | 알림 이메일 수신자 조회 로직 | FS-028 NotificationSettings 참조, 수신자 목록 구성, 중복 제거 | T6 | 중 | 1.5h |
| 12 | EmailService 확장 | sendNotificationEmail(), sendFollowUpEmail() 메서드 추가 | - | 중 | 2h |
| 13 | PipelineService 알림 이메일 통합 | responseFinished에서 알림 이메일 Promise 생성 + 웹훅과 병렬 실행 | T9, T11, T12 | 중 | 1h |
| 14 | Integration 스텁 핸들러 | IntegrationHandler 인터페이스 정의, 4개 통합 스텁 구현 | T6, T1 | 중 | 1.5h |
| 15 | PipelineService 통합 연동 | responseFinished에서 통합 처리 호출 | T6, T14 | 하 | 0.5h |
| 16 | FollowUpModule 생성 | module, service, email-service, rate-limit-service, controller, dto, types 생성 | - | 중 | 1h |
| 17 | FollowUpRateLimitService 구현 | DB 기반 고정 윈도우: FollowUpResult에서 최근 1시간 success 카운트 | T16, T1 | 중 | 1.5h |
| 18 | Follow-Up 권한 관리 로직 | isFollowUpAllowed(): Cloud+Custom / Self-hosted 판단 | T16 | 하 | 0.5h |
| 19 | FollowUpEmailService 구현 | Recall 태그 치환, HTML Sanitization, Storage URL 변환, 법적 고지 추가 | T16, T12 | 상 | 3h |
| 20 | FollowUpService 구현 | 트리거 평가, 수신자 결정, 이메일 발송, 결과 기록 오케스트레이션 | T16, T17, T18, T19 | 상 | 3h |
| 21 | PipelineService Follow-Up 통합 | responseFinished에서 FollowUpService.processFollowUps() 호출 | T6, T20 | 하 | 0.5h |
| 22 | FollowUpController 구현 | Follow-Up 설정 CRUD API (Survey.followUps JSON 읽기/쓰기) | T16, T1 | 중 | 2h |
| 23 | 서버 단위 테스트 | PipelineService, WebhookDispatch, FollowUp, Guard 테스트 | T1~T22 | 상 | 4h |
| 24 | 서버 통합 테스트 | 파이프라인 전체 흐름 E2E, Follow-Up CRUD API 테스트 | T23 | 상 | 3h |
| 25 | Follow-Up zod 스키마 정의 | 클라이언트용 유효성 검증 스키마 (트리거, 수신자, 제목, 본문 등) | - | 중 | 1h |
| 26 | Follow-Up API hooks 구현 | useFollowUps(), useCreateFollowUp(), useUpdateFollowUp(), useDeleteFollowUp() | T25 | 중 | 1.5h |
| 27 | Follow-Up 설정 모달 UI | 모달 레이아웃, 트리거 선택, 수신자 선택, 제목/본문 에디터, 첨부 옵션 | T25, T26 | 상 | 5h |
| 28 | Follow-Up 목록 컴포넌트 | Follow-Up 카드 목록, 활성화 토글, 편집/삭제 버튼 | T26 | 중 | 2h |
| 29 | 권한 없음 업그레이드 안내 UI | 잠금 아이콘, 업그레이드 메시지 컴포넌트 | - | 하 | 1h |
| 30 | i18n 번역 키 추가 | ko/en 번역 파일에 Follow-Up 관련 키 추가 | T27, T28, T29 | 중 | 1.5h |
| 31 | 환경변수 설정 및 문서화 | .env.example에 PIPELINE_SECRET 추가, 설정 가이드 작성 | - | 하 | 0.5h |
| 32 | AppModule 등록 | PipelineModule, FollowUpModule, WebhookDispatchModule을 AppModule에 import | T3, T7, T16 | 하 | 0.5h |
| 33 | ResponseService 연동 | 응답 생성/업데이트/완료 시 PipelineService.trigger() 호출 추가 | T6, FS-021 | 중 | 1h |

### 3.2 구현 순서 및 마일스톤

#### 마일스톤 1: 데이터 계층 (T1~T2) - 예상 2.5h
- Prisma 스키마 확장 및 마이그레이션
- 검증: `npx prisma migrate dev` 성공, 스키마 정합성 확인

#### 마일스톤 2: 파이프라인 코어 (T3~T6, T31~T32) - 예상 4h
- PipelineModule 생성, InternalSecretGuard, PipelineController, PipelineService 프레임
- 환경변수 설정, AppModule 등록
- 검증: POST /api/pipeline/trigger 호출 시 인증 통과/실패 확인, 이벤트별 분기 로깅 확인

#### 마일스톤 3: 웹훅 발송 (T7~T9) - 예상 5.5h
- WebhookDispatchModule 생성 및 서비스 구현
- Standard Webhooks 프로토콜 (서명 생성, 헤더 포함)
- PipelineService에 웹훅 발송 통합
- 검증: 테스트 웹훅 엔드포인트에 페이로드 수신 확인, 서명 검증 통과

#### 마일스톤 4: autoComplete + 알림 이메일 (T10~T13, T33) - 예상 6h
- autoComplete 로직 (응답 수 비교, 상태 변경, Audit Log)
- 알림 이메일 수신자 조회 및 발송
- EmailService 확장
- ResponseService 연동 (파이프라인 트리거 호출)
- 검증: autoComplete 동작 확인, 알림 이메일 수신 확인

#### 마일스톤 5: 외부 통합 스텁 (T14~T15) - 예상 2h
- Integration 핸들러 인터페이스 및 4개 스텁
- PipelineService 통합 연동
- 검증: 통합 호출 로깅 확인 (실제 외부 서비스 연동은 FS-023에서 완성)

#### 마일스톤 6: Follow-Up 서버 (T16~T22) - 예상 12h
- FollowUpModule 전체 구현 (서비스, 이메일 처리, Rate Limit, 권한, Controller)
- Recall 태그 치환, HTML Sanitization, 법적 고지
- Follow-Up CRUD API
- PipelineService Follow-Up 통합
- 검증: Follow-Up CRUD API 동작, 이메일 발송 확인, Rate Limit 동작 확인

#### 마일스톤 7: 서버 테스트 (T23~T24) - 예상 7h
- 단위 테스트 (각 서비스, 가드)
- 통합 테스트 (파이프라인 전체 흐름)
- 검증: 테스트 커버리지 80% 이상

#### 마일스톤 8: Follow-Up 클라이언트 UI (T25~T30) - 예상 12h
- zod 스키마, API hooks
- Follow-Up 설정 모달 (트리거, 수신자, 제목, 본문, 첨부)
- Follow-Up 목록 컴포넌트
- 권한 없음 업그레이드 안내 UI
- i18n 번역 키
- 검증: Follow-Up 설정 모달 UI 동작, 유효성 검증 확인

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|----------|----------|
| `packages/db/prisma/schema.prisma` | 수정 | FollowUpResult, Webhook(스텁), Integration(스텁) 모델 추가. Survey에 autoComplete, followUps 필드 추가. Response에 endingId 필드 추가 |
| `libs/server/pipeline/src/index.ts` | 생성 | PipelineModule export |
| `libs/server/pipeline/src/lib/pipeline.module.ts` | 생성 | PipelineModule 정의 (WebhookDispatchModule, FollowUpModule import) |
| `libs/server/pipeline/src/lib/pipeline.controller.ts` | 생성 | POST /api/pipeline/trigger 엔드포인트 |
| `libs/server/pipeline/src/lib/pipeline.service.ts` | 생성 | 이벤트별 파이프라인 오케스트레이션 로직 |
| `libs/server/pipeline/src/lib/pipeline.guard.ts` | 생성 | InternalSecretGuard (x-pipeline-secret 헤더 검증) |
| `libs/server/pipeline/src/lib/dto/trigger-pipeline.dto.ts` | 생성 | 파이프라인 트리거 DTO (class-validator) |
| `libs/server/pipeline/src/lib/types/pipeline.types.ts` | 생성 | PipelineEventType enum, PipelineTriggerInput 인터페이스 |
| `libs/server/webhook-dispatch/src/index.ts` | 생성 | WebhookDispatchModule export |
| `libs/server/webhook-dispatch/src/lib/webhook-dispatch.module.ts` | 생성 | WebhookDispatchModule 정의 |
| `libs/server/webhook-dispatch/src/lib/webhook-dispatch.service.ts` | 생성 | 웹훅 매칭, 페이로드 구성, 서명 생성, HTTP POST 발송 |
| `libs/server/webhook-dispatch/src/lib/types/webhook.types.ts` | 생성 | 웹훅 페이로드, Standard Webhooks 헤더 타입 |
| `libs/server/follow-up/src/index.ts` | 생성 | FollowUpModule export |
| `libs/server/follow-up/src/lib/follow-up.module.ts` | 생성 | FollowUpModule 정의 |
| `libs/server/follow-up/src/lib/follow-up.service.ts` | 생성 | Follow-Up 평가/발송 오케스트레이션 |
| `libs/server/follow-up/src/lib/follow-up-email.service.ts` | 생성 | Recall 태그 치환, HTML Sanitization, Storage URL 변환, 법적 고지 |
| `libs/server/follow-up/src/lib/follow-up-rate-limit.service.ts` | 생성 | DB 기반 고정 윈도우 Rate Limit (조직당 시간당 50건) |
| `libs/server/follow-up/src/lib/follow-up.controller.ts` | 생성 | Follow-Up 설정 CRUD API |
| `libs/server/follow-up/src/lib/dto/create-follow-up.dto.ts` | 생성 | Follow-Up 생성 DTO (class-validator) |
| `libs/server/follow-up/src/lib/dto/update-follow-up.dto.ts` | 생성 | Follow-Up 수정 DTO (class-validator) |
| `libs/server/follow-up/src/lib/types/follow-up.types.ts` | 생성 | Follow-Up 설정, 결과, 에러 코드 타입 |
| `libs/server/email/src/lib/email.service.ts` | 수정 | sendNotificationEmail(), sendFollowUpEmail() 메서드 추가 |
| `libs/client/follow-up/src/index.ts` | 생성 | 클라이언트 Follow-Up 라이브러리 export |
| `libs/client/follow-up/src/components/follow-up-modal.tsx` | 생성 | Follow-Up 설정 모달 (트리거/수신자/제목/본문/첨부) |
| `libs/client/follow-up/src/components/follow-up-list.tsx` | 생성 | Follow-Up 목록 (카드, 토글, 편집/삭제) |
| `libs/client/follow-up/src/components/follow-up-trigger-select.tsx` | 생성 | 트리거 타입 선택 (response/endings) |
| `libs/client/follow-up/src/components/follow-up-recipient-select.tsx` | 생성 | 수신자 5가지 소스 선택 UI |
| `libs/client/follow-up/src/components/follow-up-body-editor.tsx` | 생성 | Rich Text Editor + Recall 태그 삽입 |
| `libs/client/follow-up/src/components/follow-up-upgrade-prompt.tsx` | 생성 | 권한 없음 시 업그레이드 안내 |
| `libs/client/follow-up/src/hooks/use-follow-up.ts` | 생성 | Follow-Up CRUD React hooks |
| `libs/client/follow-up/src/api/follow-up-api.ts` | 생성 | apiFetch 기반 API 호출 래퍼 |
| `libs/client/follow-up/src/schemas/follow-up.schema.ts` | 생성 | zod 유효성 검증 스키마 |
| `libs/client/follow-up/src/types/follow-up.types.ts` | 생성 | 클라이언트용 Follow-Up 타입 |
| `apps/server/src/app/app.module.ts` | 수정 | PipelineModule, WebhookDispatchModule, FollowUpModule import 추가 |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | Follow-Up 관련 한국어 번역 키 추가 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | Follow-Up 관련 영어 번역 키 추가 |
| `.env.example` | 수정 | PIPELINE_SECRET 환경변수 추가 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 발생 확률 | 완화 전략 |
|--------|------|----------|----------|
| FS-021 Response 모델 미완성 | 파이프라인이 응답 데이터를 참조할 수 없음 | 높음 | Response 모델 최소 스텁(id, surveyId, data, finished, endingId)을 본 계획에서 함께 정의. FS-021 완성 시 확장 |
| FS-023 Webhook/Integration 모델 미완성 | 웹훅 발송, 통합 처리 불가 | 높음 | Webhook, Integration 스텁 모델을 본 계획에서 생성. FS-023 구현 시 완성 |
| FS-029 License/Feature Gating 미구현 | Follow-Up 권한 판단 불가 | 중간 | isFollowUpAllowed() 함수를 스텁으로 구현(항상 true 반환). FS-029 구현 후 실제 플랜 확인 로직으로 교체 |
| FS-028 NotificationSettings 미구현 | 알림 이메일 수신자 조회 불가 | 중간 | 알림 이메일 수신자 조회를 스텁으로 구현(owner만 반환). FS-028 구현 후 완전한 수신자 로직으로 교체 |
| Redis 미도입으로 Rate Limit 정확도 저하 | 고정 윈도우 방식으로 버스트 허용 가능 | 낮음 | DB 기반 고정 윈도우로 시작. FS-099(Redis) 도입 후 슬라이딩 윈도우로 마이그레이션 |
| Rich Text Editor 선택 부담 | 번들 사이즈 증가, 학습 비용 | 중간 | tiptap(ProseMirror 기반) 사용 권장. 이미 널리 사용되는 경량 에디터이며 React 19 호환. 대안: textarea + 마크다운 변환 |
| HTML Sanitization 우회 공격 | XSS 취약점 | 낮음 | sanitize-html 라이브러리 사용. 허용 태그/속성을 명세서 정의대로 엄격하게 제한. 정기적 보안 검토 |
| 파이프라인 실행 시간 초과 | 웹훅 5초 * N개 + 통합 처리로 전체 지연 증가 | 중간 | Promise.allSettled 병렬 실행으로 최대 지연 = max(개별 작업 시간). 향후 메시지 큐 도입으로 비동기화 |
| Follow-Up 이메일 대량 발송 남용 | 이메일 서비스 과부하, 스팸 신고 | 낮음 | 조직당 시간당 50건 Rate Limit. 향후 일일 한도 추가 고려 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 대상 | 테스트 항목 | 우선순위 |
|------|-----------|---------|
| `InternalSecretGuard` | 올바른 시크릿 통과, 잘못된 시크릿 거부, 헤더 누락 거부, 상수 시간 비교 확인 | 높음 |
| `PipelineService` | 이벤트별 분기 (created/updated/finished), 개별 작업 실패 시 다른 작업 미영향, 에러 로깅 | 높음 |
| `WebhookDispatchService` | 웹훅 매칭 로직 (triggers, surveyIds), 페이로드 구성, HMAC-SHA256 서명 생성/검증, 5초 타임아웃 | 높음 |
| `FollowUpService` | 트리거 조건 평가 (response/endings), 수신자 결정 (직접 이메일/응답 데이터 추출/ContactInfo 배열), 결과 저장 | 높음 |
| `FollowUpEmailService` | Recall 태그 치환 (존재하는 키, 미존재 키 fallback), HTML Sanitization (허용 태그, 차단 태그), Storage URL 변환 | 높음 |
| `FollowUpRateLimitService` | 제한 이내 허용, 제한 초과 거부, 시간 윈도우 경계 케이스 | 높음 |
| `autoComplete 로직` | 목표 도달 시 상태 변경, 미도달 시 건너뛰기, autoComplete null 시 건너뛰기 | 중간 |
| `Follow-Up 권한 관리` | Cloud+Custom 허용, Cloud+Free 차단, Self-hosted 항상 허용 | 중간 |

### 5.2 통합 테스트

| 테스트 시나리오 | 검증 항목 | 우선순위 |
|---------------|----------|---------|
| 파이프라인 전체 흐름 (responseFinished) | 웹훅 발송 + 알림 이메일 + Follow-Up + autoComplete가 모두 실행되는지 확인 | 높음 |
| 웹훅 발송 에러 격리 | 첫 번째 웹훅 실패 시 두 번째 웹훅이 정상 발송되는지 확인 | 높음 |
| Follow-Up CRUD API | 생성/조회/수정/삭제 전체 사이클 + 유효성 검증 실패 케이스 | 높음 |
| Follow-Up Rate Limit | 50건 초과 시 error 상태로 기록되는지 확인 | 중간 |
| autoComplete + Audit Log | 상태 변경 후 AuditLog에 기록되는지 확인 | 중간 |
| Follow-Up endings 트리거 | endingId 매칭/불일치 시 발송/skipped 처리 확인 | 중간 |

### 5.3 E2E 테스트 (해당하는 경우)

| 테스트 시나리오 | 검증 항목 | 우선순위 |
|---------------|----------|---------|
| 응답 완료 -> 파이프라인 -> Follow-Up 발송 | 응답자가 설문 완료 후 Follow-Up 이메일이 수신되는 전체 플로우 | 높음 |
| Follow-Up 설정 UI 플로우 | 모달에서 Follow-Up 생성 -> 목록에 표시 -> 편집 -> 삭제 | 높음 |
| autoComplete 플로우 | N번째 응답 완료 시 설문 상태가 completed로 변경 | 중간 |
| 권한 없음 UI | Cloud+Free 플랜에서 Follow-Up 설정 시 업그레이드 안내 표시 | 낮음 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 설명 |
|------|------|
| 동기 파이프라인 | 현재 파이프라인은 응답 처리와 동기적으로 실행된다. 웹훅/이메일 실패 시 응답 자체는 성공하지만, 파이프라인 완료까지 응답 API 지연이 발생할 수 있다 |
| DB 기반 Rate Limit | Redis 없이 DB 카운트 방식으로 구현하므로, 동시 요청이 많을 때 정확도가 떨어질 수 있다 |
| 외부 통합 스텁 | Google Sheets, Slack, Airtable, Notion 실제 연동은 FS-023 구현 후 완성 |
| 웹훅 재시도 없음 | 현재 설계에서 웹훅 발송 실패 시 재시도 로직이 없다. 단일 시도만 수행 |
| Rich Text Editor | Follow-Up 본문 에디터는 tiptap 등 추가 패키지 설치가 필요하며, 번들 사이즈에 영향 |
| Follow-Up JSON 저장 | Survey.followUps를 JSON 필드로 저장하므로, Follow-Up 개별 검색/필터링이 비효율적 (현 단계에서는 설문별 전체 조회만 필요하므로 문제없음) |

### 6.2 잠재적 향후 개선

| 항목 | 설명 |
|------|------|
| 비동기 파이프라인 | BullMQ + Redis 기반 메시지 큐로 파이프라인 실행을 비동기화하여 응답 API 지연 제거 |
| 웹훅 재시도 | 실패한 웹훅에 대해 지수 백오프 재시도 (최대 3회) 구현 |
| Redis 슬라이딩 윈도우 | DB 기반 Rate Limit을 Redis 슬라이딩 윈도우로 마이그레이션하여 정확도 향상 |
| Follow-Up 별도 테이블 | 설문당 Follow-Up 수가 증가하면 JSON에서 별도 Prisma 모델로 마이그레이션 |
| Follow-Up 이메일 추적 | 오픈율, 클릭율 추적을 위한 픽셀/리다이렉트 링크 시스템 |
| 스케줄링 발송 | Follow-Up 이메일 즉시 발송 대신 딜레이/예약 발송 기능 |
| A/B 테스트 | Follow-Up 이메일 제목/본문 A/B 테스트 기능 |
| 일일 Rate Limit | 시간당 50건 외에 일일 한도 추가로 남용 방지 강화 |

---

## 7. i18n 고려사항 (클라이언트 UI 변경)

### 7.1 추가/수정이 필요한 번역 키

```json
{
  "followUp": {
    "title": "Follow-Up Emails",
    "addNew": "Add Follow-Up",
    "editFollowUp": "Edit Follow-Up",
    "deleteFollowUp": "Delete Follow-Up",
    "deleteConfirm": "Are you sure you want to delete this follow-up?",
    "name": "Name",
    "namePlaceholder": "Enter follow-up name",
    "trigger": {
      "label": "Trigger",
      "response": "Every Response",
      "endings": "Specific Endings"
    },
    "endings": {
      "label": "Select Endings",
      "placeholder": "Choose one or more endings",
      "required": "Please select at least one ending"
    },
    "recipient": {
      "label": "Send To",
      "placeholder": "Select recipient source",
      "verifiedEmail": "Verified Email",
      "openTextQuestion": "OpenText Question",
      "contactInfoQuestion": "ContactInfo Question",
      "hiddenField": "Hidden Field",
      "teamMember": "Team Member"
    },
    "replyTo": {
      "label": "Reply-To",
      "placeholder": "Enter reply-to email address"
    },
    "subject": {
      "label": "Subject",
      "placeholder": "Enter email subject",
      "required": "Subject is required"
    },
    "body": {
      "label": "Body",
      "placeholder": "Compose your email...",
      "insertRecall": "Insert Recall Tag"
    },
    "attachResponse": {
      "label": "Attach Response Data",
      "includeVariables": "Include Variables",
      "includeHiddenFields": "Include Hidden Fields"
    },
    "enabled": "Enabled",
    "disabled": "Disabled",
    "save": "Save",
    "cancel": "Cancel",
    "upgradePlan": {
      "title": "Follow-Up Emails",
      "description": "Follow-Up Emails are available on the Custom plan. Upgrade to unlock this feature.",
      "button": "Upgrade Plan"
    },
    "validation": {
      "nameRequired": "Follow-up name is required",
      "triggerRequired": "Trigger type is required",
      "recipientRequired": "Recipient is required",
      "invalidEmail": "Invalid email address",
      "endingsRequired": "At least one ending is required for endings trigger"
    },
    "toast": {
      "created": "Follow-up created successfully",
      "updated": "Follow-up updated successfully",
      "deleted": "Follow-up deleted successfully",
      "error": "An error occurred. Please try again."
    }
  }
}
```

### 7.2 번역 관련 주의사항

- 모든 Follow-Up 설정 모달의 라벨, 플레이스홀더, 에러 메시지, 토스트 알림은 반드시 i18next로 관리한다
- 권한 없음 업그레이드 안내 메시지도 번역 키로 관리한다
- 알림 이메일 본문(서버에서 생성)은 수신자의 locale에 맞게 렌더링한다 (User.locale 참조)
- Follow-Up 이메일 본문은 Survey Owner가 직접 작성하므로 자동 번역 대상이 아니다
