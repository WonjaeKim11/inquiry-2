# FSD-026 Contact Management - Phase 1: Prisma 스키마 변경 + 서버 라이브러리 Scaffolding

## Overview
Contact 관리 기능의 기반을 구축하기 위해 Prisma 스키마에 연락처 속성(EAV) 모델과 개인화 링크 모델을 추가하고, NestJS 서버 라이브러리 `@inquiry/server-contact`를 스캐폴딩한다. 기존 Contact 모델의 `attributes Json` 필드를 제거하고, ContactAttributeKey/ContactAttributeValue 테이블로 정규화된 EAV(Entity-Attribute-Value) 패턴을 도입하여 속성별 타입 검증, 유니크 제약, 효율적인 인덱싱이 가능하게 했다.

## Changed Files

### 수정된 파일
- `packages/db/prisma/schema.prisma` - Contact 모델에서 `attributes Json` 필드 제거, EAV 모델(ContactAttributeKey, ContactAttributeValue) 추가, PersonalizedLink 모델 추가, enum 2종(ContactAttributeType, ContactAttributeDataType) 추가, Environment/Survey/Contact 모델에 관계 추가
- `apps/server/src/app/app.module.ts` - ContactModule import 및 등록
- `apps/server/package.json` - `@inquiry/server-contact` workspace 의존성 추가

### 신규 생성 파일
- `libs/server/contact/package.json` - 서버 Contact 라이브러리 패키지 설정
- `libs/server/contact/tsconfig.json` - TypeScript 프로젝트 참조 설정
- `libs/server/contact/tsconfig.lib.json` - TypeScript 라이브러리 빌드 설정
- `libs/server/contact/src/index.ts` - 라이브러리 공개 API 배럴 파일
- `libs/server/contact/src/lib/contact.module.ts` - NestJS ContactModule 정의
- `libs/server/contact/src/lib/constants/contact.constants.ts` - CSV Import 제한, 기본 속성 키 목록, 정규식 등 상수 정의
- `libs/server/contact/src/lib/interfaces/contact.types.ts` - DuplicateStrategy, CsvImportResult, PaginatedResult 등 타입/인터페이스 정의

## Major Changes

### 1. Prisma 스키마 - EAV 패턴 도입
기존 Contact 모델의 `attributes Json @default("{}")` 필드를 제거하고, 정규화된 3개 테이블로 분리했다.

```prisma
// ContactAttributeKey: 환경별 속성 키 정의 (DEFAULT/CUSTOM)
model ContactAttributeKey {
  id            String                     @id @default(cuid())
  isUnique      Boolean                    @default(false)
  key           String
  type          ContactAttributeType       // DEFAULT | CUSTOM
  dataType      ContactAttributeDataType   @default(STRING)  // STRING | NUMBER | DATE
  environmentId String
  // ...
  @@unique([key, environmentId])
}

// ContactAttributeValue: 연락처별 속성 값 (다중 타입 컬럼으로 인덱싱)
model ContactAttributeValue {
  value       String      // 문자열 표현 (공통)
  numberValue Float?      // 숫자 타입일 때 인덱싱용
  dateValue   DateTime?   // 날짜 타입일 때 인덱싱용
  // ...
  @@unique([contactId, contactAttributeKeyId])
  @@index([contactAttributeKeyId, value])
  @@index([contactAttributeKeyId, numberValue])
  @@index([contactAttributeKeyId, dateValue])
}
```

### 2. PersonalizedLink 모델
Contact별 고유 설문 URL을 생성하기 위한 모델. token으로 유니크 인덱스와 별도 인덱스를 모두 갖는다.

### 3. 서버 라이브러리 Scaffolding
`@inquiry/server-survey` 패턴을 참조하여 `@inquiry/server-contact` 라이브러리를 생성했다. ContactModule은 빈 상태로 시작하며, 후속 Phase에서 Controller/Service/DTO가 추가될 예정이다.

### 4. 상수 및 타입 정의
- `DEFAULT_ATTRIBUTE_KEYS`: Environment 생성 시 자동 생성되는 기본 속성 키 4종 (userId, email, firstName, lastName)
- `DuplicateStrategy`: CSV Import 시 중복 처리 전략 (skip/update/overwrite)
- `PaginatedResult<T>`: 페이지네이션 응답 제네릭 타입

## How to use it

### Prisma 마이그레이션 적용
```bash
pnpm db:generate    # Prisma Client 재생성
pnpm db:migrate dev --name add-contact-attributes  # 마이그레이션 생성 및 적용
```

### 라이브러리 사용 예시
```typescript
import { ContactModule } from '@inquiry/server-contact';
import { DEFAULT_ATTRIBUTE_KEYS, MAX_CSV_RECORDS } from '@inquiry/server-contact';
import { DuplicateStrategy, type PaginatedResult } from '@inquiry/server-contact';
```

## Related Components/Modules
- `@inquiry/server-prisma` - Prisma Client를 통한 DB 접근 (Global 모듈)
- `@inquiry/server-audit-log` - 연락처 변경 감사 로그 기록
- `@inquiry/server-license` - 라이선스 기반 기능 제한 확인
- `@inquiry/server-project` - Environment 생성 시 기본 ContactAttributeKey 생성 연동 필요
- `apps/server` - AppModule에서 ContactModule을 import하여 등록

## Precautions
- 아직 DB 마이그레이션이 실행되지 않았으므로, 실제 DB 적용을 위해 `pnpm db:migrate dev` 실행 필요
- Contact 모델에서 `attributes Json` 필드가 제거되었으므로, 기존 코드에서 해당 필드를 참조하는 부분이 있다면 수정 필요
- ContactModule은 현재 빈 상태이며, Phase 2 이후에 Controller, Service, DTO가 구현될 예정
- Environment 생성 시 DEFAULT_ATTRIBUTE_KEYS를 자동 생성하는 로직은 후속 Phase에서 ProjectService에 통합 필요
