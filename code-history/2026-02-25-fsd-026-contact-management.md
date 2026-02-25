# FSD-026 연락처(Contact) 관리 구현

## Overview

Master Implementation Plan의 Stage 6 첫 번째 작업으로, Contact 스텁을 EAV(Entity-Attribute-Value) 패턴으로 정규화하고, CSV Import/Bulk Upload/SDK Identify/개인화 링크 기능을 구현하였다.

기존 Contact 모델의 `attributes Json` 단일 필드를 ContactAttributeKey + ContactAttributeValue 2개 테이블로 분리하여, typed storage(STRING/NUMBER/DATE) 및 환경별 속성 키 스키마 관리를 지원한다.

## Changed Files

### Prisma 스키마
| 파일 | 역할 |
|------|------|
| `packages/db/prisma/schema.prisma` | Contact EAV 모델 추가 (ContactAttributeKey, ContactAttributeValue, PersonalizedLink), enum 2종 추가 (ContactAttributeType, ContactAttributeDataType) |

### 서버 라이브러리 (`libs/server/contact/`)
| 파일 | 역할 |
|------|------|
| `package.json` | `@inquiry/server-contact` 패키지 정의 |
| `tsconfig.json`, `tsconfig.lib.json` | TypeScript 빌드 설정 |
| `src/index.ts` | 배럴 export |
| `src/lib/contact.module.ts` | NestJS ContactModule (컨트롤러 4개, 서비스 6개, 가드 2개 등록) |
| `src/lib/constants/contact.constants.ts` | MAX_CSV_RECORDS, MAX_BULK_SIZE, MAX_ATTRIBUTE_KEYS, DEFAULT_ATTRIBUTE_KEYS, SAFE_IDENTIFIER_REGEX |
| `src/lib/interfaces/contact.types.ts` | DuplicateStrategy enum, CsvImportResult, ProcessResult, ContactWithAttributes, PaginatedResult |
| `src/lib/services/type-detector.service.ts` | CSV/SDK 모드별 데이터 타입 탐지 (STRING/NUMBER/DATE) |
| `src/lib/services/contact-attribute.service.ts` | 속성 키 CRUD, 기본 키 시딩, 속성 값 upsert (typed storage) |
| `src/lib/services/contact.service.ts` | 연락처 CRUD (findAll/findById/delete), SDK identifyByUserId |
| `src/lib/services/duplicate-strategy.service.ts` | skip/update/overwrite 3종 중복 처리 전략 |
| `src/lib/services/csv-import.service.ts` | 8단계 CSV Import 파이프라인 |
| `src/lib/services/personalized-link.service.ts` | HMAC-SHA256 토큰 생성, 링크 생성/검증 |
| `src/lib/controllers/contact.controller.ts` | 내부 API (GET/DELETE /contacts, POST /import, POST /personalized-links) |
| `src/lib/controllers/contact-attribute.controller.ts` | 속성 키 CRUD API (GET/POST/PUT/DELETE) |
| `src/lib/controllers/contact-management-api.controller.ts` | Management API v2 (POST /bulk, GET/DELETE 단건) |
| `src/lib/controllers/contact-client-api.controller.ts` | Client API (POST /identify) |
| `src/lib/guards/enterprise-license.guard.ts` | Enterprise 라이선스 검증 (contacts feature flag + CONTACTS_ENABLED 환경변수 fallback) |
| `src/lib/guards/contact-access.guard.ts` | 환경 접근 + 역할 검증 (envId → project → organization 추적) |
| `src/lib/dto/create-attribute-key.dto.ts` | 속성 키 생성 Zod 스키마 |
| `src/lib/dto/update-attribute-key.dto.ts` | 속성 키 수정 Zod 스키마 |
| `src/lib/dto/search-contact.dto.ts` | 연락처 검색 Zod 스키마 (page, pageSize, search) |
| `src/lib/dto/csv-import.dto.ts` | CSV Import 중복 전략 Zod 스키마 |
| `src/lib/dto/bulk-upload.dto.ts` | Bulk Upload Zod 스키마 (최대 250건) |
| `src/lib/dto/sdk-identify.dto.ts` | SDK Identify Zod 스키마 (userId 필수) |
| `src/lib/dto/create-personalized-link.dto.ts` | 개인화 링크 생성 Zod 스키마 |

### 클라이언트 라이브러리 (`libs/client/contact/`)
| 파일 | 역할 |
|------|------|
| `package.json` | `@inquiry/client-contact` 패키지 정의 |
| `tsconfig.json`, `tsconfig.lib.json` | TypeScript 빌드 설정 |
| `src/index.ts` | 배럴 export |
| `src/lib/contact-api.ts` | API 래퍼 7개 함수 (fetchContacts, deleteContact, importCsvContacts, fetchAttributeKeys, createAttributeKey, updateAttributeKey, deleteAttributeKey) |
| `src/lib/schemas/contact.schema.ts` | Zod 클라이언트 검증 스키마 |
| `src/lib/contact-list.tsx` | 연락처 목록 테이블 (페이지네이션, 검색, 삭제) |
| `src/lib/contact-search.tsx` | 300ms debounce 검색 입력 |
| `src/lib/csv-import-form.tsx` | CSV 업로드 폼 + 중복 전략 선택 |
| `src/lib/csv-import-result.tsx` | Import 결과 표시 |
| `src/lib/delete-contact-dialog.tsx` | 삭제 확인 다이얼로그 |
| `src/lib/attribute-key-manager.tsx` | 속성 키 CRUD 관리 UI |
| `src/lib/enterprise-gate.tsx` | Enterprise 라이선스 안내 |

### 라우트 페이지
| 파일 | 역할 |
|------|------|
| `apps/client/src/app/[lng]/projects/[projectId]/environments/[envId]/contacts/page.tsx` | 연락처 관리 메인 (Tabs: 목록 + 속성 키) |
| `apps/client/src/app/[lng]/projects/[projectId]/environments/[envId]/contacts/import/page.tsx` | CSV Import 페이지 |

### 앱 등록/설정
| 파일 | 역할 |
|------|------|
| `apps/server/src/app/app.module.ts` | ContactModule import 등록 |
| `apps/server/package.json` | `@inquiry/server-contact` 의존성 추가 |
| `apps/client/package.json` | `@inquiry/client-contact` 의존성 추가 |
| `apps/client/tsconfig.json` | client-contact 프로젝트 참조 추가 |
| `package.json` (루트) | csv-parse, @types/multer 의존성 추가 |
| `.env.example` | PERSONALIZED_LINK_SECRET 환경변수 추가 |

### i18n 번역
| 파일 | 역할 |
|------|------|
| `apps/client/src/app/i18n/locales/{locale}/translation.json` (15개 파일) | `contact.*` 네임스페이스 ~50개 키 추가 |

## Major Changes

### 1. EAV 패턴 도입

기존 Contact 모델:
```prisma
model Contact {
  attributes Json @default("{}")  // 비정규화
}
```

변경 후:
```prisma
model ContactAttributeKey {
  id, key, name, type(DEFAULT/CUSTOM), dataType(STRING/NUMBER/DATE), isUnique
  @@unique([key, environmentId])
}

model ContactAttributeValue {
  contactId, contactAttributeKeyId, value(String), numberValue(Float?), dateValue(DateTime?)
  @@unique([contactId, contactAttributeKeyId])
}
```

Environment 생성 시 userId, email, firstName, lastName 4개 기본 속성 키가 자동 시딩된다.

### 2. CSV Import 8단계 파이프라인

1. csv-parse/sync로 UTF-8 파싱
2. 레코드 수(10,000건), email/userId 중복 검증
3. 기본 속성 키 시딩
4. email/userId 값 및 CSV 컬럼명 추출
5. Promise.all로 keyMap, existingByEmail, existingByUserId 병렬 조회
6. 누락 속성 키 자동 생성 (타입 탐지 적용)
7. 레코드별 중복 전략(skip/update/overwrite) 적용 + 속성 값 upsert
8. 결과 집계 + 감사 로그 기록

### 3. 타입 탐지 (CSV vs SDK 모드 분기)

| 입력 | CSV 모드 | SDK 모드 |
|------|---------|---------|
| `"42"` | NUMBER | STRING |
| `42` | NUMBER | NUMBER |
| `"2026-02-25"` | DATE | STRING |
| `"2026-02-25T00:00:00Z"` | DATE | DATE |
| `new Date()` | - | DATE |

### 4. API 라우팅 구조

- 내부 API: `/api/environments/:envId/contacts/*` (JWT 인증, RBAC)
- Management API v2: `/api/v2/management/contacts/*` (API Key 인증)
- Client API v2: `/api/v2/client/:environmentId/contacts/identify` (Environment ID 검증)

### 5. 보안 가드 계층

```
AuthGuard('jwt') → LicenseGuard(@RequireLicense('contacts')) → ContactAccessGuard(@ContactMinRole('ADMIN'))
```

ContactAccessGuard는 envId → project → organization 경로를 추적하여 멤버십 역할을 검증한다.

## How to use it

### CSV Import (내부 API)
```
POST /api/environments/{envId}/contacts/import
Content-Type: multipart/form-data
Authorization: Bearer {jwt}

file: contacts.csv
duplicateStrategy: "skip" | "update" | "overwrite"

→ { "created": 150, "updated": 30, "skipped": 20, "errors": 0 }
```

### Bulk Upload (Management API)
```
POST /api/v2/management/contacts/bulk?environmentId={envId}
x-api-key: {apiKey}

{
  "contacts": [
    { "email": "user@example.com", "userId": "u-1", "attributes": { "plan": "pro" } }
  ]
}

→ { "data": { "created": 1, "updated": 0, "errors": 0 } }
```

### SDK Identify (Client API)
```
POST /api/v2/client/{environmentId}/contacts/identify

{ "userId": "user-123", "attributes": { "email": "a@b.com", "plan": "pro" } }

→ { "data": { "contactId": "clxx...", "isNew": true } }
```

### 속성 키 관리
```
GET /api/environments/{envId}/contact-attribute-keys
POST /api/environments/{envId}/contact-attribute-keys { "key": "plan", "dataType": "STRING" }
PUT /api/environments/{envId}/contact-attribute-keys/{id} { "name": "요금제" }
DELETE /api/environments/{envId}/contact-attribute-keys/{id}
```

### 개인화 링크
```
POST /api/environments/{envId}/contacts/personalized-links
{ "surveyId": "...", "contactIds": ["c1", "c2"], "expirationDays": 30 }
```

## Related Components/Modules

| 모듈 | 관계 |
|------|------|
| `@inquiry/server-prisma` | DB 접근 (Contact, ContactAttributeKey, ContactAttributeValue, PersonalizedLink) |
| `@inquiry/server-audit-log` | 감사 로그 기록 (contact.deleted, contact.csv_imported) |
| `@inquiry/server-license` | Enterprise 라이선스 검증 (contacts feature flag) |
| `@inquiry/server-rbac` | RBAC 패턴 참조 (ContactAccessGuard) |
| `@inquiry/server-api-key` | Management API 인증 (ApiKeyAuthGuard) |
| `@inquiry/server-client-api` | Client API 환경 검증 (EnvironmentIdGuard) |
| `@inquiry/server-rate-limit` | API 요청 제한 |
| `@inquiry/client-core` | 클라이언트 API 래퍼 (apiFetch) |
| `@inquiry/client-ui` | UI 컴포넌트 (Button, Card, Dialog, Select, Badge, Tabs 등) |

## Precautions

- **FS-027 Segment 미구현**: PersonalizedLink의 세그먼트 기반 링크 생성은 FS-027 구현 후 통합 예정. 현재는 contactIds 배열 직접 전달 방식.
- **PERSONALIZED_LINK_SECRET**: 환경변수 미설정 시 기본값('default-secret-change-me') 사용. 프로덕션에서는 반드시 변경 필요.
- **CSV 인코딩**: UTF-8만 지원. 다른 인코딩은 사전 변환 필요.
- **속성 키 제한**: 환경당 최대 150개. DEFAULT 타입(4개) + CUSTOM 타입(최대 146개).
- **Prisma 마이그레이션**: 스키마 변경 후 `pnpm db:generate && pnpm db:migrate` 필요.
- **i18n**: ko-KR, en-US는 완전 번역. 나머지 13개 로케일은 en-US 영문 복사 (추후 번역 필요).
