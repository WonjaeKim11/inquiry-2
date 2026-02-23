# FSD-003 조직(Organization) 관리 - 클라이언트 사이드 구현

## Overview
FSD-003 구현 계획서의 마일스톤 3(클라이언트 UI)을 구현한다. 서버 측 Organization CRUD API가 이미 구현되어 있는 상태에서, 사용자가 브라우저에서 조직을 생성, 조회, 수정, 삭제할 수 있는 프론트엔드를 구축한다. React Context 기반 조직 상태 관리, shadcn/ui 컴포넌트 확장, i18n 다국어 지원, Next.js 페이지 라우팅을 포함한다.

## Changed Files

### 생성된 파일

#### 클라이언트 조직 라이브러리 (`libs/client/organization/`)
- `package.json` — @inquiry/client-organization 패키지 메타데이터
- `tsconfig.json` — TypeScript 프로젝트 참조 설정
- `tsconfig.lib.json` — 라이브러리 빌드용 TypeScript 설정 (client-core, client-ui 참조)
- `src/index.ts` — 모듈 진입점, 모든 컴포넌트/타입 export
- `src/lib/organization-context.tsx` — OrganizationProvider, useOrganization 훅, 조직 타입 정의
- `src/lib/create-organization-form.tsx` — 조직 생성 폼 (Zod 검증, apiFetch 연동)
- `src/lib/organization-switcher.tsx` — 조직 전환 드롭다운 메뉴
- `src/lib/organization-settings.tsx` — 일반 설정 (이름 수정, AI 토글)
- `src/lib/billing-settings.tsx` — 요금제/사용량 표시 (Plan 배지, 월간 응답수)
- `src/lib/whitelabel-settings.tsx` — 브랜드 설정 (로고/파비콘 URL, 이미지 미리보기)
- `src/lib/delete-organization-dialog.tsx` — 삭제 확인 모달 (이름 입력 확인, cascade 경고)

#### shadcn/ui 컴포넌트 (`libs/client/ui/src/components/ui/`)
- `dialog.tsx` — Dialog 컴포넌트 (삭제 확인 모달용)
- `tabs.tsx` — Tabs 컴포넌트 (설정 페이지 탭 UI)
- `badge.tsx` — Badge 컴포넌트 (Plan 표시용)
- `switch.tsx` — Switch 컴포넌트 (AI 기능 토글용)
- `dropdown-menu.tsx` — DropdownMenu 컴포넌트 (조직 전환용)

#### 페이지 라우트 (`apps/client/src/app/[lng]/organizations/`)
- `page.tsx` — 조직 목록 페이지
- `new/page.tsx` — 조직 생성 페이지
- `[orgId]/settings/page.tsx` — 조직 설정 페이지 (일반/Billing/Whitelabel/삭제 탭)

### 수정된 파일
- `libs/client/ui/package.json` — Radix UI 신규 의존성 추가 (dialog, tabs, switch, dropdown-menu, select, avatar)
- `libs/client/ui/src/index.ts` — 신규 UI 컴포넌트 export 추가
- `apps/client/package.json` — @inquiry/client-organization 워크스페이스 의존성 추가
- `apps/client/tsconfig.json` — client-organization 프로젝트 참조 추가
- `apps/client/src/app/[lng]/layout.tsx` — OrganizationProvider를 AuthProvider 내부에 배치
- `apps/client/src/app/[lng]/page.tsx` — 대시보드에 OrganizationSwitcher와 설정 링크 추가
- `apps/client/src/app/i18n/locales/en-US/translation.json` — organization 네임스페이스 번역 키 추가
- `apps/client/src/app/i18n/locales/ko-KR/translation.json` — organization 네임스페이스 번역 키 추가

## Major Changes

### 1. OrganizationContext (조직 상태 관리)
React Context 패턴으로 전역 조직 상태를 관리한다. AuthProvider 내부에서 동작하며, 사용자 인증 상태 변화에 자동으로 반응한다.

```tsx
// 주요 제공 값
interface OrganizationContextValue {
  currentOrganization: Organization | null; // 현재 선택된 조직
  organizations: Organization[];            // 소속 조직 목록
  loading: boolean;                          // 로딩 상태
  switchOrganization: (orgId: string) => void; // 조직 전환
  refreshOrganizations: () => Promise<void>;   // 목록 갱신
  meta: PaginationMeta | null;               // 페이지네이션 메타
}
```

마지막 선택 조직 ID를 `localStorage`의 `inquiry_last_org_id` 키에 저장하여 세션 간 유지한다.

### 2. shadcn/ui 컴포넌트 확장
Dialog, Tabs, Badge, Switch, DropdownMenu 5개 컴포넌트를 Radix UI 기반으로 추가하였다. 기존 Button, Input, Card 등과 동일한 패턴(forwardRef, cn 유틸리티, CVA variants)을 따른다.

### 3. 설정 페이지 탭 구조
조직 설정을 4개 탭으로 분리하여 각각 독립적인 컴포넌트로 구현하였다:
- General: 이름 수정 + AI 토글
- Billing: Plan 배지(색상 구분) + 사용량 제한 표시 + 월간 응답수 프로그레스 바
- Whitelabel: 로고/파비콘 URL 입력 + 실시간 이미지 미리보기
- Danger: 삭제 확인 다이얼로그 (조직 이름 입력으로 확인)

### 4. i18n 번역 키
`organization` 네임스페이스로 create/list/switcher/settings/billing/whitelabel/delete/errors 하위 키를 en-US와 ko-KR에 추가하였다.

## How to use it

### 조직 생성
1. 로그인 후 대시보드에서 OrganizationSwitcher 드롭다운의 "Create New Organization" 클릭
2. 또는 `/{lng}/organizations/new` 경로로 직접 이동
3. 조직 이름 입력 후 "Create Organization" 버튼 클릭

### 조직 전환
- 대시보드 상단의 OrganizationSwitcher 드롭다운에서 원하는 조직 선택
- 선택한 조직은 localStorage에 저장되어 다음 방문 시 자동 복원

### 조직 설정 수정
1. `/{lng}/organizations/{orgId}/settings` 경로로 이동
2. General 탭: 이름 수정, AI 기능 토글 후 Save 클릭
3. Billing 탭: 현재 요금제와 사용량 확인 (읽기 전용)
4. Whitelabel 탭: 로고/파비콘 URL 입력 후 Save 클릭
5. Delete 탭: "Delete Organization" 클릭 후 조직 이름 입력하여 확인

### 컴포넌트 사용 예시
```tsx
import { OrganizationProvider, useOrganization } from '@inquiry/client-organization';

// Provider 배치 (이미 layout.tsx에 설정됨)
<AuthProvider>
  <OrganizationProvider>{children}</OrganizationProvider>
</AuthProvider>

// 훅 사용
const { currentOrganization, switchOrganization } = useOrganization();
```

## Related Components/Modules
- `@inquiry/client-core` (AuthProvider, apiFetch) — 인증 상태와 API 호출 의존
- `@inquiry/client-ui` — 모든 UI 요소의 기반 컴포넌트 라이브러리
- `libs/server/organization/` — 서버 측 CRUD API (이미 구현됨)
- `apps/client/src/app/[lng]/layout.tsx` — OrganizationProvider가 AuthProvider 안에 배치됨
- `apps/client/src/app/i18n/locales/` — 번역 리소스 파일

## Precautions
- Billing 설정은 현재 읽기 전용이다. Plan 변경 기능은 FSD-029(Stripe 연동)에서 구현 예정이다.
- 월간 응답수는 Project/Survey 모델이 아직 없어 서버에서 스텁 값(0)을 반환한다.
- 조직 삭제는 cascade 삭제로 Membership, Invite가 함께 삭제된다.
- 15개 로케일 중 en-US, ko-KR만 organization 번역 키가 추가되었다. 나머지 13개 로케일은 fallback(en-US)으로 표시된다.
- `useOrganization()` 훅은 반드시 OrganizationProvider 내부에서 사용해야 한다.
