# FSD-024 API Key 관리 UI + i18n 번역

## Overview
API Key 관리를 위한 클라이언트 사이드 UI를 구현하고, 15개 로케일에 대한 i18n 번역을 추가했다.
사용자가 조직 내에서 API Key를 생성, 조회, 삭제할 수 있는 완전한 UI 흐름을 제공한다.
기존 멤버/설정 페이지와의 네비게이션 통합도 포함되어 있다.

## Changed Files

### 새로 생성된 파일

- `libs/client/api-key/package.json` - @inquiry/client-api-key 패키지 설정
- `libs/client/api-key/tsconfig.json` - TypeScript 프로젝트 참조 설정
- `libs/client/api-key/tsconfig.lib.json` - TypeScript 라이브러리 컴파일 설정
- `libs/client/api-key/src/index.ts` - barrel export 파일
- `libs/client/api-key/src/lib/api-key-list.tsx` - API Key 카드 리스트 컴포넌트
- `libs/client/api-key/src/lib/create-api-key-dialog.tsx` - API Key 생성 다이얼로그
- `libs/client/api-key/src/lib/delete-api-key-dialog.tsx` - API Key 삭제 확인 다이얼로그
- `libs/client/api-key/src/lib/api-key-secret-dialog.tsx` - 1회 키 표시 다이얼로그
- `apps/client/src/app/[lng]/organizations/[orgId]/api-keys/page.tsx` - API Key 관리 페이지 라우트

### 수정된 파일

- `tsconfig.json` (루트) - client/api-key 프로젝트 참조 추가
- `apps/client/src/app/[lng]/organizations/[orgId]/settings/page.tsx` - "API Keys" 네비게이션 버튼 추가
- `apps/client/src/app/[lng]/organizations/[orgId]/members/page.tsx` - "API Keys" 네비게이션 버튼 추가
- `apps/client/src/app/i18n/locales/en-US/translation.json` - 영어 번역 추가
- `apps/client/src/app/i18n/locales/ko-KR/translation.json` - 한국어 번역 추가
- `apps/client/src/app/i18n/locales/ja-JP/translation.json` - 일본어 번역 추가
- `apps/client/src/app/i18n/locales/zh-Hans-CN/translation.json` - 중국어 간체 번역 추가
- `apps/client/src/app/i18n/locales/zh-Hant-TW/translation.json` - 중국어 번체 번역 추가
- `apps/client/src/app/i18n/locales/de-DE/translation.json` - 독일어 번역 추가
- `apps/client/src/app/i18n/locales/es-ES/translation.json` - 스페인어 번역 추가
- `apps/client/src/app/i18n/locales/fr-FR/translation.json` - 프랑스어 번역 추가
- `apps/client/src/app/i18n/locales/pt-BR/translation.json` - 브라질 포르투갈어 번역 추가
- `apps/client/src/app/i18n/locales/pt-PT/translation.json` - 포르투갈어 번역 추가
- `apps/client/src/app/i18n/locales/ru-RU/translation.json` - 러시아어 번역 추가
- `apps/client/src/app/i18n/locales/nl-NL/translation.json` - 네덜란드어 번역 추가
- `apps/client/src/app/i18n/locales/sv-SE/translation.json` - 스웨덴어 번역 추가
- `apps/client/src/app/i18n/locales/hu-HU/translation.json` - 헝가리어 번역 추가
- `apps/client/src/app/i18n/locales/ro-RO/translation.json` - 루마니아어 번역 추가

## Major Changes

### 1. API Key 라이브러리 패키지 (`libs/client/api-key/`)

기존 `libs/client/member/` 패턴을 그대로 따라 `@inquiry/client-api-key` 패키지를 생성했다.

**ApiKeyList 컴포넌트** (`api-key-list.tsx`):
- `apiFetch`로 `GET /organizations/:orgId/api-keys` 호출
- 각 키를 Card 컴포넌트로 렌더링 (label, maskedKey, 환경 권한 배지, 메타 정보)
- 권한별 색상 분류 배지 (READ: blue, WRITE: amber, MANAGE: purple)
- 로딩/빈 상태/에러 상태 처리
- 삭제 시 DeleteApiKeyDialog 호출

**CreateApiKeyDialog 컴포넌트** (`create-api-key-dialog.tsx`):
- 라벨, 환경 권한(여러 행 동적 추가/삭제), 만료일(선택) 폼
- `POST /organizations/:orgId/api-keys` 호출
- 성공 시 `onCreated({ plainKey })` 콜백으로 평문 키 전달
- 폼 유효성 검사 (라벨 필수, 모든 환경 ID 필수)

**DeleteApiKeyDialog 컴포넌트** (`delete-api-key-dialog.tsx`):
- 삭제 경고 + 확인 버튼 패턴 (이름 확인 불필요)
- `DELETE /organizations/:orgId/api-keys/:apiKeyId` 호출

**ApiKeySecretDialog 컴포넌트** (`api-key-secret-dialog.tsx`):
- 생성 직후 1회 평문 키 표시
- `navigator.clipboard.writeText`로 클립보드 복사
- "다시 볼 수 없습니다" 경고 표시

### 2. API Key 관리 페이지

`apps/client/src/app/[lng]/organizations/[orgId]/api-keys/page.tsx`:
- members/page.tsx 패턴을 따른 인증/로딩 흐름
- 조직 정보 조회 후 이름 표시
- 설정/멤버 페이지 네비게이션 버튼
- "Create API Key" 버튼으로 생성 다이얼로그 열기
- 생성 성공 시 비밀 키 다이얼로그 자동 표시
- refreshKey 카운터로 목록 갱신 트리거

### 3. 네비게이션 통합

설정 페이지와 멤버 페이지 헤더에 "API Keys" 버튼을 추가하여 세 페이지 간 자유로운 이동이 가능하다.

### 4. i18n 번역 (15개 로케일)

`apiKey` 네임스페이스로 모든 번역 키를 관리한다:
- `apiKey.title`, `apiKey.description` - 페이지 제목/설명
- `apiKey.create.*` - 생성 다이얼로그
- `apiKey.secret.*` - 비밀 키 표시 다이얼로그
- `apiKey.list.*` - 키 목록
- `apiKey.delete.*` - 삭제 다이얼로그
- `apiKey.permission.*` - 권한 배지
- `apiKey.errors.*` - 에러 메시지

## How to use it

### API Key 관리 페이지 접근
```
/{lng}/organizations/{orgId}/api-keys
```

### 설정/멤버 페이지에서 "API Keys" 버튼으로 이동 가능

### 컴포넌트 import
```tsx
import {
  ApiKeyList,
  CreateApiKeyDialog,
  DeleteApiKeyDialog,
  ApiKeySecretDialog,
} from '@inquiry/client-api-key';
```

## Related Components/Modules

- `@inquiry/client-core` - apiFetch, useAuth 훅
- `@inquiry/client-ui` - UI 컴포넌트 (Dialog, Card, Button, Input, Select 등)
- `@inquiry/client-organization` - useOrganization 훅 (설정 페이지에서 사용)
- `libs/server/api-key/` - 서버 사이드 API Key 모듈 (백엔드 API)
- 설정 페이지 (`settings/page.tsx`) - 네비게이션 통합
- 멤버 페이지 (`members/page.tsx`) - 네비게이션 통합

## Precautions

- API Key의 평문은 생성 직후 1회만 볼 수 있으며, 이후에는 maskedKey만 표시된다
- 환경 ID는 현재 직접 입력 방식이며, 추후 환경 목록 조회 기반 Select로 개선 가능
- 삭제 시 해당 키를 사용하는 모든 애플리케이션의 접근이 즉시 차단된다
- 빌드는 포함되지 않았으며 이후 통합 빌드에서 검증 필요
