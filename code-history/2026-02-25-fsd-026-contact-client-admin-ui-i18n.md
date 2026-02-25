# FSD-026 Contact Management - Phase 6: Client 라이브러리 + Admin UI + i18n

## Overview
연락처 관리 기능의 클라이언트 측 구현을 완료한다. `@inquiry/client-contact` 라이브러리를 새로 생성하여 API 래퍼, Zod 스키마, React 컴포넌트(연락처 목록, CSV Import, 속성 키 관리, 삭제 다이얼로그 등)를 제공하고, Admin UI 라우트 페이지를 추가하며, 15개 로케일에 `contact.*` i18n 키를 추가한다.

## Changed Files

### 신규 생성 - 라이브러리 Scaffolding
- `libs/client/contact/package.json` — `@inquiry/client-contact` 패키지 정의
- `libs/client/contact/tsconfig.json` — 프로젝트 참조 설정
- `libs/client/contact/tsconfig.lib.json` — 라이브러리 빌드 설정 (react-jsx, bundler 해상도)

### 신규 생성 - API + 스키마
- `libs/client/contact/src/lib/contact-api.ts` — 연락처 CRUD, CSV Import, 속성 키 CRUD API 래퍼
- `libs/client/contact/src/lib/schemas/contact.schema.ts` — 속성 키 생성/CSV Import용 Zod 스키마

### 신규 생성 - UI 컴포넌트
- `libs/client/contact/src/lib/contact-list.tsx` — 연락처 목록 테이블 (페이지네이션, 검색, 삭제)
- `libs/client/contact/src/lib/contact-search.tsx` — 300ms debounce 검색 입력 컴포넌트
- `libs/client/contact/src/lib/csv-import-form.tsx` — CSV 파일 업로드 + 중복 전략 선택 폼
- `libs/client/contact/src/lib/csv-import-result.tsx` — Import 결과(생성/업데이트/건너뜀/에러) 표시
- `libs/client/contact/src/lib/delete-contact-dialog.tsx` — 연락처 삭제 확인 다이얼로그
- `libs/client/contact/src/lib/attribute-key-manager.tsx` — 속성 키 목록/생성/수정/삭제 관리
- `libs/client/contact/src/lib/enterprise-gate.tsx` — Enterprise 라이선스 안내 컴포넌트

### 신규 생성 - Barrel Export
- `libs/client/contact/src/index.ts` — 모든 API, 타입, 스키마, 컴포넌트 export

### 신규 생성 - 라우트 페이지
- `apps/client/src/app/[lng]/projects/[projectId]/environments/[envId]/contacts/page.tsx` — 연락처 관리 메인 페이지 (Tabs: 목록 + 속성 키)
- `apps/client/src/app/[lng]/projects/[projectId]/environments/[envId]/contacts/import/page.tsx` — CSV Import 페이지

### 수정 - 앱 등록
- `apps/client/package.json` — `@inquiry/client-contact` 의존성 추가
- `apps/client/tsconfig.json` — contact 라이브러리 프로젝트 참조 추가

### 수정 - i18n (15개 로케일)
- `apps/client/src/app/i18n/locales/en-US/translation.json` — `contact.*` 영문 키 추가
- `apps/client/src/app/i18n/locales/ko-KR/translation.json` — `contact.*` 한국어 번역 추가
- 나머지 13개 로케일(de-DE, es-ES, fr-FR, hu-HU, ja-JP, nl-NL, pt-BR, pt-PT, ro-RO, ru-RU, sv-SE, zh-Hans-CN, zh-Hant-TW) — en-US 영문 키 복사 (추후 번역 진행)

## Major Changes

### 1. API 래퍼 (`contact-api.ts`)
`@inquiry/client-core`의 `apiFetch`를 사용하여 서버 API와 통신하는 함수들을 정의한다:
- `fetchContacts(envId, query)` — 페이지네이션된 연락처 목록 조회
- `deleteContact(envId, contactId)` — 연락처 삭제
- `importCsvContacts(envId, file, strategy)` — FormData로 CSV 파일 업로드
- `fetchAttributeKeys(envId)` / `createAttributeKey` / `updateAttributeKey` / `deleteAttributeKey` — 속성 키 CRUD

### 2. 연락처 목록 컴포넌트 (`contact-list.tsx`)
- 25개씩 페이지네이션, 검색(debounce 300ms), 삭제 기능
- email, userId, 기타 속성, 생성일을 테이블로 표시
- 검색 시 자동으로 1페이지로 리셋

### 3. CSV Import 폼 (`csv-import-form.tsx`)
- 파일 선택 영역 (클릭 또는 드래그)
- 중복 처리 전략: skip / update / overwrite
- 업로드 성공 시 결과(생성/업데이트/건너뜀/에러) 표시

### 4. 속성 키 관리 (`attribute-key-manager.tsx`)
- DEFAULT(시스템) 속성은 수정/삭제 불가, CUSTOM만 관리
- 생성 다이얼로그: key, name, description, dataType 입력
- 수정 다이얼로그: name, description만 변경
- Badge로 타입(System/Custom) 및 데이터 타입 표시

### 5. 이름 충돌 해결
`CsvImportResult`가 타입(contact-api.ts)과 컴포넌트(csv-import-result.tsx)에서 동시 export되어 Turbopack 빌드 에러 발생. barrel export에서 컴포넌트를 `CsvImportResultView`로 re-export하여 해결.

## How to use it

### 연락처 목록 페이지 접근
```
/{lng}/projects/{projectId}/environments/{envId}/contacts
```

### CSV Import 페이지 접근
```
/{lng}/projects/{projectId}/environments/{envId}/contacts/import
```

### 컴포넌트 개별 사용
```tsx
import { ContactList, AttributeKeyManager, CsvImportForm } from '@inquiry/client-contact';

// 연락처 목록
<ContactList envId="env-123" />

// 속성 키 관리
<AttributeKeyManager envId="env-123" />

// CSV Import
<CsvImportForm envId="env-123" />
```

## Related Components/Modules
- `@inquiry/client-core` — `apiFetch` 함수 (HTTP 요청 기반)
- `@inquiry/client-ui` — Button, Card, Input, Dialog, Select, Badge, Tabs 등 UI 프리미티브
- `libs/server/contact/` — 백엔드 Contact CRUD / CSV Import API (Phase 3~5)
- `packages/db/prisma/schema.prisma` — Contact, ContactAttribute, ContactAttributeKey 모델
- `react-i18next` — i18n 번역 훅 (`useTranslation('translation')`)

## Precautions
- 13개 비한국어 로케일은 en-US 영문 키를 그대로 복사한 상태이며, 실제 번역은 추후 별도 진행 필요
- Enterprise 라이선스 체크는 `EnterpriseGate` 컴포넌트만 제공하며, 실제 라이선스 검증 로직은 별도 구현 필요
- CSV Import의 파일 크기/레코드 수 제한은 서버 측에서 검증하며, 클라이언트는 에러 메시지만 표시
