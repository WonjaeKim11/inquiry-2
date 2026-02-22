# 기능 구현 계획: 쿼터 관리 (Quota Management)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 설명 | 우선순위 |
|---------|--------|------|---------|
| FN-014-01 | Enterprise 라이선스 검증 | 쿼터 기능 접근 전 Enterprise 라이선스의 `quotas` Feature Flag 활성화 여부를 검증한다. Memory Cache(1분) + Redis Cache(24시간) 다계층 캐싱, Grace Period(3일) 적용 | 필수 |
| FN-014-02 | 쿼터 생성 | 특정 설문에 새 쿼터를 생성한다. name, limit, logic, action, endingCardId, countPartialSubmissions를 설정한다 | 필수 |
| FN-014-03 | 쿼터 조회 | 설문별 쿼터 목록 조회 및 단건 상세 조회를 수행한다 | 필수 |
| FN-014-04 | 쿼터 수정 | 기존 쿼터의 속성(이름, 한도, 조건, 액션, Ending Card, 부분 제출 카운트)을 부분 수정(Partial Update)한다 | 필수 |
| FN-014-05 | 쿼터 삭제 | 쿼터를 삭제하고 연관된 ResponseQuota 레코드를 Cascade 삭제한다 | 필수 |
| FN-014-06 | 쿼터 조건 평가 | 응답 제출/업데이트 시 FSD-012 조건부 로직 엔진을 재사용하여 각 쿼터의 조건을 평가하고 passedQuotas/failedQuotas로 분류한다 | 필수 |
| FN-014-07 | 한도 확인 및 액션 수행 | passedQuotas에 대해 screenedIn 카운트를 조회하고, 한도 초과 시 endSurvey/continueSurvey 액션을 수행한다. DB 트랜잭션 내에서 처리 | 필수 |
| FN-014-08 | 응답-쿼터 연결 관리 | Response와 Quota 간 N:M 관계(ResponseQuota)를 관리한다. screenedIn/screenedOut 상태 upsert, 미충족 시 삭제, skipDuplicates로 동시성 처리 | 필수 |
| FN-014-09 | 쿼터 초과 응답 처리 | endSurvey 시 Response.finished=true + endingId 설정, continueSurvey 시 shouldEndSurvey=false로 설문 계속 진행 | 필수 |

### 1.2 비기능 요구사항

| NFR ID | 항목 | 요구사항 |
|--------|------|---------|
| NFR-014-01 | 트랜잭션 | 쿼터 평가(한도 확인, 연결 레코드 생성/수정/삭제)는 단일 DB 트랜잭션 내에서 수행하여 데이터 일관성을 보장한다 |
| NFR-014-02 | 카운트 쿼리 최적화 | `[quotaId, status]` 복합 인덱스를 생성하여 screenedIn 카운트 조회 성능을 보장한다 |
| NFR-014-03 | 에러 안전 처리 | 쿼터 평가 중 에러 발생 시 `shouldEndSurvey: false`를 반환하여 설문 진행을 차단하지 않는다 |
| NFR-014-04 | 쿼터 이름 유일성 | 동일 설문 내에서 쿼터 이름 중복을 DB 유니크 제약으로 강제한다 |
| NFR-014-05 | Cascade 삭제 | Survey -> Quota, Response -> ResponseQuota, Quota -> ResponseQuota 관계에 Cascade 삭제를 적용한다 |
| NFR-014-06 | 동시성 처리 | 동시 응답 제출 시 skipDuplicates 옵션으로 ResponseQuota 중복 레코드를 방지한다 |
| NFR-License | 라이선스 캐시 | 성공 24시간, 실패 10분 TTL. Grace Period 3일, 이전 결과 보존 4일 |

### 1.3 명세서 내 모호한 점 및 해석

| 항목 | 모호한 점 | 해석/결정 |
|------|----------|----------|
| Enterprise 라이선스 검증 주체 | 쿼터 CRUD API가 Management API(`/api/v2/management/...`) 경로에 정의되어 있어, API Key 인증 기반인지 JWT 인증 기반인지 불명확 | FS-024에서 정의된 Management API는 API Key 인증 기반이다. 동시에 **에디터 UI에서 사용하는 내부 API**(JWT 인증)도 필요하다. 본 구현에서는 JWT 인증 기반의 내부 API(`/api/surveys/:surveyId/quotas`)를 먼저 구현하고, Management API 엔드포인트는 FS-024 통합 시 추가한다 |
| 라이선스 검증 서비스 재사용 | FN-014-01의 라이선스 검증이 FS-029(LicenseModule, FeatureGatingModule)과 동일한 메커니즘 | FS-029에서 구현될 `FeatureGatingModule`의 `RequireFeature` 데코레이터/가드를 재사용한다. 쿼터 모듈 자체에서는 별도 라이선스 검증 로직을 구현하지 않는다. 선행 의존이 미구현일 경우, 간단한 스텁 가드를 생성하고 FS-029 구현 시 교체한다 |
| 로직 평가 엔진 위치 | FS-012에서 로직 평가 엔진은 `libs/client/logic-engine/`(클라이언트 전용)에 위치한다. 그러나 쿼터 조건 평가는 서버 사이드에서 수행해야 한다 | FS-012의 핵심 평가 함수(`evaluateConditionGroup`, `resolveLeftOperand`, `evaluateCondition`)를 **공유 패키지**(`packages/shared` 또는 `packages/logic-engine`)로 이동하여 서버에서도 사용 가능하도록 한다. 이것이 FS-012 구현 계획 6.2절의 "서버 사이드 로직 평가" 향후 개선 항목에 해당한다 |
| Response 모델 부재 | 현재 DB 스키마에 Response 모델이 없으며, ResponseQuota가 Response를 FK로 참조한다 | Response 모델은 FS-021(응답 관리)에서 정의될 예정이다. 본 구현에서는 Response 모델의 최소 스텁(id, surveyId, finished, endingId, data, createdAt)을 schema.prisma에 추가하고, FS-021 구현 시 확장한다 |
| 쿼터 평가 트리거 시점 | "응답 제출/업데이트 이벤트" 수신이라고만 명시. 이벤트 기반인지 직접 호출인지 불명확 | 응답 파이프라인(FS-022)이 미구현 상태이므로, QuotaEvaluationService를 독립적인 서비스로 구현한다. Response 서비스에서 직접 `quotaEvaluationService.evaluate()`를 호출하는 방식으로 통합한다. 향후 이벤트 기반으로 전환 가능하도록 인터페이스를 설계한다 |
| endingCardId 참조 무결성 | endingCardId가 유효한 Ending Card를 참조해야 하지만, Ending Card는 Survey.endings JSON 필드 내에 저장된다 | Prisma FK 제약을 사용할 수 없으므로, 쿼터 생성/수정 시 서비스 레이어에서 Survey.endings JSON을 조회하여 해당 endingCardId가 존재하는지 **애플리케이션 레벨 검증**을 수행한다 |
| 부분 제출 필터링 조건 | AF-02에서 "endSurvey 액션이 아닌 경우"라는 조건이 모호. endSurvey 액션 쿼터는 항상 평가 대상인지 | endSurvey 액션 쿼터는 부분 제출 여부와 관계없이 항상 평가 대상이다. continueSurvey 액션 쿼터만 countPartialSubmissions=true일 때 부분 제출 응답을 카운트한다 |
| 쿼터 조건이 빈 객체인 경우 | logic이 `{}`인 쿼터의 조건 평가 결과 | 조건이 없으면 항상 조건 충족(true)으로 처리한다. 즉, 모든 응답이 해당 쿼터에 대해 카운트된다(글로벌 쿼터 역할) |

### 1.4 암묵적 요구사항

| 항목 | 설명 |
|------|------|
| Response 모델 스텁 | ResponseQuota가 Response를 FK로 참조하므로, Response 모델의 최소 스텁이 Prisma 스키마에 필요하다 |
| 로직 평가 엔진 서버 이동 | FS-012의 클라이언트 전용 로직 엔진을 서버에서도 사용 가능하도록 공유 패키지로 추출해야 한다 |
| FeatureGate 가드 스텁 | FS-029의 FeatureGatingModule이 미구현일 경우 스텁 가드 필요 |
| Environment 접근 권한 가드 | 쿼터 CRUD 시 Survey -> Environment -> Project -> Organization -> Membership 경로로 사용자 접근 권한을 검증해야 한다 |
| Survey 접근 헬퍼 | surveyId로부터 Organization까지의 역추적 조회 헬퍼가 필요하다 |
| 감사 로그 | 쿼터 생성/수정/삭제 시 AuditLogService를 통한 감사 로그 기록 |
| 쿼터 에디터 UI | Survey 에디터 내 쿼터 관리 탭/패널 (FS-010과 연계) |
| i18n 번역 키 | 쿼터 에디터 UI의 라벨, 에러 메시지, 상태 텍스트 번역 키 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
libs/server/quota/                         # [신규] 서버 쿼터 모듈
├── src/
│   ├── index.ts                           # 퍼블릭 API 엑스포트
│   └── lib/
│       ├── quota.module.ts                # NestJS 모듈 정의
│       ├── quota.controller.ts            # 쿼터 CRUD REST API 컨트롤러
│       ├── quota.service.ts               # 쿼터 CRUD 비즈니스 로직
│       ├── quota-evaluation.service.ts    # 쿼터 평가 엔진 (조건 평가 + 한도 확인 + 액션 수행)
│       ├── dto/
│       │   ├── create-quota.dto.ts        # 쿼터 생성 DTO (class-validator)
│       │   └── update-quota.dto.ts        # 쿼터 수정 DTO (PartialType)
│       ├── guards/
│       │   └── quota-feature.guard.ts     # Enterprise quotas Feature Flag 검증 가드 (스텁/FS-029 연동)
│       ├── types/
│       │   └── quota.types.ts             # 쿼터 평가 결과 타입 정의
│       └── constants/
│           └── quota.constants.ts         # 액션 타입, 상태 enum 등 상수

packages/logic-engine/                     # [신규 또는 이동] 공유 로직 평가 엔진
├── src/
│   ├── index.ts
│   └── lib/
│       ├── evaluator/
│       │   ├── condition-evaluator.ts     # 조건 비교 연산자 평가 (FS-012에서 이동)
│       │   ├── operand-resolver.ts        # 피연산자 값 추출 (FS-012에서 이동)
│       │   └── group-evaluator.ts         # 조건 그룹 재귀 평가 (FS-012에서 이동)
│       └── quota/
│           └── quota-condition-evaluator.ts # 쿼터 전용 조건 평가 래퍼

libs/client/quota/                         # [신규] 클라이언트 쿼터 라이브러리
├── src/
│   ├── index.ts
│   └── lib/
│       ├── hooks/
│       │   └── use-quotas.ts             # 쿼터 CRUD 훅
│       ├── api/
│       │   └── quota-api.ts              # apiFetch 기반 쿼터 API 클라이언트
│       ├── schemas/
│       │   └── quota.schema.ts           # zod 스키마 (클라이언트 폼 검증)
│       └── types/
│           └── quota.types.ts            # 클라이언트 타입 정의

apps/client/src/app/[lng]/
└── surveys/[surveyId]/edit/
    └── quotas/                           # [신규] 쿼터 에디터 UI (FS-010과 연계)
        └── components/
            ├── QuotaPanel.tsx            # 쿼터 관리 패널 컨테이너
            ├── QuotaCard.tsx             # 개별 쿼터 카드 (이름, 한도, 진행률 표시)
            ├── QuotaForm.tsx             # 쿼터 생성/수정 폼
            ├── QuotaConditionEditor.tsx  # 쿼터 조건 편집 (FS-012 ConditionGroupView 재사용)
            └── QuotaActionSelect.tsx     # 액션 타입 + Ending Card 선택
```

**모듈 의존 관계:**

```
QuotaModule
├── ServerPrismaModule (DB 접근)
├── FeatureGatingModule (quotas Feature Flag 검증, FS-029)
├── AuditLogModule (감사 로그)
└── LogicEnginePackage (조건 평가, FS-012 공유 패키지)

QuotaEvaluationService
├── ServerPrismaModule (Quota, ResponseQuota, Response 접근)
└── LogicEnginePackage (evaluateConditionGroup 함수)
```

**데이터 흐름 - 쿼터 평가 프로세스:**

```
[응답 제출/업데이트]
    │
    v
[QuotaEvaluationService.evaluate()]
    │
    ├── 1. 해당 Survey의 모든 Quota 조회
    │
    ├── 2. 부분 제출 필터링 (isFinished 기반)
    │
    ├── 3. 각 Quota.logic을 조건부 로직 엔진으로 평가 → passedQuotas / failedQuotas
    │
    ├── 4. DB 트랜잭션 시작
    │   ├── 4a. failedQuotas: 기존 ResponseQuota 삭제
    │   ├── 4b. passedQuotas: screenedIn 카운트 조회 (현재 응답 제외)
    │   ├── 4c. 한도 미초과: ResponseQuota screenedIn 생성 (skipDuplicates)
    │   ├── 4d. 한도 초과: ResponseQuota screenedOut upsert
    │   └── 4e. 첫 번째 초과 쿼터 액션 적용
    │       ├── endSurvey: Response.finished=true, Response.endingId 설정
    │       └── continueSurvey: shouldEndSurvey=false
    │
    └── 5. QuotaEvaluationResult 반환
```

### 2.2 데이터 모델

#### 2.2.1 Prisma 스키마 추가

**QuotaAction Enum:**

```prisma
/// 쿼터 한도 초과 시 수행할 액션 타입
enum QuotaAction {
  endSurvey
  continueSurvey
}
```

**ResponseQuotaStatus Enum:**

```prisma
/// 응답-쿼터 연결 상태
enum ResponseQuotaStatus {
  screenedIn
  screenedOut
}
```

**Quota 모델:**

```prisma
/// 설문 응답 수를 조건별로 제한하는 쿼터 규칙
model Quota {
  id                       String      @id @default(cuid())
  surveyId                 String
  name                     String
  limit                    Int         // >= 1
  logic                    Json        @default("{}")  // AND/OR 조건 그룹 구조
  action                   QuotaAction
  endingCardId             String?     // action=endSurvey 시 필수
  countPartialSubmissions  Boolean     @default(false)
  createdAt                DateTime    @default(now())
  updatedAt                DateTime    @updatedAt

  survey          Survey          @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  responseQuotas  ResponseQuota[]

  @@unique([surveyId, name])
  @@index([surveyId])
  @@map("quotas")
}
```

**ResponseQuota 모델 (응답-쿼터 연결 테이블):**

```prisma
/// 응답과 쿼터 간의 N:M 관계 연결 테이블
model ResponseQuota {
  responseId  String
  quotaId     String
  status      ResponseQuotaStatus

  response  Response @relation(fields: [responseId], references: [id], onDelete: Cascade)
  quota     Quota    @relation(fields: [quotaId], references: [id], onDelete: Cascade)

  @@id([responseId, quotaId])
  @@index([quotaId, status])
  @@map("response_quotas")
}
```

**Response 모델 스텁 (FS-021 선행 최소 정의):**

```prisma
/// 설문 응답 (최소 스텁 - FS-021에서 확장 예정)
model Response {
  id            String    @id @default(cuid())
  surveyId      String
  finished      Boolean   @default(false)
  endingId      String?   // Ending Card ID (Survey.endings JSON 내 ID 참조)
  data          Json      @default("{}")  // 질문 ID-응답값 쌍
  variables     Json      @default("{}")  // 변수 데이터
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  survey          Survey          @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  responseQuotas  ResponseQuota[]

  @@index([surveyId])
  @@index([surveyId, finished])
  @@map("responses")
}
```

**기존 모델 수정:**

```prisma
// Survey 모델에 관계 추가 (FS-008에서 정의된 Survey 모델 기준)
model Survey {
  // ... 기존 필드
  quotas     Quota[]
  responses  Response[]
}
```

#### 2.2.2 TypeScript 타입 정의

```typescript
// libs/server/quota/src/lib/types/quota.types.ts

/** 쿼터 평가 결과 */
export interface QuotaEvaluationResult {
  shouldEndSurvey: boolean;
  quotaFull: boolean;
  quotaId: string | null;
  action: 'endSurvey' | 'continueSurvey' | null;
  endingCardId: string | null;
}

/** 쿼터 평가 입력 */
export interface QuotaEvaluationInput {
  surveyId: string;
  responseId: string;
  responseData: Record<string, unknown>;
  variableData?: Record<string, string | number>;
  isFinished: boolean;
}

/** 쿼터 평가 기본 결과 (에러/쿼터 미존재 시) */
export const DEFAULT_EVALUATION_RESULT: QuotaEvaluationResult = {
  shouldEndSurvey: false,
  quotaFull: false,
  quotaId: null,
  action: null,
  endingCardId: null,
};
```

### 2.3 API 설계

#### 2.3.1 쿼터 CRUD API (JWT 인증 - 내부 에디터 UI용)

| 메서드 | 경로 | 설명 | 인증 | 가드 |
|--------|------|------|------|------|
| POST | `/api/surveys/:surveyId/quotas` | 쿼터 생성 | JWT | JwtAuthGuard + QuotaFeatureGuard |
| GET | `/api/surveys/:surveyId/quotas` | 쿼터 목록 조회 | JWT | JwtAuthGuard + QuotaFeatureGuard |
| GET | `/api/quotas/:quotaId` | 쿼터 단건 조회 | JWT | JwtAuthGuard + QuotaFeatureGuard |
| PUT | `/api/quotas/:quotaId` | 쿼터 수정 | JWT | JwtAuthGuard + QuotaFeatureGuard |
| DELETE | `/api/quotas/:quotaId` | 쿼터 삭제 | JWT | JwtAuthGuard + QuotaFeatureGuard |

#### 2.3.2 쿼터 CRUD API (API Key 인증 - Management API, FS-024 통합 시)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/v2/management/surveys/:surveyId/quotas` | 쿼터 생성 | API Key (WRITE 이상) |
| GET | `/api/v2/management/surveys/:surveyId/quotas` | 쿼터 목록 조회 | API Key (READ 이상) |
| GET | `/api/v2/management/quotas/:quotaId` | 쿼터 단건 조회 | API Key (READ 이상) |
| PUT | `/api/v2/management/quotas/:quotaId` | 쿼터 수정 | API Key (WRITE 이상) |
| DELETE | `/api/v2/management/quotas/:quotaId` | 쿼터 삭제 | API Key (MANAGE) |

> 참고: Management API 엔드포인트는 FS-024 모듈이 완성된 후 통합한다. 본 구현에서는 JWT 인증 기반 내부 API를 우선 구현한다.

#### 2.3.3 요청/응답 형식

**POST /api/surveys/:surveyId/quotas (생성)**

```typescript
// Request Body
{
  name: string;                        // 필수, 최소 1자
  limit: number;                       // 필수, >= 1 정수
  logic?: object;                      // 선택, AND/OR 조건 그룹, 기본값 {}
  action: 'endSurvey' | 'continueSurvey';  // 필수
  endingCardId?: string | null;        // endSurvey 시 필수
  countPartialSubmissions?: boolean;   // 선택, 기본값 false
}

// Response 201
{
  data: {
    id: string;
    surveyId: string;
    name: string;
    limit: number;
    logic: object;
    action: string;
    endingCardId: string | null;
    countPartialSubmissions: boolean;
    createdAt: string;
    updatedAt: string;
  }
}
```

**PUT /api/quotas/:quotaId (수정 - Partial Update)**

```typescript
// Request Body (모든 필드 선택)
{
  name?: string;
  limit?: number;
  logic?: object;
  action?: 'endSurvey' | 'continueSurvey';
  endingCardId?: string | null;
  countPartialSubmissions?: boolean;
}

// Response 200: 생성 응답과 동일 구조
```

**DELETE /api/quotas/:quotaId (삭제)**

```typescript
// Response 200
{ success: true }
```

**에러 응답:**

| HTTP 상태 | 코드 | 조건 |
|-----------|------|------|
| 400 | VALIDATION_ERROR | 필수 필드 누락, limit < 1, endingCardId 미지정 |
| 403 | FEATURE_DISABLED | Enterprise 라이선스의 quotas 비활성화 |
| 404 | NOT_FOUND | surveyId 또는 quotaId가 존재하지 않음 |
| 409 | DUPLICATE_NAME | 동일 설문 내 쿼터 이름 중복 |

### 2.4 주요 컴포넌트 설계

#### 2.4.1 QuotaController (`quota.controller.ts`)

```typescript
@Controller()
@UseGuards(JwtAuthGuard, QuotaFeatureGuard)
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

  /**
   * 쿼터 생성.
   * Enterprise quotas Feature Flag 활성화 필요.
   * 동일 설문 내 쿼터 이름 중복 시 409 반환.
   */
  @Post('surveys/:surveyId/quotas')
  async create(
    @Param('surveyId') surveyId: string,
    @Body() dto: CreateQuotaDto,
    @CurrentUser() user: UserPayload,
  ): Promise<{ data: QuotaResponse }> { ... }

  /**
   * 특정 설문의 쿼터 목록 조회.
   */
  @Get('surveys/:surveyId/quotas')
  async findBySurvey(
    @Param('surveyId') surveyId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<{ data: QuotaResponse[] }> { ... }

  /**
   * 쿼터 단건 조회.
   */
  @Get('quotas/:quotaId')
  async findOne(
    @Param('quotaId') quotaId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<{ data: QuotaResponse }> { ... }

  /**
   * 쿼터 수정 (Partial Update).
   * 이름 변경 시 동일 설문 내 중복 검사 수행.
   */
  @Put('quotas/:quotaId')
  async update(
    @Param('quotaId') quotaId: string,
    @Body() dto: UpdateQuotaDto,
    @CurrentUser() user: UserPayload,
  ): Promise<{ data: QuotaResponse }> { ... }

  /**
   * 쿼터 삭제.
   * 연관 ResponseQuota 레코드도 Cascade 삭제.
   */
  @Delete('quotas/:quotaId')
  async remove(
    @Param('quotaId') quotaId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: boolean }> { ... }
}
```

#### 2.4.2 QuotaService (`quota.service.ts`)

```typescript
@Injectable()
export class QuotaService {
  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * 쿼터 생성.
   * 1. surveyId로 Survey 존재 확인
   * 2. endSurvey 시 endingCardId 유효성 검증 (Survey.endings JSON 내 존재 확인)
   * 3. 동일 설문 내 이름 중복 체크 (Prisma unique constraint로 보장)
   * 4. Quota 레코드 생성
   * 5. 감사 로그 기록
   */
  async create(surveyId: string, dto: CreateQuotaDto, userId?: string): Promise<Quota> { ... }

  /**
   * 설문별 쿼터 목록 조회.
   */
  async findBySurveyId(surveyId: string): Promise<Quota[]> { ... }

  /**
   * 쿼터 단건 조회.
   */
  async findById(quotaId: string): Promise<Quota> { ... }

  /**
   * 쿼터 수정 (Partial Update).
   * action이 endSurvey로 변경되거나 유지될 때 endingCardId 검증.
   * 이름 변경 시 유니크 제약 위반은 Prisma 에러로 처리.
   */
  async update(quotaId: string, dto: UpdateQuotaDto, userId?: string): Promise<Quota> { ... }

  /**
   * 쿼터 삭제. Cascade로 ResponseQuota도 삭제.
   */
  async remove(quotaId: string, userId?: string): Promise<void> { ... }

  /**
   * endingCardId 유효성 검증 헬퍼.
   * Survey.endings JSON 배열에서 해당 ID의 Ending Card가 존재하는지 확인한다.
   */
  private async validateEndingCardId(surveyId: string, endingCardId: string): Promise<void> { ... }
}
```

#### 2.4.3 QuotaEvaluationService (`quota-evaluation.service.ts`)

```typescript
@Injectable()
export class QuotaEvaluationService {
  private readonly logger = new Logger(QuotaEvaluationService.name);

  constructor(private readonly prisma: ServerPrismaService) {}

  /**
   * 쿼터 평가 메인 함수.
   * 응답 제출/업데이트 시 호출되어 해당 설문의 모든 쿼터를 평가한다.
   * 에러 발생 시 안전하게 shouldEndSurvey: false를 반환한다.
   *
   * @param input - 평가 입력 데이터
   * @returns QuotaEvaluationResult - 설문 종료 여부, 초과 쿼터 정보 등
   */
  async evaluate(input: QuotaEvaluationInput): Promise<QuotaEvaluationResult> {
    try {
      // 1. 해당 설문의 모든 쿼터 조회
      const quotas = await this.prisma.quota.findMany({
        where: { surveyId: input.surveyId },
      });

      // 쿼터가 없으면 즉시 반환
      if (quotas.length === 0) return DEFAULT_EVALUATION_RESULT;

      // 2. 설문 정보 조회 (조건 평가에 필요한 블록/요소 구조)
      const survey = await this.prisma.survey.findUniqueOrThrow({
        where: { id: input.surveyId },
      });

      // 3. 부분 제출 필터링 + 조건 평가
      const { passedQuotas, failedQuotas } = this.evaluateConditions(
        quotas, survey, input,
      );

      // 4. 한도 확인 및 액션 수행 (트랜잭션)
      return await this.checkLimitsAndPerformAction(
        passedQuotas, failedQuotas, input,
      );
    } catch (error) {
      // NFR-014-03: 에러 시 안전 처리
      this.logger.error('쿼터 평가 중 에러 발생', error);
      return DEFAULT_EVALUATION_RESULT;
    }
  }

  /**
   * 각 쿼터의 조건을 평가하여 passedQuotas와 failedQuotas로 분류한다.
   * FSD-012의 조건부 로직 엔진(evaluateConditionGroup)을 재사용한다.
   */
  private evaluateConditions(
    quotas: Quota[],
    survey: Survey,
    input: QuotaEvaluationInput,
  ): { passedQuotas: Quota[]; failedQuotas: Quota[] } {
    // 부분 제출 필터링: 미완료 응답이고 endSurvey가 아닌 쿼터는
    // countPartialSubmissions=true인 경우만 평가
    const targetQuotas = quotas.filter((q) => {
      if (input.isFinished) return true;
      if (q.action === 'endSurvey') return true;
      return q.countPartialSubmissions;
    });

    const passedQuotas: Quota[] = [];
    const failedQuotas: Quota[] = [];

    for (const quota of targetQuotas) {
      try {
        const logic = quota.logic as object;
        // 빈 조건 = 항상 충족
        if (!logic || Object.keys(logic).length === 0) {
          passedQuotas.push(quota);
          continue;
        }
        // 조건부 로직 엔진으로 평가
        const result = evaluateConditionGroup(
          logic as ConditionGroup,
          survey,
          input.responseData,
          input.variableData ?? {},
        );
        (result ? passedQuotas : failedQuotas).push(quota);
      } catch {
        // 개별 쿼터 평가 에러 시 미충족으로 처리
        failedQuotas.push(quota);
      }
    }

    return { passedQuotas, failedQuotas };
  }

  /**
   * DB 트랜잭션 내에서 한도 확인 및 액션을 수행한다.
   * - failedQuotas: 기존 연결 삭제
   * - passedQuotas: screenedIn 카운트 조회 -> 한도 비교 -> 연결 레코드 생성/수정
   * - 첫 번째 초과 쿼터의 액션 적용
   */
  private async checkLimitsAndPerformAction(
    passedQuotas: Quota[],
    failedQuotas: Quota[],
    input: QuotaEvaluationInput,
  ): Promise<QuotaEvaluationResult> {
    return await this.prisma.$transaction(async (tx) => {
      // 4a. 조건 미충족 쿼터의 기존 연결 삭제
      if (failedQuotas.length > 0) {
        await tx.responseQuota.deleteMany({
          where: {
            responseId: input.responseId,
            quotaId: { in: failedQuotas.map((q) => q.id) },
          },
        });
      }

      let firstFullQuota: Quota | null = null;

      // 4b-4d. 각 passedQuota에 대해 한도 확인 및 연결 관리
      for (const quota of passedQuotas) {
        const countWhere: any = {
          quotaId: quota.id,
          status: 'screenedIn',
          responseId: { not: input.responseId }, // 현재 응답 제외
        };

        // countPartialSubmissions=false이면 finished=true인 응답만 카운트
        if (!quota.countPartialSubmissions) {
          countWhere.response = { finished: true };
        }

        const screenedInCount = await tx.responseQuota.count({
          where: countWhere,
        });

        if (screenedInCount >= quota.limit) {
          // 한도 초과: screenedOut upsert
          await tx.responseQuota.upsert({
            where: {
              responseId_quotaId: {
                responseId: input.responseId,
                quotaId: quota.id,
              },
            },
            create: {
              responseId: input.responseId,
              quotaId: quota.id,
              status: 'screenedOut',
            },
            update: { status: 'screenedOut' },
          });

          if (!firstFullQuota) {
            firstFullQuota = quota;
          }
        } else {
          // 한도 미초과: screenedIn 생성 (skipDuplicates)
          await tx.responseQuota.createMany({
            data: [{
              responseId: input.responseId,
              quotaId: quota.id,
              status: 'screenedIn',
            }],
            skipDuplicates: true,
          });
        }
      }

      // 4e. 첫 번째 초과 쿼터의 액션 적용
      if (firstFullQuota) {
        if (firstFullQuota.action === 'endSurvey') {
          await tx.response.update({
            where: { id: input.responseId },
            data: {
              finished: true,
              endingId: firstFullQuota.endingCardId,
            },
          });

          return {
            shouldEndSurvey: true,
            quotaFull: true,
            quotaId: firstFullQuota.id,
            action: 'endSurvey',
            endingCardId: firstFullQuota.endingCardId,
          };
        }

        // continueSurvey
        return {
          shouldEndSurvey: false,
          quotaFull: true,
          quotaId: firstFullQuota.id,
          action: 'continueSurvey',
          endingCardId: null,
        };
      }

      // 모든 passedQuotas가 한도 미초과
      return DEFAULT_EVALUATION_RESULT;
    });
  }
}
```

#### 2.4.4 QuotaFeatureGuard (`guards/quota-feature.guard.ts`)

```typescript
/**
 * Enterprise 라이선스의 quotas Feature Flag 검증 가드.
 *
 * FS-029의 FeatureGatingModule이 구현되면 @RequireFeature('quotas') 데코레이터로 대체.
 * 현재는 스텁으로 동작하며, 환경변수 QUOTA_FEATURE_ENABLED=true일 때 허용.
 */
@Injectable()
export class QuotaFeatureGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    // 스텁 구현: 환경변수로 제어
    // FS-029 구현 후 FeatureGatingService.canAccessByFlag('quotas')로 교체
    const isEnabled = this.configService.get<string>('QUOTA_FEATURE_ENABLED', 'true');
    if (isEnabled !== 'true') {
      throw new ForbiddenException('Quota feature requires Enterprise license');
    }
    return true;
  }
}
```

#### 2.4.5 DTO 설계

```typescript
// libs/server/quota/src/lib/dto/create-quota.dto.ts

export class CreateQuotaDto {
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @IsInt()
  @Min(1, { message: 'Limit must be greater than 0' })
  limit: number;

  @IsOptional()
  @IsObject()
  logic?: Record<string, unknown>;

  @IsEnum(['endSurvey', 'continueSurvey'], {
    message: 'action must be endSurvey or continueSurvey',
  })
  action: 'endSurvey' | 'continueSurvey';

  @ValidateIf((o) => o.action === 'endSurvey')
  @IsString()
  @IsNotEmpty({ message: 'endingCardId is required when action is endSurvey' })
  endingCardId?: string | null;

  @IsOptional()
  @IsBoolean()
  countPartialSubmissions?: boolean;
}
```

```typescript
// libs/server/quota/src/lib/dto/update-quota.dto.ts

export class UpdateQuotaDto extends PartialType(CreateQuotaDto) {}
```

### 2.5 기존 시스템 영향도 분석

| 영향 대상 | 변경 유형 | 영향 범위 | 상세 |
|----------|----------|----------|------|
| `packages/db/prisma/schema.prisma` | 수정 | DB 마이그레이션 필요 | QuotaAction, ResponseQuotaStatus enum 추가. Quota, ResponseQuota, Response(스텁) 모델 추가. Survey 모델에 quotas, responses 관계 추가 |
| `apps/server/src/app/app.module.ts` | 수정 | 낮음 | QuotaModule import 추가 |
| `libs/client/logic-engine/` (FS-012) | 구조 변경 | 높음 | 로직 평가 핵심 함수를 `packages/logic-engine`(공유 패키지)으로 추출하여 서버에서도 사용 가능하도록 변경. 기존 클라이언트 라이브러리는 공유 패키지를 re-export |
| `libs/server/audit-log/` | 변경 없음 | - | 기존 AuditLogService.log() 패턴 그대로 재사용 |
| `libs/server/auth/` | 변경 없음 | - | 기존 JwtAuthGuard, CurrentUser 데코레이터 재사용 |
| `.env.example` | 수정 | 낮음 | QUOTA_FEATURE_ENABLED 환경변수 추가 (스텁 가드용, FS-029 완성 시 제거) |
| `apps/client/src/app/i18n/locales/` | 수정 | 낮음 | 쿼터 에디터 UI 관련 번역 키 추가 |
| `tsconfig.base.json` (루트) | 수정 | 낮음 | `@inquiry/server-quota`, `@inquiry/client-quota`, `@inquiry/logic-engine` 경로 별칭 추가 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|----------|
| **마일스톤 1: 데이터 모델 및 인프라** | | | | | |
| T-01 | Prisma 스키마 변경 | QuotaAction, ResponseQuotaStatus enum, Quota, ResponseQuota, Response(스텁) 모델 추가. Survey 관계 추가. 인덱스 정의 | FS-008(Survey 모델) | 중간 | 2h |
| T-02 | DB 마이그레이션 실행 | `prisma migrate dev` 실행 및 검증 | T-01 | 낮음 | 0.5h |
| T-03 | 공유 타입 정의 | `QuotaEvaluationInput`, `QuotaEvaluationResult`, `DEFAULT_EVALUATION_RESULT` 등 TypeScript 타입 정의 | T-01 | 낮음 | 1h |
| T-04 | 환경변수 추가 | `.env.example`에 `QUOTA_FEATURE_ENABLED` 추가 | 없음 | 낮음 | 0.5h |
| **마일스톤 2: 로직 평가 엔진 공유 패키지** | | | | | |
| T-05 | 공유 로직 엔진 패키지 생성 | `packages/logic-engine` Nx 라이브러리 생성 + tsconfig 설정 | FS-012(로직 엔진) | 중간 | 2h |
| T-06 | 핵심 평가 함수 추출 | `evaluateConditionGroup`, `evaluateCondition`, `resolveLeftOperand` 등을 공유 패키지로 이동. 기존 `libs/client/logic-engine`은 re-export | T-05 | 높음 | 4h |
| T-07 | 쿼터 조건 평가 래퍼 | 쿼터 로직 구조(`{}` 또는 ConditionGroup)를 로직 엔진 입력으로 변환하는 래퍼 함수 | T-06 | 중간 | 2h |
| **마일스톤 3: 서버 쿼터 모듈 (CRUD)** | | | | | |
| T-08 | QuotaModule 스캐폴딩 | `libs/server/quota` Nx 라이브러리 생성, module/controller/service/dto 파일 생성 | T-02, T-03 | 낮음 | 1h |
| T-09 | CreateQuotaDto 구현 | class-validator 데코레이터로 생성 입력 검증. endSurvey 시 endingCardId 조건부 필수 | T-08 | 중간 | 1.5h |
| T-10 | UpdateQuotaDto 구현 | PartialType으로 부분 수정 DTO 구현 | T-09 | 낮음 | 0.5h |
| T-11 | QuotaFeatureGuard 구현 | Enterprise quotas Feature Flag 검증 스텁 가드 (환경변수 기반, FS-029 연동 시 교체) | T-08 | 낮음 | 1h |
| T-12 | QuotaService CRUD 구현 | create, findBySurveyId, findById, update, remove + endingCardId 유효성 검증 + 감사 로그 | T-09, T-10, T-11 | 높음 | 5h |
| T-13 | QuotaController 구현 | REST API 5개 엔드포인트 + 가드 적용 + Survey 접근 권한 검증 | T-12 | 중간 | 3h |
| T-14 | AppModule에 QuotaModule 등록 | apps/server/src/app/app.module.ts에 import 추가 | T-13 | 낮음 | 0.5h |
| **마일스톤 4: 쿼터 평가 엔진** | | | | | |
| T-15 | QuotaEvaluationService 구현 | evaluate() 메인 함수, evaluateConditions() 조건 분류, checkLimitsAndPerformAction() 트랜잭션 처리 | T-07, T-12 | 높음 | 6h |
| T-16 | 부분 제출 필터링 로직 | isFinished 기반 쿼터 필터링, countPartialSubmissions 조건 처리 | T-15 | 중간 | 1.5h |
| T-17 | 에러 안전 처리 | try-catch, 개별 쿼터 평가 에러 시 미충족 처리, 트랜잭션 롤백 시 shouldEndSurvey: false 반환 | T-15 | 중간 | 1h |
| **마일스톤 5: 클라이언트 쿼터 라이브러리** | | | | | |
| T-18 | 클라이언트 라이브러리 생성 | `libs/client/quota` Nx 라이브러리 생성 | 없음 | 낮음 | 1h |
| T-19 | 쿼터 API 클라이언트 | apiFetch 래퍼 기반 CRUD API 호출 함수 | T-18 | 낮음 | 1.5h |
| T-20 | Zod 스키마 정의 | 클라이언트 폼 검증용 zod 스키마 (서버 DTO와 규칙 동기화) | T-18 | 낮음 | 1h |
| T-21 | useQuotas 훅 구현 | 쿼터 목록 조회, 생성, 수정, 삭제 훅 | T-19 | 중간 | 2h |
| **마일스톤 6: 쿼터 에디터 UI** | | | | | |
| T-22 | i18n 번역 키 추가 | 쿼터 UI 라벨, 에러 메시지, 상태 텍스트 (ko/en) | 없음 | 낮음 | 1.5h |
| T-23 | QuotaPanel 컴포넌트 | 쿼터 목록 + 추가 버튼 컨테이너 | T-21, T-22 | 중간 | 2h |
| T-24 | QuotaCard 컴포넌트 | 개별 쿼터 표시 (이름, 한도, screenedIn 진행률, 액션 배지) | T-23 | 중간 | 2h |
| T-25 | QuotaForm 컴포넌트 | 쿼터 생성/수정 폼 (name, limit, action, endingCardId, countPartialSubmissions) | T-20, T-23 | 중간 | 3h |
| T-26 | QuotaConditionEditor 컴포넌트 | FS-012 ConditionGroupView 재사용한 쿼터 조건 편집 UI (단일 레벨 조건만) | T-25, FS-012(로직 에디터) | 높음 | 4h |
| T-27 | QuotaActionSelect 컴포넌트 | endSurvey/continueSurvey 선택 + Ending Card 드롭다운 | T-25 | 낮음 | 1.5h |
| **마일스톤 7: 테스트** | | | | | |
| T-28 | QuotaService CRUD 단위 테스트 | 생성/조회/수정/삭제, 유효성 검증 실패, 이름 중복, endingCardId 검증 | T-12 | 중간 | 3h |
| T-29 | QuotaEvaluationService 단위 테스트 | 조건 평가, 한도 확인, 액션 수행, 부분 제출, 에러 안전 처리 | T-15 | 높음 | 5h |
| T-30 | QuotaController 통합 테스트 | API 엔드포인트 E2E, 인증/권한, HTTP 상태 코드 | T-13 | 중간 | 3h |
| T-31 | 동시성 테스트 | 동시 응답 제출 시 ResponseQuota 중복 방지 확인 | T-15 | 중간 | 2h |

### 3.2 구현 순서 및 마일스톤

```
마일스톤 1: 데이터 모델 및 인프라 (T-01 ~ T-04) ................... 약 4h
├── T-01: Prisma 스키마 변경
├── T-02: DB 마이그레이션 실행
├── T-03: 공유 타입 정의
└── T-04: 환경변수 추가
│
│   [검증 포인트] prisma migrate dev 성공, DB에 Quota/ResponseQuota/Response 테이블 생성 확인
│   빌드 성공 + 커밋

마일스톤 2: 로직 평가 엔진 공유 패키지 (T-05 ~ T-07) ............. 약 8h
├── T-05: 공유 로직 엔진 패키지 생성
├── T-06: 핵심 평가 함수 추출 (FS-012 → packages/logic-engine)
└── T-07: 쿼터 조건 평가 래퍼
│
│   [검증 포인트] 기존 클라이언트 로직 엔진 테스트 통과 + 서버에서 import 가능 확인
│   빌드 성공 + 커밋

마일스톤 3: 서버 쿼터 모듈 CRUD (T-08 ~ T-14) ................... 약 12.5h
├── T-08: QuotaModule 스캐폴딩
├── T-09: CreateQuotaDto 구현
├── T-10: UpdateQuotaDto 구현
├── T-11: QuotaFeatureGuard 구현
├── T-12: QuotaService CRUD 구현
├── T-13: QuotaController 구현
└── T-14: AppModule에 QuotaModule 등록
│
│   [검증 포인트] curl/Postman으로 쿼터 CRUD API 동작 확인
│   - POST /api/surveys/:surveyId/quotas 200 반환
│   - GET /api/surveys/:surveyId/quotas 목록 반환
│   - PUT /api/quotas/:quotaId 수정 반환
│   - DELETE /api/quotas/:quotaId 삭제 성공
│   빌드 성공 + 커밋

마일스톤 4: 쿼터 평가 엔진 (T-15 ~ T-17) ........................ 약 8.5h
├── T-15: QuotaEvaluationService 구현
├── T-16: 부분 제출 필터링 로직
└── T-17: 에러 안전 처리
│
│   [검증 포인트] 단위 테스트로 쿼터 평가 결과 검증
│   - 조건 충족 + 한도 미초과 → screenedIn
│   - 조건 충족 + 한도 초과 + endSurvey → shouldEndSurvey: true
│   - 조건 충족 + 한도 초과 + continueSurvey → shouldEndSurvey: false
│   - 에러 발생 → shouldEndSurvey: false
│   빌드 성공 + 커밋

마일스톤 5: 클라이언트 쿼터 라이브러리 (T-18 ~ T-21) ............. 약 5.5h
├── T-18: 클라이언트 라이브러리 생성
├── T-19: 쿼터 API 클라이언트
├── T-20: Zod 스키마 정의
└── T-21: useQuotas 훅 구현
│
│   [검증 포인트] 빌드 성공, 타입 검증 통과
│   빌드 성공 + 커밋

마일스톤 6: 쿼터 에디터 UI (T-22 ~ T-27) ........................ 약 14h
├── T-22: i18n 번역 키 추가
├── T-23: QuotaPanel 컴포넌트
├── T-24: QuotaCard 컴포넌트
├── T-25: QuotaForm 컴포넌트
├── T-26: QuotaConditionEditor 컴포넌트
└── T-27: QuotaActionSelect 컴포넌트
│
│   [검증 포인트] 에디터 UI에서 쿼터 생성/조회/수정/삭제 가능
│   빌드 성공 + 커밋

마일스톤 7: 테스트 (T-28 ~ T-31) ................................ 약 13h
├── T-28: QuotaService CRUD 단위 테스트
├── T-29: QuotaEvaluationService 단위 테스트
├── T-30: QuotaController 통합 테스트
└── T-31: 동시성 테스트
│
│   [검증 포인트] 전체 테스트 스위트 통과
│   빌드 성공 + 커밋
```

**총 예상 시간: 약 65.5h**

**선행 의존 관계 정리:**

| 선행 기능 | 필요 수준 | 대응 전략 |
|----------|----------|----------|
| FS-008 (설문 생성/라이프사이클) | Survey 모델 필수 | Survey 모델이 구현되어 있어야 한다. 미구현 시 최소 스텁 사용 |
| FS-012 (조건부 로직 엔진) | 핵심 평가 함수 필요 | evaluateConditionGroup 등을 공유 패키지로 추출. FS-012 미구현 시 조건 평가를 빈 구현으로 스텁하고 후속 통합 |
| FS-029 (구독/빌링/브랜딩) | Enterprise License quotas Flag 검증 | QuotaFeatureGuard 스텁으로 대체, FS-029 완성 시 RequireFeature 데코레이터로 교체 |
| FS-021 (응답 관리) | Response 모델 필요 | 최소 Response 스텁 모델 생성, FS-021 구현 시 확장 |
| FS-006 (프로젝트/환경) | Environment 모델 (간접 의존) | Survey가 Environment를 참조하므로 FS-006 또는 FS-008에서 생성된 모델 필요 |

### 3.3 파일 수정 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|----------|----------|
| `packages/db/prisma/schema.prisma` | 수정 | QuotaAction, ResponseQuotaStatus enum 추가. Quota, ResponseQuota, Response(스텁) 모델 추가. Survey 모델에 관계 추가 |
| `libs/server/quota/` | 생성 | Nx 라이브러리 생성. QuotaModule, QuotaController, QuotaService, QuotaEvaluationService, DTO, Guard, 타입 |
| `libs/server/quota/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 |
| `libs/server/quota/src/lib/quota.module.ts` | 생성 | NestJS 모듈 정의 (PrismaModule, AuditLogModule 의존) |
| `libs/server/quota/src/lib/quota.controller.ts` | 생성 | 쿼터 CRUD 5개 엔드포인트 |
| `libs/server/quota/src/lib/quota.service.ts` | 생성 | 쿼터 CRUD 비즈니스 로직 + endingCardId 검증 + 감사 로그 |
| `libs/server/quota/src/lib/quota-evaluation.service.ts` | 생성 | 쿼터 평가 엔진 (조건 평가 + 한도 확인 + 트랜잭션 + 에러 안전 처리) |
| `libs/server/quota/src/lib/dto/create-quota.dto.ts` | 생성 | class-validator 기반 생성 DTO |
| `libs/server/quota/src/lib/dto/update-quota.dto.ts` | 생성 | PartialType 기반 수정 DTO |
| `libs/server/quota/src/lib/guards/quota-feature.guard.ts` | 생성 | Enterprise quotas Feature Flag 스텁 가드 |
| `libs/server/quota/src/lib/types/quota.types.ts` | 생성 | QuotaEvaluationInput, QuotaEvaluationResult 등 타입 |
| `libs/server/quota/src/lib/constants/quota.constants.ts` | 생성 | DEFAULT_EVALUATION_RESULT 등 상수 |
| `libs/server/quota/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/server/quota/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/quota/tsconfig.lib.json` | 생성 | 빌드용 TypeScript 설정 |
| `packages/logic-engine/` | 생성 | 공유 로직 평가 엔진 Nx 라이브러리 |
| `packages/logic-engine/src/index.ts` | 생성 | evaluateConditionGroup 등 퍼블릭 API 엑스포트 |
| `packages/logic-engine/src/lib/evaluator/condition-evaluator.ts` | 생성(이동) | FS-012에서 추출한 조건 비교 연산자 평가 |
| `packages/logic-engine/src/lib/evaluator/operand-resolver.ts` | 생성(이동) | FS-012에서 추출한 피연산자 값 추출 |
| `packages/logic-engine/src/lib/evaluator/group-evaluator.ts` | 생성(이동) | FS-012에서 추출한 조건 그룹 재귀 평가 |
| `packages/logic-engine/src/lib/quota/quota-condition-evaluator.ts` | 생성 | 쿼터 로직을 ConditionGroup으로 변환하여 평가하는 래퍼 |
| `packages/logic-engine/project.json` | 생성 | Nx 프로젝트 설정 |
| `packages/logic-engine/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/client/logic-engine/src/index.ts` | 수정 | 공유 패키지 re-export로 변경 |
| `libs/client/quota/` | 생성 | 클라이언트 쿼터 Nx 라이브러리 |
| `libs/client/quota/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 |
| `libs/client/quota/src/lib/api/quota-api.ts` | 생성 | apiFetch 기반 쿼터 CRUD API 클라이언트 |
| `libs/client/quota/src/lib/hooks/use-quotas.ts` | 생성 | 쿼터 CRUD React 훅 |
| `libs/client/quota/src/lib/schemas/quota.schema.ts` | 생성 | zod 기반 폼 검증 스키마 |
| `libs/client/quota/src/lib/types/quota.types.ts` | 생성 | 클라이언트 타입 정의 |
| `apps/client/src/app/[lng]/surveys/[surveyId]/edit/quotas/` | 생성 | 쿼터 에디터 페이지 및 컴포넌트 (5개) |
| `apps/client/src/app/[lng]/surveys/[surveyId]/edit/quotas/components/QuotaPanel.tsx` | 생성 | 쿼터 목록 패널 컨테이너 |
| `apps/client/src/app/[lng]/surveys/[surveyId]/edit/quotas/components/QuotaCard.tsx` | 생성 | 개별 쿼터 카드 |
| `apps/client/src/app/[lng]/surveys/[surveyId]/edit/quotas/components/QuotaForm.tsx` | 생성 | 쿼터 생성/수정 폼 |
| `apps/client/src/app/[lng]/surveys/[surveyId]/edit/quotas/components/QuotaConditionEditor.tsx` | 생성 | 조건 편집 UI |
| `apps/client/src/app/[lng]/surveys/[surveyId]/edit/quotas/components/QuotaActionSelect.tsx` | 생성 | 액션/Ending Card 선택 |
| `apps/server/src/app/app.module.ts` | 수정 | QuotaModule import 추가 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | 쿼터 UI 영어 번역 키 추가 |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | 쿼터 UI 한국어 번역 키 추가 |
| `tsconfig.base.json` | 수정 | `@inquiry/server-quota`, `@inquiry/client-quota`, `@inquiry/logic-engine` 경로 별칭 추가 |
| `.env.example` | 수정 | `QUOTA_FEATURE_ENABLED=true` 추가 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향도 | 발생 확률 | 완화 전략 |
|--------|--------|----------|----------|
| FS-012 로직 엔진 미구현 상태에서 구현 시작 | 높음 | 중간 | 공유 패키지(`packages/logic-engine`)를 최소 인터페이스(evaluateConditionGroup 시그니처)만 정의하고, 내부 구현은 단순 스텁(빈 조건 = true, 조건 있음 = false 기본값)으로 시작한다. FS-012 구현 완료 시 실제 평가 로직으로 교체한다 |
| FS-008 Survey 모델 부재 | 높음 | 중간 | 구현 순서상 FS-008이 FS-014보다 선행이므로 정상적으로는 Survey 모델이 존재해야 한다. 만약 병행 개발 시에는 FS-008에서 정의한 Survey 스텁 모델을 참조한다 |
| FS-021 Response 모델 부재 | 중간 | 높음 | Response 모델의 최소 스텁(id, surveyId, finished, endingId, data, variables)을 직접 생성한다. FS-021 구현 시 확장하되, 기존 FK 관계가 유지되도록 한다 |
| screenedIn 카운트의 동시성 경합 | 중간 | 중간 | DB 트랜잭션(Serializable 또는 Read Committed)으로 처리하되, 완벽한 정확성보다 결과적 일관성(eventual consistency)을 우선한다. skipDuplicates로 중복 연결 방지. 극단적인 동시성 시나리오에서는 쿼터 카운트가 limit를 약간 초과할 수 있음을 허용한다 |
| endingCardId가 Survey.endings JSON에 없는 경우 | 낮음 | 중간 | 쿼터 생성/수정 시 Survey.endings를 파싱하여 endingCardId 존재를 검증한다. 런타임(응답 제출 시)에는 endingCardId가 유효하지 않더라도 설문 종료는 수행하되, 클라이언트에서 기본 종료 화면을 표시하도록 fallback 처리한다 |
| 로직 평가 엔진의 서버 사이드 성능 | 낮음 | 낮음 | 쿼터 조건은 단일 레벨(중첩 없음)로 제한되어 있어 평가 복잡도가 O(N*M) (N=쿼터 수, M=조건 수)으로 관리 가능하다. 설문당 쿼터 수가 일반적으로 10개 미만이므로 성능 문제 없음 |
| FS-029 FeatureGating 미구현 시 보안 | 중간 | 중간 | QuotaFeatureGuard 스텁이 환경변수 기반으로 동작하므로 프로덕션에서는 `QUOTA_FEATURE_ENABLED=false`로 비활성화할 수 있다. FS-029 구현 완료 후 즉시 실제 라이선스 검증으로 교체한다 |
| Prisma의 skipDuplicates가 복합키에서 기대대로 동작하지 않을 가능성 | 낮음 | 낮음 | Prisma 5+에서 `createMany({ skipDuplicates: true })`는 복합 `@@id`에 대해 정상 동작한다. 단, PostgreSQL의 `ON CONFLICT DO NOTHING`으로 변환되므로 예상대로 동작하는지 마이그레이션 후 수동 테스트를 수행한다 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

**테스트 프레임워크:** Jest (Nx 기본 설정)

| 테스트 대상 | 파일 | 주요 시나리오 | 예상 케이스 수 |
|------------|------|-------------|-------------|
| QuotaService.create() | `quota.service.spec.ts` | 정상 생성, name 중복 409, limit < 1 거부, endSurvey 시 endingCardId 필수, Survey 미존재 404, endingCardId 존재 검증 | 약 10개 |
| QuotaService.update() | `quota.service.spec.ts` | 부분 수정, 이름 변경 중복 체크, action 변경 시 endingCardId 재검증, 미존재 쿼터 404 | 약 8개 |
| QuotaService.remove() | `quota.service.spec.ts` | 정상 삭제, 미존재 404, Cascade 삭제 확인 | 약 3개 |
| QuotaEvaluation.evaluate() | `quota-evaluation.service.spec.ts` | 쿼터 없음 → 기본 결과, 빈 조건(글로벌 쿼터) → 항상 충족, 조건 충족/미충족 분류 | 약 5개 |
| QuotaEvaluation - 한도 확인 | `quota-evaluation.service.spec.ts` | screenedIn < limit → screenedIn 생성, screenedIn >= limit → screenedOut, 복수 쿼터 중 첫 번째 초과 액션 적용 | 약 8개 |
| QuotaEvaluation - endSurvey | `quota-evaluation.service.spec.ts` | Response.finished=true 설정, endingId 설정, 응답 구조 반환 | 약 3개 |
| QuotaEvaluation - continueSurvey | `quota-evaluation.service.spec.ts` | shouldEndSurvey=false, finished 미변경 | 약 2개 |
| QuotaEvaluation - 부분 제출 | `quota-evaluation.service.spec.ts` | isFinished=false + countPartialSubmissions=false → 평가 제외, countPartialSubmissions=true → 평가 포함, endSurvey 쿼터는 항상 평가 | 약 5개 |
| QuotaEvaluation - 에러 처리 | `quota-evaluation.service.spec.ts` | 조건 평가 에러 → 미충족 처리, 트랜잭션 에러 → 롤백 + 기본 결과 반환 | 약 3개 |
| QuotaEvaluation - 연결 관리 | `quota-evaluation.service.spec.ts` | failedQuotas 기존 연결 삭제, screenedIn skipDuplicates, screenedOut upsert | 약 5개 |
| CreateQuotaDto | `create-quota.dto.spec.ts` | 유효성 검증: name 빈 문자열, limit 0, 잘못된 action, endSurvey 시 endingCardId 누락 | 약 8개 |
| QuotaConditionEvaluator | `quota-condition-evaluator.spec.ts` | 빈 로직 → true, 유효한 조건 평가, 잘못된 로직 구조 → false | 약 5개 |

**핵심 테스트 케이스 예시:**

```typescript
// quota-evaluation.service.spec.ts
describe('QuotaEvaluationService', () => {
  describe('evaluate()', () => {
    it('설문에 쿼터가 없으면 기본 결과를 반환한다', async () => {
      // Arrange: 쿼터 없는 설문
      const result = await service.evaluate(inputWithNoQuotas);
      expect(result).toEqual(DEFAULT_EVALUATION_RESULT);
    });

    it('조건 충족 + 한도 미초과 시 screenedIn을 생성한다', async () => {
      // Arrange: limit=10, 현재 screenedIn=5
      const result = await service.evaluate(input);
      expect(result.shouldEndSurvey).toBe(false);
      expect(result.quotaFull).toBe(false);
      // ResponseQuota에 screenedIn 레코드가 생성됨
    });

    it('조건 충족 + 한도 초과 + endSurvey 시 설문을 종료한다', async () => {
      // Arrange: limit=10, 현재 screenedIn=10, action=endSurvey
      const result = await service.evaluate(input);
      expect(result.shouldEndSurvey).toBe(true);
      expect(result.quotaFull).toBe(true);
      expect(result.action).toBe('endSurvey');
      expect(result.endingCardId).toBe('ending-card-1');
    });

    it('조건 충족 + 한도 초과 + continueSurvey 시 설문을 계속 진행한다', async () => {
      // Arrange: limit=10, 현재 screenedIn=10, action=continueSurvey
      const result = await service.evaluate(input);
      expect(result.shouldEndSurvey).toBe(false);
      expect(result.quotaFull).toBe(true);
      expect(result.action).toBe('continueSurvey');
    });

    it('쿼터 평가 중 에러 발생 시 안전하게 기본 결과를 반환한다', async () => {
      // Arrange: DB 쿼리 에러 유발
      const result = await service.evaluate(inputCausingError);
      expect(result).toEqual(DEFAULT_EVALUATION_RESULT);
    });

    it('countPartialSubmissions=false이면 미완료 응답을 카운트하지 않는다', async () => {
      // Arrange: finished=false 응답 5개, finished=true 응답 3개, limit=5
      // countPartialSubmissions=false → 카운트: 3 (미초과)
      const result = await service.evaluate(input);
      expect(result.quotaFull).toBe(false);
    });

    it('복수 쿼터 중 첫 번째 초과 쿼터의 액션을 적용한다', async () => {
      // Arrange: quota1(limit=5, endSurvey), quota2(limit=3, continueSurvey)
      // 둘 다 초과 → quota1의 endSurvey 적용
      const result = await service.evaluate(input);
      expect(result.action).toBe('endSurvey');
      expect(result.quotaId).toBe('quota1-id');
    });
  });
});
```

### 5.2 통합 테스트

| 시나리오 | 범위 | 검증 포인트 |
|---------|------|-----------|
| 쿼터 CRUD API 엔드포인트 | QuotaController + QuotaService + DB | HTTP 201/200/404/409 응답, JSON 구조, DB 레코드 확인 |
| 쿼터 생성 시 유효성 검증 | QuotaController + DTO 파이프라인 | name 빈 문자열 → 400, limit=0 → 400, endSurvey+endingCardId 누락 → 400 |
| 쿼터 평가 + 응답 연결 | QuotaEvaluationService + DB 트랜잭션 | 평가 후 ResponseQuota 레코드 상태 확인, Response.finished/endingId 확인 |
| Cascade 삭제 | QuotaService.remove() + DB | 쿼터 삭제 후 ResponseQuota 레코드 자동 삭제 확인 |
| Survey 삭제 시 쿼터 Cascade | Prisma onDelete: Cascade | Survey 삭제 후 관련 Quota + ResponseQuota 모두 삭제 확인 |

### 5.3 E2E 테스트

| 시나리오 | 행위 | 기대 결과 |
|---------|------|----------|
| 글로벌 쿼터 (조건 없음) | 설문에 limit=100 글로벌 쿼터 생성 → 100개 응답 제출 → 101번째 응답 | 101번째 응답 시 endSurvey 액션 발동, 지정 Ending Card 표시 |
| 조건부 쿼터 (성별 할당) | "남성" 조건 limit=50 + "여성" 조건 limit=50 쿼터 생성 → 남성 50개 응답 → 남성 51번째 응답 | 51번째 남성 응답 시 screenedOut, 여성 응답은 정상 진행 |
| continueSurvey 쿼터 | continueSurvey 액션 쿼터의 한도 초과 | screenedOut으로 표시되지만 설문 계속 진행 |
| 부분 제출 카운트 | countPartialSubmissions=true 쿼터 + 미완료 응답 | 미완료 응답도 쿼터 카운트에 포함 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 설명 |
|------|------|
| FS-012 로직 엔진 선행 의존 | 쿼터 조건 평가의 완전한 동작은 FS-012(조건부 로직 엔진)의 `evaluateConditionGroup` 함수가 구현되어야 한다. 스텁 상태에서는 빈 조건만 정상 동작 |
| Response 모델 스텁 한계 | FS-021에서 정의될 Response 모델의 전체 스키마가 확정되지 않았으므로, 스텁 모델의 필드가 변경될 수 있다 |
| 단일 레벨 조건만 지원 | 명세서 BR-06-02에 따라 중첩 조건 그룹은 사용하지 않는다. 복잡한 조건 분기가 필요한 경우 여러 쿼터로 분리해야 한다 |
| Enterprise 라이선스 검증 스텁 | FS-029 완성 전까지 환경변수 기반 스텁 가드를 사용하므로, 실제 라이선스 검증이 수행되지 않는다 |
| endingCardId 참조 무결성 | DB FK가 아닌 애플리케이션 레벨 검증이므로, Survey.endings에서 Ending Card를 삭제한 후 쿼터의 endingCardId가 고아 참조가 될 수 있다. Survey 수정 시 쿼터의 endingCardId 정합성 검사가 추가로 필요하다 |
| screenedIn 카운트 정밀도 | 높은 동시성 환경에서 쿼터 카운트가 limit를 약간 초과할 수 있다. 이는 PostgreSQL의 Read Committed 격리 수준에 의한 것으로, 엄격한 정밀도가 필요하면 `SELECT ... FOR UPDATE` 또는 Redis 기반 원자적 카운터로 개선 필요 |
| Management API 후속 통합 | FS-024 Management API 엔드포인트는 별도 통합이 필요하며, 본 구현에서는 JWT 인증 기반 내부 API만 제공한다 |

### 6.2 잠재적 향후 개선

| 항목 | 설명 |
|------|------|
| 실시간 쿼터 대시보드 | 쿼터별 screenedIn/screenedOut 실시간 통계 대시보드. WebSocket 또는 SSE로 실시간 카운트 업데이트 |
| 쿼터 알림/노티피케이션 | 쿼터 한도의 80%, 90%, 100% 도달 시 이메일/인앱 알림 전송 |
| 쿼터 일시 정지/재개 | 특정 쿼터를 일시적으로 비활성화/활성화하는 기능. isActive 필드 추가 |
| Redis 기반 원자적 카운터 | 높은 동시성 환경에서 정확한 쿼터 카운트를 위해 Redis INCR를 사용하고, DB와 비동기 동기화 |
| 쿼터 복수 액션 지원 | 현재 첫 번째 초과 쿼터의 액션만 적용되지만, 복수 쿼터가 초과될 때의 우선순위 기반 액션 결정 로직 |
| 쿼터 보고서 | 쿼터별 응답 분포, 시간별 추이, 완료율 등의 분석 보고서 기능 |
| 중첩 조건 그룹 지원 | 현재 단일 레벨로 제한된 조건을 중첩 가능하도록 확장 (FS-012 중첩 그룹 기능 활용) |
| endingCardId FK 연결 | Ending Card가 별도 DB 모델로 분리되면, Quota.endingCardId를 FK로 연결하여 참조 무결성을 DB 레벨에서 보장 |

---

## 7. i18n 고려사항 (클라이언트 UI 변경)

쿼터 에디터 UI에 필요한 번역 키 목록:

### 7.1 쿼터 패널 라벨

```
quota.panel.title                    → "쿼터 관리" / "Quota Management"
quota.panel.addQuota                 → "쿼터 추가" / "Add Quota"
quota.panel.noQuotas                 → "설정된 쿼터가 없습니다" / "No quotas configured"
quota.panel.enterpriseRequired       → "Enterprise 라이선스가 필요합니다" / "Enterprise license required"
```

### 7.2 쿼터 카드 라벨

```
quota.card.limit                     → "한도" / "Limit"
quota.card.progress                  → "{{count}} / {{limit}} 응답" / "{{count}} / {{limit}} responses"
quota.card.action.endSurvey          → "설문 종료" / "End Survey"
quota.card.action.continueSurvey     → "설문 계속" / "Continue Survey"
quota.card.status.active             → "활성" / "Active"
quota.card.status.full               → "한도 도달" / "Quota Full"
quota.card.edit                      → "수정" / "Edit"
quota.card.delete                    → "삭제" / "Delete"
quota.card.deleteConfirm             → "이 쿼터를 삭제하시겠습니까? 관련 응답 연결도 함께 삭제됩니다." / "Are you sure you want to delete this quota? Related response connections will also be removed."
```

### 7.3 쿼터 폼 라벨

```
quota.form.title.create              → "새 쿼터" / "New Quota"
quota.form.title.edit                → "쿼터 수정" / "Edit Quota"
quota.form.name                      → "쿼터 이름" / "Quota Name"
quota.form.namePlaceholder           → "예: 남성 응답자" / "e.g., Male Respondents"
quota.form.limit                     → "응답 한도" / "Response Limit"
quota.form.limitPlaceholder          → "최소 1" / "Minimum 1"
quota.form.action                    → "한도 초과 시 액션" / "Action When Limit Reached"
quota.form.endingCard                → "종료 카드" / "Ending Card"
quota.form.endingCardPlaceholder     → "종료 카드를 선택하세요" / "Select an ending card"
quota.form.countPartialSubmissions   → "미완료 응답도 카운트" / "Count partial submissions"
quota.form.countPartialHint          → "활성화하면 완료되지 않은 응답도 쿼터 카운트에 포함됩니다" / "When enabled, incomplete responses will also count towards the quota"
quota.form.condition                 → "조건" / "Condition"
quota.form.conditionHint             → "조건이 없으면 모든 응답이 카운트됩니다" / "If no condition is set, all responses will be counted"
quota.form.save                      → "저장" / "Save"
quota.form.cancel                    → "취소" / "Cancel"
```

### 7.4 검증 에러 메시지

```
quota.error.nameRequired             → "쿼터 이름을 입력해주세요" / "Please enter a quota name"
quota.error.nameDuplicate            → "동일한 이름의 쿼터가 이미 존재합니다" / "A quota with this name already exists"
quota.error.limitMin                 → "한도는 1 이상이어야 합니다" / "Limit must be greater than 0"
quota.error.limitInteger             → "한도는 정수여야 합니다" / "Limit must be an integer"
quota.error.actionRequired           → "액션을 선택해주세요" / "Please select an action"
quota.error.endingCardRequired       → "설문 종료 액션에는 종료 카드를 선택해야 합니다" / "An ending card is required for the End Survey action"
quota.error.featureDisabled          → "쿼터 기능은 Enterprise 라이선스가 필요합니다" / "Quota feature requires an Enterprise license"
quota.error.createFailed             → "쿼터 생성에 실패했습니다" / "Failed to create quota"
quota.error.updateFailed             → "쿼터 수정에 실패했습니다" / "Failed to update quota"
quota.error.deleteFailed             → "쿼터 삭제에 실패했습니다" / "Failed to delete quota"
```
