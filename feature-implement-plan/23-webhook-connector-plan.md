# 기능 구현 계획: 웹훅 및 커넥터 (FS-023)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

본 명세서(FS-023)는 Inquiry 플랫폼의 **웹훅 시스템**(Standard Webhooks 프로토콜 기반)과 **외부 서비스 커넥터**(네이티브 통합 4종 + 자동화 커넥터 4종)를 정의한다. 구현 순서상 **8단계(응답 처리/자동화/분석)** 중 3번째 모듈에 해당하며, FS-021(응답 관리)과 FS-022(응답 파이프라인 코어 트리거)가 선행되어야 한다.

**핵심 기능 13개:**

| 기능 ID | 기능명 | 우선순위 | 의존 대상 |
|---------|--------|---------|----------|
| FN-040-01 | 웹훅 생성 | 높음 | Environment, Survey 모델 |
| FN-040-02 | 웹훅 조회 | 높음 | FN-040-01 |
| FN-040-03 | 웹훅 수정 | 높음 | FN-040-01 |
| FN-040-04 | 웹훅 삭제 | 높음 | FN-040-01 |
| FN-040-05 | Standard Webhooks 프로토콜 구현 | 높음 | FN-040-01, Response 이벤트 |
| FN-040-06 | 엔드포인트 테스트 | 중간 | FN-040-05 |
| FN-040-07 | Discord 웹훅 차단 | 중간 | - |
| FN-040-08 | URL 유효성 검증 | 높음 | - |
| FN-040-09 | 설문 선택 (All/Specific) | 높음 | Survey 모델 |
| FN-041-01 | Google Sheets 통합 | 중간 | OAuth 2.0, Response 이벤트 |
| FN-041-02 | Slack 통합 | 중간 | OAuth 2.0, Response 이벤트 |
| FN-041-03 | Airtable 통합 | 중간 | OAuth 2.0, Response 이벤트 |
| FN-041-04 | Notion 통합 | 중간 | OAuth 2.0, Response 이벤트 |
| FN-041-05 | 자동화 커넥터 관리 | 중간 | FN-040-01, FS-024 Management API |

### 1.2 비기능 요구사항

| 분류 | 요구사항 | 현재 상태 |
|------|---------|----------|
| 성능 | 웹훅 전송 타임아웃 5초, environmentId 인덱스 활용 조회 | 미구현 |
| 보안 | HMAC-SHA256 서명, 시크릿 1회 노출, HTTPS 필수, Discord 차단 | 미구현 |
| 가용성 | 개별 웹훅/통합 전송 실패가 다른 전송에 영향 없음 | 미구현 |
| 인증 | 네이티브 통합 OAuth 2.0, 자동화 커넥터 API Key 인증 | OAuth 미구현, API Key FS-024 스텁 |

### 1.3 명세서 내 모호한 부분 및 해석

| 번호 | 모호한 부분 | 제안 해석 |
|------|-----------|----------|
| 1 | "Integration Admin 권한"의 구체적 역할 매핑 미정의 | 현재 MembershipRole의 OWNER/ADMIN을 Integration Admin으로 매핑. MEMBER는 웹훅 조회만 가능 |
| 2 | 시크릿 "이후 조회 불가" 구현 방식 (DB 저장 형태 불명확) | 시크릿을 DB에 평문 저장하되, API 응답 시 select에서 제외. 시크릿은 서버 내부에서 서명 생성 시에만 사용. 해싱하면 서명 생성이 불가능하므로 평문 유지 필요 |
| 3 | 네이티브 통합(Google Sheets/Slack/Airtable/Notion)의 OAuth 토큰 저장 모델 미정의 | Integration 모델 신규 생성. type(google_sheets/slack/airtable/notion), config(Json), accessToken/refreshToken 저장 |
| 4 | 네이티브 통합의 "데이터 처리 옵션"(includeVariables 등) 저장 위치 미정의 | Integration.config Json 필드 내에 매핑 옵션 저장 |
| 5 | 웹훅 이벤트 발생 트리거 포인트가 어디인지 불명확 | FS-022(응답 파이프라인)에서 정의될 이벤트 시스템과 연동. 구현 시 Response 서비스에서 직접 호출하거나 NestJS EventEmitter2 기반 이벤트 버스 사용 |
| 6 | 자동화 커넥터의 API 인증 방식이 "API Key (Bearer)"라고 명시되어 있지만, FS-024 Management API와 동일한 엔드포인트인지 별도인지 불명확 | FS-024 Management API의 웹훅 관련 엔드포인트로 통합. API Key 인증 Guard를 그대로 활용하고, source 필드만 추가로 허용 |
| 7 | 네이티브 통합이 Survey 단위인지 Environment 단위인지 불명확 | 명세서 5.2 관계도에서 "Environment - Integration" 관계를 보여주지만, 데이터 처리 옵션 중 questionIds가 있으므로 Survey 단위로 설정. Integration은 Environment 단위로 OAuth 연결, IntegrationConfig는 Survey 단위로 매핑 설정 |
| 8 | 웹훅 전송 실패 시 재시도(retry) 정책 미정의 | 초기 구현에서는 재시도 없이 1회 전송 후 실패 로깅. 향후 개선 사항으로 분류 |

### 1.4 암묵적 요구사항

| 번호 | 암묵적 요구사항 | 도출 근거 |
|------|--------------|----------|
| 1 | **Webhook Prisma 모델 추가** | 명세서 5.1절 데이터 모델 정의. WebhookSource, WebhookTrigger enum 포함 |
| 2 | **Integration Prisma 모델 추가** | 네이티브 통합 4종의 OAuth 토큰 및 설정을 저장할 모델 필요 |
| 3 | **IntegrationConfig Prisma 모델 추가** | Survey별 통합 매핑 설정(데이터 처리 옵션, 대상 리소스 ID 등) |
| 4 | **이벤트 시스템(EventEmitter2) 도입** | 응답 이벤트 발생 시 웹훅/통합을 트리거하기 위한 비동기 이벤트 버스 |
| 5 | **UUID v7 생성 라이브러리** | Standard Webhooks의 webhook-id 형식이 UUID v7 |
| 6 | **서버 라이브러리 생성**: `libs/server/webhook/` | 웹훅 CRUD, 서명 생성, 전송 엔진 |
| 7 | **서버 라이브러리 생성**: `libs/server/integration/` | 네이티브 통합 4종의 OAuth 및 데이터 전송 |
| 8 | **클라이언트 라이브러리 생성**: `libs/client/webhook/` | 웹훅 관리 UI 컴포넌트, hooks, zod 스키마 |
| 9 | **클라이언트 라이브러리 생성**: `libs/client/integration/` | 통합 설정 UI 컴포넌트 |
| 10 | **i18n 번역 키 추가** | 웹훅/통합 관리 UI의 모든 라벨, 에러 메시지, 알림 텍스트 |
| 11 | **Management API 웹훅 컨트롤러** | FS-024의 Management API 모듈에 웹훅 CRUD + 테스트 엔드포인트 추가 |
| 12 | **환경변수 추가** | Google/Slack/Airtable/Notion OAuth Client ID/Secret |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
[설문 응답 이벤트 발생 (FS-021)]
    |
    EventEmitter2: response.created / response.updated / response.finished
    |
    v
[libs/server/webhook/]
    ├── webhook.module.ts              # 웹훅 NestJS 모듈
    ├── webhook.service.ts             # 웹훅 CRUD 비즈니스 로직
    ├── webhook-dispatch.service.ts    # 이벤트 수신 + 웹훅 발송 엔진
    ├── webhook-signing.service.ts     # Standard Webhooks 서명 생성
    ├── webhook-validation.util.ts     # URL 검증, Discord 차단 (순수 함수)
    ├── webhook.controller.ts          # 내부 Admin API (JWT 인증)
    ├── dto/
    │   ├── create-webhook.dto.ts
    │   ├── update-webhook.dto.ts
    │   └── test-webhook.dto.ts
    └── constants/
        └── webhook.constants.ts       # 타임아웃, 이벤트명 상수

[libs/server/integration/]
    ├── integration.module.ts          # 네이티브 통합 NestJS 모듈
    ├── integration.service.ts         # 통합 CRUD (OAuth 토큰 관리)
    ├── integration-dispatch.service.ts # responseFinished 이벤트 수신 + 통합 전송
    ├── integration.controller.ts      # OAuth 콜백 + 설정 API
    ├── providers/
    │   ├── google-sheets.provider.ts  # Google Sheets API 클라이언트
    │   ├── slack.provider.ts          # Slack API 클라이언트
    │   ├── airtable.provider.ts       # Airtable API 클라이언트
    │   └── notion.provider.ts         # Notion API 클라이언트
    ├── utils/
    │   ├── metadata-formatter.ts      # 메타데이터 문자열 변환 공통 유틸
    │   └── notion-type-converter.ts   # Notion 컬럼 타입별 값 변환
    └── dto/
        ├── create-integration.dto.ts
        └── update-integration-config.dto.ts

[libs/client/webhook/]
    ├── components/
    │   ├── webhook-list.tsx           # 웹훅 목록 테이블
    │   ├── webhook-form.tsx           # 웹훅 생성/수정 폼
    │   ├── webhook-secret-modal.tsx   # 시크릿 표시 모달
    │   ├── webhook-delete-dialog.tsx  # 삭제 확인 대화상자
    │   └── survey-selector.tsx        # All/Specific 설문 선택
    ├── hooks/
    │   ├── use-webhooks.ts            # 웹훅 CRUD hooks
    │   └── use-webhook-test.ts        # 엔드포인트 테스트 hook
    ├── schemas/
    │   └── webhook.schema.ts          # zod 검증 스키마
    └── api/
        └── webhook.api.ts             # apiFetch 기반 API 호출

[libs/client/integration/]
    ├── components/
    │   ├── integration-list.tsx       # 통합 목록 카드
    │   ├── integration-setup.tsx      # 통합 설정 UI
    │   └── data-mapping-options.tsx   # 데이터 포함 옵션 체크박스
    ├── hooks/
    │   └── use-integrations.ts
    └── api/
        └── integration.api.ts

[apps/client/src/app/[lng]/environments/[envId]/integrations/]
    ├── page.tsx                       # 통합 관리 페이지 (웹훅 + 네이티브)
    └── layout.tsx
```

**핵심 아키텍처 결정:**

1. **이벤트 기반 디커플링**: 응답 서비스(FS-021)와 웹훅/통합 시스템을 `@nestjs/event-emitter`(EventEmitter2)로 디커플링한다. 응답 서비스는 이벤트만 발행하고, 웹훅/통합 모듈이 독립적으로 구독한다.
2. **웹훅과 통합의 모듈 분리**: 웹훅(범용 HTTP POST)과 네이티브 통합(OAuth 기반 API)은 인증 방식, 데이터 처리 방식, 트리거 조건이 다르므로 별도 NestJS 모듈로 분리한다.
3. **Standard Webhooks 서명**: 서명 로직을 전용 서비스(`WebhookSigningService`)로 격리하여 테스트 용이성을 높인다.
4. **fire-and-forget 패턴**: 기존 AuditLogService와 동일하게, 웹훅/통합 전송 실패가 응답 처리 파이프라인을 차단하지 않는다. 각 전송은 독립적으로 실행되며 실패 시 로깅만 수행한다.
5. **기존 패턴 준수**: class-validator DTO, `@inquiry/` 네임스페이스, PrismaService 주입, fire-and-forget 에러 처리 패턴을 그대로 따른다.

### 2.2 데이터 모델

**신규 Prisma 스키마 추가:**

```prisma
/// 웹훅 소스 타입
enum WebhookSource {
  user
  zapier
  make
  n8n
  activepieces
}

/// 웹훅 트리거 이벤트
enum WebhookTrigger {
  responseCreated
  responseUpdated
  responseFinished
}

/// 외부 시스템으로 설문 이벤트를 전달하는 웹훅
model Webhook {
  id            String           @id @default(cuid())
  name          String?
  url           String           // HTTPS 필수
  source        WebhookSource    @default(user)
  environmentId String
  triggers      WebhookTrigger[] // PostgreSQL array 타입
  surveyIds     String[]         // 빈 배열이면 모든 설문
  secret        String?          // "whsec_" + base64(32bytes), 서명 생성 시 사용
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  environment Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)

  @@index([environmentId])
  @@map("webhooks")
}

/// 네이티브 통합 타입
enum IntegrationType {
  googleSheets
  slack
  airtable
  notion
}

/// Environment 단위 네이티브 통합 OAuth 연결
model Integration {
  id              String          @id @default(cuid())
  type            IntegrationType
  environmentId   String
  accessToken     String          // 암호화 저장 권장
  refreshToken    String?
  tokenExpiresAt  DateTime?
  config          Json?           // 통합별 추가 설정 (workspace ID 등)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  environment     Environment     @relation(fields: [environmentId], references: [id], onDelete: Cascade)
  configs         IntegrationConfig[]

  @@unique([type, environmentId])
  @@index([environmentId])
  @@map("integrations")
}

/// Survey별 통합 매핑 설정
model IntegrationConfig {
  id              String    @id @default(cuid())
  integrationId   String
  surveyId        String
  enabled         Boolean   @default(true)
  config          Json      // { spreadsheetId, sheetName, channelId, baseId, tableId, databaseId, questionIds, includeVariables, includeMetadata, includeHiddenFields, includeCreatedAt }
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  integration     Integration @relation(fields: [integrationId], references: [id], onDelete: Cascade)
  survey          Survey      @relation(fields: [surveyId], references: [id], onDelete: Cascade)

  @@unique([integrationId, surveyId])
  @@index([surveyId])
  @@map("integration_configs")
}
```

**Environment 모델에 관계 추가 (FS-006 이후):**

```prisma
model Environment {
  // ... 기존 필드 ...
  webhooks       Webhook[]
  integrations   Integration[]
}
```

**Survey 모델에 관계 추가 (FS-008 이후):**

```prisma
model Survey {
  // ... 기존 필드 ...
  integrationConfigs IntegrationConfig[]
}
```

### 2.3 API 설계

#### 2.3.1 내부 Admin API (JWT 인증 기반, Dashboard UI에서 호출)

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| POST | `/api/webhooks` | 웹훅 생성 (source=user 고정) | OWNER, ADMIN |
| GET | `/api/webhooks?environmentId={id}` | 웹훅 목록 조회 | OWNER, ADMIN, MEMBER |
| PATCH | `/api/webhooks/:webhookId` | 웹훅 수정 | OWNER, ADMIN |
| DELETE | `/api/webhooks/:webhookId` | 웹훅 삭제 | OWNER, ADMIN |
| POST | `/api/webhooks/test` | 엔드포인트 테스트 | OWNER, ADMIN |

#### 2.3.2 Management API (API Key 인증, FS-024에 통합)

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| POST | `/api/v1/management/webhooks` | 웹훅 생성 (source 지정 가능) | WRITE 이상 |
| GET | `/api/v1/management/webhooks` | 웹훅 목록 조회 | READ 이상 |
| PATCH | `/api/v1/management/webhooks/:webhookId` | 웹훅 수정 | WRITE 이상 |
| DELETE | `/api/v1/management/webhooks/:webhookId` | 웹훅 삭제 | WRITE 이상 |
| POST | `/api/v1/management/webhooks/test` | 엔드포인트 테스트 | WRITE 이상 |

#### 2.3.3 통합 Admin API (JWT 인증)

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/integrations?environmentId={id}` | 통합 목록 조회 | OWNER, ADMIN |
| GET | `/api/integrations/:type/oauth/authorize` | OAuth 인증 시작 | OWNER, ADMIN |
| GET | `/api/integrations/:type/oauth/callback` | OAuth 콜백 처리 | - |
| DELETE | `/api/integrations/:integrationId` | 통합 연결 해제 | OWNER, ADMIN |
| POST | `/api/integrations/:integrationId/configs` | Survey별 매핑 설정 생성 | OWNER, ADMIN |
| PATCH | `/api/integrations/:integrationId/configs/:configId` | 매핑 설정 수정 | OWNER, ADMIN |
| DELETE | `/api/integrations/:integrationId/configs/:configId` | 매핑 설정 삭제 | OWNER, ADMIN |

#### 2.3.4 웹훅 페이로드 형식

```json
{
  "webhookId": "clxyz...",
  "event": "responseFinished",
  "data": {
    "id": "response_...",
    "surveyId": "survey_...",
    "finished": true,
    "data": {
      "questionId1": "answer1"
    },
    "meta": {
      "source": "link",
      "url": "https://...",
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

**HTTP 헤더 (Standard Webhooks):**

```
content-type: application/json
webhook-id: 0192abc0-def0-7abc-0123-456789abcdef  (UUID v7)
webhook-timestamp: 1708473600                       (Unix timestamp 초)
webhook-signature: v1,K5oZfzN95Z3r2cgJxMH3ueKWfE0=  (secret 존재 시)
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 WebhookSigningService (서명 생성)

```typescript
// libs/server/webhook/src/lib/webhook-signing.service.ts

@Injectable()
export class WebhookSigningService {
  /**
   * Standard Webhooks 사양에 따라 HMAC-SHA256 서명을 생성한다.
   *
   * @param webhookId - UUID v7 형식의 메시지 ID
   * @param timestamp - Unix timestamp (초 단위)
   * @param body - JSON 직렬화된 페이로드 문자열
   * @param secret - "whsec_" 접두사 포함 시크릿
   * @returns "v1,{base64 서명값}" 형식의 서명 문자열
   */
  sign(webhookId: string, timestamp: number, body: string, secret: string): string {
    // 1. 시크릿에서 "whsec_" 접두사 제거 후 base64 디코딩
    const key = Buffer.from(secret.replace('whsec_', ''), 'base64');

    // 2. 서명 대상 문자열 구성
    const signaturePayload = `${webhookId}.${timestamp}.${body}`;

    // 3. HMAC-SHA256 서명 생성 + base64 인코딩
    const signature = crypto
      .createHmac('sha256', key)
      .update(signaturePayload)
      .digest('base64');

    return `v1,${signature}`;
  }

  /**
   * 웹훅 시크릿을 생성한다.
   * "whsec_" + base64(crypto.randomBytes(32)) 형식.
   */
  generateSecret(): string {
    const randomBytes = crypto.randomBytes(32);
    return `whsec_${randomBytes.toString('base64')}`;
  }
}
```

#### 2.4.2 WebhookDispatchService (이벤트 수신 + 발송)

```typescript
// libs/server/webhook/src/lib/webhook-dispatch.service.ts

@Injectable()
export class WebhookDispatchService {
  private readonly logger = new Logger(WebhookDispatchService.name);

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly signingService: WebhookSigningService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * 설문 응답 이벤트 수신 시 매칭되는 웹훅을 조회하고 발송한다.
   * fire-and-forget 패턴: 개별 전송 실패가 다른 전송에 영향을 주지 않는다.
   */
  @OnEvent('response.created')
  @OnEvent('response.updated')
  @OnEvent('response.finished')
  async handleResponseEvent(payload: ResponseEventPayload): Promise<void> {
    const trigger = this.mapEventToTrigger(payload.event);
    const webhooks = await this.findMatchingWebhooks(
      payload.environmentId,
      trigger,
      payload.surveyId,
    );

    // 각 웹훅에 대해 독립적으로 발송 (Promise.allSettled)
    await Promise.allSettled(
      webhooks.map(webhook => this.dispatchToWebhook(webhook, payload)),
    );
  }

  private async dispatchToWebhook(webhook: Webhook, payload: ResponseEventPayload): Promise<void> {
    const webhookMessageId = uuidv7();
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      webhookId: webhook.id,
      event: payload.event,
      data: payload.data,
    });

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'webhook-id': webhookMessageId,
      'webhook-timestamp': String(timestamp),
    };

    // 시크릿이 존재하면 서명 추가
    if (webhook.secret) {
      headers['webhook-signature'] = this.signingService.sign(
        webhookMessageId,
        timestamp,
        body,
        webhook.secret,
      );
    }

    try {
      await firstValueFrom(
        this.httpService.post(webhook.url, body, {
          headers,
          timeout: WEBHOOK_TIMEOUT_MS, // 5000ms
        }),
      );
    } catch (error) {
      this.logger.error(
        `웹훅 전송 실패: webhookId=${webhook.id}, url=${webhook.url}`,
        error,
      );
    }
  }
}
```

#### 2.4.3 URL 검증 유틸리티 (순수 함수)

```typescript
// libs/server/webhook/src/lib/webhook-validation.util.ts

/**
 * 웹훅 URL 유효성 검증 결과
 */
interface UrlValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 웹훅 URL의 유효성을 검증한다.
 * HTTPS 필수, 연속 슬래시 금지, TLD 2자 이상, Discord URL 차단
 */
export function validateWebhookUrl(url: string): UrlValidationResult {
  if (!url || url.trim().length === 0) {
    return { valid: false, error: 'Please enter a URL' };
  }

  // HTTPS 프로토콜 검증
  if (!url.startsWith('https://')) {
    return { valid: false, error: 'URL must use HTTPS protocol' };
  }

  // 프로토콜 이후 연속 슬래시 검증
  const pathPart = url.slice('https://'.length);
  if (pathPart.includes('//')) {
    return { valid: false, error: 'URL contains consecutive slashes' };
  }

  // TLD 2자 이상 검증
  try {
    const urlObj = new URL(url);
    const hostParts = urlObj.hostname.split('.');
    const tld = hostParts[hostParts.length - 1];
    if (!tld || tld.length < 2) {
      return { valid: false, error: 'Invalid domain format' };
    }
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Discord 웹훅 차단
  if (isDiscordWebhookUrl(url)) {
    return { valid: false, error: 'Discord webhooks are currently not supported.' };
  }

  return { valid: true };
}

/**
 * Discord 웹훅 URL 패턴 검사.
 * 패턴: https://discord.com/api/webhooks/{id}/{token}
 */
export function isDiscordWebhookUrl(url: string): boolean {
  return /^https:\/\/discord\.com\/api\/webhooks\/\d+\/.+$/.test(url);
}
```

### 2.5 기존 시스템에 대한 영향 분석

| 영향 대상 | 변경 내용 | 영향도 |
|----------|----------|--------|
| `packages/db/prisma/schema.prisma` | Webhook, Integration, IntegrationConfig 모델 + enum 추가. Environment/Survey에 관계 필드 추가 | 높음 (마이그레이션 필요) |
| `apps/server/src/app/app.module.ts` | WebhookModule, IntegrationModule import 추가 | 낮음 |
| `libs/server/response/` (FS-021) | 응답 생성/업데이트/완료 시 이벤트 발행 코드 추가 | 중간 |
| `libs/server/management-api/` (FS-024) | 웹훅 CRUD 컨트롤러 추가 | 중간 |
| `apps/client/src/app/i18n/locales/` | ko/en 번역 키 추가 | 낮음 |
| `docker-compose.yml` | 변경 없음 (추가 인프라 불필요) | 없음 |
| `.env.example` | Google/Slack/Airtable/Notion OAuth Client ID/Secret 추가 | 낮음 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

#### Phase 1: 데이터 계층 및 웹훅 코어

| No. | 태스크명 | 설명 | 의존 | 복잡도 | 예상 시간 |
|-----|---------|------|------|--------|----------|
| 1.1 | Prisma 스키마 작성 | Webhook, WebhookSource, WebhookTrigger 모델/enum 정의. Environment 관계 추가 | FS-006(Environment) | 낮음 | 1h |
| 1.2 | DB 마이그레이션 실행 | prisma migrate dev로 마이그레이션 생성 및 적용 | 1.1 | 낮음 | 0.5h |
| 1.3 | 웹훅 라이브러리 스캐폴딩 | `libs/server/webhook/` Nx 라이브러리 생성. module, service, controller 기본 구조 | - | 낮음 | 1h |
| 1.4 | URL 검증 유틸리티 구현 | `validateWebhookUrl()`, `isDiscordWebhookUrl()` 순수 함수 | - | 낮음 | 1h |
| 1.5 | URL 검증 단위 테스트 | HTTPS, 연속 슬래시, TLD, Discord 패턴별 테스트 케이스 | 1.4 | 낮음 | 1h |
| 1.6 | 웹훅 CRUD DTO 작성 | CreateWebhookDto, UpdateWebhookDto, TestWebhookDto (class-validator) | - | 낮음 | 1h |
| 1.7 | WebhookService 구현 | create, findAll, findById, update, delete 비즈니스 로직. 시크릿 자동 생성, select에서 secret 제외 | 1.1, 1.4, 1.6 | 중간 | 3h |
| 1.8 | WebhookController 구현 | 내부 Admin API 5개 엔드포인트. JWT 인증 + 역할 검증 가드 | 1.7 | 중간 | 2h |
| 1.9 | 웹훅 CRUD 통합 테스트 | 생성/조회/수정/삭제 + URL 검증 + Discord 차단 E2E 테스트 | 1.8 | 중간 | 2h |

#### Phase 2: Standard Webhooks 프로토콜 + 발송 엔진

| No. | 태스크명 | 설명 | 의존 | 복잡도 | 예상 시간 |
|-----|---------|------|------|--------|----------|
| 2.1 | uuid v7 라이브러리 설치 | `uuid` 패키지의 v7 지원 확인 또는 `uuidv7` 패키지 설치 | - | 낮음 | 0.5h |
| 2.2 | WebhookSigningService 구현 | HMAC-SHA256 서명 생성, 시크릿 생성 로직 | - | 중간 | 2h |
| 2.3 | 서명 생성 단위 테스트 | 알려진 입력값에 대한 서명 결과 검증 | 2.2 | 낮음 | 1h |
| 2.4 | EventEmitter2 설정 | `@nestjs/event-emitter` 패키지 설치, AppModule에 EventEmitterModule.forRoot() 등록 | - | 낮음 | 0.5h |
| 2.5 | 이벤트 페이로드 타입 정의 | ResponseEventPayload 인터페이스 (event, environmentId, surveyId, data) | - | 낮음 | 0.5h |
| 2.6 | WebhookDispatchService 구현 | @OnEvent 데코레이터로 이벤트 수신, 매칭 웹훅 조회, 서명 포함 HTTP POST 전송 (5초 타임아웃) | 2.1, 2.2, 2.4, 2.5, 1.7 | 높음 | 4h |
| 2.7 | HttpModule 설정 | `@nestjs/axios` 설치 및 HttpModule 설정 (기본 타임아웃 5초) | - | 낮음 | 0.5h |
| 2.8 | 엔드포인트 테스트 기능 구현 | WebhookService.testEndpoint() - 임시 시크릿 생성, testEndpoint 이벤트 전송, 2xx 판별 | 2.2, 2.7 | 중간 | 2h |
| 2.9 | 발송 엔진 통합 테스트 | Mock HTTP 서버로 서명 검증, 타임아웃 처리, 개별 실패 격리 테스트 | 2.6, 2.8 | 중간 | 3h |

#### Phase 3: Management API 통합

| No. | 태스크명 | 설명 | 의존 | 복잡도 | 예상 시간 |
|-----|---------|------|------|--------|----------|
| 3.1 | Management API 웹훅 컨트롤러 | FS-024의 management-api 모듈에 웹훅 CRUD + 테스트 엔드포인트 추가. source 필드 허용 (zapier/n8n/make/activepieces) | Phase 2, FS-024 | 중간 | 3h |
| 3.2 | Management API DTO 작성 | ManagementCreateWebhookDto (source 필드 포함), 기존 DTO 재사용 | 3.1 | 낮음 | 1h |
| 3.3 | Management API 통합 테스트 | API Key 인증 기반 웹훅 CRUD 테스트. source별 생성/조회 검증 | 3.1, 3.2 | 중간 | 2h |

#### Phase 4: 클라이언트 웹훅 관리 UI

| No. | 태스크명 | 설명 | 의존 | 복잡도 | 예상 시간 |
|-----|---------|------|------|--------|----------|
| 4.1 | 클라이언트 라이브러리 스캐폴딩 | `libs/client/webhook/` Nx 라이브러리 생성 | - | 낮음 | 0.5h |
| 4.2 | zod 스키마 작성 | webhookFormSchema (url, name, triggers, surveyIds), URL 검증 포함 | 1.4 | 낮음 | 1h |
| 4.3 | 웹훅 API 클라이언트 작성 | apiFetch 기반 CRUD + test API 호출 함수 | - | 낮음 | 1h |
| 4.4 | 웹훅 hooks 구현 | useWebhooks (목록), useCreateWebhook, useUpdateWebhook, useDeleteWebhook, useTestEndpoint | 4.3 | 중간 | 2h |
| 4.5 | WebhookForm 컴포넌트 | name, url 입력, triggers 체크박스, 설문 선택 (All/Specific), Test Endpoint 버튼, 검증 UI | 4.2, 4.4 | 높음 | 4h |
| 4.6 | WebhookSecretModal 컴포넌트 | 시크릿 읽기 전용 표시, Copy 버튼, 경고 메시지, Standard Webhooks 문서 링크 | - | 중간 | 2h |
| 4.7 | WebhookList 컴포넌트 | 웹훅 목록 테이블 (name, url, source, triggers). 수정/삭제 액션 버튼 | 4.4 | 중간 | 3h |
| 4.8 | WebhookDeleteDialog 컴포넌트 | shadcn/ui AlertDialog 기반 삭제 확인 대화상자 | 4.4 | 낮음 | 1h |
| 4.9 | SurveySelector 컴포넌트 | All Surveys / Specific Surveys 라디오 + 설문 체크박스 목록 | - | 중간 | 2h |
| 4.10 | 통합 관리 페이지 조립 | `apps/client/src/app/[lng]/environments/[envId]/integrations/page.tsx` 라우트 생성 | 4.5~4.9 | 중간 | 2h |
| 4.11 | i18n 번역 키 추가 | ko/en 번역 파일에 웹훅 관련 키 추가 | 4.10 | 낮음 | 1h |

#### Phase 5: 네이티브 통합 (중간 우선순위)

| No. | 태스크명 | 설명 | 의존 | 복잡도 | 예상 시간 |
|-----|---------|------|------|--------|----------|
| 5.1 | Integration/IntegrationConfig Prisma 스키마 | IntegrationType enum, Integration, IntegrationConfig 모델 추가 | FS-006, FS-008 | 낮음 | 1h |
| 5.2 | Integration 라이브러리 스캐폴딩 | `libs/server/integration/` Nx 라이브러리 생성 | - | 낮음 | 1h |
| 5.3 | 메타데이터 포매터 유틸 | 공통 메타데이터 문자열 변환 함수 (Source, URL, Browser... 줄바꿈 구분) | - | 낮음 | 1h |
| 5.4 | IntegrationService 구현 | OAuth 토큰 CRUD, 토큰 갱신 로직 | 5.1 | 중간 | 3h |
| 5.5 | Google Sheets Provider 구현 | Google Sheets API v4 연동: 행 추가 로직, OAuth 2.0 연결 | 5.4 | 높음 | 4h |
| 5.6 | Slack Provider 구현 | Slack Web API 연동: 채널 메시지 전송, OAuth 2.0 연결 | 5.4 | 중간 | 3h |
| 5.7 | Airtable Provider 구현 | Airtable API 연동: 레코드 추가, OAuth 2.0 연결 | 5.4 | 중간 | 3h |
| 5.8 | Notion Provider 구현 | Notion API 연동: 페이지 추가, 7가지 타입 변환 로직 | 5.4 | 높음 | 5h |
| 5.9 | Notion 타입 변환 유틸 | select, multi_select, title, rich_text, checkbox, date, number 변환 | - | 중간 | 2h |
| 5.10 | IntegrationDispatchService | @OnEvent('response.finished') 수신, 매칭 통합 조회, Provider별 전송 | 5.5~5.8, 2.4 | 높음 | 4h |
| 5.11 | IntegrationController | OAuth authorize/callback, 통합 CRUD, config CRUD API | 5.4 | 중간 | 3h |
| 5.12 | 통합 클라이언트 UI | 통합 카드 목록, OAuth 연결 버튼, 데이터 매핑 설정 UI | 5.11 | 높음 | 6h |
| 5.13 | 네이티브 통합 테스트 | Provider별 Mock 테스트, OAuth 플로우 테스트 | 5.5~5.10 | 중간 | 4h |

### 3.2 구현 순서 및 마일스톤

```
마일스톤 1: 웹훅 데이터 계층 + CRUD (Phase 1)
  ├── Task 1.1~1.2: Prisma 스키마 + 마이그레이션
  ├── Task 1.3~1.6: 라이브러리 스캐폴딩 + DTO + 검증 유틸
  ├── Task 1.7~1.8: Service + Controller
  └── Task 1.9: 통합 테스트
  [검증 포인트] 웹훅 CRUD API 동작 확인, URL 검증 + Discord 차단 동작

마일스톤 2: Standard Webhooks 발송 엔진 (Phase 2)
  ├── Task 2.1~2.3: UUID v7 + 서명 서비스 + 테스트
  ├── Task 2.4~2.7: 이벤트 시스템 + 발송 서비스 + HTTP 설정
  ├── Task 2.8: 엔드포인트 테스트 기능
  └── Task 2.9: 통합 테스트
  [검증 포인트] 이벤트 발생 시 매칭 웹훅 발송, 서명 검증, 5초 타임아웃, 개별 실패 격리

마일스톤 3: Management API 통합 (Phase 3)
  ├── Task 3.1~3.2: 컨트롤러 + DTO
  └── Task 3.3: 통합 테스트
  [검증 포인트] API Key 인증으로 웹훅 CRUD, source 필드별 자동화 커넥터 등록

마일스톤 4: 클라이언트 웹훅 관리 UI (Phase 4)
  ├── Task 4.1~4.4: 라이브러리 + 스키마 + API + hooks
  ├── Task 4.5~4.9: UI 컴포넌트 (폼, 모달, 목록, 삭제, 설문 선택)
  ├── Task 4.10: 페이지 조립
  └── Task 4.11: i18n
  [검증 포인트] 웹훅 생성/수정/삭제 UI 동작, 시크릿 모달, 테스트 엔드포인트

마일스톤 5: 네이티브 통합 4종 (Phase 5)
  ├── Task 5.1~5.4: 스키마 + 라이브러리 + 서비스
  ├── Task 5.5~5.10: Provider 4종 + 발송 서비스
  ├── Task 5.11~5.12: API + UI
  └── Task 5.13: 테스트
  [검증 포인트] Google Sheets/Slack/Airtable/Notion에 responseFinished 데이터 전송
```

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|----------|----------|----------|
| `packages/db/prisma/schema.prisma` | 수정 | WebhookSource, WebhookTrigger, IntegrationType enum 추가. Webhook, Integration, IntegrationConfig 모델 추가. Environment/Survey 관계 필드 추가 |
| `libs/server/webhook/src/index.ts` | 생성 | 웹훅 모듈 public API export |
| `libs/server/webhook/src/lib/webhook.module.ts` | 생성 | WebhookModule 정의 (HttpModule, EventEmitterModule 의존) |
| `libs/server/webhook/src/lib/webhook.service.ts` | 생성 | 웹훅 CRUD 비즈니스 로직, 시크릿 자동 생성 |
| `libs/server/webhook/src/lib/webhook-dispatch.service.ts` | 생성 | 이벤트 수신, 매칭 웹훅 조회, Standard Webhooks 발송 |
| `libs/server/webhook/src/lib/webhook-signing.service.ts` | 생성 | HMAC-SHA256 서명 생성, 시크릿 생성 |
| `libs/server/webhook/src/lib/webhook-validation.util.ts` | 생성 | URL 검증, Discord 차단 순수 함수 |
| `libs/server/webhook/src/lib/webhook.controller.ts` | 생성 | 내부 Admin API (JWT 인증) 5개 엔드포인트 |
| `libs/server/webhook/src/lib/dto/create-webhook.dto.ts` | 생성 | 웹훅 생성 DTO (class-validator) |
| `libs/server/webhook/src/lib/dto/update-webhook.dto.ts` | 생성 | 웹훅 수정 DTO (class-validator) |
| `libs/server/webhook/src/lib/dto/test-webhook.dto.ts` | 생성 | 엔드포인트 테스트 DTO |
| `libs/server/webhook/src/lib/constants/webhook.constants.ts` | 생성 | 타임아웃(5000ms), 이벤트명, 시크릿 접두사 상수 |
| `libs/server/webhook/src/lib/interfaces/response-event.interface.ts` | 생성 | ResponseEventPayload 타입 정의 |
| `libs/server/integration/src/index.ts` | 생성 | 통합 모듈 public API export |
| `libs/server/integration/src/lib/integration.module.ts` | 생성 | IntegrationModule 정의 |
| `libs/server/integration/src/lib/integration.service.ts` | 생성 | 통합 CRUD + OAuth 토큰 관리 |
| `libs/server/integration/src/lib/integration-dispatch.service.ts` | 생성 | responseFinished 이벤트 수신, 통합별 전송 |
| `libs/server/integration/src/lib/integration.controller.ts` | 생성 | OAuth authorize/callback + 설정 API |
| `libs/server/integration/src/lib/providers/google-sheets.provider.ts` | 생성 | Google Sheets API 행 추가 |
| `libs/server/integration/src/lib/providers/slack.provider.ts` | 생성 | Slack API 채널 메시지 전송 |
| `libs/server/integration/src/lib/providers/airtable.provider.ts` | 생성 | Airtable API 레코드 추가 |
| `libs/server/integration/src/lib/providers/notion.provider.ts` | 생성 | Notion API 페이지 추가 |
| `libs/server/integration/src/lib/utils/metadata-formatter.ts` | 생성 | 메타데이터 문자열 변환 공통 유틸 |
| `libs/server/integration/src/lib/utils/notion-type-converter.ts` | 생성 | Notion 컬럼 타입별 값 변환 (7가지 타입) |
| `libs/server/integration/src/lib/dto/create-integration.dto.ts` | 생성 | 통합 생성 DTO |
| `libs/server/integration/src/lib/dto/update-integration-config.dto.ts` | 생성 | 매핑 설정 수정 DTO |
| `libs/client/webhook/src/index.ts` | 생성 | 웹훅 클라이언트 라이브러리 export |
| `libs/client/webhook/src/lib/components/webhook-list.tsx` | 생성 | 웹훅 목록 테이블 컴포넌트 |
| `libs/client/webhook/src/lib/components/webhook-form.tsx` | 생성 | 웹훅 생성/수정 폼 |
| `libs/client/webhook/src/lib/components/webhook-secret-modal.tsx` | 생성 | 시크릿 표시 모달 |
| `libs/client/webhook/src/lib/components/webhook-delete-dialog.tsx` | 생성 | 삭제 확인 대화상자 |
| `libs/client/webhook/src/lib/components/survey-selector.tsx` | 생성 | All/Specific 설문 선택 컴포넌트 |
| `libs/client/webhook/src/lib/hooks/use-webhooks.ts` | 생성 | 웹훅 CRUD React hooks |
| `libs/client/webhook/src/lib/hooks/use-webhook-test.ts` | 생성 | 엔드포인트 테스트 hook |
| `libs/client/webhook/src/lib/schemas/webhook.schema.ts` | 생성 | zod 검증 스키마 |
| `libs/client/webhook/src/lib/api/webhook.api.ts` | 생성 | apiFetch 기반 API 호출 |
| `libs/client/integration/src/index.ts` | 생성 | 통합 클라이언트 라이브러리 export |
| `libs/client/integration/src/lib/components/integration-list.tsx` | 생성 | 통합 목록 카드 컴포넌트 |
| `libs/client/integration/src/lib/components/integration-setup.tsx` | 생성 | 통합 설정 UI |
| `libs/client/integration/src/lib/components/data-mapping-options.tsx` | 생성 | 데이터 포함 옵션 체크박스 |
| `libs/client/integration/src/lib/hooks/use-integrations.ts` | 생성 | 통합 CRUD hooks |
| `libs/client/integration/src/lib/api/integration.api.ts` | 생성 | apiFetch 기반 통합 API 호출 |
| `apps/client/src/app/[lng]/environments/[envId]/integrations/page.tsx` | 생성 | 통합 관리 페이지 |
| `apps/client/src/app/[lng]/environments/[envId]/integrations/layout.tsx` | 생성 | 통합 관리 레이아웃 |
| `apps/server/src/app/app.module.ts` | 수정 | WebhookModule, IntegrationModule, EventEmitterModule import 추가 |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | 웹훅/통합 관련 한국어 번역 키 추가 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | 웹훅/통합 관련 영어 번역 키 추가 |
| `.env.example` | 수정 | GOOGLE_SHEETS_CLIENT_ID/SECRET, SLACK_CLIENT_ID/SECRET, AIRTABLE_CLIENT_ID/SECRET, NOTION_CLIENT_ID/SECRET 추가 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 확률 | 완화 전략 |
|--------|------|------|----------|
| FS-021(Response) 모델이 미구현되어 이벤트 페이로드 구조 불확실 | 높음 | 높음 | ResponseEventPayload 인터페이스를 추상화하여 정의하고, FS-021 구현 시 구체 타입으로 교체. 웹훅 발송 엔진은 `data: unknown` 형태로 범용 처리 |
| FS-024(Management API) API Key 인증 인프라 미구현 | 중간 | 높음 | Phase 3(Management API 통합)은 FS-024 완료 이후에 진행. 웹훅 코어(Phase 1~2)는 JWT 인증 기반 내부 API로 먼저 구현 |
| 외부 OAuth API (Google/Slack/Airtable/Notion) 연동 복잡성 | 높음 | 중간 | 각 Provider를 독립 클래스로 격리하여 단위 테스트 가능하게 설계. OAuth 플로우는 환경변수 미설정 시 graceful degradation (no-op) 패턴 적용 |
| 웹훅 전송 시 외부 서버 응답 지연으로 인한 파이프라인 지연 | 중간 | 중간 | fire-and-forget 패턴 + 5초 타임아웃 엄격 적용. Promise.allSettled로 개별 실패 격리 |
| Notion API 타입 변환 엣지 케이스 | 낮음 | 중간 | 변환 실패 시 해당 필드를 빈 값으로 처리하고 경고 로깅. 7가지 타입에 대한 충분한 단위 테스트 작성 |
| Environment/Survey 모델이 아직 미구현 | 높음 | 높음 | 스텁 모델 기반으로 개발하되, FK 관계는 코드 레벨에서 검증. FS-006(Project/Environment) 완료 후 실제 관계 연결 |
| 시크릿 평문 저장의 보안 위험 | 중간 | 낮음 | 시크릿은 서명 생성에 원문이 필요하므로 해싱 불가. DB 접근 제어 + API 응답에서 select 제외로 노출 최소화. 향후 환경 수준 암호화(TDE) 또는 시크릿 매니저 연동 검토 |
| 동시 이벤트 대량 발생 시 웹훅 전송 과부하 | 중간 | 낮음 | 초기 구현은 동기 전송. 대량 트래픽 시 Bull/BullMQ 기반 큐 도입으로 전환. 이를 위해 dispatch 인터페이스를 추상화해 둠 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 테스트 대상 | 테스트 내용 | 파일 경로 |
|------------|-----------|----------|
| `validateWebhookUrl()` | HTTPS 검증, 연속 슬래시 검증, TLD 검증, Discord 차단, 빈 URL, 유효 URL | `libs/server/webhook/src/lib/__tests__/webhook-validation.util.spec.ts` |
| `isDiscordWebhookUrl()` | Discord 패턴 매칭 (정상/비정상 URL) | 상동 |
| `WebhookSigningService.sign()` | 알려진 입력에 대한 HMAC-SHA256 서명 결과 검증, "whsec_" 접두사 처리 | `libs/server/webhook/src/lib/__tests__/webhook-signing.service.spec.ts` |
| `WebhookSigningService.generateSecret()` | "whsec_" 접두사, base64 형식, 32바이트 길이 | 상동 |
| `WebhookService.create()` | 시크릿 자동 생성 확인, source "user" 고정, URL 검증 호출 | `libs/server/webhook/src/lib/__tests__/webhook.service.spec.ts` |
| `WebhookService.findAll()` | environmentId 필터, secret 제외, createdAt DESC 정렬 | 상동 |
| `metadataFormatter()` | 메타데이터 항목 줄바꿈 구분 문자열 변환 | `libs/server/integration/src/lib/utils/__tests__/metadata-formatter.spec.ts` |
| `notionTypeConverter()` | 7가지 Notion 타입별 변환 (select, multi_select, title, rich_text, checkbox, date, number) | `libs/server/integration/src/lib/utils/__tests__/notion-type-converter.spec.ts` |
| zod 스키마 | webhookFormSchema의 URL 검증, triggers 최소 1개, surveyIds 조건부 필수 | `libs/client/webhook/src/lib/schemas/__tests__/webhook.schema.spec.ts` |

### 5.2 통합 테스트

| 테스트 시나리오 | 검증 내용 |
|---------------|----------|
| 웹훅 생성 + 시크릿 반환 | POST /api/webhooks -> 201, 응답에 secret 포함. 이후 GET 조회 시 secret 미포함 |
| 웹훅 URL 검증 실패 | HTTP URL, 연속 슬래시 URL, 짧은 TLD URL -> 400 에러 |
| Discord URL 차단 | discord.com/api/webhooks 패턴 URL -> 400 "Discord webhooks are currently not supported." |
| 웹훅 수정 (source 변경 불가) | PATCH 요청에 source 포함 시 무시 또는 400 반환 |
| 웹훅 삭제 | DELETE 후 GET 조회 시 목록에서 제거됨 |
| 엔드포인트 테스트 (성공) | Mock 서버 2xx 응답 -> success: true |
| 엔드포인트 테스트 (타임아웃) | Mock 서버 6초 지연 -> 타임아웃 에러 |
| 이벤트 기반 웹훅 발송 | EventEmitter로 response.finished 발행 -> 매칭 웹훅 HTTP POST 전송, 서명 헤더 포함 |
| 개별 웹훅 실패 격리 | 2개 웹훅 중 1개 실패 -> 나머지 1개 정상 전송 |
| Management API 자동화 커넥터 | API Key 인증 + source: "zapier" 웹훅 생성 -> 성공 |
| surveyIds 필터링 | surveyIds에 특정 설문 ID 포함 -> 해당 설문 이벤트만 발송 |

### 5.3 E2E 테스트 (해당 시)

| 시나리오 | 검증 내용 |
|---------|----------|
| 전체 흐름: 웹훅 생성 -> 설문 응답 -> 웹훅 수신 | 1. 웹훅 생성 (시크릿 확인) 2. 설문 응답 제출 3. Mock 서버에서 웹훅 페이로드 + 서명 검증 |
| UI 흐름: 웹훅 폼 -> 생성 -> 시크릿 모달 -> 목록 확인 | Playwright/Cypress로 UI 인터랙션 검증 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 제약 내용 |
|------|----------|
| 재시도 없음 | 웹훅 전송 실패 시 재시도하지 않는다. 1회 전송 후 실패 로깅만 수행 |
| 큐 미사용 | 웹훅 발송을 동기적으로 처리한다. 대량 트래픽 시 지연 가능 |
| 시크릿 평문 저장 | HMAC 서명을 위해 시크릿 원문이 필요하므로 DB에 평문 저장. API 레벨에서만 노출 방지 |
| OAuth 토큰 평문 저장 | 네이티브 통합 OAuth 토큰도 DB에 평문 저장. 추후 암호화 적용 필요 |
| 배포 로그/이력 없음 | 웹훅 전송 성공/실패 이력을 별도 테이블에 저장하지 않음. Logger 출력만 존재 |
| 네이티브 통합 4종만 지원 | Google Sheets, Slack, Airtable, Notion만 초기 지원. 추가 통합은 Provider 패턴으로 확장 가능 |
| 웹훅 전송 타임아웃 고정 | 5초 타임아웃이 상수로 고정되어 있음. 설정 변경 불가 |

### 6.2 향후 개선 가능사항

| 항목 | 개선 내용 |
|------|----------|
| 웹훅 전송 큐 도입 | Bull/BullMQ 기반 비동기 큐로 전환하여 대량 이벤트 처리 및 재시도(exponential backoff) 지원 |
| 웹훅 전송 이력 저장 | WebhookDelivery 모델 추가 (status, responseCode, responseBody, latency, createdAt) |
| 시크릿 암호화 저장 | AES-256-GCM으로 시크릿 암호화 후 DB 저장. 서명 생성 시 복호화하여 사용 |
| 웹훅 비활성화 토글 | enabled 필드 추가로 웹훅을 삭제하지 않고 비활성화 |
| 자동 비활성화 | 연속 N회 실패 시 웹훅 자동 비활성화 + 관리자 알림 |
| Rate Limiting 차별화 | 웹훅 전송 빈도를 소스별/플랜별로 차별화 |
| 추가 네이티브 통합 | HubSpot, Salesforce, Microsoft Teams 등 추가 Provider 구현 |
| 커스텀 헤더 지원 | 웹훅 생성 시 사용자 정의 HTTP 헤더 추가 기능 |

---

## 7. i18n 고려사항 (클라이언트 UI 변경)

### 7.1 추가/수정 필요 번역 키

```json
{
  "webhook": {
    "title": "웹훅 관리",
    "add_webhook": "웹훅 추가",
    "edit_webhook": "웹훅 수정",
    "delete_webhook": "웹훅 삭제",
    "delete_confirm": "이 웹훅을 삭제하시겠습니까? 삭제 후에는 이벤트가 전송되지 않습니다.",
    "delete_success": "웹훅이 삭제되었습니다.",
    "create_success": "웹훅이 생성되었습니다.",
    "update_success": "웹훅이 수정되었습니다.",
    "name_label": "이름",
    "name_placeholder": "웹훅 이름 (선택)",
    "url_label": "URL",
    "url_placeholder": "https://example.com/webhook",
    "url_required": "URL을 입력해주세요.",
    "url_invalid_https": "HTTPS 프로토콜이 필요합니다.",
    "url_invalid_slashes": "URL에 연속 슬래시가 포함되어 있습니다.",
    "url_invalid_domain": "유효하지 않은 도메인 형식입니다.",
    "url_discord_blocked": "Discord 웹훅은 현재 지원되지 않습니다.",
    "triggers_label": "트리거 이벤트",
    "trigger_response_created": "응답 생성",
    "trigger_response_updated": "응답 업데이트",
    "trigger_response_finished": "응답 완료",
    "triggers_required": "1개 이상의 트리거를 선택해주세요.",
    "survey_scope_label": "설문 범위",
    "survey_scope_all": "모든 설문",
    "survey_scope_specific": "특정 설문",
    "test_endpoint": "엔드포인트 테스트",
    "test_success": "엔드포인트 연결에 성공했습니다.",
    "test_failed": "엔드포인트 연결에 실패했습니다.",
    "test_timeout": "엔드포인트가 5초 이내에 응답하지 않았습니다.",
    "secret_modal_title": "웹훅 시크릿",
    "secret_modal_warning": "지금 복사하지 않으면 다시 확인할 수 없습니다.",
    "secret_modal_copy": "복사",
    "secret_modal_copied": "복사되었습니다",
    "secret_modal_docs": "Standard Webhooks 문서 보기",
    "source_user": "사용자",
    "source_zapier": "Zapier",
    "source_make": "Make",
    "source_n8n": "n8n",
    "source_activepieces": "ActivePieces",
    "empty_list": "등록된 웹훅이 없습니다.",
    "empty_list_description": "외부 시스템으로 설문 이벤트를 전달하려면 웹훅을 추가하세요.",
    "list_name": "이름",
    "list_url": "URL",
    "list_source": "소스",
    "list_triggers": "트리거",
    "list_actions": "작업"
  },
  "integration": {
    "title": "외부 서비스 통합",
    "google_sheets": "Google Sheets",
    "slack": "Slack",
    "airtable": "Airtable",
    "notion": "Notion",
    "connect": "연결",
    "disconnect": "연결 해제",
    "connected": "연결됨",
    "not_connected": "연결되지 않음",
    "data_options_title": "데이터 포함 옵션",
    "include_variables": "설문 변수 포함",
    "include_metadata": "응답 메타데이터 포함",
    "include_hidden_fields": "히든 필드 포함",
    "include_created_at": "응답 생성 시간 포함",
    "select_questions": "포함할 질문 선택",
    "select_target": "대상 리소스 선택",
    "save_config": "설정 저장",
    "config_saved": "설정이 저장되었습니다.",
    "oauth_error": "인증에 실패했습니다. 다시 시도해주세요."
  }
}
```

### 7.2 번역 키 영어 대응

위 JSON 구조의 영어 번역도 `en/translation.json`에 동일한 키 구조로 추가한다. 영문 키 값은 명세서의 에러 메시지("Please enter a URL", "Discord webhooks are currently not supported." 등)를 그대로 사용한다.
