# 기능 구현 계획: 싱글유즈 및 개인 링크 (FS-017)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 우선순위 | 라이선스 | 설명 |
|---------|--------|---------|---------|------|
| FN-025-01 | Single-use 설정 관리 | 높음 | Community | 설문의 singleUse 설정 구성 (enabled, heading, subheading, isEncrypted) |
| FN-025-02 | Single-use ID 생성 | 높음 | Community | CUID2 기반 고유 ID 생성, 옵션에 따라 AES-256-GCM 암호화 |
| FN-025-03 | Single-use ID 검증 | 높음 | Community | 암호화된/평문 ID를 복호화+CUID2 형식 검사로 유효성 검증 |
| FN-025-04 | Single-use 설문 페이지 렌더링 | 높음 | Community | suId 기반 설문 렌더링, 완료/무효/미완료 이어쓰기 상태 분기 |
| FN-025-05 | Multi-use / Single-use 토글 UI | 중간 | Community | Anonymous Links 탭에서 상호 배타 토글 + 확인 모달 |
| FN-025-06 | 대량 링크 생성 및 CSV 다운로드 | 중간 | Community | 1~5,000개 일괄 생성, CSV 파일 다운로드 |
| FN-026-01 | Personal Link 생성 | 높음 | Enterprise | Contact ID + Survey ID 이중 암호화(AES-256-GCM + JWT HS256) |
| FN-026-02 | Personal Link 토큰 검증 | 높음 | Enterprise | JWT 서명/만료 검증 + AES-256-GCM 복호화로 원본 ID 복원 |
| FN-026-03 | Contact Survey 페이지 렌더링 | 높음 | Enterprise | `/c/{jwt_token}` 경로로 Contact 기반 설문 렌더링 + 중복 응답 방지 |

### 1.2 비기능 요구사항

| NFR ID | 항목 | 요구사항 |
|--------|------|---------|
| NFR-025-01 | 암호화 강도 | AES-256-GCM (NIST 표준), 신규 생성은 V2(GCM)만 사용 |
| NFR-025-02 | JWT 알고리즘 | HS256 (HMAC-SHA256), 대칭 키 기반 서명 |
| NFR-025-03 | 대량 링크 생성 | 최대 5,000개 동시 생성 지원 |
| NFR-025-04 | 위변조 방지 | JWT 서명 + AES-GCM 인증 태그 이중 검증 |
| NFR-025-05 | ID 고유성 | CUID2 충돌률 10^-24 이하 |
| NFR-026-01 | Enterprise 라이선스 | Personal Link는 Enterprise 전용 |
| NFR-026-02 | 토큰 만료 정밀도 | 일(day) 단위 |
| NFR-P-01 | 설문 로딩 | 2초 이내 |

### 1.3 명세서 내 모호한 점 및 해석

| 항목 | 모호한 점 | 해석/결정 |
|------|----------|----------|
| PersonalizedLink 모델 중복 | FS-026(연락처 관리)에서 PersonalizedLink 모델을 이미 정의했으나, FS-017 명세서는 JWT 토큰 기반 stateless 방식을 설명. DB 저장 여부가 상충 | FS-017은 **stateless JWT 방식**을 채택한다. PersonalizedLink DB 모델은 FS-026에서 정의되어 있으므로, 해당 테이블은 FS-026의 HMAC 기반 링크에만 사용한다. FS-017의 Personal Link는 JWT 토큰 자체에 모든 정보를 담아 DB 조회 없이 검증하는 방식이다. |
| 암호화 키 환경변수 명칭 | `encryptionKey`라고만 언급하고 구체적 환경변수 이름이 미정의 | `ENCRYPTION_KEY` 환경변수로 통일한다. AES-256에 필요한 32바이트(256비트) 키를 hex 인코딩 또는 base64로 저장한다. |
| AES-256-CBC(V1) 레거시 호환 | BR-03-03에서 V1(CBC) 읽기 전용 지원을 언급하지만 V1 형식 상세 미정의 | V1(CBC) 형식은 `{IV_hex}:{ciphertext_hex}` (authTag 없음, 2-part 형식)로 해석한다. 콜론 구분자 개수(2 vs 3)로 V1/V2를 자동 판별하여 복호화한다. |
| Response 모델 | 응답 조회(기존 응답 확인)를 전제하지만, Response 모델이 현재 DB에 미구현 | FS-021(응답 관리)에서 Response 모델을 정의할 예정이므로, 본 계획에서는 Response 최소 스텁 모델을 정의한다. singleUseId, contactId 필드를 포함한 최소 스키마를 생성한다. |
| AF-02 커스텀 suId | 비암호화 모드에서 "커스텀 suId"가 의미하는 바가 불명확 | CUID2 형식 검증을 건너뛰고, 전달된 문자열을 그대로 Single-use ID로 사용한다. 비암호화 모드에서는 어떤 문자열이든 suId로 허용한다. |
| Contact Survey 중복 응답 판정 | "완료된 응답"만 중복으로 보는지, "생성된 모든 응답"을 중복으로 보는지 미정의 | `finished: true`인 응답만 중복으로 판정한다. 미완료 응답이 있으면 이어쓰기를 허용한다 (Single-use와 동일한 정책). |
| OG 메타데이터 | Personal Link의 OG 메타데이터(favicon, OG 이미지) 소스 미정의 | Survey의 surveyMetadata JSON 필드에서 OG 정보를 읽어온다. 미설정 시 시스템 기본값을 사용한다. |
| Single-use 설문 URL 패턴 | `/s/{surveyId}?suId={id}` 형태이지만 Link Survey의 기존 URL 패턴과의 일관성 미확인 | FS-008에서 정의한 Link Survey 페이지 라우트(`/s/{surveyId}`)에 `suId` 쿼리 파라미터를 추가하는 방식으로 구현한다. 기존 라우트를 재사용한다. |

### 1.4 암시적 요구사항

| 항목 | 설명 |
|------|------|
| Response 최소 스텁 모델 | Single-use ID / Contact ID 기반 기존 응답 조회를 위해 Response 모델 최소 정의가 필요하다 |
| CUID2 라이브러리 | `@paralleldrive/cuid2` 패키지 도입 필요 (FS-008에서 이미 계획됨) |
| jsonwebtoken 라이브러리 | Personal Link JWT 생성/검증을 위해 `jsonwebtoken` 패키지 도입 필요 |
| 암호화 유틸리티 공유 | AES-256-GCM 암호화/복호화 로직을 공유 유틸리티로 추출해야 한다 (Single-use + Personal Link 공용) |
| 환경변수 추가 | `ENCRYPTION_KEY` (AES-256 + JWT 서명 키) 환경변수 추가 |
| Enterprise License Guard | Personal Link 엔드포인트에 FS-029의 `@RequireFeature('contacts')` 가드 적용 |
| Link Survey 페이지 라우트 확장 | 기존 `/s/{surveyId}` 라우트에 suId 쿼리 파라미터 처리 로직 추가 |
| Contact Survey 전용 라우트 | `/c/{token}` 신규 라우트 생성 필요 |
| 감사 로그 연동 | Single-use 설정 변경, 대량 링크 생성, Personal Link 생성 시 AuditLog 기록 |
| i18n 번역 키 | 설정 UI, 상태 메시지(link invalid, link expired, response submitted), 확인 모달 등의 번역 키 추가 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
libs/server/single-use/
├── src/
│   ├── index.ts                              # 퍼블릭 API export
│   └── lib/
│       ├── single-use.module.ts              # NestJS 모듈
│       ├── single-use.controller.ts          # Single-use 링크 API 컨트롤러
│       ├── services/
│       │   ├── single-use.service.ts         # Single-use ID 생성/검증 핵심 로직
│       │   ├── encryption.service.ts         # AES-256-GCM/CBC 암호화/복호화 공통 유틸
│       │   └── bulk-link.service.ts          # 대량 링크 생성 + CSV 생성
│       ├── dto/
│       │   ├── update-single-use-setting.dto.ts  # Single-use 설정 DTO
│       │   └── generate-bulk-links.dto.ts        # 대량 링크 생성 요청 DTO
│       └── constants/
│           └── single-use.constants.ts       # 상수 (최대 생성 수, 환경변수 키 등)

libs/server/personal-link/
├── src/
│   ├── index.ts                              # 퍼블릭 API export
│   └── lib/
│       ├── personal-link.module.ts           # NestJS 모듈
│       ├── personal-link.controller.ts       # Personal Link API 컨트롤러
│       ├── services/
│       │   ├── personal-link.service.ts      # JWT 토큰 생성/검증 핵심 로직
│       │   └── contact-survey.service.ts     # Contact Survey 페이지 데이터 조회
│       ├── dto/
│       │   └── create-personal-link.dto.ts   # Personal Link 생성 DTO
│       └── guards/
│           └── enterprise-feature.guard.ts   # Enterprise 라이선스 가드 (FS-029 연동)

libs/client/single-use/
├── src/
│   ├── index.ts
│   └── lib/
│       ├── single-use-api.ts                 # 서버 API 호출 함수
│       ├── components/
│       │   ├── single-use-toggle.tsx         # Multi-use/Single-use 토글 UI
│       │   ├── single-use-settings.tsx       # Single-use 설정 폼 (heading, subheading, isEncrypted)
│       │   ├── bulk-link-generator.tsx        # 대량 링크 생성 + CSV 다운로드 UI
│       │   └── confirm-toggle-modal.tsx      # 모드 전환 확인 모달
│       ├── hooks/
│       │   └── use-single-use.ts             # Single-use 상태 관리 훅
│       └── schemas/
│           └── single-use.schema.ts          # zod 검증 스키마

libs/client/personal-link/
├── src/
│   ├── index.ts
│   └── lib/
│       ├── personal-link-api.ts              # Personal Link 서버 API 호출
│       ├── components/
│       │   ├── personal-link-creator.tsx     # Personal Link 생성 폼
│       │   └── personal-link-list.tsx        # 생성된 링크 목록/복사
│       ├── hooks/
│       │   └── use-personal-link.ts          # Personal Link 관리 훅
│       └── schemas/
│           └── personal-link.schema.ts       # zod 검증 스키마

apps/client/src/app/[lng]/
├── s/[surveyId]/
│   └── page.tsx                              # Link Survey 페이지 (suId 처리 추가)
└── c/[token]/
    └── page.tsx                              # Contact Survey 페이지 (신규)
```

**모듈 의존 관계**:

```
SingleUseModule
  ├─ imports ─> ServerPrismaModule (DB 접근)
  ├─ imports ─> ConfigModule (ENCRYPTION_KEY 환경변수)
  ├─ uses ──── AuditLogModule (@Global, 감사 로그)
  └─ exports ── EncryptionService (Personal Link 모듈에서 재사용)

PersonalLinkModule
  ├─ imports ─> ServerPrismaModule (DB 접근)
  ├─ imports ─> ConfigModule (ENCRYPTION_KEY 환경변수)
  ├─ imports ─> SingleUseModule (EncryptionService, SingleUseService 사용)
  ├─ uses ──── AuditLogModule (@Global, 감사 로그)
  └─ uses ──── FeatureGatingModule (Enterprise 라이선스 검증, FS-029)
```

**데이터 흐름 (Single-use)**:

```
[Survey Creator] ─── Single-use 설정 ───> [SurveyService (FS-008)]
                                             |
                                             v
                                         Survey.singleUse JSON 업데이트

[Survey Creator] ─── 대량 링크 생성 ───> [SingleUseController]
                                             |
                                             v
                                         [BulkLinkService] ── CUID2 x N개 ── EncryptionService ── CSV 반환

[Respondent] ─── /s/{surveyId}?suId=... ──> [Link Survey Page (Next.js)]
                                             |
                                             v
                                         [Server API] ── SingleUseService.validate() ── Response 조회
                                             |
                                             v
                                         설문 렌더링 / 완료 메시지 / link invalid
```

**데이터 흐름 (Personal Link)**:

```
[Admin] ─── Personal Link 생성 ───> [PersonalLinkController]
                                        |
                                        v
                                    [PersonalLinkService]
                                        ├── EncryptionService.encrypt(contactId)
                                        ├── EncryptionService.encrypt(surveyId)
                                        └── jwt.sign({ ec: encrypted_contactId, es: encrypted_surveyId }, key, { expiresIn })
                                        |
                                        v
                                    URL: {domain}/c/{jwt_token}

[Respondent] ─── /c/{token} ──> [Contact Survey Page (Next.js)]
                                    |
                                    v
                                [Server API] ── PersonalLinkService.verify(token)
                                    ├── jwt.verify(token, key) ── 서명/만료 확인
                                    ├── EncryptionService.decrypt(ec) ── contactId 복원
                                    ├── EncryptionService.decrypt(es) ── surveyId 복원
                                    └── Response 조회 (contactId + surveyId)
                                    |
                                    v
                                설문 렌더링 / response submitted / link expired / link invalid
```

### 2.2 데이터 모델

#### 2.2.1 Survey 모델 (기존, FS-008에서 정의)

Survey 모델의 `singleUse` Json 필드는 FS-008에서 이미 정의되어 있다. 본 계획에서는 이 필드의 TypeScript 타입만 정의한다.

```typescript
// packages/shared-types/src/single-use.types.ts

/**
 * Survey.singleUse JSON 필드의 타입 정의.
 * null이면 Single-use 비활성 상태.
 */
export interface SingleUseSettings {
  /** Single-use 활성화 여부 */
  enabled: boolean;
  /** 완료 시 표시할 커스텀 제목 (null이면 기본 메시지 사용) */
  heading: string | null;
  /** 완료 시 표시할 커스텀 부제 (null이면 기본 메시지 사용) */
  subheading: string | null;
  /** suId URL 파라미터를 AES-256-GCM으로 암호화할지 여부 */
  isEncrypted: boolean;
}
```

#### 2.2.2 Response 최소 스텁 모델 (신규)

FS-021(응답 관리)이 아직 미구현이므로, Single-use ID와 Contact ID 기반 조회를 위한 최소 모델을 정의한다.

```prisma
/// 설문 응답. FS-021에서 완전한 스키마로 확장 예정.
model Response {
  id            String    @id @default(cuid())
  surveyId      String
  finished      Boolean   @default(false)
  singleUseId   String?                       // Single-use 링크의 고유 ID
  contactId     String?                       // Personal Link를 통한 Contact 연결
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  survey        Survey    @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  contact       Contact?  @relation(fields: [contactId], references: [id], onDelete: SetNull)

  @@index([surveyId])
  @@index([surveyId, singleUseId])
  @@index([surveyId, contactId])
  @@map("responses")
}
```

> 참고: Response 모델의 나머지 필드(data, language, ttc, ipAddress 등)는 FS-021에서 추가된다.

#### 2.2.3 Survey 모델 관계 추가

```prisma
model Survey {
  // ... 기존 필드 ...
  responses     Response[]
}
```

#### 2.2.4 Contact 모델 관계 추가

```prisma
model Contact {
  // ... 기존 필드 (FS-026에서 정의) ...
  responses     Response[]
}
```

#### 2.2.5 JWT 페이로드 타입 정의

```typescript
// packages/shared-types/src/personal-link.types.ts

/**
 * Personal Link JWT 토큰의 페이로드 구조.
 * contactId와 surveyId는 AES-256-GCM으로 암호화된 문자열.
 */
export interface PersonalLinkJwtPayload {
  /** AES-256-GCM 암호화된 Contact ID (IV:ciphertext:authTag 형식) */
  ec: string;
  /** AES-256-GCM 암호화된 Survey ID (IV:ciphertext:authTag 형식) */
  es: string;
  /** JWT 표준 만료 시간 (Unix timestamp, optional) */
  exp?: number;
  /** JWT 표준 발행 시간 */
  iat?: number;
}

/**
 * Personal Link 검증 결과.
 */
export type PersonalLinkVerifyResult =
  | { status: 'valid'; contactId: string; surveyId: string }
  | { status: 'expired'; errorDetail: { field: 'token'; issue: 'token_expired' } }
  | { status: 'invalid'; errorDetail: { field: 'token'; issue: 'token_invalid' } };
```

### 2.3 API 설계

#### 2.3.1 Single-use 링크 API

| 메서드 | 엔드포인트 | 설명 | 인증 | 요청/응답 |
|--------|-----------|------|------|----------|
| POST | `/api/v1/surveys/{surveyId}/single-use-links` | 대량 Single-use 링크 생성 (CSV 반환) | API Key 또는 JWT | 요청: `{ quantity: number }` (1~5,000) / 응답: `200 OK` text/csv |

> 참고: Single-use 설정 변경은 Survey 업데이트 API (`PUT /surveys/:id`)의 `singleUse` 필드를 통해 수행한다. FS-008의 SurveyController에서 처리.

#### 2.3.2 Personal Link API

| 메서드 | 엔드포인트 | 설명 | 인증 | 라이선스 | 요청/응답 |
|--------|-----------|------|------|---------|----------|
| POST | `/api/v1/surveys/{surveyId}/personal-links` | Personal Link 생성 | API Key 또는 JWT | Enterprise | 요청: `{ contactId: string, expirationDays?: number }` / 응답: `200 OK` `{ url: string, token: string }` |

#### 2.3.3 설문 페이지 데이터 API (SSR용)

| 메서드 | 엔드포인트 | 설명 | 인증 | 요청/응답 |
|--------|-----------|------|------|----------|
| GET | `/api/v1/link-survey/{surveyId}` | Link Survey 데이터 조회 (suId 검증 포함) | 없음 (공개) | Query: `suId` / 응답: Survey 데이터 + 상태 |
| GET | `/api/v1/contact-survey/{token}` | Contact Survey 데이터 조회 (JWT 검증 포함) | 없음 (공개) | Query: `suId` (optional) / 응답: Survey 데이터 + 상태 + contactId |

#### 2.3.4 응답 형식 상세

**Link Survey API 응답** (`GET /api/v1/link-survey/{surveyId}`):

```typescript
// 설문 렌더링 가능
{
  status: 'active',
  survey: SurveyPublicData,
  responseId: string | null,    // 이어쓰기 시 기존 응답 ID
  singleUseId: string | null    // 검증된 원본 Single-use ID
}

// 완료된 링크
{
  status: 'completed',
  completionMessage: {
    heading: string | null,     // 커스텀 heading 또는 null(기본값 사용)
    subheading: string | null
  }
}

// 무효한 링크
{
  status: 'link_invalid'
}

// 설문 비활성 상태
{
  status: 'paused' | 'survey_completed'
}
```

**Contact Survey API 응답** (`GET /api/v1/contact-survey/{token}`):

```typescript
// 설문 렌더링 가능
{
  status: 'active',
  survey: SurveyPublicData,
  contactId: string,
  responseId: string | null
}

// 이미 응답 완료
{
  status: 'response_submitted'
}

// 토큰 만료
{
  status: 'link_expired'
}

// 토큰 무효
{
  status: 'link_invalid'
}
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 EncryptionService (핵심 암호화 유틸)

```typescript
// libs/server/single-use/src/lib/services/encryption.service.ts

/**
 * AES-256-GCM/CBC 암호화/복호화 서비스.
 * Single-use ID 암호화와 Personal Link 페이로드 암호화에 공용으로 사용한다.
 *
 * - V2 (GCM): 신규 암호화에 사용. IV:ciphertext:authTag 3-part 형식.
 * - V1 (CBC): 레거시 읽기 전용. IV:ciphertext 2-part 형식.
 */
@Injectable()
export class EncryptionService {
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const keyHex = this.configService.get<string>('ENCRYPTION_KEY');
    if (!keyHex) {
      // 키 미설정 시 서비스 자체는 생성하되, encrypt/decrypt 호출 시 에러
      this.encryptionKey = Buffer.alloc(0);
    } else {
      this.encryptionKey = Buffer.from(keyHex, 'hex');
    }
  }

  /**
   * AES-256-GCM으로 평문을 암호화한다.
   * @returns {IV_hex}:{ciphertext_hex}:{authTag_hex} 형식 문자열
   */
  encryptV2(plaintext: string): string { /* ... */ }

  /**
   * AES-256-GCM 암호문을 복호화한다.
   * @returns 복호화된 평문 또는 실패 시 undefined
   */
  decryptV2(encrypted: string): string | undefined { /* ... */ }

  /**
   * AES-256-CBC 레거시 암호문을 복호화한다 (읽기 전용).
   * @returns 복호화된 평문 또는 실패 시 undefined
   */
  decryptV1(encrypted: string): string | undefined { /* ... */ }

  /**
   * 형식을 자동 판별하여 복호화한다.
   * 3-part(:으로 구분) -> V2, 2-part -> V1
   */
  decrypt(encrypted: string): string | undefined { /* ... */ }

  /** 암호화 키가 설정되어 있는지 확인 */
  isKeyConfigured(): boolean { /* ... */ }
}
```

#### 2.4.2 SingleUseService

```typescript
// libs/server/single-use/src/lib/services/single-use.service.ts

/**
 * Single-use ID 생성 및 검증 서비스.
 *
 * CUID2 기반 고유 ID를 생성하고, 설문 설정에 따라
 * AES-256-GCM 암호화를 적용한다.
 */
@Injectable()
export class SingleUseService {
  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Single-use ID를 생성한다.
   * @param isEncrypted true이면 AES-256-GCM 암호화 적용
   * @returns 암호화된 ID 또는 평문 CUID2
   */
  generateId(isEncrypted: boolean): string { /* ... */ }

  /**
   * Single-use ID를 검증한다.
   * 암호화 모드: 복호화 -> CUID2 형식 검사
   * 비암호화 모드: CUID2 형식 검사 (또는 커스텀 ID 허용)
   * @returns 원본 ID 또는 undefined (무효)
   */
  validateId(suId: string, isEncrypted: boolean): string | undefined { /* ... */ }

  /**
   * 설문에 대한 Single-use 응답 상태를 확인한다.
   * @returns { status, responseId, completionMessage }
   */
  async checkResponseStatus(
    surveyId: string,
    singleUseId: string,
    singleUseSettings: SingleUseSettings,
  ): Promise<SingleUseCheckResult> { /* ... */ }
}
```

#### 2.4.3 PersonalLinkService

```typescript
// libs/server/personal-link/src/lib/services/personal-link.service.ts

/**
 * Personal Link JWT 토큰 생성 및 검증 서비스.
 *
 * 이중 암호화: AES-256-GCM(데이터 암호화) + JWT HS256(토큰 서명).
 * Enterprise 라이선스 전용 기능이다.
 */
@Injectable()
export class PersonalLinkService {
  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly singleUseService: SingleUseService,
  ) {}

  /**
   * Personal Link URL을 생성한다.
   * 1계층: contactId, surveyId를 각각 AES-256-GCM 암호화
   * 2계층: 암호화된 값들을 JWT 페이로드에 포함하여 HS256 서명
   */
  async generateLink(params: {
    contactId: string;
    surveyId: string;
    expirationDays?: number;
  }): Promise<{ url: string; token: string }> { /* ... */ }

  /**
   * JWT 토큰을 검증하고 원본 ID를 복원한다.
   * 검증 순서: JWT 서명 -> 만료 확인 -> AES-256-GCM 복호화
   */
  verifyToken(token: string): PersonalLinkVerifyResult { /* ... */ }

  /**
   * Contact의 기존 응답 상태를 확인한다.
   */
  async checkContactResponseStatus(
    contactId: string,
    surveyId: string,
  ): Promise<ContactSurveyCheckResult> { /* ... */ }
}
```

#### 2.4.4 BulkLinkService

```typescript
// libs/server/single-use/src/lib/services/bulk-link.service.ts

/**
 * 대량 Single-use 링크 생성 서비스.
 *
 * 최대 5,000개의 링크를 일괄 생성하고 CSV 형식으로 반환한다.
 */
@Injectable()
export class BulkLinkService {
  constructor(
    private readonly singleUseService: SingleUseService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 지정 수량만큼 Single-use 링크를 생성하고 CSV 문자열을 반환한다.
   * @param surveyId 설문 ID
   * @param quantity 생성 수량 (1~5,000)
   * @param isEncrypted 암호화 여부
   * @returns 줄바꿈으로 구분된 URL 목록 (CSV 형식)
   */
  generateBulkLinks(
    surveyId: string,
    quantity: number,
    isEncrypted: boolean,
  ): string { /* ... */ }
}
```

### 2.5 기존 시스템 영향 분석

| 영향 대상 | 변경 내용 | 영향도 |
|----------|----------|--------|
| `packages/db/prisma/schema.prisma` | Response 최소 스텁 모델 추가, Survey/Contact에 responses 관계 추가 | 높음 |
| Survey 모델 (FS-008) | singleUse Json 필드 이미 정의됨. 변경 불필요 | 없음 |
| Contact 모델 (FS-026) | responses 관계 추가 필요 | 낮음 |
| `apps/server/src/app/app.module.ts` | SingleUseModule, PersonalLinkModule import 추가 | 낮음 |
| `.env.example` | ENCRYPTION_KEY 환경변수 추가 | 낮음 |
| Link Survey 페이지 라우트 (FS-008) | suId 쿼리 파라미터 처리 로직 추가 | 중간 |
| FeatureGatingModule (FS-029) | Personal Link 엔드포인트에 `@RequireFeature('contacts')` 가드 적용 | 낮음 |
| i18n 번역 파일 | single-use, personal-link 네임스페이스 번역 키 추가 | 낮음 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 태스크 이름 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|-----------|------|--------|--------|----------|
| **마일스톤 1: 데이터 모델 및 기반 인프라** | | | | | |
| 1.1 | Response 최소 스텁 모델 추가 | Prisma 스키마에 Response 모델 정의 (id, surveyId, finished, singleUseId, contactId) | FS-008 (Survey), FS-026 (Contact) | Low | 1h |
| 1.2 | DB 마이그레이션 실행 | `prisma migrate dev` 실행 및 검증 | 1.1 | Low | 0.5h |
| 1.3 | TypeScript 타입 정의 | SingleUseSettings, PersonalLinkJwtPayload, 각종 결과 타입을 packages/shared-types에 정의 | - | Low | 1h |
| 1.4 | 환경변수 설정 | `.env.example`에 ENCRYPTION_KEY 추가, ConfigModule 검증 | - | Low | 0.5h |
| **마일스톤 2: 암호화 서비스** | | | | | |
| 2.1 | SingleUseModule 스캐폴딩 | Nx 라이브러리 생성 (`libs/server/single-use/`), NestJS 모듈 파일 | - | Low | 0.5h |
| 2.2 | EncryptionService 구현 | AES-256-GCM 암호화/복호화 (V2), AES-256-CBC 복호화 (V1 레거시), 자동 판별 | 2.1, 1.4 | High | 3h |
| 2.3 | EncryptionService 단위 테스트 | 암호화/복호화 라운드트립, V1/V2 자동 판별, 키 미설정 에러, 변조 감지 | 2.2 | Medium | 2h |
| **마일스톤 3: Single-use ID 생성/검증** | | | | | |
| 3.1 | CUID2 패키지 도입 확인 | `@paralleldrive/cuid2` 설치 확인 (FS-008에서 이미 도입 예정) | FS-008 | Low | 0.5h |
| 3.2 | SingleUseService 구현 | generateId(암호화/비암호화), validateId(복호화+CUID2 검증), checkResponseStatus | 2.2, 3.1, 1.1 | High | 3h |
| 3.3 | SingleUseService 단위 테스트 | ID 생성 고유성, 암호화 모드 검증, 변조 ID 거부, 레거시 V1 호환, 커스텀 suId 허용 | 3.2 | Medium | 2h |
| **마일스톤 4: 대량 링크 생성 API** | | | | | |
| 4.1 | GenerateBulkLinksDto 정의 | quantity 필드 (1~5,000), class-validator 검증 | - | Low | 0.5h |
| 4.2 | BulkLinkService 구현 | 대량 ID 생성 + URL 조합 + CSV 문자열 생성 | 3.2 | Medium | 2h |
| 4.3 | SingleUseController 구현 | POST /api/v1/surveys/:surveyId/single-use-links, CSV Content-Type 응답, 인증 가드 | 4.1, 4.2 | Medium | 2h |
| 4.4 | 대량 링크 생성 통합 테스트 | 5,000개 생성 성능, CSV 형식 검증, 인증 검증, 유효성 에러 | 4.3 | Medium | 2h |
| **마일스톤 5: Personal Link 서비스** | | | | | |
| 5.1 | jsonwebtoken 패키지 도입 | `jsonwebtoken` + `@types/jsonwebtoken` 설치 | - | Low | 0.5h |
| 5.2 | PersonalLinkModule 스캐폴딩 | Nx 라이브러리 생성 (`libs/server/personal-link/`), NestJS 모듈 파일 | - | Low | 0.5h |
| 5.3 | PersonalLinkService 구현 | generateLink(이중 암호화 + JWT 서명), verifyToken(JWT 검증 + 복호화), 만료 처리 | 2.2, 5.1, 5.2 | High | 4h |
| 5.4 | Enterprise Feature Guard | `@RequireFeature('contacts')` 데코레이터 적용을 위한 가드 설정 (FS-029 연동) | FS-029 | Low | 1h |
| 5.5 | CreatePersonalLinkDto 정의 | contactId, expirationDays(optional, 양의 정수), class-validator 검증 | - | Low | 0.5h |
| 5.6 | PersonalLinkController 구현 | POST /api/v1/surveys/:surveyId/personal-links, Enterprise 가드, 인증 가드 | 5.3, 5.4, 5.5 | Medium | 2h |
| 5.7 | PersonalLink 단위/통합 테스트 | JWT 생성/검증 라운드트립, 만료 토큰, 변조 감지, 복호화 실패, Enterprise 가드 차단 | 5.3, 5.6 | High | 3h |
| **마일스톤 6: Link Survey 페이지 (Single-use 렌더링)** | | | | | |
| 6.1 | Link Survey API 엔드포인트 | GET /api/v1/link-survey/:surveyId, suId 쿼리 파라미터 처리, 상태 분기 로직 | 3.2 | Medium | 2.5h |
| 6.2 | Link Survey 페이지 라우트 | `apps/client/src/app/[lng]/s/[surveyId]/page.tsx`, suId 기반 렌더링 분기 | 6.1 | Medium | 3h |
| 6.3 | 상태 메시지 컴포넌트 | link invalid, 완료 메시지 (커스텀 heading/subheading) 표시 컴포넌트 | - | Low | 1.5h |
| 6.4 | Link Survey 페이지 테스트 | 정상 렌더링, 완료 링크, 무효 링크, 미완료 이어쓰기, suId 없음 | 6.2, 6.3 | Medium | 2h |
| **마일스톤 7: Contact Survey 페이지 (Personal Link 렌더링)** | | | | | |
| 7.1 | Contact Survey API 엔드포인트 | GET /api/v1/contact-survey/:token, JWT 검증 + Contact 응답 상태 분기 | 5.3 | Medium | 2.5h |
| 7.2 | Contact Survey 페이지 라우트 | `apps/client/src/app/[lng]/c/[token]/page.tsx`, 상태별 렌더링 | 7.1 | Medium | 3h |
| 7.3 | Contact Survey 상태 컴포넌트 | link expired, link invalid, response submitted 표시 컴포넌트 | - | Low | 1.5h |
| 7.4 | OG 메타데이터 생성 | Contact Survey 페이지의 OG 태그, favicon 설정 (Next.js generateMetadata) | 7.2 | Low | 1h |
| 7.5 | Contact Survey 페이지 테스트 | JWT 유효, 만료, 변조, Contact 이미 응답, Single-use+Personal Link 조합 | 7.2, 7.3 | Medium | 2h |
| **마일스톤 8: 관리 UI (Single-use)** | | | | | |
| 8.1 | 클라이언트 라이브러리 스캐폴딩 | `libs/client/single-use/` 생성 | - | Low | 0.5h |
| 8.2 | single-use zod 스키마 | enabled, heading, subheading, isEncrypted, quantity 검증 스키마 | - | Low | 0.5h |
| 8.3 | single-use-api.ts | apiFetch 기반 대량 링크 생성 API 호출 함수 | 8.1 | Low | 0.5h |
| 8.4 | SingleUseToggle 컴포넌트 | Multi-use/Single-use 상호 배타 토글 스위치 | 8.1 | Medium | 1.5h |
| 8.5 | ConfirmToggleModal 컴포넌트 | 모드 전환 확인/취소 다이얼로그 (shadcn/ui AlertDialog) | 8.4 | Low | 1h |
| 8.6 | SingleUseSettings 컴포넌트 | heading, subheading 입력, isEncrypted 체크박스, 설정 저장 | 8.2 | Medium | 1.5h |
| 8.7 | BulkLinkGenerator 컴포넌트 | 수량 입력, 생성 버튼, 로딩 인디케이터, CSV 자동 다운로드 | 8.2, 8.3 | Medium | 2h |
| 8.8 | useSingleUse 훅 | Single-use 상태 관리, 설정 업데이트 함수 | 8.3 | Low | 1h |
| **마일스톤 9: 관리 UI (Personal Link)** | | | | | |
| 9.1 | 클라이언트 라이브러리 스캐폴딩 | `libs/client/personal-link/` 생성 | - | Low | 0.5h |
| 9.2 | personal-link zod 스키마 | contactId, expirationDays 검증 스키마 | - | Low | 0.5h |
| 9.3 | personal-link-api.ts | apiFetch 기반 Personal Link 생성 API 호출 함수 | 9.1 | Low | 0.5h |
| 9.4 | PersonalLinkCreator 컴포넌트 | Contact 선택, 만료일 입력, 링크 생성 폼 | 9.2, 9.3 | Medium | 2h |
| 9.5 | PersonalLinkList 컴포넌트 | 생성된 링크 표시, 복사 버튼 | 9.4 | Low | 1h |
| 9.6 | usePersonalLink 훅 | Personal Link 생성 상태 관리 | 9.3 | Low | 1h |
| **마일스톤 10: i18n 및 마무리** | | | | | |
| 10.1 | i18n 번역 키 추가 | ko/en 번역 파일에 single-use, personal-link 네임스페이스 추가 | - | Low | 1.5h |
| 10.2 | 감사 로그 연동 | Single-use 설정 변경, 대량 링크 생성, Personal Link 생성 시 AuditLog 기록 | 4.3, 5.6 | Low | 1h |
| 10.3 | 서버 모듈 등록 | app.module.ts에 SingleUseModule, PersonalLinkModule import 추가 | 2.1, 5.2 | Low | 0.5h |
| 10.4 | 전체 통합 테스트 | E2E: 설정 -> 링크 생성 -> 접근 -> 응답 -> 재접근 차단 전체 흐름 | 전체 | High | 3h |

### 3.2 구현 순서 및 마일스톤

```
마일스톤 1: 데이터 모델 및 기반 인프라 (3h)
    ├── 1.1 Response 최소 스텁 모델
    ├── 1.2 DB 마이그레이션
    ├── 1.3 TypeScript 타입 정의
    └── 1.4 환경변수 설정
    [검증: prisma migrate 성공, 타입 빌드 통과]

마일스톤 2: 암호화 서비스 (5.5h)
    ├── 2.1 SingleUseModule 스캐폴딩
    ├── 2.2 EncryptionService 구현
    └── 2.3 EncryptionService 단위 테스트
    [검증: 암호화/복호화 라운드트립 테스트 통과, V1/V2 호환]

마일스톤 3: Single-use ID 생성/검증 (5.5h)
    ├── 3.1 CUID2 패키지 확인
    ├── 3.2 SingleUseService 구현
    └── 3.3 SingleUseService 단위 테스트
    [검증: ID 생성 고유성, 암호화 모드 검증, 변조 감지]

마일스톤 4: 대량 링크 생성 API (6.5h)
    ├── 4.1 GenerateBulkLinksDto
    ├── 4.2 BulkLinkService 구현
    ├── 4.3 SingleUseController
    └── 4.4 통합 테스트
    [검증: 5,000개 생성 성공, CSV 형식 검증, POST API 동작]

마일스톤 5: Personal Link 서비스 (11.5h)
    ├── 5.1 jsonwebtoken 패키지
    ├── 5.2 PersonalLinkModule 스캐폴딩
    ├── 5.3 PersonalLinkService 구현
    ├── 5.4 Enterprise Feature Guard
    ├── 5.5 CreatePersonalLinkDto
    ├── 5.6 PersonalLinkController
    └── 5.7 단위/통합 테스트
    [검증: JWT 생성/검증, 이중 암호화, Enterprise 가드, 만료 처리]

마일스톤 6: Link Survey 페이지 (9h)
    ├── 6.1 Link Survey API
    ├── 6.2 Link Survey 페이지 라우트
    ├── 6.3 상태 메시지 컴포넌트
    └── 6.4 페이지 테스트
    [검증: suId 기반 설문 접근, 완료/무효/이어쓰기 분기 동작]

마일스톤 7: Contact Survey 페이지 (10h)
    ├── 7.1 Contact Survey API
    ├── 7.2 Contact Survey 페이지 라우트
    ├── 7.3 상태 컴포넌트
    ├── 7.4 OG 메타데이터
    └── 7.5 페이지 테스트
    [검증: JWT 토큰 기반 설문 접근, 만료/무효/응답완료 분기, OG 태그]

마일스톤 8: 관리 UI (Single-use) (8.5h)
    ├── 8.1~8.8 UI 컴포넌트 일체
    [검증: 토글 전환, 설정 저장, 대량 생성+CSV 다운로드 동작]

마일스톤 9: 관리 UI (Personal Link) (5.5h)
    ├── 9.1~9.6 UI 컴포넌트 일체
    [검증: Contact 선택, 링크 생성, 복사 기능]

마일스톤 10: i18n 및 마무리 (6h)
    ├── 10.1 번역 키 추가
    ├── 10.2 감사 로그 연동
    ├── 10.3 서버 모듈 등록
    └── 10.4 전체 통합 테스트
    [검증: 전체 E2E 흐름, 한국어/영어 UI, 감사 로그 기록]
```

**총 예상 시간: 약 71시간 (약 9일, 8h/일 기준)**

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|----------|----------|
| **Prisma 스키마** | | |
| `packages/db/prisma/schema.prisma` | 수정 | Response 최소 스텁 모델 추가, Survey/Contact에 responses 관계 추가 |
| **공유 타입** | | |
| `packages/shared-types/src/single-use.types.ts` | 생성 | SingleUseSettings, SingleUseCheckResult 타입 |
| `packages/shared-types/src/personal-link.types.ts` | 생성 | PersonalLinkJwtPayload, PersonalLinkVerifyResult 타입 |
| **서버 라이브러리: libs/server/single-use/** | | |
| `libs/server/single-use/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/server/single-use/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/single-use/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `libs/server/single-use/src/index.ts` | 생성 | 공개 API export (EncryptionService, SingleUseService) |
| `libs/server/single-use/src/lib/single-use.module.ts` | 생성 | SingleUseModule 정의 |
| `libs/server/single-use/src/lib/single-use.controller.ts` | 생성 | 대량 링크 생성 API 엔드포인트 |
| `libs/server/single-use/src/lib/services/encryption.service.ts` | 생성 | AES-256-GCM/CBC 암호화/복호화 서비스 |
| `libs/server/single-use/src/lib/services/single-use.service.ts` | 생성 | Single-use ID 생성/검증 서비스 |
| `libs/server/single-use/src/lib/services/bulk-link.service.ts` | 생성 | 대량 링크 생성 + CSV 서비스 |
| `libs/server/single-use/src/lib/dto/generate-bulk-links.dto.ts` | 생성 | 대량 링크 생성 요청 DTO |
| `libs/server/single-use/src/lib/constants/single-use.constants.ts` | 생성 | 상수 (MAX_BULK_QUANTITY: 5000 등) |
| **서버 라이브러리: libs/server/personal-link/** | | |
| `libs/server/personal-link/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/server/personal-link/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/personal-link/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `libs/server/personal-link/src/index.ts` | 생성 | 공개 API export |
| `libs/server/personal-link/src/lib/personal-link.module.ts` | 생성 | PersonalLinkModule 정의 |
| `libs/server/personal-link/src/lib/personal-link.controller.ts` | 생성 | Personal Link 생성 API 엔드포인트 |
| `libs/server/personal-link/src/lib/services/personal-link.service.ts` | 생성 | JWT 토큰 생성/검증 서비스 |
| `libs/server/personal-link/src/lib/services/contact-survey.service.ts` | 생성 | Contact Survey 데이터 조회 서비스 |
| `libs/server/personal-link/src/lib/dto/create-personal-link.dto.ts` | 생성 | Personal Link 생성 요청 DTO |
| `libs/server/personal-link/src/lib/guards/enterprise-feature.guard.ts` | 생성 | Enterprise 라이선스 가드 (FS-029 연동) |
| **클라이언트 라이브러리: libs/client/single-use/** | | |
| `libs/client/single-use/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/client/single-use/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/client/single-use/src/index.ts` | 생성 | 공개 API export |
| `libs/client/single-use/src/lib/single-use-api.ts` | 생성 | apiFetch 기반 서버 API 호출 |
| `libs/client/single-use/src/lib/components/single-use-toggle.tsx` | 생성 | Multi-use/Single-use 토글 스위치 |
| `libs/client/single-use/src/lib/components/single-use-settings.tsx` | 생성 | heading, subheading, isEncrypted 설정 폼 |
| `libs/client/single-use/src/lib/components/bulk-link-generator.tsx` | 생성 | 대량 링크 생성 + CSV 다운로드 UI |
| `libs/client/single-use/src/lib/components/confirm-toggle-modal.tsx` | 생성 | 모드 전환 확인 모달 (shadcn/ui AlertDialog) |
| `libs/client/single-use/src/lib/hooks/use-single-use.ts` | 생성 | Single-use 상태 관리 훅 |
| `libs/client/single-use/src/lib/schemas/single-use.schema.ts` | 생성 | zod 검증 스키마 |
| **클라이언트 라이브러리: libs/client/personal-link/** | | |
| `libs/client/personal-link/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/client/personal-link/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/client/personal-link/src/index.ts` | 생성 | 공개 API export |
| `libs/client/personal-link/src/lib/personal-link-api.ts` | 생성 | apiFetch 기반 서버 API 호출 |
| `libs/client/personal-link/src/lib/components/personal-link-creator.tsx` | 생성 | Personal Link 생성 폼 |
| `libs/client/personal-link/src/lib/components/personal-link-list.tsx` | 생성 | 생성된 링크 목록/복사 |
| `libs/client/personal-link/src/lib/hooks/use-personal-link.ts` | 생성 | Personal Link 관리 훅 |
| `libs/client/personal-link/src/lib/schemas/personal-link.schema.ts` | 생성 | zod 검증 스키마 |
| **클라이언트 페이지** | | |
| `apps/client/src/app/[lng]/s/[surveyId]/page.tsx` | 생성 | Link Survey 페이지 (Single-use suId 처리) |
| `apps/client/src/app/[lng]/c/[token]/page.tsx` | 생성 | Contact Survey 페이지 (Personal Link JWT 검증) |
| **기존 파일 수정** | | |
| `apps/server/src/app/app.module.ts` | 수정 | SingleUseModule, PersonalLinkModule import 추가 |
| `.env.example` | 수정 | ENCRYPTION_KEY 환경변수 추가 |
| `tsconfig.base.json` | 수정 | 신규 라이브러리 path alias 추가 |
| **i18n** | | |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | single_use, personal_link 번역 키 추가 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | single_use, personal_link 번역 키 추가 |
| **shadcn/ui 컴포넌트** | | |
| `libs/client/ui/` | 수정 (필요시) | AlertDialog, Switch, Input 컴포넌트 확인/추가 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 확률 | 완화 전략 |
|--------|------|------|----------|
| Response 모델 최소 스텁과 FS-021 최종 모델 간 스키마 충돌 | 높음 - DB 마이그레이션 충돌 가능 | 중간 | Response 스텁을 최소 필드(id, surveyId, finished, singleUseId, contactId)로 제한하고, FS-021에서 ALTER TABLE로 필드를 추가하는 전략을 사용한다. 삭제/이름 변경 없이 추가만 허용한다. |
| ENCRYPTION_KEY 미설정 상태에서 기능 접근 | 중간 - 서버 에러 발생 | 중간 | EncryptionService에서 키 설정 여부를 사전 확인하는 `isKeyConfigured()` 메서드를 제공하고, 컨트롤러에서 설정/생성 요청 전 미리 확인하여 명확한 에러 메시지를 반환한다. |
| 5,000개 대량 링크 생성 시 성능 문제 | 중간 - 응답 지연 | 낮음 | AES-256-GCM 암호화는 CPU 바운드이므로 동기 처리한다. Node.js crypto 모듈은 5,000건 처리에 수 초 이내 완료 예상. 타임아웃을 30초로 설정한다. |
| FS-026(Contact) 미구현 시 Personal Link Contact 조회 불가 | 높음 - Personal Link 기능 전체 차단 | 높음 | 구현 순서상 FS-026이 FS-017보다 선행(6단계 vs 7단계)이므로 정상적으로는 Contact 모델이 이미 존재한다. 만약 병행 개발 시에는 Contact ID 존재 여부 확인을 건너뛰는 개발 모드 플래그를 추가한다. |
| FS-029(License) 미구현 시 Enterprise 가드 차단 불가 | 중간 - Personal Link 무제한 접근 | 높음 | 구현 순서상 FS-029가 1단계에 배치되어 있으므로 정상적으로는 이미 구현되어 있다. 미구현 시에는 환경변수 `CONTACTS_ENABLED=true/false`로 간이 가드를 구현한다. |
| AES-256-CBC(V1) 레거시 데이터 존재 시 호환 실패 | 낮음 - 기존 링크 무효화 | 낮음 | V1 포맷(2-part)과 V2 포맷(3-part)을 구분자 개수로 자동 판별한다. 레거시 데이터가 없는 신규 프로젝트라면 V1 코드 경로는 사실상 사용되지 않는다. |
| JWT 키와 AES 키를 동일한 ENCRYPTION_KEY로 공유하는 보안 우려 | 낮음 - 키 유출 시 전체 노출 | 낮음 | 명세서 정의를 따르되, 향후 키 분리(`JWT_SECRET`, `AES_ENCRYPTION_KEY`)를 권장하는 주석을 남긴다. HMAC-SHA256과 AES-256-GCM은 서로 다른 알고리즘이므로 같은 키 사용 자체가 보안 취약점은 아니다. |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 대상 서비스 | 테스트 시나리오 | 주요 검증 항목 |
|------------|---------------|---------------|
| EncryptionService | 암호화/복호화 라운드트립 | 평문 -> 암호화 -> 복호화 -> 원본 일치 확인 |
| EncryptionService | V1(CBC) 레거시 복호화 | 2-part 형식 입력 -> CBC 복호화 성공 |
| EncryptionService | V2(GCM) 자동 판별 | 3-part 형식 -> GCM, 2-part 형식 -> CBC 자동 분기 |
| EncryptionService | 변조된 암호문 거부 | 암호문 1바이트 변경 -> undefined 반환 |
| EncryptionService | 키 미설정 에러 | ENCRYPTION_KEY 없이 encrypt 호출 -> 에러 발생 |
| SingleUseService | ID 생성 (암호화 모드) | 생성된 ID가 IV:ciphertext:authTag 형식 |
| SingleUseService | ID 생성 (비암호화 모드) | 생성된 ID가 CUID2 형식 |
| SingleUseService | ID 검증 (정상) | 생성된 ID -> 검증 -> 원본 반환 |
| SingleUseService | ID 검증 (변조) | 암호문 변조 -> undefined 반환 |
| SingleUseService | ID 검증 (커스텀 비암호화) | 임의 문자열 -> CUID2 형식 검증 생략 -> 원본 반환 |
| BulkLinkService | 대량 생성 | 5,000개 생성 -> 모두 고유 -> CSV 줄 수 일치 |
| BulkLinkService | URL 형식 | 각 URL이 `{domain}/s/{surveyId}?suId={id}` 형식 |
| PersonalLinkService | 링크 생성 (만료 없음) | JWT 생성 -> exp 클레임 없음 -> URL 형식 확인 |
| PersonalLinkService | 링크 생성 (30일 만료) | JWT 생성 -> exp 클레임 = 현재+30일 |
| PersonalLinkService | 토큰 검증 (정상) | 토큰 -> 검증 -> contactId, surveyId 원본 복원 |
| PersonalLinkService | 토큰 검증 (만료) | 만료된 토큰 -> status: 'expired' |
| PersonalLinkService | 토큰 검증 (변조) | 서명 변조 -> status: 'invalid' |
| PersonalLinkService | 토큰 검증 (복호화 실패) | 페이로드 변조 -> AES 복호화 실패 -> status: 'invalid' |

### 5.2 통합 테스트

| 대상 컨트롤러 | 시나리오 | 검증 항목 |
|-------------|---------|----------|
| SingleUseController | POST /single-use-links (정상) | 200 OK, Content-Type: text/csv, quantity 만큼의 URL |
| SingleUseController | POST /single-use-links (수량 초과) | 400 Bad Request, quantity > 5000 에러 |
| SingleUseController | POST /single-use-links (키 미설정) | 500 Internal Server Error, 명확한 에러 메시지 |
| SingleUseController | POST /single-use-links (인증 없음) | 401 Unauthorized |
| PersonalLinkController | POST /personal-links (정상) | 200 OK, url + token 반환 |
| PersonalLinkController | POST /personal-links (Enterprise 미보유) | 403 Forbidden |
| PersonalLinkController | POST /personal-links (Contact 미존재) | 404 Not Found |
| PersonalLinkController | POST /personal-links (Survey 미존재) | 404 Not Found |
| Link Survey API | GET /link-survey/:id (유효 suId) | status: 'active', survey 데이터 |
| Link Survey API | GET /link-survey/:id (완료된 suId) | status: 'completed', completionMessage |
| Link Survey API | GET /link-survey/:id (suId 없음) | status: 'link_invalid' |
| Contact Survey API | GET /contact-survey/:token (유효 토큰) | status: 'active', contactId, surveyId |
| Contact Survey API | GET /contact-survey/:token (만료 토큰) | status: 'link_expired' |
| Contact Survey API | GET /contact-survey/:token (이미 응답) | status: 'response_submitted' |

### 5.3 E2E 테스트

| 시나리오 | 흐름 | 기대 결과 |
|---------|------|----------|
| Single-use 전체 흐름 | 설정 활성화 -> 링크 생성 -> 링크 접근 -> 응답 제출 -> 재접근 | 1회 응답 후 재접근 시 완료 메시지 표시 |
| Single-use 대량 생성 | 수량 입력 -> 생성 -> CSV 다운로드 -> CSV 내 각 링크 유효성 확인 | 모든 링크가 고유하며 유효 |
| Multi-use/Single-use 토글 | Multi-use -> Single-use 전환 -> 확인 모달 -> 설정 변경 | 기존 링크 무효화, 새 모드 설정 |
| Personal Link 전체 흐름 | 링크 생성 -> 링크 접근 -> 응답 제출 -> 재접근 | 1회 응답 후 재접근 시 "response submitted" 표시 |
| Personal Link 만료 | 30일 만료 링크 생성 -> 시간 경과 후 접근 | "link expired" 상태 표시 |
| Single-use + Personal Link 조합 | Personal Link 생성(Single-use 활성 설문) -> 링크에 suId 포함 확인 | URL에 /c/{token}?suId={id} 형태 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 제약사항 | 설명 |
|---------|------|
| Response 모델 스텁 | 본 계획에서는 Response 최소 필드만 정의한다. 완전한 응답 데이터 저장은 FS-021에서 구현된다. |
| DB 기반 Personal Link 이력 미관리 | FS-017의 Personal Link는 stateless JWT 방식이므로, 어떤 Contact에 어떤 링크를 발급했는지 DB에 이력이 남지 않는다. FS-026의 PersonalizedLink 모델과는 별개이다. |
| JWT 키 갱신 시 기존 토큰 무효화 | ENCRYPTION_KEY 변경 시 기존에 발급된 모든 Single-use 암호화 ID와 Personal Link JWT가 무효화된다. 키 로테이션 전략이 별도로 필요하다. |
| 레거시 V1(CBC) 생성 불가 | 신규 암호화는 V2(GCM)만 사용한다. V1(CBC) 형식의 ID는 읽기 전용 복호화만 지원한다. |
| CSV 다운로드 시 DB 저장 없음 | 대량 생성된 Single-use ID는 CSV 파일에만 포함되고 DB에는 저장되지 않는다. 사용 추적은 Response.singleUseId 필드를 통해서만 가능하다. |

### 6.2 향후 개선 가능 사항

| 항목 | 설명 |
|------|------|
| Personal Link 발급 이력 관리 | PersonalizedLink 모델을 활용하여 발급 이력, 접근 횟수, 마지막 접근 시간 등을 DB에 저장하는 기능 |
| 키 로테이션 | 복수 암호화 키를 지원하여 키 갱신 시에도 기존 토큰의 유효성을 유지하는 메커니즘 |
| Segment 기반 대량 Personal Link 생성 | FS-027 Segment와 연동하여 특정 세그먼트의 모든 Contact에 대해 Personal Link를 일괄 생성하는 API |
| Single-use 링크 사용 통계 | 생성된 링크 중 사용된/미사용된 링크 수를 대시보드에서 확인할 수 있는 기능 |
| Personal Link 해지(Revocation) | 발급된 Personal Link를 개별적으로 무효화할 수 있는 블랙리스트 기능 (JWT Revocation) |
| 비밀번호 보호 Personal Link | Personal Link에 추가적인 PIN/비밀번호 보호를 적용하는 기능 |

---

## 7. i18n 고려사항

### 7.1 추가할 번역 키 (ko)

```json
{
  "single_use": {
    "title": "일회용 링크",
    "enabled": "일회용 링크 활성화",
    "encrypted": "응답 ID 암호화",
    "heading_label": "완료 메시지 제목",
    "heading_placeholder": "설문에 참여해 주셔서 감사합니다",
    "subheading_label": "완료 메시지 부제",
    "subheading_placeholder": "귀하의 응답이 기록되었습니다",
    "toggle_to_single_use_title": "일회용 모드로 전환",
    "toggle_to_single_use_message": "일회용 모드로 전환하면 기존 Multi-use 링크가 무효화됩니다. 계속하시겠습니까?",
    "toggle_to_multi_use_title": "Multi-use 모드로 전환",
    "toggle_to_multi_use_message": "Multi-use 모드로 전환하면 기존 Single-use 링크가 무효화됩니다. 계속하시겠습니까?",
    "confirm": "확인",
    "cancel": "취소",
    "bulk_generate_title": "대량 링크 생성",
    "quantity_label": "생성할 링크 수",
    "quantity_placeholder": "1 ~ 5,000",
    "quantity_min_error": "최소 1개 이상이어야 합니다",
    "quantity_max_error": "최대 5,000개까지 생성할 수 있습니다",
    "generate_button": "링크 생성",
    "generating": "생성 중...",
    "download_csv": "CSV 다운로드",
    "link_invalid": "유효하지 않은 링크입니다",
    "link_invalid_description": "이 링크는 유효하지 않거나 이미 만료되었습니다.",
    "already_completed_default_heading": "이미 응답을 완료하셨습니다",
    "already_completed_default_subheading": "이 설문은 이미 완료되었습니다. 감사합니다.",
    "encryption_key_missing": "암호화 키가 설정되지 않았습니다. 관리자에게 문의하세요."
  },
  "personal_link": {
    "title": "개인 링크",
    "create_title": "개인 링크 생성",
    "contact_label": "연락처 선택",
    "contact_placeholder": "연락처를 선택하세요",
    "expiration_label": "만료일 (일 단위)",
    "expiration_placeholder": "미입력 시 무기한",
    "create_button": "링크 생성",
    "creating": "생성 중...",
    "copy_link": "링크 복사",
    "copied": "복사됨!",
    "link_expired": "만료된 링크",
    "link_expired_description": "이 링크는 만료되었습니다. 관리자에게 새 링크를 요청하세요.",
    "link_invalid": "유효하지 않은 링크",
    "link_invalid_description": "이 링크는 유효하지 않습니다.",
    "response_submitted": "이미 응답 완료",
    "response_submitted_description": "이 설문에 대한 응답이 이미 제출되었습니다.",
    "enterprise_required": "Enterprise 플랜이 필요합니다",
    "enterprise_required_description": "개인 링크 기능은 Enterprise 플랜에서만 사용 가능합니다."
  }
}
```

### 7.2 추가할 번역 키 (en)

```json
{
  "single_use": {
    "title": "Single-use Links",
    "enabled": "Enable single-use links",
    "encrypted": "Encrypt response IDs",
    "heading_label": "Completion message heading",
    "heading_placeholder": "Thank you for your response",
    "subheading_label": "Completion message subheading",
    "subheading_placeholder": "Your response has been recorded",
    "toggle_to_single_use_title": "Switch to Single-use Mode",
    "toggle_to_single_use_message": "Switching to single-use mode will invalidate existing multi-use links. Do you want to continue?",
    "toggle_to_multi_use_title": "Switch to Multi-use Mode",
    "toggle_to_multi_use_message": "Switching to multi-use mode will invalidate existing single-use links. Do you want to continue?",
    "confirm": "Confirm",
    "cancel": "Cancel",
    "bulk_generate_title": "Generate Bulk Links",
    "quantity_label": "Number of links to generate",
    "quantity_placeholder": "1 to 5,000",
    "quantity_min_error": "Must be at least 1",
    "quantity_max_error": "Maximum is 5,000",
    "generate_button": "Generate Links",
    "generating": "Generating...",
    "download_csv": "Download CSV",
    "link_invalid": "Invalid Link",
    "link_invalid_description": "This link is invalid or has already expired.",
    "already_completed_default_heading": "You have already completed this survey",
    "already_completed_default_subheading": "This survey has been completed. Thank you.",
    "encryption_key_missing": "Encryption key is not configured. Please contact your administrator."
  },
  "personal_link": {
    "title": "Personal Links",
    "create_title": "Create Personal Link",
    "contact_label": "Select Contact",
    "contact_placeholder": "Choose a contact",
    "expiration_label": "Expiration (in days)",
    "expiration_placeholder": "Leave empty for no expiration",
    "create_button": "Create Link",
    "creating": "Creating...",
    "copy_link": "Copy Link",
    "copied": "Copied!",
    "link_expired": "Link Expired",
    "link_expired_description": "This link has expired. Please request a new link from the administrator.",
    "link_invalid": "Invalid Link",
    "link_invalid_description": "This link is not valid.",
    "response_submitted": "Response Already Submitted",
    "response_submitted_description": "A response has already been submitted for this survey.",
    "enterprise_required": "Enterprise Plan Required",
    "enterprise_required_description": "Personal link feature is only available on the Enterprise plan."
  }
}
```
