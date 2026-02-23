# FSD-006 프로젝트/환경 관리 클라이언트 사이드 구현

## Overview
프로젝트(Project)와 환경(Environment)을 관리하는 클라이언트 사이드 기능을 구현했다.
이미 구현 완료된 백엔드 API(Project, Environment, ActionClass, Language)에 대응하는
UI 컴포넌트, 페이지 라우트, 상태 관리(Context), i18n 번역을 추가했다.
기존 `@inquiry/client-organization` 패키지 패턴을 그대로 따라 일관된 코드베이스를 유지한다.

## Changed Files

### 신규 생성 - `@inquiry/client-project` 라이브러리
- `libs/client/project/package.json` — 패키지 정의 (workspace 의존성 설정)
- `libs/client/project/tsconfig.json` — TypeScript 프로젝트 참조 설정
- `libs/client/project/tsconfig.lib.json` — 라이브러리 빌드용 TypeScript 설정
- `libs/client/project/src/index.ts` — 패키지 진입점 (모든 컴포넌트/타입 re-export)
- `libs/client/project/src/lib/project-context.tsx` — ProjectProvider, useProject 훅
- `libs/client/project/src/lib/create-project-form.tsx` — 프로젝트 생성 폼
- `libs/client/project/src/lib/project-settings.tsx` — 프로젝트 일반 설정
- `libs/client/project/src/lib/project-styling-form.tsx` — 프로젝트 스타일링 설정
- `libs/client/project/src/lib/environment-switcher.tsx` — 환경 전환 UI
- `libs/client/project/src/lib/action-class-list.tsx` — ActionClass 목록
- `libs/client/project/src/lib/action-class-form.tsx` — ActionClass 생성 폼
- `libs/client/project/src/lib/language-manager.tsx` — 언어 관리
- `libs/client/project/src/lib/delete-project-dialog.tsx` — 프로젝트 삭제 다이얼로그

### 신규 생성 - UI 컴포넌트
- `libs/client/ui/src/components/ui/select.tsx` — Select 드롭다운 컴포넌트 (Radix UI 기반)
- `libs/client/ui/src/components/ui/textarea.tsx` — Textarea 다중줄 입력 컴포넌트

### 신규 생성 - 페이지 라우트
- `apps/client/src/app/[lng]/projects/page.tsx` — 프로젝트 목록 페이지
- `apps/client/src/app/[lng]/projects/new/page.tsx` — 프로젝트 생성 페이지
- `apps/client/src/app/[lng]/projects/[projectId]/page.tsx` — 프로젝트 대시보드
- `apps/client/src/app/[lng]/projects/[projectId]/settings/page.tsx` — 프로젝트 설정 (탭 UI)
- `apps/client/src/app/[lng]/projects/[projectId]/environments/[envId]/page.tsx` — 환경 대시보드
- `apps/client/src/app/[lng]/projects/[projectId]/environments/[envId]/action-classes/page.tsx` — ActionClass 목록
- `apps/client/src/app/[lng]/projects/[projectId]/environments/[envId]/action-classes/new/page.tsx` — ActionClass 생성

### 신규 생성 - 프로바이더 래퍼
- `apps/client/src/app/[lng]/project-provider-wrapper.tsx` — OrganizationContext에서 orgId를 받아 ProjectProvider에 전달하는 클라이언트 래퍼

### 수정된 파일
- `apps/client/src/app/[lng]/layout.tsx` — ProjectProviderWrapper 추가
- `apps/client/src/app/[lng]/page.tsx` — 대시보드에 프로젝트 목록 링크 추가
- `apps/client/package.json` — `@inquiry/client-project` 의존성 추가
- `apps/client/tsconfig.json` — client-project 참조 추가
- `tsconfig.json` (루트) — client-project 참조 추가
- `libs/client/ui/src/index.ts` — Select, Textarea 컴포넌트 export 추가
- `apps/client/src/app/i18n/locales/en-US/translation.json` — project.* 영문 번역 키 추가
- `apps/client/src/app/i18n/locales/ko-KR/translation.json` — project.* 한국어 번역 키 추가

## Major Changes

### 1. ProjectProvider 상태 관리
`ProjectProvider`는 `OrganizationContext`의 `currentOrganization.id`를 받아 해당 조직의 프로젝트 목록을 자동으로 로드한다. localStorage를 사용하여 마지막 선택 프로젝트/환경 ID를 세션 간 유지한다.

```tsx
// layout.tsx에서 프로바이더 계층 구조
<AuthProvider>
  <OrganizationProvider>
    <ProjectProviderWrapper>  {/* useOrganization()으로 orgId 획득 */}
      {children}
    </ProjectProviderWrapper>
  </OrganizationProvider>
</AuthProvider>
```

### 2. ActionClass 폼 — 타입별 동적 UI
`ActionClassForm`은 type 선택에 따라 다른 폼 필드를 렌더링한다:
- `code` 타입: key 필수 입력
- `noCode` 타입: noCodeConfig (트리거 타입, CSS 셀렉터, Inner HTML, URL 필터) 설정

URL 필터는 동적으로 추가/삭제할 수 있으며, 각 필터는 rule(contains, equals 등)과 value로 구성된다.

### 3. 프로젝트 설정 탭 구조
프로젝트 설정 페이지는 4개 탭으로 구성된다:
- General: 이름, recontactDays, placement, darkOverlay, 각종 토글
- Styling: brandColor, cardBackgroundColor, cardBorderColor, roundness 등
- Languages: ISO 639-1 코드 기반 언어 CRUD
- Danger Zone: 프로젝트 삭제 (이름 확인 필수)

## How to use it

### 프로젝트 목록 접근
1. 대시보드(`/[lng]`)에서 "프로젝트" 버튼 클릭
2. `/[lng]/projects` 페이지에서 프로젝트 목록 확인

### 프로젝트 생성
1. `/[lng]/projects/new` 페이지에서 프로젝트 이름 입력
2. 생성 시 production/development 환경 2개가 자동 생성됨

### 프로젝트 설정
1. `/[lng]/projects/[projectId]/settings` 페이지에서 탭 전환
2. 각 탭에서 설정 변경 후 저장

### ActionClass 관리
1. 프로젝트 대시보드에서 환경 선택 후 ActionClass 카드 클릭
2. `/[lng]/projects/[projectId]/environments/[envId]/action-classes`에서 목록 확인
3. "Create Action Class" 버튼으로 새 ActionClass 생성

## Related Components/Modules
- `@inquiry/client-organization` — OrganizationProvider에서 조직 ID를 제공받음
- `@inquiry/client-core` — apiFetch, useAuth 사용
- `@inquiry/client-ui` — 모든 UI 컴포넌트 사용 (Button, Card, Tabs, Dialog, Select, Badge, Switch 등)
- `libs/server/project/` — 서버 사이드 Project/Environment/ActionClass/Language API

## Precautions
- 프로젝트 생성 시 현재 선택된 조직(`currentOrganization`)이 없으면 생성 페이지가 렌더링되지 않음
- ActionClass의 noCodeConfig는 서버 스키마에 따라 JSON 형태로 전송됨
- 환경은 프로젝트 생성 시 자동 생성되며 별도 생성/삭제 UI는 없음
- Select, Textarea UI 컴포넌트가 새로 추가되었으므로 다른 페이지에서도 활용 가능
