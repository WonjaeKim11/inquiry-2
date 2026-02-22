# 기능 구현 계획: 응답 알림(Notification) (FS-028)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 우선순위 | 설명 |
|---------|--------|---------|------|
| FN-028-01 | 알림 설정 데이터 모델 | 높음 | User 모델의 JSON 필드(notificationSettings)에 alert 레코드 + unsubscribedOrganizationIds 저장 |
| FN-028-02 | 알림 설정 페이지 | 높음 | Organization 단위 자동 구독 토글 + 설문별 알림 토글 관리 페이지. Production 환경 설문만 표시, 역할 기반 접근 제어 |
| FN-028-03 | 알림 스위치 컴포넌트 | 높음 | 설문별 응답 알림 토글 + Organization 자동 구독 토글. 낙관적 업데이트, 에러 시 롤백, URL 파라미터 자동 해제 |
| FN-028-04 | 설문 생성 시 자동 구독 | 높음 | 설문 생성자가 자동으로 해당 설문 알림에 구독. unsubscribedOrganizationIds에 해당 Org가 포함되면 건너뜀 |
| FN-028-05 | 알림 이메일 발송 | 높음 | responseFinished 이벤트 시 적격 수신자에게 이메일 병렬 발송. locale별 언어, 응답 수, 구독 해제 링크 포함 |
| FN-028-06 | 구독 해제 | 중간 | 이메일 내 Unsubscribe 링크 클릭 시 알림 설정 페이지로 리다이렉트 + 해당 설문 자동 비활성화 |

### 1.2 비기능 요구사항

| NFR ID | 항목 | 요구사항 |
|--------|------|---------|
| NFR-N01 | 에러 격리 | 개별 이메일 발송 실패가 다른 수신자의 알림 발송에 영향 없음 (Promise.allSettled) |
| NFR-N02 | 병렬 처리 | 알림 수신자 조회와 이메일 발송을 병렬로 처리 |
| NFR-N03 | Pipeline 인증 | Pipeline API는 CRON_SECRET 환경변수 기반 내부 인증 필수 |
| NFR-N04 | 이메일 국제화 | 이메일이 수신자의 locale 설정에 맞는 언어로 발송 |
| NFR-N05 | 레거시 호환 | 레거시 알림 설정 형식을 현재 형식으로 올바르게 변환 |

### 1.3 명세서 내 모호성 및 해석

| 항목 | 모호성 | 해석/결정 |
|------|--------|----------|
| 역할 모델 불일치 | 명세서: owner/manager/member/billing 4개 역할. 실제 Prisma: OWNER/ADMIN/MEMBER 3개 역할 | OWNER = owner, ADMIN = manager로 매핑. billing 역할은 현재 미구현이므로 BILLING 역할 추가가 필요하지만, FS-029(구독/빌링) 선행 시 추가될 예정이므로 이번 구현에서는 OWNER/ADMIN은 전체 프로젝트 접근, MEMBER는 팀 기반 접근으로 처리. billing 제한은 BILLING 역할 추가 후 통합 |
| 팀(Team) 모델 미존재 | "팀을 통해 배정된 프로젝트"라는 조건이 있으나 현재 Team 모델이 미구현 | Team 모델이 구현될 때까지 MEMBER 역할은 소속 Organization의 모든 프로젝트에 접근 가능하도록 임시 처리. Team 기반 프로젝트 필터링은 TODO 주석으로 남김 |
| Project/Environment/Survey 모델 미존재 | 현재 Prisma 스키마에 Project, Environment, Survey 모델이 없음 | FS-006(프로젝트/환경), FS-008(설문) 선행 구현이 필요. 본 계획에서는 이 모델들이 존재한다고 가정하고 설계하되, 스텁 인터페이스를 정의하여 선행 모듈 없이도 컴파일 가능하도록 함 |
| Pipeline API 위치 | Pipeline이 같은 NestJS 서버 내부 모듈인지 별도 마이크로서비스인지 불명확 | 동일 NestJS 서버 내 별도 모듈로 구현. 내부 HTTP 호출이 아닌 직접 서비스 호출로 처리. CRON_SECRET 가드는 외부 호출 방어용으로 컨트롤러 레벨에만 적용 |
| 레거시 알림 형식 | 레거시 형식의 구체적 구조가 명시되지 않음 | 신규 프로젝트이므로 레거시 데이터가 실제로 존재하지 않음. 변환 함수를 만들되, 현재는 단순 null/undefined 핸들링만 구현. 향후 실제 레거시 형식이 확인되면 확장 |
| 알림 설정 페이지 라우트 | URL 경로가 명시되지 않음 | `/[lng]/settings/notifications` 경로로 설정. Organization 선택은 쿼리 파라미터 `?orgId=xxx`로 처리 |
| 이메일 템플릿 | 알림 이메일의 구체적 디자인/내용이 명시되지 않음 | 기존 EmailService 패턴을 따라 HTML 인라인 스타일 템플릿 사용. 설문명, 응답 수, 구독 해제 링크를 포함하는 간단한 레이아웃 |

### 1.4 암시적 요구사항

| 항목 | 설명 |
|------|------|
| Prisma 스키마 변경 | User 모델에 `notificationSettings Json?` 필드 추가 |
| 환경변수 추가 | `CRON_SECRET` (Pipeline 내부 인증용) |
| 서버 라이브러리 생성 | `libs/server/notification/` NestJS 모듈 (NotificationModule, NotificationService, NotificationController) |
| 클라이언트 라이브러리 생성 | `libs/client/notification/` (알림 설정 페이지 컴포넌트, 훅, API) |
| Pipeline 모듈 기반 구조 | `libs/server/pipeline/` 또는 NotificationService 내부에 Pipeline 알림 트리거 로직 포함 |
| 이메일 템플릿 | locale별 응답 알림 이메일 HTML 템플릿 (ko, en) |
| i18n 번역 키 추가 | 알림 설정 UI 관련 모든 라벨, 빈 상태 메시지, 에러 메시지 번역 |
| CronSecret Guard | Pipeline API 보호를 위한 NestJS 커스텀 가드 |
| Survey 생성 훅 | 설문 생성 시 자동 구독 처리를 위해 Survey 서비스에 이벤트/훅 연동 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
[서버 아키텍처]

libs/server/notification/
├── src/
│   ├── index.ts                                # 퍼블릭 API 엑스포트
│   └── lib/
│       ├── notification.module.ts              # NestJS 모듈
│       ├── notification.controller.ts          # 사용자향 알림 설정 CRUD API (JWT 인증)
│       ├── notification-pipeline.controller.ts # Pipeline 알림 트리거 API (CRON_SECRET 인증)
│       ├── notification.service.ts             # 알림 설정 조회/갱신 비즈니스 로직
│       ├── notification-email.service.ts       # 알림 이메일 발송 로직 (수신자 조회, 이메일 생성, 병렬 발송)
│       ├── notification.types.ts               # NotificationSettings 인터페이스, 관련 타입
│       ├── dto/
│       │   ├── update-notification-settings.dto.ts  # 설정 갱신 DTO (class-validator)
│       │   ├── toggle-survey-alert.dto.ts           # 설문별 토글 DTO
│       │   ├── toggle-auto-subscribe.dto.ts         # 자동 구독 토글 DTO
│       │   └── pipeline-notification.dto.ts         # Pipeline 이벤트 수신 DTO
│       └── guards/
│           └── cron-secret.guard.ts            # CRON_SECRET 기반 내부 인증 가드

[클라이언트 아키텍처]

libs/client/notification/
├── src/
│   ├── index.ts                          # 퍼블릭 API 엑스포트
│   └── lib/
│       ├── notification-settings-page.tsx # 알림 설정 메인 페이지 컴포넌트
│       ├── survey-alert-switch.tsx        # 설문별 알림 토글 스위치
│       ├── auto-subscribe-switch.tsx      # Organization 자동 구독 토글
│       ├── notification-api.ts            # 서버 API 호출 래퍼 함수
│       ├── notification-schemas.ts        # zod 유효성 검증 스키마
│       └── use-notification-settings.ts   # 알림 설정 조회/갱신 커스텀 훅

[페이지 라우트]

apps/client/src/app/[lng]/settings/notifications/
├── page.tsx                              # 알림 설정 페이지
└── layout.tsx                            # (선택) 설정 레이아웃 공유

[데이터 흐름]

1. 알림 설정 변경:
   [UI 토글 클릭] -> [낙관적 UI 업데이트] -> [API 호출] -> [DB 갱신]
                                                  실패 시 -> [UI 롤백]

2. 설문 생성 시 자동 구독:
   [설문 생성 API] -> [SurveyService.create()] -> [NotificationService.autoSubscribe()]
                                                    -> [User.notificationSettings 갱신]

3. 응답 완료 알림:
   [응답 완료] -> [Pipeline API 호출] -> [CRON_SECRET 검증]
              -> [NotificationEmailService.sendResponseNotification()]
                 -> [적격 수신자 조회] -> [이메일 병렬 발송 (Promise.allSettled)]

4. 구독 해제:
   [이메일 Unsubscribe 링크] -> [알림 설정 페이지 + ?surveyId=xxx&unsubscribe=true]
                              -> [자동 해제 API 호출] -> [alert[surveyId] = false]
```

### 2.2 데이터 모델

#### Prisma 스키마 변경

```prisma
// User 모델에 필드 추가
model User {
  // ... 기존 필드들 ...
  notificationSettings Json?  // NotificationSettings JSON 구조
}
```

#### NotificationSettings 타입 정의

```typescript
/** 사용자의 알림 설정 JSON 구조 */
interface NotificationSettings {
  /** 설문 ID -> 알림 활성화 여부 매핑 */
  alert: Record<string, boolean>;
  /** 자동 구독을 해제한 Organization ID 배열 */
  unsubscribedOrganizationIds: string[];
}

/** 알림 설정의 기본값 (notificationSettings가 null인 경우) */
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  alert: {},
  unsubscribedOrganizationIds: [],
};
```

#### 관련 모델 의존성 (선행 구현 필요)

```
Organization (구현됨)
  └── Membership (구현됨) -> role: OWNER | ADMIN | MEMBER
  └── Project (미구현, FS-006)
       └── Environment (미구현, FS-006) -> type: production | development
            └── Survey (미구현, FS-008) -> name, status, createdBy
                 └── Response (미구현, FS-021) -> finished, surveyId
```

### 2.3 API 설계

#### 2.3.1 알림 설정 조회 API

```
GET /api/notification/settings
Headers: Authorization: Bearer <accessToken>
Query: ?organizationId=<orgId>

Response 200:
{
  "alert": { "survey_id_1": true, "survey_id_2": false },
  "unsubscribedOrganizationIds": ["org_id_1"],
  "surveys": [
    {
      "id": "survey_id_1",
      "name": "고객 만족도 조사",
      "status": "inProgress",
      "projectName": "마케팅 프로젝트"
    }
  ],
  "autoSubscribeEnabled": true
}
```

#### 2.3.2 설문별 알림 토글 API

```
PATCH /api/notification/settings/survey-alert
Headers: Authorization: Bearer <accessToken>
Body:
{
  "surveyId": "survey_id_1",
  "enabled": false
}

Response 200:
{
  "alert": { "survey_id_1": false, ... }
}
```

#### 2.3.3 Organization 자동 구독 토글 API

```
PATCH /api/notification/settings/auto-subscribe
Headers: Authorization: Bearer <accessToken>
Body:
{
  "organizationId": "org_id_1",
  "autoSubscribe": false
}

Response 200:
{
  "unsubscribedOrganizationIds": ["org_id_1"]
}
```

#### 2.3.4 Pipeline 알림 발송 API (내부)

```
POST /api/pipeline/notification
Headers: x-cron-secret: <CRON_SECRET>
Body:
{
  "event": "responseFinished",
  "surveyId": "survey_id_1",
  "responseId": "response_id_1",
  "environmentId": "env_id_1"
}

Response 200:
{
  "status": "ok",
  "sent": 3,
  "failed": 0
}

Response 401 (인증 실패):
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 NotificationService (서버)

핵심 비즈니스 로직을 담당하는 서비스. User의 notificationSettings JSON 필드를 조회/갱신한다.

```typescript
@Injectable()
export class NotificationService {
  /** 사용자의 알림 설정을 조회하고, null이면 기본값으로 정규화 */
  async getSettings(userId: string): Promise<NotificationSettings>;

  /** 설문별 알림 토글 (alert 레코드의 특정 surveyId 값 변경) */
  async toggleSurveyAlert(userId: string, surveyId: string, enabled: boolean): Promise<NotificationSettings>;

  /** Organization 자동 구독 토글 (unsubscribedOrganizationIds 배열 추가/제거) */
  async toggleAutoSubscribe(userId: string, organizationId: string, autoSubscribe: boolean): Promise<NotificationSettings>;

  /** 설문 생성 시 자동 구독 처리 (fire-and-forget) */
  autoSubscribeOnSurveyCreation(surveyId: string, creatorUserId: string, organizationId: string): void;

  /** 알림 설정 JSON을 정규화 (null/레거시 -> 현재 형식) */
  normalizeSettings(raw: unknown): NotificationSettings;
}
```

#### 2.4.2 NotificationEmailService (서버)

Pipeline에서 호출되어 알림 이메일을 발송하는 서비스.

```typescript
@Injectable()
export class NotificationEmailService {
  /**
   * 응답 완료 알림 이메일을 적격 수신자에게 병렬 발송한다.
   * 1. 설문이 속한 Organization의 멤버를 조회
   * 2. 역할 기반 필터 (OWNER/ADMIN 또는 팀 접근 가능 MEMBER)
   * 3. 해당 설문에 alert=true인 사용자 필터
   * 4. 각 수신자에게 locale별 이메일 발송 (Promise.allSettled)
   */
  async sendResponseNotification(params: {
    surveyId: string;
    responseId: string;
    environmentId: string;
  }): Promise<{ sent: number; failed: number }>;

  /** 단일 수신자에게 알림 이메일을 발송 */
  private async sendNotificationEmail(params: {
    to: string;
    userName: string;
    surveyName: string;
    responseCount: number;
    unsubscribeUrl: string;
    locale: string;
  }): Promise<void>;
}
```

#### 2.4.3 CronSecretGuard (서버)

Pipeline API를 보호하는 커스텀 NestJS 가드.

```typescript
@Injectable()
export class CronSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secret = request.headers['x-cron-secret'];
    const cronSecret = this.configService.get<string>('CRON_SECRET');
    // 타이밍 공격 방지를 위한 상수 시간 비교
    return crypto.timingSafeEqual(
      Buffer.from(secret || ''),
      Buffer.from(cronSecret || '')
    );
  }
}
```

#### 2.4.4 useNotificationSettings (클라이언트 훅)

알림 설정 조회 및 낙관적 업데이트를 관리하는 커스텀 훅.

```typescript
function useNotificationSettings(organizationId: string) {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [surveys, setSurveys] = useState<SurveyInfo[]>([]);
  const [loading, setLoading] = useState(true);

  /** 설문별 알림 토글 (낙관적 업데이트 + 에러 롤백) */
  const toggleSurveyAlert = async (surveyId: string, enabled: boolean) => {
    const prevSettings = settings;
    // 낙관적 업데이트
    setSettings(prev => ({
      ...prev!,
      alert: { ...prev!.alert, [surveyId]: enabled }
    }));
    try {
      await notificationApi.toggleSurveyAlert(surveyId, enabled);
    } catch {
      setSettings(prevSettings); // 롤백
      // 에러 토스트 표시
    }
  };

  /** Organization 자동 구독 토글 */
  const toggleAutoSubscribe = async (orgId: string, enabled: boolean) => { ... };

  return { settings, surveys, loading, toggleSurveyAlert, toggleAutoSubscribe };
}
```

### 2.5 기존 시스템 영향 분석

| 모듈/파일 | 변경 유형 | 영향 내용 |
|-----------|----------|----------|
| `packages/db/prisma/schema.prisma` | 수정 | User 모델에 `notificationSettings Json?` 필드 추가 |
| `apps/server/src/app/app.module.ts` | 수정 | NotificationModule import 추가 |
| `libs/server/email/src/lib/email.service.ts` | 수정 | sendResponseNotificationEmail() 메서드 추가 (또는 기존 send()를 public으로 변경) |
| `.env.example` | 수정 | `CRON_SECRET` 환경변수 추가 |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | notification 네임스페이스 번역 키 추가 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | notification 네임스페이스 번역 키 추가 |
| Survey 생성 서비스 (FS-008) | 수정 (향후) | 설문 생성 후 NotificationService.autoSubscribeOnSurveyCreation() 호출 추가 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|----------|
| T-01 | Prisma 스키마 변경 | User 모델에 notificationSettings Json? 필드 추가, 마이그레이션 생성/적용 | 없음 | 낮음 | 0.5h |
| T-02 | NotificationSettings 타입 정의 | NotificationSettings 인터페이스, 기본값, 정규화 함수 정의 | 없음 | 낮음 | 0.5h |
| T-03 | Nx 라이브러리 생성 (서버) | `libs/server/notification/` NestJS 라이브러리 스캐폴딩 | 없음 | 낮음 | 0.5h |
| T-04 | CronSecretGuard 구현 | CRON_SECRET 기반 내부 인증 가드, 타이밍 안전 비교 | T-03 | 낮음 | 0.5h |
| T-05 | 서버 DTO 정의 | ToggleSurveyAlertDto, ToggleAutoSubscribeDto, PipelineNotificationDto (class-validator) | T-03 | 낮음 | 0.5h |
| T-06 | NotificationService 구현 | getSettings, toggleSurveyAlert, toggleAutoSubscribe, autoSubscribeOnSurveyCreation, normalizeSettings | T-01, T-02, T-03 | 중간 | 2h |
| T-07 | NotificationController 구현 | 사용자향 알림 설정 CRUD API (GET/PATCH), JWT 인증 적용 | T-05, T-06 | 중간 | 1.5h |
| T-08 | EmailService 확장 | 응답 알림 이메일 발송 메서드 추가 (locale별 템플릿, 구독 해제 링크 포함) | 없음 | 중간 | 1.5h |
| T-09 | NotificationEmailService 구현 | 적격 수신자 조회 로직, Promise.allSettled 병렬 이메일 발송, 발송 결과 로깅 | T-06, T-08 | 높음 | 3h |
| T-10 | NotificationPipelineController 구현 | Pipeline 알림 트리거 API, CronSecretGuard 적용 | T-04, T-09 | 중간 | 1h |
| T-11 | NotificationModule 조립 | 모듈 정의, 의존성 주입 구성, AppModule에 import | T-06~T-10 | 낮음 | 0.5h |
| T-12 | 환경변수 설정 | .env.example에 CRON_SECRET 추가 | 없음 | 낮음 | 0.25h |
| T-13 | 서버 단위 테스트 | NotificationService, NotificationEmailService, CronSecretGuard 단위 테스트 | T-06, T-09, T-04 | 중간 | 2h |
| T-14 | Nx 라이브러리 생성 (클라이언트) | `libs/client/notification/` 라이브러리 스캐폴딩 | 없음 | 낮음 | 0.5h |
| T-15 | Zod 스키마 정의 (클라이언트) | 알림 설정 검증 스키마, API 응답 타입 | T-14 | 낮음 | 0.5h |
| T-16 | API 래퍼 함수 구현 | notificationApi: getSettings, toggleSurveyAlert, toggleAutoSubscribe (apiFetch 활용) | T-14 | 낮음 | 0.5h |
| T-17 | useNotificationSettings 훅 구현 | 설정 조회, 낙관적 업데이트, 에러 롤백, URL 파라미터 자동 해제 처리 | T-15, T-16 | 중간 | 1.5h |
| T-18 | SurveyAlertSwitch 컴포넌트 구현 | 설문별 알림 토글 스위치 UI (shadcn/ui Switch) | T-17 | 낮음 | 1h |
| T-19 | AutoSubscribeSwitch 컴포넌트 구현 | Organization 자동 구독 토글 스위치 UI | T-17 | 낮음 | 0.5h |
| T-20 | NotificationSettingsPage 컴포넌트 구현 | 설문 목록 렌더링, Organization 선택, 빈 상태 처리, 로딩 상태 | T-18, T-19 | 중간 | 2h |
| T-21 | 페이지 라우트 생성 | `apps/client/src/app/[lng]/settings/notifications/page.tsx` | T-20 | 낮음 | 0.5h |
| T-22 | i18n 번역 키 추가 | ko/en 번역 JSON에 notification 네임스페이스 키 추가 | T-20 | 낮음 | 0.5h |
| T-23 | 클라이언트 단위 테스트 | useNotificationSettings 훅, 컴포넌트 렌더링 테스트 | T-17~T-20 | 중간 | 1.5h |
| T-24 | 통합 테스트 | API 엔드포인트 E2E 테스트 (설정 조회/갱신, Pipeline 발송) | T-11, T-13 | 중간 | 2h |
| T-25 | 자동 구독 통합 포인트 | SurveyService(FS-008)에서 설문 생성 후 NotificationService 호출하는 연동 코드 작성 (FS-008 구현 시 통합) | T-06 | 낮음 | 0.5h |

**총 예상 시간: 약 25시간**

### 3.2 구현 순서 및 마일스톤

```
마일스톤 1: 데이터 계층 (T-01, T-02, T-12)
  └── Prisma 마이그레이션 + 타입 정의 + 환경변수
  └── 검증: prisma migrate dev 성공, 타입 컴파일 확인

마일스톤 2: 서버 코어 로직 (T-03, T-04, T-05, T-06, T-11)
  └── 라이브러리 생성 + Guard + DTO + Service + Module
  └── 검증: 서버 빌드 성공, NotificationService 단위 테스트 통과

마일스톤 3: 서버 API 엔드포인트 (T-07, T-08, T-09, T-10)
  └── Controller + EmailService 확장 + NotificationEmailService
  └── 검증: API 엔드포인트 호출 가능, 이메일 발송 로직 테스트 통과

마일스톤 4: 서버 테스트 (T-13, T-24)
  └── 단위 테스트 + 통합 테스트
  └── 검증: 전체 서버 테스트 통과

마일스톤 5: 클라이언트 코어 (T-14, T-15, T-16, T-17)
  └── 라이브러리 생성 + 스키마 + API + 훅
  └── 검증: 클라이언트 빌드 성공

마일스톤 6: 클라이언트 UI (T-18, T-19, T-20, T-21, T-22)
  └── 컴포넌트 + 페이지 + i18n
  └── 검증: 알림 설정 페이지 렌더링, 토글 동작 확인

마일스톤 7: 클라이언트 테스트 + 자동 구독 통합 (T-23, T-25)
  └── 클라이언트 테스트 + SurveyService 통합 포인트
  └── 검증: 전체 빌드 성공, 테스트 통과
```

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 내용 요약 |
|-----------|----------|---------------|
| `packages/db/prisma/schema.prisma` | 수정 | User 모델에 `notificationSettings Json?` 필드 추가 |
| `libs/server/notification/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 (NotificationModule, NotificationService, NotificationEmailService) |
| `libs/server/notification/src/lib/notification.module.ts` | 생성 | NestJS 모듈 정의 (providers, controllers, exports, imports) |
| `libs/server/notification/src/lib/notification.service.ts` | 생성 | 알림 설정 CRUD 비즈니스 로직 |
| `libs/server/notification/src/lib/notification-email.service.ts` | 생성 | 알림 이메일 발송 로직 (수신자 조회, 병렬 발송) |
| `libs/server/notification/src/lib/notification.controller.ts` | 생성 | 사용자향 알림 설정 API (GET/PATCH) |
| `libs/server/notification/src/lib/notification-pipeline.controller.ts` | 생성 | Pipeline 알림 트리거 API (POST) |
| `libs/server/notification/src/lib/notification.types.ts` | 생성 | NotificationSettings 인터페이스, 기본값, 타입 |
| `libs/server/notification/src/lib/dto/toggle-survey-alert.dto.ts` | 생성 | 설문별 토글 DTO (class-validator) |
| `libs/server/notification/src/lib/dto/toggle-auto-subscribe.dto.ts` | 생성 | 자동 구독 토글 DTO |
| `libs/server/notification/src/lib/dto/pipeline-notification.dto.ts` | 생성 | Pipeline 이벤트 수신 DTO |
| `libs/server/notification/src/lib/guards/cron-secret.guard.ts` | 생성 | CRON_SECRET 내부 인증 가드 |
| `libs/server/email/src/lib/email.service.ts` | 수정 | sendResponseNotificationEmail() 메서드 추가 (또는 send() public 변경) |
| `apps/server/src/app/app.module.ts` | 수정 | NotificationModule import 추가 |
| `.env.example` | 수정 | CRON_SECRET 환경변수 추가 |
| `libs/client/notification/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 |
| `libs/client/notification/src/lib/notification-settings-page.tsx` | 생성 | 알림 설정 메인 페이지 컴포넌트 |
| `libs/client/notification/src/lib/survey-alert-switch.tsx` | 생성 | 설문별 알림 토글 스위치 |
| `libs/client/notification/src/lib/auto-subscribe-switch.tsx` | 생성 | Organization 자동 구독 토글 |
| `libs/client/notification/src/lib/notification-api.ts` | 생성 | 서버 API 호출 래퍼 (apiFetch 기반) |
| `libs/client/notification/src/lib/notification-schemas.ts` | 생성 | Zod 검증 스키마 |
| `libs/client/notification/src/lib/use-notification-settings.ts` | 생성 | 알림 설정 커스텀 훅 |
| `apps/client/src/app/[lng]/settings/notifications/page.tsx` | 생성 | 알림 설정 페이지 라우트 |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | notification 네임스페이스 번역 키 추가 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | notification 네임스페이스 번역 키 추가 |
| `tsconfig.base.json` | 수정 | 새 라이브러리 경로 별칭 추가 (@inquiry/server-notification, @inquiry/client-notification) |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 발생 확률 | 완화 전략 |
|--------|------|----------|----------|
| 선행 모델(Project, Environment, Survey) 미구현 | 높음 | 높음 | 스텁 인터페이스와 mock 데이터로 개발 진행. 선행 모듈 구현 후 실제 Prisma 쿼리로 교체. 알림 설정 CRUD는 User 모델만 의존하므로 독립 개발 가능 |
| Team 모델 미구현으로 역할 기반 프로젝트 접근 제어 불완전 | 중간 | 높음 | MEMBER 역할 사용자는 소속 Organization의 모든 프로젝트에 임시 접근 허용. Team 기반 필터링 로직을 별도 함수로 격리하여 향후 교체 용이하게 설계 |
| BILLING 역할 미구현 | 낮음 | 높음 | FS-029 구현 시 BILLING 역할이 추가되면 가드에 제외 로직 추가. 현재는 OWNER/ADMIN/MEMBER만 접근 가능 |
| 이메일 발송 병렬 처리 시 SMTP 서버 부하 | 중간 | 낮음 | Promise.allSettled로 개별 실패 격리. 대량 수신자 시 배치(10건씩) 발송 옵션 추가 가능. SMTP 미설정 시 graceful no-op (기존 패턴) |
| Pipeline API가 외부에서 호출 가능한 보안 리스크 | 높음 | 낮음 | CronSecretGuard의 타이밍 안전 비교(crypto.timingSafeEqual)로 시크릿 유출 방어. CRON_SECRET을 충분히 긴 랜덤 문자열로 설정. 프로덕션에서는 네트워크 레벨 접근 제어 권장 |
| notificationSettings JSON 필드의 데이터 정합성 | 중간 | 중간 | normalizeSettings() 함수로 모든 읽기 시 정규화. JSON 업데이트 시 Prisma의 JSON update 기능 활용. 동시 업데이트 시 race condition은 낙관적 잠금(version 필드) 또는 최종 쓰기 우선(last write wins)으로 처리 |
| 구독 해제 링크의 인증 처리 | 중간 | 중간 | 미인증 사용자가 링크 클릭 시 로그인 페이지로 리다이렉트 후 원래 URL로 복귀. Next.js middleware 또는 클라이언트 라우트 가드에서 처리 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 테스트 대상 | 테스트 항목 | 비고 |
|------------|-----------|------|
| `NotificationService.normalizeSettings()` | null 입력 시 기본값 반환, 유효한 JSON 정상 파싱, 잘못된 형식 복구 | 정규화 로직의 핵심 |
| `NotificationService.toggleSurveyAlert()` | 기존 설정 없는 사용자, true->false 토글, false->true 토글, 존재하지 않는 surveyId 처리 | |
| `NotificationService.toggleAutoSubscribe()` | 해제 목록 추가, 해제 목록 제거, 중복 추가 방지 | |
| `NotificationService.autoSubscribeOnSurveyCreation()` | 자동 구독 활성 시 alert 추가, 해제 목록에 포함된 Org는 건너뜀, 사용자 조회 실패 시 무시 | fire-and-forget |
| `NotificationEmailService.sendResponseNotification()` | 적격 수신자 0명 시 정상 종료, 수신자 필터링 정확성, 개별 발송 실패 격리, 발송 건수 반환 | |
| `CronSecretGuard.canActivate()` | 올바른 시크릿, 잘못된 시크릿, 누락된 헤더, 빈 문자열 처리 | 타이밍 공격 방어 포함 |
| `useNotificationSettings` (훅) | 초기 로딩, 낙관적 업데이트, API 실패 시 롤백, URL 파라미터 자동 해제 | React Testing Library |

### 5.2 통합 테스트

| 테스트 시나리오 | 검증 내용 |
|---------------|----------|
| 알림 설정 조회 API | JWT 인증 후 사용자의 알림 설정 + 접근 가능한 설문 목록 반환 확인 |
| 설문별 토글 API | PATCH 요청 후 DB의 notificationSettings.alert 필드 갱신 확인 |
| 자동 구독 토글 API | PATCH 요청 후 unsubscribedOrganizationIds 배열 변경 확인 |
| Pipeline 알림 발송 API | CRON_SECRET 인증 성공 시 이메일 발송 로직 실행, 인증 실패 시 401 반환 |
| 미인증 사용자 접근 | JWT 없이 알림 설정 API 호출 시 401 반환 |
| 이메일 발송 격리 | 3명 중 1명 이메일 실패 시 나머지 2명 정상 발송 확인 |

### 5.3 E2E 테스트 (해당 시)

| 시나리오 | 흐름 |
|---------|------|
| 알림 토글 전체 흐름 | 로그인 -> 알림 설정 페이지 접근 -> 설문 토글 on/off -> DB 반영 확인 -> 페이지 새로고침 후 상태 유지 |
| 구독 해제 흐름 | 로그인 -> 알림 설정 페이지에 `?surveyId=xxx&unsubscribe=true` 접근 -> 해당 설문 자동 비활성화 확인 |
| 응답 완료 알림 흐름 | 설문에 알림 활성화 -> 응답 완료 이벤트 발생 -> Pipeline API 호출 -> 이메일 발송 확인 (SMTP mock) |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 제약사항 | 설명 |
|---------|------|
| 선행 모듈 의존 | Project, Environment, Survey 모델이 FS-006/FS-008에서 구현된 후에야 알림 설정 페이지의 설문 목록 조회가 완전히 동작함 |
| Team 기반 접근 제어 미완성 | Team 모델 미구현으로 MEMBER 역할의 프로젝트 접근 범위가 정확하지 않음 |
| 이메일 전용 알림 | 인앱 알림, Slack/Discord 알림은 범위 외. 이메일만 지원 |
| 알림 빈도 제한 없음 | 매 응답마다 1회 이메일 발송. 대량 응답 시 이메일 폭주 가능 |
| 이메일 내용 고정 | 알림 이메일 내용 커스터마이징 미지원 |
| JSON 필드 동시 업데이트 | notificationSettings의 동시 업데이트 시 last-write-wins 방식으로 데이터 유실 가능 |

### 6.2 향후 개선 가능성

| 개선 항목 | 설명 |
|----------|------|
| 알림 빈도 제한 (Digest) | 일정 시간(예: 1시간) 동안의 응답을 모아 하나의 요약 이메일로 발송하는 다이제스트 모드 |
| 인앱 알림 | WebSocket/SSE 기반 실시간 인앱 알림 시스템 |
| 외부 채널 통합 | Slack, Discord, Microsoft Teams 등 외부 채널 알림 (FS-023 Webhook으로 대체 가능) |
| 이메일 커스터마이징 | 알림 이메일 내용/템플릿을 사용자가 편집 가능하도록 확장 |
| JSON -> 별도 테이블 마이그레이션 | 알림 설정이 복잡해지면 JSON 필드에서 별도 테이블(NotificationSetting)로 분리하여 쿼리 최적화 |
| Redis 기반 알림 큐 | 대량 이메일 발송 시 Redis 큐를 활용한 비동기 처리 |
| 동시 업데이트 보호 | JSON 필드에 버전 번호를 추가하거나, Prisma의 optimistic locking 활용 |

---

## 7. i18n 고려사항

### 7.1 클라이언트 UI 번역 키 (추가 필요)

```json
{
  "notification": {
    "settings": {
      "title": "알림 설정",
      "description": "설문 응답 완료 시 이메일 알림을 받을 설문을 선택하세요.",
      "auto_subscribe": "새 설문 자동 구독",
      "auto_subscribe_description": "이 조직에서 새 설문이 생성되면 자동으로 알림을 구독합니다.",
      "every_response": "모든 응답",
      "no_surveys": "접근 가능한 설문이 없습니다.",
      "no_surveys_description": "Production 환경에 설문이 생성되면 여기에 표시됩니다.",
      "loading": "알림 설정을 불러오는 중...",
      "error": "알림 설정을 불러오는 데 실패했습니다.",
      "retry": "다시 시도",
      "toggle_success": "알림 설정이 변경되었습니다.",
      "toggle_error": "알림 설정 변경에 실패했습니다.",
      "unsubscribe_success": "해당 설문의 알림 구독이 해제되었습니다.",
      "organization_label": "조직",
      "project_label": "프로젝트",
      "survey_label": "설문"
    }
  }
}
```

### 7.2 이메일 템플릿 번역 (locale별 분기)

| locale | 이메일 제목 | 본문 핵심 문구 |
|--------|-----------|---------------|
| ko | "[설문명]에 새로운 응답이 도착했습니다" | "{userName}님, {surveyName}에 새로운 응답이 완료되었습니다. 현재까지 총 {responseCount}건의 응답이 수집되었습니다." |
| en | "New response received for [{surveyName}]" | "Hi {userName}, a new response has been completed for {surveyName}. Total responses collected so far: {responseCount}." |

이메일 템플릿의 번역은 서버 사이드에서 locale별 분기로 처리한다. i18next 서버 인스턴스를 사용하거나, 간단한 switch-case + 템플릿 리터럴로 구현한다. 이메일 하단에 "이 알림을 더 이상 받지 않으려면 [여기를 클릭하세요]" 구독 해제 링크를 locale에 맞게 포함한다.
