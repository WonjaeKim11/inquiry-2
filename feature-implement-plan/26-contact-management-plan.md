# 기능 구현 계획: 연락처(Contact) 관리 (FS-026)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 우선순위 | 설명 |
|---------|--------|---------|------|
| FN-026-01 | Contact 데이터 모델 | 필수 | Environment 단위로 격리되는 연락처 엔티티 정의 |
| FN-026-02 | Contact Attribute 시스템 | 필수 | 속성 키(default/custom) + 속성 값(string/number/date) typed storage |
| FN-026-03 | CSV Import | 필수 | 최대 10,000건 CSV 대량 가져오기, 3종 중복 전략(skip/update/overwrite), 타입 자동 탐지 |
| FN-026-04 | API v2 Bulk Upload | 필수 | Management API를 통한 최대 250건 연락처 일괄 생성 |
| FN-026-05 | Contact 조회/검색 | 필수 | 페이지네이션 목록 조회, 속성 값/ID 기반 case-insensitive 검색 |
| FN-026-06 | Contact 삭제 | 필수 | Hard delete + cascade (속성 값, 응답 참조, 표시 기록) |
| FN-026-07 | 개인화된 설문 링크 생성 | 필수 | 세그먼트 기반 연락처별 고유 설문 URL 생성 (만료일 선택) |
| FN-026-08 | SDK 자동 연락처 생성 | 필수 | SDK identify 호출 시 userId 기반 자동 생성/업데이트 |

### 1.2 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 라이선스 | Enterprise 라이선스 필수 (feature flag: `contacts = true`) |
| 성능 | CSV 10,000건 병렬 처리, API 응답 평균 2초 이내, 요청 단위 중복 제거 캐싱 |
| 보안 | Environment 단위 데이터 격리, RBAC (관리: OWNER/ADMIN, 조회: MEMBER 이상) |
| Rate Limiting | Management API: 100회/분, Client API: 100회/분 |
| GDPR | Hard delete로 개인 데이터 완전 삭제 보장 |
| 데이터 무결성 | FK 제약, Unique 제약, Cascade 삭제로 고아 레코드 방지 |

### 1.3 명세서 내 모호성 및 해석

| 항목 | 모호성 | 해석/결정 |
|------|--------|----------|
| Manager 역할 | 명세서에서 "Owner/Manager"라고 언급하지만 현재 MembershipRole에는 OWNER/ADMIN/MEMBER만 존재 | 명세서의 "Manager"를 현재 스키마의 `ADMIN`으로 매핑한다. 즉 관리 권한은 OWNER/ADMIN에게 부여한다. |
| Default 속성 키 생성 시점 | "환경 생성 시 userId, email, firstName, lastName이 default 속성 키로 자동 생성"이라 가정하지만, 구체적 생성 로직 미정의 | Environment 생성 트랜잭션(FS-006) 내에서 4개 default 속성 키를 시드하는 로직을 추가한다. 기존 환경에 대해서는 마이그레이션 스크립트로 생성한다. |
| 개인화된 설문 링크 구조 | 링크 URL 형식과 저장 방식이 구체적으로 정의되지 않음 | `{baseUrl}/s/{surveyId}?contact={contactId}&token={signedToken}` 형식으로 생성한다. token은 HMAC-SHA256으로 서명하여 위조를 방지한다. PersonalizedLink 모델을 별도로 생성하여 DB에 저장한다. |
| Segment 의존성 | FN-026-07은 Segment를 전제로 하지만, FS-027(세그먼트/필터)이 미구현 상태 | 개인화된 설문 링크 생성은 FS-027 구현 후 통합한다. 본 계획에서는 서비스 인터페이스만 정의하고 실제 구현은 FS-027 완료 후 진행한다. |
| CSV Import의 "병렬 처리" | 구체적인 병렬 처리 방법 미정의 | DB 조회(기존 연락처, userId, 속성 키)를 `Promise.all`로 병렬화한다. 개별 레코드 처리는 순차적이되, DB 쓰기는 배치(chunk) 단위로 수행한다. |
| Response/Display 모델 관계 | Contact와 Response/Display의 cascade 삭제를 정의하지만, 해당 모델이 현재 미구현 | Prisma 스키마에서 Contact 모델의 관계만 선언하고, Response/Display 모델은 해당 FS 구현 시 실제 관계를 설정한다. 현재는 ContactAttribute cascade만 구현한다. |
| SDK 타입 탐지와 CSV 타입 탐지 분리 | 두 경로의 타입 탐지 규칙이 다르다고 명시 | 공통 TypeDetector 유틸리티에 `mode: 'csv' | 'sdk'` 파라미터를 받아 규칙을 분기한다. CSV는 "42" -> number, SDK는 "42" -> string. |
| email 유니크 제약 | Contact 모델에 email 필드가 별도 컬럼으로 정의되지 않고, 속성(Attribute)으로만 존재 | email은 ContactAttributeKey의 default 속성으로 관리하며, `isUnique: true`로 설정하여 Environment 내 유니크를 보장한다. 검색 성능을 위해 인덱스를 추가한다. |

### 1.4 암시적 요구사항

| 항목 | 설명 |
|------|------|
| Prisma 스키마 확장 | Contact, ContactAttributeKey, ContactAttributeValue 3개 모델 추가 + PersonalizedLink 모델 추가 |
| Environment 모델 선행 | Contact가 Environment에 FK로 연결되므로, FS-006 Environment 모델이 선행 구현되어야 한다 |
| License 시스템 선행 | Enterprise 라이선스 feature flag 검증을 위해 FS-029 License 모듈이 선행되어야 한다 |
| 서버 라이브러리 생성 | `libs/server/contact/` NestJS 모듈 생성 (ContactModule, service, controller, dto, guards) |
| 클라이언트 라이브러리 생성 | `libs/client/contact/` 컴포넌트/훅/API 라이브러리 생성 |
| CSV 파싱 라이브러리 | `papaparse` 또는 `csv-parse` 라이브러리 도입 (서버 사이드 CSV 파싱) |
| 파일 업로드 처리 | NestJS Multer 설정 (CSV 파일 업로드 처리) |
| 클라이언트 zod 스키마 | 클라이언트 폼 검증용 zod 스키마 정의 (서버 DTO 규칙 동기화) |
| Management API 연동 | FS-024의 Management API v2 모듈에 Contact 관련 컨트롤러 추가 |
| Client API 연동 | FS-024의 Client API 모듈에 SDK identify 엔드포인트 추가 |
| i18n 번역 키 추가 | 연락처 관리 UI 관련 ko/en 번역 키 추가 |
| DB 마이그레이션 | Prisma 스키마 변경 후 마이그레이션 실행 |
| Default 속성 키 시딩 | Environment 생성 시 4개 default 속성 키(userId, email, firstName, lastName) 자동 생성 |
| OrgRoleGuard 활용 | FS-003에서 정의한 OrgRoleGuard 패턴을 권한 검증에 재사용 |
| AuditLog 연동 | 연락처 대량 가져오기, 삭제 등 주요 작업에 감사 로그 기록 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

```
[클라이언트 (Next.js 16)]
  apps/client/src/app/[lng]/
    ├── contacts/                      -- 연락처 관리 페이지 라우트
    │   ├── page.tsx                   -- 연락처 목록 (조회/검색/삭제)
    │   └── import/page.tsx            -- CSV 가져오기 페이지

  libs/client/contact/
    ├── src/
    │   ├── index.ts                   -- Public API
    │   ├── lib/
    │   │   ├── contact-api.ts         -- 서버 API 호출 함수
    │   │   ├── contact-list.tsx       -- 연락처 목록 테이블 컴포넌트
    │   │   ├── contact-search.tsx     -- 검색 입력 컴포넌트
    │   │   ├── csv-import-form.tsx    -- CSV 업로드 폼 컴포넌트
    │   │   ├── csv-import-result.tsx  -- 가져오기 결과 표시 컴포넌트
    │   │   ├── delete-contact-dialog.tsx -- 삭제 확인 다이얼로그
    │   │   ├── attribute-key-manager.tsx -- 속성 키 관리 컴포넌트
    │   │   └── schemas/
    │   │       └── contact.schema.ts  -- zod 검증 스키마

[서버 (NestJS 11)]
  libs/server/contact/
    ├── src/
    │   ├── index.ts                   -- Public API
    │   ├── lib/
    │   │   ├── contact.module.ts      -- Contact NestJS 모듈
    │   │   ├── controllers/
    │   │   │   ├── contact.controller.ts         -- 내부 API (관리자 UI용)
    │   │   │   ├── contact-attribute.controller.ts -- 속성 키 관리 API
    │   │   │   ├── contact-management-api.controller.ts -- Management API v2 컨트롤러
    │   │   │   └── contact-client-api.controller.ts    -- Client API 컨트롤러 (SDK identify)
    │   │   ├── services/
    │   │   │   ├── contact.service.ts            -- 연락처 CRUD 핵심 비즈니스 로직
    │   │   │   ├── contact-attribute.service.ts  -- 속성 키/값 관리 로직
    │   │   │   ├── csv-import.service.ts         -- CSV 파싱 및 Import 엔진
    │   │   │   ├── type-detector.service.ts      -- 속성 값 타입 탐지 (CSV/SDK 분기)
    │   │   │   ├── duplicate-strategy.service.ts -- 중복 처리 전략 엔진
    │   │   │   └── personalized-link.service.ts  -- 개인화된 설문 링크 생성
    │   │   ├── dto/
    │   │   │   ├── csv-import.dto.ts             -- CSV Import 요청 DTO
    │   │   │   ├── bulk-upload.dto.ts            -- API Bulk Upload 요청 DTO
    │   │   │   ├── sdk-identify.dto.ts           -- SDK Identify 요청 DTO
    │   │   │   ├── search-contact.dto.ts         -- 조회/검색 요청 DTO
    │   │   │   ├── create-attribute-key.dto.ts   -- 속성 키 생성 DTO
    │   │   │   ├── update-attribute-key.dto.ts   -- 속성 키 수정 DTO
    │   │   │   └── create-personalized-link.dto.ts -- 개인화 링크 생성 DTO
    │   │   ├── guards/
    │   │   │   ├── enterprise-license.guard.ts   -- Enterprise 라이선스 검증 가드
    │   │   │   └── contact-access.guard.ts       -- 환경 접근 + 역할 검증 가드
    │   │   ├── constants/
    │   │   │   └── contact.constants.ts          -- 상수 정의 (제한값, default 속성 키 등)
    │   │   └── interfaces/
    │   │       └── contact.types.ts              -- 타입 정의

[데이터베이스 (Prisma)]
  packages/db/prisma/schema.prisma     -- 스키마 확장 (Contact, AttributeKey, AttributeValue, PersonalizedLink)
```

**모듈 의존 관계**:

```
ContactModule
  ├─ imports ─> ServerPrismaModule (DB 접근)
  ├─ imports ─> ConfigModule (환경 설정)
  ├─ uses ──── AuditLogModule (@Global, 감사 로그)
  ├─ uses ──── LicenseModule (Enterprise 라이선스 검증, FS-029)
  └─ uses ──── OrgRoleGuard (역할 기반 접근 제어, FS-003)
```

### 2.2 데이터 모델

#### 2.2.1 Prisma 스키마 추가 모델

```prisma
/// 속성 키 종류
enum ContactAttributeType {
  DEFAULT
  CUSTOM
}

/// 속성 값 데이터 타입
enum ContactAttributeDataType {
  STRING
  NUMBER
  DATE
}

/// 설문 대상 연락처. Environment 단위로 격리된다.
model Contact {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  environmentId String

  environment   Environment          @relation(fields: [environmentId], references: [id], onDelete: Cascade)
  attributes    ContactAttributeValue[]
  // Response, Display 관계는 해당 모델 구현 시 추가
  // responses     Response[]
  // displays      Display[]

  @@index([environmentId])
  @@map("contacts")
}

/// 연락처 속성 키 정의 (스키마). default(시스템) 또는 custom(사용자 정의).
model ContactAttributeKey {
  id            String                     @id @default(cuid())
  isUnique      Boolean                    @default(false)
  key           String
  name          String?
  description   String?
  type          ContactAttributeType
  dataType      ContactAttributeDataType   @default(STRING)
  environmentId String
  createdAt     DateTime                   @default(now())
  updatedAt     DateTime                   @updatedAt

  environment   Environment                @relation(fields: [environmentId], references: [id], onDelete: Cascade)
  values        ContactAttributeValue[]

  @@unique([key, environmentId])
  @@index([environmentId])
  @@map("contact_attribute_keys")
}

/// 연락처 속성 값. Contact와 AttributeKey 조합으로 유니크.
model ContactAttributeValue {
  id                      String    @id @default(cuid())
  contactAttributeKeyId   String
  contactId               String
  value                   String                           // 항상 문자열로 저장 (하위 호환성)
  numberValue             Float?                           // number 타입 전용
  dateValue               DateTime?                        // date 타입 전용
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  contactAttributeKey     ContactAttributeKey  @relation(fields: [contactAttributeKeyId], references: [id], onDelete: Cascade)
  contact                 Contact              @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@unique([contactId, contactAttributeKeyId])
  @@index([contactAttributeKeyId, value])
  @@index([contactAttributeKeyId, numberValue])
  @@index([contactAttributeKeyId, dateValue])
  @@map("contact_attribute_values")
}

/// 개인화된 설문 링크. Contact별 고유 URL + 선택적 만료일.
model PersonalizedLink {
  id            String    @id @default(cuid())
  contactId     String
  surveyId      String
  token         String    @unique    // HMAC-SHA256 서명 토큰
  expiresAt     DateTime?            // null이면 영구 링크
  createdAt     DateTime  @default(now())

  // Contact, Survey 관계는 해당 모델 존재 시 FK 설정
  // contact       Contact   @relation(fields: [contactId], references: [id], onDelete: Cascade)
  // survey        Survey    @relation(fields: [surveyId], references: [id], onDelete: Cascade)

  @@index([contactId])
  @@index([surveyId])
  @@index([token])
  @@map("personalized_links")
}
```

#### 2.2.2 Environment 모델 관계 추가

```prisma
// Environment 모델에 관계 추가 (FS-006 스키마 확장)
model Environment {
  // ... 기존 필드 ...
  contacts              Contact[]
  contactAttributeKeys  ContactAttributeKey[]
}
```

#### 2.2.3 Default 속성 키 목록

| key | name | dataType | isUnique | 설명 |
|-----|------|----------|----------|------|
| userId | User ID | STRING | true | 사용자 고유 식별자 |
| email | Email | STRING | true | 이메일 주소 |
| firstName | First Name | STRING | false | 이름 |
| lastName | Last Name | STRING | false | 성 |

### 2.3 API 설계

#### 2.3.1 내부 API (관리자 UI용, JWT 인증)

| 메서드 | 엔드포인트 | 설명 | 권한 |
|--------|-----------|------|------|
| POST | `/api/environments/{envId}/contacts/import` | CSV Import | OWNER/ADMIN |
| GET | `/api/environments/{envId}/contacts` | 연락처 목록 조회 (페이지네이션, 검색) | MEMBER 이상 |
| DELETE | `/api/environments/{envId}/contacts/{contactId}` | 연락처 삭제 | OWNER/ADMIN |
| GET | `/api/environments/{envId}/contact-attribute-keys` | 속성 키 목록 조회 | MEMBER 이상 |
| POST | `/api/environments/{envId}/contact-attribute-keys` | 속성 키 생성 | OWNER/ADMIN |
| PUT | `/api/environments/{envId}/contact-attribute-keys/{id}` | 속성 키 수정 (custom만) | OWNER/ADMIN |
| DELETE | `/api/environments/{envId}/contact-attribute-keys/{id}` | 속성 키 삭제 (custom만) | OWNER/ADMIN |
| POST | `/api/environments/{envId}/contacts/personalized-links` | 개인화 링크 생성 | OWNER/ADMIN |

#### 2.3.2 Management API v2 (API Key 인증)

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/v2/management/contacts/bulk` | Bulk Upload (최대 250건) |
| GET | `/api/v2/management/contacts/{contactId}` | 단건 조회 |
| DELETE | `/api/v2/management/contacts/{contactId}` | 삭제 |
| GET | `/api/v2/management/contact-attribute-keys` | 속성 키 목록 조회 |
| POST | `/api/v2/management/contact-attribute-keys` | 속성 키 생성 |
| PUT | `/api/v2/management/contact-attribute-keys/{id}` | 속성 키 수정 |
| DELETE | `/api/v2/management/contact-attribute-keys/{id}` | 속성 키 삭제 |

#### 2.3.3 Client API (Environment ID 기반 공개 접근)

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/v2/client/{environmentId}/contacts/identify` | SDK identify (자동 생성/업데이트) |

#### 2.3.4 주요 요청/응답 형식

**CSV Import 요청** (multipart/form-data):

```
POST /api/environments/{envId}/contacts/import
Content-Type: multipart/form-data

file: <CSV file>
duplicateStrategy: "skip" | "update" | "overwrite"
```

**CSV Import 응답**:

```json
{
  "data": {
    "created": 150,
    "updated": 30,
    "skipped": 20,
    "errors": 0
  }
}
```

**Bulk Upload 요청**:

```json
{
  "contacts": [
    {
      "email": "user@example.com",
      "userId": "user-123",
      "attributes": {
        "firstName": "John",
        "age": 30,
        "signupDate": "2026-01-15T00:00:00Z"
      }
    }
  ]
}
```

**SDK Identify 요청**:

```json
{
  "userId": "user-123",
  "attributes": {
    "email": "user@example.com",
    "plan": "enterprise"
  }
}
```

**연락처 목록 조회 응답**:

```json
{
  "data": [
    {
      "id": "clxx...",
      "createdAt": "2026-02-22T00:00:00Z",
      "updatedAt": "2026-02-22T00:00:00Z",
      "attributes": {
        "email": "user@example.com",
        "firstName": "John",
        "age": 30
      }
    }
  ],
  "totalCount": 500,
  "page": 1,
  "pageSize": 25
}
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 ContactService (핵심 비즈니스 로직)

```typescript
@Injectable()
export class ContactService {
  /**
   * 연락처 목록 조회 (페이지네이션 + 검색)
   * - Environment ID 기반 격리
   * - search 파라미터로 속성 값/연락처 ID 검색 (case-insensitive)
   * - 생성일 내림차순 정렬
   */
  async findAll(environmentId: string, query: SearchContactDto): Promise<PaginatedResult<ContactWithAttributes>>

  /**
   * 연락처 단건 조회 (속성 포함)
   */
  async findById(contactId: string, environmentId: string): Promise<ContactWithAttributes>

  /**
   * 연락처 삭제 (hard delete)
   * - Cascade: ContactAttributeValue 자동 삭제 (DB 레벨)
   * - 감사 로그 기록
   */
  async delete(contactId: string, environmentId: string, userId: string): Promise<void>

  /**
   * SDK identify: userId 기반 연락처 생성 또는 업데이트
   * - 기존 연락처 존재 시 속성 upsert
   * - 미존재 시 신규 생성 + 속성 설정
   */
  async identifyByUserId(environmentId: string, dto: SdkIdentifyDto): Promise<{ contactId: string; isNew: boolean }>
}
```

#### 2.4.2 CsvImportService (CSV Import 엔진)

```typescript
@Injectable()
export class CsvImportService {
  /**
   * CSV Import 전체 파이프라인
   *
   * 1. CSV 파싱 및 기본 유효성 검증 (레코드 수, email 필수, 중복)
   * 2. 메타데이터 추출 (email 목록, userId 목록, 속성 키 목록)
   * 3. DB 병렬 조회 (기존 연락처, userId 연락처, 속성 키)
   * 4. Lookup Map 구성
   * 5. 타입 탐지 + 검증
   * 6. 누락 속성 키 자동 생성
   * 7. 레코드별 중복 전략 적용 처리
   * 8. 결과 집계 반환
   */
  async importCsv(
    environmentId: string,
    file: Buffer,
    strategy: DuplicateStrategy,
    userId: string,
  ): Promise<CsvImportResult>
}
```

#### 2.4.3 TypeDetectorService (타입 탐지)

```typescript
@Injectable()
export class TypeDetectorService {
  /**
   * 단일 값의 데이터 타입을 탐지한다.
   *
   * @param value - 탐지 대상 값
   * @param mode - 'csv' | 'sdk'
   *   - csv: "42" -> number, "2026-02-21" -> date, DD-MM-YYYY/MM-DD-YYYY 인식
   *   - sdk: "42" -> string (JS typeof number만 number), ISO 8601만 date
   * @returns 탐지된 데이터 타입
   */
  detectType(value: unknown, mode: 'csv' | 'sdk'): ContactAttributeDataType

  /**
   * 컬럼의 전체 값들로부터 최종 데이터 타입을 결정한다.
   * 우선순위: Date > Number > String
   * 값이 혼재되면 string으로 downgrade
   */
  determineColumnType(values: unknown[], mode: 'csv' | 'sdk'): ContactAttributeDataType
}
```

#### 2.4.4 DuplicateStrategyService (중복 처리)

```typescript
@Injectable()
export class DuplicateStrategyService {
  /**
   * 중복 처리 전략에 따라 단일 CSV 레코드를 처리한다.
   *
   * - skip: 기존 연락처 존재 시 무시
   * - update: 기존 속성 유지 + 새 속성 upsert
   * - overwrite: 기존 속성 전부 삭제 후 CSV 값으로 대체
   */
  async processRecord(
    record: CsvRecord,
    existingContact: Contact | null,
    strategy: DuplicateStrategy,
    attributeKeyMap: Map<string, ContactAttributeKey>,
    prisma: PrismaTransactionClient,
  ): Promise<ProcessResult>
}
```

### 2.5 기존 시스템 영향 분석

| 영향 대상 | 변경 내용 | 영향도 |
|----------|----------|--------|
| `packages/db/prisma/schema.prisma` | Contact, ContactAttributeKey, ContactAttributeValue, PersonalizedLink 모델 + enum 2개 추가 | 높음 |
| `apps/server/src/app/app.module.ts` | ContactModule import 추가 | 낮음 |
| Environment 모델 (FS-006) | contacts, contactAttributeKeys 관계 추가 | 중간 |
| Management API 모듈 (FS-024) | Contact 관련 컨트롤러 등록 | 중간 |
| Client API 모듈 (FS-024) | SDK identify 엔드포인트 컨트롤러 등록 | 중간 |
| i18n 번역 파일 | contact 네임스페이스 번역 키 추가 (ko/en) | 낮음 |
| `.env.example` | `PERSONALIZED_LINK_SECRET` 환경변수 추가 | 낮음 |
| `package.json` | `csv-parse`, `@types/multer` 패키지 추가 | 낮음 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 태스크 이름 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|-----------|------|--------|--------|----------|
| **마일스톤 1: 데이터 모델 및 기반** | | | | | |
| 1.1 | Prisma 스키마 확장 | Contact, ContactAttributeKey, ContactAttributeValue, PersonalizedLink 모델 + enum 추가 | FS-006 (Environment 모델) | Medium | 2h |
| 1.2 | DB 마이그레이션 실행 | `prisma migrate dev` 실행 및 마이그레이션 파일 검증 | 1.1 | Low | 0.5h |
| 1.3 | 상수 및 타입 정의 | contact.constants.ts (제한값, default 속성 키 목록), contact.types.ts (타입 정의) | - | Low | 1h |
| 1.4 | ContactModule 생성 | NestJS 모듈 파일, 서버 라이브러리 scaffolding (Nx generator) | - | Low | 1h |
| 1.5 | Default 속성 키 시딩 | Environment 생성 로직에 4개 default 속성 키 자동 생성 코드 추가 | 1.2 | Medium | 1.5h |
| **마일스톤 2: Contact Attribute 시스템** | | | | | |
| 2.1 | ContactAttributeService | 속성 키 CRUD, 속성 값 upsert, typed storage 저장 로직 | 1.4 | High | 4h |
| 2.2 | TypeDetectorService | CSV/SDK 모드별 타입 탐지 로직, 컬럼 타입 결정 로직 | 1.3 | Medium | 2h |
| 2.3 | 속성 키 관리 DTO | CreateAttributeKeyDto, UpdateAttributeKeyDto (class-validator) | 1.3 | Low | 1h |
| 2.4 | 속성 키 컨트롤러 | GET/POST/PUT/DELETE 속성 키 엔드포인트 (내부 API) | 2.1, 2.3 | Medium | 2h |
| 2.5 | Attribute 단위 테스트 | 속성 키 CRUD, 타입 탐지, default 보호 검증 | 2.1, 2.2 | High | 3h |
| **마일스톤 3: Contact CRUD 코어** | | | | | |
| 3.1 | ContactService | 연락처 목록 조회 (페이지네이션, 검색), 단건 조회, 삭제 | 2.1 | High | 4h |
| 3.2 | 가드 구현 | EnterpriseLicenseGuard (라이선스 검증), ContactAccessGuard (환경 접근 + 역할) | FS-029 (LicenseModule) | Medium | 2h |
| 3.3 | Contact 조회/삭제 DTO | SearchContactDto, 검증 규칙 | 1.3 | Low | 0.5h |
| 3.4 | Contact 컨트롤러 (내부 API) | GET /contacts, DELETE /contacts/:id | 3.1, 3.2, 3.3 | Medium | 2h |
| 3.5 | Contact CRUD 단위 테스트 | 조회, 검색, 삭제, 환경 격리 검증 | 3.1, 3.4 | High | 3h |
| **마일스톤 4: CSV Import** | | | | | |
| 4.1 | CSV 파싱 인프라 | csv-parse 라이브러리 도입, Multer 파일 업로드 설정 | - | Medium | 1.5h |
| 4.2 | DuplicateStrategyService | 3종 중복 처리 전략 (skip/update/overwrite) 구현 | 2.1 | High | 3h |
| 4.3 | CsvImportService | 전체 Import 파이프라인 구현 (파싱 -> 검증 -> 병렬 조회 -> 타입 탐지 -> 처리) | 2.2, 4.1, 4.2 | Very High | 6h |
| 4.4 | CSV Import DTO | CsvImportDto, DuplicateStrategy enum | - | Low | 0.5h |
| 4.5 | CSV Import 컨트롤러 | POST /contacts/import (multipart/form-data) | 4.3, 4.4 | Medium | 1.5h |
| 4.6 | CSV Import 단위/통합 테스트 | 정상 import, 중복 전략, 타입 탐지, 에러 케이스 | 4.3 | Very High | 5h |
| **마일스톤 5: API v2 Bulk Upload** | | | | | |
| 5.1 | BulkUploadDto | contacts 배열 DTO (class-validator, 최대 250건 검증) | 1.3 | Medium | 1h |
| 5.2 | Bulk Upload 서비스 로직 | 검증 + 연락처 생성 + 속성 저장 배치 처리 | 2.1, 3.1 | High | 3h |
| 5.3 | Management API 컨트롤러 | POST /v2/management/contacts/bulk, GET/DELETE 단건 | 5.1, 5.2 | Medium | 2h |
| 5.4 | Bulk Upload 단위 테스트 | 250건 제한, 중복 검증, 속성 키 자동 생성 | 5.2 | High | 2.5h |
| **마일스톤 6: SDK 자동 연락처 생성** | | | | | |
| 6.1 | SdkIdentifyDto | userId, attributes 검증 DTO | - | Low | 0.5h |
| 6.2 | SDK Identify 서비스 로직 | userId 기반 조회 -> 생성 or 업데이트, SDK 타입 탐지 적용 | 2.2, 3.1 | High | 3h |
| 6.3 | Client API 컨트롤러 | POST /v2/client/{envId}/contacts/identify | 6.1, 6.2 | Medium | 1.5h |
| 6.4 | SDK Identify 단위 테스트 | 자동 생성, 업데이트, 타입 탐지 차이, userId 필수 | 6.2 | High | 2.5h |
| **마일스톤 7: 관리자 UI** | | | | | |
| 7.1 | 클라이언트 라이브러리 scaffolding | libs/client/contact/ 구조 생성, API 호출 함수 | - | Low | 1h |
| 7.2 | 연락처 목록 페이지 | 테이블 (email, userId, 속성), 페이지네이션, 검색, 삭제 버튼 | 7.1 | High | 4h |
| 7.3 | CSV Import 페이지 | 파일 업로드 영역, 중복 전략 선택, 진행 표시, 결과 요약 | 7.1 | High | 3h |
| 7.4 | 속성 키 관리 UI | 속성 키 목록/생성/수정/삭제 (shadcn/ui 컴포넌트) | 7.1 | Medium | 2.5h |
| 7.5 | 삭제 확인 다이얼로그 | shadcn/ui AlertDialog 활용 | 7.1 | Low | 0.5h |
| 7.6 | zod 스키마 정의 | 클라이언트 폼 검증용 (서버 DTO 동기화) | - | Low | 1h |
| 7.7 | i18n 번역 키 추가 | ko/en 번역 파일에 contact 네임스페이스 추가 | - | Low | 1h |
| 7.8 | Enterprise 라이선스 가드 UI | 미활성 시 안내 메시지 표시 컴포넌트 | 7.1 | Low | 1h |
| **마일스톤 8: 개인화된 설문 링크** | | | | | |
| 8.1 | PersonalizedLinkService | HMAC 토큰 생성, 링크 생성, 만료 관리 | 3.1 | High | 3h |
| 8.2 | PersonalizedLink DTO | CreatePersonalizedLinkDto (surveyId, segmentId, expirationDays) | - | Low | 0.5h |
| 8.3 | 개인화 링크 컨트롤러 | POST 엔드포인트 (FS-027 Segment 통합 대기) | 8.1, 8.2 | Medium | 1.5h |
| 8.4 | 개인화 링크 단위 테스트 | 토큰 생성, 만료 검증, 링크 접근 | 8.1 | Medium | 2h |
| **마일스톤 9: 통합 테스트 및 문서화** | | | | | |
| 9.1 | E2E 통합 테스트 | CSV Import -> 조회 -> 검색 -> 삭제 전체 흐름 | 7.3 | High | 3h |
| 9.2 | Management API 통합 테스트 | Bulk Upload -> 조회 -> 삭제 API 흐름 | 5.3 | Medium | 2h |
| 9.3 | 코드 문서화 | code-history 문서 작성 | 9.1 | Low | 1.5h |

**총 예상 시간: 약 91h (약 11.4 영업일)**

### 3.2 구현 순서 및 마일스톤

```
마일스톤 1: 데이터 모델 및 기반 (6h)
  └─ 스키마 확장, 마이그레이션, 상수/타입, 모듈 scaffolding, 시딩
       ↓
마일스톤 2: Contact Attribute 시스템 (12h)
  └─ 속성 키/값 CRUD, 타입 탐지, DTO, 컨트롤러, 테스트
       ↓
마일스톤 3: Contact CRUD 코어 (11.5h)
  └─ 조회/검색/삭제, 가드, DTO, 컨트롤러, 테스트
       ↓
    ┌──────────────┬──────────────────┐
    ↓              ↓                  ↓
마일스톤 4      마일스톤 5         마일스톤 6
CSV Import     Bulk Upload       SDK Identify
(17.5h)        (8.5h)            (7.5h)
    └──────────────┴──────────────────┘
       ↓
마일스톤 7: 관리자 UI (14h)
  └─ 목록, Import, 속성 관리, i18n
       ↓
마일스톤 8: 개인화 링크 (7h) -- FS-027 완료 후 최종 통합
       ↓
마일스톤 9: 통합 테스트 및 문서화 (6.5h)
```

**빌드 검증 시점**:
- 마일스톤 1 완료: `prisma generate` + 서버 빌드 성공 확인 후 커밋
- 마일스톤 2 완료: 속성 키 CRUD API 동작 확인 + 단위 테스트 통과 후 커밋
- 마일스톤 3 완료: Contact 조회/삭제 API 동작 확인 후 커밋
- 마일스톤 4 완료: CSV Import 전체 파이프라인 동작 확인 후 커밋
- 마일스톤 5 완료: Bulk Upload API 동작 확인 후 커밋
- 마일스톤 6 완료: SDK Identify API 동작 확인 후 커밋
- 마일스톤 7 완료: 클라이언트 + 서버 빌드 성공 + UI 동작 확인 후 커밋
- 마일스톤 8 완료: 개인화 링크 생성 동작 확인 후 커밋

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|----------|----------|
| **Prisma 스키마** | | |
| `packages/db/prisma/schema.prisma` | 수정 | Contact, ContactAttributeKey, ContactAttributeValue, PersonalizedLink 모델 추가, ContactAttributeType/ContactAttributeDataType enum 추가, Environment 관계 확장 |
| **서버 라이브러리: libs/server/contact/** | | |
| `libs/server/contact/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/server/contact/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/server/contact/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `libs/server/contact/src/index.ts` | 생성 | 모듈 public API export |
| `libs/server/contact/src/lib/contact.module.ts` | 생성 | ContactModule 정의 (providers, controllers, exports) |
| `libs/server/contact/src/lib/controllers/contact.controller.ts` | 생성 | 내부 API 연락처 조회/삭제 컨트롤러 |
| `libs/server/contact/src/lib/controllers/contact-attribute.controller.ts` | 생성 | 내부 API 속성 키 관리 컨트롤러 |
| `libs/server/contact/src/lib/controllers/contact-management-api.controller.ts` | 생성 | Management API v2 컨트롤러 (bulk upload, CRUD) |
| `libs/server/contact/src/lib/controllers/contact-client-api.controller.ts` | 생성 | Client API 컨트롤러 (SDK identify) |
| `libs/server/contact/src/lib/services/contact.service.ts` | 생성 | 연락처 CRUD 비즈니스 로직 |
| `libs/server/contact/src/lib/services/contact-attribute.service.ts` | 생성 | 속성 키/값 관리 비즈니스 로직 |
| `libs/server/contact/src/lib/services/csv-import.service.ts` | 생성 | CSV Import 파이프라인 |
| `libs/server/contact/src/lib/services/type-detector.service.ts` | 생성 | 데이터 타입 탐지 (CSV/SDK 분기) |
| `libs/server/contact/src/lib/services/duplicate-strategy.service.ts` | 생성 | 3종 중복 처리 전략 엔진 |
| `libs/server/contact/src/lib/services/personalized-link.service.ts` | 생성 | 개인화 설문 링크 생성 서비스 |
| `libs/server/contact/src/lib/dto/csv-import.dto.ts` | 생성 | CSV Import 요청 DTO |
| `libs/server/contact/src/lib/dto/bulk-upload.dto.ts` | 생성 | Bulk Upload 요청 DTO |
| `libs/server/contact/src/lib/dto/sdk-identify.dto.ts` | 생성 | SDK Identify 요청 DTO |
| `libs/server/contact/src/lib/dto/search-contact.dto.ts` | 생성 | 연락처 조회/검색 DTO |
| `libs/server/contact/src/lib/dto/create-attribute-key.dto.ts` | 생성 | 속성 키 생성 DTO |
| `libs/server/contact/src/lib/dto/update-attribute-key.dto.ts` | 생성 | 속성 키 수정 DTO |
| `libs/server/contact/src/lib/dto/create-personalized-link.dto.ts` | 생성 | 개인화 링크 생성 DTO |
| `libs/server/contact/src/lib/guards/enterprise-license.guard.ts` | 생성 | Enterprise 라이선스 검증 가드 |
| `libs/server/contact/src/lib/guards/contact-access.guard.ts` | 생성 | 환경 접근 + 역할 검증 가드 |
| `libs/server/contact/src/lib/constants/contact.constants.ts` | 생성 | 상수 정의 (MAX_CSV_RECORDS, MAX_BULK_SIZE, MAX_ATTRIBUTE_KEYS, DEFAULT_ATTRIBUTE_KEYS 등) |
| `libs/server/contact/src/lib/interfaces/contact.types.ts` | 생성 | 타입 정의 (CsvImportResult, ProcessResult, ContactWithAttributes 등) |
| **클라이언트 라이브러리: libs/client/contact/** | | |
| `libs/client/contact/project.json` | 생성 | Nx 프로젝트 설정 |
| `libs/client/contact/tsconfig.json` | 생성 | TypeScript 설정 |
| `libs/client/contact/tsconfig.lib.json` | 생성 | 라이브러리 빌드 설정 |
| `libs/client/contact/src/index.ts` | 생성 | 모듈 public API export |
| `libs/client/contact/src/lib/contact-api.ts` | 생성 | 서버 API 호출 함수 (apiFetch 래퍼) |
| `libs/client/contact/src/lib/contact-list.tsx` | 생성 | 연락처 목록 테이블 컴포넌트 |
| `libs/client/contact/src/lib/contact-search.tsx` | 생성 | 검색 입력 컴포넌트 |
| `libs/client/contact/src/lib/csv-import-form.tsx` | 생성 | CSV 업로드 폼 (드래그 앤 드롭, 전략 선택) |
| `libs/client/contact/src/lib/csv-import-result.tsx` | 생성 | Import 결과 표시 (생성/업데이트/스킵/에러 카운트) |
| `libs/client/contact/src/lib/delete-contact-dialog.tsx` | 생성 | 삭제 확인 AlertDialog |
| `libs/client/contact/src/lib/attribute-key-manager.tsx` | 생성 | 속성 키 목록/생성/수정/삭제 UI |
| `libs/client/contact/src/lib/enterprise-gate.tsx` | 생성 | Enterprise 라이선스 미활성 시 안내 컴포넌트 |
| `libs/client/contact/src/lib/schemas/contact.schema.ts` | 생성 | zod 검증 스키마 |
| **클라이언트 페이지** | | |
| `apps/client/src/app/[lng]/contacts/page.tsx` | 생성 | 연락처 관리 메인 페이지 |
| `apps/client/src/app/[lng]/contacts/import/page.tsx` | 생성 | CSV Import 페이지 |
| **i18n 번역 파일** | | |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | contact 네임스페이스 번역 키 추가 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | contact 네임스페이스 번역 키 추가 |
| **앱 모듈 등록** | | |
| `apps/server/src/app/app.module.ts` | 수정 | ContactModule import 추가 |
| **패키지 설정** | | |
| `tsconfig.base.json` | 수정 | @inquiry/server-contact, @inquiry/client-contact 경로 매핑 추가 |
| `package.json` | 수정 | csv-parse 패키지 의존성 추가 |
| `.env.example` | 수정 | PERSONALIZED_LINK_SECRET 환경변수 추가 |
| **shadcn/ui 컴포넌트 추가** | | |
| `libs/client/ui/src/components/ui/table.tsx` | 생성 | 테이블 컴포넌트 (연락처 목록용) |
| `libs/client/ui/src/components/ui/dialog.tsx` | 생성 | 다이얼로그 컴포넌트 (속성 키 관리용) |
| `libs/client/ui/src/components/ui/alert-dialog.tsx` | 생성 | AlertDialog 컴포넌트 (삭제 확인용) |
| `libs/client/ui/src/components/ui/select.tsx` | 생성 | Select 컴포넌트 (중복 전략 선택용) |
| `libs/client/ui/src/components/ui/radio-group.tsx` | 생성 | RadioGroup 컴포넌트 (중복 전략 선택 대안) |
| `libs/client/ui/src/components/ui/pagination.tsx` | 생성 | 페이지네이션 컴포넌트 |
| `libs/client/ui/src/components/ui/badge.tsx` | 생성 | Badge 컴포넌트 (속성 타입 표시용) |
| `libs/client/ui/src/components/ui/skeleton.tsx` | 생성 | Skeleton 로딩 컴포넌트 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 확률 | 완화 전략 |
|--------|------|------|----------|
| FS-006 (Environment) 미구현 시 Contact FK 연결 불가 | 높음 | 중간 | Environment 스텁 모델을 먼저 생성하여 FK만 설정 가능하도록 한다. FS-006 완료 후 관계를 보강한다. |
| FS-029 (License) 미구현 시 Enterprise 가드 동작 불가 | 중간 | 중간 | EnterpriseLicenseGuard에서 LicenseModule 미존재 시 기능을 허용하는 fallback 모드를 구현한다. 환경변수 `CONTACTS_ENABLED=true`로 제어. |
| CSV 10,000건 Import 시 메모리/성능 문제 | 중간 | 중간 | 스트리밍 파싱(csv-parse의 stream API) 사용, 배치 크기를 100~500건 단위로 분할 처리, DB 쓰기는 트랜잭션 배치로 수행한다. |
| 속성 값 타입 탐지 정확도 | 낮음 | 높음 | "02-21-2026" 같은 모호한 날짜 형식에 대해 보수적으로 string 처리. 엄격한 ISO 8601 + 제한된 날짜 패턴만 인식하도록 한다. |
| Management API 모듈(FS-024) 미구현 시 v2 엔드포인트 라우팅 불가 | 중간 | 중간 | ContactModule 내에 자체 라우팅을 설정하고, FS-024 구현 시 RouterModule 기반 라우팅으로 전환한다. |
| Segment 모델(FS-027) 미구현으로 개인화 링크 기능 불완전 | 낮음 | 높음 | PersonalizedLinkService의 인터페이스만 정의하고, Segment 없이 contactId 배열을 직접 받는 임시 API를 제공한다. FS-027 완료 후 통합. |
| 대량 CSV Import 중 네트워크/서버 장애 | 중간 | 낮음 | 배치 단위 트랜잭션으로 부분 성공을 허용한다. 이미 처리된 레코드는 일관된 상태를 유지하고, 결과에 처리 현황을 반환한다. |
| email isUnique 제약과 CSV Import 성능 충돌 | 중간 | 중간 | 유니크 검증을 DB 레벨 제약 대신 애플리케이션 레벨 Lookup Map으로 먼저 처리하고, DB upsert시 conflict 핸들링으로 보완한다. |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 대상 | 테스트 항목 | 핵심 시나리오 |
|------|-----------|-------------|
| TypeDetectorService | 타입 탐지 정확성 | CSV 모드: "42" -> number, "2026-02-21" -> date, "hello" -> string / SDK 모드: "42" -> string, ISO 8601 -> date |
| TypeDetectorService | 컬럼 타입 결정 | 혼재 값 -> string downgrade, 우선순위 Date > Number > String |
| ContactAttributeService | 속성 키 CRUD | 생성, 수정, 삭제, default 보호, 150개 상한, safe identifier 검증, 유니크 제약 |
| ContactAttributeService | 속성 값 typed storage | string/number/date 각각 올바른 컬럼에 저장, 문자열 컬럼 하위 호환성 |
| ContactService | 조회/검색 | 페이지네이션, case-insensitive 검색, 환경 격리, 생성일 내림차순 |
| ContactService | 삭제 | Hard delete, cascade 속성 삭제, 존재하지 않는 연락처 404 |
| DuplicateStrategyService | 3종 전략 | skip: 기존 무시, update: 속성 upsert, overwrite: 전부 삭제 후 재생성 |
| CsvImportService | 검증 로직 | 10,000건 초과, email 누락, CSV 내 email/userId 중복, safe identifier 위반, 타입 불일치 |
| CsvImportService | Import 파이프라인 | 정상 import, 속성 키 자동 생성, userId 충돌 해결 |
| PersonalizedLinkService | 링크 생성 | 토큰 생성, 만료일 설정/미설정, 토큰 검증 |

### 5.2 통합 테스트

| 대상 | 테스트 항목 |
|------|-----------|
| CSV Import E2E | CSV 업로드 -> 파싱 -> 검증 -> 속성 키 자동 생성 -> 연락처 생성 -> 결과 반환 |
| Management API | API Key 인증 -> Bulk Upload -> 단건 조회 -> 삭제 |
| Client API | SDK identify -> 연락처 자동 생성 -> 재호출 시 업데이트 |
| 환경 격리 | 환경 A에서 생성한 연락처가 환경 B에서 조회 불가 |
| 라이선스 가드 | Enterprise 라이선스 미활성 시 모든 엔드포인트 접근 차단 |
| Cascade 삭제 | 연락처 삭제 시 모든 속성 값 함께 삭제 확인 |

### 5.3 E2E 테스트

| 시나리오 | 테스트 흐름 |
|---------|-----------|
| CSV Import 전체 흐름 | 1. 관리자 로그인 -> 2. 연락처 관리 페이지 접근 -> 3. CSV 파일 업로드 + 전략 선택 -> 4. 진행 표시 확인 -> 5. 결과 요약 확인 -> 6. 목록에서 생성된 연락처 확인 |
| 검색 및 삭제 | 1. 연락처 목록 조회 -> 2. 검색어 입력 -> 3. 결과 확인 -> 4. 삭제 클릭 -> 5. 확인 다이얼로그 -> 6. 삭제 완료 확인 |
| 라이선스 미활성 | 1. Enterprise 라이선스 미활성 상태 -> 2. 연락처 관리 접근 -> 3. 안내 메시지 표시 확인 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 제약 |
|------|------|
| 수동 생성 미지원 | 관리자 UI에서 개별 연락처를 수동으로 생성하는 기능은 범위 밖이다. CSV 또는 API로만 생성 가능. |
| 병합 미지원 | 연락처 병합(merge) 기능은 현재 지원하지 않는다. |
| 소프트 삭제 미지원 | Hard delete만 지원하며, 삭제 취소 기능은 없다. |
| 선행 의존성 | FS-006 (Environment), FS-029 (License), FS-024 (API 베이스라인)이 구현되어야 완전한 기능이 동작한다. |
| 개인화 링크 | FS-027 (Segment) 구현 전까지 세그먼트 기반 링크 생성은 불가하다. contactId 배열 기반 임시 방식으로 제공한다. |
| 속성 데이터 타입 | string, number, date 3종만 지원한다. boolean, array, object 등은 미지원. |
| CSV 인코딩 | UTF-8 인코딩만 지원한다. EUC-KR 등 다른 인코딩은 사전 변환이 필요하다. |

### 6.2 향후 개선 가능 사항

| 항목 | 설명 |
|------|------|
| 관리자 UI 수동 생성 | 연락처 목록 화면에서 개별 연락처를 직접 입력하는 폼 추가 |
| 연락처 병합 | 중복 연락처를 감지하고 병합하는 기능 |
| 소프트 삭제 | deletedAt 필드를 추가하여 복구 가능한 삭제 지원 |
| 속성 타입 확장 | boolean, JSON, array 등 추가 데이터 타입 지원 |
| CSV 인코딩 자동 감지 | chardet 라이브러리를 활용한 인코딩 자동 감지 |
| 비동기 CSV Import | 대용량 CSV는 백그라운드 큐(BullMQ)로 처리하고 진행률을 WebSocket으로 전달 |
| 연락처 내보내기 | 연락처 목록을 CSV/Excel로 내보내기 |
| 고급 검색/필터 | 속성 타입별 연산자(숫자 범위, 날짜 범위 등) 지원 검색 |
| Redis 캐싱 | 연락처/속성 키 조회에 Redis 캐싱 적용으로 성능 개선 |

---

## 7. i18n 고려사항

### 7.1 추가/수정이 필요한 번역 키

```json
{
  "contact": {
    "title": "연락처 관리",
    "description": "설문 대상 연락처를 관리합니다.",
    "list": {
      "empty": "연락처가 없습니다.",
      "search_placeholder": "이메일, 이름 또는 ID로 검색",
      "search_no_result": "검색 결과가 없습니다.",
      "total_count": "전체 {{count}}건",
      "page_info": "{{page}} / {{totalPages}} 페이지"
    },
    "import": {
      "title": "CSV 가져오기",
      "description": "CSV 파일을 업로드하여 연락처를 대량으로 가져옵니다.",
      "upload_area": "CSV 파일을 드래그하거나 클릭하여 선택하세요",
      "strategy_label": "중복 처리 전략",
      "strategy_skip": "건너뛰기 (기존 유지)",
      "strategy_update": "업데이트 (기존 + 신규 병합)",
      "strategy_overwrite": "덮어쓰기 (기존 삭제 후 대체)",
      "submit": "가져오기",
      "processing": "처리 중...",
      "result_title": "가져오기 결과",
      "result_created": "생성: {{count}}건",
      "result_updated": "업데이트: {{count}}건",
      "result_skipped": "건너뜀: {{count}}건",
      "result_errors": "에러: {{count}}건"
    },
    "delete": {
      "title": "연락처 삭제",
      "confirm_message": "이 연락처를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
      "success": "연락처가 삭제되었습니다.",
      "cancel": "취소",
      "submit": "삭제"
    },
    "attribute": {
      "title": "속성 키 관리",
      "create": "속성 키 추가",
      "key_label": "키 이름",
      "key_placeholder": "소문자, 숫자, 언더스코어만 사용",
      "name_label": "표시 이름",
      "description_label": "설명",
      "data_type_label": "데이터 타입",
      "type_string": "문자열",
      "type_number": "숫자",
      "type_date": "날짜",
      "type_default": "시스템 속성",
      "type_custom": "사용자 정의",
      "delete_confirm": "이 속성 키를 삭제하면 모든 연락처의 해당 속성 값도 함께 삭제됩니다. 계속하시겠습니까?"
    },
    "license": {
      "required_title": "Enterprise 라이선스 필요",
      "required_message": "연락처 관리 기능을 사용하려면 Enterprise 라이선스가 필요합니다."
    },
    "errors": {
      "csv_max_records": "CSV 파일의 레코드 수는 10,000건을 초과할 수 없습니다.",
      "email_required": "모든 레코드에 email 필드가 필요합니다. {{row}}번째 행에 email이 없습니다.",
      "email_duplicate_csv": "CSV 파일 내에 중복된 email이 있습니다: {{email}}",
      "userId_duplicate_csv": "CSV 파일 내에 중복된 userId가 있습니다: {{userId}}",
      "key_invalid": "속성 키 '{{key}}'는 safe identifier 규칙에 맞지 않습니다.",
      "type_mismatch": "속성 '{{key}}'의 타입({{expectedType}})과 CSV 값의 타입({{actualType}})이 일치하지 않습니다.",
      "attribute_key_limit": "환경당 최대 속성 키 수(150개)를 초과했습니다.",
      "attribute_key_exists": "이미 존재하는 속성 키 이름입니다.",
      "default_key_protected": "시스템 속성은 수정하거나 삭제할 수 없습니다.",
      "contact_not_found": "연락처를 찾을 수 없습니다.",
      "bulk_max_size": "한 번에 업로드할 수 있는 연락처 수는 최대 250건입니다.",
      "invalid_email": "유효하지 않은 이메일 형식입니다: {{email}}",
      "value_type_mismatch": "'{{value}}'은(는) {{type}} 형식에 맞지 않습니다."
    }
  }
}
```

위 키들은 `apps/client/src/app/i18n/locales/ko/translation.json`과 `apps/client/src/app/i18n/locales/en/translation.json`에 각각 한국어/영어로 추가한다.
