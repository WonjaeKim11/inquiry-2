# FSD-026 Contact Management - Phase 2: Contact Attribute 시스템 구현

## Overview
Contact 모듈에 속성(Attribute) 관리 시스템을 구현한다. 연락처에 커스텀 속성 키를 정의하고, 각 연락처별로 속성 값을 저장/수정할 수 있는 기반을 마련한다. CSV 업로드와 SDK 연동 시 데이터 타입을 자동 탐지하는 TypeDetectorService를 포함하며, 환경당 최대 150개의 속성 키를 관리할 수 있다.

## Changed Files

### 신규 생성
- `libs/server/contact/src/lib/services/type-detector.service.ts` - 속성 값의 데이터 타입(STRING/NUMBER/DATE)을 CSV/SDK 모드별로 탐지하는 서비스
- `libs/server/contact/src/lib/services/contact-attribute.service.ts` - 속성 키 CRUD + 속성 값 upsert + 기본 키 시드 서비스
- `libs/server/contact/src/lib/dto/create-attribute-key.dto.ts` - 속성 키 생성 요청 Zod 스키마/DTO
- `libs/server/contact/src/lib/dto/update-attribute-key.dto.ts` - 속성 키 수정 요청 Zod 스키마/DTO
- `libs/server/contact/src/lib/controllers/contact-attribute.controller.ts` - 속성 키 REST 컨트롤러 (JWT + License 가드)

### 수정
- `libs/server/contact/src/lib/contact.module.ts` - TypeDetectorService, ContactAttributeService, ContactAttributeController 등록
- `libs/server/contact/src/index.ts` - 신규 서비스/DTO/컨트롤러 공개 API export 추가

## Major Changes

### 1. TypeDetectorService - 데이터 타입 자동 탐지
CSV 모드와 SDK 모드에서 서로 다른 탐지 규칙을 적용한다:
- **CSV 모드**: 문자열을 파싱하여 숫자(`/^[+-]?\d+(\.\d+)?$/`) 및 날짜(ISO 8601, YYYY-MM-DD) 패턴을 탐지
- **SDK 모드**: JavaScript `typeof` 기반으로 판별. `number` 타입 -> NUMBER, `Date` 인스턴스 -> DATE, ISO 8601 문자열만 DATE로 인식
- `determineColumnType()`: 컬럼 전체 값 집합에서 타입이 혼재되면 STRING으로 downgrade

### 2. ContactAttributeService - 속성 키/값 관리
- **findAllKeys**: 환경별 속성 키 목록 조회 (타입순, 키순 정렬)
- **createKey**: safe identifier 검증, DEFAULT 키 충돌 방지, 환경당 최대 150개 제한
- **updateKey/deleteKey**: CUSTOM 타입만 수정/삭제 가능, DEFAULT는 불가
- **seedDefaultKeys**: userId, email, firstName, lastName 기본 키를 멱등하게 시드
- **upsertAttributeValue**: 데이터 타입에 따라 value/numberValue/dateValue 컬럼에 적절히 저장
- **getKeyMap**: key 문자열 -> 속성 키 정보 Map 반환 (CSV Import 등에서 활용)

### 3. REST API 엔드포인트
컨트롤러는 JWT 인증 + `contacts` 라이선스 가드를 적용한다:

| Method | Path | 설명 |
|--------|------|------|
| GET    | `/environments/:envId/contact-attribute-keys` | 속성 키 목록 조회 |
| POST   | `/environments/:envId/contact-attribute-keys` | 속성 키 생성 (201) |
| PUT    | `/environments/:envId/contact-attribute-keys/:id` | 속성 키 수정 |
| DELETE | `/environments/:envId/contact-attribute-keys/:id` | 속성 키 삭제 (204) |

### 4. DTO 검증
Zod 기반 검증으로 요청 데이터를 validate한다:
- `CreateAttributeKeySchema`: key(필수, 1~64자, safe identifier regex), name, description, dataType(STRING|NUMBER|DATE)
- `UpdateAttributeKeySchema`: name, description (둘 다 optional)

## How to use it

### 속성 키 생성
```bash
POST /environments/{envId}/contact-attribute-keys
Authorization: Bearer {jwt}

{
  "key": "companyName",
  "name": "Company Name",
  "description": "The company the contact belongs to",
  "dataType": "STRING"
}
```

### 속성 키 목록 조회
```bash
GET /environments/{envId}/contact-attribute-keys
Authorization: Bearer {jwt}
```

### 속성 키 수정
```bash
PUT /environments/{envId}/contact-attribute-keys/{keyId}
Authorization: Bearer {jwt}

{
  "name": "Updated Company Name",
  "description": "Updated description"
}
```

### 속성 키 삭제
```bash
DELETE /environments/{envId}/contact-attribute-keys/{keyId}
Authorization: Bearer {jwt}
```

### 서비스 레벨에서 사용
```typescript
// 기본 키 시드
await contactAttributeService.seedDefaultKeys(environmentId);

// 속성 값 저장
await contactAttributeService.upsertAttributeValue(
  contactId, attributeKeyId, 'test@example.com', 'STRING'
);

// 타입 탐지
const type = typeDetectorService.detectType('42', 'csv'); // 'NUMBER'
const type2 = typeDetectorService.detectType('42', 'sdk'); // 'STRING'
```

## Related Components/Modules
- `libs/server/contact/src/lib/constants/contact.constants.ts` - MAX_ATTRIBUTE_KEYS, DEFAULT_ATTRIBUTE_KEYS, SAFE_IDENTIFIER_REGEX 상수
- `libs/server/contact/src/lib/interfaces/contact.types.ts` - ContactWithAttributes 등 타입 정의
- `@inquiry/server-prisma` - Prisma ORM 접근 (ContactAttributeKey, ContactAttributeValue 모델)
- `@inquiry/server-core` - ZodValidationPipe, ApiExceptionFilter, ResourceNotFoundException
- `@inquiry/server-license` - LicenseGuard, RequireLicense 데코레이터 (contacts 기능 라이선스)
- `packages/db/prisma/schema.prisma` - ContactAttributeKey, ContactAttributeValue 스키마 정의

## Precautions
- DEFAULT 타입 속성 키(userId, email, firstName, lastName)는 수정/삭제 불가하며, seedDefaultKeys()로 환경 생성 시 자동 시드해야 한다
- 환경당 속성 키는 최대 150개로 제한된다
- 속성 키의 `key` 필드는 영문 알파벳으로 시작해야 하며 알파벳, 숫자, 언더스코어만 허용
- 속성 키 삭제 시 Prisma의 onDelete: Cascade에 의해 해당 키의 모든 값도 함께 삭제된다
- TypeDetectorService의 CSV/SDK 모드 차이에 주의: 동일한 문자열 "42"가 CSV에서는 NUMBER, SDK에서는 STRING으로 탐지됨
